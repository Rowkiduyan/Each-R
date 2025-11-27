// Supabase Edge Function: schedule-interview-with-notification
// This function schedules interviews and creates notifications

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { applicationId, interview } = await req.json()

    if (!applicationId || !interview) {
      return new Response(
        JSON.stringify({ error: 'Missing applicationId or interview data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // First, get the application to find the user_id and check if this is a reschedule
    const { data: existingApp, error: fetchError } = await supabase
      .from('applications')
      .select('user_id, interview_date, interview_confirmed')
      .eq('id', applicationId)
      .single()

    if (fetchError) {
      console.error('Error fetching application:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch application' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isReschedule = existingApp.interview_date !== null
    const userId = existingApp.user_id

    // Update the application with interview details and reset confirmation status
    const { error: updateError } = await supabase
      .from('applications')
      .update({
        interview_date: interview.date,
        interview_time: interview.time,
        interview_location: interview.location,
        interviewer: interview.interviewer,
        interview_confirmed: 'Idle', // Reset to Idle for new/rescheduled interviews
        interview_confirmed_at: null,
        status: 'interview', // Update status to indicate interview stage
        updated_at: new Date().toISOString()
      })
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

    const notificationType = isReschedule ? 'interview_rescheduled' : 'interview_scheduled'
    const notificationTitle = isReschedule ? 'Interview Rescheduled' : 'Interview Scheduled'
    const notificationMessage = isReschedule 
      ? `Your interview has been rescheduled to ${formattedDate} at ${interview.time} in ${interview.location}. Please check your application and confirm your availability.`
      : `Your interview has been scheduled for ${formattedDate} at ${interview.time} in ${interview.location}. Please confirm your availability.`

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

    // Send email notification (you can implement this part based on your email service)
    // For now, we'll just log that an email should be sent
    console.log(`Email should be sent to user ${userId} about ${notificationType}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Interview scheduled and notification sent successfully',
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