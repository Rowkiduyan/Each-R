import { useState } from "react";
import { supabase } from "./supabaseClient";
import { useLocation, useNavigate } from "react-router-dom";

function VerifyEmail() {
  const location = useLocation();
  const emailFromRegister = location.state?.email || "";
  const [email] = useState(emailFromRegister);
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const navigate = useNavigate();

  const handleVerify = async (e) => {
    e.preventDefault();
    setIsVerifying(true);

    try {
      // 1️⃣ Get pending user from pending_applicants
      const { data: pendingUser, error: pendingError } = await supabase
        .from("pending_applicants")
        .select("*")
        .eq("email", email)
        .eq("verification_code", code)
        .single();

      if (pendingError || !pendingUser) {
        alert("Invalid verification code or email.");
        setIsVerifying(false);
        return;
      }

      // 2️⃣ Create a Supabase Auth user
     const { data:authData, error: authError } = await supabase.auth.signUp({
        email: pendingUser.email,
        password: pendingUser.password,
      });

      if (authError) {
        console.error("Auth signup error:", authError);
        alert("Error creating user in Supabase Auth: " + authError.message);
        setIsVerifying(false);
        return;
      }

      const authUserId = authData.user.id;

       const { error: profileError } = await supabase.from("profiles").insert([
      {
        id: authData.user.id, // use the same UUID as Auth user
        first_name: pendingUser.fname,
        last_name: pendingUser.lname,
        email: pendingUser.email,
        role: "Applicant",
      },
    ]);

    if (profileError) {
      console.error("Error creating profile row:", profileError);
      alert("Error creating profile. Please contact support.");
      setIsVerifying(false);
      return;
    }

      // 3️⃣ Move user from pending_applicants to applicants table
      const { error: insertError } = await supabase.from("applicants").insert([
        {
          id: authUserId,
          lname: pendingUser.lname,
          mname: pendingUser.mname,
          contact_number: pendingUser.contact,
          email: pendingUser.email,
          role: "Applicant",
        },
      ]);

      if (insertError) {
        console.error(insertError);
        alert("Error moving user to applicants table.");
        setIsVerifying(false);
        return;
      }

      // 4️⃣ Remove user from pending_applicants
      const { error: deleteError } = await supabase
        .from("pending_applicants")
        .delete()
        .eq("email", email);

      if (deleteError) {
        console.error(deleteError);
        alert("Warning: could not remove pending applicant.");
      }

      alert("✅ Email verified successfully! You can now log in.");
      navigate("/applicant/login");
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("An unexpected error occurred.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <form
        onSubmit={handleVerify}
        className="w-full max-w-md p-8 space-y-4 rounded-2xl bg-white shadow"
      >
        <h1 className="text-2xl font-bold text-center mb-2">
          Verify Your Email
        </h1>
        <p className="text-gray-600 text-center mb-6">
          Enter the 6-digit code we sent to your email.
        </p>

        <input
          className="border p-3 rounded w-full"
          type="email"
          value={email}
          readOnly
        />

        <input
          className="border p-3 rounded w-full"
          placeholder="Verification Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />

        <button
          type="submit"
          className={`bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded w-full ${
            isVerifying ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={isVerifying}
        >
          {isVerifying ? "Verifying..." : "Verify Email"}
        </button>
      </form>
    </div>
  );
}

export default VerifyEmail;
