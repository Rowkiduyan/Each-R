import Logo from './Logo.png'; 

function EmployeeLogin() {
  return (
    <div className="flex flex-col items-center min-h-screen bg-neutral-100">
  
        <div className="flex justify-end gap-2 w-full bg-neutral-100 p-5">
          <button className="bg-red-600 text-white font-bold py-2 px-4 rounded hover:bg-red-700">
            Add a Record
          </button>
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
  
          <button className="w-1/3 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700">
            LOGIN
          </button>
  
          <p className="mt-3 text-gray-500 text-sm underline cursor-pointer hover:text-gray-700">
            Forgot Password?
          </p>
        </div>
      </div>);
} 

export default EmployeeLogin;