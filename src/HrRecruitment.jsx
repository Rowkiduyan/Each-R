// src/HrRecruitment.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

function HrRecruitment() {
  const navigate = useNavigate();

  // ---- UI state
  const [activeSubTab, setActiveSubTab] = useState("Applications");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [showRejectedModal, setShowRejectedModal] = useState(false);
  const [interviewDetails, setInterviewDetails] = useState({
    date: "",
    time: "",
    location: "",
    interviewer: "",
  });
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

  // ---- Data from Supabase
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 10;

  // detect agency-sourced row
  const isAgency = (row) => {
    if (!row) return false;
    if (row.agency) return true;

    const raw = row.raw || {};
    const payload = raw.payload || {};
    try {
      const meta =
        payload.meta || (payload.form && payload.form.meta) || null;

      if (meta?.source === "agency" || meta?.source === "Agency") return true;
      if (meta?.endorsed_by_profile_id || meta?.endorsed_by_auth_user_id)
        return true;

      if (payload.agency === true) return true;
    } catch {
      // ignore parse errors
    }

    return false;
  };

  // ---- Load applications
  useEffect(() => {
    let channel;

    const load = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("applications")
        .select(`
          id,
          user_id,
          job_id,
          status,
          created_at,
          payload,
          job_posts:job_posts (
            id,
            title,
            depot
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("fetch applications error:", error);
        alert("Can't load applications: " + error.message);
        setApplicants([]);
        setLoading(false);
        return;
      }

      const rows = (data || []).map((row) => {
        let payloadObj = row.payload;

        if (typeof payloadObj === "string") {
          try {
            payloadObj = JSON.parse(payloadObj);
          } catch {
            payloadObj = {};
          }
        }

        const p = payloadObj.form || payloadObj || {};

        const first = p.firstName || p.fname || p.first_name || "";
        const middle =
          p.middleName || p.mname || p.middle_name
            ? ` ${p.middleName || p.mname || p.middle_name}`
            : "";
        const last =
          p.lastName || p.lname || p.last_name
            ? ` ${p.lastName || p.lname || p.last_name}`
            : "";
        const fullName =
          `${first}${middle}${last}`.trim() ||
          p.fullName ||
          p.name ||
          "Unnamed Applicant";

        const position = row.job_posts?.title ?? "—";
        const depot = row.job_posts?.depot ?? "—";

        return {
          id: row.id,
          name: fullName,
          position,
          depot,
          dateApplied: new Date(row.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
          }),
          email: p.email || p.contact || "—",
          phone: p.contact || "—",
          address: [p.street, p.barangay, p.city, p.zip].filter(Boolean).join(", "),
          agency: !!p.agency,
          raw: row,
        };
      });

      setApplicants(rows);
      setLoading(false);
    };

    load();

    channel = supabase
      .channel("applications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "applications" },
        load
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // ---- Derivations
  const agreements = applicants.slice(0, 3);
  const requirements = [...applicants.slice(3, 6), applicants[1]].filter(Boolean);
  const finalAgreements = applicants.slice(6, 8);

  // ---- Search & pagination
  const filteredApplicants = applicants.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.depot.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAgreements = agreements.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.depot.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRequirements = requirements.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.depot.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFinalAgreements = finalAgreements.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.depot.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredApplicants.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedApplicants = filteredApplicants.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  return (
    <>
      {/* Main Content */}
      <div className="flex justify-center items-start min-h-screen bg-gray-100">
        <div className="w-full max-w-6xl bg-white rounded-2xl shadow-lg p-6">
          {/* Sub Tabs */}
          <div className="flex gap-6 border-b mb-6 justify-center">
            {[
              { label: "Applications", count: applicants.length },
              { label: "Interview", count: agreements.length },
              { label: "Requirements", count: filteredRequirements.length },
              { label: "Agreements", count: finalAgreements.length },
            ].map((tab) => (
              <button
                key={tab.label}
                onClick={() => setActiveSubTab(tab.label)}
                className={`px-6 py-3 font-medium ${
                  activeSubTab === tab.label
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-blue-600"
                }`}
              >
                {tab.label}{" "}
                <span className="text-sm text-gray-500">({tab.count})</span>
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
                  <div className="border rounded-lg overflow-hidden shadow-sm mx-auto">
                    <table className="min-w-full border-collapse">
                      <thead className="bg-gray-100 text-gray-700">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold border-b">
                            Applicant
                          </th>
                          <th className="px-4 py-2 text-left font-semibold border-b">
                            Position
                          </th>
                          <th className="px-4 py-2 text-left font-semibold border-b">
                            Depot
                          </th>
                          <th className="px-4 py-2 text-left font-semibold border-b">
                            Date Applied
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedApplicants.map((a) => (
                          <tr
                            key={a.id}
                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() =>
                              navigate(`/hr/recruitment/applicant/${a.id}`, {
                                state: { applicant: a },
                              })
                            }
                          >
                            <td className="px-4 py-2 border-b whitespace-nowrap">
                              <div className="flex items-center justify-between">
                                <span className="cursor-pointer hover:text-blue-600 transition-colors">
                                  {a.name}
                                </span>

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
                    <span className="text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(p + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>

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

                <div className="border rounded-lg overflow-hidden shadow-sm mx-auto">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold border-b">
                          Applicant
                        </th>
                        <th className="px-4 py-2 text-left font-semibold border-b">
                          Position
                        </th>
                        <th className="px-4 py-2 text-left font-semibold border-b">
                          Depot
                        </th>
                        <th className="px-4 py-2 text-left font-semibold border-b">
                          Date Applied
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAgreements.map((a) => (
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

                <div className="border rounded-lg overflow-hidden shadow-sm mx-auto">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold border-b">
                          Applicant
                        </th>
                        <th className="px-4 py-2 text-left font-semibold border-b">
                          Position
                        </th>
                        <th className="px-4 py-2 text-left font-semibold border-b">
                          Depot
                        </th>
                        <th className="px-4 py-2 text-left font-semibold border-b">
                          Date Applied
                        </th>
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

                <div className="border rounded-lg overflow-hidden shadow-sm mx-auto">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold border-b">
                          Applicant
                        </th>
                        <th className="px-4 py-2 text-left font-semibold border-b">
                          Position
                        </th>
                        <th className="px-4 py-2 text-left font-semibold border-b">
                          Depot
                        </th>
                        <th className="px-4 py-2 text-left font-semibold border-b">
                          Date Applied
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFinalAgreements.map((a) => (
                        <tr
                          key={a.id}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
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
        </div>
      </div>

      {/* Action Modal */}
      {showActionModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            {!actionType && (
              <>
                <h3 className="text-lg font-bold mb-4">
                  Please select an action to proceed
                </h3>
                <div className="flex gap-4 justify-end">
                  <button
                    onClick={() => setActionType("reject")}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => setActionType("interview")}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Set Interview
                  </button>
                </div>
              </>
            )}

            {actionType === "interview" && (
              <>
                <h3 className="text-lg font-bold mb-4">Add Interview Details</h3>
                <div className="space-y-3">
                  <input
                    type="date"
                    className="w-full border rounded px-3 py-2"
                    value={interviewDetails.date}
                    onChange={(e) =>
                      setInterviewDetails({
                        ...interviewDetails,
                        date: e.target.value,
                      })
                    }
                  />
                  <input
                    type="time"
                    className="w-full border rounded px-3 py-2"
                    value={interviewDetails.time}
                    onChange={(e) =>
                      setInterviewDetails({
                        ...interviewDetails,
                        time: e.target.value,
                      })
                    }
                  />
                  <input
                    type="text"
                    placeholder="Location"
                    className="w-full border rounded px-3 py-2"
                    value={interviewDetails.location}
                    onChange={(e) =>
                      setInterviewDetails({
                        ...interviewDetails,
                        location: e.target.value,
                      })
                    }
                  />
                  <input
                    type="text"
                    placeholder="Interviewer Name"
                    className="w-full border rounded px-3 py-2"
                    value={interviewDetails.interviewer}
                    onChange={(e) =>
                      setInterviewDetails({
                        ...interviewDetails,
                        interviewer: e.target.value,
                      })
                    }
                  />
                </div>
              </>
            )}

            {actionType === "reject" && (
              <>
                <h3 className="text-lg font-bold mb-2">Add Rejection Remarks</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Please share your feedback or reasons for rejecting this
                  applicant.
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
                    onClick={() => setShowActionModal(false)}
                    className="px-4 py-2 bg-gray-300 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setRejectedApplicants((prev) => [
                        ...prev,
                        {
                          id: Date.now(),
                          name: "Unknown Applicant",
                          remarks: rejectionRemarks,
                        },
                      ]);
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
                        <p className="text-sm text-gray-600">
                          {r.position} - {r.depot}
                        </p>
                        <p className="text-xs text-gray-500">
                          Applied: {r.dateApplied}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mt-2 italic">
                      "{r.remarks}"
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowRejectedModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default HrRecruitment;
