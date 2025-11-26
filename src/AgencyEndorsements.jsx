// src/AgencyEndorsements.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "./supabaseClient";
import LogoCropped from './layouts/photos/logo(cropped).png';

function AgencyEndorsements() {
  const navigate = useNavigate();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const profileDropdownRef = useRef(null);

  // endorsed/hired state
  const [endorsedEmployees, setEndorsedEmployees] = useState([]);
  const [endorsedLoading, setEndorsedLoading] = useState(true);
  const [endorsedError, setEndorsedError] = useState(null);

  const [hiredEmployees, setHiredEmployees] = useState([]);
  const [hiredLoading, setHiredLoading] = useState(true);
  const [hiredError, setHiredError] = useState(null);

  // UI helpers for details
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  
  // Pagination for endorsements
  const [endorsementsPage, setEndorsementsPage] = useState(1);
  const [endorsementsPerPage, setEndorsementsPerPage] = useState(10);
  const [endorsementsSearch, setEndorsementsSearch] = useState('');
  const [employeeDetailTab, setEmployeeDetailTab] = useState('profiling');

  // Calculate items per page based on available screen height
  useEffect(() => {
    const calculateItemsPerPage = () => {
      // Approximate row height (including padding and borders)
      const rowHeight = 45;
      // Header height + title + pagination + padding (~180px for header, ~80px for title, ~60px for pagination, ~40px padding)
      const reservedHeight = 360;
      const availableHeight = window.innerHeight - reservedHeight;
      const calculatedItems = Math.max(5, Math.floor(availableHeight / rowHeight));
      setEndorsementsPerPage(calculatedItems);
    };

    calculateItemsPerPage();
    window.addEventListener('resize', calculateItemsPerPage);
    return () => window.removeEventListener('resize', calculateItemsPerPage);
  }, []);

  // Reset to page 1 if current page exceeds total pages after resize
  useEffect(() => {
    const totalPages = Math.ceil(endorsedEmployees.length / endorsementsPerPage);
    if (endorsementsPage > totalPages && totalPages > 0) {
      setEndorsementsPage(totalPages);
    }
  }, [endorsementsPerPage, endorsedEmployees.length, endorsementsPage]);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/employee/login");
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
          let payload = r.payload;

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
            payload,
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
          loadEndorsed();
        }
      )
      .subscribe();

    return () => {
      if (endorsementsChannel) supabase.removeChannel(endorsementsChannel);
      if (employeesChannel) supabase.removeChannel(employeesChannel);
    };
  
  }, []);

  const formatDate = (d) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }); }
    catch { return String(d); }
  };

  return (
    <div className="min-h-screen bg-white h-screen overflow-hidden">
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
      
      {/* Header */}
      <div className="bg-white shadow-sm">
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
              <Link
                to="/agency/home"
                className="pb-1 hover:text-gray-900 transition-colors"
              >
                Home
              </Link>

              <button
                className="pb-1 text-red-600 border-b-2 border-red-600"
              >
                Endorsements
              </button>
              <Link to="/agency/trainings" className="hover:text-gray-900 transition-colors pb-1">Trainings/Seminars</Link>
              <Link to="/agency/evaluation" className="hover:text-gray-900 transition-colors pb-1">Evaluation</Link>
              <Link to="/agency/separation" className="hover:text-gray-900 transition-colors pb-1">Separation</Link>
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

      {/* Content */}
      <div className="flex flex-col items-center h-full">
        <div className="max-w-7xl mx-auto px-6 py-8 w-full h-full">
          {/* Endorsements */}
          <section className="p-4 overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col h-full overflow-hidden">
              {/* Header with title and search */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Endorsed Employees</h2>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={endorsementsSearch}
                      onChange={(e) => {
                        setEndorsementsSearch(e.target.value);
                        setEndorsementsPage(1); // Reset to page 1 when searching
                      }}
                      placeholder="Search..."
                      className="w-64 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </button>
                </div>
              </div>

              {endorsedLoading ? (
                <div className="p-6 text-gray-600">Loading endorsements…</div>
              ) : endorsedError ? (
                <div className="p-4 bg-red-50 text-red-700 rounded">{endorsedError}</div>
              ) : endorsedEmployees.length === 0 ? (
                <div className="p-6 text-gray-600">No endorsements yet.</div>
              ) : (() => {
                // Filter employees based on search
                const filteredEmployees = endorsedEmployees.filter((emp) => {
                  if (!endorsementsSearch.trim()) return true;
                  const searchLower = endorsementsSearch.toLowerCase();
                  return (
                    emp.name?.toLowerCase().includes(searchLower) ||
                    emp.position?.toLowerCase().includes(searchLower) ||
                    emp.depot?.toLowerCase().includes(searchLower) ||
                    emp.status?.toLowerCase().includes(searchLower) ||
                    String(emp.id).includes(searchLower)
                  );
                });
                
                const totalFilteredPages = Math.max(1, Math.ceil(filteredEmployees.length / endorsementsPerPage));
                const startIndex = (endorsementsPage - 1) * endorsementsPerPage;
                const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + endorsementsPerPage);

                return (
                <>
                  <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden">
                    {/* Table on the left */}
                    <div className={`${selectedEmployee ? 'lg:w-[30%]' : 'w-full'} overflow-x-auto overflow-y-auto no-scrollbar`}>
                      {filteredEmployees.length === 0 ? (
                        <div className="p-6 text-gray-600">No endorsements match your search.</div>
                      ) : (
                      <table className="w-full border border-gray-200 text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            {!selectedEmployee && <th className="border px-3 py-2 text-left">ID</th>}
                            <th className="border px-3 py-2 text-left">Name</th>
                            {!selectedEmployee && (
                              <>
                                <th className="border px-3 py-2 text-left">Position</th>
                                <th className="border px-3 py-2 text-left">Depot</th>
                                <th className="border px-3 py-2 text-left">Status</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedEmployees.map((emp) => {
                              // Find hired date from hiredEmployees if this endorsement was hired
                              const hiredEmployee = emp.endorsed_employee_id 
                                ? hiredEmployees.find(h => h.id === emp.endorsed_employee_id)
                                : null;
                              const hiredDate = hiredEmployee?.hired_at ? formatDate(hiredEmployee.hired_at) : null;
                              const isSelected = selectedEmployee?.id === emp.id;
                              
                              return (
                                <tr 
                                  key={emp.id} 
                                  className={`hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`} 
                                  onClick={() => setSelectedEmployee(emp)}
                                >
                                  {!selectedEmployee && <td className="border px-3 py-2 text-gray-500">{emp.id}</td>}
                                  <td className="border px-3 py-2 text-gray-800">{emp.name}</td>
                                  {!selectedEmployee && (
                                    <>
                                      <td className="border px-3 py-2">{emp.position}</td>
                                      <td className="border px-3 py-2">{emp.depot}</td>
                                      <td className="border px-3 py-2">
                                        <span className={emp.status === "hired" ? "text-green-600" : "text-yellow-600"}>
                                          {emp.status.toUpperCase()}
                                        </span>
                                        {emp.status === "hired" && (
                                          <div className="text-xs text-gray-400 mt-0.5">{hiredDate || "date unavailable"}</div>
                                        )}
                                      </td>
                                    </>
                                  )}
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                      )}
                    </div>

                    {/* Detail panel on the right */}
                    {selectedEmployee && (() => {
                      // Extract payload data for display
                      const payload = selectedEmployee.payload || {};
                      const formData = payload.form || payload.applicant || payload || {};
                      const workExperiences = payload.workExperiences || [];
                      const characterReferences = payload.characterReferences || [];
                      const job = payload.job || {};
                      const isHired = selectedEmployee.status === "hired";

                      // Different tabs based on status
                      const hiredTabs = [
                        { key: 'profiling', label: 'Profiling' },
                        { key: 'documents', label: 'Documents' },
                        { key: 'onboarding', label: 'Onboarding' },
                        { key: 'evaluation', label: 'Evaluation' },
                        { key: 'separation', label: 'Separation' },
                      ];

                      const pendingTabs = [
                        { key: 'endorsement', label: 'Endorsement Details' },
                        { key: 'assessment', label: 'Assessment' },
                        { key: 'agreements', label: 'Agreements' },
                      ];

                      const detailTabs = isHired ? hiredTabs : pendingTabs;

                      // Reset tab if switching between hired/pending and tab doesn't exist
                      const validTabKeys = detailTabs.map(t => t.key);
                      const currentTab = validTabKeys.includes(employeeDetailTab) ? employeeDetailTab : detailTabs[0].key;

                      return (
                      <div className="lg:w-[70%] overflow-y-auto flex flex-col">
                        {/* Employee Header */}
                        <div className="bg-white border border-gray-300 rounded-t-lg p-4 relative">
                          {/* Close button - upper right */}
                          <button 
                            onClick={() => setSelectedEmployee(null)} 
                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          
                          <div className="flex items-center gap-3 pr-10">
                            <div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center text-blue-600 font-bold">
                              {selectedEmployee.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-gray-800">{selectedEmployee.name}</h4>
                                {isHired && (
                                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">HIRED</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">#{selectedEmployee.id}</p>
                              <p className="text-sm text-gray-600">{selectedEmployee.position} | {selectedEmployee.depot}</p>
                              {!isHired && <p className="text-xs text-blue-600 hover:underline cursor-pointer mt-1">Retract Endorsement</p>}
                            </div>
                          </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-gray-300 bg-white overflow-x-auto">
                          {detailTabs.map((tab) => (
                            <button
                              key={tab.key}
                              onClick={() => setEmployeeDetailTab(tab.key)}
                              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                currentTab === tab.key
                                  ? 'border-orange-500 text-orange-600 bg-orange-50'
                                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        {/* Tab Content */}
                        <div className="bg-white border border-t-0 border-gray-300 rounded-b-lg p-6 flex-1 overflow-y-auto">
                          
                          {/* PROFILING TAB */}
                          {currentTab === 'profiling' && (
                            <div className="space-y-6">
                              {/* Job Details */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Job Details</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Position Applying For:</span>
                                    <span className="ml-2 text-gray-800">{job.title || selectedEmployee.position || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Current Employment Status:</span>
                                    <span className="ml-2 text-gray-800">{formData.employed || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Available Start Date:</span>
                                    <span className="ml-2 text-gray-800">{formData.startDate ? formatDate(formData.startDate) : "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Depot:</span>
                                    <span className="ml-2 text-gray-800">{job.depot || selectedEmployee.depot || "—"}</span>
                                  </div>
                                  <div className="col-span-2">
                                    <span className="text-gray-500">Resume:</span>
                                    <span className="ml-2 text-blue-600 underline cursor-pointer">{formData.resumeName || "Not uploaded"}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Personal Information */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Personal Information</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Full Name:</span>
                                    <span className="ml-2 text-gray-800">
                                      {formData.firstName || formData.fname || selectedEmployee.first || ""} {formData.middleName || formData.mname || selectedEmployee.middle || ""} {formData.lastName || formData.lname || selectedEmployee.last || ""}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Sex:</span>
                                    <span className="ml-2 text-gray-800">{formData.sex || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Address:</span>
                                    <span className="ml-2 text-gray-800">
                                      {[formData.street, formData.barangay, formData.city, formData.zip].filter(Boolean).join(', ') || "—"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Birthday:</span>
                                    <span className="ml-2 text-gray-800">{formData.birthday ? formatDate(formData.birthday) : "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Contact Number:</span>
                                    <span className="ml-2 text-gray-800">{formData.contact || selectedEmployee.contact || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Age:</span>
                                    <span className="ml-2 text-gray-800">{formData.age || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Email:</span>
                                    <span className="ml-2 text-gray-800">{formData.email || selectedEmployee.email || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Marital Status:</span>
                                    <span className="ml-2 text-gray-800">{formData.maritalStatus || formData.marital_status || "—"}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Emergency Contact */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Emergency Contact</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Contact Person:</span>
                                    <span className="ml-2 text-gray-800">{formData.emergencyContactName || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Relationship:</span>
                                    <span className="ml-2 text-gray-800">{formData.emergencyContactRelation || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Contact Number:</span>
                                    <span className="ml-2 text-gray-800">{formData.emergencyContactNumber || "—"}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Education */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Education</h5>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Level:</span>
                                    <span className="ml-2 text-gray-800">{formData.edu1Level || formData.educational_attainment || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Institution:</span>
                                    <span className="ml-2 text-gray-800">{formData.edu1Institution || formData.institution_name || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Year Graduated:</span>
                                    <span className="ml-2 text-gray-800">{formData.edu1Year || formData.year_graduated || "—"}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Skills */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Skills</h5>
                                <p className="text-sm text-gray-800">
                                  {Array.isArray(formData.skills) ? formData.skills.join(', ') : formData.skills || formData.skills_text || "—"}
                                </p>
                              </div>

                              {/* License */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">License Information</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">License Type:</span>
                                    <span className="ml-2 text-gray-800">{formData.licenseType || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Expiry Date:</span>
                                    <span className="ml-2 text-gray-800">{formData.licenseExpiry || "—"}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Work Experience */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Work Experience</h5>
                                {workExperiences.length > 0 ? (
                                  <div className="space-y-3">
                                    {workExperiences.map((exp, idx) => (
                                      <div key={idx} className="border border-gray-200 rounded p-3 text-sm">
                                        <div className="font-medium text-gray-800">{exp.company || "—"}</div>
                                        <div className="text-gray-600">{exp.role || "—"} • {exp.period || "—"}</div>
                                        <div className="text-gray-500 text-xs mt-1">Reason for leaving: {exp.reason || "—"}</div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500">No work experience provided.</p>
                                )}
                              </div>

                              {/* Character References */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Character References</h5>
                                {characterReferences.length > 0 ? (
                                  <div className="space-y-2">
                                    {characterReferences.map((ref, idx) => (
                                      <div key={idx} className="border border-gray-200 rounded p-3 text-sm">
                                        <div className="font-medium text-gray-800">{ref.name || "—"}</div>
                                        <div className="text-gray-600">{ref.contact || "—"}</div>
                                        <div className="text-gray-500 text-xs">{ref.remarks || "—"}</div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500">No character references provided.</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* DOCUMENTS TAB */}
                          {currentTab === 'documents' && (
                            <div className="space-y-6">
                              <p className="text-sm text-gray-600 mb-4">Default documents required for all employees. Additional documents may be requested by HR.</p>
                              
                              {/* Default Documents - SSS */}
                              <div className="border border-gray-200 rounded-lg p-4">
                                <h5 className="font-semibold text-gray-800 mb-3">SSS (Social Security System)</h5>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm text-gray-600 mb-1">SSS ID Number</label>
                                    <input type="text" placeholder="Enter SSS ID Number" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                  </div>
                                  <div>
                                    <label className="block text-sm text-gray-600 mb-1">SSS ID Photocopy</label>
                                    <input type="file" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                                  </div>
                                </div>
                              </div>

                              {/* Default Documents - TIN */}
                              <div className="border border-gray-200 rounded-lg p-4">
                                <h5 className="font-semibold text-gray-800 mb-3">TIN (Tax Identification Number)</h5>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm text-gray-600 mb-1">TIN Number</label>
                                    <input type="text" placeholder="Enter TIN Number" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                  </div>
                                  <div>
                                    <label className="block text-sm text-gray-600 mb-1">TIN ID Photocopy</label>
                                    <input type="file" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                                  </div>
                                </div>
                              </div>

                              {/* Default Documents - PAG-IBIG */}
                              <div className="border border-gray-200 rounded-lg p-4">
                                <h5 className="font-semibold text-gray-800 mb-3">PAG-IBIG (HDMF)</h5>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm text-gray-600 mb-1">PAG-IBIG ID Number</label>
                                    <input type="text" placeholder="Enter PAG-IBIG ID Number" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                  </div>
                                  <div>
                                    <label className="block text-sm text-gray-600 mb-1">PAG-IBIG ID Photocopy</label>
                                    <input type="file" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                                  </div>
                                </div>
                              </div>

                              {/* Default Documents - PHILHEALTH */}
                              <div className="border border-gray-200 rounded-lg p-4">
                                <h5 className="font-semibold text-gray-800 mb-3">PhilHealth</h5>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm text-gray-600 mb-1">PhilHealth ID Number</label>
                                    <input type="text" placeholder="Enter PhilHealth ID Number" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                  </div>
                                  <div>
                                    <label className="block text-sm text-gray-600 mb-1">PhilHealth ID Photocopy</label>
                                    <input type="file" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                                  </div>
                                </div>
                              </div>

                              {/* HR Requested Documents Section */}
                              <div className="border-t border-gray-300 pt-4 mt-6">
                                <h5 className="font-semibold text-gray-800 mb-3">HR Requested Documents</h5>
                                <p className="text-sm text-gray-500 italic">No additional documents have been requested by HR yet.</p>
                              </div>

                              <div className="flex justify-end mt-6">
                                <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
                                  Save Documents
                                </button>
                              </div>
                            </div>
                          )}

                          {/* ONBOARDING TAB */}
                          {currentTab === 'onboarding' && (
                            <div className="space-y-6">
                              {/* Trainings Section */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Trainings</h5>
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-4 py-2 text-left text-gray-600">Training Name</th>
                                        <th className="px-4 py-2 text-left text-gray-600">Date</th>
                                        <th className="px-4 py-2 text-left text-gray-600">Status</th>
                                        <th className="px-4 py-2 text-left text-gray-600">Certificate</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr className="border-t border-gray-200">
                                        <td className="px-4 py-3 text-gray-500 italic" colSpan="4">No trainings assigned yet.</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {/* Training History Section */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Training History</h5>
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-4 py-2 text-left text-gray-600">Training Name</th>
                                        <th className="px-4 py-2 text-left text-gray-600">Date</th>
                                        <th className="px-4 py-2 text-left text-gray-600">Taken At</th>
                                        <th className="px-4 py-2 text-left text-gray-600">Certificate</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr className="border-t border-gray-200">
                                        <td className="px-4 py-3 text-gray-500 italic" colSpan="4">No training history yet.</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                                <button className="mt-2 text-sm text-blue-600 hover:underline">+ Add Training History</button>
                              </div>

                              {/* Orientation Section */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Orientation</h5>
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-4 py-2 text-left text-gray-600">Orientation Date</th>
                                        <th className="px-4 py-2 text-left text-gray-600">Status</th>
                                        <th className="px-4 py-2 text-left text-gray-600">Notes</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr className="border-t border-gray-200">
                                        <td className="px-4 py-3 text-gray-500 italic" colSpan="3">No orientation scheduled yet.</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {/* Deployed Items Section */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Deployed Items</h5>
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-4 py-2 text-left text-gray-600">Item</th>
                                        <th className="px-4 py-2 text-left text-gray-600">Serial/ID</th>
                                        <th className="px-4 py-2 text-left text-gray-600">Date Issued</th>
                                        <th className="px-4 py-2 text-left text-gray-600">Condition</th>
                                        <th className="px-4 py-2 text-left text-gray-600">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr className="border-t border-gray-200">
                                        <td className="px-4 py-3 text-gray-500 italic" colSpan="5">No items deployed yet.</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* EVALUATION TAB */}
                          {currentTab === 'evaluation' && (
                            <div className="space-y-6">
                              <div className="flex items-center justify-between mb-4">
                                <h5 className="font-semibold text-gray-800">Evaluation Records</h5>
                                <button className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
                                  + Add Evaluation
                                </button>
                              </div>

                              <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-4 py-3 text-left text-gray-600">Evaluation Type</th>
                                      <th className="px-4 py-3 text-left text-gray-600">Period</th>
                                      <th className="px-4 py-3 text-left text-gray-600">Score/Rating</th>
                                      <th className="px-4 py-3 text-left text-gray-600">Conducted By</th>
                                      <th className="px-4 py-3 text-left text-gray-600">Date</th>
                                      <th className="px-4 py-3 text-left text-gray-600">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr className="border-t border-gray-200">
                                      <td className="px-4 py-4 text-gray-500 italic text-center" colSpan="6">
                                        No evaluations have been conducted yet.
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>

                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
                                <h6 className="font-medium text-gray-700 mb-2">Evaluation Summary</h6>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Total Evaluations:</span>
                                    <span className="ml-2 font-medium text-gray-800">0</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Average Score:</span>
                                    <span className="ml-2 font-medium text-gray-800">N/A</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Last Evaluation:</span>
                                    <span className="ml-2 font-medium text-gray-800">N/A</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* SEPARATION TAB */}
                          {currentTab === 'separation' && (
                            <div className="space-y-6">
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                                <div className="flex items-start gap-3">
                                  <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  <div>
                                    <h6 className="font-medium text-yellow-800">Separation Request</h6>
                                    <p className="text-sm text-yellow-700">Submitting a resignation request will notify HR for review and approval.</p>
                                  </div>
                                </div>
                              </div>

                              <div className="border border-gray-200 rounded-lg p-6">
                                <h5 className="font-semibold text-gray-800 mb-4">Submit Resignation Request</h5>
                                
                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Resignation Type *</label>
                                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                                      <option value="">Select Type</option>
                                      <option value="voluntary">Voluntary Resignation</option>
                                      <option value="retirement">Retirement</option>
                                      <option value="end_of_contract">End of Contract</option>
                                      <option value="other">Other</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Working Day *</label>
                                    <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Resignation *</label>
                                    <textarea 
                                      rows={4} 
                                      placeholder="Please provide your reason for resignation..."
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    ></textarea>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Upload Resignation Letter (Optional)</label>
                                    <input type="file" accept=".pdf,.doc,.docx" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                                    <p className="text-xs text-gray-500 mt-1">Accepted formats: PDF, DOC, DOCX</p>
                                  </div>

                                  <div className="flex items-center gap-2 mt-4">
                                    <input type="checkbox" id="confirmResignation" className="rounded border-gray-300" />
                                    <label htmlFor="confirmResignation" className="text-sm text-gray-700">
                                      I confirm that I want to submit this resignation request
                                    </label>
                                  </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                                  <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300">
                                    Cancel
                                  </button>
                                  <button className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700">
                                    Submit Resignation Request
                                  </button>
                                </div>
                              </div>

                              {/* Separation History */}
                              <div className="border-t border-gray-300 pt-4 mt-6">
                                <h5 className="font-semibold text-gray-800 mb-3">Separation Request History</h5>
                                <p className="text-sm text-gray-500 italic">No separation requests have been submitted.</p>
                              </div>
                            </div>
                          )}

                          {/* ========== PENDING STATUS TABS ========== */}

                          {/* ENDORSEMENT DETAILS TAB (for pending) */}
                          {currentTab === 'endorsement' && (
                            <div className="space-y-6">
                              {/* Job Details */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Job Details</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Position Applying For:</span>
                                    <span className="ml-2 text-gray-800">{job.title || selectedEmployee.position || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Current Employment Status:</span>
                                    <span className="ml-2 text-gray-800">{formData.employed || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Available Start Date:</span>
                                    <span className="ml-2 text-gray-800">{formData.startDate ? formatDate(formData.startDate) : "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Depot:</span>
                                    <span className="ml-2 text-gray-800">{job.depot || selectedEmployee.depot || "—"}</span>
                                  </div>
                                  <div className="col-span-2">
                                    <span className="text-gray-500">Resume:</span>
                                    <span className="ml-2 text-blue-600 underline cursor-pointer">{formData.resumeName || "Not uploaded"}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Personal Information */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Personal Information</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Full Name:</span>
                                    <span className="ml-2 text-gray-800">
                                      {formData.firstName || formData.fname || selectedEmployee.first || ""} {formData.middleName || formData.mname || selectedEmployee.middle || ""} {formData.lastName || formData.lname || selectedEmployee.last || ""}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Sex:</span>
                                    <span className="ml-2 text-gray-800">{formData.sex || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Address:</span>
                                    <span className="ml-2 text-gray-800">
                                      {[formData.street, formData.barangay, formData.city, formData.zip].filter(Boolean).join(', ') || "—"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Birthday:</span>
                                    <span className="ml-2 text-gray-800">{formData.birthday ? formatDate(formData.birthday) : "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Contact Number:</span>
                                    <span className="ml-2 text-gray-800">{formData.contact || selectedEmployee.contact || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Age:</span>
                                    <span className="ml-2 text-gray-800">{formData.age || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Email:</span>
                                    <span className="ml-2 text-gray-800">{formData.email || selectedEmployee.email || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Marital Status:</span>
                                    <span className="ml-2 text-gray-800">{formData.maritalStatus || formData.marital_status || "—"}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ASSESSMENT TAB (for pending) */}
                          {currentTab === 'assessment' && (
                            <div className="space-y-6">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="font-semibold text-gray-800">Assessment</h5>
                                <span className="text-sm px-2 py-1 rounded bg-yellow-100 text-yellow-800 border border-yellow-300">Pending</span>
                              </div>
                              
                              <div className="bg-gray-50 border rounded-md p-4">
                                <div className="text-sm text-gray-800 font-semibold mb-2">Interview Schedule</div>
                                <div className="text-sm text-gray-700 space-y-1">
                                  <div><span className="font-medium">Date:</span> <span className="text-gray-500 italic">To be scheduled</span></div>
                                  <div><span className="font-medium">Time:</span> <span className="text-gray-500 italic">To be scheduled</span></div>
                                  <div><span className="font-medium">Location:</span> <span className="text-gray-500 italic">To be scheduled</span></div>
                                  <div><span className="font-medium">Interviewer:</span> <span className="text-gray-500 italic">To be assigned</span></div>
                                </div>
                                <div className="mt-3 text-xs text-gray-500 italic">
                                  Important Reminder: Interview schedule will be set by HR once the endorsement is reviewed.
                                </div>
                              </div>

                              {/* In-Person Assessments */}
                              <div className="mt-4">
                                <div className="text-sm font-semibold text-gray-800 mb-2">In-Person Assessments</div>
                                <div className="bg-gray-50 border rounded-md p-3">
                                  <p className="text-sm text-gray-500 italic">No assessment files uploaded yet. Please wait for HR to upload assessment results.</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* AGREEMENTS TAB (for pending) */}
                          {currentTab === 'agreements' && (
                            <div className="space-y-6">
                              <div className="bg-gray-100 text-gray-800 px-3 py-2 text-sm font-semibold border rounded-t-md">Document Name</div>
                              <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-gray-600 border-b">
                                <div className="col-span-6">&nbsp;</div>
                                <div className="col-span-3">File</div>
                                <div className="col-span-3">&nbsp;</div>
                              </div>

                              <div className="border-b">
                                <div className="grid grid-cols-12 items-center gap-3 px-3 py-3">
                                  <div className="col-span-6 text-sm text-gray-800">Employee Appointment Letter</div>
                                  <div className="col-span-3 text-sm">
                                    <span className="text-gray-400 italic">No appointment letter uploaded yet</span>
                                  </div>
                                  <div className="col-span-3" />
                                </div>
                              </div>

                              <div className="text-xs text-gray-500 italic mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                                <strong>Note:</strong> Once the employee is hired, the appointment letter will be uploaded here by HR. The employee will receive their employee account credentials via email.
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                      );
                    })()}
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setEndorsementsPage(p => Math.max(1, p - 1))}
                      disabled={endorsementsPage === 1}
                      className={`px-4 py-2 text-sm rounded border ${
                        endorsementsPage === 1 
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Prev
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {endorsementsPage} of {totalFilteredPages}
                    </span>
                    <button
                      onClick={() => setEndorsementsPage(p => Math.min(totalFilteredPages, p + 1))}
                      disabled={endorsementsPage >= totalFilteredPages}
                      className={`px-4 py-2 text-sm rounded border ${
                        endorsementsPage >= totalFilteredPages
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </>
                );
              })()}
            </div>
          </section>
        </div>
      </div>

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
    </div>
  );
}

export default AgencyEndorsements;

