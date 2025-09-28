// src/HrRecruitment.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

function HrRecruitment() {
  const navigate = useNavigate();
  const [activeSubTab, setActiveSubTab] = useState("Applications");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [showRejectedModal, setShowRejectedModal] = useState(false); // ✅ NEW

  const [interviewDetails, setInterviewDetails] = useState({
    date: "",
    time: "",
    location: "",
    interviewer: "",
  });

  const [rejectionRemarks, setRejectionRemarks] = useState("");
  const [rejectedApplicants, setRejectedApplicants] = useState([
    { id: 1, name: "Smith, John", position: "Driver", depot: "Manila Depot", dateApplied: "Jun 15, 2023", remarks: "Failed background check" },
    { id: 2, name: "Brown, Sarah", position: "Warehouse Staff", depot: "Cebu Depot", dateApplied: "Jun 20, 2023", remarks: "Insufficient experience" },
    { id: 3, name: "Wilson, Mike", position: "HR Assistant", depot: "Davao Depot", dateApplied: "Jun 25, 2023", remarks: "Did not meet qualifications" }
  ]); // ✅ NEW

  const itemsPerPage = 10;

  // Sample applicants
  const applicants = [
    { id: 1, name: "Dela Cruz, Juan", position: "Delivery Rider", depot: "Pasig Depot", dateApplied: "Jun 30, 2023", email: "juan.delacruz@example.com", phone: "09171234567", address: "Pasig City" },
    { id: 2, name: "Reyes, Maria", position: "Warehouse Staff", depot: "Cavite Depot", dateApplied: "Jul 02, 2023", email: "maria.reyes@example.com", phone: "09182345678", address: "Cavite City", agency: true },
    { id: 3, name: "Santos, Pedro", position: "Driver", depot: "Laguna Depot", dateApplied: "Jul 05, 2023", email: "pedro.santos@example.com", phone: "09193456789", address: "San Pedro, Laguna" },
    { id: 4, name: "Lopez, Ana", position: "HR Assistant", depot: "Quezon Depot", dateApplied: "Jul 08, 2023", email: "ana.lopez@example.com", phone: "09204567890", address: "Quezon City" },
    { id: 5, name: "Garcia, Mark", position: "Mechanic", depot: "Makati Depot", dateApplied: "Jul 10, 2023", email: "mark.garcia@example.com", phone: "09215678901", address: "Makati City" },
    { id: 6, name: "Torres, Liza", position: "Operations Supervisor", depot: "Cebu Depot", dateApplied: "Jul 12, 2023", email: "liza.torres@example.com", phone: "09226789012", address: "Cebu City" },
    { id: 7, name: "Mendoza, Carlo", position: "Dispatcher", depot: "Davao Depot", dateApplied: "Jul 15, 2023", email: "carlo.mendoza@example.com", phone: "09237890123", address: "Davao City", agency: true },
    { id: 8, name: "Fernandez, Grace", position: "Admin Staff", depot: "Iloilo Depot", dateApplied: "Jul 18, 2023", email: "grace.fernandez@example.com", phone: "09248901234", address: "Iloilo City" },
    // extra dummy applicants to lengthen list
    { id: 9, name: "Navarro, Luis", position: "Driver", depot: "Baguio Depot", dateApplied: "Jul 20, 2023", email: "luis.navarro@example.com", phone: "09170000001", address: "Baguio City" },
    { id: 10, name: "Aquino, Lea", position: "Warehouse Staff", depot: "Taguig Depot", dateApplied: "Jul 21, 2023", email: "lea.aquino@example.com", phone: "09170000002", address: "Taguig City" },
    { id: 11, name: "Cruz, Paolo", position: "Mechanic", depot: "Zamboanga Depot", dateApplied: "Jul 22, 2023", email: "paolo.cruz@example.com", phone: "09170000003", address: "Zamboanga City" },
    { id: 12, name: "Bautista, Rica", position: "HR Assistant", depot: "Laguna Depot", dateApplied: "Jul 23, 2023", email: "rica.bautista@example.com", phone: "09170000004", address: "Biñan, Laguna", agency: true },
    { id: 13, name: "Santiago, Noel", position: "Dispatcher", depot: "Cavite Depot", dateApplied: "Jul 24, 2023", email: "noel.santiago@example.com", phone: "09170000005", address: "Dasmariñas" },
    { id: 14, name: "Del Rosario, Mia", position: "Operations Supervisor", depot: "Cebu Depot", dateApplied: "Jul 25, 2023", email: "mia.delrosario@example.com", phone: "09170000006", address: "Cebu City" },
    { id: 15, name: "Villanueva, Art", position: "Driver", depot: "Quezon Depot", dateApplied: "Jul 26, 2023", email: "art.villanueva@example.com", phone: "09170000007", address: "Quezon City" },
  ];

  // 🔹 Stage data
  const agreements = applicants.slice(0, 3);
  const requirements = applicants.slice(3, 6);
  const finalAgreements = applicants.slice(6, 8);

  // 🔎 Search filter
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

  // Exclude agency applicants from Requirements step
  const filteredRequirements = requirements
    .filter((a) => !a.agency)
    .filter(
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

  // 📄 Pagination
  const totalPages = Math.ceil(filteredApplicants.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedApplicants = filteredApplicants.slice(
    startIndex,
    startIndex + itemsPerPage
  );

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
              <a
                href="#"
                className="text-gray-700 hover:text-red-600 font-medium"
              >
                Evaluation
              </a>
              <a
                href="#"
                className="text-gray-700 hover:text-red-600 font-medium"
              >
                Seperation
              </a>
              <a
                href="#"
                className="text-gray-700 hover:text-red-600 font-medium"
              >
                Notifications
              </a>
              <a
                href="#"
                className="text-gray-700 hover:text-red-600 font-medium"
              >
                Logout
              </a>
            </div>
            <span className="text-gray-700 font-semibold">Alexis Yvone</span>
          </div>
        </div>
      </nav>

      {/* ✅ Main Content */}
      <div className="flex justify-center items-start min-h-screen bg-gray-100">
        <div className="w-full max-w-6xl bg-white rounded-2xl shadow-lg p-6">
          {/* Sub Tabs */}
          <div className="flex gap-6 border-b mb-6 justify-center">
            {[
              { label: "Applications", count: applicants.length, show: true },
              { label: "Agreements", count: agreements.length, show: true },
              { label: "Requirements", count: filteredRequirements.length, show: filteredRequirements.length > 0 },
              { label: "Agreement", count: finalAgreements.length, show: true },
            ]
              .filter(t => t.show)
              .map((tab) => (
                <button
                  key={tab.label}
                  onClick={() => setActiveSubTab(tab.label)}
                  className={`px-6 py-3 font-medium ${
                    activeSubTab === tab.label
                      ? "border-b-2 border-blue-600 text-blue-600"
                      : "text-gray-600 hover:text-blue-600"
                  }`}
                >
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
                          onClick={() => navigate(`/hr/recruitment/applicant/${a.id}`, { state: { applicant: a } })}
                        >
                          <td className="px-4 py-2 border-b whitespace-nowrap">
                            <span className="cursor-pointer hover:text-blue-600 transition-colors">
                              {a.name}
                            </span>
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

                {/* Pagination */}
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
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>

              {/* Right Side */}
              <div className="col-span-1 flex flex-col gap-4 justify-start">
                <button 
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 shadow"
                  onClick={() => navigate('/applicantg/home')}
                >
                  View Job Postings
                </button>
                <button
                  onClick={() => setShowRejectedModal(true)} // ✅ opens rejected list
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
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAgreements.map((a) => (
                        <tr
                          key={a.id}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => navigate(`/hr/recruitment/applicant/${a.id}`, { state: { applicant: a } })}
                        >
                          <td className="px-4 py-2 border-b">{a.name}</td>
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
                  onClick={() => navigate('/applicantg/home')}
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

          {/* Requirements Tab - hidden when no non-agency applicants */}
          {activeSubTab === "Requirements" && filteredRequirements.length > 0 && (
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
                          onClick={() => navigate(`/hr/recruitment/applicant/${a.id}`, { state: { applicant: a } })}
                        >
                          <td className="px-4 py-2 border-b">{a.name}</td>
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
                  onClick={() => navigate('/applicantg/home')}
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

          {/* Final Agreement Tab */}
          {activeSubTab === "Agreement" && (
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2">
      <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800">Final Agreements</h3>
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
                      {filteredFinalAgreements.map((a) => (
                        <tr
                          key={a.id}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => navigate(`/hr/recruitment/applicant/${a.id}`, { state: { applicant: a } })}
                        >
                          <td className="px-4 py-2 border-b">{a.name}</td>
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
                  onClick={() => navigate('/applicantg/home')}
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
                    onChange={(e) => setInterviewDetails({ ...interviewDetails, date: e.target.value })}
                  />
                  <input
                    type="time"
                    className="w-full border rounded px-3 py-2"
                    value={interviewDetails.time}
                    onChange={(e) => setInterviewDetails({ ...interviewDetails, time: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Location"
                    className="w-full border rounded px-3 py-2"
                    value={interviewDetails.location}
                    onChange={(e) => setInterviewDetails({ ...interviewDetails, location: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Interviewer Name"
                    className="w-full border rounded px-3 py-2"
                    value={interviewDetails.interviewer}
                    onChange={(e) => setInterviewDetails({ ...interviewDetails, interviewer: e.target.value })}
                  />
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
                    onClick={() => setShowActionModal(false)}
                    className="px-4 py-2 bg-gray-300 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // ✅ Add rejected applicant
                      const rejectedApplicant = {
                        id: Date.now(),
                        name: "Unknown Applicant", // ideally, pass selected applicant’s data
                        remarks: rejectionRemarks,
                      };
                      setRejectedApplicants((prev) => [...prev, rejectedApplicant]);
                      console.log("Rejection submitted:", rejectionRemarks);
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

      {/* ✅ Rejected Applicants Modal */}
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
