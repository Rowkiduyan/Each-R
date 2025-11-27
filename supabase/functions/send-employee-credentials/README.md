# Send Employee Credentials Edge Function

This Supabase Edge Function sends employee account credentials via SendGrid when an applicant is marked as hired.

## Setup

1. **Deploy the function:**
   ```bash
   supabase functions deploy send-employee-credentials
   ```

2. **Set environment variables in Supabase Dashboard:**
   - Go to your Supabase project dashboard
   - Navigate to Edge Functions → Settings
   - Add the following secrets:
     - `SENDGRID_API_KEY`: Your SendGrid API key
     - `SENDGRID_FROM_EMAIL`: The email address to send from (e.g., `noreply@roadwise.com`)

3. **Update the login URL in the email template:**
   - Edit `index.ts` and replace `https://your-domain.com/employee/login` with your actual employee login URL

## Usage

The function is automatically called from `HrRecruitment.jsx` when an applicant is marked as hired. It receives:
- `toEmail`: The applicant's email address (where to send the credentials)
- `employeeEmail`: The generated employee email
- `employeePassword`: The generated employee password
- `firstName`: Employee's first name
- `lastName`: Employee's last name
- `fullName`: Employee's full name

## Email Template

The email includes:
- Professional HTML design with Roadwise branding
- Employee email and password in a secure format
- Instructions for first login
- Security reminder to change password
- Next steps for new employees
