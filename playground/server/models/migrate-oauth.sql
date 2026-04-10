-- OAuth Migration Script
-- Adds OAuth support to existing users table

-- Make password_hash optional for OAuth users
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Add OAuth fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create unique index for OAuth users (one OAuth identity per provider)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth 
  ON users(oauth_provider, oauth_id) WHERE oauth_provider IS NOT NULL;

-- Add comment
COMMENT ON COLUMN users.oauth_provider IS 'OAuth provider: google, microsoft, or null for email/password';
COMMENT ON COLUMN users.oauth_id IS 'Unique user ID from OAuth provider';
COMMENT ON COLUMN users.display_name IS 'User display name from OAuth profile';
COMMENT ON COLUMN users.avatar_url IS 'User avatar URL from OAuth profile';
