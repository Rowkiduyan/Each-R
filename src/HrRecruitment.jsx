// src/HrRecruitment.jsx
import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
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

  // Depot options for job posts
  const depotOptions = [
    "Batangas", "Bulacan", "Cagayan", "Calamba", "Calbayog", "Cebu", 
    "Davao", "Dipolog", "Iloilo", "Isabela", "Kalibo", "Kidapawan", 
    "La Union", "Liip", "Manggahan", "Mindoro", "Naga", "Ozamis", 
    "Palawan", "Pampanga", "Pasig", "Sucat", "Tacloban", "Tarlac", 
    "Taytay", "Tuguegarao", "Vigan"
  ];

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
  const [isProcessingConfirm, setIsProcessingConfirm] = useState(false);
  
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
  
  // Edit job post modal state
  const [showEditJobModal, setShowEditJobModal] = useState(false);
  const [editingJobPost, setEditingJobPost] = useState(null);
  const [editJobForm, setEditJobForm] = useState({
    title: "",
    depot: "",
    description: "",
    responsibilities: [""],
    others: [""],
    urgent: false,
    jobType: "delivery_crew",
    durationHours: "",
    durationMinutes: "",
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
  const [activeTab, setActiveTab] = useState('today'); // 'today', 'tomorrow', 'week'
  
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
    interview_type: "onsite", // "online" or "onsite"
  });
  const [scheduling, setScheduling] = useState(false);

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
          updatedApplicant.interview_location !== selectedApplicant.interview_location;
        
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
    const interviewConfirmed = selectedApplicant?.interview_confirmed === 'Confirmed' || 
                              selectedApplicant?.interview_confirmed === 'confirmed';
    
    // Check which steps are unlocked
    const step2Unlocked = ["screening", "interview", "scheduled", "onsite", "requirements", "docs_needed", "awaiting_documents", "agreement", "agreements", "final_agreement", "hired"].includes(applicantStatus);
    const step3Unlocked = hasInterview && interviewConfirmed;
    
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
          interview_type: row.interview_type || payloadObj.interview_type || payloadObj.interview?.type || 'onsite',
          // New fields - check both column and payload as fallback
          interview_confirmed: row.interview_confirmed ?? payloadObj.interview_confirmed ?? false,
          interview_confirmed_at: row.interview_confirmed_at ?? payloadObj.interview_confirmed_at ?? null,
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
        .select("id, title, depot, description, created_at, urgent, is_active, job_type, duration")
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

          // Determine status based on is_active
          // Draft = is_active is false, Active = is_active is true
          let status = jobPost.is_active ? "Active" : "Draft";

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
            is_active: jobPost.is_active,
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
  }, []);

  const fetchInterviews = async () => {
    try {
      // First get applications with interview dates, join with job_posts to get title
      const { data: applicationsData, error: appsError } = await supabase
        .from('applications')
        .select('id, user_id, payload, interview_date, interview_time, interview_location, status, job_posts:job_posts ( title )')
        .not('interview_date', 'is', null)
        .order('interview_date', { ascending: true });
      
      if (appsError) {
        console.error('Error fetching applications:', appsError);
        setInterviews([]);
        return;
      }

      if (!applicationsData || applicationsData.length === 0) {
        setInterviews([]);
        return;
      }

      // Get all unique applicant IDs
      const applicantIds = [...new Set(applicationsData.map(app => app.user_id).filter(Boolean))];

      if (applicantIds.length === 0) {
        setInterviews([]);
        return;
      }

      // Fetch applicant names
      const { data: applicantsData, error: applicantsError } = await supabase
        .from('applicants')
        .select('id, fname, lname')
        .in('id', applicantIds);

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

      // Transform the data
      const transformedData = applicationsData.map(app => {
        let payloadObj = app.payload;
        if (typeof payloadObj === 'string') {
          try { payloadObj = JSON.parse(payloadObj); } catch { payloadObj = {}; }
        }
        const source = payloadObj.form || payloadObj.applicant || payloadObj || {};
        
        // Get position/title - prioritize job_posts.title, then payload fields
        const position = app.job_posts?.title ?? source.position ?? source.title ?? 'Position Not Set';
        const interviewType = payloadObj.interview_type || source.interview_type || 'onsite';
        
        return {
          id: app.id,
          applicant_name: applicantMap[app.user_id] || 'Unknown',
          position: position,
          time: app.interview_time || 'Not set',
          date: app.interview_date,
          status: app.status || 'scheduled',
          interview_type: interviewType
        };
      });
      
      setInterviews(transformedData);
    } catch (error) {
      console.error('Error fetching interviews:', error);
      setInterviews([]);
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
    const todayInterviews = interviews.filter(interview => interview.date === today);
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
    const tomorrowInterviews = interviews.filter(interview => interview.date === tomorrowDate);
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
    
    return weekInterviews.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (!a.time || a.time === 'Not set') return 1;
      if (!b.time || b.time === 'Not set') return -1;
      return a.time.localeCompare(b.time);
    });
  };

  const getActiveInterviews = () => {
    switch (activeTab) {
      case 'today': return getTodayInterviews();
      case 'tomorrow': return getTomorrowInterviews();
      case 'week': return getThisWeekInterviews();
      default: return getTodayInterviews();
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'today': return "Today's Interviews";
      case 'tomorrow': return "Tomorrow's Interviews";
      case 'week': return "This Week's Interviews";
      default: return "Today's Interviews";
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
      case 'tomorrow':
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        return tomorrow.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        });
      case 'week':
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        return `${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${nextWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      default:
        return today.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        });
    }
  };

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
      // Guard against duplicate execution
      let emailSent = false;
      
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
        let employeeCreated = false;
        try {
          // Set source based on whether applicant is from agency or direct
          const employeeSource = isAgencyApplicant ? "recruitment" : "internal";
          
          // Extract additional fields from application payload
          const contactNumber = source.contact || source.contact_number || source.phone || null;
          const depot = applicationData.job_posts?.depot || source.depot || source.preferred_depot || null;
          
          // Build employee data with only fields that exist in the employees table
          // Based on Employees.jsx, the table has: id, email, fname, lname, mname, contact_number, 
          // position, depot, role, hired_at, source, endorsed_by_agency_id, endorsed_at, agency_profile_id, status, personal_email
          const employeeData = {
            email: employeeEmail,
            fname: firstName,
            lname: lastName,
            mname: middleName || null,
            contact_number: contactNumber,
            depot: depot,
            position: position || null,
            role: "Employee",
            hired_at: new Date().toISOString(),
            source: employeeSource,
            status: "Probationary", // Set new employees as Probationary
            personal_email: applicantEmail || null, // Carry over applicant's email to personal_email
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
              // De‑duplicate by email so we only keep one employee row per email
              { onConflict: "email" }
            )
            .select();

          upsertData = data;
          empUpsertErr = error;

          // If error is about missing columns, try without optional fields
          if (empUpsertErr && empUpsertErr.code === "PGRST204") {
            console.warn("First upsert attempt failed due to missing columns, retrying with minimal fields:", empUpsertErr.message);
            
            // Retry with only essential fields
            const minimalEmployeeData = {
              email: employeeEmail,
              fname: firstName,
              lname: lastName,
              mname: middleName || null,
              contact_number: contactNumber,
              depot: depot,
              position: position || null,
              role: "Employee",
              hired_at: new Date().toISOString(),
              source: employeeSource,
              status: "Probationary", // Set new employees as Probationary
              personal_email: applicantEmail || null, // Carry over applicant's email to personal_email
            };

            const { data: retryData, error: retryError } = await supabase
              .from("employees")
              .upsert(
                minimalEmployeeData,
                { onConflict: "email" }
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
  const openInterviewModal = (application) => {
    setSelectedApplicationForInterview(application);
    // Extract interview_type from payload or use default
    let interviewType = "onsite";
    if (application?.raw?.payload) {
      const payload = typeof application.raw.payload === 'string' 
        ? JSON.parse(application.raw.payload) 
        : application.raw.payload;
      interviewType = payload.interview_type || payload.interview?.type || "onsite";
    }
    setInterviewForm({
      date: application?.interview_date || "",
      time: application?.interview_time || "",
      location: application?.interview_location || "",
      interviewer: application?.interviewer || "",
      interview_type: interviewType,
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
      const r = await scheduleInterviewClient(selectedApplicationForInterview.id, interviewForm);
      if (!r.ok) {
        console.error("Edge function error:", r.error);
        setErrorMessage("Failed to schedule interview. Check console and function logs.");
        setShowErrorAlert(true);
        setScheduling(false);
        return;
      }
      
      // Also update the application record directly to ensure interview_type is stored
      try {
        const currentPayload = selectedApplicationForInterview.raw?.payload || {};
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
          interview_type: interviewForm.interview_type,
          interview: {
            ...(payloadObj.interview || {}),
            type: interviewForm.interview_type,
            date: interviewForm.date,
            time: interviewForm.time,
            location: interviewForm.location,
            interviewer: interviewForm.interviewer,
          }
        };

        // Try to update interview_type column if it exists, otherwise store in payload
        const updateData = {
          interview_date: interviewForm.date,
          interview_time: interviewForm.time,
          interview_location: interviewForm.location,
          interviewer: interviewForm.interviewer || null,
          payload: updatedPayload
        };

        // Try to add interview_type column if it exists
        const { error: updateError } = await supabase
          .from('applications')
          .update(updateData)
          .eq('id', selectedApplicationForInterview.id);

        if (updateError && updateError.code !== 'PGRST204') {
          console.warn('Error updating interview_type:', updateError);
        }
      } catch (err) {
        console.warn('Error updating interview_type in database:', err);
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

    // Ensure any previous alerts are closed before showing confirm dialog
    setShowSuccessAlert(false);
    setShowErrorAlert(false);

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

      // Parse duration if exists (format: "Xh Ym")
      let durationHours = "";
      let durationMinutes = "";
      if (data.duration) {
        const match = data.duration.match(/(\d+)h\s*(\d+)m/);
        if (match) {
          durationHours = match[1] || "";
          durationMinutes = match[2] || "";
        }
      }

      // Split responsibilities and others if they're combined
      const responsibilities = Array.isArray(data.responsibilities) 
        ? data.responsibilities.filter(Boolean)
        : (data.responsibilities ? [data.responsibilities] : [""]);
      
      // For now, we'll use responsibilities only. If there's a separate "others" field, we can split them.
      const others = [""];

      // Set editing job and form data
      setEditingJobPost(data);
      setEditJobForm({
        title: data.title || "",
        depot: data.depot || "",
        description: data.description || "",
        responsibilities: responsibilities.length > 0 ? responsibilities : [""],
        others: others,
        urgent: data.urgent || false,
        jobType: data.job_type || "delivery_crew",
        durationHours: durationHours,
        durationMinutes: durationMinutes,
      });
      setShowEditJobModal(true);
    } catch (err) {
      console.error("Error loading job post for editing:", err);
      setErrorMessage("Unexpected error loading job post.");
      setShowErrorAlert(true);
    }
  };

  // Edit form handlers
  const setEditJobField = (k, v) => setEditJobForm(prev => ({ ...prev, [k]: v }));

  const addEditResp = () => setEditJobForm(prev => ({ ...prev, responsibilities: [...prev.responsibilities, ""] }));
  const setEditResp = (i, v) => setEditJobForm(prev => ({ 
    ...prev, 
    responsibilities: prev.responsibilities.map((r, idx) => (idx === i ? v : r)) 
  }));
  const removeEditResp = (i) => setEditJobForm(prev => ({ 
    ...prev, 
    responsibilities: prev.responsibilities.filter((_, idx) => idx !== i) 
  }));

  const addEditOther = () => setEditJobForm(prev => ({ ...prev, others: [...prev.others, ""] }));
  const setEditOther = (i, v) => setEditJobForm(prev => ({ 
    ...prev, 
    others: prev.others.map((r, idx) => (idx === i ? v : r)) 
  }));
  const removeEditOther = (i) => setEditJobForm(prev => ({ 
    ...prev, 
    others: prev.others.filter((_, idx) => idx !== i) 
  }));

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

    setUpdatingJobPost(true);
    try {
      const combinedResponsibilities = [
        ...editJobForm.responsibilities,
        ...editJobForm.others,
      ].filter(Boolean);

      // Format duration if provided
      let duration = null;
      if (editJobForm.durationHours || editJobForm.durationMinutes) {
        const hours = editJobForm.durationHours ? parseInt(editJobForm.durationHours) : 0;
        const minutes = editJobForm.durationMinutes ? parseInt(editJobForm.durationMinutes) : 0;
        duration = `${hours}h ${minutes}m`;
      }

      const payload = {
        title: String(editJobForm.title).trim(),
        depot: String(editJobForm.depot).trim(),
        description: editJobForm.description || null,
        responsibilities: combinedResponsibilities,
        urgent: Boolean(editJobForm.urgent),
        job_type: String(editJobForm.jobType).trim(),
        duration: duration,
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
        description: "",
        responsibilities: [""],
        others: [""],
        urgent: false,
        jobType: "delivery_crew",
        durationHours: "",
        durationMinutes: "",
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

  // Use actual job posts from database - loaded via loadJobPosts()
  // This replaces the previous aggregation-based approach
  const jobPostStats = jobPosts;

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
  // const allApplicantsTotalPages = Math.ceil(filteredAllApplicants.length / itemsPerPage) || 1; // Unused for now
  const paginatedAllApplicants = filteredAllApplicants.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
                      <h2 className="text-base font-bold text-gray-800 mb-3">Interview Schedule</h2>
                      
                      {/* Stats Overview */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg p-2 text-white">
                          <p className="text-xs opacity-90">Total</p>
                          <p className="text-lg font-bold">{getActiveInterviews().length}</p>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg p-2 text-white">
                          <p className="text-xs opacity-90">Online</p>
                          <p className="text-lg font-bold">
                            {getActiveInterviews().filter(i => i.interview_type === 'online').length}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-2 text-white">
                          <p className="text-xs opacity-90">Onsite</p>
                          <p className="text-lg font-bold">
                            {getActiveInterviews().filter(i => i.interview_type === 'onsite').length}
                          </p>
                        </div>
                      </div>

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
                          Today
                        </button>
                        <button
                          onClick={() => setActiveTab('tomorrow')}
                          className={`flex-1 px-3 py-1.5 font-medium text-xs rounded-lg transition-all ${
                            activeTab === 'tomorrow'
                              ? 'bg-white text-indigo-600 shadow-sm'
                              : 'text-gray-600 hover:text-gray-800'
                          }`}
                        >
                          Tomorrow
                        </button>
                        <button
                          onClick={() => setActiveTab('week')}
                          className={`flex-1 px-3 py-1.5 font-medium text-xs rounded-lg transition-all ${
                            activeTab === 'week'
                              ? 'bg-white text-indigo-600 shadow-sm'
                              : 'text-gray-600 hover:text-gray-800'
                          }`}
                        >
                          Week
                        </button>
                      </div>

                      <div className="mb-2">
                        <h3 className="text-sm font-bold text-gray-800">{getTabTitle()}</h3>
                        <p className="text-xs text-gray-500">{getTabDate()}</p>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto space-y-2">
                        {getActiveInterviews().length === 0 ? (
                          <div className="text-center py-12 bg-gray-50 rounded-lg">
                            <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-xs text-gray-500">No interviews scheduled</p>
                          </div>
                        ) : (
                          getActiveInterviews().map((interview) => (
                            <div
                              key={interview.id}
                              className="bg-gradient-to-r from-gray-50 to-white rounded-lg p-3 cursor-pointer hover:shadow-md transition-all border border-gray-200 hover:border-indigo-300"
                              onClick={() => {
                                // Find the applicant in the list
                                const applicant = allApplicants.find(a => a.id === interview.id);
                                if (applicant) {
                                  setSelectedApplicant(applicant);
                                  setActiveDetailTab('Assessment');
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
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Main Applications Table - 70% */}
                  <div className="w-[70%]">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[calc(100vh-200px)]">
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
                      const applicantStatus = selectedApplicant?.status?.toLowerCase() || '';
                      const hasInterview = !!selectedApplicant?.interview_date;
                      const interviewConfirmed = selectedApplicant?.interview_confirmed === 'Confirmed' || 
                                                selectedApplicant?.interview_confirmed === 'confirmed';
                      
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
                        // Step 2 is completed when interview is scheduled AND confirmed
                        isCompleted = hasInterview && interviewConfirmed;
                      } else if (step.key === "Agreements") {
                        // Step 3 is unlocked when Step 2 is completed (interview scheduled and confirmed)
                        isUnlocked = hasInterview && interviewConfirmed;
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
                      const form = payloadObj.form || payloadObj.applicant || payloadObj || {};
                      
                      // Calculate age from birthday
                      const calculateAge = (birthday) => {
                        if (!birthday) return '—';
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
                      const formatDate = (dateStr) => {
                        if (!dateStr) return '—';
                        try {
                          const date = new Date(dateStr);
                          return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
                        } catch {
                          return dateStr;
                        }
                      };

                      // Get resume URL
                      const resumePath = form.resumePath || form.resumeName || null;
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
                                <span className="text-gray-500">First Name:</span>
                                <span className="ml-2 text-gray-800">{form.firstName || "—"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Middle Name:</span>
                                <span className="ml-2 text-gray-800">{form.middleName || "—"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Last Name:</span>
                                <span className="ml-2 text-gray-800">{form.lastName || "—"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Email:</span>
                                <span className="ml-2 text-gray-800">{form.email || selectedApplicant.email || "—"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Contact Number:</span>
                                <span className="ml-2 text-gray-800">{form.contact || selectedApplicant.phone || "—"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Birthday:</span>
                                <span className="ml-2 text-gray-800">{formatDate(form.birthday)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Age:</span>
                                <span className="ml-2 text-gray-800">{form.birthday ? calculateAge(form.birthday) : "—"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Sex:</span>
                                <span className="ml-2 text-gray-800">{form.sex || "—"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Marital Status:</span>
                                <span className="ml-2 text-gray-800">{form.maritalStatus || form.marital_status || "—"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Available Start Date:</span>
                                <span className="ml-2 text-gray-800">{formatDate(form.startDate)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">How did you learn about our company?</span>
                                <span className="ml-2 text-gray-800">{form.heardFrom || "—"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Currently Employed?</span>
                                <span className="ml-2 text-gray-800">{form.employed || "—"}</span>
                              </div>
                              <div className="md:col-span-2">
                                <span className="text-gray-500">Resume:</span>
                                {resumeUrl ? (
                                  <a 
                                    href={resumeUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="ml-2 text-blue-600 hover:underline"
                                  >
                                    {form.resumeName || 'View Resume'}
                                  </a>
                                ) : (
                                  <span className="ml-2 text-gray-500">No resume uploaded</span>
                                )}
                              </div>
                              <div className="md:col-span-2">
                                <span className="text-gray-500">Government IDs:</span>
                                <div className="ml-2 mt-1 space-y-1">
                                  {form.hasSSS && <div className="text-gray-800">• SSS</div>}
                                  {form.hasPhilHealth && <div className="text-gray-800">• PhilHealth</div>}
                                  {form.hasTIN && <div className="text-gray-800">• TIN</div>}
                                  {!form.hasSSS && !form.hasPhilHealth && !form.hasTIN && <span className="text-gray-500">None</span>}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Address Information */}
                          <div className="mb-6">
                            <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">
                              Address Information
                            </h5>
                            <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                              <div>
                                <span className="text-gray-500">Unit/House Number:</span>
                                <span className="ml-2 text-gray-800">{form.unit_house_number || "—"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Street Name:</span>
                                <span className="ml-2 text-gray-800">{form.street || "—"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Barangay:</span>
                                <span className="ml-2 text-gray-800">{form.barangay || "—"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">City/Municipality:</span>
                                <span className="ml-2 text-gray-800">{form.city || "—"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Province:</span>
                                <span className="ml-2 text-gray-800">{form.province || "—"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">ZIP Code:</span>
                                <span className="ml-2 text-gray-800">{form.zip || "—"}</span>
                              </div>
                            </div>
                          </div>

                          {/* Education & Skills */}
                          <div className="mb-6">
                            <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">
                              Education & Skills
                            </h5>
                            <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 space-y-4">
                              {/* Education 1 */}
                              {(form.edu1Level || form.edu1Institution || form.edu1Year) && (
                                <div>
                                  <div className="font-medium text-gray-700 mb-2">Education 1:</div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-2">
                                    <div>
                                      <span className="text-gray-500">Level:</span>
                                      <span className="ml-2 text-gray-800">{form.edu1Level || "—"}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Institution:</span>
                                      <span className="ml-2 text-gray-800">{form.edu1Institution || "—"}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Year Finished:</span>
                                      <span className="ml-2 text-gray-800">{form.edu1Year || "—"}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Education 2 */}
                              {(form.edu2Level || form.edu2Institution || form.edu2Year) && (
                                <div>
                                  <div className="font-medium text-gray-700 mb-2">Education 2:</div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-2">
                                    <div>
                                      <span className="text-gray-500">Level:</span>
                                      <span className="ml-2 text-gray-800">{form.edu2Level || "—"}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Institution:</span>
                                      <span className="ml-2 text-gray-800">{form.edu2Institution || "—"}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Year Finished:</span>
                                      <span className="ml-2 text-gray-800">{form.edu2Year || "—"}</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Skills */}
                              <div>
                                <span className="text-gray-500">Skills:</span>
                                <div className="ml-2 mt-1">
                                  {form.skills && Array.isArray(form.skills) ? (
                                    <div className="flex flex-wrap gap-2">
                                      {form.skills.map((skill, idx) => (
                                        <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-gray-800">
                                          {skill}
                                        </span>
                                      ))}
                                    </div>
                                  ) : form.skills_text ? (
                                    <span className="text-gray-800">{form.skills_text}</span>
                                  ) : (
                                    <span className="text-gray-500">—</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Work Experience */}
                          {payloadObj.workExperiences && Array.isArray(payloadObj.workExperiences) && payloadObj.workExperiences.length > 0 && (
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
                                        <span className="ml-2 text-gray-800">{exp.company || "—"}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Role/Title:</span>
                                        <span className="ml-2 text-gray-800">{exp.role || exp.title || "—"}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Year Employed:</span>
                                        <span className="ml-2 text-gray-800">{exp.year || exp.period || "—"}</span>
                                      </div>
                                      <div className="md:col-span-2">
                                        <span className="text-gray-500">Reason for Leaving:</span>
                                        <span className="ml-2 text-gray-800">{exp.reason || "—"}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Character References */}
                          {payloadObj.characterReferences && Array.isArray(payloadObj.characterReferences) && payloadObj.characterReferences.length > 0 && (
                            <div className="mb-6">
                              <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">
                                Character References
                              </h5>
                              <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 space-y-4">
                                {payloadObj.characterReferences.map((ref, idx) => (
                                  <div key={idx} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                                    <div className="font-medium text-gray-700 mb-2">Reference #{idx + 1}:</div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                      <div>
                                        <span className="text-gray-500">Name:</span>
                                        <span className="ml-2 text-gray-800">{ref.name || "—"}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Contact Number:</span>
                                        <span className="ml-2 text-gray-800">{ref.contact || ref.contactNumber || "—"}</span>
                                      </div>
                                      <div className="md:col-span-2">
                                        <span className="text-gray-500">Remarks:</span>
                                        <span className="ml-2 text-gray-800">{ref.remarks || "—"}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* Action: Approve to proceed to Assessment */}
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => proceedToAssessment(selectedApplicant)}
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
                          </div>
                          <div className="text-sm text-gray-700 space-y-1">
                            <div><span className="font-medium">Date:</span> {selectedApplicant.interview_date}</div>
                            <div><span className="font-medium">Time:</span> {selectedApplicant.interview_time || "—"}</div>
                            <div><span className="font-medium">{interviewType === 'online' ? 'Meeting Link' : 'Location'}:</span> {selectedApplicant.interview_location || "—"}</div>
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
                      );
                    })()}

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
                  <span className="w-40 text-right pr-2">Actions</span>
                </div>

                {loadingJobPosts ? (
                  <div className="px-5 py-8 text-sm text-gray-500 text-center">Loading job posts…</div>
                ) : jobPostStats.length === 0 ? (
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
                          <span className={`inline-flex items-center justify-center px-2.5 py-1 text-[11px] rounded-full border w-20 ${
                            job.status === "Active"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-gray-50 text-gray-700 border-gray-200"
                          }`}>
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
                        <div className="w-40 flex justify-end gap-2">
                          {job.actualJobId ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleEditJobPost(job.actualJobId)}
                                className="px-3 py-1.5 rounded-full border border-blue-300 text-xs text-blue-700 hover:bg-blue-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmMessage(`Are you sure you want to remove the job post "${job.title}"? This action cannot be undone.`);
                                  setConfirmCallback(async () => {
                                    try {
                                      const { error } = await supabase
                                        .from('job_posts')
                                        .delete()
                                        .eq('id', job.actualJobId);
                                      
                                      if (error) {
                                        setErrorMessage(`Failed to delete job post: ${error.message}`);
                                        setShowErrorAlert(true);
                                      } else {
                                        setSuccessMessage(`Job post "${job.title}" has been removed successfully.`);
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
                                  });
                                  setShowConfirmDialog(true);
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
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
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isProcessingConfirm}
                onClick={async () => {
                  // Prevent multiple clicks
                  if (isProcessingConfirm) return;
                  
                  setIsProcessingConfirm(true);
                  try {
                    if (typeof confirmCallback === "function") {
                      await confirmCallback();
                    }
                  } finally {
                    setShowConfirmDialog(false);
                    setConfirmCallback(null);
                    setIsProcessingConfirm(false);
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
                    description: "",
                    responsibilities: [""],
                    others: [""],
                    urgent: false,
                    jobType: "delivery_crew",
                    durationHours: "",
                    durationMinutes: "",
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

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Mark as Urgent</label>
                  <input
                    type="checkbox"
                    checked={editJobForm.urgent}
                    onChange={(e) => setEditJobField("urgent", e.target.checked)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Job Title *</label>
                    <input
                      className="w-full border rounded px-3 py-2"
                      value={editJobForm.title}
                      onChange={(e) => setEditJobField("title", e.target.value)}
                      placeholder="Delivery Driver"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Depot *</label>
                    <input
                      list="edit-depot-options"
                      className="w-full border rounded px-3 py-2"
                      value={editJobForm.depot}
                      onChange={(e) => setEditJobField("depot", e.target.value)}
                      placeholder="Select or type depot"
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

                <div>
                  <label className="block text-sm font-medium mb-1">Duration (Optional)</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Hours</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full border rounded px-3 py-2"
                        value={editJobForm.durationHours}
                        onChange={(e) => setEditJobField("durationHours", e.target.value)}
                        placeholder="e.g., 8"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Minutes (0-59)</label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        className="w-full border rounded px-3 py-2"
                        value={editJobForm.durationMinutes}
                        onChange={(e) => setEditJobField("durationMinutes", e.target.value)}
                        placeholder="e.g., 30"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Short Description</label>
                  <textarea
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                    value={editJobForm.description}
                    onChange={(e) => setEditJobField("description", e.target.value)}
                    placeholder="We are seeking a reliable and safety-conscious Truck Driver..."
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Main Responsibilities</label>
                    <button onClick={addEditResp} className="text-sm text-blue-600 hover:underline">+ Add Responsibility</button>
                  </div>
                  <div className="space-y-2">
                    {editJobForm.responsibilities.map((r, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          className="flex-1 border rounded px-3 py-2"
                          value={r}
                          onChange={(e) => setEditResp(i, e.target.value)}
                          placeholder="e.g., Safely operate company-based trucks"
                        />
                        {editJobForm.responsibilities.length > 1 && (
                          <button onClick={() => removeEditResp(i)} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">Remove</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Other Notes</label>
                    <button onClick={addEditOther} className="text-sm text-blue-600 hover:underline">+ Add Other</button>
                  </div>
                  <div className="space-y-2">
                    {editJobForm.others.map((r, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          className="flex-1 border rounded px-3 py-2"
                          value={r}
                          onChange={(e) => setEditOther(i, e.target.value)}
                          placeholder="e.g., Must be willing to travel"
                        />
                        {editJobForm.others.length > 1 && (
                          <button onClick={() => removeEditOther(i)} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">Remove</button>
                        )}
                      </div>
                    ))}
                  </div>
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
                    description: "",
                    responsibilities: [""],
                    others: [""],
                    urgent: false,
                    jobType: "delivery_crew",
                    durationHours: "",
                    durationMinutes: "",
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
                disabled={updatingJobPost || !editJobForm.title || !editJobForm.depot}
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
