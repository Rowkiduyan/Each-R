import { Link } from "react-router-dom";
import { NavLink } from "react-router-dom";

function EmployeeNotif() {
    return ( 
        <>
        <nav className="w-full bg-white shadow-md mb-6 ">
        <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-start items-center h-25">
            <div className="flex-shrink-0 text-red-600 font-bold text-3xl italic">
                  Each-R
              </div>
            <div className="flex space-x-15 ml-0 md:ml-32 lg:ml-24">
                <Link to ="/employee/home" className="text-gray-700 hover:text-red-600 font-medium">Home</Link>
                <NavLink to ="/employee/notif" className={({ isActive }) => `hover:text-red-600 ${
                isActive ? "text-red-600 font-semibold border-b-2 border-red-600" : "text-gray-700"
                }`}>
                    Notifications
                </NavLink>
                <Link to="/employee/separation" className="text-gray-700 hover:text-red-600 font-medium">Separation</Link>
                <Link to ="/employee/trainings" className="text-gray-700 hover:text-red-600 font-medium">Trainings</Link>
                <Link to="/employee/profile" className="text-gray-700 hover:text-red-600 font-medium">Profile</Link>
                <Link to ="/employee/login" className="text-gray-700 hover:text-red-600 font-medium">Logout</Link>
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
                                <td className="p-2 border text-center">Training Reminder</td>
                                <td className="p-2 border text-center">Excel Spreadsheet training tomorrow</td>
                                <td className="p-2 border text-center">June 04, 2025</td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                                <td className="p-2 border text-center">Schedule Update</td>
                                <td className="p-2 border text-center">You have requirements to submit</td>
                                <td className="p-2 border text-center">June 03, 2025</td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                                <td className="p-2 border text-center">System Maintenance</td>
                                <td className="p-2 border text-center">Your Password has been changed by the admin</td>
                                <td className="p-2 border text-center">June 02, 2025</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        </>
    );
} export default EmployeeNotif;