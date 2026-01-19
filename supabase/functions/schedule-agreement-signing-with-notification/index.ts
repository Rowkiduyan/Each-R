// Supabase Edge Function: schedule-agreement-signing-with-notification
// Schedules agreement signing appointments (separate from interview) and creates notifications + email.

import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.26.0";

// Email provider: EmailJS (temporary replacement for SendGrid)
const EMAILJS_SERVICE_ID = Deno.env.get("EMAILJS_SERVICE_ID");
const EMAILJS_PUBLIC_KEY = Deno.env.get("EMAILJS_PUBLIC_KEY");
const EMAILJS_PRIVATE_KEY = Deno.env.get("EMAILJS_PRIVATE_KEY");
const EMAILJS_TEMPLATE_ID = Deno.env.get("EMAILJS_TEMPLATE_ID");
const EMAILJS_TEMPLATE_ID_AGREEMENT_SIGNING = Deno.env.get("EMAILJS_TEMPLATE_ID_AGREEMENT_SIGNING") || EMAILJS_TEMPLATE_ID;
const HR_FROM_NAME = Deno.env.get("HR_FROM_NAME") || "Roadwise HR (Each-R)";
const HR_REPLY_TO_EMAIL = Deno.env.get("HR_REPLY_TO_EMAIL") || "";
const HR_REPLY_TO_NAME = Deno.env.get("HR_REPLY_TO_NAME") || "Roadwise HR";
const HR_SUPPORT_EMAIL = Deno.env.get("HR_SUPPORT_EMAIL") || HR_REPLY_TO_EMAIL || "noreply@roadwise.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Appointment = {
  date: string;
  time?: string;
  location?: string;
};

function getPayloadMeta(payload: any): any {
  return payload?.meta || payload?.form?.meta || payload?.applicant?.meta || null;
}

function extractApplicantContact(payload: any): { email: string | null; firstName: string | null; lastName: string | null } {
  const src = payload?.form || payload?.applicant || payload || {};
  const email =
    src?.email ||
    src?.contactEmail ||
    payload?.email ||
    payload?.form?.email ||
    payload?.applicant?.email ||
    payload?.meta?.email ||
    null;
  const firstName = src?.firstName || src?.fname || src?.first_name || null;
  const lastName = src?.lastName || src?.lname || src?.last_name || null;
  return { email: email ? String(email).trim() : null, firstName: firstName ? String(firstName).trim() : null, lastName: lastName ? String(lastName).trim() : null };
}

