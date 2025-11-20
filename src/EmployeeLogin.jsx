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

    // Step 3: Fetch the user's role from the 'profiles' table
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
    };

    localStorage.setItem("loggedInHR", JSON.stringify(userDataToSave));

    // Step 8: Redirect based on role
    const normalizedRole = profile.role?.toLowerCase();

    if (normalizedRole === "hr") {
      navigate("/hr/home");
    } else if (normalizedRole === "employee") {
      navigate("/employee/home");
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
