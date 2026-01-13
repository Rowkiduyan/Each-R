// Supabase Edge Function: schedule-interview-with-notification
// This function schedules interviews and creates notifications

import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.26.0";

// Reuse the same SendGrid configuration used for employee credentials
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const SENDGRID_FROM_EMAIL = Deno.env.get("SENDGRID_FROM_EMAIL") || "noreply@roadwise.com";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getPayloadMeta(payload: any): any {
  return payload?.meta || payload?.form?.meta || payload?.applicant?.meta || null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { applicationId, interview, kind } = await req.json()

    const scheduleKind = (kind || 'interview') as string;

    if (!applicationId || !interview) {
      return new Response(
        JSON.stringify({ error: 'Missing applicationId or interview data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (scheduleKind !== 'interview' && scheduleKind !== 'agreement_signing') {
      return new Response(
        JSON.stringify({ error: 'Invalid kind. Use "interview" or "agreement_signing".' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // First, get the application to find the user_id and check if this is a reschedule
    const { data: existingApp, error: fetchError } = await supabase
      .from('applications')
      // Also select job title payload, endorsed status, and agency info for notifications
      .select('user_id, interview_date, interview_confirmed, payload, endorsed, status')
      .eq('id', applicationId)
      .single()

    if (fetchError) {
      console.error('Error fetching application:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch application' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = existingApp.user_id

    // Normalize payload for reuse
    let parsedPayload: any = {};
    try {
      parsedPayload = typeof existingApp.payload === 'string'
        ? JSON.parse(existingApp.payload)
        : (existingApp.payload || {});
    } catch (e) {
      console.warn('Failed to parse application payload:', e);
      parsedPayload = {};
    }

    const meta = getPayloadMeta(parsedPayload);
    const agencyProfileId = meta?.endorsed_by_profile_id || meta?.endorsed_by_auth_user_id || null;
    const isEndorsed = existingApp.endorsed === true || !!agencyProfileId

    const existingAgreementSigningDate =
      parsedPayload?.agreement_signing?.date ||
      parsedPayload?.agreementSigning?.date ||
      parsedPayload?.signing_interview?.date ||
      parsedPayload?.signingInterview?.date ||
      null;

    const isReschedule = scheduleKind === 'interview'
      ? (existingApp.interview_date !== null)
      : (existingAgreementSigningDate !== null)

    // Try to get job title from payload if present
    let jobTitle = 'your interview';
    try {
      jobTitle =
        parsedPayload?.job?.title ||
        parsedPayload?.title ||
        parsedPayload?.job_title ||
        jobTitle;
    } catch (e) {
      console.warn('Failed to parse application payload for job title:', e);
    }

    // Prepare updated payload (used for agreement signing and also to keep interview details consistent)
    const updatedPayload: any = (() => {
      if (scheduleKind === 'interview') {
        const interviewType = interview.type || parsedPayload?.interview_type || parsedPayload?.interview?.type || 'onsite';
        return {
          ...parsedPayload,
          interview_type: interviewType,
          interview: {
            ...(parsedPayload?.interview || {}),
            type: interviewType,
            date: interview.date,
            time: interview.time,
            location: interview.location,
            interviewer: interview.interviewer,
          }
        };
      }

      return {
        ...parsedPayload,
        agreement_signing: {
          ...(parsedPayload?.agreement_signing || {}),
          date: interview.date,
          time: interview.time,
          location: interview.location,
          interviewer: interview.interviewer,
        },
        agreement_signing_confirmed: 'Idle',
        agreement_signing_confirmed_at: null,
      };
    })();

    // Update the application with schedule details
    const updateFields: Record<string, any> = {
      payload: updatedPayload,
      updated_at: new Date().toISOString(),
    };

    if (scheduleKind === 'interview') {
      updateFields.interview_date = interview.date;
      updateFields.interview_time = interview.time;
      updateFields.interview_location = interview.location;
      updateFields.interviewer = interview.interviewer;
      updateFields.interview_confirmed = 'Idle';
      updateFields.interview_confirmed_at = null;
      updateFields.status = 'interview';
    }

    const { error: updateError } = await supabase
      .from('applications')
      .update(updateFields)
      .eq('id', applicationId)

    if (updateError) {
      console.error('Error updating application:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update application' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create notification
    const formattedDate = new Date(interview.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    const scheduleLabel = scheduleKind === 'agreement_signing' ? 'Agreement Signing' : 'Interview'
    const scheduleVerb = scheduleKind === 'agreement_signing' ? 'appointment' : 'interview'
    const safeTime = interview.time || 'To be confirmed'
    const safeLocation = interview.location || 'To be confirmed'

    const notificationType = scheduleKind === 'agreement_signing'
      ? (isReschedule ? 'agreement_signing_rescheduled' : 'agreement_signing_scheduled')
      : (isReschedule ? 'interview_rescheduled' : 'interview_scheduled')
    const notificationTitle = isReschedule ? `${scheduleLabel} Rescheduled` : `${scheduleLabel} Scheduled`
    const notificationMessage = isReschedule 
      ? `Your ${scheduleVerb} has been rescheduled to ${formattedDate} at ${safeTime} in ${safeLocation}. Please check your application and confirm your availability.`
      : `Your ${scheduleVerb} has been scheduled for ${formattedDate} at ${safeTime} in ${safeLocation}. Please confirm your availability.`

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        application_id: applicationId,
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        read: false,
        created_at: new Date().toISOString()
      })

    if (notificationError) {
      console.error('Error creating notification:', notificationError)
      // Don't fail the whole request if notification fails, just log it
    }

    // Create notification for agency if this is an endorsed application
    if (isEndorsed && agencyProfileId) {
      // Get applicant name for the agency notification
      const { data: applicant, error: applicantError } = await supabase
        .from('applicants')
        .select('fname, lname')
        .eq('id', userId)
        .maybeSingle()

      const applicantName = applicant 
        ? `${applicant.fname || ''} ${applicant.lname || ''}`.trim() || 'Endorsed applicant'
        : 'Endorsed applicant'

      const agencyNotificationTitle = isReschedule 
        ? `Endorsed Employee ${scheduleLabel} Rescheduled` 
        : `Endorsed Employee ${scheduleLabel} Scheduled`
      
      const agencyNotificationMessage = isReschedule
        ? `${scheduleLabel} for ${applicantName} has been rescheduled to ${formattedDate} at ${safeTime} in ${safeLocation}.`
        : `${scheduleLabel} for ${applicantName} has been scheduled for ${formattedDate} at ${safeTime} in ${safeLocation}.`

      const { error: agencyNotificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: agencyProfileId,
          application_id: applicationId,
          type: notificationType,
          title: agencyNotificationTitle,
          message: agencyNotificationMessage,
          read: false,
          created_at: new Date().toISOString()
        })

      if (agencyNotificationError) {
        console.error('Error creating agency notification:', agencyNotificationError)
        // Don't fail the whole request if notification fails, just log it
      }
    }

    // --- Send email notification via SendGrid ---
    if (!SENDGRID_API_KEY) {
      console.error("SENDGRID_API_KEY not configured - skipping interview email");
    } else {
      // Look up applicant email & name from applicants table
      const { data: applicant, error: applicantError } = await supabase
        .from('applicants')
        .select('email, fname, lname')
        .eq('id', userId)
        .maybeSingle();

      if (applicantError) {
        console.error('Error fetching applicant for email:', applicantError);
      } else if (!applicant?.email) {
        console.warn('No applicant email found for user:', userId);
      } else {
        const toEmail = applicant.email;
        const firstName = applicant.fname || 'Applicant';
        const lastName = applicant.lname || '';
        const fullName = `${firstName} ${lastName}`.trim();

        const emailSubject = isReschedule
          ? `Updated ${scheduleLabel} Schedule for ${jobTitle}`
          : `${scheduleLabel} Schedule for ${jobTitle}`;

        const interviewDateDisplay = formattedDate;
        const interviewTimeDisplay = interview.time || 'To be confirmed';
        const interviewLocationDisplay = interview.location || 'To be confirmed';

        const pillText = isReschedule ? `${scheduleLabel} Rescheduled` : `${scheduleLabel} Scheduled`;
        const detailsTitle = scheduleKind === 'agreement_signing' ? 'Appointment Details' : 'Interview Details';
        const locationLabel = scheduleKind === 'agreement_signing' ? 'Location:' : 'Location / Platform:';
        const introHtml = scheduleKind === 'agreement_signing'
          ? (isReschedule
            ? 'Your agreement signing schedule has been <span class="highlight">updated</span>. Please review the updated details below:'
            : 'Please review the details for your agreement signing appointment below:')
          : (isReschedule
            ? 'Your interview schedule has been <span class="highlight">updated</span>. Please review the updated details below:'
            : 'Thank you for your interest in joining Roadwise. We are pleased to invite you for an interview. Please review the details below:');

        // HTML email template for schedule details
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${emailSubject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #111827;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f3f4f6;
    }
    .container {
      background-color: #ffffff;
      border-radius: 12px;
      padding: 32px 24px;
      box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
      border: 1px solid #e5e7eb;
    }
    .header {
      text-align: center;
      margin-bottom: 28px;
    }
    .logo {
      margin-bottom: 16px;
      text-align: center;
    }
    .logo-brand {
      font-size: 28px;
      font-weight: 700;
      color: #dc2626;
      letter-spacing: -0.5px;
      margin: 0;
      font-style: italic;
      font-family: Georgia, 'Times New Roman', serif;
    }
    .logo-tagline {
      font-size: 11px;
      color: #4b5563;
      margin-top: 4px;
      font-weight: 400;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    h1 {
      font-size: 22px;
      margin: 16px 0 8px;
      color: #111827;
    }
    .pill {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #ffffff;
      background: ${isReschedule ? '#f97316' : '#16a34a'};
      margin-bottom: 12px;
    }
    .section {
      background-color: #f9fafb;
      border-radius: 10px;
      padding: 16px 18px;
      border: 1px solid #e5e7eb;
      margin: 18px 0;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      margin: 4px 0;
      font-size: 14px;
    }
    .label {
      font-weight: 600;
      color: #4b5563;
    }
    .value {
      color: #111827;
    }
    .highlight {
      color: #dc2626;
      font-weight: 600;
    }
    .footer {
      margin-top: 28px;
      font-size: 12px;
      color: #9ca3af;
      border-top: 1px solid #e5e7eb;
      padding-top: 16px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <div class="logo-brand">Each-R</div>
        <div class="logo-tagline">Each Record for Roadwise</div>
      </div>
      <div class="pill">${pillText}</div>
      <h1>${jobTitle}</h1>
    </div>

    <p>Dear ${fullName || firstName},</p>
    <p>
      ${introHtml}
    </p>

    <div class="section">
      <div class="section-title">${detailsTitle}</div>
      <div class="row">
        <span class="label">Date:</span>
        <span class="value">${interviewDateDisplay}</span>
      </div>
      <div class="row">
        <span class="label">Time:</span>
        <span class="value">${interviewTimeDisplay}</span>
      </div>
      <div class="row">
        <span class="label">${locationLabel}</span>
        <span class="value">${interviewLocationDisplay}</span>
      </div>
      ${
        interview.interviewer
          ? `<div class="row">
        <span class="label">Interviewer:</span>
        <span class="value">${interview.interviewer}</span>
      </div>`
          : ''
      }
    </div>

    <div class="section">
      <div class="section-title">Next Steps</div>
      <ul style="margin: 4px 0 0 18px; padding: 0; font-size: 14px; color: #4b5563;">
        <li>Please confirm your availability through the applicant portal.</li>
        <li>Arrive at least 10–15 minutes before your scheduled time.</li>
        <li>Prepare a valid ID and any required documents.</li>
      </ul>
    </div>

    <p style="font-size: 13px; color: #6b7280; margin-top: 12px;">
      If you are unable to attend at this schedule, please contact us as soon as possible through the portal or reach out to HR to arrange a different time.
    </p>

    <div class="footer">
      <p>This is an automated message from <span class="highlight">Roadwise</span>. Please do not reply directly to this email.</p>
      <p>&copy; ${new Date().getFullYear()} Roadwise. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
        `;

        const textContent = `
      Roadwise - ${scheduleLabel} ${isReschedule ? 'Rescheduled' : 'Scheduled'}

Dear ${fullName || firstName},

${scheduleKind === 'agreement_signing'
  ? (isReschedule ? 'Your agreement signing schedule has been updated.' : 'You have been scheduled for an agreement signing appointment.')
  : (isReschedule ? 'Your interview schedule has been updated.' : 'You have been scheduled for an interview.')}

Position: ${jobTitle}
Date: ${interviewDateDisplay}
Time: ${interviewTimeDisplay}
Location: ${interviewLocationDisplay}
${
  interview.interviewer
    ? `Interviewer: ${interview.interviewer}\n`
    : ''
}

Please confirm your availability through the applicant portal.

If you are unable to attend at this schedule, please contact HR as soon as possible to arrange a different time.

This is an automated message from Roadwise. Please do not reply directly to this email.

© ${new Date().getFullYear()} Roadwise. All rights reserved.
        `;

        try {
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
                  subject: emailSubject,
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
            console.error("SendGrid interview email error:", errorText);
          }
        } catch (emailErr) {
          console.error("Unexpected error sending interview email via SendGrid:", emailErr);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        kind: scheduleKind,
        message: scheduleKind === 'agreement_signing'
          ? 'Agreement signing scheduled and notification sent successfully'
          : 'Interview scheduled and notification sent successfully',
        isReschedule 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})