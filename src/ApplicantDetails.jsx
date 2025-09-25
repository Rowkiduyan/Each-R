// src/ApplicantDetails.jsx
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

function ApplicantDetails() {
  const { id } = useParams(); // ✅ get applicant ID from URL
  const navigate = useNavigate();

  // (For now, fake data – later you can fetch from backend or pass state)
  const applicant = {
    id,
    name: "Juan Dela Cruz",
    position: "Delivery Rider",
    depot: "Pasig Depot",
    dateApplied: "Jun 30, 2023",
    email: "juan@example.com",
    phone: "09123456789",
  };

  const [showAction, setShowAction] = useState(false);
  const [showInterviewForm, setShowInterviewForm] = useState(false);
  const [showRejectionForm, setShowRejectionForm] = useState(false);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow rounded-lg mt-6">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 text-blue-600 hover:underline"
      >
        ← Back
      </button>

      <h2 className="text-2xl font-bold mb-4">{applicant.name}</h2>
      <p><strong>Position:</strong> {applicant.position}</p>
      <p><strong>Depot:</strong> {applicant.depot}</p>
      <p><strong>Date Applied:</strong> {applicant.dateApplied}</p>
      <p><strong>Email:</strong> {applicant.email}</p>
      <p><strong>Phone:</strong> {applicant.phone}</p>

      {/* ✅ Action Button */}
      <div className="mt-6">
        <button
          onClick={() => setShowAction(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Action
        </button>
      </div>

      {/* ✅ Action Modal */}
      {showAction && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded shadow w-96">
            <h3 className="text-lg font-bold mb-4">
              Please select an action to proceed
            </h3>
            <div className="flex justify-between">
              <button
                onClick={() => {
                  setShowInterviewForm(true);
                  setShowAction(false);
                }}
                className="px-4 py-2 bg-green-500 text-white rounded"
              >
                Set Interview
              </button>
              <button
                onClick={() => {
                  setShowRejectionForm(true);
                  setShowAction(false);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Interview Form */}
      {showInterviewForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded shadow w-96">
            <h3 className="text-lg font-bold mb-4">Add Interview Details</h3>
            <form className="flex flex-col gap-3">
              <input type="date" className="border p-2 rounded" />
              <input type="time" className="border p-2 rounded" />
              <input type="text" placeholder="Location" className="border p-2 rounded" />
              <input type="text" placeholder="Interviewer" className="border p-2 rounded" />
              <button className="px-4 py-2 bg-blue-500 text-white rounded">
                Confirm
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ✅ Rejection Form */}
      {showRejectionForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded shadow w-96">
            <h3 className="text-lg font-bold mb-2">Add Rejection Remarks</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please share your feedback or reasons for rejecting this applicant. 
              This helps us maintain transparency and improve future communications.
            </p>
            <textarea
              rows="4"
              className="border p-2 rounded w-full"
              placeholder="Enter remarks..."
            />
            <button className="mt-3 px-4 py-2 bg-red-500 text-white rounded">
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApplicantDetails;
