import { Link } from "react-router-dom";
import { useEmployeeUser } from "./layouts/EmployeeLayout";

function EmHome() {
    const { userId, userEmail } = useEmployeeUser();
    return(
     <>
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