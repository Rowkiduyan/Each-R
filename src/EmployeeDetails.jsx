// src/EmployeeDetails.jsx
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function EmployeeDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const { employee } = location.state || {};
  
  // ✅ All hooks must be at the top
  const [activeTab, setActiveTab] = useState("Profiling");
  const [evaluationDocs, setEvaluationDocs] = useState([
    {
      id: 1,
      name: "Evaluation",
      file: { name: "evaluation.pdf" },
      url: "#",
      date: "2024-01-15",
      remarks: "Select",
      employeeType: "Select",
      locked: false
    }
  ]);
  const [requiredDocs, setRequiredDocs] = useState([
    { id: "psa", name: "PSA Birth Cert", file: { name: "PSABirthcert.pdf" }, previewUrl: "#", uploadedAt: "2024-01-15", status: "pending", validatedAt: null },
    { id: "dlicense", name: "Photocopy of Drivers License (Front and Back)", file: null, previewUrl: null, uploadedAt: null, status: "pending", validatedAt: null },
    { id: "sss", name: "Photocopy of SSS ID", file: null, previewUrl: null, uploadedAt: null, status: "pending", validatedAt: null },
    { id: "nbi", name: "NBI Clearance", file: { name: "NBIClearance.pdf" }, previewUrl: "#", uploadedAt: "2024-01-20", status: "pending", validatedAt: null },
    { id: "police", name: "Police Clearance", file: null, previewUrl: null, uploadedAt: null, status: "pending", validatedAt: null },
    { id: "drivetest", name: "Drive Test", file: { name: "DriveTest.pdf" }, previewUrl: "#", uploadedAt: "2024-01-25", status: "pending", validatedAt: null },
  ]);
  
  const [requestedDocs, setRequestedDocs] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [terminationData, setTerminationData] = useState(null);

  const [onboardingItems, setOnboardingItems] = useState([
    { id: 1, item: "Uniform", description: "Company Shirt", date: "9/20/25", file: "file.pdf" },
    { id: 2, item: "Laptop", description: "Lenovo 8GB RAM", date: "9/21/25", file: "file.pdf" },
  ]);

  const [showOptions, setShowOptions] = useState(false);
