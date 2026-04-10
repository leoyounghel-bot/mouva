-- Subscription System Migration
-- Run on Azure PostgreSQL production database

-- =====================================================
-- 1. SUBSCRIPTION PLANS (Master data)
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  features JSONB NOT NULL DEFAULT '{}',
  limits JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default plans
INSERT INTO subscription_plans (id, name, description, price_monthly, price_yearly, features, limits, sort_order) VALUES
  ('free', 'Free', 'Get started with basic features', NULL, NULL, 
   '{"ai_chat": true, "templates": true, "pdf_export": true}',
   '{"ai_requests_per_month": 10, "max_templates": 5, "storage_mb": 100}',
   1),
  ('pro', 'Pro', 'For professionals and small teams', 9.99, 99.99,
   '{"ai_chat": true, "templates": true, "pdf_export": true, "priority_support": true, "custom_fonts": true}',
   '{"ai_requests_per_month": 500, "max_templates": -1, "storage_mb": 5000}',
   2),
  ('enterprise', 'Enterprise', 'For large organizations', 49.99, 499.99,
   '{"ai_chat": true, "templates": true, "pdf_export": true, "priority_support": true, "custom_fonts": true, "api_access": true, "sso": true}',
   '{"ai_requests_per_month": -1, "max_templates": -1, "storage_mb": 50000}',
   3)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  sort_order = EXCLUDED.sort_order;

-- =====================================================
-- 2. USER SUBSCRIPTIONS (Active subscriptions)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id VARCHAR(50) NOT NULL REFERENCES subscription_plans(id) DEFAULT 'free',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  billing_cycle VARCHAR(10) DEFAULT 'monthly',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  payment_provider VARCHAR(50),
  payment_customer_id VARCHAR(255),
  payment_subscription_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure one active subscription per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_active 
  ON user_subscriptions(user_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires ON user_subscriptions(expires_at);

-- =====================================================
-- 3. USER SETTINGS (Preferences)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  language VARCHAR(10) DEFAULT 'zh',
  theme VARCHAR(20) DEFAULT 'light',
  timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
  email_notifications BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. USAGE TRACKING (Monthly quotas)
-- =====================================================
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  ai_requests_used INTEGER DEFAULT 0,
  templates_created INTEGER DEFAULT 0,
  pdfs_generated INTEGER DEFAULT 0,
  storage_used_mb DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_usage_user_period ON usage_tracking(user_id, period_start);

-- =====================================================
-- 5. UPDATE TRIGGERS
-- =====================================================
CREATE TRIGGER update_user_subscriptions_updated_at 
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at 
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_tracking_updated_at 
  BEFORE UPDATE ON usage_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. AUTO-CREATE FREE SUBSCRIPTION FOR NEW USERS
-- =====================================================
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_subscriptions (user_id, plan_id, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT DO NOTHING;
  
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_default_subscription ON users;
CREATE TRIGGER trigger_create_default_subscription
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_default_subscription();

-- =====================================================
-- 7. BACKFILL: Create subscriptions for existing users
-- =====================================================
INSERT INTO user_subscriptions (user_id, plan_id, status)
SELECT id, 'free', 'active' FROM users
WHERE id NOT IN (SELECT user_id FROM user_subscriptions WHERE status = 'active')
ON CONFLICT DO NOTHING;

INSERT INTO user_settings (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM user_settings)
ON CONFLICT DO NOTHING;
