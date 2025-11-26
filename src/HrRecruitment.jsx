// src/HrRecruitment.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

/**
 * scheduleInterviewClient
 * Helper that invokes your Supabase Edge Function (name: "schedule-interview").
 * It returns { ok: true, data } or { ok: false, error }.
 */
async function scheduleInterviewClient(applicationId, interview) {
  try {
    const functionName = "dynamic-task"; // must match your Edge Function name exactly
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

  // ---- UI state
  const [activeSubTab, setActiveSubTab] = useState("Applications");
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
  const [documentStatus, setDocumentStatus] = useState({});
  const [documentRemarks, setDocumentRemarks] = useState({});
  const [idFields, setIdFields] = useState({
    sss: "",
    philhealth: "",
    pagibig: "",
    tin: "",
  });
  const [idLocked, setIdLocked] = useState({
    sss: false,
    philhealth: false,
    pagibig: false,
    tin: false,
  });
  const [idStatus, setIdStatus] = useState({
    sss: "Submitted",
    philhealth: "Submitted",
    pagibig: "Submitted",
    tin: "Submitted",
  });
  const [idRemarks, setIdRemarks] = useState({
    sss: "",
    philhealth: "",
    pagibig: "",
    tin: "",
  });

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

      // dedupe by user_id + job_id; keep newest (by created_at)
      const uniqueByUserJob = {};
      mapped.forEach((r) => {
        const key = `${r.user_id || "nouser"}:${r.job_id || "nojob"}`;
        if (!uniqueByUserJob[key]) {
          uniqueByUserJob[key] = r;
        } else {
          const existingDate = new Date(uniqueByUserJob[key].raw.created_at).getTime();
          const thisDate = new Date(r.raw.created_at).getTime();
          if (thisDate > existingDate) uniqueByUserJob[key] = r;
        }
      });

      const deduped = Object.values(uniqueByUserJob);
      
      setApplicants(deduped);
    } catch (err) {
      console.error("loadApplications unexpected error:", err);
      setApplicants([]);
    } finally {
      setLoading(false);
    }
  };

  // ---- useEffect: initial load + realtime subscription for INSERT/UPDATE/DELETE
  useEffect(() => {
    let channel;
    loadApplications();

    // subscribe to INSERT / UPDATE / DELETE so UI stays in sync across clients
    channel = supabase
      .channel("applications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "applications" },
        () => loadApplications()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "applications" },
        () => loadApplications()
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "applications" },
        () => loadApplications()
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []); // run once on mount

  // ---- Buckets based on application status
  const getStatus = (a) => {
    if (!a) return "submitted";
    return a.status || "submitted";
  };

  const applicationsBucket = applicants.filter((a) => {
    const s = getStatus(a);
    return ["submitted", "pending"].includes(s);
  });

  const interviewBucket = applicants.filter((a) => {
    const s = getStatus(a);
    return ["screening", "interview", "scheduled", "onsite"].includes(s);
  });

  const requirementsBucket = applicants.filter((a) => {
    const s = getStatus(a);
    return ["requirements", "docs_needed", "awaiting_documents"].includes(s);
  });

  const agreementsBucket = applicants.filter((a) => {
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

  const filteredInterview = interviewBucket.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.depot.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRequirements = requirementsBucket.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.depot.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAgreements = agreementsBucket.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.depot.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredApplicants.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedApplicants = filteredApplicants.slice(startIndex, startIndex + itemsPerPage);

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
    // Show confirm dialog
    setConfirmMessage(`Mark ${applicantName} as Employee? This will create an employee record, create an employee account, and send credentials via email.`);
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
          setErrorMessage("Cannot generate employee account: missing name information.");
          setShowErrorAlert(true);
          return;
        }

        // Generate employee email and password
        const employeeEmail = generateEmployeeEmail(firstName, lastName);
        const employeePassword = generateEmployeePassword(firstName, lastName, birthday);

        if (!employeeEmail) {
          setErrorMessage("Failed to generate employee email.");
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
          // Ignore duplicate email errors - the employee is already in the database
          if (msg.includes('duplicate key') && msg.includes('email')) {
            console.log("Employee already exists (duplicate email), continuing...");
            // Continue with success flow
          } else {
            console.error("RPC returned failure payload:", rpcResult.candidate, rpcData);
            setErrorMessage(msg);
            setShowErrorAlert(true);
            return;
          }
        }

        // Create/update Supabase Auth account for the employee using Edge Function (handles existing users)
        let authUserId = null;
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

        // Create or update profile with Employee role
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
                source: "recruitment",
              },
              { onConflict: "email" }
            );

          if (empUpsertErr) {
            console.error("Error upserting employees row:", empUpsertErr);
          }
        } catch (empErr) {
          console.error("Unexpected error upserting employees row:", empErr);
        }

        // Send email with credentials
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
        setSuccessMessage(`${applicantName} marked as employee. Account credentials sent to ${applicantEmail}`);
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

    setScheduling(true);
    try {
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
      setSuccessMessage(`Interview Scheduled: ${interviewSummary}`);
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
  const saveIdNumberValidation = async (idKey, status, remarks = "") => {
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
  const saveDocumentValidation = async (docKey, status, remarks = "") => {
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

  return (
    <>
      {/* Main Content */}
      <div className="flex justify-center items-start min-h-screen bg-gray-100 p-4">
        <div className="w-full max-w-[95%] xl:max-w-[1600px] bg-white rounded-2xl shadow-lg p-6">
          {/* Sub Tabs */}
          {!selectedApplicant && (
            <div className="flex gap-6 border-b mb-6 justify-center">
              {[
                { label: "Applications", count: applicationsBucket.length, show: true },
                { label: "Interview", count: interviewBucket.length, show: true },
                { label: "Requirements", count: filteredRequirements.length, show: true },
                { label: "Agreements", count: agreementsBucket.length, show: true },
              ]
                .filter((t) => t.show)
                .map((tab) => (
                  <button
                    key={tab.label}
                    onClick={() => setActiveSubTab(tab.label)}
                    className={`px-6 py-3 font-medium ${
                      activeSubTab === tab.label
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-600 hover:text-blue-600"
                    }`}>
                    {tab.label} <span className="text-sm text-gray-500">({tab.count})</span>
                  </button>
                ))}
            </div>
          )}

          {/* Applications Tab */}
          {activeSubTab === "Applications" && !selectedApplicant && (
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Applicants</h3>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="border px-3 py-1 rounded shadow-sm"
                />
              </div>                {loading ? (
                  <div className="p-6 text-gray-600">Loading applications…</div>
                ) : (
                  <div className="border rounded-lg overflow-hidden shadow-sm mx-auto" style={{ maxWidth: "100%" }}>
                    <table className="min-w-full border-collapse">
                      <thead className="bg-gray-100 text-gray-700">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold border-b">Applicant</th>
                          <th className="px-4 py-2 text-left font-semibold border-b">Position</th>
                          <th className="px-4 py-2 text-left font-semibold border-b">Depot</th>
                          <th className="px-4 py-2 text-left font-semibold border-b">Date Applied</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedApplicants.map((a) => (
                          <tr
                            key={a.id}
                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => {
                              setSelectedApplicant(a);
                              setActiveDetailTab("Application");
                              // Reset file states when switching applicants, but keep file names if files exist
                              setInterviewFile(null);
                              setInterviewFileName(a.interview_details_file ? a.interview_details_file.split('/').pop() : "");
                              setAssessmentFile(null);
                              setAssessmentFileName(a.assessment_results_file ? a.assessment_results_file.split('/').pop() : "");
                            }}
                          >
                            <td className="px-4 py-2 border-b whitespace-nowrap">
                              <div className="flex items-center justify-between">
                                <span className="hover:text-blue-600 transition-colors">{a.name}</span>
                                {isAgency(a) && (
                                  <span className="ml-2 inline-flex px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full border border-blue-200">
                                    🚩 Agency
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2 border-b">{a.position}</td>
                            <td className="px-4 py-2 border-b">{a.depot}</td>
                            <td className="px-4 py-2 border-b">{a.dateApplied}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {!loading && (
                  <div className="flex justify-between items-center mt-4">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <span className="text-gray-600">Page {currentPage} of {totalPages}</span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>

              {/* Right Side */}
              <div className="col-span-1 flex flex-col gap-4 justify-start">
                <button
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 shadow"
                  onClick={() => navigate("/applicantg/home")}
                >
                  View Job Postings
                </button>
                <button
                  onClick={() => setShowRejectedModal(true)}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 shadow"
                >
                  View Rejected Applicants
                </button>
              </div>
            </div>
          )}

          {/* Applicant Detail View - Shows for all tabs when applicant is selected */}
          {selectedApplicant && (
            <div className="grid grid-cols-12 gap-6">
              {/* Left Sidebar - Applicants List */}
              <div className="col-span-2 lg:col-span-3 bg-gray-50 border rounded-lg p-4 max-h-[85vh] overflow-y-auto">
                <h3 className="font-bold text-gray-800 mb-3 text-sm">Applicants</h3>
                <div className="space-y-2">
                  {applicationsBucket.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => {
                        setSelectedApplicant(a);
                        setActiveDetailTab("Application");
                        // Reset file states when switching applicants
                        setInterviewFile(null);
                        setInterviewFileName("");
                        setAssessmentFile(null);
                        setAssessmentFileName("");
                        setAgreementFile(null);
                        setAgreementFileName(a.appointment_letter_file ? a.appointment_letter_file.split('/').pop() : "");
                      }}
                      className={`p-2 rounded cursor-pointer transition-colors text-xs ${
                        selectedApplicant.id === a.id
                          ? "bg-blue-100 border-2 border-blue-500"
                          : "bg-white border border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      <div className="font-semibold text-gray-800 truncate">{a.name}</div>
                      <div className="text-gray-500 truncate">{a.position}</div>
                      <div className="text-gray-400">{a.dateApplied}</div>
                      {isAgency(a) && (
                        <span className="inline-block mt-1 px-1 py-0.5 text-xs bg-blue-100 text-blue-600 rounded border border-blue-200">
                          🚩 Agency
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Side - Detail View */}
              <div className="col-span-10 lg:col-span-9">
                <div className="mb-4">
                  <button
                    onClick={() => setSelectedApplicant(null)}
                    className="mb-4 flex items-center text-blue-600 hover:text-blue-800"
                  >
                    ← Back to Applicants
                  </button>
                </div>

              {/* Steps header */}
              <div className="flex items-center gap-3 mb-6 overflow-x-auto">
                {["Application", "Assessment", "Requirements", "Agreements"].map((step) => {
                  const isActive = activeDetailTab === step;
                  let bgColor = 'bg-gray-200 text-gray-800 hover:bg-gray-300';
                  
                  if (isActive) {
                    bgColor = 'bg-red-600 text-white';
                  }
                  
                  return (
                    <button
                      key={step}
                      type="button"
                      onClick={() => setActiveDetailTab(step)}
                      className={`px-4 py-2 rounded ${bgColor}`}
                    >
                      {step}
                    </button>
                  );
                })}
              </div>

              {/* Detail Content */}
              <div className="bg-white border rounded-md shadow-sm">
                {/* Application Tab */}
                {activeDetailTab === "Application" && (
                  <section className="p-4">
                    {/* Header row */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                          {selectedApplicant.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">{selectedApplicant.name}</div>
                          <div className="text-xs text-gray-500">Applied: {selectedApplicant.dateApplied}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">#{selectedApplicant.id.slice(0, 8)}</div>
                        {selectedApplicant.interview_date ? (
                          <div className="mt-2">
                            <button
                              type="button"
                              className="text-sm text-blue-600 hover:underline"
                              onClick={() => setShowActionModal(true)}
                            >
                              Update Application Status
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="text-sm text-blue-600 hover:underline mt-2"
                            onClick={() => {
                              setSelectedApplicationForInterview(selectedApplicant);
                              openInterviewModal(selectedApplicant);
                            }}
                          >
                            Set Interview
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Job Details */}
                    <div className="border rounded-md overflow-hidden">
                      <div className="bg-gray-100 text-gray-800 px-3 py-2 text-sm font-semibold border-b">Job Details</div>
                      <div className="p-3 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 border-b">
                        <div><span className="font-semibold">Position Applying For:</span> {selectedApplicant.position}</div>
                        <div><span className="font-semibold">Depot:</span> {selectedApplicant.depot}</div>
                        <div><span className="font-semibold">Date Applied:</span> {selectedApplicant.dateApplied}</div>
                      </div>

                      {/* Personal Information */}
                      <div className="bg-gray-100 text-gray-800 px-3 py-2 text-sm font-semibold border-b">Personal Information</div>
                      <div className="p-3 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                        <div><span className="font-semibold">Full Name:</span> {selectedApplicant.name}</div>
                        <div><span className="font-semibold">Email:</span> {selectedApplicant.email || "—"}</div>
                        <div><span className="font-semibold">Contact Number:</span> {selectedApplicant.phone || "—"}</div>
                      </div>
                    </div>
                  </section>
                )}

                {/* Assessment Tab */}
                {activeDetailTab === "Assessment" && (
                  <section className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                          {selectedApplicant.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">{selectedApplicant.name}</div>
                          <div className="text-xs text-gray-500">Applied: {selectedApplicant.dateApplied}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-lg font-semibold text-gray-800">Assessment</h2>
                    </div>

                    {/* Interview Schedule */}
                    {selectedApplicant.interview_date && (
                      <div className="bg-gray-50 border rounded-md p-4 mb-4 relative">
                        <div className="flex items-start justify-between mb-2">
                          <div className="text-sm text-gray-800 font-semibold">Interview Schedule</div>
                          {selectedApplicant.interview_confirmed && (
                            <span className="text-sm px-3 py-1 rounded bg-green-100 text-green-800 border border-green-300 font-medium">
                              Interview Confirmed
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-700 space-y-1">
                          <div><span className="font-medium">Date:</span> {selectedApplicant.interview_date}</div>
                          <div><span className="font-medium">Time:</span> {selectedApplicant.interview_time || "—"}</div>
                          <div><span className="font-medium">Location:</span> {selectedApplicant.interview_location || "—"}</div>
                          <div><span className="font-medium">Interviewer:</span> {selectedApplicant.interviewer || "—"}</div>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="text-xs text-gray-500 italic">
                            Important Reminder: Please confirm at least a day before your schedule.
                          </div>
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

                {/* Requirements Tab */}
                {activeDetailTab === "Requirements" && (
                  <section className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                          {selectedApplicant.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">{selectedApplicant.name}</div>
                          <div className="text-xs text-gray-500">Applied: {selectedApplicant.dateApplied}</div>
                        </div>
                      </div>
                    </div>

                    {/* ID numbers row with lock/unlock */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      {[
                        {key: 'sss', label: 'SSS No.'},
                        {key: 'philhealth', label: 'PhilHealth No.'},
                        {key: 'pagibig', label: 'Pag-IBIG No.'},
                        {key: 'tin', label: 'TIN No.'}
                      ].map((item) => {
                        const status = idStatus[item.key] || "Submitted";
                        const isLocked = idLocked[item.key];
                        return (
                          <div key={item.key} className="flex flex-col gap-3 p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
                            {/* Label */}
                            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{item.label}</div>
                            
                            {/* ID Number Input with Lock Button */}
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder={item.label}
                                value={idFields[item.key]}
                                onChange={(e) => setIdFields((f) => ({ ...f, [item.key]: e.target.value }))}
                                disabled={isLocked}
                                className={`w-32 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 ${isLocked ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
                              />
                              {!isLocked && (
                                <button
                                  type="button"
                                  className="px-2.5 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 flex-shrink-0 transition-colors"
                                  onClick={() => setIdLocked((l) => ({ ...l, [item.key]: true }))}
                                  title="Lock value"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              )}
                            </div>

                            {/* Status Section */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <select
                                  value={status}
                                  onChange={(e) => setIdStatus((s) => ({ ...s, [item.key]: e.target.value }))}
                                  className={`flex-1 border rounded-md px-3 py-2 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                                    status === "Validated"
                                      ? "bg-green-100 text-green-700 border-green-300 focus:ring-green-500"
                                      : status === "Submitted"
                                      ? "bg-orange-100 text-orange-700 border-orange-300 focus:ring-orange-500"
                                      : "bg-red-100 text-red-700 border-red-300 focus:ring-red-500"
                                  }`}
                                >
                                  <option>Submitted</option>
                                  <option>Validated</option>
                                  <option>Re-submit</option>
                                </select>
                                <button
                                  type="button"
                                  className="px-2.5 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 flex-shrink-0 transition-colors shadow-sm"
                                  onClick={async () => {
                                    // Save ID number validation
                                    await saveIdNumberValidation(item.key, status, idRemarks[item.key] || "");
                                    setSuccessMessage(`${item.label} status set to ${status}`);
                                    setShowSuccessAlert(true);
                                  }}
                                  title="Confirm status"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                              {status === "Validated" && (
                                <div className="text-xs text-gray-500 px-2">
                                  Validated: {new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}
                                </div>
                              )}
                            </div>

                            {/* Remarks Input */}
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Remarks</label>
                              <input
                                type="text"
                                placeholder="Add remarks..."
                                value={idRemarks[item.key] || ""}
                                onChange={(e) => setIdRemarks({...idRemarks, [item.key]: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Documents table */}
                    <div className="bg-gray-100 text-gray-800 px-3 py-2 text-sm font-semibold border rounded-t-md">Document Name</div>
                    <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-gray-600 border-b">
                      <div className="col-span-6">&nbsp;</div>
                      <div className="col-span-3">Submission</div>
                      <div className="col-span-3">Remarks</div>
                    </div>

                    {(() => {
                      let requirements = selectedApplicant.requirements;
                      if (typeof requirements === 'string') {
                        try { requirements = JSON.parse(requirements); } catch { requirements = {}; }
                      }
                      const submittedDocuments = requirements?.documents || [];

                      const docList = [
                        {name: 'PSA Birth Certificate *', key: 'psa_birth_certificate'},
                        {name: "Photocopy of Driver's License (Front and Back) *", key: 'drivers_license'},
                        {name: 'Photocopy of SSS ID', key: 'sss_id'},
                        {name: 'Photocopy of TIN ID', key: 'tin_id'},
                        {name: 'Photocopy of Philhealth MDR', key: 'philhealth_mdr'},
                        {name: 'Photocopy of HDMF or Proof of HDMF No. (Pag-IBIG)', key: 'pagibig'},
                        {name: 'Medical Examination Results *', hasDate: true, key: 'medical_exam'},
                        {name: 'NBI Clearance', hasDate: true, key: 'nbi_clearance'},
                        {name: 'Police Clearance', hasDate: true, key: 'police_clearance'},
                      ];

                      return docList.map((doc, idx) => {
                        const docKey = doc.key || `doc_${idx}`;
                        const submittedDoc = submittedDocuments.find(d => d.key === docKey || d.name === doc.name);
                        const status = documentStatus[docKey] || submittedDoc?.status || "Submitted";
                        const remarks = documentRemarks[docKey] || submittedDoc?.remarks || "";
                        const isConfirmed = documentStatus[`${docKey}_confirmed`] || false;

                        return (
                          <div key={idx} className="border-b py-4">
                            <div className="grid grid-cols-12 items-start gap-4 px-4">
                              <div className="col-span-12 md:col-span-4 text-sm text-gray-800 font-medium">{doc.name}</div>
                              <div className="col-span-12 md:col-span-3 text-sm text-gray-600">
                                {submittedDoc?.file_path ? (
                                  <a 
                                    href={supabase.storage.from('application-files').getPublicUrl(submittedDoc.file_path)?.data?.publicUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline break-all"
                                  >
                                    {submittedDoc.file_path.split('/').pop()}
                                  </a>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </div>
                              <div className="col-span-12 md:col-span-5 flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                  <select
                                    value={status}
                                    onChange={(e) => {
                                      setDocumentStatus({...documentStatus, [docKey]: e.target.value, [`${docKey}_confirmed`]: false});
                                    }}
                                    className={`flex-1 border rounded px-3 py-2 font-medium text-sm ${
                                      status === "Validated"
                                        ? "bg-green-100 text-green-700"
                                        : status === "Submitted"
                                        ? "bg-orange-100 text-orange-700"
                                        : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    <option>Submitted</option>
                                    <option>Validated</option>
                                    <option>Re-submit</option>
                                  </select>
                                  <button
                                    type="button"
                                    className={`text-xs px-3 py-2 rounded flex-shrink-0 ${
                                      isConfirmed
                                        ? "bg-green-600 text-white"
                                        : "bg-gray-300 text-gray-700 hover:bg-gray-400"
                                    }`}
                                    onClick={async () => {
                                      if (!isConfirmed) {
                                        // Save status and remarks to database
                                        await saveDocumentValidation(docKey, status, remarks);
                                        setDocumentStatus({...documentStatus, [`${docKey}_confirmed`]: true});
                                        setSuccessMessage(`${doc.name} status updated to ${status}`);
                                        setShowSuccessAlert(true);
                                      } else {
                                        // Allow unconfirming
                                        setDocumentStatus({...documentStatus, [`${docKey}_confirmed`]: false});
                                      }
                                    }}
                                    title={isConfirmed ? "Status confirmed - Click to unconfirm" : "Confirm status"}
                                  >
                                    ✓
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  placeholder="Add remarks..."
                                  value={remarks}
                                  onChange={(e) => setDocumentRemarks({...documentRemarks, [docKey]: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </section>
                )}

                {/* Agreements Tab */}
                {activeDetailTab === "Agreements" && (
                  <section className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                          {selectedApplicant.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">{selectedApplicant.name}</div>
                          <div className="text-xs text-gray-500">Applied: {selectedApplicant.dateApplied}</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-100 text-gray-800 px-3 py-2 text-sm font-semibold border rounded-t-md">Document Name</div>
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

          {/* Interview Tab */}
          {activeSubTab === "Interview" && !selectedApplicant && (
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800">Interview</h3>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="border px-3 py-1 rounded shadow-sm"
                  />
                </div>
                <div className="border rounded-lg overflow-hidden shadow-sm mx-auto" style={{ maxWidth: "100%" }}>
                  <table className="min-w-full border-collapse">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold border-b">Applicant</th>
                        <th className="px-4 py-2 text-left font-semibold border-b">Position</th>
                        <th className="px-4 py-2 text-left font-semibold border-b">Depot</th>
                        <th className="px-4 py-2 text-left font-semibold border-b">Date Applied</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInterview.map((a) => (
                        <tr
                          key={a.id}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => {
                              setSelectedApplicant(a);
                              setActiveDetailTab("Assessment");
                              // Reset file states when switching applicants, but keep file names if files exist
                              setInterviewFile(null);
                              setInterviewFileName(a.interview_details_file ? a.interview_details_file.split('/').pop() : "");
                              setAssessmentFile(null);
                              setAssessmentFileName(a.assessment_results_file ? a.assessment_results_file.split('/').pop() : "");
                              setAgreementFile(null);
                              setAgreementFileName(a.appointment_letter_file ? a.appointment_letter_file.split('/').pop() : "");
                            }}
                        >
                          <td className="px-4 py-2 border-b">
                            <div className="flex items-center justify-between">
                              <span>{a.name}</span>
                              {isAgency(a) && (
                                <span className="ml-2 inline-flex px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full border border-blue-200">
                                  🚩 Agency
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 border-b">{a.position}</td>
                          <td className="px-4 py-2 border-b">{a.depot}</td>
                          <td className="px-4 py-2 border-b">{a.dateApplied}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="col-span-1 flex flex-col gap-4">
                <button
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 shadow"
                  onClick={() => navigate("/applicantg/home")}
                >
                  View Job Postings
                </button>
                <button
                  onClick={() => setShowRejectedModal(true)}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 shadow"
                >
                  View Rejected Applicants
                </button>
              </div>
            </div>
          )}

          {/* Requirements Tab */}
          {activeSubTab === "Requirements" && !selectedApplicant && (
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800">Requirements</h3>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="border px-3 py-1 rounded shadow-sm"
                  />
                </div>
                <div className="border rounded-lg overflow-hidden shadow-sm mx-auto" style={{ maxWidth: "100%" }}>
                  <table className="min-w-full border-collapse">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold border-b">Applicant</th>
                        <th className="px-4 py-2 text-left font-semibold border-b">Position</th>
                        <th className="px-4 py-2 text-left font-semibold border-b">Depot</th>
                        <th className="px-4 py-2 text-left font-semibold border-b">Date Applied</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequirements.map((a) => (
                        <tr
                          key={a.id}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => {
                              setSelectedApplicant(a);
                              setActiveDetailTab("Requirements");
                              // Reset file states when switching applicants, but keep file names if files exist
                              setInterviewFile(null);
                              setInterviewFileName(a.interview_details_file ? a.interview_details_file.split('/').pop() : "");
                              setAssessmentFile(null);
                              setAssessmentFileName(a.assessment_results_file ? a.assessment_results_file.split('/').pop() : "");
                              setAgreementFile(null);
                              setAgreementFileName(a.appointment_letter_file ? a.appointment_letter_file.split('/').pop() : "");
                            }}
                        >
                          <td className="px-4 py-2 border-b">
                            <div className="flex items-center justify-between">
                              <span>{a.name}</span>
                              {isAgency(a) && (
                                <span className="ml-2 inline-flex px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full border border-blue-200">
                                  🚩 Agency
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 border-b">{a.position}</td>
                          <td className="px-4 py-2 border-b">{a.depot}</td>
                          <td className="px-4 py-2 border-b">{a.dateApplied}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="col-span-1 flex flex-col gap-4">
                <button
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 shadow"
                  onClick={() => navigate("/applicantg/home")}
                >
                  View Job Postings
                </button>
                <button
                  onClick={() => setShowRejectedModal(true)}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 shadow"
                >
                  View Rejected Applicants
                </button>
              </div>
            </div>
          )}

          {/* Agreements Tab */}
          {activeSubTab === "Agreements" && !selectedApplicant && (
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800">Agreements</h3>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="border px-3 py-1 rounded shadow-sm"
                  />
                </div>
                <div className="border rounded-lg overflow-hidden shadow-sm mx-auto" style={{ maxWidth: "100%" }}>
                  <table className="min-w-full border-collapse">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold border-b">Applicant</th>
                        <th className="px-4 py-2 text-left font-semibold border-b">Position</th>
                        <th className="px-4 py-2 text-left font-semibold border-b">Depot</th>
                        <th className="px-4 py-2 text-left font-semibold border-b">Date Applied</th>
                        <th className="px-4 py-2 text-left font-semibold border-b">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAgreements.map((a) => (
                        <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2 border-b">
                            <div className="flex items-center justify-between">
                              <span>{a.name}</span>
                              {isAgency(a) && (
                                <span className="ml-2 inline-flex px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full border border-blue-200">
                                  🚩 Agency
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 border-b">{a.position}</td>
                          <td className="px-4 py-2 border-b">{a.depot}</td>
                          <td className="px-4 py-2 border-b">{a.dateApplied}</td>
                          <td className="px-4 py-2 border-b">
                            <button
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                              onClick={async () => {
                                await handleMarkAsEmployee(a.id, a.name);
                              }}
                            >
                              Mark as Employee
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="col-span-1 flex flex-col gap-4">
                <button
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 shadow"
                  onClick={() => navigate("/applicantg/home")}
                >
                  View Job Postings
                </button>
                <button
                  onClick={() => setShowRejectedModal(true)}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 shadow"
                >
                  View Rejected Applicants
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
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="text-sm">Time</label>
                <input
                  type="time"
                  value={interviewForm.time}
                  onChange={(e) => setInterviewForm((f) => ({ ...f, time: e.target.value }))}
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
