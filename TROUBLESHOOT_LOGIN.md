# Troubleshooting Employee Login

## Your Account Status (from the images)

✅ **Auth User:** Exists and is confirmed (`ladalem@roadwise.com`)
✅ **Profile:** Exists with role "Employee"
✅ **Email Confirmed:** Yes (26 Nov, 2025 16:17)
✅ **Last Signed In:** Yes (26 Nov, 2025 16:18) - This means login worked before!

## The Issue

Since the account has logged in before, the problem is likely:

1. **Wrong Password** - The password might have been changed or is incorrect
2. **Profile Role Case Sensitivity** - Though the code normalizes it, let's verify

## Quick Fixes

### Fix 1: Update Profile Role (if needed)

Run this single SQL query:

```sql
UPDATE profiles
SET role = 'Employee'
WHERE id = '137bc403-5a7a-46ed-a880-f2e1ad197006';
```

### Fix 2: Reset Password

If the password is wrong, you can reset it:

1. Go to Supabase Dashboard → Authentication → Users
2. Find `ladalem@roadwise.com`
3. Click on the user
4. Click "Send password recovery" button
5. Check the email for password reset link

OR manually set a new password in the code and recreate the account.

### Fix 3: Check Browser Console

When you try to log in, open Developer Tools (F12) → Console tab and look for:
- Any error messages
- What the actual error is from Supabase Auth

### Fix 4: Verify the Password Format

The password should be: `LAdalem20051117!`

Make sure:
- No extra spaces
- Capital L, capital A
- All characters are correct
- The exclamation mark at the end

## Test Login Steps

1. Clear browser cache/cookies for the site
2. Try logging in with:
   - Email: `ladalem@roadwise.com`
   - Password: `LAdalem20051117!`
3. Check browser console for errors
4. If it still fails, check the exact error message

## Most Likely Solution

Since the account logged in before, the password might have been changed. Try:
1. Reset the password via Supabase Dashboard
2. Or check if the password generation in the code matches what was sent in the email

