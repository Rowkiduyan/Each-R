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
  const [assessmentFile, setAssessmentFile] = useState(null);
  const [agreementFile, setAgreementFile] = useState(null);
  
  // Requirements state
  const [documentStatus, setDocumentStatus] = useState({});
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
      const { data, error } = await supabase
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
          job_posts:job_posts ( id, title, depot )
        `)
        .neq("status", "hired")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("fetch applications error:", error);
        setApplicants([]);
        setLoading(false);
        return;
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
    
    // Find the applicant data to get the job title/position
    const applicant = applicants.find(a => a.id === applicationId) || selectedApplicant;
    const position = applicant?.position || null;
    
    // Show confirm dialog
    setConfirmMessage(`Mark ${applicantName} as Employee? This will create an employee record and remove the applicant.`);
    setConfirmCallback(async () => {
      setShowConfirmDialog(false);
      try {
        // call the best RPC available with position info
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
        setSuccessMessage(`${applicantName} marked as employee`);
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
        <div className="w-full max-w-7xl bg-white rounded-2xl shadow-lg p-6">
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
            <div className="grid grid-cols-12 gap-4">
              {/* Left Sidebar - Applicants List */}
              <div className="col-span-3 bg-gray-50 border rounded-lg p-4 max-h-[85vh] overflow-y-auto">
                <h3 className="font-bold text-gray-800 mb-3 text-sm">Applicants</h3>
                <div className="space-y-2">
                  {applicationsBucket.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => {
                        setSelectedApplicant(a);
                        setActiveDetailTab("Application");
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
              <div className="col-span-9">
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
                      <div className="bg-gray-50 border rounded-md p-4 mb-4">
                        <div className="text-sm text-gray-800 font-semibold mb-2">Interview Schedule</div>
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
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-4">
                          <input
                            type="text"
                            placeholder="File name"
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div className="col-span-4">
                          <label className="inline-block px-3 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 border text-sm">
                            {interviewFile ? interviewFile.name : "Upload"}
                            <input
                              type="file"
                              onChange={(e) => setInterviewFile(e.target.files[0])}
                              className="hidden"
                            />
                          </label>
                        </div>
                        <div className="col-span-4">
                          {interviewFile && (
                            <span className="text-green-600 text-xl">✓</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Upload In-Person Assessment Results Section */}
                    <div className="mt-4 border rounded-md p-4">
                      <div className="text-sm font-semibold text-gray-800 mb-3">Upload In-Person Assessment Results</div>
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-4">
                          <input
                            type="text"
                            placeholder="File name"
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div className="col-span-4">
                          <label className="inline-block px-3 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 border text-sm">
                            {assessmentFile ? assessmentFile.name : "Upload"}
                            <input
                              type="file"
                              onChange={(e) => setAssessmentFile(e.target.files[0])}
                              className="hidden"
                            />
                          </label>
                        </div>
                        <div className="col-span-4">
                          {assessmentFile && (
                            <span className="text-green-600 text-xl">✓</span>
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
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
                      {[
                        {key: 'sss', label: 'SSS No.'},
                        {key: 'philhealth', label: 'PhilHealth No.'},
                        {key: 'pagibig', label: 'Pag-IBIG No.'},
                        {key: 'tin', label: 'TIN No.'}
                      ].map((item) => {
                        const status = idStatus[item.key] || "Submitted";
                        const isLocked = idLocked[item.key];
                        return (
                          <div key={item.key} className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder={item.label}
                                value={idFields[item.key]}
                                onChange={(e) => setIdFields((f) => ({ ...f, [item.key]: e.target.value }))}
                                disabled={isLocked}
                                className={`flex-1 px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500 ${isLocked ? 'bg-gray-100 text-gray-600' : ''}`}
                              />
                              {!isLocked ? (
                                <button
                                  type="button"
                                  className="text-xs px-2 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 flex-shrink-0 flex items-center justify-center min-w-[32px]"
                                  onClick={() => setIdLocked((l) => ({ ...l, [item.key]: true }))}
                                  title="Lock value"
                                >
                                  ✓
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="text-xs px-2 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 flex-shrink-0 flex items-center justify-center min-w-[32px]"
                                  onClick={() => setIdLocked((l) => ({ ...l, [item.key]: false }))}
                                  title="Unlock to edit"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                value={status}
                                onChange={(e) => setIdStatus((s) => ({ ...s, [item.key]: e.target.value }))}
                                className={`flex-1 border rounded px-2 py-1.5 font-medium text-sm ${
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
                                className="text-xs px-2 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 flex-shrink-0 flex items-center justify-center min-w-[32px]"
                                onClick={() => {
                                  // Lock in the status selection
                                  setSuccessMessage(`${item.label} status set to ${status}`);
                                  setShowSuccessAlert(true);
                                }}
                                title="Confirm status"
                              >
                                ✓
                              </button>
                              {status === "Validated" && (
                                <span className="text-xs text-gray-500 whitespace-nowrap">{new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}</span>
                              )}
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

                    {[
                      {name: 'PSA Birth Certificate *'},
                      {name: "Photocopy of Driver's License (Front and Back) *"},
                      {name: 'Photocopy of SSS ID'},
                      {name: 'Photocopy of TIN ID'},
                      {name: 'Photocopy of Philhealth MDR'},
                      {name: 'Photocopy of HDMF or Proof of HDMF No. (Pag-IBIG)'},
                      {name: 'Medical Examination Results *', hasDate: true},
                      {name: 'NBI Clearance', hasDate: true},
                      {name: 'Police Clearance', hasDate: true},
                    ].map((doc, idx) => {
                      const docKey = `doc_${idx}`;
                      const status = documentStatus[docKey] || "Submitted";
                      const isConfirmed = documentStatus[`${docKey}_confirmed`] || false;
                      return (
                        <div key={idx} className="border-b">
                          <div className="grid grid-cols-12 items-center gap-3 px-3 py-3">
                            <div className="col-span-12 md:col-span-6 text-sm text-gray-800">{doc.name}</div>
                            <div className="col-span-12 md:col-span-3 text-sm text-gray-600">—</div>
                            <div className="col-span-12 md:col-span-3 flex items-center gap-2">
                              <select
                                value={status}
                                onChange={(e) => {
                                  setDocumentStatus({...documentStatus, [docKey]: e.target.value, [`${docKey}_confirmed`]: false});
                                }}
                                className={`flex-1 border rounded px-2 py-1 font-medium text-sm ${
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
                                className={`text-xs px-2 py-1 rounded flex-shrink-0 ${
                                  isConfirmed
                                    ? "bg-green-600 text-white"
                                    : "bg-gray-300 text-gray-700 hover:bg-gray-400"
                                }`}
                                onClick={() => {
                                  if (!isConfirmed) {
                                    setDocumentStatus({...documentStatus, [`${docKey}_confirmed`]: true});
                                    // Optionally show a success message or save to database
                                    console.log(`Confirmed ${doc.name} status as ${status}`);
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
                          </div>
                        </div>
                      );
                    })}
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
                      <div className="col-span-3">File</div>
                      <div className="col-span-3">&nbsp;</div>
                    </div>

                    <div className="border-b">
                      <div className="grid grid-cols-12 items-center gap-3 px-3 py-3">
                        <div className="col-span-12 md:col-span-6 text-sm text-gray-800">Employee Appointment Letter</div>
                        <div className="col-span-12 md:col-span-3 text-sm">
                          <label className="inline-block px-3 py-1 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 border text-xs">
                            {agreementFile ? agreementFile.name : "Choose File"}
                            <input
                              type="file"
                              onChange={(e) => setAgreementFile(e.target.files[0])}
                              className="hidden"
                            />
                          </label>
                        </div>
                        <div className="col-span-12 md:col-span-3" />
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
