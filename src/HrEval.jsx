import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

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
  const itemsPerPage = 8;

  // Data state
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
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

  // Fetch employees from database (HR sees all employees)
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("employees")
          .select("id, fname, lname, mname, position, depot, hired_at, status");

        if (error) {
          console.error("Error loading employees for evaluations:", error);
          setEmployees([]);
          return;
        }

        const mapped = (data || []).map((emp) => {
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

    fetchEmployees();
  }, []);

  // Helper function to show alert modal
  const showAlert = (message, type = "info") => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlertModal(true);
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

            // Update the most recent evaluation's next_due and employee_type
            const { error: evalUpdateError } = await supabase
              .from('evaluations')
              .update({ 
                employee_type: 'Regular',
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
          : (mostRecent?.employee_type?.toLowerCase() || selectedEmployee.employmentType);
        
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
    if (!deleteTarget) return;

    try {
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
    if (!typeChangeData) return;

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
    if (!nextDueChangeData) return;

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
    if (!dateStr) return "—";
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
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
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
                                <p className="text-sm text-gray-800">
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
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedEmployee(employee);
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
                                    <div className="flex gap-2">
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
                          onChange={(e) => {
                            const newRecords = [...uploadRecords];
                            newRecords[index].dateEvaluated = e.target.value;
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
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Evaluation
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Confirm Change
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
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Confirm
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