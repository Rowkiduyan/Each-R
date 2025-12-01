// src/HrRecruitment.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "./supabaseClient";

/**
 * scheduleInterviewClient
 * Helper that invokes your Supabase Edge Function (name: "schedule-interview").
 * It returns { ok: true, data } or { ok: false, error }.
 */
async function scheduleInterviewClient(applicationId, interview) {
  try {
    const functionName = "schedule-interview-with-notification"; // Updated to use notification-enabled function
    const res = await supabase.functions.invoke(functionName, {
      body: JSON.stringify({ applicationId, interview }),
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
    console.error("scheduleInterviewClient error:", err);
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

  // Get current user info from localStorage
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    const stored = localStorage.getItem("loggedInHR");
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch (err) {
        console.error("Failed to parse loggedInHR:", err);
      }
    }
  }, []);

  // ---- UI state
  const [activeSubTab, setActiveSubTab] = useState("Applications"); // "Applications" | "JobPosts"
  const [searchTerm, setSearchTerm] = useState("");
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
  
  // Filters for unified applications table
  const [positionFilter, setPositionFilter] = useState("All");
  const [depotFilter, setDepotFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterMenuRef = useRef(null);
  
  // Selected applicant detail view state
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState("Application");
  const [interviewFile, setInterviewFile] = useState(null);
  const [interviewFileName, setInterviewFileName] = useState("");
  const [assessmentFile, setAssessmentFile] = useState(null);
  const [assessmentFileName, setAssessmentFileName] = useState("");
  const [agreementFile, setAgreementFile] = useState(null);
  const [agreementFileName, setAgreementFileName] = useState("");
  const [uploadingInterviewFile, setUploadingInterviewFile] = useState(false);
  const [uploadingAssessmentFile, setUploadingAssessmentFile] = useState(false);
  const [uploadingAgreementFile, setUploadingAgreementFile] = useState(false);
  
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
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setShowFilterMenu(false);
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
        const { data, error } = await supabase
          .from("applications")
          .select(`
            id,
            created_at,
            rejection_remarks,
            payload,
            job_posts:job_posts ( id, title, depot )
          `)
          .eq("status", "rejected")
          .order("created_at", { ascending: false });

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
  });
  const [scheduling, setScheduling] = useState(false);

  // ---- Data from Supabase
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
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
          job_posts:job_posts ( id, title, depot )
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

      const mapped = (data || []).map((row) => {
        // normalize payload (jsonb or string)
        let payloadObj = row.payload;
        if (typeof payloadObj === "string") {
          try { payloadObj = JSON.parse(payloadObj); } catch { payloadObj = {}; }
        }

        // applicant might live in payload.form, payload.applicant, or payload root
        const source = payloadObj.form || payloadObj.applicant || payloadObj || {};
        // name fallbacks
        const first = source.firstName || source.fname || source.first_name || "";
        const middle = source.middleName || source.mname || source.middle_name ? ` ${source.middleName || source.mname || source.middle_name}` : "";
        const last = source.lastName || source.lname || source.last_name ? ` ${source.lastName || source.lname || source.last_name}` : "";
        const fullName = `${first}${middle}${last}`.trim() || source.fullName || source.name || "Unnamed Applicant";

        const position = row.job_posts?.title ?? source.position ?? "—";
        const depot = row.job_posts?.depot ?? source.depot ?? "—";

        const rawStatus = row.status || payloadObj.status || source.status || null;
        const statusNormalized = rawStatus ? String(rawStatus).toLowerCase() : "submitted";

        return {
          id: row.id,
          user_id: row.user_id,
          job_id: row.job_id,
          status: statusNormalized,
          name: fullName,
          position,
          depot,
          dateApplied: new Date(row.created_at).toLocaleDateString("en-US", {
            month: "short", day: "2-digit", year: "numeric",
          }),
          email: source.email || source.contact || "",
          phone: source.contact || source.phone || "",
          raw: row,
          // surface interview fields if present (helpful in table later)
          interview_date: row.interview_date || row.payload?.interview?.date || null,
          interview_time: row.interview_time || row.payload?.interview?.time || null,
          interview_location: row.interview_location || row.payload?.interview?.location || null,
          interviewer: row.interviewer || row.payload?.interview?.interviewer || null,
          // New fields - check both column and payload as fallback
          interview_confirmed: row.interview_confirmed ?? payloadObj.interview_confirmed ?? false,
          interview_confirmed_at: row.interview_confirmed_at ?? payloadObj.interview_confirmed_at ?? null,
          interview_details_file: row.interview_details_file ?? payloadObj.interview_details_file ?? null,
          assessment_results_file: row.assessment_results_file ?? payloadObj.assessment_results_file ?? null,
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
  async function tryRpcMoveToEmployee(appId, position = null) {
    // attempt the candidates in sequence
    for (const c of rpcCandidates) {
      try {
        const params = {};
        params[c.param] = appId;
        // Add position if provided and function supports it
        if (position && (c.fn.includes("move_applicant_to_employee") || c.fn.includes("hire_applicant"))) {
          params.p_position = position;
        }
        console.debug("[rpc-try] calling", c.fn, params);
        const { data, error } = await supabase.rpc(c.fn, params);

        if (error) {
          // log and continue trying other candidates unless it's a non-existant function HTTP 404 style
          console.warn("[rpc-try] rpc returned error for", c, error);
          // sometimes PostgREST returns PGRST202 meaning function signature not found in schema cache
          // keep trying next candidate
          continue;
        }

        // data came back - return which candidate worked and the returned payload
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
    setConfirmCallback(async () => {
      setShowConfirmDialog(false);
      try {
        // First, get the application data to extract applicant information
        const { data: applicationData, error: appError } = await supabase
          .from("applications")
          .select("*")
          .eq("id", applicationId)
          .single();

        if (appError || !applicationData) {
          setErrorMessage("Failed to load application data.");
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
        const applicantEmail = source.email || source.contact || "";
        const birthday = source.birthday || source.birth_date || source.dateOfBirth || null;

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
        const rpcResult = await tryRpcMoveToEmployee(applicationId, position);

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
        try {
          // Set source based on whether applicant is from agency or direct
          const employeeSource = isAgencyApplicant ? "recruitment" : "internal";
          
          const { error: empUpsertErr } = await supabase
            .from("employees")
            .upsert(
              {
                email: employeeEmail,
                fname: firstName,
                lname: lastName,
                mname: middleName || null,
                position: position || null,
                role: "Employee",
                hired_at: new Date().toISOString(),
                source: employeeSource,
                // For agency applicants, preserve agency metadata
                ...(isAgencyApplicant && {
                  is_agency: true,
                  agency_profile_id: meta.endorsed_by_profile_id || null,
                  endorsed_by_agency_id: meta.endorsed_by_profile_id || null,
                  endorsed_at: meta.endorsed_at || new Date().toISOString(),
                }),
              },
              // De‑duplicate by email so we only keep one employee row per email
              { onConflict: "email" }
            );

          if (empUpsertErr) {
            console.error("Error upserting employees row:", empUpsertErr);
          }
        } catch (empErr) {
          console.error("Unexpected error upserting employees row:", empErr);
        }

        // Send email with credentials
        // Send email with credentials only for direct hires who got an account
        if (!isAgencyApplicant && employeePassword) {
          try {
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
            }
          } catch (emailErr) {
            console.error("Error sending email:", emailErr);
            // Don't fail the whole process if email fails
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
  const openInterviewModal = (application) => {
    setSelectedApplicationForInterview(application);
    setInterviewForm({
      date: application?.interview_date || "",
      time: application?.interview_time || "",
      location: application?.interview_location || "",
      interviewer: application?.interviewer || "",
    });
    setShowInterviewModal(true);
  };

  // ---- SCHEDULE interview (calls scheduleInterviewClient)
  const scheduleInterview = async () => {
    if (!selectedApplicationForInterview) return;
    if (!interviewForm.date || !interviewForm.time || !interviewForm.location) {
      setErrorMessage("Please fill date, time and location.");
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
      const r = await scheduleInterviewClient(selectedApplicationForInterview.id, interviewForm);
      if (!r.ok) {
        console.error("Edge function error:", r.error);
        setErrorMessage("Failed to schedule interview. Check console and function logs.");
        setShowErrorAlert(true);
        setScheduling(false);
        return;
      }
      
      // success -> reload applications so updated interview fields show
      await loadApplications();
      setShowInterviewModal(false);
      
      // Format interview summary
      const interviewSummary = `${selectedApplicationForInterview.name} - ${interviewForm.date} at ${interviewForm.time}, ${interviewForm.location}`;
      const isReschedule = r.data?.isReschedule;
      setSuccessMessage(`Interview ${isReschedule ? 'Rescheduled' : 'Scheduled'}: ${interviewSummary}. Applicant has been notified.`);
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

    setConfirmMessage(
      `Approve ${applicant.name}'s application and move to Assessment step?`
    );
    setConfirmCallback(async () => {
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

        // Refresh list so buckets & stats update
        await loadApplications();

        // Keep the selected applicant and reflect new status locally
        setSelectedApplicant((prev) =>
          prev && prev.id === applicant.id ? { ...prev, status: "screening" } : prev
        );

        // Move UI to Assessment step
        setActiveDetailTab("Assessment");

        setSuccessMessage(`${applicant.name} has been approved to proceed to assessment.`);
        setShowSuccessAlert(true);
      } catch (err) {
        console.error("proceedToAssessment unexpected error:", err);
        setErrorMessage("Unexpected error while moving to assessment. See console.");
        setShowErrorAlert(true);
      }
    });
    setShowConfirmDialog(true);
  };

  // ---- REJECT action: update DB row status -> 'rejected' and optionally save remarks
  const rejectApplication = async (applicationId, name, remarks = null) => {
    if (!applicationId) return;
    
    // If remarks not provided, they should come from the modal
    let reason = remarks;
    
    try {
      const updates = { status: "rejected" };
      if (reason && reason.trim()) updates.rejection_remarks = reason.trim();
      const { error } = await supabase.from("applications").update(updates).eq("id", applicationId);
      if (error) {
        console.error("reject update error:", error);
        setErrorMessage("Failed to reject application. See console.");
        setShowErrorAlert(true);
        return;
      }
      await loadApplications();
      setSuccessMessage(`Application rejected for ${name}.`);
      setShowSuccessAlert(true);
    } catch (err) {
      console.error("reject error:", err);
      setErrorMessage("Unexpected error rejecting application. See console.");
      setShowErrorAlert(true);
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

  // Helper: Get application status display info
  const getApplicationStatus = (applicant) => {
    const status = applicant.status?.toLowerCase() || 'submitted';
    
    // Check interview status
    const hasInterview = applicant.interview_date;
    const interviewConfirmed = applicant.interview_confirmed === 'Confirmed';
    
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
    if (hasInterview && interviewConfirmed) {
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
    let filtered = applicants.filter(a => a.status !== 'hired' && a.status !== 'rejected');
    
    // If user is HRC, only show applications for their depot
    if (currentUser?.role?.toUpperCase() === 'HRC' && currentUser?.depot) {
      filtered = filtered.filter(a => a.depot === currentUser.depot);
    }
    
    return filtered;
  }, [applicants, currentUser]);

  // Distinct positions/depots for filters
  const positions = useMemo(() => {
    const s = new Set(allApplicants.map((a) => a.position).filter(Boolean));
    return ["All", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [allApplicants]);

  const depots = useMemo(() => {
    const s = new Set(allApplicants.map((a) => a.depot).filter(Boolean));
    return ["All", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [allApplicants]);
  
  const statusOptions = ["All", "SUBMITTED", "IN REVIEW", "INTERVIEW SET", "INTERVIEW CONFIRMED", "REQUIREMENTS", "AGREEMENT", "HIRED", "REJECTED"];

  // Simple aggregation to show recent "job posts" based on applications
  const jobPostStats = useMemo(() => {
    const map = new Map();
    filteredApplicantsByDepot.forEach((a) => {
      const key = `${a.position || "Untitled role"}-${a.depot || "—"}`;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          title: a.position || "Untitled role",
          depot: a.depot || "—",
          status: "Draft",
          applied: 0,
          hired: 0,
          waitlisted: 0,
        });
      }
      const item = map.get(key);
      item.applied += 1;
    });
    return Array.from(map.values());
  }, [filteredApplicantsByDepot]);

  // Filtered + sorted applicants based on search and filters
  const filteredAllApplicants = useMemo(() => {
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

    if (depotFilter !== "All") {
      list = list.filter((a) => a.depot === depotFilter);
    }

    if (statusFilter !== "All") {
      list = list.filter((a) => getApplicationStatus(a).label === statusFilter);
    }

    // Sort by name
    list = [...list].sort((a, b) =>
      sortOrder === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    );

    return list;
  }, [allApplicants, searchTerm, positionFilter, depotFilter, statusFilter, sortOrder]);

  // Pagination for unified table
  const allApplicantsTotalPages = Math.ceil(filteredAllApplicants.length / itemsPerPage) || 1;
  const paginatedAllApplicants = filteredAllApplicants.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <>
      {/* Main Content */}
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
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
            </>
          )}

          {/* Main card below tabs: Applications vs Job Posts */}
          {activeSubTab === "Applications" && (
          <div className="bg-white rounded-b-xl shadow-sm border border-gray-100 flex flex-col">
            {/* Search and Filters Bar (always visible) */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search */}
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

                  {/* Position Filter */}
                  <select
                    value={positionFilter}
                    onChange={(e) => {
                      setPositionFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white min-w-[160px]"
                  >
                    <option value="All">All Positions</option>
                    {positions.filter(p => p !== "All").map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>

                  {/* Depot Filter */}
                  <select
                    value={depotFilter}
                    onChange={(e) => {
                      setDepotFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white min-w-[140px]"
                  >
                    <option value="All">All Depots</option>
                    {depots.filter(d => d !== "All").map((d) => (
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
                      <div className="absolute right-0 mt-2 w-64 bg-white border rounded-lg shadow-lg z-10 p-4">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Sort by Name</label>
                            <button
                              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                              className="w-full px-3 py-2 bg-gray-100 rounded-lg text-left hover:bg-gray-200 text-sm"
                            >
                              {sortOrder === "asc" ? "A → Z" : "Z → A"}
                            </button>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                            <select
                              value={statusFilter}
                              onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setCurrentPage(1);
                              }}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            >
                              {statusOptions.map((s) => (
                                <option key={s} value={s}>{s}</option>
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
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Position / Depot</th>
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
                      const isCompleted =
                        (step.key === "Application" && ["Assessment", "Agreements"].includes(activeDetailTab)) ||
                        (step.key === "Assessment" && activeDetailTab === "Agreements");

                      return (
                        <button
                          key={step.key}
                          type="button"
                          onClick={() => setActiveDetailTab(step.key)}
                          className="flex-1 flex items-center text-left focus:outline-none"
                        >
                          <div className="flex items-center gap-3 w-full">
                            <div
                              className={[
                                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors",
                                isActive
                                  ? "bg-red-600 text-white border-red-600 shadow"
                                  : isCompleted
                                  ? "bg-green-50 text-green-700 border-green-500"
                                  : "bg-gray-50 text-gray-500 border-gray-300",
                              ].join(" ")}
                            >
                              {index + 1}
                            </div>
                            <div className="flex flex-col">
                              <span
                                className={[
                                  "text-xs font-semibold",
                                  isActive
                                    ? "text-red-600"
                                    : isCompleted
                                    ? "text-green-700"
                                    : "text-gray-600",
                                ].join(" ")}
                              >
                                {step.label}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {step.description}
                              </span>
                            </div>
                            {index < arr.length - 1 && (
                              <div className="flex-1 h-px mx-2 rounded-full bg-gradient-to-r from-gray-200 via-gray-200 to-gray-200" />
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
                          <span className="ml-2 text-gray-800">{selectedApplicant.position || "—"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Depot:</span>
                          <span className="ml-2 text-gray-800">{selectedApplicant.depot || "—"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Date Applied:</span>
                          <span className="ml-2 text-gray-800">{selectedApplicant.dateApplied}</span>
                        </div>
                      </div>
                    </div>

                    {/* Personal Information */}
                    <div>
                      <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">
                        Personal Information
                      </h5>
                      <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <div>
                          <span className="text-gray-500">Full Name:</span>
                          <span className="ml-2 text-gray-800">{selectedApplicant.name}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Email:</span>
                          <span className="ml-2 text-gray-800">{selectedApplicant.email || "—"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Contact Number:</span>
                          <span className="ml-2 text-gray-800">{selectedApplicant.phone || "—"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action: Approve to proceed to Assessment */}
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => proceedToAssessment(selectedApplicant)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                      >
                        <span>Approve &amp; Proceed to Assessment</span>
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
                            setSelectedApplicationForInterview(selectedApplicant);
                            openInterviewModal(selectedApplicant);
                          }}
                        >
                          Set Interview Schedule
                        </button>
                      )}
                    </div>

                    {/* Interview Schedule */}
                    {selectedApplicant.interview_date && (
                      <div className="bg-gray-50 border rounded-md p-4 mb-4 relative">
                        <div className="flex items-start justify-between mb-2">
                          <div className="text-sm text-gray-800 font-semibold">Interview Schedule</div>
                          {(() => {
                            // Check interview status using the new text-based system
                            const interviewStatus = selectedApplicant.interview_confirmed || selectedApplicant.payload?.interview_confirmed || 'Idle';
                            
                            if (interviewStatus === 'Confirmed') {
                              return (
                                <span className="text-sm px-3 py-1 rounded bg-green-100 text-green-800 border border-green-300 font-medium">
                                  Interview Confirmed
                                </span>
                              );
                            } else if (interviewStatus === 'Rejected') {
                              return (
                                <span className="text-sm px-3 py-1 rounded bg-red-100 text-red-800 border border-red-300 font-medium">
                                  Interview Rejected
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
                        <div className="text-sm text-gray-700 space-y-1">
                          <div><span className="font-medium">Date:</span> {selectedApplicant.interview_date}</div>
                          <div><span className="font-medium">Time:</span> {selectedApplicant.interview_time || "—"}</div>
                          <div><span className="font-medium">Location:</span> {selectedApplicant.interview_location || "—"}</div>
                          <div><span className="font-medium">Interviewer:</span> {selectedApplicant.interviewer || "—"}</div>
                        </div>
                        <div className="mt-3 flex items-center justify-end">
                          <button
                            type="button"
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                            onClick={() => {
                              setSelectedApplicationForInterview(selectedApplicant);
                              openInterviewModal(selectedApplicant);
                            }}
                          >
                            Schedule Another Interview
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Upload Interview Details Section */}
                    <div className="mt-4 border rounded-md p-4">
                      <div className="text-sm font-semibold text-gray-800 mb-3">Upload Interview Details</div>
                      {selectedApplicant.interview_details_file && (
                        <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
                          <span className="text-gray-700">Current file: </span>
                          <a 
                            href={supabase.storage.from('application-files').getPublicUrl(selectedApplicant.interview_details_file)?.data?.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {selectedApplicant.interview_details_file.split('/').pop()}
                          </a>
                        </div>
                      )}
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-8">
                          <input
                            type="text"
                            placeholder="File name"
                            value={interviewFileName}
                            onChange={(e) => setInterviewFileName(e.target.value)}
                            className={`w-full px-3 py-2 border border-gray-300 rounded text-sm ${
                              interviewFile || selectedApplicant.interview_details_file 
                                ? "text-blue-600 underline" 
                                : ""
                            }`}
                            readOnly={!!(interviewFile || selectedApplicant.interview_details_file)}
                          />
                        </div>
                        <div className="col-span-4 flex items-center gap-2">
                          {!interviewFile && !selectedApplicant.interview_details_file && (
                            <label className="inline-block px-3 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 border text-sm">
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
                          )}
                          {uploadingInterviewFile ? (
                            <span className="text-gray-600 text-sm">Uploading...</span>
                          ) : interviewFile || (selectedApplicant.interview_details_file && interviewFileName) ? (
                            <div className="flex items-center gap-2">
                              {interviewFile ? (
                                <button
                                  type="button"
                                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                                  onClick={async () => {
                                  if (!interviewFile || !selectedApplicant?.id) return;
                                
                                setUploadingInterviewFile(true);
                                try {
                                  const fileExt = interviewFile.name.split('.').pop();
                                  const fileName = interviewFileName || `interview-details-${selectedApplicant.id}-${Date.now()}.${fileExt}`;
                                  const filePath = `interview-details/${selectedApplicant.id}/${fileName}`;

                                  const { data: uploadData, error: uploadError } = await supabase.storage
                                    .from('application-files')
                                    .upload(filePath, interviewFile, {
                                      upsert: true,
                                    });

                                  if (uploadError) {
                                    throw uploadError;
                                  }

                                  // Update application record with file path
                                  // Try to update the column first, fallback to payload if column doesn't exist
                                  const { error: updateError } = await supabase
                                    .from('applications')
                                    .update({ interview_details_file: uploadData.path })
                                    .eq('id', selectedApplicant.id);

                                  if (updateError && updateError.code === 'PGRST204') {
                                    // Column doesn't exist, store in payload instead
                                    console.warn('interview_details_file column not found, storing in payload');
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
                                      interview_details_file: uploadData.path
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

                                  // Reload applications to show updated file
                                  await loadApplications();
                                  // Keep the file name in the field to show it was saved
                                  setInterviewFileName(fileName);
                                  // Clear the file object but keep the name
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
                                  Save
                                </button>
                              ) : (
                                <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm border border-green-300">
                                  Saved ✓
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No file selected</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Upload In-Person Assessment Results Section */}
                    <div className="mt-4 border rounded-md p-4">
                      <div className="text-sm font-semibold text-gray-800 mb-3">Upload In-Person Assessment Results</div>
                      {selectedApplicant.assessment_results_file && (
                        <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
                          <span className="text-gray-700">Current file: </span>
                          <a 
                            href={supabase.storage.from('application-files').getPublicUrl(selectedApplicant.assessment_results_file)?.data?.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {selectedApplicant.assessment_results_file.split('/').pop()}
                          </a>
                        </div>
                      )}
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-8">
                          <input
                            type="text"
                            placeholder="File name"
                            value={assessmentFileName}
                            onChange={(e) => setAssessmentFileName(e.target.value)}
                            className={`w-full px-3 py-2 border border-gray-300 rounded text-sm ${
                              assessmentFile || selectedApplicant.assessment_results_file 
                                ? "text-blue-600 underline" 
                                : ""
                            }`}
                            readOnly={!!(assessmentFile || selectedApplicant.assessment_results_file)}
                          />
                        </div>
                        <div className="col-span-4 flex items-center gap-2">
                          {!assessmentFile && !selectedApplicant.assessment_results_file && (
                            <label className="inline-block px-3 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 border text-sm">
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
                          )}
                          {uploadingAssessmentFile ? (
                            <span className="text-gray-600 text-sm">Uploading...</span>
                          ) : assessmentFile || (selectedApplicant.assessment_results_file && assessmentFileName) ? (
                            <div className="flex items-center gap-2">
                              {assessmentFile ? (
                                <button
                                  type="button"
                                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                                  onClick={async () => {
                                  if (!assessmentFile || !selectedApplicant?.id) return;
                                
                                setUploadingAssessmentFile(true);
                                try {
                                  const fileExt = assessmentFile.name.split('.').pop();
                                  const fileName = assessmentFileName || `assessment-results-${selectedApplicant.id}-${Date.now()}.${fileExt}`;
                                  const filePath = `assessment-results/${selectedApplicant.id}/${fileName}`;

                                  const { data: uploadData, error: uploadError } = await supabase.storage
                                    .from('application-files')
                                    .upload(filePath, assessmentFile, {
                                      upsert: true,
                                    });

                                  if (uploadError) {
                                    throw uploadError;
                                  }

                                  // Update application record with file path
                                  // Try to update the column first, fallback to payload if column doesn't exist
                                  const { error: updateError } = await supabase
                                    .from('applications')
                                    .update({ assessment_results_file: uploadData.path })
                                    .eq('id', selectedApplicant.id);

                                  if (updateError && updateError.code === 'PGRST204') {
                                    // Column doesn't exist, store in payload instead
                                    console.warn('assessment_results_file column not found, storing in payload');
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
                                      assessment_results_file: uploadData.path
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

                                  // Reload applications to show updated file
                                  await loadApplications();
                                  // Keep the file name in the field to show it was saved
                                  setAssessmentFileName(fileName);
                                  // Clear the file object but keep the name visible
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
                                  Save
                                </button>
                              ) : (
                                <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm border border-green-300">
                                  Saved ✓
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No file selected</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* Agreements Tab - simplified to agreement-related upload table only */}
                {activeDetailTab === "Agreements" && (
                  <section className="px-4 pb-4">
                    <div className="bg-gray-100 text-gray-800 px-3 py-2 text-sm font-semibold border rounded-t-md">Agreement Documents</div>
                    <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-gray-600 border-b">
                      <div className="col-span-6">&nbsp;</div>
                      <div className="col-span-6">File</div>
                    </div>

                    <div className="border-b">
                      <div className="grid grid-cols-12 items-center gap-3 px-3 py-3">
                        <div className="col-span-12 md:col-span-6 text-sm text-gray-800">Employee Appointment Letter</div>
                        <div className="col-span-12 md:col-span-6 text-sm">
                          <div className="flex items-center gap-2">
                            {agreementFile || selectedApplicant.appointment_letter_file ? (
                              <div className="flex items-center gap-2 w-full">
                                <div className="flex items-center gap-2 flex-1">
                                  <input
                                    type="text"
                                    placeholder="File name"
                                    value={agreementFileName || (selectedApplicant.appointment_letter_file ? selectedApplicant.appointment_letter_file.split('/').pop() : "")}
                                    onChange={(e) => setAgreementFileName(e.target.value)}
                                    className={`flex-1 px-3 py-2 border border-gray-300 rounded text-sm ${
                                      agreementFile || selectedApplicant.appointment_letter_file 
                                        ? "text-blue-600 underline" 
                                        : ""
                                    }`}
                                    readOnly={!!(agreementFile || selectedApplicant.appointment_letter_file)}
                                  />
                                  {(agreementFile || selectedApplicant.appointment_letter_file) && (
                                    <button
                                      type="button"
                                      className="w-6 h-6 rounded-full bg-red-500 text-white hover:bg-red-600 flex items-center justify-center flex-shrink-0 transition-colors"
                                      onClick={async () => {
                                        if (agreementFile) {
                                          // Just remove from selection if not saved yet
                                          setAgreementFile(null);
                                          setAgreementFileName("");
                                        } else if (selectedApplicant.appointment_letter_file) {
                                          // Remove from database if already saved
                                          if (!selectedApplicant?.id) return;
                                          
                                          try {
                                            // Remove file path from database
                                            const { error: updateError } = await supabase
                                              .from('applications')
                                              .update({ appointment_letter_file: null })
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
                                                appointment_letter_file: null
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
                                            setAgreementFileName("");
                                            setSelectedApplicant(prev => ({
                                              ...prev,
                                              appointment_letter_file: null
                                            }));
                                            setSuccessMessage("Appointment letter removed successfully");
                                            setShowSuccessAlert(true);
                                          } catch (err) {
                                            console.error('Error removing appointment letter:', err);
                                            setErrorMessage("Failed to remove file. Please try again.");
                                            setShowErrorAlert(true);
                                          }
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
                                {uploadingAgreementFile ? (
                                  <span className="text-gray-600 text-sm whitespace-nowrap">Uploading...</span>
                                ) : agreementFile ? (
                                  <button
                                    type="button"
                                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 whitespace-nowrap"
                                    onClick={async () => {
                                      if (!agreementFile || !selectedApplicant?.id) return;
                                      
                                      setUploadingAgreementFile(true);
                                      try {
                                        const fileExt = agreementFile.name.split('.').pop();
                                        const fileName = agreementFileName || `appointment-letter-${selectedApplicant.id}-${Date.now()}.${fileExt}`;
                                        const filePath = `appointment-letters/${selectedApplicant.id}/${fileName}`;

                                        const { data: uploadData, error: uploadError } = await supabase.storage
                                          .from('application-files')
                                          .upload(filePath, agreementFile, {
                                            upsert: true,
                                          });

                                        if (uploadError) {
                                          throw uploadError;
                                        }

                                        // Update application record with file path
                                        const { error: updateError } = await supabase
                                          .from('applications')
                                          .update({ appointment_letter_file: uploadData.path })
                                          .eq('id', selectedApplicant.id);

                                        if (updateError && updateError.code === 'PGRST204') {
                                          // Column doesn't exist, store in payload instead
                                          console.warn('appointment_letter_file column not found, storing in payload');
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
                                            appointment_letter_file: uploadData.path
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
                                        setAgreementFileName(fileName);
                                        // Clear the file object but keep the name visible
                                        setAgreementFile(null);
                                        
                                        // Update selectedApplicant state with the new file path
                                        setSelectedApplicant(prev => ({
                                          ...prev,
                                          appointment_letter_file: uploadData.path
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
                                            appointment_letter_file: updatedApp.appointment_letter_file || payloadObj?.appointment_letter_file || uploadData.path,
                                            raw: updatedApp
                                          }));
                                        }
                                        
                                        setSuccessMessage("Appointment letter uploaded successfully");
                                        setShowSuccessAlert(true);
                                      } catch (err) {
                                        console.error('Error uploading appointment letter:', err);
                                        setErrorMessage("Failed to upload file. Please try again.");
                                        setShowErrorAlert(true);
                                      } finally {
                                        setUploadingAgreementFile(false);
                                      }
                                    }}
                                  >
                                    Save
                                  </button>
                                ) : null}
                              </div>
                            ) : (
                              <label className="inline-block px-3 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 border text-sm">
                                Upload
                                <input
                                  type="file"
                                  accept=".pdf,.docx"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setAgreementFile(file);
                                      if (!agreementFileName) {
                                        setAgreementFileName(file.name);
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

                    <div className="flex justify-end mt-6">
                      <button
                        className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        onClick={async () => {
                          await handleMarkAsEmployee(selectedApplicant.id, selectedApplicant.name);
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
            // Job posts view (stays in this module, mimicking external job ads UI)
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              {/* Header row */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">My recent job posts</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Draft and active postings with a quick overview of candidates.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/hr/create/job")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500 text-white text-sm font-semibold shadow hover:bg-pink-600 transition-colors"
                >
                  Create a job ad
                  <span className="text-lg leading-none">＋</span>
                </button>
              </div>

              {/* Job posts table */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex items-center justify-between text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <div className="flex gap-8 items-center">
                    <span className="w-20">Status</span>
                    <span className="w-48">Job</span>
                    <span className="w-32">Depot</span>
                    <span className="w-24 text-center">Applied</span>
                    <span className="w-24 text-center">Hired</span>
                    <span className="w-28 text-center">Waitlisted</span>
                  </div>
                  <span className="w-32 text-right pr-2">Job actions</span>
                </div>

                {jobPostStats.length === 0 ? (
                  <div className="px-5 py-8 text-sm text-gray-500">
                    No job ads yet. Use <span className="font-medium text-gray-700">Create a job ad</span> to start a posting.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {jobPostStats.map((job) => (
                      <div
                        key={job.id}
                        className="px-5 py-3 flex items-center justify-between text-sm hover:bg-gray-50/80 transition-colors"
                      >
                        <div className="flex items-center gap-8">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 text-[11px] rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 w-20">
                            {job.status}
                          </span>
                          <div className="w-48">
                            <p className="font-medium text-gray-800 truncate">{job.title}</p>
                          </div>
                          <div className="w-32 text-gray-700">{job.depot}</div>
                          <div className="w-24 text-center text-gray-800">{job.applied}</div>
                          <div className="w-24 text-center text-gray-800">{job.hired}</div>
                          <div className="w-28 text-center text-gray-800">{job.waitlisted}</div>
                        </div>
                        <div className="w-32 flex justify-end">
                          <button
                            type="button"
                            onClick={() => navigate("/applicantg/home")}
                            className="px-3 py-1.5 rounded-full border border-gray-300 text-xs text-gray-700 hover:bg-gray-50"
                          >
                            Continue draft
                          </button>
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
                  View all job ads
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
                        setConfirmCallback(async () => {
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowInterviewModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-3">Schedule Interview — {selectedApplicationForInterview?.name}</h3>

            <div className="space-y-2">
              <div>
                <label className="text-sm">Date</label>
                <input
                  type="date"
                  value={interviewForm.date}
                  onChange={(e) => setInterviewForm((f) => ({ ...f, date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="text-sm">Time</label>
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
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="text-sm">Location</label>
                <input
                  type="text"
                  value={interviewForm.location}
                  onChange={(e) => setInterviewForm((f) => ({ ...f, location: e.target.value }))}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="text-sm">Interviewer</label>
                <input
                  type="text"
                  value={interviewForm.interviewer}
                  onChange={(e) => setInterviewForm((f) => ({ ...f, interviewer: e.target.value }))}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowInterviewModal(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
              <button onClick={scheduleInterview} disabled={scheduling} className="px-4 py-2 bg-red-600 text-white rounded">
                {scheduling ? "Scheduling..." : "Schedule & Email"}
              </button>
            </div>
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

      {/* Confirm Dialog Modal */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => {
          setShowConfirmDialog(false);
          setConfirmCallback(null);
        }}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{confirmMessage}</h3>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                onClick={() => {
                  setShowConfirmDialog(false);
                  setConfirmCallback(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                onClick={() => {
                  if (confirmCallback) {
                    confirmCallback();
                  }
                  setShowConfirmDialog(false);
                  setConfirmCallback(null);
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default HrRecruitment;
