import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAuthToken, getCurrentUser, User } from '../api/client';
import './Pricing.css';

interface Plan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number | null;
  priceYearly: number | null;
  features: Record<string, boolean>;
  limits: Record<string, number>;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Try Mouva with basic features',
    priceMonthly: null,
    priceYearly: null,
    features: { ai_chat: true, ai_design: true, ai_ppt: true, templates: true, pdf_export: true },
    limits: { ai_generation_per_day: 10, max_templates: 3, storage_mb: 50 },
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for individuals and creators',
    priceMonthly: 9.99,
    priceYearly: 99.99,
    features: { ai_chat: true, ai_design: true, ai_ppt: true, templates: true, pdf_export: true, priority_support: true, custom_fonts: true },
    limits: { ai_generation_per_day: 200, max_templates: -1, storage_mb: 5000 },
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Unlimited power for professionals',
    priceMonthly: 29.99,
    priceYearly: 299.99,
    features: { ai_chat: true, ai_design: true, ai_ppt: true, templates: true, pdf_export: true, priority_support: true, custom_fonts: true, api_access: true },
    limits: { ai_generation_per_day: -1, max_templates: -1, storage_mb: 10000 },
  },
];

const FEATURE_LABELS: Record<string, string> = {
  ai_chat: 'AI Chat',
  ai_design: 'AI Template Design',
  ai_ppt: 'AI PPT',
  templates: 'Template Library',
  pdf_export: 'PDF Export',
  priority_support: 'Priority Support',
  custom_fonts: 'Custom Fonts',
  api_access: 'API Access',
};

const LIMIT_LABELS: Record<string, string> = {
  ai_generation_per_day: 'AI Generations/Day',
  max_templates: 'Max Templates',
  storage_mb: 'Storage',
};

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getAuthToken()) {
      getCurrentUser().then(setCurrentUser);
    }
  }, []);

  const currentPlan = currentUser?.subscription?.plan || 'free';

  const handleSubscribe = async (planId: string) => {
    if (!getAuthToken()) {
      window.location.href = '/auth?redirect=/pricing';
      return;
    }

    if (planId === 'free') return;

    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${API_BASE}/payments/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          planId,
          billingCycle,
          successUrl: `${window.location.origin}/ai-designer?upgrade=success`,
          cancelUrl: `${window.location.origin}/pricing`,
        }),
      });

      const data = await response.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert('Unable to create payment session. Please try again later.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Payment service is temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const formatLimit = (key: string, value: number): string => {
    if (value === -1) return 'Unlimited';
    if (key === 'storage_mb') {
      return value >= 1000 ? `${(value / 1000).toFixed(0)} GB` : `${value} MB`;
    }
    return `${value}`;
  };

  return (
    <div className="pricing-page">
      {/* Navigation */}
      <nav className="nav">
        <div className="nav-inner">
          <Link to="/" className="logo">
            <img src="/logo.svg" alt="Mouva" className="logo-image" />
            <span className="logo-text">Mouva</span>
          </Link>
          <div className="nav-right">
            <Link to="/pricing" className="nav-link active">Pricing</Link>
            <Link to="/auth" className="nav-btn">Start Free</Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="pricing-header">
        <h1>Choose the Right Plan for You</h1>
        <p>Unlock more AI features and boost your productivity</p>
      </header>

      {/* Billing Toggle */}
      <div className="billing-toggle">
        <button
          className={billingCycle === 'monthly' ? 'active' : ''}
          onClick={() => setBillingCycle('monthly')}
        >
          Monthly
        </button>
        <button
          className={billingCycle === 'yearly' ? 'active' : ''}
          onClick={() => setBillingCycle('yearly')}
        >
          Yearly
          <span className="save-badge">Save 17%</span>
        </button>
      </div>

      {/* Plans Grid */}
      <div className="plans-grid">
        {PLANS.map((plan) => {
          const isCurrentPlan = plan.id === currentPlan;
          const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
          const isPopular = plan.id === 'starter';

          return (
            <div
              key={plan.id}
              className={`plan-card ${isPopular ? 'popular' : ''} ${isCurrentPlan ? 'current' : ''}`}
            >
              {isPopular && <div className="popular-badge">Most Popular</div>}
              {isCurrentPlan && <div className="current-badge">Current Plan</div>}

              <h2 className="plan-name">{plan.name}</h2>
              <p className="plan-description">{plan.description}</p>

              <div className="plan-price">
                {price === null ? (
                  <span className="price-amount">$0</span>
                ) : (
                  <>
                    <span className="price-amount">${price.toFixed(2)}</span>
                    <span className="price-period">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                  </>
                )}
              </div>

              {/* AI Limits Section */}
              <div className="plan-limits">
                <h4>AI Usage Limits</h4>
                {Object.entries(plan.limits).map(([key, value]) => (
                  <div key={key} className="limit-item">
                    <span className="limit-label">{LIMIT_LABELS[key] || key}</span>
                    <span className="limit-value">{formatLimit(key, value)}</span>
                  </div>
                ))}
              </div>

              {/* Features List */}
              <div className="plan-features">
                <h4>Features</h4>
                {Object.entries(plan.features).map(([key, enabled]) => (
                  <div key={key} className={`feature-item ${enabled ? 'enabled' : 'disabled'}`}>
                    <span className="feature-icon">{enabled ? '✓' : '✗'}</span>
                    <span className="feature-label">{FEATURE_LABELS[key] || key}</span>
                  </div>
                ))}
              </div>

              <button
                className={`subscribe-btn ${isCurrentPlan ? 'current' : ''}`}
                onClick={() => handleSubscribe(plan.id)}
                disabled={isCurrentPlan || loading}
              >
                {isCurrentPlan ? 'Current Plan' : price === null ? 'Get Started' : 'Subscribe Now'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-left">
            <Link to="/" className="footer-logo-link">
              <img src="/logo.svg" alt="Mouva" className="footer-logo-image" />
              <span className="footer-logo">Mouva</span>
            </Link>
          </div>
          <div className="footer-right">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <span>© 2025</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
