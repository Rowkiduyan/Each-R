import { Link } from "react-router-dom";
import Logo from "./Logo.png";

function VerifyAgency() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-100 relative">
      {/* Logo - Top Left */}
      <div className="absolute top-5 left-5">
        <img src={Logo} alt="Roadwise Logo" className="w-12 h-auto" />
      </div>

      {/* Back Button - Top Right */}
      <div className="absolute top-5 right-5">
        <Link
          to="/"
          className="bg-gray-300 text-black font-semibold py-2 px-4 rounded hover:bg-gray-400"
        >
          Back
        </Link>
      </div>

      <h1 className="text-xl font-bold mb-6 text-center">Verify your Agency</h1>

      {/* Main Content */}
      <div className="flex flex-col items-center bg-neutral-200 p-10 rounded-lg shadow-md max-w-sm w-full">
        <select
          className="w-full p-2 mb-4 border border-gray-300 rounded bg-neutral-50 text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400"
          defaultValue=""
        >
          <option value="" disabled>
            Agency Name
          </option>
          <option value="agency1">Agency 1</option>
          <option value="agency2">Agency 2</option>
          <option value="agency3">Agency 3</option>
        </select>

        <input
          type="text"
          placeholder="Agency Code"
          className="w-full p-2 mb-4 border border-gray-300 rounded bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-red-400"
        />

        <Link
          to="/driver/add/record"
          className="px-6 py-2 text-sm bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700"
        >
          Proceed
        </Link>
      </div>
    </div>
  );
}

export default VerifyAgency;
