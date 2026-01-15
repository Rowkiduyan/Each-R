// Supabase Edge Function: schedule-agreement-signing-with-notification
// Schedules agreement signing appointments (separate from interview) and creates notifications + email.

import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.26.0";

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const SENDGRID_FROM_EMAIL = Deno.env.get("SENDGRID_FROM_EMAIL") || "noreply@roadwise.com";

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
    
    const safeLocation = appointment.location || "To be confirmed";

    const notificationType = isReschedule ? "agreement_signing_rescheduled" : "agreement_signing_scheduled";
    const notificationTitle = isReschedule ? "Agreement Signing Rescheduled" : "Agreement Signing Scheduled";
    const notificationMessage = isReschedule
      ? `Your agreement signing appointment has been rescheduled to ${formattedDate} at ${safeTime} in ${safeLocation}. Please check your application and confirm your availability.`
      : `Your agreement signing appointment has been scheduled for ${formattedDate} at ${safeTime} in ${safeLocation}. Please confirm your availability.`;

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
        ? `Agreement signing appointment for ${applicantName} has been rescheduled to ${formattedDate} at ${safeTime} in ${safeLocation}.`
        : `Agreement signing appointment for ${applicantName} has been scheduled for ${formattedDate} at ${safeTime} in ${safeLocation}.`;

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

    // Email via SendGrid
    let emailSent = false;
    let emailMessageId: string | null = null;
    let emailError: any = null;
    let emailTo: string | null = null;

    if (!SENDGRID_API_KEY) {
      emailError = { code: 'missing_sendgrid_api_key', message: 'SENDGRID_API_KEY not configured' };
      console.error("SENDGRID_API_KEY not configured - skipping agreement signing email");
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
        const emailSubject = isReschedule
          ? `Updated Agreement Signing: ${jobTitle} (${apptDateDisplay} ${apptTimeDisplay})`
          : `Agreement Signing: ${jobTitle} (${apptDateDisplay} ${apptTimeDisplay})`;

        const pillText = isReschedule ? "Agreement Signing Rescheduled" : "Agreement Signing Scheduled";
        const introHtml = isReschedule
          ? 'Your agreement signing schedule has been <span class="highlight">updated</span>. Please review the updated details below:'
          : 'Please review the details for your agreement signing appointment below:';

        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${emailSubject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f3f4f6; }
    .container { background-color: #ffffff; border-radius: 12px; padding: 32px 24px; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08); border: 1px solid #e5e7eb; }
    .header { text-align: center; margin-bottom: 28px; }
    .logo-brand { font-size: 28px; font-weight: 700; color: #dc2626; letter-spacing: -0.5px; margin: 0; font-style: italic; font-family: Georgia, 'Times New Roman', serif; }
    .logo-tagline { font-size: 11px; color: #4b5563; margin-top: 4px; font-weight: 400; letter-spacing: 0.5px; text-transform: uppercase; }
    h1 { font-size: 22px; margin: 16px 0 8px; color: #111827; }
    .pill { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #ffffff; background: ${isReschedule ? '#f97316' : '#16a34a'}; margin-bottom: 12px; }
    .section { background-color: #f9fafb; border-radius: 10px; padding: 16px 18px; border: 1px solid #e5e7eb; margin: 18px 0; }
    .section-title { font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 8px; }
    .row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 14px; }
    .label { font-weight: 600; color: #4b5563; }
    .value { color: #111827; }
    .highlight { color: #dc2626; font-weight: 600; }
    .footer { margin-top: 28px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 16px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="logo-brand">Each-R</div>
        <div class="logo-tagline">Each Record for Roadwise</div>
      </div>
      <div class="pill">${pillText}</div>
      <h1>${jobTitle}</h1>
    </div>

    <p>Dear ${fullName || firstName},</p>
    <p>${introHtml}</p>

    <div class="section">
      <div class="section-title">Appointment Details</div>
      <div class="row"><span class="label">Date:</span><span class="value">${formattedDate}</span></div>
      <div class="row"><span class="label">Time:</span><span class="value">${safeTime}</span></div>
      <div class="row"><span class="label">Location:</span><span class="value">${safeLocation}</span></div>
    </div>

    <div class="section">
      <div class="section-title">Next Steps</div>
      <ul style="margin: 4px 0 0 18px; padding: 0; font-size: 14px; color: #4b5563;">
        <li>Please confirm your availability through the applicant portal.</li>
        <li>Arrive at least 10–15 minutes before your scheduled time.</li>
        <li>Prepare a valid ID and any required documents.</li>
      </ul>
    </div>

    <div class="footer">
      <p>This is an automated message from <span class="highlight">Roadwise</span>. Please do not reply directly to this email.</p>
      <p>&copy; ${new Date().getFullYear()} Roadwise. All rights reserved.</p>
    </div>

    <p style="margin-top: 12px; font-size: 12px; color: #9ca3af; text-align: center;">
      Reference: ${scheduleRef}<br/>
      Generated: ${generatedAtIso}<br/>
      Note: Email delivery may be delayed by spam filtering. Your latest schedule in the portal is the source of truth.
    </p>
  </div>
</body>
</html>
        `;

        const textContent = `Roadwise - Agreement Signing ${isReschedule ? "Rescheduled" : "Scheduled"}

Dear ${fullName || firstName},

${isReschedule ? "Your agreement signing schedule has been updated." : "You have been scheduled for an agreement signing appointment."}

Position: ${jobTitle}
Date: ${formattedDate}
Time: ${safeTime}
Location: ${safeLocation}

Please confirm your availability through the applicant portal.

This is an automated message from Roadwise. Please do not reply directly to this email.

Reference: ${scheduleRef}
Generated: ${generatedAtIso}
Note: Email delivery may be delayed by spam filtering. Your latest schedule in the portal is the source of truth.
        `;

        try {
          const sendGridResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${SENDGRID_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              personalizations: [{
                to: [{ email: toEmail }],
                subject: emailSubject,
                custom_args: {
                  applicationId: String(applicationId),
                  scheduleKind: 'agreement_signing',
                  isReschedule: String(Boolean(isReschedule)),
                  scheduleRef,
                  generatedAt: generatedAtIso,
                },
              }],
              from: { email: SENDGRID_FROM_EMAIL, name: "Roadwise HR" },
              reply_to: { email: SENDGRID_FROM_EMAIL, name: "Roadwise HR" },
              content: [
                { type: "text/plain", value: textContent },
                { type: "text/html", value: htmlContent },
              ],
            }),
          });

          if (!sendGridResponse.ok) {
            const errorText = await sendGridResponse.text();
            emailError = {
              code: 'sendgrid_rejected',
              status: sendGridResponse.status,
              statusText: sendGridResponse.statusText,
              body: errorText,
            };
            console.error("SendGrid agreement signing email error:", errorText);
          } else {
            emailSent = true;
            emailMessageId = sendGridResponse.headers.get('x-message-id') || sendGridResponse.headers.get('X-Message-Id');
          }
        } catch (emailErr) {
          emailError = { code: 'sendgrid_exception', message: String((emailErr as any)?.message || emailErr) };
          console.error("Unexpected error sending agreement signing email via SendGrid:", emailErr);
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
      JSON.stringify({ error: "Unexpected error", details: String(err?.message || err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
