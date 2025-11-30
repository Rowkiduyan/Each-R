import { useState } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";
import Logo from "./Logo.png";

function EmployeeLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    setError("");

    // Step 1: Try to log in using Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Invalid email or password.");
      console.error(error);
      return;
    }

    // Step 2: Get the user from the login response
    const user = data.user;

    // Step 3: Fetch the user's role and depot from the 'profiles' table
    let { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, role, first_name, last_name, depot")
      .eq("id", user.id)
      .single();

    // If profile doesn't exist, try to determine role from user metadata or default to Employee
    if (profileError || !profile) {
      console.warn("Profile not found, creating one...", profileError);
      
      // Try to get role from user metadata, or default to Employee
      const defaultRole = user.user_metadata?.role || "Employee";
      const normalizedDefaultRole = defaultRole.charAt(0).toUpperCase() + defaultRole.slice(1).toLowerCase();
      
      // Try to create profile
      const { data: newProfile, error: createError } = await supabase
        .from("profiles")
        .insert([
          {
            id: user.id,
            email: user.email,
            role: normalizedDefaultRole, // Use role from metadata or default to Employee
            first_name: user.user_metadata?.first_name || "",
            last_name: user.user_metadata?.last_name || "",
          },
        ])
        .select()
        .single();

      if (createError) {
        console.error("Error creating profile:", createError);
        // If insert fails (maybe profile exists but query failed), try to fetch again
        const { data: fetchedProfile, error: fetchError } = await supabase
          .from("profiles")
          .select("email, role, first_name, last_name, depot")
          .eq("id", user.id)
          .single();
        
        if (fetchError || !fetchedProfile) {
          console.error("Error fetching profile:", fetchError);
          setError("Profile setup failed. Please contact support.");
          return;
        }
        profile = fetchedProfile;
      } else {
        profile = newProfile;
      }
    }

    // Normalize role format (capitalize first letter, lowercase rest) but don't change HR to Employee
    const currentRole = profile.role;
    const normalizedRole = currentRole ? (currentRole.charAt(0).toUpperCase() + currentRole.slice(1).toLowerCase()) : "Employee";
    
    // Only update if the format is wrong (e.g., "hr" -> "Hr" should be "HR", "employee" -> "Employee")
    if (currentRole !== normalizedRole && normalizedRole !== "Hr") {
      // Special case: "HR" should stay "HR", not become "Hr"
      const targetRole = currentRole.toLowerCase() === "hr" ? "HR" : normalizedRole;
      
      if (currentRole !== targetRole) {
        console.warn(`Updating role format from "${currentRole}" to "${targetRole}"...`);
        const { error: roleUpdateError } = await supabase
          .from("profiles")
          .update({ role: targetRole })
          .eq("id", user.id);
        
        if (roleUpdateError) {
          console.error("Error updating role:", roleUpdateError);
        } else {
          profile.role = targetRole;
        }
      }
    }

    // Step 4: Update the user's metadata so the JWT includes the correct role
    const { error: updateError } = await supabase.auth.updateUser({
      data: { role: profile.role },
    });

    if (updateError) {
      console.error("Failed to update user metadata:", updateError);
    }

    // Step 5: Refresh session to apply updated role metadata
    await supabase.auth.refreshSession();

    // Step 6: Debug - check if the role is now in the JWT
    const { data: userData } = await supabase.auth.getUser();
    console.log("✅ JWT user role:", userData?.user?.user_metadata?.role);

    // Step 7: Save HR info in localStorage
    const userDataToSave = {
      email: user.email,
      id: user.id,
      role: profile.role,
      first_name: profile.first_name,
      last_name: profile.last_name,
      depot: profile.depot || null,
    };

    localStorage.setItem("loggedInHR", JSON.stringify(userDataToSave));

    // Step 8: Redirect based on role
    const roleForRedirect = profile.role?.toLowerCase();

    console.log("🔐 Login successful! Role:", profile.role, "Normalized:", roleForRedirect);

    if (roleForRedirect === "hr" || roleForRedirect === "hrc") {
      navigate("/hr/home");
    } else if (roleForRedirect === "employee") {
      console.log("✅ Redirecting to employee home...");
      navigate("/employee/home");
    } else if (roleForRedirect === "agency") {
      navigate("/agency/home");
    } else if (roleForRedirect === "admin") {
      navigate("/admin/home");
    }
    else {
      console.error("❌ Unknown role:", profile.role);
      setError(`Unknown role: ${profile.role}. Please contact support.`);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-neutral-100">
      <div className="flex justify-end gap-2 w-full bg-neutral-100 p-5">
        <button
          onClick={() => navigate("/applicant/login")}
          className="bg-red-600 text-white font-bold py-2 px-4 rounded hover:bg-red-700 cursor-pointer">
          Applicant Login
        </button>
      </div>

      <div className="flex flex-col items-center justify-center bg-neutral-200 p-10 rounded-lg shadow-md max-w-sm w-full mt-10">
        <div className="text-red-600 font-bold text-3xl italic mb-4">
          Each-R
        </div>
        <h2 className="text-black text-xl font-semibold mb-4">
          Employee Log In
        </h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-3/4 p-2 mb-3 border border-gray-300 rounded bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-3/4 p-2 mb-4 border border-gray-300 rounded bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-red-400"
        />

        <button
          onClick={handleLogin}
          className="w-1/3 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 flex justify-center items-center"
        >
          LOGIN
        </button>

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded w-full text-center">
            {error}
          </div>
        )}

        <p className="mt-3 text-gray-500 text-sm underline cursor-pointer hover:text-gray-700">
          Forgot Password?
        </p>
      </div>
    </div>
  );
}

export default EmployeeLogin;