function escapeHtml(input: unknown): string {
  return String(input ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function extractFirstUrl(text: unknown): string | null {
  const raw = String(text ?? '');
  const match = raw.match(/https?:\/\/[^\s<>\"]+/i);
  return match ? match[0] : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          error: "Server misconfigured",
          details: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var for this function.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({} as any));
    const applicationId = body?.applicationId;
    const appointment: Appointment | undefined = body?.appointment || body?.interview;

    if (!applicationId || !appointment?.date) {
      return new Response(
        JSON.stringify({ error: "Missing applicationId or appointment data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Basic date validation (expects YYYY-MM-DD from <input type="date">)
    // If invalid, return 400 instead of crashing later.
    const parsedDate = new Date(appointment.date);
    if (Number.isNaN(parsedDate.getTime())) {
      return new Response(
        JSON.stringify({
          error: "Invalid appointment date",
          details: `Received: ${appointment.date}. Expected YYYY-MM-DD (e.g., 2026-01-16).`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch application for user + payload
    const { data: existingApp, error: fetchError } = await supabase
      .from("applications")
      .select("user_id, payload, endorsed")
      .eq("id", applicationId)
      .single();

    if (fetchError || !existingApp) {
      console.error("Error fetching application:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch application", details: fetchError?.message || String(fetchError || "Unknown error") }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = existingApp.user_id;

    // Normalize payload
    let parsedPayload: any = {};
    try {
      parsedPayload = typeof existingApp.payload === "string"
        ? JSON.parse(existingApp.payload)
        : (existingApp.payload || {});
    } catch {
      parsedPayload = {};
    }

    const meta = getPayloadMeta(parsedPayload);
    const agencyProfileId = meta?.endorsed_by_profile_id || meta?.endorsed_by_auth_user_id || null;
    const isEndorsed = existingApp.endorsed === true || !!agencyProfileId;

    const existingAgreementSigningDate =
      parsedPayload?.agreement_signing?.date ||
      parsedPayload?.agreementSigning?.date ||
      parsedPayload?.signing_interview?.date ||
      parsedPayload?.signingInterview?.date ||
      null;

    const isReschedule = existingAgreementSigningDate !== null;

    // Job title best-effort
    let jobTitle = "your application";
    try {
      jobTitle =
        parsedPayload?.job?.title ||
        parsedPayload?.title ||
        parsedPayload?.job_title ||
        jobTitle;
    } catch {
      // ignore
    }

    const updatedPayload: any = {
      ...parsedPayload,
      agreement_signing: {
        ...(parsedPayload?.agreement_signing || {}),
        date: appointment.date,
        time: appointment.time,
        location: appointment.location,
      },
      agreement_signing_confirmed: "Idle",
      agreement_signing_confirmed_at: null,
    };

    // IMPORTANT: do NOT touch interview_* columns here.
    const { error: updateError } = await supabase
      .from("applications")
      .update({
        payload: updatedPayload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    if (updateError) {
      console.error("Error updating application:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update application", details: updateError?.message || String(updateError || "Unknown error") }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const formattedDate = parsedDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Format time to 12-hour format
    let safeTime = 'To be confirmed'
    if (appointment.time) {
      try {
        const [hours, minutes] = appointment.time.split(':')
        const hour = parseInt(hours, 10)
        const minute = (minutes || '00').padStart(2, '0')
        const period = hour >= 12 ? 'PM' : 'AM'
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
        safeTime = `${displayHour}:${minute} ${period}`
      } catch (e) {
        safeTime = appointment.time
      }
    }

    const appointmentLocationRaw = appointment.location || "To be confirmed";

    const notificationType = isReschedule ? "agreement_signing_rescheduled" : "agreement_signing_scheduled";
    const notificationTitle = isReschedule ? "Agreement Signing Rescheduled" : "Agreement Signing Scheduled";
    const notificationMessage = isReschedule
      ? `Your agreement signing appointment has been rescheduled to ${formattedDate} at ${safeTime} in ${appointmentLocationRaw}. Please check your application and confirm your availability.`
      : `Your agreement signing appointment has been scheduled for ${formattedDate} at ${safeTime} in ${appointmentLocationRaw}. Please confirm your availability.`;

    // Applicant notification
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        application_id: applicationId,
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        read: false,
        created_at: new Date().toISOString(),
      });

    if (notificationError) {
      console.error("Error creating notification:", notificationError);
    }

    // Agency notification (endorsed applicants)
    if (isEndorsed && agencyProfileId) {
      const { data: applicant, error: applicantError } = await supabase
        .from("applicants")
        .select("fname, lname")
        .eq("id", userId)
        .maybeSingle();

      const applicantName = applicant
        ? `${applicant.fname || ""} ${applicant.lname || ""}`.trim() || "Endorsed applicant"
        : "Endorsed applicant";

      const agencyNotificationTitle = isReschedule
        ? "Endorsed Employee Agreement Signing Rescheduled"
        : "Endorsed Employee Agreement Signing Scheduled";

      const agencyNotificationMessage = isReschedule
        ? `Agreement signing appointment for ${applicantName} has been rescheduled to ${formattedDate} at ${safeTime} in ${appointmentLocationRaw}.`
        : `Agreement signing appointment for ${applicantName} has been scheduled for ${formattedDate} at ${safeTime} in ${appointmentLocationRaw}.`;

      const { error: agencyNotificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: agencyProfileId,
          application_id: applicationId,
          type: notificationType,
          title: agencyNotificationTitle,
          message: agencyNotificationMessage,
          read: false,
          created_at: new Date().toISOString(),
        });

      if (agencyNotificationError) {
        console.error("Error creating agency notification:", agencyNotificationError);
      }
    }

    // Email via EmailJS
    let emailSent = false;
    let emailMessageId: string | null = null;
    let emailError: any = null;
    let emailTo: string | null = null;

    if (!EMAILJS_SERVICE_ID || !EMAILJS_PUBLIC_KEY || !EMAILJS_TEMPLATE_ID_AGREEMENT_SIGNING || !EMAILJS_PRIVATE_KEY) {
      emailError = {
        code: 'missing_emailjs_config',
        message: 'EMAILJS_SERVICE_ID / EMAILJS_PUBLIC_KEY / EMAILJS_PRIVATE_KEY / EMAILJS_TEMPLATE_ID_AGREEMENT_SIGNING not configured',
      };
      console.error("EmailJS not configured - skipping agreement signing email");
    } else {
      const { data: applicant, error: applicantError } = await supabase
        .from("applicants")
        .select("email, fname, lname")
        .eq("id", userId)
        .maybeSingle();

      if (applicantError) {
        console.error("Error fetching applicant for email:", applicantError);
      }

      const payloadContact = extractApplicantContact(parsedPayload);
      const toEmail = (applicant?.email || payloadContact.email || '').trim();
      const firstName = (applicant?.fname || payloadContact.firstName || 'Applicant').trim();
      const lastName = (applicant?.lname || payloadContact.lastName || '').trim();
      const fullName = `${firstName} ${lastName}`.trim();

      if (!toEmail) {
        emailError = { code: 'missing_recipient_email', message: 'No applicant email found in applicants table or application payload' };
        console.warn("No applicant email found for user:", userId);
      } else {
        emailTo = toEmail;

        const generatedAtIso = new Date().toISOString();
        const scheduleRef = `${applicationId}:${generatedAtIso}`;

        const apptDateDisplay = formattedDate;
        const apptTimeDisplay = safeTime;
        const appointmentLocationDisplay = appointmentLocationRaw || 'To be confirmed';
        const meetingUrl = extractFirstUrl(appointmentLocationDisplay);

        const scheduleTitle = 'Agreement Signing';
        const emailSubject = isReschedule
          ? `Updated ${scheduleTitle} — ${jobTitle} — ${apptDateDisplay} at ${apptTimeDisplay}`
          : `${scheduleTitle} Scheduled — ${jobTitle} — ${apptDateDisplay} at ${apptTimeDisplay}`;

        const pillText = isReschedule ? `${scheduleTitle} Updated` : `${scheduleTitle} Scheduled`;
        const introText = isReschedule
          ? 'This email confirms an update to your agreement signing appointment. Please review the updated details below.'
          : 'This email confirms your agreement signing appointment. Please review the details below.';

        const safeFullName = escapeHtml(fullName || firstName);
        const safeJobTitle = escapeHtml(jobTitle);
        const safeDate = escapeHtml(apptDateDisplay);
        const safeTimeDisplay = escapeHtml(apptTimeDisplay);
        const safeLocationHtml = escapeHtml(appointmentLocationDisplay);
        const safeScheduleRef = escapeHtml(scheduleRef);
        const safeGeneratedAt = escapeHtml(generatedAtIso);
        const safeSupportEmail = escapeHtml(HR_SUPPORT_EMAIL);

        const statusText = pillText;
        const brandRed = '#dc2626';
        const brandRedDark = '#b91c1c';
        const brandRose100 = '#ffe4e6';
        const brandRose200 = '#fecdd3';
        const statusBorder = brandRose200;
        const statusBg = '#ffffff';
        const statusFg = brandRedDark;

        const primaryCtaUrl = meetingUrl || '';
        const primaryCtaLabel = meetingUrl ? 'Open appointment link' : '';

        const ctaHtml = primaryCtaUrl
          ? `
                  <tr>
                    <td style="padding:14px 18px 0;">
                      <a href="${escapeHtml(primaryCtaUrl)}" style="display:inline-block; background:${brandRed}; color:#ffffff; text-decoration:none; font-weight:900; padding:10px 14px; border-radius:10px; font-family:Segoe UI, Roboto, Arial, sans-serif; font-size:13px;">
                        ${escapeHtml(primaryCtaLabel)}
                      </a>
                    </td>
                  </tr>
          `
          : '';

        const htmlContent = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${escapeHtml(emailSubject)}</title>
  </head>
  <body style="margin:0; padding:0; background:#ffffff;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
      ${escapeHtml(scheduleTitle)} on ${safeDate} at ${safeTimeDisplay}.
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
                            <div style="font-size:12px; color:${brandRose100}; margin-top:2px;">Each-R • Recruitment Updates</div>
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
                      <div style="font-size:12px; font-weight:800; color:#6b7280; text-transform:uppercase; letter-spacing:0.12em;">${escapeHtml(scheduleTitle)}</div>
                      <div style="font-size:22px; font-weight:900; color:#111827; margin-top:6px;">${safeJobTitle}</div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:14px 18px 0;">
                      <div style="font-size:14px; color:#111827;">Dear ${safeFullName},</div>
                      <div style="font-size:14px; color:#374151; margin-top:8px;">${escapeHtml(introText)}</div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:16px 18px 0;">
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px;">
                        <tr>
                          <td style="padding:14px 14px 10px; font-size:13px; font-weight:900; color:#111827; font-family:Segoe UI, Roboto, Arial, sans-serif;">Appointment Details</td>
                        </tr>
                        <tr>
                          <td style="padding:0 14px 14px; font-family:Segoe UI, Roboto, Arial, sans-serif; font-size:13px; color:#111827;">
                            <div style="margin:6px 0;"><span style="color:#6b7280; font-weight:800;">Date:</span> ${safeDate}</div>
                            <div style="margin:6px 0;"><span style="color:#6b7280; font-weight:800;">Time:</span> ${safeTimeDisplay}</div>
                            <div style="margin:6px 0;"><span style="color:#6b7280; font-weight:800;">Location:</span> ${safeLocationHtml}</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  ${ctaHtml}

                  <tr>
                    <td style="padding:16px 18px 0;">
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#ffffff; border:1px solid #e5e7eb; border-radius:12px;">
                        <tr>
                          <td style="padding:14px 14px 10px; font-size:13px; font-weight:900; color:#111827; font-family:Segoe UI, Roboto, Arial, sans-serif;">Next Steps</td>
                        </tr>
                        <tr>
                          <td style="padding:0 14px 14px; font-family:Segoe UI, Roboto, Arial, sans-serif; font-size:13px; color:#374151;">
                            <ul style="margin:6px 0 0 18px; padding:0;">
                              <li style="margin:6px 0;">Please confirm your availability through the applicant portal.</li>
                              <li style="margin:6px 0;">Arrive at least 10–15 minutes before your scheduled time.</li>
                              <li style="margin:6px 0;">Prepare a valid ID and any required documents.</li>
                            </ul>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:16px 18px 18px; font-family:Segoe UI, Roboto, Arial, sans-serif;">
                      <div style="font-size:12px; color:#6b7280;">
                        This is an automated message from Roadwise. Please do not reply directly to this email.
                        For support, contact <a href="mailto:${safeSupportEmail}" style="color:${brandRed}; text-decoration:none; font-weight:800;">${safeSupportEmail}</a>.
                      </div>
                      <div style="font-size:11px; color:#9ca3af; margin-top:10px;">
                        Reference: ${safeScheduleRef}<br/>
                        Generated: ${safeGeneratedAt}<br/>
                        Note: Email delivery may be delayed by spam filtering. Your latest schedule in the portal is the source of truth.
                      </div>
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

        const textContent = `Roadwise - Agreement Signing ${isReschedule ? "Rescheduled" : "Scheduled"}

Dear ${fullName || firstName},

${isReschedule ? "Your agreement signing schedule has been updated." : "You have been scheduled for an agreement signing appointment."}

Position: ${jobTitle}
Date: ${formattedDate}
Time: ${safeTime}
Location: ${appointmentLocationRaw}

Please confirm your availability through the applicant portal.

This is an automated message from Roadwise. Please do not reply directly to this email.

Reference: ${scheduleRef}
Generated: ${generatedAtIso}
Note: Email delivery may be delayed by spam filtering. Your latest schedule in the portal is the source of truth.
        `;

        try {
          const emailJsResp = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              service_id: EMAILJS_SERVICE_ID,
              template_id: EMAILJS_TEMPLATE_ID_AGREEMENT_SIGNING,
              user_id: EMAILJS_PUBLIC_KEY,
              accessToken: EMAILJS_PRIVATE_KEY,
              template_params: {
                to_email: toEmail,
                to_name: fullName || firstName,
                // Compatibility aliases for templates using {{email}} / {{name}}
                email: toEmail,
                name: fullName || firstName,
                subject: emailSubject,
                message: textContent,
                message_html: htmlContent,
                schedule_kind: 'agreement_signing',
                is_reschedule: String(Boolean(isReschedule)),
                application_id: String(applicationId),
                schedule_ref: scheduleRef,
                generated_at: generatedAtIso,
                reply_to: HR_REPLY_TO_EMAIL || HR_SUPPORT_EMAIL,
                reply_to_name: HR_REPLY_TO_NAME || HR_FROM_NAME,
                from_name: HR_FROM_NAME,
              },
            }),
          });

          if (!emailJsResp.ok) {
            const errorText = await emailJsResp.text();
            emailError = {
              code: 'emailjs_rejected',
              status: emailJsResp.status,
              statusText: emailJsResp.statusText,
              body: errorText,
            };
            console.error("EmailJS agreement signing email error:", errorText);
          } else {
            emailSent = true;
            emailMessageId = null;
          }
        } catch (emailErr) {
          emailError = { code: 'emailjs_exception', message: String((emailErr as any)?.message || emailErr) };
          console.error("Unexpected error sending agreement signing email via EmailJS:", emailErr);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: isReschedule
          ? "Agreement signing rescheduled and notification sent successfully"
          : "Agreement signing scheduled and notification sent successfully",
        isReschedule,
        emailSent,
        emailTo,
        emailMessageId,
        emailError,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Unexpected error", details: String((err as any)?.message || err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
