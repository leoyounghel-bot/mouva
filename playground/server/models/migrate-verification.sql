-- Verification codes migration
-- Adds table for storing email verification codes

CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for looking up codes by email
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);

-- Index for cleanup of expired codes
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON verification_codes(expires_at);

-- Cleanup old verification codes (run periodically)
-- DELETE FROM verification_codes WHERE expires_at < NOW() - INTERVAL '1 day';
