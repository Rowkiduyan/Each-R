import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import {
  createResignationValidatedNotification,
  createExitFormsUploadedNotification,
  createFormValidatedNotification,
  createFormResubmissionNotification,
  createSeparationCompletedNotification,
  createAccountTerminationNotification
} from "./notifications";

function HrSeperation() {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // all, pending, clearance, completed, terminated
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hrUserId, setHrUserId] = useState(null);

  // Employee data with separation stages
  const [employees, setEmployees] = useState([]);

  // Fetch employees with separation records
  useEffect(() => {
    const getHrUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setHrUserId(user.id);
    };
    getHrUser();
    fetchEmployeeSeparations();
    fetchTemplates();

    // Poll every 30 seconds
    const interval = setInterval(fetchEmployeeSeparations, 30000);
    
    // Refetch when HR comes back to the tab
    const handleVisibilityChange = () => {
      if (!document.hidden) fetchEmployeeSeparations();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Save scroll position before page unload
    const handleBeforeUnload = () => {
      const detailView = document.querySelector('.flex-1.overflow-y-auto.pr-6');
      const employeeList = document.querySelector('.flex-1.overflow-y-auto');
      
      if (detailView) {
        sessionStorage.setItem('hrSeparationScrollPosition', detailView.scrollTop.toString());
      }
      if (employeeList) {
        sessionStorage.setItem('hrSeparationListScrollPosition', employeeList.scrollTop.toString());
      }
      // Save main window scroll position
      sessionStorage.setItem('hrSeparationWindowScrollPosition', window.scrollY.toString());
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('separation_form_templates')
        .select('*')
        .maybeSingle();

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

      // Fetch employee data - employee_id now directly references employees table ID
      const employeeIds = separations.map(sep => sep.employee_id).filter(id => id);
      
      const { data: employeesData, error: empError } = await supabase
        .from('employees')
        .select('id, email, fname, lname, mname, position, depot')
        .in('id', employeeIds);

      if (empError) {
        console.error('Error fetching employees:', empError);
      }

      // Create a map of employee data
      const employeeMap = {};
      if (employeesData && employeesData.length > 0) {
        employeesData.forEach(emp => {
          employeeMap[emp.id] = emp;
        });
      }

      // Transform data to match UI format
      const transformedEmployees = separations.map(sep => {
        const employee = employeeMap[sep.employee_id];
        
        // Determine stage based on status
        let stage = 'pending';
        if (sep.status === 'completed') {
          stage = 'completed';
        } else if (sep.resignation_status === 'validated') {
          stage = 'clearance';
        }

        return {
          id: employee?.id || sep.employee_id || 'unknown',
          name: employee?.fname && employee?.lname 
            ? `${employee.lname}, ${employee.fname}${employee.mname ? ' ' + employee.mname : ''}` 
            : 'Unknown Employee',
          position: employee?.position || 'N/A',
          submissionDate: sep.resignation_submitted_at 
            ? new Date(sep.resignation_submitted_at).toLocaleDateString('en-CA') 
            : 'N/A',
          stage,
          resignationType: sep.type || 'resignation',
          resignationStatus: sep.resignation_status === 'validated' ? 'Validated' : 
                            sep.resignation_status === 'none' ? 'Not Required' : 'Submitted',
          resignationLetterRequired: sep.resignation_letter_required !== false,
          exitClearanceStatus: sep.signed_exit_clearance_status === 'validated' ? 'Validated' : 
                               sep.signed_exit_clearance_status === 'resubmission_required' ? 'Re-submission Required' :
                               sep.signed_exit_clearance_status === 'submitted' ? 'Submitted' : 
                               sep.exit_clearance_form_status === 'uploaded' ? 'Pending Validation' : 'None',
          exitInterviewStatus: sep.signed_exit_interview_status === 'validated' ? 'Validated' : 
                              sep.signed_exit_interview_status === 'resubmission_required' ? 'Re-submission Required' :
                              sep.signed_exit_interview_status === 'submitted' ? 'Submitted' : 
                              sep.exit_interview_form_status === 'uploaded' ? 'Pending Validation' : 'None',
          resignationFile: sep.resignation_original_filename || sep.resignation_letter_url,
          resignationFileUrl: sep.resignation_letter_url,
          exitClearanceFile: sep.signed_exit_clearance_url,
          exitInterviewFile: sep.signed_exit_interview_url,
          isResignationApproved: sep.resignation_status === 'validated',
          hrExitFormsUploaded: sep.exit_clearance_form_url && sep.exit_interview_form_url,
          finalDocs: (() => {
            try {
              let files = sep.additional_files_urls;
              
              // Debug: log the raw value
              console.log('Raw additional_files_urls:', files);
              console.log('Type:', typeof files);
              
              // If it's null or undefined, return empty array
              if (!files) {
                return [];
              }
              
              // If it's a string, try to parse it as JSON
              if (typeof files === 'string') {
                // Handle case where database stores array of JSON strings
                files = JSON.parse(files);
                console.log('Parsed files:', files);
              }
              
              // If it's not an array, return empty array
              if (!Array.isArray(files)) {
                return [];
              }
              
              // Map to extract name and url
              return files.map(f => {
                console.log('Processing file:', f, 'Type:', typeof f);
                
                // If f is a string that looks like JSON, parse it
                if (typeof f === 'string' && (f.startsWith('{') || f.startsWith('['))) {
                  try {
                    f = JSON.parse(f);
                  } catch (e) {
                    console.error('Failed to parse file JSON:', e);
                  }
                }
                
                if (typeof f === 'object' && f !== null) {
                  return {
                    name: f.name || 'Unknown File',
                    url: f.url || ''
                  };
                }
                return {
                  name: f || 'Unknown File',
                  url: ''
                };
              });
            } catch (err) {
              console.error('Error parsing additional_files_urls:', err);
              return [];
            }
          })(),
          isCompleted: sep.status === 'completed',
          isTerminated: sep.is_terminated || false,
          terminationDate: sep.terminated_at,
          dbId: sep.id,
          employeeUserId: employee?.id || sep.employee_id
        };
      });

      // Sort employees: immediate resignations first, then by submission date (newest first)
      transformedEmployees.sort((a, b) => {
        // First priority: immediate resignations
        if (a.resignationType === 'immediate' && b.resignationType !== 'immediate') {
          return -1;
        }
        if (a.resignationType !== 'immediate' && b.resignationType === 'immediate') {
          return 1;
        }
        
        // Second priority: sort by submission date (newest first)
        const dateA = new Date(a.submissionDate);
        const dateB = new Date(b.submissionDate);
        return dateB - dateA;
      });

      setEmployees(transformedEmployees);
      
      // Restore selected employee from sessionStorage if exists
      const savedEmployeeId = sessionStorage.getItem('selectedEmployeeId');
      if (savedEmployeeId && transformedEmployees.length > 0) {
        const employeeToSelect = transformedEmployees.find(emp => emp.id === savedEmployeeId);
        if (employeeToSelect) {
          setSelectedEmployee(employeeToSelect);
        } else {
          // Employee no longer exists, clear from storage
          sessionStorage.removeItem('selectedEmployeeId');
        }
      }
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
  const [showValidateConfirm, setShowValidateConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showValidateSuccess, setShowValidateSuccess] = useState(false);
  const [showRejectSuccess, setShowRejectSuccess] = useState(false);
  const [pendingApprovalId, setPendingApprovalId] = useState(null);
  const [pendingUploadEmployeeId, setPendingUploadEmployeeId] = useState(null);
  const [pendingValidation, setPendingValidation] = useState(null); // { employeeId, docType }
  const [showUploadFinalDocsConfirm, setShowUploadFinalDocsConfirm] = useState(false);
  const [showMarkCompletedConfirm, setShowMarkCompletedConfirm] = useState(false);
  const [uploadingFinalDocs, setUploadingFinalDocs] = useState(false);
  const [pendingCompletionEmployeeId, setPendingCompletionEmployeeId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteEmployeeId, setPendingDeleteEmployeeId] = useState(null);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [terminateFile, setTerminateFile] = useState(null);
  const [pendingTerminateEmployeeId, setPendingTerminateEmployeeId] = useState(null);
  const [showTerminateConfirm, setShowTerminateConfirm] = useState(false);
  const [showTerminateSuccess, setShowTerminateSuccess] = useState(false);
  
  // Loading states for operations
  const [isApproving, setIsApproving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isMarkingCompleted, setIsMarkingCompleted] = useState(false);
  const [isUploadingForms, setIsUploadingForms] = useState(false);

  // State for global templates (staging area)
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [templates, setTemplates] = useState(null);
  const [stagedClearanceTemplate, setStagedClearanceTemplate] = useState(null);
  const [stagedInterviewTemplate, setStagedInterviewTemplate] = useState(null);

  // Restore scroll position when selected employee changes
  useEffect(() => {
    if (selectedEmployee && !loading) {
      const savedScrollPosition = sessionStorage.getItem('hrSeparationScrollPosition');
      if (savedScrollPosition) {
        const detailView = document.querySelector('.flex-1.overflow-y-auto.pr-6');
        if (detailView) {
          // Use setTimeout to ensure DOM is ready
          setTimeout(() => {
            detailView.scrollTop = parseInt(savedScrollPosition, 10);
          }, 100);
        }
      }
    }
  }, [selectedEmployee, loading]);

  // Restore employee list scroll position when employees are loaded
  useEffect(() => {
    if (employees.length > 0 && !loading) {
      const savedListScrollPosition = sessionStorage.getItem('hrSeparationListScrollPosition');
      if (savedListScrollPosition) {
        const employeeList = document.querySelector('.flex-1.overflow-y-auto');
        if (employeeList) {
          setTimeout(() => {
            employeeList.scrollTop = parseInt(savedListScrollPosition, 10);
          }, 100);
        }
      }
    }
  }, [employees, loading]);

  // Restore and track main window scroll position
  useEffect(() => {
    // Restore window scroll position
    const savedWindowScrollPosition = sessionStorage.getItem('hrSeparationWindowScrollPosition');
    if (savedWindowScrollPosition) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedWindowScrollPosition, 10));
      }, 100);
    }

    // Save window scroll position as user scrolls
    const handleWindowScroll = () => {
      sessionStorage.setItem('hrSeparationWindowScrollPosition', window.scrollY.toString());
    };
    window.addEventListener('scroll', handleWindowScroll);

    return () => {
      window.removeEventListener('scroll', handleWindowScroll);
    };
  }, []);

  const handleEmployeeClick = (employee) => {
    setSelectedEmployee(employee);
    setFinalDocFiles([]);
    // Save selected employee ID to sessionStorage for persistence across refreshes
    sessionStorage.setItem('selectedEmployeeId', employee.id);
  };

  // Auto-populate templates when employee is selected or templates change
  useEffect(() => {
    if (selectedEmployee && templates) {
      // Auto-fill from global templates if they exist
      if (templates.exit_clearance_form_url && !hrExitClearanceFile) {
        // Create a pseudo-file object to represent the template
        setHrExitClearanceFile({ 
          name: templates.exit_clearance_form_filename,
          isTemplate: true,
          url: templates.exit_clearance_form_url
        });
      }
      if (templates.exit_interview_form_url && !hrExitInterviewFile) {
        setHrExitInterviewFile({ 
          name: templates.exit_interview_form_filename,
          isTemplate: true,
          url: templates.exit_interview_form_url
        });
      }
    }
  }, [selectedEmployee, templates]);

  const handleApproveResignation = async (employeeId) => {
    if (isApproving) return;
    
    try {
      setIsApproving(true);
      const employee = employees.find(emp => emp.id === employeeId);
      if (!employee) return;

      const { error: updateError } = await supabase
        .from('employee_separations')
        .update({
          resignation_status: 'validated',
          resignation_validated_at: new Date().toISOString(),
          resignation_validated_by: hrUserId,
          status: 'reviewed'
        })
        .eq('id', employee.dbId);

      if (updateError) throw updateError;

      // Send notification to employee
      await createResignationValidatedNotification({
        employeeUserId: employee.id
      });

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
    } finally {
      setIsApproving(false);
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
    if (isUploadingForms) return;
    
    setShowUploadFormsConfirm(false);
    setPendingUploadEmployeeId(null);
    
    try {
      setIsUploadingForms(true);
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

      let clearanceFileName, clearanceOriginalName;
      let interviewFileName, interviewOriginalName;

      // Handle Exit Clearance Form - could be template or custom file
      if (hrExitClearanceFile.isTemplate) {
        // Using template - just reference the template URL
        clearanceFileName = hrExitClearanceFile.url;
        clearanceOriginalName = hrExitClearanceFile.name;
      } else {
        // Custom file - upload it
        const clearanceExt = hrExitClearanceFile.name.split('.').pop();
        clearanceFileName = `${employee.employeeUserId}/exit_clearance_form_${Date.now()}.${clearanceExt}`;
        clearanceOriginalName = hrExitClearanceFile.name;
        
        const { error: clearanceUploadError } = await supabase.storage
          .from('separation-documents')
          .upload(clearanceFileName, hrExitClearanceFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (clearanceUploadError) throw clearanceUploadError;
      }

      // Handle Exit Interview Form - could be template or custom file
      if (hrExitInterviewFile.isTemplate) {
        // Using template - just reference the template URL
        interviewFileName = hrExitInterviewFile.url;
        interviewOriginalName = hrExitInterviewFile.name;
      } else {
        // Custom file - upload it
        const interviewExt = hrExitInterviewFile.name.split('.').pop();
        interviewFileName = `${employee.employeeUserId}/exit_interview_form_${Date.now()}.${interviewExt}`;
        interviewOriginalName = hrExitInterviewFile.name;
        
        const { error: interviewUploadError } = await supabase.storage
          .from('separation-documents')
          .upload(interviewFileName, hrExitInterviewFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (interviewUploadError) throw interviewUploadError;
      }

      // Update database
      const { error: updateError } = await supabase
        .from('employee_separations')
        .update({
          exit_clearance_form_url: clearanceFileName,
          exit_clearance_form_filename: clearanceOriginalName,
          exit_clearance_form_status: 'uploaded',
          exit_clearance_form_uploaded_by: hrUserId,
          exit_clearance_form_uploaded_at: new Date().toISOString(),
          exit_interview_form_url: interviewFileName,
          exit_interview_form_filename: interviewOriginalName,
          exit_interview_form_status: 'uploaded',
          exit_interview_form_uploaded_by: hrUserId,
          exit_interview_form_uploaded_at: new Date().toISOString()
        })
        .eq('id', employee.dbId);

      if (updateError) throw updateError;

      // Send notification to employee
      await createExitFormsUploadedNotification({
        employeeUserId: employee.employeeUserId
      });

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
    } finally {
      setIsUploadingForms(false);
    }
  };

  const handleValidateDocument = async (employeeId, docType) => {
    if (isValidating) return;
    
    try {
      setIsValidating(true);
      const employee = employees.find(emp => emp.id === employeeId);
      if (!employee) return;

      const updateData = docType === "clearance" 
        ? {
            signed_exit_clearance_status: 'validated'
          }
        : {
            signed_exit_interview_status: 'validated'
          };

      const { error: updateError } = await supabase
        .from('employee_separations')
        .update(updateData)
        .eq('id', employee.dbId);

      if (updateError) throw updateError;

      // Send notification to employee
      await createFormValidatedNotification({
        employeeUserId: employee.employeeUserId,
        formType: docType
      });

      // Update local state
      const status = "Validated";
      setEmployees(employees.map(emp => {
        if (emp.id === employeeId) {
          const updates = docType === "clearance" 
            ? { exitClearanceStatus: status }
            : { exitInterviewStatus: status };
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

      setShowValidateConfirm(false);
      setPendingValidation(null);
      setShowValidateSuccess(true);
    } catch (err) {
      console.error('Error validating document:', err);
      setError(`Failed to validate document: ${err.message}`);
      setShowValidateConfirm(false);
      setPendingValidation(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleRejectDocument = async (employeeId, docType) => {
    if (isRejecting) return;
    
    try {
      setIsRejecting(true);
      const employee = employees.find(emp => emp.id === employeeId);
      if (!employee) return;

      const updateData = docType === "clearance" 
        ? {
            signed_exit_clearance_status: 'resubmission_required',
            signed_exit_clearance_url: null,
            signed_exit_clearance_filename: null
          }
        : {
            signed_exit_interview_status: 'resubmission_required',
            signed_exit_interview_url: null,
            signed_exit_interview_filename: null
          };

      const { error: updateError } = await supabase
        .from('employee_separations')
        .update(updateData)
        .eq('id', employee.dbId);

      if (updateError) throw updateError;

      // Send notification to employee
      await createFormResubmissionNotification({
        employeeUserId: employee.employeeUserId,
        formType: docType
      });

      // Update local state
      const status = "Re-submission Required";
      setEmployees(employees.map(emp => {
        if (emp.id === employeeId) {
          const updates = docType === "clearance" 
            ? { exitClearanceStatus: status, exitClearanceFile: null }
            : { exitInterviewStatus: status, exitInterviewFile: null };
          return { ...emp, ...updates };
        }
        return emp;
      }));
      
      if (selectedEmployee?.id === employeeId) {
        const updates = docType === "clearance" 
          ? { exitClearanceStatus: status, exitClearanceFile: null }
          : { exitInterviewStatus: status, exitInterviewFile: null };
        setSelectedEmployee({ ...selectedEmployee, ...updates });
      }

      setShowRejectConfirm(false);
      setPendingValidation(null);
      setShowRejectSuccess(true);
    } catch (err) {
      console.error('Error rejecting document:', err);
      setError(`Failed to reject document: ${err.message}`);
      setShowRejectConfirm(false);
      setPendingValidation(null);
    } finally {
      setIsRejecting(false);
    }
  };

  const handleUploadFinalDocs = async (employeeId) => {
    if (finalDocFiles.length === 0) return;
    
    setShowUploadFinalDocsConfirm(false);
    setUploadingFinalDocs(true);
    
    try {
      setError(null);
      const employee = employees.find(emp => emp.id === employeeId);
      if (!employee) return;

      // Upload files to storage
      const uploadedFileUrls = [];
      const uploadedFileNames = [];
      
      for (const file of finalDocFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${employee.employeeUserId}/final_docs_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('separation-documents')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;
        
        uploadedFileUrls.push(fileName);
        uploadedFileNames.push(file.name);
      }

      // Get existing final docs from database
      const { data: existingRecord } = await supabase
        .from('employee_separations')
        .select('additional_files_urls')
        .eq('id', employee.dbId)
        .single();

      const existingUrls = existingRecord?.additional_files_urls || [];

      // Merge with new uploads - store objects with url and name
      const newFileObjects = uploadedFileUrls.map((url, index) => ({
        url: url,
        name: uploadedFileNames[index]
      }));
      const allFiles = [...existingUrls, ...newFileObjects];

      // Update database
      const { error: updateError } = await supabase
        .from('employee_separations')
        .update({
          additional_files_urls: allFiles
        })
        .eq('id', employee.dbId);

      if (updateError) throw updateError;

      // Update local state with file names for display
      const allNames = allFiles.map(f => f.name);
      setEmployees(employees.map(emp => 
        emp.id === employeeId 
          ? { ...emp, finalDocs: allNames }
          : emp
      ));
      if (selectedEmployee?.id === employeeId) {
        setSelectedEmployee({ ...selectedEmployee, finalDocs: allNames });
      }

      // Clear file input
      setFinalDocFiles([]);
      
    } catch (err) {
      console.error('Error uploading final documents:', err);
      setError(`Failed to upload final documents: ${err.message}`);
    } finally {
      setUploadingFinalDocs(false);
    }
  };

  const handleMarkCompleted = async (employeeId) => {
    if (isMarkingCompleted) return;
    
    setShowMarkCompletedConfirm(false);
    setPendingCompletionEmployeeId(null);
    
    try {
      setIsMarkingCompleted(true);
      const employee = employees.find(emp => emp.id === employeeId);
      if (!employee) return;

      const { error: updateError } = await supabase
        .from('employee_separations')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', employee.dbId);

      if (updateError) throw updateError;

      // Send notification to employee
      await createSeparationCompletedNotification({
        employeeUserId: employee.employeeUserId
      });

      // Update local state
      setEmployees(employees.map(emp => 
        emp.id === employeeId 
          ? { ...emp, isCompleted: true, stage: "completed" }
          : emp
      ));
      if (selectedEmployee?.id === employeeId) {
        setSelectedEmployee({ ...selectedEmployee, isCompleted: true, stage: "completed" });
      }
    } catch (err) {
      console.error('Error marking as completed:', err);
      setError(`Failed to mark as completed: ${err.message}`);
    } finally {
      setIsMarkingCompleted(false);
    }
  };

  const handleDeleteSeparation = async (employeeId) => {
    if (isDeleting) return;
    
    setShowDeleteConfirm(false);
    setPendingDeleteEmployeeId(null);
    
    try {
      setIsDeleting(true);
      const employee = employees.find(emp => emp.id === employeeId);
      if (!employee) return;

      // Delete resignation letter file from storage
      if (employee.resignationFileUrl) {
        const { error: storageError } = await supabase.storage
          .from('separation-documents')
          .remove([employee.resignationFileUrl]);
        
        if (storageError) console.error('Error deleting file from storage:', storageError);
      }

      // Delete the separation record
      const { error: deleteError } = await supabase
        .from('employee_separations')
        .delete()
        .eq('id', employee.dbId);

      if (deleteError) throw deleteError;

      // Remove from local state
      setEmployees(employees.filter(emp => emp.id !== employeeId));
      
      // Clear selection if deleted employee was selected
      if (selectedEmployee?.id === employeeId) {
        setSelectedEmployee(null);
      }

    } catch (err) {
      console.error('Error deleting separation:', err);
      setError(`Failed to delete separation: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTerminateEmployee = async (employeeId) => {
    if (isTerminating) return;
    
    setShowTerminateConfirm(false);
    
    try {
      setIsTerminating(true);
      const employee = employees.find(emp => emp.id === employeeId);
      if (!employee) return;

      let terminationDocUrl = null;
      let terminationDocFilename = null;

      // Upload termination file if provided
      if (terminateFile) {
        const fileExt = terminateFile.name.split('.').pop();
        const fileName = `${employee.employeeUserId}/termination_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('separation-documents')
          .upload(fileName, terminateFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;
        
        terminationDocUrl = fileName;
        terminationDocFilename = terminateFile.name;
      }

      // Calculate account expiry (30 days from now)
      const accountExpiry = new Date();
      accountExpiry.setDate(accountExpiry.getDate() + 30);

      // Update employee_separations table
      const { error: updateError } = await supabase
        .from('employee_separations')
        .update({
          is_terminated: true,
          terminated_at: new Date().toISOString(),
          account_expires_at: accountExpiry.toISOString(),
          termination_doc_url: terminationDocUrl,
          termination_doc_filename: terminationDocFilename
        })
        .eq('id', employee.dbId);

      if (updateError) throw updateError;

      // Send notification to employee
      await createAccountTerminationNotification({
        employeeUserId: employee.employeeUserId,
        expiryDate: accountExpiry.toISOString()
      });

      // Update local state
      const terminationDate = new Date().toISOString();
      setEmployees(employees.map(emp => 
        emp.id === employeeId 
          ? { ...emp, isTerminated: true, terminationDate: terminationDate }
          : emp
      ));
      if (selectedEmployee?.id === employeeId) {
        setSelectedEmployee({ ...selectedEmployee, isTerminated: true, terminationDate: terminationDate });
      }

      // Clear form
      setShowTerminateModal(false);
      setPendingTerminateEmployeeId(null);
      setTerminateFile(null);
      setShowTerminateSuccess(true);

    } catch (err) {
      console.error('Error terminating employee:', err);
      setError(`Failed to terminate employee: ${err.message}`);
    } finally {
      setIsTerminating(false);
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
    
    if (activeTab === "all") return matchesSearch && !emp.isTerminated;
    if (activeTab === "pending") return matchesSearch && emp.stage === "pending" && !emp.isTerminated;
    if (activeTab === "clearance") return matchesSearch && emp.stage === "clearance" && !emp.isTerminated;
    if (activeTab === "completed") return matchesSearch && emp.stage === "completed" && !emp.isTerminated;
    if (activeTab === "terminated") return matchesSearch && emp.isTerminated;
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
    <div className="flex h-screen bg-gray-50 -mx-6">
      {/* Left Sidebar - Employee List */}
      <div className="w-1/3 border-r border-gray-200 bg-white flex flex-col ml-6">
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
          <div className="flex gap-2 mt-4 flex-wrap">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                activeTab === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All ({employees.filter(e => !e.isTerminated).length})
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                activeTab === "pending" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Pending ({employees.filter(e => e.stage === "pending" && !e.isTerminated).length})
            </button>
            <button
              onClick={() => setActiveTab("clearance")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                activeTab === "clearance" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Clearance ({employees.filter(e => e.stage === "clearance" && !e.isTerminated).length})
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                activeTab === "completed" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Completed ({employees.filter(e => e.stage === "completed" && !e.isTerminated).length})
            </button>
            <button
              onClick={() => setActiveTab("terminated")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                activeTab === "terminated" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Terminated ({employees.filter(e => e.isTerminated).length})
            </button>
          </div>
        </div>

        {/* Employee List */}
        <div 
          className="flex-1 overflow-y-auto"
          onScroll={(e) => {
            // Save employee list scroll position as user scrolls
            sessionStorage.setItem('hrSeparationListScrollPosition', e.currentTarget.scrollTop.toString());
          }}
        >
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
                  } ${employee.isTerminated ? "bg-red-50" : ""}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{employee.name}</h3>
                        {employee.resignationType === 'immediate' && (
                          <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded">
                            IMMEDIATE
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{employee.position}</p>
                      {employee.isTerminated && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
                          Terminated
                        </span>
                      )}
                    </div>
                    {!employee.isTerminated && getStageBadge(employee.stage)}
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
      <div 
        className="flex-1 overflow-y-auto pr-6"
        onScroll={(e) => {
          // Save scroll position as user scrolls
          sessionStorage.setItem('hrSeparationScrollPosition', e.currentTarget.scrollTop.toString());
        }}
      >
        {selectedEmployee ? (
          <div className="p-6">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-800">{selectedEmployee.name}</h2>
                {selectedEmployee.resignationType === 'immediate' && (
                  <span className="px-3 py-1 text-sm font-bold bg-red-500 text-white rounded">
                    IMMEDIATE RESIGNATION
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>ID: {selectedEmployee.id}</span>
                <span>•</span>
                <span>{selectedEmployee.position}</span>
                <span>•</span>
                <span>Submitted: {selectedEmployee.submissionDate}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {!selectedEmployee.isTerminated && getStageBadge(selectedEmployee.stage)}
                {selectedEmployee.isTerminated && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    Terminated
                  </span>
                )}
              </div>
              {selectedEmployee.isTerminated && selectedEmployee.terminationDate && (
                <div className="mt-2 text-sm text-gray-600">
                  Termination Date: {new Date(selectedEmployee.terminationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              )}
            </div>

            {/* Stage 1: Resignation Review - Only show if resignation letter exists */}
            {selectedEmployee.resignationFile && (
            <div className={`bg-white rounded-lg shadow-md p-6 mb-6 ${selectedEmployee.isResignationApproved ? 'opacity-50' : ''}`}>
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
                        
                        // Create a blob URL and open in new tab
                        const blob = new Blob([data], { type: data.type });
                        const url = URL.createObjectURL(blob);
                        window.open(url, '_blank');
                        
                        // Clean up the URL after a short delay
                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                      } catch (err) {
                        console.error('Error viewing file:', err);
                        alert('Failed to open file for viewing');
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    View
                  </button>
                </div>

                {!selectedEmployee.isResignationApproved && (
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setPendingApprovalId(selectedEmployee.id);
                        setShowApproveConfirm(true);
                      }}
                      className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                    >
                      Proceed to Stage 2
                    </button>
                    <button
                      onClick={() => {
                        setPendingDeleteEmployeeId(selectedEmployee.id);
                        setShowDeleteConfirm(true);
                      }}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                    >
                      Delete Separation Request
                    </button>
                  </div>
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
                      disabled={true}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel Approval
                    </button>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Stage 2: Clearance & Exit Interview */}
            {(selectedEmployee.isResignationApproved || !selectedEmployee.resignationLetterRequired) && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                {!selectedEmployee.resignationLetterRequired && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> This employee was dismissed and does not require a resignation letter. You can proceed directly with exit clearance and interview forms.
                    </p>
                  </div>
                )}
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
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-800">Provide Forms for Employee Download</h4>
                    {templates?.exit_clearance_form_url && templates?.exit_interview_form_url && (
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Using Global Templates
                      </span>
                    )}
                  </div>

                  {!templates?.exit_clearance_form_url || !templates?.exit_interview_form_url ? (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-yellow-800">No Global Templates Set</p>
                          <p className="text-xs text-yellow-700 mt-1">
                            Upload templates in "Manage Templates" to automatically use them for all employees.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Exit Clearance Form
                      </label>
                      {hrExitClearanceFile ? (
                        <div className={`flex items-center justify-between p-3 rounded-md ${
                          hrExitClearanceFile.isTemplate 
                            ? 'bg-green-50 border-2 border-green-300' 
                            : 'bg-white border border-gray-300'
                        }`}>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {hrExitClearanceFile.isTemplate ? (
                              <span className="flex-shrink-0 px-2 py-0.5 bg-green-600 text-white text-xs rounded font-medium">
                                TEMPLATE
                              </span>
                            ) : null}
                            <p className="text-sm text-gray-700 truncate">📎 {hrExitClearanceFile.name}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {hrExitClearanceFile.isTemplate && (
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept=".pdf,.doc,.docx"
                                  onChange={(e) => {
                                    if (e.target.files[0]) {
                                      setHrExitClearanceFile(e.target.files[0]);
                                    }
                                  }}
                                  className="hidden"
                                />
                                <span className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                  Update
                                </span>
                              </label>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-gray-50 border border-gray-300 rounded-md">
                          <p className="text-sm text-gray-500 mb-2">No file selected</p>
                          <label className="cursor-pointer inline-block px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx"
                              onChange={(e) => {
                                if (e.target.files[0]) {
                                  setHrExitClearanceFile(e.target.files[0]);
                                }
                              }}
                              className="hidden"
                            />
                            Select Custom File
                          </label>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Exit Interview Form
                      </label>
                      {hrExitInterviewFile ? (
                        <div className={`flex items-center justify-between p-3 rounded-md ${
                          hrExitInterviewFile.isTemplate 
                            ? 'bg-green-50 border-2 border-green-300' 
                            : 'bg-white border border-gray-300'
                        }`}>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {hrExitInterviewFile.isTemplate ? (
                              <span className="flex-shrink-0 px-2 py-0.5 bg-green-600 text-white text-xs rounded font-medium">
                                TEMPLATE
                              </span>
                            ) : null}
                            <p className="text-sm text-gray-700 truncate">📎 {hrExitInterviewFile.name}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {hrExitInterviewFile.isTemplate && (
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept=".pdf,.doc,.docx"
                                  onChange={(e) => {
                                    if (e.target.files[0]) {
                                      setHrExitInterviewFile(e.target.files[0]);
                                    }
                                  }}
                                  className="hidden"
                                />
                                <span className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                  Update
                                </span>
                              </label>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-gray-50 border border-gray-300 rounded-md">
                          <p className="text-sm text-gray-500 mb-2">No file selected</p>
                          <label className="cursor-pointer inline-block px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx"
                              onChange={(e) => {
                                if (e.target.files[0]) {
                                  setHrExitInterviewFile(e.target.files[0]);
                                }
                              }}
                              className="hidden"
                            />
                            Select Custom File
                          </label>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => {
                          setPendingUploadEmployeeId(selectedEmployee.id);
                          setShowUploadFormsConfirm(true);
                        }}
                        disabled={!hrExitClearanceFile || !hrExitInterviewFile}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        {selectedEmployee.hrExitFormsUploaded ? 'Update Forms for Employee' : 'Send Forms to Employee'}
                      </button>
                      {selectedEmployee.hrExitFormsUploaded && (
                        <p className="text-xs text-gray-500 mt-2 text-center">
                          Forms already uploaded. Click to update with new versions.
                        </p>
                      )}
                    </div>
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
                        {selectedEmployee.exitClearanceStatus !== "Validated" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setPendingValidation({ employeeId: selectedEmployee.id, docType: "clearance" });
                                setShowValidateConfirm(true);
                              }}
                              className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm transition-colors"
                            >
                              Validate
                            </button>
                            <button
                              onClick={() => {
                                setPendingValidation({ employeeId: selectedEmployee.id, docType: "clearance" });
                                setShowRejectConfirm(true);
                              }}
                              className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm transition-colors"
                            >
                              Require Re-submission
                            </button>
                          </div>
                        )}
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
                        {selectedEmployee.exitInterviewStatus !== "Validated" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setPendingValidation({ employeeId: selectedEmployee.id, docType: "interview" });
                                setShowValidateConfirm(true);
                              }}
                              className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm transition-colors"
                            >
                              Validate
                            </button>
                            <button
                              onClick={() => {
                                setPendingValidation({ employeeId: selectedEmployee.id, docType: "interview" });
                                setShowRejectConfirm(true);
                              }}
                              className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm transition-colors"
                            >
                              Require Re-submission
                            </button>
                          </div>
                        )}
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
                      <div className="mt-3 space-y-2">
                        <div className="space-y-1">
                          {finalDocFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <p className="text-sm text-gray-600">• {file.name}</p>
                              <button
                                onClick={() => {
                                  const newFiles = finalDocFiles.filter((_, i) => i !== index);
                                  setFinalDocFiles(newFiles);
                                }}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => setShowUploadFinalDocsConfirm(true)}
                          disabled={uploadingFinalDocs}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
                        >
                          {uploadingFinalDocs ? 'Uploading...' : 'Upload Files'}
                        </button>
                      </div>
                    )}
                  </div>

                  {selectedEmployee.finalDocs && selectedEmployee.finalDocs.length > 0 && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-2">Uploaded Final Documents:</p>
                      <div className="space-y-2">
                        {selectedEmployee.finalDocs.map((doc, index) => {
                          // Handle both object format {url, name} and string format
                          let fileName = '';
                          
                          if (typeof doc === 'object') {
                            fileName = doc.name || 'Unnamed file';
                          } else {
                            fileName = doc;
                          }
                          
                          return (
                            <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200">
                              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              <span className="text-sm text-gray-700">{fileName}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!selectedEmployee.isCompleted && (
                    <button
                      onClick={() => {
                        setPendingCompletionEmployeeId(selectedEmployee.id);
                        setShowMarkCompletedConfirm(true);
                      }}
                      className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                    >
                      Mark Separation as Completed
                    </button>
                  )}

                  {selectedEmployee.isCompleted && (
                    <div className="space-y-3">
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm font-medium text-green-800">✓ Separation process completed</p>
                      </div>
                      <button
                        onClick={() => {
                          setPendingTerminateEmployeeId(selectedEmployee.id);
                          setShowTerminateModal(true);
                        }}
                        disabled={selectedEmployee.isTerminated}
                        className={`w-full px-4 py-3 rounded-md transition-colors font-medium ${
                          selectedEmployee.isTerminated
                            ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                            : 'bg-red-600 text-white hover:bg-red-700'
                        }`}
                      >
                        {selectedEmployee.isTerminated ? 'Employee Already Terminated' : 'Terminate Employee'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!selectedEmployee.isResignationApproved && selectedEmployee.resignationLetterRequired && (
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
              Are you sure you want to proceed with this resignation? This will unlock Stage 2 for the employee to complete their exit clearance and interview forms.
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
                disabled={isApproving}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApproving ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terminate Employee Modal */}
      {showTerminateModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-black max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-red-600 mb-4">Terminate Employee</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Employee Name:</p>
                <p className="font-medium text-gray-800">{selectedEmployee?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Termination Date:</p>
                <p className="font-medium text-gray-800">{new Date().toLocaleDateString('en-CA')}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Upload Termination Document:</label>
                <input
                  type="file"
                  onChange={(e) => setTerminateFile(e.target.files[0])}
                  className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowTerminateModal(false);
                  setPendingTerminateEmployeeId(null);
                  setTerminateFile(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowTerminateModal(false);
                  setShowTerminateConfirm(true);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Terminate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terminate Confirmation Modal */}
      {showTerminateConfirm && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-black max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-red-600 mb-4">Confirm Termination?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to terminate this employee? The employee will have access to their account for 30 days before it is closed.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowTerminateConfirm(false);
                  setShowTerminateModal(true);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleTerminateEmployee(pendingTerminateEmployeeId)}
                disabled={isTerminating}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTerminating ? 'Terminating...' : 'Confirm Terminate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Separation Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-black max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-red-600 mb-4">Delete Separation Request?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this separation request? This will permanently remove the resignation letter and all associated data. The employee will need to submit a new resignation if they wish to proceed.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setPendingDeleteEmployeeId(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteSeparation(pendingDeleteEmployeeId)}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
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
                disabled={isUploadingForms}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploadingForms ? 'Uploading...' : 'Upload'}
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

      {/* Validate Document Confirmation Modal */}
      {showValidateConfirm && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-black max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Validate Document?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to validate this {pendingValidation?.docType === "clearance" ? "Exit Clearance" : "Exit Interview"} form? This will mark it as approved.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowValidateConfirm(false);
                  setPendingValidation(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleValidateDocument(pendingValidation?.employeeId, pendingValidation?.docType)}
                disabled={isValidating}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isValidating ? 'Validating...' : 'Validate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Document Confirmation Modal */}
      {showRejectConfirm && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-black max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Require Re-submission?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to reject this {pendingValidation?.docType === "clearance" ? "Exit Clearance" : "Exit Interview"} form? The employee will need to re-submit it.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectConfirm(false);
                  setPendingValidation(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRejectDocument(pendingValidation?.employeeId, pendingValidation?.docType)}
                disabled={isRejecting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRejecting ? 'Processing...' : 'Require Re-submission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validate Success Modal */}
      {showValidateSuccess && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-black max-w-md w-full mx-4 p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">
                Document Validated!
              </h3>
            </div>
            <p className="text-gray-600 mb-6 ml-16">
              The document has been successfully validated and approved.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowValidateSuccess(false)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Success Modal */}
      {showRejectSuccess && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-black max-w-md w-full mx-4 p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">
                Re-submission Required
              </h3>
            </div>
            <p className="text-gray-600 mb-6 ml-16">
              The document has been rejected. The employee will be notified to re-submit.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowRejectSuccess(false)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terminate Success Modal */}
      {showTerminateSuccess && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-black max-w-md w-full mx-4 p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">
                Employee Terminated Successfully!
              </h3>
            </div>
            <p className="text-gray-600 mb-6 ml-16">
              The employee has been terminated. Their account will expire in 30 days and they will be notified.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowTerminateSuccess(false)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Final Docs Confirmation Modal */}
      {showUploadFinalDocsConfirm && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-black max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Upload Final Documents?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to upload these final HR documents? They will be saved to the employee's separation record.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowUploadFinalDocsConfirm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUploadFinalDocs(selectedEmployee.id)}
                disabled={uploadingFinalDocs}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingFinalDocs ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Completed Confirmation Modal */}
      {showMarkCompletedConfirm && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-black max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Mark Separation as Completed?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to mark this employee's separation as completed? This action will finalize the separation process.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowMarkCompletedConfirm(false);
                  setPendingCompletionEmployeeId(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleMarkCompleted(pendingCompletionEmployeeId)}
                disabled={isMarkingCompleted}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMarkingCompleted ? 'Processing...' : 'Mark as Completed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HrSeperation;
