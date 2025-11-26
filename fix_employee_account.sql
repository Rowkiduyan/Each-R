-- ============================================
-- FIX: Create/Update Employee Account
-- ============================================
-- NOTE: You CANNOT create auth users directly via SQL.
-- Auth users must be created via Supabase Auth API or Admin API.
-- This SQL will help fix the profile and employee records.

-- IMPORTANT: Before running these, you need to:
-- 1. Create the auth user using Supabase Admin API or disable email confirmation
-- 2. Then run these queries to ensure profile and employee records are correct

-- ============================================
-- STEP 1: Check what needs to be fixed
-- ============================================
-- Run the diagnostic queries first from check_employee_account.sql

-- ============================================
-- STEP 2: Update profile role to "Employee" (if profile exists but role is wrong)
-- ============================================
-- Replace 'USER_ID_HERE' with the actual auth user ID from auth.users
-- Replace 'ladalem@roadwise.com' with the actual employee email

UPDATE profiles
SET 
    role = 'Employee',
    email = 'ladalem@roadwise.com'
WHERE id = 'USER_ID_HERE'  -- Get this from auth.users query
   OR email = 'ladalem@roadwise.com';

-- ============================================
-- STEP 3: Create profile if it doesn't exist
-- ============================================
-- First, get the user ID from auth.users, then:
-- Replace all placeholders with actual values

INSERT INTO profiles (id, email, role, first_name, last_name)
VALUES (
    'USER_ID_FROM_AUTH_USERS',  -- Get from: SELECT id FROM auth.users WHERE email = 'ladalem@roadwise.com'
    'ladalem@roadwise.com',
    'Employee',
    'Lorenz',
    'Adalem'
)
ON CONFLICT (id) 
DO UPDATE SET
    role = 'Employee',
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

-- ============================================
-- STEP 4: Update employees table email (if needed)
-- ============================================
UPDATE employees
SET email = 'ladalem@roadwise.com'
WHERE email IS NULL 
   OR email = ''
   OR (fname ILIKE '%lorenz%' AND lname ILIKE '%adalem%');

-- ============================================
-- ALTERNATIVE: Complete fix for a specific employee
-- ============================================
-- This assumes you know the employee's name and want to link everything

-- First, find the auth user ID (run this first):
-- SELECT id, email FROM auth.users WHERE email = 'ladalem@roadwise.com';

-- Then update profile (replace USER_ID with result from above):
UPDATE profiles
SET 
    role = 'Employee',
    email = 'ladalem@roadwise.com',
    first_name = 'Lorenz',
    last_name = 'Adalem'
WHERE id = 'USER_ID_HERE'
   OR email = 'ladalem@roadwise.com';

-- If profile doesn't exist, create it:
-- INSERT INTO profiles (id, email, role, first_name, last_name)
-- SELECT 
--     u.id,
--     'ladalem@roadwise.com',
--     'Employee',
--     'Lorenz',
--     'Adalem'
-- FROM auth.users u
-- WHERE u.email = 'ladalem@roadwise.com'
-- ON CONFLICT (id) DO UPDATE SET role = 'Employee';

