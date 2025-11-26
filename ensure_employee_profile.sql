-- ============================================
-- ENSURE Employee Profile is Set Up Correctly
-- Run this to guarantee the profile exists with correct role
-- ============================================

-- This will create the profile if it doesn't exist, or update it if it does
-- Replace the values with the actual employee's information

INSERT INTO profiles (id, email, role, first_name, last_name)
VALUES (
    '137bc403-5a7a-46ed-a880-f2e1ad197006',  -- Auth user ID
    'ladalem@roadwise.com',                    -- Employee email
    'Employee',                                 -- Role (must be exactly "Employee" with capital E)
    'Lorenz Vincel',                           -- First name
    'Adalem'                                   -- Last name
)
ON CONFLICT (id) 
DO UPDATE SET
    role = 'Employee',           -- Ensure role is "Employee"
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name);

-- Verify the profile was created/updated correctly
SELECT 
    id,
    email,
    role,
    first_name,
    last_name,
    created_at,
    updated_at
FROM profiles
WHERE id = '137bc403-5a7a-46ed-a880-f2e1ad197006';

