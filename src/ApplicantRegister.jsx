import { Link } from "react-router-dom"; /* To access this page use "http://localhost:5173/applicant/register" */
import { useState, useEffect } from 'react';
import Logo from './Logo.png';
import { supabase } from './supabaseClient';


function ApplicantRegister() {

      useEffect(() => {
      const testConnection = async () => {
        const { data, error } = await supabase.from('applicants').select('*').limit(1);
        console.log('✅ Connected to Supabase:', data, error);
      };
      testConnection();
    }, []);

    const [lname, setLname] = useState('');
    const [fname, setFname] = useState('');
    const [mname, setMname] = useState('');
    const [contact, setContact] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleRegister = async (e) => {
      e.preventDefault(); 

      if (password !== confirmPassword) {
          alert("Passwords do not match!");
          return;
        }

      if (!lname || !fname || !email || !password || !contact) {
        alert("Please fill in all required fields.");
        return;
      }
  
      const { data, error } = await supabase.from('applicants').insert([
        {
          lname: lname,
          fname: fname,
          mname: mname,
          contact_number: contact,
          email: email,
          password: password,
        },
      ]);

      if (error) {
        console.error("❌ Error inserting data:", error.message);
      } else {
        console.log("✅ Data inserted successfully:", data);
        alert("Account created!");
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
          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded w-full"
        >
          SIGN UP
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