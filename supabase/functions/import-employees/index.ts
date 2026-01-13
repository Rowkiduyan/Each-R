import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmployeeRow {
  email: string;
  fname: string;
  lname: string;
  mname?: string;
  contact_number?: string;
  position: string;
  depot: string;
  role: string;
  department?: string;
}

interface ImportResult {
  success: boolean;
  created: number;
  skipped: number;
  errors: Array<{ row: number; email: string; error: string }>;
  details: Array<{ email: string; password?: string; status: string }>;
}

// Generate secure password
function generatePassword(): string {
  const length = 12;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '@$!%*?&';
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role?.toLowerCase() !== 'admin') {
      throw new Error('Only administrators can import employees');
    }

    // Get request body
    const { employees } = await req.json();
    if (!Array.isArray(employees) || employees.length === 0) {
      throw new Error('Invalid request: employees array is required');
    }

    // Use service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const result: ImportResult = {
      success: true,
      created: 0,
      skipped: 0,
      errors: [],
      details: []
    };

    // Process each employee
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i] as EmployeeRow;
      const rowNum = i + 1;

      try {
        // Validate required fields
        if (!emp.email || !emp.fname || !emp.lname || !emp.position || !emp.depot || !emp.role) {
          result.errors.push({
            row: rowNum,
            email: emp.email || 'unknown',
            error: 'Missing required fields (email, fname, lname, position, depot, role)'
          });
          result.skipped++;
          continue;
        }

        const email = emp.email.toLowerCase().trim();

        // Check if user already exists
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
        const userExists = existingUser?.users?.some(u => u.email === email);

        if (userExists) {
          result.details.push({
            email: email,
            status: 'Skipped - User already exists'
          });
          result.skipped++;
          continue;
        }

        // Generate password
        const password = generatePassword();

        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true,
          user_metadata: {
            role: emp.role,
            full_name: `${emp.fname} ${emp.lname}`
          }
        });

        if (authError) {
          result.errors.push({
            row: rowNum,
            email: email,
            error: `Auth error: ${authError.message}`
          });
          result.skipped++;
          continue;
        }

        if (!authData.user) {
          result.errors.push({
            row: rowNum,
            email: email,
            error: 'Failed to create user'
          });
          result.skipped++;
          continue;
        }

        // Create profile
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: email,
            role: emp.role,
            first_name: emp.fname,
            last_name: emp.lname
          });

        if (profileError) {
          console.error('Profile error:', profileError);
          // Continue anyway, as auth user was created
        }

        // Create employee record
        const { error: employeeError } = await supabaseAdmin
          .from('employees')
          .insert({
            email: email,
            fname: emp.fname,
            lname: emp.lname,
            mname: emp.mname || '',
            contact_number: emp.contact_number || '',
            position: emp.position,
            depot: emp.depot,
            role: emp.role,
            department: emp.department || ''
          });

        if (employeeError) {
          console.error('Employee error:', employeeError);
          result.errors.push({
            row: rowNum,
            email: email,
            error: `Employee record error: ${employeeError.message}`
          });
        }

        result.details.push({
          email: email,
          password: password,
          status: 'Created successfully'
        });
        result.created++;

      } catch (error) {
        result.errors.push({
          row: rowNum,
          email: emp.email || 'unknown',
          error: error.message
        });
        result.skipped++;
      }
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
