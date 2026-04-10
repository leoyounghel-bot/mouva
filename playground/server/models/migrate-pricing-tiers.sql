-- Update Subscription Plans - Simple Daily AI Generation Limits
-- No separate AI Report feature - all included in daily limit

INSERT INTO subscription_plans (id, name, description, price_monthly, price_yearly, features, limits, sort_order) VALUES
  -- Free Plan (50 AI generations/day)
  ('free', 'Free', '免费体验基础功能', NULL, NULL, 
   '{"ai_chat": true, "ai_design": true, "ai_ppt": true, "templates": true, "pdf_export": true}',
   '{"ai_generation_per_day": 25, "max_templates": 3, "storage_mb": 50}',
   1),
  
  -- Starter Plan - $9.99 (100 AI generations/day)
  ('starter', 'Starter', '适合个人用户', 9.99, 99.99,
   '{"ai_chat": true, "ai_design": true, "ai_ppt": true, "templates": true, "pdf_export": true, "priority_support": false}',
   '{"ai_generation_per_day": 100, "max_templates": -1, "storage_mb": 2000}',
   2),
  
  -- Pro Plan - $29.99 (200 AI generations/day)
  ('pro', 'Pro', '专业用户首选', 29.99, 299.99,
   '{"ai_chat": true, "ai_design": true, "ai_ppt": true, "templates": true, "pdf_export": true, "priority_support": true, "custom_fonts": true}',
   '{"ai_generation_per_day": 200, "max_templates": -1, "storage_mb": 5000}',
   3),
  
  -- Enterprise Plan - $49.99 (unlimited)
  ('enterprise', 'Enterprise', '解锁全部功能', 49.99, 499.99,
   '{"ai_chat": true, "ai_design": true, "ai_ppt": true, "templates": true, "pdf_export": true, "priority_support": true, "custom_fonts": true, "api_access": true}',
   '{"ai_generation_per_day": -1, "max_templates": -1, "storage_mb": 10000}',
   4)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  sort_order = EXCLUDED.sort_order;
