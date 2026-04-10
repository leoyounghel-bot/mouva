import { Router, Response } from 'express';
import { queryOne, query } from '../config/database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// =====================================================
// TYPES
// =====================================================

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number | null;
  price_yearly: number | null;
  currency: string;
  features: Record<string, boolean>;
  limits: Record<string, number>;
  is_active: boolean;
  sort_order: number;
}

interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  plan_name?: string;  // Joined from subscription_plans
  status: string;
  billing_cycle: string;
  started_at: Date;
  expires_at: Date | null;
  cancelled_at: Date | null;
}

// =====================================================
// HELPERS
// =====================================================

/**
 * Get today's date as YYYY-MM-DD string for daily tracking
 */
function getTodayPeriod(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Get first day of month for monthly tracking (legacy)
 */
function getMonthPeriod(): string {
  const periodStart = new Date();
  periodStart.setDate(1);
  periodStart.setHours(0, 0, 0, 0);
  return periodStart.toISOString().split('T')[0];
}

// =====================================================
// PUBLIC ROUTES
// =====================================================

/**
 * GET /api/subscription/plans
 * List all available subscription plans
 */
router.get('/plans', async (_req, res: Response) => {
  try {
    const plans = await query<SubscriptionPlan>(
      'SELECT * FROM subscription_plans WHERE is_active = true ORDER BY sort_order ASC'
    );

    return res.json({
      plans: plans.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        priceMonthly: p.price_monthly,
        priceYearly: p.price_yearly,
        currency: p.currency,
        features: p.features,
        limits: p.limits,
      })),
    });
  } catch (error: any) {
    console.error('[Subscription] List plans error:', error);
    return res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// =====================================================
// PROTECTED ROUTES (require auth)
// =====================================================

/**
 * GET /api/subscription/current
 * Get current user's subscription
 */
router.get('/current', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get user's active subscription with plan details
    const subscription = await queryOne<UserSubscription & SubscriptionPlan>(`
      SELECT 
        us.*,
        sp.name as plan_name,
        sp.features,
        sp.limits
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = $1 AND us.status = 'active'
      ORDER BY us.created_at DESC
      LIMIT 1
    `, [req.userId]);

    if (!subscription) {
      // Create default free subscription if none exists
      const newSub = await queryOne<UserSubscription>(`
        INSERT INTO user_subscriptions (user_id, plan_id, status)
        VALUES ($1, 'free', 'active')
        RETURNING *
      `, [req.userId]);

      return res.json({
        subscription: {
          planId: 'free',
          planName: 'Free',
          status: 'active',
          billingCycle: 'monthly',
          startedAt: newSub?.started_at,
          expiresAt: null,
          features: { ai_chat: true, templates: true, pdf_export: true },
          limits: { ai_generation_per_day: 25, max_templates: 3, storage_mb: 50 },
        },
      });
    }

    return res.json({
      subscription: {
        planId: subscription.plan_id,
        planName: subscription.plan_name,
        status: subscription.status,
        billingCycle: subscription.billing_cycle,
        startedAt: subscription.started_at,
        expiresAt: subscription.expires_at,
        cancelledAt: subscription.cancelled_at,
        features: subscription.features,
        limits: subscription.limits,
      },
    });
  } catch (error: any) {
    console.error('[Subscription] Get current error:', error);
    return res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

/**
 * GET /api/subscription/check-limit
 * Check if user can make an AI request (daily limit check)
 * Returns: { allowed, used, limit, planName }
 */
router.get('/check-limit', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const todayStr = getTodayPeriod();

    // Get user's subscription with limits
    const subscription = await queryOne<{ plan_id: string; plan_name: string; limits: Record<string, number> }>(`
      SELECT 
        us.plan_id,
        sp.name as plan_name,
        sp.limits
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = $1 AND us.status = 'active'
      ORDER BY us.created_at DESC
      LIMIT 1
    `, [req.userId]);

    // Default to free tier if no subscription
    const planName = subscription?.plan_name || 'Free';
    const dailyLimit = subscription?.limits?.ai_generation_per_day ?? 25;

    // Get today's usage
    const usage = await queryOne<{ ai_requests_used: number }>(`
      SELECT ai_requests_used
      FROM usage_tracking
      WHERE user_id = $1 AND period_start = $2
    `, [req.userId, todayStr]);

    const used = usage?.ai_requests_used || 0;
    
    // -1 means unlimited
    const allowed = dailyLimit === -1 || used < dailyLimit;

    console.log(`[Subscription] Check limit for user ${req.userId}: ${used}/${dailyLimit} (${planName})`);

    return res.json({
      allowed,
      used,
      limit: dailyLimit,
      planName,
    });
  } catch (error: any) {
    console.error('[Subscription] Check limit error:', error);
    return res.status(500).json({ error: 'Failed to check limit' });
  }
});

/**
 * GET /api/subscription/usage
 * Get today's usage (daily tracking)
 */
router.get('/usage', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const todayStr = getTodayPeriod();

    let usage = await queryOne<{
      ai_requests_used: number;
      templates_created: number;
      pdfs_generated: number;
      storage_used_mb: number;
    }>(`
      SELECT ai_requests_used, templates_created, pdfs_generated, storage_used_mb
      FROM usage_tracking
      WHERE user_id = $1 AND period_start = $2
    `, [req.userId, todayStr]);

    if (!usage) {
      // Create usage record for today
      usage = await queryOne(`
        INSERT INTO usage_tracking (user_id, period_start)
        VALUES ($1, $2)
        RETURNING ai_requests_used, templates_created, pdfs_generated, storage_used_mb
      `, [req.userId, todayStr]);
    }

    return res.json({
      usage: {
        aiRequestsUsed: usage?.ai_requests_used || 0,
        templatesCreated: usage?.templates_created || 0,
        pdfsGenerated: usage?.pdfs_generated || 0,
        storageUsedMb: usage?.storage_used_mb || 0,
        periodStart: todayStr,
      },
    });
  } catch (error: any) {
    console.error('[Subscription] Get usage error:', error);
    return res.status(500).json({ error: 'Failed to fetch usage' });
  }
});

/**
 * POST /api/subscription/increment-usage
 * Increment usage counter (daily tracking)
 */
router.post('/increment-usage', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type } = req.body; // 'ai_request' | 'template' | 'pdf'
    const todayStr = getTodayPeriod();

    let column = '';
    switch (type) {
      case 'ai_request':
        column = 'ai_requests_used';
        break;
      case 'template':
        column = 'templates_created';
        break;
      case 'pdf':
        column = 'pdfs_generated';
        break;
      default:
        return res.status(400).json({ error: 'Invalid usage type' });
    }

    await queryOne(`
      INSERT INTO usage_tracking (user_id, period_start, ${column})
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, period_start)
      DO UPDATE SET ${column} = usage_tracking.${column} + 1, updated_at = NOW()
    `, [req.userId, todayStr]);

    console.log(`[Subscription] Incremented ${type} for user ${req.userId} on ${todayStr}`);

    return res.json({ success: true });
  } catch (error: any) {
    console.error('[Subscription] Increment usage error:', error);
    return res.status(500).json({ error: 'Failed to increment usage' });
  }
});

export default router;

