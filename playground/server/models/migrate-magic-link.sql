-- Modify verification_codes to support long magic link tokens
ALTER TABLE verification_codes ALTER COLUMN code TYPE VARCHAR(255);
