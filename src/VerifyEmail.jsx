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
        .maybeSingle();

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
        .maybeSingle();

      if (!existingApplicant) {
        const { error: insertError } = await supabase.from("applicants").insert([
          {
            id: authUserId,
            fname: pendingUser.fname,
            lname: pendingUser.lname,
            mname: pendingUser.mname,
            contact_number: pendingUser.contact_number,
            email: pendingUser.email,
            birthday: pendingUser.birthday,
            sex: pendingUser.sex,
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
    <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Verify Your Email</h2>
            <p className="text-gray-600 text-sm">
              Enter the 6-digit verification code we sent to your email address
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 text-sm">{errorMessage}</p>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-green-700 text-sm">{successMessage}</p>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 focus:outline-none cursor-not-allowed"
              />
            </div>

            {/* Verification Code Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Verification Code</label>
              <input
                type="text"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => {
                  // Only allow digits and limit to 6 characters
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(value);
                }}
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-center text-2xl tracking-widest font-semibold"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Enter the 6-digit code sent to your email</p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isVerifying || code.length !== 6}
              className={`w-full py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                isVerifying ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isVerifying ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </>
              ) : (
                <>
                  Verify Email
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              Didn't receive the code?{" "}
              <button
                type="button"
                className="text-red-600 font-semibold underline cursor-not-allowed"
                disabled
              >
                Resend Code
              </button>
            </p>
            <p className="text-center text-sm text-gray-600 mt-2">
              Already verified?{" "}
              <button
                type="button"
                className="text-red-600 hover:text-red-700 font-semibold underline"
                onClick={() => navigate("/applicant/login")}
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;
