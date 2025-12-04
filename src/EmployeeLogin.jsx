import { useState } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";
import Logo from "./Logo.png";

function EmployeeLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e?.preventDefault(); // Add optional chaining in case called without event
    setError("");
    setLoading(true);

    // Step 1: Try to log in using Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Invalid email or password.");
      setShowErrorModal(true);
      setLoading(false);
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
          setShowErrorModal(true);
          setLoading(false);
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
      setShowErrorModal(true);
      setLoading(false);
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

        <form onSubmit={handleLogin} className="flex flex-col items-center w-full">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-3/4 p-2 mb-3 border border-gray-300 rounded bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-red-400"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-3/4 p-2 mb-4 border border-gray-300 rounded bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-red-400"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-1/3 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 flex justify-center items-center disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? "Logging in..." : "LOGIN"}
          </button>
        </form>

        <p className="mt-3 text-gray-500 text-sm underline cursor-pointer hover:text-gray-700">
          Forgot Password?
        </p>
      </div>

      {/* Error Modal */}
      {showErrorModal && (
        <div
          className="fixed inset-0 bg-transparent flex items-center justify-center z-50"
          onClick={() => setShowErrorModal(false)}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full mx-4 overflow-hidden border border-black"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-red-50 p-4 border-b border-red-200">
              <h3 className="text-lg font-semibold text-red-800 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                </svg>
                Login Error
              </h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700">{error}</p>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setShowErrorModal(false)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeLogin;
