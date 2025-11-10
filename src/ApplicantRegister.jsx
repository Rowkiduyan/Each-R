import { Link, useNavigate } from "react-router-dom"; /* To access this page use "http://localhost:5173/applicant/register" */
import { useState} from 'react';
import Logo from './Logo.png';
import { supabase } from './supabaseClient';
import emailjs from '@emailjs/browser';



function ApplicantRegister() {

  const navigate = useNavigate();
  const [lname, setLname] = useState('');
  const [fname, setFname] = useState('');
  const [mname, setMname] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);


const handleRegister = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);


  if (password.length < 6) {
    alert("Password is too short");
    setIsSubmitting(false);
    return;
  }

  if (password !== confirmPassword) {
    alert("Passwords do not match!");
    setIsSubmitting(false);
    return;
  }

  if (!lname || !fname || !email || !password || !contact) {
    alert("Please fill in all required fields.");
    setIsSubmitting(false);
    return;
  }

  try {
      //  Generate a 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      //  Send verification email using EmailJS
      await emailjs.send(
        "service_nc4wt9g",       
        "template_x50nz3r",     
        {
          user_name: fname,
          email,
          verification_code: verificationCode,
        },
        "m2yll-ASVS8jsxvcM"        
      );

      console.log("✅ Verification email sent!");

      // Insert into pending_applicants
      const { error } = await supabase.from("pending_applicants").insert([
        {
          fname,
          lname,
          mname,
          contact_number: contact,
          email,
          password,  // consider hashing this
          verification_code: verificationCode
        }
      ]);

      if (error) throw error;

      alert("Verification code sent! Please check your email.");
      navigate("/applicant/verify", { state: { email } });

    } catch (err) {
      console.error("❌ Registration error:", err.message);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
};



  return (
    
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <form onSubmit={handleRegister} className="w-full max-w-md p-8 space-y-4 rounded-2xl">
        <div className="flex justify-center mb-6">
          <img src={Logo} alt="Roadwise" className="h-12" />
        </div>

        <h1 className="text-2xl font-bold text-center mb-2">
          Applicant Create Account
        </h1>
        <p className="text-gray-600 text-center mb-6">
          Fill in the required fields below to proceed with creating
          your Roadwise Applicant Account.
        </p>

        <input className="border p-3 rounded w-full" placeholder="Last Name *" 
        value ={lname}
        onChange={(e) => setLname(e.target.value)}/>
        <input className="border p-3 rounded w-full" placeholder="First Name *"
        value ={fname}
        onChange={(e) => setFname(e.target.value)} />
        <input className="border p-3 rounded w-full" placeholder="Middle Name"
        value={mname}
        onChange={(e) => setMname(e.target.value)} />
        <input className="border p-3 rounded w-full" placeholder="Contact Number *"
        value={contact}
        onChange={(e) => setContact(e.target.value)} />
        <input className="border p-3 rounded w-full" type="email" placeholder="Email *"
        value={email}
        onChange={(e) => setEmail(e.target.value)} />
        <input className="border p-3 rounded w-full" type="password" placeholder="Password *"
        value={password}
        onChange={(e) => setPassword(e.target.value)} />
        <input className="border p-3 rounded w-full" type="password" placeholder="Confirm Password *"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)} />

        <p className="text-xs text-gray-500 text-center">
          By proceeding, you consent to Roadwise collecting and storing your personal
          information as part of the recruitment process.
        </p>

        <button

          type="submit" 
          disabled={isSubmitting}
          className={`bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded w-full ${
            isSubmitting ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isSubmitting ? "Signing up..." : "SIGN UP"}
        </button>

        <p className="text-center text-sm mt-4">
          Already have an account?{" "}
          <Link to="/applicant/login" className="text-red-600 hover:underline">
            Log In
          </Link>
        </p>
      </form>
    </div>
  );
}
export default ApplicantRegister