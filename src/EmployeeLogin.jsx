import Logo from './Logo.png';
import { Link } from "react-router-dom";
import EmHome from "./EmHome";

function EmployeeLogin() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-neutral-100">
    
      <div className="flex flex-col items-center justify-center bg-neutral-200 relative -mt-[100px] p-10 rounded-lg shadow-md max-w-sm w-full">
        <img
          src={Logo}
          alt="Roadwise Logo"
          className="w-30 h-20 mb-4"
        />
        <h2 className="text-black text-xl font-semibold mb-4">
          Employee Log In
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
         to="/employee/home"
         className="w-1/3 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 flex justify-center items-center">
          LOGIN
        </Link>

        <p className="mt-3 text-gray-500 text-sm underline cursor-pointer hover:text-gray-700"> {/* Forgot Password button */}
          Forgot Password?
        </p>

    
      </div>
    </div>);
} 

export default EmployeeLogin;