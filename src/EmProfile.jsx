import { Link } from "react-router-dom";
import { useState } from 'react';
import { NavLink } from "react-router-dom";

function EmpProfile() {

    const [activeTab, setActiveTab] = useState("Profiling");
    const tabs = ["Profiling", "Documents", "Evaluation"];
    return (
    <>
        <nav className="w-full bg-white shadow-md ">
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
                <Link to ="/employee/trainings" className="text-gray-700 hover:text-red-600 font-medium">Trainings</Link>
                <NavLink to="/employee/profile" className={({ isActive }) => `hover:text-red-600 ${
                isActive ? "text-red-600 font-semibold border-b-2 border-red-600" : "text-gray-700"
                }`}>Profile</NavLink>
                <Link to ="/employee/login" className="text-gray-700 hover:text-red-600 font-medium">Logout</Link>
            </div>
            </div>
        </div>
        </nav>

        <div className="flex justify-around mt-4">
            <ul className="list-none flex space-x-6 mt-2">
                {tabs.map((tab) => (
                  <li key={tab}>
                      <button type='button' onClick={() => setActiveTab(tab)}
                      className={`appearance-none border-0 font-semibold text-white px-5 rounded-sm tracking-wider transition-colors
                        ${activeTab === tab
                          ? "bg-red-600"              
                          : "bg-red-500 hover:bg-red-600"}`}
                          >
                          {tab}
                      </button>
                  </li>
                ))}
            </ul>
        </div>

        {activeTab === "Profiling" && (
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div>
                                <span className="font-bold">Employee ID:</span> 2023-132044
                            </div>
                            <div>
                                <span className="font-bold">Department:</span> Delivery
                            </div>
                            <div>
                                <span className="font-bold">Position:</span> Delivery Driver
                            </div>
                            <div>
                                <span className="font-bold">Depot:</span> Pasig
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <span className="font-bold">Employment Start Date:</span> 10/10/25
                            </div>
                            <div>
                                <span className="font-bold">Resume:</span> <a href="#" className="text-blue-600">delacruzresume.pdf</a>
                            </div>
                            <div>
                                <span className="font-bold">Application Form:</span> <a href="#" className="text-blue-600">view</a>
                            </div>
                        </div>
                    </div>
                    
                    <div className="border-t border-gray-300 my-6"></div>
                    
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div>
                                <span className="font-bold">Full Name:</span> Dela Cruz, Juan
                            </div>
                            <div>
                                <span className="font-bold">Address:</span> Blk 4 Lot 159 Papaya St., Brgy. San Lupalop, Pasig City 1860
                            </div>
                            <div>
                                <span className="font-bold">Contact Number:</span> 09123456789
                            </div>
                            <div>
                                <span className="font-bold">Email:</span> delacruzjuan@gmail.com
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <span className="font-bold">Sex:</span> Male
                            </div>
                            <div>
                                <span className="font-bold">Birthday:</span> 10/10/1978
                            </div>
                            <div>
                                <span className="font-bold">Age:</span> 47
                            </div>
                            <div>
                                <span className="font-bold">Marital Status:</span> Married
                            </div>
                        </div>
                    </div>
                    
                    <div className="border-t border-gray-300 my-6"></div>
                    
                    <div className="space-y-4">
                        <div>
                            <span className="font-bold">Educational Attainment:</span> High School
                        </div>
                        <div>
                            <span className="font-bold">Secondary Institution Name:</span> Pasig High School
                        </div>
                        <div>
                            <span className="font-bold">Year Graduated:</span> 1990
                        </div>
                        <div>
                            <span className="font-bold">Specialized Training Institution Name:</span> TESDA Pasig Training Center
                        </div>
                        <div>
                            <span className="font-bold">Year Graduated:</span> 2004
                        </div>
                    </div>
                    
                    <div className="border-t border-gray-300 my-6"></div>
                    
                    <div className="space-y-4 overflow-y-auto h-40">
                        <div>
                            <span className="font-bold">Trainings and Certifications:</span>
                        </div>
                        <div>
                            <span className="font-bold">Title:</span> Excel Spreadsheet Training
                        </div>
                        <div>
                            <span className="font-bold">Date:</span> June 05, 2025
                        </div>
                        <div>
                            <span className="font-bold">Certification:</span> certificate.pdf
                        </div>

                        <div>
                            <span className="font-bold">Trainings and Certifications:</span>
                        </div>
                        <div>
                            <span className="font-bold">Title:</span> Driver Training
                        </div>
                        <div>
                            <span className="font-bold">Date:</span> June 05, 2025
                        </div>
                        <div>
                            <span className="font-bold">Certification:</span> certificate.pdf
                        </div>

                        <div>
                            <span className="font-bold">Trainings and Certifications:</span>
                        </div>
                        <div>
                            <span className="font-bold">Title:</span> Fluency Training
                        </div>
                        <div>
                            <span className="font-bold">Date:</span> June 05, 2025
                        </div>
                        <div>
                            <span className="font-bold">Certification:</span> certificate.pdf
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === "Documents" && (
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="overflow-x-auto">
                        <table className="min-w-full border text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-3 border text-left font-semibold">Document Name</th>
                                    <th className="p-3 border text-left font-semibold">Submission</th>
                                    <th className="p-3 border text-left font-semibold">Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="hover:bg-gray-50">
                                    <td className="p-3 border">Photocopy of SSS ID</td>
                                    <td className="p-3 border">
                                        <div>SSSID.pdf</div>
                                        <div className="text-xs text-gray-500">10/10/2025</div>
                                    </td>
                                    <td className="p-3 border">
                                        <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">Validated</span>
                                        <div className="text-xs text-gray-500 mt-1">10/11/2025</div>
                                    </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                    <td className="p-3 border">Photocopy of TIN ID</td>
                                    <td className="p-3 border">
                                        <div>TinID.pdf</div>
                                        <div className="text-xs text-gray-500">10/10/2025</div>
                                    </td>
                                    <td className="p-3 border">
                                        <span className="px-2 py-1 bg-orange-500 text-white text-xs rounded">Submitted</span>
                                        <div className="text-xs text-gray-500 mt-1">10/11/2025</div>
                                    </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                    <td className="p-3 border">Photocopy of Philhealth MDR</td>
                                    <td className="p-3 border">
                                        <input type="file" className="text-sm" />
                                        <div className="text-xs text-gray-500">PDF, DOCX | Max file size: 10 mb</div>
                                    </td>
                                    <td className="p-3 border">
                                        <span className="px-2 py-1 bg-red-500 text-white text-xs rounded">No File</span>
                                        <div className="text-xs text-gray-500 mt-1">10 days</div>
                                    </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                    <td className="p-3 border">Photocopy of issuance</td>
                                    <td className="p-3 border">
                                        <div>Issuance.pdf</div>
                                        <div className="text-xs text-gray-500">10/10/2025</div>
                                    </td>
                                    <td className="p-3 border">
                                        <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">Validated</span>
                                        <div className="text-xs text-gray-500 mt-1">10/11/2025</div>
                                    </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                    <td className="p-3 border">Drivers License (front)</td>
                                    <td className="p-3 border">
                                        <div>LicenseFront.pdf</div>
                                        <div className="text-xs text-gray-500">10/10/2025</div>
                                    </td>
                                    <td className="p-3 border">
                                        <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">Validated</span>
                                        <div className="text-xs text-gray-500 mt-1">10/11/2025</div>
                                    </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                    <td className="p-3 border">Drivers License (back)</td>
                                    <td className="p-3 border">
                                        <div>LicenseBack.pdf</div>
                                        <div className="text-xs text-gray-500">10/10/2025</div>
                                    </td>
                                    <td className="p-3 border">
                                        <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">Validated</span>
                                        <div className="text-xs text-gray-500 mt-1">10/11/2025</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end mt-4">
                        <button className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                            Save
                        </button>
                    </div>
                </div>
            </div>
        )}

        {activeTab === "Evaluation" && (
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold mb-4">Evaluations</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full border text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-3 border text-left font-semibold">Evaluation Date</th>
                                    <th className="p-3 border text-left font-semibold">Employee Type</th>
                                    <th className="p-3 border text-left font-semibold">File</th>
                                    <th className="p-3 border text-left font-semibold">Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="hover:bg-gray-50">
                                    <td className="p-3 border">March 10, 2024</td>
                                    <td className="p-3 border">Regular</td>
                                    <td className="p-3 border">
                                        <a href="#" className="text-blue-600 underline">reyesdiploma.pdf</a>
                                    </td>
                                    <td className="p-3 border">
                                        <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">Retained</span>
                                    </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                    <td className="p-3 border">March 10, 2023</td>
                                    <td className="p-3 border">Regular</td>
                                    <td className="p-3 border">
                                        <a href="#" className="text-blue-600 underline">reyesdiploma.pdf</a>
                                    </td>
                                    <td className="p-3 border">
                                        <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">Retained</span>
                                    </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                    <td className="p-3 border">March 10, 2022</td>
                                    <td className="p-3 border">Under Probation</td>
                                    <td className="p-3 border">
                                        <a href="#" className="text-blue-600 underline">reyesdiploma.pdf</a>
                                    </td>
                                    <td className="p-3 border">
                                        <span className="px-2 py-1 bg-orange-500 text-white text-xs rounded">Observe</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}
    </>
    );
} export default EmpProfile;