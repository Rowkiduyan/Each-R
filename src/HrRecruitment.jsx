// src/HrRecruitment.jsx
import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { getStoredJson } from "./authStorage";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";

/**
 * scheduleInterviewClient
 * Helper that invokes your Supabase Edge Function (name: "schedule-interview").
 * It returns { ok: true, data } or { ok: false, error }.
 */
async function scheduleInterviewClient(applicationId, interview) {
  try {
    const functionName = "schedule-interview-with-notification"; // Updated to use notification-enabled function
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: { applicationId, interview },
    });

    if (error) throw error;
    return { ok: true, data };
  } catch (err) {
    console.error("scheduleInterviewClient error:", err);
    return { ok: false, error: err };
  }
}

/**
 * scheduleAgreementSigningClient
 * Reuses the same Edge Function with kind="agreement_signing".
 */
async function scheduleAgreementSigningClient(applicationId, appointment) {
  try {
    const functionName = "schedule-agreement-signing-with-notification";
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: { applicationId, appointment },
    });

    if (error) {
      // Try to surface server-provided details for easier debugging
      const anyErr = error;

      let details = anyErr?.message || String(anyErr);
      try {
        const ctx = anyErr?.context;
        const resp = ctx?.response;

        if (resp && typeof resp.text === 'function') {
          const respClone = typeof resp.clone === 'function' ? resp.clone() : resp;
          const bodyText = await respClone.text();
          if (bodyText) details = bodyText;
        } else if (ctx?.body && typeof ctx.body === 'string') {
          details = ctx.body;
        } else if (ctx?.body) {
          try {
            const bodyText = await new Response(ctx.body).text();
            if (bodyText) details = bodyText;
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }

      try {
        const parsed = JSON.parse(details);
        if (parsed?.error && parsed?.details) {
          details = `${parsed.error}: ${parsed.details}`;
        } else if (parsed?.error) {
          details = String(parsed.error);
        } else {
          details = JSON.stringify(parsed);
        }
      } catch {
        // keep details as-is
      }

      throw new Error(details);
    }

    return { ok: true, data };
  } catch (err) {
    console.error("scheduleAgreementSigningClient error:", err);
    return { ok: false, error: err };
  }
}

/**
 * createEmployeeAuthAccount
 * Helper that invokes a Supabase Edge Function to create/update employee auth account using Admin API.
 * This handles both new users and existing users (by resetting their password).
 * It returns { ok: true, data } or { ok: false, error }.
 */
async function createEmployeeAuthAccount(employeeData) {
  try {
    const functionName = "create-employee-auth"; // Edge Function name
    const res = await supabase.functions.invoke(functionName, {
      body: JSON.stringify({
        email: employeeData.employeeEmail,
        password: employeeData.employeePassword,
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
      }),
    });

    // SDK may return a Response (fetch) or a plain object with .error or .data
    if (res instanceof Response) {
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(JSON.stringify(json || { status: res.status }));
      }
      return { ok: true, data: json };
    } else if (res?.error) {
      throw res.error;
    } else {
      return { ok: true, data: res };
    }
  } catch (err) {
    console.error("createEmployeeAuthAccount error:", err);
    return { ok: false, error: err };
  }
}

/**
 * sendEmployeeAccountEmail
 * Helper that invokes a Supabase Edge Function to send employee account credentials via email.
 * It returns { ok: true, data } or { ok: false, error }.
 */
async function sendEmployeeAccountEmail(employeeData) {
  try {
    const functionName = "send-employee-credentials"; // Edge Function name
    const res = await supabase.functions.invoke(functionName, {
      body: JSON.stringify(employeeData),
    });

    // SDK may return a Response (fetch) or a plain object with .error or .data
    if (res instanceof Response) {
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(JSON.stringify(json || { status: res.status }));
      }
      return { ok: true, data: json };
    } else if (res?.error) {
      throw res.error;
    } else {
      return { ok: true, data: res };
    }
  } catch (err) {
    console.error("sendEmployeeAccountEmail error:", err);
    return { ok: false, error: err };
  }
}

/**
 * Generate employee email from name
 * Format: first initial + last name + @roadwise.com
 * Example: "Lorenz Vincel A. Adalem" -> "ladalem@roadwise.com"
 */
function generateEmployeeEmail(firstName, lastName) {
  if (!firstName || !lastName) {
    return null;
  }
  const firstInitial = firstName.charAt(0).toLowerCase();
  const lastPart = lastName.toLowerCase().replace(/\s+/g, '');
  return `${firstInitial}${lastPart}@roadwise.com`;
}

/**
 * Generate employee password
 * Format: FirstInitial + LastName + Birthday (YYYYMMDD) + !
 * Example: "LAdalem19900101!"
 * If birthday is not available, use a default format
 */
function generateEmployeePassword(firstName, lastName, birthday) {
  const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : 'E';
  const lastPart = lastName ? lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase() : 'Employee';
  
  let birthdayPart = '';
  if (birthday) {
    // Try to parse birthday in various formats
    const date = new Date(birthday);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      birthdayPart = `${year}${month}${day}`;
    } else {
      // Try to extract YYYYMMDD from string
      const match = birthday.match(/(\d{4})[-/]?(\d{2})[-/]?(\d{2})/);
      if (match) {
        birthdayPart = `${match[1]}${match[2]}${match[3]}`;
      }
    }
  }
  
  // If no valid birthday, use a default (current year + 0101)
  if (!birthdayPart) {
    const currentYear = new Date().getFullYear();
    birthdayPart = `${currentYear}0101`;
  }
  
  return `${firstInitial}${lastPart}${birthdayPart}!`;
}

