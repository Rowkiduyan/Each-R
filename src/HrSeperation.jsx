import { Link } from "react-router-dom";
import { NavLink } from "react-router-dom";

function HrSeperation() {
   return (

    <>
    <nav className="w-full bg-white shadow-md mb-6 ">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-center h-25">
              <div className="flex-shrink-0 text-red-600 font-bold text-2xl italic">
                Each-R
              </div>
              <div className="flex space-x-6 ml-0 md:ml-32 lg:ml-10">
                <Link to = "/hr/home" className="text-gray-700 hover:text-red-600 font-medium">Home</Link>
                <a href="/employees" className="text-gray-700 hover:text-red-600 font-medium">Employees</a>
                <Link to="/hr/recruitment" className="text-gray-700 hover:text-red-600 font-medium">Recruitment</Link>
                <Link to ="/hr/trainings" className="text-gray-700 hover:text-red-600 font-medium">Trainings/Seminars</Link>
                <Link to="/hr/eval" className="text-gray-700 hover:text-red-600 font-medium">Evaluation</Link>

                <NavLink to="/hr/seperation" className={({ isActive }) => `hover:text-red-600 ${
                isActive ? "text-red-600 font-semibold border-b-2 border-red-600" : "text-gray-700"
                }`}>Separation</NavLink>

                <Link to ="/hr/notif" className="text-gray-700 hover:text-red-600 font-medium relative">
                    Notifications
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">3</span>
                </Link>
                <Link to="/employee/login" className="text-gray-700 hover:text-red-600 font-medium">Logout</Link>
              </div>
              <div className="flex items-center space-x-2 lg: ml-20 max-w-7xl">
                <span className="text-gray-700 font-semibold">Alexis Yvone</span>
              </div>
            </div>
          </div>
    </nav>
    </>
   );

}
export default HrSeperation