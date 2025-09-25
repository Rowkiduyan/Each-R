// src/ApplicantDetails.jsx
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Mail, Phone, Briefcase, MapPin, Calendar } from "lucide-react";

function ApplicantDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Application");

  const [showAction, setShowAction] = useState(false);
  const [showInterviewForm, setShowInterviewForm] = useState(false);
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const [interviewDetails, setInterviewDetails] = useState({
    date: "",
    time: "",
    location: "",
    interviewer: "",
  });

  const [rejectionRemarks, setRejectionRemarks] = useState("");
  const [isRejected, setIsRejected] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState(null); // "pass" or "reject"

  const [interviewFile, setInterviewFile] = useState(null);
  const [assessmentFile, setAssessmentFile] = useState(null);

  // Fake applicant data (replace with real data later)
  const applicant = {
    id,
    name: "Juan Dela Cruz",
    position: "Delivery Rider",
    depot: "Pasig Depot",
    dateApplied: "Jun 30, 2023",
    email: "juan@example.com",
    phone: "09123456789",
    department: "Logistics",
    employmentStatus: "Unemployed",
    startDate: "July 15, 2023",
    resume: "delacruzresume.pdf",
    address: "123 Pasig City, Metro Manila",
    sex: "Male",
    birthday: "January 1, 1995",
    age: 30,
    maritalStatus: "Single",
  };

  const steps = ["Application", "Assessment", "Requirements", "Agreements"];

  return (
    <div className="max-w-5xl mx-auto p-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center text-blue-600 hover:text-blue-800"
      >
        ← Back to Applicants
      </button>

      {/* Applicant Card */}
      <div className="bg-white shadow-lg rounded-2xl p-8 border relative">

        {/* Application Process Stepper */}
        <div className="flex justify-between items-center mb-6">
          {steps.map((step, index) => {
            // Step background color logic
            let bgClass = "bg-orange-400 text-white";
            if (step === "Application") bgClass = "bg-green-500 text-white";
            if (step === "Assessment" && assessmentResult === "pass") bgClass = "bg-green-500 text-white";
            if (assessmentResult === "reject" && step !== "Application") bgClass = "bg-red-500 text-white";

            // Disable other tabs if rejected
            const isDisabled = assessmentResult === "reject" && step !== "Application";

            return (
              <div
                key={index}
                onClick={() => !isDisabled && setActiveTab(step)}
                className={`flex-1 text-center py-2 rounded-lg mx-1 ${
                  isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                } ${bgClass}`}
              >
                {step}
              </div>
            );
          })}
        </div>

        {/* Rejected Badge */}
        {isRejected && (
          <span className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 text-sm font-bold rounded">
            REJECTED
          </span>
        )}

        {/* Tabs Content */}
        {activeTab === "Application" && (
          <>
            <h2 className="text-3xl font-bold mb-6 text-gray-800">{applicant.name}</h2>

            <h3 className="text-xl font-semibold mb-3 text-gray-700">Job Details</h3>
            <div className="grid md:grid-cols-2 gap-4 text-gray-700 mb-6">
              <p><strong>Department:</strong> {applicant.department}</p>
              <p><strong>Position Applying For:</strong> {applicant.position}</p>
              <p><strong>Depot:</strong> {applicant.depot}</p>
              <p><strong>Current Employment Status:</strong> {applicant.employmentStatus}</p>
              <p><strong>Available Start Date:</strong> {applicant.startDate}</p>
              <p><strong>Resume:</strong> {applicant.resume}</p>
              <p><strong>Date Applied:</strong> {applicant.dateApplied}</p>
            </div>

            <h3 className="text-xl font-semibold mb-3 text-gray-700">Personal Information</h3>
            <div className="grid md:grid-cols-2 gap-4 text-gray-700">
              <p><strong>Full Name:</strong> {applicant.name}</p>
              <p><strong>Address:</strong> {applicant.address}</p>
              <p><strong>Contact Number:</strong> {applicant.phone}</p>
              <p><strong>Email:</strong> {applicant.email}</p>
              <p><strong>Sex:</strong> {applicant.sex}</p>
              <p><strong>Birthday:</strong> {applicant.birthday}</p>
              <p><strong>Age:</strong> {applicant.age}</p>
              <p><strong>Marital Status:</strong> {applicant.maritalStatus}</p>
            </div>

            <div className="mt-8">
              <button
                onClick={() => setShowAction(true)}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition"
              >
                Take Action
              </button>
            </div>
          </>
        )}

        {activeTab === "Assessment" && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Assessment</h2>

            {interviewDetails.date ? (
              <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
                <p className="font-semibold mb-2">Interview Confirmed</p>
                <p><strong>Date:</strong> {interviewDetails.date}</p>
                <p><strong>Time:</strong> {interviewDetails.time}</p>
                <p><strong>Location:</strong> {interviewDetails.location}</p>
                <p><strong>Interviewer:</strong> {interviewDetails.interviewer}</p>
                <button
                  onClick={() => setShowInterviewForm(true)}
                  className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Schedule Another Interview
                </button>
              </div>
            ) : (
              <p>No interview scheduled yet.</p>
            )}

            <div className="mt-4 space-y-4">
              {/* Upload Interview Details */}
              <div>
                <label className="block mb-2 font-semibold">Upload Interview Details</label>
                <label className="inline-block px-3 py-1 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 border">
                  {interviewFile ? interviewFile.name : "Choose File"}
                  <input
                    type="file"
                    onChange={(e) => setInterviewFile(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Upload Assessment Results */}
              <div>
                <label className="block mb-2 font-semibold">Upload In-Person Assessment Results</label>
                <label className="inline-block px-3 py-1 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 border">
                  {assessmentFile ? assessmentFile.name : "Choose File"}
                  <input
                    type="file"
                    onChange={(e) => setAssessmentFile(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <button
              onClick={() => setShowAction(true)}
              className="absolute bottom-8 right-8 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition"
            >
              Take Action
            </button>
          </div>
        )}

        {activeTab === "Requirements" && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Requirements</h2>
            <p>Upload and manage applicant requirements here.</p>
          </div>
        )}

        {activeTab === "Agreements" && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Agreements</h2>
            <p>Manage applicant agreements here.</p>
          </div>
        )}
      </div>

      {/* === Modals === */}
      {showAction && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40">
          <div className="bg-white p-6 rounded-xl shadow-lg w-96">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Select an action</h3>
            <div className="flex justify-between">
              {activeTab === "Assessment" ? (
                <>
                  <button
                    onClick={() => {
                      setAssessmentResult("pass");
                      setIsRejected(false);
                      setShowAction(false);
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    Pass
                  </button>
                  <button
                    onClick={() => {
                      setAssessmentResult("reject");
                      setShowAction(false);
                      setShowRejectionForm(true);
                    }}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    Reject
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { setShowInterviewForm(true); setShowAction(false); }}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    Set Interview
                  </button>
                  <button
                    onClick={() => { setShowRejectionForm(true); setShowAction(false); }}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showInterviewForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40">
          <div className="bg-white p-6 rounded-xl shadow-lg w-96">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Add Interview Details</h3>
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                setShowInterviewForm(false);
                setShowSummary(true);
              }}
            >
              <input
                type="date"
                className="border p-2 rounded"
                value={interviewDetails.date}
                onChange={(e) => setInterviewDetails({ ...interviewDetails, date: e.target.value })}
              />
              <input
                type="time"
                className="border p-2 rounded"
                value={interviewDetails.time}
                onChange={(e) => setInterviewDetails({ ...interviewDetails, time: e.target.value })}
              />
              <input
                type="text"
                placeholder="Location"
                className="border p-2 rounded"
                value={interviewDetails.location}
                onChange={(e) => setInterviewDetails({ ...interviewDetails, location: e.target.value })}
              />
              <input
                type="text"
                placeholder="Interviewer"
                className="border p-2 rounded"
                value={interviewDetails.interviewer}
                onChange={(e) => setInterviewDetails({ ...interviewDetails, interviewer: e.target.value })}
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Confirm
              </button>
            </form>
          </div>
        </div>
      )}

      {showSummary && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40">
          <div className="bg-white p-6 rounded-xl shadow-lg w-96">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Interview Summary</h3>
            <div className="space-y-2 text-gray-700">
              <p><strong>Date:</strong> {interviewDetails.date}</p>
              <p><strong>Time:</strong> {interviewDetails.time}</p>
              <p><strong>Location:</strong> {interviewDetails.location}</p>
              <p><strong>Interviewer:</strong> {interviewDetails.interviewer}</p>
            </div>
            <button
              onClick={() => setShowSummary(false)}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {showRejectionForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40">
          <div className="bg-white p-6 rounded-xl shadow-lg w-96">
            <h3 className="text-lg font-bold mb-2 text-gray-800">Rejection Remarks</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please share your feedback for rejecting this applicant.
            </p>
            <textarea
              rows="4"
              className="border p-2 rounded w-full"
              placeholder="Enter remarks..."
              value={rejectionRemarks}
              onChange={(e) => setRejectionRemarks(e.target.value)}
            />
            <div className="flex justify-end gap-3 mt-3">
              <button
                onClick={() => setShowRejectionForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => { setIsRejected(true); setShowRejectionForm(false); setRejectionRemarks(""); }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ApplicantDetails;
