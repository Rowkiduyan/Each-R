import { Link, useNavigate, useLocation } from 'react-router-dom';
import Logo from './Logo.png';
import { useState } from 'react';

function ApplicantLHome() {
const navigate = useNavigate();
const location = useLocation();
const newJob = location.state?.newJob;
const [activeTab, setActiveTab] = useState("Home");
const [showModal, setShowModal] = useState(false);
const [showSummary, setShowSummary] = useState(false);
const [workExperiences, setWorkExperiences] = useState([{}]);
const [characterReferences, setCharacterReferences] = useState([{}, {}, {}]);
 const tabs = ["Home", "Applications", "Profile"];


  return (
<div className="min-h-screen bg-white">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="flex-shrink-0 text-red-600 font-bold text-3xl italic">
                  Each-R
              </div>
              </div>
            </div>

    
            <div className="flex-1 text-center">
              <h1 className="text-3xl font-bold text-gray-800">Job Vacancy Postings</h1>
            </div>


            <div className="flex items-end space-x-5">
              {/*<div className="flex items-center space-x-2">
                <input 
                  type="text" 
                  placeholder="Search" 
                  className="w-96 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-1 focus:ring-red-500"
                />

              </div>*/}

              <Link to ="/applicant/login"
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                Logout
              </Link>
            </div>

          </div>
        </div>
      </div>
      <div className="flex justify-around mt-4">

        <ul className="list-none flex space-x-6">
            {tabs.map((tab) => (
              <li key={tab}>
                  <button type='button' onClick={() => {
                    setActiveTab(tab);
                    if (tab === "Applications") {
                      navigate('/applicant/applications');
                    }
                  }}
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

        
        <div className="flex items-center space-x-2">
                <input 
                  type="text" 
                  placeholder="Search" 
                  className="w-96 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
      </div>          
      
      <div className="flex flex-col items-center  min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">      
            <section className={`p-4 ${activeTab === "Home" ? "" : "hidden"}`}>

            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {newJob && (
                      <div className="bg-white rounded-lg shadow-md p-6 relative overflow-hidden flex flex-col">
                        {newJob.urgent && (
                          <div className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-4 py-1 transform">URGENT HIRING!</div>
                        )}
                        <div className="mt-6 flex flex-col flex-grow">
                          <h3 className="text-xl font-bold text-gray-800 mb-2">{newJob.title}</h3>
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-gray-700">{newJob.depot}</span>
                            <span className="text-sm text-gray-500">Posted {newJob.posted || 'Just now'}</span>
                          </div>
                          <p className="text-gray-700 mb-4">{newJob.description}</p>
                          {Array.isArray(newJob.responsibilities) && newJob.responsibilities.length > 0 && (
                            <div className="mb-4">
                              <h4 className="font-semibold text-gray-800 mb-2">Main Responsibilities</h4>
                              <ul className="text-sm text-gray-700 space-y-1">
                                {newJob.responsibilities.filter(Boolean).map((r, i) => (
                                  <li key={i}>• {r}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors mt-auto" onClick={() => setShowModal(true)}>
                            View
                          </button>
                        </div>
                      </div>
                    )}

                        <div className="bg-white rounded-lg shadow-md p-6 relative overflow-hidden flex flex-col">
                            <div className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-4 py-1 transform">
                                URGENT HIRING!
                            </div>
            <div className="mt-6 flex flex-col flex-grow">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Delivery Driver</h3>
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-gray-700">Pasig Depot</span>
                                <span className="text-sm text-gray-500">Posted 10hrs ago</span>
                            </div>
                            <p className="text-gray-700 mb-4">
                                We are seeking a reliable and safety-conscious Truck Driver to transport goods efficiently and on schedule to various destinations.
                            </p>
                            <div className="mb-4">
                                <h4 className="font-semibold text-gray-800 mb-2">Main Responsibilities</h4>
                                <ul className="text-sm text-gray-700 space-y-1">
                                    <li>• Safely operate company-based trucks</li>
                                    <li>• Conduct pre-trip and post-trip inspections of vehicle systems and equipment</li>
                                    <li>• Load and unload cargo</li>
                                    <li>• Ensure accurate documentation</li>
                                </ul>
                            </div>
                                <button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors mt-auto" onClick={() => setShowModal(true)}>
                                View
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-md p-6 relative overflow-hidden flex flex-col">
                                 <div className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-4 py-1 transform">
                                    URGENT HIRING!
                                    </div>
                                    <div className="mt-6 flex flex-col flex-grow">
                                    <h3 className="text-xl font-bold text-gray-800 mb-2">Delivery Helper</h3>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-gray-700">Butuan Depot</span>
                                        <span className="text-sm text-gray-500">Posted 1 day ago</span>
                                    </div>
                                    <p className="text-gray-700 mb-4">
                                        We are seeking a reliable and safety-conscious Truck Driver to transport goods efficiently and on schedule to various destinations.
                                    </p>
                                    <div className="mb-4 flex-grow">
                                        <h4 className="font-semibold text-gray-800 mb-2">Main Responsibilities</h4>
                                        <ul className="text-sm text-gray-700 space-y-1">
                                        <li>• Safely operate company-based trucks</li>
                                        <li>• Conduct pre-trip and post-trip inspections of vehicle systems and equipment</li>
                                        <li>• Load and unload cargo</li>
                                        <li>• Ensure accurate documentation</li>
                                        </ul>
                                    </div>
                                    <button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors mt-auto" onClick={() => setShowModal(true)}>
                                        View
                                    </button>
                                    </div>
                            </div>

                        <div className="bg-white rounded-lg shadow-md p-6 relative overflow-hidden flex flex-col">
                            <div className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-4 py-1 transform">
                            URGENT HIRING!
                            </div>
                            <div className="mt-6 flex flex-col flex-grow">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">HR Coordinator</h3>
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-gray-700">Butuan Depot</span>
                                <span className="text-sm text-gray-500">Posted 1 day ago</span>
                            </div>
                            <p className="text-gray-700 mb-4">
                                We are looking for a detail-oriented and proactive HR Coordinator to support daily human resources operations.
                            </p>
                            <div className="mb-4 flex-grow flex-grow">
                                <h4 className="font-semibold text-gray-800 mb-2">Main Responsibilities</h4>
                                <ul className="text-sm text-gray-700 space-y-1">
                                <li>• Assist with recruitment activities</li>
                                <li>• Coordinate onboarding and offboarding processes</li>
                                <li>• Maintain and update employee records</li>
                                <li>• Respond to employee inquiries</li>
                                <li>• Prepare HR-related reports</li>
                                <li>• Support the HR team</li>
                                </ul>
                            </div>
                            <button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors mt-auto" onClick={() => setShowModal(true)}>
                                View
                            </button>
                            </div>
                        </div>

                        
                        <div className="bg-white rounded-lg shadow-md p-6 flex flex-col">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">HR Coordinator</h3>
                            <div className="flex justify-between items-center mb-3">
                            <span className="text-gray-700">Cagayan Depot</span>
                            <span className="text-sm text-gray-500">Posted May 20</span>
                            </div>
                            <p className="text-gray-700 mb-4">
                            We are looking for a detail-oriented and proactive HR Coordinator to support daily human resources operations.
                            </p>
                            <div className="mb-4 flex-grow">
                            <h4 className="font-semibold text-gray-800 mb-2">Main Responsibilities</h4>
                            <ul className="text-sm text-gray-700 space-y-1">
                                <li>• Assist with recruitment activities</li>
                                <li>• Coordinate onboarding and offboarding processes</li>
                                <li>• Maintain and update employee records</li>
                                <li>• Respond to employee inquiries</li>
                                <li>• Prepare HR-related reports</li>
                            </ul>
                            </div>
                            <button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors mt-auto" onClick={() => setShowModal(true)}>
                            View
                            </button>
                        </div>

                        
                        <div className="bg-white rounded-lg shadow-md p-6 flex flex-col">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">HR Coordinator</h3>
                            <div className="flex justify-between items-center mb-3">
                            <span className="text-gray-700">Pasig Depot</span>
                            <span className="text-sm text-gray-500">Posted May 21</span>
                            </div>
                            <p className="text-gray-700 mb-4">
                            We are looking for a detail-oriented and proactive HR Coordinator to support daily human resources operations.
                            </p>
                            <div className="mb-4 flex-grow">
                            <h4 className="font-semibold text-gray-800 mb-2">Main Responsibilities</h4>
                            <ul className="text-sm text-gray-700 space-y-1">
                                <li>• Assist with recruitment activities</li>
                                <li>• Coordinate onboarding and offboarding processes</li>
                                <li>• Maintain and update employee records</li>
                                <li>• Respond to employee inquiries</li>
                                <li>• Prepare HR-related reports</li>
                            </ul>
                            </div>
                            <button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors mt-auto" onClick={() => setShowModal(true)}>
                            View
                            </button>
                        </div>

                
                        <div className="bg-white rounded-lg shadow-md p-6 flex flex-col">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Security Personnel</h3>
                            <div className="flex justify-between items-center mb-3">
                            <span className="text-gray-700">Cebu Depot</span>
                            <span className="text-sm text-gray-500">Posted May 22</span>
                            </div>
                            <p className="text-gray-700 mb-4">
                            We are looking for a vigilant and responsible Security Personnel to protect company property, staff, and visitors by maintaining a safe and secure environment.
                            </p>
                            <div className="mb-4  flex-grow">
                            <h4 className="font-semibold text-gray-800 mb-2">Main Responsibilities</h4>
                            <ul className="text-sm text-gray-700 space-y-1">
                                <li>• Monitor and authorize entrance and departure of employees</li>
                                <li>• Conduct regular patrols</li>
                                <li>• Inspect doors, windows, and gates</li>
                                <li>• Respond to alarms, emergencies, and incidents</li>
                            </ul>
                            </div>
                            <button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors mt-auto" onClick={() => setShowModal(true)}>
                            View
                            </button>
                        </div>                                                    
                    </div>
                </div>
            </section>

            <section className={`p-4 ${activeTab === "Applications" ? "" : "hidden"}`}>
                
            </section>

            <section className={`p-4 ${activeTab === "Notifications" ? "" : "hidden"}`}>
                
            </section>

            <section className={`p-4 ${activeTab === "Profile" ? "" : "hidden"}`}>
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Profile Information</h2>
                        
                        {/* Personal Information */}
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
                        
                        {/* Application Information */}
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div>
                                    <span className="font-bold">Application ID:</span> APP-2024-001
                                </div>
                                <div>
                                    <span className="font-bold">Applied Position:</span> Delivery Driver
                                </div>
                                <div>
                                    <span className="font-bold">Preferred Depot:</span> Pasig
                                </div>
                                <div>
                                    <span className="font-bold">Application Date:</span> 10/10/2024
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <span className="font-bold">Application Status:</span> 
                                    <span className="ml-2 px-2 py-1 bg-orange-500 text-white text-xs rounded">Under Review</span>
                                </div>
                                <div>
                                    <span className="font-bold">Resume:</span> <a href="#" className="text-blue-600">delacruzresume.pdf</a>
                                </div>
                                <div>
                                    <span className="font-bold">Available Start Date:</span> 11/01/2024
                                </div>
                                <div>
                                    <span className="font-bold">How did you learn about us:</span> Job Portal
                                </div>
                            </div>
                        </div>
                        
                        <div className="border-t border-gray-300 my-6"></div>
                        
                        {/* Education & Skills */}
                        <div className="space-y-4">
                            <div>
                                <span className="font-bold">Educational Attainment:</span> High School Graduate
                            </div>
                            <div>
                                <span className="font-bold">Institution Name:</span> Pasig High School
                            </div>
                            <div>
                                <span className="font-bold">Year Graduated:</span> 1996
                            </div>
                            <div>
                                <span className="font-bold">Skills:</span> Driving, Customer Service, Logistics, Time Management
                            </div>
                        </div>
                        
                        <div className="border-t border-gray-300 my-6"></div>
                        
                        {/* License Information */}
                        <div className="space-y-4">
                            <div>
                                <span className="font-bold">Driver's License:</span> Yes
                            </div>
                            <div>
                                <span className="font-bold">License Type:</span> Code 3 (Automatic clutch up to 4500kg)
                            </div>
                            <div>
                                <span className="font-bold">License Expiry Date:</span> 10/10/2025
                            </div>
                            <div>
                                <span className="font-bold">Government IDs:</span> SSS, PhilHealth, TIN
                            </div>
                        </div>
                        
                        <div className="border-t border-gray-300 my-6"></div>
                        
                        {/* Work Experience */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-800">Previous Work Experience</h3>
                            <div className="bg-gray-50 p-4 rounded-md">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="font-bold">Company:</span> ABC Logistics, Manila
                                    </div>
                                    <div>
                                        <span className="font-bold">Position:</span> Delivery Driver
                                    </div>
                                    <div>
                                        <span className="font-bold">Duration:</span> 2015 - 2020
                                    </div>
                                    <div>
                                        <span className="font-bold">Reason for Leaving:</span> Seeking new opportunities
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="border-t border-gray-300 my-6"></div>
                        
                        {/* Character References */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-800">Character References</h3>
                            <div className="space-y-3">
                                <div className="bg-gray-50 p-4 rounded-md">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <span className="font-bold">Name:</span> John Smith
                                        </div>
                                        <div>
                                            <span className="font-bold">Contact:</span> 09123456780
                                        </div>
                                        <div>
                                            <span className="font-bold">Remarks:</span> Reliable and hardworking
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-md">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <span className="font-bold">Name:</span> Jane Doe
                                        </div>
                                        <div>
                                            <span className="font-bold">Contact:</span> 09123456781
                                        </div>
                                        <div>
                                            <span className="font-bold">Remarks:</span> Honest and punctual
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-end mt-6">
                            <button className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                                Edit Profile
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {showModal && (
              <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
                <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] border-2 border-black overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">Submit Application</h2>
                    <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                  </div>
                  <form className="p-4 overflow-y-auto max-h-[80vh] space-y-4" onSubmit={(e) => {
                    e.preventDefault();
                    setShowModal(false);
                    setShowSummary(true);
                  }}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                        <input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                        <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                        <input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address:</label>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Street/Village *</label>
                          <input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 text-xs" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Barangay *</label>
                          <input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 text-xs" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">City *</label>
                          <input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 text-xs" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Zip Code *</label>
                          <input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 text-xs" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number *</label>
                        <input type="tel" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                        <input type="email" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Birthday *</label>
                        <input type="date" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500">
                          <option value="">Select</option>
                          <option value="single">Single</option>
                          <option value="married">Married</option>
                          <option value="widowed">Widowed</option>
                          <option value="divorced">Divorced</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <label className="text-sm font-medium text-gray-700">Sex:</label>
                      <label className="flex items-center">
                        <input type="radio" name="sex" value="male" className="mr-1" />
                        <span className="text-sm">Male</span>
                      </label>
                      <label className="flex items-center">
                        <input type="radio" name="sex" value="female" className="mr-1" />
                        <span className="text-sm">Female</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Available Start Date:</label>
                        <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">How did you learn about our company?</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500">
                          <option value="">Select an answer</option>
                          <option value="job-portal">Job Portal</option>
                          <option value="referral">Referral</option>
                          <option value="social-media">Social Media</option>
                          <option value="advertisement">Advertisement</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <label className="text-sm font-medium text-gray-700">Currently Employed?</label>
                      <label className="flex items-center">
                        <input type="radio" name="employed" value="yes" className="mr-1" />
                        <span className="text-sm">Yes</span>
                      </label>
                      <label className="flex items-center">
                        <input type="radio" name="employed" value="no" className="mr-1" />
                        <span className="text-sm">No</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Upload Resume:</label>
                      <input type="file" accept=".pdf,.docx" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" />
                      <p className="text-xs text-gray-500 mt-1">PDF/DOCX file. Max 10MB</p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Do you have the following? (Check all that apply):</label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        <span className="text-sm">SSS</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        <span className="text-sm">PhilHealth</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        <span className="text-sm">TIN</span>
                      </label>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Educational Attainment:</label>
                      <select className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none">
                        <option>Elementary School</option>
                        <option>High School Graduate</option>
                        <option>Secondary School Graduate</option>
                        <option>College Graduate</option>
                      </select>
                      <label className="flex items-center">
                        <span className="text-sm font-medium">Institution Name</span>
                      </label>
                      <div className='flex gap-1'>
                        <label className="flex">
                          <input type="text" placeholder='Education' className="mr-2 border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none" />
                          
                        </label>
                        <label className="flex ">
                          <input type="text" placeholder='Year Finished (dd-mm-yy)' className="mr-2 border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none" />
                          
                        </label>
                      </div>
                      <div className='flex gap-1 mb-2'>
                        <label className="flex">
                          <input type="text" placeholder='Education' className="mr-2 border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none" />
                          
                        </label>
                        <label className="flex ">
                          <input type="text" placeholder='Year Finished (dd-mm-yy)' className="mr-2 border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none" />
                          
                        </label>
                      </div>
                       <label className="flex items-center">
                        <span className="text-sm mt-4 font-medium">Please list your areas of highest proficiency, special skills or other items that may
                        contribute to your abilities in performing the the positioned being applied to.</span>
                      </label>
                      <div className='flex gap-1'>
                        <label className="flex">
                          <input type="text" placeholder='Skills' className="mr-2 border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none" />
                          
                        </label>
                        <label className="flex ">
                          <input type="text" placeholder='Skills' className="mr-2 border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none" />
                          
                        </label>

                        <label className="flex ">
                          <input type="text" placeholder='Skills' className="mr-2 border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none" />
                          
                        </label>
                      </div>
                      <label className="flex items-center">
                        <span className="text-sm mt-4 font-medium">License Information</span>
                      </label>
                      <div className='flex gap-1'>
                        <label className="flex">
                          <input type="text" placeholder='License Expiry Date (dd-mm-yy)' className="w-10vh mr-2 border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none" />
                          
                        </label>
                        <label className="flex ">
                          <input type="text" placeholder='Skills' className="mr-2 border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none" />
                          
                        </label>
                        
                      </div>

                      <div className="space-y-2 mt-4">
                        <p className="text-xs text-gray-600 mb-2">To qualify as a driver, applicants must possess one of the following restrictions:</p>
                        <p className="text-xs text-gray-600 mb-2">• Code B - Equivalent to Code C in new LTO system.</p>
                        <p className="text-xs text-gray-600 mb-2">Note: Code C - Truck up to 4500kg / 8 seats</p>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm">A: All types</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm">B1: Up to 4500kg / 8 seats</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm">B2: Up to 5000kg / 10 or more seats</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm">C: 5000kg</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm">D: Bus 5000kg / 9 or more seats</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm">E: Articulated C 3500kg</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm">1: Motorcycles / Motorized Tricycle</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm">2: Vehicle up to 4500kg</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm">3: Automatic clutch up to 4500kg</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm">4: Automatic clutch up to 5000kg</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm">5: Automatic clutch above 5000kg</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm">6: Automatic clutch 160 up to 4500kg</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm">7: Articulated vehicle 160 up to 4500kg</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm">8: Articulated vehicle 160 above 4500kg</span>
                        </label>
                        <p className="text-xs text-gray-600">Note: Preference given to applicants with Code 3 or Code C.</p>
                      </div>
                      </div>

                    <div className="mt-6 space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800">Previous Work Experiences</h3>
                      {workExperiences.map((exp, index) => (
                        <div key={index} className="border p-4 rounded-md space-y-3 bg-gray-50">
                          <h4 className="font-medium text-gray-700">Work Experience #{index + 1}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name and Location</label>
                              <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Role/Title</label>
                              <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date Employed</label>
                            <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Job Notes</label>
                            <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" rows={3} />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tasks Performed</label>
                            <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" rows={3} />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Leaving</label>
                            <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" rows={2} />
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={() => setWorkExperiences([...workExperiences, {}])} className="text-red-600 hover:underline text-sm font-medium">+ add another work experience</button>
                    </div>

                    <div className="mt-6 space-y-4">
                      <div className="flex items-start space-x-2">
                        <h3 className="text-lg font-semibold text-gray-800">Character Reference (required only for non-drivers)</h3>
  
                      </div>
                      <p className="text-sm text-gray-600">List at least three (3) characters (referrers only for non-delivery applicants):</p>
                      <div className="space-y-3">
                        {characterReferences.map((ref, index) => (
                          <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                              <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number/s</label>
                              <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                              <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" rows={2} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={() => setCharacterReferences([...characterReferences, {}])} className="text-red-600 hover:underline text-sm font-medium">+ add another person</button>
                    </div>

                    <div className="flex justify-between pt-4 border-t mt-6">
                      <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
                        Back
                      </button>
                      <button type="submit" className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                        Proceed
                      </button>
                    </div>

                    <p className="text-xs text-gray-600 mt-4 p-2 bg-gray-50 rounded">
                      By submitting an application for this position, you consent to Roadwise collecting and storing your personal information as part of the recruitment process.
                    </p>
                  </form>
                </div>
              </div>
            )}

            {showSummary && (
              <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowSummary(false)}>
                <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] border-2 border-black overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">Application Summary</h2>
                    <button onClick={() => setShowSummary(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                  </div>
                  <div className="p-4 overflow-y-auto max-h-[80vh] space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Personal Information</h3>
                      <div className="border border-gray-300">
                        <div className="grid grid-cols-2 bg-gray-100 p-2 font-medium">
                          <div>Name</div>
                          <div>Juan Dela Cruz</div>
                        </div>
                        <div className="grid grid-cols-2 p-2">
                          <div>Address</div>
                          <div>123 Main St, Barangay 1, Manila, 1000</div>
                        </div>
                        <div className="grid grid-cols-2 bg-gray-100 p-2">
                          <div>Contact Number</div>
                          <div>09123456789</div>
                        </div>
                        <div className="grid grid-cols-2 p-2">
                          <div>Email</div>
                          <div>juan.delacruz@example.com</div>
                        </div>
                        <div className="grid grid-cols-2 bg-gray-100 p-2">
                          <div>Birthday</div>
                          <div>01/01/1990</div>
                        </div>
                        <div className="grid grid-cols-2 p-2">
                          <div>Marital Status</div>
                          <div>Single</div>
                        </div>
                        <div className="grid grid-cols-2 bg-gray-100 p-2">
                          <div>Sex</div>
                          <div>Male</div>
                        </div>
                        <div className="grid grid-cols-2 p-2">
                          <div>Available Start Date</div>
                          <div>01/01/2024</div>
                        </div>
                        <div className="grid grid-cols-2 bg-gray-100 p-2">
                          <div>How did you learn about our company?</div>
                          <div>Job Portal</div>
                        </div>
                        <div className="grid grid-cols-2 p-2">
                          <div>Currently Employed?</div>
                          <div>No</div>
                        </div>
                        <div className="grid grid-cols-2 bg-gray-100 p-2">
                          <div>Resume</div>
                          <div>Uploaded</div>
                        </div>
                        <div className="grid grid-cols-2 p-2">
                          <div>Government IDs</div>
                          <div>SSS, PhilHealth, TIN</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Education</h3>
                      <div className="border border-gray-300">
                        <div className="grid grid-cols-3 bg-gray-100 p-2 font-medium">
                          <div>Level</div>
                          <div>Institution</div>
                          <div>Year Finished</div>
                        </div>
                        <div className="grid grid-cols-3 p-2">
                          <div>College Graduate</div>
                          <div>University of the Philippines</div>
                          <div>2012</div>
                        </div>
                        <div className="grid grid-cols-3 bg-gray-100 p-2">
                          <div>High School Graduate</div>
                          <div>Manila High School</div>
                          <div>2008</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Skills</h3>
                      <div className="border border-gray-300 p-2">
                        Driving, Customer Service, Logistics
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">License Information</h3>
                      <div className="border border-gray-300">
                        <div className="grid grid-cols-2 bg-gray-100 p-2 font-medium">
                          <div>License Type</div>
                          <div>Expiry Date</div>
                        </div>
                        <div className="grid grid-cols-2 p-2">
                          <div>Code 3</div>
                          <div>01/01/2025</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Work Experience</h3>
                      <div className="border border-gray-300">
                        <div className="grid grid-cols-4 bg-gray-100 p-2 font-medium">
                          <div>Company</div>
                          <div>Role</div>
                          <div>Period</div>
                          <div>Reason for Leaving</div>
                        </div>
                        <div className="grid grid-cols-4 p-2">
                          <div>ABC Logistics, Manila</div>
                          <div>Delivery Driver</div>
                          <div>2015-2020</div>
                          <div>Seeking new opportunities</div>
                        </div>
                        <div className="grid grid-cols-4 bg-gray-100 p-2">
                          <div>XYZ Transport, Quezon City</div>
                          <div>Helper</div>
                          <div>2012-2015</div>
                          <div>Career advancement</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Character References</h3>
                      <div className="border border-gray-300">
                        <div className="grid grid-cols-3 bg-gray-100 p-2 font-medium">
                          <div>Name</div>
                          <div>Contact</div>
                          <div>Remarks</div>
                        </div>
                        <div className="grid grid-cols-3 p-2">
                          <div>John Smith</div>
                          <div>09123456780</div>
                          <div>Reliable and hardworking</div>
                        </div>
                        <div className="grid grid-cols-3 bg-gray-100 p-2">
                          <div>Jane Doe</div>
                          <div>09123456781</div>
                          <div>Honest and punctual</div>
                        </div>
                        <div className="grid grid-cols-3 p-2">
                          <div>Bob Johnson</div>
                          <div>09123456782</div>
                          <div>Team player</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between pt-4 border-t mt-6">
                      <button type="button" onClick={() => {
                        setShowSummary(false);
                        setShowModal(true);
                      }} className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
                        Start Over
                      </button>
                      <button type="button" onClick={() => {
                        if (window.confirm('Are you sure you want to submit the application?')) {
                          alert('Application submitted successfully!');
                        }
                      }} className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                        Submit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
        </div>



    </div>
    </div>
  );
} export default ApplicantLHome;
