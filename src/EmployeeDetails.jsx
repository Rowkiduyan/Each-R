import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function EmployeeDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const { employee } = location.state || {};

  const [activeTab, setActiveTab] = useState("Profiling");

  if (!employee) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <h2 className="text-xl font-bold mb-4">No Employee Selected</h2>
        <button
          onClick={() => navigate("/employees")}
          className="px-4 py-2 bg-red-600 text-white rounded"
        >
          Back to Employee List
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Back Button */}
      <button
        onClick={() => navigate("/employees")}
        className="px-4 py-2 bg-gray-200 rounded mb-4"
      >
        ← Back
      </button>

      {/* Header */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-bold">{employee.name}</h2>
        <span className="text-gray-500">ID: {employee.id}</span>
        <div className="mt-2 text-gray-600">
          {employee.position} | {employee.depot}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-4">
        {["Profiling", "Documents", "Onboarding", "Evaluation", "Separation"].map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded ${
                activeTab === tab
                  ? "bg-red-600 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {tab}
            </button>
          )
        )}
      </div>

      {/* Tab Content */}
      <div className="bg-white shadow-md rounded-lg p-6">
        {activeTab === "Profiling" && (
          <>
            <h3 className="font-bold mb-2">Employment Details</h3>
            <ul className="mb-4 space-y-1">
              <li>
                <span className="font-bold">Department:</span> HR
              </li>
              <li>
                <span className="font-bold">Position:</span> {employee.position}
              </li>
              <li>
                <span className="font-bold">Depot:</span> {employee.depot}
              </li>
              <li>
                <span className="font-bold">Employment Start Date:</span> 01/01/2023
              </li>
              <li>
                <span className="font-bold">Resume:</span>{" "}
                <button className="text-blue-500 underline">View File</button>
              </li>
              <li>
                <span className="font-bold">Application Form:</span>{" "}
                <button className="text-blue-500 underline">View File</button>
              </li>
            </ul>

            <h3 className="font-bold mb-2">Personal Information</h3>
            <ul className="space-y-1">
              <li>
                <span className="font-bold">Full Name:</span> {employee.name}
              </li>
              <li>
                <span className="font-bold">Address:</span> 123 Example St, City
              </li>
              <li>
                <span className="font-bold">Contact Number:</span> 09123456789
              </li>
              <li>
                <span className="font-bold">Email:</span> example@email.com
              </li>
              <li>
                <span className="font-bold">Sex:</span> Male/Female
              </li>
              <li>
                <span className="font-bold">Birthday:</span> 01/01/1990
              </li>
              <li>
                <span className="font-bold">Age:</span> 33
              </li>
              <li>
                <span className="font-bold">Marital Status:</span> Single
              </li>
            </ul>
          </>
        )}
        {activeTab !== "Profiling" && (
          <div className="text-gray-500">
            Content for {activeTab} goes here...
          </div>
        )}
      </div>
    </div>
  );
}

export default EmployeeDetails;
