import { Link } from 'react-router-dom';
import { NavLink } from "react-router-dom";


function HrNotif() {
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
                <Link to="/employees" className="text-gray-700 hover:text-red-600 font-medium">Employees</Link>
                <Link to="/hr/recruitment" className="text-gray-700 hover:text-red-600 font-medium">Recruitment</Link>
                <Link to ="/hr/trainings" className="text-gray-700 hover:text-red-600 font-medium">Trainings/Seminars</Link>
                <Link to="/hr/eval" className="text-gray-700 hover:text-red-600 font-medium">Evaluation</Link>
                <Link to="/hr/seperation" className="text-gray-700 hover:text-red-600 font-medium">Separation</Link>
                <NavLink to ="/hr/notif" className={({ isActive }) => `hover:text-red-600 ${
                isActive ? "text-red-600 font-semibold border-b-2 border-red-600" : "text-gray-700"
                }`}>
                    Notifications
                </NavLink>
                <Link to="/employee/login" className="text-gray-700 hover:text-red-600 font-medium">Logout</Link>
              </div>
              <div className="flex items-center space-x-2 lg: ml-20 max-w-7xl">
                <span className="text-gray-700 font-semibold">Alexis Yvone</span>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4">
            <div className="bg-white border rounded-lg p-3 shadow mx-auto">
                <div className="text-xs font-semibold text-blue-600 mb-2">Notifications</div>
                <div className="overflow-x-auto overflow-y-auto h-64">
                    <table className="min-w-full border text-sm table-fixed">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-2 border text-center w-2/5">Title</th>
                                <th className="p-2 border text-center">Message</th>
                                <th className="p-2 border text-center">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="hover:bg-gray-50">
                                <td className="p-2 border text-center">Employee Onboarding</td>
                                <td className="p-2 border text-center">New employee Juan Dela Cruz needs orientation</td>
                                <td className="p-2 border text-center">June 04, 2025</td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                                <td className="p-2 border text-center">Performance Review</td>
                                <td className="p-2 border text-center">Quarterly reviews are due next week</td>
                                <td className="p-2 border text-center">June 03, 2025</td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                                <td className="p-2 border text-center">Training Schedule</td>
                                <td className="p-2 border text-center">Safety training session scheduled for tomorrow</td>
                                <td className="p-2 border text-center">June 02, 2025</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </>
    );
}

export default HrNotif;