/* To access this page use "http://localhost:5173/applicant/login" */
import Logo from './Logo.png';
import { Link } from "react-router-dom";
import ApplicantGHome from "./ApplicantGHome";

function ApplicantLogin() {
  return (
    <div className="flex flex-col items-center min-h-screen bg-neutral-100">

      <div className="flex justify-end gap-2 w-full bg-neutral-100 p-5">
        <Link
          to="/driver/add/record"
          className="bg-red-600 text-white font-bold py-2 px-4 rounded hover:bg-red-700">
          Add a Record
        </Link>
        <button className="bg-red-600 text-white font-bold py-2 px-4 rounded hover:bg-red-700">
          Apply Now!
        </button>
      </div>

      <div className="flex flex-col items-center justify-center bg-neutral-200 p-10 rounded-lg shadow-md max-w-sm w-full mt-10">
        <img
          src={Logo}
          alt="Roadwise Logo"
          className="w-30 h-20 mb-4"
        />
        <h2 className="text-black text-xl font-semibold mb-4">
          Applicant Log In
        </h2>

        <input
          type="email"
          placeholder="Email"
          className="w-3/4 p-2 mb-3 border border-gray-300 rounded bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        <input
          type="password"
          placeholder="Password"
          className="w-3/4 p-2 mb-4 border border-gray-300 rounded bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-red-400"
        />

        <Link
         to="/applicantl/home"
         className="w-1/3 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 flex justify-center items-center">
          LOGIN
        </Link>

        <p className="mt-3 text-gray-500 text-sm underline cursor-pointer hover:text-gray-700"> {/* Forgot Password button */}
          Forgot Password?
        </p>

      <div className="mt-3 flex justify-center w-full space-x-6 max-w-xs mx-auto">
          <Link
            to="/applicant/register"
            className="text-gray-500 text-sm underline cursor-pointer hover:text-gray-700">
            Create Account
          </Link>

          <Link
              to="/applicantg/home"
              onClick={() => Toast("Logged in as Guest")}
              className="text-gray-500 text-sm underline cursor-pointer hover:text-gray-700">
              Login As Guest
          </Link>
       </div>
      </div>
    </div>
  );
}

export default ApplicantLogin;
