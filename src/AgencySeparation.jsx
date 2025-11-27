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
    lastWorkingDay: '',
    reason: '',
    resignationLetter: null,
    confirmSubmit: false,
  });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Mock deployed employees for selection
  const deployedEmployees = [
    { id: 2, name: 'Maria Santos', position: 'Dispatcher', depot: 'BGC' },
    { id: 6, name: 'Roberto Cruz', position: 'Driver', depot: 'Makati' },
    { id: 7, name: 'Elena Mendoza', position: 'Admin Staff', depot: 'Quezon City' },
    { id: 8, name: 'Antonio Reyes', position: 'Mechanic', depot: 'Pasig' },
    { id: 9, name: 'Lucia Fernandez', position: 'Driver', depot: 'Makati' },
    { id: 10, name: 'Carlos Villanueva', position: 'Driver', depot: 'Pasay' },
    { id: 11, name: 'Marco Santos', position: 'Driver', depot: 'BGC' },
    { id: 12, name: 'Ana Garcia', position: 'Dispatcher', depot: 'Makati' },
    { id: 13, name: 'Pedro Reyes', position: 'Driver', depot: 'Pasig' },
  ];

  // Mock resignation requests data
  // Status flow: pending_review -> reviewed/rejected -> processing (if reviewed) -> completed/cancelled
  const [resignationRequests, setResignationRequests] = useState([
    {
      id: 1,
      employeeId: 2,
      employeeName: 'Maria Santos',
      position: 'Dispatcher',
      depot: 'BGC',
      resignationType: 'voluntary',
      lastWorkingDay: '2024-12-15',
      reason: 'Pursuing further studies abroad. Thank you for the opportunity to work with Roadwise.',
      submittedDate: '2024-11-20',
      status: 'pending_review',
      hrRemarks: null,
      processedDate: null,
      completedDate: null,
      hasResignationLetter: true,
      clearanceDocuments: [],
      hasUnviewedUpdate: false, // No new update
    },
    {
      id: 2,
      employeeId: 6,
      employeeName: 'Roberto Cruz',
      position: 'Driver',
      depot: 'Makati',
      resignationType: 'voluntary',
      lastWorkingDay: '2024-12-01',
      reason: 'Relocating to province for family reasons.',
      submittedDate: '2024-11-10',
      status: 'reviewed',
      hrRemarks: 'Resignation reviewed. Please ensure proper turnover of assigned vehicle and equipment.',
      processedDate: '2024-11-12',
      completedDate: null,
      hasResignationLetter: true,
      clearanceDocuments: [],
      hasUnviewedUpdate: true, // New update from HR
    },
    {
      id: 3,
      employeeId: 7,
      employeeName: 'Elena Mendoza',
      position: 'Admin Staff',
      depot: 'Quezon City',
      resignationType: 'end_of_contract',
      lastWorkingDay: '2024-11-30',
      reason: 'Contract period has ended.',
      submittedDate: '2024-11-01',
      status: 'completed',
      hrRemarks: 'Clearance completed. Final pay to be released on December 5, 2024.',
      processedDate: '2024-11-03',
      completedDate: '2024-11-28',
      hasResignationLetter: false,
      clearanceDocuments: [
        { id: 1, name: 'Equipment Turnover Form', uploadedDate: '2024-11-25', status: 'approved' },
        { id: 2, name: 'ID and Access Card Return', uploadedDate: '2024-11-26', status: 'approved' },
      ],
      hasUnviewedUpdate: true, // Final pay update
    },
    {
      id: 4,
      employeeId: 8,
      employeeName: 'Antonio Reyes',
      position: 'Mechanic',
      depot: 'Pasig',
      resignationType: 'voluntary',
      lastWorkingDay: '2024-12-20',
      reason: 'Accepted a job offer with better compensation.',
      submittedDate: '2024-11-22',
      status: 'processing',
      hrRemarks: 'Approved. Currently processing clearance and final pay computation.',
      processedDate: '2024-11-24',
      completedDate: null,
      hasResignationLetter: true,
      clearanceResubmitRequired: false,
      clearanceResubmitRemarks: null,
      clearanceDocuments: [
        { id: 1, name: 'Tool Inventory Checklist', uploadedDate: '2024-11-25', status: 'pending' },
      ],
      hasUnviewedUpdate: false,
    },
    {
      id: 7,
      employeeId: 11,
      employeeName: 'Marco Santos',
      position: 'Driver',
      depot: 'BGC',
      resignationType: 'voluntary',
      lastWorkingDay: '2024-12-28',
      reason: 'Career change - pursuing business venture.',
      submittedDate: '2024-11-18',
      status: 'processing',
      hrRemarks: 'Processing clearance. Awaiting re-submission of clearance documents.',
      processedDate: '2024-11-20',
      completedDate: null,
      hasResignationLetter: true,
      clearanceResubmitRequired: true,
      clearanceResubmitRemarks: 'The submitted Equipment Turnover Form is incomplete. Please upload a signed copy with supervisor signature.',
      clearanceDocuments: [
        { id: 1, name: 'Equipment Turnover Form', uploadedDate: '2024-11-22', status: 'rejected' },
      ],
      hasUnviewedUpdate: true, // Re-submit required - new update
    },
    {
      id: 5,
      employeeId: 9,
      employeeName: 'Lucia Fernandez',
      position: 'Driver',
      depot: 'Makati',
      resignationType: 'retirement',
      lastWorkingDay: '2025-01-31',
      reason: 'Reaching retirement age. Grateful for 15 years of service with the company.',
      submittedDate: '2024-11-15',
      status: 'reviewed',
      hrRemarks: 'Retirement reviewed. HR will coordinate for retirement benefits processing.',
      processedDate: '2024-11-18',
      completedDate: null,
      hasResignationLetter: true,
      clearanceDocuments: [],
      hasUnviewedUpdate: false,
    },
    {
      id: 6,
      employeeId: 10,
      employeeName: 'Carlos Villanueva',
      position: 'Driver',
      depot: 'Pasay',
      resignationType: 'voluntary',
      lastWorkingDay: '2025-01-15',
      reason: 'Personal reasons - relocating to province.',
      submittedDate: '2024-11-20',
      status: 'reviewed',
      hrRemarks: 'Reviewed. Please submit clearance documents to proceed with processing.',
      processedDate: '2024-11-25',
      completedDate: null,
      hasResignationLetter: true,
      clearanceDocuments: [],
      hasUnviewedUpdate: true, // New update from HR
    },
  ]);

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
      'from-red-500 to-red-600',
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
      processing: { text: 'text-purple-600', label: 'Processing' },
      completed: { text: 'text-green-600', label: 'Completed' },
      rejected: { text: 'text-red-600', label: 'Rejected' },
      cancelled: { text: 'text-gray-500', label: 'Cancelled' },
    };
    return styles[status] || styles.pending_review;
  };

  const getResignationType = (type) => {
    const types = {
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
      lastWorkingDay: '',
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
      lastWorkingDay: '',
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

  const handleSubmitRequest = () => {
    if (!submitForm.employeeId) {
      alert('Please select an employee');
      return;
    }
    if (!submitForm.resignationType) {
      alert('Please select resignation type');
      return;
    }
    if (submitForm.resignationType === 'other' && !submitForm.otherReason.trim()) {
      alert('Please specify the resignation type');
      return;
    }
    if (!submitForm.lastWorkingDay) {
      alert('Please select last working day');
      return;
    }
    if (!submitForm.reason.trim()) {
      alert('Please provide a reason for resignation');
      return;
    }
    if (!submitForm.confirmSubmit) {
      alert('Please confirm that you want to submit this request');
      return;
    }

    // Here you would implement actual submission logic
    console.log('Submitting resignation:', submitForm);
    alert('Resignation request submitted successfully!');
    closeSubmitModal();
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

  return (
    <div className="min-h-screen bg-gray-50">
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
              <button className="pb-1 text-red-600 border-b-2 border-red-600">Separation</button>
            </nav>

            <div className="flex items-center space-x-4">
              {/* Notification Bell */}
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 cursor-pointer">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">3</span>
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
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Submit New Request
          </button>
        </div>

        {/* Stats Cards */}
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
                    ? 'border-red-600 text-red-600 bg-red-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                All Requests
              </button>
              <button
                onClick={() => { setActiveTab('pending_review'); setCurrentPage(1); setExpandedRow(null); }}
                className={`relative px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'pending_review'
                    ? 'border-red-600 text-red-600 bg-red-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Pending
                {unviewedCounts.pending_review > 0 && (
                  <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              <button
                onClick={() => { setActiveTab('processing'); setCurrentPage(1); setExpandedRow(null); }}
                className={`relative px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'processing'
                    ? 'border-red-600 text-red-600 bg-red-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Processing
                {unviewedCounts.processing > 0 && (
                  <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              <button
                onClick={() => { setActiveTab('completed'); setCurrentPage(1); setExpandedRow(null); }}
                className={`relative px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'completed'
                    ? 'border-red-600 text-red-600 bg-red-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Completed
                {unviewedCounts.completed > 0 && (
                  <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full"></span>
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
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Working Day</th>
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
                            ? 'bg-red-50/30' 
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
                              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(request.employeeName)} flex items-center justify-center text-white text-sm font-medium shadow-sm ${isUnviewed ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}>
                                {getInitials(request.employeeName)}
                              </div>
                              {isUnviewed && (
                                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className={`text-sm font-medium ${isUnviewed ? 'text-gray-900' : 'text-gray-800'}`}>{request.employeeName}</p>
                                {isUnviewed && (
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
                          <p className="text-sm text-gray-800">{formatDate(request.lastWorkingDay)}</p>
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
                                      ? 'bg-purple-500' 
                                      : request.status === 'completed' 
                                      ? 'bg-green-500' 
                                      : 'bg-gray-300'
                                  }`}>
                                    {request.status === 'completed' ? (
                                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : request.status === 'processing' ? (
                                      <svg className="w-3.5 h-3.5 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                      </svg>
                                    ) : (
                                      <span className="text-xs text-white font-medium">3</span>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-700">Clearance</p>
                                    <p className="text-xs text-gray-500">
                                      {request.status === 'completed' ? 'Completed' : request.status === 'processing' ? 'In Progress' : 'Pending'}
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

                              {/* Details Grid */}
                              <div className="bg-white rounded-lg border border-gray-100 p-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Reason for Resignation:</span>
                                    <p className="text-gray-800 mt-1">{request.reason}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Resignation Letter:</span>
                                    <p className="text-gray-800 mt-1">
                                      {request.hasResignationLetter ? (
                                        <span className="inline-flex items-center gap-1 text-blue-600 hover:underline cursor-pointer">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                          </svg>
                                          View Document
                                        </span>
                                      ) : (
                                        <span className="text-gray-400 italic">Not uploaded</span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                                
                                {/* HR Remarks */}
                                {request.hrRemarks && (
                                  <div className="mt-4 pt-4 border-t border-gray-100">
                                    <span className="text-gray-500 text-sm">HR Remarks:</span>
                                    <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                      <p className="text-sm text-blue-800">{request.hrRemarks}</p>
                                    </div>
                                  </div>
                                )}

                                {/* Clearance Documents Section - Show for reviewed, processing, and completed */}
                                {(request.status === 'reviewed' || request.status === 'processing' || request.status === 'completed') && (
                                  <div className="mt-4 pt-4 border-t border-gray-100">
                                    {/* Resubmit Required Banner */}
                                    {request.clearanceResubmitRequired && request.status === 'processing' && (
                                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <div className="flex items-start gap-2">
                                          <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                          </svg>
                                          <div>
                                            <p className="text-sm font-semibold text-red-800">Re-submission Required</p>
                                            <p className="text-xs text-red-700 mt-1">{request.clearanceResubmitRemarks}</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between mb-3">
                                      <span className="text-gray-700 text-sm font-medium">Clearance Documents</span>
                                      {/* Upload enabled for: reviewed status OR processing with resubmit required */}
                                      {(request.status === 'reviewed' || (request.status === 'processing' && request.clearanceResubmitRequired)) && (
                                        <label className="cursor-pointer">
                                          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
                                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                            request.clearanceResubmitRequired 
                                              ? 'bg-red-600 text-white hover:bg-red-700' 
                                              : 'bg-blue-600 text-white hover:bg-blue-700'
                                          }`}>
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            {request.clearanceResubmitRequired ? 'Re-upload Clearance' : 'Upload Clearance'}
                                          </span>
                                        </label>
                                      )}
                                      {/* Show disabled state for processing without resubmit */}
                                      {request.status === 'processing' && !request.clearanceResubmitRequired && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs font-medium cursor-not-allowed">
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                          </svg>
                                          Submitted
                                        </span>
                                      )}
                                    </div>
                                    
                                    {request.clearanceDocuments && request.clearanceDocuments.length > 0 ? (
                                      <div className="space-y-2">
                                        {request.clearanceDocuments.map((doc) => (
                                          <div 
                                            key={doc.id} 
                                            className={`flex items-center justify-between p-3 rounded-lg border ${
                                              doc.status === 'approved' 
                                                ? 'bg-green-50 border-green-200' 
                                                : doc.status === 'rejected'
                                                ? 'bg-red-50 border-red-200'
                                                : 'bg-gray-50 border-gray-200'
                                            }`}
                                          >
                                            <div className="flex items-center gap-3">
                                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                doc.status === 'approved' 
                                                  ? 'bg-green-100' 
                                                  : doc.status === 'rejected'
                                                  ? 'bg-red-100'
                                                  : 'bg-gray-200'
                                              }`}>
                                                <svg className={`w-4 h-4 ${
                                                  doc.status === 'approved' 
                                                    ? 'text-green-600' 
                                                    : doc.status === 'rejected'
                                                    ? 'text-red-600'
                                                    : 'text-gray-500'
                                                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                              </div>
                                              <div>
                                                <p className="text-sm font-medium text-gray-800">{doc.name}</p>
                                                <p className="text-xs text-gray-500">Uploaded {formatDate(doc.uploadedDate)}</p>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                doc.status === 'approved' 
                                                  ? 'bg-green-100 text-green-700' 
                                                  : doc.status === 'rejected'
                                                  ? 'bg-red-100 text-red-700'
                                                  : 'bg-yellow-100 text-yellow-700'
                                              }`}>
                                                {doc.status === 'approved' ? 'Approved' : doc.status === 'rejected' ? 'Rejected' : 'Pending'}
                                              </span>
                                              <button className="p-1 text-gray-400 hover:text-blue-600">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
                                        <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <p className="text-sm text-gray-500">No clearance documents uploaded yet</p>
                                        {request.status === 'reviewed' && (
                                          <p className="text-xs text-gray-400 mt-1">Upload clearance documents to proceed with processing</p>
                                        )}
                                      </div>
                                    )}

                                    {/* Required Clearance Checklist - Show for reviewed status */}
                                    {request.status === 'reviewed' && (
                                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <p className="text-xs font-medium text-yellow-800 mb-2">Required Clearance Documents:</p>
                                        <ul className="text-xs text-yellow-700 space-y-1">
                                          <li className="flex items-center gap-1.5">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                            Equipment/Tools Turnover Form
                                          </li>
                                          <li className="flex items-center gap-1.5">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                            ID and Access Card Return Acknowledgment
                                          </li>
                                          <li className="flex items-center gap-1.5">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                            Accountability Clearance Form
                                          </li>
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Message for Approved status - waiting for processing */}
                                {request.status === 'reviewed' && (
                                  <div className="mt-4 pt-4 border-t border-gray-100">
                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                      <div className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div>
                                          <p className="text-sm font-medium text-blue-800">Resignation Approved</p>
                                          <p className="text-xs text-blue-700 mt-1">
                                            HR is currently reviewing the clearance requirements. Once the status changes to "Processing", you will be able to upload clearance documents.
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
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
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1 hover:text-gray-700 cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Philippines</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </div>
            
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-gray-700 hover:underline">Terms & conditions</a>
              <a href="#" className="hover:text-gray-700 hover:underline">Security</a>
              <a href="#" className="hover:text-gray-700 hover:underline">Privacy</a>
              <span className="text-gray-400">Copyright © 2025, Roadwise</span>
            </div>
          </div>
        </div>
      </footer>

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
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-medium"
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
            <div className="p-5 bg-gradient-to-r from-red-500 to-red-600 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-400/30 flex items-center justify-center">
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
                  Select Employee <span className="text-red-500">*</span>
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
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all appearance-none bg-white"
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
                  Resignation Type <span className="text-red-500">*</span>
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
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all appearance-none bg-white"
                  >
                    <option value="">Select resignation type...</option>
                    <option value="voluntary">Voluntary Resignation</option>
                    <option value="retirement">Retirement</option>
                    <option value="end_of_contract">End of Contract</option>
                    <option value="other">Other</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                
                {/* Other - Custom Input */}
                {submitForm.resignationType === 'other' && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">
                      Please specify <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={submitForm.otherReason || ''}
                      onChange={(e) => setSubmitForm(prev => ({ ...prev, otherReason: e.target.value }))}
                      placeholder="Enter resignation type..."
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all"
                    />
                  </div>
                )}
              </div>

              {/* Last Working Day */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Last Working Day <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="date"
                    value={submitForm.lastWorkingDay}
                    onChange={(e) => setSubmitForm(prev => ({ ...prev, lastWorkingDay: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1.5">Select the employee's intended last day of work</p>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reason for Resignation <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={submitForm.reason}
                  onChange={(e) => setSubmitForm(prev => ({ ...prev, reason: e.target.value }))}
                  rows={4}
                  placeholder="Please provide the reason for resignation..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all resize-none"
                />
                <p className="text-xs text-gray-500 mt-1.5">{submitForm.reason.length}/500 characters</p>
              </div>

              {/* Resignation Letter Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Resignation Letter <span className="text-gray-500 font-normal">(Optional)</span>
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
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-2 ${isDragging ? 'bg-red-100' : 'bg-gray-100'}`}>
                      <svg className={`w-6 h-6 ${isDragging ? 'text-red-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500 mt-0.5"
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
                disabled={!submitForm.employeeId || !submitForm.resignationType || (submitForm.resignationType === 'other' && !submitForm.otherReason.trim()) || !submitForm.lastWorkingDay || !submitForm.reason.trim() || !submitForm.confirmSubmit}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
                  submitForm.employeeId && submitForm.resignationType && (submitForm.resignationType !== 'other' || submitForm.otherReason.trim()) && submitForm.lastWorkingDay && submitForm.reason.trim() && submitForm.confirmSubmit
                    ? 'bg-red-600 text-white hover:bg-red-700'
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
    </div>
  );
}

export default AgencySeparation;

