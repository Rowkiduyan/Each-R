// src/Employees.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

function Employees() {
  const navigate = useNavigate();

  // master depot list
  const depots = [
    "Pasig","Cagayan","Butuan","Davao","Cebu","Laguna","Iloilo",
    "Bacolod","Zamboanga","Manila","Quezon City","Taguig",
    "Baguio","General Santos","Palawan","Olongapo","Tacloban",
    "Roxas","Legazpi","Cauayan","Cavite","Batangas","Ormoc","Koronadal",
    "Calbayog","Catbalogan","Tuguegarao","Baler","Iligan","Koronadal City"
  ];

  // controls
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [positionFilter, setPositionFilter] = useState("All");
  const [depotFilter, setDepotFilter] = useState("All");
  const [employmentStatusFilter, setEmploymentStatusFilter] = useState("All");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterMenuRef = useRef(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // data
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Selected employee for detail view
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState("profiling");

  // Detail tab states
  const [evaluationDocs, setEvaluationDocs] = useState([
    { id: 1, name: "Evaluation", file: { name: "evaluation.pdf" }, url: "#", date: "2024-01-15", remarks: "Select", employeeType: "Select", locked: false }
  ]);
  const [requiredDocs, setRequiredDocs] = useState([
    { id: "psa", name: "PSA Birth Cert", file: { name: "PSABirthcert.pdf" }, previewUrl: "#", uploadedAt: "2024-01-15", status: "pending", validatedAt: null },
    { id: "dlicense", name: "Photocopy of Drivers License (Front and Back)", file: null, previewUrl: null, uploadedAt: null, status: "pending", validatedAt: null },
    { id: "sss", name: "Photocopy of SSS ID", file: null, previewUrl: null, uploadedAt: null, status: "pending", validatedAt: null },
    { id: "nbi", name: "NBI Clearance", file: { name: "NBIClearance.pdf" }, previewUrl: "#", uploadedAt: "2024-01-20", status: "pending", validatedAt: null },
    { id: "police", name: "Police Clearance", file: null, previewUrl: null, uploadedAt: null, status: "pending", validatedAt: null },
    { id: "drivetest", name: "Drive Test", file: { name: "DriveTest.pdf" }, previewUrl: "#", uploadedAt: "2024-01-25", status: "pending", validatedAt: null },
  ]);
  const [requestedDocs, setRequestedDocs] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [terminationData, setTerminationData] = useState(null);
  const [onboardingItems, setOnboardingItems] = useState([
    { id: 1, item: "Uniform", description: "Company Shirt", date: "9/20/25", file: "file.pdf" },
    { id: 2, item: "Laptop", description: "Lenovo 8GB RAM", date: "9/21/25", file: "file.pdf" },
  ]);

  // Termination modal states
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [showConfirmTerminate, setShowConfirmTerminate] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [terminateFiles, setTerminateFiles] = useState([]);
  const [terminateDate, setTerminateDate] = useState("");
  const [terminateRemarks, setTerminateRemarks] = useState("");

  // External certificates state
  const [externalCertificates, setExternalCertificates] = useState([]);
  const [loadingCertificates, setLoadingCertificates] = useState(false);

  // Helper: safely parse payload to object
  const safePayload = (p) => {
    if (!p) return {};
    if (typeof p === "object") return p;
    try {
      return JSON.parse(p);
    } catch {
      return {};
    }
  };

  // extract candidate email(s) from a payload object
  const extractEmailsFromPayload = (payloadObj) => {
    if (!payloadObj) return [];
    const emails = new Set();
    const pushIf = (v) => { if (v && typeof v === "string" && v.trim()) emails.add(v.trim()); };
    pushIf(payloadObj.email);
    if (payloadObj.form && typeof payloadObj.form === "object") pushIf(payloadObj.form.email || payloadObj.form.contact);
    if (payloadObj.applicant && typeof payloadObj.applicant === "object") pushIf(payloadObj.applicant.email || payloadObj.applicant.contactNumber || payloadObj.applicant.contact);
    if (payloadObj.meta && typeof payloadObj.meta === "object") pushIf(payloadObj.meta.email);
    return Array.from(emails);
  };

  // extract position/depot from payload
  const extractPositionDepotFromPayload = (payloadObj, job_posts) => {
    if (!payloadObj && !job_posts) return { position: null, depot: null };

    if (job_posts && typeof job_posts === "object") {
      const p = job_posts.title || job_posts.position || null;
      const d = job_posts.depot || null;
      if (p || d) return { position: p || null, depot: d || null };
    }

    if (payloadObj.job && typeof payloadObj.job === "object") {
      const p = payloadObj.job.title || payloadObj.job.position || null;
      const d = payloadObj.job.depot || null;
      if (p || d) return { position: p || null, depot: d || null };
    }

    if (payloadObj.form && typeof payloadObj.form === "object") {
      const p = payloadObj.form.position || payloadObj.form.appliedPosition || payloadObj.form.jobTitle || null;
      const d = payloadObj.form.depot || payloadObj.form.city || null;
      if (p || d) return { position: p || null, depot: d || null };
    }

    if (payloadObj.applicant && typeof payloadObj.applicant === "object") {
      const p = payloadObj.applicant.position || payloadObj.applicant.job || null;
      const d = payloadObj.applicant.depot || payloadObj.applicant.city || null;
      if (p || d) return { position: p || null, depot: d || null };
    }

    const p = payloadObj.position || payloadObj.jobTitle || null;
    const d = payloadObj.depot || payloadObj.city || null;
    return { position: p || null, depot: d || null };
  };

  // Calculate items per page based on screen height
  useEffect(() => {
    const calculateItemsPerPage = () => {
      const rowHeight = 60;
      const reservedHeight = 500;
      const availableHeight = window.innerHeight - reservedHeight;
      const calculatedItems = Math.max(5, Math.floor(availableHeight / rowHeight));
      setItemsPerPage(calculatedItems);
    };

    calculateItemsPerPage();
    window.addEventListener('resize', calculateItemsPerPage);
    return () => window.removeEventListener('resize', calculateItemsPerPage);
  }, []);

  // Close filter menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setShowFilterMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load employees
  useEffect(() => {
    let channel;
    let cancelled = false;

    const normalize = (row) => {
      const sourceLower = row.source ? String(row.source).toLowerCase() : "";

      // Base agency flag from employees table only on explicit agency markers,
      // not on generic "recruitment" source. This prevents direct hires from
      // being incorrectly tagged as agency.
      const baseAgency =
        (sourceLower === "agency") ||
        (row.role && String(row.role).toLowerCase() === "agency") ||
        !!row.agency_profile_id ||
        !!row.endorsed_by_agency_id ||
        row.is_agency === true;

      return {
        id: row.id, // uuid
        name:
          [row.fname, row.mname, row.lname]
            .filter(Boolean)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim() || row.email || "Unnamed",
        fname: row.fname || "",
        lname: row.lname || "",
        mname: row.mname || "",
        position: row.position || null, // null means "try to fill"
        depot: row.depot || null,
        email: row.email || "",
        contact: row.contact_number || "",
        role: row.role || "Employee",
        hired_at: row.hired_at,
        employmentStatus: row.status === "Probationary" ? "Under Probation" : row.status === "Regular" ? "Regular" : "Regular", // Map status from DB to employment status
        agency: baseAgency,
        source: row.source || null,
        endorsed_by_agency_id: row.endorsed_by_agency_id || row.agency_profile_id || null,
        endorsed_at: row.endorsed_at || null,
      };
    };

    const load = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const { data: empRows, error: empErr } = await supabase
          .from("employees")
          .select("id, email, fname, lname, mname, contact_number, position, depot, role, hired_at, source, endorsed_by_agency_id, endorsed_at, agency_profile_id, status, is_agency")
          .order("hired_at", { ascending: false });

        if (empErr) throw empErr;

        const normalized = (empRows || []).map(normalize);

        const emailsToFill = Array.from(new Set(
          normalized.filter(e => (!e.position || !e.depot) && e.email).map(e => e.email)
        ));

        if (emailsToFill.length === 0) {
          if (!cancelled) setEmployees(normalized);
          return;
        }

        const inList = `(${emailsToFill.map(em => `"${em.replace(/"/g, '\\"')}"`).join(",")})`;
        const appsByEmail = {};

        const processApps = (apps) => {
          for (const a of apps || []) {
            const payloadObj = safePayload(a.payload);
            const _emails = extractEmailsFromPayload(payloadObj);
            for (const em of _emails) {
              if (!emailsToFill.includes(em)) continue;
              if (!appsByEmail[em]) appsByEmail[em] = [];
              appsByEmail[em].push({ row: a, payloadObj });
            }
          }
        };

        const { data: apps1 } = await supabase
          .from("applications")
          .select("id, payload, job_posts(id,title,depot), status, created_at")
          .filter("payload->>email", "in", inList)
          .order("created_at", { ascending: false })
          .limit(500);
        processApps(apps1);

        const { data: apps2 } = await supabase
          .from("applications")
          .select("id, payload, job_posts(id,title,depot), status, created_at")
          .filter("payload->form->>email", "in", inList)
          .order("created_at", { ascending: false })
          .limit(500);
        processApps(apps2);

        const { data: apps3 } = await supabase
          .from("applications")
          .select("id, payload, job_posts(id,title,depot), status, created_at")
          .filter("payload->applicant->>email", "in", inList)
          .order("created_at", { ascending: false })
          .limit(500);
        processApps(apps3);

        const bestByEmail = {};
        for (const em of Object.keys(appsByEmail)) {
          const list = appsByEmail[em];
          if (!list || list.length === 0) continue;
          const hired = list.find(it => (it.row?.status || "").toLowerCase() === "hired");
          if (hired) {
            bestByEmail[em] = hired;
            continue;
          }
          list.sort((a, b) => new Date(b.row.created_at || 0) - new Date(a.row.created_at || 0));
          bestByEmail[em] = list[0];
        }

        const merged = normalized.map((emp) => {
          let updatedEmp = { ...emp };
          
          if ((!emp.position || !emp.depot) && emp.email) {
            const match = bestByEmail[emp.email];
            if (match) {
              const job_posts = match.row?.job_posts || null;
              const { position: derivedPos, depot: derivedDepot } = extractPositionDepotFromPayload(match.payloadObj, job_posts);
              updatedEmp = {
                ...updatedEmp,
                position: emp.position || derivedPos || null,
                depot: emp.depot || derivedDepot || null,
              };
            }
          }
          
          if (!updatedEmp.agency && updatedEmp.email) {
            const match = bestByEmail[updatedEmp.email];
            if (match && match.payloadObj) {
              const meta = match.payloadObj.meta || {};
              const source = meta.source || "";
              if (source && String(source).toLowerCase() === "agency") {
                updatedEmp.agency = true;
              }
              if (match.row && match.row.endorsed === true) {
                updatedEmp.agency = true;
              }
            }
          }
          
          return updatedEmp;
        });

        if (!cancelled) setEmployees(merged);
      } catch (err) {
        console.error("❌ employees load error:", err);
        setLoadError(err.message || "Failed to load employees");
        setEmployees([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    channel = supabase
      .channel("employees-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "employees" }, load)
      .subscribe();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // distinct positions from live data
  const positions = useMemo(() => {
    const s = new Set(employees.map((e) => e.position).filter(Boolean));
    return ["All", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [employees]);

  const employmentStatuses = ["All", "Regular", "Under Probation", "Part Time"];

  // Filter and sort employees
  const filtered = useMemo(() => {
    return employees
      .filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
      .filter((e) => positionFilter === "All" || e.position === positionFilter)
      .filter((e) => depotFilter === "All" || e.depot === depotFilter)
      .filter((e) => employmentStatusFilter === "All" || e.employmentStatus === employmentStatusFilter)
      .sort((a, b) => sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
  }, [employees, search, positionFilter, depotFilter, employmentStatusFilter, sortOrder]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginatedEmployees = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, positionFilter, depotFilter, employmentStatusFilter]);

  // Stats
  const stats = {
    total: employees.length,
    regular: employees.filter(e => e.employmentStatus === "Regular").length,
    probation: employees.filter(e => e.employmentStatus === "Under Probation").length,
    agency: employees.filter(e => e.agency).length,
  };

  // Helpers
  const formatDate = (d) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }); }
    catch { return String(d); }
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

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

  // Fetch external certificates for selected employee
  const fetchExternalCertificates = async (employee) => {
    if (!employee || !employee.email) {
      setExternalCertificates([]);
      return;
    }
    
    setLoadingCertificates(true);
    try {
      // Use RPC function to get certificates by email
      const { data, error } = await supabase
        .rpc('get_user_certificates_by_email', { employee_email: employee.email });

      if (error) {
        console.error('Error fetching certificates:', error);
        setExternalCertificates([]);
      } else {
        setExternalCertificates(data || []);
      }
    } catch (error) {
      console.error('Error fetching external certificates:', error);
      setExternalCertificates([]);
    } finally {
      setLoadingCertificates(false);
    }
  };

  // Fetch certificates when employee is selected or certifications tab is active
  useEffect(() => {
    if (selectedEmployee && activeTab === 'certifications') {
      fetchExternalCertificates(selectedEmployee);
    }
  }, [selectedEmployee, activeTab]);

  // Tab definitions for detail view
  const detailTabs = [
    { key: 'profiling', label: 'Profiling' },
    { key: 'documents', label: 'Documents' },
    { key: 'onboarding', label: 'Onboarding' },
    { key: 'evaluation', label: 'Evaluation' },
    { key: 'certifications', label: 'Certifications' },
    { key: 'separation', label: 'Separation' },
  ];

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
        * {
          scrollbar-width: thin;
          scrollbar-color: #d1d5db transparent;
        }
      `}</style>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-4 w-full flex flex-col flex-1 overflow-hidden">
          {/* Page Header */}
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Employees</h1>
            <p className="text-gray-500 mt-1">Manage and view all employee records</p>
          </div>

          {/* Stats Cards - Hidden when employee is selected */}
          {!selectedEmployee && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 flex-shrink-0">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Total Employees</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{stats.total}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-2 font-medium">All employees</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Regular</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{stats.regular}</p>
                  </div>
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-green-600 mt-2 font-medium">Regular employees</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Under Probation</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{stats.probation}</p>
                  </div>
                  <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-yellow-600 mt-2 font-medium">Probationary period</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Agency</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{stats.agency}</p>
                  </div>
                  <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-purple-600 mt-2 font-medium">From agencies</p>
              </div>
            </div>
          )}

          {/* Employee Table Card */}
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
                    placeholder="Search by employee name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                  />
                </div>

                {/* Position Filter */}
                <select
                  value={positionFilter}
                  onChange={(e) => setPositionFilter(e.target.value)}
                  className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white min-w-[160px]"
                >
                  <option value="All">All Positions</option>
                  {positions.filter(p => p !== "All").map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>

                {/* Depot Filter */}
                <select
                  value={depotFilter}
                  onChange={(e) => setDepotFilter(e.target.value)}
                  className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white min-w-[140px]"
                >
                  <option value="All">All Depots</option>
                  {depots.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                {/* More Filters Button */}
                <div className="relative" ref={filterMenuRef}>
                  <button
                    onClick={() => setShowFilterMenu(!showFilterMenu)}
                    className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2 bg-white"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    Filters
                  </button>
                  {showFilterMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-4">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Sort by Name</label>
                          <button
                            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                            className="w-full px-3 py-2 bg-gray-100 rounded-lg text-left hover:bg-gray-200 text-sm transition-colors"
                          >
                            {sortOrder === "asc" ? "A → Z" : "Z → A"}
                          </button>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Employment Status</label>
                          <select
                            value={employmentStatusFilter}
                            onChange={(e) => setEmploymentStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                          >
                            {employmentStatuses.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Export Button */}
                <button className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2 bg-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden p-4 min-h-0">
              {loading ? (
                <div className="p-6 text-gray-600">Loading employees…</div>
              ) : loadError ? (
                <div className="p-4 bg-red-50 text-red-700 rounded">{loadError}</div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-gray-600">No employees found.</div>
              ) : (
                <>
                  <div className="flex flex-col lg:flex-row gap-4 flex-1 overflow-hidden min-h-0">
                    {/* Table on the left */}
                    <div className={`${selectedEmployee ? 'lg:w-[35%]' : 'w-full'} overflow-x-auto overflow-y-auto no-scrollbar`}>
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
                            const isSelected = selectedEmployee?.id === emp.id;
                            return (
                              <tr 
                                key={emp.id} 
                                className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${isSelected ? 'bg-red-50/50' : ''}`}
                                onClick={() => {
                                  setSelectedEmployee(emp);
                                  // Only reset tab to Profiling when opening details for the first time
                                  setActiveTab((prev) => (selectedEmployee ? prev : 'profiling'));
                                }}
                              >
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(emp.name)} flex items-center justify-center text-white text-sm font-medium shadow-sm`}>
                                      {getInitials(emp.name)}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-gray-800">{emp.name}</p>
                                        {emp.agency && (
                                          <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">AGENCY</span>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-500">{emp.email || `#${emp.id.slice(0, 8)}`}</p>
                                    </div>
                                  </div>
                                </td>
                                {!selectedEmployee && (
                                  <>
                                    <td className="px-6 py-4">
                                      <p className="text-sm text-gray-800">{emp.position || "—"}</p>
                                      <p className="text-xs text-gray-500">{emp.depot || "—"}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                      <span className={`text-sm font-semibold ${
                                        emp.employmentStatus === "Regular" ? "text-green-600" : 
                                        emp.employmentStatus === "Under Probation" ? "text-yellow-600" : 
                                        "text-blue-600"
                                      }`}>
                                        {(emp.employmentStatus || "Regular").toUpperCase()}
                                      </span>
                                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(emp.hired_at) || "—"}</p>
                                    </td>
                                  </>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Detail panel on the right */}
                    {selectedEmployee && (
                      <div className="lg:w-[65%] overflow-y-auto flex flex-col">
                        {/* Employee Header */}
                        <div className="bg-white border border-gray-300 rounded-t-lg p-4 relative">
                          <button 
                            onClick={() => setSelectedEmployee(null)} 
                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          
                          <div className="flex items-center gap-3 pr-10">
                            <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${getAvatarColor(selectedEmployee.name)} flex items-center justify-center text-white text-lg font-semibold shadow-md`}>
                              {getInitials(selectedEmployee.name)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-gray-800 text-lg">{selectedEmployee.name}</h4>
                                {selectedEmployee.agency && (
                                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">AGENCY</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">#{selectedEmployee.id.slice(0, 8)}</p>
                              <p className="text-sm text-gray-600">{selectedEmployee.position || "—"} | {selectedEmployee.depot || "—"}</p>
                            </div>
                          </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-gray-300 bg-white overflow-x-auto">
                          {detailTabs.map((tab) => (
                            <button
                              key={tab.key}
                              onClick={() => setActiveTab(tab.key)}
                              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                activeTab === tab.key
                                  ? 'border-red-500 text-red-600 bg-red-50'
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
                          {activeTab === 'profiling' && (
                            <div className="space-y-6">
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Job Details</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Position:</span>
                                    <span className="ml-2 text-gray-800">{selectedEmployee.position || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Depot:</span>
                                    <span className="ml-2 text-gray-800">{selectedEmployee.depot || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Hired Date:</span>
                                    <span className="ml-2 text-gray-800">{formatDate(selectedEmployee.hired_at)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Employment Status:</span>
                                    <span className="ml-2 text-gray-800">{selectedEmployee.employmentStatus || "Regular"}</span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Personal Information</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Full Name:</span>
                                    <span className="ml-2 text-gray-800">{selectedEmployee.name}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Email:</span>
                                    <span className="ml-2 text-gray-800">{selectedEmployee.email || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Contact Number:</span>
                                    <span className="ml-2 text-gray-800">{selectedEmployee.contact || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Source:</span>
                                    <span className="ml-2 text-gray-800">{selectedEmployee.agency ? "Agency" : "Direct Hire"}</span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Files</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Resume:</span>
                                    <button className="ml-2 text-blue-600 hover:underline">View File</button>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Application Form:</span>
                                    <button className="ml-2 text-blue-600 hover:underline">View File</button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* DOCUMENTS TAB */}
                          {activeTab === 'documents' && (
                            <div className="space-y-6">
                              <div className="mb-4">
                                <h5 className="font-semibold text-gray-800">Required Documents</h5>
                              </div>

                              <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-4 py-3 text-left text-gray-600 font-medium">Document</th>
                                      <th className="px-4 py-3 text-left text-gray-600 font-medium">File</th>
                                      <th className="px-4 py-3 text-left text-gray-600 font-medium">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {(selectedEmployee.agency ? [...requiredDocs.filter(doc => doc.file), ...requestedDocs] : requiredDocs).map((doc) => {
                                      const displayStatus = doc.status === "validated" ? "Validated" : 
                                        doc.status === "resubmit" ? "Re-submit" : 
                                        doc.status === "requested" ? "Requested" :
                                        doc.file ? "Submitted" : "Missing";
                                      const badgeClass =
                                        doc.status === "validated" ? "bg-green-100 text-green-700" :
                                        doc.status === "resubmit" ? "bg-red-100 text-red-700" :
                                        doc.status === "requested" ? "bg-yellow-100 text-yellow-700" :
                                        doc.file ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600";
                                      
                                      return (
                                        <tr key={doc.id} className="hover:bg-gray-50/50">
                                          <td className="px-4 py-3 text-gray-800">{doc.name}</td>
                                          <td className="px-4 py-3">
                                            {doc.file ? (
                                              <a href={doc.previewUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                {doc.file.name}
                                              </a>
                                            ) : (
                                              <span className="text-gray-400 italic">No file</span>
                                            )}
                                          </td>
                                          <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${badgeClass}`}>{displayStatus}</span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* ONBOARDING TAB */}
                          {activeTab === 'onboarding' && (
                            <div className="space-y-6">
                              <div className="flex items-center justify-between mb-4">
                                <h5 className="font-semibold text-gray-800">Onboarding Items</h5>
                                <button
                                  onClick={() => setOnboardingItems((prev) => [
                                    ...prev,
                                    { id: Date.now(), item: `New Item ${prev.length + 1}`, description: "Description", date: new Date().toISOString().substring(0, 10), file: "file.pdf" }
                                  ])}
                                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                >
                                  + Add Item
                                </button>
                              </div>

                              <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-4 py-3 text-left text-gray-600 font-medium">Item</th>
                                      <th className="px-4 py-3 text-left text-gray-600 font-medium">Description</th>
                                      <th className="px-4 py-3 text-left text-gray-600 font-medium">Date Issued</th>
                                      <th className="px-4 py-3 text-left text-gray-600 font-medium">File</th>
                                      <th className="px-4 py-3 text-left text-gray-600 font-medium w-16"></th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {onboardingItems.map((ob) => (
                                      <tr key={ob.id} className="hover:bg-gray-50/50">
                                        <td className="px-4 py-3">
                                          <input
                                            type="text"
                                            value={ob.item}
                                            onChange={(e) => setOnboardingItems((prev) => prev.map((item) => item.id === ob.id ? { ...item, item: e.target.value } : item))}
                                            className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                                          />
                                        </td>
                                        <td className="px-4 py-3">
                                          <input
                                            type="text"
                                            value={ob.description}
                                            onChange={(e) => setOnboardingItems((prev) => prev.map((item) => item.id === ob.id ? { ...item, description: e.target.value } : item))}
                                            className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                                          />
                                        </td>
                                        <td className="px-4 py-3">
                                          <input
                                            type="date"
                                            value={ob.date ? new Date(ob.date).toISOString().substring(0, 10) : ""}
                                            onChange={(e) => setOnboardingItems((prev) => prev.map((item) => item.id === ob.id ? { ...item, date: e.target.value } : item))}
                                            className="px-2 py-1 border border-gray-200 rounded text-sm"
                                          />
                                        </td>
                                        <td className="px-4 py-3">
                                          <a href="#" className="text-blue-600 hover:underline text-sm">{ob.file}</a>
                                        </td>
                                        <td className="px-4 py-3">
                                          <button
                                            onClick={() => {
                                              if (window.confirm("Delete this item?")) {
                                                setOnboardingItems((prev) => prev.filter((item) => item.id !== ob.id));
                                              }
                                            }}
                                            className="w-7 h-7 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-600"
                                          >
                                            ×
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* EVALUATION TAB */}
                          {activeTab === 'evaluation' && (
                            <div className="space-y-6">
                              <div className="flex items-center justify-between mb-4">
                                <h5 className="font-semibold text-gray-800">Evaluation Records</h5>
                                <button
                                  onClick={() => setEvaluationDocs((prev) => [
                                    ...prev,
                                    { id: Date.now(), name: "Evaluation", file: null, url: null, date: null, remarks: "Select", employeeType: "Select", locked: false }
                                  ])}
                                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                >
                                  + Add Evaluation
                                </button>
                              </div>

                              <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-4 py-3 text-left text-gray-600 font-medium">Document</th>
                                      <th className="px-4 py-3 text-left text-gray-600 font-medium">File</th>
                                      <th className="px-4 py-3 text-left text-gray-600 font-medium">Date</th>
                                      <th className="px-4 py-3 text-left text-gray-600 font-medium">Employee Type</th>
                                      <th className="px-4 py-3 text-left text-gray-600 font-medium">Remarks</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {evaluationDocs.map((doc) => (
                                      <tr key={doc.id} className="hover:bg-gray-50/50">
                                        <td className="px-4 py-3 text-gray-800">Evaluation</td>
                                        <td className="px-4 py-3">
                                          {doc.file ? (
                                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                              {doc.file.name}
                                            </a>
                                          ) : (
                                            <span className="text-gray-400 italic">No file</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{doc.date || "—"}</td>
                                        <td className="px-4 py-3">
                                          <select 
                                            value={doc.employeeType || "Select"} 
                                            onChange={(e) => setEvaluationDocs((prev) => prev.map((d) => d.id === doc.id ? { ...d, employeeType: e.target.value } : d))}
                                            disabled={doc.locked}
                                            className="px-2 py-1 border border-gray-200 rounded text-xs"
                                          >
                                            <option value="Select">Select</option>
                                            <option value="Regular">Regular</option>
                                            <option value="Under Probation">Under Probation</option>
                                          </select>
                                        </td>
                                        <td className="px-4 py-3">
                                          <div className="flex items-center gap-2">
                                            <select 
                                              value={doc.remarks || "Select"} 
                                              onChange={(e) => setEvaluationDocs((prev) => prev.map((d) => d.id === doc.id ? { ...d, remarks: e.target.value } : d))}
                                              disabled={doc.locked}
                                              className="px-2 py-1 border border-gray-200 rounded text-xs"
                                            >
                                              <option value="Select">Select</option>
                                              <option value="Retained">Retained</option>
                                              <option value="Observed">Observed</option>
                                            </select>
                                            <button
                                              onClick={() => setEvaluationDocs((prev) => prev.map((d) => d.id === doc.id ? { ...d, locked: !d.locked } : d))}
                                              className={`w-6 h-6 rounded flex items-center justify-center text-xs ${
                                                doc.locked ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                                              }`}
                                            >
                                              {doc.locked ? "✗" : "✓"}
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <h6 className="font-medium text-gray-700 mb-2">Evaluation Summary</h6>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Total Evaluations:</span>
                                    <span className="ml-2 font-medium text-gray-800">{evaluationDocs.length}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Latest:</span>
                                    <span className="ml-2 font-medium text-gray-800">{evaluationDocs[0]?.date || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Status:</span>
                                    <span className="ml-2 font-medium text-gray-800">{evaluationDocs[0]?.remarks || "—"}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* SEPARATION TAB */}
                          {activeTab === 'separation' && (
                            <div className="space-y-6">
                              <div className="mb-4">
                                <h5 className="font-semibold text-gray-800">Separation Details</h5>
                              </div>

                              {terminationData ? (
                                <div className="space-y-4">
                                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                      </svg>
                                      Employee Terminated
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                                      <div>
                                        <span className="text-gray-500">Separation Type:</span>
                                        <span className="ml-2 text-gray-800">{terminationData.type || "Termination"}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Separation Date:</span>
                                        <span className="ml-2 text-gray-800">{terminationData.date || "—"}</span>
                                      </div>
                                      <div className="col-span-2">
                                        <span className="text-gray-500">Remarks:</span>
                                        <span className="ml-2 text-gray-800">{terminationData.remarks || "—"}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    <h6 className="font-medium text-gray-700 mb-3">Related Documents</h6>
                                    {terminationData.files && terminationData.files.length > 0 ? (
                                      <div className="space-y-2">
                                        {terminationData.files.map((file, idx) => (
                                          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                            <span className="text-sm text-gray-700">{file.name}</span>
                                            <a href="#" className="text-blue-600 hover:underline text-sm">View</a>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-500 italic">No documents uploaded.</p>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-12">
                                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </div>
                                  <h3 className="text-lg font-medium text-gray-700 mb-1">No Separation Record</h3>
                                  <p className="text-gray-500 text-sm">This employee has no separation details yet.</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* CERTIFICATIONS TAB */}
                          {activeTab === 'certifications' && (
                            <div className="space-y-6">
                              <div className="mb-4">
                                <h5 className="font-semibold text-gray-800">Employee Certifications</h5>
                              </div>

                              {/* Roadwise Certificates Section */}
                              <div>
                                <h6 className="font-medium text-blue-700 mb-3 flex items-center gap-2">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                  </svg>
                                  Roadwise Certificates
                                </h6>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                  <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                      <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                    </div>
                                    <p className="text-sm text-blue-700 font-medium">No company training certificates yet</p>
                                    <p className="text-xs text-blue-600 mt-1">Certificates from completed trainings will appear here</p>
                                  </div>
                                </div>
                              </div>

                              {/* External Certificates Section */}
                              <div>
                                <h6 className="font-medium text-purple-700 mb-3 flex items-center gap-2">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                  </svg>
                                  External Certificates
                                </h6>
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                  {loadingCertificates ? (
                                    <div className="text-center py-8">
                                      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                                        <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                      </div>
                                      <p className="text-sm text-purple-700 font-medium">Loading certificates...</p>
                                    </div>
                                  ) : externalCertificates.length > 0 ? (
                                    <div className="space-y-2">
                                      {externalCertificates.map((cert) => (
                                        <div 
                                          key={cert.id} 
                                          onClick={() => window.open(cert.certificate_url, '_blank')}
                                          className="flex items-center gap-3 p-3 bg-white rounded-lg border border-purple-200 hover:bg-purple-50 hover:border-purple-300 transition-all cursor-pointer group"
                                        >
                                          <svg className="w-5 h-5 text-purple-600 flex-shrink-0 group-hover:text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                          </svg>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 truncate group-hover:text-purple-700">{cert.name}</p>
                                            <p className="text-xs text-gray-500">{formatDate(cert.uploaded_at)}</p>
                                          </div>
                                          <svg className="w-5 h-5 text-gray-400 flex-shrink-0 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                          </svg>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-center py-8">
                                      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                      </div>
                                      <p className="text-sm text-purple-700 font-medium">No external certificates uploaded</p>
                                      <p className="text-xs text-purple-600 mt-1">Employee-uploaded certifications will appear here</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200 flex-shrink-0">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className={`px-4 py-2 text-sm rounded border ${
                        currentPage === 1 
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Prev
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className={`px-4 py-2 text-sm rounded border ${
                        currentPage >= totalPages
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Request Additional File Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Request Additional File</h3>
            <p className="text-sm text-gray-600 mb-4">Select documents to request from the employee:</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {[
                { id: "psa", name: "PSA Birth Cert" },
                { id: "dlicense", name: "Photocopy of Drivers License (Front and Back)" },
                { id: "sss", name: "Photocopy of SSS ID" },
                { id: "nbi", name: "NBI Clearance" },
                { id: "police", name: "Police Clearance" },
                { id: "drivetest", name: "Drive Test" },
              ].map((doc) => {
                const isAlreadySubmitted = requiredDocs.some(d => d.id === doc.id && d.file);
                const isAlreadyRequested = requestedDocs.some(d => d.id === doc.id);
                const isDisabled = isAlreadySubmitted || isAlreadyRequested;
                return (
                  <label key={doc.id} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    isDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'hover:bg-gray-50 border-gray-200'
                  }`}>
                    <input
                      type="checkbox"
                      disabled={isDisabled}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRequestedDocs(prev => [...prev, {
                            id: doc.id,
                            name: doc.name,
                            file: null,
                            previewUrl: null,
                            uploadedAt: null,
                            status: "requested",
                            validatedAt: null
                          }]);
                        } else {
                          setRequestedDocs(prev => prev.filter(d => d.id !== doc.id));
                        }
                      }}
                      className="mr-3"
                    />
                    <span className="text-sm flex-1">
                      {doc.name}
                      {isAlreadySubmitted && <span className="text-green-600 ml-2 text-xs">(Already Submitted)</span>}
                      {isAlreadyRequested && <span className="text-yellow-600 ml-2 text-xs">(Already Requested)</span>}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowRequestModal(false); setRequestedDocs([]); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowRequestModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Request Files
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terminate Employee Modal */}
      {showTerminateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Terminate Employee</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Employee Name</label>
                <input
                  value={selectedEmployee?.name || ""}
                  readOnly
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Separation Date</label>
                <input
                  type="date"
                  value={terminateDate}
                  onChange={(e) => setTerminateDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Upload Related Documents</label>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 text-sm font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add File
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setTerminateFiles([...terminateFiles, ...e.target.files])}
                    className="hidden"
                  />
                </label>
                {terminateFiles.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {terminateFiles.map((file, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {file.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Remarks</label>
                <textarea
                  rows="3"
                  placeholder="Enter termination remarks..."
                  value={terminateRemarks}
                  onChange={(e) => setTerminateRemarks(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowTerminateModal(false); setTerminateFiles([]); setTerminateDate(""); setTerminateRemarks(""); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowTerminateModal(false); setShowConfirmTerminate(true); }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Termination Modal */}
      {showConfirmTerminate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Confirm Termination</h3>
            <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
              <p className="text-gray-700 text-sm">
                <span className="font-semibold">Name:</span> {selectedEmployee?.name}
              </p>
              <p className="text-gray-700 mt-2 text-sm">
                <span className="font-semibold">Position:</span> {selectedEmployee?.position || "—"}
              </p>
              <p className="text-gray-700 mt-2 text-sm">
                <span className="font-semibold">Separation Date:</span> {terminateDate || "—"}
              </p>
            </div>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to terminate this employee? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmTerminate(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirmTerminate(false);
                  setShowSuccess(true);
                  setTerminationData({
                    type: "Termination",
                    date: terminateDate,
                    remarks: terminateRemarks,
                    files: [...terminateFiles]
                  });
                  setTerminateFiles([]);
                  setTerminateDate("");
                  setTerminateRemarks("");
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
              >
                Confirm Termination
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm text-center shadow-xl">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Termination Successful</h3>
            <p className="text-sm text-gray-600 mb-4">The employee has been terminated successfully.</p>
            <button
              onClick={() => setShowSuccess(false)}
              className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Employees;
