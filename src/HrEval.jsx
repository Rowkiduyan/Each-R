import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { createNotification } from './notifications';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { buildEachRAutoTableDefaults } from "./utils/eachrPdf";
import { validateNoSunday } from "./utils/dateTimeRules";

function HrEval() {
  // Tab and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [employmentFilter, setEmploymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState(null);

  const [evalSearchQuery, setEvalSearchQuery] = useState("");
  const [evalDateSort, setEvalDateSort] = useState("newest");
  const [evalRemarksFilter, setEvalRemarksFilter] = useState("all");
  const [evalReasonFilter, setEvalReasonFilter] = useState("all");
  const [exportingEmployeeId, setExportingEmployeeId] = useState(null);
  const itemsPerPage = 8;

  // Data state
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingType, setUpdatingType] = useState(false);
  const [updatingNextDue, setUpdatingNextDue] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [uploadRecords, setUploadRecords] = useState([
    {
      evaluatorName: "",
      reason: "",
      dateEvaluated: "",
      totalScore: "",
      file: null,
    },
  ]);
  const [finalRemarks, setFinalRemarks] = useState("");
  const [requireResignationLetter, setRequireResignationLetter] = useState(false);
  const [showUploadConfirm, setShowUploadConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showTypeChangeConfirm, setShowTypeChangeConfirm] = useState(false);
  const [typeChangeData, setTypeChangeData] = useState(null);
  const [showNextDueConfirm, setShowNextDueConfirm] = useState(false);
  const [nextDueChangeData, setNextDueChangeData] = useState(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("info"); // 'success', 'error', 'info', 'warning'
  const [employeeInSeparation, setEmployeeInSeparation] = useState(false);
  const [separationDetails, setSeparationDetails] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [currentUserDepot, setCurrentUserDepot] = useState(null);

  // Get current user's role and depot
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, depot')
            .eq('id', user.id)
            .single();
          
          if (profile) {
            setCurrentUserRole(profile.role);
            setCurrentUserDepot(profile.depot);
          }
        }
      } catch (err) {
        console.error('Error loading current user:', err);
      }
    };
    
    loadCurrentUser();
  }, []);

  // Fetch employees from database (HR sees all employees)
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("employees")
          .select(`
            id, fname, lname, mname, position, depot, hired_at, status, 
            source, endorsed_by_agency_id, agency_profile_id, auth_user_id,
            employee_separations(is_terminated)
          `);

        if (error) {
          console.error("Error loading employees for evaluations:", error);
          setEmployees([]);
          return;
        }

        let filteredData = data || [];
        
        // Get auth_user_ids to check account status
        const authUserIds = filteredData.filter(emp => emp.auth_user_id).map(emp => emp.auth_user_id);
        
        // Fetch account status from profiles
        let accountStatusMap = {};
        if (authUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, account_expires_at, is_active')
            .in('id', authUserIds);
          
          if (profiles) {
            profiles.forEach(profile => {
              accountStatusMap[profile.id] = {
                isActive: profile.is_active !== false,
                isExpired: profile.account_expires_at ? new Date(profile.account_expires_at) < new Date() : false
              };
            });
          }
        }
        
        // Filter out terminated employees and those with expired/disabled accounts
        filteredData = filteredData.filter(emp => {
          // Check termination status
          if (emp.employee_separations && emp.employee_separations.is_terminated) return false;
          
          // Check account status if employee has auth_user_id
          if (emp.auth_user_id && accountStatusMap[emp.auth_user_id]) {
            const accountStatus = accountStatusMap[emp.auth_user_id];
            if (!accountStatus.isActive || accountStatus.isExpired) return false;
          }
          
          return true;
        });
        
        // Filter by depot for HRC users
        if (currentUserRole === 'HRC' && currentUserDepot) {
          filteredData = filteredData.filter(emp => emp.depot === currentUserDepot);
        }

        const mapped = filteredData.map((emp) => {
          const lastFirst = [emp.lname, emp.fname].filter(Boolean).join(", ");
          const fullName = [lastFirst, emp.mname].filter(Boolean).join(" ");

          // Map status from database to lowercase for UI
          let employmentType = "regular"; // default
          if (emp.status === "Probationary") {
            employmentType = "probationary";
          } else if (emp.status === "Regular") {
            employmentType = "regular";
          }

          return {
            id: emp.id,
            name: fullName || "Unnamed employee",
            position: emp.position || "Not set",
            depot: emp.depot || "-",
            employmentType: employmentType,
            hireDate: emp.hired_at || null,
            lastEvaluation: null,
            nextEvaluation: null,
            evaluations: [],
            source: emp.source || null,
            endorsedByAgencyId: emp.endorsed_by_agency_id || null,
            agencyProfileId: emp.agency_profile_id || null,
          };
        });

        setEmployees(mapped);
        
        // Fetch evaluations for each employee
        await fetchAllEvaluations(mapped);
      } catch (err) {
        console.error("Unexpected error loading employees for evaluations:", err);
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    if (currentUserRole !== null) {
      fetchEmployees();
    }
  }, [currentUserRole, currentUserDepot]);

  // Helper function to show alert modal
  const showAlert = (message, type = "info") => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlertModal(true);
  };

  // Check if employee is in separation process
  const checkEmployeeSeparationStatus = async (employeeId) => {
    try {
      const { data, error } = await supabase
        .from('employee_separations')
        .select('*')
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (error) {
        console.error('Error checking separation status:', error);
        return;
      }

      if (data) {
        setEmployeeInSeparation(true);
        setSeparationDetails(data);
      } else {
        setEmployeeInSeparation(false);
        setSeparationDetails(null);
      }
    } catch (err) {
      console.error('Error checking separation status:', err);
      setEmployeeInSeparation(false);
      setSeparationDetails(null);
    }
  };

  // Fetch all evaluations for employees
  const fetchAllEvaluations = async (employeeList) => {
    try {
      const { data: evaluationsData, error } = await supabase
        .from("evaluations")
        .select("*")
        .order("date_evaluated", { ascending: false });

      if (error) {
        console.error("Error fetching evaluations:", error);
        return;
      }

      // Group evaluations by employee_id
      const evaluationsByEmployee = {};
      evaluationsData?.forEach((evaluation) => {
        if (!evaluationsByEmployee[evaluation.employee_id]) {
          evaluationsByEmployee[evaluation.employee_id] = [];
        }
        evaluationsByEmployee[evaluation.employee_id].push(evaluation);
      });

      // Update employees with their evaluations and get type/next_due from most recent evaluation
      const updatedEmployees = employeeList.map((emp) => {
        const empEvaluations = evaluationsByEmployee[emp.id] || [];
        const mostRecent = empEvaluations[0];
        
        // Find the latest Annual evaluation date for next_due calculation
        let nextEvaluation = mostRecent?.next_due || null;
        const annualEvals = empEvaluations.filter(e => e.reason === 'Annual');
        if (annualEvals.length > 0) {
          // Get the latest Annual evaluation date
          const latestAnnualDate = annualEvals[0].date_evaluated; // Already sorted by date_evaluated desc
          const nextDueDate = new Date(latestAnnualDate);
          nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
          nextEvaluation = nextDueDate.toISOString().split('T')[0];
        }
        
        // Auto-set next_due for probationary employees with no evaluations
        if (!nextEvaluation && emp.employmentType === "probationary") {
          const baseDate = emp.hireDate ? new Date(emp.hireDate) : new Date();
          const threeMonthsLater = new Date(baseDate);
          threeMonthsLater.setMonth(baseDate.getMonth() + 3);
          nextEvaluation = threeMonthsLater.toISOString().split('T')[0];
        }
        
        // Auto-set next_due for regular employees with no evaluations
        if (!nextEvaluation && emp.employmentType === "regular") {
          const baseDate = emp.hireDate ? new Date(emp.hireDate) : new Date();
          const oneYearLater = new Date(baseDate);
          oneYearLater.setFullYear(baseDate.getFullYear() + 1);
          nextEvaluation = oneYearLater.toISOString().split('T')[0];
        }
        
        return {
          ...emp,
          evaluations: empEvaluations,
          lastEvaluation: mostRecent?.date_evaluated || null,
          employmentType: emp.employmentType, // Keep the status from employees table
          nextEvaluation: nextEvaluation,
        };
      });

      setEmployees(updatedEmployees);
    } catch (err) {
      console.error("Error fetching evaluations:", err);
    }
  };

  // Handle file upload
  const handleUploadEvaluation = async () => {
    // Validate final remarks
    if (!finalRemarks) {
      showAlert("Please provide final remarks for the evaluation.", "warning");
      return;
    }

    // Validate all records
    for (let i = 0; i < uploadRecords.length; i++) {
      const record = uploadRecords[i];
      // For probationary employees, auto-set reason to Regularization
      const reason = selectedEmployee?.employmentType === 'probationary' ? 'Regularization' : record.reason;
      if (!record.file || !record.evaluatorName || !reason || !record.dateEvaluated || !record.totalScore) {
        showAlert(`Please fill in all required fields for Record ${i + 1}.`, "warning");
        return;
      }
    }

    try {
      setUploading(true);
      let successCount = 0;
      let failCount = 0;

      // Process each record
      for (const record of uploadRecords) {
        try {
          // For probationary employees, use Regularization as reason
          const finalReason = selectedEmployee?.employmentType === 'probationary' ? 'Regularization' : record.reason;
          
          // Use the final remarks for all records
          const recordRemarks = finalRemarks;
          
          // Calculate next_due based on reason, date_evaluated, and remarks
          let nextDueDate = null;
          
          // For probationary employees with "Observe" remark, set next_due to 90 days from now
          if (selectedEmployee?.employmentType === 'probationary' && recordRemarks === 'Observe') {
            const today = new Date();
            today.setDate(today.getDate() + 90);
            nextDueDate = today.toISOString().split('T')[0];
          } else if (finalReason === 'Annual' && record.dateEvaluated) {
            const evalDate = new Date(record.dateEvaluated);
            evalDate.setFullYear(evalDate.getFullYear() + 1);
            nextDueDate = evalDate.toISOString().split('T')[0];
          }

          // Upload file to Supabase storage
          const fileExt = record.file.name.split(".").pop();
          const fileName = `${selectedEmployee.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
          const filePath = `${selectedEmployee.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("evaluations")
            .upload(filePath, record.file);

          if (uploadError) {
            console.error("Error uploading file:", uploadError);
            failCount++;
            continue;
          }

          // Insert evaluation record into database
          const { error: insertError } = await supabase
            .from("evaluations")
            .insert([
              {
                employee_id: selectedEmployee.id,
                evaluator_name: record.evaluatorName,
                reason: finalReason || null,
                date_evaluated: record.dateEvaluated,
                total_score: parseFloat(record.totalScore),
                remarks: recordRemarks,
                file_path: filePath,
                original_filename: record.file.name,
                next_due: nextDueDate,
              },
            ]);

          if (insertError) {
            console.error("Error inserting evaluation record:", insertError);
            failCount++;
            continue;
          }

          successCount++;
        } catch (err) {
          console.error("Error processing record:", err);
          failCount++;
        }
      }

      // Check if final remarks is "Dismissed" - create or update separation record
      if (finalRemarks === 'Dismissed') {
        // Check if a separation record already exists
        const { data: existingSeparation } = await supabase
          .from('employee_separations')
          .select('*')
          .eq('employee_id', selectedEmployee.id)
          .maybeSingle();

        if (existingSeparation) {
          // Update existing separation record with resignation letter requirement
          const { error: updateSepError } = await supabase
            .from('employee_separations')
            .update({ 
              resignation_letter_required: requireResignationLetter,
              updated_at: new Date().toISOString()
            })
            .eq('employee_id', selectedEmployee.id);

          if (updateSepError) {
            console.error('Error updating separation record:', updateSepError);
          }
        } else {
          // Create new separation record
          const { error: insertSepError } = await supabase
            .from('employee_separations')
            .insert({
              employee_id: selectedEmployee.id,
              status: 'pending',
              resignation_status: 'none',
              resignation_letter_required: requireResignationLetter,
              type: 'resignation',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (insertSepError) {
            console.error('Error creating separation record:', insertSepError);
          }
        }
      }

      // Check if we need to change employee type from Probationary to Regular
      // This happens when a probationary employee gets a "Retained" remark
      if (selectedEmployee?.employmentType === 'probationary') {
        // Check if the final remarks is "Retained"
        const hasRetainedRemark = finalRemarks === 'Retained';
        
        if (hasRetainedRemark) {
          // Update employee status to Regular
          const { error: empUpdateError } = await supabase
            .from('employees')
            .update({ status: 'Regular' })
            .eq('id', selectedEmployee.id);

          if (empUpdateError) {
            console.error('Error updating employee type:', empUpdateError);
          } else {
            // Calculate next due date for regular employee (1 year from now)
            const nextDueDate = new Date();
            nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
            const nextDueDateStr = nextDueDate.toISOString().split('T')[0];

            // Update the most recent evaluation's next_due and type
            const { error: evalUpdateError } = await supabase
              .from('evaluations')
              .update({ 
                type: 'Regular',
                next_due: nextDueDateStr
              })
              .eq('employee_id', selectedEmployee.id)
              .order('date_evaluated', { ascending: false })
              .limit(1);

            if (evalUpdateError) {
              console.error('Error updating evaluation type:', evalUpdateError);
            }
          }
        }
      }

      // Refresh evaluations for this employee
      const { data: updatedEvals, error: fetchError } = await supabase
        .from("evaluations")
        .select("*")
        .eq("employee_id", selectedEmployee.id)
        .order("date_evaluated", { ascending: false });

      if (!fetchError) {
        const mostRecent = updatedEvals?.[0];
        
        // Find the latest Annual evaluation date for next_due calculation
        let nextEvaluation = mostRecent?.next_due || null;
        const annualEvals = updatedEvals?.filter(e => e.reason === 'Annual') || [];
        if (annualEvals.length > 0) {
          // Get the latest Annual evaluation date
          const latestAnnualDate = annualEvals[0].date_evaluated;
          const nextDueDate = new Date(latestAnnualDate);
          nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
          nextEvaluation = nextDueDate.toISOString().split('T')[0];
        }
        
        // Check if employee type was changed to Regular
        const hasRetainedRemark = uploadRecords.some(record => record.remarks === 'Retained');
        const newEmploymentType = (selectedEmployee?.employmentType === 'probationary' && hasRetainedRemark) 
          ? 'regular' 
          : (mostRecent?.type?.toLowerCase() || selectedEmployee.employmentType);
        
        setEmployees((prev) =>
          prev.map((emp) =>
            emp.id === selectedEmployee.id
              ? {
                  ...emp,
                  evaluations: updatedEvals || [],
                  lastEvaluation: mostRecent?.date_evaluated || null,
                  employmentType: newEmploymentType,
                  nextEvaluation: nextEvaluation,
                }
              : emp
          )
        );
      }

      // Create notification for the employee
      if (successCount > 0) {
        await createNotification({
          userId: selectedEmployee.id,
          type: 'evaluation_uploaded',
          title: 'New Evaluation Record',
          message: `HR has uploaded ${successCount} evaluation record${successCount > 1 ? 's' : ''} for you. Final remarks: ${finalRemarks}`,
          userType: 'employee'
        });

        // If employee is from agency, notify the agency as well
        if (selectedEmployee.source && selectedEmployee.source.toLowerCase() === 'agency') {
          const agencyUserId = selectedEmployee.endorsedByAgencyId || selectedEmployee.agencyProfileId;
          if (agencyUserId) {
            // Check if employee was dismissed
            if (finalRemarks === 'Dismissed') {
              await createNotification({
                userId: agencyUserId,
                type: 'evaluation_dismissed_agency',
                title: 'Employee Dismissed - Action Required',
                message: `HR has dismissed ${selectedEmployee.name}. Please check the separation process. Resignation letter ${requireResignationLetter ? 'required' : 'not required'}.`,
                userType: 'profile'
              });
            } else {
              await createNotification({
                userId: agencyUserId,
                type: 'evaluation_uploaded_agency',
                title: 'Evaluation Uploaded for Endorsee',
                message: `HR has uploaded ${successCount} evaluation record${successCount > 1 ? 's' : ''} for ${selectedEmployee.name}. Final remarks: ${finalRemarks}`,
                userType: 'profile'
              });
            }
          }
        }
      }

      // Reset form and close modal
      setUploadRecords([
        {
          evaluatorName: "",
          reason: "",
          dateEvaluated: "",
          totalScore: "",
          file: null,
        },
      ]);
      setFinalRemarks("");
      setShowUploadModal(false);
      
      if (failCount === 0) {
        showAlert(`All ${successCount} evaluation(s) uploaded successfully!`, "success");
      } else {
        showAlert(`${successCount} evaluation(s) uploaded successfully. ${failCount} failed.`, "warning");
      }
    } catch (err) {
      console.error("Error uploading evaluations:", err);
      showAlert("An error occurred. Please try again.", "error");
    } finally {
      setUploading(false);
    }
  };

  // Handle delete evaluation
  const handleDeleteEvaluation = async () => {
    if (!deleteTarget || deleting) return;

    setDeleting(true);
    try {
      // If evaluation has "Dismissed" remarks, delete associated separation record
      if (deleteTarget.remarks === "Dismissed") {
        // First, get the separation record to check for uploaded files
        const { data: separationData } = await supabase
          .from("employee_separations")
          .select("resignation_letter_url, signed_exit_clearance_url, signed_exit_interview_url")
          .eq("employee_id", deleteTarget.employee_id)
          .maybeSingle();

        // Delete any uploaded files from storage
        if (separationData) {
          const filesToDelete = [
            separationData.resignation_letter_url,
            separationData.signed_exit_clearance_url,
            separationData.signed_exit_interview_url
          ].filter(Boolean);

          if (filesToDelete.length > 0) {
            const { error: storageError } = await supabase.storage
              .from("separation-documents")
              .remove(filesToDelete);

            if (storageError) {
              console.error("Error deleting separation files:", storageError);
            }
          }
        }

        // Delete the separation record
        const { error: separationDeleteError } = await supabase
          .from("employee_separations")
          .delete()
          .eq("employee_id", deleteTarget.employee_id);

        if (separationDeleteError) {
          console.error("Error deleting separation record:", separationDeleteError);
          // Continue with evaluation deletion even if separation deletion fails
        } else {
          console.log("Associated separation record and files deleted successfully");
          
          // Also delete any dismissal-related notifications for this employee
          await supabase
            .from("notifications")
            .delete()
            .eq("user_id", deleteTarget.employee_id)
            .eq("type", "evaluation_uploaded");
        }
      }

      // Delete file from storage
      if (deleteTarget.file_path) {
        const { error: storageError } = await supabase.storage
          .from("evaluations")
          .remove([deleteTarget.file_path]);

        if (storageError) {
          console.error("Error deleting file from storage:", storageError);
        }
      }

      // Delete record from database
      const { error: dbError } = await supabase
        .from("evaluations")
        .delete()
        .eq("id", deleteTarget.id);

      if (dbError) {
        console.error("Error deleting evaluation record:", dbError);
        showAlert("Failed to delete evaluation. Please try again.", "error");
        return;
      }

      // Refresh evaluations for this employee
      const { data: updatedEvals, error: fetchError } = await supabase
        .from("evaluations")
        .select("*")
        .eq("employee_id", deleteTarget.employee_id)
        .order("date_evaluated", { ascending: false });

      if (!fetchError) {
        setEmployees((prev) =>
          prev.map((emp) =>
            emp.id === deleteTarget.employee_id
              ? {
                  ...emp,
                  evaluations: updatedEvals || [],
                  lastEvaluation: updatedEvals?.[0]?.date_evaluated || null,
                }
              : emp
          )
        );
      }

      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      showAlert("Evaluation deleted successfully!", "success");
    } catch (err) {
      console.error("Error deleting evaluation:", err);
      showAlert("An error occurred. Please try again.", "error");
    } finally {
      setDeleting(false);
    }
  };

  // Handle update employee type (updates most recent evaluation)
  const handleUpdateEmployeeType = async (employeeId, newType) => {
    const employee = employees.find(emp => emp.id === employeeId);
    let mostRecentEval = employee?.evaluations?.[0];

    // Show confirmation modal regardless of whether evaluation exists
    setTypeChangeData({ employeeId, newType, employee, evaluationId: mostRecentEval?.id || null });
    setShowTypeChangeConfirm(true);
  };

  // Confirm type change
  const confirmTypeChange = async () => {
    if (!typeChangeData || updatingType) return;

    setUpdatingType(true);
    try {
      // Calculate next_due based on employee type
      let nextDueDate = null;
      if (typeChangeData.newType === 'regular') {
        // Regular: one year from today
        const today = new Date();
        const nextYear = new Date(today);
        nextYear.setFullYear(today.getFullYear() + 1);
        nextDueDate = nextYear.toISOString().split('T')[0];
      } else if (typeChangeData.newType === 'probationary') {
        // Probationary: 3 months from today
        const today = new Date();
        const threeMonthsLater = new Date(today);
        threeMonthsLater.setMonth(today.getMonth() + 3);
        nextDueDate = threeMonthsLater.toISOString().split('T')[0];
      }

      // Capitalize the type to match database constraint (Regular or Probationary)
      const formattedType = typeChangeData.newType.charAt(0).toUpperCase() + typeChangeData.newType.slice(1);

      // Update employees table status column (this is what Employees.jsx reads)
      const { error: empError } = await supabase
        .from("employees")
        .update({ status: formattedType })
        .eq("id", typeChangeData.employeeId);

      if (empError) {
        console.error("Error updating employee status:", empError);
        showAlert(`Failed to update employee status: ${empError.message || 'Unknown error'}`, "error");
        return;
      }

      // If evaluation exists, also update it for consistency
      if (typeChangeData.evaluationId) {
        const { data, error } = await supabase
          .from("evaluations")
          .update({ 
            type: formattedType,
            next_due: nextDueDate 
          })
          .eq("id", typeChangeData.evaluationId)
          .select();

        if (error) {
          console.error("Error updating evaluation type:", error);
          console.error("Error details:", JSON.stringify(error, null, 2));
          showAlert(`Failed to update evaluation type: ${error.message || 'Unknown error'}`, "error");
          return;
        }

        console.log("Evaluation update successful:", data);
      }

      // Update local state
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === typeChangeData.employeeId
            ? { 
                ...emp, 
                employmentType: typeChangeData.newType,
                nextEvaluation: nextDueDate 
              }
            : emp
        )
      );

      setShowTypeChangeConfirm(false);
      setTypeChangeData(null);
      showAlert("Employee type updated successfully!", "success");
    } catch (err) {
      console.error("Error updating employee type:", err);
      showAlert("An error occurred. Please try again.", "error");
    } finally {
      setUpdatingType(false);
    }
  };

  // Handle update next due date (updates most recent evaluation)
  const handleUpdateNextDue = (employeeId, nextDueDate) => {
    // Find the most recent evaluation for this employee
    const employee = employees.find(emp => emp.id === employeeId);
    const mostRecentEval = employee?.evaluations?.[0];
    
    if (!mostRecentEval) {
      showAlert("No evaluation found for this employee. Please upload an evaluation first.", "warning");
      return;
    }

    // Show confirmation modal
    setNextDueChangeData({ employeeId, nextDueDate, evaluationId: mostRecentEval.id, employee });
    setShowNextDueConfirm(true);
  };

  // Confirm next due date change
  const confirmNextDueChange = async () => {
    if (!nextDueChangeData || updatingNextDue) return;

    setUpdatingNextDue(true);
    try {
      // Handle empty string as null for database
      const nextDueValue = nextDueChangeData.nextDueDate === "" ? null : nextDueChangeData.nextDueDate;
      
      const { error } = await supabase
        .from("evaluations")
        .update({ next_due: nextDueValue })
        .eq("id", nextDueChangeData.evaluationId);

      if (error) {
        console.error("Error updating next due date:", error);
        showAlert("Failed to update next due date. Please try again.", "error");
        return;
      }

      // Update local state
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === nextDueChangeData.employeeId
            ? { ...emp, nextEvaluation: nextDueValue }
            : emp
        )
      );

      setShowNextDueConfirm(false);
      setNextDueChangeData(null);
      showAlert(nextDueValue ? "Next due date updated successfully!" : "Next due date cleared successfully!", "success");
    } catch (err) {
      console.error("Error updating next due date:", err);
      showAlert("An error occurred. Please try again.", "error");
    } finally {
      setUpdatingNextDue(false);
    }
  };

  // Helper: calculate status based on nextEvaluation date
  const calculateStatus = (nextEvaluation) => {
    if (!nextEvaluation) return "uptodate";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(nextEvaluation);
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate.getTime() === today.getTime()) return "duetoday";
    if (dueDate < today) return "overdue";
    return "uptodate";
  };

  // Add status to employees
  const employeesWithStatus = employees.map((emp) => ({
    ...emp,
    status: calculateStatus(emp.nextEvaluation),
  }));

  // Calculate stats
  const stats = {
    totalEmployees: employeesWithStatus.length,
    dueForEval: employeesWithStatus.filter(
      (e) => e.status === "duetoday" || e.status === "overdue"
    ).length,
    overdueCount: employeesWithStatus.filter((e) => e.status === "overdue").length,
    probationaryCount: employeesWithStatus.filter(
      (e) => e.employmentType === "probationary"
    ).length,
  };

  // Get current data based on filters and search
  const getCurrentData = () => {
    let data = [...employeesWithStatus];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter((item) =>
        [item.name, item.id, item.position, item.depot]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(query))
      );
    }

    // Employment filter
    if (employmentFilter !== "all") {
      data = data.filter((item) => item.employmentType === employmentFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      data = data.filter((item) => item.status === statusFilter);
    }

    // Sort by status priority: Due Today first, then Overdue, then Up to Date
    data.sort((a, b) => {
      const statusOrder = { duetoday: 0, overdue: 1, uptodate: 2 };
      return statusOrder[a.status] - statusOrder[b.status];
    });

    return data;
  };

  const filteredData = getCurrentData();
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const sanitizeFileName = (value) => String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^a-zA-Z0-9 _-]+/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 120) || "export";

  const getFilteredEmployeeEvaluations = useCallback((employee) => {
    const list = Array.isArray(employee?.evaluations) ? [...employee.evaluations] : [];
    if (list.length === 0) return [];

    const filtered = list.filter((evaluation) => {
      const evaluatorName = String(evaluation?.evaluator_name ?? "");
      const matchesSearch = evalSearchQuery === "" || evaluatorName.toLowerCase().includes(evalSearchQuery.toLowerCase());
      const matchesRemarks = evalRemarksFilter === "all" || evaluation?.remarks === evalRemarksFilter;
      const matchesReason = evalReasonFilter === "all" || evaluation?.reason === evalReasonFilter;
      return matchesSearch && matchesRemarks && matchesReason;
    });

    filtered.sort((a, b) => {
      const dateA = new Date(a?.date_evaluated);
      const dateB = new Date(b?.date_evaluated);
      return evalDateSort === "newest" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [evalDateSort, evalReasonFilter, evalRemarksFilter, evalSearchQuery]);

  // Helpers for UI
  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = [
      "from-red-500 to-red-600",
      "from-blue-500 to-blue-600",
      "from-green-500 to-green-600",
      "from-purple-500 to-purple-600",
      "from-orange-500 to-orange-600",
      "from-pink-500 to-pink-600",
      "from-teal-500 to-teal-600",
      "from-indigo-500 to-indigo-600",
    ];
    const index =
      name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
      colors.length;
    return colors[index];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "None";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      overdue: { text: "text-red-600", label: "Overdue" },
      duetoday: { text: "text-orange-600", label: "Due Today" },
      uptodate: { text: "text-green-600", label: "Up to Date" },
    };
    return styles[status] || styles.uptodate;
  };

  const exportEmployeeEvaluationPdf = useCallback(async (employee) => {
    if (!employee) return;
    const evaluations = getFilteredEmployeeEvaluations(employee);
    if (evaluations.length === 0) {
      showAlert("No evaluation records to export for this employee (based on current filters).", "warning");
      return;
    }

    const exportId = employee.id;
    setExportingEmployeeId(exportId);

    try {
      const exportedAt = new Date();
      const exportedAtLabel = exportedAt.toLocaleString("en-US");

      const safeText = (v) => {
        const s = String(v ?? "").trim();
        if (!s || s === "—" || s === "--") return "None";
        return s;
      };

      const filterSummary = [
        evalSearchQuery ? `Search: ${evalSearchQuery}` : null,
        evalDateSort ? `Sort: ${evalDateSort}` : null,
        evalRemarksFilter !== 'all' ? `Remarks: ${evalRemarksFilter}` : null,
        evalReasonFilter !== 'all' ? `Reason: ${evalReasonFilter}` : null,
      ].filter(Boolean).join(" | ");

      const recordUrlsByRowIndex = evaluations.map((ev) => {
        if (!ev?.file_path) return null;
        return supabase.storage
          .from("evaluations")
          .getPublicUrl(ev.file_path).data.publicUrl || null;
      });

      // 1) Build a summary PDF page(s) via jsPDF (table-friendly)
      const summaryDoc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

      const autoTableDefaults = buildEachRAutoTableDefaults({
        title: "Employee Evaluation Report",
        subtitle: safeText(employee.name),
        leftMetaLines: [
          `Employee: ${safeText(employee.name)} (${safeText(employee.id)})`,
          `Position: ${safeText(employee.position)} | Depot: ${safeText(employee.depot)} | Employment: ${safeText(employee.employmentType)}`,
          filterSummary ? `Filters: ${filterSummary}` : null,
        ].filter(Boolean),
        rightMetaLines: [`Exported: ${exportedAtLabel}`],
      });

      const body = evaluations.map((ev) => {
        const fileName = ev?.file_path ? String(ev.file_path).split("/").pop() : "None";
        return [
          safeText(formatDate(ev?.date_evaluated)),
          safeText(ev?.evaluator_name),
          safeText(ev?.total_score ? `${ev.total_score}%` : "None"),
          safeText(ev?.remarks),
          safeText(ev?.reason),
          ev?.file_path ? "Open" : safeText(fileName),
        ];
      });

      autoTable(summaryDoc, {
        ...autoTableDefaults,
        head: [["Date", "Evaluator", "Score", "Remarks", "Reason", "Record File"]],
        body,
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 90 },
          2: { cellWidth: 55 },
          3: { cellWidth: 70 },
          4: { cellWidth: 70 },
          5: { cellWidth: 150 },
        },
        didParseCell: (data) => {
          if (data.section !== "body") return;
          if (data.column.index !== 5) return;
          const url = recordUrlsByRowIndex?.[data.row.index];
          if (!url) {
            data.cell.text = ["None"];
            return;
          }
          data.cell.text = ["Open"];
          data.cell.styles.textColor = [29, 78, 216];
          data.cell.styles.fontStyle = "bold";
        },
        didDrawCell: (data) => {
          if (data.section !== "body") return;
          if (data.column.index !== 5) return;
          const url = recordUrlsByRowIndex?.[data.row.index];
          if (!url) return;
          const x = data.cell.x + 4;
          const y = data.cell.y + data.cell.height / 2 + 3;
          summaryDoc.textWithLink("Open", x, y, { url });
        },
      });

      if (typeof summaryDoc.putTotalPages === 'function') {
        summaryDoc.putTotalPages(autoTableDefaults.totalPagesExp);
      }

      const summaryBuffer = summaryDoc.output("arraybuffer");

      // 2) Merge the summary with each evaluation's uploaded record file
      const mergedPdf = await PDFDocument.load(summaryBuffer);
      const font = await mergedPdf.embedFont(StandardFonts.Helvetica);

      for (const ev of evaluations) {
        if (!ev?.file_path) continue;

        const ext = String(ev.file_path).split(".").pop()?.toLowerCase();

        try {
          const { data, error } = await supabase.storage
            .from("evaluations")
            .download(ev.file_path);

          if (error) throw error;
          const bytes = await data.arrayBuffer();

          if (ext === "pdf") {
            const srcPdf = await PDFDocument.load(bytes);
            const pages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
            pages.forEach((p) => mergedPdf.addPage(p));
            continue;
          }

          if (["png", "jpg", "jpeg"].includes(ext)) {
            const image = ext === "png" ? await mergedPdf.embedPng(bytes) : await mergedPdf.embedJpg(bytes);
            const page = mergedPdf.addPage();
            const { width, height } = page.getSize();
            const margin = 36;
            const scale = Math.min((width - margin * 2) / image.width, (height - margin * 2) / image.height);
            const drawW = image.width * scale;
            const drawH = image.height * scale;
            page.drawImage(image, {
              x: (width - drawW) / 2,
              y: (height - drawH) / 2,
              width: drawW,
              height: drawH,
            });
            continue;
          }

          // Fallback: add a page with a link if the file isn't mergeable
          const publicUrl = supabase.storage
            .from("evaluations")
            .getPublicUrl(ev.file_path).data.publicUrl;
          const page = mergedPdf.addPage();
          page.drawText("Evaluation record file (open in browser):", {
            x: 36,
            y: page.getHeight() - 60,
            size: 12,
            font,
            color: rgb(0, 0, 0),
          });
          page.drawText(publicUrl || "(no public URL)", {
            x: 36,
            y: page.getHeight() - 84,
            size: 10,
            font,
            color: rgb(0, 0, 0.8),
            maxWidth: page.getWidth() - 72,
          });
        } catch (fileErr) {
          console.error("Failed to merge evaluation file:", ev?.file_path, fileErr);
          const publicUrl = supabase.storage
            .from("evaluations")
            .getPublicUrl(ev.file_path).data.publicUrl;
          const page = mergedPdf.addPage();
          page.drawText("Failed to load evaluation record file:", {
            x: 36,
            y: page.getHeight() - 60,
            size: 12,
            font,
            color: rgb(0.8, 0, 0),
          });
          page.drawText(String(ev?.file_path), {
            x: 36,
            y: page.getHeight() - 84,
            size: 10,
            font,
            color: rgb(0, 0, 0),
            maxWidth: page.getWidth() - 72,
          });
          if (publicUrl) {
            page.drawText(publicUrl, {
              x: 36,
              y: page.getHeight() - 102,
              size: 9,
              font,
              color: rgb(0, 0, 0.8),
              maxWidth: page.getWidth() - 72,
            });
          }
        }
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const yyyyMmDd = exportedAt.toISOString().slice(0, 10);
      const fileName = `${sanitizeFileName(employee.name)}_evaluations_${yyyyMmDd}.pdf`;
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("exportEmployeeEvaluationPdf error:", err);
      showAlert("Failed to export employee evaluation PDF. Please try again.", "error");
    } finally {
      setExportingEmployeeId(null);
    }
  }, [evalDateSort, evalReasonFilter, evalRemarksFilter, evalSearchQuery, getFilteredEmployeeEvaluations]);

  const getRatingColor = (rating) => {
    if (!rating) return "text-gray-600";
    if (rating.includes("Outstanding") || rating.includes("Exceeds"))
      return "text-green-600";
    if (rating.includes("Meets") || rating.includes("On Track"))
      return "text-blue-600";
    if (rating.includes("Needs")) return "text-orange-600";
    return "text-gray-600";
  };

  const getDaysUntilDue = (nextEvalDate) => {
    if (!nextEvalDate) return null;
    const today = new Date();
    const dueDate = new Date(nextEvalDate);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <>
      <style>{`
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        
        /* Modern sleek scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
        
        /* Firefox */
        * {
          scrollbar-width: thin;
          scrollbar-color: #d1d5db transparent;
        }
      `}</style>

      <div className="w-full py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">
            Employee Evaluations
          </h1>
          <p className="text-gray-500 mt-1">
            Browse and manage evaluation readiness across all employees
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">
                  Total Employees
                </p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {stats.totalEmployees}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-3 font-medium">
              Listed in evaluation directory
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">
                  Due for Evaluation
                </p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {stats.dueForEval}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-xs text-orange-600 mt-3 font-medium">
              Requires attention
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Overdue</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {stats.overdueCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-xs text-red-600 mt-3 font-medium">
              Past due date
            </p>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Search and Filters */}
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 relative z-20">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search by employee name, ID, or position..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                    setExpandedRow(null);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                />
              </div>

              <select
                value={employmentFilter}
                onChange={(e) => {
                  setEmploymentFilter(e.target.value);
                  setCurrentPage(1);
                  setExpandedRow(null);
                }}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white min-w-[180px]"
              >
                <option value="all">All Employment Types</option>
                <option value="regular">Regular</option>
                <option value="probationary">Probationary</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                  setExpandedRow(null);
                }}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white min-w-[160px]"
              >
                <option value="all">All Statuses</option>
                <option value="duetoday">Due Today</option>
                <option value="overdue">Overdue</option>
                <option value="uptodate">Up to Date</option>
              </select>

              {/* List export removed: exporting is now per-employee inside Evaluation History */}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="px-6 py-12 text-center text-gray-500">
                Loading employees...
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Position / Depot
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Last Evaluation
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Next Due
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedData.length > 0 ? (
                    paginatedData.map((employee) => {
                      const statusStyle = getStatusBadge(employee.status);
                      const daysUntilDue = getDaysUntilDue(employee.nextEvaluation);

                      return (
                        <React.Fragment key={employee.id || employee.name}>
                          <tr
                            className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${
                              expandedRow === employee.id ? "bg-blue-50/30" : ""
                            }`}
                            onClick={() =>
                              setExpandedRow(
                                expandedRow === employee.id ? null : employee.id
                              )
                            }
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(
                                    employee.name
                                  )} flex items-center justify-center text-white text-sm font-medium shadow-sm`}
                                >
                                  {getInitials(employee.name)}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-800">
                                    {employee.name}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-gray-800">
                                {employee.position}
                              </p>
                              <p className="text-xs text-gray-500">
                                {employee.depot}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col items-center">
                                <span
                                  className={`text-sm font-medium capitalize ${
                                    employee.employmentType === "regular"
                                      ? "text-blue-600"
                                      : "text-purple-600"
                                  }`}
                                >
                                  {employee.employmentType || "N/A"}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col items-center">
                                <p className={`text-sm ${employee.lastEvaluation ? 'text-gray-800' : 'text-gray-400'}`}>
                                  {formatDate(employee.lastEvaluation)}
                                </p>
                                {employee.evaluations.length > 0 && (
                                  <p className="text-xs text-gray-500">
                                    {employee.evaluations.length} record
                                    {employee.evaluations.length !== 1 ? "s" : ""}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col items-center">
                                <p className="text-sm text-gray-800">
                                  {formatDate(employee.nextEvaluation)}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <span
                                  className={`text-sm font-semibold ${statusStyle.text}`}
                                >
                                  {statusStyle.label}
                                </span>
                                <svg
                                  className={`w-4 h-4 text-gray-400 transition-transform ${
                                    expandedRow === employee.id
                                      ? "rotate-180"
                                      : ""
                                  }`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded row: placeholder for evaluation history */}
                          {expandedRow === employee.id && (
                            <tr>
                              <td
                                colSpan="6"
                                className="px-6 py-4 bg-gray-50/80"
                              >
                                <div className="ml-12">
                                  <div className="flex items-center justify-between mb-4">
                                    <p className="text-sm font-semibold text-gray-700">
                                      Evaluation History
                                    </p>
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        setSelectedEmployee(employee);
                                        await checkEmployeeSeparationStatus(employee.id);
                                        setShowUploadModal(true);
                                      }}
                                      className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                                    >
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                        />
                                      </svg>
                                      Upload Evaluation
                                    </button>
                                  </div>

                                  {/* Search and Filters */}
                                  <div className="mb-4 space-y-2">
                                    <div className="relative">
                                      <svg
                                        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                        />
                                      </svg>
                                      <input
                                        type="text"
                                        placeholder="Search by evaluator name..."
                                        value={evalSearchQuery}
                                        onChange={(e) => setEvalSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                                      />
                                    </div>
                                    <div className="flex gap-2 items-center">
                                      <select
                                        value={evalDateSort}
                                        onChange={(e) => setEvalDateSort(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                                      >
                                        <option value="newest">Date: Newest to Oldest</option>
                                        <option value="oldest">Date: Oldest to Newest</option>
                                      </select>
                                      <select
                                        value={evalRemarksFilter}
                                        onChange={(e) => setEvalRemarksFilter(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                                      >
                                        <option value="all">All Remarks</option>
                                        <option value="Retained">Retained</option>
                                        <option value="Observe">Observe</option>
                                        <option value="Dismissed">Dismissed</option>
                                      </select>
                                      <select
                                        value={evalReasonFilter}
                                        onChange={(e) => setEvalReasonFilter(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                                      >
                                        <option value="all">All Reasons</option>
                                        <option value="Regularization">Regularization</option>
                                        <option value="Annual">Annual</option>
                                        <option value="Semi-Annual">Semi-Annual</option>
                                      </select>

                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          exportEmployeeEvaluationPdf(employee);
                                        }}
                                        disabled={exportingEmployeeId === employee.id}
                                        title="Export this employee's evaluation records (includes uploaded files)"
                                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-colors border ${
                                          exportingEmployeeId === employee.id
                                            ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                        }`}
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        {exportingEmployeeId === employee.id ? "Exporting..." : "Export"}
                                      </button>
                                    </div>
                                  </div>

                                  {employee.evaluations && employee.evaluations.length > 0 ? (
                                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                      {(() => {
                                        // Filter and sort evaluations
                                        let filteredEvals = employee.evaluations.filter(evaluation => {
                                          // Search by evaluator name
                                          const matchesSearch = evalSearchQuery === "" || 
                                            evaluation.evaluator_name.toLowerCase().includes(evalSearchQuery.toLowerCase());
                                          
                                          // Filter by remarks
                                          const matchesRemarks = evalRemarksFilter === "all" || 
                                            evaluation.remarks === evalRemarksFilter;
                                          
                                          // Filter by reason
                                          const matchesReason = evalReasonFilter === "all" || 
                                            evaluation.reason === evalReasonFilter;
                                          
                                          return matchesSearch && matchesRemarks && matchesReason;
                                        });

                                        // Sort by date
                                        filteredEvals.sort((a, b) => {
                                          const dateA = new Date(a.date_evaluated);
                                          const dateB = new Date(b.date_evaluated);
                                          return evalDateSort === "newest" ? dateB - dateA : dateA - dateB;
                                        });

                                        return filteredEvals.length > 0 ? filteredEvals.map((evaluation) => (
                                        <div
                                          key={evaluation.id}
                                          className="bg-white rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors"
                                        >
                                          <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-2">
                                                <svg
                                                  className="w-4 h-4 text-blue-600"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  viewBox="0 0 24 24"
                                                >
                                                  <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                  />
                                                </svg>
                                                <h4 className="text-sm font-semibold text-gray-800">
                                                  Evaluation - {formatDate(evaluation.date_evaluated)}
                                                </h4>
                                              </div>
                                              <div className="grid grid-cols-5 gap-x-4 gap-y-1 text-sm">
                                                <div>
                                                  <span className="text-gray-500 text-xs">Evaluator:</span>
                                                  <p className="text-gray-800 font-medium">
                                                    {evaluation.evaluator_name}
                                                  </p>
                                                </div>
                                                <div>
                                                  <span className="text-gray-500 text-xs">Date:</span>
                                                  <p className="text-gray-800 font-medium">
                                                    {formatDate(evaluation.date_evaluated)}
                                                  </p>
                                                </div>
                                                <div>
                                                  <span className="text-gray-500 text-xs">Score:</span>
                                                  <p className="text-gray-800 font-medium">
                                                    {evaluation.total_score ? `${evaluation.total_score}%` : "N/A"}
                                                  </p>
                                                </div>
                                                <div>
                                                  <span className="text-gray-500 text-xs">Remarks:</span>
                                                  <p className="text-gray-800 font-medium">
                                                    {evaluation.remarks || "N/A"}
                                                  </p>
                                                </div>
                                                <div>
                                                  <span className="text-gray-500 text-xs">Reason:</span>
                                                  <p className="text-gray-800 font-medium">
                                                    {evaluation.reason || "N/A"}
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              {evaluation.file_path && (
                                                <a
                                                  href={
                                                    supabase.storage
                                                      .from("evaluations")
                                                      .getPublicUrl(evaluation.file_path).data.publicUrl
                                                  }
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  onClick={(e) => e.stopPropagation()}
                                                  className="px-3 py-2 bg-blue-50 text-blue-600 text-sm rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2 whitespace-nowrap"
                                                >
                                                  <svg
                                                    className="w-4 h-4"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                  >
                                                    <path
                                                      strokeLinecap="round"
                                                      strokeLinejoin="round"
                                                      strokeWidth={2}
                                                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                    />
                                                  </svg>
                                                  View File
                                                </a>
                                              )}
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setDeleteTarget(evaluation);
                                                  setShowDeleteConfirm(true);
                                                }}
                                                className="px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2 whitespace-nowrap"
                                              >
                                                <svg
                                                  className="w-4 h-4"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  viewBox="0 0 24 24"
                                                >
                                                  <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                  />
                                                </svg>
                                                Delete
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      )) : (
                                        <div className="text-center py-8 text-gray-500 text-sm">
                                          No evaluations match your filters
                                        </div>
                                      );
                                      })()}
                                    </div>
                                  ) : (
                                    <div className="bg-white rounded-lg p-6 border border-gray-100 text-center">
                                      <svg
                                        className="w-10 h-10 text-gray-300 mx-auto mb-2"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={1.5}
                                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                        />
                                      </svg>
                                      <p className="text-sm text-gray-500">
                                        No evaluation records yet
                                      </p>
                                      <p className="text-xs text-gray-400 mt-1">
                                        Click "Upload Evaluation" to add the first evaluation for this employee.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        <svg
                          className="w-12 h-12 text-gray-300 mx-auto mb-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <p className="font-medium">No employees found</p>
                        <p className="text-sm mt-1">
                          Try adjusting your search or filter criteria
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {filteredData.length > itemsPerPage && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1.5 text-sm rounded-lg border ${
                  currentPage === 1
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                Prev
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className={`px-3 py-1.5 text-sm rounded-lg border ${
                  currentPage === totalPages
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 border border-black max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Upload Evaluation(s)</h2>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadRecords([
                    {
                      evaluatorName: "",
                      reason: "",
                      dateEvaluated: "",
                      totalScore: "",
                      file: null,
                    },
                  ]);
                  setFinalRemarks("");
                  setRequireResignationLetter(false);
                  setEmployeeInSeparation(false);
                  setSeparationDetails(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Employee: <span className="font-semibold text-gray-800">{selectedEmployee?.name}</span>
              </p>
            </div>

            {/* Separation Warning Banner */}
            {employeeInSeparation && (
              <div className="mb-4 bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-orange-600 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-orange-800 mb-1">Employee in Separation Process</h4>
                    <p className="text-sm text-orange-700">
                      This employee is currently in the process of separation (Status: <span className="font-medium">{separationDetails?.status || 'pending'}</span>). 
                      You can still upload an evaluation if needed.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {uploadRecords.map((record, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">Record {index + 1}</h3>
                    {uploadRecords.length > 1 && (
                      <button
                        onClick={() => {
                          setUploadRecords(uploadRecords.filter((_, i) => i !== index));
                        }}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Evaluator Name <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="text"
                          value={record.evaluatorName}
                          onChange={(e) => {
                            const newRecords = [...uploadRecords];
                            newRecords[index].evaluatorName = e.target.value;
                            setUploadRecords(newRecords);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm"
                          placeholder="Enter evaluator name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Reason <span className="text-red-600">*</span>
                        </label>
                        <select
                          value={selectedEmployee?.employmentType === 'probationary' ? 'Regularization' : record.reason}
                          onChange={(e) => {
                            const newRecords = [...uploadRecords];
                            newRecords[index].reason = e.target.value;
                            setUploadRecords(newRecords);
                          }}
                          disabled={selectedEmployee?.employmentType === 'probationary'}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm ${
                            selectedEmployee?.employmentType === 'probationary' ? 'bg-gray-100 cursor-not-allowed' : ''
                          }`}
                        >
                          <option value="">Select reason</option>
                          {selectedEmployee?.employmentType === 'probationary' && (
                            <option value="Regularization">Regularization</option>
                          )}
                          {selectedEmployee?.employmentType === 'regular' && (
                            <>
                              <option value="Annual">Annual</option>
                              <option value="Semi-Annual">Semi-Annual</option>
                            </>
                          )}
                          {!selectedEmployee?.employmentType && (
                            <>
                              <option value="Regularization">Regularization</option>
                              <option value="Annual">Annual</option>
                              <option value="Semi-Annual">Semi-Annual</option>
                            </>
                          )}
                        </select>
                        {selectedEmployee?.employmentType === 'probationary' && (
                          <p className="text-xs text-gray-500 mt-1">
                            Auto-filled for probationary employees
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date Evaluated <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="date"
                          value={record.dateEvaluated}
                          max={new Date().toISOString().split('T')[0]}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (!validateNoSunday(e.target, v)) return;
                            const newRecords = [...uploadRecords];
                            newRecords[index].dateEvaluated = v;
                            setUploadRecords(newRecords);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Total Score (%) <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          step="1"
                          value={record.totalScore}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Only allow whole numbers between 1 and 100
                            if (value === '' || (Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 100)) {
                              const newRecords = [...uploadRecords];
                              newRecords[index].totalScore = value;
                              setUploadRecords(newRecords);
                            }
                          }}
                          onKeyPress={(e) => {
                            // Prevent decimal point and negative sign
                            if (e.key === '.' || e.key === '-' || e.key === 'e' || e.key === 'E') {
                              e.preventDefault();
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm"
                          placeholder="e.g., 85"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Evaluation File <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => {
                          const newRecords = [...uploadRecords];
                          newRecords[index].file = e.target.files?.[0] || null;
                          setUploadRecords(newRecords);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm"
                      />
                      {record.file && (
                        <p className="text-xs text-gray-600 mt-1">
                          Selected: {record.file.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Final Remarks Section */}
              <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Final Remarks <span className="text-red-600">*</span>
                </label>
                <p className="text-xs text-gray-600 mb-2">
                  This remark will apply to all evaluation records being uploaded.
                </p>
                <select
                  value={finalRemarks}
                  onChange={(e) => setFinalRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                >
                  <option value="">Select final remarks</option>
                  <option value="Retained">Retained</option>
                  <option value="Observe">Observe</option>
                  <option value="Dismissed">Dismissed</option>
                </select>
                
                {/* Resignation Letter Requirement - Only show when Dismissed is selected */}
                {finalRemarks === "Dismissed" && (
                  <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requireResignationLetter}
                        onChange={(e) => setRequireResignationLetter(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          Require employee to upload resignation letter
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          If checked, the employee will be required to upload a resignation letter as part of the separation process.
                        </p>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setUploadRecords([
                    ...uploadRecords,
                    {
                      evaluatorName: "",
                      reason: "",
                      dateEvaluated: "",
                      totalScore: "",
                      file: null,
                    },
                  ]);
                }}
                className="w-full px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-red-500 hover:text-red-600 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Another Record
              </button>
            </div>

            <div className="flex justify-between items-center mt-6 pt-4 border-t">
              <p className="text-sm text-gray-600">
                {uploadRecords.length} record{uploadRecords.length !== 1 ? 's' : ''} to upload
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadRecords([
                      {
                        evaluatorName: "",
                        reason: "",
                        dateEvaluated: "",
                        totalScore: "",
                        file: null,
                      },
                    ]);
                    setFinalRemarks("");
                    setRequireResignationLetter(false);
                    setEmployeeInSeparation(false);
                    setSeparationDetails(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowUploadConfirm(true)}
                  disabled={uploading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-300 disabled:cursor-not-allowed"
                >
                  Upload {uploadRecords.length} Record{uploadRecords.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Confirmation Modal */}
      {showUploadConfirm && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 border border-black">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Confirm Upload</h3>
                <p className="text-sm text-gray-600">
                  Are you sure you want to upload {uploadRecords.length} evaluation record{uploadRecords.length !== 1 ? 's' : ''} for <span className="font-semibold">{selectedEmployee?.name}</span>?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowUploadConfirm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowUploadConfirm(false);
                  handleUploadEvaluation();
                }}
                disabled={uploading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-300 disabled:cursor-not-allowed"
              >
                {uploading ? "Uploading..." : "Confirm Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deleteTarget && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 border border-black">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Evaluation</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Are you sure you want to delete this evaluation record?
                </p>
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p><span className="font-medium">Evaluator:</span> {deleteTarget.evaluator_name}</p>
                  <p><span className="font-medium">Date:</span> {formatDate(deleteTarget.date_evaluated)}</p>
                  <p><span className="font-medium">Score:</span> {deleteTarget.total_score}%</p>
                </div>
                <p className="text-xs text-red-600 mt-3">
                  This action cannot be undone. The file will also be permanently deleted.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEvaluation}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-300 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting..." : "Delete Evaluation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Type Change Confirmation Modal */}
      {showTypeChangeConfirm && typeChangeData && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 border border-black">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Change Employee Type</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Are you sure you want to change the employment type for <span className="font-semibold">{typeChangeData.employee?.name}</span>?
                </p>
                <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                  <p><span className="font-medium">Current Type:</span> <span className="capitalize">{typeChangeData.employee?.employmentType}</span></p>
                  <p><span className="font-medium">New Type:</span> <span className="capitalize">{typeChangeData.newType}</span></p>
                  {typeChangeData.newType === 'probationary' && (
                    <p className="text-purple-600 mt-2 pt-2 border-t border-gray-200">
                      <span className="font-medium">Next Due:</span> Will be set to 90 days (3 months) from today
                    </p>
                  )}
                  {typeChangeData.newType === 'regular' && (
                    <p className="text-blue-600 mt-2 pt-2 border-t border-gray-200">
                      <span className="font-medium">Next Due:</span> Will be set to 1 year from today
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowTypeChangeConfirm(false);
                  setTypeChangeData(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmTypeChange}
                disabled={updatingType}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                {updatingType ? "Updating..." : "Confirm Change"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Next Due Date Change Confirmation Modal */}
      {showNextDueConfirm && nextDueChangeData && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 border border-black">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {nextDueChangeData.nextDueDate === "" ? "Clear Next Due Date" : "Confirm Next Due Date"}
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {nextDueChangeData.nextDueDate === "" 
                    ? <>Setting the next due date to none will not notify HR. Are you sure you want to clear the next evaluation date for <span className="font-semibold">{nextDueChangeData.employee?.name}</span>?</>
                    : <>This will be the basis of Evaluation Due. Are you sure you want to set the next evaluation date for <span className="font-semibold">{nextDueChangeData.employee?.name}</span>?</>
                  }
                </p>
                {nextDueChangeData.nextDueDate !== "" && (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <p><span className="font-medium">New Next Due Date:</span> {new Date(nextDueChangeData.nextDueDate).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowNextDueConfirm(false);
                  setNextDueChangeData(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmNextDueChange}
                disabled={updatingNextDue}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:bg-orange-300 disabled:cursor-not-allowed"
              >
                {updatingNextDue ? "Updating..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 border border-black">
            <div className="flex items-start gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                alertType === 'success' ? 'bg-green-100' :
                alertType === 'error' ? 'bg-red-100' :
                alertType === 'warning' ? 'bg-orange-100' :
                'bg-blue-100'
              }`}>
                {alertType === 'success' && (
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {alertType === 'error' && (
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                {alertType === 'warning' && (
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
                {alertType === 'info' && (
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-semibold mb-2 ${
                  alertType === 'success' ? 'text-green-800' :
                  alertType === 'error' ? 'text-red-800' :
                  alertType === 'warning' ? 'text-orange-800' :
                  'text-blue-800'
                }`}>
                  {alertType === 'success' ? 'Success' :
                   alertType === 'error' ? 'Error' :
                   alertType === 'warning' ? 'Warning' :
                   'Information'}
                </h3>
                <p className="text-sm text-gray-600">
                  {alertMessage}
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowAlertModal(false)}
                className={`px-4 py-2 rounded-lg text-white transition-colors ${
                  alertType === 'success' ? 'bg-green-600 hover:bg-green-700' :
                  alertType === 'error' ? 'bg-red-600 hover:bg-red-700' :
                  alertType === 'warning' ? 'bg-orange-600 hover:bg-orange-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
export default HrEval;