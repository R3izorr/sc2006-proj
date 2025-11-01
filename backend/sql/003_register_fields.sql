-- Registration extra fields: display_name exists; add industry and phone
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Optional check constraint for industry values as requested
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_industry_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_industry_check CHECK (industry IS NULL OR industry IN ('student','businessmen','investmen'));
  END IF;
END $$;


