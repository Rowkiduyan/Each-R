import { useState } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";
import Logo from './Logo.png';

function EmployeeLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    setError("");

    // Try to log in using Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Invalid email or password.");
      console.error(error);
      return;
    }

    // Get the user's role from the profiles table
    const user = data.user;
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, role, first_name, last_name")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error(profileError);
      setError("Profile not found.");
      return;
    }

    const userData = {
        email: user.email,
        id: user.id,
        role: profile.role,
        first_name: profile.first_name,
        last_name: profile.last_name,
      };
    
    localStorage.setItem("loggedInHR", JSON.stringify(userData));

    

    // Redirect based on role
    if (profile.role === "HR") {
    navigate("/hr/home");
  } else if (profile.role === "employee") {
    navigate("/employee/home");
  } else if (profile.role === "applicant") {
    navigate("/applicant/home");
  } else {
    setError("Unknown role.");
  }
    
    };

  return (
    <div className="flex justify-center items-center min-h-screen bg-neutral-100">
      <div className="flex flex-col items-center justify-center bg-neutral-200 relative -mt-[100px] p-10 rounded-lg shadow-md max-w-sm w-full">
        <img src={Logo} alt="Roadwise Logo" className="w-30 h-20 mb-4" />
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

        {error && <p className="text-red-600 mt-2">{error}</p>}

        <p className="mt-3 text-gray-500 text-sm underline cursor-pointer hover:text-gray-700">
          Forgot Password?
        </p>
      </div>
    </div>
  );
}

export default EmployeeLogin;
