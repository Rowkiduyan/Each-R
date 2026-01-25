// Supabase Edge Function to send employee account credentials via SendGrid
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Email provider: EmailJS (temporary replacement for SendGrid)
const EMAILJS_SERVICE_ID = Deno.env.get("EMAILJS_SERVICE_ID");
const EMAILJS_PUBLIC_KEY = Deno.env.get("EMAILJS_PUBLIC_KEY");
const EMAILJS_PRIVATE_KEY = Deno.env.get("EMAILJS_PRIVATE_KEY");
const EMAILJS_TEMPLATE_ID = Deno.env.get("EMAILJS_TEMPLATE_ID");
const EMAILJS_TEMPLATE_ID_EMPLOYEE_CREDENTIALS = Deno.env.get("EMAILJS_TEMPLATE_ID_EMPLOYEE_CREDENTIALS") || EMAILJS_TEMPLATE_ID;

const HR_FROM_NAME = Deno.env.get("HR_FROM_NAME") || "Roadwise HR";
const HR_REPLY_TO_EMAIL = Deno.env.get("HR_REPLY_TO_EMAIL") || "";
const HR_REPLY_TO_NAME = Deno.env.get("HR_REPLY_TO_NAME") || "Roadwise HR";
const HR_SUPPORT_EMAIL = Deno.env.get("HR_SUPPORT_EMAIL") || HR_REPLY_TO_EMAIL || "noreply@roadwise.com";
const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") || Deno.env.get("VITE_APP_BASE_URL") || "").trim();
const EMPLOYEE_LOGIN_FALLBACK_URL = (Deno.env.get("EMPLOYEE_LOGIN_URL") || "https://each-r-m4qap.ondigitalocean.app/employee/login").trim();

