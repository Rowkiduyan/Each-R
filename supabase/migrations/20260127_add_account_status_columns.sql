-- Add account status columns to profiles table
-- These columns are used to track account expiration and active status for termination/separation

-- Add is_active column (default true)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add account_expires_at column (nullable, only set when account should expire)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS account_expires_at TIMESTAMPTZ;

-- Add index for faster queries filtering by account status
CREATE INDEX IF NOT EXISTS idx_profiles_account_status 
ON profiles(is_active, account_expires_at);

-- Add comment to document the columns
COMMENT ON COLUMN profiles.is_active IS 'Indicates if the account is active. Set to false when account is disabled.';
COMMENT ON COLUMN profiles.account_expires_at IS 'Timestamp when the account expires. Used for termination (5 minutes) or separation (30 days).';

-- Update RLS policies to allow reading these columns
-- (Assumes you already have SELECT policies on profiles table)
-- If not, add this policy:
-- CREATE POLICY "Allow authenticated users to read account status" ON profiles
--   FOR SELECT
--   TO authenticated
--   USING (true);
