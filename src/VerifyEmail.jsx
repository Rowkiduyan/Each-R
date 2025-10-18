import { useState } from "react";
import { supabase } from "./supabaseClient";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";


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

    
    const { data, error } = await supabase
      .from("pending_applicants")
      .select("*")
      .eq("email", email)
      .eq("verification_code", code)
      .single();

    if (error || !data) {
      alert("Invalid verification code or email.");
      setIsVerifying(false);
      return;
    }

    const { error: insertError } = await supabase.from("applicants").insert([
      {
        lname: data.lname,
        fname: data.fname,
        mname: data.mname,
        contact_number: data.contact,
        email: data.email,
        password: data.password, 
      },
    ]);

    if (insertError) {
      alert("Error creating account. Please try again.");
      console.error(insertError);
      setIsVerifying(false);
      return;
    }

    // Delete from pending_applicants once verified
    await supabase.from("pending_applicants").delete().eq("email", email);

    alert("✅ Email verified successfully! Your account has been created.");
    setIsVerifying(false);
    navigate("/applicant/login");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <form
        onSubmit={handleVerify}
        className="w-full max-w-md p-8 space-y-4 rounded-2xl bg-white shadow"
      >
        <h1 className="text-2xl font-bold text-center mb-2">Verify Your Email</h1>
        <p className="text-gray-600 text-center mb-6">
          Enter your email and the 6-digit code we sent to complete your registration.
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
          className={`bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded w-full ${
            isVerifying ? "opacity-50" : ""
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
