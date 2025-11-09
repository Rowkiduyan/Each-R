import { Link } from 'react-router-dom';
import { NavLink } from "react-router-dom";


function HrNotif() {
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