const [showTerminateModal, setShowTerminateModal] = useState(false);
const [showConfirmTerminate, setShowConfirmTerminate] = useState(false);
const [showSuccess, setShowSuccess] = useState(false);
const [terminateFiles, setTerminateFiles] = useState([]);
const [terminateDate, setTerminateDate] = useState("");
const [terminateRemarks, setTerminateRemarks] = useState("");

  

  // === Handlers ===




  // ✅ Fallback UI for no employee
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
    <div className="max-w-7xl mx-auto p-6 relative">
      <button
        onClick={() => navigate("/hr/employees")}
        className="px-4 py-2 bg-gray-200 rounded mb-4"
      >
        ← Back
      </button>

      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">{employee.name}</h2>
          {employee.agency && (
            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 align-middle">
              <span className="text-red-500">⚑</span>
              Agency
            </span>
          )}
        </div>
        <span className="text-gray-500">ID: {employee.id}</span>
        <div className="mt-2 text-gray-600">
          {employee.position} | {employee.depot}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-4">
        {["Profiling", "Documents", "Onboarding", "Evaluation", "Separation"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded ${
              activeTab === tab ? "bg-red-600 text-white" : "bg-gray-200 text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white shadow-md rounded-lg p-6">
        {/* Profiling */}
        {activeTab === "Profiling" && (
          <>
            <h3 className="font-bold mb-2">Employment Details</h3>
            <ul className="mb-4 space-y-1">
              <li><span className="font-bold">Department:</span> HR</li>
              <li><span className="font-bold">Position:</span> {employee.position}</li>
              <li><span className="font-bold">Depot:</span> {employee.depot}</li>
              <li><span className="font-bold">Employment Start Date:</span> 01/01/2023</li>
              <li><span className="font-bold">Resume:</span> <button className="text-blue-500 underline">View File</button></li>
              <li><span className="font-bold">Application Form:</span> <button className="text-blue-500 underline">View File</button></li>
            </ul>

            <h3 className="font-bold mb-2">Personal Information</h3>
            <ul className="space-y-1">
              <li><span className="font-bold">Full Name:</span> {employee.name}</li>
              <li><span className="font-bold">Address:</span> 123 Example St, City</li>
              <li><span className="font-bold">Contact Number:</span> 09123456789</li>
              <li><span className="font-bold">Email:</span> example@email.com</li>
              <li><span className="font-bold">Sex:</span> Male/Female</li>
              <li><span className="font-bold">Birthday:</span> 01/01/1990</li>
              <li><span className="font-bold">Age:</span> 33</li>
              <li><span className="font-bold">Marital Status:</span> Single</li>
            </ul>
          </>
        )}

        {/* Documents Tab */}
        {activeTab === "Documents" && (
          <div className="text-gray-700">

            {/* Documents */}
            <h3 className="font-bold mb-3">Documents</h3>
            
            {/* Request Additional File Button - Only for Agency Employees */}
            {employee.agency && (
              <div className="mb-4">
                <button
                  onClick={() => setShowRequestModal(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Request Additional File
                </button>
              </div>
            )}
            
            <div className="overflow-x-auto mb-6">
              <table className="w-full border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-4 py-2 text-left">Document Name</th>
                    <th className="border px-4 py-2 text-left">File</th>
                    <th className="border px-4 py-2 text-left">Upload Date</th>
                    <th className="border px-4 py-2 text-left">Remarks</th>
                    <th className="border px-4 py-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Show only submitted documents and requested documents for agency employees */}
                  {employee.agency ? (
                    // For agency employees: show submitted docs + requested docs
                    [...requiredDocs.filter(doc => doc.file), ...requestedDocs].map((doc) => {
                      const displayStatus = doc.status === "validated" ? "Validated" : 
                                          doc.status === "resubmit" ? "Re-submit" : 
                                          doc.status === "requested" ? "Requested" :
                                          doc.file ? "Submitted" : "No File";
                      const badgeClass =
                        doc.status === "validated"
                          ? "bg-green-100 text-green-700"
                          : doc.status === "resubmit"
                          ? "bg-red-100 text-red-700"
                          : doc.status === "requested"
                          ? "bg-yellow-100 text-yellow-700"
                          : doc.file
                          ? "bg-orange-100 text-orange-700"
                          : "bg-gray-100 text-gray-700";
                      return (
                        <tr key={doc.id} className="hover:bg-gray-50">
                          <td className="border px-4 py-2 font-medium">{doc.name}</td>
                          <td className="border px-4 py-2">
                            {doc.file ? (
                                <a href={doc.previewUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                                  {doc.file.name}
                                </a>
                            ) : (
                              <span className="text-gray-500">No File</span>
                            )}
                          </td>
                          <td className="border px-4 py-2">{doc.uploadedAt || "—"}</td>
                          <td className="border px-4 py-2">
                            <span className={`px-2 py-1 rounded text-sm font-semibold ${badgeClass}`}>{displayStatus}</span>
                            {doc.status === "validated" && doc.validatedAt && (
                              <div className="text-xs mt-1 text-black">Validated on {doc.validatedAt}</div>
                            )}
                          </td>
                          <td className="border px-4 py-2">
                            {doc.file ? (
                              <select
                                value={doc.status}
                                onChange={(e) => {
                                  const newStatus = e.target.value;
                                  if (newStatus === "validated") {
                                    setRequiredDocs((prev) =>
                                      prev.map((d) =>
                                        d.id === doc.id
                                          ? { ...d, status: "validated", validatedAt: new Date().toLocaleDateString() }
                                          : d
                                      )
                                    );
                                  } else if (newStatus === "resubmit") {
                                    setRequiredDocs((prev) =>
                                      prev.map((d) =>
                                        d.id === doc.id
                                          ? { ...d, status: "resubmit", validatedAt: null }
                                          : d
                                      )
                                    );
                                  } else {
                                    setRequiredDocs((prev) =>
                                      prev.map((d) =>
                                        d.id === doc.id
                                          ? { ...d, status: "pending", validatedAt: null }
                                          : d
                                      )
                                    );
                                  }
                                }}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value="pending">Select Action</option>
                                <option value="validated">Validate</option>
                                <option value="resubmit">Resubmit</option>
                              </select>
                            ) : (
                              <span className="text-gray-500 text-sm">No Action</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    // For regular employees: show all documents as before
                    requiredDocs.map((doc) => {
                      const displayStatus = doc.status === "validated" ? "Validated" : doc.status === "resubmit" ? "Re-submit" : doc.file ? "Submitted" : "No File";
                      const badgeClass =
                        doc.status === "validated"
                          ? "bg-green-100 text-green-700"
                          : doc.status === "resubmit"
                          ? "bg-red-100 text-red-700"
                          : doc.file
                          ? "bg-orange-100 text-orange-700"
                          : "bg-gray-100 text-gray-700";
                      return (
                        <tr key={doc.id} className="hover:bg-gray-50">
                          <td className="border px-4 py-2 font-medium">{doc.name}</td>
                          <td className="border px-4 py-2">
                            {doc.file ? (
                                <a href={doc.previewUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                                  {doc.file.name}
                                </a>
                            ) : (
                              <span className="text-gray-500">No File</span>
                            )}
                          </td>
                          <td className="border px-4 py-2">{doc.uploadedAt || "—"}</td>
                          <td className="border px-4 py-2">
                            <span className={`px-2 py-1 rounded text-sm font-semibold ${badgeClass}`}>{displayStatus}</span>
                            {!doc.file && <div className="text-xs text-red-500 mt-1">Late for 8 Days</div>}
                            {doc.status === "validated" && doc.validatedAt && (
                              <div className="text-xs mt-1 text-black">Validated on {doc.validatedAt}</div>
                            )}
                          </td>
                          <td className="border px-4 py-2">
                            {doc.file ? (
                              <select
                                value={doc.status}
                                onChange={(e) => {
                                  const newStatus = e.target.value;
                                  if (newStatus === "validated") {
                                    setRequiredDocs((prev) =>
                                      prev.map((d) =>
                                        d.id === doc.id
                                          ? { ...d, status: "validated", validatedAt: new Date().toLocaleDateString() }
                                          : d
                                      )
                                    );
                                  } else if (newStatus === "resubmit") {
                                    setRequiredDocs((prev) =>
                                      prev.map((d) =>
                                        d.id === doc.id
                                          ? { ...d, status: "resubmit", validatedAt: null }
                                          : d
                                      )
                                    );
                                  } else {
                                    setRequiredDocs((prev) =>
                                      prev.map((d) =>
                                        d.id === doc.id
                                          ? { ...d, status: "pending", validatedAt: null }
                                          : d
                                      )
                                    );
                                  }
                                }}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value="pending">Select Action</option>
                                <option value="validated">Validate</option>
                                <option value="resubmit">Resubmit</option>
                              </select>
                            ) : (
                              <span className="text-gray-500 text-sm">No Action</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>


          </div>
        )}

{activeTab === "Onboarding" && (
  <div>
    <h3 className="text-lg font-bold mb-4">Onboarding Items</h3>
    <table className="w-full border-collapse text-sm">
      <thead className="bg-gray-100">
        <tr>
          <th className="border border-gray-300 font-medium px-3 py-2 text-left">
            Item
          </th>
          <th className="border border-gray-300 font-medium px-3 py-2 text-left">
            Description
          </th>
          <th className="border border-gray-300 font-medium px-3 py-2 text-left">
            Date Issued
          </th>
          <th className="border border-gray-300 font-medium px-3 py-2 text-left">
            Related Files
          </th>
        </tr>
      </thead>
      <tbody>
        {onboardingItems.map((ob) => (
          <tr key={ob.id} className="hover:bg-gray-50 relative">
            {/* Item */}
            <td className="border border-gray-300 px-3 py-2">
              <input
                type="text"
                value={ob.item}
                onChange={(e) =>
                  setOnboardingItems((prev) =>
                    prev.map((item) =>
                      item.id === ob.id ? { ...item, item: e.target.value } : item
                    )
                  )
                }
                className="w-full border border-gray-300 rounded px-2 py-1"
              />
            </td>

            {/* Description */}
            <td className="border border-gray-300 px-3 py-2">
              <input
                type="text"
                value={ob.description}
                onChange={(e) =>
                  setOnboardingItems((prev) =>
                    prev.map((item) =>
                      item.id === ob.id
                        ? { ...item, description: e.target.value }
                        : item
                    )
                  )
                }
                className="w-full border border-gray-300 rounded px-2 py-1"
              />
            </td>

            {/* Date Issued */}
            <td className="border border-gray-300 px-3 py-2">
              <input
                type="date"
                value={
                  ob.date
                    ? new Date(ob.date).toISOString().substring(0, 10)
                    : ""
                }
                onChange={(e) =>
                  setOnboardingItems((prev) =>
                    prev.map((item) =>
                      item.id === ob.id ? { ...item, date: e.target.value } : item
                    )
                  )
                }
                className="w-full border border-gray-300 rounded px-2 py-1"
              />
            </td>

            {/* Related Files + Remove Button */}
            <td className="border border-gray-300 px-3 py-2 flex items-center justify-between relative">
              <a href="#" className="text-blue-500 underline">
                {ob.file}
              </a>
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to delete this item?")) {
                    setOnboardingItems((prev) =>
                      prev.filter((item) => item.id !== ob.id)
                    );
                  }
                }}
                className="ml-3 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-lg font-bold hover:bg-red-600 shadow"
                title="Remove item"
              >
                ×
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>

    {/* Add Item Button */}
    <div className="mt-4 flex justify-end">
      <button
        onClick={() =>
          setOnboardingItems((prev) => [
            ...prev,
            {
              id: Date.now(),
              item: `New Item ${prev.length + 1}`,
              description: "Description here",
              date: new Date().toISOString().substring(0, 10),
              file: "file.pdf",
            },
          ])
        }
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 shadow"
      >
        + Add Item
      </button>
    </div>
  </div>
)}









{activeTab === "Separation" && (
  <div className="text-gray-700">
    {terminationData ? (
      <>
        <h3 className="font-bold text-lg mb-4">Separation Details:</h3>

        {/* Separation Type */}
        <div className="mb-4">
          <span className="font-bold">Separation Type:</span> {terminationData.type || "—"}
        </div>

        {/* Separation Date */}
        <div className="mb-4">
          <span className="font-bold">Separation Date:</span> {terminationData.date || "—"}
        </div>

        {/* Remarks */}
        <div className="mb-6">
          <span className="font-bold">Remarks:</span> {terminationData.remarks || "—"}
        </div>

        {/* File Viewing Area */}
        <h4 className="font-semibold mb-3">Related Documents</h4>
        <div className="space-y-4">
          {terminationData.files && terminationData.files.length > 0 ? (
            terminationData.files.map((file, idx) => (
              <div key={idx} className="border rounded-lg p-4 shadow-sm">
                <label className="block font-medium mb-2">{file.name}</label>
                <div className="flex items-center gap-2">
                  <a href="#" className="text-blue-500 underline">{file.name}</a>
                  <span className="text-sm text-gray-500">({new Date().toLocaleDateString()})</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-gray-400 text-lg mb-2">📄</div>
              <p>No related documents uploaded yet.</p>
            </div>
          )}
        </div>
      </>
    ) : (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-2">📄</div>
        <h3 className="text-lg font-medium text-gray-500 mb-2">No Separation Record</h3>
        <p className="text-gray-400">This employee has no separation details yet.</p>
      </div>
    )}
  </div>
)}

{activeTab === "Evaluation" && (
  <div className="p-6 bg-white rounded-2xl shadow-lg">
    <h3 className="text-xl font-bold mb-6 text-gray-800">Evaluation Documents</h3>

    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className="min-w-full border-collapse">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="px-4 py-3 border-b text-left font-semibold">Document Name</th>
            <th className="px-4 py-3 border-b text-left font-semibold">File</th>
            <th className="px-4 py-3 border-b text-left font-semibold">Upload Date</th>
            <th className="px-4 py-3 border-b text-left font-semibold">Employee Type</th>
            <th className="px-4 py-3 border-b text-left font-semibold">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {evaluationDocs.length === 0 ? (
            <tr>
              <td colSpan="5" className="py-6 text-center text-gray-500">
                No evaluation documents yet.
              </td>
            </tr>
          ) : (
            evaluationDocs.map((doc) => {
              return (
                <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 border-b font-medium">Evaluation</td>
                  <td className="px-4 py-3 border-b">
                    {doc.file ? (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 underline"
                      >
                        {doc.file.name}
                      </a>
                    ) : (
                      <span className="text-gray-500">No File</span>
                    )}
                  </td>
                  <td className="px-4 py-3 border-b">{doc.date || "—"}</td>
                  <td className="px-4 py-3 border-b">
                    <div className="flex items-center gap-2">
                      <select 
                        value={doc.employeeType || "Select"} 
                        onChange={(e) => {
                          setEvaluationDocs((prev) =>
                            prev.map((d) =>
                              d.id === doc.id ? { ...d, employeeType: e.target.value } : d
                            )
                          );
                        }}
                        disabled={doc.locked}
                        className="px-2 py-1 border border-gray-300 rounded text-sm flex-1"
                      >
                        <option value="Select">Select</option>
                        <option value="Regular">Regular</option>
                        <option value="Under Probation">Under Probation</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b">
                    <div className="flex items-center gap-2">
                      <select 
                        value={doc.remarks || "Select"} 
                        onChange={(e) => {
                          setEvaluationDocs((prev) =>
                            prev.map((d) =>
                              d.id === doc.id ? { ...d, remarks: e.target.value } : d
                            )
                          );
                        }}
                        disabled={doc.locked}
                        className="px-2 py-1 border border-gray-300 rounded text-sm flex-1"
                      >
                        <option value="Select">Select</option>
                        <option value="Retained">Retained</option>
                        <option value="Observed">Observed</option>
                      </select>
                      <button
                        onClick={() => {
                          setEvaluationDocs((prev) =>
                            prev.map((d) =>
                              d.id === doc.id ? { ...d, locked: !d.locked } : d
                            )
                          );
                        }}
                        className={`px-2 py-1 rounded text-sm ${
                          doc.locked 
                            ? "bg-red-500 text-white hover:bg-red-600" 
                            : "bg-green-500 text-white hover:bg-green-600"
                        }`}
                      >
                        {doc.locked ? "✗" : "✓"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>

    <div className="mt-4 flex justify-end">
      <button
        onClick={() =>
          setEvaluationDocs((prev) => [
            ...prev,
            {
              id: Date.now(),
              name: "Evaluation",
              file: null,
              url: null,
              date: null,
              remarks: "Select",
              employeeType: "Select",
              locked: false,
            },
          ])
        }
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 shadow"
      >
        + Add Evaluation
      </button>
    </div>
  </div>
)}





      </div>
      {/* === Options Button Bottom Left === */}
<button
  onClick={() => setShowOptions(!showOptions)}
  className="fixed bottom-6 right-6 bg-gray-800 text-white px-4 py-2 rounded-lg shadow hover:bg-gray-700 z-40"
>
  Options
</button>

{/* Options Dropdown */}
{showOptions && (
  <div className="fixed bottom-20 right-6 bg-white shadow-lg rounded-lg border w-56 z-40">
    <ul className="divide-y divide-gray-200">
      <li>
        <button
          onClick={() => {
            setShowOptions(false);
            setShowTerminateModal(true);
          }}
          className="w-full text-left px-4 py-2 hover:bg-gray-100"
        >
          Terminate
        </button>
      </li>
      <li>
        <button
          onClick={() => {
            setShowOptions(false);
            alert("Edit Information logic here.");
          }}
          className="w-full text-left px-4 py-2 hover:bg-gray-100"
        >
          Edit Information
        </button>
      </li>
    </ul>
  </div>
)}

{/* === Request Termination Modal Step 1 === */}
{showTerminateModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
      <h3 className="text-lg font-bold mb-4">Terminate Employee</h3>
      <div className="mb-4">
        <label className="block font-medium">Name</label>
        <input
          value={employee.name}
          readOnly
          className="w-full border rounded px-3 py-2 bg-gray-100"
        />
      </div>
      <div className="mb-4">
  <label className="block font-medium mb-1">Separation Date</label>
  <input
    type="date"
    value={terminateDate}
    onChange={(e) => setTerminateDate(e.target.value)}
    className="border rounded px-3 py-2 w-full"
  />
  {terminateDate && (
    <p className="text-sm text-gray-500 mt-1">
      Selected Terminate Date: {terminateDate}
    </p>
  )}
</div>
      <div className="mb-4">
        <label className="block font-medium mb-2">Upload Related Documents</label>
        <label className="inline-block bg-blue-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-600">
          + Add File
          <input
            type="file"
            multiple
            onChange={(e) => setTerminateFiles([...terminateFiles, ...e.target.files])}
            className="hidden"
          />
        </label>
        <ul className="mt-2 text-sm text-gray-700">
          {terminateFiles.map((file, idx) => (
            <li key={idx}>{file.name}</li>
          ))}
        </ul>
      </div>
      <div className="mb-4">
        <label className="block font-medium mb-1">Remarks</label>
        <textarea
          rows="3"
          placeholder="Enter termination remarks..."
          value={terminateRemarks}
          onChange={(e) => setTerminateRemarks(e.target.value)}
          className="border rounded px-3 py-2 w-full"
        />
      </div>
      <div className="flex justify-end gap-3">
        <button
          onClick={() => {
            setShowTerminateModal(false);
            setTerminateFiles([]);
            setTerminateDate("");
            setTerminateRemarks("");
          }}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            setShowTerminateModal(false);
            setShowConfirmTerminate(true);
          }}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Continue
        </button>
      </div>
    </div>
  </div>
)}

{/* === Confirm Termination Step 2 === */}
{showConfirmTerminate && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
      <h3 className="text-lg font-bold mb-4">Confirm Termination</h3>

      {/* 🔷 Employee details box */}
      <div className="border border-gray-300 rounded-lg p-4 mb-4 bg-gray-50">
        <p className="text-gray-700">
          <span className="font-semibold">Name:</span> {employee.name}
        </p>
        <p className="text-gray-700 mt-2">
          <span className="font-semibold">Position:</span> {employee.position}
        </p>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={() => setShowConfirmTerminate(false)}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            setShowConfirmTerminate(false);
            setShowSuccess(true);
            // Populate termination data for the Separation tab
            setTerminationData({
              type: "termination",
              date: terminateDate,
              remarks: terminateRemarks,
              files: [...terminateFiles]
            });
            // Clear termination form data
            setTerminateFiles([]);
            setTerminateDate("");
            setTerminateRemarks("");
          }}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
)}


{/* === Success Box Step 3 === */}
{showSuccess && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-sm text-center shadow-lg">
      <h3 className="text-lg font-bold mb-2">
        Employee Termination Success
      </h3>
      <button
        onClick={() => setShowSuccess(false)}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        OK
      </button>
    </div>
  </div>
)}

{/* === Request Additional File Modal === */}
{showRequestModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
      <h3 className="text-lg font-bold mb-4">Request Additional File</h3>
      <p className="text-sm text-gray-600 mb-4">Select documents to request from the employee:</p>
      
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {[
          { id: "psa", name: "PSA Birth Cert" },
          { id: "dlicense", name: "Photocopy of Drivers License (Front and Back)" },
          { id: "sss", name: "Photocopy of SSS ID" },
          { id: "nbi", name: "NBI Clearance" },
          { id: "police", name: "Police Clearance" },
          { id: "drivetest", name: "Drive Test" },
          { id: "sss_no", name: "SSS No." },
          { id: "philhealth_no", name: "PhilHealth No." },
          { id: "pagibig_no", name: "Pag-IBIG No." },
          { id: "tin_no", name: "TIN No." }
        ].map((doc) => {
          const isAlreadySubmitted = requiredDocs.some(d => d.id === doc.id && d.file);
          const isAlreadyRequested = requestedDocs.some(d => d.id === doc.id);
          const isDisabled = isAlreadySubmitted || isAlreadyRequested;
          
          return (
            <label key={doc.id} className={`flex items-center p-2 rounded border ${
              isDisabled ? 'bg-gray-100 text-gray-400' : 'hover:bg-gray-50'
            }`}>
              <input
                type="checkbox"
                disabled={isDisabled}
                onChange={(e) => {
                  if (e.target.checked) {
                    setRequestedDocs(prev => [...prev, {
                      id: doc.id,
                      name: doc.name,
                      file: null,
                      previewUrl: null,
                      uploadedAt: null,
                      status: "requested",
                      validatedAt: null
                    }]);
                  } else {
                    setRequestedDocs(prev => prev.filter(d => d.id !== doc.id));
                  }
                }}
                className="mr-3"
              />
              <span className="text-sm">
                {doc.name}
                {isAlreadySubmitted && <span className="text-green-600 ml-2">(Already Submitted)</span>}
                {isAlreadyRequested && <span className="text-yellow-600 ml-2">(Already Requested)</span>}
              </span>
            </label>
          );
        })}
      </div>
      
      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={() => {
            setShowRequestModal(false);
            setRequestedDocs([]);
          }}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            setShowRequestModal(false);
            // The requestedDocs state is already updated by the checkboxes
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Request Files
        </button>
      </div>
    </div>
  </div>
)}

      
    </div>
  );
}

export default EmployeeDetails;
