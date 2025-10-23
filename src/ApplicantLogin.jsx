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

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Get the logged-in user’s data
    const { user } = data;

    // Fetch the user's role — check both tables
    let { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if ((!profile || profileError) && !profile?.role) {
      const { data: applicantData } = await supabase
        .from("applicants")
        .select("role")
        .eq("id", user.id)
        .single();

      profile = applicantData;
    }

    if (profile?.role === "Applicant") {
      navigate("/applicantl/home");
    } else if (profile?.role === "HR") {
      navigate("/hr/home");
    } else {
      setError("Unknown role or access not allowed");
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-neutral-100">
      <div className="flex justify-end gap-2 w-full bg-neutral-100 p-5">
        <Link
          to="/applicantg/home"
          onClick={() => alert("Logged in as Guest")}
          className="bg-red-600 text-white font-bold py-2 px-4 rounded hover:bg-red-700 cursor-pointer">
          View Jobs as Guest
        </Link>
      </div>

      <div className="flex flex-col items-center justify-center bg-neutral-200 p-10 rounded-lg shadow-md max-w-sm w-full mt-10">
        <img src={Logo} alt="Roadwise Logo" className="w-30 h-20 mb-4" />
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

        {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}

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
    </div>
  );
}

export default ApplicantLogin;
