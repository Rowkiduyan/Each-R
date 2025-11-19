// src/AgencyHome.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "./supabaseClient";

function AgencyHome() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Job Postings");
  const [showEmployeesDropdown, setShowEmployeesDropdown] = useState(false);

  // job posts state
  const [jobCards, setJobCards] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState(null);

  // endorsed/hired state
  const [endorsedEmployees, setEndorsedEmployees] = useState([]);
  const [endorsedLoading, setEndorsedLoading] = useState(true);
  const [endorsedError, setEndorsedError] = useState(null);

  const [hiredEmployees, setHiredEmployees] = useState([]);
  const [hiredLoading, setHiredLoading] = useState(true);
  const [hiredError, setHiredError] = useState(null);

  // UI helpers for details
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedHiredEmployee, setSelectedHiredEmployee] = useState(null);
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEmployeesDropdown && !event.target.closest('.employees-dropdown-root')) {
        setShowEmployeesDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmployeesDropdown]);

  // ---------- Load job posts ----------
  const loadJobPosts = async () => {
    setJobsLoading(true);
    setJobsError(null);
    try {
      const { data, error } = await supabase
        .from("job_posts")
        .select("id, title, depot, description, created_at, responsibilities")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase fetch job_posts error:", error);
        setJobsError(error.message || "Failed to load job posts");
        setJobCards([]);
      } else {
        const normalized = (data || []).map((row) => {
          let responsibilities = [];
          if (Array.isArray(row.responsibilities)) responsibilities = row.responsibilities;
          else if (typeof row.responsibilities === "string")
            responsibilities = row.responsibilities.split(/\r?\n|;/).map(s => s.trim()).filter(Boolean);

          let posted = "Unknown";
          if (row.created_at) {
            posted = new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
          }

          return {
            id: row.id,
            title: row.title || "Untitled",
            depot: row.depot || "—",
            description: row.description || "",
            responsibilities,
            posted,
            raw: row,
          };
        });

        setJobCards(normalized);
      }
    } catch (err) {
      console.error("Unexpected error loading job posts:", err);
      setJobsError(String(err));
      setJobCards([]);
    } finally {
      setJobsLoading(false);
    }
  };

  // ---------- Load endorsed employees (recruitment_endorsements) ----------
  const loadEndorsed = async () => {
    setEndorsedLoading(true);
    setEndorsedError(null);
    try {
      const { data, error } = await supabase
        .from("recruitment_endorsements")
        .select(
          `id,
           agency_profile_id,
           fname,
           lname,
           mname,
           contact_number,
           email,
           position,
           depot,
           status,
           payload,
           endorsed_employee_id,
           job_id,
           created_at`
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed loading endorsements:", error);
        setEndorsedError(error.message || String(error));
        setEndorsedEmployees([]);
      } else {
        const normalized = (data || []).map((r) => {
          // payload may be jsonb or string
          let payload = r.payload;
          // if (typeof payload === "string") {
          //   try { payload = JSON.parse(payload); } catch () { payload = null; }
          // }

          const app = payload?.applicant || payload?.form || payload || null;

          const first = r.fname || app?.firstName || app?.fname || app?.first_name || null;
          const last = r.lname || app?.lastName || app?.lname || app?.last_name || null;
          const middle = r.mname || app?.middleName || app?.mname || null;
          const email = r.email || app?.email || app?.contact || null;
          const contact = r.contact_number || app?.contact || app?.phone || null;
          const pos = r.position || app?.position || null;
          const depot = r.depot || app?.depot || null;

          const displayName = [first, middle, last].filter(Boolean).join(" ").trim() || (app?.fullName || app?.name) || "Unnamed";

          // If endorsed_employee_id exists, treat endorsement as hired in UI
          const status = r.endorsed_employee_id ? "hired" : (r.status || "pending");

          return {
            id: r.id,
            name: displayName,
            first,
            middle,
            last,
            email,
            contact,
            position: pos || "—",
            depot: depot || "—",
            status,
            agency_profile_id: r.agency_profile_id || null,
            payload, // keep raw payload for debug/detail view only
            endorsed_employee_id: r.endorsed_employee_id || null,
            job_id: r.job_id || null,
            created_at: r.created_at || null,
            raw: r,
          };
        });

        setEndorsedEmployees(normalized);
      }
    } catch (err) {
      console.error("Unexpected endorsed load error:", err);
      setEndorsedError(String(err));
      setEndorsedEmployees([]);
    } finally {
      setEndorsedLoading(false);
    }
  };

  // ---------- Load hired employees (employees table) ----------
  const loadHired = async () => {
    setHiredLoading(true);
    setHiredError(null);
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, email, fname, lname, mname, contact_number, position, depot, hired_at, agency_profile_id, source")
        .order("hired_at", { ascending: false });

      if (error) {
        console.error("Failed loading employees:", error);
        setHiredError(error.message || String(error));
        setHiredEmployees([]);
      } else {
        const normalized = (data || []).map((r) => {
          const name = [r.fname, r.mname, r.lname].filter(Boolean).join(" ").trim() || r.email || "Unnamed";
          return {
            id: r.id,
            name,
            email: r.email || null,
            contact: r.contact_number || null,
            position: r.position || "Employee",
            depot: r.depot || "—",
            hired_at: r.hired_at || null,
            agency_profile_id: r.agency_profile_id || null,
            source: r.source || null,
            raw: r,
          };
        });

        setHiredEmployees(normalized);
      }
    } catch (err) {
      console.error("Unexpected hired load error:", err);
      setHiredError(String(err));
      setHiredEmployees([]);
    } finally {
      setHiredLoading(false);
    }
  };

  // initial loads + realtime subscriptions
  useEffect(() => {
    loadJobPosts();
    loadEndorsed();
    loadHired();

    // subscribe to recruitment_endorsements changes
    const endorsementsChannel = supabase
      .channel("recruitment-endorsements-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recruitment_endorsements" },
        () => {
          loadEndorsed();
        }
      )
      .subscribe();

    // subscribe to employees changes - when employees change, update hires + endorsed (so status flips to hired)
    const employeesChannel = supabase
      .channel("employees-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employees" },
        () => {
          loadHired();
          loadEndorsed(); // refresh endorsement statuses (endorsed_employee_id may have been set)
        }
      )
      .subscribe();

    const jobsChannel = supabase
      .channel("job-posts-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "job_posts" },
        () => loadJobPosts()
      )
      .subscribe();

    return () => {
      if (endorsementsChannel) supabase.removeChannel(endorsementsChannel);
      if (employeesChannel) supabase.removeChannel(employeesChannel);
      if (jobsChannel) supabase.removeChannel(jobsChannel);
    };
  
  }, []);

  const handleEndorseNavigate = (job) => {
    navigate("/driver/add/record", { state: { job } });
  };

  const formatDate = (d) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }); }
    catch { return String(d); }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0 text-red-600 font-bold text-2xl italic">Each-R</div>
            </div>

            <div className="flex-1 flex justify-center">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab("Job Postings")}
                  className={`pb-2 font-medium ${activeTab === "Job Postings" ? "text-red-600 border-b-2 border-red-600" : "text-gray-600 hover:text-gray-900"}`}
                >
                  Job Postings
                </button>

                <div className="relative employees-dropdown-root">
                  <button
                    onClick={() => setShowEmployeesDropdown(v => !v)}
                    className={`pb-2 font-medium flex items-center ${activeTab === "Endorsed" || activeTab === "Hired" ? "text-red-600 border-b-2 border-red-600" : "text-gray-600 hover:text-gray-900"}`}
                  >
                    Employees
                    <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showEmployeesDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg border z-50">
                      <button onClick={() => { setActiveTab("Endorsed"); setShowEmployeesDropdown(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Endorsed Employees</button>
                      <button onClick={() => { setActiveTab("Hired"); setShowEmployeesDropdown(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Employees Hired</button>
                    </div>
                  )}
                </div>

                <Link to="/agency/recruitment" className="text-gray-600 hover:text-gray-900 pb-2 font-medium">Recruitment</Link>
                <Link to="/agency/trainings" className="text-gray-600 hover:text-gray-900 pb-2 font-medium">Trainings/Seminars</Link>
                <Link to="/agency/evaluation" className="text-gray-600 hover:text-gray-900 pb-2 font-medium">Evaluation</Link>
                <Link to="/agency/separation" className="text-gray-600 hover:text-gray-900 pb-2 font-medium">Separation</Link>
                <Link to="/agency/notifications" className="text-gray-600 hover:text-gray-900 pb-2 font-medium flex items-center">
                  Notifications
                  <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">3</span>
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-gray-600 font-medium">Agency User</span>
              <Link to="/employee/login" className="text-gray-600 hover:text-gray-900 font-medium">Logout</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto px-6 mt-4 flex justify-end">
        <input placeholder="Search" className="w-80 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-1 focus:ring-red-500" />
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Job Postings */}
        <section className={activeTab === "Job Postings" ? "" : "hidden"}>
          {jobsLoading ? (
            <div className="p-8 text-center text-gray-600">Loading job postings…</div>
          ) : jobsError ? (
            <div className="p-8 text-center text-red-600">Error loading job posts: {jobsError}</div>
          ) : jobCards.length === 0 ? (
            <div className="p-8 text-center text-gray-600">No job postings available.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobCards.map((job) => (
                <div key={job.id} className="bg-white rounded-lg shadow-md p-6 relative overflow-hidden flex flex-col">
                  <div className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-4 py-1 transform">URGENT HIRING!</div>
                  <div className="mt-6 flex flex-col flex-grow">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{job.title}</h3>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-gray-700">{job.depot}</span>
                      <span className="text-sm text-gray-500">Posted {job.posted}</span>
                    </div>
                    <p className="text-gray-700 mb-4">{job.description}</p>

                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-800 mb-2">Main Responsibilities</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {job.responsibilities && job.responsibilities.length > 0 ? (
                          job.responsibilities.map((resp, idx) => <li key={idx}>• {resp}</li>)
                        ) : (
                          <li className="text-gray-500">No responsibilities listed.</li>
                        )}
                      </ul>
                    </div>

                    <div className="mt-auto grid grid-cols-2 gap-2">
                      <button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors" onClick={() => { setSelectedJob(job); setShowJobModal(true); }}>View</button>
                      <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors" onClick={() => handleEndorseNavigate(job)}>Endorse</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Endorsed Employees */}
        <section className={activeTab === "Endorsed" ? "" : "hidden"}>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold mb-4">Endorsed Employees</h2>

            {endorsedLoading ? (
              <div className="p-6 text-gray-600">Loading endorsed employees…</div>
            ) : endorsedError ? (
              <div className="p-4 bg-red-50 text-red-700 rounded">{endorsedError}</div>
            ) : endorsedEmployees.length === 0 ? (
              <div className="p-6 text-gray-600">No endorsed employees yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-3 py-2 text-left">ID</th>
                      <th className="border px-3 py-2 text-left">Name</th>
                      <th className="border px-3 py-2 text-left">Position</th>
                      <th className="border px-3 py-2 text-left">Depot</th>
                      <th className="border px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endorsedEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedEmployee(emp)}>
                        <td className="border px-3 py-2 text-gray-500">{emp.id}</td>
                        <td className="border px-3 py-2 font-medium text-blue-600 underline">{emp.name}</td>
                        <td className="border px-3 py-2">{emp.position}</td>
                        <td className="border px-3 py-2">{emp.depot}</td>
                        <td className="border px-3 py-2">
                          <span className={`px-2 py-1 rounded text-xs ${emp.status === "hired" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                            {emp.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* selected endorsed employee view */}
            {selectedEmployee && (
              <div className="mt-6 border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-md font-semibold">Endorsement Detail</h3>
                  <button onClick={() => setSelectedEmployee(null)} className="text-sm px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">Back</button>
                </div>

                <div className="bg-white border border-gray-300 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">{selectedEmployee.name.split(' ').map(n => n[0]).join('')}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">{selectedEmployee.name}</h4>
                        <p className="text-sm text-gray-600">Position: {selectedEmployee.position}</p>
                        <p className="text-sm text-gray-600">Depot: {selectedEmployee.depot}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-gray-500">#{selectedEmployee.id}</p>
                      <p className="text-sm text-gray-500">Endorsed: {formatDate(selectedEmployee.created_at)}</p>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-semibold text-gray-800 mb-2">Contact</h5>
                    <p className="text-sm">Email: {selectedEmployee.email || "—"}</p>
                    <p className="text-sm">Phone: {selectedEmployee.contact || "—"}</p>
                  </div>

                  <div className="mt-4">
                    <h5 className="font-semibold text-gray-800 mb-2">Raw Payload (debug)</h5>
                    <pre className="text-xs bg-gray-50 p-2 rounded max-h-44 overflow-auto text-gray-700">{JSON.stringify(selectedEmployee.payload || selectedEmployee.raw, null, 2)}</pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Employees Hired */}
        <section className={activeTab === "Hired" ? "" : "hidden"}>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold mb-4">Employees Hired</h2>

            {hiredLoading ? (
              <div className="p-6 text-gray-600">Loading hired employees…</div>
            ) : hiredError ? (
              <div className="p-4 bg-red-50 text-red-700 rounded">{hiredError}</div>
            ) : hiredEmployees.length === 0 ? (
              <div className="p-6 text-gray-600">No hired employees yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-3 py-2 text-left">ID</th>
                      <th className="border px-3 py-2 text-left">Name</th>
                      <th className="border px-3 py-2 text-left">Position</th>
                      <th className="border px-3 py-2 text-left">Depot</th>
                      <th className="border px-3 py-2 text-left">Hired Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hiredEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedHiredEmployee(emp); setShowEmployeeDetails(true); }}>
                        <td className="border px-3 py-2 text-gray-500">{emp.id}</td>
                        <td className="border px-3 py-2 font-medium text-blue-600 underline">{emp.name}</td>
                        <td className="border px-3 py-2">{emp.position}</td>
                        <td className="border px-3 py-2">{emp.depot}</td>
                        <td className="border px-3 py-2">{formatDate(emp.hired_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Job Detail Modal */}
      {showJobModal && selectedJob && (
        <div className="fixed inset-0 flex items-center justify-center z-50" onClick={() => setShowJobModal(false)}>
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
                  {selectedJob.responsibilities && selectedJob.responsibilities.length > 0 ? (
                    selectedJob.responsibilities.map((resp, idx) => <li key={idx}>• {resp}</li>)
                  ) : (
                    <li className="text-gray-500">No responsibilities listed.</li>
                  )}
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={() => setShowJobModal(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Close</button>
                <button onClick={() => { setShowJobModal(false); navigate("/driver/add/record", { state: { job: selectedJob } }); }} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Endorse Employee</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hired employee details modal */}
      {showEmployeeDetails && selectedHiredEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto border-2 border-black">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">Employee Details - {selectedHiredEmployee.name}</h2>
              <button onClick={() => { setShowEmployeeDetails(false); setSelectedHiredEmployee(null); }} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>

            <div className="p-6">
              <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold">{selectedHiredEmployee.name}</h2>
                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 align-middle">
                    <span className="text-red-500">⚑</span> Agency
                  </span>
                </div>
                <span className="text-gray-500">ID: {selectedHiredEmployee.id}</span>
                <div className="mt-2 text-gray-600">{selectedHiredEmployee.position} | {selectedHiredEmployee.depot}</div>
                <div className="mt-4 text-sm text-gray-700">Email: {selectedHiredEmployee.email || "—"}</div>
              </div>

              <div className="bg-white shadow-md rounded-lg p-6">
                <div className="text-gray-600">Employee modal content (details, docs, onboarding, etc.)</div>
              </div>

              <button className="fixed bottom-6 right-6 bg-gray-800 text-white px-4 py-2 rounded-lg shadow hover:bg-gray-700 z-40">Options</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AgencyHome;
