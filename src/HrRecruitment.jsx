// src/HrRecruitment.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";

function HrRecruitment() {
  const [activeSubTab, setActiveSubTab] = useState("Applications");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [interviewDetails, setInterviewDetails] = useState({
    date: "",
    time: "",
    location: "",
    interviewer: "",
  });
  const [summary, setSummary] = useState(null);
  const [rejectionRemarks, setRejectionRemarks] = useState("");

  const itemsPerPage = 5;

  // Sample applicants (added some personal info for demo)
  const applicants = [
    {
      id: 1,
      name: "Dela Cruz, Juan",
      position: "Delivery Rider",
      depot: "Pasig Depot",
      dateApplied: "Jun 30, 2023",
      email: "juan.delacruz@example.com",
      phone: "09171234567",
      address: "Pasig City",
    },
    {
      id: 2,
      name: "Reyes, Maria",
      position: "Warehouse Staff",
      depot: "Cavite Depot",
      dateApplied: "Jul 02, 2023",
      email: "maria.reyes@example.com",
      phone: "09182345678",
      address: "Cavite City",
      agency: true,
    },
    // ... extend with your other 30+ applicants
  ];

  // 🔎 Search filter
  const filteredApplicants = applicants.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.depot.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 📄 Pagination
  const totalPages = Math.ceil(filteredApplicants.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedApplicants = filteredApplicants.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleRowClick = (applicant) => {
    setSelectedApplicant(applicant);
    setSummary(null);
    setActionType(null);
  };

  const handleConfirmInterview = () => {
    setSummary(interviewDetails);
    setShowActionModal(false);
  };

  const handleConfirmRejection = () => {
    setSummary({ rejection: rejectionRemarks });
    setShowActionModal(false);
  };

  return (
    <>
      {/* ✅ NavBar */}
      <nav className="w-full bg-white shadow-md mb-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-25">
            <div className="flex-shrink-0 text-red-600 font-bold text-2xl italic">
              Each-R
            </div>
            <div className="flex space-x-6">
              <Link
                to="/hr/home"
                className="text-gray-700 hover:text-red-600 font-medium"
              >
                Home
              </Link>
              <Link
                to="/employees"
                className="text-gray-700 hover:text-red-600 font-medium"
              >
                Employees
              </Link>
              <Link
                to="/hr/recruitment"
                className="text-gray-700 hover:text-red-600 font-medium"
              >
                Recruitment
              </Link>
              <Link
                to="/hr/trainings"
                className="text-gray-700 hover:text-red-600 font-medium"
              >
                Trainings/Seminars
              </Link>
              <a href="#" className="text-gray-700 hover:text-red-600 font-medium">
                Evaluation
              </a>
              <a href="#" className="text-gray-700 hover:text-red-600 font-medium">
                Seperation
              </a>
              <a href="#" className="text-gray-700 hover:text-red-600 font-medium">
                Notifications
              </a>
              <a href="#" className="text-gray-700 hover:text-red-600 font-medium">
                Logout
              </a>
            </div>
            <span className="text-gray-700 font-semibold">Alexis Yvone</span>
          </div>
        </div>
      </nav>

      {/* ✅ Main Content */}
      <div className="flex justify-center items-start min-h-screen bg-gray-100 px-4">
        <div className="w-full max-w-6xl bg-white rounded-2xl shadow-lg p-8">
          {/* Sub Tabs */}
          <div className="flex gap-6 border-b mb-6 justify-center">
            {["Applications", "Agreements", "Requirements", "Agreement"].map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveSubTab(tab)}
                  className={`px-6 py-3 font-medium ${
                    activeSubTab === tab
                      ? "border-b-2 border-blue-600 text-blue-600"
                      : "text-gray-600 hover:text-blue-600"
                  }`}
                >
                  {tab}
                </button>
              )
            )}
          </div>

          {/* Applications Tab */}
          {activeSubTab === "Applications" && (
            <div className="grid grid-cols-3 gap-6">
              {/* Left side */}
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
                <div className="border rounded-lg overflow-hidden shadow-sm">
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
                          onClick={() => handleRowClick(a)}
                        >
                          <td className="px-4 py-2 border-b">
                            {a.name}{" "}
                            {a.agency && (
                              <span className="ml-2 inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">
                                🚩 Agency
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 border-b">{a.position}</td>
                          <td className="px-4 py-2 border-b">{a.depot}</td>
                          <td className="px-4 py-2 border-b">{a.dateApplied}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 📄 Pagination Controls */}
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
              </div>

              {/* Right side */}
              <div className="col-span-1 flex flex-col gap-4 justify-start">
                <button className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 shadow">
                  View Job Postings
                </button>
                <button className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 shadow">
                  View Rejected Applicants
                </button>
              </div>
            </div>
          )}

          {/* ✅ Applicant Details */}
          {selectedApplicant && (
            <div className="mt-8 border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  Applicant Details
                </h3>
                <button
                  onClick={() => setShowActionModal(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Action
                </button>
              </div>
              <div className="grid grid-cols-2 gap-6">
                {/* Personal Info */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">
                    Personal Information
                  </h4>
                  <p>
                    <span className="font-medium">Name:</span>{" "}
                    {selectedApplicant.name}
                  </p>
                  <p>
                    <span className="font-medium">Email:</span>{" "}
                    {selectedApplicant.email}
                  </p>
                  <p>
                    <span className="font-medium">Phone:</span>{" "}
                    {selectedApplicant.phone}
                  </p>
                  <p>
                    <span className="font-medium">Address:</span>{" "}
                    {selectedApplicant.address}
                  </p>
                </div>

                {/* Job Info */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">
                    Job Details
                  </h4>
                  <p>
                    <span className="font-medium">Position:</span>{" "}
                    {selectedApplicant.position}
                  </p>
                  <p>
                    <span className="font-medium">Depot:</span>{" "}
                    {selectedApplicant.depot}
                  </p>
                  <p>
                    <span className="font-medium">Date Applied:</span>{" "}
                    {selectedApplicant.dateApplied}
                  </p>
                </div>
              </div>

              {/* ✅ Show summary */}
              {summary && (
                <div className="mt-6 bg-gray-100 p-4 rounded">
                  <h4 className="font-semibold mb-2">Summary</h4>
                  {"rejection" in summary ? (
                    <p>
                      <span className="font-medium">Rejection Remarks:</span>{" "}
                      {summary.rejection}
                    </p>
                  ) : (
                    <>
                      <p>
                        <span className="font-medium">Interview Date:</span>{" "}
                        {summary.date}
                      </p>
                      <p>
                        <span className="font-medium">Interview Time:</span>{" "}
                        {summary.time}
                      </p>
                      <p>
                        <span className="font-medium">Location:</span>{" "}
                        {summary.location}
                      </p>
                      <p>
                        <span className="font-medium">Interviewer:</span>{" "}
                        {summary.interviewer}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ✅ Action Modal */}
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
                <div className="flex justify-end gap-4 mt-4">
                  <button
                    onClick={() => setShowActionModal(false)}
                    className="px-4 py-2 bg-gray-300 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmInterview}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Confirm
                  </button>
                </div>
              </>
            )}

            {actionType === "reject" && (
              <>
                <h3 className="text-lg font-bold mb-2">Add Rejection Remarks</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Please share your feedback or reasons for rejecting this
                  applicant. This helps us maintain transparency and improve
                  future communications.
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
                    onClick={handleConfirmRejection}
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
    </>
  );
}

export default HrRecruitment;
