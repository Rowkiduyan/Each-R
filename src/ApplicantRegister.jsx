import { Link } from "react-router-dom"; /* To access this page use "http://localhost:5173/applicant/register" */
import Logo from './Logo.png'; 
function ApplicantRegister() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <form className="w-full max-w-md p-8 space-y-4 rounded-2xl">
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

        <input className="border p-3 rounded w-full" placeholder="Last Name *" />
        <input className="border p-3 rounded w-full" placeholder="First Name *" />
        <input className="border p-3 rounded w-full" placeholder="Middle Name" />
        <input className="border p-3 rounded w-full" placeholder="Contact Number *" />
        <input className="border p-3 rounded w-full" type="email" placeholder="Email *" />
        <input className="border p-3 rounded w-full" type="password" placeholder="Password *" />
        <input className="border p-3 rounded w-full" type="password" placeholder="Confirm Password *" />

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