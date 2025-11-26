# How to Deploy the Send Employee Credentials Edge Function

This guide will walk you through deploying the `send-employee-credentials` Edge Function to Supabase.

## Prerequisites

1. **Install Supabase CLI** (if not already installed)

   **For Windows (using PowerShell):**
   ```powershell
   # Using Scoop (recommended)
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase

   # OR using npm
   npm install -g supabase
   ```

   **For Windows (using Chocolatey):**
   ```powershell
   choco install supabase
   ```

   **For macOS/Linux:**
   ```bash
   brew install supabase/tap/supabase
   # OR
   npm install -g supabase
   ```

2. **Verify installation:**
   ```bash
   supabase --version
   ```

## Step 1: Login to Supabase

1. Open PowerShell or Command Prompt in your project directory
2. Login to Supabase:
   ```bash
   supabase login
   ```
   - This will open your browser to authenticate
   - Follow the prompts to complete login

## Step 2: Link Your Project

1. Get your project reference ID from your Supabase dashboard:
   - Go to https://supabase.com/dashboard
   - Select your project
   - Go to Settings → General
   - Copy the "Reference ID" (it looks like: `nokbftmzugwyfgyprcwh`)

2. Link your local project to your Supabase project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   Replace `YOUR_PROJECT_REF` with your actual project reference ID.

## Step 3: Deploy the Edge Function

1. Make sure you're in your project root directory:
   ```bash
   cd "C:\Users\Lorenz\Desktop\Codes\Main Each R\Each-R-1"
   ```

2. Deploy the function:
   ```bash
   supabase functions deploy send-employee-credentials
   ```

   If successful, you should see output like:
   ```
   Deploying function send-employee-credentials...
   Function deployed successfully!
   ```

## Step 4: Set Environment Variables (Secrets)

The Edge Function needs your SendGrid API key and email address. Set these as secrets:

1. **Option A: Using Supabase Dashboard (Recommended)**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Navigate to **Edge Functions** → **Settings** (or **Secrets**)
   - Click **Add Secret** and add:
     - **Name:** `SENDGRID_API_KEY`
     - **Value:** Your SendGrid API key
   - Click **Add Secret** again and add:
     - **Name:** `SENDGRID_FROM_EMAIL`
     - **Value:** Your sender email (e.g., `noreply@roadwise.com`)

2. **Option B: Using Supabase CLI**
   ```bash
   # Set SendGrid API Key
   supabase secrets set SENDGRID_API_KEY=your_sendgrid_api_key_here

   # Set From Email
   supabase secrets set SENDGRID_FROM_EMAIL=noreply@roadwise.com
   ```

## Step 5: Verify Deployment

1. Check that the function is deployed:
   ```bash
   supabase functions list
   ```

2. You should see `send-employee-credentials` in the list.

## Step 6: Test the Function (Optional)

You can test the function using the Supabase dashboard:
1. Go to **Edge Functions** in your Supabase dashboard
2. Click on `send-employee-credentials`
3. Use the "Invoke" tab to test with sample data:
   ```json
   {
     "toEmail": "test@example.com",
     "employeeEmail": "ladalem@roadwise.com",
     "employeePassword": "LAdalem19900101!",
     "firstName": "Lorenz",
     "lastName": "Adalem",
     "fullName": "Lorenz Vincel A. Adalem"
   }
   ```

## Troubleshooting

### Error: "command not found: supabase"
- Make sure Supabase CLI is installed and in your PATH
- Try restarting your terminal/PowerShell

### Error: "Not logged in"
- Run `supabase login` again
- Make sure you're authenticated

### Error: "Project not linked"
- Run `supabase link --project-ref YOUR_PROJECT_REF`
- Make sure you're using the correct project reference ID

### Error: "Function not found"
- Make sure you're in the project root directory
- Verify the function exists at: `supabase/functions/send-employee-credentials/index.ts`

### Email not sending
- Check that `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL` secrets are set correctly
- Verify your SendGrid API key has permission to send emails
- Check the Edge Function logs in Supabase dashboard for error messages

## Next Steps

Once deployed, the function will automatically be called when you mark an applicant as hired in the HR Recruitment dashboard. The employee will receive an email with their account credentials.

## Additional Resources

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [SendGrid API Documentation](https://docs.sendgrid.com/api-reference)

