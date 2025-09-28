import { Link } from "react-router-dom";
import { useState } from "react";
import { NavLink } from "react-router-dom";

function EmployeeTrainings() {
    const [activeTab, setActiveTab] = useState("roadwise");
    const [externalTrainings, setExternalTrainings] = useState([]);
    const [newTraining, setNewTraining] = useState({ title: "", date: "", certification: "" });
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
                <Link to ="/employee/notif" className="text-gray-700 hover:text-red-600 font-medium relative">
                    Notifications
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">3</span>
                </Link>
                <Link to="/employee/separation" className="text-gray-700 hover:text-red-600 font-medium">Separation</Link>
                <NavLink to ="/employee/trainings" className={({ isActive }) => `hover:text-red-600 ${
                isActive ? "text-red-600 font-semibold border-b-2 border-red-600" : "text-gray-700"
                }`}>Trainings</NavLink>
                <Link to="/employee/profile" className="text-gray-700 hover:text-red-600 font-medium">Profile</Link>
                <Link to ="/employee/login" className="text-gray-700 hover:text-red-600 font-medium">Logout</Link>
            </div>
            </div>
        </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4">
            <div className="bg-white border rounded-lg p-3 shadow mx-auto">
                
                <div className="flex border-b mb-4">
                    <button
                        onClick={() => setActiveTab("roadwise")}
                        className={`px-4 py-2 font-medium text-sm ${
                            activeTab === "roadwise"
                                ? "text-red-600 border-b-2 border-red-600"
                                : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        Trainings in Roadwise
                    </button>
                    <button
                        onClick={() => setActiveTab("outside")}
                        className={`px-4 py-2 font-medium text-sm ${
                            activeTab === "outside"
                                ? "text-red-600 border-b-2 border-red-600"
                                : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        Trainings Outside Roadwise
                    </button>
                </div>

                {activeTab === "roadwise" && (
                    <>
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
                    </>
                )}

                {activeTab === "outside" && (
                    <>
                        <div className="mb-4 p-4 border rounded-lg bg-gray-50">
                            <h3 className="text-sm font-semibold mb-3">Upload Past Training</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                                    <input
                                        type="text"
                                        value={newTraining.title}
                                        onChange={(e) => setNewTraining({...newTraining, title: e.target.value})}
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                        placeholder="Training title"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={newTraining.date}
                                        onChange={(e) => setNewTraining({...newTraining, date: e.target.value})}
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Certification</label>
                                    <input
                                        type="file"
                                        onChange={(e) => setNewTraining({...newTraining, certification: e.target.files[0]})}
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    if (newTraining.title && newTraining.date) {
                                        setExternalTrainings([...externalTrainings, newTraining]);
                                        setNewTraining({ title: "", date: "", certification: "" });
                                    }
                                }}
                                className="mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                            >
                                Upload Training
                            </button>
                        </div>

    
                        <div className="text-xs font-semibold text-blue-600 mb-2">External Trainings</div>
                        <div className="overflow-x-auto overflow-y-auto h-64">
                            <table className="min-w-full border text-sm table-fixed">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-2 border text-center w-2/5">Title</th>
                                        <th className="p-2 border text-center">Date</th>
                                        <th className="p-2 border text-center">Certification</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {externalTrainings.map((training, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="p-2 border text-center">{training.title}</td>
                                            <td className="p-2 border text-center">{training.date}</td>
                                            <td className="p-2 border text-center">
                                                {training.certification ? training.certification.name : "No file"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
        </>
    );
} export default EmployeeTrainings;