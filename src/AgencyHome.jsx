// src/AgencyHome.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "./supabaseClient";
import LogoCropped from './layouts/photos/logo(cropped).png';
import Roadwise from './Roadwise.png';

function AgencyHome() {
  const navigate = useNavigate();
  const [activeTab] = useState("Job Postings");
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const profileDropdownRef = useRef(null);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  
  // Split view state
  const [showDetails, setShowDetails] = useState(false);

  // job posts state
  const [jobCards, setJobCards] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState(null);

  // hired state (for hired employee details modal)
  const [hiredEmployees, setHiredEmployees] = useState([]);
  const [hiredLoading, setHiredLoading] = useState(true);
  const [hiredError, setHiredError] = useState(null);

  // UI helpers for details
  const [selectedHiredEmployee, setSelectedHiredEmployee] = useState(null);
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileDropdown]);

  // Search functions
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchTerm(searchInput.trim());
    setLocationFilter(locationInput.trim());
  };

  const locationSuggestions = Array.from(
    new Set(
      jobCards
        .map((job) => job.depot)
        .filter((loc) => typeof loc === 'string' && loc.trim().length > 0)
    )
  );

  const filteredLocationSuggestions = locationSuggestions.filter((loc) =>
    loc.toLowerCase().includes(locationInput.toLowerCase())
  );

  const filteredJobs = jobCards.filter((job) => {
    const keywordMatch = searchTerm
      ? job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description?.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    const locationMatch = locationFilter
      ? (job.depot || '').toLowerCase().includes(locationFilter.toLowerCase())
      : true;
    return keywordMatch && locationMatch;
  });

  const handleCardSelect = (job) => {
    setSelectedJob(job);
    setShowDetails(true);
  };

  const handleViewAll = () => {
    setShowDetails(false);
    setSelectedJob(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/employee/login");
  };

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
    loadHired();

    // subscribe to employees changes
    const employeesChannel = supabase
      .channel("employees-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employees" },
        () => {
          loadHired();
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
      if (employeesChannel) supabase.removeChannel(employeesChannel);
      if (jobsChannel) supabase.removeChannel(jobsChannel);
    };
  
  }, []);

  const handleEndorseNavigate = (job) => {
    navigate("/agency/endorse", { state: { job } });
  };

  const formatDate = (d) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }); }
    catch { return String(d); }
  };

  return (
    <>
      <style>{`
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        
        /* Modern sleek scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
        
        /* Firefox */
        * {
          scrollbar-width: thin;
          scrollbar-color: #d1d5db transparent;
        }
      `}</style>
      
      {/* Header (hidden because AgencyLayout provides the main header) */}
      <div className="bg-white shadow-sm sticky top-0 z-50 hidden">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img
                src={LogoCropped}
                alt="Each-R Logo"
                className="h-10 w-auto object-contain"
              />
            </div>

            <nav className="flex items-center space-x-6 text-sm font-medium text-gray-600">
              <button
                type="button"
                onClick={() => navigate("/agency/home")}
                className="pb-1 text-red-600 border-b-2 border-red-600"
              >
                Home
              </button>

              <button
                type="button"
                onClick={() => navigate("/agency/endorsements")}
                className="pb-1 hover:text-gray-900 transition-colors"
              >
                Endorsements
              </button>
              <button
                type="button"
                onClick={() => navigate("/agency/requirements")}
                className="hover:text-gray-900 transition-colors pb-1"
              >
                Requirements
              </button>
              <button
                type="button"
                onClick={() => navigate("/agency/trainings")}
                className="hover:text-gray-900 transition-colors pb-1"
              >
                Trainings/Orientation
              </button>
              <button
                type="button"
                onClick={() => navigate("/agency/evaluation")}
                className="hover:text-gray-900 transition-colors pb-1"
              >
                Evaluation
              </button>
              <button
                type="button"
                onClick={() => navigate("/agency/separation")}
                className="hover:text-gray-900 transition-colors pb-1"
              >
                Separation
              </button>
            </nav>

            <div className="flex items-center space-x-4">
              {/* Notification Bell */}
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 cursor-pointer">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">3</span>
              </div>
              
              {/* User Profile with Dropdown */}
              <div className="relative" ref={profileDropdownRef}>
                <div 
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold cursor-pointer hover:bg-gray-300"
                >
                  AU
                </div>
                {/* Dropdown arrow */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full border-2 border-white flex items-center justify-center pointer-events-none">
                  <svg className="w-2 h-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                {/* Dropdown Menu */}
                {showProfileDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 text-sm text-gray-700 border-b">
                        Agency User
                      </div>
                      <button
                        onClick={() => {
                          setShowProfileDropdown(false);
                          setShowLogoutConfirm(true);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar with Photo Banner - Only show on Job Postings tab */}
      {activeTab === "Job Postings" && (
        <div className="w-full">
          <div className="relative">
            <img
              src={Roadwise}
              alt="Delivery trucks on the road"
              className="w-full h-[200px] object-cover"
            />
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute inset-0 flex items-center justify-center px-4">
              <form className="w-full max-w-4xl" onSubmit={handleSearchSubmit}>
                <div className="flex flex-col gap-3">
                  <div className="flex items-stretch bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                    <div className="flex-1 flex items-center px-5 py-4">
                      <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none"
                        placeholder=" Job title, keywords, or company"
                      />
                    </div>
                    <div className="w-px bg-gray-200" />
                    <div className="flex-1 flex items-center px-6 py-3 relative">
                      <input
                        type="text"
                        value={locationInput}
                        onChange={(e) => setLocationInput(e.target.value)}
                        onFocus={() => setShowLocationSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 100)}
                        className="w-full bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none"
                        placeholder="Location"
                      />
                      {showLocationSuggestions && filteredLocationSuggestions.length > 0 && (
                        <ul className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto z-10">
                          {filteredLocationSuggestions.map((loc) => (
                            <li
                              key={loc}
                              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                              onMouseDown={() => {
                                setLocationInput(loc);
                                setShowLocationSuggestions(false);
                              }}
                            >
                              {loc}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex items-center pr-4">
                      <button
                        type="submit"
                        className="bg-red-600 text-white px-5 py-2 text-base font-semibold rounded-xl hover:bg-red-700 transition-colors"
                        aria-label="Find jobs"
                      >
                        Find Jobs
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end pr-4">
                    <button
                      type="button"
                      className="text-white text-sm font-medium hover:underline"
                    >
                      More options
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex flex-col items-center flex-1">
        <div className="max-w-7xl mx-auto px-6 py-8 w-full">
          {/* Job Postings */}
          <section className={`p-4 ${activeTab === "Job Postings" ? "" : "hidden"}`}>
            <div className="max-w-7xl mx-auto px-6 py-8">
              {jobsLoading ? (
                <div className="text-gray-600">Loading job postings…</div>
              ) : jobsError ? (
                <div className="text-red-600">Error loading job posts: {jobsError}</div>
              ) : jobCards.length === 0 ? (
                <div className="text-gray-600">No job postings available.</div>
              ) : filteredJobs.length === 0 ? (
                <div className="text-gray-600">No job postings match your search.</div>
              ) : showDetails && selectedJob ? (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={handleViewAll}
                    className="flex items-center text-blue-600 hover:text-blue-700 font-medium gap-2"
                  >
                    ← View all Job posts
                  </button>
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="lg:w-1/3 max-h-[70vh] overflow-y-auto no-scrollbar pr-2">
                      <div className="space-y-4">
                        {filteredJobs.map((job) => {
                          const isSelected = selectedJob?.id === job.id;
                          return (
                            <div
                              key={job.id}
                              className={`bg-white rounded-lg shadow-md p-6 flex flex-col relative overflow-hidden cursor-pointer transition-colors ${
                                isSelected ? 'border-2 border-red-600' : 'border border-transparent'
                              } hover:bg-gray-100`}
                              onClick={() => handleCardSelect(job)}
                            >
                              {job.urgent !== false && (
                                <div className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-4 py-1">
                                  URGENT HIRING!
                                </div>
                              )}
                              <div className="mt-4 flex flex-col flex-grow">
                                <h3 className="text-xl font-bold text-gray-800 mb-2">{job.title}</h3>
                                <div className="flex justify-between items-center mb-2 text-sm text-gray-600">
                                  <span>{job.depot}</span>
                                  <span>Posted {job.posted}</span>
                                </div>
                                <p className="text-gray-700 line-clamp-3">{job.description}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="lg:w-2/3 flex flex-col gap-4">
                      <div className="bg-white rounded-lg shadow-md p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div className="space-y-3">
                          {selectedJob.urgent !== false && (
                            <div className="inline-block px-4 py-1 rounded bg-red-100 text-red-700 text-2xl font-semibold">
                              Urgent Hiring
                            </div>
                          )}
                          <div className="flex items-start justify-between gap-4">
                            <h2 className="text-2xl font-bold text-gray-800">{selectedJob.title}</h2>
                            <button
                              className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                              onClick={() => handleEndorseNavigate(selectedJob)}
                            >
                              Endorse
                            </button>
                          </div>
                          <div className="text-sm text-gray-600 flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center justify-center w-5 h-5 text-red-600">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
                                </svg>
                              </span>
                              <span className="font-semibold">{selectedJob.depot}</span>
                            </div>
                            <span className="text-xs text-gray-500">Posted {selectedJob.posted}</span>
                          </div>
                        </div>
                        <p className="text-gray-700">{selectedJob.description || 'No description provided.'}</p>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">Responsibilities & Other Details</h3>
                          {selectedJob.responsibilities && selectedJob.responsibilities.length > 0 ? (
                            <ul className="list-disc list-inside text-gray-700 space-y-1">
                              {selectedJob.responsibilities.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-gray-500">No additional details provided.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredJobs.map((job) => (
                    <div
                      key={job.id}
                      className="bg-white rounded-lg shadow-md p-6 flex flex-col relative overflow-hidden cursor-pointer transition-colors hover:bg-gray-100 border border-transparent"
                      onClick={() => handleCardSelect(job)}
                    >
                      {job.urgent !== false && (
                        <div className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-4 py-1">
                          URGENT HIRING!
                        </div>
                      )}
                      <div className="mt-4 flex flex-col flex-grow">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">{job.title}</h3>
                        <div className="flex justify-between items-center mb-2 text-sm text-gray-600">
                          <span>{job.depot}</span>
                          <span>Posted {job.posted}</span>
                        </div>
                        <p className="text-gray-700 line-clamp-3">{job.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

        {/* Employees Hired */}
        <section className={`p-4 ${activeTab === "Hired" ? "" : "hidden"}`}>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Employees Hired</h2>

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
                <button onClick={() => setShowJobModal(false)} className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">Close</button>
                <button onClick={() => { setShowJobModal(false); navigate("/agency/endorse", { state: { job: selectedJob } }); }} className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors">
                  Endorse Employee
                </button>
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

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 bg-transparent flex items-center justify-center z-50"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full mx-4 overflow-hidden border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">Confirm Logout</h3>
            </div>
            <div className="p-4 text-sm text-gray-700">
              Are you sure you want to logout?
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AgencyHome;

