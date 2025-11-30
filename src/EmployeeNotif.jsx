import { Link } from "react-router-dom";
import { useEmployeeUser } from "./layouts/EmployeeLayout";

function EmployeeNotif() {
    const { userId, userEmail } = useEmployeeUser();
    return ( 
        <>
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