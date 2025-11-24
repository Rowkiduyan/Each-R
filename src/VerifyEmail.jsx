import { useState } from "react";
import { supabase } from "./supabaseClient";
import { useLocation, useNavigate } from "react-router-dom";

function VerifyEmail() {
  const location = useLocation();
  const emailFromRegister = location.state?.email || "";
  const [email] = useState(emailFromRegister);
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const handleVerify = async (e) => {
    e.preventDefault();
    setIsVerifying(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // 1️⃣ Get pending user from pending_applicants
      const { data: pendingUser, error: pendingError } = await supabase
        .from("pending_applicants")
        .select("*")
        .eq("email", email)
        .eq("verification_code", code)
        .single();

      if (pendingError || !pendingUser) {
        setErrorMessage("Invalid verification code or email.");
        setIsVerifying(false);
        return;
      }

      // 2️⃣ Check if user already exists in Supabase Auth
      let authUserId;

      // First, try to sign up
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: pendingUser.email,
        password: pendingUser.password,
      });

      if (signUpError) {
        // If user already exists, try to sign in instead
        if (signUpError.message.includes("already registered") || signUpError.message.includes("User already registered")) {
          console.log("User already exists in Auth, attempting to sign in...");
          
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: pendingUser.email,
            password: pendingUser.password,
          });

          if (signInError) {
            console.error("Auth signin error:", signInError);
            setErrorMessage("Error signing in: " + signInError.message);
            setIsVerifying(false);
            return;
          }

          authUserId = signInData.user.id;
        } else {
          console.error("Auth signup error:", signUpError);
          setErrorMessage("Error creating user in Supabase Auth: " + signUpError.message);
          setIsVerifying(false);
          return;
        }
      } else {
        // Sign up was successful
        authUserId = signUpData.user.id;
      }

      // 3️⃣ Check if profile already exists, if not create it
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", authUserId)
        .single();

      if (!existingProfile) {
        const { error: profileError } = await supabase.from("profiles").insert([
          {
            id: authUserId, // use the same UUID as Auth user
            first_name: pendingUser.fname,
            last_name: pendingUser.lname,
            email: pendingUser.email,
            role: "Applicant",
          },
        ]);

        if (profileError) {
          console.error("Error creating profile row:", profileError);
          // If it's a duplicate key error, the profile already exists, continue
          if (profileError.code !== "23505" && !profileError.message?.includes("duplicate key")) {
            setErrorMessage("Error creating profile. Please contact support.");
            setIsVerifying(false);
            return;
          }
        }
      }

      // 4️⃣ Check if applicant already exists, if not create it
      const { data: existingApplicant } = await supabase
        .from("applicants")
        .select("id")
        .eq("id", authUserId)
        .single();

      if (!existingApplicant) {
        const { error: insertError } = await supabase.from("applicants").insert([
          {
            id: authUserId,
            fname: pendingUser.fname,
            lname: pendingUser.lname,
            mname: pendingUser.mname,
            contact_number: pendingUser.contact_number,
            email: pendingUser.email,
            role: "Applicant",
          },
        ]);

        if (insertError) {
          console.error(insertError);
          // If it's a duplicate key error, the applicant already exists, continue
          if (insertError.code !== "23505" && !insertError.message?.includes("duplicate key")) {
            setErrorMessage("Error moving user to applicants table.");
            setIsVerifying(false);
            return;
          }
        }
      }

      // 5️⃣ Remove user from pending_applicants
      const { error: deleteError } = await supabase
        .from("pending_applicants")
        .delete()
        .eq("email", email);

      if (deleteError) {
        console.error(deleteError);
        setErrorMessage("Warning: could not remove pending applicant.");
        setIsVerifying(false);
        return;
      }

      setSuccessMessage("✅ Email verified successfully! You can now log in.");
      setTimeout(() => {
        navigate("/applicant/login");
      }, 2000);
    } catch (err) {
      console.error("Unexpected error:", err);
      setErrorMessage("An unexpected error occurred.");
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

        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {successMessage}
          </div>
        )}

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
