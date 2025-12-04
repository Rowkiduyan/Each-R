import Logo from './Logo.png';
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "./supabaseClient";

function ApplicantLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);

  const handleLogin = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError("");

  // 1️⃣ Log in the user
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    setError("Invalid login credentials. Please check your email and password.");
    setShowErrorModal(true);
    setLoading(false);
    return;
  }

  const { user } = data;

  // 2️⃣ Fetch the user's record from applicants table by email (case-insensitive)
  const { data: applicantData, error: applicantError } = await supabase
    .from("applicants")
    .select("*")
    .ilike("email", user.email)
    .maybeSingle();

  if (applicantError) {
    console.error("Error fetching applicant data:", applicantError);
    setError("Error accessing account data. Please try again or contact support.");
    setShowErrorModal(true);
    setLoading(false);
    return;
  }

  if (!applicantData) {
    console.log("No applicant data found for email:", user.email);
    setError("Account not registered. Please create an account first.");
    setShowErrorModal(true);
    setLoading(false);
    return;
  }

  console.log("Applicant data found:", applicantData);

  // 3️⃣ Redirect based on role (default to applicant if role doesn't exist)
  const userRole = applicantData.role?.toLowerCase() || "applicant";
  
  if (userRole === "applicant") {
    const redirectTo = location.state?.redirectTo || "/applicantl/home";
    const jobId = location.state?.jobId;
    navigate(redirectTo, { state: { jobId } });
  } else if (userRole === "hr") {
    navigate("/hr/home");
  } else {
    setError("Unknown role or access not allowed");
    setShowErrorModal(true);
    setLoading(false);
  }

  setLoading(false);
};


  return (
    <div className="flex flex-col items-center min-h-screen bg-neutral-100">
      <div className="flex justify-end gap-2 w-full bg-neutral-100 p-5">
        <button
          onClick={() => navigate("/employee/login")}
          className="bg-red-600 text-white font-bold py-2 px-4 rounded hover:bg-red-700 cursor-pointer">
          Employee Login
        </button>
        <button
          onClick={() => setShowGuestModal(true)}
          className="bg-red-600 text-white font-bold py-2 px-4 rounded hover:bg-red-700 cursor-pointer">
          View Jobs as Guest
        </button>
      </div>

      <div className="flex flex-col items-center justify-center bg-neutral-200 p-10 rounded-lg shadow-md max-w-sm w-full mt-10">
        <div className="text-red-600 font-bold text-3xl italic mb-4">
          Each-R
        </div>
        <h2 className="text-black text-xl font-semibold mb-4">Applicant Log In</h2>

        <form onSubmit={handleLogin} className="flex flex-col items-center w-full">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-3/4 p-2 mb-3 border border-gray-300 rounded bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-red-400"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-3/4 p-2 mb-4 border border-gray-300 rounded bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-red-400"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-1/3 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 flex justify-center items-center">
            {loading ? "Logging in..." : "LOGIN"}
          </button>
        </form>

        <p className="mt-3 text-gray-500 text-sm underline cursor-pointer hover:text-gray-700">
          Forgot Password?
        </p>

        <div className="mt-3 flex justify-center w-full space-x-6 max-w-xs mx-auto">
          <Link
            to="/applicant/register"
            className="text-gray-500 text-sm underline cursor-pointer hover:text-gray-700">
            Create Account
          </Link>
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

      {/* Guest Modal */}
      {showGuestModal && (
        <div
          className="fixed inset-0 bg-transparent flex items-center justify-center z-50"
          onClick={() => setShowGuestModal(false)}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full mx-4 overflow-hidden border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="text-lg font-semibold text-gray-800 mb-4">Continue as Guest?</div>
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                  onClick={() => setShowGuestModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                  onClick={() => {
                    setShowGuestModal(false);
                    navigate("/applicantg/home");
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApplicantLogin;
