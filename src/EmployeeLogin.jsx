import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";
import Logo from "./Logo.png";
import { setStoredJson } from "./authStorage";

function EmployeeLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const navigate = useNavigate();

  const redirectAfterLogin = async (user) => {
    // Fetch the user's role and depot from the 'profiles' table
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
      const normalizedDefaultRole =
        defaultRole.charAt(0).toUpperCase() + defaultRole.slice(1).toLowerCase();

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
    const normalizedRole = currentRole
      ? currentRole.charAt(0).toUpperCase() + currentRole.slice(1).toLowerCase()
      : "Employee";

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

    // Update the user's metadata so the JWT includes the correct role
    const { error: updateError } = await supabase.auth.updateUser({
      data: { role: profile.role },
    });

    if (updateError) {
      console.error("Failed to update user metadata:", updateError);
    }

    // Refresh session to apply updated role metadata
    await supabase.auth.refreshSession();

    // Save HR/admin info for this browser session.
    const userDataToSave = {
      email: user.email,
      id: user.id,
      role: profile.role,
      first_name: profile.first_name,
      last_name: profile.last_name,
      depot: profile.depot || null,
    };
    setStoredJson("loggedInHR", userDataToSave);

    // Redirect based on role
    const roleForRedirect = profile.role?.toLowerCase();
    console.log("🔐 Login successful! Role:", profile.role, "Normalized:", roleForRedirect);

    if (roleForRedirect === "hr" || roleForRedirect === "hrc") {
      navigate("/hr/recruitment");
    } else if (roleForRedirect === "employee") {
      console.log("✅ Redirecting to employee requirements...");
      navigate("/employee/requirements");
    } else if (roleForRedirect === "agency") {
      navigate("/agency/home");
    } else if (roleForRedirect === "admin") {
      navigate("/admin/home");
    } else {
      console.error("❌ Unknown role:", profile.role);
      setError(`Unknown role: ${profile.role}. Please contact support.`);
      setShowErrorModal(true);
      setLoading(false);
    }
  };

  // Clear any existing session to prevent auto-login from other portals
  useEffect(() => {
    let cancelled = false;

    const clearAndCheckSession = async () => {
      // Always sign out first to ensure clean state
      await supabase.auth.signOut();
      if (cancelled) return;
    };

    clearAndCheckSession();

    return () => {
      cancelled = true;
    };
  }, []);

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

    // Step 2+: role lookup + redirect
    const user = data.user;
    await redirectAfterLogin(user);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome Back</h2>
            <p className="text-gray-600 text-sm">Sign in to your employee account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-end text-sm">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </button>
          </form>
        </div>
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
            <div className="bg-blue-50 p-4 border-b border-blue-200">
              <h3 className="text-lg font-semibold text-blue-800 flex items-center gap-2">
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
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => {
            setShowForgotPassword(false);
            setForgotPasswordEmail("");
          }}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full mx-4 overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-blue-50 p-4 border-b border-blue-200">
              <h3 className="text-lg font-semibold text-blue-800 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Reset Password
              </h3>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                // Call edge function to handle password reset request
                const { data, error } = await supabase.functions.invoke('request-password-reset', {
                  body: { work_email: forgotPasswordEmail },
                  headers: {
                    'Authorization': `Bearer ${supabase.supabaseKey}`
                  }
                });

                console.log('Function response:', { data, error });

                if (error) {
                  console.error('Error requesting password reset:', error);
                  alert(`Error: ${error.message || 'Failed to notify admin. Please try again or contact HR.'}`);
                  return;
                }

                if (data && data.error) {
                  console.error('Function returned error:', data.error);
                  alert(`Error: ${data.error}`);
                  return;
                }

                alert('Admin has been notified of your password reset request.');
                setShowForgotPassword(false);
                setForgotPasswordEmail('');
              } catch (err) {
                console.error('Unexpected error:', err);
                alert('An error occurred. Please try again.');
              }
            }} className="p-6">
              <p className="text-gray-700 mb-4">
                Enter your work email address and we'll notify the admin to reset your password.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Work Email Address</label>
                <input
                  type="email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  placeholder="Enter your work email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordEmail("");
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Notify Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeLogin;
