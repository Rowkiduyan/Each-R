import { Link } from "react-router-dom";

function EmployeeTrainings() {
    return (
        <>
        <nav className="w-full bg-white shadow-md mb-6 ">
        <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-start items-center h-25">
            <div className="flex-shrink-0 text-red-600 font-bold text-2xl">
                Roadwise HRIS
            </div>
            <div className="flex space-x-15 ml-0 md:ml-32 lg:ml-24">
                <Link to ="/employee/home" className="text-gray-700 hover:text-red-600 font-medium">Home</Link>
                <a href="#" className="text-gray-700 hover:text-red-600 font-medium">Notifications</a>
                <a href="#" className="text-gray-700 hover:text-red-600 font-medium">Seperation</a>
                <Link to ="/employee/trainings" className="text-gray-700 hover:text-red-600 font-medium">Trainings</Link>
                <a href="#" className="text-gray-700 hover:text-red-600 font-medium">Profile</a>
                <Link to ="/employee/login" className="text-gray-700 hover:text-red-600 font-medium">Logout</Link>
            </div>
            </div>
        </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4">
            <div className="bg-white border rounded-lg p-3 shadow mx-auto">
                <div className="text-xs font-semibold text-orange-400 mb-2">Upcoming Trainings</div>
                <div className="overflow-x-auto overflow-y-auto h-64">
                    <table className="min-w-full border text-sm table-fixed">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-2 border text-center w-2/5">Title</th>
                                <th className="p-2 border text-center">Venue</th>
                                <th className="p-2 border text-center">Date</th>
                                <th className="p-2 border text-center">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="hover:bg-gray-50">
                                <td className="p-2 border text-center">Excel Spreadsheet</td>
                                <td className="p-2 border text-center">Google Meet (Online)</td>
                                <td className="p-2 border text-center">June 05, 2025</td>
                                <td className="p-2 border text-center">10:00 AM</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="text-xs font-semibold text-green-600 my-3">Completed Trainings</div>
                <div className="overflow-x-auto overflow-y-auto h-64">
                    <table className="min-w-full border text-sm table-fixed">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-2 border text-center w-2/5">Title</th>
                                <th className="p-2 border text-center">Venue</th>
                                <th className="p-2 border text-center">Date</th>
                                <th className="p-2 border text-center">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="hover:bg-gray-50">
                                <td className="p-2 border text-center">Excel & Advanced Spreadsheets</td>
                                <td className="p-2 border text-center">Google Meet (Online)</td>
                                <td className="p-2 border text-center">June 03, 2025</td>
                                <td className="p-2 border text-center">10:00 AM</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        </>
    );
} export default EmployeeTrainings;