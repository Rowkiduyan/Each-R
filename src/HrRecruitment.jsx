// src/HrRecruitment.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

/**
 * markAsEmployeeRpc
 * Calls a Postgres RPC (move_applicant_to_employee) which should create an employee record
 * from the application id. It must also either DELETE the application row or
 * set applications.status = 'hired' (recommended) so other clients won't show it.
 *
 */
async function markAsEmployeeRpc(applicationId) {
  try {
    const { data, error } = await supabase.rpc("move_applicant_to_employee", {
      p_app_id: applicationId,
    });
    if (error) {
      console.error("Failed to hire via RPC:", error);
      return { ok: false, error };
    }
    return { ok: true, data };
  } catch (err) {
    console.error("Unexpected RPC error:", err);
    return { ok: false, error: err };
  }
}

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
  const [rejectedApplicants, setRejectedApplicants] = useState([
    {
      id: 1,
      name: "Smith, John",
      position: "Driver",
      depot: "Manila Depot",
      dateApplied: "Jun 15, 2023",
      remarks: "Failed background check",
    },
    {
      id: 2,
      name: "Brown, Sarah",
      position: "Warehouse Staff",
      depot: "Cebu Depot",
      dateApplied: "Jun 20, 2023",
      remarks: "Insufficient experience",
    },
    {
      id: 3,
      name: "Wilson, Mike",
      position: "HR Assistant",
      depot: "Davao Depot",
      dateApplied: "Jun 25, 2023",
      remarks: "Did not meet qualifications",
    },
  ]);

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

  // ---- Move application -> employee and remove from local list
  const handleMarkAsEmployee = async (applicationId, applicantName) => {
    if (!applicationId) {
      alert("Missing application id.");
      return;
    }
    if (!confirm(`Mark ${applicantName} as Employee? This will create an employee record and remove the applicant.`)) return;

    // call RPC
    const res = await markAsEmployeeRpc(applicationId);
    if (!res.ok) {
      console.error("markAsEmployeeRpc failed:", res.error);
      alert("Failed to mark as employee. See console for details.");
      return;
    }

    // Optimistically remove from local list to reflect change immediately
    setApplicants((prev) => prev.filter((a) => a.id !== applicationId));

    // ensure we re-load from server to reflect the canonical state
    await loadApplications();

    alert("✅ Applicant moved to Employees! If you have an employees view it should appear there.");
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
      alert("Please fill date, time and location.");
      return;
    }

    setScheduling(true);
    try {
      const r = await scheduleInterviewClient(selectedApplicationForInterview.id, interviewForm);
      if (!r.ok) {
        console.error("Edge function error:", r.error);
        alert("Failed to schedule interview. Check console and function logs.");
        return;
      }
      // success -> reload applications so updated interview fields show
      await loadApplications();
      setShowInterviewModal(false);
      alert("Interview scheduled and (if email exists) the applicant was notified.");
    } catch (err) {
      console.error("scheduleInterview unexpected error:", err);
      alert("Unexpected error scheduling interview. See console.");
    } finally {
      setScheduling(false);
    }
  };

  // ---- REJECT action: update DB row status -> 'rejected' and optionally save remarks
  const rejectApplication = async (applicationId, name) => {
    if (!applicationId) return;
    const reason = prompt(`Reject ${name}? Optional: add reason (cancel leaves blank).`);
    if (reason === null) return; // cancel
    try {
      const updates = { status: "rejected" };
      if (reason && reason.trim()) updates.rejection_remarks = reason.trim();
      const { error } = await supabase.from("applications").update(updates).eq("id", applicationId);
      if (error) {
        console.error("reject update error:", error);
        alert("Failed to reject application. See console.");
        return;
      }
      await loadApplications();
      alert("Application rejected.");
    } catch (err) {
      console.error("reject error:", err);
      alert("Unexpected error rejecting application. See console.");
    }
  };

  return (
    <>
      {/* Main Content */}
      <div className="flex justify-center items-start min-h-screen bg-gray-100">
        <div className="w-full max-w-6xl bg-white rounded-2xl shadow-lg p-6">
          {/* Sub Tabs */}
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

          {/* Applications Tab */}
          {activeSubTab === "Applications" && (
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
                </div>

                {loading ? (
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
                          <th className="px-4 py-2 text-left font-semibold border-b">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedApplicants.map((a) => (
                          <tr
                            key={a.id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td
                              className="px-4 py-2 border-b whitespace-nowrap cursor-pointer"
                              onClick={() =>
                                navigate(`/hr/recruitment/applicant/${a.id}`, {
                                  state: { applicant: a },
                                })
                              }
                            >
                              <div className="flex items-center justify-between">
                                <span className="cursor-pointer hover:text-blue-600 transition-colors">{a.name}</span>
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

                            <td className="px-4 py-2 border-b text-right space-x-2">
                              <button
                                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openInterviewModal(a);
                                }}
                              >
                                Set Interview
                              </button>

                              <button
                                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  rejectApplication(a.id, a.name);
                                }}
                              >
                                Reject
                              </button>
                            </td>
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

          {/* Interview Tab */}
          {activeSubTab === "Interview" && (
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
                          onClick={() =>
                            navigate(`/hr/recruitment/applicant/${a.id}`, {
                              state: { applicant: a },
                            })
                          }
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
          {activeSubTab === "Requirements" && (
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
                          onClick={() =>
                            navigate(`/hr/recruitment/applicant/${a.id}`, {
                              state: { applicant: a },
                            })
                          }
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
          {activeSubTab === "Agreements" && (
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

      {/* Action Modal kept for completeness */}
      {showActionModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            {!actionType && (
              <>
                <h3 className="text-lg font-bold mb-4">Please select an action to proceed</h3>
                <div className="flex gap-4 justify-end">
                  <button
                    onClick={() => setActionType("reject")}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => {
                      // close action modal and open the dedicated interview modal,
                      // reusing the exact interviewForm + scheduleInterview flow
                      setActionType(null);
                      setShowActionModal(false);
                      if (!selectedApplicationForInterview) {
                        alert("No applicant selected to schedule an interview for.");
                        return;
                      }
                      openInterviewModal(selectedApplicationForInterview);
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Set Interview
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
                      // If you want this to update DB instead of local only, call rejectApplication here.
                      // For now this follows existing behavior (local push).
                      const rejectedApplicant = {
                        id: Date.now(),
                        name: selectedApplicationForInterview?.name || "Unknown Applicant",
                        remarks: rejectionRemarks,
                        position: selectedApplicationForInterview?.position,
                        depot: selectedApplicationForInterview?.depot,
                        dateApplied: selectedApplicationForInterview?.dateApplied,
                      };
                      setRejectedApplicants((prev) => [...prev, rejectedApplicant]);
                      setShowActionModal(false);
                      setActionType(null);
                      setRejectionRemarks("");
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
    </>
  );
}

export default HrRecruitment;