function escapeHtml(input: unknown): string {
  return String(input ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

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
      portalUrl: portalUrlFromBody,
      appBaseUrl,
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

    if (!EMAILJS_SERVICE_ID || !EMAILJS_PUBLIC_KEY || !EMAILJS_TEMPLATE_ID_EMPLOYEE_CREDENTIALS || !EMAILJS_PRIVATE_KEY) {
      console.error("EmailJS not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    const recipientName = (fullName || `${firstName || ''} ${lastName || ''}`.trim() || 'Employee').toString().trim();
    const safeRecipientName = escapeHtml(recipientName);
    const safeEmployeeEmail = escapeHtml(employeeEmail);
    const safeEmployeePassword = escapeHtml(employeePassword);
    const safeSupportEmail = escapeHtml(HR_SUPPORT_EMAIL);

    const originHeader = (req.headers.get("origin") || "").trim();
    const refererHeader = (req.headers.get("referer") || "").trim();
    let originFromReferer = "";
    try {
      if (refererHeader) {
        originFromReferer = new URL(refererHeader).origin;
      }
    } catch {
      originFromReferer = "";
    }

    const normalizeToLoginUrl = (value: string) => {
      const trimmed = String(value || "").trim();
      if (!trimmed) return "";
      if (!/^https?:\/\//i.test(trimmed)) return "";
      if (trimmed.includes("/employee/login")) return trimmed;
      return `${trimmed.replace(/\/+$/, "")}/employee/login`;
    };

    const portalUrl =
      normalizeToLoginUrl(String(portalUrlFromBody || "")) ||
      normalizeToLoginUrl(String(appBaseUrl || "")) ||
      normalizeToLoginUrl(APP_BASE_URL) ||
      normalizeToLoginUrl(originHeader) ||
      normalizeToLoginUrl(originFromReferer) ||
      normalizeToLoginUrl(EMPLOYEE_LOGIN_FALLBACK_URL) ||
      "";
    const safePortalUrl = portalUrl ? escapeHtml(portalUrl) : '';
    const year = new Date().getFullYear();

    const brandRed = '#dc2626';
    const brandRedDark = '#b91c1c';
    const brandRose100 = '#ffe4e6';
    const brandRose200 = '#fecdd3';

    const statusText = 'Employee Account Created';
    const statusBorder = brandRose200;
    const statusBg = '#ffffff';
    const statusFg = brandRedDark;

    const ctaHtml = safePortalUrl
      ? `
                  <tr>
                    <td style="padding:14px 18px 0;">
                      <a href="${safePortalUrl}" style="display:inline-block; background:${brandRed}; color:#ffffff; text-decoration:none; font-weight:900; padding:10px 14px; border-radius:10px; font-family:Segoe UI, Roboto, Arial, sans-serif; font-size:13px;">
                        Sign in here
                      </a>
                    </td>
                  </tr>
      `
      : '';

    // Table-based HTML email template (matches interview/agreement signing styling)
    const htmlContent = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>Welcome to Roadwise - Employee Account</title>
  </head>
  <body style="margin:0; padding:0; background:#ffffff;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
      Your Roadwise employee account credentials.
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#ffffff; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:600px; max-width:600px;">
            <tr>
              <td style="padding:0 12px 12px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${brandRed}; border-radius:14px;">
                  <tr>
                    <td style="padding:16px 18px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td align="left" style="font-family:Segoe UI, Roboto, Arial, sans-serif;">
                            <div style="font-size:14px; font-weight:800; color:#ffffff; letter-spacing:0.2px;">Roadwise HR</div>
                            <div style="font-size:12px; color:${brandRose100}; margin-top:2px;">Each-R • Account Credentials</div>
                          </td>
                          <td align="right" style="font-family:Segoe UI, Roboto, Arial, sans-serif;">
                            <span style="display:inline-block; border:1px solid ${statusBorder}; background:${statusBg}; color:${statusFg}; font-size:12px; font-weight:800; padding:6px 10px; border-radius:999px;">
                              ${escapeHtml(statusText)}
                            </span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 12px; font-family:Segoe UI, Roboto, Arial, sans-serif;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e5e7eb; border-radius:14px;">
                  <tr>
                    <td style="padding:18px 18px 0;">
                      <div style="font-size:12px; font-weight:800; color:#6b7280; text-transform:uppercase; letter-spacing:0.12em;">Employee Credentials</div>
                      <div style="font-size:22px; font-weight:900; color:#111827; margin-top:6px;">Welcome to Roadwise!</div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:14px 18px 0;">
                      <div style="font-size:14px; color:#111827;">Dear ${safeRecipientName},</div>
                      <div style="font-size:14px; color:#374151; margin-top:8px;">Congratulations! Your employee account has been created. Please use the credentials below to log in.</div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:16px 18px 0;">
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px;">
                        <tr>
                          <td style="padding:14px 14px 10px; font-size:13px; font-weight:900; color:#111827; font-family:Segoe UI, Roboto, Arial, sans-serif;">Login Details</td>
                        </tr>
                        <tr>
                          <td style="padding:0 14px 14px; font-family:Segoe UI, Roboto, Arial, sans-serif; font-size:13px; color:#111827;">
                            <div style="margin:8px 0;"><span style="color:#6b7280; font-weight:800;">Employee Email:</span></div>
                            <div style="font-family:Consolas, 'Courier New', monospace; background:#f3f4f6; padding:10px; border-radius:10px; border:1px solid #e5e7eb;">${safeEmployeeEmail}</div>

                            <div style="margin:12px 0 8px;"><span style="color:#6b7280; font-weight:800;">Password:</span></div>
                            <div style="font-family:Consolas, 'Courier New', monospace; background:#f3f4f6; padding:10px; border-radius:10px; border:1px solid #e5e7eb;">${safeEmployeePassword}</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:14px 18px 0;">
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#fff7ed; border:1px solid #fed7aa; border-radius:12px;">
                        <tr>
                          <td style="padding:12px 14px; font-family:Segoe UI, Roboto, Arial, sans-serif; font-size:13px; color:#9a3412;">
                            <strong>Important:</strong> Please change your password after your first login for security purposes.
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  ${ctaHtml}

                  <tr>
                    <td style="padding:16px 18px 18px; font-family:Segoe UI, Roboto, Arial, sans-serif;">
                      ${safePortalUrl ? `
                      <div style="font-size:12px; color:#6b7280; margin-top:10px;">
                        Portal URL: <a href="${safePortalUrl}" style="color:${brandRed}; text-decoration:none; font-weight:800;">${safePortalUrl}</a>
                      </div>
                      ` : `
                      <div style="font-size:12px; color:#6b7280; margin-top:10px;">
                        Please contact HR for the exact Employee Portal login URL.
                      </div>
                      `}
                      <div style="font-size:12px; color:#6b7280; margin-top:12px;">
                        This is an automated message from Roadwise. Please do not reply directly to this email.
                        For support, contact <a href="mailto:${safeSupportEmail}" style="color:${brandRed}; text-decoration:none; font-weight:800;">${safeSupportEmail}</a>.
                      </div>
                      <div style="font-size:11px; color:#9ca3af; margin-top:10px;">© ${year} Roadwise</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
    `;

    // Plain text version
    const textContent = `Welcome to Roadwise!

  Dear ${recipientName},

  Your employee account has been created. Use the credentials below to log in:

  Employee Email: ${employeeEmail}
  Password: ${employeePassword}

  Important: Please change your password after your first login.

  ${portalUrl ? `Employee Portal: ${portalUrl}
  ` : "Please contact HR for the Employee Portal login URL.\n"}

  This is an automated message from Roadwise. Please do not reply directly to this email.
  Support: ${HR_SUPPORT_EMAIL}
    `;

    // Send email via EmailJS
    const emailSubject = "Welcome to Roadwise - Your Employee Account Credentials";
    const emailJsResp = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID_EMPLOYEE_CREDENTIALS,
        user_id: EMAILJS_PUBLIC_KEY,
        accessToken: EMAILJS_PRIVATE_KEY,
        template_params: {
          to_email: toEmail,
          to_name: fullName || `${firstName || ''} ${lastName || ''}`.trim() || 'Employee',
          // Compatibility aliases for templates using {{email}} / {{name}}
          email: toEmail,
          name: fullName || `${firstName || ''} ${lastName || ''}`.trim() || 'Employee',
          subject: emailSubject,
          message: textContent,
          message_html: htmlContent,
          employee_email: employeeEmail,
          employee_password: employeePassword,
          first_name: firstName,
          last_name: lastName,
          reply_to: HR_REPLY_TO_EMAIL || HR_SUPPORT_EMAIL,
          reply_to_name: HR_REPLY_TO_NAME || HR_FROM_NAME,
          from_name: HR_FROM_NAME,
        },
      }),
    });

    if (!emailJsResp.ok) {
      const errorText = await emailJsResp.text();
      console.error("EmailJS error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: errorText }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email queued" }),
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

