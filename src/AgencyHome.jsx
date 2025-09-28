import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Logo from "./Logo.png";

function AgencyHome() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Job Postings");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

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

  return (
    <div className="min-h-screen bg-white">
      {/* Top Bar */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img src={Logo} alt="Roadwise Logo" className="w-15 h-10 mr-2" />
              <div className="text-black font-semibold">
                <div>ROADWISE</div>
                <div className="text-sm">LOGISTICS CORP.</div>
              </div>
            </div>

            <div className="flex-1 text-center">
              <h1 className="text-3xl font-bold text-gray-800">Agency Home</h1>
            </div>

            <div className="flex items-center space-x-3">
              <Link to="/employee/login" className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Logout</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 mt-4 flex items-center gap-2">
        {[
          { key: "Job Postings", label: "Job Postings" },
          { key: "Endorsed", label: "Endorsed Employees" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setActiveTab(t.key);
              setSelectedEmployee(null);
            }}
            className={`px-5 py-2 rounded-sm font-semibold text-white ${
              activeTab === t.key ? "bg-red-600" : "bg-red-500 hover:bg-red-600"
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto">
          <input
            placeholder="Search"
            className="w-80 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
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

            {/* Document uploader for selected employee */}
            {selectedEmployee && (
              <div className="mt-6 border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-md font-semibold">Documents for {selectedEmployee.name}</h3>
                  <button onClick={() => setSelectedEmployee(null)} className="text-sm px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">Close</button>
                </div>

                {/* Mandatory Numbers */}
                <div className="grid grid-cols-4 gap-4 border border-gray-300 p-4 rounded mb-4">
                  <input placeholder="SSS No." className="p-2 border rounded" />
                  <input placeholder="Philhealth No." className="p-2 border rounded" />
                  <input placeholder="Pag-IBIG No." className="p-2 border rounded" />
                  <input placeholder="TIN No." className="p-2 border rounded" />
                </div>

                {/* File Upload Grid (moved from DriverAddRecord Step 6) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border border-gray-300 p-4 rounded">
                  {[
                    "Photocopy of PSA Birth Certificate *",
                    "1x1 Picture w/ White Background",
                    "Photocopy of Driver's License (Front and Back) *",
                    "Photocopy of TIN ID / BIR FORM 1905/1902",
                    "Photocopy of SSS ID",
                    "Photocopy of HDMF (Pag-IBIG) (Home Development Mutual Fund)",
                    "Photocopy of Philhealth ID / MDR (Members Data Record)",
                    "Photocopy of TIN ID",
                  ].map((label, idx) => (
                    <div key={idx} className="border border-gray-300 rounded p-3">
                      <label className="block text-sm font-semibold mb-2">{label}</label>
                      <div className="flex items-center space-x-3">
                        <label className="px-3 py-1 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 text-sm">
                          Choose File
                          <input type="file" className="hidden" onChange={(e)=>console.log("Selected for", label, e.target.files[0]?.name)} />
                        </label>
                        <span className="text-xs text-gray-500">No file chosen</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Additional Requirements (moved from DriverAddRecord Step 7) */}
                <div className="mt-8 p-4 bg-white rounded shadow border border-gray-300 space-y-4">
                  <h3 className="text-md font-semibold">Additional Requirements</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* CV */}
                    <div className="border rounded-lg p-4">
                      <label className="block font-medium mb-2">Curriculum Vitae</label>
                      <label className="px-3 py-1 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 text-sm inline-block">
                        Choose File
                        <input type="file" className="hidden" />
                      </label>
                      <span className="ml-2 text-sm text-gray-500">No file chosen</span>
                    </div>

                    {/* NBI Clearance */}
                    <div className="border rounded-lg p-4 space-y-2">
                      <label className="block font-medium">Photocopy of NBI Clearance</label>
                      <label className="px-3 py-1 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 text-sm inline-block">
                        Choose File
                        <input type="file" className="hidden" />
                      </label>
                      <span className="ml-2 text-sm text-gray-500">No file chosen</span>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm text-gray-600">Date Validity:</span>
                        <input type="date" className="border rounded p-1 text-sm" />
                      </div>
                    </div>

                    {/* Police Clearance */}
                    <div className="border rounded-lg p-4 space-y-2">
                      <label className="block font-medium">Photocopy of Police Clearance</label>
                      <label className="px-3 py-1 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 text-sm inline-block">
                        Choose File
                        <input type="file" className="hidden" />
                      </label>
                      <span className="ml-2 text-sm text-gray-500">No file chosen</span>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm text-gray-600">Date Validity:</span>
                        <input type="date" className="border rounded p-1 text-sm" />
                      </div>
                    </div>

                    {/* Medical Examination */}
                    <div className="border rounded-lg p-4 space-y-2">
                      <label className="block font-medium">Medical Examination Results</label>
                      <p className="text-xs text-gray-500">
                        (X-RAY, STOOL, CBC, URINE, CBC, DRUG TEST, HEPA) <strong>*Attach all in one file</strong>
                      </p>
                      <label className="px-3 py-1 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 text-sm inline-block">
                        Choose File
                        <input type="file" className="hidden" />
                      </label>
                      <span className="ml-2 text-sm text-gray-500">No file chosen</span>
                    </div>

                    {/* Sketch of Direction */}
                    <div className="border rounded-lg p-4 space-y-2 md:col-span-2">
                      <label className="block font-medium">Sketch of Direction of Residence (House to Depot)</label>
                      <p className="text-xs text-gray-500">*For non-delivery crew only</p>
                      <label className="px-3 py-1 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 text-sm inline-block">
                        Choose File
                        <input type="file" className="hidden" />
                      </label>
                      <span className="ml-2 text-sm text-gray-500">No file chosen</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
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


