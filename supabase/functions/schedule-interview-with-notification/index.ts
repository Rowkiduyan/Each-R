// Supabase Edge Function: schedule-interview-with-notification
// This function schedules interviews and creates notifications

import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.26.0";

// Email provider: EmailJS (temporary replacement for SendGrid)
const EMAILJS_SERVICE_ID = Deno.env.get("EMAILJS_SERVICE_ID");
const EMAILJS_PUBLIC_KEY = Deno.env.get("EMAILJS_PUBLIC_KEY");
const EMAILJS_PRIVATE_KEY = Deno.env.get("EMAILJS_PRIVATE_KEY");
const EMAILJS_TEMPLATE_ID = Deno.env.get("EMAILJS_TEMPLATE_ID");
const EMAILJS_TEMPLATE_ID_INTERVIEW = Deno.env.get("EMAILJS_TEMPLATE_ID_INTERVIEW") || EMAILJS_TEMPLATE_ID;
const HR_FROM_NAME = Deno.env.get("HR_FROM_NAME") || "Roadwise HR (Each-R)";
const HR_REPLY_TO_EMAIL = Deno.env.get("HR_REPLY_TO_EMAIL") || "";
const HR_REPLY_TO_NAME = Deno.env.get("HR_REPLY_TO_NAME") || "Roadwise HR";
const HR_SUPPORT_EMAIL = Deno.env.get("HR_SUPPORT_EMAIL") || HR_REPLY_TO_EMAIL || "noreply@roadwise.com";

