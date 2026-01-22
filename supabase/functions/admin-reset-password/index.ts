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
    const { auth_user_id, email, new_password, personal_email } = await req.json();

    if (!new_password) {
      return new Response(
        JSON.stringify({ error: "Missing new_password" }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    if (!auth_user_id && !email) {
      return new Response(
        JSON.stringify({ error: "Missing auth_user_id or email" }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let userId = auth_user_id;

    // If email provided instead of auth_user_id, look up the user
    if (!userId && email) {
      const { data: userData, error: lookupError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (lookupError) {
        console.error("Error looking up user:", lookupError);
        return new Response(
          JSON.stringify({ error: "Failed to find user: " + lookupError.message }),
          { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
        );
      }

      const user = userData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        return new Response(
          JSON.stringify({ error: "User not found with email: " + email }),
          { status: 404, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
        );
      }

      userId = user.id;
    }

    // Update user password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: new_password }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update password: " + updateError.message }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // TODO: Send email to personal_email with new password
    // For now, we'll just log it
    console.log(`Password reset for user ${userId}. New password should be sent to: ${personal_email}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Password reset successfully"
      }),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
});
