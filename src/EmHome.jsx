import { Link } from "react-router-dom";
import { NavLink } from "react-router-dom";
function EmHome() {
    return(
     <>
        <nav className="w-full bg-white shadow-md mb-6 ">
        <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-start items-center h-25">
            <div className="flex-shrink-0 text-red-600 font-bold text-3xl italic">
                  Each-R
            </div>
            <div className="flex space-x-15 ml-0 md:ml-32 lg:ml-24">
                <NavLink to="/employee/home" className={({ isActive }) => `hover:text-red-600 ${
                isActive ? "text-red-600 font-semibold border-b-2 border-red-600" : "text-gray-700"
                }`}>Home</NavLink>
                <Link to="/employee/separation" className="text-gray-700 hover:text-red-600 font-medium">Separation</Link>
                <Link to ="/employee/trainings" className="text-gray-700 hover:text-red-600 font-medium">Trainings</Link>
                <Link to="/employee/profile" className="text-gray-700 hover:text-red-600 font-medium">Profile</Link>
                <Link to ="/employee/notif" className="text-gray-700 hover:text-red-600 font-medium relative">
                    Notifications
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">3</span>
                </Link>
                <Link to ="/employee/login" className="text-gray-700 hover:text-red-600 font-medium">Logout</Link>
            </div>
            <div className="flex items-center space-x-2 ml-auto max-w-7xl">
            <span className="text-gray-700 font-semibold">Stephen Yvone</span>
          </div>
            </div>
        </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row gap-6">
            <div className="md:w-1/3 w-full">
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-black-600 mb-2">Welcome to your Homepage!</h2>
                <p className="text-gray-700">Here you can view your Announcements!</p>
            </div>
            </div>
            <div className="md:w-2/3 w-full">
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Announcements</h2>
                <ul className="space-y-3">
                    <li className="flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        <div>
                            <p className="font-semibold text-gray-800">IT Office maintenance scheduled on Saturday, June 1 from 8 PM to 12 AM</p>
                            <p className="text-sm text-gray-600">IT maintenance</p>
                        </div>
                    </li>
                    <li className="flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        <div>
                            <p className="font-semibold text-gray-800">HR system maintenance scheduled on Saturday, June 1 from 8 PM to 12 AM</p>
                            <p className="text-sm text-gray-600">HR system</p>
                        </div>
                    </li>
                    <li className="flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        <div>
                            <p className="font-semibold text-gray-800">Annual manager scheduled monthly reporting is moved to May</p>
                            <p className="text-sm text-gray-600">Thank you</p>
                        </div>
                    </li>
                    <li className="flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        <div>
                            <p className="font-semibold text-gray-800">HR Office will be closed on June 12 for Independence Day</p>
                            <p className="text-sm text-gray-600">Reminder</p>
                        </div>
                    </li>
                    <li className="flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        <div>
                            <p className="font-semibold text-gray-800">General meeting on June 25 at 2 PM at Conference Room B</p>
                            <p className="text-sm text-gray-600">General</p>
                        </div>
                    </li>
                </ul>
            </div>
            </div>
        </div>
     </>

    );
} export default EmHome;