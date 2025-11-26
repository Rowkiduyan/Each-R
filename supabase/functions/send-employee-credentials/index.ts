// Supabase Edge Function to send employee account credentials via SendGrid
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const SENDGRID_FROM_EMAIL = Deno.env.get("SENDGRID_FROM_EMAIL") || "noreply@roadwise.com";

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // Get the request body
    const {
      toEmail,
      employeeEmail,
      employeePassword,
      firstName,
      lastName,
      fullName,
    } = await req.json();

    if (!toEmail || !employeeEmail || !employeePassword) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    if (!SENDGRID_API_KEY) {
      console.error("SENDGRID_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    // Create HTML email template
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Roadwise - Employee Account</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 36px;
      font-weight: bold;
      font-style: italic;
      color: #dc2626;
      margin-bottom: 10px;
    }
    .title {
      font-size: 24px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 10px;
    }
    .subtitle {
      font-size: 16px;
      color: #6b7280;
      margin-bottom: 30px;
    }
    .content {
      background-color: #f9fafb;
      border-left: 4px solid #dc2626;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .credentials-box {
      background-color: #ffffff;
      border: 2px solid #e5e7eb;
      border-radius: 6px;
      padding: 20px;
      margin: 20px 0;
    }
    .credential-item {
      margin: 15px 0;
    }
    .label {
      font-weight: 600;
      color: #374151;
      font-size: 14px;
      margin-bottom: 5px;
      display: block;
    }
    .value {
      font-family: 'Courier New', monospace;
      font-size: 16px;
      color: #1f2937;
      background-color: #f3f4f6;
      padding: 10px;
      border-radius: 4px;
      word-break: break-all;
    }
    .password-warning {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
      font-size: 14px;
      color: #92400e;
    }
    .button {
      display: inline-block;
      background-color: #dc2626;
      color: #ffffff;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
      text-align: center;
    }
    .highlight {
      color: #dc2626;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Each-R</div>
      <div class="title">Welcome to Roadwise!</div>
      <div class="subtitle">Your Employee Account Has Been Created</div>
    </div>

    <div class="content">
      <p>Dear ${fullName || `${firstName} ${lastName}`},</p>
      <p>Congratulations! We are pleased to inform you that you have been successfully hired and your employee account has been created.</p>
      <p>You can now access the Roadwise Employee Portal using the credentials below:</p>
    </div>

    <div class="credentials-box">
      <div class="credential-item">
        <span class="label">Employee Email:</span>
        <div class="value">${employeeEmail}</div>
      </div>
      <div class="credential-item">
        <span class="label">Password:</span>
        <div class="value">${employeePassword}</div>
      </div>
    </div>

    <div class="password-warning">
      <strong>⚠️ Important:</strong> Please change your password after your first login for security purposes.
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <p style="margin-bottom: 10px;">You can access the Employee Portal at:</p>
      <p style="font-family: 'Courier New', monospace; background-color: #f3f4f6; padding: 10px; border-radius: 4px; margin: 10px 0;">
        [Your Application URL]/employee/login
      </p>
      <p style="font-size: 14px; color: #6b7280; margin-top: 10px;">
        Please contact HR for the exact login URL.
      </p>
    </div>

    <div class="content">
      <p><strong>Next Steps:</strong></p>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Log in using the credentials provided above</li>
        <li>Complete your employee profile</li>
        <li>Review company policies and guidelines</li>
        <li>Contact HR if you have any questions</li>
      </ul>
    </div>

    <div class="footer">
      <p>This is an automated message from <span class="highlight">Roadwise</span>.</p>
      <p>Please do not reply to this email. If you have any questions, please contact the HR department.</p>
      <p style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
        © ${new Date().getFullYear()} Roadwise. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    // Plain text version
    const textContent = `
Welcome to Roadwise!

Dear ${fullName || `${firstName} ${lastName}`},

Congratulations! We are pleased to inform you that you have been successfully hired and your employee account has been created.

You can now access the Roadwise Employee Portal using the credentials below:

Employee Email: ${employeeEmail}
Password: ${employeePassword}

⚠️ Important: Please change your password after your first login for security purposes.

Next Steps:
- Log in using the credentials provided above
- Complete your employee profile
- Review company policies and guidelines
- Contact HR if you have any questions

This is an automated message from Roadwise.
Please do not reply to this email. If you have any questions, please contact the HR department.

© ${new Date().getFullYear()} Roadwise. All rights reserved.
    `;

    // Send email via SendGrid
    const sendGridResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: toEmail }],
            subject: "Welcome to Roadwise - Your Employee Account Credentials",
          },
        ],
        from: { email: SENDGRID_FROM_EMAIL, name: "Roadwise HR" },
        content: [
          {
            type: "text/plain",
            value: textContent,
          },
          {
            type: "text/html",
            value: htmlContent,
          },
        ],
      }),
    });

    if (!sendGridResponse.ok) {
      const errorText = await sendGridResponse.text();
      console.error("SendGrid error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: errorText }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  }
});

