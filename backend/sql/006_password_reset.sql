-- Password reset fields
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS password_reset_token TEXT,
  ADD COLUMN IF NOT EXISTS password_reset_sent_at TIMESTAMPTZ;




