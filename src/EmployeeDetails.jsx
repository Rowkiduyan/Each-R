// src/EmployeeDetails.jsx
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

function EmployeeDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const { employee: initialEmployee, employees: initialEmployees } = location.state || {};
  
  // State for employee list and selected employee
  const [employees, setEmployees] = useState(initialEmployees || []);
  const [selectedEmployee, setSelectedEmployee] = useState(initialEmployee || null);
  const [activeTab, setActiveTab] = useState("Profiling");
  const [loading, setLoading] = useState(!initialEmployees);

  // Load employees if not provided
  useEffect(() => {
    if (initialEmployees && initialEmployees.length > 0) {
      setEmployees(initialEmployees);
      if (initialEmployee) {
        setSelectedEmployee(initialEmployee);
      }
      setLoading(false);
      return;
    }

    const loadEmployees = async () => {
      setLoading(true);
      try {
        const { data: empRows, error } = await supabase
          .from("employees")
          .select("id, email, fname, lname, mname, contact_number, position, depot, role, hired_at, source, endorsed_by_agency_id, agency_profile_id")
          .order("hired_at", { ascending: false });

        if (error) throw error;

        const normalized = (empRows || []).map((row) => ({
          id: row.id,
          name: [row.fname, row.mname, row.lname].filter(Boolean).join(" ").trim() || row.email || "Unnamed",
          position: row.position || null,
          depot: row.depot || null,
          email: row.email || "",
          agency: (row.source && String(row.source).toLowerCase() === "agency") || !!row.agency_profile_id || !!row.endorsed_by_agency_id,
        }));

        setEmployees(normalized);
        if (initialEmployee) {
          const found = normalized.find(e => e.id === initialEmployee.id);
          if (found) {
            setSelectedEmployee(found);
          } else if (normalized.length > 0) {
            setSelectedEmployee(normalized[0]);
          }
        } else if (normalized.length > 0) {
          setSelectedEmployee(normalized[0]);
        }
      } catch (err) {
        console.error("Failed to load employees:", err);
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, [initialEmployee, initialEmployees]);

  // Tab content state
  const [evaluationDocs, setEvaluationDocs] = useState([
    { id: 1, name: "Evaluation", file: { name: "evaluation.pdf" }, url: "#", date: "2024-01-15", remarks: "Select", employeeType: "Select", locked: false }
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

  // Navigation helpers
  const getCurrentIndex = () => {
    if (!selectedEmployee) return -1;
    return employees.findIndex(e => e.id === selectedEmployee.id);
  };

  const handlePrev = () => {
    const currentIndex = getCurrentIndex();
    if (currentIndex > 0) {
      setSelectedEmployee(employees[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    const currentIndex = getCurrentIndex();
    if (currentIndex < employees.length - 1) {
      setSelectedEmployee(employees[currentIndex + 1]);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-start min-h-screen bg-gray-100 p-4">
        <div className="w-full max-w-7xl bg-white rounded-2xl shadow-lg p-6">
          <div className="p-6 text-gray-600">Loading employees…</div>
        </div>
      </div>
    );
  }

  if (!selectedEmployee && employees.length > 0) {
    setSelectedEmployee(employees[0]);
  }

  if (!selectedEmployee) {
    return (
      <div className="flex justify-center items-start min-h-screen bg-gray-100 p-4">
        <div className="w-full max-w-7xl bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">No Employee Selected</h2>
        <button
            onClick={() => navigate("/hr/employees")}
          className="px-4 py-2 bg-red-600 text-white rounded"
        >
          Back to Employee List
        </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-start min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-7xl bg-white rounded-2xl shadow-lg p-6">
        <div className="grid grid-cols-12 gap-4">
          {/* Left Sidebar - Employee List */}
          <div className="col-span-3 bg-gray-50 border rounded-lg p-4 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold text-gray-800 mb-3 text-sm">Employee List</h3>
            <div className="space-y-2">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp)}
                  className={`p-2 rounded cursor-pointer transition-colors text-xs ${
                    selectedEmployee.id === emp.id
                      ? "bg-blue-100 border-2 border-blue-500"
                      : "bg-white border border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <div className="font-semibold text-gray-800 truncate">{emp.name}</div>
                  <div className="text-gray-500 truncate">{emp.position || "—"}</div>
                  {emp.agency && (
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
                onClick={() => navigate("/hr/employees")}
                className="mb-4 flex items-center text-blue-600 hover:text-blue-800"
              >
                ← Back to Employees
              </button>
      </div>

      {/* Tabs */}
            <div className="flex items-center gap-3 mb-6 overflow-x-auto">
              {["Profiling", "Documents", "Onboarding", "Evaluation", "Separation"].map((tab) => {
                const isActive = activeTab === tab;
                let bgColor = 'bg-gray-200 text-gray-800 hover:bg-gray-300';
                
                if (isActive) {
                  bgColor = 'bg-red-600 text-white';
                }
                
                return (
          <button
            key={tab}
                    type="button"
            onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded ${bgColor}`}
          >
            {tab}
          </button>
                );
              })}
      </div>

            {/* Detail Content */}
            <div className="bg-white border rounded-md shadow-sm">
              {/* Profiling Tab */}
        {activeTab === "Profiling" && (
                <section className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                        {selectedEmployee.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{selectedEmployee.name}</div>
                        <div className="text-xs text-gray-500">#{selectedEmployee.id.slice(0, 8)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-md overflow-hidden">
                    <div className="bg-gray-100 text-gray-800 px-3 py-2 text-sm font-semibold border-b">Job Details</div>
                    <div className="p-3 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 border-b">
                      <div><span className="font-semibold">Position:</span> {selectedEmployee.position || "—"}</div>
                      <div><span className="font-semibold">Depot:</span> {selectedEmployee.depot || "—"}</div>
                      <div><span className="font-semibold">Employment Start Date:</span> 01/01/2023</div>
                      <div><span className="font-semibold">Resume:</span> <button className="text-blue-500 underline">View File</button></div>
                      <div><span className="font-semibold">Application Form:</span> <button className="text-blue-500 underline">View File</button></div>
                    </div>

                    <div className="bg-gray-100 text-gray-800 px-3 py-2 text-sm font-semibold border-b">Personal Information</div>
                    <div className="p-3 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                      <div><span className="font-semibold">Full Name:</span> {selectedEmployee.name}</div>
                      <div><span className="font-semibold">Email:</span> {selectedEmployee.email || "—"}</div>
                      <div><span className="font-semibold">Contact Number:</span> 09123456789</div>
                      <div><span className="font-semibold">Address:</span> 123 Example St, City</div>
                      <div><span className="font-semibold">Sex:</span> Male/Female</div>
                      <div><span className="font-semibold">Birthday:</span> 01/01/1990</div>
                      <div><span className="font-semibold">Age:</span> 33</div>
                      <div><span className="font-semibold">Marital Status:</span> Single</div>
                    </div>
                  </div>
                </section>
        )}

        {/* Documents Tab */}
        {activeTab === "Documents" && (
                <section className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                        {selectedEmployee.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{selectedEmployee.name}</div>
                        <div className="text-xs text-gray-500">#{selectedEmployee.id.slice(0, 8)}</div>
                      </div>
                    </div>
                    {selectedEmployee.agency && (
                <button
                  onClick={() => setShowRequestModal(true)}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                >
                  Request Additional File
                </button>
                    )}
                  </div>

                  <div className="bg-gray-100 text-gray-800 px-3 py-2 text-sm font-semibold border rounded-t-md">Document Name</div>
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-gray-600 border-b">
                    <div className="col-span-4">&nbsp;</div>
                    <div className="col-span-2">File</div>
                    <div className="col-span-2">Upload Date</div>
                    <div className="col-span-2">Remarks</div>
                    <div className="col-span-2">Action</div>
                  </div>

                  {(selectedEmployee.agency ? [...requiredDocs.filter(doc => doc.file), ...requestedDocs] : requiredDocs).map((doc) => {
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
                      <div key={doc.id} className="border-b">
                        <div className="grid grid-cols-12 items-center gap-3 px-3 py-3">
                          <div className="col-span-12 md:col-span-4 text-sm text-gray-800">{doc.name}</div>
                          <div className="col-span-12 md:col-span-2 text-sm text-gray-600">
                            {doc.file ? (
                                <a href={doc.previewUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                                  {doc.file.name}
                                </a>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </div>
                          <div className="col-span-12 md:col-span-2 text-sm text-gray-600">{doc.uploadedAt || "—"}</div>
                          <div className="col-span-12 md:col-span-2 text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${badgeClass}`}>{displayStatus}</span>
                          </div>
                          <div className="col-span-12 md:col-span-2 text-sm">
                            {doc.file ? (
                              <select
                                value={doc.status}
                                onChange={(e) => {
                                  const newStatus = e.target.value;
                                    setRequiredDocs((prev) =>
                                      prev.map((d) =>
                                        d.id === doc.id
                                        ? { ...d, status: newStatus, validatedAt: newStatus === "validated" ? new Date().toLocaleDateString() : null }
                                          : d
                                      )
                                    );
                                }}
                                className="px-2 py-1 border border-gray-300 rounded text-xs"
                              >
                                <option value="pending">Select Action</option>
                                <option value="validated">Validate</option>
                                <option value="resubmit">Resubmit</option>
                              </select>
                            ) : (
                              <span className="text-gray-500 text-xs">No Action</span>
                            )}
            </div>
          </div>
                      </div>
                    );
                  })}
                </section>
        )}

              {/* Onboarding Tab */}
{activeTab === "Onboarding" && (
                <section className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                        {selectedEmployee.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
  <div>
                        <div className="font-semibold text-gray-800">{selectedEmployee.name}</div>
                        <div className="text-xs text-gray-500">#{selectedEmployee.id.slice(0, 8)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-100 text-gray-800 px-3 py-2 text-sm font-semibold border rounded-t-md">Onboarding Items</div>
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-gray-600 border-b">
                    <div className="col-span-3">Item</div>
                    <div className="col-span-4">Description</div>
                    <div className="col-span-2">Date Issued</div>
                    <div className="col-span-3">Related Files</div>
                  </div>

        {onboardingItems.map((ob) => (
                    <div key={ob.id} className="border-b">
                      <div className="grid grid-cols-12 items-center gap-3 px-3 py-3">
                        <div className="col-span-12 md:col-span-3">
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
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div className="col-span-12 md:col-span-4">
              <input
                type="text"
                value={ob.description}
                onChange={(e) =>
                  setOnboardingItems((prev) =>
                    prev.map((item) =>
                                  item.id === ob.id ? { ...item, description: e.target.value } : item
                                )
                              )
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div className="col-span-12 md:col-span-2">
              <input
                type="date"
                            value={ob.date ? new Date(ob.date).toISOString().substring(0, 10) : ""}
                onChange={(e) =>
                  setOnboardingItems((prev) =>
                    prev.map((item) =>
                      item.id === ob.id ? { ...item, date: e.target.value } : item
                    )
                  )
                }
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div className="col-span-12 md:col-span-3 flex items-center justify-between">
                          <a href="#" className="text-blue-500 underline text-sm">{ob.file}</a>
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to delete this item?")) {
                                setOnboardingItems((prev) => prev.filter((item) => item.id !== ob.id));
                  }
                }}
                            className="ml-3 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-lg font-bold hover:bg-red-600"
              >
                ×
              </button>
                        </div>
                      </div>
                    </div>
        ))}

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
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 shadow text-sm"
      >
        + Add Item
      </button>
    </div>
                </section>
              )}

              {/* Evaluation Tab */}
              {activeTab === "Evaluation" && (
                <section className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                        {selectedEmployee.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>
                      <div>
                        <div className="font-semibold text-gray-800">{selectedEmployee.name}</div>
                        <div className="text-xs text-gray-500">#{selectedEmployee.id.slice(0, 8)}</div>
        </div>
                    </div>
        </div>

                  <div className="bg-gray-100 text-gray-800 px-3 py-2 text-sm font-semibold border rounded-t-md">Evaluation Documents</div>
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-gray-600 border-b">
                    <div className="col-span-3">Document Name</div>
                    <div className="col-span-2">File</div>
                    <div className="col-span-2">Upload Date</div>
                    <div className="col-span-2">Employee Type</div>
                    <div className="col-span-3">Remarks</div>
                </div>

                  {evaluationDocs.map((doc) => (
                    <div key={doc.id} className="border-b">
                      <div className="grid grid-cols-12 items-center gap-3 px-3 py-3">
                        <div className="col-span-12 md:col-span-3 text-sm text-gray-800">Evaluation</div>
                        <div className="col-span-12 md:col-span-2 text-sm text-gray-600">
                    {doc.file ? (
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                        {doc.file.name}
                      </a>
                    ) : (
                      <span className="text-gray-500">No File</span>
                    )}
                        </div>
                        <div className="col-span-12 md:col-span-2 text-sm text-gray-600">{doc.date || "—"}</div>
                        <div className="col-span-12 md:col-span-2 text-sm">
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
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                      >
                        <option value="Select">Select</option>
                        <option value="Regular">Regular</option>
                        <option value="Under Probation">Under Probation</option>
                      </select>
                    </div>
                        <div className="col-span-12 md:col-span-3 text-sm flex items-center gap-2">
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
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
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
                            className={`px-2 py-1 rounded text-xs ${
                          doc.locked 
                            ? "bg-red-500 text-white hover:bg-red-600" 
                            : "bg-green-500 text-white hover:bg-green-600"
                        }`}
                      >
                        {doc.locked ? "✗" : "✓"}
                      </button>
                    </div>
    </div>
                    </div>
                  ))}

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
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 shadow text-sm"
      >
        + Add Evaluation
      </button>
    </div>
                </section>
              )}

              {/* Separation Tab */}
              {activeTab === "Separation" && (
                <section className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                        {selectedEmployee.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{selectedEmployee.name}</div>
                        <div className="text-xs text-gray-500">#{selectedEmployee.id.slice(0, 8)}</div>
                      </div>
                    </div>
                  </div>

                  {terminationData ? (
                    <div className="text-gray-700">
                      <h3 className="font-bold text-lg mb-4">Separation Details:</h3>
                      <div className="mb-4">
                        <span className="font-bold">Separation Type:</span> {terminationData.type || "—"}
                      </div>
                      <div className="mb-4">
                        <span className="font-bold">Separation Date:</span> {terminationData.date || "—"}
                      </div>
                      <div className="mb-6">
                        <span className="font-bold">Remarks:</span> {terminationData.remarks || "—"}
                      </div>
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
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-gray-400 text-lg mb-2">📄</div>
                      <h3 className="text-lg font-medium text-gray-500 mb-2">No Separation Record</h3>
                      <p className="text-gray-400">This employee has no separation details yet.</p>
                    </div>
                  )}
                </section>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mt-6">
              <button
                onClick={handlePrev}
                disabled={getCurrentIndex() === 0}
                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 text-sm"
              >
                Prev
              </button>
              <button
                onClick={handleNext}
                disabled={getCurrentIndex() === employees.length - 1}
                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 text-sm"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals - keeping existing modals from original */}
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
                onClick={() => setShowRequestModal(false)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Request Files
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Options button and other modals - keeping from original */}
<button
  onClick={() => setShowOptions(!showOptions)}
  className="fixed bottom-6 right-6 bg-gray-800 text-white px-4 py-2 rounded-lg shadow hover:bg-gray-700 z-40"
>
  Options
</button>

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

      {/* Termination modals - keeping from original */}
{showTerminateModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
      <h3 className="text-lg font-bold mb-4">Terminate Employee</h3>
      <div className="mb-4">
        <label className="block font-medium">Name</label>
        <input
                value={selectedEmployee.name}
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

{showConfirmTerminate && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
      <h3 className="text-lg font-bold mb-4">Confirm Termination</h3>
      <div className="border border-gray-300 rounded-lg p-4 mb-4 bg-gray-50">
        <p className="text-gray-700">
                <span className="font-semibold">Name:</span> {selectedEmployee.name}
        </p>
        <p className="text-gray-700 mt-2">
                <span className="font-semibold">Position:</span> {selectedEmployee.position}
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
            setTerminationData({
              type: "termination",
              date: terminateDate,
              remarks: terminateRemarks,
              files: [...terminateFiles]
            });
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

{showSuccess && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-sm text-center shadow-lg">
            <h3 className="text-lg font-bold mb-2">Employee Termination Success</h3>
      <button
        onClick={() => setShowSuccess(false)}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        OK
      </button>
    </div>
  </div>
)}
    </div>
  );
}

export default EmployeeDetails;
