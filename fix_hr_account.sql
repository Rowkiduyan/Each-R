-- ============================================
-- FIX: Ensure HR Account Has Correct Role
-- ============================================
-- Run this to ensure delacruzhr@gmail.com has HR role

-- Step 1: Check current profile
SELECT 
    id,
    email,
    role,
    first_name,
    last_name
FROM profiles
WHERE email = 'delacruzhr@gmail.com';

-- Step 2: Update profile to have HR role (if it exists)
UPDATE profiles
SET role = 'HR'
WHERE email = 'delacruzhr@gmail.com';

-- Step 3: If profile doesn't exist, create it
-- First, get the auth user ID:
-- SELECT id FROM auth.users WHERE email = 'delacruzhr@gmail.com';
-- Then replace USER_ID_HERE with the actual ID and run:

INSERT INTO profiles (id, email, role, first_name, last_name)
SELECT 
    u.id,
    u.email,
    'HR',
    COALESCE(u.raw_user_meta_data->>'first_name', ''),
    COALESCE(u.raw_user_meta_data->>'last_name', '')
FROM auth.users u
WHERE u.email = 'delacruzhr@gmail.com'
ON CONFLICT (id) 
DO UPDATE SET
    role = 'HR',
    email = EXCLUDED.email;

-- Step 4: Verify the fix
SELECT 
    p.id,
    p.email,
    p.role,
    p.first_name,
    p.last_name,
    u.email_confirmed_at
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.email = 'delacruzhr@gmail.com';

