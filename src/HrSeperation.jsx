import { useState } from "react";

function HrSeperation() {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // all, pending, clearance, completed

  // Employee data with separation stages
  const [employees, setEmployees] = useState([
    { 
      id: "000785", 
      name: "Dela Cruz, Juan", 
      position: "Truck Driver", 
      submissionDate: "2024-11-15",
      stage: "pending", // pending, clearance, completed
      resignationStatus: "Submitted", // Submitted, Validated
      exitClearanceStatus: "Pending Validation",
      exitInterviewStatus: "Pending Validation",
      resignationFile: "resignation_letter.pdf",
      exitClearanceFile: null,
      exitInterviewFile: null,
      isResignationApproved: false,
      hrExitFormsUploaded: false,
      finalDocs: [],
      isCompleted: false
    },
    { 
      id: "000784", 
      name: "Torres, Paolo Andres", 
      position: "Delivery Helper", 
      submissionDate: "2024-11-14",
      stage: "clearance",
      resignationStatus: "Validated",
      exitClearanceStatus: "Submitted",
      exitInterviewStatus: "Submitted",
      resignationFile: "resignation_letter.pdf",
      exitClearanceFile: "exit_clearance_signed.pdf",
      exitInterviewFile: "exit_interview_signed.pdf",
      isResignationApproved: true,
      hrExitFormsUploaded: true,
      finalDocs: [],
      isCompleted: false
    },
    { 
      id: "000783", 
      name: "Rivera, Paolo Miguel", 
      position: "Delivery Helper", 
      submissionDate: "2024-11-13",
      stage: "completed",
      resignationStatus: "Validated",
      exitClearanceStatus: "Validated",
      exitInterviewStatus: "Validated",
      resignationFile: "resignation_letter.pdf",
      exitClearanceFile: "exit_clearance_signed.pdf",
      exitInterviewFile: "exit_interview_signed.pdf",
      isResignationApproved: true,
      hrExitFormsUploaded: true,
      finalDocs: ["final_clearance.pdf"],
      isCompleted: true
    },
    { 
      id: "000782", 
      name: "Reyes, Christian", 
      position: "HR Coordinator", 
      submissionDate: "2024-11-16",
      stage: "pending",
      resignationStatus: "Submitted",
      exitClearanceStatus: "None",
      exitInterviewStatus: "None",
      resignationFile: "resignation_letter.pdf",
      exitClearanceFile: null,
      exitInterviewFile: null,
      isResignationApproved: false,
      hrExitFormsUploaded: false,
      finalDocs: [],
      isCompleted: false
    },
  ]);

  // State for selected employee's documents
  const [hrExitClearanceFile, setHrExitClearanceFile] = useState(null);
  const [hrExitInterviewFile, setHrExitInterviewFile] = useState(null);
  const [finalDocFiles, setFinalDocFiles] = useState([]);

  const handleEmployeeClick = (employee) => {
    setSelectedEmployee(employee);
    setHrExitClearanceFile(null);
    setHrExitInterviewFile(null);
    setFinalDocFiles([]);
  };

  const handleApproveResignation = (employeeId) => {
    setEmployees(employees.map(emp => 
      emp.id === employeeId 
        ? { ...emp, resignationStatus: "Validated", isResignationApproved: true, stage: "clearance" }
        : emp
    ));
    if (selectedEmployee?.id === employeeId) {
      setSelectedEmployee({ ...selectedEmployee, resignationStatus: "Validated", isResignationApproved: true, stage: "clearance" });
    }
  };

  const handleUploadHrForms = (employeeId) => {
    if (hrExitClearanceFile && hrExitInterviewFile) {
      setEmployees(employees.map(emp => 
        emp.id === employeeId 
          ? { ...emp, hrExitFormsUploaded: true }
          : emp
      ));
      if (selectedEmployee?.id === employeeId) {
        setSelectedEmployee({ ...selectedEmployee, hrExitFormsUploaded: true });
      }
      setHrExitClearanceFile(null);
      setHrExitInterviewFile(null);
    }
  };

  const handleValidateDocument = (employeeId, docType, action) => {
    const status = action === "validate" ? "Validated" : "Re-submission Required";
    setEmployees(employees.map(emp => {
      if (emp.id === employeeId) {
        const updates = docType === "clearance" 
          ? { exitClearanceStatus: status }
          : { exitInterviewStatus: status };
        
        // Check if both are validated to enable final stage
        const bothValidated = 
          (docType === "clearance" ? status === "Validated" : emp.exitClearanceStatus === "Validated") &&
          (docType === "interview" ? status === "Validated" : emp.exitInterviewStatus === "Validated");
        
        return { ...emp, ...updates };
      }
      return emp;
    }));
    
    if (selectedEmployee?.id === employeeId) {
      const updates = docType === "clearance" 
        ? { exitClearanceStatus: status }
        : { exitInterviewStatus: status };
      setSelectedEmployee({ ...selectedEmployee, ...updates });
    }
  };

  const handleMarkCompleted = (employeeId) => {
    setEmployees(employees.map(emp => 
      emp.id === employeeId 
        ? { ...emp, isCompleted: true, stage: "completed", finalDocs: finalDocFiles.map(f => f.name) }
        : emp
    ));
    if (selectedEmployee?.id === employeeId) {
      setSelectedEmployee({ ...selectedEmployee, isCompleted: true, stage: "completed", finalDocs: finalDocFiles.map(f => f.name) });
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.id.includes(searchTerm) ||
                         emp.position.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "pending") return matchesSearch && emp.stage === "pending";
    if (activeTab === "clearance") return matchesSearch && emp.stage === "clearance";
    if (activeTab === "completed") return matchesSearch && emp.stage === "completed";
    return matchesSearch;
  });

  const getStageBadge = (stage) => {
    const styles = {
      pending: "bg-orange-100 text-orange-800",
      clearance: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800"
    };
    const labels = {
      pending: "Pending Review",
      clearance: "In Clearance",
      completed: "Completed"
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[stage]}`}>
        {labels[stage]}
      </span>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar - Employee List */}
      <div className="w-1/3 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Employee Separation</h1>
          
          {/* Search */}
          <input
            type="text"
            placeholder="Search by name, ID, or position..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                activeTab === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All ({employees.length})
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                activeTab === "pending" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Pending ({employees.filter(e => e.stage === "pending").length})
            </button>
            <button
              onClick={() => setActiveTab("clearance")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                activeTab === "clearance" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Clearance ({employees.filter(e => e.stage === "clearance").length})
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                activeTab === "completed" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Completed ({employees.filter(e => e.stage === "completed").length})
            </button>
          </div>
        </div>

        {/* Employee List */}
        <div className="flex-1 overflow-y-auto">
          {filteredEmployees.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No employees found</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  onClick={() => handleEmployeeClick(employee)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedEmployee?.id === employee.id ? "bg-blue-50 border-l-4 border-blue-600" : ""
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{employee.name}</h3>
                      <p className="text-sm text-gray-600">{employee.position}</p>
                    </div>
                    {getStageBadge(employee.stage)}
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>ID: {employee.id}</span>
                    <span>Submitted: {employee.submissionDate}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Detail View */}
      <div className="flex-1 overflow-y-auto">
        {selectedEmployee ? (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedEmployee.name}</h2>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>ID: {selectedEmployee.id}</span>
                <span>•</span>
                <span>{selectedEmployee.position}</span>
                <span>•</span>
                <span>Submitted: {selectedEmployee.submissionDate}</span>
              </div>
              {getStageBadge(selectedEmployee.stage)}
            </div>

            {/* Stage 1: Resignation Review */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-800">Stage 1: Resignation Letter Review</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedEmployee.resignationStatus === "Validated" 
                    ? "bg-green-100 text-green-800" 
                    : "bg-orange-100 text-orange-800"
                }`}>
                  {selectedEmployee.resignationStatus}
                </span>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">Resignation Letter</p>
                    <a href={selectedEmployee.resignationFile} download className="text-sm text-blue-600 hover:underline">
                      {selectedEmployee.resignationFile}
                    </a>
                  </div>
                  <a
                    href={selectedEmployee.resignationFile}
                    download
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Download
                  </a>
                </div>

                {!selectedEmployee.isResignationApproved && (
                  <button
                    onClick={() => handleApproveResignation(selectedEmployee.id)}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                  >
                    Approve Resignation (Unlock Stage 2)
                  </button>
                )}

                {selectedEmployee.isResignationApproved && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">✓ Resignation approved. Stage 2 is now unlocked for the employee.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Stage 2: Clearance & Exit Interview */}
            {selectedEmployee.isResignationApproved && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Stage 2: Clearance & Exit Interview</h3>

                {/* HR Upload Forms Section */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-3">Upload Forms for Employee Download</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Exit Clearance Form Template
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => setHrExitClearanceFile(e.target.files[0])}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {hrExitClearanceFile && (
                        <p className="mt-1 text-sm text-gray-600">Selected: {hrExitClearanceFile.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Exit Interview Form Template
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => setHrExitInterviewFile(e.target.files[0])}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {hrExitInterviewFile && (
                        <p className="mt-1 text-sm text-gray-600">Selected: {hrExitInterviewFile.name}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleUploadHrForms(selectedEmployee.id)}
                      disabled={!hrExitClearanceFile || !hrExitInterviewFile || selectedEmployee.hrExitFormsUploaded}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {selectedEmployee.hrExitFormsUploaded ? "✓ Forms Uploaded" : "Upload Forms"}
                    </button>
                  </div>
                </div>

                {/* Employee Uploaded Documents Review */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-800">Review Employee Uploaded Documents</h4>
                  
                  {/* Exit Clearance Form Review */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-gray-800">Exit Clearance Form</h5>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        selectedEmployee.exitClearanceStatus === "Validated" ? "bg-green-100 text-green-800" :
                        selectedEmployee.exitClearanceStatus === "Re-submission Required" ? "bg-red-100 text-red-800" :
                        "bg-orange-100 text-orange-800"
                      }`}>
                        {selectedEmployee.exitClearanceStatus}
                      </span>
                    </div>
                    {selectedEmployee.exitClearanceFile ? (
                      <div className="flex items-center justify-between">
                        <a href={selectedEmployee.exitClearanceFile} download className="text-sm text-blue-600 hover:underline">
                          {selectedEmployee.exitClearanceFile}
                        </a>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleValidateDocument(selectedEmployee.id, "clearance", "validate")}
                            className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm transition-colors"
                          >
                            Validate
                          </button>
                          <button
                            onClick={() => handleValidateDocument(selectedEmployee.id, "clearance", "reject")}
                            className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm transition-colors"
                          >
                            Require Re-submission
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No file uploaded yet</p>
                    )}
                  </div>

                  {/* Exit Interview Form Review */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-gray-800">Exit Interview Form</h5>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        selectedEmployee.exitInterviewStatus === "Validated" ? "bg-green-100 text-green-800" :
                        selectedEmployee.exitInterviewStatus === "Re-submission Required" ? "bg-red-100 text-red-800" :
                        "bg-orange-100 text-orange-800"
                      }`}>
                        {selectedEmployee.exitInterviewStatus}
                      </span>
                    </div>
                    {selectedEmployee.exitInterviewFile ? (
                      <div className="flex items-center justify-between">
                        <a href={selectedEmployee.exitInterviewFile} download className="text-sm text-blue-600 hover:underline">
                          {selectedEmployee.exitInterviewFile}
                        </a>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleValidateDocument(selectedEmployee.id, "interview", "validate")}
                            className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm transition-colors"
                          >
                            Validate
                          </button>
                          <button
                            onClick={() => handleValidateDocument(selectedEmployee.id, "interview", "reject")}
                            className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm transition-colors"
                          >
                            Require Re-submission
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No file uploaded yet</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Stage 3: Final Documentation */}
            {selectedEmployee.exitClearanceStatus === "Validated" && 
             selectedEmployee.exitInterviewStatus === "Validated" && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Stage 3: Final Documentation</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Final HR Documentation
                    </label>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        const files = Array.from(e.target.files);
                        setFinalDocFiles([...finalDocFiles, ...files]);
                      }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {finalDocFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {finalDocFiles.map((file, index) => (
                          <p key={index} className="text-sm text-gray-600">• {file.name}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedEmployee.finalDocs.length > 0 && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-2">Uploaded Final Documents:</p>
                      {selectedEmployee.finalDocs.map((doc, index) => (
                        <p key={index} className="text-sm text-gray-600">• {doc}</p>
                      ))}
                    </div>
                  )}

                  {!selectedEmployee.isCompleted && (
                    <button
                      onClick={() => handleMarkCompleted(selectedEmployee.id)}
                      className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                    >
                      Mark Separation as Completed
                    </button>
                  )}

                  {selectedEmployee.isCompleted && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm font-medium text-green-800">✓ Separation process completed</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!selectedEmployee.isResignationApproved && (
              <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
                <p>Approve the resignation letter to unlock Stage 2</p>
              </div>
            )}

            {selectedEmployee.isResignationApproved && 
             (selectedEmployee.exitClearanceStatus !== "Validated" || selectedEmployee.exitInterviewStatus !== "Validated") && (
              <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
                <p>Validate both documents to proceed to final stage</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>Select an employee to view separation details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default HrSeperation;
