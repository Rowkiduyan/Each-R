-- ============================================
-- FIX: Create/Update Employee Account
-- Run these queries ONE AT A TIME
-- ============================================

-- STEP 1: Update profile role to "Employee"
-- Run this first
UPDATE profiles
SET 
    role = 'Employee',
    email = 'ladalem@roadwise.com',
    first_name = 'Lorenz Vincel',
    last_name = 'Adalem'
WHERE id = '137bc403-5a7a-46ed-a880-f2e1ad197006'
   OR email = 'ladalem@roadwise.com';

-- STEP 2: Create profile if it doesn't exist (run this only if STEP 1 didn't update anything)
-- This will insert if profile doesn't exist, or update if it does
INSERT INTO profiles (id, email, role, first_name, last_name)
VALUES (
    '137bc403-5a7a-46ed-a880-f2e1ad197006',
    'ladalem@roadwise.com',
    'Employee',
    'Lorenz Vincel',
    'Adalem'
)
ON CONFLICT (id) 
DO UPDATE SET
    role = 'Employee',
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

-- STEP 3: Update employees table email (if needed)
UPDATE employees
SET email = 'ladalem@roadwise.com'
WHERE email IS NULL 
   OR email = ''
   OR (fname ILIKE '%lorenz%' AND lname ILIKE '%adalem%');

