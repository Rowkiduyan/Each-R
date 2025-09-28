import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Logo from "./Logo.png";

function AgencyHome() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Job Postings");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [activeProgressTab, setActiveProgressTab] = useState("application");
  const [showEmployeesDropdown, setShowEmployeesDropdown] = useState(false);

  const jobCards = [
    { 
      id: 1, 
      title: "Delivery Driver", 
      depot: "Pasig Depot", 
      posted: "10hrs ago",
      description: "We are seeking a reliable and safety-conscious Truck Driver to transport goods efficiently and on schedule to various destinations.",
      responsibilities: [
        "Safely operate company-based trucks",
        "Conduct pre-trip and post-trip inspections of vehicle systems and equipment",
        "Load and unload cargo",
        "Ensure accurate documentation"
      ]
    },
    { 
      id: 2, 
      title: "Delivery Helper", 
      depot: "Butuan Depot", 
      posted: "1 day ago",
      description: "We are seeking a reliable and safety-conscious Truck Driver to transport goods efficiently and on schedule to various destinations.",
      responsibilities: [
        "Safely operate company-based trucks",
        "Conduct pre-trip and post-trip inspections of vehicle systems and equipment",
        "Load and unload cargo",
        "Ensure accurate documentation"
      ]
    },
    { 
      id: 3, 
      title: "HR Coordinator", 
      depot: "Butuan Depot", 
      posted: "1 day ago",
      description: "We are looking for a detail-oriented and proactive HR Coordinator to support daily human resources operations.",
      responsibilities: [
        "Assist with recruitment activities",
        "Coordinate onboarding and offboarding processes",
        "Maintain and update employee records",
        "Respond to employee inquiries",
        "Prepare HR-related reports",
        "Support the HR team"
      ]
    },
    { 
      id: 4, 
      title: "Security Personnel", 
      depot: "Cebu Depot", 
      posted: "May 22",
      description: "We are looking for a vigilant and responsible Security Personnel to protect company property, staff, and visitors by maintaining a safe and secure environment.",
      responsibilities: [
        "Monitor and authorize entrance and departure of employees",
        "Conduct regular patrols",
        "Inspect doors, windows, and gates",
        "Respond to alarms, emergencies, and incidents"
      ]
    },
  ];

  const endorsedEmployees = [
    { id: "AG-001", name: "Juan Dela Cruz", position: "Driver", depot: "Pasig" },
    { id: "AG-002", name: "Maria Santos", position: "Helper", depot: "Butuan" },
    { id: "AG-003", name: "Jose Rizal", position: "Driver", depot: "Cebu" },
  ];

  const hiredEmployees = [
    { id: "AG-001", name: "Juan Dela Cruz", position: "Driver", depot: "Pasig", hiredDate: "2024-01-15", status: "HIRED" },
    { id: "AG-004", name: "Ana Garcia", position: "Helper", depot: "Manila", hiredDate: "2024-01-20", status: "HIRED" },
    { id: "AG-005", name: "Carlos Lopez", position: "Driver", depot: "Davao", hiredDate: "2024-01-25", status: "HIRED" },
  ];

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEmployeesDropdown && !event.target.closest('.relative')) {
        setShowEmployeesDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmployeesDropdown]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img src={Logo} alt="Roadwise Logo" className="w-15 h-10 mr-2" />
              <div className="text-black font-semibold">
                <div>ROADWISE</div>
                <div className="text-sm">LOGISTICS CORP.</div>
              </div>
            </div>

            <div className="flex-1 flex justify-center">
              <nav className="flex space-x-8">
                <button 
                  onClick={() => setActiveTab("Job Postings")}
                  className={`pb-2 font-medium ${
                    activeTab === "Job Postings" 
                      ? "text-red-600 border-b-2 border-red-600" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Job Postings
                </button>
                <div className="relative">
                  <button 
                    onClick={() => setShowEmployeesDropdown(!showEmployeesDropdown)}
                    className={`pb-2 font-medium flex items-center ${
                      activeTab === "Endorsed" || activeTab === "Hired"
                        ? "text-red-600 border-b-2 border-red-600" 
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Employees
                    <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showEmployeesDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg border z-50">
                      <button
                        onClick={() => {
                          setActiveTab("Endorsed");
                          setShowEmployeesDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Endorsed Employees
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab("Hired");
                          setShowEmployeesDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Employees Hired
                      </button>
                    </div>
                  )}
                </div>
                <Link to="/agency/recruitment" className="text-gray-600 hover:text-gray-900 pb-2 font-medium">Recruitment</Link>
                <Link to="/agency/trainings" className="text-gray-600 hover:text-gray-900 pb-2 font-medium">Trainings/Seminars</Link>
                <Link to="/agency/evaluation" className="text-gray-600 hover:text-gray-900 pb-2 font-medium">Evaluation</Link>
                <Link to="/agency/separation" className="text-gray-600 hover:text-gray-900 pb-2 font-medium">Separation</Link>
                <div className="relative">
                  <Link to="/agency/notifications" className="text-gray-600 hover:text-gray-900 pb-2 font-medium flex items-center">
                    Notifications
                    <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">3</span>
                  </Link>
                </div>
              </nav>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-gray-600 font-medium">Alexis Yvone</span>
              <Link to="/employee/login" className="text-gray-600 hover:text-gray-900 font-medium">Logout</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto px-6 mt-4 flex justify-end">
        <input
          placeholder="Search"
          className="w-80 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Job Postings */}
        <section className={activeTab === "Job Postings" ? "" : "hidden"}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobCards.map((job) => (
              <div key={job.id} className="bg-white rounded-lg shadow-md p-6 relative overflow-hidden flex flex-col">
                <div className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-4 py-1 transform">
                  URGENT HIRING!
                </div>
                <div className="mt-6 flex flex-col flex-grow">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{job.title}</h3>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-700">{job.depot}</span>
                    <span className="text-sm text-gray-500">Posted {job.posted}</span>
                  </div>
                  <p className="text-gray-700 mb-4">
                    {job.description}
                  </p>
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Main Responsibilities</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {job.responsibilities.map((resp, idx) => (
                        <li key={idx}>• {resp}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-auto grid grid-cols-2 gap-2">
                    <button
                      className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors"
                      onClick={() => {
                        setSelectedJob(job);
                        setShowJobModal(true);
                      }}
                    >
                      View
                    </button>
                    <button
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      onClick={() => navigate("/driver/add/record", { state: { job } })}
                    >
                      Endorse
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Endorsed Employees */}
        <section className={activeTab === "Endorsed" ? "" : "hidden"}>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold mb-4">Endorsed Employees</h2>
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-3 py-2 text-left">ID</th>
                    <th className="border px-3 py-2 text-left">Name</th>
                    <th className="border px-3 py-2 text-left">Position</th>
                    <th className="border px-3 py-2 text-left">Depot</th>
                  </tr>
                </thead>
                <tbody>
                  {endorsedEmployees.map((emp) => (
                    <tr
                      key={emp.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedEmployee(emp)}
                    >
                      <td className="border px-3 py-2 text-gray-500">{emp.id}</td>
                      <td className="border px-3 py-2 font-medium text-blue-600 underline">{emp.name}</td>
                      <td className="border px-3 py-2">{emp.position}</td>
                      <td className="border px-3 py-2">{emp.depot}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MyApplications-style view for selected employee */}
            {selectedEmployee && (
              <div className="mt-6 border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-md font-semibold">My Applications</h3>
                  <button onClick={() => setSelectedEmployee(null)} className="text-sm px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">Back</button>
                </div>
                <p className="text-sm text-gray-600 mb-4">Track your progress and complete all steps.</p>
                
                {/* Progress Tabs */}
                <div className="flex gap-2 mb-6">
                  {[
                    { key: "application", label: "Application", status: "completed" },
                    { key: "assessment", label: "Assessment", status: "active" },
                    { key: "requirements", label: "Requirements", status: "pending" },
                    { key: "agreements", label: "Agreements", status: "pending" }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveProgressTab(tab.key)}
                      className={`px-4 py-2 rounded text-sm font-medium ${
                        activeProgressTab === tab.key
                          ? tab.status === "completed" 
                            ? "bg-green-100 text-green-700" 
                            : tab.status === "active"
                            ? "bg-red-100 text-red-700"
                            : "bg-orange-100 text-orange-700"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Application Details Card */}
                <div className="bg-white border border-gray-300 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">
                          {selectedEmployee.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">{selectedEmployee.name}</h4>
                        <p className="text-sm text-gray-600">Position: {selectedEmployee.position}</p>
                        <p className="text-sm text-gray-600">Applied: June 25, 2025</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">#{selectedEmployee.id}</p>
                      <button className="text-blue-500 underline text-sm">Retract Application</button>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    {/* Application Tab Content */}
                    {activeProgressTab === "application" && (
                      <div>
                        <h5 className="font-semibold text-gray-800 mb-3">Application Details</h5>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p><span className="font-medium">Department:</span> Delivery</p>
                            <p><span className="font-medium">Position Applying For:</span> {selectedEmployee.position}</p>
                            <p><span className="font-medium">Depot:</span> {selectedEmployee.depot}</p>
                          </div>
                          <div>
                            <p><span className="font-medium">Current Employment Status:</span> Unemployed</p>
                            <p><span className="font-medium">Available Start Date:</span> 10/10/25</p>
                            <p><span className="font-medium">Resume:</span> <a href="#" className="text-blue-500 underline">delacruzresume.pdf</a></p>
                          </div>
                        </div>
                        <div className="mt-4">
                          <h6 className="font-medium mb-2">Personal Information</h6>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p><span className="font-medium">Full Name:</span> {selectedEmployee.name}</p>
                              <p><span className="font-medium">Address:</span> Blk 4 Lot 159 Papaya St., Brgy. San Lupalop, Pasig City 1860</p>
                              <p><span className="font-medium">Contact Number:</span> 09123456789</p>
                              <p><span className="font-medium">Email:</span> delacruzjuan@gmail.com</p>
                            </div>
                            <div>
                              <p><span className="font-medium">Sex:</span> Male</p>
                              <p><span className="font-medium">Birthday:</span> 10/10/1978</p>
                              <p><span className="font-medium">Age:</span> 47</p>
                              <p><span className="font-medium">Marital Status:</span> Married</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Assessment Tab Content */}
                    {activeProgressTab === "assessment" && (
                      <div>
                        <h5 className="font-semibold text-gray-800 mb-3">Assessment</h5>
                        <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                          <h6 className="font-medium mb-2">Interview Schedule</h6>
                          <div className="space-y-1 text-sm">
                            <p><span className="font-medium">Date:</span> June 30, 2025</p>
                            <p><span className="font-medium">Time:</span> 8:00 AM</p>
                            <p><span className="font-medium">Location:</span> HR Office, Roadwise Pasig Depot</p>
                            <p><span className="font-medium">Interviewer:</span> Raezelle Ferrer</p>
                          </div>
                          <p className="text-xs text-gray-500 italic mt-2">
                            Important Reminder: Please confirm at least a day before your schedule.
                          </p>
                          <button className="mt-3 px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                            Confirm Interview
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Requirements Tab Content */}
                    {activeProgressTab === "requirements" && (
                      <div>
                        <h5 className="font-semibold text-gray-800 mb-3">Requirements</h5>
                        <div className="space-y-4">
                          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                            <h6 className="font-medium mb-2">Mandatory Numbers</h6>
                            <div className="grid grid-cols-2 gap-4">
                              <input placeholder="SSS No." className="p-2 border rounded" />
                              <input placeholder="Philhealth No." className="p-2 border rounded" />
                              <input placeholder="Pag-IBIG No." className="p-2 border rounded" />
                              <input placeholder="TIN No." className="p-2 border rounded" />
                            </div>
                          </div>
                          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                            <h6 className="font-medium mb-2">Required Documents</h6>
                            <div className="space-y-2">
                              {[
                                "PSA Birth Certificate *",
                                "Photocopy of Driver's License (Front and Back) *",
                                "Photocopy of SSS ID",
                                "Photocopy of TIN ID",
                                "Photocopy of Philhealth MDR",
                                "Photocopy of HDMF or Proof of HDMF No. (Pag-IBIG)",
                                "Medical Examination Results *",
                                "NBI Clearance",
                                "Police Clearance"
                              ].map((doc, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 border rounded">
                                  <span className="text-sm">{doc}</span>
                                  <button className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">
                                    Choose File
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Agreements Tab Content */}
                    {activeProgressTab === "agreements" && (
                      <div>
                        <h5 className="font-semibold text-gray-800 mb-3">Agreements</h5>
                        <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h6 className="font-medium">Employee Appointment Letter</h6>
                              <p className="text-sm text-gray-600">Please review and sign the appointment letter</p>
                            </div>
                            <div className="text-right">
                              <a href="#" className="text-blue-500 underline text-sm">applicantfile.pdf</a>
                              <p className="text-xs text-gray-500">10/09/2025</p>
                            </div>
                          </div>
                          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                            <p className="text-sm text-green-800 font-medium">Important: You have been successfully hired! Please see your email for your employee account details and you may login as an employee. Thank you.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Employee's Hired */}
        <section className={activeTab === "Hired" ? "" : "hidden"}>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold mb-4">Employee's Hired</h2>
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-3 py-2 text-left">ID</th>
                    <th className="border px-3 py-2 text-left">Name</th>
                    <th className="border px-3 py-2 text-left">Position</th>
                    <th className="border px-3 py-2 text-left">Depot</th>
                    <th className="border px-3 py-2 text-left">Hired Date</th>
                    <th className="border px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {hiredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="border px-3 py-2 text-gray-500">{emp.id}</td>
                      <td className="border px-3 py-2 font-medium">{emp.name}</td>
                      <td className="border px-3 py-2">{emp.position}</td>
                      <td className="border px-3 py-2">{emp.depot}</td>
                      <td className="border px-3 py-2">{emp.hiredDate}</td>
                      <td className="border px-3 py-2">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                          {emp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {/* Job Detail Modal */}
      {showJobModal && selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowJobModal(false)}>
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] border-2 border-black overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">{selectedJob.title}</h2>
              <button onClick={() => setShowJobModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[80vh] space-y-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-700 font-semibold">{selectedJob.depot}</span>
                <span className="text-sm text-gray-500">Posted {selectedJob.posted}</span>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Job Description</h3>
                <p className="text-gray-700">{selectedJob.description}</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Main Responsibilities</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  {selectedJob.responsibilities.map((resp, idx) => (
                    <li key={idx}>• {resp}</li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowJobModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowJobModal(false);
                    navigate("/driver/add/record", { state: { job: selectedJob } });
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Endorse Employee
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AgencyHome;


