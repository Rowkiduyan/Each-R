import Logo from './Logo.png';
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

function ApplicantLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
    setLoading(false);
    return;
  }

  const { user } = data;

  // 2️⃣ Fetch the user's record from applicants table by email
  const { data: applicantData, error: applicantError } = await supabase
    .from("applicants")
    .select("role")
    .eq("email", user.email)
    .single();

  if (applicantError || !applicantData) {
    setError("Account not registered. Please create an account first.");
    setLoading(false);
    return;
  }

  // 3️⃣ Redirect based on role
  if (applicantData.role.toLowerCase() === "applicant") {
    navigate("/applicantl/home");
  } else if (applicantData.role.toLowerCase() === "hr") {
    navigate("/hr/home");
  } else {
    setError("Unknown role or access not allowed");
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

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded w-full text-center">
            {error}
          </div>
        )}

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
              <div className="text-lg font-semibold text-gray-800 mb-4">Log in as Guest?</div>
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
