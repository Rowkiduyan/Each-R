import { Link } from 'react-router-dom';
import Logo from './Logo.png';

function ApplicantGHome() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="flex-shrink-0 text-red-600 font-bold text-3xl italic">
            Each-R
              </div>
              </div>
            </div>

    
            <div className="flex-1 text-center">
              <h1 className="text-3xl font-bold text-gray-800">Job Vacancy Postings</h1>
            </div>


            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input 
                  type="text" 
                  placeholder="Search" 
                  className="w-96 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-1 focus:ring-red-500"
                />

              </div>

              <Link to ="/applicant/login"
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                Login
              </Link>
            </div>
          </div>
        </div>
      </div>

      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <div className="bg-white rounded-lg shadow-md p-6 relative overflow-hidden flex flex-col">
            <div className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-4 py-1 transform">
              URGENT HIRING!
            </div>
            <div className="mt-6 flex flex-col flex-grow">
              <h3 className="text-xl font-bold text-gray-800 mb-2">Delivery Driver</h3>
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-700">Pasig Depot</span>
                <span className="text-sm text-gray-500">Posted 10hrs ago</span>
              </div>
              <p className="text-gray-700 mb-4">
                We are seeking a reliable and safety-conscious Truck Driver to transport goods efficiently and on schedule to various destinations.
              </p>
              <div className="mb-4">
                <h4 className="font-semibold text-gray-800 mb-2">Main Responsibilities</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Safely operate company-based trucks</li>
                  <li>• Conduct pre-trip and post-trip inspections of vehicle systems and equipment</li>
                  <li>• Load and unload cargo</li>
                  <li>• Ensure accurate documentation</li>
                </ul>
              </div>
              <button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors mt-auto">
                View
              </button>
            </div>
          </div>

          
          <div className="bg-white rounded-lg shadow-md p-6 relative overflow-hidden flex flex-col">
            <div className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-4 py-1 transform">
              URGENT HIRING!
            </div>
            <div className="mt-6 flex flex-col flex-grow">
              <h3 className="text-xl font-bold text-gray-800 mb-2">Delivery Helper</h3>
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-700">Butuan Depot</span>
                <span className="text-sm text-gray-500">Posted 1 day ago</span>
              </div>
              <p className="text-gray-700 mb-4">
                We are seeking a reliable and safety-conscious Truck Driver to transport goods efficiently and on schedule to various destinations.
              </p>
              <div className="mb-4 flex-grow">
                <h4 className="font-semibold text-gray-800 mb-2">Main Responsibilities</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Safely operate company-based trucks</li>
                  <li>• Conduct pre-trip and post-trip inspections of vehicle systems and equipment</li>
                  <li>• Load and unload cargo</li>
                  <li>• Ensure accurate documentation</li>
                </ul>
              </div>
              <button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors mt-auto">
                View
              </button>
            </div>
          </div>

          
          <div className="bg-white rounded-lg shadow-md p-6 relative overflow-hidden flex flex-col">
            <div className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-4 py-1 transform">
              URGENT HIRING!
            </div>
            <div className="mt-6 flex flex-col flex-grow">
              <h3 className="text-xl font-bold text-gray-800 mb-2">HR Coordinator</h3>
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-700">Butuan Depot</span>
                <span className="text-sm text-gray-500">Posted 1 day ago</span>
              </div>
              <p className="text-gray-700 mb-4">
                We are looking for a detail-oriented and proactive HR Coordinator to support daily human resources operations.
              </p>
              <div className="mb-4 flex-grow flex-grow">
                <h4 className="font-semibold text-gray-800 mb-2">Main Responsibilities</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Assist with recruitment activities</li>
                  <li>• Coordinate onboarding and offboarding processes</li>
                  <li>• Maintain and update employee records</li>
                  <li>• Respond to employee inquiries</li>
                  <li>• Prepare HR-related reports</li>
                  <li>• Support the HR team</li>
                </ul>
              </div>
              <button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors mt-auto">
                View
              </button>
            </div>
          </div>

          
          <div className="bg-white rounded-lg shadow-md p-6 flex flex-col">
            <h3 className="text-xl font-bold text-gray-800 mb-2">HR Coordinator</h3>
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-700">Cagayan Depot</span>
              <span className="text-sm text-gray-500">Posted May 20</span>
            </div>
            <p className="text-gray-700 mb-4">
              We are looking for a detail-oriented and proactive HR Coordinator to support daily human resources operations.
            </p>
            <div className="mb-4 flex-grow">
              <h4 className="font-semibold text-gray-800 mb-2">Main Responsibilities</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Assist with recruitment activities</li>
                <li>• Coordinate onboarding and offboarding processes</li>
                <li>• Maintain and update employee records</li>
                <li>• Respond to employee inquiries</li>
                <li>• Prepare HR-related reports</li>
              </ul>
            </div>
            <button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors mt-auto">
              View
            </button>
          </div>

          
          <div className="bg-white rounded-lg shadow-md p-6 flex flex-col">
            <h3 className="text-xl font-bold text-gray-800 mb-2">HR Coordinator</h3>
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-700">Pasig Depot</span>
              <span className="text-sm text-gray-500">Posted May 21</span>
            </div>
            <p className="text-gray-700 mb-4">
              We are looking for a detail-oriented and proactive HR Coordinator to support daily human resources operations.
            </p>
            <div className="mb-4 flex-grow">
              <h4 className="font-semibold text-gray-800 mb-2">Main Responsibilities</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Assist with recruitment activities</li>
                <li>• Coordinate onboarding and offboarding processes</li>
                <li>• Maintain and update employee records</li>
                <li>• Respond to employee inquiries</li>
                <li>• Prepare HR-related reports</li>
              </ul>
            </div>
            <button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors mt-auto">
              View
            </button>
          </div>

  
          <div className="bg-white rounded-lg shadow-md p-6 flex flex-col">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Security Personnel</h3>
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-700">Cebu Depot</span>
              <span className="text-sm text-gray-500">Posted May 22</span>
            </div>
            <p className="text-gray-700 mb-4">
              We are looking for a vigilant and responsible Security Personnel to protect company property, staff, and visitors by maintaining a safe and secure environment.
            </p>
            <div className="mb-4  flex-grow">
              <h4 className="font-semibold text-gray-800 mb-2">Main Responsibilities</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Monitor and authorize entrance and departure of employees</li>
                <li>• Conduct regular patrols</li>
                <li>• Inspect doors, windows, and gates</li>
                <li>• Respond to alarms, emergencies, and incidents</li>
              </ul>
            </div>
            <button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors mt-auto">
              View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApplicantGHome;