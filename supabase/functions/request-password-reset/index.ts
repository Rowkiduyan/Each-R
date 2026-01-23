import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
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
    const { work_email } = await req.json();

    if (!work_email) {
      return new Response(
        JSON.stringify({ error: "Missing work_email" }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find employee by work email
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id, fname, lname, email')
      .eq('email', work_email)
      .single();

    if (employeeError || !employee) {
      return new Response(
        JSON.stringify({ error: "Work email not found in the system" }),
        { status: 404, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Get all HR and Admin users
    const { data: adminProfiles, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .or('role.eq.HR,role.eq.Admin');

    if (adminError) {
      console.error('Error finding HR/Admin users:', adminError);
      return new Response(
        JSON.stringify({ error: "Failed to find HR/Admin users" }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    if (!adminProfiles || adminProfiles.length === 0) {
      return new Response(
        JSON.stringify({ error: "No HR or Admin users found in the system" }),
        { status: 404, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const employeeName = `${employee.fname} ${employee.lname}`;

    // Create notifications for all HR/Admin users
    const notifications = adminProfiles.map(admin => ({
      user_id: admin.id,
      title: 'Password Reset Request',
      message: `${employeeName} (${work_email}) has requested a password reset.`,
      type: 'password_reset_request',
      read: false,
      created_at: new Date().toISOString()
    }));

    const { error: notifError } = await supabaseAdmin
      .from('notifications')
      .insert(notifications);

    if (notifError) {
      console.error('Error creating notifications:', notifError);
      return new Response(
        JSON.stringify({ error: "Failed to create notifications" }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Password reset request sent to ${adminProfiles.length} admin(s)`,
        employee_name: employeeName
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
      }
    );

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
});
