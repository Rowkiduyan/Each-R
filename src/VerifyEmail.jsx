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

      const role = pendingUser.role || "Applicant";
      let targetTable = "applicants";
      if (role === "HR") targetTable = "hr";
      if (role === "Admin") targetTable = "admin";

      // 2️⃣ Create user in Supabase Auth first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: pendingUser.email,
        password: pendingUser.password,
      });

      if (authError) {
        console.error("Auth signup error:", authError);
        alert("Error creating user in Supabase Auth: " + authError.message);
        setIsVerifying(false);
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        alert("Failed to retrieve new user ID from Supabase Auth.");
        setIsVerifying(false);
        return;
      }

      // 3️⃣ Update applicant record (the trigger already created it)
      const { error: updateError } = await supabase
        .from(targetTable)
        .update({
          fname: pendingUser.fname,
          lname: pendingUser.lname,
          mname: pendingUser.mname,
          contact_number: pendingUser.contact,
          password: pendingUser.password,
          role,
        })
        .eq("id", userId);

      if (updateError) {
        console.error("Update error:", updateError);
        alert("Error updating applicant record: " + updateError.message);
        setIsVerifying(false);
        return;
      }

      // 4️⃣ Remove from pending_applicants
      await supabase.from("pending_applicants").delete().eq("email", email);

      alert("✅ Email verified and account created successfully!");
      navigate(`/${role.toLowerCase()}/login`);
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
