import { Router, Response } from 'express';
import { queryOne, query } from '../config/database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// =====================================================
// TYPES
// =====================================================

interface CheckoutRequest {
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  successUrl: string;
  cancelUrl: string;
}

// =====================================================
// ROUTES
// =====================================================

/**
 * POST /api/payments/checkout
 * Create a checkout session for subscription
 */
router.post('/checkout', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { planId, billingCycle, successUrl, cancelUrl } = req.body as CheckoutRequest;

    if (!planId || !billingCycle) {
      return res.status(400).json({ error: 'Missing planId or billingCycle' });
    }

    // Get plan details
    const plan = await queryOne<{ id: string; price_monthly: number; price_yearly: number }>(
      'SELECT id, price_monthly, price_yearly FROM subscription_plans WHERE id = $1',
      [planId]
    );

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
    if (price === null || price === 0) {
      return res.status(400).json({ error: 'Cannot checkout free plan' });
    }

    // Get user email for checkout
    const user = await queryOne<{ email: string }>(
      'SELECT email FROM users WHERE id = $1',
      [req.userId]
    );

    // Determine payment provider from environment
    const useLemonSqueezy = !!process.env.LEMONSQUEEZY_API_KEY;
    const useCreem = !!process.env.CREEM_API_KEY;
    const useStripe = !!process.env.STRIPE_SECRET_KEY;

    if (useLemonSqueezy) {
      // LemonSqueezy checkout
      const variantEnvKey = `LEMONSQUEEZY_${planId.toUpperCase()}_VARIANT_ID`;
      const variantId = process.env[variantEnvKey];
      const storeId = process.env.LEMONSQUEEZY_STORE_ID;
      
      console.log(`[Payments] LemonSqueezy checkout: planId=${planId}, variantEnvKey=${variantEnvKey}, variantId=${variantId}`);
      
      if (!variantId) {
        console.error(`[Payments] Missing ${variantEnvKey}`);
        return res.status(500).json({ error: 'Payment configuration error' });
      }

      const lsResponse = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json',
          'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
        },
        body: JSON.stringify({
          data: {
            type: 'checkouts',
            attributes: {
              checkout_data: {
                email: user?.email,
                custom: {
                  user_id: req.userId,
                  plan_id: planId,
                  billing_cycle: billingCycle,
                },
              },
              checkout_options: {
                embed: false,
                media: true,
                button_color: '#7C3AED',
              },
              product_options: {
                redirect_url: successUrl,
              },
            },
            relationships: {
              store: {
                data: {
                  type: 'stores',
                  id: storeId,
                },
              },
              variant: {
                data: {
                  type: 'variants',
                  id: variantId,
                },
              },
            },
          },
        }),
      });

      const lsData = await lsResponse.json() as { data?: { attributes?: { url?: string } } };
      const checkoutUrl = lsData?.data?.attributes?.url;
      
      if (checkoutUrl) {
        return res.json({ checkoutUrl });
      } else {
        console.error('[Payments] LemonSqueezy error:', JSON.stringify(lsData, null, 2));
        return res.status(500).json({ error: 'Failed to create checkout session' });
      }
    } else if (useCreem) {
      // Creem checkout
      const envKey = `CREEM_${planId.toUpperCase()}_PRODUCT_ID`;
      const creemProductId = process.env[envKey];
      
      // Use test API for test mode keys, otherwise use production API
      const isTestMode = process.env.CREEM_API_KEY!.includes('_test_');
      const creemApiBase = isTestMode ? 'https://test-api.creem.io' : 'https://api.creem.io';
      
      console.log(`[Payments] Checkout request: planId=${planId}, envKey=${envKey}, productId=${creemProductId}, testMode=${isTestMode}`);
      if (!creemProductId) {
        console.error(`[Payments] Missing ${envKey}`);
        return res.status(500).json({ error: 'Payment configuration error' });
      }

      const creemResponse = await fetch(`${creemApiBase}/v1/checkouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.CREEM_API_KEY!,
        },
        body: JSON.stringify({
          product_id: creemProductId,
          success_url: successUrl,
          metadata: {
            user_id: req.userId,
            plan_id: planId,
            billing_cycle: billingCycle,
          },
        }),
      });

      const creemData = await creemResponse.json() as { checkout_url?: string };
      if (creemData.checkout_url) {
        return res.json({ checkoutUrl: creemData.checkout_url });
      } else {
        console.error('[Payments] Creem error:', creemData);
        return res.status(500).json({ error: 'Failed to create checkout session' });
      }
    } else if (useStripe) {
      // Stripe checkout (fallback)
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const stripePriceId = process.env[`STRIPE_${planId.toUpperCase()}_${billingCycle.toUpperCase()}_PRICE_ID`];

      if (!stripePriceId) {
        console.error(`[Payments] Missing STRIPE_${planId.toUpperCase()}_${billingCycle.toUpperCase()}_PRICE_ID`);
        return res.status(500).json({ error: 'Payment configuration error' });
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer_email: user?.email,
        line_items: [{ price: stripePriceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          user_id: req.userId,
          plan_id: planId,
          billing_cycle: billingCycle,
        },
      });

      return res.json({ checkoutUrl: session.url });
    } else {
      // No payment provider configured - demo mode
      console.log('[Payments] Demo mode - no payment provider configured');
      
      // In demo mode, directly upgrade the user (for testing)
      await queryOne(`
        UPDATE user_subscriptions 
        SET plan_id = $1, status = 'active', billing_cycle = $2, started_at = NOW()
        WHERE user_id = $3 AND status = 'active'
      `, [planId, billingCycle, req.userId]);

      return res.json({ 
        checkoutUrl: successUrl,
        demo: true,
        message: 'Demo mode - subscription upgraded directly' 
      });
    }
  } catch (error: any) {
    console.error('[Payments] Checkout error:', error);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * POST /api/payments/webhook/lemonsqueezy
 * Handle LemonSqueezy webhooks
 */
router.post('/webhook/lemonsqueezy', async (req, res: Response) => {
  try {
    const signature = req.headers['x-signature'] as string;
    const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

    // LemonSqueezy uses HMAC-SHA256 for signature verification
    // We use rawBody captured by express.json verify function
    if (webhookSecret && signature) {
      const crypto = require('crypto');
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      const hmac = crypto.createHmac('sha256', webhookSecret);
      const digest = hmac.update(rawBody).digest('hex');
      if (signature !== digest) {
        console.error('[Payments] LemonSqueezy webhook signature mismatch');
        console.error('[Payments] Signature header:', signature?.substring(0, 20) + '...');
        console.error('[Payments] Computed digest:', digest.substring(0, 20) + '...');
        return res.status(401).json({ error: 'Invalid signature' });
      }
      console.log('[Payments] ✅ LemonSqueezy webhook signature verified');
    }

    const event = req.body;
    const eventName = event.meta?.event_name;
    const customData = event.meta?.custom_data || {};
    const eventData = event.data?.attributes || {};
    
    console.log('[Payments] LemonSqueezy webhook received:', eventName);
    console.log('[Payments] Custom data:', JSON.stringify(customData, null, 2));
    console.log('[Payments] Event data attributes:', JSON.stringify(eventData, null, 2));

    // Handle order_created, subscription_created, subscription_updated, or subscription_payment_success events
    // subscription_updated contains custom_data in meta for trial/active subscriptions
    if (eventName === 'order_created' || eventName === 'subscription_created' || eventName === 'subscription_payment_success' || eventName === 'subscription_updated') {
      const userId = customData.user_id;
      const planId = customData.plan_id;
      const billingCycle = customData.billing_cycle || 'monthly';
      const subscriptionId = event.data?.id;
      const customerId = eventData.customer_id;

      console.log('[Payments] Processing LemonSqueezy subscription:', { userId, planId, billingCycle, subscriptionId });

      if (userId && planId) {
        // Step 1: Try to update existing active subscription
        const updateResult = await query(`
          UPDATE user_subscriptions 
          SET plan_id = $1, 
              billing_cycle = $2,
              payment_provider = 'lemonsqueezy',
              payment_customer_id = $3,
              payment_subscription_id = $4,
              started_at = NOW()
          WHERE user_id = $5 AND status = 'active'
          RETURNING id
        `, [planId, billingCycle, customerId, subscriptionId, userId]);

        // Step 2: If no existing active subscription, insert one
        if (!updateResult || updateResult.length === 0) {
          await queryOne(`
            INSERT INTO user_subscriptions (
              user_id, plan_id, status, billing_cycle, 
              payment_provider, payment_customer_id, payment_subscription_id, started_at
            ) VALUES ($1, $2, 'active', $3, 'lemonsqueezy', $4, $5, NOW())
          `, [userId, planId, billingCycle, customerId, subscriptionId]);
          console.log(`[Payments] ✅ LemonSqueezy: Created new subscription for user ${userId} with plan ${planId}`);
        } else {
          console.log(`[Payments] ✅ LemonSqueezy: Updated subscription for user ${userId} to ${planId}`);
        }
      } else {
        console.log('[Payments] ⚠️ Missing userId or planId in LemonSqueezy webhook custom_data');
      }
    }

    // Handle subscription_cancelled event
    if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
      const subscriptionId = event.data?.id;
      const userId = customData.user_id;
      
      if (userId) {
        await queryOne(`
          UPDATE user_subscriptions 
          SET status = 'cancelled', cancelled_at = NOW()
          WHERE user_id = $1 AND status = 'active'
        `, [userId]);
        console.log(`[Payments] LemonSqueezy: Cancelled subscription for user ${userId}`);
      } else if (subscriptionId) {
        // Fallback: find by subscription ID
        await queryOne(`
          UPDATE user_subscriptions 
          SET status = 'cancelled', cancelled_at = NOW()
          WHERE payment_subscription_id = $1 AND status = 'active'
        `, [subscriptionId]);
        console.log(`[Payments] LemonSqueezy: Cancelled subscription ${subscriptionId}`);
      }
    }

    return res.json({ received: true });
  } catch (error: any) {
    console.error('[Payments] LemonSqueezy webhook error:', error);
    return res.status(400).json({ error: 'Webhook processing failed' });
  }
});

/**
 * POST /api/payments/webhook/creem
 * Handle Creem webhooks
 */
router.post('/webhook/creem', async (req, res: Response) => {
  try {
    const signature = req.headers['x-creem-signature'];
    const webhookSecret = process.env.CREEM_WEBHOOK_SECRET;

    // TODO: Verify webhook signature in production
    if (webhookSecret && signature) {
      // Verify signature logic here
    }

    const event = req.body;
    // Creem uses 'eventType' not 'type', and 'object' not 'data'
    const eventType = event.eventType || event.type;
    const eventData = event.object || event.data || {};
    
    console.log('[Payments] Creem webhook received:', JSON.stringify(event, null, 2));
    console.log('[Payments] Creem event type:', eventType);

    // Handle checkout completed or subscription events
    if (eventType === 'checkout.completed' || eventType === 'subscription.active' || eventType === 'subscription.paid') {
      // Creem puts metadata inside the object, or at checkout level
      const metadata = eventData.metadata || event.metadata || {};
      const userId = metadata.user_id;
      const planId = metadata.plan_id;
      const billingCycle = metadata.billing_cycle || 'monthly';
      const subscriptionId = eventData.id || event.id;

      console.log('[Payments] Processing subscription:', { userId, planId, billingCycle, subscriptionId });

      if (userId && planId) {
        // Step 1: Try to update existing active subscription
        const updateResult = await query(`
          UPDATE user_subscriptions 
          SET plan_id = $1, 
              billing_cycle = $2,
              payment_provider = 'creem',
              payment_subscription_id = $3,
              started_at = NOW()
          WHERE user_id = $4 AND status = 'active'
          RETURNING id
        `, [planId, billingCycle, subscriptionId, userId]);

        // Step 2: If no existing active subscription, insert one
        if (!updateResult || updateResult.length === 0) {
          await queryOne(`
            INSERT INTO user_subscriptions (
              user_id, plan_id, status, billing_cycle, 
              payment_provider, payment_subscription_id, started_at
            ) VALUES ($1, $2, 'active', $3, 'creem', $4, NOW())
          `, [userId, planId, billingCycle, subscriptionId]);
          console.log(`[Payments] ✅ Creem: Created new subscription for user ${userId} with plan ${planId}`);
        } else {
          console.log(`[Payments] ✅ Creem: Updated subscription for user ${userId} to ${planId}`);
        }
      } else {
        console.log('[Payments] ⚠️ Missing userId or planId in webhook metadata');
      }
    }

    if (eventType === 'subscription.canceled' || eventType === 'subscription.cancelled') {
      const metadata = eventData.metadata || event.metadata || {};
      const userId = metadata.user_id;
      if (userId) {
        await queryOne(`
          UPDATE user_subscriptions 
          SET status = 'cancelled', cancelled_at = NOW()
          WHERE user_id = $1 AND status = 'active'
        `, [userId]);
        console.log(`[Payments] Cancelled subscription for user ${userId}`);
      }
    }

    return res.json({ received: true });
  } catch (error: any) {
    console.error('[Payments] Creem webhook error:', error);
    return res.status(400).json({ error: 'Webhook processing failed' });
  }
});

/**
 * POST /api/payments/webhook/stripe
 * Handle Stripe webhooks
 */
router.post('/webhook/stripe', async (req, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event = req.body;

    // Verify signature in production
    if (endpointSecret && sig) {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      } catch (err: any) {
        console.error('[Payments] Stripe signature verification failed:', err.message);
        return res.status(400).json({ error: 'Signature verification failed' });
      }
    }

    console.log('[Payments] Stripe webhook:', event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = session.metadata || {};
      const userId = metadata.user_id;
      const planId = metadata.plan_id;
      const billingCycle = metadata.billing_cycle || 'monthly';

      if (userId && planId) {
        // Step 1: Try to update existing active subscription
        const updateResult = await query(`
          UPDATE user_subscriptions 
          SET plan_id = $1, 
              billing_cycle = $2,
              payment_provider = 'stripe',
              payment_customer_id = $3,
              payment_subscription_id = $4,
              started_at = NOW()
          WHERE user_id = $5 AND status = 'active'
          RETURNING id
        `, [planId, billingCycle, session.customer, session.subscription, userId]);

        // Step 2: If no existing active subscription, insert one
        if (!updateResult || updateResult.length === 0) {
          await queryOne(`
            INSERT INTO user_subscriptions (
              user_id, plan_id, status, billing_cycle, 
              payment_provider, payment_customer_id, payment_subscription_id, started_at
            ) VALUES ($1, $2, 'active', $3, 'stripe', $4, $5, NOW())
          `, [userId, planId, billingCycle, session.customer, session.subscription]);
          console.log(`[Payments] ✅ Stripe: Created new subscription for user ${userId} with plan ${planId}`);
        } else {
          console.log(`[Payments] ✅ Stripe: Updated subscription for user ${userId} to ${planId}`);
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      await query(`
        UPDATE user_subscriptions 
        SET status = 'cancelled', cancelled_at = NOW()
        WHERE payment_subscription_id = $1
      `, [subscription.id]);
    }

    return res.json({ received: true });
  } catch (error: any) {
    console.error('[Payments] Stripe webhook error:', error);
    return res.status(400).json({ error: 'Webhook processing failed' });
  }
});

/**
 * GET /api/payments/portal
 * Get customer portal URL (for managing subscription)
 */
router.get('/portal', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const subscription = await queryOne<{
      payment_provider: string;
      payment_customer_id: string;
    }>(`
      SELECT payment_provider, payment_customer_id
      FROM user_subscriptions
      WHERE user_id = $1 AND status = 'active'
    `, [req.userId]);

    if (!subscription?.payment_customer_id) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    if (subscription.payment_provider === 'stripe' && process.env.STRIPE_SECRET_KEY) {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.payment_customer_id,
        return_url: `${process.env.FRONTEND_URL}/ai-designer`,
      });
      return res.json({ portalUrl: session.url });
    }

    if (subscription.payment_provider === 'creem') {
      // Creem customer portal URL
      return res.json({ 
        portalUrl: `https://app.creem.io/portal/${subscription.payment_customer_id}` 
      });
    }

    if (subscription.payment_provider === 'lemonsqueezy') {
      // LemonSqueezy customer portal URL
      return res.json({ 
        portalUrl: `https://app.lemonsqueezy.com/my-orders` 
      });
    }

    return res.status(400).json({ error: 'Portal not available' });
  } catch (error: any) {
    console.error('[Payments] Portal error:', error);
    return res.status(500).json({ error: 'Failed to get portal URL' });
  }
});

export default router;
