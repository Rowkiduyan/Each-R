// src/AgencySeparation.jsx
import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "./supabaseClient";
import LogoCropped from './layouts/photos/logo(cropped).png';

function AgencySeparation() {
  const navigate = useNavigate();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const profileDropdownRef = useRef(null);
  
  // Tab, filter, and search state
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState(null);
  const itemsPerPage = 8;

  // Track which requests have been viewed (by ID)
  const [viewedRequests, setViewedRequests] = useState(new Set());

  // Submission modal state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitForm, setSubmitForm] = useState({
    employeeId: '',
    resignationType: '',
    otherReason: '',
    reason: '',
    resignationLetter: null,
    confirmSubmit: false,
  });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Real data states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deployedEmployees, setDeployedEmployees] = useState([]);
  const [resignationRequests, setResignationRequests] = useState([]);
  const [agencyProfileId, setAgencyProfileId] = useState(null);

  // Alert modal state
  const [alertModal, setAlertModal] = useState({ show: false, message: '', type: 'error' });
  const showAlert = (message, type = 'error') => setAlertModal({ show: true, message, type });
  const closeAlert = () => setAlertModal({ show: false, message: '', type: 'error' });

  // Stage 2 file upload state for agencies (uploading on behalf of employee)
  const [agencyExitClearanceFiles, setAgencyExitClearanceFiles] = useState({}); // { separationId: File }
  const [agencyExitInterviewFiles, setAgencyExitInterviewFiles] = useState({}); // { separationId: File }
  const [uploadingClearance, setUploadingClearance] = useState(false);
  const [uploadingInterview, setUploadingInterview] = useState(false);

  // Confirmation modals for Stage 2 uploads
  const [showClearanceConfirm, setShowClearanceConfirm] = useState(false);
  const [showInterviewConfirm, setShowInterviewConfirm] = useState(false);
  const [pendingUpload, setPendingUpload] = useState({ separationId: null, employeeId: null, type: null });

  // Helper function to check if a request has an unviewed update
  const hasUnviewedUpdate = (request) => {
    return request.hasUnviewedUpdate && !viewedRequests.has(request.id);
  };

  // Mark a request as viewed
  const markAsViewed = (requestId) => {
    setViewedRequests(prev => new Set([...prev, requestId]));
  };

  // Calculate stats
  const stats = {
    pendingReview: resignationRequests.filter(r => r.status === 'pending_review').length,
    reviewed: resignationRequests.filter(r => r.status === 'reviewed').length,
    processing: resignationRequests.filter(r => r.status === 'processing').length,
    completed: resignationRequests.filter(r => r.status === 'completed').length,
    total: resignationRequests.length,
  };

  // Calculate unviewed counts per tab
  const unviewedCounts = {
    all: resignationRequests.filter(r => hasUnviewedUpdate(r)).length,
    pending_review: resignationRequests.filter(r => r.status === 'pending_review' && hasUnviewedUpdate(r)).length,
    processing: resignationRequests.filter(r => (r.status === 'reviewed' || r.status === 'processing') && hasUnviewedUpdate(r)).length,
    completed: resignationRequests.filter(r => r.status === 'completed' && hasUnviewedUpdate(r)).length,
  };

  // Fetch agency profile and separation data on mount
  useEffect(() => {
    fetchAgencyData();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileDropdown]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/employee/login");
  };

  const fetchAgencyData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user');

      // Get agency profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setAgencyProfileId(profile.id);

      // Fetch employees endorsed by this agency
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, fname, lname, mname, position, depot, hired_at')
        .eq('endorsed_by_agency_id', profile.id);

      if (empError) throw empError;

      // Format deployed employees for dropdown
      const formattedEmployees = employees.map(emp => ({
        id: emp.id,
        name: `${emp.fname} ${emp.lname}`,
        position: emp.position || 'N/A',
        depot: emp.depot || 'N/A'
      }));
      setDeployedEmployees(formattedEmployees);

      // Fetch separation records for these employees
      const employeeIds = employees.map(emp => emp.id);
      if (employeeIds.length === 0) {
        setResignationRequests([]);
        setLoading(false);
        return;
      }

      const { data: separations, error: sepError } = await supabase
        .from('employee_separations')
        .select('*')
        .in('employee_id', employeeIds);

      if (sepError) throw sepError;

      // Transform data to match UI format
      const transformedRequests = separations.map(sep => {
        const employee = employees.find(emp => emp.id === sep.employee_id);
        
        // Map status from DB to UI format
        let uiStatus = 'pending_review';
        if (sep.status === 'completed') {
          uiStatus = 'completed';
        } else if (sep.resignation_status === 'validated') {
          if (sep.signed_exit_clearance_status === 'validated' && sep.signed_exit_interview_status === 'validated') {
            uiStatus = 'processing';
          } else {
            uiStatus = 'reviewed';
          }
        } else if (sep.resignation_status === 'submitted') {
          uiStatus = 'pending_review';
        }

        // Get resignation type directly from the type column
        const resignationType = sep.type || 'resignation';

        return {
          id: sep.id,
          employeeId: sep.employee_id,
          employeeName: employee ? `${employee.fname} ${employee.lname}` : 'Unknown',
          position: employee?.position || 'N/A',
          depot: employee?.depot || 'N/A',
          resignationType,
          reason: sep.resignation_reason || 'No reason provided',
          submittedDate: sep.resignation_submitted_at ? new Date(sep.resignation_submitted_at).toISOString().split('T')[0] : 'N/A',
          status: uiStatus,
          hrRemarks: sep.resignation_status === 'validated' ? 'Resignation approved by HR' : null,
          processedDate: sep.resignation_validated_at ? new Date(sep.resignation_validated_at).toISOString().split('T')[0] : null,
          completedDate: sep.status === 'completed' && sep.completed_at ? new Date(sep.completed_at).toISOString().split('T')[0] : null,
          hasResignationLetter: !!sep.resignation_letter_url,
          resignationLetterUrl: sep.resignation_letter_url,
          // Stage 2: Exit clearance and interview status
          exitClearanceStatus: sep.signed_exit_clearance_status,
          exitInterviewStatus: sep.signed_exit_interview_status,
          signedExitClearanceUrl: sep.signed_exit_clearance_url,
          signedExitClearanceFilename: sep.signed_exit_clearance_filename,
          signedExitInterviewUrl: sep.signed_exit_interview_url,
          signedExitInterviewFilename: sep.signed_exit_interview_filename,
          exitClearanceRemarks: sep.signed_exit_clearance_remarks,
          exitInterviewRemarks: sep.signed_exit_interview_remarks,
          // HR uploaded forms (blank templates for employee to fill)
          hrExitClearanceFormUrl: sep.exit_clearance_form_url,
          hrExitClearanceFormFilename: sep.exit_clearance_form_filename,
          hrExitInterviewFormUrl: sep.exit_interview_form_url,
          hrExitInterviewFormFilename: sep.exit_interview_form_filename,
          // Stage 3: Final HR documentation (from additional_files_urls)
          finalDocsUrls: (() => {
            try {
              if (Array.isArray(sep.additional_files_urls)) return sep.additional_files_urls;
              if (typeof sep.additional_files_urls === 'string') return JSON.parse(sep.additional_files_urls);
              return [];
            } catch {
              return [];
            }
          })(),
          clearanceDocuments: [],
          hasUnviewedUpdate: false,
          clearanceResubmitRequired: sep.signed_exit_clearance_status === 'resubmission_required' || sep.signed_exit_interview_status === 'resubmission_required',
          clearanceResubmitRemarks: sep.signed_exit_clearance_status === 'resubmission_required' ? 'Exit clearance requires resubmission' : 
                                   sep.signed_exit_interview_status === 'resubmission_required' ? 'Exit interview requires resubmission' : null,
          isTerminated: sep.is_terminated || false,
          terminationDate: sep.terminated_at
        };
      });

      setResignationRequests(transformedRequests);
    } catch (err) {
      console.error('Error fetching agency separation data:', err);
      setError(`Failed to load separation data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Get filtered data based on active tab and search
  const getFilteredData = () => {
    let data = [...resignationRequests];
    
    // Filter by tab
    if (activeTab !== 'all') {
      if (activeTab === 'processing') {
        // Show both 'reviewed' and 'processing' statuses in the Processing tab
        data = data.filter(r => r.status === 'reviewed' || r.status === 'processing');
      } else {
        data = data.filter(r => r.status === activeTab);
      }
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter(item => 
        item.employeeName.toLowerCase().includes(query) ||
        item.position.toLowerCase().includes(query) ||
        item.depot.toLowerCase().includes(query) ||
        item.resignationType.toLowerCase().includes(query)
      );
    }

    return data;
  };

  const filteredData = getFilteredData();
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Helper functions
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = [
      'from-[#800000] to-[#990000]',
      'from-blue-500 to-blue-600',
      'from-green-500 to-green-600',
      'from-purple-500 to-purple-600',
      'from-orange-500 to-orange-600',
      'from-pink-500 to-pink-600',
      'from-teal-500 to-teal-600',
      'from-indigo-500 to-indigo-600',
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending_review: { text: 'text-yellow-600', label: 'Pending Review' },
      reviewed: { text: 'text-blue-600', label: 'Reviewed' },
      processing: { text: 'text-orange-600', label: 'Pending Completion' },
      completed: { text: 'text-green-600', label: 'Completed' },
      rejected: { text: 'text-[#800000]', label: 'Rejected' },
      cancelled: { text: 'text-gray-500', label: 'Cancelled' },
    };
    return styles[status] || styles.pending_review;
  };

  const getResignationType = (type) => {
    const types = {
      immediate: 'Immediate Resignation',
      resignation: 'Resignation',
      voluntary: 'Voluntary Resignation',
      retirement: 'Retirement',
      end_of_contract: 'End of Contract',
      other: 'Other',
    };
    return types[type] || type;
  };

  // Submit Modal Functions
  const openSubmitModal = () => {
    setSubmitForm({
      employeeId: '',
      resignationType: '',
      otherReason: '',
      reason: '',
      resignationLetter: null,
      confirmSubmit: false,
    });
    setShowSubmitModal(true);
  };

  const closeSubmitModal = () => {
    setShowSubmitModal(false);
    setSubmitForm({
      employeeId: '',
      resignationType: '',
      otherReason: '',
      reason: '',
      resignationLetter: null,
      confirmSubmit: false,
    });
    setIsDragging(false);
  };

  const handleFileSelect = (file) => {
    if (file) {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload a valid file (PDF, DOC, DOCX)');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setSubmitForm(prev => ({ ...prev, resignationLetter: file }));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleSubmitRequest = async () => {
    if (!submitForm.employeeId) {
      showAlert('Please select an employee');
      return;
    }
    if (!submitForm.resignationType) {
      showAlert('Please select resignation type');
      return;
    }
    if (!submitForm.resignationLetter) {
      showAlert('Please upload a resignation letter');
      return;
    }
    if (!submitForm.confirmSubmit) {
      showAlert('Please confirm that you want to submit this request');
      return;
    }

    try {
      setLoading(true);

      // Get selected employee
      const selectedEmployee = deployedEmployees.find(e => e.id === submitForm.employeeId);
      
      if (!selectedEmployee) {
        throw new Error('Selected employee not found');
      }

      // Upload resignation letter to storage (id is already the UUID)
      const fileExt = submitForm.resignationLetter.name.split('.').pop();
      const fileName = `${selectedEmployee.id}/resignation_letter_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('separation-documents')
        .upload(fileName, submitForm.resignationLetter, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get the file path
      const filePath = uploadData.path;

      // Insert into employee_separations table
      const { error: insertError } = await supabase
        .from('employee_separations')
        .insert({
          employee_id: selectedEmployee.id,
          type: submitForm.resignationType, // 'immediate' or 'resignation'
          resignation_letter_url: filePath,
          resignation_submitted_at: new Date().toISOString(),
          resignation_status: 'submitted',
          status: 'pending'
        });

      if (insertError) throw insertError;

      showAlert('Resignation request submitted successfully!', 'success');
      closeSubmitModal();
      
      // Refresh the data
      fetchAgencyData();
    } catch (error) {
      console.error('Error submitting resignation:', error);
      showAlert(`Failed to submit resignation: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getSelectedEmployee = () => {
    return deployedEmployees.find(e => e.id === parseInt(submitForm.employeeId));
  };

  // Handle agency uploading exit clearance on behalf of employee
  const handleAgencyExitClearanceSubmit = async (separationId, employeeId) => {
    const file = agencyExitClearanceFiles[separationId];
    if (!file) {
      showAlert('Please select a file to upload');
      return;
    }

    try {
      setUploadingClearance(true);

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${employeeId}/exit_clearance_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('separation-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Update database
      const { error: updateError } = await supabase
        .from('employee_separations')
        .update({
          signed_exit_clearance_url: uploadData.path,
          signed_exit_clearance_filename: file.name,
          signed_exit_clearance_status: 'submitted',
          signed_exit_clearance_submitted_at: new Date().toISOString()
        })
        .eq('id', separationId);

      if (updateError) throw updateError;

      showAlert('Exit clearance form submitted successfully!', 'success');
      
      // Clear the file and refresh data
      setAgencyExitClearanceFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[separationId];
        return newFiles;
      });
      fetchAgencyData();
    } catch (error) {
      console.error('Error uploading exit clearance:', error);
      showAlert(`Failed to upload: ${error.message}`);
    } finally {
      setUploadingClearance(false);
    }
  };

  // Handle agency uploading exit interview on behalf of employee
  const handleAgencyExitInterviewSubmit = async (separationId, employeeId) => {
    const file = agencyExitInterviewFiles[separationId];
    if (!file) {
      showAlert('Please select a file to upload');
      return;
    }

    try {
      setUploadingInterview(true);

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${employeeId}/exit_interview_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('separation-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Update database
      const { error: updateError } = await supabase
        .from('employee_separations')
        .update({
          signed_exit_interview_url: uploadData.path,
          signed_exit_interview_filename: file.name,
          signed_exit_interview_status: 'submitted',
          signed_exit_interview_submitted_at: new Date().toISOString()
        })
        .eq('id', separationId);

      if (updateError) throw updateError;

      showAlert('Exit interview form submitted successfully!', 'success');
      
      // Clear the file and refresh data
      setAgencyExitInterviewFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[separationId];
        return newFiles;
      });
      fetchAgencyData();
    } catch (error) {
      console.error('Error uploading exit interview:', error);
      showAlert(`Failed to upload: ${error.message}`);
    } finally {
      setUploadingInterview(false);
    }
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
      
      {/* Header (hidden because AgencyLayout provides the main header) */}
      <div className="bg-white shadow-sm sticky top-0 z-50 hidden">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img
                src={LogoCropped}
                alt="Each-R Logo"
                className="h-10 w-auto object-contain"
              />
            </div>

            <nav className="flex items-center space-x-6 text-sm font-medium text-gray-600">
              <Link
                to="/agency/home"
                className="pb-1 hover:text-gray-900 transition-colors"
              >
                Home
              </Link>

              <Link
                to="/agency/endorsements"
                className="pb-1 hover:text-gray-900 transition-colors"
              >
                Endorsements
              </Link>
              <Link to="/agency/requirements" className="hover:text-gray-900 transition-colors pb-1">Requirements</Link>
              <Link to="/agency/trainings" className="hover:text-gray-900 transition-colors pb-1">Trainings/Orientation</Link>
              <Link to="/agency/evaluation" className="hover:text-gray-900 transition-colors pb-1">Evaluation</Link>
              <button className="pb-1 text-[#800000] border-b-2 border-[#800000]">Separation</button>
            </nav>

            <div className="flex items-center space-x-4">
              {/* Notification Bell */}
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 cursor-pointer">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <span className="absolute -top-1 -right-1 bg-[#800000] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">3</span>
              </div>
              
              {/* User Profile with Dropdown */}
              <div className="relative" ref={profileDropdownRef}>
                <div 
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold cursor-pointer hover:bg-gray-300"
                >
                  AU
                </div>
                {/* Dropdown arrow */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full border-2 border-white flex items-center justify-center pointer-events-none">
                  <svg className="w-2 h-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                {/* Dropdown Menu */}
                {showProfileDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 text-sm text-gray-700 border-b">
                        Agency User
                      </div>
                      <button
                        onClick={() => {
                          setShowProfileDropdown(false);
                          setShowLogoutConfirm(true);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Employee Separation</h1>
            <p className="text-gray-500 mt-1">Track and manage resignation requests for your deployed employees</p>
          </div>
          <button
            onClick={openSubmitModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#800000] text-white rounded-lg text-sm font-medium hover:bg-[#990000] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Submit New Request
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000]"></div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-red-800">Error Loading Data</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <button 
                  onClick={fetchAgencyData}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {!loading && !error && (
        <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Pending Review */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Pending Review</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.pendingReview}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-yellow-600 mt-3 font-medium">Awaiting HR review</p>
          </div>

          {/* Processing */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Processing</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.reviewed + stats.processing}</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-purple-600 mt-3 font-medium">Reviewed & clearance in progress</p>
          </div>

          {/* Completed */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Completed</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.completed}</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-green-600 mt-3 font-medium">Fully processed</p>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => { setActiveTab('all'); setCurrentPage(1); setExpandedRow(null); }}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'all'
                    ? 'border-[#800000] text-[#800000] bg-[#800000]/10/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                All Requests
              </button>
              <button
                onClick={() => { setActiveTab('pending_review'); setCurrentPage(1); setExpandedRow(null); }}
                className={`relative px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'pending_review'
                    ? 'border-[#800000] text-[#800000] bg-[#800000]/10/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Pending
                {unviewedCounts.pending_review > 0 && (
                  <span className="absolute top-3 right-3 w-2 h-2 bg-[#800000] rounded-full"></span>
                )}
              </button>
              <button
                onClick={() => { setActiveTab('processing'); setCurrentPage(1); setExpandedRow(null); }}
                className={`relative px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'processing'
                    ? 'border-[#800000] text-[#800000] bg-[#800000]/10/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Processing
                {unviewedCounts.processing > 0 && (
                  <span className="absolute top-3 right-3 w-2 h-2 bg-[#800000] rounded-full"></span>
                )}
              </button>
              <button
                onClick={() => { setActiveTab('completed'); setCurrentPage(1); setExpandedRow(null); }}
                className={`relative px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'completed'
                    ? 'border-[#800000] text-[#800000] bg-[#800000]/10/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Completed
                {unviewedCounts.completed > 0 && (
                  <span className="absolute top-3 right-3 w-2 h-2 bg-[#800000] rounded-full"></span>
                )}
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by employee name, position, or depot..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); setExpandedRow(null); }}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] bg-white"
                />
              </div>

              {/* Export Button */}
              <button className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2 bg-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.length > 0 ? paginatedData.map((request) => {
                  const statusStyle = getStatusBadge(request.status);
                  const isUnviewed = hasUnviewedUpdate(request);
                  
                  return (
                    <React.Fragment key={request.id}>
                      <tr 
                        className={`transition-colors cursor-pointer ${
                          expandedRow === request.id 
                            ? 'bg-[#800000]/10/30' 
                            : isUnviewed 
                              ? 'bg-blue-50/60 hover:bg-blue-100/60' 
                              : 'hover:bg-gray-50/50'
                        }`}
                        onClick={() => {
                          if (isUnviewed) {
                            markAsViewed(request.id);
                          }
                          setExpandedRow(expandedRow === request.id ? null : request.id);
                        }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(request.employeeName)} flex items-center justify-center text-white text-sm font-medium shadow-sm ${isUnviewed ? 'ring-2 ring-blue-400 ring-offset-1' : ''} ${request.isTerminated ? 'ring-2 ring-red-500 ring-offset-1' : ''}`}>
                                {getInitials(request.employeeName)}
                              </div>
                              {isUnviewed && !request.isTerminated && (
                                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#800000] rounded-full border-2 border-white"></span>
                              )}
                              {request.isTerminated && (
                                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-600 rounded-full border-2 border-white flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className={`text-sm font-medium ${isUnviewed ? 'text-gray-900' : 'text-gray-800'}`}>{request.employeeName}</p>
                                {request.isTerminated && (
                                  <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    TERMINATED
                                  </span>
                                )}
                                {isUnviewed && !request.isTerminated && (
                                  <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">NEW</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">{request.position} · {request.depot}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-800">{getResignationType(request.resignationType)}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-800">{formatDate(request.submittedDate)}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${statusStyle.text}`}>
                              {statusStyle.label}
                            </span>
                            <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedRow === request.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Expanded Row - Request Details */}
                      {expandedRow === request.id && (
                        <tr>
                          <td colSpan="5" className="px-6 py-4 bg-gray-50/80">
                            <div className="ml-12 space-y-4">
                              {/* Termination Notice */}
                              {request.isTerminated && (
                                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4">
                                  <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                      </svg>
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="text-sm font-bold text-red-800 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Employee Terminated
                                      </h4>
                                      <p className="text-sm text-red-700 mt-1">
                                        This employee has been terminated by HR on {request.terminationDate ? formatDate(request.terminationDate) : 'N/A'}. The separation process is now complete.
                                      </p>
                                      <div className="mt-2 p-2 bg-red-100 rounded-lg">
                                        <p className="text-xs font-medium text-red-800">⚠️ This employee is no longer active in the system.</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Status Timeline */}
                              <div className="flex items-center gap-4 py-3">
                                {/* Step 1: Submitted */}
                                <div className="flex items-center gap-2">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${request.submittedDate ? 'bg-green-500' : 'bg-gray-300'}`}>
                                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-700">Submitted</p>
                                    <p className="text-xs text-gray-500">{formatDate(request.submittedDate)}</p>
                                  </div>
                                </div>
                                <div className={`flex-1 h-0.5 ${request.processedDate ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                                
                                {/* Step 2: Reviewed */}
                                <div className="flex items-center gap-2">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${request.processedDate ? 'bg-green-500' : 'bg-gray-300'}`}>
                                    {request.processedDate ? (
                                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : (
                                      <span className="text-xs text-white font-medium">2</span>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-700">Reviewed</p>
                                    <p className="text-xs text-gray-500">{request.processedDate ? formatDate(request.processedDate) : 'Pending'}</p>
                                  </div>
                                </div>
                                <div className={`flex-1 h-0.5 ${request.status === 'processing' || request.status === 'completed' ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                                
                                {/* Step 3: Clearance Processing */}
                                <div className="flex items-center gap-2">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                    request.status === 'processing' 
                                      ? 'bg-orange-500' 
                                      : request.status === 'completed' 
                                      ? 'bg-green-500' 
                                      : 'bg-gray-300'
                                  }`}>
                                    {request.status === 'completed' ? (
                                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : request.status === 'processing' ? (
                                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    ) : (
                                      <span className="text-xs text-white font-medium">3</span>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-700">Clearance</p>
                                    <p className="text-xs text-gray-500">
                                      {request.status === 'completed' ? 'Completed' : request.status === 'processing' ? 'Awaiting HR' : 'Pending'}
                                    </p>
                                  </div>
                                </div>
                                <div className={`flex-1 h-0.5 ${request.completedDate ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                                
                                {/* Step 4: Completed */}
                                <div className="flex items-center gap-2">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${request.completedDate ? 'bg-green-500' : 'bg-gray-300'}`}>
                                    {request.completedDate ? (
                                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : (
                                      <span className="text-xs text-white font-medium">4</span>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-700">Completed</p>
                                    <p className="text-xs text-gray-500">{request.completedDate ? formatDate(request.completedDate) : 'Pending'}</p>
                                  </div>
                                </div>
                              </div>

                              {/* HR Remarks */}
                              {request.hrRemarks && (
                                <div className="bg-white rounded-lg border border-gray-100 p-4">
                                  <div>
                                    <span className="text-gray-500 text-sm">HR Remarks:</span>
                                    <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                      <p className="text-sm text-blue-800">{request.hrRemarks}</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Clearance Documents Section - Show for reviewed, processing, and completed */}
                              {(request.status === 'reviewed' || request.status === 'processing' || request.status === 'completed') && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-4">Stage 2: Exit Clearance & Interview Forms</h4>
                                    
                                    {/* Info Banner for Reviewed Status */}
                                    {request.status === 'reviewed' && (
                                      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div className="flex items-start gap-3">
                                          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                          <div>
                                            <p className="text-sm font-medium text-blue-800">Resignation Approved - Stage 2 Unlocked</p>
                                            <p className="text-xs text-blue-700 mt-1">
                                              HR has approved the resignation. The employee can now download and complete the exit clearance and interview forms.
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {/* Exit Clearance Form */}
                                      <div className="border border-gray-200 rounded-lg p-4 bg-white flex flex-col">
                                        <div className="flex items-center justify-between mb-3">
                                          <h5 className="font-medium text-gray-800">Exit Clearance Form</h5>
                                          {request.exitClearanceStatus === "validated" && (
                                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                              ✓ Validated
                                            </span>
                                          )}
                                          {request.exitClearanceStatus === "submitted" && (
                                            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                                              ⏳ Pending Review
                                            </span>
                                          )}
                                          {request.exitClearanceStatus === "resubmission_required" && (
                                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                              ⚠ Resubmission Required
                                            </span>
                                          )}
                                          {!request.exitClearanceStatus && (
                                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                                              Not Started
                                            </span>
                                          )}
                                        </div>

                                        {/* HR Uploaded Form */}
                                        {request.hrExitClearanceFormUrl && (
                                          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <div>
                                                  <p className="text-xs font-medium text-blue-800">HR Form Available</p>
                                                  <p className="text-xs text-blue-600">{request.hrExitClearanceFormFilename || 'Exit Clearance Form'}</p>
                                                </div>
                                              </div>
                                              <button
                                                onClick={async () => {
                                                  try {
                                                    const { data, error } = await supabase.storage
                                                      .from('separation-documents')
                                                      .download(request.hrExitClearanceFormUrl);
                                                    
                                                    if (error) throw error;
                                                    
                                                    const url = URL.createObjectURL(data);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = request.hrExitClearanceFormFilename || 'exit_clearance_form.pdf';
                                                    document.body.appendChild(a);
                                                    a.click();
                                                    document.body.removeChild(a);
                                                    URL.revokeObjectURL(url);
                                                  } catch (err) {
                                                    console.error('Error downloading form:', err);
                                                    showAlert('Failed to download form');
                                                  }
                                                }}
                                                className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                                              >
                                                Download
                                              </button>
                                            </div>
                                          </div>
                                        )}

                                        {/* Status Details */}
                                        {request.exitClearanceStatus === "submitted" && (
                                          <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                            <p className="text-xs text-orange-800">
                                              <span className="font-medium">Submitted by employee</span> - Awaiting HR validation
                                            </p>
                                          </div>
                                        )}
                                        {request.exitClearanceStatus === "validated" && (
                                          <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                            <p className="text-xs text-green-800">
                                              <span className="font-medium">Validated by HR</span> - Clearance form approved
                                            </p>
                                          </div>
                                        )}
                                        {request.exitClearanceStatus === "resubmission_required" && (
                                          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                            <p className="text-xs text-red-800 font-medium">HR requested resubmission</p>
                                            {request.exitClearanceRemarks && (
                                              <p className="text-xs text-red-700 mt-1">{request.exitClearanceRemarks}</p>
                                            )}
                                          </div>
                                        )}

                                        {/* Spacer to push content to bottom */}
                                        <div className="flex-1"></div>

                                        {/* Agency Upload Section (on behalf of employee) */}
                                        {!request.signedExitClearanceUrl && (request.exitClearanceStatus !== 'validated') && (
                                          <div className="mt-auto pt-3 border-t border-gray-200">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                              Upload Completed Form (on behalf of employee)
                                            </label>
                                            <input
                                              type="file"
                                              accept=".pdf,.doc,.docx"
                                              onChange={(e) => {
                                                if (e.target.files[0]) {
                                                  setAgencyExitClearanceFiles(prev => ({
                                                    ...prev,
                                                    [request.id]: e.target.files[0]
                                                  }));
                                                }
                                              }}
                                              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                            />
                                            {agencyExitClearanceFiles[request.id] && (
                                              <div className="mt-2 flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                                <p className="text-xs text-gray-600 flex-1 truncate">
                                                  Selected: {agencyExitClearanceFiles[request.id].name}
                                                </p>
                                                <button
                                                  onClick={() => {
                                                    setAgencyExitClearanceFiles(prev => {
                                                      const newFiles = { ...prev };
                                                      delete newFiles[request.id];
                                                      return newFiles;
                                                    });
                                                  }}
                                                  className="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors flex-shrink-0"
                                                >
                                                  Remove
                                                </button>
                                              </div>
                                            )}
                                            <button
                                              onClick={() => {
                                                setPendingUpload({ separationId: request.id, employeeId: request.employeeId, type: 'clearance' });
                                                setShowClearanceConfirm(true);
                                              }}
                                              disabled={!agencyExitClearanceFiles[request.id] || uploadingClearance}
                                              className="mt-2 w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                                            >
                                              {uploadingClearance ? 'Uploading...' : 'Submit Form'}
                                            </button>
                                          </div>
                                        )}

                                        {/* Employee Submitted Form - View Only */}
                                        {request.signedExitClearanceUrl && (
                                          <div className="mt-auto pt-3 border-t border-gray-200">
                                            <div className="text-sm text-gray-700 mb-2">Submitted Form:</div>
                                            <button
                                              onClick={async () => {
                                                try {
                                                  const { data, error } = await supabase.storage
                                                    .from('separation-documents')
                                                    .download(request.signedExitClearanceUrl);
                                                  
                                                  if (error) throw error;
                                                  
                                                  const url = URL.createObjectURL(data);
                                                  const a = document.createElement('a');
                                                  a.href = url;
                                                  a.download = request.signedExitClearanceFilename || 'exit_clearance.pdf';
                                                  document.body.appendChild(a);
                                                  a.click();
                                                  document.body.removeChild(a);
                                                  URL.revokeObjectURL(url);
                                                } catch (err) {
                                                  console.error('Error downloading form:', err);
                                                  showAlert('Failed to download form');
                                                }
                                              }}
                                              className="w-full inline-flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                                            >
                                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                              </svg>
                                              View Submitted Form
                                            </button>
                                          </div>
                                        )}
                                      </div>

                                      {/* Exit Interview Form */}
                                      <div className="border border-gray-200 rounded-lg p-4 bg-white flex flex-col">
                                        <div className="flex items-center justify-between mb-3">
                                          <h5 className="font-medium text-gray-800">Exit Interview Form</h5>
                                          {request.exitInterviewStatus === "validated" && (
                                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                              ✓ Validated
                                            </span>
                                          )}
                                          {request.exitInterviewStatus === "submitted" && (
                                            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                                              ⏳ Pending Review
                                            </span>
                                          )}
                                          {request.exitInterviewStatus === "resubmission_required" && (
                                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                              ⚠ Resubmission Required
                                            </span>
                                          )}
                                          {!request.exitInterviewStatus && (
                                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                                              Not Started
                                            </span>
                                          )}
                                        </div>

                                        {/* HR Uploaded Form */}
                                        {request.hrExitInterviewFormUrl && (
                                          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <div>
                                                  <p className="text-xs font-medium text-blue-800">HR Form Available</p>
                                                  <p className="text-xs text-blue-600">{request.hrExitInterviewFormFilename || 'Exit Interview Form'}</p>
                                                </div>
                                              </div>
                                              <button
                                                onClick={async () => {
                                                  try {
                                                    const { data, error } = await supabase.storage
                                                      .from('separation-documents')
                                                      .download(request.hrExitInterviewFormUrl);
                                                    
                                                    if (error) throw error;
                                                    
                                                    const url = URL.createObjectURL(data);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = request.hrExitInterviewFormFilename || 'exit_interview_form.pdf';
                                                    document.body.appendChild(a);
                                                    a.click();
                                                    document.body.removeChild(a);
                                                    URL.revokeObjectURL(url);
                                                  } catch (err) {
                                                    console.error('Error downloading form:', err);
                                                    showAlert('Failed to download form');
                                                  }
                                                }}
                                                className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                                              >
                                                Download
                                              </button>
                                            </div>
                                          </div>
                                        )}

                                        {/* Status Details */}
                                        {request.exitInterviewStatus === "submitted" && (
                                          <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                            <p className="text-xs text-orange-800">
                                              <span className="font-medium">Submitted by employee</span> - Awaiting HR validation
                                            </p>
                                          </div>
                                        )}
                                        {request.exitInterviewStatus === "validated" && (
                                          <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                            <p className="text-xs text-green-800">
                                              <span className="font-medium">Validated by HR</span> - Interview form approved
                                            </p>
                                          </div>
                                        )}
                                        {request.exitInterviewStatus === "resubmission_required" && (
                                          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                            <p className="text-xs text-red-800 font-medium">HR requested resubmission</p>
                                            {request.exitInterviewRemarks && (
                                              <p className="text-xs text-red-700 mt-1">{request.exitInterviewRemarks}</p>
                                            )}
                                          </div>
                                        )}

                                        {/* Spacer to push content to bottom */}
                                        <div className="flex-1"></div>

                                        {/* Agency Upload Section (on behalf of employee) */}
                                        {!request.signedExitInterviewUrl && (request.exitInterviewStatus !== 'validated') && (
                                          <div className="mt-auto pt-3 border-t border-gray-200">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                              Upload Completed Form (on behalf of employee)
                                            </label>
                                            <input
                                              type="file"
                                              accept=".pdf,.doc,.docx"
                                              onChange={(e) => {
                                                if (e.target.files[0]) {
                                                  setAgencyExitInterviewFiles(prev => ({
                                                    ...prev,
                                                    [request.id]: e.target.files[0]
                                                  }));
                                                }
                                              }}
                                              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                            />
                                            {agencyExitInterviewFiles[request.id] && (
                                              <div className="mt-2 flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                                <p className="text-xs text-gray-600 flex-1 truncate">
                                                  Selected: {agencyExitInterviewFiles[request.id].name}
                                                </p>
                                                <button
                                                  onClick={() => {
                                                    setAgencyExitInterviewFiles(prev => {
                                                      const newFiles = { ...prev };
                                                      delete newFiles[request.id];
                                                      return newFiles;
                                                    });
                                                  }}
                                                  className="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors flex-shrink-0"
                                                >
                                                  Remove
                                                </button>
                                              </div>
                                            )}
                                            <button
                                              onClick={() => {
                                                setPendingUpload({ separationId: request.id, employeeId: request.employeeId, type: 'interview' });
                                                setShowInterviewConfirm(true);
                                              }}
                                              disabled={!agencyExitInterviewFiles[request.id] || uploadingInterview}
                                              className="mt-2 w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                                            >
                                              {uploadingInterview ? 'Uploading...' : 'Submit Form'}
                                            </button>
                                          </div>
                                        )}

                                        {/* Employee Submitted Form - View Only */}
                                        {request.signedExitInterviewUrl && (
                                          <div className="mt-auto pt-3 border-t border-gray-200">
                                            <div className="text-sm text-gray-700 mb-2">Submitted Form:</div>
                                            <button
                                              onClick={async () => {
                                                try {
                                                  const { data, error } = await supabase.storage
                                                    .from('separation-documents')
                                                    .download(request.signedExitInterviewUrl);
                                                  
                                                  if (error) throw error;
                                                  
                                                  const url = URL.createObjectURL(data);
                                                  const a = document.createElement('a');
                                                  a.href = url;
                                                  a.download = request.signedExitInterviewFilename || 'exit_interview.pdf';
                                                  document.body.appendChild(a);
                                                  a.click();
                                                  document.body.removeChild(a);
                                                  URL.revokeObjectURL(url);
                                                } catch (err) {
                                                  console.error('Error downloading form:', err);
                                                  showAlert('Failed to download form');
                                                }
                                              }}
                                              className="w-full inline-flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                                            >
                                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                              </svg>
                                              View Submitted Form
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Additional HR Documentation */}
                                    {(request.status === 'processing' || request.status === 'completed') && request.finalDocsUrls && request.finalDocsUrls.length > 0 && (
                                      <div className="mt-4 pt-4 border-t border-gray-200">
                                        <h5 className="text-sm font-medium text-gray-700 mb-3">Additional HR Documentation</h5>
                                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                          <p className="text-xs font-medium text-green-800 mb-2">HR has uploaded final separation documents:</p>
                                          <div className="space-y-2">
                                            {request.finalDocsUrls.map((doc, index) => {
                                              // Handle both object format {url, name} and string format
                                              const docUrl = typeof doc === 'object' ? doc.url : doc;
                                              const docName = typeof doc === 'object' ? doc.name : '';
                                              
                                              // Extract filename from URL as fallback
                                              const urlParts = docUrl.split('/');
                                              const fileName = urlParts[urlParts.length - 1];
                                              const displayName = docName || fileName.split('_').slice(2).join('_') || fileName;
                                              
                                              return (
                                                <div key={index} className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded">
                                                  <div className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                    </svg>
                                                    <span className="text-xs text-gray-700 font-medium">{displayName}</span>
                                                  </div>
                                                  <button
                                                    onClick={async () => {
                                                      try {
                                                        const { data, error } = await supabase.storage
                                                          .from('separation-documents')
                                                          .download(docUrl);
                                                        
                                                        if (error) throw error;
                                                        
                                                        const url = URL.createObjectURL(data);
                                                        const a = document.createElement('a');
                                                        a.href = url;
                                                        a.download = displayName;
                                                        document.body.appendChild(a);
                                                        a.click();
                                                        document.body.removeChild(a);
                                                        URL.revokeObjectURL(url);
                                                      } catch (error) {
                                                        console.error('Download error:', error);
                                                        showAlert('Failed to download document');
                                                      }
                                                    }}
                                                    className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                                                  >
                                                    Download
                                                  </button>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Progress Indicator */}
                                    {request.status === 'processing' && (
                                      <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                        <div className="flex items-center gap-2">
                                          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                          <p className="text-sm font-medium text-orange-800">Awaiting HR to complete separation process...</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                }) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="font-medium">No resignation requests found</p>
                      <p className="text-sm mt-1">Try adjusting your search or filter criteria</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredData.length > itemsPerPage && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1.5 text-sm rounded-lg border ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Prev
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1.5 text-sm rounded-lg border ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-blue-800">How to Submit a Resignation Request</h4>
              <p className="text-sm text-blue-700 mt-1">
                Click the <strong>"Submit New Request"</strong> button above to open the resignation form. Select the employee, fill in the details, and submit for HR review. 
                You can track the status of all requests on this page.
              </p>
            </div>
          </div>
        </div>
        </>
        )}
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full mx-4 overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">Confirm Logout</h3>
            </div>
            <div className="p-5 text-sm text-gray-600">
              Are you sure you want to logout from your account?
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-[#800000] text-white hover:bg-[#990000] text-sm font-medium"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Resignation Request Modal */}
      {showSubmitModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={closeSubmitModal}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-[#800000] to-[#990000] flex-shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#990000]/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Submit Resignation Request</h3>
                    <p className="text-sm text-white/80 mt-0.5">Fill out the form below to submit a resignation request for HR review</p>
                  </div>
                </div>
                <button 
                  onClick={closeSubmitModal}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              {/* Employee Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Employee <span className="text-[#800000]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <select
                    value={submitForm.employeeId}
                    onChange={(e) => setSubmitForm(prev => ({ ...prev, employeeId: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#800000] focus:ring-4 focus:ring-[#800000]/10 transition-all appearance-none bg-white"
                  >
                    <option value="">Select an employee...</option>
                    {deployedEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} - {emp.position} ({emp.depot})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {getSelectedEmployee() && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(getSelectedEmployee().name)} flex items-center justify-center text-white text-sm font-medium`}>
                      {getInitials(getSelectedEmployee().name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{getSelectedEmployee().name}</p>
                      <p className="text-xs text-gray-500">{getSelectedEmployee().position} · {getSelectedEmployee().depot}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Resignation Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Resignation Type <span className="text-[#800000]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <select
                    value={submitForm.resignationType}
                    onChange={(e) => setSubmitForm(prev => ({ ...prev, resignationType: e.target.value, otherReason: '' }))}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#800000] focus:ring-4 focus:ring-[#800000]/10 transition-all appearance-none bg-white"
                  >
                    <option value="">Select resignation type...</option>
                    <option value="immediate">Immediate Resignation</option>
                    <option value="resignation">Resignation</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Resignation Letter Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Resignation Letter <span className="text-[#800000]">*</span>
                </label>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                />

                {!submitForm.resignationLetter ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                      isDragging 
                        ? 'border-[#800000] bg-[#800000]/10' 
                        : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-2 ${isDragging ? 'bg-[#800000]/20' : 'bg-gray-100'}`}>
                      <svg className={`w-6 h-6 ${isDragging ? 'text-[#800000]' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-700">
                      {isDragging ? 'Drop your file here' : 'Drag & drop or click to upload'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX (Max 10MB)</p>
                  </div>
                ) : (
                  <div className="border-2 border-green-200 bg-green-50 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{submitForm.resignationLetter.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{formatFileSize(submitForm.resignationLetter.size)}</p>
                      </div>
                      <button
                        onClick={() => setSubmitForm(prev => ({ ...prev, resignationLetter: null }))}
                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirmation Checkbox */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={submitForm.confirmSubmit}
                    onChange={(e) => setSubmitForm(prev => ({ ...prev, confirmSubmit: e.target.checked }))}
                    className="w-5 h-5 rounded border-gray-300 text-[#800000] focus:ring-red-500 mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-amber-800">I confirm this resignation request</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      I understand that this request will be submitted to HR for review. Once submitted, the resignation process will begin.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-end gap-3 flex-shrink-0">
              <button
                onClick={closeSubmitModal}
                className="px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRequest}
                disabled={!submitForm.employeeId || !submitForm.resignationType || !submitForm.resignationLetter || !submitForm.confirmSubmit}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
                  submitForm.employeeId && submitForm.resignationType && submitForm.resignationLetter && submitForm.confirmSubmit
                    ? 'bg-[#800000] text-white hover:bg-[#990000]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertModal.show && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          onClick={closeAlert}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full mx-4 overflow-hidden shadow-xl border border-black"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-5 border-b ${alertModal.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${alertModal.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                  {alertModal.type === 'success' ? (
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <h3 className={`text-lg font-semibold ${alertModal.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                  {alertModal.type === 'success' ? 'Success' : 'Error'}
                </h3>
              </div>
            </div>
            <div className="p-5 text-sm text-gray-700">
              {alertModal.message}
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end bg-gray-50">
              <button
                type="button"
                className={`px-4 py-2 rounded-lg text-white text-sm font-medium ${alertModal.type === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                onClick={closeAlert}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Clearance Confirmation Modal */}
      {showClearanceConfirm && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          onClick={() => setShowClearanceConfirm(false)}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full mx-4 overflow-hidden shadow-xl border border-black"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Submit Exit Clearance Form</h3>
            </div>
            <div className="p-5 text-sm text-gray-600">
              Are you sure you want to submit the exit clearance form on behalf of the employee? This action cannot be undone.
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium"
                onClick={() => setShowClearanceConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm font-medium"
                onClick={() => {
                  setShowClearanceConfirm(false);
                  handleAgencyExitClearanceSubmit(pendingUpload.separationId, pendingUpload.employeeId);
                }}
              >
                Confirm Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Interview Confirmation Modal */}
      {showInterviewConfirm && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          onClick={() => setShowInterviewConfirm(false)}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full mx-4 overflow-hidden shadow-xl border border-black"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Submit Exit Interview Form</h3>
            </div>
            <div className="p-5 text-sm text-gray-600">
              Are you sure you want to submit the exit interview form on behalf of the employee? This action cannot be undone.
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium"
                onClick={() => setShowInterviewConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm font-medium"
                onClick={() => {
                  setShowInterviewConfirm(false);
                  handleAgencyExitInterviewSubmit(pendingUpload.separationId, pendingUpload.employeeId);
                }}
              >
                Confirm Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AgencySeparation;

