-- Simple fix: Just update the profile role
-- Run this ONE query at a time

UPDATE profiles
SET role = 'Employee'
WHERE id = '137bc403-5a7a-46ed-a880-f2e1ad197006';

