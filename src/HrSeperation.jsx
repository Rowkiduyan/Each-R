import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

function HrSeperation() {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // all, pending, clearance, completed
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Employee data with separation stages
  const [employees, setEmployees] = useState([]);

  // Fetch employees with separation records
  useEffect(() => {
    fetchEmployeeSeparations();
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('separation_form_templates')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error
      
      setTemplates(data);
      
      // Auto-fill Stage 2 fields if templates exist
      if (data?.exit_clearance_form_url && data?.exit_clearance_form_filename) {
        // Create a pseudo-File object for display purposes
        const clearanceFile = new File([], data.exit_clearance_form_filename, { type: 'application/pdf' });
        setHrExitClearanceFile(clearanceFile);
        setStagedClearanceTemplate(clearanceFile);
      }
      
      if (data?.exit_interview_form_url && data?.exit_interview_form_filename) {
        const interviewFile = new File([], data.exit_interview_form_filename, { type: 'application/pdf' });
        setHrExitInterviewFile(interviewFile);
        setStagedInterviewTemplate(interviewFile);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  };

  const fetchEmployeeSeparations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all employee separations
      const { data: separations, error: fetchError } = await supabase
        .from('employee_separations')
        .select('*');

      if (fetchError) throw fetchError;

      // Fetch employee data for each separation
      const employeeIds = separations.map(sep => sep.employee_id);
      const { data: employeesData, error: empError } = await supabase
        .from('employees')
        .select('id, email, fname, lname, mname, position, depot')
        .in('id', employeeIds);

      if (empError) throw empError;

      // Create a map of employee data
      const employeeMap = {};
      employeesData.forEach(emp => {
        employeeMap[emp.id] = emp;
      });

      // Transform data to match UI format
      const transformedEmployees = separations.map(sep => {
        const employee = employeeMap[sep.employee_id] || {};
        
        // Determine stage based on status
        let stage = 'pending';
        if (sep.status === 'completed') {
          stage = 'completed';
        } else if (sep.resignation_status === 'validated') {
          stage = 'clearance';
        }

        return {
          id: employee.id || sep.employee_id,
          name: employee.fname && employee.lname 
            ? `${employee.lname}, ${employee.fname}` 
            : 'Unknown Employee',
          position: employee.position || 'N/A',
          submissionDate: sep.resignation_submitted_at 
            ? new Date(sep.resignation_submitted_at).toLocaleDateString('en-CA') 
            : 'N/A',
          stage,
          resignationStatus: sep.resignation_status === 'validated' ? 'Validated' : 'Submitted',
          exitClearanceStatus: sep.signed_exit_clearance_status === 'validated' ? 'Validated' : 
                               sep.signed_exit_clearance_status === 'submitted' ? 'Submitted' : 
                               sep.exit_clearance_form_status === 'uploaded' ? 'Pending Validation' : 'None',
          exitInterviewStatus: sep.signed_exit_interview_status === 'validated' ? 'Validated' : 
                              sep.signed_exit_interview_status === 'submitted' ? 'Submitted' : 
                              sep.exit_interview_form_status === 'uploaded' ? 'Pending Validation' : 'None',
          resignationFile: sep.resignation_original_filename || sep.resignation_letter_url,
          resignationFileUrl: sep.resignation_letter_url,
          exitClearanceFile: sep.signed_exit_clearance_url,
          exitInterviewFile: sep.signed_exit_interview_url,
          isResignationApproved: sep.resignation_status === 'validated',
          hrExitFormsUploaded: sep.exit_clearance_form_url && sep.exit_interview_form_url,
          finalDocs: sep.additional_files_urls || [],
          isCompleted: sep.status === 'completed',
          dbId: sep.id,
          employeeUserId: employee.id
        };
      });

      setEmployees(transformedEmployees);
    } catch (err) {
      console.error('Error fetching employee separations:', err);
      setError(`Failed to load employee data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // State for selected employee's documents
  const [hrExitClearanceFile, setHrExitClearanceFile] = useState(null);
  const [hrExitInterviewFile, setHrExitInterviewFile] = useState(null);
  const [finalDocFiles, setFinalDocFiles] = useState([]);
  
  // State for confirmation modals
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showCancelApprovalConfirm, setShowCancelApprovalConfirm] = useState(false);
  const [showUploadFormsConfirm, setShowUploadFormsConfirm] = useState(false);
  const [showUploadSuccess, setShowUploadSuccess] = useState(false);
  const [pendingApprovalId, setPendingApprovalId] = useState(null);
  const [pendingUploadEmployeeId, setPendingUploadEmployeeId] = useState(null);

  // State for global templates (staging area)
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [templates, setTemplates] = useState(null);
  const [stagedClearanceTemplate, setStagedClearanceTemplate] = useState(null);
  const [stagedInterviewTemplate, setStagedInterviewTemplate] = useState(null);

  const handleEmployeeClick = (employee) => {
    setSelectedEmployee(employee);
    setFinalDocFiles([]);
    // Fields will auto-fill when templates are loaded, no need to manually set here
  };

  const handleApproveResignation = async (employeeId) => {
    try {
      const employee = employees.find(emp => emp.id === employeeId);
      if (!employee) return;

      const { error: updateError } = await supabase
        .from('employee_separations')
        .update({
          resignation_status: 'validated',
          resignation_validated_at: new Date().toISOString(),
          status: 'reviewed'
        })
        .eq('id', employee.dbId);

      if (updateError) throw updateError;

      // Update local state
      setEmployees(employees.map(emp => 
        emp.id === employeeId 
          ? { ...emp, resignationStatus: "Validated", isResignationApproved: true, stage: "clearance" }
          : emp
      ));
      if (selectedEmployee?.id === employeeId) {
        setSelectedEmployee({ ...selectedEmployee, resignationStatus: "Validated", isResignationApproved: true, stage: "clearance" });
      }
      
      setShowApproveConfirm(false);
      setPendingApprovalId(null);
    } catch (err) {
      console.error('Error approving resignation:', err);
      setError(`Failed to approve resignation: ${err.message}`);
      setShowApproveConfirm(false);
      setPendingApprovalId(null);
    }
  };

  const handleCancelApproval = async (employeeId) => {
    try {
      const employee = employees.find(emp => emp.id === employeeId);
      if (!employee) return;

      const { error: updateError } = await supabase
        .from('employee_separations')
        .update({
          resignation_status: 'submitted',
          resignation_validated_at: null,
          status: 'pending'
        })
        .eq('id', employee.dbId);

      if (updateError) throw updateError;

      // Update local state
      setEmployees(employees.map(emp => 
        emp.id === employeeId 
          ? { ...emp, resignationStatus: "Submitted", isResignationApproved: false, stage: "pending" }
          : emp
      ));
      if (selectedEmployee?.id === employeeId) {
        setSelectedEmployee({ ...selectedEmployee, resignationStatus: "Submitted", isResignationApproved: false, stage: "pending" });
      }
      
      setShowCancelApprovalConfirm(false);
      setPendingApprovalId(null);
    } catch (err) {
      console.error('Error canceling approval:', err);
      setError(`Failed to cancel approval: ${err.message}`);
      setShowCancelApprovalConfirm(false);
      setPendingApprovalId(null);
    }
  };

  const handleUploadHrForms = async (employeeId) => {
    if (!hrExitClearanceFile || !hrExitInterviewFile) return;
    
    setShowUploadFormsConfirm(false);
    setPendingUploadEmployeeId(null);
    
    try {
      setError(null);
      const employee = employees.find(emp => emp.id === employeeId);
      if (!employee) return;

      // Delete old files if they exist (for update)
      const { data: existingRecord } = await supabase
        .from('employee_separations')
        .select('exit_clearance_form_url, exit_interview_form_url')
        .eq('id', employee.dbId)
        .single();

      if (existingRecord) {
        const filesToDelete = [];
        if (existingRecord.exit_clearance_form_url) {
          filesToDelete.push(existingRecord.exit_clearance_form_url);
        }
        if (existingRecord.exit_interview_form_url) {
          filesToDelete.push(existingRecord.exit_interview_form_url);
        }
        if (filesToDelete.length > 0) {
          await supabase.storage
            .from('separation-documents')
            .remove(filesToDelete);
        }
      }

      // Upload Exit Clearance Form
      const clearanceExt = hrExitClearanceFile.name.split('.').pop();
      const clearanceFileName = `${employee.employeeUserId}/exit_clearance_form_${Date.now()}.${clearanceExt}`;
      
      const { error: clearanceUploadError } = await supabase.storage
        .from('separation-documents')
        .upload(clearanceFileName, hrExitClearanceFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (clearanceUploadError) throw clearanceUploadError;

      // Upload Exit Interview Form
      const interviewExt = hrExitInterviewFile.name.split('.').pop();
      const interviewFileName = `${employee.employeeUserId}/exit_interview_form_${Date.now()}.${interviewExt}`;
      
      const { error: interviewUploadError } = await supabase.storage
        .from('separation-documents')
        .upload(interviewFileName, hrExitInterviewFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (interviewUploadError) throw interviewUploadError;

      // Update database
      const { error: updateError } = await supabase
        .from('employee_separations')
        .update({
          exit_clearance_form_url: clearanceFileName,
          exit_clearance_form_filename: hrExitClearanceFile.name,
          exit_clearance_form_status: 'uploaded',
          exit_interview_form_url: interviewFileName,
          exit_interview_form_filename: hrExitInterviewFile.name,
          exit_interview_form_status: 'uploaded'
        })
        .eq('id', employee.dbId);

      if (updateError) throw updateError;

      // Update local state
      setEmployees(employees.map(emp => 
        emp.id === employeeId 
          ? { ...emp, hrExitFormsUploaded: true }
          : emp
      ));
      if (selectedEmployee?.id === employeeId) {
        setSelectedEmployee({ ...selectedEmployee, hrExitFormsUploaded: true });
      }

      // Keep the files in state so they remain visible
      // Don't clear hrExitClearanceFile and hrExitInterviewFile

      // Show success message
      setShowUploadFormsConfirm(false);
      setShowUploadSuccess(true);

    } catch (err) {
      console.error('Error uploading HR forms:', err);
      setError(`Failed to upload forms: ${err.message}`);
      setShowUploadFormsConfirm(false);
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

  const handleUploadTemplate = async (templateType) => {
    const file = templateType === 'clearance' ? stagedClearanceTemplate : stagedInterviewTemplate;
    if (!file) return;

    try {
      setError(null);

      // Delete old file if exists
      if (templates) {
        const oldUrl = templateType === 'clearance' ? templates.exit_clearance_form_url : templates.exit_interview_form_url;
        if (oldUrl) {
          await supabase.storage
            .from('separation-documents')
            .remove([oldUrl]);
        }
      }

      // Upload new file
      const fileExt = file.name.split('.').pop();
      const fileName = `templates/${templateType}_form_template.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('separation-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Update database
      const updateData = templateType === 'clearance' 
        ? { 
            exit_clearance_form_url: fileName,
            exit_clearance_form_filename: file.name
          }
        : {
            exit_interview_form_url: fileName,
            exit_interview_form_filename: file.name
          };

      const { error: dbError } = await supabase
        .from('separation_form_templates')
        .update(updateData)
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (dbError) throw dbError;

      // Update templates state manually without re-fetching (to avoid auto-fill of both fields)
      const updatedTemplates = { ...templates, ...updateData };
      setTemplates(updatedTemplates);
      
      // Auto-fill only the specific Stage 2 field that was just saved
      if (templateType === 'clearance') {
        setHrExitClearanceFile(file);
      } else {
        setHrExitInterviewFile(file);
      }

    } catch (err) {
      console.error('Error uploading template:', err);
      setError(`Failed to upload template: ${err.message}`);
    }
  };

  const handleRemoveTemplate = async (templateType) => {
    try {
      setError(null);

      // Delete file from storage
      const fileUrl = templateType === 'clearance' 
        ? templates.exit_clearance_form_url 
        : templates.exit_interview_form_url;

      if (fileUrl) {
        await supabase.storage
          .from('separation-documents')
          .remove([fileUrl]);
      }

      // Update database to null
      const updateData = templateType === 'clearance' 
        ? { 
            exit_clearance_form_url: null,
            exit_clearance_form_filename: null
          }
        : {
            exit_interview_form_url: null,
            exit_interview_form_filename: null
          };

      const { error: dbError } = await supabase
        .from('separation_form_templates')
        .update(updateData)
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (dbError) throw dbError;

      // Update templates state manually without re-fetching
      const updatedTemplates = { ...templates, ...updateData };
      setTemplates(updatedTemplates);

      // Clear only the specific staged file and Stage 2 field
      if (templateType === 'clearance') {
        setStagedClearanceTemplate(null);
        setHrExitClearanceFile(null);
      } else {
        setStagedInterviewTemplate(null);
        setHrExitInterviewFile(null);
      }

    } catch (err) {
      console.error('Error removing template:', err);
      setError(`Failed to remove template: ${err.message}`);
    }
  };

  const handleDownloadTemplate = async (templateType) => {
    try {
      const fileUrl = templateType === 'clearance' 
        ? templates.exit_clearance_form_url 
        : templates.exit_interview_form_url;
      const fileName = templateType === 'clearance'
        ? templates.exit_clearance_form_filename
        : templates.exit_interview_form_filename;

      if (!fileUrl) {
        alert('No template uploaded yet');
        return;
      }

      const { data, error } = await supabase.storage
        .from('separation-documents')
        .download(fileUrl);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || `${templateType}_form_template.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading template:', err);
      alert('Failed to download template');
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
          
          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}
          
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
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : filteredEmployees.length === 0 ? (
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
                    <p className="text-sm text-gray-600">
                      {selectedEmployee.resignationFile}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const { data, error } = await supabase.storage
                          .from('separation-documents')
                          .download(selectedEmployee.resignationFileUrl);
                        
                        if (error) throw error;
                        
                        const url = URL.createObjectURL(data);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = selectedEmployee.resignationFile;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      } catch (err) {
                        console.error('Error downloading file:', err);
                        alert('Failed to download file');
                      }
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Download
                  </button>
                </div>

                {!selectedEmployee.isResignationApproved && (
                  <button
                    onClick={() => {
                      setPendingApprovalId(selectedEmployee.id);
                      setShowApproveConfirm(true);
                    }}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                  >
                    Approve Resignation (Unlock Stage 2)
                  </button>
                )}

                {selectedEmployee.isResignationApproved && (
                  <div className="space-y-3">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">✓ Resignation approved. Stage 2 is now unlocked for the employee.</p>
                    </div>
                    <button
                      onClick={() => {
                        setPendingApprovalId(selectedEmployee.id);
                        setShowCancelApprovalConfirm(true);
                      }}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                    >
                      Cancel Approval
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Stage 2: Clearance & Exit Interview */}
            {selectedEmployee.isResignationApproved && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-800">Stage 2: Clearance & Exit Interview</h3>
                  <button
                    onClick={() => setShowTemplateManager(true)}
                    className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
                  >
                    Manage Templates
                  </button>
                </div>

                {/* HR Upload Forms Section */}
                <div className={`mb-6 p-4 rounded-lg border transition-colors ${
                  selectedEmployee.hrExitFormsUploaded 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <h4 className="font-medium text-gray-800 mb-3">Upload Forms for Employee Download</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Exit Clearance Form Template
                      </label>
                      {hrExitClearanceFile ? (
                        <div className="flex items-center justify-between p-3 bg-white border border-gray-300 rounded-md">
                          <p className="text-sm text-gray-700">📎 {hrExitClearanceFile.name}</p>
                          <button
                            onClick={() => setHrExitClearanceFile(null)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 p-3 bg-white border border-gray-300 rounded-md">
                          No template selected. Upload in "Manage Templates" to auto-fill.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Exit Interview Form Template
                      </label>
                      {hrExitInterviewFile ? (
                        <div className="flex items-center justify-between p-3 bg-white border border-gray-300 rounded-md">
                          <p className="text-sm text-gray-700">📎 {hrExitInterviewFile.name}</p>
                          <button
                            onClick={() => setHrExitInterviewFile(null)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 p-3 bg-white border border-gray-300 rounded-md">
                          No template selected. Upload in "Manage Templates" to auto-fill.
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setPendingUploadEmployeeId(selectedEmployee.id);
                        setShowUploadFormsConfirm(true);
                      }}
                      disabled={!hrExitClearanceFile || !hrExitInterviewFile}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Upload Files
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

      {/* Approve Confirmation Modal */}
      {showApproveConfirm && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-black max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Approve Resignation?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to approve this resignation? This will unlock Stage 2 for the employee to complete their exit clearance and interview forms.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowApproveConfirm(false);
                  setPendingApprovalId(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApproveResignation(pendingApprovalId)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Approval Confirmation Modal */}
      {showCancelApprovalConfirm && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-black max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Cancel Approval?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel the approval? This will revert the resignation status back to "Submitted" and lock Stage 2 for the employee.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCancelApprovalConfirm(false);
                  setPendingApprovalId(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCancelApproval(pendingApprovalId)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Files Confirmation Modal */}
      {showUploadFormsConfirm && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-black max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Upload Files?
            </h3>
            <p className="text-gray-600 mb-6">
              {selectedEmployee?.hrExitFormsUploaded 
                ? 'Are you sure you want to upload these exit forms? This will replace the existing forms for this employee.'
                : 'Are you sure you want to upload these exit forms? The employee will be able to download them.'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowUploadFormsConfirm(false);
                  setPendingUploadEmployeeId(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUploadHrForms(pendingUploadEmployeeId)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Success Modal */}
      {showUploadSuccess && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-black max-w-md w-full mx-4 p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">
                Files Uploaded Successfully!
              </h3>
            </div>
            <p className="text-gray-600 mb-6 ml-16">
              The exit forms have been uploaded and are now available for the employee to download.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowUploadSuccess(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Manager Modal */}
      {showTemplateManager && (
        <div className="fixed inset-0 bg-transparent bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white border border-black rounded-lg max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Manage Form Templates</h2>
              <button
                onClick={() => setShowTemplateManager(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-gray-600 mb-6">
              Prepare and manage form templates. These files will auto-fill in Stage 2 when you select an employee.
            </p>

            {/* Exit Clearance Form Template */}
            <div className="mb-6 p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-3">Exit Clearance Form Template</h3>
              
              {templates?.exit_clearance_form_url ? (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-green-800">Stored Template:</p>
                      <p className="text-sm text-green-700">{templates.exit_clearance_form_filename}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownloadTemplate('clearance')}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => handleRemoveTemplate('clearance')}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-3">No template stored yet</p>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {templates?.exit_clearance_form_url ? 'Change Template' : 'Add Template'}
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setStagedClearanceTemplate(file);
                    }
                  }}
                  key={`clearance-template-${templates?.exit_clearance_form_url || 'empty'}`}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {stagedClearanceTemplate && (
                  <p className="mt-2 text-sm text-gray-600">Selected: {stagedClearanceTemplate.name}</p>
                )}
                <button
                  onClick={() => handleUploadTemplate('clearance')}
                  disabled={!stagedClearanceTemplate}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                >
                  Save Template
                </button>
              </div>
            </div>

            {/* Exit Interview Form Template */}
            <div className="mb-6 p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-3">Exit Interview Form Template</h3>
              
              {templates?.exit_interview_form_url ? (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-green-800">Stored Template:</p>
                      <p className="text-sm text-green-700">{templates.exit_interview_form_filename}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownloadTemplate('interview')}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => handleRemoveTemplate('interview')}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-3">No template stored yet</p>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {templates?.exit_interview_form_url ? 'Change Template' : 'Add Template'}
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setStagedInterviewTemplate(file);
                    }
                  }}
                  key={`interview-template-${templates?.exit_interview_form_url || 'empty'}`}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {stagedInterviewTemplate && (
                  <p className="mt-2 text-sm text-gray-600">Selected: {stagedInterviewTemplate.name}</p>
                )}
                <button
                  onClick={() => handleUploadTemplate('interview')}
                  disabled={!stagedInterviewTemplate}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                >
                  Save Template
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowTemplateManager(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HrSeperation;
