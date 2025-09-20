// src/EmployeeDetails.jsx
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function EmployeeDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const { employee } = location.state || {};
  

  // ✅ All hooks must be at the top
  const [activeTab, setActiveTab] = useState("Profiling");
  const [documents, setDocuments] = useState([]);
  const [evaluationDocs, setEvaluationDocs] = useState([]);
  const [validations, setValidations] = useState({
    sss: false,
    philhealth: false,
    pagibig: false,
    tin: false,
  });
  const [validationDates, setValidationDates] = useState({
    sss: null,
    philhealth: null,
    pagibig: null,
    tin: null,
  });
  const [requiredDocs, setRequiredDocs] = useState([
    { id: "psa", name: "PSA Birth Cert", file: null, previewUrl: null, uploadedAt: null, validated: false, validatedAt: null },
    { id: "dlicense", name: "Photocopy of Drivers License (Front and Back)", file: null, previewUrl: null, uploadedAt: null, validated: false, validatedAt: null },
    { id: "sss", name: "Photocopy of SSS ID", file: null, previewUrl: null, uploadedAt: null, validated: false, validatedAt: null },
    { id: "nbi", name: "NBI Clearance", file: null, previewUrl: null, uploadedAt: null, validated: false, validatedAt: null },
    { id: "police", name: "Police Clearance", file: null, previewUrl: null, uploadedAt: null, validated: false, validatedAt: null },
    { id: "drivetest", name: "Drive Test", file: null, previewUrl: null, uploadedAt: null, validated: false, validatedAt: null },
  ]);
  const [confirmReqDocId, setConfirmReqDocId] = useState(null);

  const [onboardingItems, setOnboardingItems] = useState([
    { id: 1, item: "Uniform", description: "Company Shirt", date: "9/20/25", file: "file.pdf" },
    { id: 2, item: "Laptop", description: "Lenovo 8GB RAM", date: "9/21/25", file: "file.pdf" },
  ]);

  

  // === Handlers ===
  const toggleValidation = (key) => {
    setValidations((prev) => {
      const next = !prev[key];
      setValidationDates((prevDates) => ({
        ...prevDates,
        [key]: next ? new Date().toLocaleDateString() : null,
      }));
      return { ...prev, [key]: next };
    });
  };

  const handleUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newDocs = files.map((file, i) => ({
      id: Date.now() + "-" + i,
      name: file.name,
      url: URL.createObjectURL(file),
      date: new Date().toLocaleDateString(),
    }));
    setDocuments((prev) => [...prev, ...newDocs]);
  };

  const handleRemove = (id) => {
    const doc = documents.find((d) => d.id === id);
    if (doc) URL.revokeObjectURL(doc.url);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleReqFileUpload = (e, id) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setRequiredDocs((prev) =>
      prev.map((doc) =>
        doc.id === id
          ? { ...doc, file, previewUrl: URL.createObjectURL(file), uploadedAt: new Date().toLocaleDateString() }
          : doc
      )
    );
  };

  const requestValidateReqDoc = (id) => setConfirmReqDocId(id);
  const confirmValidateReqDoc = () => {
    if (!confirmReqDocId) return;
    setRequiredDocs((prev) =>
      prev.map((doc) =>
        doc.id === confirmReqDocId
          ? { ...doc, validated: true, validatedAt: new Date().toLocaleDateString() }
          : doc
      )
    );
    setConfirmReqDocId(null);
  };
  const cancelValidateReqDoc = () => setConfirmReqDocId(null);

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
        onClick={() => navigate("/employees")}
        className="px-4 py-2 bg-gray-200 rounded mb-4"
      >
        ← Back
      </button>

      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-bold">{employee.name}</h2>
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
            {/* Mandatory Numbers */}
            <div className="bg-gray-50 border rounded-lg p-4 mb-6 shadow-sm">
              <h4 className="font-semibold text-gray-800 mb-3">Mandatory Numbers</h4>
              {[
                { key: "sss", label: "SSS No.", value: "123213213213" },
                { key: "philhealth", label: "PhilHealth No.", value: "456456456456" },
                { key: "pagibig", label: "Pag-IBIG No.", value: "789789789789" },
                { key: "tin", label: "TIN No.", value: "101010101010" },
              ].map((item) => {
                const isValidated = validations[item.key];
                const validatedDate = validationDates[item.key];
                return (
                  <div key={item.key} className="flex justify-between items-center bg-white p-3 rounded-md shadow-sm mb-2">
                    <div>
                      <span className="font-medium">{item.label}</span>
                      <div className="text-sm text-gray-500">{item.value}</div>
                    </div>
                    <button
                      onClick={() => toggleValidation(item.key)}
                      className={`px-3 py-1 rounded text-sm transition ${
                        isValidated
                          ? "bg-green-500 text-white hover:bg-green-600"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {isValidated ? <>Validated <span className="ml-1 text-xs text-black">({validatedDate})</span></> : "Not Validated"}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Required Documents */}
            <h3 className="font-bold mb-3">Required Documents</h3>
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
                  {requiredDocs.map((doc) => {
                    const status = doc.validated ? "Validated" : doc.file ? "Submitted" : "No File";
                    const badgeClass =
                      status === "Validated"
                        ? "bg-green-100 text-green-700"
                        : status === "Submitted"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-red-100 text-red-700";
                    return (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="border px-4 py-2 font-medium">{doc.name}</td>
                        <td className="border px-4 py-2">
                          {doc.file ? (
                            <div className="flex items-center gap-2">
                              <a href={doc.previewUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                                {doc.file.name}
                              </a>
                              <button
                                onClick={() => {
                                  if (doc.previewUrl) URL.revokeObjectURL(doc.previewUrl);
                                  setRequiredDocs((prev) =>
                                    prev.map((d) =>
                                      d.id === doc.id
                                        ? { ...d, file: null, previewUrl: null, uploadedAt: null, validated: false, validatedAt: null }
                                        : d
                                    )
                                  );
                                }}
                                className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200"
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <label className="text-blue-500 underline cursor-pointer">
                              Upload
                              <input type="file" onChange={(e) => handleReqFileUpload(e, doc.id)} className="hidden" />
                            </label>
                          )}
                        </td>
                        <td className="border px-4 py-2">{doc.uploadedAt || "—"}</td>
                        <td className="border px-4 py-2">
                          <span className={`px-2 py-1 rounded text-sm font-semibold ${badgeClass}`}>{status}</span>
                          {!doc.file && <div className="text-xs text-red-500 mt-1">Late for 8 Days</div>}
                          {doc.validated && doc.validatedAt && (
                            <div className="text-xs mt-1 text-black">Validated on {doc.validatedAt}</div>
                          )}
                        </td>
                        <td className="border px-4 py-2">
                          {!doc.validated && doc.file && (
                            <button
                              onClick={() => requestValidateReqDoc(doc.id)}
                              className="px-2 py-1 bg-green-100 text-green-600 rounded hover:bg-green-200"
                            >
                              Validate
                            </button>
                          )}
                          {doc.validated && (
                            <button className="px-2 py-1 bg-green-600 text-white rounded" disabled>
                              Validated
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {confirmReqDocId && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
                  <h4 className="text-lg font-bold mb-2">Reminder</h4>
                  <p className="mb-4">
                    You cannot change status of this document once Validated. Click <strong>Proceed</strong> to continue.
                  </p>
                  <div className="flex justify-end gap-3">
                    <button onClick={cancelValidateReqDoc} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
                    <button onClick={confirmValidateReqDoc} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Proceed</button>
                  </div>
                </div>
              </div>
            )}

            <h3 className="font-bold mb-4">Employee Documents (Additional)</h3>
            <label className="px-4 py-2 bg-gray-100 rounded cursor-pointer inline-block mb-4">
              Upload Documents
              <input type="file" multiple onChange={handleUpload} className="hidden" />
            </label>

            {documents.length === 0 ? (
              <p>No documents uploaded.</p>
            ) : (
              <ul className="space-y-2">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex justify-between items-center border p-2 rounded">
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">{doc.name}</a>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">{doc.date}</span>
                      <button onClick={() => handleRemove(doc.id)} className="px-2 py-1 bg-red-100 text-red-600 rounded">Remove</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
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
    <h3 className="font-bold text-lg mb-4">Separation Details:</h3>

    {/* Separation Type */}
    <div className="mb-4">
      <label className="block font-medium mb-1">Separation Type</label>
      <select className="border rounded px-3 py-2 w-full">
        <option value="">-- Select Separation Type --</option>
        <option value="resignation">Resignation</option>
        <option value="termination">Termination</option>
        <option value="retirement">Retirement</option>
        <option value="end_of_contract">End of Contract</option>
      </select>
    </div>

    {/* Separation Date */}
    <div className="mb-4">
      <label className="block font-medium mb-1">Separation Date</label>
      <input
        type="date"
        className="border rounded px-3 py-2 w-full"
      />
    </div>

    {/* Remarks */}
    <div className="mb-6">
      <label className="block font-medium mb-1">Remarks</label>
      <textarea
        rows="3"
        placeholder="Enter remarks..."
        className="border rounded px-3 py-2 w-full"
      />
    </div>

    {/* File Uploading Area */}
    <h4 className="font-semibold mb-3">Upload Required Files</h4>
    <div className="space-y-4">
      {/* Exit Clearance */}
      <div className="border rounded-lg p-4 shadow-sm">
        <label className="block font-medium mb-2">Exit Clearance</label>
        <label className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded cursor-pointer">
          Choose File
          <input type="file" className="hidden" />
        </label>
      </div>

      {/* Resignation Letter */}
      <div className="border rounded-lg p-4 shadow-sm">
        <label className="block font-medium mb-2">Resignation Letter</label>
        <label className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded cursor-pointer">
          Choose File
          <input type="file" className="hidden" />
        </label>
      </div>

      {/* Quitclaim */}
      <div className="border rounded-lg p-4 shadow-sm">
        <label className="block font-medium mb-2">Quitclaim</label>
        <label className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded cursor-pointer">
          Choose File
          <input type="file" className="hidden" />
        </label>
      </div>
    </div>
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
            <th className="px-4 py-3 border-b text-left font-semibold">Remarks</th>
            <th className="px-4 py-3 border-b text-left font-semibold">Action</th>
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
              const status = doc.validated
                ? "Validated"
                : doc.file
                ? "Submitted"
                : "No File";
              const badgeClass =
                status === "Validated"
                  ? "bg-green-100 text-green-700"
                  : status === "Submitted"
                  ? "bg-orange-100 text-orange-700"
                  : "bg-red-100 text-red-700";

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
                      <label className="cursor-pointer px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                        Upload File
                        <input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files && e.target.files[0];
                            if (!file) return;
                            setEvaluationDocs((prev) =>
                              prev.map((d) =>
                                d.id === doc.id
                                  ? {
                                      ...d,
                                      file,
                                      url: URL.createObjectURL(file),
                                      date: new Date().toLocaleDateString(),
                                    }
                                  : d
                              )
                            );
                          }}
                          className="hidden"
                        />
                      </label>
                    )}
                  </td>
                  <td className="px-4 py-3 border-b">{doc.date || "—"}</td>
                  <td className="px-4 py-3 border-b">
                    <span className={`px-2 py-1 rounded text-sm font-semibold ${badgeClass}`}>
                      {status}
                    </span>
                    {!doc.file && (
                      <div className="text-xs text-red-500 mt-1">Late for 8 Days</div>
                    )}
                    {doc.validated && doc.date && (
                      <div className="text-xs mt-1 text-gray-600">
                        Validated on {doc.date}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 border-b">
                    {!doc.validated && doc.file && (
                      <button
                        onClick={() =>
                          setEvaluationDocs((prev) =>
                            prev.map((d) =>
                              d.id === doc.id ? { ...d, validated: true } : d
                            )
                          )
                        }
                        className="px-3 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        Validate
                      </button>
                    )}
                    {doc.validated && (
                      <button
                        className="px-3 py-2 bg-green-600 text-white rounded cursor-not-allowed"
                        disabled
                      >
                        Validated
                      </button>
                    )}
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
              validated: false,
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
    </div>
  );
}

export default EmployeeDetails;