function HrRecruitment() {
  const navigate = useNavigate();
  const location = useLocation();

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Depot options for job posts
  const depotOptions = [
    "Batangas", "Bulacan", "Cagayan", "Calamba", "Calbayog", "Cebu", 
    "Davao", "Dipolog", "Iloilo", "Isabela", "Kalibo", "Kidapawan", 
    "La Union", "Liip", "Manggahan", "Mindoro", "Naga", "Ozamis", 
    "Palawan", "Pampanga", "Pasig", "Sucat", "Tacloban", "Tarlac", 
    "Taytay", "Tuguegarao", "Vigan"
  ];

  // Keep job titles/positions aligned with Employees.jsx (same as create job post)
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
    "Billing Department": ["Billing Specialist", "POD Specialist"],
    "HR Department": ["HR Specialist", "Recruitment Specialist", "HR Manager"],
    "Security & Safety Department": ["Safety Officer 2", "Safety Officer 3", "Security Officer"],
    "Collections Department": ["Billing & Collections Specialist", "Charges Specialist"],
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
    if (!position) return "";
    for (const [dept, list] of Object.entries(departmentToPositions)) {
      if ((list || []).includes(position)) return dept;
    }
    return "";
  };

  const allJobTitles = Object.values(departmentToPositions).flatMap((list) => list || []);

  const splitLines = (text) =>
    String(text || "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

  // Get current user info from localStorage
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    const userData = getStoredJson("loggedInHR");
    if (userData) setCurrentUser(userData);
  }, []);

  // ---- UI state
  const [activeSubTab, setActiveSubTab] = useState("Applications"); // "Applications" | "JobPosts"
  const [searchTerm, setSearchTerm] = useState("");
  const [listMode, setListMode] = useState('pending'); // 'pending' | 'rejected'
  const [currentPage, setCurrentPage] = useState(1);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [showRejectedModal, setShowRejectedModal] = useState(false);
  const [rejectionRemarks, setRejectionRemarks] = useState("");
  const [rejectedApplicants, setRejectedApplicants] = useState([]);
  
  // Custom alert modals
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmCallback, setConfirmCallback] = useState(null);
  const [pendingJobDelete, setPendingJobDelete] = useState(null); // { jobId, jobTitle }
  const [pendingJobApprove, setPendingJobApprove] = useState(null); // { jobId, jobTitle }
  const [isProcessingConfirm, setIsProcessingConfirm] = useState(false);
  const [isOpeningConfirmDialog, setIsOpeningConfirmDialog] = useState(false);
  
  // Filters for unified applications table
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [positionFilter, setPositionFilter] = useState("All");
  const [depotFilter, setDepotFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [recruitmentTypeFilter, setRecruitmentTypeFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);
  
  // Selected applicant detail view state
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState("Application");
  
  // Edit job post modal state
  const [showEditJobModal, setShowEditJobModal] = useState(false);
  const [editingJobPost, setEditingJobPost] = useState(null);
  const [editJobForm, setEditJobForm] = useState({
    title: "",
    depot: "",
    department: "",
    description: "",
    mainResponsibilities: "",
    keyRequirements: "",
    urgent: true,
    jobType: "office_employee",
    endDate: "",
    positions_needed: 1,
    positionsNoLimit: false,
  });
  const [updatingJobPost, setUpdatingJobPost] = useState(false);
  const [interviewFile, setInterviewFile] = useState(null);
  const [interviewFileName, setInterviewFileName] = useState("");
  const [assessmentFile, setAssessmentFile] = useState(null);
  const [assessmentFileName, setAssessmentFileName] = useState("");
  const [agreementFile, setAgreementFile] = useState(null);
  const [agreementFileName, setAgreementFileName] = useState("");
  const [undertakingFile, setUndertakingFile] = useState(null);
  const [undertakingFileName, setUndertakingFileName] = useState("");
  const [applicationFormFile, setApplicationFormFile] = useState(null);
  const [applicationFormFileName, setApplicationFormFileName] = useState("");
  const [undertakingDutiesFile, setUndertakingDutiesFile] = useState(null);
  const [undertakingDutiesFileName, setUndertakingDutiesFileName] = useState("");
  const [preEmploymentRequirementsFile, setPreEmploymentRequirementsFile] = useState(null);
  const [preEmploymentRequirementsFileName, setPreEmploymentRequirementsFileName] = useState("");
  const [idFormFile, setIdFormFile] = useState(null);
  const [idFormFileName, setIdFormFileName] = useState("");
  const [uploadingInterviewFile, setUploadingInterviewFile] = useState(false);
  const [uploadingAssessmentFile, setUploadingAssessmentFile] = useState(false);
  const [uploadingAgreementFile, setUploadingAgreementFile] = useState(false);
  const [uploadingUndertakingFile, setUploadingUndertakingFile] = useState(false);
  const [uploadingApplicationFormFile, setUploadingApplicationFormFile] = useState(false);
  const [uploadingUndertakingDutiesFile, setUploadingUndertakingDutiesFile] = useState(false);
  const [uploadingPreEmploymentRequirementsFile, setUploadingPreEmploymentRequirementsFile] = useState(false);
  const [uploadingIdFormFile, setUploadingIdFormFile] = useState(false);
  
  // Interview calendar state
  const [interviews, setInterviews] = useState([]);
  const [signingSchedules, setSigningSchedules] = useState([]);
  const [activeTab, setActiveTab] = useState('today'); // 'today', 'tomorrow', 'week', 'past'

  // Schedule mode (left panel)
  const [scheduleMode, setScheduleMode] = useState('interview'); // 'interview' | 'signing'

  // Track which scheduled interviews have been viewed (for red-dot indicator)
  const [viewedInterviewIds, setViewedInterviewIds] = useState(() => {
    try {
      const raw = localStorage.getItem('hrViewedInterviewIds');
      const arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) return new Set();
      return new Set(arr.map(String));
    } catch {
      return new Set();
    }
  });

  const markInterviewViewed = (id) => {
    const key = String(id);
    setViewedInterviewIds((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      try {
        localStorage.setItem('hrViewedInterviewIds', JSON.stringify(Array.from(next)));
      } catch {
        // ignore storage failures
      }
      return next;
    });
  };

  const isInterviewViewed = (id) => viewedInterviewIds.has(String(id));

  // Track which signing schedules have been viewed (separate from interview schedules)
  const [viewedSigningScheduleIds, setViewedSigningScheduleIds] = useState(() => {
    try {
      const raw = localStorage.getItem('hrViewedSigningScheduleIds');
      const arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) return new Set();
      return new Set(arr.map(String));
    } catch {
      return new Set();
    }
  });

  const markSigningScheduleViewed = (id) => {
    const key = String(id);
    setViewedSigningScheduleIds((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      try {
        localStorage.setItem('hrViewedSigningScheduleIds', JSON.stringify(Array.from(next)));
      } catch {
        // ignore storage failures
      }
      return next;
    });
  };

  const isSigningScheduleViewed = (id) => viewedSigningScheduleIds.has(String(id));

  useEffect(() => {
    if (!selectedApplicant?.id) return;

    const hasInterviewSchedule = Boolean(
      selectedApplicant.interview_date ||
      selectedApplicant.interview_time ||
      selectedApplicant.interview_location
    );
    if (hasInterviewSchedule) {
      markInterviewViewed(selectedApplicant.id);
    }

    const hasSigningSchedule = Boolean(
      selectedApplicant.agreement_signing_date ||
      selectedApplicant.agreement_signing_time ||
      selectedApplicant.agreement_signing_location
    );
    if (hasSigningSchedule) {
      markSigningScheduleViewed(selectedApplicant.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedApplicant]);

  // Auto-mark all schedules in the active tab as read once they are visible.
  // This removes the need to click each card to clear the "new" highlight.
  useEffect(() => {
    const list = (getActiveSchedules && typeof getActiveSchedules === 'function') ? getActiveSchedules() : [];
    const ids = (list || []).map((i) => String(i?.id)).filter(Boolean);
    if (ids.length === 0) return;

    if (scheduleMode === 'signing') {
      setViewedSigningScheduleIds((prev) => {
        let changed = false;
        const next = new Set(prev);
        ids.forEach((id) => {
          if (!next.has(id)) {
            next.add(id);
            changed = true;
          }
        });
        if (!changed) return prev;
        try {
          localStorage.setItem('hrViewedSigningScheduleIds', JSON.stringify(Array.from(next)));
        } catch {
          // ignore
        }
        return next;
      });
      return;
    }

    setViewedInterviewIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      ids.forEach((id) => {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      });
      if (!changed) return prev;
      try {
        localStorage.setItem('hrViewedInterviewIds', JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  }, [activeTab, scheduleMode, interviews, signingSchedules]);
  
  // Requirements state
  const [_documentStatus, setDocumentStatus] = useState({});
  const [_documentRemarks, setDocumentRemarks] = useState({});
  const [_idFields, setIdFields] = useState({
    sss: "",
    philhealth: "",
    pagibig: "",
    tin: "",
  });
  const [_idLocked, setIdLocked] = useState({
    sss: false,
    philhealth: false,
    pagibig: false,
    tin: false,
  });
  const [_idStatus, setIdStatus] = useState({
    sss: "Submitted",
    philhealth: "Submitted",
    pagibig: "Submitted",
    tin: "Submitted",
  });
  const [_idRemarks, setIdRemarks] = useState({
    sss: "",
    philhealth: "",
    pagibig: "",
    tin: "",
  });

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load rejected applicants when modal opens
  useEffect(() => {
    if (!showRejectedModal) return;

    (async () => {
      try {
        // Some environments may not have the `rejection_remarks` column yet.
        // Try selecting it first; if PostgREST says the column doesn't exist, retry without it.
        let data = null;
        let error = null;

        ({ data, error } = await supabase
          .from("applications")
          .select(`
            id,
            created_at,
            rejection_remarks,
            payload,
            job_posts:job_posts ( id, title, depot )
          `)
          .eq("status", "rejected")
          .order("created_at", { ascending: false }));

        const missingRemarksColumn =
          error &&
          (error.code === 'PGRST204' ||
            String(error.message || '').toLowerCase().includes('rejection_remarks'));

        if (missingRemarksColumn) {
          ({ data, error } = await supabase
            .from("applications")
            .select(`
              id,
              created_at,
              payload,
              job_posts:job_posts ( id, title, depot )
            `)
            .eq("status", "rejected")
            .order("created_at", { ascending: false }));
        }

        if (error) {
          console.error("Failed to load rejected applicants:", error);
          setRejectedApplicants([]);
          return;
        }

        const mapped = (data || []).map((row) => {
          let payloadObj = row.payload;
          if (typeof payloadObj === "string") {
            try { payloadObj = JSON.parse(payloadObj); } catch { payloadObj = {}; }
          }
          const source = payloadObj.form || payloadObj.applicant || payloadObj || {};
          const first = source.firstName || source.fname || source.first_name || "";
          const middle = source.middleName || source.mname || source.middle_name ? ` ${source.middleName || source.mname || source.middle_name}` : "";
          const last = source.lastName || source.lname || source.last_name ? ` ${source.lastName || source.lname || source.last_name}` : "";
          const fullName = `${first}${middle}${last}`.trim() || source.fullName || source.name || "Unnamed Applicant";

          return {
            id: row.id,
            name: fullName,
            position: row.job_posts?.title ?? source.position ?? "—",
            depot: row.job_posts?.depot ?? source.depot ?? "—",
            dateApplied: new Date(row.created_at).toLocaleDateString("en-US", {
              month: "short", day: "2-digit", year: "numeric",
            }),
            remarks: row.rejection_remarks || "No remarks provided",
          };
        });

        setRejectedApplicants(mapped);
      } catch (err) {
        console.error("Error loading rejected applicants:", err);
        setRejectedApplicants([]);
      }
    })();
  }, [showRejectedModal]);

  // ---- Interview modal state + scheduling
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [selectedApplicationForInterview, setSelectedApplicationForInterview] = useState(null);
  const [interviewForm, setInterviewForm] = useState({
    date: "",
    time: "",
    location: "",
    interviewer: "",
    interview_type: "onsite", // "online" or "onsite"
  });
  const [scheduling, setScheduling] = useState(false);

  // ---- Agreement signing schedule modal state + scheduling
  const [showAgreementSigningModal, setShowAgreementSigningModal] = useState(false);
  const [selectedApplicationForSigning, setSelectedApplicationForSigning] = useState(null);
  const [agreementSigningForm, setAgreementSigningForm] = useState({
    date: "",
    time: "",
    location: "",
  });
  const [schedulingAgreementSigning, setSchedulingAgreementSigning] = useState(false);

  // ---- Data from Supabase
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobPosts, setJobPosts] = useState([]);
  const [loadingJobPosts, setLoadingJobPosts] = useState(false);
  const itemsPerPage = 10;

  // expose a global opener so other pages/components can open the action modal for an applicant
  // Load requirements data when Requirements tab is active and applicant is selected
  useEffect(() => {
    if (activeDetailTab === "Requirements" && selectedApplicant) {
      let requirements = selectedApplicant.requirements;
      if (typeof requirements === 'string') {
        try { requirements = JSON.parse(requirements); } catch { requirements = {}; }
      }
      
      if (requirements && Object.keys(requirements).length > 0) {
        // Initialize state from requirements data
        if (requirements.id_numbers) {
          const idNums = requirements.id_numbers;
          Object.keys(idNums).forEach(key => {
            setIdFields(prev => {
              if (prev[key] !== idNums[key]?.value) {
                return { ...prev, [key]: idNums[key]?.value || "" };
              }
              return prev;
            });
            setIdStatus(prev => {
              if (prev[key] !== idNums[key]?.status) {
                return { ...prev, [key]: idNums[key]?.status || "Submitted" };
              }
              return prev;
            });
            setIdRemarks(prev => {
              if (prev[key] !== idNums[key]?.remarks) {
                return { ...prev, [key]: idNums[key]?.remarks || "" };
              }
              return prev;
            });
            setIdLocked(prev => {
              const shouldLock = !!idNums[key]?.value;
              if (prev[key] !== shouldLock) {
                return { ...prev, [key]: shouldLock };
              }
              return prev;
            });
          });
        }

        if (requirements.documents) {
          requirements.documents.forEach((doc, idx) => {
            const docKey = doc.key || `doc_${idx}`;
            setDocumentStatus(prev => {
              if (prev[docKey] !== doc.status) {
                return { ...prev, [docKey]: doc.status || "Submitted" };
              }
              return prev;
            });
            setDocumentRemarks(prev => {
              if (prev[docKey] !== doc.remarks) {
                return { ...prev, [docKey]: doc.remarks || "" };
              }
              return prev;
            });
          });
        }
      }
    }
  }, [activeDetailTab, selectedApplicant]);

  // Handle navigation from HrSched - open applicant detail with Assessment tab
  useEffect(() => {
    if (location.state?.applicationId && location.state?.openTab) {
      const appId = location.state.applicationId;
      const tab = location.state.openTab;
      
      // Find the applicant in the loaded data
      const applicant = applicants.find(a => a.id === appId);
      if (applicant) {
        setSelectedApplicant(applicant);
        setActiveDetailTab(tab);
        // Clear the location state to prevent reopening on refresh
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, applicants, navigate, location.pathname]);


  // Sync selectedApplicant with fresh data from applicants list when it updates
  useEffect(() => {
    if (selectedApplicant?.id && applicants.length > 0) {
      const updatedApplicant = applicants.find(a => a.id === selectedApplicant.id);
      if (updatedApplicant) {
        // Only update if the applicant data has actually changed (to avoid infinite loops)
        const hasChanges = 
          updatedApplicant.status !== selectedApplicant.status ||
          updatedApplicant.interview_date !== selectedApplicant.interview_date ||
          updatedApplicant.interview_confirmed !== selectedApplicant.interview_confirmed ||
          updatedApplicant.interview_time !== selectedApplicant.interview_time ||
          updatedApplicant.interview_location !== selectedApplicant.interview_location ||
          updatedApplicant.agreement_signing_date !== selectedApplicant.agreement_signing_date ||
          updatedApplicant.agreement_signing_time !== selectedApplicant.agreement_signing_time ||
          updatedApplicant.agreement_signing_location !== selectedApplicant.agreement_signing_location ||
          updatedApplicant.agreement_signing_confirmed !== selectedApplicant.agreement_signing_confirmed ||
          updatedApplicant.agreement_signing_confirmed_at !== selectedApplicant.agreement_signing_confirmed_at;
        
        if (hasChanges) {
          setSelectedApplicant(updatedApplicant);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicants]);

  // Handle navigation from create job post - switch to JobPosts tab
  useEffect(() => {
    if (location.state?.activeSubTab === "JobPosts") {
      setActiveSubTab("JobPosts");
      setSelectedApplicant(null);
      // Clear the location state to prevent re-triggering
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  // Ensure activeDetailTab is always an unlocked step
  useEffect(() => {
    if (!selectedApplicant) return;
    
    const applicantStatus = selectedApplicant?.status?.toLowerCase() || '';
    const hasInterview = !!selectedApplicant?.interview_date;
    const agencyApplicant = isAgency(selectedApplicant);
    const interviewConfirmed = selectedApplicant?.interview_confirmed === 'Confirmed' || 
                              selectedApplicant?.interview_confirmed === 'confirmed';
    const rescheduleRequested = (selectedApplicant?.interview_confirmed === 'Rejected' || selectedApplicant?.interview_confirmed === 'rejected') && hasInterview;
    
    // Check which steps are unlocked
    const step2Unlocked = ["screening", "interview", "scheduled", "onsite", "requirements", "docs_needed", "awaiting_documents", "agreement", "agreements", "final_agreement", "hired"].includes(applicantStatus);
    const step3Unlocked = hasInterview && (agencyApplicant ? !rescheduleRequested : interviewConfirmed);
    
    // If current tab is locked, switch to first unlocked step
    if (activeDetailTab === "Assessment" && !step2Unlocked) {
      setActiveDetailTab("Application");
    } else if (activeDetailTab === "Agreements" && !step3Unlocked) {
      // If Step 3 is locked, go to Step 2 if unlocked, otherwise Step 1
      if (step2Unlocked) {
        setActiveDetailTab("Assessment");
      } else {
        setActiveDetailTab("Application");
      }
    }
  }, [selectedApplicant, activeDetailTab]);

  useEffect(() => {
    window.openHrActionModal = (applicant) => {
      setSelectedApplicationForInterview(applicant);
      setShowActionModal(true);
    };
    return () => {
      try {
        delete window.openHrActionModal;
      } catch (err) {
        // log any cleanup issues
        console.warn("cleanup openHrActionModal delete error", err);
      }
    };
  }, []);

  // Helper: detect agency-sourced row
  const isAgency = (row) => {
    if (!row) return false;
    if (row.agency) return true;
    const raw = row.raw || {};
    const payload = raw.payload || {};
    try {
      const meta = payload.meta || (payload.form && payload.form.meta) || null;
      if (meta && (meta.source === "agency" || meta.source === "Agency")) return true;
      if (meta && (meta.endorsed_by_profile_id || meta.endorsed_by_auth_user_id)) return true;
      if (payload.agency === true) return true;
    } catch (err) {
      // ignore problems reading weird payloads
      console.warn("isAgency parsing error", err);
    }
    return false;
  };

  const isEmailLike = (value) => {
    if (typeof value !== 'string') return false;
    const s = value.trim();
    if (!s) return false;
    return /.+@.+\..+/.test(s);
  };

  const pickFirstEmail = (...candidates) => {
    for (const c of candidates) {
      if (isEmailLike(c)) return String(c).trim();
    }
    return "";
  };

  const pickFirstNonEmail = (...candidates) => {
    for (const c of candidates) {
      if (typeof c !== 'string' && typeof c !== 'number') continue;
      const s = String(c).trim();
      if (!s) continue;
      if (isEmailLike(s)) continue;
      return s;
    }
    return "";
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

  const formatFullAddressOneLine = (form) => {
    if (!form || typeof form !== 'object') return "";

    // Support agency payloads that already store a one-line address
    const oneLine =
      form.fullAddress ||
      form.full_address ||
      form.currentAddress ||
      form.current_address ||
      form.presentAddress ||
      form.present_address ||
      form.address ||
      form.current_address_text ||
      null;
    const oneLineStr = normalizeWs(oneLine);
    if (oneLineStr) return oneLineStr;
    const parts = [
      form.unit_house_number,
      form.house_number,
      form.unit,
      form.street,
      form.subdivision,
      form.village,
      form.subdivision_village,
      form.barangay,
      form.city,
      form.province,
      form.zip,
    ]
      .map(normalizeWs)
      .filter(Boolean);

    return parts.join(", ");
  };

  const isDriverRole = (position) => /\bdriver\b/i.test(String(position || ""));

  // Normalize and load applications from Supabase
  const loadApplications = async () => {
    setLoading(true);
    try {
      // Try to select with new columns first, fallback to basic columns if they don't exist
      let query = supabase
        .from("applications")
        .select(`
          id,
          user_id,
          job_id,
          status,
          created_at,
          payload,
          interview_date,
          interview_time,
          interview_location,
          interviewer,
          interview_confirmed,
          interview_confirmed_at,
          interview_details_file,
          assessment_results_file,
          appointment_letter_file,
          undertaking_file,
          application_form_file,
          undertaking_duties_file,
          pre_employment_requirements_file,
          id_form_file,
          job_posts:job_posts ( id, title, department, depot )
        `)
        .neq("status", "hired")
        .order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error("fetch applications error:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        setErrorMessage(`Failed to load applications: ${error.message || 'Unknown error'}`);
        setShowErrorAlert(true);
        setApplicants([]);
        setLoading(false);
        return;
      }

      if (!data) {
        console.warn("No data returned from applications query");
        setApplicants([]);
        setLoading(false);
        return;
      }

      console.log(`Loaded ${data.length} applications from database`);

      // Fetch resume_path from applicants table for all user_ids
      const userIds = [...new Set((data || []).map(r => r.user_id).filter(Boolean))];
      let applicantResumes = {};
      if (userIds.length > 0) {
        const { data: applicantsData } = await supabase
          .from('applicants')
          .select('id, resume_path')
          .in('id', userIds);
        
        if (applicantsData) {
          applicantsData.forEach(applicant => {
            if (applicant.resume_path) {
              applicantResumes[applicant.id] = applicant.resume_path;
            }
          });
        }
      }

      const mapped = (data || []).map((row) => {
        // normalize payload (jsonb or string)
        let payloadObj = row.payload;
        if (typeof payloadObj === "string") {
          try { payloadObj = JSON.parse(payloadObj); } catch { payloadObj = {}; }
        }

        // applicant might live in payload.form, payload.applicant, or payload root
        const source = payloadObj.form || payloadObj.applicant || payloadObj || {};
        // name fallbacks
        const firstName = source.firstName || source.fname || source.first_name || "";
        const middleName = source.middleName || source.mname || source.middle_name || "";
        const lastName = source.lastName || source.lname || source.last_name || "";
        const fullName =
          formatNameLastFirstMiddle({ last: lastName, first: firstName, middle: middleName }) ||
          normalizeWs(source.fullName || source.name) ||
          normalizeWs([firstName, middleName, lastName].filter(Boolean).join(" ")) ||
          "Unnamed Applicant";

        const position = row.job_posts?.title ?? source.position ?? "—";
        const department = normalizeDepartmentName(row.job_posts?.department ?? source.department ?? "");
        const depot = row.job_posts?.depot ?? source.depot ?? "—";

        const rawStatus = row.status || payloadObj.status || source.status || null;
        const statusNormalized = rawStatus ? String(rawStatus).toLowerCase() : "submitted";

        // Get resume path - prioritize from applicants table, then from payload
        const resumePath = applicantResumes[row.user_id] || source.resumePath || source.resumeName || null;

        const agreementSigning =
          payloadObj.agreement_signing ||
          payloadObj.agreementSigning ||
          payloadObj.signing_interview ||
          payloadObj.signingInterview ||
          null;

        const agencyFlag = isAgency({ raw: { payload: payloadObj }, payload: payloadObj, agency: payloadObj?.agency });

        const email = pickFirstEmail(
          source.email,
          source.personal_email,
          payloadObj.email,
          // legacy payloads sometimes stored email in contact
          source.contact
        );
        const phone = pickFirstNonEmail(
          source.contact,
          source.phone,
          source.contact_number,
          payloadObj.phone,
          payloadObj.contact_number
        );

        return {
          id: row.id,
          user_id: row.user_id,
          job_id: row.job_id,
          status: statusNormalized,
          name: fullName,
          position,
          department,
          depot,
          dateApplied: new Date(row.created_at).toLocaleDateString("en-US", {
            month: "short", day: "2-digit", year: "numeric",
          }),
          email,
          phone,
          resume_path: resumePath,
          agency: agencyFlag,
          raw: row,
          // surface interview fields if present (helpful in table later)
          interview_date: row.interview_date || row.payload?.interview?.date || null,
          interview_time: row.interview_time || row.payload?.interview?.time || null,
          interview_location: row.interview_location || row.payload?.interview?.location || null,
          interviewer: row.interviewer || row.payload?.interview?.interviewer || null,
          interview_type: row.interview_type || payloadObj.interview_type || payloadObj.interview?.type || 'onsite',
          // New fields - check both column and payload as fallback
          interview_confirmed: row.interview_confirmed ?? payloadObj.interview_confirmed ?? false,
          interview_confirmed_at: row.interview_confirmed_at ?? payloadObj.interview_confirmed_at ?? null,
          // Agreement signing schedule (stored in payload)
          agreement_signing_date: agreementSigning?.date || null,
          agreement_signing_time: agreementSigning?.time || null,
          agreement_signing_location: agreementSigning?.location || null,
          agreement_signing_confirmed: payloadObj.agreement_signing_confirmed ?? payloadObj.agreementSigningConfirmed ?? 'Idle',
          agreement_signing_confirmed_at: payloadObj.agreement_signing_confirmed_at ?? payloadObj.agreementSigningConfirmedAt ?? null,
          interview_details_file: row.interview_details_file ?? payloadObj.interview_details_file ?? null,
          assessment_results_file: row.assessment_results_file ?? payloadObj.assessment_results_file ?? null,
          appointment_letter_file: row.appointment_letter_file ?? payloadObj.appointment_letter_file ?? null,
          undertaking_file: row.undertaking_file ?? payloadObj.undertaking_file ?? null,
          application_form_file: row.application_form_file ?? payloadObj.application_form_file ?? null,
          undertaking_duties_file: row.undertaking_duties_file ?? payloadObj.undertaking_duties_file ?? null,
          pre_employment_requirements_file: row.pre_employment_requirements_file ?? payloadObj.pre_employment_requirements_file ?? null,
          id_form_file: row.id_form_file ?? payloadObj.id_form_file ?? null,
          // Load requirements data from payload (column may not exist yet)
          requirements: payloadObj.requirements ?? null,
        };
      });

      // Previously we tried to de‑duplicate by user_id + job_id, but this could
      // incorrectly hide distinct applicants that happen to share those fields.
      // Use the raw mapped list instead so every application row is visible.
      setApplicants(mapped);
    } catch (err) {
      console.error("loadApplications unexpected error:", err);
      setApplicants([]);
    } finally {
      setLoading(false);
    }
  };

  // ---- Load job posts from database
  const loadJobPosts = useCallback(async () => {
    setLoadingJobPosts(true);
    try {
      let query = supabase
        .from("job_posts")
        .select("id, title, depot, description, created_at, urgent, is_active, job_type, duration, expires_at, approval_status, created_by, positions_needed")
        .order("created_at", { ascending: false });

      // Filter by depot if user is HRC
      if (currentUser?.role?.toUpperCase() === 'HRC' && currentUser?.depot) {
        query = query.eq('depot', currentUser.depot);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error loading job posts:", error);
        setJobPosts([]);
        setLoadingJobPosts(false);
        return;
      }

      if (!data || data.length === 0) {
        setJobPosts([]);
        setLoadingJobPosts(false);
        return;
      }

      // Count applications for each job post
      const jobPostsWithStats = await Promise.all(
        data.map(async (jobPost) => {
          // Count applications for this job post
          const { data: applicationsData, error: appsError } = await supabase
            .from("applications")
            .select("id, status")
            .eq("job_id", jobPost.id);

          if (appsError) {
            console.error(`Error counting applications for job ${jobPost.id}:`, appsError);
          }

          const applications = applicationsData || [];
          const applied = applications.length;
          const hired = applications.filter((app) => app.status === "hired").length;
          const waitlisted = 0; // You can add waitlisted logic if needed

          const isExpired = (() => {
            if (!jobPost.expires_at) return false;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const expiresAt = new Date(jobPost.expires_at);
            expiresAt.setHours(0, 0, 0, 0);
            return today >= expiresAt;
          })();

          const positionsNeededNum = Number(jobPost.positions_needed);
          const hasLimit = Number.isFinite(positionsNeededNum) && positionsNeededNum > 0;
          const isFilled = hasLimit && hired >= positionsNeededNum;

          let isActive = jobPost.is_active;
          if (isActive && (isExpired || isFilled)) {
            const { error: closeError } = await supabase
              .from('job_posts')
              .update({ is_active: false })
              .eq('id', jobPost.id);
            if (closeError) {
              console.warn('Failed to auto-close job post:', jobPost.id, closeError);
            } else {
              isActive = false;
            }
          }

          // Determine status based on approval + closure rules.
          // Pending = approval_status is 'pending' (HRC posts waiting for HR approval)
          // Active = is_active is true
          // Closed = is_active is false AND (expired OR filled)
          // Draft = remaining inactive posts
          let status = "Draft";
          if (jobPost.approval_status === 'pending') {
            status = "Pending";
          } else if (isActive) {
            status = "Active";
          } else if (isExpired || isFilled) {
            status = "Closed";
          }

          return {
            id: jobPost.id,
            actualJobId: jobPost.id,
            title: jobPost.title || "Untitled",
            depot: jobPost.depot || "—",
            status: status,
            applied: applied,
            hired: hired,
            waitlisted: waitlisted,
            created_at: jobPost.created_at,
            urgent: jobPost.urgent,
            is_active: isActive,
            job_type: jobPost.job_type,
            approval_status: jobPost.approval_status,
            created_by: jobPost.created_by,
            positions_needed: jobPost.positions_needed ?? null,
          };
        })
      );

      setJobPosts(jobPostsWithStats);
    } catch (err) {
      console.error("Unexpected error loading job posts:", err);
      setJobPosts([]);
    } finally {
      setLoadingJobPosts(false);
    }
  }, [currentUser]);

  // ---- useEffect: initial load + polling + refetch on focus
  useEffect(() => {
    loadApplications();

    // Polling: refetch every 30 seconds
    const interval = setInterval(loadApplications, 30000);

    // Refetch when user returns to tab
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadApplications();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // run once on mount

  // Load job posts when JobPosts tab is active or when currentUser changes
  useEffect(() => {
    if (activeSubTab === "JobPosts") {
      loadJobPosts();
    }
  }, [activeSubTab, currentUser, loadJobPosts]);

  // Reload job posts when page becomes visible and JobPosts tab is active (e.g., returning from create page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && activeSubTab === "JobPosts") {
        loadJobPosts();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeSubTab, loadJobPosts]);

  // Fetch interviews for calendar
  useEffect(() => {
    fetchInterviews();
    fetchSigningSchedules();
  }, []);

  const fetchInterviews = async () => {
    console.log('[fetchInterviews] Starting to fetch interviews...');
    try {
      // First get applications with interview dates, join with job_posts to get title
      const { data: applicationsData, error: appsError } = await supabase
        .from('applications')
        .select('id, user_id, payload, interview_date, interview_time, interview_location, status, job_posts:job_posts ( title )')
        .not('interview_date', 'is', null)
        .order('interview_date', { ascending: true });
      
      console.log('[fetchInterviews] Applications with interviews:', applicationsData);
      console.log('[fetchInterviews] Query error:', appsError);
      
      if (appsError) {
        console.error('Error fetching applications:', appsError);
        setInterviews([]);
        return;
      }

      if (!applicationsData || applicationsData.length === 0) {
        console.log('[fetchInterviews] No applications with interview dates found');
        setInterviews([]);
        return;
      }

      // Get all unique applicant IDs
      const applicantIds = [...new Set(applicationsData.map(app => app.user_id).filter(Boolean))];
      console.log('[fetchInterviews] Applicant IDs:', applicantIds);

      if (applicantIds.length === 0) {
        console.log('[fetchInterviews] No applicant IDs found');
        setInterviews([]);
        return;
      }

      // Fetch applicant names
      const { data: applicantsData, error: applicantsError } = await supabase
        .from('applicants')
        .select('id, fname, lname')
        .in('id', applicantIds);

      console.log('[fetchInterviews] Applicants data:', applicantsData);
      console.log('[fetchInterviews] Applicants error:', applicantsError);

      if (applicantsError) {
        console.error('Error fetching applicants:', applicantsError);
      }

      // Create a map of applicant IDs to names
      const applicantMap = {};
      if (applicantsData) {
        applicantsData.forEach(applicant => {
          applicantMap[applicant.id] = `${applicant.fname} ${applicant.lname}`;
        });
      }

      console.log('[fetchInterviews] Applicant map:', applicantMap);

      // Transform the data
      const transformedData = applicationsData.map(app => {
        let payloadObj = app.payload;
        if (typeof payloadObj === 'string') {
          try { payloadObj = JSON.parse(payloadObj); } catch { payloadObj = {}; }
        }
        
        // Get applicant name - check applicantMap first (for regular applicants), then payload (for endorsed)
        let applicantName = 'Unknown';
        if (app.user_id && applicantMap[app.user_id]) {
          applicantName = applicantMap[app.user_id];
        } else {
          // For endorsed applicants, get name from payload.applicant or payload.form
          const applicantData = payloadObj.applicant || payloadObj.form || {};
          const fname = applicantData.firstName || applicantData.fname || '';
          const lname = applicantData.lastName || applicantData.lname || '';
          if (fname || lname) {
            applicantName = `${fname} ${lname}`.trim();
          }
        }
        
        // Get source for position extraction
        const source = payloadObj.form || payloadObj.applicant || payloadObj || {};
        
        // Get position/title - prioritize job_posts.title, then payload fields
        const position = app.job_posts?.title ?? source.position ?? source.title ?? 'Position Not Set';
        const interviewType = payloadObj.interview_type || source.interview_type || 'onsite';
        
        return {
          id: app.id,
          applicant_name: applicantName,
          position: position,
          time: app.interview_time || 'Not set',
          date: app.interview_date,
          status: app.status || 'scheduled',
          interview_type: interviewType
        };
      });
      
      console.log('[fetchInterviews] Transformed data:', transformedData);
      console.log('[fetchInterviews] Setting interviews state with', transformedData.length, 'interviews');
      setInterviews(transformedData);
    } catch (error) {
      console.error('Error fetching interviews:', error);
      setInterviews([]);
    }
  };

  const fetchSigningSchedules = async () => {
    console.log('[fetchSigningSchedules] Starting to fetch signing schedules...');
    try {
      const { data: applicationsData, error: appsError } = await supabase
        .from('applications')
        .select('id, user_id, payload, status, job_posts:job_posts ( title )')
        .order('created_at', { ascending: false });

      if (appsError) {
        console.error('[fetchSigningSchedules] Error fetching applications:', appsError);
        setSigningSchedules([]);
        return;
      }

      const rows = applicationsData || [];
      if (rows.length === 0) {
        setSigningSchedules([]);
        return;
      }

      const applicantIds = [...new Set(rows.map(app => app.user_id).filter(Boolean))];

      let applicantMap = {};
      if (applicantIds.length > 0) {
        const { data: applicantsData, error: applicantsError } = await supabase
          .from('applicants')
          .select('id, fname, lname')
          .in('id', applicantIds);

        if (applicantsError) {
          console.error('[fetchSigningSchedules] Error fetching applicants:', applicantsError);
        }

        if (applicantsData) {
          applicantsData.forEach(applicant => {
            applicantMap[applicant.id] = `${applicant.fname} ${applicant.lname}`;
          });
        }
      }

      const transformed = rows
        .map((app) => {
          let payloadObj = app.payload;
          if (typeof payloadObj === 'string') {
            try { payloadObj = JSON.parse(payloadObj); } catch { payloadObj = {}; }
          }

          const agreementSigning =
            payloadObj?.agreement_signing ||
            payloadObj?.agreementSigning ||
            payloadObj?.signing_interview ||
            payloadObj?.signingInterview ||
            null;

          const signingDate = agreementSigning?.date || null;
          const signingTime = agreementSigning?.time || 'Not set';
          const signingLocation = agreementSigning?.location || null;

          if (!signingDate && (!agreementSigning?.time || agreementSigning?.time === '')) return null;

          let applicantName = 'Unknown';
          if (app.user_id && applicantMap[app.user_id]) {
            applicantName = applicantMap[app.user_id];
          } else {
            const applicantData = payloadObj.applicant || payloadObj.form || {};
            const fname = applicantData.firstName || applicantData.fname || '';
            const lname = applicantData.lastName || applicantData.lname || '';
            if (fname || lname) {
              applicantName = `${fname} ${lname}`.trim();
            }
          }

          const source = payloadObj.form || payloadObj.applicant || payloadObj || {};
          const position = app.job_posts?.title ?? source.position ?? source.title ?? 'Position Not Set';

          return {
            id: app.id,
            applicant_name: applicantName,
            position,
            time: signingTime,
            date: signingDate,
            location: signingLocation,
            status: app.status || 'scheduled',
            interview_type: 'onsite',
          };
        })
        .filter(Boolean)
        .sort((a, b) => {
          const ad = String(a.date || '');
          const bd = String(b.date || '');
          if (ad !== bd) return ad.localeCompare(bd);
          const at = String(a.time || '');
          const bt = String(b.time || '');
          return at.localeCompare(bt);
        });

      setSigningSchedules(transformed);
    } catch (error) {
      console.error('[fetchSigningSchedules] Unexpected error:', error);
      setSigningSchedules([]);
    }
  };

  // Calendar helper functions
  const formatTime = (time24) => {
    if (!time24 || time24 === 'Not set') return 'Not set';
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours);
    const m = minutes || '00';
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayHour}:${m} ${period}`;
  };

  const getTodayInterviews = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayInterviews = interviews.filter(interview => interview.date === today && String(interview.status || '').toLowerCase() !== 'hired');
    return todayInterviews.sort((a, b) => {
      if (!a.time || a.time === 'Not set') return 1;
      if (!b.time || b.time === 'Not set') return -1;
      return a.time.localeCompare(b.time);
    });
  };

  const getTomorrowInterviews = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];
    const tomorrowInterviews = interviews.filter(interview => interview.date === tomorrowDate && String(interview.status || '').toLowerCase() !== 'hired');
    return tomorrowInterviews.sort((a, b) => {
      if (!a.time || a.time === 'Not set') return 1;
      if (!b.time || b.time === 'Not set') return -1;
      return a.time.localeCompare(b.time);
    });
  };

  const getThisWeekInterviews = () => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const weekInterviews = interviews.filter(interview => {
      const interviewDate = new Date(interview.date);
      return interviewDate >= today && interviewDate <= nextWeek;
    });

    const filteredWeek = weekInterviews.filter((interview) => String(interview.status || '').toLowerCase() !== 'hired');
    
    return filteredWeek.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (!a.time || a.time === 'Not set') return 1;
      if (!b.time || b.time === 'Not set') return -1;
      return a.time.localeCompare(b.time);
    });
  };

  const getPastInterviews = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const pastInterviews = interviews.filter(interview =>
      String(interview.status || '').toLowerCase() === 'hired' ||
      (interview.date && interview.date < todayStr)
    );
    return pastInterviews.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      if (!a.time || a.time === 'Not set') return 1;
      if (!b.time || b.time === 'Not set') return -1;
      return b.time.localeCompare(a.time);
    });
  };

  const getTodaySigningSchedules = () => {
    const today = new Date().toISOString().split('T')[0];
    const todaySchedules = signingSchedules.filter((s) => s.date === today && String(s.status || '').toLowerCase() !== 'hired');
    return todaySchedules.sort((a, b) => {
      if (!a.time || a.time === 'Not set') return 1;
      if (!b.time || b.time === 'Not set') return -1;
      return String(a.time).localeCompare(String(b.time));
    });
  };

  const getTomorrowSigningSchedules = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];
    const tomorrowSchedules = signingSchedules.filter((s) => s.date === tomorrowDate && String(s.status || '').toLowerCase() !== 'hired');
    return tomorrowSchedules.sort((a, b) => {
      if (!a.time || a.time === 'Not set') return 1;
      if (!b.time || b.time === 'Not set') return -1;
      return String(a.time).localeCompare(String(b.time));
    });
  };

  const getThisWeekSigningSchedules = () => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const weekSchedules = signingSchedules.filter((s) => {
      const d = new Date(s.date);
      return d >= today && d <= nextWeek;
    });

    const filteredWeek = weekSchedules.filter((s) => String(s.status || '').toLowerCase() !== 'hired');
    return filteredWeek.sort((a, b) => {
      if (a.date !== b.date) return String(a.date).localeCompare(String(b.date));
      if (!a.time || a.time === 'Not set') return 1;
      if (!b.time || b.time === 'Not set') return -1;
      return String(a.time).localeCompare(String(b.time));
    });
  };

  const getPastSigningSchedules = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const past = signingSchedules.filter((s) =>
      String(s.status || '').toLowerCase() === 'hired' ||
      (s.date && s.date < todayStr)
    );
    return past.sort((a, b) => {
      if (a.date !== b.date) return String(b.date).localeCompare(String(a.date));
      if (!a.time || a.time === 'Not set') return 1;
      if (!b.time || b.time === 'Not set') return -1;
      return String(b.time).localeCompare(String(a.time));
    });
  };

  const getActiveInterviews = () => {
    switch (activeTab) {
      case 'today': return getTodayInterviews();
      case 'tomorrow': return getTomorrowInterviews();
      case 'week': return getThisWeekInterviews();
      case 'past': return getPastInterviews();
      default: return getTodayInterviews();
    }
  };

  const getActiveSchedules = () => {
    if (scheduleMode === 'signing') {
      switch (activeTab) {
        case 'today': return getTodaySigningSchedules();
        case 'tomorrow': return getTomorrowSigningSchedules();
        case 'week': return getThisWeekSigningSchedules();
        case 'past': return getPastSigningSchedules();
        default: return getTodaySigningSchedules();
      }
    }
    return getActiveInterviews();
  };

  const hasNewScheduleInTab = (tabKey) => {
    const list = scheduleMode === 'signing'
      ? tabKey === 'today'
        ? getTodaySigningSchedules()
        : tabKey === 'tomorrow'
        ? getTomorrowSigningSchedules()
        : tabKey === 'week'
        ? getThisWeekSigningSchedules()
        : tabKey === 'past'
        ? getPastSigningSchedules()
        : []
      : tabKey === 'today'
        ? getTodayInterviews()
        : tabKey === 'tomorrow'
        ? getTomorrowInterviews()
        : tabKey === 'week'
        ? getThisWeekInterviews()
        : tabKey === 'past'
        ? getPastInterviews()
        : [];

    return list.some((i) => scheduleMode === 'signing' ? !isSigningScheduleViewed(i.id) : !isInterviewViewed(i.id));
  };

  const getTabTitle = () => {
    const label = scheduleMode === 'signing' ? 'Signings' : 'Interviews';
    switch (activeTab) {
      case 'today': return `Today's ${label}`;
      case 'tomorrow': return `Tomorrow's ${label}`;
      case 'week': return `This Week's ${label}`;
      case 'past': return `Past ${label}`;
      default: return `Today's ${label}`;
    }
  };

  const getTabDate = () => {
    const today = new Date();
    switch (activeTab) {
      case 'today':
        return today.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        });
      case 'tomorrow': {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        return tomorrow.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        });
      }
      case 'week': {
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        return `${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${nextWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
      case 'past':
        return "Previous interviews";
      default:
        return today.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        });
    }
  };

  const openRejectForApplicant = useCallback((applicantLike) => {
    if (!applicantLike?.id) return;
    setSelectedApplicant(applicantLike);
    setShowActionModal(true);
    setActionType("reject");
  }, []);

  // ---- Buckets based on application status
  const getStatus = (a) => {
    if (!a) return "submitted";
    return a.status || "submitted";
  };

  // Filter applicants by depot for HRC users
  const filteredApplicantsByDepot = useMemo(() => {
    if (currentUser?.role?.toUpperCase() === 'HRC' && currentUser?.depot) {
      return applicants.filter(a => a.depot === currentUser.depot);
    }
    return applicants;
  }, [applicants, currentUser]);

  const applicationsBucket = filteredApplicantsByDepot.filter((a) => {
    const s = getStatus(a);
    return ["submitted", "pending"].includes(s);
  });

  const interviewBucket = filteredApplicantsByDepot.filter((a) => {
    const s = getStatus(a);
    return ["screening", "interview", "scheduled", "onsite"].includes(s);
  });

  const requirementsBucket = filteredApplicantsByDepot.filter((a) => {
    const s = getStatus(a);
    return ["requirements", "docs_needed", "awaiting_documents"].includes(s);
  });

  const agreementsBucket = filteredApplicantsByDepot.filter((a) => {
    const s = getStatus(a);
    return ["agreement", "agreements", "final_agreement"].includes(s);
  });

  // ---- Search & pagination (applications tab uses applicationsBucket)
  const filteredApplicants = applicationsBucket.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.depot.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const _filteredInterview = interviewBucket.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.depot.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const _filteredRequirements = requirementsBucket.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.depot.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const _filteredAgreements = agreementsBucket.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.depot.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const _totalPages = Math.ceil(filteredApplicants.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const _paginatedApplicants = filteredApplicants.slice(startIndex, startIndex + itemsPerPage);

  // ---- Try multiple RPC parameter names / function names to be resilient ----
  const rpcCandidates = [
    { fn: "move_applicant_to_employee", param: "p_application_id" },
    { fn: "move_applicant_to_employee", param: "p_app_id" },
    { fn: "move_applicant_to_employee", param: "p_applicant_id" },
    { fn: "hire_applicant", param: "p_application_id" },
    { fn: "hire_applicant", param: "p_app_id" },
    { fn: "hire_applicant_v2", param: "p_app_id" },
  ];

  // Return a best-effort attempt: which candidate worked and the rpc response.
  async function tryRpcMoveToEmployee(appId) {
    // attempt the candidates in sequence
    for (const c of rpcCandidates) {
      try {
        const params = {};
        params[c.param] = appId;
        // Position and depot are now extracted from payload by the function, no need to pass them
        console.debug("[rpc-try] calling", c.fn, params);
        const { data, error } = await supabase.rpc(c.fn, params);

        if (error) {
          // Check if this is a duplicate email error (non-fatal - employee already exists)
          const isDuplicateEmail = error.code === '23505' && 
            (error.message?.includes('employees_email_key') || error.details?.includes('email'));
          
          if (isDuplicateEmail) {
            // Don't log warning - this is expected when employee already exists
            console.log("[rpc-try] Employee already exists, fetching existing record");
            
            // Extract email from error details
            const emailMatch = error.details?.match(/\(email\)=\(([^)]+)\)/);
            const existingEmail = emailMatch ? emailMatch[1] : null;
            
            if (existingEmail) {
              // Fetch the existing employee record to get all fields including department
              try {
                const { data: existingEmployee, error: fetchError } = await supabase
                  .from('employees')
                  .select('*')
                  .eq('email', existingEmail)
                  .single();
                
                if (!fetchError && existingEmployee) {
                  console.log("[rpc-try] Found existing employee:", existingEmployee);
                  // Return success with existing employee data
                  return { 
                    ok: true, 
                    candidate: c, 
                    data: { 
                      ok: true, 
                      employee_id: existingEmployee.id,
                      department: existingEmployee.department,
                      depot: existingEmployee.depot,
                      position: existingEmployee.position,
                      fname: existingEmployee.fname,
                      lname: existingEmployee.lname,
                      email: existingEmployee.email,
                      existing: true 
                    } 
                  };
                }
              } catch (fetchErr) {
                console.error("[rpc-try] Error fetching existing employee:", fetchErr);
              }
            }
            
            // Fallback: return success without data
            return { 
              ok: true, 
              candidate: c, 
              data: { 
                ok: true, 
                message: 'Employee already exists',
                existing: true 
              } 
            };
          }
          
          // log and continue trying other candidates unless it's a non-existant function HTTP 404 style
          console.warn("[rpc-try] rpc returned error for", c, error);
          // sometimes PostgREST returns PGRST202 meaning function signature not found in schema cache
          // keep trying next candidate
          continue;
        }

        // data came back - return which candidate worked and the returned payload
        console.log("RPC SUCCESS - Function:", c.fn, "Data:", data);
        console.log("Department from RPC:", data?.department);
        console.log("Depot from RPC:", data?.depot);
        console.log("Position from RPC:", data?.position);
        return { ok: true, candidate: c, data };
      } catch (err) {
        console.warn("[rpc-try] unexpected exception calling", c, err);
        // try next
      }
    }

    return { ok: false, error: "no_candidate_matched" };
  }

  // ---- Move application -> employee and remove from local list
  const handleMarkAsEmployee = async (applicationId, applicantName) => {
    if (!applicationId) {
      setErrorMessage("Missing application id.");
      setShowErrorAlert(true);
      return;
    }
    // Show confirm dialog (generic wording that works for agency and direct hires)
    setConfirmMessage(
      `Mark ${applicantName} as Employee? This will create or update their employee record and mark the application as hired.`
    );
    setConfirmCallback(() => async () => {
      // Guard against duplicate execution
      let emailSent = false;
      
      try {
        // First, get the application data to extract applicant information
        // Include job_posts with department field
        const { data: applicationData, error: appError } = await supabase
          .from("applications")
          .select("*, job_posts(id, title, depot, department)")
          .eq("id", applicationId)
          .single();

        if (appError || !applicationData) {
          setErrorMessage("Failed to load application data.");
          setShowErrorAlert(true);
          return;
        }

        // Check if application is already marked as hired to prevent duplicate processing
        if (applicationData.status === "hired") {
          setErrorMessage("This applicant has already been marked as hired.");
          setShowErrorAlert(true);
          return;
        }

        // Extract applicant information from payload
        let payloadObj = applicationData.payload;
        if (typeof payloadObj === 'string') {
          try {
            payloadObj = JSON.parse(payloadObj);
          } catch {
            payloadObj = {};
          }
        }

        const source = payloadObj.form || payloadObj.applicant || payloadObj || {};
        const firstName = source.firstName || source.fname || source.first_name || "";
        const lastName = source.lastName || source.lname || source.last_name || "";
        const middleName = source.middleName || source.mname || source.middle_name || "";
        const applicantEmail = pickFirstEmail(
          source.email,
          source.personal_email,
          payloadObj.email,
          // legacy payloads sometimes stored email in contact
          source.contact
        );
        const birthday = source.birthday || source.birth_date || source.dateOfBirth || null;
        
        // Log payload structure for debugging
        console.log("[Mark as Hired] Payload structure:", {
          hasForm: !!payloadObj.form,
          hasApplicant: !!payloadObj.applicant,
          hasJob: !!payloadObj.job,
          formDepartment: payloadObj.form?.department,
          applicantDepartment: payloadObj.applicant?.department,
          jobDepartment: payloadObj.job?.department
        });

        if (!firstName || !lastName) {
          setErrorMessage("Cannot mark as employee: missing name information.");
          setShowErrorAlert(true);
          return;
        }

        // Detect if this applicant is agency/endorsed
        const meta = payloadObj.meta || {};
        const isAgencyApplicant =
          applicationData.endorsed === true ||
          meta.source === "agency" ||
          meta.source === "Agency" ||
          !!meta.endorsed_by_profile_id ||
          !!meta.endorsed_by_auth_user_id ||
          source.agency === true;

        // Decide which email to store on the employee record:
        // - For agency/endorsed: use their original applicant email (no corporate account)
        // - For direct hires: generate a corporate employee email
        let employeeEmail;
        let employeePassword = null;

        if (isAgencyApplicant) {
          employeeEmail = applicantEmail || generateEmployeeEmail(firstName, lastName);
        } else {
          employeeEmail = generateEmployeeEmail(firstName, lastName);
          employeePassword = generateEmployeePassword(firstName, lastName, birthday);
        }

        if (!employeeEmail) {
          setErrorMessage("Failed to determine employee email.");
          setShowErrorAlert(true);
          return;
        }

        // Get position from application data
        const position = applicationData.job_posts?.title || source.position || selectedApplicant?.position || null;
        
        // call the best RPC available to create employee record (with position if available)
        const rpcResult = await tryRpcMoveToEmployee(applicationId);

        if (!rpcResult.ok) {
          // no candidate matched or all failed
          console.error("RPC attempts failed:", rpcResult);
          setErrorMessage("Could not find a suitable server function to mark applicant as hired. Check server functions or logs.");
          setShowErrorAlert(true);
          return;
        }

        // If the RPC returned an error-like payload
        const rpcData = rpcResult.data;
        if (rpcData && typeof rpcData === "object" && (rpcData.ok === false || rpcData.error)) {
          const msg = rpcData.message || JSON.stringify(rpcData);

          // Non‑fatal cases where we still want to continue and fall back to JS logic
          const isDuplicateEmail =
            msg.includes("duplicate key") && msg.includes("email");

          // Old RPCs may reference the dropped recruitment_endorsements table.
          // If that's the only problem, ignore it and let the JS upsert to employees handle it.
          const isMissingRecruitmentEndorsements =
            msg.toLowerCase().includes("recruitment_endorsements") ||
            msg.includes("42P01");

          if (isDuplicateEmail || isMissingRecruitmentEndorsements) {
            console.warn(
              "RPC reported non‑fatal issue, continuing with JS flow:",
              rpcResult.candidate,
              msg
            );
            // Continue with success flow
          } else {
            console.error("RPC returned failure payload:", rpcResult.candidate, rpcData);
            setErrorMessage(msg);
            setShowErrorAlert(true);
            return;
          }
        }

        // For direct hires, create/update Supabase Auth account so they can log in.
        // For agency/endorsed hires, skip auth account creation (they won't log in).
        let authUserId = null;
        if (!isAgencyApplicant && employeePassword) {
          try {
            const authResult = await createEmployeeAuthAccount({
              employeeEmail: employeeEmail,
              employeePassword: employeePassword,
              firstName: firstName,
              lastName: lastName,
            });

            if (!authResult.ok) {
              console.error("Failed to create/update auth account:", authResult.error);
              // Continue anyway - the employee record was created, we'll just skip the auth account
              console.warn("Proceeding without auth account creation");
            } else {
              authUserId = authResult.data?.userId;
              console.log("Auth account created/updated successfully:", authResult.data?.message);
            }
          } catch (authErr) {
            console.error("Error creating auth account:", authErr);
            // Continue anyway - the employee record was created, we'll just skip the auth account
            console.warn("Proceeding without auth account creation");
          }
        }

        // Create or update profile with Employee role (only for direct hires with auth account)
        if (authUserId) {
          try {
            // Check if profile exists
            const { data: existingProfile } = await supabase
              .from("profiles")
              .select("id")
              .eq("id", authUserId)
              .single();

            if (!existingProfile) {
              // Create new profile
              const { error: profileError } = await supabase.from("profiles").insert([
                {
                  id: authUserId,
                  first_name: firstName,
                  last_name: lastName,
                  email: employeeEmail,
                  role: "Employee",
                },
              ]);

              if (profileError && profileError.code !== "23505") {
                console.error("Error creating profile:", profileError);
              }
            } else {
              // Update existing profile to Employee role
              const { error: updateError } = await supabase
                .from("profiles")
                .update({ role: "Employee" })
                .eq("id", authUserId);

              if (updateError) {
                console.error("Error updating profile role:", updateError);
              }
            }
          } catch (profileErr) {
            console.error("Error managing profile:", profileErr);
          }
        }

        // Ensure there's a matching row in employees table (for HR/Agency modules)
        let employeeCreated = false;
        try {
          // Source should match reality for profiling/filters:
          // - agency/endorsed: "agency"
          // - direct applicants hired via recruitment: "recruitment"
          const employeeSource = isAgencyApplicant ? "agency" : "recruitment";
          
          // Extract additional fields from application payload
          const contactNumber = pickFirstNonEmail(
            source.contact,
            source.contact_number,
            source.phone,
            payloadObj.phone,
            payloadObj.contact_number
          ) || null;
          // Use depot from RPC response (already extracted from payload), fallback to other sources
          const depot = rpcData?.depot || applicationData.job_posts?.depot || source.depot || source.preferred_depot || null;
          // Use position from RPC response (already extracted from payload)
          const rpcPosition = rpcData?.position || position;
          // Use department - extract from all possible locations in payload
          const department = 
            applicationData.job_posts?.department || // From job_posts join
            payloadObj.job?.department ||            // From job snapshot in payload
            payloadObj.form?.department ||           // From form data in payload
            payloadObj.applicant?.department ||      // From applicant data (endorsed)
            source.department ||                     // Fallback to source
            rpcData?.department ||                   // From RPC (might be null for old records)
            null;
          
          console.log("[Mark as Hired] Department extraction:", {
            fromJobPosts: applicationData.job_posts?.department,
            fromPayloadJob: payloadObj.job?.department,
            fromPayloadForm: payloadObj.form?.department,
            fromPayloadApplicant: payloadObj.applicant?.department,
            fromRpc: rpcData?.department,
            final: department
          });
          
          // Build employee data with only fields that exist in the employees table
          // Based on Employees.jsx, the table has: id, email, fname, lname, mname, contact_number, 
          // position, depot, department, role, hired_at, source, endorsed_by_agency_id, endorsed_at, agency_profile_id, status, personal_email
          const employeeData = {
            id: rpcData?.employee_id || applicationData.user_id, // Use the ID from RPC or application
            email: employeeEmail,
            fname: firstName,
            lname: lastName,
            mname: middleName || null,
            contact_number: contactNumber,
            depot: depot, // Use depot from RPC (extracted from payload)
            position: rpcPosition || null, // Use position from RPC (extracted from payload)
            department: department || null, // Use department from RPC (extracted from payload)
            role: "Employee",
            hired_at: new Date().toISOString(),
            source: employeeSource,
            status: "Probationary", // Set new employees as Probationary
            personal_email: applicantEmail || null, // Carry over applicant's personal email
            // For agency applicants, preserve agency metadata
            ...(isAgencyApplicant && {
              is_agency: true,
              agency_profile_id: meta.endorsed_by_profile_id || null,
              endorsed_by_agency_id: meta.endorsed_by_profile_id || null,
              endorsed_at: meta.endorsed_at || new Date().toISOString(),
            }),
          };

          // Try upsert, handling potential column errors gracefully
          let upsertData = null;
          let empUpsertErr = null;
          
          const { data, error } = await supabase
            .from("employees")
            .upsert(
              employeeData,
              // Use ID conflict to update the record created by SQL function
              { onConflict: "id" }
            )
            .select();

          upsertData = data;
          empUpsertErr = error;

          // If error is about missing columns, try without optional fields
          if (empUpsertErr && empUpsertErr.code === "PGRST204") {
            console.warn("First upsert attempt failed due to missing columns, retrying with minimal fields:", empUpsertErr.message);
            
            // Retry with only essential fields
            const minimalEmployeeData = {
              id: rpcData?.employee_id || applicationData.user_id, // Include ID
              email: employeeEmail,
              fname: firstName,
              lname: lastName,
              mname: middleName || null,
              contact_number: contactNumber,
              depot: depot, // Use depot from RPC (extracted from payload)
              position: rpcPosition || null,
              department: department || null,
              role: "Employee",
              hired_at: new Date().toISOString(),
              source: employeeSource,
              status: "Probationary", // Set new employees as Probationary
              personal_email: applicantEmail || null, // Carry over applicant's personal email
            };

            const { data: retryData, error: retryError } = await supabase
              .from("employees")
              .upsert(
                minimalEmployeeData,
                { onConflict: "id" }
              )
              .select();

            if (!retryError) {
              upsertData = retryData;
              empUpsertErr = null;
              console.log("Employee record created with minimal fields");
            } else {
              empUpsertErr = retryError;
            }
          }

          if (empUpsertErr) {
            console.error("Error upserting employees row:", empUpsertErr);
            setErrorMessage(`Failed to create employee record: ${empUpsertErr.message || 'Unknown error'}. Please check the console for details.`);
            setShowErrorAlert(true);
            return;
          }

          // Verify employee was created/updated
          if (upsertData && upsertData.length > 0) {
            employeeCreated = true;
            console.log("Employee record created/updated successfully:", upsertData[0]);
          } else {
            // Double-check by querying the employee
            const { data: verifyData, error: verifyErr } = await supabase
              .from("employees")
              .select("id, email, fname, lname")
              .eq("email", employeeEmail)
              .single();

            if (verifyErr || !verifyData) {
              console.error("Employee verification failed:", verifyErr);
              setErrorMessage(`Employee account was created but could not be verified in employees table. Please check manually.`);
              setShowErrorAlert(true);
              return;
            } else {
              employeeCreated = true;
              console.log("Employee verified in database:", verifyData);
            }
          }
        } catch (empErr) {
          console.error("Unexpected error upserting employees row:", empErr);
          setErrorMessage(`Unexpected error creating employee record: ${empErr.message || 'Unknown error'}. Please check the console.`);
          setShowErrorAlert(true);
          return;
        }

        if (!employeeCreated) {
          setErrorMessage("Failed to create employee record. Please try again or check the console for details.");
          setShowErrorAlert(true);
          return;
        }

        // Send email with credentials
        // Send email with credentials only for direct hires who got an account
        // Only send once - guard against duplicate sends
        if (!isAgencyApplicant && employeePassword && !emailSent) {
          try {
            emailSent = true; // Set flag before sending to prevent duplicates
            const emailResult = await sendEmployeeAccountEmail({
              toEmail: applicantEmail, // Send to the email they used for application
              employeeEmail: employeeEmail,
              employeePassword: employeePassword,
              firstName: firstName,
              lastName: lastName,
              fullName: `${firstName}${middleName ? ` ${middleName}` : ''} ${lastName}`.trim(),
            });

            if (!emailResult.ok) {
              console.warn("Failed to send email, but employee account was created:", emailResult.error);
              // Don't fail the whole process if email fails
            } else {
              console.log("Employee account email sent successfully to:", applicantEmail);
            }
          } catch (emailErr) {
            console.error("Error sending email:", emailErr);
            // Don't fail the whole process if email fails
            emailSent = false; // Reset flag on error so it can be retried if needed
          }
        }

        // Success path - still update applications.status = 'hired' to keep canonical state
        const { error: updErr } = await supabase
          .from("applications")
          .update({ status: "hired" })
          .eq("id", applicationId);

        if (updErr) {
          console.warn("Update application status failed (non-fatal):", updErr);
        }

        // Optimistically remove from local list to reflect change immediately
        setApplicants((prev) => prev.filter((a) => a.id !== applicationId));

        // ensure we re-load from server to reflect the canonical state
        await loadApplications();

        // Show success message
        if (isAgencyApplicant) {
          setSuccessMessage(`${applicantName} marked as employee (agency/endorsed).`);
        } else {
          setSuccessMessage(`${applicantName} marked as employee. Account credentials sent to ${applicantEmail}`);
        }
        setShowSuccessAlert(true);
        
        // Clear selected applicant if it was the one we just hired
        if (selectedApplicant && selectedApplicant.id === applicationId) {
          setSelectedApplicant(null);
        }
      } catch (err) {
        console.error("markAsEmployee unexpected error:", err);
        // Ignore duplicate email errors - the employee is already in the database
        if (err && (err.message?.includes('duplicate key') || err.message?.includes('employees_email_key'))) {
          console.log("Employee already exists (duplicate email), treating as success...");
          // Continue with success flow - update application status and show success
          try {
            const { error: updErr } = await supabase
              .from("applications")
              .update({ status: "hired" })
              .eq("id", applicationId);

            if (updErr) {
              console.warn("Update application status failed (non-fatal):", updErr);
            }

            setApplicants((prev) => prev.filter((a) => a.id !== applicationId));
            await loadApplications();
            setSuccessMessage(`${applicantName} marked as employee`);
            setShowSuccessAlert(true);
            
            if (selectedApplicant && selectedApplicant.id === applicationId) {
              setSelectedApplicant(null);
            }
          } catch (innerErr) {
            console.error("Error in success flow:", innerErr);
          }
        } else {
          setErrorMessage("Unexpected error while marking as hired. Check console.");
          setShowErrorAlert(true);
        }
      }
    });
    setShowConfirmDialog(true);
  };

  // ---- OPEN interview modal
  const openInterviewModal = (application, options = {}) => {
    const { reset = false } = options || {};
    setSelectedApplicationForInterview(application);

    // Extract interview type safely (payload may be string or invalid JSON)
    let interviewType = application?.interview_type || "onsite";
    if (application?.raw?.payload) {
      try {
        const payload = typeof application.raw.payload === 'string'
          ? JSON.parse(application.raw.payload)
          : application.raw.payload;
        interviewType = payload?.interview_type || payload?.interview?.type || interviewType || 'onsite';
      } catch {
        // ignore
      }
    }

    // For rescheduling, open a fresh form to avoid accidentally re-sending the old schedule.
    const shouldReset = reset || Boolean(application?.interview_date);

    setInterviewForm({
      date: shouldReset ? "" : (application?.interview_date || ""),
      time: shouldReset ? "" : (application?.interview_time || ""),
      location: shouldReset ? "" : (application?.interview_location || ""),
      interviewer: shouldReset ? "" : (application?.interviewer || ""),
      interview_type: interviewType,
    });
    setShowInterviewModal(true);
  };

  // ---- OPEN agreement signing modal
  const openAgreementSigningModal = (application) => {
    setSelectedApplicationForSigning(application);

    let payloadObj = application?.raw?.payload || {};
    if (typeof payloadObj === 'string') {
      try { payloadObj = JSON.parse(payloadObj); } catch { payloadObj = {}; }
    }

    const signing =
      payloadObj?.agreement_signing ||
      payloadObj?.agreementSigning ||
      payloadObj?.signing_interview ||
      payloadObj?.signingInterview ||
      {};

    setAgreementSigningForm({
      date: signing?.date || application?.agreement_signing_date || "",
      time: signing?.time || application?.agreement_signing_time || "",
      location: signing?.location || application?.agreement_signing_location || "",
    });
    setShowAgreementSigningModal(true);
  };

  // ---- SCHEDULE agreement signing appointment
  const scheduleAgreementSigning = async () => {
    if (!selectedApplicationForSigning) return;
    if (!agreementSigningForm.date || !agreementSigningForm.time || !agreementSigningForm.location) {
      setErrorMessage("Please fill date, time and location.");
      setShowErrorAlert(true);
      return;
    }

    const apptDateTime = new Date(`${agreementSigningForm.date}T${agreementSigningForm.time}`);
    const now = new Date();
    if (apptDateTime <= now) {
      setErrorMessage("Appointment must be scheduled for a future date and time.");
      setShowErrorAlert(true);
      return;
    }

    setSchedulingAgreementSigning(true);
    try {
      const r = await scheduleAgreementSigningClient(selectedApplicationForSigning.id, agreementSigningForm);
      if (!r.ok) {
        console.error("Edge function error:", r.error);
        const maybeMsg = r.error?.message || String(r.error || '');
        setErrorMessage(maybeMsg.includes('Failed') || maybeMsg.length > 8
          ? `Failed to schedule agreement signing: ${maybeMsg}`
          : "Failed to schedule agreement signing. Check console and function logs.");
        setShowErrorAlert(true);
        setSchedulingAgreementSigning(false);
        return;
      }

      // Update selectedApplicant immediately with signing data (payload-based)
      if (selectedApplicant && selectedApplicant.id === selectedApplicationForSigning.id) {
        setSelectedApplicant((prev) => ({
          ...prev,
          agreement_signing_date: agreementSigningForm.date,
          agreement_signing_time: agreementSigningForm.time,
          agreement_signing_location: agreementSigningForm.location,
          agreement_signing_confirmed: 'Idle',
          agreement_signing_confirmed_at: null,
        }));
      }

      await loadApplications();
      await fetchSigningSchedules();
      setShowAgreementSigningModal(false);

      const apptSummary = `${selectedApplicationForSigning.name} - ${agreementSigningForm.date} at ${agreementSigningForm.time}, ${agreementSigningForm.location}`;
      const signingIsReschedule = Boolean(r.data?.isReschedule);
      const signingHasEmailStatus = typeof r.data?.emailSent === 'boolean' || r.data?.emailError;
      const signingEmailSent = Boolean(r.data?.emailSent);
      const signingEmailNote = !signingHasEmailStatus
        ? 'Email status unknown (redeploy edge function to see email status).'
        : signingEmailSent
          ? 'Email sent.'
          : (r.data?.emailError?.body || r.data?.emailError?.message)
            ? `Email not sent: ${r.data?.emailError?.body || r.data?.emailError?.message}`
            : 'Email not sent (check function logs).';

      setSuccessMessage(
        `Agreement signing ${signingIsReschedule ? 'Rescheduled' : 'Scheduled'}: ${apptSummary}. ` +
        `In-app notification created. ${signingEmailNote}`
      );
      setShowSuccessAlert(true);
    } catch (err) {
      console.error("scheduleAgreementSigning unexpected error:", err);
      setErrorMessage("Unexpected error scheduling agreement signing. See console.");
      setShowErrorAlert(true);
    } finally {
      setSchedulingAgreementSigning(false);
    }
  };

  // ---- SCHEDULE interview (calls scheduleInterviewClient)
  const scheduleInterview = async () => {
    if (!selectedApplicationForInterview) return;
    if (!interviewForm.date || !interviewForm.time || !interviewForm.location) {
      setErrorMessage("Please fill date, time and location.");
      setShowErrorAlert(true);
      return;
    }

    if (!interviewForm.interview_type) {
      setErrorMessage("Please select interview type (Online or Onsite).");
      setShowErrorAlert(true);
      return;
    }

    // Validate that the interview is scheduled for the future
    const interviewDateTime = new Date(`${interviewForm.date}T${interviewForm.time}`);
    const now = new Date();
    
    if (interviewDateTime <= now) {
      setErrorMessage("Interview must be scheduled for a future date and time.");
      setShowErrorAlert(true);
      return;
    }

    setScheduling(true);
    try {
      // Use the deployed Edge Function for interview scheduling and notifications
      const interviewPayload = {
        ...interviewForm,
        // Edge Function expects interview.type; keep interview_type for local UI/use
        type: interviewForm.interview_type,
      };
      const r = await scheduleInterviewClient(selectedApplicationForInterview.id, interviewPayload);
      if (!r.ok) {
        console.error("Edge function error:", r.error);
        const maybeMsg = r.error?.message || String(r.error || '');
        setErrorMessage(maybeMsg && maybeMsg.length > 8
          ? `Failed to schedule interview: ${maybeMsg}`
          : "Failed to schedule interview. Check console and function logs.");
        setShowErrorAlert(true);
        setScheduling(false);
        return;
      }
      
      // Update selectedApplicant immediately with interview data
      if (selectedApplicant && selectedApplicant.id === selectedApplicationForInterview.id) {
        setSelectedApplicant((prev) => ({
          ...prev,
          interview_date: interviewForm.date,
          interview_time: interviewForm.time,
          interview_location: interviewForm.location,
          interviewer: interviewForm.interviewer || prev.interviewer,
          interview_type: interviewForm.interview_type,
        }));
      }

      // success -> reload applications so updated interview fields show
      await loadApplications();
      await fetchInterviews(); // Refresh interview calendar
      setShowInterviewModal(false);
      
      // Format interview summary
      const interviewSummary = `${selectedApplicationForInterview.name} - ${interviewForm.date} at ${interviewForm.time}, ${interviewForm.location}`;
      const isReschedule = Boolean(r.data?.isReschedule);
      const hasEmailStatus = typeof r.data?.emailSent === 'boolean' || r.data?.emailError;
      const emailSent = Boolean(r.data?.emailSent);
      const emailNote = !hasEmailStatus
        ? 'Email status unknown (redeploy edge function to see email status).'
        : emailSent
          ? 'Email sent.'
          : (r.data?.emailError?.body || r.data?.emailError?.message)
            ? `Email not sent: ${r.data?.emailError?.body || r.data?.emailError?.message}`
            : 'Email not sent (check function logs).';

      setSuccessMessage(
        `Interview ${isReschedule ? 'Rescheduled' : 'Scheduled'}: ${interviewSummary}. ` +
        `In-app notification created. ${emailNote}`
      );
      setShowSuccessAlert(true);
    } catch (err) {
      console.error("scheduleInterview unexpected error:", err);
      setErrorMessage("Unexpected error scheduling interview. See console.");
      setShowErrorAlert(true);
    } finally {
      setScheduling(false);
    }
  };

  // ---- Save ID number validation
  const _saveIdNumberValidation = async (idKey, status, remarks = "") => {
    if (!selectedApplicant?.id) return;
    
    try {
      let requirements = selectedApplicant.requirements;
      if (typeof requirements === 'string') {
        try { requirements = JSON.parse(requirements); } catch { requirements = {}; }
      }

      if (!requirements.id_numbers) {
        requirements.id_numbers = {};
      }

      requirements.id_numbers[idKey] = {
        ...requirements.id_numbers[idKey],
        status: status,
        remarks: remarks,
        validated_at: status === "Validated" ? new Date().toISOString() : null,
      };

      // Try to update requirements column, fallback to payload
      const { error: updateError } = await supabase
        .from('applications')
        .update({ requirements: requirements })
        .eq('id', selectedApplicant.id);

      if (updateError && updateError.code === 'PGRST204') {
        // Column doesn't exist, store in payload
        let currentPayload = selectedApplicant.raw?.payload || {};
        if (typeof currentPayload === 'string') {
          try { currentPayload = JSON.parse(currentPayload); } catch { currentPayload = {}; }
        }
        
        const updatedPayload = {
          ...currentPayload,
          requirements: requirements
        };
        
        const { error: payloadError } = await supabase
          .from('applications')
          .update({ payload: updatedPayload })
          .eq('id', selectedApplicant.id);
        
        if (payloadError) throw payloadError;
      } else if (updateError) {
        throw updateError;
      }

      // Also update employees table if this applicant is now an employee
      // Find employee by email from the application
      const applicantEmail = selectedApplicant.email || 
        (selectedApplicant.raw?.payload ? 
          (() => {
            try {
              const payload = typeof selectedApplicant.raw.payload === 'string' 
                ? JSON.parse(selectedApplicant.raw.payload) 
                : selectedApplicant.raw.payload;
              return payload.form?.email || payload.applicant?.email || payload.email;
            } catch {
              return null;
            }
          })() : null);
      
      if (applicantEmail) {
        // Get current employee requirements
        const { data: employeeRecord } = await supabase
          .from('employees')
          .select('requirements')
          .eq('email', applicantEmail)
          .single();

        if (employeeRecord) {
          let empRequirements = employeeRecord.requirements;
          if (typeof empRequirements === 'string') {
            try {
              empRequirements = JSON.parse(empRequirements);
            } catch {
              empRequirements = {};
            }
          }

          // Update the same ID number in employees table
          if (!empRequirements.id_numbers) empRequirements.id_numbers = {};
          if (!empRequirements.id_numbers[idKey]) {
            empRequirements.id_numbers[idKey] = {};
          }

          empRequirements.id_numbers[idKey] = {
            ...empRequirements.id_numbers[idKey],
            status: status,
            remarks: remarks,
            validated_at: status === "Validated" ? new Date().toISOString() : null,
          };

          // Save to employees table
          await supabase
            .from('employees')
            .update({ requirements: empRequirements })
            .eq('email', applicantEmail);
        }
      }

      // Reload applications to reflect changes
      await loadApplications();
    } catch (err) {
      console.error('Error saving ID number validation:', err);
      setErrorMessage("Failed to save validation. Please try again.");
      setShowErrorAlert(true);
    }
  };

  // ---- Save document validation
  const _saveDocumentValidation = async (docKey, status, remarks = "") => {
    if (!selectedApplicant?.id) return;
    
    try {
      let requirements = selectedApplicant.requirements;
      if (typeof requirements === 'string') {
        try { requirements = JSON.parse(requirements); } catch { requirements = {}; }
      }

      if (!requirements.documents) {
        requirements.documents = [];
      }

      // Find and update the document
      const docIndex = requirements.documents.findIndex(d => d.key === docKey);
      if (docIndex >= 0) {
        requirements.documents[docIndex] = {
          ...requirements.documents[docIndex],
          status: status,
          remarks: remarks,
          validated_at: status === "Validated" ? new Date().toISOString() : null,
        };
      }

      // Try to update requirements column, fallback to payload
      const { error: updateError } = await supabase
        .from('applications')
        .update({ requirements: requirements })
        .eq('id', selectedApplicant.id);

      if (updateError && updateError.code === 'PGRST204') {
        // Column doesn't exist, store in payload
        let currentPayload = selectedApplicant.raw?.payload || {};
        if (typeof currentPayload === 'string') {
          try { currentPayload = JSON.parse(currentPayload); } catch { currentPayload = {}; }
        }
        
        const updatedPayload = {
          ...currentPayload,
          requirements: requirements
        };
        
        const { error: payloadError } = await supabase
          .from('applications')
          .update({ payload: updatedPayload })
          .eq('id', selectedApplicant.id);
        
        if (payloadError) throw payloadError;
      } else if (updateError) {
        throw updateError;
      }

      // Also update employees table if this applicant is now an employee
      const applicantEmail = selectedApplicant.email || 
        (selectedApplicant.raw?.payload ? 
          (() => {
            try {
              const payload = typeof selectedApplicant.raw.payload === 'string' 
                ? JSON.parse(selectedApplicant.raw.payload) 
                : selectedApplicant.raw.payload;
              return payload.form?.email || payload.applicant?.email || payload.email;
            } catch {
              return null;
            }
          })() : null);
      
      if (applicantEmail) {
        // Get current employee requirements
        const { data: employeeRecord } = await supabase
          .from('employees')
          .select('requirements')
          .eq('email', applicantEmail)
          .single();

        if (employeeRecord) {
          let empRequirements = employeeRecord.requirements;
          if (typeof empRequirements === 'string') {
            try {
              empRequirements = JSON.parse(empRequirements);
            } catch {
              empRequirements = {};
            }
          }

          // Update the same document in employees table
          if (!empRequirements.documents) empRequirements.documents = [];
          
          const docIndex = empRequirements.documents.findIndex(d => d.key === docKey);
          if (docIndex >= 0) {
            empRequirements.documents[docIndex] = {
              ...empRequirements.documents[docIndex],
              status: status,
              remarks: remarks,
              validated_at: status === "Validated" ? new Date().toISOString() : null,
            };
          }

          // Save to employees table
          await supabase
            .from('employees')
            .update({ requirements: empRequirements })
            .eq('email', applicantEmail);
        }
      }

      // Reload applications to reflect changes
      await loadApplications();
    } catch (err) {
      console.error('Error saving document validation:', err);
      setErrorMessage("Failed to save validation. Please try again.");
      setShowErrorAlert(true);
    }
  };

  // ---- APPROVE: move application from Application step to Assessment step (with confirmation)
  const proceedToAssessment = (applicant) => {
    if (!applicant?.id) return;
    
    // Prevent if already processing or opening dialog
    if (isProcessingConfirm || isOpeningConfirmDialog || showConfirmDialog) return;

    // Set flag to prevent double-clicks
    setIsOpeningConfirmDialog(true);

    // Ensure any previous alerts are closed before showing confirm dialog
    setShowSuccessAlert(false);
    setShowErrorAlert(false);
    
    // Reset processing state and clear any existing callback
    setIsProcessingConfirm(false);
    setConfirmCallback(null);

    setConfirmMessage(
      `Approve ${applicant.name}'s application and move to Assessment step?`
    );
    
    // Store the callback function - DO NOT execute it here
    const callbackFunction = async () => {
      try {
        const { error } = await supabase
          .from("applications")
          .update({ status: "screening" })
          .eq("id", applicant.id);

        if (error) {
          console.error("proceedToAssessment update error:", error);
          setErrorMessage("Failed to move application to assessment. See console.");
          setShowErrorAlert(true);
          return;
        }

        // Update selected applicant immediately with new status
        setSelectedApplicant((prev) => {
          if (prev && prev.id === applicant.id) {
            return { ...prev, status: "screening" };
          }
          return prev;
        });

        // Move UI to Assessment step (do this before loadApplications so step turns green immediately)
        setActiveDetailTab("Assessment");

        // Refresh list so buckets & stats update
        await loadApplications();

        // After loadApplications completes, we need to update selectedApplicant with fresh data
        // Since setState is async, we use a callback approach with setApplicants
        // But we can't access the new applicants here, so we'll use a useEffect instead
        // For now, the immediate update above should be enough for the step to turn green

        setSuccessMessage(`${applicant.name} has been approved to proceed to assessment.`);
        setShowSuccessAlert(true);
      } catch (err) {
        console.error("proceedToAssessment unexpected error:", err);
        setErrorMessage("Unexpected error while moving to assessment. See console.");
        setShowErrorAlert(true);
      }
    };
    
    // Only set the callback, do not execute it
    setConfirmCallback(() => callbackFunction);
    setShowConfirmDialog(true);
    
    // Reset flag after a short delay
    setTimeout(() => {
      setIsOpeningConfirmDialog(false);
    }, 100);
  };

  // ---- REJECT action: update DB row status -> 'rejected' and optionally save remarks
  const rejectApplication = async (applicationId, name, remarks = null) => {
    if (!applicationId) return;
    
    // If remarks not provided, they should come from the modal
    let reason = remarks;
    
    try {
      const updates = { status: "rejected" };
      if (reason && reason.trim()) updates.rejection_remarks = reason.trim();
      let { error } = await supabase.from("applications").update(updates).eq("id", applicationId);

      // If the DB doesn't have `rejection_remarks`, retry without it so rejection still works.
      const missingRemarksColumn =
        error &&
        (error.code === 'PGRST204' ||
          String(error.message || '').toLowerCase().includes('rejection_remarks'));

      if (missingRemarksColumn) {
        ({ error } = await supabase
          .from("applications")
          .update({ status: "rejected" })
          .eq("id", applicationId));
      }

      if (error) {
        console.error("reject update error:", error);
        setErrorMessage("Failed to reject application. See console.");
        setShowErrorAlert(true);
        return;
      }
      await loadApplications();

      if (missingRemarksColumn && reason && reason.trim()) {
        setSuccessMessage(`Application rejected for ${name}. (Remarks not saved — database missing rejection_remarks)`);
      } else {
        setSuccessMessage(`Application rejected for ${name}.`);
      }
      setShowSuccessAlert(true);
    } catch (err) {
      console.error("reject error:", err);
      setErrorMessage("Unexpected error rejecting application. See console.");
      setShowErrorAlert(true);
    }
  };

  // ---- REMOVE JOB POST: Show confirmation dialog
  const handleRemoveJobPost = (jobId, jobTitle) => {
    // Clear any previous state
    setPendingJobDelete(null);
    setConfirmCallback(null);
    setIsProcessingConfirm(false);
    
    // Store the job info to delete - deletion will ONLY happen when OK is clicked
    setPendingJobDelete({ jobId, jobTitle });
    setConfirmMessage(`Are you sure you want to remove the job post "${jobTitle}"? This action cannot be undone.`);
    setShowConfirmDialog(true);
  };

  // Execute job post deletion - called ONLY from OK button
  const executeJobPostDeletion = async (jobId, jobTitle) => {
    try {
      const { error } = await supabase
        .from('job_posts')
        .delete()
        .eq('id', jobId);
      
      if (error) {
        setErrorMessage(`Failed to delete job post: ${error.message}`);
        setShowErrorAlert(true);
      } else {
        setSuccessMessage(`Job post "${jobTitle}" has been removed successfully.`);
        setShowSuccessAlert(true);
        // Reload applications and job posts to refresh the tables
        await loadApplications();
        if (activeSubTab === "JobPosts") {
          await loadJobPosts();
        }
      }
    } catch (err) {
      setErrorMessage(`Error deleting job post: ${err.message}`);
      setShowErrorAlert(true);
    }
  };

  // ---- APPROVE JOB POST: Show confirmation modal
  const handleApproveJobPost = (jobId, jobTitle) => {
    // Clear any previous state
    setPendingJobApprove(null);
    setIsProcessingConfirm(false);
    
    // Store the job info to approve
    setPendingJobApprove({ jobId, jobTitle });
    setConfirmMessage(`Are you sure you want to approve the job post "${jobTitle}"? This will make it visible to applicants.`);
    setShowConfirmDialog(true);
  };

  // Execute job post approval - called ONLY from OK button
  const executeJobPostApproval = async (jobId, jobTitle) => {
    try {
      const { error } = await supabase
        .from('job_posts')
        .update({ approval_status: 'approved' })
        .eq('id', jobId);
      
      if (error) {
        setErrorMessage(`Failed to approve job post: ${error.message}`);
        setShowErrorAlert(true);
      } else {
        setSuccessMessage(`Job post "${jobTitle}" has been approved successfully.`);
        setShowSuccessAlert(true);
        // Reload job posts to refresh the table
        await loadJobPosts();
      }
    } catch (err) {
      setErrorMessage(`Error approving job post: ${err.message}`);
      setShowErrorAlert(true);
    }
  };

  // ---- EDIT JOB POST: Open edit modal and load job post data
  const handleEditJobPost = async (jobId) => {
    if (!jobId) {
      setErrorMessage("Job post ID is missing.");
      setShowErrorAlert(true);
      return;
    }

    // Clear any previous errors
    setErrorMessage("");
    setShowErrorAlert(false);

    try {
      // Fetch job post data
      const { data, error } = await supabase
        .from("job_posts")
        .select("*")
        .eq("id", jobId)
        .single();

      if (error) {
        console.error("Error fetching job post:", error);
        setErrorMessage("Failed to load job post data.");
        setShowErrorAlert(true);
        return;
      }

      if (!data) {
        setErrorMessage("Job post not found.");
        setShowErrorAlert(true);
        return;
      }

      const endDate = (() => {
        if (!data.expires_at) return "";
        try {
          return new Date(data.expires_at).toISOString().split('T')[0];
        } catch {
          return "";
        }
      })();

      // Split responsibilities and others if they're combined
      const rawItems = Array.isArray(data.responsibilities)
        ? data.responsibilities.filter(Boolean)
        : (data.responsibilities ? [data.responsibilities] : []);

      const responsibilities = [];
      const others = [];
      for (const item of rawItems) {
        const s = String(item || "").trim();
        if (!s) continue;
        if (s.toUpperCase().startsWith("REQ:")) {
          const v = s.slice(4).trim();
          if (v) others.push(v);
        } else {
          responsibilities.push(s);
        }
      }

      const dept = data.department || getDepartmentForPosition(data.title);
      const inferredJobType = dept === 'Operations Department' ? 'delivery_crew' : 'office_employee';
      const jobType = data.job_type || inferredJobType;

      const positionsNoLimit = data.positions_needed == null;
      const positionsNeeded = positionsNoLimit ? 1 : (Number(data.positions_needed) || 1);

      // Set editing job and form data
      setEditingJobPost(data);
      setEditJobForm({
        title: data.title || "",
        depot: data.depot || "",
        department: dept || "",
        description: data.description || "",
        mainResponsibilities: responsibilities.join('\n'),
        keyRequirements: others.join('\n'),
        urgent: data.urgent ?? true,
        jobType: jobType,
        endDate: endDate,
        positions_needed: positionsNeeded,
        positionsNoLimit,
      });
      setShowEditJobModal(true);
    } catch (err) {
      console.error("Error loading job post for editing:", err);
      setErrorMessage("Unexpected error loading job post.");
      setShowErrorAlert(true);
    }
  };

  // Edit form handlers
  const setEditJobField = (k, v) => {
    if (k === 'title') {
      const dept = getDepartmentForPosition(v);
      const inferredJobType = dept === 'Operations Department' ? 'delivery_crew' : 'office_employee';
      setEditJobForm((prev) => ({
        ...prev,
        title: v,
        department: dept ? dept : prev.department,
        jobType: dept ? inferredJobType : prev.jobType,
      }));
      return;
    }

    if (k === 'department') {
      setEditJobForm((prev) => {
        const mappedDept = getDepartmentForPosition(prev.title);
        const shouldClearTitle = Boolean(prev.title) && Boolean(mappedDept) && mappedDept !== v;
        const inferredJobType = v === 'Operations Department' ? 'delivery_crew' : 'office_employee';
        return {
          ...prev,
          department: v,
          title: shouldClearTitle ? '' : prev.title,
          jobType: shouldClearTitle || !prev.title ? inferredJobType : prev.jobType,
        };
      });
      return;
    }

    if (k === 'positionsNoLimit') {
      const enabled = Boolean(v);
      setEditJobForm((prev) => ({
        ...prev,
        positionsNoLimit: enabled,
        positions_needed: enabled ? null : (Number(prev.positions_needed) > 0 ? prev.positions_needed : 1),
      }));
      return;
    }

    setEditJobForm((prev) => ({ ...prev, [k]: v }));
  };

  const withEditBulletAutoContinue = (fieldKey) => (e) => {
    if (e.key !== 'Enter') return;
    const target = e.target;
    if (!target || typeof target.selectionStart !== 'number') return;

    const value = String(editJobForm[fieldKey] || '');
    const start = target.selectionStart;
    const end = target.selectionEnd;

    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = value.indexOf('\n', start);
    const currentLine = value.slice(lineStart, lineEnd === -1 ? value.length : lineEnd);

    const bulletMatch = currentLine.match(/^\s*(?:\*\s+|-\s+|•\s+)/);
    if (!bulletMatch) return;

    e.preventDefault();
    const prefix = bulletMatch[0];
    const lineContentAfterPrefix = currentLine.slice(prefix.length).trim();

    if (!lineContentAfterPrefix) {
      const newValue = value.slice(0, lineStart) + value.slice(lineStart + prefix.length);
      setEditJobForm((prev) => ({ ...prev, [fieldKey]: newValue }));
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start - prefix.length;
      });
      return;
    }

    const insertText = '\n' + prefix;
    const newValue = value.slice(0, start) + insertText + value.slice(end);
    setEditJobForm((prev) => ({ ...prev, [fieldKey]: newValue }));
    requestAnimationFrame(() => {
      const nextPos = start + insertText.length;
      target.selectionStart = target.selectionEnd = nextPos;
    });
  };

  // Update job post
  const handleUpdateJobPost = async () => {
    if (!editingJobPost?.id) {
      setErrorMessage("Job post ID is missing.");
      setShowErrorAlert(true);
      return;
    }

    // Validation
    if (!editJobForm.title || !editJobForm.title.trim()) {
      setErrorMessage("Job title is required.");
      setShowErrorAlert(true);
      return;
    }
    if (!editJobForm.depot || !editJobForm.depot.trim()) {
      setErrorMessage("Depot is required.");
      setShowErrorAlert(true);
      return;
    }

    if (!editJobForm.description || !editJobForm.description.trim()) {
      setErrorMessage("Job title description is required.");
      setShowErrorAlert(true);
      return;
    }

    if (splitLines(editJobForm.mainResponsibilities).length === 0) {
      setErrorMessage("Main responsibilities are required.");
      setShowErrorAlert(true);
      return;
    }

    setUpdatingJobPost(true);
    try {
      const combinedResponsibilities = [
        ...splitLines(editJobForm.mainResponsibilities),
        ...splitLines(editJobForm.keyRequirements).map((s) => `REQ: ${s}`),
      ];

      const positionsNeededNum = Number(editJobForm.positions_needed);
      const hasLimit = !editJobForm.positionsNoLimit && Number.isFinite(positionsNeededNum) && positionsNeededNum > 0;
      const positionsNeededPayload = editJobForm.positionsNoLimit ? null : (hasLimit ? positionsNeededNum : 1);

      const payload = {
        title: String(editJobForm.title).trim(),
        depot: String(editJobForm.depot).trim(),
        department: editJobForm.department || null,
        description: editJobForm.description || null,
        responsibilities: combinedResponsibilities,
        urgent: Boolean(editJobForm.urgent),
        job_type: String(editJobForm.jobType).trim(),
        expires_at: editJobForm.endDate || null,
        positions_needed: positionsNeededPayload,
      };

      const { error } = await supabase
        .from("job_posts")
        .update(payload)
        .eq("id", editingJobPost.id);

      if (error) {
        console.error("Error updating job post:", error);
        setErrorMessage(`Failed to update job post: ${error.message}`);
        setShowErrorAlert(true);
        setUpdatingJobPost(false);
        return;
      }

      // Success - clear errors, close modal and reload
      setErrorMessage("");
      setShowErrorAlert(false);
      setShowEditJobModal(false);
      setEditingJobPost(null);
      setEditJobForm({
        title: "",
        depot: "",
        department: "",
        description: "",
        mainResponsibilities: "",
        keyRequirements: "",
        urgent: true,
        jobType: "office_employee",
        endDate: "",
        positions_needed: 1,
        positionsNoLimit: false,
      });
      setSuccessMessage(`Job post "${editJobForm.title}" has been updated successfully.`);
      setShowSuccessAlert(true);
      
      // Reload applications and job posts to refresh the tables
      await loadApplications();
      if (activeSubTab === "JobPosts") {
        await loadJobPosts();
      }
    } catch (err) {
      console.error("Unexpected error updating job post:", err);
      setErrorMessage(`Unexpected error: ${err.message}`);
      setShowErrorAlert(true);
    } finally {
      setUpdatingJobPost(false);
    }
  };

  // Helper: Get initials from name
  const getInitials = (name) => {
    if (!name) return "??";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Helper: Get avatar color based on name
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
    const index = (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  // Helper function to handle agreement file uploads
  const handleAgreementFileUpload = async (file, fileName, fileKey, filePathPrefix, setFile, setFileName, setUploading, setSuccessMessage, setShowSuccessAlert, setErrorMessage, setShowErrorAlert) => {
    if (!file || !selectedApplicant?.id) return;
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const finalFileName = fileName || `${filePathPrefix}-${selectedApplicant.id}-${Date.now()}.${fileExt}`;
      const filePath = `${filePathPrefix}/${selectedApplicant.id}/${finalFileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('application-files')
        .upload(filePath, file, {
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Update application record with file path
      const { error: updateError } = await supabase
        .from('applications')
        .update({ [fileKey]: uploadData.path })
        .eq('id', selectedApplicant.id);

      if (updateError && updateError.code === 'PGRST204') {
        // Column doesn't exist, store in payload instead
        console.warn(`${fileKey} column not found, storing in payload`);
        const currentPayload = selectedApplicant.raw?.payload || {};
        let payloadObj = currentPayload;
        if (typeof payloadObj === 'string') {
          try {
            payloadObj = JSON.parse(payloadObj);
          } catch {
            payloadObj = {};
          }
        }
        
        const updatedPayload = {
          ...payloadObj,
          [fileKey]: uploadData.path
        };
        
        const { error: payloadError } = await supabase
          .from('applications')
          .update({ payload: updatedPayload })
          .eq('id', selectedApplicant.id);
        
        if (payloadError) {
          throw payloadError;
        }
      } else if (updateError) {
        throw updateError;
      }

      // Update local state immediately
      setFileName(finalFileName);
      setFile(null);
      
      // Update selectedApplicant state with the new file path
      setSelectedApplicant(prev => ({
        ...prev,
        [fileKey]: uploadData.path
      }));
      
      // Reload applications to sync with database
      await loadApplications();
      
      // After reload, update selectedApplicant again to ensure it's current
      const { data: updatedApp } = await supabase
        .from('applications')
        .select('*')
        .eq('id', selectedApplicant.id)
        .single();
      
      if (updatedApp) {
        let payloadObj = updatedApp.payload;
        if (typeof payloadObj === 'string') {
          try {
            payloadObj = JSON.parse(payloadObj);
          } catch {
            payloadObj = {};
          }
        }
        
        setSelectedApplicant(prev => ({
          ...prev,
          [fileKey]: updatedApp[fileKey] || payloadObj?.[fileKey] || uploadData.path,
          raw: updatedApp
        }));
      }
      
      setSuccessMessage(`${fileName || filePathPrefix} uploaded successfully`);
      setShowSuccessAlert(true);
    } catch (err) {
      console.error(`Error uploading ${fileKey}:`, err);
      setErrorMessage("Failed to upload file. Please try again.");
      setShowErrorAlert(true);
    } finally {
      setUploading(false);
    }
  };

  // Helper function to handle agreement file removal
  const handleAgreementFileRemove = async (fileKey, setFileName, setSuccessMessage, setShowSuccessAlert, setErrorMessage, setShowErrorAlert) => {
    if (!selectedApplicant?.id) return;
    
    try {
      // Remove file path from database
      const { error: updateError } = await supabase
        .from('applications')
        .update({ [fileKey]: null })
        .eq('id', selectedApplicant.id);

      if (updateError && updateError.code === 'PGRST204') {
        // Column doesn't exist, remove from payload
        const currentPayload = selectedApplicant.raw?.payload || {};
        let payloadObj = currentPayload;
        if (typeof payloadObj === 'string') {
          try {
            payloadObj = JSON.parse(payloadObj);
          } catch {
            payloadObj = {};
          }
        }
        
        const updatedPayload = {
          ...payloadObj,
          [fileKey]: null
        };
        
        const { error: payloadError } = await supabase
          .from('applications')
          .update({ payload: updatedPayload })
          .eq('id', selectedApplicant.id);
        
        if (payloadError) {
          throw payloadError;
        }
      } else if (updateError) {
        throw updateError;
      }

      // Reload applications
      await loadApplications();
      setFileName("");
      setSelectedApplicant(prev => ({
        ...prev,
        [fileKey]: null
      }));
      setSuccessMessage("File removed successfully");
      setShowSuccessAlert(true);
    } catch (err) {
      console.error(`Error removing ${fileKey}:`, err);
      setErrorMessage("Failed to remove file. Please try again.");
      setShowErrorAlert(true);
    }
  };

  // Helper: Get application status display info
  const getApplicationStatus = (applicant) => {
    const status = applicant.status?.toLowerCase() || 'submitted';
    
    // Check interview status
    const hasInterview = applicant.interview_date;
    const interviewConfirmed = applicant.interview_confirmed === 'Confirmed';
    const rescheduleRequested = applicant.interview_confirmed === 'Rejected' && hasInterview;
    const agencyApplicant = isAgency(applicant);
    
    // Determine status based on workflow
    if (status === 'hired') {
      return { label: 'HIRED', color: 'text-green-600', bg: 'bg-green-50' };
    }
    if (status === 'rejected') {
      return { label: 'REJECTED', color: 'text-red-600', bg: 'bg-red-50' };
    }
    if (['agreement', 'agreements', 'final_agreement'].includes(status)) {
      return { label: 'AGREEMENT', color: 'text-purple-600', bg: 'bg-purple-50' };
    }
    if (['requirements', 'docs_needed', 'awaiting_documents'].includes(status)) {
      return { label: 'REQUIREMENTS', color: 'text-orange-600', bg: 'bg-orange-50' };
    }
    if (rescheduleRequested) {
      return { label: 'RESCHEDULE REQUESTED', color: 'text-orange-600', bg: 'bg-orange-50' };
    }
    if (hasInterview && interviewConfirmed && !agencyApplicant) {
      return { label: 'INTERVIEW CONFIRMED', color: 'text-blue-600', bg: 'bg-blue-50' };
    }
    if (hasInterview) {
      return { label: 'INTERVIEW SET', color: 'text-cyan-600', bg: 'bg-cyan-50' };
    }
    if (['screening', 'interview', 'scheduled', 'onsite'].includes(status)) {
      return { label: 'IN REVIEW', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    }
    return { label: 'SUBMITTED', color: 'text-gray-600', bg: 'bg-gray-50' };
  };

  // Combined list of all applicants for the unified table
  // Filter by depot if user role is HRC
  const allApplicants = useMemo(() => {
    let filtered = applicants;
    
    // If user is HRC, only show applications for their depot
    if (currentUser?.role?.toUpperCase() === 'HRC' && currentUser?.depot) {
      filtered = filtered.filter(a => a.depot === currentUser.depot);
    }
    
    return filtered;
  }, [applicants, currentUser]);

  const filterOptionApplicants = allApplicants;

  // Distinct positions/depots for filters
  const depots = useMemo(() => {
    const s = new Set(filterOptionApplicants.map((a) => a.depot).filter(Boolean));
    return ["All", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [filterOptionApplicants]);

  const departmentOptions = useMemo(() => {
    const extras = new Set();
    const known = new Set(departments.map((d) => normalizeDepartmentName(d)));

    (filterOptionApplicants || []).forEach((a) => {
      const derived = normalizeDepartmentName(a.department || getDepartmentForPosition(a.position));
      if (!derived) return;
      if (!known.has(derived)) extras.add(derived);
    });

    return [
      "All",
      ...departments,
      ...Array.from(extras).sort((a, b) => a.localeCompare(b)),
    ];
  }, [filterOptionApplicants]);

  const positions = useMemo(() => {
    const set = new Set();

    if (departmentFilter === "All") {
      getPositionsForDepartment("All").forEach((p) => set.add(p));
      (filterOptionApplicants || []).forEach((a) => {
        if (a?.position) set.add(a.position);
      });
    } else {
      getPositionsForDepartment(departmentFilter).forEach((p) => set.add(p));
      (filterOptionApplicants || []).forEach((a) => {
        const derivedDept = normalizeDepartmentName(a.department || getDepartmentForPosition(a.position));
        if (normalizeDepartmentName(derivedDept) !== normalizeDepartmentName(departmentFilter)) return;
        if (a?.position) set.add(a.position);
      });
    }

    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [filterOptionApplicants, departmentFilter]);

  useEffect(() => {
    if (positionFilter === "All") return;
    const allowed = new Set(positions.filter((p) => p && p !== "All"));
    if (!allowed.has(positionFilter)) setPositionFilter("All");
  }, [positions, positionFilter]);

  const recruitmentTypes = ["All", "Agency", "Direct"];
  
  const statusOptions = ["All", "SUBMITTED", "IN REVIEW", "INTERVIEW SET", "INTERVIEW CONFIRMED", "RESCHEDULE REQUESTED", "REQUIREMENTS", "AGREEMENT", "HIRED", "REJECTED"];

  const isRejectedApplicant = useCallback(
    (applicant) => String(getApplicationStatus(applicant)?.label || '').trim().toUpperCase() === 'REJECTED',
    [getApplicationStatus]
  );

  useEffect(() => {
    if (listMode === 'rejected') {
      if (statusFilter !== 'All') setStatusFilter('All');
      return;
    }

    if (String(statusFilter || '').trim().toUpperCase() === 'REJECTED') {
      setStatusFilter('All');
    }
  }, [listMode, statusFilter]);

  // Use actual job posts from database - loaded via loadJobPosts()
  // This replaces the previous aggregation-based approach
  const jobPostStats = jobPosts;

  const filteredApplicantsNoStatus = useMemo(() => {
    let list = allApplicants;

    const term = searchTerm.toLowerCase();
    if (term) {
      list = list.filter((a) =>
        a.name.toLowerCase().includes(term) ||
        (a.position || "").toLowerCase().includes(term) ||
        (a.depot || "").toLowerCase().includes(term) ||
        (a.status || "").toLowerCase().includes(term)
      );
    }

    if (positionFilter !== "All") {
      list = list.filter((a) => a.position === positionFilter);
    }

    list = list.filter((a) => {
      if (recruitmentTypeFilter === "All") return true;
      if (recruitmentTypeFilter === "Agency") return !!a.agency;
      if (recruitmentTypeFilter === "Direct") return !a.agency;
      return true;
    });

    list = list.filter((a) => {
      if (departmentFilter === "All") return true;
      const derived = normalizeDepartmentName(a.department || getDepartmentForPosition(a.position));
      return normalizeDepartmentName(derived) === normalizeDepartmentName(departmentFilter);
    });

    if (depotFilter !== "All") {
      list = list.filter((a) => a.depot === depotFilter);
    }

    return list;
  }, [allApplicants, searchTerm, recruitmentTypeFilter, departmentFilter, positionFilter, depotFilter]);

  const listModeCounts = useMemo(() => {
    const rejected = (filteredApplicantsNoStatus || []).filter(isRejectedApplicant).length;
    const pending = (filteredApplicantsNoStatus || []).length - rejected;
    return { pending, rejected };
  }, [filteredApplicantsNoStatus, isRejectedApplicant]);

  // Filtered + sorted applicants based on search and filters
  const filteredAllApplicants = useMemo(() => {
    let list = filteredApplicantsNoStatus;

    list = listMode === 'rejected'
      ? list.filter(isRejectedApplicant)
      : list.filter((a) => !isRejectedApplicant(a));

    if (listMode !== 'rejected' && statusFilter !== "All") {
      list = list.filter((a) => String(getApplicationStatus(a).label || '').trim() === statusFilter);
    }

    // Sort by name
    list = [...list].sort((a, b) =>
      sortOrder === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    );

    return list;
  }, [filteredApplicantsNoStatus, listMode, statusFilter, sortOrder, isRejectedApplicant]);


  // Pagination for unified table
  // const allApplicantsTotalPages = Math.ceil(filteredAllApplicants.length / itemsPerPage) || 1; // Unused for now
  const paginatedAllApplicants = filteredAllApplicants.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );


  const exportApplicantsPdf = useCallback((rows, title = "Applicants") => {
    const list = Array.isArray(rows) ? rows : [];
    if (list.length === 0) {
      setErrorMessage("No applicants to export for the current filters.");
      setShowErrorAlert(true);
      return;
    }

    try {
      const exportedAt = new Date();
      const exportedAtLabel = exportedAt.toLocaleString("en-US");
      const filterSummary = [
        searchTerm ? `Search: ${searchTerm}` : null,
        positionFilter !== "All" ? `Position: ${positionFilter}` : null,
        depotFilter !== "All" ? `Depot: ${depotFilter}` : null,
        statusFilter !== "All" ? `Status: ${statusFilter}` : null,
        `Sort: ${sortOrder === "asc" ? "A→Z" : "Z→A"}`,
      ]
        .filter(Boolean)
        .join(" | ");

      const safeText = (v) => {
        const s = String(v ?? "").trim();
        return s.length ? s : "—";
      };

      const interviewDateText = (v) => {
        if (!v) return "—";
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? safeText(v) : d.toLocaleDateString("en-US");
      };

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      doc.setFontSize(16);
      doc.text(`${title} (${list.length})`, 28, 40);

      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text(`Exported: ${exportedAtLabel}`, 28, 58);
      if (filterSummary) {
        doc.text(filterSummary, 28, 74);
      }
      doc.setTextColor(0);

      const body = list.map((a) => {
        const statusLabel = getApplicationStatus(a).label;
        return [
          safeText(a.name),
          safeText(a.position),
          safeText(a.depot),
          safeText(statusLabel),
          safeText(a.dateApplied),
          interviewDateText(a.interview_date),
          safeText(a.interview_time),
        ];
      });

      autoTable(doc, {
        startY: filterSummary ? 90 : 78,
        head: [["Applicant", "Position", "Depot", "Status", "Date Applied", "Interview Date", "Interview Time"]],
        body,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
        headStyles: { fillColor: [245, 245, 245], textColor: 20 },
        margin: { left: 28, right: 28 },
        columnStyles: {
          0: { cellWidth: 110 },
          1: { cellWidth: 100 },
          2: { cellWidth: 50 },
          3: { cellWidth: 60 },
          4: { cellWidth: 60 },
          5: { cellWidth: 65 },
          6: { cellWidth: 50 },
        },
      });

      const yyyyMmDd = exportedAt.toISOString().slice(0, 10);
      const rawParts = [title, statusFilter !== "All" ? statusFilter : null, positionFilter !== "All" ? positionFilter : null, depotFilter !== "All" ? depotFilter : null, yyyyMmDd]
        .filter(Boolean)
        .join("_");
      const fileName = `${rawParts}`.replace(/[^a-zA-Z0-9_-]+/g, "_") + ".pdf";

      doc.save(fileName);
    } catch (err) {
      console.error("exportApplicantsPdf error:", err);
      setErrorMessage("Failed to export PDF. Please try again.");
      setShowErrorAlert(true);
    }
  }, [searchTerm, positionFilter, depotFilter, statusFilter, sortOrder]);

  const exportApplicantsExcel = useCallback(async (rows, title = "Applicants") => {
    const list = Array.isArray(rows) ? rows : [];
    if (list.length === 0) {
      setErrorMessage("No applicants to export for the current filters.");
      setShowErrorAlert(true);
      return;
    }

    try {
      const exportedAt = new Date();
      const yyyyMmDd = exportedAt.toISOString().slice(0, 10);
      const rawParts = [
        title,
        statusFilter !== "All" ? statusFilter : null,
        positionFilter !== "All" ? positionFilter : null,
        depotFilter !== "All" ? depotFilter : null,
        yyyyMmDd,
      ]
        .filter(Boolean)
        .join("_");
      const fileName = `${rawParts}`.replace(/[^a-zA-Z0-9_-]+/g, "_") + ".xlsx";

      const safeText = (v) => {
        const s = String(v ?? "").trim();
        return s.length ? s : "—";
      };

      const interviewDateText = (v) => {
        if (!v) return "—";
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? safeText(v) : d.toLocaleDateString("en-US");
      };

      const header = [
        "Applicant",
        "Position",
        "Depot",
        "Status",
        "Date Applied",
        "Interview Date",
        "Interview Time",
      ];

      const rowsAoa = [];
      for (const a of list) {
        const statusLabel = getApplicationStatus(a).label;
        rowsAoa.push([
          safeText(a.name),
          safeText(a.position),
          safeText(a.depot),
          safeText(statusLabel),
          safeText(a.dateApplied),
          interviewDateText(a.interview_date),
          safeText(a.interview_time),
        ]);
      }

      const sheetName = String(title || "Applicants").slice(0, 31) || "Applicants";

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
      console.error("exportApplicantsExcel error:", err);
      setErrorMessage("Failed to export Excel file. Please try again.");
      setShowErrorAlert(true);
    }
  }, [statusFilter, positionFilter, depotFilter]);

  return (
    <>
      {/* Main Content */}
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="w-full">
          {/* Page Title (always visible, even when viewing details) */}
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Recruitment</h1>
            <p className="text-gray-500 mt-1">
              Track applications, schedule interviews, and move candidates through the hiring steps.
            </p>
          </div>

          {/* Stats + Top Tabs (hidden when viewing applicant details) */}
          {!selectedApplicant && (
            <>
              {/* Stats cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Total Applications</p>
                      <p className="text-2xl font-bold text-gray-800 mt-1">{filteredApplicantsByDepot.length}</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-2 font-medium">All active applications</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">For Screening</p>
                      <p className="text-2xl font-bold text-gray-800 mt-1">{applicationsBucket.length}</p>
                    </div>
                    <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-xs text-yellow-600 mt-2 font-medium">New / pending review</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">With Interview</p>
                      <p className="text-2xl font-bold text-gray-800 mt-1">{interviewBucket.length}</p>
                    </div>
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-xs text-green-600 mt-2 font-medium">Scheduled / ongoing interviews</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">In Requirements / Agreements</p>
                      <p className="text-2xl font-bold text-gray-800 mt-1">{requirementsBucket.length + agreementsBucket.length}</p>
                    </div>
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-xs text-purple-600 mt-2 font-medium">Finalizing files & offers</p>
                </div>
              </div>

              {/* Top Navigation Tabs */}
              <div className="flex border-b border-gray-200 mb-4">
                <button
                  className={`px-4 pb-2 text-sm font-medium border-b-2 ${
                    activeSubTab === "Applications"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                  type="button"
                  onClick={() => setActiveSubTab("Applications")}
                >
                  Applications <span className="text-gray-400">({allApplicants.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSubTab("JobPosts");
                    setSelectedApplicant(null);
                    // Reload job posts when switching to this tab
                    if (activeSubTab !== "JobPosts") {
                      loadJobPosts();
                    }
                  }}
                  className={`px-4 pb-2 text-sm font-medium border-b-2 ${
                    activeSubTab === "JobPosts"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  } transition-colors`}
                >
                  View Job Posts
                </button>
              </div>

              {/* Side-by-Side Layout: Interview Schedule (30%) + Main Table (70%) */}
              {activeSubTab === "Applications" && (
                <div className="flex gap-4">
                  {/* Left: Interview Schedule - 30% */}
                  <div className="w-[30%]">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col p-4 h-[calc(100vh-200px)]">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <h2 className="text-base font-bold text-gray-800">Schedules</h2>
                        <div className="inline-flex rounded-lg bg-gray-100 p-1">
                          <button
                            type="button"
                            onClick={() => setScheduleMode('interview')}
                            className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-all ${
                              scheduleMode === 'interview'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
                          >
                            Interview
                          </button>
                          <button
                            type="button"
                            onClick={() => setScheduleMode('signing')}
                            className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-all ${
                              scheduleMode === 'signing'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
                          >
                            Signing
                          </button>
                        </div>
                      </div>

                      {/* Stats Overview (Interview only) */}
                      {scheduleMode !== 'signing' && (
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg p-2 text-white">
                            <p className="text-xs opacity-90">Total</p>
                            <p className="text-lg font-bold">{getActiveSchedules().length}</p>
                          </div>
                          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg p-2 text-white">
                            <p className="text-xs opacity-90">Online</p>
                            <p className="text-lg font-bold">
                              {getActiveSchedules().filter(i => i.interview_type === 'online').length}
                            </p>
                          </div>
                          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-2 text-white">
                            <p className="text-xs opacity-90">Onsite</p>
                            <p className="text-lg font-bold">
                              {getActiveSchedules().filter(i => i.interview_type === 'onsite').length}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Tabs */}
                      <div className="flex gap-1 mb-3 bg-gray-100 p-1 rounded-lg">
                        <button
                          onClick={() => setActiveTab('today')}
                          className={`flex-1 px-3 py-1.5 font-medium text-xs rounded-lg transition-all ${
                            activeTab === 'today'
                              ? 'bg-white text-indigo-600 shadow-sm'
                              : 'text-gray-600 hover:text-gray-800'
                          }`}
                        >
                          <span className="inline-flex items-center gap-1">
                            Today
                            {hasNewScheduleInTab('today') && <span className="w-2 h-2 bg-red-500 rounded-full" />}
                          </span>
                        </button>
                        <button
                          onClick={() => setActiveTab('tomorrow')}
                          className={`flex-1 px-3 py-1.5 font-medium text-xs rounded-lg transition-all ${
                            activeTab === 'tomorrow'
                              ? 'bg-white text-indigo-600 shadow-sm'
                              : 'text-gray-600 hover:text-gray-800'
                          }`}
                        >
                          <span className="inline-flex items-center gap-1">
                            Tomorrow
                            {hasNewScheduleInTab('tomorrow') && <span className="w-2 h-2 bg-red-500 rounded-full" />}
                          </span>
                        </button>
                        <button
                          onClick={() => setActiveTab('week')}
                          className={`flex-1 px-3 py-1.5 font-medium text-xs rounded-lg transition-all ${
                            activeTab === 'week'
                              ? 'bg-white text-indigo-600 shadow-sm'
                              : 'text-gray-600 hover:text-gray-800'
                          }`}
                        >
                          <span className="inline-flex items-center gap-1">
                            Week
                            {hasNewScheduleInTab('week') && <span className="w-2 h-2 bg-red-500 rounded-full" />}
                          </span>
                        </button>
                        <button
                          onClick={() => setActiveTab('past')}
                          className={`flex-1 px-3 py-1.5 font-medium text-xs rounded-lg transition-all ${
                            activeTab === 'past'
                              ? 'bg-white text-indigo-600 shadow-sm'
                              : 'text-gray-600 hover:text-gray-800'
                          }`}
                        >
                          <span className="inline-flex items-center gap-1">
                            Past
                            {hasNewScheduleInTab('past') && <span className="w-2 h-2 bg-red-500 rounded-full" />}
                          </span>
                        </button>
                      </div>

                      <div className="mb-2">
                        <h3 className="text-sm font-bold text-gray-800">{getTabTitle()}</h3>
                        <p className="text-xs text-gray-500">{getTabDate()}</p>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto space-y-2">
                        {getActiveSchedules().length === 0 ? (
                          <div className="text-center py-12 bg-gray-50 rounded-lg">
                            <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-xs text-gray-500">No schedules</p>
                          </div>
                        ) : (
                          getActiveSchedules().map((interview) => {
                            const isNew = scheduleMode === 'signing'
                              ? !isSigningScheduleViewed(interview.id)
                              : !isInterviewViewed(interview.id);

                            return (
                            <div
                              key={interview.id}
                              className={[
                                'rounded-lg p-3 cursor-pointer transition-all border',
                                isNew
                                  ? 'bg-gradient-to-r from-blue-50 to-white border-blue-200 shadow-sm motion-safe:animate-pulse'
                                  : 'bg-gradient-to-r from-gray-50 to-white border-gray-200',
                                'hover:shadow-md hover:border-indigo-300'
                              ].join(' ')}
                              onClick={() => {
                                if (scheduleMode === 'signing') {
                                  markSigningScheduleViewed(interview.id);
                                } else {
                                  markInterviewViewed(interview.id);
                                }
                                // Find the applicant in the list
                                const applicant = filteredApplicantsByDepot.find(a => a.id === interview.id);
                                if (applicant) {
                                  setSelectedApplicant(applicant);
                                  setActiveDetailTab(scheduleMode === 'signing' ? 'Agreements' : 'Assessment');
                                }
                              }}
                            >
                              <div className="flex items-start justify-between mb-1">
                                <div className="font-bold text-gray-900 text-sm">{formatTime(interview.time)}</div>
                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                                  interview.interview_type === 'online'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {interview.interview_type === 'online' ? 'ONLINE' : 'ONSITE'}
                                </span>
                              </div>
                              <h4 className="font-semibold text-gray-900 text-sm leading-tight mb-0.5">{interview.applicant_name}</h4>
                              <p className="text-xs text-gray-600">{interview.position}</p>
                              {activeTab === 'week' && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(interview.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                </p>
                              )}
                            </div>
                          );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Main Applications Table - 70% */}
                  <div className="w-[70%]">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[calc(100vh-200px)]">
            {/* Search and Filters Bar (always visible) */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex flex-col gap-3">
                {/* Search */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search by name, position, depot, or status..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                    />
                  </div>

                  <div className="flex justify-end sm:flex-none w-full sm:w-auto">
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setListMode('pending');
                          setCurrentPage(1);
                        }}
                        className={`px-4 py-2 font-medium text-sm rounded-lg transition-all whitespace-nowrap ${
                          listMode === 'pending'
                            ? 'bg-white text-blue-700 shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        Pending ({listModeCounts.pending})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setListMode('rejected');
                          setCurrentPage(1);
                        }}
                        className={`px-4 py-2 font-medium text-sm rounded-lg transition-all whitespace-nowrap ${
                          listMode === 'rejected'
                            ? 'bg-white text-blue-700 shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        Rejected ({listModeCounts.rejected})
                      </button>
                    </div>
                  </div>
                </div>

                {/* Filters row (below search, reference layout) */}
                <div
                  className={[
                    'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 items-center',
                    listMode === 'rejected'
                      ? 'xl:grid-cols-[repeat(6,minmax(0,1fr))]'
                      : 'xl:grid-cols-[repeat(7,minmax(0,1fr))]',
                  ].join(' ')}
                >
                  {/* Depot Filter */}
                  <select
                    value={depotFilter}
                    onChange={(e) => {
                      setDepotFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    <option value="All">All Depots</option>
                    {depots.filter(d => d !== "All").map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>

                  {/* Department Filter */}
                  <select
                    value={departmentFilter}
                    onChange={(e) => {
                      setDepartmentFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    <option value="All">All Departments</option>
                    {departmentOptions.filter((d) => d !== "All").map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>

                  {/* Position Filter */}
                  <select
                    value={positionFilter}
                    onChange={(e) => {
                      setPositionFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    <option value="All">All Positions</option>
                    {positions.filter(p => p !== "All").map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>

                  {/* Status (hidden in Rejected mode) */}
                  {listMode !== 'rejected' && (
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                    >
                      <option value="All">Status</option>
                      {statusOptions
                        .filter((s) => s !== 'All')
                        .filter((s) => String(s).trim().toUpperCase() !== 'REJECTED')
                        .map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                  )}

                  {/* Recruitment Type */}
                  <select
                    value={recruitmentTypeFilter}
                    onChange={(e) => {
                      setRecruitmentTypeFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    <option value="All">All Recruitment Type</option>
                    {recruitmentTypes.filter((t) => t !== 'All').map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>

                  {/* Sort */}
                  <select
                    value={sortOrder}
                    onChange={(e) => {
                      setSortOrder(e.target.value);
                      setCurrentPage(1);
                    }}
                    aria-label="Sort"
                    className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    <option value="asc">Alphabetically (A → Z)</option>
                    <option value="desc">Alphabetically (Z → A)</option>
                  </select>

                  {/* Export Button */}
                  <div className="relative" ref={exportMenuRef}>
                    <button
                      type="button"
                      onClick={() => setShowExportMenu((prev) => !prev)}
                      className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-[12px] font-medium text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2 bg-white"
                      title="Export the currently filtered list"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export
                    </button>

                    {showExportMenu && (
                      <div className="absolute right-0 mt-2 w-44 bg-white border rounded-lg shadow-lg z-10 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            setShowExportMenu(false);
                            exportApplicantsPdf(filteredAllApplicants, "Applicants");
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50"
                        >
                          Export list as PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowExportMenu(false);
                            exportApplicantsExcel(filteredAllApplicants, "Applicants");
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

              {/* Table only when no applicant detail is open */}
              {!selectedApplicant && (
                <div className="overflow-x-auto">
                  {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading applications…</div>
                  ) : filteredAllApplicants.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No applications found.</div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Applicant</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Position / Dept / Depot</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Applied</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {paginatedAllApplicants.map((a) => {
                          const statusInfo = getApplicationStatus(a);
                          return (
                            <tr
                              key={a.id}
                              className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                              onClick={() => {
                                setSelectedApplicant(a);
                                setActiveDetailTab("Application");
                                setInterviewFile(null);
                                setInterviewFileName(a.interview_details_file ? a.interview_details_file.split('/').pop() : "");
                                setAssessmentFile(null);
                                setAssessmentFileName(a.assessment_results_file ? a.assessment_results_file.split('/').pop() : "");
                                setAgreementFile(null);
                                setAgreementFileName(a.appointment_letter_file ? a.appointment_letter_file.split('/').pop() : "");
                                // Reset new agreement file states
                                setUndertakingFile(null);
                                setUndertakingFileName(a.undertaking_file ? a.undertaking_file.split('/').pop() : "");
                                setApplicationFormFile(null);
                                setApplicationFormFileName(a.application_form_file ? a.application_form_file.split('/').pop() : "");
                                setUndertakingDutiesFile(null);
                                setUndertakingDutiesFileName(a.undertaking_duties_file ? a.undertaking_duties_file.split('/').pop() : "");
                                setPreEmploymentRequirementsFile(null);
                                setPreEmploymentRequirementsFileName(a.pre_employment_requirements_file ? a.pre_employment_requirements_file.split('/').pop() : "");
                                setIdFormFile(null);
                                setIdFormFileName(a.id_form_file ? a.id_form_file.split('/').pop() : "");
                              }}
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(a.name)} flex items-center justify-center text-white text-sm font-medium shadow-sm ${isAgency(a) ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}>
                                    {getInitials(a.name)}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium text-gray-800">{a.name}</p>
                                      {isAgency(a) && (
                                        <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">AGENCY</span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-500">{a.email || `#${a.id.slice(0, 8)}`}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm text-gray-800">{a.position || "—"}</p>
                                <p className="text-xs text-gray-500">{a.department || "—"}</p>
                                <p className="text-xs text-gray-500">{a.depot || "—"}</p>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-xs font-semibold ${statusInfo.color}`}>
                                  {statusInfo.label}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm text-gray-600">{a.dateApplied}</p>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Applicant Detail View - Shows for all tabs when applicant is selected */}
          {selectedApplicant && (
            <div className="grid grid-cols-12 gap-6 mt-4">
              {/* Left Sidebar - Applicants List (table style copied from Employees left list) */}
              <div className="col-span-2 lg:col-span-3 max-h-[85vh] overflow-y-auto overflow-x-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Applicant
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {allApplicants.map((a) => {
                      const isSelected = selectedApplicant.id === a.id;
                      return (
                        <tr
                          key={a.id}
                          className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${
                            isSelected ? "bg-red-50/50" : ""
                          }`}
                          onClick={() => {
                            setSelectedApplicant(a);
                            // Reset file states when switching applicants
                            setInterviewFile(null);
                            setInterviewFileName(
                              a.interview_details_file ? a.interview_details_file.split("/").pop() : ""
                            );
                            setAssessmentFile(null);
                            setAssessmentFileName(
                              a.assessment_results_file ? a.assessment_results_file.split("/").pop() : ""
                            );
                            setAgreementFile(null);
                            setAgreementFileName(
                              a.appointment_letter_file ? a.appointment_letter_file.split("/").pop() : ""
                            );
                            // Reset new agreement file states
                            setUndertakingFile(null);
                            setUndertakingFileName(a.undertaking_file ? a.undertaking_file.split("/").pop() : "");
                            setApplicationFormFile(null);
                            setApplicationFormFileName(a.application_form_file ? a.application_form_file.split("/").pop() : "");
                            setUndertakingDutiesFile(null);
                            setUndertakingDutiesFileName(a.undertaking_duties_file ? a.undertaking_duties_file.split("/").pop() : "");
                            setPreEmploymentRequirementsFile(null);
                            setPreEmploymentRequirementsFileName(a.pre_employment_requirements_file ? a.pre_employment_requirements_file.split("/").pop() : "");
                            setIdFormFile(null);
                            setIdFormFileName(a.id_form_file ? a.id_form_file.split("/").pop() : "");
                          }}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarColor(
                                  a.name
                                )} flex items-center justify-center text-white text-sm font-medium shadow-sm`}
                              >
                                {getInitials(a.name)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-gray-800 truncate">{a.name}</p>
                                  {isAgency(a) && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                                      AGENCY
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-gray-500 truncate">{a.position || "—"}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Right Side - Detail View */}
              <div className="col-span-10 lg:col-span-9 overflow-y-auto flex flex-col">
                {/* Applicant header card - styled like Employees.jsx with close button */}
                {selectedApplicant && (
                  <div className="bg-white border border-gray-300 rounded-t-lg p-4 relative">
                    <button
                      onClick={() => setSelectedApplicant(null)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>

                    <div className="flex items-center gap-3 pr-10">
                      <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${getAvatarColor(selectedApplicant.name)} flex items-center justify-center text-white text-lg font-semibold shadow-md`}>
                        {getInitials(selectedApplicant.name)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-800 text-lg">{selectedApplicant.name}</h4>
                          {isAgency(selectedApplicant) && (
                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">AGENCY</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">#{selectedApplicant.id.slice(0, 8)}</p>
                        <p className="text-sm text-gray-600">
                          {selectedApplicant.position || "—"} | {selectedApplicant.depot || "—"}
                        </p>
                        {selectedApplicant.resume_path && (
                          <a
                            href={supabase.storage.from('resume').getPublicUrl(selectedApplicant.resume_path).data.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1 mt-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            View Resume
                          </a>
                        )}
                      </div>
                      <div className="text-right space-y-1">
                        {(() => {
                          const statusInfo = getApplicationStatus(selectedApplicant);
                          return (
                            <span className={`inline-block text-xs font-semibold ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          );
                        })()}
                        <p className="text-xs text-gray-500">Applied: {selectedApplicant.dateApplied}</p>
                        {(() => {
                          const s = (selectedApplicant?.status || '').toLowerCase();
                          const canReject = s !== 'rejected' && s !== 'hired';
                          return (
                            <button
                              type="button"
                              disabled={!canReject}
                              onClick={() => {
                                if (!canReject) return;
                                openRejectForApplicant(selectedApplicant);
                              }}
                              className={`mt-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                canReject
                                  ? 'border-red-300 text-red-700 hover:bg-red-50'
                                  : 'border-gray-200 text-gray-400 cursor-not-allowed'
                              }`}
                              title={canReject ? 'Reject applicant' : 'Cannot reject (already hired/rejected)'}
                            >
                              Reject
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3-step visual guide for the hiring flow (also acts as tabs) */}
                <div className="bg-white border-l border-r border-b border-gray-300 px-4 pt-3 pb-4">
                  <div className="flex items-center justify-between gap-3">
                    {[
                      { key: "Application", label: "Application", description: "Step 1 · Review application" },
                      { key: "Assessment", label: "Assessment", description: "Step 2 · Schedule & assess" },
                      { key: "Agreements", label: "Agreements", description: "Step 3 · Final agreements & hire" },
                    ].map((step, index, arr) => {
                      const isActive = activeDetailTab === step.key;
                      const applicantStatus = selectedApplicant?.status?.toLowerCase() || '';
                      const hasInterview = !!selectedApplicant?.interview_date;
                      const agencyApplicant = isAgency(selectedApplicant);
                      const interviewConfirmed = selectedApplicant?.interview_confirmed === 'Confirmed' || 
                                                selectedApplicant?.interview_confirmed === 'confirmed';
                      const rescheduleRequested = (selectedApplicant?.interview_confirmed === 'Rejected' || selectedApplicant?.interview_confirmed === 'rejected') && hasInterview;
                      
                      // Determine step completion and unlock status
                      let isCompleted = false;
                      let isUnlocked = false;
                      
                      if (step.key === "Application") {
                        // Step 1 is always unlocked (it's the first step)
                        // Step 1 is completed when status is "screening" or higher
                        isUnlocked = true;
                        isCompleted = ["screening", "interview", "scheduled", "onsite", "requirements", "docs_needed", "awaiting_documents", "agreement", "agreements", "final_agreement", "hired"].includes(applicantStatus);
                      } else if (step.key === "Assessment") {
                        // Step 2 is unlocked when Step 1 is completed
                        const step1Completed = ["screening", "interview", "scheduled", "onsite", "requirements", "docs_needed", "awaiting_documents", "agreement", "agreements", "final_agreement", "hired"].includes(applicantStatus);
                        isUnlocked = step1Completed;
                        // For agency endorsements: no schedule confirmation; complete once scheduled (unless reschedule requested)
                        isCompleted = hasInterview && (agencyApplicant ? !rescheduleRequested : interviewConfirmed);
                      } else if (step.key === "Agreements") {
                        // For agency endorsements: unlock once scheduled (unless reschedule requested)
                        isUnlocked = hasInterview && (agencyApplicant ? !rescheduleRequested : interviewConfirmed);
                        // Step 3 is completed when status is agreement or hired
                        isCompleted = ["agreement", "agreements", "final_agreement", "hired"].includes(applicantStatus);
                      }

                      const isLocked = !isUnlocked;

                      return (
                        <button
                          key={step.key}
                          type="button"
                          onClick={() => {
                            if (!isLocked) {
                              setActiveDetailTab(step.key);
                            }
                          }}
                          disabled={isLocked}
                          className={`flex-1 flex items-center text-left focus:outline-none ${
                            isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                          }`}
                          title={isLocked ? `Complete previous steps to unlock ${step.label}` : ''}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <div
                              className={[
                                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors",
                                isActive
                                  ? "bg-red-600 text-white border-red-600 shadow"
                                  : isCompleted
                                  ? "bg-green-50 text-green-700 border-green-500"
                                  : isLocked
                                  ? "bg-gray-100 text-gray-400 border-gray-200"
                                  : "bg-gray-50 text-gray-500 border-gray-300",
                              ].join(" ")}
                            >
                              {isLocked ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                              ) : (
                                index + 1
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span
                                className={[
                                  "text-xs font-semibold",
                                  isActive
                                    ? "text-red-600"
                                    : isCompleted
                                    ? "text-green-700"
                                    : isLocked
                                    ? "text-gray-400"
                                    : "text-gray-600",
                                ].join(" ")}
                              >
                                {step.label}
                                {isLocked && <span className="ml-1 text-[10px]">(Locked)</span>}
                              </span>
                              <span className={`text-[10px] ${isLocked ? 'text-gray-300' : 'text-gray-400'}`}>
                                {step.description}
                              </span>
                            </div>
                            {index < arr.length - 1 && (
                              <div className={`flex-1 h-px mx-2 rounded-full ${
                                isLocked || (step.key === "Assessment" && !isUnlocked)
                                  ? 'bg-gray-200'
                                  : 'bg-gradient-to-r from-gray-200 via-gray-200 to-gray-200'
                              }`} />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

               {/* Detail Content */}
               <div className="bg-white border border-t-0 border-gray-300 rounded-b-lg shadow-sm">
                {/* Application Tab - styled similarly to Employees profiling tab */}
                {activeDetailTab === "Application" && (
                  <section className="p-5 space-y-5">
                    {/* Job Details */}
                    <div>
                      <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">
                        Job Details
                      </h5>
                      <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <div>
                          <span className="text-gray-500">Position Applying For:</span>
                          <span className="ml-2 text-gray-800">{selectedApplicant.position || <span className="text-gray-500 italic">None</span>}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Department:</span>
                          <span className="ml-2 text-gray-800">{selectedApplicant.department || <span className="text-gray-500 italic">None</span>}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Depot:</span>
                          <span className="ml-2 text-gray-800">{selectedApplicant.depot || <span className="text-gray-500 italic">None</span>}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Date Applied:</span>
                          <span className="ml-2 text-gray-800">{selectedApplicant.dateApplied}</span>
                        </div>
                      </div>
                    </div>

                    {/* Personal Information */}
                    {(() => {
                      // Get payload from raw data or directly from selectedApplicant
                      const rawPayload = selectedApplicant.raw?.payload || selectedApplicant.payload || {};
                      let payloadObj = {};
                      try {
                        payloadObj = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
                      } catch (e) {
                        console.error('Error parsing payload:', e);
                        payloadObj = {};
                      }
                      const formObj = payloadObj?.form && typeof payloadObj.form === 'object' ? payloadObj.form : {};
                      const applicantObj = payloadObj?.applicant && typeof payloadObj.applicant === 'object' ? payloadObj.applicant : {};
                      const form = { ...formObj, ...applicantObj };

                      const firstName = form.firstName || form.fname || form.first_name || "";
                      const middleName = form.middleName || form.mname || form.middle_name || "";
                      const lastName = form.lastName || form.lname || form.last_name || "";
                      const birthday = form.birthday || form.birth_date || form.dateOfBirth || null;
                      const contactNumber = pickFirstNonEmail(
                        form.contact,
                        form.contactNumber,
                        form.contact_number,
                        form.phone,
                        selectedApplicant.phone,
                        selectedApplicant.raw?.phone,
                        payloadObj.phone,
                        payloadObj.contact_number
                      );
                      const email = pickFirstEmail(
                        form.email,
                        form.personal_email,
                        selectedApplicant.email,
                        selectedApplicant.raw?.email,
                        payloadObj.email,
                        // legacy payloads sometimes stored email in contact
                        form.contact
                      );

                      const nameDisplay = formatNameLastFirstMiddle({
                        last: lastName,
                        first: firstName,
                        middle: middleName,
                      });
                      
                      // Calculate age from birthday
                      const calculateAge = (birthday) => {
                        if (!birthday) return <span className="text-gray-500 italic">None</span>;
                        const today = new Date();
                        const birthDate = new Date(birthday);
                        let age = today.getFullYear() - birthDate.getFullYear();
                        const monthDiff = today.getMonth() - birthDate.getMonth();
                        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                          age--;
                        }
                        return age;
                      };

                      // Format date
                      const _formatDate = (dateStr) => {
                        if (!dateStr) return <span className="text-gray-500 italic">None</span>;
                        try {
                          const date = new Date(dateStr);
                          return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
                        } catch {
                          return dateStr;
                        }
                      };

                      // Get resume URL - check applicants table first, then payload
                      const resumePath = selectedApplicant.resume_path || form.resumePath || form.resumeName || null;
                      const resumeUrl = resumePath ? supabase.storage.from('resume').getPublicUrl(resumePath)?.data?.publicUrl : null;

                      return (
                        <>
                          {/* Personal Information */}
                          <div className="mb-6">
                            <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">
                              Personal Information
                            </h5>
                            <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                              <div>
                                <span className="font-semibold text-gray-600">Name:</span>{' '}
                                <span className="text-gray-800">{nameDisplay || <span className="text-gray-400 italic">None</span>}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-gray-600">Contact Number:</span> {contactNumber ? <span className="text-gray-800">{contactNumber}</span> : <span className="text-gray-400 italic">None</span>}
                              </div>
                              <div>
                                <span className="font-semibold text-gray-600">Email:</span>{' '}
                                {email ? <span className="text-gray-800">{email}</span> : <span className="text-gray-400 italic">None</span>}
                              </div>
                              <div>
                                <span className="font-semibold text-gray-600">Birthday:</span>{' '}
                                {birthday ? <span className="text-gray-800">{new Date(birthday).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span> : <span className="text-gray-400 italic">None</span>}
                              </div>
                              <div>
                                <span className="font-semibold text-gray-600">Age:</span>{' '}
                                {birthday ? 
                                  <span className="text-gray-800">{calculateAge(birthday)}</span> : <span className="text-gray-400 italic">None</span>}
                              </div>
                              <div>
                                <span className="font-semibold text-gray-600">Marital Status:</span>{' '}
                                {(form.maritalStatus || form.marital_status) ? <span className="text-gray-800">{form.maritalStatus || form.marital_status}</span> : <span className="text-gray-400 italic">None</span>}
                              </div>
                              <div><span className="font-semibold text-gray-600">Sex:</span> {form.sex ? <span className="text-gray-800">{form.sex}</span> : <span className="text-gray-400 italic">None</span>}</div>
                              <div><span className="font-semibold text-gray-600">Available Start Date:</span> {form.startDate ? <span className="text-gray-800">{new Date(form.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span> : <span className="text-gray-400 italic">None</span>}</div>
                              <div>
                                <span className="font-semibold text-gray-600">How did you learn about the company?:</span>{' '}
                                {(form.heardFrom || form.sourceOfInfo) ? <span className="text-gray-800">{form.heardFrom || form.sourceOfInfo}</span> : <span className="text-gray-400 italic">None</span>}
                              </div>
                              <div><span className="font-semibold text-gray-600">Currently Employed?:</span> {form.employed ? <span className="text-gray-800">{form.employed}</span> : <span className="text-gray-400 italic">None</span>}</div>
                              <div>
                                <span className="font-semibold text-gray-600">Resume:</span>{' '}
                                {resumeUrl ? (
                                  <a 
                                    href={resumeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                                  >
                                    {form.resumeName || 'View Resume'}
                                  </a>
                                ) : (
                                  <span className="text-gray-400 italic">None</span>
                                )}
                              </div>
                              <div>
                                <span className="font-semibold text-gray-600">Government IDs:</span>{' '}
                                {(() => {
                                  const ids = [];
                                  if (form.sss) ids.push(`SSS: ${form.sss}`);
                                  if (form.tin) ids.push(`TIN: ${form.tin}`);
                                  if (form.philhealth) ids.push(`PhilHealth: ${form.philhealth}`);
                                  if (form.pagibig) ids.push(`Pag-IBIG: ${form.pagibig}`);
                                  return ids.length > 0 ? <span className="text-gray-800">{ids.join(', ')}</span> : <span className="text-gray-400 italic">None</span>;
                                })()}
                              </div>
                            </div>
                          </div>

                          {/* Address Information */}
                          <div className="mb-6">
                            <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">
                              Address Information
                            </h5>
                            <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 grid grid-cols-1 gap-y-2">
                              <div>
                                <span className="text-gray-500">Full Address:</span>
                                <span className="ml-2 text-gray-800">
                                  {formatFullAddressOneLine(form) || <span className="text-gray-500 italic">None</span>}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Education & Skills */}
                          <div className="mb-6">
                            <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">
                              Education & Skills
                            </h5>
                            <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 space-y-4">
                              {/* Education - Highest Attainment */}
                              {(form.edu1Level || form.edu1Institution || form.edu1Year) && (
                                <div>
                                  <div className="font-medium text-gray-700 mb-2">Highest Educational Attainment:</div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-2">
                                    <div>
                                      <span className="text-gray-500">Level:</span>
                                      <span className="ml-2 text-gray-800">{form.edu1Level || <span className="text-gray-500 italic">None</span>}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Institution:</span>
                                      <span className="ml-2 text-gray-800">{form.edu1Institution || <span className="text-gray-500 italic">None</span>}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Year Finished:</span>
                                      <span className="ml-2 text-gray-800">{form.edu1Year || <span className="text-gray-500 italic">None</span>}</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Skills */}
                              <div>
                                <span className="text-gray-500">Skills:</span>
                                <div className="ml-2 mt-1">
                                  {form.skills && Array.isArray(form.skills) ? (
                                    (() => {
                                      const skillsText = (form.skills || [])
                                        .filter(Boolean)
                                        .map((s) => (typeof s === 'string' ? s.trim() : String(s).trim()))
                                        .filter(Boolean)
                                        .join(', ');
                                      return skillsText
                                        ? <span className="text-gray-800">{skillsText}</span>
                                        : <span className="text-gray-500 italic">None</span>;
                                    })()
                                  ) : form.skills_text ? (
                                    <span className="text-gray-800">{form.skills_text}</span>
                                  ) : (
                                    <span className="text-gray-500 italic">None</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Specialized Training (Certificate) */}
                          {(() => {
                            const trainingName = form.specializedTraining || form.specialized_training || null;
                            const trainingYear = form.specializedYear || form.specialized_year || null;

                            const trainingCertPath =
                              form.trainingCertFilePath ||
                              form.training_cert_file_path ||
                              form.trainingCertPath ||
                              form.training_cert_path ||
                              form.specializedTrainingCertFilePath ||
                              form.specialized_training_cert_file_path ||
                              payloadObj?.trainingCertFilePath ||
                              payloadObj?.training_cert_file_path ||
                              payloadObj?.trainingCertPath ||
                              payloadObj?.training_cert_path ||
                              null;

                            const trainingCertUrl = trainingCertPath
                              ? supabase.storage.from('application-files').getPublicUrl(trainingCertPath)?.data?.publicUrl
                              : null;

                            const hasAnything = Boolean(String(trainingName || '').trim() || String(trainingYear || '').trim() || trainingCertPath);
                            if (!hasAnything) {
                              return (
                                <div className="mb-6">
                                  <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Specialized Training</h5>
                                  <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800">
                                    <div className="text-gray-500 italic">No uploaded specialized training yet.</div>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div className="mb-6">
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Specialized Training</h5>
                                <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                  <div>
                                    <span className="text-gray-500">Training/Certification Name:</span>
                                    <span className="ml-2">{trainingName ? <span className="text-gray-800">{String(trainingName)}</span> : <span className="text-gray-500 italic">None</span>}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Year Completed:</span>
                                    <span className="ml-2">{trainingYear ? <span className="text-gray-800">{String(trainingYear)}</span> : <span className="text-gray-500 italic">None</span>}</span>
                                  </div>
                                  <div className="md:col-span-2">
                                    <span className="text-gray-500">Certificate:</span>
                                    {trainingCertUrl ? (
                                      <a
                                        href={trainingCertUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-2 text-blue-600 hover:underline"
                                      >
                                        View File
                                      </a>
                                    ) : (
                                      <span className="ml-2 text-gray-500 italic">No file</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Work Experience */}
                          {!isAgency(selectedApplicant) && payloadObj.workExperiences && Array.isArray(payloadObj.workExperiences) && payloadObj.workExperiences.length > 0 && (
                            <div className="mb-6">
                              <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">
                                Work Experience
                              </h5>
                              <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 space-y-4">
                                {payloadObj.workExperiences.map((exp, idx) => (
                                  <div key={idx} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                                    <div className="font-medium text-gray-700 mb-2">Experience #{idx + 1}:</div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                      <div>
                                        <span className="text-gray-500">Company:</span>
                                        <span className="ml-2 text-gray-800">{exp.company || <span className="text-gray-500 italic">None</span>}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Role/Title:</span>
                                        <span className="ml-2 text-gray-800">{exp.role || exp.title || <span className="text-gray-500 italic">None</span>}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Year Employed:</span>
                                        <span className="ml-2 text-gray-800">{exp.year || exp.period || <span className="text-gray-500 italic">None</span>}</span>
                                      </div>
                                      <div className="md:col-span-2">
                                        <span className="text-gray-500">Reason for Leaving:</span>
                                        <span className="ml-2 text-gray-800">{exp.reason || <span className="text-gray-500 italic">None</span>}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Driver-specific sections (Agency + Driver role) */}
                          {(() => {
                            const agencyApplicant = isAgency(selectedApplicant);
                            const positionText =
                              selectedApplicant?.position ||
                              selectedApplicant?.job_post?.position ||
                              selectedApplicant?.jobPost?.position ||
                              selectedApplicant?.raw?.position ||
                              payloadObj?.position ||
                              form?.position ||
                              '';
                            const driverApplicant = agencyApplicant && isDriverRole(positionText);
                            if (!driverApplicant) return null;

                            const renderNone = () => <span className="text-gray-500 italic">None</span>;
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
                                return <span className="text-gray-800">{d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>;
                              } catch {
                                return <span className="text-gray-800">{String(v)}</span>;
                              }
                            };

                            const requirements =
                              payloadObj?.requirements ||
                              payloadObj?.form?.requirements ||
                              payloadObj?.applicant?.requirements ||
                              payloadObj?.docs ||
                              {};

                            const licenseReq = requirements?.license || {};
                            const frontPath =
                              licenseReq.frontFilePath ||
                              licenseReq.front_file_path ||
                              licenseReq.front_path ||
                              licenseReq.front ||
                              null;
                            const backPath =
                              licenseReq.backFilePath ||
                              licenseReq.back_file_path ||
                              licenseReq.back_path ||
                              licenseReq.back ||
                              null;
                            const frontUrl = frontPath
                              ? String(frontPath).startsWith('http')
                                ? String(frontPath)
                                : supabase.storage.from('application-files').getPublicUrl(frontPath)?.data?.publicUrl
                              : null;
                            const backUrl = backPath
                              ? String(backPath).startsWith('http')
                                ? String(backPath)
                                : supabase.storage.from('application-files').getPublicUrl(backPath)?.data?.publicUrl
                              : null;

                            const licenseClassification =
                              form.licenseClassification ||
                              form.license_classification ||
                              form.licenseType ||
                              form.license_type ||
                              null;
                            const licenseExpiry =
                              form.licenseExpiry ||
                              form.license_expiry ||
                              form.licenseExpiryDate ||
                              form.license_expiry_date ||
                              null;
                            const restrictionCodes =
                              form.restrictionCodes ||
                              form.restriction_codes ||
                              form.restrictions ||
                              null;

                            const drivingHistoryObj =
                              (form.drivingHistory && typeof form.drivingHistory === 'object' ? form.drivingHistory : null) ||
                              (form.driving_history && typeof form.driving_history === 'object' ? form.driving_history : null) ||
                              null;

                            const yearsDriving =
                              drivingHistoryObj?.yearsDriving ||
                              drivingHistoryObj?.years_driving ||
                              form.yearsDriving ||
                              form.years_driving ||
                              null;
                            const truckKnowledge =
                              drivingHistoryObj?.truckKnowledge ||
                              drivingHistoryObj?.truck_knowledge ||
                              form.truckKnowledge ||
                              form.truck_knowledge ||
                              null;
                            const vehicleTypes =
                              drivingHistoryObj?.vehicleTypes ||
                              drivingHistoryObj?.vehicle_types ||
                              form.vehicleTypes ||
                              form.vehicle_types ||
                              null;
                            const troubleshootingTasks =
                              drivingHistoryObj?.troubleshootingTasks ||
                              drivingHistoryObj?.troubleshooting_tasks ||
                              form.troubleshootingTasks ||
                              form.troubleshooting_tasks ||
                              null;

                            return (
                              <>
                                <div>
                                  <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">License Information</h5>
                                  <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
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

                                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="border border-gray-200 rounded-lg p-3">
                                      <div className="text-xs font-semibold text-gray-600 mb-2">License (Front)</div>
                                      {frontUrl ? (
                                        <a href={frontUrl} target="_blank" rel="noopener noreferrer">
                                          <img
                                            src={frontUrl}
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
                                      {backUrl ? (
                                        <a href={backUrl} target="_blank" rel="noopener noreferrer">
                                          <img
                                            src={backUrl}
                                            alt="Driver's License Back"
                                            className="w-full h-40 object-contain bg-gray-50 rounded"
                                          />
                                        </a>
                                      ) : (
                                        <div className="text-xs text-gray-400 italic">None</div>
                                      )}
                                    </div>
                                  </div>
                                </div>

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
                                  </div>
                                </div>
                              </>
                            );
                          })()}

                          {/* Medical Information (ALL positions) */}
                          {(() => {
                            const renderNone = () => <span className="text-gray-500 italic">None</span>;
                            const displayValue = (v) => {
                              if (v === null || v === undefined) return renderNone();
                              if (typeof v === 'string') {
                                const s = v.trim();
                                return s ? <span className="text-gray-800">{s}</span> : renderNone();
                              }
                              return <span className="text-gray-800">{String(v)}</span>;
                            };

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
                                return <span className="text-gray-800">{d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>;
                              } catch {
                                return <span className="text-gray-800">{String(v)}</span>;
                              }
                            };

                            const takingMedications = form.takingMedications ?? form.taking_medications ?? null;
                            const medicationReason = form.medicationReason || form.medication_reason || null;
                            const tookMedicalTest = form.tookMedicalTest ?? form.took_medical_test ?? null;
                            const medicalTestDate = form.medicalTestDate || form.medical_test_date || null;

                            return (
                              <div className="mb-6">
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Medical Information</h5>
                                <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                  <div>
                                    <span className="text-gray-500">Taking Medications:</span>
                                    <span className="ml-2">{displayYesNo(takingMedications) ?? renderNone()}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Medication Reason:</span>
                                    <span className="ml-2">{takingMedications ? (medicationReason ? displayValue(medicationReason) : renderNone()) : renderNone()}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Has Taken Medical Test:</span>
                                    <span className="ml-2">{displayYesNo(tookMedicalTest) ?? renderNone()}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Medical Test Date:</span>
                                    <span className="ml-2">{tookMedicalTest ? displayDate(medicalTestDate) : renderNone()}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Character References */}
                          {(() => {
                            if (isAgency(selectedApplicant)) return null;

                            const rawReferences = Array.isArray(payloadObj.characterReferences)
                              ? payloadObj.characterReferences
                              : [];
                            const hasAnyValue = (ref) => {
                              if (!ref || typeof ref !== 'object') return false;
                              const fields = [
                                ref.fullName,
                                ref.name,
                                ref.relationship,
                                ref.relation,
                                ref.jobTitle,
                                ref.title,
                                ref.position,
                                ref.company,
                                ref.remarks,
                                ref.phone,
                                ref.contact,
                                ref.contactNumber,
                                ref.contact_number,
                                ref.email,
                              ];
                              return fields.some((v) => String(v || '').trim().length > 0);
                            };
                            const displayReferences = rawReferences.filter(hasAnyValue);
                            const isEmpty = displayReferences.length === 0;

                            return (
                              <div className="mb-6">
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded flex items-center justify-between">
                                  <span>Character References</span>
                                  {isEmpty && <span className="text-xs text-gray-500 italic">None</span>}
                                </h5>
                                <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 space-y-4">
                                  {isEmpty ? (
                                    <div className="text-gray-400 italic">None</div>
                                  ) : (
                                    displayReferences.map((ref, idx) => (
                                      <div key={idx} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                                        <div className="font-medium text-gray-700 mb-2">Reference #{idx + 1}:</div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                          <div>
                                            <span className="text-gray-500">Full Name:</span>
                                            <span className="ml-2 text-gray-800">{ref?.fullName || ref?.name || ''}</span>
                                          </div>
                                          <div>
                                            <span className="text-gray-500">Relationship:</span>
                                            <span className="ml-2 text-gray-800">{ref?.relationship || ref?.relation || ''}</span>
                                          </div>
                                          <div>
                                            <span className="text-gray-500">Job Title:</span>
                                            <span className="ml-2 text-gray-800">{ref?.jobTitle || ref?.title || ref?.position || ''}</span>
                                          </div>
                                          <div>
                                            <span className="text-gray-500">Company:</span>
                                            <span className="ml-2 text-gray-800">{ref?.company || ref?.remarks || ''}</span>
                                          </div>
                                          <div>
                                            <span className="text-gray-500">Phone:</span>
                                            <span className="ml-2 text-gray-800">{ref?.phone || ref?.contact || ref?.contactNumber || ref?.contact_number || ''}</span>
                                          </div>
                                          <div>
                                            <span className="text-gray-500">Email:</span>
                                            <span className="ml-2 text-gray-800">{ref?.email || ''}</span>
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </>
                      );
                    })()}

                    {/* Action: Approve to proceed to Assessment - Only show if status is still submitted/pending */}
                    {(() => {
                      const applicantStatus = selectedApplicant?.status?.toLowerCase() || '';
                      const isStillInApplicationStep = ['submitted', 'pending'].includes(applicantStatus);
                      
                      if (!isStillInApplicationStep) {
                        return null; // Don't show button if already moved to Assessment or beyond
                      }
                      
                      return (
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              proceedToAssessment(selectedApplicant);
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                          >
                            <span>Proceed to Assessment</span>
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 7l5 5m0 0l-5 5m5-5H6"
                              />
                            </svg>
                          </button>
                        </div>
                      );
                    })()}
                  </section>
                )}

                {/* Assessment Tab */}
                {activeDetailTab === "Assessment" && (
                  <section className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-lg font-semibold text-gray-800">Assessment</h2>
                      {/* Set Interview Schedule button - show if no interview scheduled */}
                      {!selectedApplicant.interview_date && (
                        <button
                          type="button"
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                          onClick={() => {
                            openInterviewModal(selectedApplicant, { reset: true });
                          }}
                        >
                          Set Interview Schedule
                        </button>
                      )}
                    </div>

                    {/* Interview Schedule */}
                    {selectedApplicant.interview_date && (() => {
                      // Extract interview_type from various sources
                      let interviewType = 'onsite'; // default
                      if (selectedApplicant.interview_type) {
                        interviewType = selectedApplicant.interview_type;
                      } else if (selectedApplicant.raw?.payload) {
                        const payload = typeof selectedApplicant.raw.payload === 'string' 
                          ? JSON.parse(selectedApplicant.raw.payload) 
                          : selectedApplicant.raw.payload;
                        interviewType = payload.interview_type || payload.interview?.type || 'onsite';
                      } else if (selectedApplicant.payload) {
                        const payload = typeof selectedApplicant.payload === 'string' 
                          ? JSON.parse(selectedApplicant.payload) 
                          : selectedApplicant.payload;
                        interviewType = payload.interview_type || payload.interview?.type || 'onsite';
                      }

                      return (
                        <div className="bg-gray-50 border rounded-md p-4 mb-4 relative">
                          <div className="flex items-start justify-between mb-2">
                            <div className="text-sm text-gray-800 font-semibold">Interview Schedule</div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                                interviewType === 'online'
                                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                  : 'bg-amber-100 text-amber-700 border border-amber-300'
                              }`}>
                                {interviewType === 'online' ? 'ONLINE' : 'ONSITE'}
                              </span>
                              {(() => {
                                // Check interview status using the new text-based system
                                const interviewStatus = selectedApplicant.interview_confirmed || selectedApplicant.payload?.interview_confirmed || 'Idle';
                                const agencyApplicant = isAgency(selectedApplicant);

                                if (agencyApplicant) {
                                  if (interviewStatus === 'Rejected') {
                                    return (
                                      <span className="text-sm px-3 py-1 rounded bg-orange-100 text-orange-800 border border-orange-300 font-medium">
                                        Reschedule Requested
                                      </span>
                                    );
                                  }
                                  if (selectedApplicant.interview_date) {
                                    return (
                                      <span className="text-sm px-3 py-1 rounded bg-cyan-100 text-cyan-800 border border-cyan-300 font-medium">
                                        Schedule Set
                                      </span>
                                    );
                                  }
                                  return null;
                                }
                                
                                if (interviewStatus === 'Confirmed') {
                                  return (
                                    <span className="text-sm px-3 py-1 rounded bg-green-100 text-green-800 border border-green-300 font-medium">
                                      Interview Confirmed
                                    </span>
                                  );
                                } else if (interviewStatus === 'Rejected') {
                                  return (
                                    <span className="text-sm px-3 py-1 rounded bg-orange-100 text-orange-800 border border-orange-300 font-medium">
                                      Reschedule Requested
                                    </span>
                                  );
                                } else if (interviewStatus === 'Idle' && selectedApplicant.interview_date) {
                                  return (
                                    <span className="text-sm px-3 py-1 rounded bg-yellow-100 text-yellow-800 border border-yellow-300 font-medium">
                                      Awaiting Response
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                          <div className="text-sm text-gray-700 space-y-1">
                            <div><span className="font-medium">Date:</span> {selectedApplicant.interview_date}</div>
                            <div><span className="font-medium">Time:</span> {selectedApplicant.interview_time || <span className="text-gray-500 italic">None</span>}</div>
                            <div><span className="font-medium">{interviewType === 'online' ? 'Meeting Link' : 'Location'}:</span> {selectedApplicant.interview_location || <span className="text-gray-500 italic">None</span>}</div>
                            <div><span className="font-medium">Interviewer:</span> {selectedApplicant.interviewer || <span className="text-gray-500 italic">None</span>}</div>
                          </div>
                          <div className="mt-3 flex items-center justify-end">
                            <button
                              type="button"
                              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                              onClick={() => {
                                openInterviewModal(selectedApplicant, { reset: true });
                              }}
                            >
                              Schedule Another Interview
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Assessment Files Upload Section */}
                    <div className="mt-6">
                      <div className="bg-gray-100 text-gray-800 px-3 py-2 text-sm font-semibold border rounded-t-md">Assessment Files</div>
                      <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-gray-600 border-b bg-gray-50">
                        <div className="col-span-6">Document</div>
                        <div className="col-span-6">File</div>
                      </div>

                      {/* Interview Details File Row */}
                      {(() => {
                        // Check if interview is scheduled and confirmed
                        const hasInterviewScheduled = !!selectedApplicant?.interview_date;
                        const agencyApplicant = isAgency(selectedApplicant);
                        const interviewConfirmed = selectedApplicant?.interview_confirmed === 'Confirmed' || 
                                                   selectedApplicant?.interview_confirmed === 'confirmed';
                        const rescheduleRequested = (selectedApplicant?.interview_confirmed === 'Rejected' || selectedApplicant?.interview_confirmed === 'rejected') && hasInterviewScheduled;
                        const canUpload = hasInterviewScheduled && (agencyApplicant ? !rescheduleRequested : interviewConfirmed);
                        
                        const fileValue = selectedApplicant?.interview_details_file || (selectedApplicant?.raw?.payload ? (() => {
                          const payload = typeof selectedApplicant.raw.payload === 'string' 
                            ? JSON.parse(selectedApplicant.raw.payload) 
                            : selectedApplicant.raw.payload;
                          return payload?.interview_details_file || null;
                        })() : null);
                        const hasFile = !!(fileValue || interviewFile);
                        const displayFileName = interviewFileName || (fileValue ? fileValue.split('/').pop() : "");

                        return (
                          <div className="border-b">
                            <div className="grid grid-cols-12 items-center gap-3 px-3 py-3">
                              <div className="col-span-12 md:col-span-6 text-sm text-gray-800 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-600">
                                  <path fillRule="evenodd" d="M4.5 3.75a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V6.75a3 3 0 0 0-3-3h-15Zm4.125 3a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Zm-3.873 8.703a4.126 4.126 0 0 1 7.746 0 .75.75 0 0 1-.372.84A7.72 7.72 0 0 1 8 18.75a7.72 7.72 0 0 1-5.501-2.607.75.75 0 0 1-.372-.84Zm4.622-1.44a5.076 5.076 0 0 0 5.024 0l.348-1.597c.271.1.56.153.856.153h6a.75.75 0 0 0 0-1.5h-3.045c.01-.1.02-.2.02-.3V11.25c0-5.385-4.365-9.75-9.75-9.75S2.25 5.865 2.25 11.25v.756a2.25 2.25 0 0 0 1.988 2.246l.217.037a2.25 2.25 0 0 0 2.163-1.684l1.38-4.276a1.125 1.125 0 0 1 1.08-.82Z" clipRule="evenodd" />
                                </svg>
                                Interview Details
                              </div>
                              <div className="col-span-12 md:col-span-6 text-sm">
                                <div className="flex items-center gap-2">
                                  {!canUpload && !hasFile ? (
                                    <div className="flex items-center gap-2 text-gray-500 text-sm italic">
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gray-400">
                                        <path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75ZM6.75 15a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V15.75a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V15.75a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                                      </svg>
                                      {!hasInterviewScheduled 
                                        ? "Interview must be scheduled first" 
                                        : agencyApplicant
                                        ? (rescheduleRequested ? "Reschedule requested" : "Upload unavailable") 
                                        : !interviewConfirmed 
                                        ? "Applicant must confirm interview first" 
                                        : "Upload unavailable"}
                                    </div>
                                  ) : hasFile ? (
                                    <div className="flex items-center gap-2 w-full">
                                      <div className="flex items-center gap-2 flex-1">
                                        {fileValue && !interviewFile ? (
                                          <a
                                            href={supabase.storage.from('application-files').getPublicUrl(fileValue)?.data?.publicUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm text-blue-600 hover:underline cursor-pointer"
                                          >
                                            {displayFileName}
                                          </a>
                                        ) : (
                                          <input
                                            type="text"
                                            placeholder="File name"
                                            value={displayFileName}
                                            onChange={(e) => setInterviewFileName(e.target.value)}
                                            className={`flex-1 px-3 py-2 border border-gray-300 rounded text-sm ${
                                              interviewFile || fileValue 
                                                ? "text-blue-600" 
                                                : ""
                                            }`}
                                            readOnly={!!(fileValue && !interviewFile)}
                                          />
                                        )}
                                        {fileValue && !interviewFile && canUpload && (
                                          <label className="px-2 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600 cursor-pointer whitespace-nowrap flex items-center gap-1 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                              <path d="M9.25 3.5a2.25 2.25 0 0 0-2.15 1.6l-1.15.345a2.25 2.25 0 0 0-1.6 2.15v6.2a2.251 2.251 0 0 0 2.15 2.15h.115a6.5 6.5 0 0 1 1.194-3.567l.298-.7a.75.75 0 0 1 .695-.433h1.18a.75.75 0 0 1 .695.433l.298.7a6.5 6.5 0 0 1 1.194 3.567h.115a2.25 2.25 0 0 0 2.15-2.15V7.595a2.25 2.25 0 0 0-1.6-2.15l-1.15-.345a2.25 2.25 0 0 0-2.15-1.6H9.25ZM6.115 12a5.5 5.5 0 0 1 1.194-3.567l.298-.7A2.25 2.25 0 0 1 9.683 7.5h.634a2.25 2.25 0 0 1 2.076 1.233l.298.7A5.5 5.5 0 0 1 13.885 12H6.115Z" />
                                            </svg>
                                            Resubmit
                                            <input
                                              type="file"
                                              onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                  setInterviewFile(file);
                                                  setInterviewFileName(file.name);
                                                }
                                              }}
                                              className="hidden"
                                            />
                                          </label>
                                        )}
                                        {interviewFile && (
                                          <button
                                            type="button"
                                            className="w-6 h-6 rounded-full bg-red-500 text-white hover:bg-red-600 flex items-center justify-center flex-shrink-0 transition-colors"
                                            onClick={() => {
                                              setInterviewFile(null);
                                              setInterviewFileName(fileValue ? fileValue.split('/').pop() : "");
                                            }}
                                            title="Cancel resubmit"
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                            </svg>
                                          </button>
                                        )}
                                      </div>
                                      {uploadingInterviewFile ? (
                                        <span className="text-gray-600 text-sm whitespace-nowrap flex items-center gap-1">
                                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                          </svg>
                                          Uploading...
                                        </span>
                                      ) : interviewFile ? (
                                        <button
                                          type="button"
                                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 whitespace-nowrap flex items-center gap-1"
                                          onClick={async () => {
                                            if (!interviewFile || !selectedApplicant?.id) return;
                                            
                                            setUploadingInterviewFile(true);
                                            try {
                                              const fileExt = interviewFile.name.split('.').pop();
                                              const fileName = interviewFileName || `interview-details-${selectedApplicant.id}-${Date.now()}.${fileExt}`;
                                              const filePath = `interview-details/${selectedApplicant.id}/${fileName}`;

                                              const { data: uploadData, error: uploadError } = await supabase.storage
                                                .from('application-files')
                                                .upload(filePath, interviewFile, { upsert: true });

                                              if (uploadError) throw uploadError;

                                              const { error: updateError } = await supabase
                                                .from('applications')
                                                .update({ interview_details_file: uploadData.path })
                                                .eq('id', selectedApplicant.id);

                                              if (updateError && updateError.code === 'PGRST204') {
                                                const currentPayload = selectedApplicant.raw?.payload || {};
                                                let payloadObj = typeof currentPayload === 'string' ? JSON.parse(currentPayload) : currentPayload;
                                                const updatedPayload = { ...payloadObj, interview_details_file: uploadData.path };
                                                const { error: payloadError } = await supabase
                                                  .from('applications')
                                                  .update({ payload: updatedPayload })
                                                  .eq('id', selectedApplicant.id);
                                                if (payloadError) throw payloadError;
                                              } else if (updateError) {
                                                throw updateError;
                                              }

                                              // Update selectedApplicant immediately with the new file path
                                              setSelectedApplicant(prev => ({
                                                ...prev,
                                                interview_details_file: uploadData.path,
                                                raw: {
                                                  ...prev.raw,
                                                  interview_details_file: uploadData.path,
                                                  payload: updateError && updateError.code === 'PGRST204' 
                                                    ? { ...(typeof selectedApplicant.raw?.payload === 'string' ? JSON.parse(selectedApplicant.raw.payload) : selectedApplicant.raw?.payload || {}), interview_details_file: uploadData.path }
                                                    : prev.raw?.payload
                                                }
                                              }));
                                              
                                              await loadApplications();
                                              
                                              // After loadApplications, ensure selectedApplicant is updated from the fresh data
                                              const { data: updatedApp } = await supabase
                                                .from('applications')
                                                .select('*, interview_details_file, payload')
                                                .eq('id', selectedApplicant.id)
                                                .single();
                                              
                                              if (updatedApp) {
                                                let payloadObj = updatedApp.payload;
                                                if (typeof payloadObj === 'string') {
                                                  try {
                                                    payloadObj = JSON.parse(payloadObj);
                                                  } catch {
                                                    payloadObj = {};
                                                  }
                                                }
                                                
                                                setSelectedApplicant(prev => ({
                                                  ...prev,
                                                  interview_details_file: updatedApp.interview_details_file || payloadObj?.interview_details_file || uploadData.path,
                                                  raw: updatedApp
                                                }));
                                              }
                                              
                                              setInterviewFileName(fileName);
                                              setInterviewFile(null);
                                              setSuccessMessage("Interview details file uploaded successfully");
                                              setShowSuccessAlert(true);
                                            } catch (err) {
                                              console.error('Error uploading interview file:', err);
                                              setErrorMessage("Failed to upload file. Please try again.");
                                              setShowErrorAlert(true);
                                            } finally {
                                              setUploadingInterviewFile(false);
                                            }
                                          }}
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                            <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                                            <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v3.5A2.75 2.75 0 0 0 4.75 19h10.5A2.75 2.75 0 0 0 18 16.25v-3.5a.75.75 0 0 0-1.5 0v3.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-3.5Z" />
                                          </svg>
                                          Save
                                        </button>
                                      ) : null}
                                    </div>
                                  ) : canUpload ? (
                                    <label className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 text-sm font-medium transition-colors">
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                        <path d="M9.25 3.5a2.25 2.25 0 0 0-2.15 1.6l-1.15.345a2.25 2.25 0 0 0-1.6 2.15v6.2a2.251 2.251 0 0 0 2.15 2.15h.115a6.5 6.5 0 0 1 1.194-3.567l.298-.7a.75.75 0 0 1 .695-.433h1.18a.75.75 0 0 1 .695.433l.298.7a6.5 6.5 0 0 1 1.194 3.567h.115a2.25 2.25 0 0 0 2.15-2.15V7.595a2.25 2.25 0 0 0-1.6-2.15l-1.15-.345a2.25 2.25 0 0 0-2.15-1.6H9.25ZM6.115 12a5.5 5.5 0 0 1 1.194-3.567l.298-.7A2.25 2.25 0 0 1 9.683 7.5h.634a2.25 2.25 0 0 1 2.076 1.233l.298.7A5.5 5.5 0 0 1 13.885 12H6.115Z" />
                                      </svg>
                                      Upload
                                      <input
                                        type="file"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            setInterviewFile(file);
                                            if (!interviewFileName) {
                                              setInterviewFileName(file.name);
                                            }
                                          }
                                        }}
                                        className="hidden"
                                      />
                                    </label>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Assessment Results File Row */}
                      {(() => {
                        // Check if interview is scheduled and confirmed
                        const hasInterviewScheduled = !!selectedApplicant?.interview_date;
                        const agencyApplicant = isAgency(selectedApplicant);
                        const interviewConfirmed = selectedApplicant?.interview_confirmed === 'Confirmed' || 
                                                   selectedApplicant?.interview_confirmed === 'confirmed';
                        const rescheduleRequested = (selectedApplicant?.interview_confirmed === 'Rejected' || selectedApplicant?.interview_confirmed === 'rejected') && hasInterviewScheduled;
                        const canUpload = hasInterviewScheduled && (agencyApplicant ? !rescheduleRequested : interviewConfirmed);
                        
                        const fileValue = selectedApplicant?.assessment_results_file || (selectedApplicant?.raw?.payload ? (() => {
                          const payload = typeof selectedApplicant.raw.payload === 'string' 
                            ? JSON.parse(selectedApplicant.raw.payload) 
                            : selectedApplicant.raw.payload;
                          return payload?.assessment_results_file || null;
                        })() : null);
                        const hasFile = !!(fileValue || assessmentFile);
                        const displayFileName = assessmentFileName || (fileValue ? fileValue.split('/').pop() : "");

                        return (
                          <div className="border-b">
                            <div className="grid grid-cols-12 items-center gap-3 px-3 py-3">
                              <div className="col-span-12 md:col-span-6 text-sm text-gray-800 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-600">
                                  <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.525-1.72-1.72a.75.75 0 1 0-1.06 1.061l2.25 2.25a.75.75 0 0 0 1.144-.094l3.843-5.15Z" clipRule="evenodd" />
                                </svg>
                                In-Person Assessment Results
                              </div>
                              <div className="col-span-12 md:col-span-6 text-sm">
                                <div className="flex items-center gap-2">
                                  {!canUpload && !hasFile ? (
                                    <div className="flex items-center gap-2 text-gray-500 text-sm italic">
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gray-400">
                                        <path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75ZM6.75 15a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V15.75a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V15.75a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                                      </svg>
                                      {!hasInterviewScheduled 
                                        ? "Interview must be scheduled first" 
                                        : agencyApplicant
                                        ? (rescheduleRequested ? "Reschedule requested" : "Upload unavailable")
                                        : !interviewConfirmed 
                                        ? "Applicant must confirm interview first" 
                                        : "Upload unavailable"}
                                    </div>
                                  ) : hasFile ? (
                                    <div className="flex items-center gap-2 w-full">
                                      <div className="flex items-center gap-2 flex-1">
                                        {fileValue && !assessmentFile ? (
                                          <a
                                            href={supabase.storage.from('application-files').getPublicUrl(fileValue)?.data?.publicUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm text-blue-600 hover:underline cursor-pointer"
                                          >
                                            {displayFileName}
                                          </a>
                                        ) : (
                                          <input
                                            type="text"
                                            placeholder="File name"
                                            value={displayFileName}
                                            onChange={(e) => setAssessmentFileName(e.target.value)}
                                            className={`flex-1 px-3 py-2 border border-gray-300 rounded text-sm ${
                                              assessmentFile || fileValue 
                                                ? "text-blue-600" 
                                                : ""
                                            }`}
                                            readOnly={!!(fileValue && !assessmentFile)}
                                          />
                                        )}
                                        {fileValue && !assessmentFile && canUpload && (
                                          <label className="px-2 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600 cursor-pointer whitespace-nowrap flex items-center gap-1 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                              <path d="M9.25 3.5a2.25 2.25 0 0 0-2.15 1.6l-1.15.345a2.25 2.25 0 0 0-1.6 2.15v6.2a2.251 2.251 0 0 0 2.15 2.15h.115a6.5 6.5 0 0 1 1.194-3.567l.298-.7a.75.75 0 0 1 .695-.433h1.18a.75.75 0 0 1 .695.433l.298.7a6.5 6.5 0 0 1 1.194 3.567h.115a2.25 2.25 0 0 0 2.15-2.15V7.595a2.25 2.25 0 0 0-1.6-2.15l-1.15-.345a2.25 2.25 0 0 0-2.15-1.6H9.25ZM6.115 12a5.5 5.5 0 0 1 1.194-3.567l.298-.7A2.25 2.25 0 0 1 9.683 7.5h.634a2.25 2.25 0 0 1 2.076 1.233l.298.7A5.5 5.5 0 0 1 13.885 12H6.115Z" />
                                            </svg>
                                            Resubmit
                                            <input
                                              type="file"
                                              onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                  setAssessmentFile(file);
                                                  setAssessmentFileName(file.name);
                                                }
                                              }}
                                              className="hidden"
                                            />
                                          </label>
                                        )}
                                        {assessmentFile && (
                                          <button
                                            type="button"
                                            className="w-6 h-6 rounded-full bg-red-500 text-white hover:bg-red-600 flex items-center justify-center flex-shrink-0 transition-colors"
                                            onClick={() => {
                                              setAssessmentFile(null);
                                              setAssessmentFileName(fileValue ? fileValue.split('/').pop() : "");
                                            }}
                                            title="Cancel resubmit"
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                            </svg>
                                          </button>
                                        )}
                                      </div>
                                      {uploadingAssessmentFile ? (
                                        <span className="text-gray-600 text-sm whitespace-nowrap flex items-center gap-1">
                                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                          </svg>
                                          Uploading...
                                        </span>
                                      ) : assessmentFile ? (
                                        <button
                                          type="button"
                                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 whitespace-nowrap flex items-center gap-1"
                                          onClick={async () => {
                                            if (!assessmentFile || !selectedApplicant?.id) return;
                                            
                                            setUploadingAssessmentFile(true);
                                            try {
                                              const fileExt = assessmentFile.name.split('.').pop();
                                              const fileName = assessmentFileName || `assessment-results-${selectedApplicant.id}-${Date.now()}.${fileExt}`;
                                              const filePath = `assessment-results/${selectedApplicant.id}/${fileName}`;

                                              const { data: uploadData, error: uploadError } = await supabase.storage
                                                .from('application-files')
                                                .upload(filePath, assessmentFile, { upsert: true });

                                              if (uploadError) throw uploadError;

                                              const { error: updateError } = await supabase
                                                .from('applications')
                                                .update({ assessment_results_file: uploadData.path })
                                                .eq('id', selectedApplicant.id);

                                              if (updateError && updateError.code === 'PGRST204') {
                                                const currentPayload = selectedApplicant.raw?.payload || {};
                                                let payloadObj = typeof currentPayload === 'string' ? JSON.parse(currentPayload) : currentPayload;
                                                const updatedPayload = { ...payloadObj, assessment_results_file: uploadData.path };
                                                const { error: payloadError } = await supabase
                                                  .from('applications')
                                                  .update({ payload: updatedPayload })
                                                  .eq('id', selectedApplicant.id);
                                                if (payloadError) throw payloadError;
                                              } else if (updateError) {
                                                throw updateError;
                                              }

                                              // Update selectedApplicant immediately with the new file path
                                              setSelectedApplicant(prev => ({
                                                ...prev,
                                                assessment_results_file: uploadData.path,
                                                raw: {
                                                  ...prev.raw,
                                                  assessment_results_file: uploadData.path,
                                                  payload: updateError && updateError.code === 'PGRST204' 
                                                    ? { ...(typeof selectedApplicant.raw?.payload === 'string' ? JSON.parse(selectedApplicant.raw.payload) : selectedApplicant.raw?.payload || {}), assessment_results_file: uploadData.path }
                                                    : prev.raw?.payload
                                                }
                                              }));
                                              
                                              await loadApplications();
                                              
                                              // After loadApplications, ensure selectedApplicant is updated from the fresh data
                                              const { data: updatedApp } = await supabase
                                                .from('applications')
                                                .select('*, assessment_results_file, payload')
                                                .eq('id', selectedApplicant.id)
                                                .single();
                                              
                                              if (updatedApp) {
                                                let payloadObj = updatedApp.payload;
                                                if (typeof payloadObj === 'string') {
                                                  try {
                                                    payloadObj = JSON.parse(payloadObj);
                                                  } catch {
                                                    payloadObj = {};
                                                  }
                                                }
                                                
                                                setSelectedApplicant(prev => ({
                                                  ...prev,
                                                  assessment_results_file: updatedApp.assessment_results_file || payloadObj?.assessment_results_file || uploadData.path,
                                                  raw: updatedApp
                                                }));
                                              }
                                              
                                              setAssessmentFileName(fileName);
                                              setAssessmentFile(null);
                                              setSuccessMessage("Assessment results file uploaded successfully");
                                              setShowSuccessAlert(true);
                                            } catch (err) {
                                              console.error('Error uploading assessment file:', err);
                                              setErrorMessage("Failed to upload file. Please try again.");
                                              setShowErrorAlert(true);
                                            } finally {
                                              setUploadingAssessmentFile(false);
                                            }
                                          }}
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                            <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                                            <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v3.5A2.75 2.75 0 0 0 4.75 19h10.5A2.75 2.75 0 0 0 18 16.25v-3.5a.75.75 0 0 0-1.5 0v3.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-3.5Z" />
                                          </svg>
                                          Save
                                        </button>
                                      ) : null}
                                    </div>
                                  ) : canUpload ? (
                                    <label className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 text-sm font-medium transition-colors">
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                        <path d="M9.25 3.5a2.25 2.25 0 0 0-2.15 1.6l-1.15.345a2.25 2.25 0 0 0-1.6 2.15v6.2a2.251 2.251 0 0 0 2.15 2.15h.115a6.5 6.5 0 0 1 1.194-3.567l.298-.7a.75.75 0 0 1 .695-.433h1.18a.75.75 0 0 1 .695.433l.298.7a6.5 6.5 0 0 1 1.194 3.567h.115a2.25 2.25 0 0 0 2.15-2.15V7.595a2.25 2.25 0 0 0-1.6-2.15l-1.15-.345a2.25 2.25 0 0 0-2.15-1.6H9.25ZM6.115 12a5.5 5.5 0 0 1 1.194-3.567l.298-.7A2.25 2.25 0 0 1 9.683 7.5h.634a2.25 2.25 0 0 1 2.076 1.233l.298.7A5.5 5.5 0 0 1 13.885 12H6.115Z" />
                                      </svg>
                                      Upload
                                      <input
                                        type="file"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            setAssessmentFile(file);
                                            if (!assessmentFileName) {
                                              setAssessmentFileName(file.name);
                                            }
                                          }
                                        }}
                                        className="hidden"
                                      />
                                    </label>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </section>
                )}

                {/* Agreements Tab - simplified to agreement-related upload table only */}
                {activeDetailTab === "Agreements" && (
                  <section className="px-4 pb-4">
                    {/* Agreement Signing Appointment (separate from interview) */}
                    <div className="pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-semibold text-gray-800">Agreement Signing Appointment</h2>
                        {(() => {
                          const hasSigning = !!selectedApplicant?.agreement_signing_date;
                          const signingStatus = selectedApplicant?.agreement_signing_confirmed || 'Idle';
                          const canSchedule = !hasSigning;
                          const canReschedule = hasSigning && signingStatus === 'Rejected';

                          if (!canSchedule && !canReschedule) return null;

                          return (
                            <button
                              type="button"
                              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                              onClick={() => {
                                if (!selectedApplicant) return;
                                openAgreementSigningModal(selectedApplicant);
                              }}
                            >
                              {canReschedule ? 'Reschedule Agreement Signing' : 'Schedule Agreement Signing'}
                            </button>
                          );
                        })()}
                      </div>

                      {selectedApplicant?.agreement_signing_date ? (
                        <div className="bg-gray-50 border rounded-md p-4 mb-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="text-sm text-gray-800 font-semibold">Schedule</div>
                            {(() => {
                              const signingStatus = selectedApplicant?.agreement_signing_confirmed || 'Idle';
                              if (signingStatus === 'Confirmed') {
                                return (
                                  <span className="text-sm px-3 py-1 rounded bg-green-100 text-green-800 border border-green-300 font-medium">
                                    Confirmed
                                  </span>
                                );
                              }
                              if (signingStatus === 'Rejected') {
                                return (
                                  <span className="text-sm px-3 py-1 rounded bg-orange-100 text-orange-800 border border-orange-300 font-medium">
                                    Reschedule Requested
                                  </span>
                                );
                              }
                              return (
                                <span className="text-sm px-3 py-1 rounded bg-yellow-100 text-yellow-800 border border-yellow-300 font-medium">
                                  Awaiting Response
                                </span>
                              );
                            })()}
                          </div>
                          <div className="text-sm text-gray-700 space-y-1">
                            <div><span className="font-medium">Date:</span> {selectedApplicant.agreement_signing_date}</div>
                            <div><span className="font-medium">Time:</span> {selectedApplicant.agreement_signing_time || <span className="text-gray-500 italic">None</span>}</div>
                            <div><span className="font-medium">Location / Link:</span> {selectedApplicant.agreement_signing_location || <span className="text-gray-500 italic">None</span>}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 border rounded-md p-4 mb-4">
                          <div className="text-sm text-gray-700">
                            <span className="font-medium">No agreement signing appointment yet.</span>
                            <span className="text-gray-500"> Schedule it here to notify the applicant.</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-100 text-gray-800 px-3 py-2 text-sm font-semibold border rounded-t-md">Agreement Documents</div>
                    <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-gray-600 border-b">
                      <div className="col-span-6">&nbsp;</div>
                      <div className="col-span-6">File</div>
                    </div>

                    {/* Helper function to render document row */}
                    {(() => {
                      const renderDocumentRow = (documentName, fileKey, file, setFile, fileName, setFileName, uploading, setUploading, filePathPrefix) => {
                        // Get file value from direct field or payload
                        let fileValue = selectedApplicant?.[fileKey] || null;
                        if (!fileValue && selectedApplicant?.raw?.payload) {
                          const payload = typeof selectedApplicant.raw.payload === 'string' 
                            ? JSON.parse(selectedApplicant.raw.payload) 
                            : selectedApplicant.raw.payload;
                          fileValue = payload?.[fileKey] || null;
                        }
                        const displayFileName = fileName || (fileValue ? fileValue.split('/').pop() : "");
                        
                        return (
                          <div key={fileKey} className="border-b">
                            <div className="grid grid-cols-12 items-center gap-3 px-3 py-3">
                              <div className="col-span-12 md:col-span-6 text-sm text-gray-800">{documentName}</div>
                              <div className="col-span-12 md:col-span-6 text-sm">
                                <div className="flex items-center gap-2">
                                  {file || fileValue ? (
                                    <div className="flex items-center gap-2 w-full">
                                      <div className="flex items-center gap-2 flex-1">
                                        <input
                                          type="text"
                                          placeholder="File name"
                                          value={displayFileName}
                                          onChange={(e) => setFileName(e.target.value)}
                                          className={`flex-1 px-3 py-2 border border-gray-300 rounded text-sm ${
                                            file || fileValue 
                                              ? "text-blue-600 underline" 
                                              : ""
                                          }`}
                                          readOnly={!!(file || fileValue)}
                                        />
                                        {(file || fileValue) && (
                                          <button
                                            type="button"
                                            className="w-6 h-6 rounded-full bg-red-500 text-white hover:bg-red-600 flex items-center justify-center flex-shrink-0 transition-colors"
                                            onClick={async () => {
                                              if (file) {
                                                // Just remove from selection if not saved yet
                                                setFile(null);
                                                setFileName("");
                                              } else if (fileValue) {
                                                // Remove from database if already saved
                                                await handleAgreementFileRemove(
                                                  fileKey,
                                                  setFileName,
                                                  setSuccessMessage,
                                                  setShowSuccessAlert,
                                                  setErrorMessage,
                                                  setShowErrorAlert
                                                );
                                              }
                                            }}
                                            title="Remove file"
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                            </svg>
                                          </button>
                                        )}
                                      </div>
                                      {uploading ? (
                                        <span className="text-gray-600 text-sm whitespace-nowrap">Uploading...</span>
                                      ) : file ? (
                                        <button
                                          type="button"
                                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 whitespace-nowrap"
                                          onClick={async () => {
                                            await handleAgreementFileUpload(
                                              file,
                                              fileName,
                                              fileKey,
                                              filePathPrefix,
                                              setFile,
                                              setFileName,
                                              setUploading,
                                              setSuccessMessage,
                                              setShowSuccessAlert,
                                              setErrorMessage,
                                              setShowErrorAlert
                                            );
                                          }}
                                        >
                                          Save
                                        </button>
                                      ) : fileValue ? (
                                        <a
                                          href={supabase.storage.from('application-files').getPublicUrl(fileValue)?.data?.publicUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 whitespace-nowrap border border-blue-300"
                                        >
                                          View
                                        </a>
                                      ) : null}
                                    </div>
                                  ) : (
                                    <label className="inline-block px-3 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 border text-sm">
                                      Upload
                                      <input
                                        type="file"
                                        accept=".pdf,.docx"
                                        onChange={(e) => {
                                          const selectedFile = e.target.files?.[0];
                                          if (selectedFile) {
                                            setFile(selectedFile);
                                            if (!fileName) {
                                              setFileName(selectedFile.name);
                                            }
                                          }
                                        }}
                                        className="hidden"
                                      />
                                    </label>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      };

                      return (
                        <>
                          {renderDocumentRow(
                            "Employee Appointment Letter",
                            "appointment_letter_file",
                            agreementFile,
                            setAgreementFile,
                            agreementFileName,
                            setAgreementFileName,
                            uploadingAgreementFile,
                            setUploadingAgreementFile,
                            "appointment-letter"
                          )}
                          {renderDocumentRow(
                            "Undertaking",
                            "undertaking_file",
                            undertakingFile,
                            setUndertakingFile,
                            undertakingFileName,
                            setUndertakingFileName,
                            uploadingUndertakingFile,
                            setUploadingUndertakingFile,
                            "undertaking"
                          )}
                          {renderDocumentRow(
                            "Application Form",
                            "application_form_file",
                            applicationFormFile,
                            setApplicationFormFile,
                            applicationFormFileName,
                            setApplicationFormFileName,
                            uploadingApplicationFormFile,
                            setUploadingApplicationFormFile,
                            "application-form"
                          )}
                          {renderDocumentRow(
                            "Undertaking of Duties and Responsibilities",
                            "undertaking_duties_file",
                            undertakingDutiesFile,
                            setUndertakingDutiesFile,
                            undertakingDutiesFileName,
                            setUndertakingDutiesFileName,
                            uploadingUndertakingDutiesFile,
                            setUploadingUndertakingDutiesFile,
                            "undertaking-duties"
                          )}
                          {renderDocumentRow(
                            "Roadwise Pre Employment Requirements",
                            "pre_employment_requirements_file",
                            preEmploymentRequirementsFile,
                            setPreEmploymentRequirementsFile,
                            preEmploymentRequirementsFileName,
                            setPreEmploymentRequirementsFileName,
                            uploadingPreEmploymentRequirementsFile,
                            setUploadingPreEmploymentRequirementsFile,
                            "pre-employment-requirements"
                          )}
                          {renderDocumentRow(
                            "ID Form",
                            "id_form_file",
                            idFormFile,
                            setIdFormFile,
                            idFormFileName,
                            setIdFormFileName,
                            uploadingIdFormFile,
                            setUploadingIdFormFile,
                            "id-form"
                          )}
                        </>
                      );
                    })()}

                    <div className="flex justify-end mt-6">
                      <button
                        type="button"
                        className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          await handleMarkAsEmployee(selectedApplicant.id, selectedApplicant.name);
                        }}
                        onMouseDown={(e) => {
                          // Prevent accidental triggers
                          e.preventDefault();
                        }}
                      >
                        Mark as Hired
                      </button>
                    </div>
                  </section>
                )}
              </div>
              </div>
            </div>
          )}

          {activeSubTab === "JobPosts" && (
            // Job posts view (stays in this module, mimicking external job posts UI)
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              {/* Header row */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Job posts</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Draft and active postings with a quick overview of candidates.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/hr/create/job")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 text-white text-sm font-semibold shadow hover:bg-red-700 transition-colors"
                >
                  Create Job Post
                  <span className="text-lg leading-none">＋</span>
                </button>
              </div>

              {/* Job posts table */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex items-center justify-between text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <div className="flex gap-8 items-center">
                    <span className="w-20">Status</span>
                    <span className="w-24 text-center"></span>
                    <span className="w-48">Job</span>
                    <span className="w-32">Depot</span>
                    <span className="w-24 text-center">Employees Needed </span> 
                    <span className="w-24 text-center">Applied</span>
                    <span className="w-24 text-center">Hired</span>
                    <span className="w-28 text-center">Waitlisted</span>
                  </div>
                  <span className="w-40 text-right pr-2">Actions</span>
                </div>

                {loadingJobPosts ? (
                  <div className="px-5 py-8 text-sm text-gray-500 text-center">Loading job posts…</div>
                ) : jobPostStats.length === 0 ? (
                  <div className="px-5 py-8 text-sm text-gray-500">
                    No job posts yet. Use <span className="font-medium text-gray-700">Create Job Post</span> to start a posting.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {jobPostStats.map((job) => (
                      <div
                        key={job.id}
                        className="px-5 py-3 flex items-center justify-between text-sm hover:bg-gray-50/80 transition-colors"
                      >
                        <div className="flex items-center gap-8">
                          <span className={`inline-flex items-center justify-center px-2.5 py-1 text-[11px] rounded-full border w-20 ${
                            job.status === "Active"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : job.status === "Pending"
                              ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                              : job.status === "Closed"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-gray-50 text-gray-700 border-gray-200"
                          }`}>
                            {job.status}
                          </span>
                          <div className="w-24 text-center">
                            {job.job_type === 'delivery_crew' && (
                              <span className="inline-flex items-center justify-center px-2.5 py-1 text-[11px] rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                Outsourced
                              </span>
                            )}
                          </div>
                          <div className="w-48">
                            <p className="font-medium text-gray-800 truncate">{job.title}</p>
                          </div>
                          <div className="w-32 text-gray-700">{job.depot}</div>
                          <div className="w-24 text-center text-gray-800">{job.positions_needed == null ? 'No limit' : job.positions_needed}</div>
                          <div className="w-24 text-center text-gray-800">{job.applied}</div>
                          <div className="w-24 text-center text-gray-800">{job.hired}</div>
                          <div className="w-28 text-center text-gray-800">{job.waitlisted}</div>
                        </div>
                        <div className="w-40 flex justify-end gap-2">
                          {job.actualJobId ? (
                            <>
                              {/* Show Approve button for HR if job is pending approval */}
                              {job.status === "Pending" && currentUser?.role?.toUpperCase() === 'HR' && (
                                <button
                                  type="button"
                                  onClick={() => handleApproveJobPost(job.actualJobId, job.title)}
                                  className="px-3 py-1.5 rounded-full border border-green-300 text-xs text-green-700 hover:bg-green-50"
                                >
                                  Approve
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleEditJobPost(job.actualJobId)}
                                className="px-3 py-1.5 rounded-full border border-blue-300 text-xs text-blue-700 hover:bg-blue-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  // Only show confirmation dialog - deletion will happen when OK is clicked
                                  handleRemoveJobPost(job.actualJobId, job.title);
                                }}
                                className="px-3 py-1.5 rounded-full border border-red-300 text-xs text-red-700 hover:bg-red-50"
                              >
                                Remove
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">No job ID</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer link */}
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={() => navigate("/hr/recruitment/job/all")}
                  className="text-xs font-medium text-gray-600 hover:text-gray-800 hover:underline"
                >
                  View all job posts
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Action Modal */}
      {showActionModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            {!actionType && (
              <>
                <h3 className="text-lg font-bold mb-4">Update Application Status</h3>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={async () => {
                      if (!selectedApplicant) return;
                      await handleMarkAsEmployee(selectedApplicant.id, selectedApplicant.name);
                      setShowActionModal(false);
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    Hired
                  </button>
                  <button
                    onClick={() => setActionType("reject")}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    Reject
                  </button>
                </div>
                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => {
                      setShowActionModal(false);
                      setActionType(null);
                    }}
                    className="px-4 py-2 bg-gray-300 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {actionType === "reject" && (
              <>
                <h3 className="text-lg font-bold mb-2">Add Rejection Remarks</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Please share your feedback or reasons for rejecting this applicant.
                </p>
                <textarea
                  rows="4"
                  className="w-full border rounded px-3 py-2"
                  placeholder="Enter remarks..."
                  value={rejectionRemarks}
                  onChange={(e) => setRejectionRemarks(e.target.value)}
                />
                <div className="flex justify-end gap-4 mt-4">
                  <button
                    onClick={() => {
                      setShowActionModal(false);
                      setActionType(null);
                      setRejectionRemarks("");
                    }}
                    className="px-4 py-2 bg-gray-300 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!selectedApplicant) return;
                      const remarks = rejectionRemarks.trim() || null;
                      if (remarks === null) {
                        setConfirmMessage("Reject without remarks?");
                        setConfirmCallback(() => async () => {
                          setShowConfirmDialog(false);
                          await rejectApplication(
                            selectedApplicant.id,
                            selectedApplicant.name,
                            remarks
                          );
                          setShowActionModal(false);
                          setActionType(null);
                          setRejectionRemarks("");
                          setSelectedApplicant(null);
                        });
                        setShowConfirmDialog(true);
                        return;
                      }
                      await rejectApplication(
                        selectedApplicant.id,
                        selectedApplicant.name,
                        remarks
                      );
                      setShowActionModal(false);
                      setActionType(null);
                      setRejectionRemarks("");
                      setSelectedApplicant(null);
                    }}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Submit
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Rejected Applicants Modal */}
      {showRejectedModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-lg">
            <h3 className="text-xl font-bold mb-4">Rejected Applicants</h3>
            {rejectedApplicants.length === 0 ? (
              <p className="text-gray-500">No rejected applicants yet.</p>
            ) : (
              <div className="space-y-3">
                {rejectedApplicants.map((r) => (
                  <div key={r.id} className="border p-3 rounded-lg bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <strong className="text-gray-800">{r.name}</strong>
                        <p className="text-sm text-gray-600">{r.position} - {r.depot}</p>
                        <p className="text-xs text-gray-500">Applied: {r.dateApplied}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mt-2 italic">"{r.remarks}"</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowRejectedModal(false)} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interview Modal */}
      {showInterviewModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowInterviewModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Schedule Interview</h3>
                    <p className="text-sm text-white/90">{selectedApplicationForInterview?.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowInterviewModal(false)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Interview Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Interview Type <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3">
                  <label className={`flex-1 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    interviewForm.interview_type === 'onsite'
                      ? 'border-red-600 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="interview_type"
                      value="onsite"
                      checked={interviewForm.interview_type === 'onsite'}
                      onChange={(e) => setInterviewForm((f) => ({ ...f, interview_type: e.target.value }))}
                      className="hidden"
                    />
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        interviewForm.interview_type === 'onsite'
                          ? 'border-red-600'
                          : 'border-gray-300'
                      }`}>
                        {interviewForm.interview_type === 'onsite' && (
                          <div className="w-3 h-3 rounded-full bg-red-600"></div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">Onsite</div>
                        <div className="text-xs text-gray-500">In-person interview</div>
                      </div>
                    </div>
                  </label>
                  <label className={`flex-1 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    interviewForm.interview_type === 'online'
                      ? 'border-red-600 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="interview_type"
                      value="online"
                      checked={interviewForm.interview_type === 'online'}
                      onChange={(e) => setInterviewForm((f) => ({ ...f, interview_type: e.target.value }))}
                      className="hidden"
                    />
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        interviewForm.interview_type === 'online'
                          ? 'border-red-600'
                          : 'border-gray-300'
                      }`}>
                        {interviewForm.interview_type === 'online' && (
                          <div className="w-3 h-3 rounded-full bg-red-600"></div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">Online</div>
                        <div className="text-xs text-gray-500">Virtual interview</div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="date"
                    value={interviewForm.date}
                    onChange={(e) => setInterviewForm((f) => ({ ...f, date: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Time <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <input
                    type="time"
                    value={interviewForm.time}
                    onChange={(e) => {
                      const selectedDate = new Date(interviewForm.date);
                      const today = new Date();
                      const selectedTime = e.target.value;
                      
                      // If selected date is today, prevent selecting past times
                      if (selectedDate.toDateString() === today.toDateString()) {
                        const currentTime = today.toTimeString().slice(0, 5);
                        if (selectedTime <= currentTime) {
                          setErrorMessage("Please select a future time for today's date.");
                          setShowErrorAlert(true);
                          return;
                        }
                      }
                      
                      setInterviewForm((f) => ({ ...f, time: selectedTime }));
                    }}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {interviewForm.interview_type === 'online' ? 'Meeting Link' : 'Location'} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {interviewForm.interview_type === 'online' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      )}
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={interviewForm.location}
                    onChange={(e) => setInterviewForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder={interviewForm.interview_type === 'online' ? 'Google Meet, Zoom, etc.' : 'Enter location address'}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Interviewer */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Interviewer
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={interviewForm.interviewer}
                    onChange={(e) => setInterviewForm((f) => ({ ...f, interviewer: e.target.value }))}
                    placeholder="Enter interviewer name"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button 
                onClick={() => setShowInterviewModal(false)}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={scheduleInterview} 
                disabled={scheduling || !interviewForm.date || !interviewForm.time || !interviewForm.location}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {scheduling ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Scheduling...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Schedule & Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agreement Signing Modal */}
      {showAgreementSigningModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAgreementSigningModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Schedule Agreement Signing</h3>
                    <p className="text-sm text-white/90">{selectedApplicationForSigning?.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAgreementSigningModal(false)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="date"
                    value={agreementSigningForm.date}
                    onChange={(e) => setAgreementSigningForm((f) => ({ ...f, date: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Time <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <input
                    type="time"
                    value={agreementSigningForm.time}
                    onChange={(e) => {
                      const selectedDate = new Date(agreementSigningForm.date);
                      const today = new Date();
                      const selectedTime = e.target.value;
                      if (agreementSigningForm.date && selectedDate.toDateString() === today.toDateString()) {
                        const currentTime = today.toTimeString().slice(0, 5);
                        if (selectedTime <= currentTime) {
                          setErrorMessage("Please select a future time for today's date.");
                          setShowErrorAlert(true);
                          return;
                        }
                      }
                      setAgreementSigningForm((f) => ({ ...f, time: selectedTime }));
                    }}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Location / Meeting Link <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={agreementSigningForm.location}
                    onChange={(e) => setAgreementSigningForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="Enter location address or meeting link"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowAgreementSigningModal(false)}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={scheduleAgreementSigning}
                disabled={schedulingAgreementSigning || !agreementSigningForm.date || !agreementSigningForm.time || !agreementSigningForm.location}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {schedulingAgreementSigning ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Scheduling...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Schedule & Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Alert Modal */}
      {showSuccessAlert && !showConfirmDialog && (
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
      {showErrorAlert && !showConfirmDialog && (
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

      {/* Confirm Dialog Modal */}
      {showConfirmDialog && (
        <div 
          className="fixed inset-0 bg-transparent flex items-center justify-center z-50"
          onClick={(e) => {
            // Close dialog when clicking outside (backdrop)
            if (e.target === e.currentTarget) {
              setShowConfirmDialog(false);
              setConfirmCallback(null);
              setPendingJobDelete(null);
              setPendingJobApprove(null);
              setIsProcessingConfirm(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg border border-solid border-gray-300 p-6 w-full max-w-md shadow-lg" 
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">{confirmMessage}</h3>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowConfirmDialog(false);
                  setConfirmCallback(null);
                  setPendingJobDelete(null);
                  setPendingJobApprove(null);
                  setIsProcessingConfirm(false);
                  setIsOpeningConfirmDialog(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isProcessingConfirm || (!confirmCallback && !pendingJobDelete && !pendingJobApprove)}
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // Prevent multiple clicks
                  if (isProcessingConfirm) return;
                  
                  setIsProcessingConfirm(true);
                  
                  try {
                    // Handle job post approval
                    if (pendingJobApprove) {
                      const { jobId, jobTitle } = pendingJobApprove;
                      setPendingJobApprove(null);
                      await executeJobPostApproval(jobId, jobTitle);
                    }
                    // Handle job post deletion (new approach)
                    else if (pendingJobDelete) {
                      const { jobId, jobTitle } = pendingJobDelete;
                      setPendingJobDelete(null);
                      await executeJobPostDeletion(jobId, jobTitle);
                    }
                    // Handle other confirmations with callback
                    else if (confirmCallback && typeof confirmCallback === "function") {
                      const callbackToExecute = confirmCallback;
                      setConfirmCallback(null);
                      await callbackToExecute();
                    }
                  } catch (err) {
                    console.error("Error executing confirm action:", err);
                    setErrorMessage("An error occurred while processing your request.");
                    setShowErrorAlert(true);
                  } finally {
                    setShowConfirmDialog(false);
                    setIsProcessingConfirm(false);
                    setPendingJobDelete(null);
                    setPendingJobApprove(null);
                    setConfirmCallback(null);
                  }
                }}
              >
                {isProcessingConfirm ? "Processing..." : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Job Post Modal */}
      {showEditJobModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl my-8" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-800">Edit Job Post</h2>
              <button
                onClick={() => {
                  setShowEditJobModal(false);
                  setEditingJobPost(null);
                  setEditJobForm({
                    title: "",
                    depot: "",
                    department: "",
                    description: "",
                    mainResponsibilities: "",
                    keyRequirements: "",
                    urgent: true,
                    jobType: "office_employee",
                    endDate: "",
                    positions_needed: 1,
                    positionsNoLimit: false,
                  });
                  setErrorMessage("");
                  setShowErrorAlert(false);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
              {errorMessage && showErrorAlert && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-4">
                  {errorMessage}
                  <button
                    onClick={() => {
                      setErrorMessage("");
                      setShowErrorAlert(false);
                    }}
                    className="ml-2 text-red-700 hover:text-red-900"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="space-y-4">
                {/* Job Type Toggle */}
                <div>
                  <label className="block text-sm font-medium mb-2">Job Type</label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setEditJobField("jobType", "delivery_crew")}
                      className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                        editJobForm.jobType === "delivery_crew"
                          ? "border-red-600 bg-red-50 text-red-700 font-semibold"
                          : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                      }`}
                    >
                      <div className="text-lg mb-1">🚚</div>
                      <div className="text-sm font-medium">Drivers/Delivery Crew</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditJobField("jobType", "office_employee")}
                      className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                        editJobForm.jobType === "office_employee"
                          ? "border-red-600 bg-red-50 text-red-700 font-semibold"
                          : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                      }`}
                    >
                      <div className="text-lg mb-1">💼</div>
                      <div className="text-sm font-medium">Office Employee</div>
                    </button>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setEditJobField("urgent", !editJobForm.urgent)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                      editJobForm.urgent
                        ? "border-red-600 bg-red-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                    aria-pressed={editJobForm.urgent}
                  >
                    <div className="text-left">
                      <div className={`text-sm font-semibold ${editJobForm.urgent ? "text-red-700" : "text-gray-800"}`}>
                        Mark as Urgent
                      </div>
                      <div className="text-xs text-gray-500">Highlight this job post as a priority opening.</div>
                    </div>
                    <div className={`h-6 w-11 rounded-full p-1 transition-colors ${editJobForm.urgent ? "bg-red-600" : "bg-gray-300"}`}>
                      <div className={`h-4 w-4 rounded-full bg-white transition-transform ${editJobForm.urgent ? "translate-x-5" : "translate-x-0"}`} />
                    </div>
                  </button>
                </div>

                {/* Job Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Job Title <span className="text-red-600">*</span>
                  </label>
                  <input
                    list="edit-job-title-options"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    value={editJobForm.title}
                    onChange={(e) => setEditJobField("title", e.target.value)}
                    placeholder="e.g., Driver"
                  />
                  <datalist id="edit-job-title-options">
                    {allJobTitles.map((title) => (
                      <option key={title} value={title} />
                    ))}
                  </datalist>
                </div>

                {/* Department + Depot */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
                    <select
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all bg-white"
                      value={editJobForm.department}
                      onChange={(e) => setEditJobField("department", e.target.value)}
                    >
                      <option value="">Department</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Department is set automatically based on the selected job title.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Depot <span className="text-red-600">*</span></label>
                    <input
                      list="edit-depot-options"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                      value={editJobForm.depot}
                      onChange={(e) => setEditJobField("depot", e.target.value)}
                      placeholder="e.g., Batangas"
                      disabled={currentUser?.role?.toUpperCase() === 'HRC'}
                      style={currentUser?.role?.toUpperCase() === 'HRC' ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
                    />
                    <datalist id="edit-depot-options">
                      {depotOptions.map((depot) => (
                        <option key={depot} value={depot} />
                      ))}
                    </datalist>
                    {currentUser?.role?.toUpperCase() === 'HRC' && (
                      <p className="text-xs text-gray-500 mt-1">HRC users can only edit jobs for their assigned depot</p>
                    )}
                  </div>
                </div>

                {/* Employees Needed */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Employees Needed <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    value={editJobForm.positionsNoLimit ? "" : (editJobForm.positions_needed ?? 1)}
                    onChange={(e) => setEditJobField("positions_needed", parseInt(e.target.value, 10) || 1)}
                    placeholder="Number of hires needed (e.g., 3)"
                    disabled={editJobForm.positionsNoLimit}
                  />
                  <label className="mt-2 inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={Boolean(editJobForm.positionsNoLimit)}
                      onChange={(e) => setEditJobField("positionsNoLimit", e.target.checked)}
                    />
                    No limit
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Duration (Optional)</label>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">End Date</label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                      value={editJobForm.endDate}
                      onChange={(e) => setEditJobField("endDate", e.target.value)}
                      min={getTodayDate()}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      The job post will close automatically when the end date is reached, or when hired employees reach Employees Needed (if limited).
                    </p>
                  </div>
                  {editJobForm.endDate && (
                    <p className="text-xs text-gray-500 mt-1">Applications close on: {editJobForm.endDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Job Title Description <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-y"
                    rows={4}
                    value={editJobForm.description}
                    onChange={(e) => setEditJobField("description", e.target.value)}
                    onKeyDown={withEditBulletAutoContinue("description")}
                    placeholder="Example: This role supports daily operations by coordinating tasks, documenting updates, and ensuring deadlines are met."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Main Responsibilities <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-y"
                    rows={5}
                    value={editJobForm.mainResponsibilities}
                    onChange={(e) => setEditJobField("mainResponsibilities", e.target.value)}
                    onKeyDown={withEditBulletAutoContinue("mainResponsibilities")}
                    placeholder="Example: Deliver goods safely and on time; Maintain accurate delivery documents; Follow safety and company procedures."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Basic Key Requirements</label>
                  <textarea
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-y"
                    rows={4}
                    value={editJobForm.keyRequirements}
                    onChange={(e) => setEditJobField("keyRequirements", e.target.value)}
                    onKeyDown={withEditBulletAutoContinue("keyRequirements")}
                    placeholder="Example: Willing to work shifting schedules; Strong communication and teamwork; Relevant experience is an advantage."
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t">
              <button
                onClick={() => {
                  setShowEditJobModal(false);
                  setEditingJobPost(null);
                  setEditJobForm({
                    title: "",
                    depot: "",
                    department: "",
                    description: "",
                    mainResponsibilities: "",
                    keyRequirements: "",
                    urgent: true,
                    jobType: "office_employee",
                    endDate: "",
                    positions_needed: 1,
                    positionsNoLimit: false,
                  });
                  setErrorMessage("");
                  setShowErrorAlert(false);
                }}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateJobPost}
                disabled={
                  updatingJobPost ||
                  !editJobForm.title ||
                  !editJobForm.depot ||
                  !editJobForm.description ||
                  splitLines(editJobForm.mainResponsibilities).length === 0
                }
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60"
              >
                {updatingJobPost ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default HrRecruitment;
