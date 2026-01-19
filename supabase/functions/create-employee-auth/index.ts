// Supabase Edge Function to create employee auth account using Admin API
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

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
    // Some callers mistakenly send the body as a JSON-string. Accept both object and string.
    const raw = await req.text();
    let body: any = {};
    try {
      body = JSON.parse(raw);
    } catch {
      body = {};
    }
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    // Accept both legacy keys and current frontend keys
    const emailRaw = body?.email ?? body?.employeeEmail ?? body?.employee_email;
    const password = body?.password ?? body?.employeePassword ?? body?.employee_password;
    const firstName = body?.firstName ?? body?.first_name ?? body?.fname ?? body?.first;
    const lastName = body?.lastName ?? body?.last_name ?? body?.lname ?? body?.last;

    const email = String(emailRaw || "").trim().toLowerCase();

    console.log("Parsed values:", { email, hasPassword: !!password, firstName, lastName });

    if (!email || !password) {
      console.error("Validation failed - missing email or password");
      return new Response(
        JSON.stringify({ error: "Missing email or password" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Service role key not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if user already exists.
    // IMPORTANT: listUsers is paginated; using only the first page can miss existing accounts.
    // Prefer getUserByEmail when available, otherwise paginate listUsers.
    let existingUser: any = null;
    try {
      const fn = (supabaseAdmin as any)?.auth?.admin?.getUserByEmail;
      if (typeof fn === "function") {
        const { data, error } = await fn.call(supabaseAdmin.auth.admin, email);
        if (!error && data?.user) existingUser = data.user;
      }
    } catch (e) {
      console.warn("getUserByEmail lookup failed, falling back to listUsers pagination:", e);
    }

    if (!existingUser) {
      const perPage = 1000;
      for (let page = 1; page <= 20; page += 1) {
        const { data: listed, error: listError } = await (supabaseAdmin as any).auth.admin.listUsers({
          page,
          perPage,
        });
        if (listError) {
          console.warn("listUsers error:", listError);
          break;
        }
        const users = listed?.users || [];
        existingUser = users.find((u: any) => String(u?.email || "").trim().toLowerCase() === email) || null;
        if (existingUser) break;
        if (users.length < perPage) break;
      }
    }

    let userId;
    
    if (existingUser) {
      // User exists, update password
      console.log("User exists, updating password...");
      const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          password: password,
          email_confirm: true, // Ensure email is confirmed
          user_metadata: {
            ...(existingUser.user_metadata || {}),
            first_name: firstName,
            last_name: lastName,
            role: "Employee",
          },
        }
      );

      if (updateError) {
        throw updateError;
      }

      userId = updatedUser.user.id;
    } else {
      // Create new user
      console.log("Creating new user...");
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role: "Employee",
        },
      });

      if (createError) {
        throw createError;
      }

      userId = newUser.user.id;
    }

    // Ensure profile exists
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        email: email,
        role: "Employee",
        first_name: firstName || "",
        last_name: lastName || "",
      }, {
        onConflict: "id",
      });

    if (profileError) {
      console.warn("Profile upsert error (non-fatal):", profileError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: existingUser ? "Password updated successfully" : "Account created successfully",
        userId: userId,
        email: email,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  } catch (error) {
    console.error("Error in create-employee-auth:", error);
    console.error("Error details:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      cause: error.cause,
    });
    return new Response(
      JSON.stringify({ 
        error: error.message || "Unknown error",
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  }
});