const APP_PUBLIC_URL = (Deno.env.get('APP_PUBLIC_URL') || 'https://each-r.vercel.app').trim();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
  const match = raw.match(/https?:\/\/[^\s<>"]+/i);
  return match ? match[0] : null;
}

function normalizeBaseUrl(url: string): string {
  return String(url || '').trim().replace(/\/+$/, '');
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
        const interviewType = interview.type || interview.interview_type || parsedPayload?.interview_type || parsedPayload?.interview?.type || 'onsite';
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
    
    // Format time to 12-hour format
    let safeTime = 'To be confirmed'
    if (interview.time) {
      try {
        const [hours, minutes] = interview.time.split(':')
        const hour = parseInt(hours, 10)
        const minute = (minutes || '00').padStart(2, '0')
        const period = hour >= 12 ? 'PM' : 'AM'
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
        safeTime = `${displayHour}:${minute} ${period}`
      } catch (e) {
        safeTime = interview.time
      }
    }
    
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
    let emailSent = false;
    let emailMessageId: string | null = null;
    let emailError: any = null;
    let emailTo: string | null = null;
    const emailTemplateIdUsed = EMAILJS_TEMPLATE_ID_INTERVIEW || null;

    if (!EMAILJS_SERVICE_ID || !EMAILJS_PUBLIC_KEY || !EMAILJS_TEMPLATE_ID_INTERVIEW || !EMAILJS_PRIVATE_KEY) {
      emailError = {
        code: 'missing_emailjs_config',
        message: 'EMAILJS_SERVICE_ID / EMAILJS_PUBLIC_KEY / EMAILJS_PRIVATE_KEY / EMAILJS_TEMPLATE_ID_INTERVIEW not configured',
      };
      console.error("EmailJS not configured - skipping interview email");
    } else {
      // Prefer applicants table; fallback to payload email/name (some environments may not have an applicants row)
      const { data: applicant, error: applicantError } = await supabase
        .from('applicants')
        .select('email, fname, lname')
        .eq('id', userId)
        .maybeSingle();

      if (applicantError) {
        console.error('Error fetching applicant for email:', applicantError);
      }

      const payloadContact = extractApplicantContact(parsedPayload);
      const toEmail = (applicant?.email || payloadContact.email || '').trim();
      const firstName = (applicant?.fname || payloadContact.firstName || 'Applicant').trim();
      const lastName = (applicant?.lname || payloadContact.lastName || '').trim();
      const fullName = `${firstName} ${lastName}`.trim();

      if (!toEmail) {
        emailError = { code: 'missing_recipient_email', message: 'No applicant email found in applicants table or application payload' };
        console.warn('No applicant email found for user:', userId);
      } else {
        emailTo = toEmail;

        const interviewDateDisplay = formattedDate;
        const interviewTimeDisplay = safeTime || 'To be confirmed';

        const tz = (interview.timezone || interview.time_zone || interview.tz || '').toString().trim();
        const interviewLocationDisplay = (interview.location || 'To be confirmed').toString().trim();
        const meetingUrl = extractFirstUrl(interviewLocationDisplay);

        const scheduleTitle = scheduleKind === 'agreement_signing' ? 'Agreement Signing' : 'Interview';
        const positionLabel = scheduleKind === 'agreement_signing' ? 'Appointment' : 'Position';

        const emailSubject = isReschedule
          ? `Updated ${scheduleTitle} — ${jobTitle} — ${interviewDateDisplay} at ${interviewTimeDisplay}${tz ? ` (${tz})` : ''}`
          : `${scheduleTitle} Scheduled — ${jobTitle} — ${interviewDateDisplay} at ${interviewTimeDisplay}${tz ? ` (${tz})` : ''}`;

        const pillText = isReschedule ? `${scheduleTitle} Updated` : `${scheduleTitle} Confirmed`;
        const detailsTitle = scheduleKind === 'agreement_signing' ? 'Appointment Details' : 'Interview Details';

        const likelyOnline = Boolean(meetingUrl) || /zoom|google\s*meet|microsoft\s*teams|teams|meet/i.test(interviewLocationDisplay);
        const introText = scheduleKind === 'agreement_signing'
          ? (isReschedule
            ? 'This email confirms an update to your agreement signing appointment. Please review the updated details below.'
            : 'This email confirms your agreement signing appointment. Please review the details below.')
          : (isReschedule
            ? 'This email confirms an update to your interview schedule. Please review the updated details below.'
            : 'This email confirms your interview schedule. Please review the details below.');

        const generatedAtIso = new Date().toISOString();
        const scheduleRef = `${applicationId}:${generatedAtIso}`;

        const safeFullName = escapeHtml(fullName || firstName);
        const safeJobTitle = escapeHtml(jobTitle);
        const safeDate = escapeHtml(interviewDateDisplay);
        const safeTimeDisplay = escapeHtml(interviewTimeDisplay);
        const safeTz = escapeHtml(tz);
        const safeLocation = escapeHtml(interviewLocationDisplay);
        const safeInterviewer = escapeHtml(interview.interviewer || '');
        const safeScheduleRef = escapeHtml(scheduleRef);
        const safeGeneratedAt = escapeHtml(generatedAtIso);
        const safeAppId = escapeHtml(applicationId);
        const safeMeetingUrl = meetingUrl ? escapeHtml(meetingUrl) : '';
        const safeSupportEmail = escapeHtml(HR_SUPPORT_EMAIL);

        const statusText = pillText;
        // Brand theme (red/white) for email UI
        const brandRed = '#dc2626';
        const brandRedDark = '#b91c1c';
        const brandRose50 = '#fff1f2';
        const brandRose100 = '#ffe4e6';
        const brandRose200 = '#fecdd3';

        const statusBorder = brandRose200;
        const statusBg = '#ffffff';
        const statusFg = brandRedDark;
        const basePublicUrl = normalizeBaseUrl(APP_PUBLIC_URL);

        // Deep-link into the applicant portal so they can click the existing "Confirm Interview" button.
        // Only include this if APP_PUBLIC_URL is configured; avoids sending broken links.
        const confirmPortalUrl = (scheduleKind === 'interview' && basePublicUrl)
          ? `${basePublicUrl}/applicant/applications?applicationId=${encodeURIComponent(String(applicationId))}`
          : '';

        const primaryCtaUrl = confirmPortalUrl;
        const primaryCtaLabel = scheduleKind === 'interview' ? 'Confirm Interview' : '';

        const secondaryCtaUrl = meetingUrl || '';
        const secondaryCtaLabel = meetingUrl
          ? (scheduleKind === 'agreement_signing' ? 'Open appointment link' : 'Open meeting link')
          : '';

        // HTML email template for schedule details
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
    <!-- Preheader (hidden) -->
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
      ${escapeHtml(scheduleTitle)} on ${safeDate} at ${safeTimeDisplay}${tz ? ` (${safeTz})` : ''}.
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#ffffff; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:600px; max-width:600px;">
            <!-- Brand header -->
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

            <!-- Main card -->
            <tr>
              <td style="padding:0 12px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#ffffff; border:1px solid ${brandRose200}; border-radius:14px;">
                  <tr>
                    <td style="padding:22px 22px 10px; font-family:Segoe UI, Roboto, Arial, sans-serif;">
                      <div style="font-size:18px; font-weight:800; color:#0f172a; line-height:1.25;">${safeJobTitle}</div>
                      <div style="font-size:13px; color:#475569; margin-top:6px;">${escapeHtml(introText)}</div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 22px 14px; font-family:Segoe UI, Roboto, Arial, sans-serif;">
                      <div style="font-size:14px; color:#0f172a;">Hello ${safeFullName},</div>
                    </td>
                  </tr>

                  <!-- Details box -->
                  <tr>
                    <td style="padding:0 22px 18px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${brandRose50}; border:1px solid ${brandRose200}; border-radius:12px;">
                        <tr>
                          <td style="padding:14px 14px 10px; font-family:Segoe UI, Roboto, Arial, sans-serif;">
                            <div style="font-size:13px; font-weight:800; color:#0f172a;">${escapeHtml(detailsTitle)}</div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:0 14px 14px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-family:Segoe UI, Roboto, Arial, sans-serif; font-size:14px; color:#0f172a;">
                              <tr>
                                <td style="padding:6px 0; color:#64748b; width:160px;">Date</td>
                                <td style="padding:6px 0; font-weight:700;">${safeDate}</td>
                              </tr>
                              <tr>
                                <td style="padding:6px 0; color:#64748b;">Time</td>
                                <td style="padding:6px 0; font-weight:700;">${safeTimeDisplay}${tz ? ` <span style=\"font-weight:600; color:#64748b;\">(${safeTz})</span>` : ''}</td>
                              </tr>
                              <tr>
                                <td style="padding:6px 0; color:#64748b;">${likelyOnline ? 'Platform / Location' : 'Location'}</td>
                                <td style="padding:6px 0;">${safeLocation}</td>
                              </tr>
                              ${interview.interviewer ? `
                              <tr>
                                <td style="padding:6px 0; color:#64748b;">Interviewer</td>
                                <td style="padding:6px 0;">${safeInterviewer}</td>
                              </tr>` : ''}
                              <tr>
                                <td style="padding:6px 0; color:#64748b;">Application ID</td>
                                <td style="padding:6px 0;">${safeAppId}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        ${primaryCtaUrl || secondaryCtaUrl ? `
                        <tr>
                          <td style="padding:0 14px 14px;">
                            <table role="presentation" cellpadding="0" cellspacing="0">
                              <tr>
                                ${primaryCtaUrl ? `
                                <td bgcolor="${brandRed}" style="border-radius:12px;">
                                  <a href="${escapeHtml(primaryCtaUrl)}" style="display:inline-block; padding:12px 16px; font-family:Segoe UI, Roboto, Arial, sans-serif; font-size:14px; font-weight:800; color:#ffffff; text-decoration:none; border-radius:12px;">
                                    ${escapeHtml(primaryCtaLabel)}
                                  </a>
                                </td>
                                ` : ''}
                                ${primaryCtaUrl && secondaryCtaUrl ? '<td style="width:10px;"></td>' : ''}
                                ${secondaryCtaUrl ? `
                                <td bgcolor="${brandRose50}" style="border-radius:12px; border:1px solid ${brandRose200};">
                                  <a href="${safeMeetingUrl}" style="display:inline-block; padding:12px 16px; font-family:Segoe UI, Roboto, Arial, sans-serif; font-size:14px; font-weight:800; color:${brandRedDark}; text-decoration:none; border-radius:12px;">
                                    ${escapeHtml(secondaryCtaLabel)}
                                  </a>
                                </td>
                                ` : ''}
                              </tr>
                            </table>
                            <div style="font-family:Segoe UI, Roboto, Arial, sans-serif; font-size:12px; color:#64748b; margin-top:8px;">
                              Tip: only click links you recognize. If unsure, open Each-R and verify the schedule.
                            </div>
                          </td>
                        </tr>` : ''}
                      </table>
                    </td>
                  </tr>

                  <!-- Next steps -->
                  <tr>
                    <td style="padding:0 22px 18px; font-family:Segoe UI, Roboto, Arial, sans-serif;">
                      <div style="font-size:13px; font-weight:800; color:#0f172a; margin-bottom:8px;">What to do next</div>
                      <ul style="margin:0; padding-left:18px; color:#334155; font-size:14px; line-height:1.6;">
                        <li>Confirm your availability in the Each-R applicant portal.</li>
                        ${likelyOnline
                          ? '<li>If online, join 5 minutes early and test your audio/video connection.</li>'
                          : '<li>If onsite, arrive 10–15 minutes early and bring a valid ID.</li>'}
                        <li>Keep this email for your reference.</li>
                      </ul>
                      <div style="font-size:13px; color:#475569; margin-top:10px;">
                        If you need to reschedule, please request a change through the portal as soon as possible.
                      </div>
                    </td>
                  </tr>

                  <!-- Security + support -->
                  <tr>
                    <td style="padding:0 22px 22px; font-family:Segoe UI, Roboto, Arial, sans-serif;">
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${brandRose50}; border:1px solid ${brandRose200}; border-radius:12px;">
                        <tr>
                          <td style="padding:12px 14px;">
                            <div style="font-size:13px; font-weight:800; color:${brandRedDark};">Security reminder</div>
                            <div style="font-size:13px; color:#7f1d1d; margin-top:6px; line-height:1.5;">
                              Roadwise HR will never ask for your password by email. If you did not apply for this role, you can ignore this message.
                            </div>
                          </td>
                        </tr>
                      </table>
                      <div style="font-size:12px; color:#64748b; margin-top:12px; line-height:1.5;">
                        Questions? Contact HR at <a href="mailto:${safeSupportEmail}" style="color:${brandRedDark}; text-decoration:none; font-weight:700;">${safeSupportEmail}</a>.
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:14px 12px 0; font-family:Segoe UI, Roboto, Arial, sans-serif;">
                <div style="font-size:11px; color:#94a3b8; line-height:1.5; text-align:center;">
                  Reference: ${safeScheduleRef} • Generated: ${safeGeneratedAt}<br/>
                  This is an automated notification from Roadwise HR via Each-R. Please do not reply directly to this email.
                </div>
                <div style="font-size:11px; color:#94a3b8; line-height:1.5; text-align:center; margin-top:6px;">
                  © ${new Date().getFullYear()} Roadwise. All rights reserved.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
        `;

        const textContent = `Roadwise HR (Each-R) — ${scheduleTitle}${isReschedule ? ' (Updated)' : ''}

Dear ${fullName || firstName},

${introText}

${detailsTitle}
- ${positionLabel}: ${jobTitle}
- Date: ${interviewDateDisplay}
- Time: ${interviewTimeDisplay}${tz ? ` (${tz})` : ''}
- Location/Platform: ${interviewLocationDisplay}
${interview.interviewer ? `- Interviewer: ${interview.interviewer}` : ''}
${meetingUrl ? `- Meeting link: ${meetingUrl}` : ''}
- Application ID: ${applicationId}

What to do next
- Confirm your availability in the Each-R applicant portal.
${confirmPortalUrl ? `- Confirm link: ${confirmPortalUrl}` : ''}
${likelyOnline ? '- If online, join 5 minutes early and test your audio/video.' : '- If onsite, arrive 10–15 minutes early and bring a valid ID.'}

If you need to reschedule, please request a change through the portal as soon as possible.

Security reminder: Roadwise HR will never ask for your password by email. If you did not apply for this role, you can ignore this message.

This is an automated notification from Roadwise HR via Each-R. Please do not reply to this email.

Reference: ${scheduleRef}
Generated: ${generatedAtIso}
© ${new Date().getFullYear()} Roadwise. All rights reserved.
`;

        try {
          const emailJsResp = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              service_id: EMAILJS_SERVICE_ID,
              template_id: EMAILJS_TEMPLATE_ID_INTERVIEW,
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
                schedule_kind: String(scheduleKind),
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
            console.error("EmailJS interview email error:", errorText);
          } else {
            emailSent = true;
            emailMessageId = null;
          }
        } catch (emailErr) {
          emailError = { code: 'emailjs_exception', message: String((emailErr as any)?.message || emailErr) };
          console.error("Unexpected error sending interview email via EmailJS:", emailErr);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        kind: scheduleKind,
        emailTemplateIdUsed,
        message: scheduleKind === 'agreement_signing'
          ? 'Agreement signing scheduled and notification sent successfully'
          : 'Interview scheduled and notification sent successfully',
        isReschedule,
        emailSent,
        emailTo,
        emailMessageId,
        emailError,
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