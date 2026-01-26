// src/Employees.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { validateNoSunday } from "./utils/dateTimeRules";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { getStoredJson } from "./authStorage";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { buildEachRAutoTableDefaults } from "./utils/eachrPdf";
import ExcelJS from "exceljs";

function Employees() {
  const navigate = useNavigate();

  const generateTempPassword = () => {
    const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const symbols = '!@#$%';
    const pick = (s) => s[Math.floor(Math.random() * s.length)];
    let out = '';
    out += pick('ABCDEFGHJKMNPQRSTUVWXYZ');
    out += pick('abcdefghijkmnpqrstuvwxyz');
    out += pick('23456789');
    out += pick(symbols);
    for (let i = 0; i < 8; i += 1) out += pick(alphabet);
    return out.split('').sort(() => Math.random() - 0.5).join('');
  };

  // master department list
  const departments = [
    "Operations Department",
    "Billing Department",
    "HR Department",
    "Security & Safety Department",
    "Collections Department",
    "Repairs and Maintenance Specialist",
  ];

  const departmentToPositions = {
    "Operations Department": [
      "Driver",
      "Helper",
      "Rider/Messenger",
      "Base Dispatcher",
      "Site Coordinator",
      "Transport Coordinator",
      "Customer Service Representative",
    ],
    "Billing Department": [
      "Billing Specialist",
      "POD Specialist",
    ],
    "HR Department": [
      "HR Specialist",
      "Recruitment Specialist",
      "HR Manager",
    ],
    "Security & Safety Department": [
      "Safety Officer 2",
      "Safety Officer 3",
      "Security Officer",
    ],
    "Collections Department": [
      "Billing & Collections Specialist",
      "Charges Specialist",
    ],
    "Repairs and Maintenance Specialist": [
      "Diesel Mechanic",
      "Truck Refrigeration Technician",
      "Welder",
      "Tinsmith",
    ],
  };

  const getPositionsForDepartment = (department) => {
    if (department === "All") {
      const all = new Set();
      Object.values(departmentToPositions).forEach((list) => {
        (list || []).forEach((p) => all.add(p));
      });
      return Array.from(all);
    }

    // Backward-compat alias (in case existing data uses "and" instead of "&")
    if (department === "Security & Safety Department") {
      return departmentToPositions["Security & Safety Department"] || [];
    }

    return departmentToPositions[department] || [];
  };

  const normalizeDepartmentName = (name) => {
    if (!name) return "";
    return String(name).replace(/\s+/g, " ").trim().replace(/\sand\s/g, " & ");
  };

  const getDepartmentForPosition = (position) => {
    if (!position) return null;
    for (const [dept, list] of Object.entries(departmentToPositions)) {
      if ((list || []).includes(position)) return dept;
    }
    return null;
  };

  // controls
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState("name-asc");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [positionFilter, setPositionFilter] = useState("All");
  const [depotFilter, setDepotFilter] = useState("All");
  const [employmentStatusFilter, setEmploymentStatusFilter] = useState("All");
  const [recruitmentTypeFilter, setRecruitmentTypeFilter] = useState("All");

  // Export menu state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);

  // Get current user info from localStorage
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    const userData = getStoredJson("loggedInHR");
    if (userData) setCurrentUser(userData);
  }, []);

  // data
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Selected employee for detail view
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState("profiling");

  // Detail tab states
  const [evaluationDocs, setEvaluationDocs] = useState([]);
  const [employeeDocuments, setEmployeeDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestedDocs, setRequestedDocs] = useState([]);
  const [terminationData, setTerminationData] = useState(null);
  const [onboardingItems, setOnboardingItems] = useState([]);
  const onboardingFileRefs = useRef({});
  const [resumeData, setResumeData] = useState(null);
  
  // Alert modals
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [applicationFormData, setApplicationFormData] = useState(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [applicationData, setApplicationData] = useState(null);
  const [loadingApplication, setLoadingApplication] = useState(false);
  const [applicantExtras, setApplicantExtras] = useState({ work_experiences: [], character_references: [] });

  // Driver-only profiling extras (drivers = Driver + Delivery Driver)
  const [driverLicense, setDriverLicense] = useState({ frontUrl: null, backUrl: null, photocopyUrl: null });
  const [driverExtraInfo, setDriverExtraInfo] = useState({ drivingHistory: null, medicalInfo: null });
  const [loadingDriverInfo, setLoadingDriverInfo] = useState(false);

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
  
  // Roadwise certificates state
  const [roadwiseCertificates, setRoadwiseCertificates] = useState([]);
  const [loadingRoadwiseCertificates, setLoadingRoadwiseCertificates] = useState(false);
  
  // Assessment and agreement records state
  const [assessmentRecords, setAssessmentRecords] = useState([]);

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

  const normalizeWs = (value) => {
    if (value === null || value === undefined) return "";
    return String(value).replace(/\s+/g, " ").trim();
  };

  const formatNameLastFirstMiddle = ({ last, first, middle }) => {
    const l = normalizeWs(last);
    const f = normalizeWs(first);
    const m = normalizeWs(middle);
    if (!l && !f && !m) return "";
    const rest = [f, m].filter(Boolean).join(" ").trim();
    if (!l) return rest;
    if (!rest) return l;
    return `${l}, ${rest}`;
  };

  const calculateAge = (birthday) => {
    if (!birthday) return null;
    const birthDate = new Date(birthday);
    if (Number.isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const formatFullAddressOneLine = (data) => {
    if (!data || typeof data !== 'object') return "";

    // Support agency payloads that already store a one-line address
    const oneLine =
      data.fullAddress ||
      data.full_address ||
      data.currentAddress ||
      data.current_address ||
      data.presentAddress ||
      data.present_address ||
      data.address ||
      data.current_address_text ||
      null;
    const oneLineStr = normalizeWs(oneLine);
    if (oneLineStr) return oneLineStr;

    const parts = [
      data.unit_house_number,
      data.house_number,
      data.unit,
      data.street,
      data.subdivision,
      data.village,
      data.subdivision_village,
      data.barangay,
      data.city,
      data.province,
      data.zip,
    ]
      .map(normalizeWs)
      .filter(Boolean);
    return parts.join(", ");
  };

  const isDriverRole = (position) => /\bdriver\b/i.test(String(position || ""));
  const isDeliveryCrewRole = (text) => /\bdelivery\s*crew\b/i.test(String(text || ""));

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
          formatNameLastFirstMiddle({ last: row.lname, first: row.fname, middle: row.mname }) ||
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
        department: normalizeDepartmentName(row.department || getDepartmentForPosition(row.position) || ""),
        email: row.email || "",
        contact: row.contact_number || "",
        role: row.role || "Employee",
        hired_at: row.hired_at,
        employmentStatus: row.status === "Probationary" ? "Under Probation" : row.status === "Regular" ? "Regular" : "Regular", // Map status from DB to employment status
        agency: baseAgency,
        source: row.source || null,
        endorsed_by_agency_id: row.endorsed_by_agency_id || row.agency_profile_id || null,
        endorsed_at: row.endorsed_at || null,
        agency_name: null, // Will be populated after fetching from profiles
      };
    };

    const load = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const { data: empRows, error: empErr } = await supabase
          .from("employees")
          .select(`
            id, email, fname, lname, mname, contact_number, position, depot, department, 
            role, hired_at, source, endorsed_by_agency_id, endorsed_at, agency_profile_id, 
            status, is_agency, auth_user_id,
            employee_separations(is_terminated)
          `)
          .order("hired_at", { ascending: false });

        if (empErr) throw empErr;

        // Get auth_user_ids to check account status
        const authUserIds = (empRows || []).filter(emp => emp.auth_user_id).map(emp => emp.auth_user_id);
        
        // Fetch account status from profiles
        let accountStatusMap = {};
        if (authUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, account_expires_at, is_active')
            .in('id', authUserIds);
          
          if (profiles) {
            profiles.forEach(profile => {
              accountStatusMap[profile.id] = {
                isActive: profile.is_active !== false,
                isExpired: profile.account_expires_at ? new Date(profile.account_expires_at) < new Date() : false
              };
            });
          }
        }

        // Filter out terminated employees and those with expired/disabled accounts
        const activeEmployees = (empRows || []).filter(row => {
          // Check termination status
          if (row.employee_separations && row.employee_separations.is_terminated) return false;
          
          // Check account status if employee has auth_user_id
          if (row.auth_user_id && accountStatusMap[row.auth_user_id]) {
            const accountStatus = accountStatusMap[row.auth_user_id];
            if (!accountStatus.isActive || accountStatus.isExpired) return false;
          }
          
          return true;
        });

        const normalized = activeEmployees.map(normalize);

        // Fetch agency names for employees endorsed by agencies
        const agencyIds = Array.from(new Set(
          normalized.filter(e => e.endorsed_by_agency_id).map(e => e.endorsed_by_agency_id)
        ));

        const agencyNamesMap = {};
        if (agencyIds.length > 0) {
          const { data: agencyProfiles } = await supabase
            .from('profiles')
            .select('id, agency_name')
            .in('id', agencyIds);
          
          if (agencyProfiles) {
            agencyProfiles.forEach(profile => {
              if (profile.agency_name) {
                agencyNamesMap[profile.id] = profile.agency_name;
              }
            });
          }
        }

        // Populate agency_name field
        normalized.forEach(emp => {
          if (emp.endorsed_by_agency_id && agencyNamesMap[emp.endorsed_by_agency_id]) {
            emp.agency_name = agencyNamesMap[emp.endorsed_by_agency_id];
          }
        });

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

  const depotOptions = useMemo(() => {
    const set = new Set();
    for (const e of employees || []) {
      const d = e?.depot ? String(e.depot).trim() : "";
      if (d) set.add(d);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const positions = useMemo(() => {
    const list = getPositionsForDepartment(departmentFilter);
    return ["All", ...list.sort((a, b) => a.localeCompare(b))];
  }, [departmentFilter]);

  useEffect(() => {
    if (positionFilter === "All") return;
    const allowed = new Set(getPositionsForDepartment(departmentFilter));
    if (!allowed.has(positionFilter)) setPositionFilter("All");
  }, [departmentFilter, positionFilter]);

  const employmentStatuses = ["All", "Regular", "Under Probation", "Part Time"];
  const recruitmentTypes = ["All", "Agency", "Direct"];

  // Filter and sort employees
  const filtered = useMemo(() => {
    const [sortKey, sortDir] = String(sortOption || "name-asc").split("-");
    const isAsc = sortDir === "asc";

    return employees
      .filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
      .filter((e) => {
        if (recruitmentTypeFilter === "All") return true;
        if (recruitmentTypeFilter === "Agency") return !!e.agency;
        if (recruitmentTypeFilter === "Direct") return !e.agency;
        return true;
      })
      .filter((e) => {
        if (departmentFilter === "All") return true;
        const derived = getDepartmentForPosition(e.position);
        return normalizeDepartmentName(derived) === normalizeDepartmentName(departmentFilter);
      })
      .filter((e) => positionFilter === "All" || e.position === positionFilter)
      .filter((e) => {
        // Auto-filter by depot for HRC users (HRC can only see their depot's employees)
        if (currentUser?.role?.toUpperCase() === 'HRC' && currentUser?.depot) {
          return (e.depot || "") === currentUser.depot;
        }
        // Manual depot filter for non-HRC users
        if (depotFilter === "All") return true;
        return (e.depot || "") === depotFilter;
      })
      .filter((e) => employmentStatusFilter === "All" || e.employmentStatus === employmentStatusFilter)
      .sort((a, b) => {
        if (sortKey === "hired") {
          const at = a.hired_at ? new Date(a.hired_at).getTime() : null;
          const bt = b.hired_at ? new Date(b.hired_at).getTime() : null;

          if (at == null && bt == null) return 0;
          if (at == null) return 1;
          if (bt == null) return -1;

          return isAsc ? at - bt : bt - at;
        }

        return isAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      });
  }, [employees, search, recruitmentTypeFilter, departmentFilter, positionFilter, depotFilter, employmentStatusFilter, sortOption, currentUser]);

  useEffect(() => {
    const handler = (e) => {
      if (!showExportMenu) return;
      const el = exportMenuRef.current;
      if (el && !el.contains(e.target)) setShowExportMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showExportMenu]);


  // Stats - for HRC users, count only employees from their depot
  const stats = useMemo(() => {
    let baseList = employees;
    
    // If HRC, filter by their depot for stats
    if (currentUser?.role?.toUpperCase() === 'HRC' && currentUser?.depot) {
      baseList = employees.filter(e => (e.depot || "") === currentUser.depot);
    }
    
    return {
      total: baseList.length,
      regular: baseList.filter(e => e.employmentStatus === "Regular").length,
      probation: baseList.filter(e => e.employmentStatus === "Under Probation").length,
      agency: baseList.filter(e => e.agency).length,
    };
  }, [employees, currentUser]);

  // Helpers
  const formatDate = (d) => {
    if (!d) return "None";
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

  const exportEmployeesPdf = useCallback((rows, title = "Employees") => {
    const list = Array.isArray(rows) ? rows : [];
    if (list.length === 0) {
      setErrorMessage("No employees to export for the current filters.");
      setShowErrorAlert(true);
      return;
    }

    try {
      const exportedAt = new Date();
      const exportedAtLabel = exportedAt.toLocaleString("en-US");
      const filterSummary = [
        search ? `Search: ${search}` : null,
        depotFilter !== "All" ? `Depot: ${depotFilter}` : null,
        departmentFilter !== "All" ? `Department: ${departmentFilter}` : null,
        positionFilter !== "All" ? `Position: ${positionFilter}` : null,
        employmentStatusFilter !== "All" ? `Employment: ${employmentStatusFilter}` : null,
        recruitmentTypeFilter !== "All" ? `Recruitment: ${recruitmentTypeFilter}` : null,
        `Sort: ${sortOption}`,
      ]
        .filter(Boolean)
        .join(" | ");

      const safeText = (v) => {
        const s = String(v ?? "").trim();
        if (!s || s === "—" || s === "--") return "None";
        return s;
      };

      const hiredDateText = (v) => {
        if (!v) return "None";
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? safeText(v) : d.toLocaleDateString("en-US");
      };

      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

      const autoTableDefaults = buildEachRAutoTableDefaults({
        title: `${title} (${list.length})`,
        subtitle: "Employee List Export",
        leftMetaLines: filterSummary ? [filterSummary] : [],
        rightMetaLines: [`Exported: ${exportedAtLabel}`],
      });

      const body = list.map((e) => {
        const recruitmentType = e.agency ? "Agency" : "Direct";
        return [
          safeText(e.name),
          safeText(e.email),
          safeText(e.position),
          safeText(e.depot),
          safeText(e.employmentStatus),
          hiredDateText(e.hired_at),
          safeText(recruitmentType),
        ];
      });

      autoTable(doc, {
        ...autoTableDefaults,
        head: [["Employee", "Email", "Position", "Depot", "Employment Status", "Date Hired", "Recruitment"]],
        body,
        columnStyles: {
          0: { cellWidth: 95 },
          1: { cellWidth: 110 },
          2: { cellWidth: 85 },
          3: { cellWidth: 55 },
          4: { cellWidth: 70 },
          5: { cellWidth: 60 },
          6: { cellWidth: 55 },
        },
      });

      if (typeof doc.putTotalPages === 'function') {
        doc.putTotalPages(autoTableDefaults.totalPagesExp);
      }

      const yyyyMmDd = exportedAt.toISOString().slice(0, 10);
      const rawParts = [
        title,
        employmentStatusFilter !== "All" ? employmentStatusFilter : null,
        departmentFilter !== "All" ? departmentFilter : null,
        positionFilter !== "All" ? positionFilter : null,
        depotFilter !== "All" ? depotFilter : null,
        recruitmentTypeFilter !== "All" ? recruitmentTypeFilter : null,
        yyyyMmDd,
      ]
        .filter(Boolean)
        .join("_");
      const fileName = `${rawParts}`.replace(/[^a-zA-Z0-9_-]+/g, "_") + ".pdf";
      doc.save(fileName);
    } catch (err) {
      console.error("exportEmployeesPdf error:", err);
      setErrorMessage("Failed to export PDF. Please try again.");
      setShowErrorAlert(true);
    }
  }, [search, depotFilter, departmentFilter, positionFilter, employmentStatusFilter, recruitmentTypeFilter, sortOption]);

  const exportEmployeesExcel = useCallback(async (rows, title = "Employees") => {
    const list = Array.isArray(rows) ? rows : [];
    if (list.length === 0) {
      setErrorMessage("No employees to export for the current filters.");
      setShowErrorAlert(true);
      return;
    }

    try {
      const exportedAt = new Date();
      const yyyyMmDd = exportedAt.toISOString().slice(0, 10);
      const rawParts = [
        title,
        employmentStatusFilter !== "All" ? employmentStatusFilter : null,
        departmentFilter !== "All" ? departmentFilter : null,
        positionFilter !== "All" ? positionFilter : null,
        depotFilter !== "All" ? depotFilter : null,
        recruitmentTypeFilter !== "All" ? recruitmentTypeFilter : null,
        yyyyMmDd,
      ]
        .filter(Boolean)
        .join("_");
      const fileName = `${rawParts}`.replace(/[^a-zA-Z0-9_-]+/g, "_") + ".xlsx";

      const safeText = (v) => {
        const s = String(v ?? "").trim();
        if (!s || s === "—" || s === "--") return "None";
        return s;
      };

      const hiredDateText = (v) => {
        if (!v) return "None";
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? safeText(v) : d.toLocaleDateString("en-US");
      };

      const header = ["Employee", "Email", "Position", "Depot", "Employment Status", "Date Hired", "Recruitment"];
      const rowsAoa = [];

      for (const e of list) {
        const recruitmentType = e.agency ? "Agency" : "Direct";
        rowsAoa.push([
          safeText(e.name),
          safeText(e.email),
          safeText(e.position),
          safeText(e.depot),
          safeText(e.employmentStatus),
          hiredDateText(e.hired_at),
          safeText(recruitmentType),
        ]);
      }

      const sheetName = String(title || "Employees").slice(0, 31) || "Employees";

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(sheetName);
      worksheet.addRow(header);
      worksheet.addRows(rowsAoa);

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("exportEmployeesExcel error:", err);
      setErrorMessage("Failed to export Excel file. Please try again.");
      setShowErrorAlert(true);
    }
  }, [employmentStatusFilter, departmentFilter, positionFilter, depotFilter, recruitmentTypeFilter]);

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
        let allCertificates = data || [];
        
        // Also fetch certificates from application form if applicationData is available
        if (applicationData?.payload?.form?.certificates) {
          const appCertificates = applicationData.payload.form.certificates;
          
          // Generate signed URLs for each application certificate
          const appCertsWithUrls = await Promise.all(
            appCertificates.map(async (cert) => {
              if (cert?.path) {
                const { data: signedData, error: signedError } = await supabase.storage
                  .from('external_certificates')
                  .createSignedUrl(cert.path, 604800); // 7 days
                
                if (!signedError && signedData?.signedUrl) {
                  return {
                    id: `app-cert-${cert.path}`,
                    name: cert.name,
                    title: cert.name,
                    certificate_url: signedData.signedUrl,
                    uploaded_at: applicationData.submitted_at || applicationData.created_at,
                    source: 'application_form'
                  };
                }
              }
              return null;
            })
          );
          
          // Filter out null values and add to the certificates list
          const validAppCerts = appCertsWithUrls.filter(cert => cert !== null);
          allCertificates = [...allCertificates, ...validAppCerts];
        }
        
        setExternalCertificates(allCertificates);
      }
    } catch (error) {
      console.error('Error fetching external certificates:', error);
      setExternalCertificates([]);
    } finally {
      setLoadingCertificates(false);
    }
  };

  // Fetch Roadwise certificates for selected employee
  const fetchRoadwiseCertificates = async (employee) => {
    if (!employee || !employee.email) {
      setRoadwiseCertificates([]);
      return;
    }
    
    setLoadingRoadwiseCertificates(true);
    try {
      // First, find the user_id (auth UID) from the employee's email
      // Check profiles table first (most reliable)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', employee.email)
        .maybeSingle();

      let userId = null;
      
      if (!profileError && profileData?.id) {
        userId = profileData.id;
      } else {
        // Fallback: try to find in applicants table
        const { data: applicantData, error: applicantError } = await supabase
          .from('applicants')
          .select('id')
          .eq('email', employee.email)
          .maybeSingle();

        if (!applicantError && applicantData?.id) {
          userId = applicantData.id;
        }
      }

      if (!userId) {
        console.log('No user_id found for employee email:', employee.email);
        setRoadwiseCertificates([]);
        return;
      }

      // Query certificates table joined with trainings table
      const { data: certificatesData, error: certificatesError } = await supabase
        .from('certificates')
        .select('id, certificate_url, created_at, training_id')
        .eq('employee_id', userId)
        .order('created_at', { ascending: false });

      if (certificatesError) {
        console.error('Error fetching Roadwise certificates:', certificatesError);
        setRoadwiseCertificates([]);
        return;
      }

      if (!certificatesData || certificatesData.length === 0) {
        setRoadwiseCertificates([]);
        return;
      }

      // Get unique training IDs
      const trainingIds = [...new Set(certificatesData.map(c => c.training_id).filter(Boolean))];
      
      // Fetch training details
      let trainingsMap = {};
      if (trainingIds.length > 0) {
        const { data: trainingsData, error: trainingsError } = await supabase
          .from('trainings')
          .select('id, title')
          .in('id', trainingIds);

        if (!trainingsError && trainingsData) {
          trainingsMap = trainingsData.reduce((acc, training) => {
            acc[training.id] = training.title;
            return acc;
          }, {});
        }
      }

      // Transform the data to match our display format
      const certificates = certificatesData.map(cert => ({
        id: cert.id,
        trainingTitle: trainingsMap[cert.training_id] || 'Unknown Training',
        certificateUrl: cert.certificate_url,
        uploadedAt: cert.created_at,
        fileName: cert.certificate_url ? cert.certificate_url.split('/').pop() : null
      }));
      
      setRoadwiseCertificates(certificates);
    } catch (error) {
      console.error('Error fetching Roadwise certificates:', error);
      setRoadwiseCertificates([]);
    } finally {
      setLoadingRoadwiseCertificates(false);
    }
  };

  // Fetch certificates when employee is selected or profiling tab is active
  useEffect(() => {
    const fetchCertificates = async () => {
      if (!selectedEmployee || activeTab !== 'profiling') {
        setExternalCertificates([]);
        return;
      }
      
      const employeeEmail = selectedEmployee.email;
      if (!employeeEmail) {
        setExternalCertificates([]);
        return;
      }
      
      console.log('🔍 Fetching certificates for employee:', selectedEmployee.name);
      console.log('📊 Application data:', applicationData);
      console.log('📋 Payload:', applicationData?.payload);
      console.log('📄 Form:', applicationData?.form);
      console.log('🎓 Certificates (direct):', applicationData?.certificates);
      console.log('🎓 Certificates (form.certificates):', applicationData?.form?.certificates);
      console.log('🎓 Certificates (payload.form.certificates):', applicationData?.payload?.form?.certificates);
      
      setLoadingCertificates(true);
      try {
        let allCertificates = [];
        
        // Try multiple possible paths where certificates might be stored
        const appCertificates = 
          applicationData?.payload?.form?.certificates || 
          applicationData?.form?.certificates || 
          applicationData?.certificates;
        
        // Fetch certificates from application form if applicationData is available
        if (appCertificates && Array.isArray(appCertificates) && appCertificates.length > 0) {
          console.log('✅ Found certificates:', appCertificates);
          
          // Generate signed URLs for each application certificate
          const appCertsWithUrls = await Promise.all(
            appCertificates.map(async (cert, index) => {
              console.log(`🔑 Processing certificate ${index}:`, cert);
              if (cert?.path) {
                const { data: signedData, error: signedError } = await supabase.storage
                  .from('external_certificates')
                  .createSignedUrl(cert.path, 604800); // 7 days
                
                if (signedError) {
                  console.error(`❌ Error generating signed URL for ${cert.name}:`, signedError);
                }
                
                if (!signedError && signedData?.signedUrl) {
                  console.log(`✅ Generated signed URL for ${cert.name}:`, signedData.signedUrl);
                  return {
                    id: `app-cert-${index}-${cert.path}`,
                    name: cert.name,
                    title: cert.name,
                    certificate_url: signedData.signedUrl,
                    uploaded_at: applicationData.submitted_at || applicationData.created_at,
                    source: 'application_form'
                  };
                }
              }
              return null;
            })
          );
          
          // Filter out null values and add to the certificates list
          const validAppCerts = appCertsWithUrls.filter(cert => cert !== null);
          console.log('📦 Valid certificates:', validAppCerts);
          allCertificates = [...allCertificates, ...validAppCerts];
        } else {
          console.log('⚠️ No certificates found in applicationData');
        }
        
        console.log('🎯 Setting certificates:', allCertificates);
        setExternalCertificates(allCertificates);
      } catch (error) {
        console.error('Error fetching external certificates:', error);
        setExternalCertificates([]);
      } finally {
        setLoadingCertificates(false);
      }
    };
    
    fetchCertificates();
  }, [selectedEmployee, activeTab, applicationData]);

  // Fetch employee documents when employee is selected and documents tab is active
  useEffect(() => {
    const fetchEmployeeDocuments = async () => {
      if (!selectedEmployee || activeTab !== 'documents') {
        setEmployeeDocuments([]);
        return;
      }

      setLoadingDocuments(true);
      try {
        // Fetch employee requirements from database
        const { data: employeeData, error } = await supabase
          .from('employees')
          .select('id, requirements, is_agency')
          .eq('id', selectedEmployee.id)
          .single();

        if (error) throw error;

        // Parse requirements
        let requirementsData = null;
        if (employeeData.requirements) {
          if (typeof employeeData.requirements === 'string') {
            try {
              requirementsData = JSON.parse(employeeData.requirements);
            } catch {
              requirementsData = null;
            }
          } else {
            requirementsData = employeeData.requirements;
          }
        }

        const documents = [];
        const isAgency = employeeData.is_agency === true;

        // Helper function to get document URL from file path
        const getDocumentUrl = (filePath) => {
          if (!filePath) return null;
          const { data } = supabase.storage
            .from('application-files')
            .getPublicUrl(filePath);
          return data?.publicUrl || null;
        };

        // Helper function to get filename from file path
        const getFilename = (filePath) => {
          if (!filePath) return null;
          return filePath.split('/').pop() || filePath;
        };

        if (isAgency) {
          // Agency employees: extract documents from ID numbers
          const idNumbers = requirementsData?.id_numbers || {};
          const idMapping = [
            { key: 'sss', name: 'SSS (Social Security System)' },
            { key: 'tin', name: 'TIN (Tax Identification Number)' },
            { key: 'pagibig', name: 'PAG-IBIG (HDMF)' },
            { key: 'philhealth', name: 'PhilHealth' },
          ];

          idMapping.forEach(({ key, name }) => {
            const idData = idNumbers[key];
            if (idData) {
              const filePath = idData.file_path || idData.filePath;
              const status = idData.status || 'Missing';
              const displayStatus = status === 'Validated' || status === 'approved' ? 'Validated' : 
                                   status === 'Re-submit' || status === 'resubmit' ? 'Re-submit' : 
                                   status === 'Submitted' || status === 'pending' ? 'Submitted' : 'Missing';
              
              documents.push({
                id: key,
                name: name,
                file: filePath ? { name: getFilename(filePath) } : null,
                previewUrl: filePath ? getDocumentUrl(filePath) : null,
                status: displayStatus,
              });
            } else {
              documents.push({
                id: key,
                name: name,
                file: null,
                previewUrl: null,
                status: 'Missing',
              });
            }
          });
        } else {
          // Direct employees: extract from all document sections
          
          // 1. Extract ID Numbers (SSS, TIN, PAG-IBIG, PhilHealth)
          const idNumbers = requirementsData?.id_numbers || {};
          const idMapping = [
            { key: 'sss', name: 'Photocopy of SSS ID' },
            { key: 'tin', name: 'TIN (Tax Identification Number)' },
            { key: 'pagibig', name: 'PAG-IBIG (HDMF)' },
            { key: 'philhealth', name: 'PhilHealth' },
          ];

          idMapping.forEach(({ key, name }) => {
            const idData = idNumbers[key];
            if (idData) {
              const filePath = idData.file_path || idData.filePath;
              const status = idData.status || 'Missing';
              const displayStatus = status === 'Validated' || status === 'approved' ? 'Validated' : 
                                   status === 'Re-submit' || status === 'resubmit' ? 'Re-submit' : 
                                   status === 'Submitted' || status === 'pending' ? 'Submitted' : 'Missing';
              
              documents.push({
                id: key,
                name: name,
                file: filePath ? { name: getFilename(filePath) } : null,
                previewUrl: filePath ? getDocumentUrl(filePath) : null,
                status: displayStatus,
              });
            } else {
              documents.push({
                id: key,
                name: name,
                file: null,
                previewUrl: null,
                status: 'Missing',
              });
            }
          });

          // 2. Extract Driver's License
          const license = requirementsData?.license || {};
          if (license && typeof license === 'object') {
            const photocopyPath =
              license.filePath ||
              license.file_path ||
              license.licenseFilePath ||
              license.license_file_path ||
              null;
            const frontPath = license.frontFilePath || license.front_file_path;
            const backPath = license.backFilePath || license.back_file_path;
            const hasFile = !!(photocopyPath || frontPath || backPath);
            const status = license.status || 'Missing';
            const displayStatus = status === 'Validated' || status === 'approved' ? 'Validated' : 
                                 status === 'Re-submit' || status === 'resubmit' ? 'Re-submit' : 
                                 status === 'Submitted' || status === 'pending' ? 'Submitted' : 'Missing';
            
            documents.push({
              id: 'drivers_license',
              name: 'Photocopy of Drivers License',
              file: hasFile ? { name: getFilename(photocopyPath || frontPath || backPath || 'drivers_license') } : null,
              previewUrl: photocopyPath ? getDocumentUrl(photocopyPath) : (frontPath ? getDocumentUrl(frontPath) : (backPath ? getDocumentUrl(backPath) : null)),
              status: displayStatus,
            });
          } else {
            documents.push({
              id: 'drivers_license',
              name: 'Photocopy of Drivers License',
              file: null,
              previewUrl: null,
              status: 'Missing',
            });
          }

          // 3. Extract Personal Documents
          const personalDocs = requirementsData?.personalDocuments || {};
          const personalDocMapping = [
            { key: 'psa_birth_certificate', name: 'PSA Birth Cert' },
            { key: 'photo_2x2', name: '2x2 Picture w/ White Background' },
            { key: 'marriage_contract', name: 'Marriage Contract Photocopy (If applicable)' },
            { key: 'dependents_birth_certificate', name: 'PSA Birth Certificate of Dependents (If applicable)' },
            { key: 'residence_sketch', name: 'Direction of Residence (House to Depot Sketch)' },
          ];

          personalDocMapping.forEach(({ key, name }) => {
            const docData = personalDocs[key];
            if (docData && typeof docData === 'object') {
              const filePath = docData.filePath || docData.file_path;
              const isIfApplicable = key === 'marriage_contract' || key === 'dependents_birth_certificate';
              const status = docData.status || 'Missing';
              const displayStatus = !filePath && isIfApplicable
                ? 'Optional'
                : status === 'Validated' || status === 'approved' ? 'Validated' : 
                  status === 'Re-submit' || status === 'resubmit' ? 'Re-submit' : 
                  status === 'Submitted' || status === 'pending' ? 'Submitted' : 'Missing';
              
              documents.push({
                id: key,
                name: name,
                file: filePath ? { name: getFilename(filePath) } : null,
                previewUrl: filePath ? getDocumentUrl(filePath) : null,
                status: displayStatus,
              });
            } else {
              // Only add required documents or if they have data
              // HR wants to track these even when missing (incl. "If applicable" docs)
              if (
                key === 'psa_birth_certificate' ||
                key === 'photo_2x2' ||
                key === 'residence_sketch' ||
                key === 'marriage_contract' ||
                key === 'dependents_birth_certificate'
              ) {
                documents.push({
                  id: key,
                  name: name,
                  file: null,
                  previewUrl: null,
                  status: (key === 'marriage_contract' || key === 'dependents_birth_certificate') ? 'Optional' : 'Missing',
                });
              }
            }
          });

          // 4. Extract Clearances
          const clearances = requirementsData?.clearances || {};
          const clearanceMapping = [
            { key: 'nbi_clearance', name: 'NBI Clearance' },
            { key: 'police_clearance', name: 'Police Clearance' },
            { key: 'barangay_clearance', name: 'Barangay Clearance' },
          ];

          clearanceMapping.forEach(({ key, name }) => {
            const clearanceData = clearances[key];
            if (clearanceData && typeof clearanceData === 'object') {
              const filePath = clearanceData.filePath || clearanceData.file_path;
              const status = clearanceData.status || 'Missing';
              const displayStatus = status === 'Validated' || status === 'approved' ? 'Validated' : 
                                   status === 'Re-submit' || status === 'resubmit' ? 'Re-submit' : 
                                   status === 'Submitted' || status === 'pending' ? 'Submitted' : 'Missing';
              
              documents.push({
                id: key,
                name: name,
                file: filePath ? { name: getFilename(filePath) } : null,
                previewUrl: filePath ? getDocumentUrl(filePath) : null,
                status: displayStatus,
              });
            } else {
              documents.push({
                id: key,
                name: name,
                file: null,
                previewUrl: null,
                status: 'Missing',
              });
            }
          });

          // 5. Extract Educational Documents
          const educationalDocs = requirementsData?.educationalDocuments || {};
          const educationalDocMapping = [
            { key: 'diploma', name: 'Diploma' },
            { key: 'transcript_of_records', name: 'Transcript of Records' },
          ];

          educationalDocMapping.forEach(({ key, name }) => {
            const docData = educationalDocs[key];
            if (docData && typeof docData === 'object') {
              const filePath = docData.filePath || docData.file_path;
              const status = docData.status || 'Missing';
              const displayStatus = status === 'Validated' || status === 'approved' ? 'Validated' : 
                                   status === 'Re-submit' || status === 'resubmit' ? 'Re-submit' : 
                                   status === 'Submitted' || status === 'pending' ? 'Submitted' : 'Missing';
              
              documents.push({
                id: key,
                name: name,
                file: filePath ? { name: getFilename(filePath) } : null,
                previewUrl: filePath ? getDocumentUrl(filePath) : null,
                status: displayStatus,
              });
            } else {
              documents.push({
                id: key,
                name: name,
                file: null,
                previewUrl: null,
                status: 'Missing',
              });
            }
          });

          // 6. Extract Medical Exams
          const medicalExams = requirementsData?.medicalExams || {};
          const medicalExamMapping = [
            { key: 'xray', name: 'X-ray' },
            { key: 'stool', name: 'Stool' },
            { key: 'urine', name: 'Urine' },
            { key: 'hepa', name: 'HEPA' },
            { key: 'cbc', name: 'CBC' },
            { key: 'drug_test', name: 'Drug Test' },
          ];

          medicalExamMapping.forEach(({ key, name }) => {
            const examData = medicalExams[key];
            if (examData && typeof examData === 'object') {
              const filePath = examData.filePath || examData.file_path;
              const status = examData.status || 'Missing';
              const displayStatus = status === 'Validated' || status === 'approved' ? 'Validated' : 
                                   status === 'Re-submit' || status === 'resubmit' ? 'Re-submit' : 
                                   status === 'Submitted' || status === 'pending' ? 'Submitted' : 'Missing';
              
              documents.push({
                id: key,
                name: name,
                file: filePath ? { name: getFilename(filePath) } : null,
                previewUrl: filePath ? getDocumentUrl(filePath) : null,
                status: displayStatus,
              });
            } else {
              documents.push({
                id: key,
                name: name,
                file: null,
                previewUrl: null,
                status: 'Missing',
              });
            }
          });

          // 7. Extract Legacy Documents Array (for backward compatibility)
          const legacyDocuments = requirementsData?.documents || [];
          legacyDocuments.forEach((doc) => {
            // Skip if already added from structured sections
            const existingDoc = documents.find(d => d.id === doc.key || d.name === doc.name);
            if (!existingDoc) {
              const filePath = doc.file_path || doc.filePath;
              const status = doc.status || 'Missing';
              const displayStatus = status === 'Validated' || status === 'approved' ? 'Validated' : 
                                   status === 'Re-submit' || status === 'resubmit' ? 'Re-submit' : 
                                   status === 'Submitted' || status === 'pending' ? 'Submitted' : 'Missing';
              
              documents.push({
                id: doc.key || doc.name || `doc-${documents.length}`,
                name: doc.name || doc.key || 'Unknown Document',
                file: filePath ? { name: getFilename(filePath) } : null,
                previewUrl: filePath ? getDocumentUrl(filePath) : null,
                status: displayStatus,
              });
            }
          });
        }

        setEmployeeDocuments(documents);
      } catch (err) {
        console.error('Error fetching employee documents:', err);
        setEmployeeDocuments([]);
      } finally {
        setLoadingDocuments(false);
      }
    };

    fetchEmployeeDocuments();
  }, [selectedEmployee, activeTab]);

    // Fetch driver profiling info (license photocopy/front/back + driving/medical info)
    useEffect(() => {
      const fetchDriverInfo = async () => {
        const positionText =
          selectedEmployee?.position ||
          selectedEmployee?.job_title ||
          selectedEmployee?.jobTitle ||
          selectedEmployee?.role ||
          applicationData?.position ||
          applicationData?.positionApplied ||
          applicationData?.position_applied ||
          applicationData?.jobTitle ||
          applicationData?.job_title ||
          '';
        const jobTitleText =
          applicationData?.job_posts?.title ||
          applicationData?.jobTitle ||
          applicationData?.job_title ||
          '';
        const isDriver =
          !!selectedEmployee?.id &&
          (isDriverRole(positionText) || isDeliveryCrewRole(positionText) || isDeliveryCrewRole(jobTitleText));

        if (!isDriver) {
          setDriverLicense({ frontUrl: null, backUrl: null, photocopyUrl: null });
          setDriverExtraInfo({ drivingHistory: null, medicalInfo: null });
          setLoadingDriverInfo(false);
          return;
        }

        setLoadingDriverInfo(true);
        try {
          const { data, error } = await supabase
            .from('employees')
            .select('requirements')
            .eq('id', selectedEmployee.id)
            .single();

          if (error) throw error;

          let requirementsData = data?.requirements || null;
          if (requirementsData && typeof requirementsData === 'string') {
            try {
              requirementsData = JSON.parse(requirementsData);
            } catch {
              requirementsData = null;
            }
          }

          const license = requirementsData?.license || {};
          const frontPath =
            license.frontFilePath ||
            license.front_file_path ||
            license.front_path ||
            license.front ||
            null;
          const backPath =
            license.backFilePath ||
            license.back_file_path ||
            license.back_path ||
            license.back ||
            null;
          const photocopyPath =
            license.filePath ||
            license.file_path ||
            license.licenseFilePath ||
            license.license_file_path ||
            license.photocopyPath ||
            license.photocopy_path ||
            null;

          const getPublicUrl = (filePath) => {
            if (!filePath) return null;
            return supabase.storage.from('application-files').getPublicUrl(filePath)?.data?.publicUrl || null;
          };

          setDriverLicense({
            frontUrl: getPublicUrl(frontPath),
            backUrl: getPublicUrl(backPath),
            photocopyUrl: getPublicUrl(photocopyPath),
          });

          const drivingHistory =
            requirementsData?.drivingHistory ||
            requirementsData?.driving_history ||
            applicationData?.drivingHistory ||
            applicationData?.driving_history ||
            null;

          const medicalInfo =
            requirementsData?.medicalInfo ||
            requirementsData?.medical_information ||
            requirementsData?.medicalInformation ||
            applicationData?.medicalInfo ||
            applicationData?.medical_information ||
            applicationData?.medicalInformation ||
            null;

          setDriverExtraInfo({ drivingHistory, medicalInfo });
        } catch (err) {
          console.error('Error fetching driver info:', err);
          setDriverLicense({ frontUrl: null, backUrl: null, photocopyUrl: null });
          setDriverExtraInfo({ drivingHistory: null, medicalInfo: null });
        } finally {
          setLoadingDriverInfo(false);
        }
      };

      fetchDriverInfo();
    }, [selectedEmployee?.id, selectedEmployee?.position, selectedEmployee?.job_title, selectedEmployee?.jobTitle, selectedEmployee?.role, applicationData?.position, applicationData?.positionApplied, applicationData?.position_applied, applicationData?.jobTitle, applicationData?.job_title]);

  // Load assessment and agreement records when employee is selected and documents tab is active
  useEffect(() => {
    const loadAssessmentRecords = async () => {
      if (!selectedEmployee?.email || activeTab !== 'documents') {
        setAssessmentRecords([]);
        return;
      }

      try {
        // Get file URL helper
        const getFileUrl = (filePath) => {
          if (!filePath) return null;
          return supabase.storage.from('application-files').getPublicUrl(filePath)?.data?.publicUrl;
        };

        // Get the applicant's email from employee record
        const applicantEmail = selectedEmployee.email?.trim();
        const employeeEmail = applicantEmail.toLowerCase();
        const employeeName = selectedEmployee.name?.toLowerCase() || '';
        const employeeFname = selectedEmployee.fname?.toLowerCase() || '';
        const employeeLname = selectedEmployee.lname?.toLowerCase() || '';
        const employeeHiredAt = selectedEmployee.hired_at;
        
        let applicationsData = null;
        const baseSelect = 'id, interview_details_file, assessment_results_file, appointment_letter_file, undertaking_file, application_form_file, undertaking_duties_file, pre_employment_requirements_file, id_form_file, created_at, user_id, status, job_posts:job_id(title, depot), payload';

        console.log('Loading assessment records for employee:', {
          email: selectedEmployee.email,
          name: selectedEmployee.name,
          hired_at: employeeHiredAt
        });

        // Approach 1: Search by employee email
        if (selectedEmployee.email) {
          const emailsToTry = [
            selectedEmployee.email.trim(),
            selectedEmployee.email.trim().toLowerCase()
          ];
          
          for (const emailToTry of emailsToTry) {
            // Try payload->>email
            let { data, error } = await supabase
              .from('applications')
              .select(baseSelect)
              .eq('payload->>email', emailToTry)
              .order('created_at', { ascending: false });
            
            if (!error && data && data.length > 0) {
              applicationsData = data;
              console.log('Found applications by email in payload->>email:', data.length);
              break;
            }
            
            // Try payload->form->>email
            const { data: data2, error: error2 } = await supabase
              .from('applications')
              .select(baseSelect)
              .eq('payload->form->>email', emailToTry)
              .order('created_at', { ascending: false });
            
            if (!error2 && data2 && data2.length > 0) {
              applicationsData = data2;
              console.log('Found applications by email in payload->form->>email:', data2.length);
              break;
            }
            
            // Try payload->applicant->>email
            const { data: data3, error: error3 } = await supabase
              .from('applications')
              .select(baseSelect)
              .eq('payload->applicant->>email', emailToTry)
              .order('created_at', { ascending: false });
            
            if (!error3 && data3 && data3.length > 0) {
              applicationsData = data3;
              console.log('Found applications by email in payload->applicant->>email:', data3.length);
              break;
            }
          }
        }

        // Approach 2: Try employee email (for agency hires where email matches)
        if (!applicationsData || applicationsData.length === 0) {
          const emailsToTry = [
            selectedEmployee.email.trim(),
            selectedEmployee.email.trim().toLowerCase()
          ];
          
          for (const emailToTry of emailsToTry) {
            let { data, error } = await supabase
              .from('applications')
              .select(baseSelect)
              .eq('payload->>email', emailToTry)
              .order('created_at', { ascending: false });
            
            if (!error && data && data.length > 0) {
              applicationsData = data;
              console.log('Found applications by employee email in payload->>email:', data.length);
              break;
            }
            
            const { data: data2, error: error2 } = await supabase
              .from('applications')
              .select(baseSelect)
              .eq('payload->form->>email', emailToTry)
              .order('created_at', { ascending: false });
            
            if (!error2 && data2 && data2.length > 0) {
              applicationsData = data2;
              console.log('Found applications by employee email in payload->form->>email:', data2.length);
              break;
            }
          }
        }

        // Approach 3: Match by name + date proximity and status "hired"
        // This is crucial for direct hires where email doesn't match
        if (!applicationsData || applicationsData.length === 0) {
          console.log('Trying to match by name and date...');
          
          // Get all applications with status "hired" within a reasonable timeframe
          const hiredDateStart = employeeHiredAt 
            ? new Date(new Date(employeeHiredAt).getTime() - 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days before
            : null;
          const hiredDateEnd = employeeHiredAt
            ? new Date(new Date(employeeHiredAt).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days after
            : null;

          let query = supabase
            .from('applications')
            .select(baseSelect)
            .eq('status', 'hired')
            .order('created_at', { ascending: false })
            .limit(500); // Limit to prevent performance issues

          if (hiredDateStart && hiredDateEnd) {
            query = query.gte('created_at', hiredDateStart).lte('created_at', hiredDateEnd);
          }

          const { data: hiredApps, error: hiredAppsError } = await query;

          if (!hiredAppsError && hiredApps && hiredApps.length > 0) {
            // Match by name in payload
            const matchingApps = hiredApps.filter(app => {
              if (!app.payload) return false;
              
              try {
                const payload = typeof app.payload === 'string' ? JSON.parse(app.payload) : app.payload;
                const source = payload.form || payload.applicant || payload || {};
                
                // Extract name from payload
                const appFname = (source.firstName || source.fname || source.first_name || '').toLowerCase().trim();
                const appLname = (source.lastName || source.lname || source.last_name || '').toLowerCase().trim();
                const appFullName = (source.fullName || source.name || '').toLowerCase().trim();
                
                // Match by first and last name
                if (employeeFname && employeeLname && appFname && appLname) {
                  const nameMatch = appFname === employeeFname && appLname === employeeLname;
                  if (nameMatch) {
                    console.log('Matched by name:', { appFname, appLname, employeeFname, employeeLname });
                    return true;
                  }
                }
                
                // Match by full name
                if (employeeName && appFullName) {
                  const normalizedEmpName = employeeName.replace(/\s+/g, ' ').trim();
                  const normalizedAppName = appFullName.replace(/\s+/g, ' ').trim();
                  if (normalizedEmpName === normalizedAppName) {
                    console.log('Matched by full name:', { normalizedEmpName, normalizedAppName });
                    return true;
                  }
                }
                
                return false;
              } catch (err) {
                console.error('Error parsing payload for app:', app.id, err);
                return false;
              }
            });
            
            if (matchingApps.length > 0) {
              applicationsData = matchingApps;
              console.log('Found applications by name matching:', matchingApps.length);
            }
          }
        }

        // Approach 4: Case-insensitive email matching by parsing all recent applications
        if (!applicationsData || applicationsData.length === 0) {
          console.log('Trying case-insensitive email matching...');
          const { data: allApps, error: allAppsError } = await supabase
            .from('applications')
            .select(baseSelect)
            .order('created_at', { ascending: false })
            .limit(1000);
          
          if (!allAppsError && allApps) {
            const matchingApps = allApps.filter(app => {
              if (!app.payload) return false;
              try {
                const payload = typeof app.payload === 'string' ? JSON.parse(app.payload) : app.payload;
                const source = payload.form || payload.applicant || payload || {};
                const appEmail = (source.email || '').trim().toLowerCase();
                return appEmail === employeeEmail && appEmail !== '';
              } catch {
                return false;
              }
            });
            
            if (matchingApps.length > 0) {
              applicationsData = matchingApps;
              console.log('Found applications by case-insensitive email:', matchingApps.length);
            }
          }
        }

        if (applicationsData && applicationsData.length > 0) {
          // Prioritize applications with status "hired" as those are the ones that became employees
          // Sort: hired status first, then by created_at DESC
          const sortedApps = [...applicationsData].sort((a, b) => {
            const aHired = (a.status || '').toLowerCase() === 'hired';
            const bHired = (b.status || '').toLowerCase() === 'hired';
            if (aHired && !bHired) return -1;
            if (!aHired && bHired) return 1;
            // If both have same hired status, sort by date
            return new Date(b.created_at) - new Date(a.created_at);
          });
          
          // Use the prioritized application (preferably hired, otherwise most recent)
          const mostRecentApp = sortedApps[0];
          const jobTitle = mostRecentApp.job_posts?.title || 'N/A';
          const depot = mostRecentApp.job_posts?.depot || 'N/A';
          const date = mostRecentApp.created_at;
          
          // Parse payload to extract assessment and agreement files
          let payloadObj = mostRecentApp.payload;
          if (typeof payloadObj === 'string') {
            try {
              payloadObj = JSON.parse(payloadObj);
            } catch {
              payloadObj = {};
            }
          }
          
          const records = [];
          
          // Assessment Files - from payload.interview_notes_attachments array
          const assessmentAttachments = payloadObj?.interview_notes_attachments || [];
          assessmentAttachments.forEach((attachment, index) => {
            if (attachment && attachment.path) {
              records.push({
                id: `${mostRecentApp.id}-assessment-${index}`,
                type: 'assessment',
                documentName: attachment.label || 'Assessment Document',
                fileName: attachment.originalName || attachment.path.split('/').pop(),
                filePath: attachment.path,
                fileUrl: getFileUrl(attachment.path),
                date: attachment.uploadedAt || date,
                jobTitle: jobTitle,
                depot: depot,
                applicationId: mostRecentApp.id,
                icon: index === 0 ? 'blue' : 'green'
              });
            }
          });
          
          // Fallback: if no assessment attachments in payload, check old columns
          if (assessmentAttachments.length === 0) {
            if (mostRecentApp.interview_details_file) {
              records.push({
                id: `${mostRecentApp.id}-interview-details`,
                type: 'assessment',
                documentName: 'Interview Details',
                fileName: mostRecentApp.interview_details_file.split('/').pop(),
                filePath: mostRecentApp.interview_details_file,
                fileUrl: getFileUrl(mostRecentApp.interview_details_file),
                date: date,
                jobTitle: jobTitle,
                depot: depot,
                applicationId: mostRecentApp.id,
                icon: 'blue'
              });
            }
            
            if (mostRecentApp.assessment_results_file) {
              records.push({
                id: `${mostRecentApp.id}-assessment-results`,
                type: 'assessment',
                documentName: 'In-Person Assessment Results',
                fileName: mostRecentApp.assessment_results_file.split('/').pop(),
                filePath: mostRecentApp.assessment_results_file,
                fileUrl: getFileUrl(mostRecentApp.assessment_results_file),
                date: date,
                jobTitle: jobTitle,
                depot: depot,
                applicationId: mostRecentApp.id,
                icon: 'green'
              });
            }
          }
          
          // Agreement Files - from payload.agreement_documents array
          const agreementDocs = payloadObj?.agreement_documents || [];
          agreementDocs.forEach((doc, index) => {
            if (doc && doc.path) {
              records.push({
                id: `${mostRecentApp.id}-agreement-${index}`,
                type: 'agreement',
                documentName: doc.label || 'Agreement Document',
                fileName: doc.originalName || doc.path.split('/').pop(),
                filePath: doc.path,
                fileUrl: getFileUrl(doc.path),
                date: doc.uploadedAt || date,
                jobTitle: jobTitle,
                depot: depot,
                applicationId: mostRecentApp.id
              });
            }
          });
          
          // Fallback: if no agreement documents in payload, check old columns
          if (agreementDocs.length === 0) {
            const oldAgreementDocs = [
              { key: 'appointment-letter', name: 'Employee Appointment Letter', file: mostRecentApp.appointment_letter_file },
              { key: 'undertaking', name: 'Undertaking', file: mostRecentApp.undertaking_file },
              { key: 'application-form', name: 'Application Form', file: mostRecentApp.application_form_file },
              { key: 'undertaking-duties', name: 'Undertaking of Duties and Responsibilities', file: mostRecentApp.undertaking_duties_file },
              { key: 'pre-employment', name: 'Roadwise Pre Employment Requirements', file: mostRecentApp.pre_employment_requirements_file },
              { key: 'id-form', name: 'ID Form', file: mostRecentApp.id_form_file }
            ];
            
            oldAgreementDocs.forEach(doc => {
              if (doc.file) {
                records.push({
                  id: `${mostRecentApp.id}-${doc.key}`,
                  type: 'agreement',
                  documentName: doc.name,
                  fileName: doc.file.split('/').pop(),
                  filePath: doc.file,
                  fileUrl: getFileUrl(doc.file),
                  date: date,
                  jobTitle: jobTitle,
                  depot: depot,
                  applicationId: mostRecentApp.id
                });
              }
            });
          }
          
          setAssessmentRecords(records);
          console.log('Successfully loaded assessment records:', records.length, 'records');
        } else {
          console.log('No applications found for employee:', {
            email: selectedEmployee.email,
            name: selectedEmployee.name
          });
          setAssessmentRecords([]);
        }
      } catch (err) {
        console.error('Error loading assessment records:', err);
        setAssessmentRecords([]);
      }
    };

    loadAssessmentRecords();
  }, [selectedEmployee?.email, selectedEmployee?.name, selectedEmployee?.hired_at, activeTab]);

  // Fetch application data when employee is selected and Profiling/Documents tabs need it
  useEffect(() => {
    const fetchEmployeeApplication = async () => {
      if (!selectedEmployee || !['profiling', 'documents'].includes(activeTab)) {
        return;
      }

      const primaryEmail = selectedEmployee.email?.trim() || '';
      const secondaryEmail = '';
      const emailCandidates = Array.from(
        new Set([primaryEmail, secondaryEmail].map((e) => String(e || '').trim().toLowerCase()).filter(Boolean))
      );

      const applicantEmail = primaryEmail;
      const employeeEmail = (applicantEmail || '').toLowerCase();
      const employeeName = (selectedEmployee.name || '').toLowerCase();
      const employeeFname = (selectedEmployee.fname || '').toLowerCase();
      const employeeLname = (selectedEmployee.lname || '').toLowerCase();
      const employeeHiredAt = selectedEmployee.hired_at;

      setLoadingApplication(true);
      setLoadingFiles(true);
      try {
        // Fetch application data to get resume, application form, and all application details
        // Try multiple queries to find the application
        let applications = null;
        let error = null;

        // Try querying by email in payload root/form/applicant
        const tryEmail = async (emailValue) => {
          if (!emailValue) return null;

          const { data: a1, error: e1 } = await supabase
            .from('applications')
            .select('id, payload, created_at, status, endorsed')
            .eq('payload->>email', emailValue)
            .order('created_at', { ascending: false })
            .limit(1);
          if (!e1 && a1 && a1.length > 0) return a1;

          const { data: a2, error: e2 } = await supabase
            .from('applications')
            .select('id, payload, created_at, status, endorsed')
            .eq('payload->form->>email', emailValue)
            .order('created_at', { ascending: false })
            .limit(1);
          if (!e2 && a2 && a2.length > 0) return a2;

          const { data: a3, error: e3 } = await supabase
            .from('applications')
            .select('id, payload, created_at, status, endorsed')
            .eq('payload->applicant->>email', emailValue)
            .order('created_at', { ascending: false })
            .limit(1);
          if (!e3 && a3 && a3.length > 0) return a3;

          // return null, but preserve last error for debugging
          error = e3 || e2 || e1 || error;
          return null;
        };

        for (const emailValue of emailCandidates) {
          const found = await tryEmail(emailValue);
          if (found && found.length > 0) {
            applications = found;
            error = null;
            break;
          }
        }

        // Fallback: match application by name/email + date proximity (important for agency hires)
        // NOTE: do NOT require status=hired here; agency endorsement applications may remain submitted.
        if ((!applications || applications.length === 0) && employeeHiredAt) {
          const hiredDateStart = new Date(new Date(employeeHiredAt).getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
          const hiredDateEnd = new Date(new Date(employeeHiredAt).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

          const { data: hiredApps, error: hiredAppsError } = await supabase
            .from('applications')
            .select('id, payload, created_at, status, endorsed')
            .gte('created_at', hiredDateStart)
            .lte('created_at', hiredDateEnd)
            .order('created_at', { ascending: false })
            .limit(500);

          if (!hiredAppsError && hiredApps && hiredApps.length > 0) {
            const pickSource = (payloadObj) => {
              const p = payloadObj && typeof payloadObj === 'object' ? payloadObj : {};
              const formObj = p.form && typeof p.form === 'object' ? p.form : {};
              const applicantObj = p.applicant && typeof p.applicant === 'object' ? p.applicant : {};
              // Merge to cover agency payloads that store fields under applicant
              return { ...formObj, ...applicantObj };
            };

            const matches = hiredApps.filter((app) => {
              if (!app.payload) return false;
              try {
                const payloadObj = typeof app.payload === 'string' ? JSON.parse(app.payload) : app.payload;
                const source = pickSource(payloadObj);

                const appEmail = String(source.email || '').trim().toLowerCase();
                if (emailCandidates.length > 0 && appEmail && emailCandidates.includes(appEmail)) return true;

                const appFname = String(source.firstName || source.fname || source.first_name || '').toLowerCase().trim();
                const appLname = String(source.lastName || source.lname || source.last_name || '').toLowerCase().trim();
                const appFullName = String(source.fullName || source.name || '').toLowerCase().replace(/\s+/g, ' ').trim();
                const normalizedEmpName = employeeName.replace(/\s+/g, ' ').trim();

                if (employeeFname && employeeLname && appFname && appLname) {
                  return employeeFname === appFname && employeeLname === appLname;
                }
                if (normalizedEmpName && appFullName) {
                  return normalizedEmpName === appFullName;
                }
                return false;
              } catch {
                return false;
              }
            });

            if (matches.length > 0) {
              applications = [matches[0]];
              error = null;
            }
          }
        }

        if (error) throw error;

        if (applications && applications.length > 0) {
          const app = applications[0];
          const payload = typeof app.payload === 'string' ? JSON.parse(app.payload) : app.payload;
          const formObj = payload?.form && typeof payload.form === 'object' ? payload.form : {};
          const applicantObj = payload?.applicant && typeof payload.applicant === 'object' ? payload.applicant : {};
          const baseForm = Object.keys(formObj).length || Object.keys(applicantObj).length
            ? { ...formObj, ...applicantObj }
            : (payload || {});

          // Important: for direct applicants the application payload usually looks like:
          // { form: {...}, workExperiences: [...], characterReferences: [...] }
          // so we must merge root fields back in.
          const form = {
            ...baseForm,
            workExperiences:
              payload?.workExperiences ??
              baseForm?.workExperiences ??
              baseForm?.work_experiences ??
              [],
            characterReferences:
              payload?.characterReferences ??
              baseForm?.characterReferences ??
              baseForm?.character_references ??
              [],
          };
          
          // Store full application data
          setApplicationData(form);
          
          // Extract resume
          if (payload.resumePath || payload.resume_path || form.resumePath || form.resume_path) {
            const resumePath = payload.resumePath || payload.resume_path || form.resumePath || form.resume_path;
            const resumeName = payload.resumeName || payload.resume_name || form.resumeName || form.resume_name || 'Resume';
            const { data: urlData } = supabase.storage
              .from('application-files')
              .getPublicUrl(resumePath);
            
            setResumeData({
              name: resumeName,
              url: urlData?.publicUrl || null,
              path: resumePath
            });
          } else {
            setResumeData(null);
          }

          // Extract application form
          if (payload.applicationFormPath || payload.application_form_path || form.applicationFormPath || form.application_form_path) {
            const formPath = payload.applicationFormPath || payload.application_form_path || form.applicationFormPath || form.application_form_path;
            const formName = payload.applicationFormName || payload.application_form_name || form.applicationFormName || form.application_form_name || 'Application Form';
            const { data: urlData } = supabase.storage
              .from('application-files')
              .getPublicUrl(formPath);
            
            setApplicationFormData({
              name: formName,
              url: urlData?.publicUrl || null,
              path: formPath
            });
          } else {
            setApplicationFormData(null);
          }
        } else {
          setResumeData(null);
          setApplicationFormData(null);
          setApplicationData(null);
        }
      } catch (err) {
        console.error('Error fetching employee application:', err);
        setResumeData(null);
        setApplicationFormData(null);
        setApplicationData(null);
      } finally {
        setLoadingFiles(false);
        setLoadingApplication(false);
      }
    };

    fetchEmployeeApplication();
  }, [selectedEmployee, activeTab]);

  // Fetch applicant profile extras (source of truth) for profiling display
  useEffect(() => {
    const fetchApplicantExtras = async () => {
      if (!selectedEmployee || activeTab !== 'profiling') {
        setApplicantExtras({ work_experiences: [], character_references: [] });
        return;
      }

      const applicantEmail = selectedEmployee.email?.trim();
      if (!applicantEmail) {
        setApplicantExtras({ work_experiences: [], character_references: [] });
        return;
      }

      try {
        const { data, error } = await supabase
          .from('applicants')
          .select('work_experiences, character_references')
          .ilike('email', applicantEmail)
          .maybeSingle();

        if (error) {
          console.warn('Error fetching applicant extras:', error);
          setApplicantExtras({ work_experiences: [], character_references: [] });
          return;
        }

        setApplicantExtras({
          work_experiences: Array.isArray(data?.work_experiences) ? data.work_experiences : [],
          character_references: Array.isArray(data?.character_references) ? data.character_references : [],
        });
      } catch (e) {
        console.warn('Unexpected error fetching applicant extras:', e);
        setApplicantExtras({ work_experiences: [], character_references: [] });
      }
    };

    fetchApplicantExtras();
  }, [selectedEmployee, activeTab]);

  // State to trigger onboarding items refresh
  const [onboardingRefreshTrigger, setOnboardingRefreshTrigger] = useState(0);
  const [showConfirmSaveOnboarding, setShowConfirmSaveOnboarding] = useState(false);
  const [showConfirmDeleteOnboarding, setShowConfirmDeleteOnboarding] = useState(false);
  const [onboardingItemToDelete, setOnboardingItemToDelete] = useState(null);
  const [isSavingOnboarding, setIsSavingOnboarding] = useState(false);
  const [isDeletingOnboarding, setIsDeletingOnboarding] = useState(false);
  const [showAddOnboardingModal, setShowAddOnboardingModal] = useState(false);
  const [newOnboardingItem, setNewOnboardingItem] = useState({ item: '', description: '', date: '', file: null });
  const [isSavingNewOnboarding, setIsSavingNewOnboarding] = useState(false);

  // Fetch onboarding items when employee is selected and onboarding tab is active
  useEffect(() => {
    const fetchOnboardingItems = async () => {
      if (!selectedEmployee || activeTab !== 'onboarding') {
        setOnboardingItems([]);
        return;
      }

      try {
        console.log('Fetching onboarding items for employee:', selectedEmployee.id);
        // Check if there's an onboarding table
        const { data: onboardingData, error } = await supabase
          .from('onboarding')
          .select('*')
          .eq('employee_id', selectedEmployee.id)
          .order('date_issued', { ascending: false });

        if (error) {
          // If table doesn't exist or error, check if it's stored in employees table
          console.error('Onboarding fetch error:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          setOnboardingItems([]);
          return;
        }

        console.log('Fetched onboarding items:', onboardingData?.length || 0, 'items');

        if (onboardingData && onboardingData.length > 0) {
          const items = onboardingData.map(item => ({
            id: item.id,
            item: item.item || item.name || '',
            description: item.description || '',
            date: item.date_issued || item.date || '',
            file: item.file_path || item.filePath || null,
            filePath: item.file_path || item.filePath || null,
            fileUrl: item.file_path || item.filePath ? (() => {
              const { data } = supabase.storage
                .from('application-files')
                .getPublicUrl(item.file_path || item.filePath);
              return data?.publicUrl || null;
            })() : null,
            isNew: false
          }));
          console.log('Mapped items:', items);
          setOnboardingItems(items);
        } else {
          setOnboardingItems([]);
        }
      } catch (err) {
        console.error('Error fetching onboarding items:', err);
        setOnboardingItems([]);
      }
    };

    fetchOnboardingItems();
  }, [selectedEmployee, activeTab, onboardingRefreshTrigger]);

  // Fetch evaluation records when employee is selected and evaluation tab is active
  useEffect(() => {
    const fetchEvaluationDocs = async () => {
      if (!selectedEmployee || activeTab !== 'evaluation') {
        setEvaluationDocs([]);
        return;
      }

      try {
        const { data: evaluationsData, error } = await supabase
          .from('evaluations')
          .select('*')
          .eq('employee_id', selectedEmployee.id)
          .order('date_evaluated', { ascending: false });

        if (error) {
          console.error('Error fetching evaluations:', error);
          setEvaluationDocs([]);
          return;
        }

        if (evaluationsData && evaluationsData.length > 0) {
          const docs = evaluationsData.map(ev => {
            const filePath = ev.file_path;
            let fileUrl = null;
            let fileName = null;
            
            if (filePath) {
              const { data: urlData } = supabase.storage
                .from('application-files')
                .getPublicUrl(filePath);
              fileUrl = urlData?.publicUrl || null;
              // Use original_filename if available, otherwise fall back to extracting from path
              fileName = ev.original_filename || filePath.split('/').pop() || 'evaluation.pdf';
            }

            return {
              id: ev.id,
              name: "Evaluation",
              file: filePath ? { name: fileName } : null,
              url: fileUrl,
              date: ev.date_evaluated ? new Date(ev.date_evaluated).toISOString().split('T')[0] : null,
              remarks: ev.remarks || "Select",
              employeeType: ev.type || "Select",
              locked: ev.locked || false
            };
          });
          setEvaluationDocs(docs);
        } else {
          setEvaluationDocs([]);
        }
      } catch (err) {
        console.error('Error fetching evaluation docs:', err);
        setEvaluationDocs([]);
      }
    };

    fetchEvaluationDocs();
  }, [selectedEmployee, activeTab]);

  // Tab definitions for detail view
  const detailTabs = [
    { key: 'profiling', label: 'Profiling' },
    { key: 'documents', label: 'Documents' },
    { key: 'onboarding', label: 'Onboarding' },
    { key: 'evaluation', label: 'Evaluation' },
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
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="w-full py-4 flex flex-col flex-1">
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
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex-shrink-0 relative z-20">
              <div className="flex flex-col gap-3">
                {/* Search */}
                <div className="relative">
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

                {/* Filters row (below search, uniform with HrRecruitment) */}
                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${currentUser?.role?.toUpperCase() === 'HRC' ? 'xl:grid-cols-[repeat(5,minmax(0,1fr))_auto]' : 'xl:grid-cols-[repeat(6,minmax(0,1fr))_auto]'} gap-2 items-center`}>
                  {/* Depot Filter - Hidden for HRC users */}
                  {currentUser?.role?.toUpperCase() !== 'HRC' && (
                    <select
                      value={depotFilter}
                      onChange={(e) => setDepotFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                    >
                      <option value="All">All Depots</option>
                      {depotOptions.filter(d => d !== "All").map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  )}

                  {/* Department Filter */}
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                  >
                    <option value="All">All Departments</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>

                  {/* Position Filter */}
                  <select
                    value={positionFilter}
                    onChange={(e) => setPositionFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                  >
                    <option value="All">All Positions</option>
                    {positions.filter(p => p !== "All").map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>

                  {/* Employment Status */}
                  <select
                    value={employmentStatusFilter}
                    onChange={(e) => setEmploymentStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                  >
                    <option value="All">Employment Status</option>
                    {employmentStatuses.filter((s) => s !== "All").map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>

                  {/* Recruitment Type */}
                  <select
                    value={recruitmentTypeFilter}
                    onChange={(e) => setRecruitmentTypeFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                  >
                    <option value="All">All Recruitment Type</option>
                    {recruitmentTypes.filter((t) => t !== "All").map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>

                  {/* Sort */}
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    aria-label="Sort"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                  >
                    <option value="name-asc">Alphabetically (A → Z)</option>
                    <option value="name-desc">Alphabetically (Z → A)</option>
                    <option value="hired-asc">Date Hired (Oldest → Newest)</option>
                    <option value="hired-desc">Date Hired (Newest → Oldest)</option>
                  </select>

                  {/* Export Button */}
                  <div className="relative" ref={exportMenuRef}>
                    <button
                      type="button"
                      onClick={() => setShowExportMenu((prev) => !prev)}
                      className="w-full sm:w-auto px-4 py-2 border border-gray-200 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2 bg-white"
                      title="Export the currently filtered list"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export
                    </button>

                    {showExportMenu && (
                      <div className="absolute right-0 mt-2 w-44 bg-white border rounded-lg shadow-lg z-50 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            setShowExportMenu(false);
                            exportEmployeesPdf(filtered, "Employees");
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50"
                        >
                          Export list as PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowExportMenu(false);
                            exportEmployeesExcel(filtered, "Employees");
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50"
                        >
                          Export list as Excel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
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
                    <div className={`${selectedEmployee ? 'lg:w-[35%] max-h-[35vh] lg:max-h-none' : 'w-full'} overflow-x-auto overflow-y-auto no-scrollbar min-h-0`}>
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                            {!selectedEmployee && (
                              <>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Position / Dept</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Depot</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filtered.map((emp) => {
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
                                <td className={`px-6 py-4 ${isSelected ? 'border-l-4 border-red-600' : ''}`}>
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(emp.name)} flex items-center justify-center text-white text-sm font-medium shadow-sm`}>
                                      {getInitials(emp.name)}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-gray-800">{emp.name}</p>
                                        {emp.agency && (
                                          <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                                            {emp.agency_name || "AGENCY"}
                                          </span>
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
                                      <p className="text-xs text-gray-500">{emp.department || "—"}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                      <p className="text-sm text-gray-800">{emp.depot || "—"}</p>
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
                      <div className="lg:w-[65%] flex-1 min-h-0 overflow-hidden flex flex-col">
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
                                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                    {selectedEmployee.agency_name || "AGENCY"}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">#{selectedEmployee.id.slice(0, 8)}</p>
                              <p className="text-sm text-gray-600">{selectedEmployee.position || "—"} | {selectedEmployee.depot || "—"}</p>
                            </div>


                          </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-gray-300 bg-white overflow-x-auto flex-shrink-0">
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
                        <div className="bg-white border border-t-0 border-gray-300 rounded-b-lg p-6 flex-1 overflow-y-auto min-h-0">
                          
                          {/* PROFILING TAB */}
                          {activeTab === 'profiling' && (
                            <div className="space-y-4">
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Job Details</h5>
                                <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                  <div>
                                    <span className="text-gray-500">Position:</span>
                                    <span className="ml-2 text-gray-800">{selectedEmployee.position || "None"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Department:</span>
                                    <span className="ml-2 text-gray-800">{selectedEmployee.department || getDepartmentForPosition(selectedEmployee.position) || "None"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Depot:</span>
                                    <span className="ml-2 text-gray-800">{selectedEmployee.depot || "None"}</span>
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
                                <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                  <div>
                                    <span className="text-gray-500">Full Name:</span>
                                    <span className="ml-2 text-gray-800">
                                      {(() => {
                                        const first = applicationData?.firstName || selectedEmployee.fname || "";
                                        const middle = applicationData?.middleName || selectedEmployee.mname || "";
                                        const last = applicationData?.lastName || selectedEmployee.lname || "";
                                        return (
                                          formatNameLastFirstMiddle({ last, first, middle }) ||
                                          [first, middle, last].filter(Boolean).join(" ") ||
                                          "None"
                                        );
                                      })()}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Email:</span>
                                    <span className="ml-2 text-gray-800">
                                      {applicationData?.email ||
                                        selectedEmployee.email ||
                                        "None"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Contact Number:</span>
                                    <span className="ml-2 text-gray-800">
                                      {applicationData?.contact ||
                                        applicationData?.contactNumber ||
                                        applicationData?.contact_number ||
                                        applicationData?.phone ||
                                        applicationData?.mobile ||
                                        applicationData?.mobileNumber ||
                                        applicationData?.mobile_number ||
                                        selectedEmployee.contact ||
                                        "None"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Birthday:</span>
                                    <span className="ml-2 text-gray-800">
                                      {(() => {
                                        const b = applicationData?.birthday || applicationData?.birth_date || applicationData?.dateOfBirth;
                                        return b
                                          ? new Date(b).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                                          : "None";
                                      })()}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Age:</span>
                                    <span className="ml-2 text-gray-800">
                                      {(() => {
                                        const b = applicationData?.birthday || applicationData?.birth_date || applicationData?.dateOfBirth;
                                        const age = calculateAge(b);
                                        return age === null ? "None" : age;
                                      })()}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Sex:</span>
                                    <span className="ml-2 text-gray-800">{applicationData?.sex || "None"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Marital Status:</span>
                                    <span className="ml-2 text-gray-800">{applicationData?.marital_status || applicationData?.maritalStatus || "None"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Source:</span>
                                    <span className="ml-2 text-gray-800">{selectedEmployee.agency ? "Agency" : "Direct Hire"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Currently Employed:</span>
                                    <span className="ml-2 text-gray-800">{applicationData?.employed || "None"}</span>
                                  </div>
                                </div>
                              </div>

                              {applicationData && (
                                applicationData.street ||
                                applicationData.barangay ||
                                applicationData.city ||
                                applicationData.zip ||
                                applicationData.currentAddress ||
                                applicationData.current_address ||
                                applicationData.presentAddress ||
                                applicationData.present_address ||
                                applicationData.fullAddress ||
                                applicationData.full_address ||
                                applicationData.address
                              ) && (
                                <div>
                                  <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Address</h5>
                                  <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 grid grid-cols-1 gap-y-2">
                                    <div>
                                      <span className="text-gray-500">Full Address:</span>
                                      <span className="ml-2 text-gray-800">{formatFullAddressOneLine(applicationData) || "None"}</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {applicationData && (
                                applicationData.edu1Institution ||
                                applicationData.edu2Institution ||
                                applicationData.skills ||
                                applicationData.skills_text ||
                                applicationData.educationalLevel ||
                                applicationData.educationLevel ||
                                applicationData.education ||
                                applicationData.schoolInstitution ||
                                applicationData.school ||
                                applicationData.tertiarySchool ||
                                applicationData.tertiaryProgram ||
                                applicationData.courseProgram ||
                                applicationData.course_program ||
                                applicationData.yearGraduated ||
                                applicationData.year_graduated ||
                                applicationData.tertiaryYear
                              ) && (
                                <div>
                                  <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Education & Skills</h5>
                                  <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800">
                                    {(() => {
                                      const level =
                                        applicationData.edu1Level ||
                                        applicationData.educationalLevel ||
                                        applicationData.educationLevel ||
                                        applicationData.education ||
                                        null;
                                      const institution =
                                        applicationData.edu1Institution ||
                                        applicationData.schoolInstitution ||
                                        applicationData.school ||
                                        applicationData.tertiarySchool ||
                                        null;
                                      const year =
                                        applicationData.edu1Year ||
                                        applicationData.yearGraduated ||
                                        applicationData.year_graduated ||
                                        applicationData.tertiaryYear ||
                                        null;
                                      const course =
                                        applicationData.edu1Course ||
                                        applicationData.edu1Program ||
                                        applicationData.courseProgram ||
                                        applicationData.course_program ||
                                        applicationData.tertiaryProgram ||
                                        null;

                                      const skillsVal = applicationData.skills;
                                      const skillsText = Array.isArray(skillsVal)
                                        ? skillsVal
                                            .filter(Boolean)
                                            .map((s) => (typeof s === 'string' ? s.trim() : String(s).trim()))
                                            .filter(Boolean)
                                            .join(', ')
                                        : typeof skillsVal === 'string'
                                          ? skillsVal.trim()
                                          : '';
                                      const skillsTextFinal = skillsText || (applicationData.skills_text ? String(applicationData.skills_text).trim() : '');

                                      const hasEducation = Boolean(String(level || '').trim() || String(institution || '').trim() || String(year || '').trim() || String(course || '').trim());

                                      return (
                                        <>
                                          <div className="font-medium text-gray-700 mb-2">Highest Educational Attainment:</div>
                                          <div className="grid grid-cols-1 md:grid-cols-4 gap-x-8 gap-y-2 mb-4">
                                            <div>
                                              <span className="text-gray-500">Educational Level:</span>
                                              <span className="ml-2 text-gray-800">{hasEducation && level ? String(level) : <span className="text-gray-500 italic">None</span>}</span>
                                            </div>
                                            <div>
                                              <span className="text-gray-500">Year Graduated:</span>
                                              <span className="ml-2 text-gray-800">{hasEducation && year ? String(year) : <span className="text-gray-500 italic">None</span>}</span>
                                            </div>
                                            <div className="md:col-span-2">
                                              <span className="text-gray-500">School/Institution:</span>
                                              <span className="ml-2 text-gray-800">{hasEducation && institution ? String(institution) : <span className="text-gray-500 italic">None</span>}</span>
                                            </div>
                                            <div className="md:col-span-2">
                                              <span className="text-gray-500">Course/Program:</span>
                                              <span className="ml-2 text-gray-800">{hasEducation && course ? String(course) : <span className="text-gray-500 italic">None</span>}</span>
                                            </div>
                                          </div>

                                          <div>
                                            <span className="text-gray-500">Skills:</span>
                                            <span className="ml-2 text-gray-800">{skillsTextFinal || <span className="text-gray-500 italic">None</span>}</span>
                                          </div>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                              )}

                              {!selectedEmployee?.agency && (
                                <div>
                                  <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Work Experience</h5>
                                  <div className="space-y-3 text-sm">
                                    {(() => {
                                      const rawFromApplication = Array.isArray(applicationData?.workExperiences)
                                        ? applicationData.workExperiences
                                        : [];
                                      const rawFromProfile = Array.isArray(applicantExtras?.work_experiences)
                                        ? applicantExtras.work_experiences
                                        : [];
                                      const raw = rawFromApplication.length > 0 ? rawFromApplication : rawFromProfile;
                                      const display = raw.length > 0 ? raw : [{}];

                                      return display.map((exp, idx) => {
                                        const company = exp?.company || '';
                                        const role = exp?.position || exp?.role || exp?.title || '';
                                        const period =
                                          exp?.period ||
                                          exp?.date ||
                                          exp?.year ||
                                          (exp?.startDate || exp?.endDate ? `${exp?.startDate || ''}${exp?.startDate && exp?.endDate ? ' - ' : ''}${exp?.endDate || ''}` : '') ||
                                          '';
                                        const details = exp?.reason || exp?.description || exp?.remarks || '';

                                        return (
                                          <div key={idx} className="border border-gray-200 rounded-lg p-3">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                              <div>
                                                <span className="text-gray-500">Company:</span>
                                                <span className="ml-2 text-gray-800">{company}</span>
                                              </div>
                                              <div>
                                                <span className="text-gray-500">Role/Title:</span>
                                                <span className="ml-2 text-gray-800">{role}</span>
                                              </div>
                                              <div className="md:col-span-2">
                                                <span className="text-gray-500">Period:</span>
                                                <span className="ml-2 text-gray-800">{period}</span>
                                              </div>
                                              <div className="md:col-span-2">
                                                <span className="text-gray-500">Details:</span>
                                                <span className="ml-2 text-gray-800">{details}</span>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      });
                                    })()}
                                  </div>
                                </div>
                              )}

                              {!selectedEmployee?.agency && (
                                <div>
                                  {(() => {
                                    const rawFromApplication = Array.isArray(applicationData?.characterReferences)
                                      ? applicationData.characterReferences
                                      : [];
                                    const rawFromProfile = Array.isArray(applicantExtras?.character_references)
                                      ? applicantExtras.character_references
                                      : [];
                                    const raw = rawFromApplication.length > 0 ? rawFromApplication : rawFromProfile;
                                    const hasAnyValue = (ref) => {
                                      if (!ref || typeof ref !== 'object') return false;
                                      const fields = [
                                        ref.name,
                                        ref.fullName,
                                        ref.contact,
                                        ref.contactNumber,
                                        ref.phone,
                                        ref.relationship,
                                      ];
                                      return fields.some((v) => String(v || '').trim().length > 0);
                                    };

                                    const displayRefs = raw.filter(hasAnyValue);
                                    const isEmpty = displayRefs.length === 0;

                                    return (
                                      <>
                                        <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded flex items-center justify-between">
                                          <span>Character References</span>
                                          {isEmpty && <span className="text-xs text-gray-500 italic">None</span>}
                                        </h5>
                                        <div className="space-y-3 text-sm">
                                          {isEmpty ? (
                                            <div className="border border-gray-200 rounded-lg p-3 text-gray-400 italic">None</div>
                                          ) : (
                                            displayRefs.map((ref, idx) => {
                                              const name = ref?.name || ref?.fullName || '';
                                              const contact = ref?.contact || ref?.contactNumber || ref?.phone || '';
                                              const relationship = ref?.relationship || '';

                                              return (
                                                <div key={idx} className="border border-gray-200 rounded-lg p-3">
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    <div>
                                                      <span className="text-gray-500">Name:</span>
                                                      <span className="ml-2 text-gray-800">{name}</span>
                                                    </div>
                                                    <div>
                                                      <span className="text-gray-500">Contact:</span>
                                                      <span className="ml-2 text-gray-800">{contact}</span>
                                                    </div>
                                                    <div className="md:col-span-2">
                                                      <span className="text-gray-500">Relationship:</span>
                                                      <span className="ml-2 text-gray-800">{relationship}</span>
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })
                                          )}
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                              )}

                              {/* Medical Information (ALL positions) */}
                              {(() => {
                                const yesNo = (v) => {
                                  if (v === true) return 'Yes';
                                  if (v === false) return 'No';
                                  if (typeof v === 'string') {
                                    const s = v.toLowerCase().trim();
                                    if (s === 'yes' || s === 'y' || s === 'true') return 'Yes';
                                    if (s === 'no' || s === 'n' || s === 'false') return 'No';
                                  }
                                  return null;
                                };

                                const fmtDate = (v) => {
                                  if (!v) return null;
                                  try {
                                    const d = new Date(v);
                                    if (Number.isNaN(d.getTime())) return String(v);
                                    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                                  } catch {
                                    return String(v);
                                  }
                                };

                                const takingMedications =
                                  applicationData?.takingMedications ??
                                  applicationData?.taking_medications ??
                                  applicationData?.medications ??
                                  null;
                                const medicationReason =
                                  applicationData?.medicationReason ||
                                  applicationData?.medication_reason ||
                                  null;
                                const tookMedicalTest =
                                  applicationData?.tookMedicalTest ??
                                  applicationData?.took_medical_test ??
                                  null;
                                const medicalTestDate =
                                  applicationData?.medicalTestDate ||
                                  applicationData?.medical_test_date ||
                                  null;

                                const agencyMedical = driverExtraInfo.medicalInfo;
                                const hasAgencyMedical = !!selectedEmployee?.agency && !!agencyMedical;

                                return (
                                  <div>
                                    <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Medical Information</h5>
                                    <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                      <div>
                                        <span className="text-gray-500">Taking Medications:</span>
                                        <span className="ml-2">{yesNo(takingMedications) ?? <span className="text-gray-400 italic">None</span>}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Medication Reason:</span>
                                        <span className="ml-2">{medicationReason ? <span className="text-gray-800">{medicationReason}</span> : <span className="text-gray-400 italic">None</span>}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Has Taken Medical Test:</span>
                                        <span className="ml-2">{yesNo(tookMedicalTest) ?? <span className="text-gray-400 italic">None</span>}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Medical Test Date:</span>
                                        <span className="ml-2">
                                          {fmtDate(medicalTestDate)
                                            ? <span className="text-gray-800">{fmtDate(medicalTestDate)}</span>
                                            : <span className="text-gray-400 italic">None</span>}
                                        </span>
                                      </div>
                                    </div>

                                    {hasAgencyMedical && (
                                      <div className="mt-3 border border-gray-200 rounded-lg p-3 text-sm text-gray-800">
                                        <div className="text-xs font-semibold text-gray-600 mb-2">Additional Medical Details</div>
                                        {loadingDriverInfo ? (
                                          <span className="text-gray-400">Loading…</span>
                                        ) : (
                                          <pre className="whitespace-pre-wrap break-words text-xs text-gray-700">
                                            {typeof agencyMedical === 'string'
                                              ? agencyMedical
                                              : JSON.stringify(agencyMedical, null, 2)}
                                          </pre>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              {(() => {
                                const positionText =
                                  selectedEmployee?.position ||
                                  selectedEmployee?.job_title ||
                                  selectedEmployee?.jobTitle ||
                                  selectedEmployee?.role ||
                                  applicationData?.position ||
                                  applicationData?.positionApplied ||
                                  applicationData?.position_applied ||
                                  applicationData?.jobTitle ||
                                  applicationData?.job_title ||
                                  '';
                                const isDriver = isDriverRole(positionText);
                                const hasLicenseFields =
                                  !!(applicationData && (applicationData.licenseType || applicationData.licenseExpiry));

                                if (!isDriver && !hasLicenseFields) return null;

                                const renderNone = () => <span className="text-gray-400 italic">None</span>;
                                const displayYesNo = (v) => {
                                  if (v === true) return 'Yes';
                                  if (v === false) return 'No';
                                  if (typeof v === 'string') {
                                    const s = v.toLowerCase().trim();
                                    if (s === 'yes' || s === 'y' || s === 'true') return 'Yes';
                                    if (s === 'no' || s === 'n' || s === 'false') return 'No';
                                  }
                                  return null;
                                };

                                const displayDate = (v) => {
                                  if (!v) return renderNone();
                                  try {
                                    const d = new Date(v);
                                    if (Number.isNaN(d.getTime())) return <span className="text-gray-800">{String(v)}</span>;
                                    return (
                                      <span className="text-gray-800">
                                        {d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                      </span>
                                    );
                                  } catch {
                                    return <span className="text-gray-800">{String(v)}</span>;
                                  }
                                };

                                const displayValue = (v) => {
                                  if (v === null || v === undefined) return renderNone();
                                  if (typeof v === 'string') {
                                    const s = v.trim();
                                    return s ? <span className="text-gray-800">{s}</span> : renderNone();
                                  }
                                  if (Array.isArray(v)) {
                                    const list = v
                                      .filter(Boolean)
                                      .map((x) => String(x).trim())
                                      .filter(Boolean);
                                    return list.length ? (
                                      <div className="ml-2 mt-1 flex flex-wrap gap-2">
                                        {list.map((item, idx) => (
                                          <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-gray-800 text-sm">
                                            {item}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="ml-2">{renderNone()}</span>
                                    );
                                  }
                                  return <span className="text-gray-800">{String(v)}</span>;
                                };

                                const licenseClassification =
                                  applicationData?.licenseClassification ||
                                  applicationData?.license_classification ||
                                  applicationData?.licenseType ||
                                  applicationData?.license_type ||
                                  null;
                                const licenseExpiry =
                                  applicationData?.licenseExpiry ||
                                  applicationData?.license_expiry ||
                                  applicationData?.licenseExpiryDate ||
                                  applicationData?.license_expiry_date ||
                                  null;
                                const restrictionCodes =
                                  applicationData?.restrictionCodes ||
                                  applicationData?.restriction_codes ||
                                  applicationData?.restrictions ||
                                  null;

                                const parseObj = (v) => {
                                  if (!v) return null;
                                  if (typeof v === 'object') return v;
                                  if (typeof v === 'string') {
                                    const s = v.trim();
                                    if (!s) return null;
                                    try {
                                      return JSON.parse(s);
                                    } catch {
                                      return null;
                                    }
                                  }
                                  return null;
                                };

                                const drivingHistoryObj =
                                  parseObj(driverExtraInfo?.drivingHistory) ||
                                  parseObj(applicationData?.drivingHistory) ||
                                  parseObj(applicationData?.driving_history) ||
                                  null;

                                const yearsDriving =
                                  drivingHistoryObj?.yearsDriving ||
                                  drivingHistoryObj?.years_driving ||
                                  applicationData?.yearsDriving ||
                                  applicationData?.years_driving ||
                                  null;
                                const truckKnowledge =
                                  drivingHistoryObj?.truckKnowledge ||
                                  drivingHistoryObj?.truck_knowledge ||
                                  drivingHistoryObj?.truckKnowledgeYn ||
                                  applicationData?.truckKnowledge ||
                                  applicationData?.truck_knowledge ||
                                  null;
                                const vehicleTypes =
                                  drivingHistoryObj?.vehicleTypes ||
                                  drivingHistoryObj?.vehicle_types ||
                                  applicationData?.vehicleTypes ||
                                  applicationData?.vehicle_types ||
                                  null;
                                const troubleshootingTasks =
                                  drivingHistoryObj?.troubleshootingTasks ||
                                  drivingHistoryObj?.troubleshooting_tasks ||
                                  applicationData?.troubleshootingTasks ||
                                  applicationData?.troubleshooting_tasks ||
                                  null;

                                const hasDrivingHistoryData = !!(
                                  yearsDriving ||
                                  truckKnowledge !== null ||
                                  (Array.isArray(vehicleTypes) ? vehicleTypes.filter(Boolean).length > 0 : vehicleTypes) ||
                                  (Array.isArray(troubleshootingTasks) ? troubleshootingTasks.filter(Boolean).length > 0 : troubleshootingTasks)
                                );
                                const shouldShowDrivingHistory = isDriverRole(positionText) || hasDrivingHistoryData;

                                const jobTitleText =
                                  applicationData?.job_posts?.title ||
                                  applicationData?.jobTitle ||
                                  applicationData?.job_title ||
                                  '';
                                const isDriverLikeRole =
                                  isDriverRole(positionText) ||
                                  isDeliveryCrewRole(positionText) ||
                                  isDeliveryCrewRole(jobTitleText);

                                const hasLicenseData = !!(
                                  licenseClassification ||
                                  licenseExpiry ||
                                  (Array.isArray(restrictionCodes) && restrictionCodes.filter(Boolean).length > 0) ||
                                  driverLicense?.photocopyUrl ||
                                  driverLicense?.frontUrl ||
                                  driverLicense?.backUrl
                                );

                                const shouldShowLicenseInfo = isDriverLikeRole || hasLicenseData;

                                return (
                                  <>
                                    {shouldShowLicenseInfo && (
                                      <div>
                                        <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">License Information</h5>
                                        <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800">
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                            <div>
                                              <span className="text-gray-500">License Classification:</span>
                                              <span className="ml-2">{licenseClassification ? displayValue(licenseClassification) : renderNone()}</span>
                                            </div>
                                            <div>
                                              <span className="text-gray-500">License Expiry Date:</span>
                                              <span className="ml-2">{displayDate(licenseExpiry)}</span>
                                            </div>
                                            {Array.isArray(restrictionCodes) && restrictionCodes.filter(Boolean).length > 0 && (
                                              <div className="md:col-span-2">
                                                <span className="text-gray-500">Restriction Codes:</span>
                                                {displayValue(restrictionCodes)}
                                              </div>
                                            )}
                                          </div>

                                          {isDriverLikeRole && (
                                            <div className="mt-4 pt-4 border-t border-gray-200">
                                              <div className="text-xs font-semibold text-gray-600 mb-2">Photocopy of License</div>
                                              {(() => {
                                                const isPdfUrl = (url) => /\.pdf($|\?|#)/i.test(String(url || ''));
                                                const isImageUrl = (url) => /\.(png|jpe?g|webp|gif)($|\?|#)/i.test(String(url || ''));

                                                if (loadingDriverInfo) {
                                                  return <div className="text-xs text-gray-400">Loading…</div>;
                                                }

                                                if (driverLicense.photocopyUrl) {
                                                  const url = driverLicense.photocopyUrl;
                                                  return (
                                                    <div className="space-y-3">
                                                      <div>
                                                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                                                          Open
                                                        </a>
                                                      </div>
                                                      {isImageUrl(url) ? (
                                                        <a href={url} target="_blank" rel="noopener noreferrer">
                                                          <img src={url} alt="License Photocopy" className="w-full max-h-[420px] object-contain bg-gray-50 rounded" />
                                                        </a>
                                                      ) : isPdfUrl(url) ? (
                                                        <iframe title="License Photocopy" src={url} className="w-full h-[420px] rounded bg-gray-50 border" />
                                                      ) : (
                                                        <div className="text-xs text-gray-400">Preview unavailable. Use Open.</div>
                                                      )}
                                                    </div>
                                                  );
                                                }

                                                const hasAny = !!(driverLicense.frontUrl || driverLicense.backUrl);
                                                if (!hasAny) return <div className="text-xs text-gray-400 italic">None</div>;

                                                return (
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="border border-gray-200 rounded-lg p-3">
                                                      <div className="text-xs font-semibold text-gray-600 mb-2">License (Front)</div>
                                                      {driverLicense.frontUrl ? (
                                                        <a href={driverLicense.frontUrl} target="_blank" rel="noopener noreferrer">
                                                          <img
                                                            src={driverLicense.frontUrl}
                                                            alt="Driver's License Front"
                                                            className="w-full h-40 object-contain bg-gray-50 rounded"
                                                          />
                                                        </a>
                                                      ) : (
                                                        <div className="text-xs text-gray-400 italic">None</div>
                                                      )}
                                                    </div>
                                                    <div className="border border-gray-200 rounded-lg p-3">
                                                      <div className="text-xs font-semibold text-gray-600 mb-2">License (Back)</div>
                                                      {driverLicense.backUrl ? (
                                                        <a href={driverLicense.backUrl} target="_blank" rel="noopener noreferrer">
                                                          <img
                                                            src={driverLicense.backUrl}
                                                            alt="Driver's License Back"
                                                            className="w-full h-40 object-contain bg-gray-50 rounded"
                                                          />
                                                        </a>
                                                      ) : (
                                                        <div className="text-xs text-gray-400 italic">None</div>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })()}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {shouldShowDrivingHistory && (
                                      <div>
                                        <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Driving History</h5>
                                        <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                                          <div>
                                            <span className="text-gray-500">Years of Driving Experience:</span>
                                            <span className="ml-2">{yearsDriving ? displayValue(yearsDriving) : renderNone()}</span>
                                          </div>
                                          <div>
                                            <span className="text-gray-500">Has Truck Troubleshooting Knowledge:</span>
                                            <span className="ml-2">{displayYesNo(truckKnowledge) ?? renderNone()}</span>
                                          </div>
                                          <div className="md:col-span-2">
                                            <span className="text-gray-500">Vehicles Driven:</span>
                                            {vehicleTypes ? displayValue(vehicleTypes) : <span className="ml-2">{renderNone()}</span>}
                                          </div>
                                          {troubleshootingTasks && Array.isArray(troubleshootingTasks) && troubleshootingTasks.filter(Boolean).length > 0 && (
                                            <div className="md:col-span-2">
                                              <span className="text-gray-500">Troubleshooting Capabilities:</span>
                                              {displayValue(troubleshootingTasks)}
                                            </div>
                                          )}
                                          {!hasDrivingHistoryData && (
                                            <div className="md:col-span-2 text-gray-400 italic">None</div>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                  </>
                                );
                              })()}

                              {applicationData && (applicationData.startDate || applicationData.heardFrom || applicationData.preferred_depot) && (
                                <div>
                                  <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Application Details</h5>
                                  <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                    {applicationData.startDate && (
                                      <div>
                                        <span className="text-gray-500">Preferred Start Date:</span>
                                        <span className="ml-2 text-gray-800">
                                          {new Date(applicationData.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                        </span>
                                      </div>
                                    )}
                                    {applicationData.heardFrom && (
                                      <div>
                                        <span className="text-gray-500">How did you hear about us:</span>
                                        <span className="ml-2 text-gray-800">{applicationData.heardFrom}</span>
                                      </div>
                                    )}
                                    {applicationData.preferred_depot && (
                                      <div>
                                        <span className="text-gray-500">Preferred Depot:</span>
                                        <span className="ml-2 text-gray-800">{applicationData.preferred_depot}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Files</h5>
                                <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                  <div>
                                    <span className="text-gray-500">Resume:</span>
                                    {resumeData && resumeData.url ? (
                                      <a 
                                        href={resumeData.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="ml-2 text-blue-600 hover:underline"
                                      >
                                        View File
                                      </a>
                                    ) : (
                                      <span className="ml-2 text-gray-400 italic">No file</span>
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-gray-500"></span>
                                    {applicationFormData && applicationFormData.url ? (
                                      <a 
                                        href={applicationFormData.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="ml-2 text-blue-600 hover:underline"
                                      >
                                        View File
                                      </a>
                                    ) : (
                                      <span className="ml-2 text-gray-400 italic"></span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* External Certificates Section */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">External Certificates</h5>
                                <div className="border border-gray-200 rounded-lg p-4">
                                  {loadingCertificates ? (
                                    <div className="text-center py-8">
                                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                      </div>
                                      <p className="text-sm text-gray-600 font-medium">Loading certificates...</p>
                                    </div>
                                  ) : externalCertificates.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-3">
                                      {externalCertificates.map((cert) => (
                                        <div 
                                          key={cert.id} 
                                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-all"
                                        >
                                          <svg className="w-5 h-5 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                          </svg>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 truncate">
                                              {cert.title || cert.name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                              {cert.title && cert.name !== cert.title && (
                                                <span className="text-gray-400">{cert.name} • </span>
                                              )}
                                              {formatDate(cert.uploaded_at)}
                                            </p>
                                          </div>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              window.open(cert.certificate_url, '_blank');
                                            }}
                                            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                                            title="View certificate"
                                          >
                                            View
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-center py-8">
                                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                      </div>
                                      <p className="text-sm text-gray-600 font-medium">No external certificates uploaded</p>
                                      <p className="text-xs text-gray-500 mt-1">Employee-uploaded certifications will appear here</p>
                                    </div>
                                  )}
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

                              {loadingDocuments ? (
                                <div className="text-center py-8 text-gray-500">Loading documents...</div>
                              ) : (
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
                                      {employeeDocuments.length === 0 ? (
                                        <tr>
                                          <td colSpan="3" className="px-4 py-8 text-center text-gray-500">
                                            No documents found
                                          </td>
                                        </tr>
                                      ) : (
                                        employeeDocuments.map((doc) => {
                                          const displayStatus = doc.status || (doc.file ? "Submitted" : "Missing");
                                          const badgeClass =
                                            displayStatus === "Submitted" ? "bg-orange-100 text-orange-700" :
                                            displayStatus === "Re-submit" ? "bg-red-100 text-red-700" :
                                            displayStatus === "Validated" ? "bg-green-100 text-green-700" :
                                            "bg-gray-100 text-gray-600";
                                          
                                          return (
                                            <tr key={doc.id} className="hover:bg-gray-50/50">
                                              <td className="px-4 py-3 text-gray-800">{doc.name}</td>
                                              <td className="px-4 py-3">
                                                {doc.file ? (
                                                  <a 
                                                    href={doc.previewUrl || "#"} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="text-blue-600 hover:underline"
                                                  >
                                                    {doc.file.name}
                                                  </a>
                                                ) : (
                                                  <span className="text-gray-400 italic">No file</span>
                                                )}
                                              </td>
                                              <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${badgeClass}`}>
                                                  {displayStatus}
                                                </span>
                                              </td>
                                            </tr>
                                          );
                                        })
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {/* Specialized Training */}
                              <div className="mt-6">
                                <div className="mb-4">
                                  <h5 className="font-semibold text-gray-800">Specialized Training</h5>
                                </div>

                                {(() => {
                                  const trainingName = applicationData?.specializedTraining || applicationData?.specialized_training || null;
                                  const trainingYear = applicationData?.specializedYear || applicationData?.specialized_year || null;

                                  const trainingCertPath =
                                    applicationData?.trainingCertFilePath ||
                                    applicationData?.training_cert_file_path ||
                                    applicationData?.trainingCertPath ||
                                    applicationData?.training_cert_path ||
                                    applicationData?.specializedTrainingCertFilePath ||
                                    applicationData?.specialized_training_cert_file_path ||
                                    null;

                                  const trainingCertUrl = trainingCertPath
                                    ? supabase.storage.from('application-files').getPublicUrl(trainingCertPath)?.data?.publicUrl
                                    : null;

                                  const hasAnything = Boolean(String(trainingName || '').trim() || String(trainingYear || '').trim() || trainingCertPath);

                                  if (!hasAnything) {
                                    return (
                                      <div className="border border-gray-200 rounded-lg p-6 text-center">
                                        <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <p className="text-sm text-gray-500">No uploaded specialized training yet.</p>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                      <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-gray-600 border-b bg-gray-50">
                                        <div className="col-span-5">Training</div>
                                        <div className="col-span-2">Year</div>
                                        <div className="col-span-5">Certificate</div>
                                      </div>
                                      <div className="grid grid-cols-12 items-center gap-3 px-3 py-3">
                                        <div className="col-span-12 md:col-span-5 text-sm text-gray-800">
                                          {trainingName ? String(trainingName) : <span className="text-gray-400 italic">None</span>}
                                        </div>
                                        <div className="col-span-12 md:col-span-2 text-sm text-gray-700">
                                          {trainingYear ? String(trainingYear) : <span className="text-gray-400 italic">—</span>}
                                        </div>
                                        <div className="col-span-12 md:col-span-5 text-sm">
                                          {trainingCertUrl ? (
                                            <div className="flex items-center gap-2">
                                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gray-400">
                                                <path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75ZM6.75 15a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V15.75a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V15.75a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                                              </svg>
                                              <a
                                                href={trainingCertUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800 underline text-sm"
                                              >
                                                {String(trainingCertPath).split('/').pop() || 'View File'}
                                              </a>
                                            </div>
                                          ) : (
                                            <span className="text-gray-400 italic text-sm">No file uploaded yet</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Assessment and Agreement Records Section */}
                              <div className="mt-6">
                                <div className="mb-4">
                                  <h5 className="font-semibold text-gray-800">Assessment and Agreement Records</h5>
                                </div>
                                
                                {assessmentRecords.length === 0 ? (
                                  <div className="border border-gray-200 rounded-lg p-6 text-center">
                                    <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="text-sm text-gray-500">No assessment or agreement records found.</p>
                                    <p className="text-xs text-gray-400 mt-1">Files from the application process will appear here.</p>
                                  </div>
                                ) : (
                                  <div className="space-y-6">
                                    {/* Assessment Files Section */}
                                    {assessmentRecords.filter(r => r.type === 'assessment').length > 0 && (
                                      <div>
                                        <div className="bg-gray-100 text-gray-800 px-3 py-2 text-sm font-semibold border rounded-t-md">Assessment Files</div>
                                        <div className="border border-gray-200 rounded-b-lg overflow-hidden">
                                          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-gray-600 border-b bg-gray-50">
                                            <div className="col-span-6">Document</div>
                                            <div className="col-span-6">File</div>
                                          </div>
                                          {assessmentRecords
                                            .filter(r => r.type === 'assessment')
                                            .map((record) => (
                                            <div key={record.id} className="border-b">
                                              <div className="grid grid-cols-12 items-center gap-3 px-3 py-3">
                                                <div className="col-span-12 md:col-span-6 text-sm text-gray-800 flex items-center gap-2">
                                                  {record.documentName === 'Interview Details' ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-600">
                                                      <path fillRule="evenodd" d="M4.5 3.75a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V6.75a3 3 0 0 0-3-3h-15Zm4.125 3a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Zm-3.873 8.703a4.126 4.126 0 0 1 7.746 0 .75.75 0 0 1-.372.84A7.72 7.72 0 0 1 8 18.75a7.72 7.72 0 0 1-5.501-2.607.75.75 0 0 1-.372-.84Zm4.622-1.44a5.076 5.076 0 0 0 5.024 0l.348-1.597c.271.1.56.153.856.153h6a.75.75 0 0 0 0-1.5h-3.045c.01-.1.02-.2.02-.3V11.25c0-5.385-4.365-9.75-9.75-9.75S2.25 5.865 2.25 11.25v.756a2.25 2.25 0 0 0 1.988 2.246l.217.037a2.25 2.25 0 0 0 2.163-1.684l1.38-4.276a1.125 1.125 0 0 1 1.08-.82Z" clipRule="evenodd" />
                                                    </svg>
                                                  ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-600">
                                                      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.525-1.72-1.72a.75.75 0 1 0-1.06 1.061l2.25 2.25a.75.75 0 0 0 1.144-.094l3.843-5.15Z" clipRule="evenodd" />
                                                    </svg>
                                                  )}
                                                  {record.documentName}
                                                </div>
                                                <div className="col-span-12 md:col-span-6 text-sm">
                                                  {record.fileUrl ? (
                                                    <div className="flex items-center gap-2">
                                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gray-400">
                                                        <path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75ZM6.75 15a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V15.75a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V15.75a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                                                      </svg>
                                                      <a
                                                        href={record.fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 underline text-sm"
                                                      >
                                                        {record.fileName}
                                                      </a>
                                                      <button
                                                        onClick={async () => {
                                                          try {
                                                            const response = await fetch(record.fileUrl);
                                                            const blob = await response.blob();
                                                            const url = window.URL.createObjectURL(blob);
                                                            const link = document.createElement('a');
                                                            link.href = url;
                                                            link.download = record.fileName;
                                                            document.body.appendChild(link);
                                                            link.click();
                                                            document.body.removeChild(link);
                                                            window.URL.revokeObjectURL(url);
                                                          } catch (error) {
                                                            console.error('Error downloading file:', error);
                                                            window.open(record.fileUrl, '_blank');
                                                          }
                                                        }}
                                                        className="text-purple-600 hover:text-purple-800 underline text-sm"
                                                      >
                                                        Download
                                                      </button>
                                                    </div>
                                                  ) : (
                                                    <span className="text-gray-400 italic text-sm">No file uploaded yet</span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Agreement Documents Section */}
                                    {assessmentRecords.filter(r => r.type === 'agreement').length > 0 && (
                                      <div>
                                        <div className="bg-gray-100 text-gray-800 px-3 py-2 text-sm font-semibold border rounded-t-md">Agreement Documents</div>
                                        <div className="border border-gray-200 rounded-b-lg overflow-hidden">
                                          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-gray-600 border-b bg-gray-50">
                                            <div className="col-span-6">&nbsp;</div>
                                            <div className="col-span-6">File</div>
                                          </div>
                                          {assessmentRecords
                                            .filter(r => r.type === 'agreement')
                                            .map((record) => (
                                            <div key={record.id} className="border-b">
                                              <div className="grid grid-cols-12 items-center gap-3 px-3 py-3">
                                                <div className="col-span-12 md:col-span-6 text-sm text-gray-800">
                                                  {record.documentName}
                                                </div>
                                                <div className="col-span-12 md:col-span-6 text-sm">
                                                  {record.fileUrl ? (
                                                    <div className="flex items-center gap-2">
                                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gray-400">
                                                        <path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75ZM6.75 15a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V15.75a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V15.75a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                                                      </svg>
                                                      <a
                                                        href={record.fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 underline text-sm"
                                                      >
                                                        {record.fileName}
                                                      </a>
                                                      <button
                                                        onClick={async () => {
                                                          try {
                                                            const response = await fetch(record.fileUrl);
                                                            const blob = await response.blob();
                                                            const url = window.URL.createObjectURL(blob);
                                                            const link = document.createElement('a');
                                                            link.href = url;
                                                            link.download = record.fileName;
                                                            document.body.appendChild(link);
                                                            link.click();
                                                            document.body.removeChild(link);
                                                            window.URL.revokeObjectURL(url);
                                                          } catch (error) {
                                                            console.error('Error downloading file:', error);
                                                            window.open(record.fileUrl, '_blank');
                                                          }
                                                        }}
                                                        className="text-purple-600 hover:text-purple-800 underline text-sm"
                                                      >
                                                        Download
                                                      </button>
                                                    </div>
                                                  ) : (
                                                    <span className="text-gray-400 italic text-sm">No file uploaded yet</span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* ONBOARDING TAB */}
                          {activeTab === 'onboarding' && (
                            <div className="space-y-6">
                              <div className="flex items-center justify-between mb-4">
                                <h5 className="text-lg font-semibold text-gray-800">Onboarding Records</h5>
                                <button
                                  onClick={() => {
                                    setNewOnboardingItem({ item: '', description: '', date: new Date().toISOString().substring(0, 10), file: null });
                                    setShowAddOnboardingModal(true);
                                  }}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                  Add Record
                                </button>
                              </div>

                              {onboardingItems.length === 0 ? (
                                <div className="bg-white rounded-lg border border-gray-200">
                                  {/* Table Header */}
                                  <div className="flex px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600 uppercase tracking-wider">
                                    <div className="flex-1 text-center">Item Name</div>
                                    <div className="flex-1 text-center">Description</div>
                                    <div className="flex-1 text-center">Date Issued</div>
                                    <div className="flex-1 text-center">Attachment</div>
                                    <div className="flex-1 text-center">Actions</div>
                                  </div>
                                  {/* Empty State */}
                                  <div className="p-16 text-center">
                                    <svg className="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="text-gray-400 text-sm">No onboarding records yet</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                  {/* Table Header */}
                                  <div className="flex px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600 uppercase tracking-wider">
                                    <div className="flex-1 text-center">Item Name</div>
                                    <div className="flex-1 text-center">Description</div>
                                    <div className="flex-1 text-center">Date Issued</div>
                                    <div className="flex-1 text-center">Attachment</div>
                                    <div className="flex-1 text-center">Actions</div>
                                  </div>
                                  {/* Table Body */}
                                  <div className="divide-y divide-gray-200">
                                    {onboardingItems.map((ob) => (
                                      <div key={ob.id} className="flex px-6 py-4 hover:bg-gray-50 transition-colors">
                                        {/* Item Name */}
                                        <div className="flex-1 text-sm text-gray-800 font-medium text-center">
                                          {ob.item || '—'}
                                        </div>
                                        {/* Description */}
                                        <div className="flex-1 text-sm text-gray-600 text-center">
                                          {ob.description || <span className="text-gray-400">None</span>}
                                        </div>
                                        {/* Date Issued */}
                                        <div className="flex-1 text-sm text-gray-600 text-center">
                                          {ob.date ? new Date(ob.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                                        </div>
                                        {/* Attachment */}
                                        <div className="flex-1 text-sm flex justify-center">
                                          {ob.fileUrl ? (
                                            <a 
                                              href={ob.fileUrl} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                              </svg>
                                              View
                                            </a>
                                          ) : (
                                            <span className="text-gray-400">None</span>
                                          )}
                                        </div>
                                        {/* Actions */}
                                        <div className="flex-1 text-center">
                                          <button
                                            onClick={() => {
                                              setOnboardingItemToDelete(ob);
                                              setShowConfirmDeleteOnboarding(true);
                                            }}
                                            className="text-red-600 hover:text-red-800 transition-colors"
                                            title="Delete"
                                          >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* EVALUATION TAB */}
                          {activeTab === 'evaluation' && (
                            <div className="space-y-6">
                              <div className="flex items-center justify-between mb-4">
                                <h5 className="font-semibold text-gray-800">Evaluation Records</h5>
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
                                    {evaluationDocs.length === 0 ? (
                                      <tr>
                                        <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                                          No evaluation records found
                                        </td>
                                      </tr>
                                    ) : (
                                      evaluationDocs.map((doc) => (
                                        <tr key={doc.id} className="hover:bg-gray-50/50">
                                          <td className="px-4 py-3 text-gray-800">Evaluation</td>
                                          <td className="px-4 py-3">
                                            {doc.file && doc.url ? (
                                              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                {doc.file.name}
                                              </a>
                                            ) : (
                                              <span className="text-gray-400 italic">No file</span>
                                            )}
                                          </td>
                                          <td className="px-4 py-3 text-gray-600">{doc.date || "—"}</td>
                                          <td className="px-4 py-3 text-gray-600">{doc.employeeType || "—"}</td>
                                          <td className="px-4 py-3 text-gray-600">{doc.remarks || "—"}</td>
                                        </tr>
                                      ))
                                    )}
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



                        </div>
                      </div>
                    )}
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
                const isAlreadySubmitted = employeeDocuments.some(d => d.id === doc.id && d.file);
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
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!validateNoSunday(e.target, v)) return;
                    setTerminateDate(v);
                  }}
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

      {/* Confirm Save Onboarding Modal */}
      {showConfirmSaveOnboarding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Confirm Save</h3>
            <p className="text-sm text-gray-600 mb-6">Are you sure you want to save all onboarding items? This will update the database with all changes.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmSaveOnboarding(false)}
                disabled={isSavingOnboarding}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (isSavingOnboarding) return;
                  setIsSavingOnboarding(true);
                  try {
                          console.log('Starting save of onboarding items...');
                          console.log('Onboarding items to save:', onboardingItems);
                          console.log('Employee ID:', selectedEmployee?.id);
                          
                          // Track newly inserted item IDs
                          const newlyInsertedIds = [];
                          
                          for (const item of onboardingItems) {
                            console.log('Processing item:', item);
                            
                            // Handle file upload if present
                            let filePath = item.filePath || null;
                            if (item.file && typeof item.file !== 'string') {
                              console.log('Uploading file for item:', item.item);
                              const fileExt = item.file.name.split('.').pop();
                              const uploadPath = `onboarding/${selectedEmployee.id}/${item.id}_${Date.now()}.${fileExt}`;
                              
                              const { data: uploadData, error: uploadError } = await supabase.storage
                                .from('application-files')
                                .upload(uploadPath, item.file, { upsert: false });
                              
                              if (uploadError) {
                                console.error('File upload error:', uploadError);
                                throw new Error(`Failed to upload file for ${item.item}: ${uploadError.message}`);
                              }
                              
                              console.log('File uploaded successfully:', uploadPath);
                              filePath = uploadPath;
                            }

                            // Prepare item data
                            const itemData = {
                              employee_id: selectedEmployee.id,
                              item: item.item.trim(),
                              description: item.description?.trim() || null,
                              date_issued: item.date || null,
                              file_path: filePath || null,
                            };

                            console.log('Item data to save:', itemData);

                            // Check if item is new (temporary ID from Date.now() or isNew flag)
                            const isNewItem = item.isNew || (item.id && typeof item.id === 'number');
                            
                            console.log('Is new item?', isNewItem, 'Item ID:', item.id, 'Type:', typeof item.id);
                            
                            if (isNewItem) {
                              // New item - insert
                              console.log('Inserting new item...');
                              console.log('Insert data:', JSON.stringify(itemData, null, 2));
                              const { data: insertData, error: insertError } = await supabase
                                .from('onboarding')
                                .insert(itemData)
                                .select();
                              
                              if (insertError) {
                                console.error('Insert error:', insertError);
                                console.error('Insert error details:', JSON.stringify(insertError, null, 2));
                                throw new Error(`Failed to save ${item.item}: ${insertError.message}`);
                              }
                              
                              if (!insertData || insertData.length === 0) {
                                console.error('Insert returned no data!');
                                throw new Error(`Failed to save ${item.item}: Insert returned no data`);
                              }
                              
                              console.log('Item inserted successfully:', insertData);
                              console.log('Inserted item ID:', insertData[0]?.id);
                              
                              // Track the newly inserted ID
                              if (insertData[0]?.id) {
                                newlyInsertedIds.push(insertData[0].id);
                              }
                            } else if (item.id) {
                              // Existing item - update
                              console.log('Updating existing item with ID:', item.id);
                              const { data: updateData, error: updateError } = await supabase
                                .from('onboarding')
                                .update({
                                  item: itemData.item,
                                  description: itemData.description,
                                  date_issued: itemData.date_issued,
                                  file_path: itemData.file_path,
                                })
                                .eq('id', item.id)
                                .select();
                              
                              if (updateError) {
                                console.error('Update error:', updateError);
                                throw new Error(`Failed to update ${item.item}: ${updateError.message}`);
                              }
                              
                              console.log('Item updated successfully:', updateData);
                            }
                          }

                          // Wait a moment for database to sync
                          await new Promise(resolve => setTimeout(resolve, 300));
                          
                          // Get all current items from DB to determine what to delete
                          const { data: allItems } = await supabase
                            .from('onboarding')
                            .select('id')
                            .eq('employee_id', selectedEmployee.id);
                          
                          console.log('All items in DB:', allItems);
                          console.log('Newly inserted IDs:', newlyInsertedIds);
                          
                          if (allItems) {
                            // Get IDs of items that should exist:
                            // 1. Items from current list that have non-number IDs (already in DB)
                            // 2. Newly inserted items (from the insert responses)
                            const currentDbIds = [
                              ...onboardingItems
                                .filter(item => item.id && typeof item.id !== 'number' && !item.isNew)
                                .map(item => item.id),
                              ...newlyInsertedIds
                            ];
                            
                            console.log('Current DB IDs to keep:', currentDbIds);
                            
                            // Only delete items that are in DB but NOT in the current list or newly inserted
                            const toDelete = allItems.filter(dbItem => !currentDbIds.includes(dbItem.id));
                            console.log('Items to delete:', toDelete);
                            
                            if (toDelete.length > 0) {
                              for (const deleteItem of toDelete) {
                                console.log('Deleting item:', deleteItem.id);
                                const { error: deleteError } = await supabase
                                  .from('onboarding')
                                  .delete()
                                  .eq('id', deleteItem.id);
                                
                                if (deleteError) {
                                  console.error('Error deleting item:', deleteError);
                                }
                              }
                            }
                          }

                          // Wait a moment for database to sync
                          await new Promise(resolve => setTimeout(resolve, 500));
                          
                          // Reload items immediately after save
                          console.log('Reloading items for employee:', selectedEmployee.id);
                          const { data: refreshedItems, error: refreshError } = await supabase
                            .from('onboarding')
                            .select('*')
                            .eq('employee_id', selectedEmployee.id)
                            .order('date_issued', { ascending: false });

                          if (refreshError) {
                            console.error('Error refreshing items:', refreshError);
                            console.error('Refresh error details:', JSON.stringify(refreshError, null, 2));
                            setErrorMessage(`Items may have been saved but failed to reload: ${refreshError.message}. Please refresh the page.`);
                            setShowErrorAlert(true);
                          } else {
                            console.log('Refreshed items count:', refreshedItems?.length || 0);
                            console.log('Refreshed items:', refreshedItems);
                            if (refreshedItems && refreshedItems.length > 0) {
                              const items = refreshedItems.map(item => ({
                                id: item.id,
                                item: item.item || item.name || '',
                                description: item.description || '',
                                date: item.date_issued || item.date || '',
                                file: item.file_path || item.filePath || null,
                                filePath: item.file_path || item.filePath || null,
                                fileUrl: item.file_path || item.filePath ? (() => {
                                  const { data } = supabase.storage
                                    .from('application-files')
                                    .getPublicUrl(item.file_path || item.filePath);
                                  return data?.publicUrl || null;
                                })() : null,
                                isNew: false
                              }));
                              console.log('Setting onboarding items:', items);
                              setOnboardingItems(items);
                              // Trigger refresh of the useEffect
                              setOnboardingRefreshTrigger(Date.now());
                              setSuccessMessage(`Onboarding items saved successfully! ${items.length} item(s) loaded.`);
                            } else {
                              console.warn('No items found after save. Items may not have been saved or RLS is blocking the query.');
                              setOnboardingItems([]);
                              // Still trigger refresh in case items appear
                              setOnboardingRefreshTrigger(Date.now());
                              setSuccessMessage('Onboarding items saved successfully! If items don\'t appear, please refresh the page or check if RLS is enabled.');
                            }
                            setShowSuccessAlert(true);
                          }
                        } catch (err) {
                          console.error('Error saving onboarding items:', err);
                          setErrorMessage(`Error saving onboarding items: ${err.message}`);
                          setShowErrorAlert(true);
                        } finally {
                          setIsSavingOnboarding(false);
                          setShowConfirmSaveOnboarding(false);
                        }
                }}
                disabled={isSavingOnboarding}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSavingOnboarding && (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isSavingOnboarding ? 'Saving...' : 'Save All Items'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Onboarding Record Modal */}
      {showAddOnboardingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Add Onboarding Record</h3>
            
            <div className="space-y-4">
              {/* Item Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newOnboardingItem.item}
                  onChange={(e) => setNewOnboardingItem(prev => ({ ...prev, item: e.target.value }))}
                  placeholder="e.g., ID Card, Uniform, Laptop"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <textarea
                  value={newOnboardingItem.description}
                  onChange={(e) => setNewOnboardingItem(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter description"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Date Issued */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Issued <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newOnboardingItem.date}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!validateNoSunday(e.target, v)) return;
                    setNewOnboardingItem(prev => ({ ...prev, date: v }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Attachment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Attachment <span className="text-gray-400 text-xs">(Optional - PDF, JPG, PNG)</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setNewOnboardingItem(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddOnboardingModal(false);
                  setNewOnboardingItem({ item: '', description: '', date: '', file: null });
                }}
                disabled={isSavingNewOnboarding}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!newOnboardingItem.item.trim() || !newOnboardingItem.date) {
                    setErrorMessage('Please fill in all required fields (Item Name and Date Issued)');
                    setShowErrorAlert(true);
                    return;
                  }

                  if (isSavingNewOnboarding) return;
                  setIsSavingNewOnboarding(true);

                  try {
                    // Upload file if present
                    let filePath = null;
                    if (newOnboardingItem.file) {
                      const fileExt = newOnboardingItem.file.name.split('.').pop();
                      const uploadPath = `onboarding/${selectedEmployee.id}/${Date.now()}.${fileExt}`;
                      
                      const { error: uploadError } = await supabase.storage
                        .from('application-files')
                        .upload(uploadPath, newOnboardingItem.file, { upsert: false });
                      
                      if (uploadError) {
                        throw new Error(`Failed to upload file: ${uploadError.message}`);
                      }
                      
                      filePath = uploadPath;
                    }

                    // Insert into database
                    const { error: insertError } = await supabase
                      .from('onboarding')
                      .insert({
                        employee_id: selectedEmployee.id,
                        item: newOnboardingItem.item.trim(),
                        description: newOnboardingItem.description.trim() || null,
                        date_issued: newOnboardingItem.date,
                        file_path: filePath,
                      });

                    if (insertError) {
                      throw new Error(`Failed to save onboarding item: ${insertError.message}`);
                    }

                    // Refresh the list
                    setOnboardingRefreshTrigger(Date.now());
                    setSuccessMessage('Onboarding item added successfully!');
                    setShowSuccessAlert(true);
                    setShowAddOnboardingModal(false);
                    setNewOnboardingItem({ item: '', description: '', date: '', file: null });
                  } catch (err) {
                    console.error('Error adding onboarding item:', err);
                    setErrorMessage(`Error: ${err.message}`);
                    setShowErrorAlert(true);
                  } finally {
                    setIsSavingNewOnboarding(false);
                  }
                }}
                disabled={isSavingNewOnboarding}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSavingNewOnboarding && (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isSavingNewOnboarding ? 'Saving...' : 'Save Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Onboarding Item Modal */}
      {showConfirmDeleteOnboarding && onboardingItemToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Confirm Delete</h3>
            <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
              <p className="text-gray-700 text-sm">
                <span className="font-semibold">Item:</span> {onboardingItemToDelete.item || 'Untitled'}
              </p>
              {onboardingItemToDelete.description && (
                <p className="text-gray-700 mt-2 text-sm">
                  <span className="font-semibold">Description:</span> {onboardingItemToDelete.description}
                </p>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-6">Are you sure you want to delete this onboarding item?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmDeleteOnboarding(false);
                  setOnboardingItemToDelete(null);
                }}
                disabled={isDeletingOnboarding}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (isDeletingOnboarding) return;
                  setIsDeletingOnboarding(true);
                  try {
                    // Delete from database if it has an ID and is not a newly added item (before save)
                    if (onboardingItemToDelete.id && !onboardingItemToDelete.isNew) {
                      console.log('Deleting onboarding item from database:', onboardingItemToDelete.id);
                      const { error: deleteError } = await supabase
                        .from('onboarding')
                        .delete()
                        .eq('id', onboardingItemToDelete.id);
                      
                      if (deleteError) {
                        console.error('Error deleting from database:', deleteError);
                        setErrorMessage(`Failed to delete item: ${deleteError.message}`);
                        setShowErrorAlert(true);
                        setIsDeletingOnboarding(false);
                        return;
                      }
                      console.log('Successfully deleted from database');
                    }
                    
                    // Remove from local state
                    setOnboardingItems((prev) => prev.filter((item) => item.id !== onboardingItemToDelete.id));
                    delete onboardingFileRefs.current[onboardingItemToDelete.id];
                    setShowConfirmDeleteOnboarding(false);
                    setOnboardingItemToDelete(null);
                  } catch (err) {
                    console.error('Error deleting onboarding item:', err);
                    setErrorMessage(`Error deleting item: ${err.message}`);
                    setShowErrorAlert(true);
                  } finally {
                    setIsDeletingOnboarding(false);
                  }
                }}
                disabled={isDeletingOnboarding}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeletingOnboarding && (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isDeletingOnboarding ? 'Deleting...' : 'Delete Item'}
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

      {/* Success Alert Modal */}
      {showSuccessAlert && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50" onClick={() => setShowSuccessAlert(false)}>
          <div className="bg-white rounded-md w-full max-w-md mx-4 overflow-hidden border" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-green-600">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.525-1.72-1.72a.75.75 0 1 0-1.06 1.061l2.25 2.25a.75.75 0 0 0 1.144-.094l3.843-5.15Z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="text-lg font-semibold text-gray-800 mb-2">{successMessage}</div>
              <div className="mt-4">
                <button 
                  type="button" 
                  className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700" 
                  onClick={() => setShowSuccessAlert(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert Modal */}
      {showErrorAlert && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50" onClick={() => setShowErrorAlert(false)}>
          <div className="bg-white rounded-md w-full max-w-md mx-4 overflow-hidden border" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-red-600">
                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="text-lg font-semibold text-gray-800 mb-2">{errorMessage}</div>
              <div className="mt-4">
                <button 
                  type="button" 
                  className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700" 
                  onClick={() => setShowErrorAlert(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Employees;
