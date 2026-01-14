// src/Employees.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

function Employees() {
  const navigate = useNavigate();

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
        personal_email: row.personal_email || null, // Applicant's original email for direct hires
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
          .select("id, email, fname, lname, mname, contact_number, position, depot, role, hired_at, source, endorsed_by_agency_id, endorsed_at, agency_profile_id, status, is_agency, personal_email")
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
  }, [employees, search, recruitmentTypeFilter, departmentFilter, positionFilter, depotFilter, employmentStatusFilter, sortOption]);


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

  // Fetch certificates when employee is selected or certifications tab is active
  useEffect(() => {
    if (selectedEmployee && activeTab === 'certifications') {
      fetchExternalCertificates(selectedEmployee);
      fetchRoadwiseCertificates(selectedEmployee);
    }
  }, [selectedEmployee, activeTab]);

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
            const frontPath = license.frontFilePath || license.front_file_path;
            const backPath = license.backFilePath || license.back_file_path;
            const hasFile = !!(frontPath || backPath);
            const status = license.status || 'Missing';
            const displayStatus = status === 'Validated' || status === 'approved' ? 'Validated' : 
                                 status === 'Re-submit' || status === 'resubmit' ? 'Re-submit' : 
                                 status === 'Submitted' || status === 'pending' ? 'Submitted' : 'Missing';
            
            documents.push({
              id: 'drivers_license',
              name: 'Photocopy of Drivers License (Front and Back)',
              file: hasFile ? { name: frontPath ? getFilename(frontPath) : 'Driver\'s License' } : null,
              previewUrl: frontPath ? getDocumentUrl(frontPath) : (backPath ? getDocumentUrl(backPath) : null),
              status: displayStatus,
            });
          } else {
            documents.push({
              id: 'drivers_license',
              name: 'Photocopy of Drivers License (Front and Back)',
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
            { key: 'dependents_birth_certificate', name: 'PSA Birth Certificate of Dependents (if applicable)' },
            { key: 'residence_sketch', name: 'Direction of Residence (House to Depot Sketch)' },
          ];

          personalDocMapping.forEach(({ key, name }) => {
            const docData = personalDocs[key];
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
              // Only add required documents or if they have data
              if (key === 'psa_birth_certificate' || key === 'photo_2x2' || key === 'residence_sketch') {
                documents.push({
                  id: key,
                  name: name,
                  file: null,
                  previewUrl: null,
                  status: 'Missing',
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

        // Get the applicant's email - use personal_email (original applicant email) if available,
        // otherwise fall back to employee email (works for agency hires)
        const applicantEmail = selectedEmployee.personal_email?.trim() || selectedEmployee.email?.trim();
        const employeeEmail = applicantEmail.toLowerCase();
        const employeeName = selectedEmployee.name?.toLowerCase() || '';
        const employeeFname = selectedEmployee.fname?.toLowerCase() || '';
        const employeeLname = selectedEmployee.lname?.toLowerCase() || '';
        const employeeHiredAt = selectedEmployee.hired_at;
        
        let applicationsData = null;
        const baseSelect = 'id, interview_details_file, assessment_results_file, appointment_letter_file, undertaking_file, application_form_file, undertaking_duties_file, pre_employment_requirements_file, id_form_file, created_at, user_id, status, job_posts:job_id(title, depot), payload';

        console.log('Loading assessment records for employee:', {
          email: selectedEmployee.email,
          personal_email: selectedEmployee.personal_email,
          name: selectedEmployee.name,
          hired_at: employeeHiredAt
        });

        // Approach 1: Search by personal_email (applicant's original email) - this is the key for direct hires
        if (selectedEmployee.personal_email) {
          const emailsToTry = [
            selectedEmployee.personal_email.trim(),
            selectedEmployee.personal_email.trim().toLowerCase()
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
              console.log('Found applications by personal_email in payload->>email:', data.length);
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
              console.log('Found applications by personal_email in payload->form->>email:', data2.length);
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
              console.log('Found applications by personal_email in payload->applicant->>email:', data3.length);
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
          // Always show all document types, even if file doesn't exist
          const mostRecentApp = sortedApps[0];
          const jobTitle = mostRecentApp.job_posts?.title || 'N/A';
          const depot = mostRecentApp.job_posts?.depot || 'N/A';
          const date = mostRecentApp.created_at;
          
          const records = [];
          
          // Assessment Files - always show both
          records.push({
            id: `${mostRecentApp.id}-interview-details`,
            type: 'assessment',
            documentName: 'Interview Details',
            fileName: mostRecentApp.interview_details_file ? mostRecentApp.interview_details_file.split('/').pop() : null,
            filePath: mostRecentApp.interview_details_file,
            fileUrl: mostRecentApp.interview_details_file ? getFileUrl(mostRecentApp.interview_details_file) : null,
            date: date,
            jobTitle: jobTitle,
            depot: depot,
            applicationId: mostRecentApp.id,
            icon: 'blue'
          });
          
          records.push({
            id: `${mostRecentApp.id}-assessment-results`,
            type: 'assessment',
            documentName: 'In-Person Assessment Results',
            fileName: mostRecentApp.assessment_results_file ? mostRecentApp.assessment_results_file.split('/').pop() : null,
            filePath: mostRecentApp.assessment_results_file,
            fileUrl: mostRecentApp.assessment_results_file ? getFileUrl(mostRecentApp.assessment_results_file) : null,
            date: date,
            jobTitle: jobTitle,
            depot: depot,
            applicationId: mostRecentApp.id,
            icon: 'green'
          });
          
          // Agreement Files - always show all 6
          const agreementDocs = [
            { key: 'appointment-letter', name: 'Employee Appointment Letter', file: mostRecentApp.appointment_letter_file },
            { key: 'undertaking', name: 'Undertaking', file: mostRecentApp.undertaking_file },
            { key: 'application-form', name: 'Application Form', file: mostRecentApp.application_form_file },
            { key: 'undertaking-duties', name: 'Undertaking of Duties and Responsibilities', file: mostRecentApp.undertaking_duties_file },
            { key: 'pre-employment', name: 'Roadwise Pre Employment Requirements', file: mostRecentApp.pre_employment_requirements_file },
            { key: 'id-form', name: 'ID Form', file: mostRecentApp.id_form_file }
          ];
          
          agreementDocs.forEach(doc => {
            records.push({
              id: `${mostRecentApp.id}-${doc.key}`,
              type: 'agreement',
              documentName: doc.name,
              fileName: doc.file ? doc.file.split('/').pop() : null,
              filePath: doc.file,
              fileUrl: doc.file ? getFileUrl(doc.file) : null,
              date: date,
              jobTitle: jobTitle,
              depot: depot,
              applicationId: mostRecentApp.id
            });
          });
          
          setAssessmentRecords(records);
          console.log('Successfully loaded assessment records:', records.length, 'records');
        } else {
          console.log('No applications found for employee:', {
            email: selectedEmployee.email,
            personal_email: selectedEmployee.personal_email,
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
  }, [selectedEmployee?.email, selectedEmployee?.personal_email, selectedEmployee?.name, selectedEmployee?.hired_at, activeTab]);

  // Fetch application data when employee is selected and profiling tab is active
  useEffect(() => {
    const fetchEmployeeApplication = async () => {
      if (!selectedEmployee || activeTab !== 'profiling') {
        setResumeData(null);
        setApplicationFormData(null);
        setApplicationData(null);
        setApplicantExtras({ work_experiences: [], character_references: [] });
        return;
      }

      const applicantEmail = selectedEmployee.personal_email?.trim() || selectedEmployee.email?.trim();

      setLoadingApplication(true);
      setLoadingFiles(true);
      try {
        // Fetch application data to get resume, application form, and all application details
        // Try multiple queries to find the application
        let applications = null;
        let error = null;

        // Try querying by email in payload root
        const { data: apps1, error: err1 } = await supabase
          .from('applications')
          .select('id, payload, created_at')
          .eq('payload->>email', applicantEmail)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!err1 && apps1 && apps1.length > 0) {
          applications = apps1;
        } else {
          // Try querying by email in payload.form
          const { data: apps2, error: err2 } = await supabase
            .from('applications')
            .select('id, payload, created_at')
            .eq('payload->form->>email', applicantEmail)
            .order('created_at', { ascending: false })
            .limit(1);

          if (!err2 && apps2 && apps2.length > 0) {
            applications = apps2;
          } else {
            // Try querying by email in payload.applicant
            const { data: apps3, error: err3 } = await supabase
              .from('applications')
              .select('id, payload, created_at')
              .eq('payload->applicant->>email', applicantEmail)
              .order('created_at', { ascending: false })
              .limit(1);

            if (!err3 && apps3 && apps3.length > 0) {
              applications = apps3;
            } else {
              error = err3 || err2 || err1;
            }
          }
        }

        if (error) throw error;

        if (applications && applications.length > 0) {
          const app = applications[0];
          const payload = typeof app.payload === 'string' ? JSON.parse(app.payload) : app.payload;
          const baseForm = payload?.form && typeof payload.form === 'object' ? payload.form : (payload || {});

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

      const applicantEmail = selectedEmployee.personal_email?.trim() || selectedEmployee.email?.trim();
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
              fileName = filePath.split('/').pop() || 'evaluation.pdf';
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
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(6,minmax(0,1fr))_auto] gap-2 items-center">
                  {/* Depot Filter */}
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
                  <button className="w-full sm:w-auto px-4 py-2 border border-gray-200 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2 bg-white">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export
                  </button>
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
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Position / Depot</th>
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
                                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">AGENCY</span>
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
                                    <span className="ml-2 text-gray-800">
                                      {applicationData?.firstName || selectedEmployee.fname || ""} {applicationData?.middleName || selectedEmployee.mname || ""} {applicationData?.lastName || selectedEmployee.lname || ""}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Email:</span>
                                    <span className="ml-2 text-gray-800">{applicationData?.email || selectedEmployee.email || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Contact Number:</span>
                                    <span className="ml-2 text-gray-800">{applicationData?.contact || selectedEmployee.contact || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Birthday:</span>
                                    <span className="ml-2 text-gray-800">
                                      {applicationData?.birthday ? new Date(applicationData.birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : "—"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Sex:</span>
                                    <span className="ml-2 text-gray-800">{applicationData?.sex || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Marital Status:</span>
                                    <span className="ml-2 text-gray-800">{applicationData?.marital_status || applicationData?.maritalStatus || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Source:</span>
                                    <span className="ml-2 text-gray-800">{selectedEmployee.agency ? "Agency" : "Direct Hire"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Currently Employed:</span>
                                    <span className="ml-2 text-gray-800">{applicationData?.employed || "—"}</span>
                                  </div>
                                </div>
                              </div>

                              {applicationData && (applicationData.street || applicationData.barangay || applicationData.city || applicationData.zip) && (
                                <div>
                                  <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Address</h5>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="text-gray-500">Street/Village:</span>
                                      <span className="ml-2 text-gray-800">{applicationData.street || "—"}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Barangay:</span>
                                      <span className="ml-2 text-gray-800">{applicationData.barangay || "—"}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">City:</span>
                                      <span className="ml-2 text-gray-800">{applicationData.city || "—"}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Zip Code:</span>
                                      <span className="ml-2 text-gray-800">{applicationData.zip || "—"}</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {applicationData && (applicationData.edu1Institution || applicationData.edu2Institution || applicationData.skills) && (
                                <div>
                                  <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Education & Skills</h5>
                                  <div className="space-y-4 text-sm">
                                    {applicationData.edu1Institution && (
                                      <div>
                                        <span className="text-gray-500 font-medium">{applicationData.edu1Level || "Education 1"}:</span>
                                        <div className="ml-2 mt-1">
                                          <div className="text-gray-800">{applicationData.edu1Institution}</div>
                                          {applicationData.edu1Year && (
                                            <div className="text-gray-600 text-xs">Year: {applicationData.edu1Year}</div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {applicationData.edu2Institution && (
                                      <div>
                                        <span className="text-gray-500 font-medium">{applicationData.edu2Level || "Education 2"}:</span>
                                        <div className="ml-2 mt-1">
                                          <div className="text-gray-800">{applicationData.edu2Institution}</div>
                                          {applicationData.edu2Year && (
                                            <div className="text-gray-600 text-xs">Year: {applicationData.edu2Year}</div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {applicationData.skills && (
                                      <div>
                                        <span className="text-gray-500 font-medium">Skills:</span>
                                        <span className="ml-2 text-gray-800">{applicationData.skills}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

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

                              {!selectedEmployee?.agency && (
                                <div>
                                  <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Character References</h5>
                                  <div className="space-y-3 text-sm">
                                    {(() => {
                                      const rawFromApplication = Array.isArray(applicationData?.characterReferences)
                                        ? applicationData.characterReferences
                                        : [];
                                      const rawFromProfile = Array.isArray(applicantExtras?.character_references)
                                        ? applicantExtras.character_references
                                        : [];
                                      const raw = rawFromApplication.length > 0 ? rawFromApplication : rawFromProfile;
                                      const displayRefs = raw.length > 0 ? raw : [{}];

                                      return displayRefs.map((ref, idx) => {
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
                                      });
                                    })()}
                                  </div>
                                </div>
                              )}

                              {applicationData && (applicationData.licenseType || applicationData.licenseExpiry) && (
                                <div>
                                  <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">License Information</h5>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="text-gray-500">License Type:</span>
                                      <span className="ml-2 text-gray-800">{applicationData.licenseType || "—"}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">License Expiry:</span>
                                      <span className="ml-2 text-gray-800">
                                        {applicationData.licenseExpiry ? new Date(applicationData.licenseExpiry).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : "—"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {applicationData && (applicationData.startDate || applicationData.heardFrom || applicationData.preferred_depot) && (
                                <div>
                                  <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Application Details</h5>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
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
                                <div className="grid grid-cols-2 gap-4 text-sm">
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
                                    <span className="text-gray-500">Application Form:</span>
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
                                      <span className="ml-2 text-gray-400 italic">No file</span>
                                    )}
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
                                <div>
                                  <h5 className="font-semibold text-gray-800">Onboarding Items</h5>
                                  <p className="text-xs text-gray-500 mt-1">Add and manage onboarding documents for this employee</p>
                                </div>
                                <button
                                  onClick={() => setOnboardingItems((prev) => [
                                    ...prev,
                                    { id: Date.now(), item: "", description: "", date: new Date().toISOString().substring(0, 10), file: null, fileUrl: null, filePath: null, isNew: true }
                                  ])}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                  Add Item
                                </button>
                              </div>

                              {onboardingItems.length === 0 ? (
                                <div className="border-2 border-dashed border-gray-200 rounded-lg p-12 text-center">
                                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <p className="text-gray-500 mb-2">No onboarding items yet</p>
                                  <p className="text-xs text-gray-400">Click "Add Item" to create a new onboarding document</p>
                                </div>
                              ) : (
                                <>
                                  <div className="space-y-4">
                                    {onboardingItems.map((ob) => {
                                      if (!onboardingFileRefs.current[ob.id]) {
                                        onboardingFileRefs.current[ob.id] = React.createRef();
                                      }
                                      const fileInputRef = onboardingFileRefs.current[ob.id];
                                      return (
                                        <div key={ob.id} className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
                                          <div className="grid grid-cols-12 gap-4">
                                            {/* Item Name */}
                                            <div className="col-span-12 md:col-span-3">
                                              <label className="block text-xs font-medium text-gray-700 mb-1">Item Name *</label>
                                              <input
                                                type="text"
                                                value={ob.item}
                                                onChange={(e) => setOnboardingItems((prev) => prev.map((item) => item.id === ob.id ? { ...item, item: e.target.value } : item))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="e.g., Employee ID"
                                              />
                                            </div>
                                            {/* Description */}
                                            <div className="col-span-12 md:col-span-4">
                                              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                                              <input
                                                type="text"
                                                value={ob.description}
                                                onChange={(e) => setOnboardingItems((prev) => prev.map((item) => item.id === ob.id ? { ...item, description: e.target.value } : item))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="Brief description"
                                              />
                                            </div>
                                            {/* Date Issued */}
                                            <div className="col-span-12 md:col-span-2">
                                              <label className="block text-xs font-medium text-gray-700 mb-1">Date Issued</label>
                                              <input
                                                type="date"
                                                value={ob.date ? new Date(ob.date).toISOString().substring(0, 10) : ""}
                                                onChange={(e) => setOnboardingItems((prev) => prev.map((item) => item.id === ob.id ? { ...item, date: e.target.value } : item))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                              />
                                            </div>
                                            {/* File Upload */}
                                            <div className="col-span-12 md:col-span-2">
                                              <label className="block text-xs font-medium text-gray-700 mb-1">File</label>
                                              <input
                                                ref={fileInputRef}
                                                type="file"
                                                className="hidden"
                                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                                onChange={(e) => {
                                                  const file = e.target.files[0];
                                                  if (file) {
                                                    if (file.size > 10 * 1024 * 1024) {
                                                      alert('File size must be less than 10MB');
                                                      return;
                                                    }
                                                    setOnboardingItems((prev) => prev.map((item) => 
                                                      item.id === ob.id 
                                                        ? { ...item, file: file, fileUrl: URL.createObjectURL(file) }
                                                        : item
                                                    ));
                                                  }
                                                }}
                                              />
                                              {ob.fileUrl ? (
                                                <div className="flex items-center gap-2">
                                                  <a 
                                                    href={ob.fileUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                                                  >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                    {ob.file?.name || 'View File'}
                                                  </a>
                                                  <button
                                                    onClick={() => {
                                                      setOnboardingItems((prev) => prev.map((item) => 
                                                        item.id === ob.id 
                                                          ? { ...item, file: null, fileUrl: null, filePath: null }
                                                          : item
                                                      ));
                                                      if (fileInputRef.current) fileInputRef.current.value = '';
                                                    }}
                                                    className="text-red-600 hover:text-red-800"
                                                    title="Remove file"
                                                  >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                  </button>
                                                </div>
                                              ) : (
                                                <button
                                                  onClick={() => fileInputRef.current?.click()}
                                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                                                >
                                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                  </svg>
                                                  Upload
                                                </button>
                                              )}
                                            </div>
                                            {/* Delete Button */}
                                            <div className="col-span-12 md:col-span-1 flex items-end">
                                              <button
                                                onClick={() => {
                                                  if (window.confirm("Delete this onboarding item?")) {
                                                    setOnboardingItems((prev) => prev.filter((item) => item.id !== ob.id));
                                                    delete onboardingFileRefs.current[ob.id];
                                                  }
                                                }}
                                                className="w-full px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                                              >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                Delete
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Save Button */}
                                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                                    <button
                                      onClick={async () => {
                                        if (!selectedEmployee?.id) {
                                          alert('Please select an employee first');
                                          return;
                                        }

                                        // Validate items
                                        const invalidItems = onboardingItems.filter(item => !item.item.trim());
                                        if (invalidItems.length > 0) {
                                          setErrorMessage('Please fill in the Item Name for all items');
                                          setShowErrorAlert(true);
                                          return;
                                        }

                                        try {
                                          console.log('Starting to save onboarding items:', onboardingItems);
                                          console.log('Selected employee ID:', selectedEmployee.id);
                                          
                                          // Track newly inserted item IDs
                                          const newlyInsertedIds = [];
                                          
                                          // Process each item
                                          for (const item of onboardingItems) {
                                            console.log('Processing item:', item);
                                            
                                            // Upload file if it's a new file (has file object but no filePath)
                                            let filePath = item.filePath;
                                            if (item.file && !item.filePath && item.isNew) {
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
                                        }
                                      }}
                                      className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      Save All Items
                                    </button>
                                  </div>
                                </>
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
                                  {loadingRoadwiseCertificates ? (
                                    <div className="text-center py-8">
                                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                                        <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                      </div>
                                      <p className="text-sm text-blue-700 font-medium">Loading certificates...</p>
                                    </div>
                                  ) : roadwiseCertificates.length > 0 ? (
                                    <div className="space-y-2">
                                      {roadwiseCertificates.map((cert) => (
                                        <div 
                                          key={cert.id} 
                                          className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all group"
                                        >
                                          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 group-hover:text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                          </svg>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-700">
                                              {cert.trainingTitle}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                              {formatDate(cert.uploadedAt)}
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                try {
                                                  // Fetch the file and trigger download
                                                  const response = await fetch(cert.certificateUrl);
                                                  const blob = await response.blob();
                                                  const url = window.URL.createObjectURL(blob);
                                                  const link = document.createElement('a');
                                                  link.href = url;
                                                  const fileName = cert.fileName || cert.certificateUrl.split('/').pop() || 'certificate.pdf';
                                                  link.download = fileName;
                                                  document.body.appendChild(link);
                                                  link.click();
                                                  document.body.removeChild(link);
                                                  window.URL.revokeObjectURL(url);
                                                } catch (error) {
                                                  console.error('Error downloading certificate:', error);
                                                  // Fallback to direct download
                                                  window.open(cert.certificateUrl, '_blank');
                                                }
                                              }}
                                              className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 text-sm px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                                              title="Download certificate"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                              </svg>
                                              Download
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(cert.certificateUrl, '_blank');
                                              }}
                                              className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 text-sm px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                                              title="View certificate"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                              </svg>
                                              View
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-center py-8">
                                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                      </div>
                                      <p className="text-sm text-blue-700 font-medium">No company training certificates yet</p>
                                      <p className="text-xs text-blue-600 mt-1">Certificates from completed trainings will appear here</p>
                                    </div>
                                  )}
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
                                          className="flex items-center gap-3 p-3 bg-white rounded-lg border border-purple-200 hover:bg-purple-50 hover:border-purple-300 transition-all group"
                                        >
                                          <svg className="w-5 h-5 text-purple-600 flex-shrink-0 group-hover:text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                          </svg>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 truncate group-hover:text-purple-700">
                                              {cert.title || cert.name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                              {cert.title && cert.name !== cert.title && (
                                                <span className="text-gray-400">{cert.name} • </span>
                                              )}
                                              {formatDate(cert.uploaded_at)}
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                try {
                                                  // Fetch the file and trigger download
                                                  const response = await fetch(cert.certificate_url);
                                                  const blob = await response.blob();
                                                  const url = window.URL.createObjectURL(blob);
                                                  const link = document.createElement('a');
                                                  link.href = url;
                                                  const fileName = cert.name || cert.certificate_url.split('/').pop() || 'certificate.pdf';
                                                  link.download = fileName;
                                                  document.body.appendChild(link);
                                                  link.click();
                                                  document.body.removeChild(link);
                                                  window.URL.revokeObjectURL(url);
                                                } catch (error) {
                                                  console.error('Error downloading certificate:', error);
                                                  // Fallback to direct download
                                                  window.open(cert.certificate_url, '_blank');
                                                }
                                              }}
                                              className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 text-sm px-2 py-1 rounded hover:bg-purple-100 transition-colors"
                                              title="Download certificate"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                              </svg>
                                              Download
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(cert.certificate_url, '_blank');
                                              }}
                                              className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 text-sm px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                                              title="View certificate"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                              </svg>
                                              View
                                            </button>
                                          </div>
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
