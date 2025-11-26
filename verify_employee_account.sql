-- ============================================
-- VERIFY: Check if everything is set up correctly
-- Run this to verify the account is ready
-- ============================================

-- Check 1: Verify auth user exists and is confirmed
SELECT 
    id,
    email,
    email_confirmed_at,
    confirmed_at,
    created_at
FROM auth.users
WHERE email = 'ladalem@roadwise.com';

-- Check 2: Verify profile exists with correct role
SELECT 
    id,
    email,
    role,
    first_name,
    last_name
FROM profiles
WHERE email = 'ladalem@roadwise.com'
   OR id = '137bc403-5a7a-46ed-a880-f2e1ad197006';

-- Check 3: Verify everything is linked correctly
SELECT 
    u.id as auth_user_id,
    u.email as auth_email,
    u.email_confirmed_at,
    u.confirmed_at,
    p.id as profile_id,
    p.role as profile_role,
    p.first_name,
    p.last_name
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'ladalem@roadwise.com';

