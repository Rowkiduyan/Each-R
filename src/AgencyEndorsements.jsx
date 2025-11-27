// src/AgencyEndorsements.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "./supabaseClient";
import LogoCropped from './layouts/photos/logo(cropped).png';

function AgencyEndorsements() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const profileDropdownRef = useRef(null);
  
  // Check if navigated from Separation page to submit resignation
  const [showSeparationPrompt, setShowSeparationPrompt] = useState(false);
  
  useEffect(() => {
    if (location.state?.openSeparationTab) {
      setShowSeparationPrompt(true);
      // Clear the state to prevent showing prompt on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeDetailTab, setEmployeeDetailTab] = useState('profiling');

  // Mock document requests from HR
  // Status: pending (awaiting upload), submitted (uploaded, waiting HR review), resubmit (HR rejected, needs re-upload), approved (HR approved)
  const [documentRequests] = useState([
    { id: 1, employeeId: 1, employeeName: 'Juan Dela Cruz', document: 'NBI Clearance', requestedDate: '2024-11-20', deadline: '2024-12-05', status: 'pending', priority: 'high', remarks: null },
    { id: 2, employeeId: 2, employeeName: 'Maria Santos', document: 'Medical Certificate', requestedDate: '2024-11-22', deadline: '2024-12-10', status: 'submitted', priority: 'medium', remarks: null, submittedDate: '2024-11-24' },
    { id: 3, employeeId: 1, employeeName: 'Juan Dela Cruz', document: 'Police Clearance', requestedDate: '2024-11-18', deadline: '2024-12-01', status: 'resubmit', priority: 'high', remarks: 'Document is blurry and unreadable. Please upload a clearer copy or scan.' },
    { id: 4, employeeId: 3, employeeName: 'Pedro Garcia', document: 'Barangay Clearance', requestedDate: '2024-11-15', deadline: '2024-11-30', status: 'resubmit', priority: 'high', remarks: 'Document has expired. Please submit a clearance issued within the last 6 months.' },
    { id: 5, employeeId: 4, employeeName: 'Ana Reyes', document: 'Birth Certificate (PSA)', requestedDate: '2024-11-10', deadline: '2024-11-25', status: 'approved', priority: 'low', remarks: null, submittedDate: '2024-11-12', approvedDate: '2024-11-15' },
    { id: 6, employeeId: 2, employeeName: 'Maria Santos', document: 'NBI Clearance', requestedDate: '2024-11-20', deadline: '2024-12-08', status: 'pending', priority: 'medium', remarks: null },
    { id: 7, employeeId: 5, employeeName: 'Carlos Mendoza', document: 'SSS E1 Form', requestedDate: '2024-11-23', deadline: '2024-12-15', status: 'submitted', priority: 'low', remarks: null, submittedDate: '2024-11-25' },
  ]);
  const [showDocumentRequests, setShowDocumentRequests] = useState(false);

  // Calculate items per page based on available screen height
  useEffect(() => {
    const calculateItemsPerPage = () => {
      // Approximate row height (including padding and borders)
      const rowHeight = 45;
      // Reserved heights:
      // - Header: ~70px
      // - Page title + subtitle: ~70px  
      // - Stats cards: ~110px (with margins)
      // - Table card header: ~55px
      // - Table header row: ~40px
      // - Pagination: ~55px
      // - Various padding/margins: ~50px
      const reservedHeight = 450;
      const availableHeight = window.innerHeight - reservedHeight;
      // Subtract 1 to ensure last row doesn't get cut off
      const calculatedItems = Math.max(3, Math.floor(availableHeight / rowHeight) - 1);
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

          // Normalize status: if hired or deployed or has endorsed_employee_id, treat as "deployed"
          let status = r.status || "pending";
          if (r.endorsed_employee_id || status === "hired" || status === "deployed") {
            status = "deployed";
          }

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

    // subscribe to employees changes - when employees change, update hires + endorsed (so status flips to deployed)
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

  // Get initials from name
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Generate consistent color based on name
  const getAvatarColor = (name) => {
    const colors = [
      'from-red-500 to-red-600',
      'from-blue-500 to-blue-600',
      'from-green-500 to-green-600',
      'from-purple-500 to-purple-600',
      'from-orange-500 to-orange-600',
      'from-pink-500 to-pink-600',
      'from-teal-500 to-teal-600',
      'from-indigo-500 to-indigo-600',
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  // Calculate stats
  const pendingDocRequests = documentRequests.filter(d => d.status === 'pending').length;
  const resubmitDocRequests = documentRequests.filter(d => d.status === 'resubmit').length;
  const submittedDocRequests = documentRequests.filter(d => d.status === 'submitted').length;
  const approvedDocRequests = documentRequests.filter(d => d.status === 'approved').length;
  const actionRequiredDocs = pendingDocRequests + resubmitDocRequests;
  const stats = {
    totalDeployed: endorsedEmployees.filter(e => e.status === 'deployed').length,
    pendingEndorsements: endorsedEmployees.filter(e => e.status === 'pending').length,
    totalEndorsements: endorsedEmployees.length,
    pendingDocuments: actionRequiredDocs,
    resubmitDocuments: resubmitDocRequests,
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
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
      <div className="bg-white shadow-sm sticky top-0 z-50">
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
              <Link to="/agency/requirements" className="hover:text-gray-900 transition-colors pb-1">Requirements</Link>
              <Link to="/agency/trainings" className="hover:text-gray-900 transition-colors pb-1">Trainings/Orientation</Link>
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
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-4 w-full flex flex-col flex-1 overflow-hidden">
          {/* Page Header */}
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Endorsements</h1>
            <p className="text-gray-500 mt-1">Track and manage all your endorsed employees at Roadwise</p>
          </div>

          {/* Stats Cards - Hidden when employee is selected */}
          {!selectedEmployee && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 flex-shrink-0">
            {/* Total Deployed */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Deployed</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalDeployed}</p>
                </div>
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-green-600 mt-2 font-medium">Deployed employees</p>
            </div>

            {/* Pending Endorsements */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Pending Endorsements</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{stats.pendingEndorsements}</p>
                </div>
                <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-yellow-600 mt-2 font-medium">Awaiting review</p>
            </div>

            {/* Total Endorsements */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Endorsements</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalEndorsements}</p>
                </div>
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2 font-medium">All time</p>
            </div>
          </div>
          )}

          {/* Endorsements Table Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col flex-1 overflow-hidden min-h-0">
            {/* Search and Filters */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by employee name, ID, position, or depot..."
                    value={endorsementsSearch}
                    onChange={(e) => {
                      setEndorsementsSearch(e.target.value);
                      setEndorsementsPage(1); // Reset to page 1 when searching
                    }}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setEndorsementsPage(1); }}
                  className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white min-w-[160px]"
                >
                  <option value="all">All Status</option>
                  <option value="deployed">Deployed</option>
                  <option value="pending">Pending</option>
                </select>

                {/* Document Requests Button */}
                <button 
                  onClick={() => setShowDocumentRequests(true)}
                  className={`px-4 py-2.5 border rounded-lg text-sm font-medium flex items-center gap-2 ${
                    stats.pendingDocuments > 0 
                      ? stats.resubmitDocuments > 0
                        ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                        : 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100' 
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Doc Requests
                  {stats.pendingDocuments > 0 && (
                    <span className={`px-1.5 py-0.5 text-xs rounded-full ${stats.resubmitDocuments > 0 ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'}`}>
                      {stats.pendingDocuments}
                    </span>
                  )}
                </button>

                {/* Export Button */}
                <button className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2 bg-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export
                </button>
              </div>
            </div>

            {/* Separation Prompt Banner */}
            {showSeparationPrompt && (
              <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Submit Resignation Request</p>
                    <p className="text-sm text-gray-600">Select a <strong>deployed employee</strong> from the list below to submit a resignation request.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSeparationPrompt(false)}
                  className="p-1.5 hover:bg-red-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            <div className="flex-1 flex flex-col overflow-hidden p-4 min-h-0">
              {endorsedLoading ? (
                <div className="p-6 text-gray-600">Loading endorsements…</div>
              ) : endorsedError ? (
                <div className="p-4 bg-red-50 text-red-700 rounded">{endorsedError}</div>
              ) : endorsedEmployees.length === 0 ? (
                <div className="p-6 text-gray-600">No endorsements yet.</div>
              ) : (() => {
                // Filter employees based on search and status filter
                const filteredEmployees = endorsedEmployees.filter((emp) => {
                  // Status filter
                  if (statusFilter !== 'all' && emp.status !== statusFilter) return false;
                  
                  // Search filter
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
                  <div className="flex flex-col lg:flex-row gap-4 flex-1 overflow-hidden min-h-0">
                    {/* Table on the left */}
                    <div className={`${selectedEmployee ? 'lg:w-[30%]' : 'w-full'} overflow-x-auto overflow-y-auto no-scrollbar`}>
                      {filteredEmployees.length === 0 ? (
                        <div className="p-6 text-gray-600">No endorsements match your search.</div>
                      ) : (
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                            {!selectedEmployee && (
                              <>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Position / Depot</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {paginatedEmployees.map((emp) => {
                              // Find deployed date from hiredEmployees if this endorsement was deployed
                              const deployedEmployee = emp.endorsed_employee_id 
                                ? hiredEmployees.find(h => h.id === emp.endorsed_employee_id)
                                : null;
                              const deployedDate = deployedEmployee?.hired_at ? formatDate(deployedEmployee.hired_at) : null;
                              const isSelected = selectedEmployee?.id === emp.id;
                              
                              return (
                                <tr 
                                  key={emp.id} 
                                  className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${isSelected ? 'bg-red-50/50' : ''}`} 
                                  onClick={() => {
                                    setSelectedEmployee(emp);
                                    // If coming from Separation page, auto-open the separation tab
                                    if (showSeparationPrompt && emp.status === 'deployed') {
                                      setEmployeeDetailTab('separation');
                                      setShowSeparationPrompt(false);
                                    }
                                  }}
                                >
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="relative">
                                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(emp.name)} flex items-center justify-center text-white text-sm font-medium shadow-sm ${emp.status === 'pending' ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}`}>
                                          {getInitials(emp.name)}
                                        </div>
                                        {emp.status === 'pending' && (
                                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white">
                                            <svg className="w-2.5 h-2.5 text-yellow-800" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                            </svg>
                                          </div>
                                        )}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <p className="text-sm font-medium text-gray-800">{emp.name}</p>
                                          {emp.status === 'pending' && (
                                            <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded font-medium">ENDORSED</span>
                                          )}
                                        </div>
                                        <p className="text-xs text-gray-500">#{emp.id}</p>
                                      </div>
                                    </div>
                                  </td>
                                  {!selectedEmployee && (
                                    <>
                                      <td className="px-6 py-4">
                                        <p className="text-sm text-gray-800">{emp.position}</p>
                                        <p className="text-xs text-gray-500">{emp.depot}</p>
                                      </td>
                                      <td className="px-6 py-4">
                                        <span className={`text-sm font-semibold ${emp.status === "deployed" ? "text-green-600" : "text-yellow-600"}`}>
                                          {emp.status.toUpperCase()}
                                        </span>
                                        {emp.status === "deployed" && (
                                          <p className="text-xs text-gray-400 mt-0.5">{deployedDate || "date unavailable"}</p>
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
                      const isDeployed = selectedEmployee.status === "deployed";

                      // Different tabs based on status
                      const deployedTabs = [
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

                      const detailTabs = isDeployed ? deployedTabs : pendingTabs;

                      // Reset tab if switching between deployed/pending and tab doesn't exist
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
                                {isDeployed ? (
                                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">DEPLOYED</span>
                                ) : (
                                  <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">ENDORSED</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">#{selectedEmployee.id}</p>
                              <p className="text-sm text-gray-600">{selectedEmployee.position} | {selectedEmployee.depot}</p>
                              {!isDeployed && <p className="text-xs text-blue-600 hover:underline cursor-pointer mt-1">Retract Endorsement</p>}
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

                          {/* DOCUMENTS TAB - View Only */}
                          {currentTab === 'documents' && (
                            <div className="space-y-6">
                              {/* Header with link to Requirements */}
                              <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-600">View employee's submitted documents and their status.</p>
                                <Link 
                                  to="/agency/requirements" 
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                  </svg>
                                  Manage Requirements
                                </Link>
                              </div>
                              
                              {/* Default Requirements Table */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Default Requirements (Government IDs)</h5>
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-gray-600 font-medium">Document</th>
                                        <th className="px-4 py-3 text-left text-gray-600 font-medium">ID Number</th>
                                        <th className="px-4 py-3 text-left text-gray-600 font-medium">File</th>
                                        <th className="px-4 py-3 text-left text-gray-600 font-medium">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {/* SSS */}
                                      <tr className="hover:bg-gray-50/50">
                                        <td className="px-4 py-3">
                                          <p className="font-medium text-gray-800">SSS</p>
                                          <p className="text-xs text-gray-500">Social Security System</p>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                          <span className="text-gray-400 italic">Not provided</span>
                                        </td>
                                        <td className="px-4 py-3">
                                          <span className="text-gray-400 italic">No file</span>
                                        </td>
                                        <td className="px-4 py-3">
                                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">Missing</span>
                                        </td>
                                      </tr>
                                      {/* TIN */}
                                      <tr className="hover:bg-gray-50/50">
                                        <td className="px-4 py-3">
                                          <p className="font-medium text-gray-800">TIN</p>
                                          <p className="text-xs text-gray-500">Tax Identification Number</p>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                          <span className="text-gray-400 italic">Not provided</span>
                                        </td>
                                        <td className="px-4 py-3">
                                          <span className="text-gray-400 italic">No file</span>
                                        </td>
                                        <td className="px-4 py-3">
                                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">Missing</span>
                                        </td>
                                      </tr>
                                      {/* PAG-IBIG */}
                                      <tr className="hover:bg-gray-50/50">
                                        <td className="px-4 py-3">
                                          <p className="font-medium text-gray-800">PAG-IBIG</p>
                                          <p className="text-xs text-gray-500">HDMF</p>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                          <span className="text-gray-400 italic">Not provided</span>
                                        </td>
                                        <td className="px-4 py-3">
                                          <span className="text-gray-400 italic">No file</span>
                                        </td>
                                        <td className="px-4 py-3">
                                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">Missing</span>
                                        </td>
                                      </tr>
                                      {/* PhilHealth */}
                                      <tr className="hover:bg-gray-50/50">
                                        <td className="px-4 py-3">
                                          <p className="font-medium text-gray-800">PhilHealth</p>
                                          <p className="text-xs text-gray-500">Philippine Health Insurance</p>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                          <span className="text-gray-400 italic">Not provided</span>
                                        </td>
                                        <td className="px-4 py-3">
                                          <span className="text-gray-400 italic">No file</span>
                                        </td>
                                        <td className="px-4 py-3">
                                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">Missing</span>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {/* HR Requested Documents Section */}
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="font-semibold text-gray-800 bg-gray-100 px-3 py-2 rounded flex-1">HR Requested Documents</h5>
                                </div>
                                
                                {documentRequests.filter(d => d.employeeId === selectedEmployee.id).length === 0 ? (
                                  <div className="border border-gray-200 rounded-lg p-6 text-center">
                                    <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="text-sm text-gray-500">No additional documents have been requested by HR yet.</p>
                                  </div>
                                ) : (
                                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          <th className="px-4 py-3 text-left text-gray-600 font-medium">Document</th>
                                          <th className="px-4 py-3 text-left text-gray-600 font-medium">Deadline</th>
                                          <th className="px-4 py-3 text-left text-gray-600 font-medium">Status</th>
                                          <th className="px-4 py-3 text-left text-gray-600 font-medium">Remarks</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                        {documentRequests
                                          .filter(d => d.employeeId === selectedEmployee.id)
                                          .sort((a, b) => {
                                            const statusOrder = { resubmit: 0, pending: 1, submitted: 2, approved: 3 };
                                            return statusOrder[a.status] - statusOrder[b.status];
                                          })
                                          .map((request) => (
                                          <tr key={request.id} className={`${
                                            request.status === 'resubmit' ? 'bg-red-50/50' : 
                                            request.status === 'pending' ? 'bg-orange-50/50' : 
                                            'hover:bg-gray-50/50'
                                          }`}>
                                            <td className="px-4 py-3">
                                              <p className="font-medium text-gray-800">{request.document}</p>
                                              {request.priority === 'high' && (
                                                <span className="text-xs text-red-600 font-medium">High Priority</span>
                                              )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{formatDate(request.deadline)}</td>
                                            <td className="px-4 py-3">
                                              {request.status === 'resubmit' && (
                                                <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">Re-submit</span>
                                              )}
                                              {request.status === 'pending' && (
                                                <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded">Pending</span>
                                              )}
                                              {request.status === 'submitted' && (
                                                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">Under Review</span>
                                              )}
                                              {request.status === 'approved' && (
                                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">Approved</span>
                                              )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 max-w-xs">
                                              {request.remarks ? (
                                                <p className="text-xs text-red-600 truncate" title={request.remarks}>{request.remarks}</p>
                                              ) : (
                                                <span className="text-gray-400 italic text-xs">—</span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>

                              {/* Info Banner */}
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <div>
                                    <p className="text-sm text-blue-800">
                                      <strong>Need to upload or update documents?</strong> Go to the <Link to="/agency/requirements" className="underline font-semibold hover:text-blue-900">Requirements</Link> module to manage all employee documents in one place.
                                    </p>
                                  </div>
                                </div>
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
                              <h5 className="font-semibold text-gray-800 mb-4">Evaluation Records</h5>

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

                          {/* SEPARATION TAB - View Only */}
                          {currentTab === 'separation' && (
                            <div className="space-y-6">
                              {/* Header with link to Separation module */}
                              <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-600">View employee's separation request status and history.</p>
                                <Link 
                                  to="/agency/separation" 
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                  Submit Request
                                </Link>
                              </div>

                              {/* Current Separation Status */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Current Separation Status</h5>
                                
                                {/* No Active Request - Placeholder */}
                                <div className="border border-gray-200 rounded-lg p-6 text-center">
                                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                  </div>
                                  <p className="text-sm font-medium text-gray-700">No Active Separation Request</p>
                                  <p className="text-xs text-gray-500 mt-1">This employee has no pending or active resignation requests.</p>
                                </div>
                              </div>

                              {/* Separation Request History */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Separation History</h5>
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-gray-600 font-medium">Type</th>
                                        <th className="px-4 py-3 text-left text-gray-600 font-medium">Last Working Day</th>
                                        <th className="px-4 py-3 text-left text-gray-600 font-medium">Submitted</th>
                                        <th className="px-4 py-3 text-left text-gray-600 font-medium">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      <tr>
                                        <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                                          <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                          </svg>
                                          <p className="text-sm">No separation requests found</p>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {/* Info Banner */}
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <div>
                                    <p className="text-sm text-blue-800">
                                      <strong>Need to submit a resignation request?</strong> Go to the <Link to="/agency/separation" className="underline font-semibold hover:text-blue-900">Separation</Link> module to submit and manage all employee resignation requests.
                                    </p>
                                  </div>
                                </div>
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
                                <strong>Note:</strong> Once the employee is deployed, the appointment letter will be uploaded here by HR. The employee will receive their employee account credentials via email.
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                      );
                    })()}
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200 flex-shrink-0">
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
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1 hover:text-gray-700 cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Philippines</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </div>
            
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-gray-700 hover:underline">Terms & conditions</a>
              <a href="#" className="hover:text-gray-700 hover:underline">Security</a>
              <a href="#" className="hover:text-gray-700 hover:underline">Privacy</a>
              <span className="text-gray-400">Copyright © 2025, Roadwise</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full mx-4 overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">Confirm Logout</h3>
            </div>
            <div className="p-5 text-sm text-gray-600">
              Are you sure you want to logout from your account?
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-medium"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Requests Modal */}
      {showDocumentRequests && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          onClick={() => setShowDocumentRequests(false)}
        >
          <div
            className="bg-white rounded-xl max-w-3xl w-full mx-4 overflow-hidden shadow-xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50 to-white">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">HR Document Requests</h3>
                <p className="text-sm text-gray-500 mt-0.5">Documents requested by HR for your endorsed employees</p>
              </div>
              <button 
                onClick={() => setShowDocumentRequests(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Stats Summary */}
            <div className="p-4 bg-gray-50 border-b border-gray-100 grid grid-cols-4 gap-3">
              <div className="bg-white rounded-lg p-3 border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-800">{resubmitDocRequests}</p>
                    <p className="text-xs text-gray-500">Re-submit</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-800">{pendingDocRequests}</p>
                    <p className="text-xs text-gray-500">Pending</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-800">{submittedDocRequests}</p>
                    <p className="text-xs text-gray-500">Submitted</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-800">{approvedDocRequests}</p>
                    <p className="text-xs text-gray-500">Approved</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Requests List */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Action Required Section */}
              {(resubmitDocRequests > 0 || pendingDocRequests > 0) && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    Action Required ({actionRequiredDocs})
                  </p>
                  <div className="space-y-3">
                    {documentRequests
                      .filter(d => d.status === 'resubmit' || d.status === 'pending')
                      .sort((a, b) => {
                        // Sort: resubmit first, then by priority
                        if (a.status === 'resubmit' && b.status !== 'resubmit') return -1;
                        if (b.status === 'resubmit' && a.status !== 'resubmit') return 1;
                        const priorityOrder = { high: 0, medium: 1, low: 2 };
                        return priorityOrder[a.priority] - priorityOrder[b.priority];
                      })
                      .map((request) => (
                      <div 
                        key={request.id} 
                        className={`rounded-lg border p-4 ${
                          request.status === 'resubmit' 
                            ? 'bg-red-50 border-red-200' 
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-sm font-semibold ${request.status === 'resubmit' ? 'text-red-800' : 'text-gray-800'}`}>
                                {request.document}
                              </span>
                              {request.status === 'resubmit' && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">RE-SUBMIT</span>
                              )}
                              {request.status === 'pending' && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">PENDING</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              For: <span className="font-medium">{request.employeeName}</span>
                            </p>
                            
                            {/* HR Remarks for Re-submit */}
                            {request.status === 'resubmit' && request.remarks && (
                              <div className="mt-2 p-2.5 bg-red-100/50 border border-red-200 rounded-lg">
                                <p className="text-xs font-medium text-red-700 mb-1 flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                  HR Remarks:
                                </p>
                                <p className="text-xs text-red-700">{request.remarks}</p>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Requested: {formatDate(request.requestedDate)}
                              </span>
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Deadline: {formatDate(request.deadline)}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              // Find the employee and navigate to their documents tab
                              const employee = endorsedEmployees.find(e => e.id === request.employeeId);
                              if (employee) {
                                setSelectedEmployee(employee);
                                setEmployeeDetailTab('documents');
                              }
                              setShowDocumentRequests(false);
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              request.status === 'resubmit'
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Go to Documents
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Action Required Message */}
              {actionRequiredDocs === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 font-medium">All caught up!</p>
                  <p className="text-sm text-gray-500 mt-1">No pending document requests at the moment</p>
                </div>
              )}

              {/* Awaiting HR Review Section */}
              {submittedDocRequests > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Awaiting HR Review ({submittedDocRequests})
                  </p>
                  <div className="space-y-2">
                    {documentRequests.filter(d => d.status === 'submitted').map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{request.document}</p>
                            <p className="text-xs text-gray-500">{request.employeeName} · Submitted {formatDate(request.submittedDate)}</p>
                          </div>
                        </div>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Under Review</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Approved Documents Section */}
              {approvedDocRequests > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Approved ({approvedDocRequests})
                  </p>
                  <div className="space-y-2">
                    {documentRequests.filter(d => d.status === 'approved').map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-3 bg-green-50/50 rounded-lg border border-green-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{request.document}</p>
                            <p className="text-xs text-gray-500">{request.employeeName} · Approved {formatDate(request.approvedDate)}</p>
                          </div>
                        </div>
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Approved</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                <svg className="w-4 h-4 inline mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Click "Go to Documents" to upload the requested document
              </p>
              <button
                onClick={() => setShowDocumentRequests(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AgencyEndorsements;

