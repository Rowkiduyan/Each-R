// src/AgencyRequirements.jsx
import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "./supabaseClient";
import LogoCropped from './layouts/photos/logo(cropped).png';

function AgencyRequirements() {
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

  // Track viewed employees
  const [viewedEmployees, setViewedEmployees] = useState(new Set());

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTarget, setUploadTarget] = useState(null); // { employeeId, type: 'default'|'hr', key, name, isResubmit }
  const [uploadForm, setUploadForm] = useState({ idNumber: '', file: null });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Default requirements (from AgencyEndorsements documents tab)
  const defaultRequirements = [
    { key: 'sss', name: 'SSS (Social Security System)', type: 'id_with_copy' },
    { key: 'tin', name: 'TIN (Tax Identification Number)', type: 'id_with_copy' },
    { key: 'pagibig', name: 'PAG-IBIG (HDMF)', type: 'id_with_copy' },
    { key: 'philhealth', name: 'PhilHealth', type: 'id_with_copy' },
  ];

  // Mock data - Employees with their requirements
  const [employees] = useState([
    {
      id: 1,
      name: 'Juan Dela Cruz',
      position: 'Driver',
      depot: 'Makati',
      deployedDate: '2024-10-15',
      requirements: {
        sss: { idNumber: '10-1234567-8', hasFile: true, status: 'approved', submittedDate: '2024-10-16' },
        tin: { idNumber: '123-456-789-000', hasFile: true, status: 'approved', submittedDate: '2024-10-16' },
        pagibig: { idNumber: '1234-5678-9012', hasFile: true, status: 'approved', submittedDate: '2024-10-16' },
        philhealth: { idNumber: '12-345678901-2', hasFile: true, status: 'approved', submittedDate: '2024-10-16' },
      },
      hrRequests: [],
      hasUnviewedUpdate: false,
    },
    {
      id: 2,
      name: 'Maria Santos',
      position: 'Dispatcher',
      depot: 'BGC',
      deployedDate: '2024-11-01',
      requirements: {
        sss: { idNumber: '10-9876543-2', hasFile: true, status: 'approved', submittedDate: '2024-11-02' },
        tin: { idNumber: '987-654-321-000', hasFile: true, status: 'pending', submittedDate: '2024-11-02' },
        pagibig: { idNumber: '', hasFile: false, status: 'missing', submittedDate: null },
        philhealth: { idNumber: '98-765432109-8', hasFile: true, status: 'resubmit', submittedDate: '2024-11-02', remarks: 'ID copy is blurry. Please upload a clearer image.' },
      },
      hrRequests: [
        { id: 1, document: 'NBI Clearance', deadline: '2024-12-05', status: 'pending', priority: 'high', remarks: null },
      ],
      hasUnviewedUpdate: true,
    },
    {
      id: 3,
      name: 'Pedro Garcia',
      position: 'Driver',
      depot: 'Quezon City',
      deployedDate: '2024-11-10',
      requirements: {
        sss: { idNumber: '10-5555555-5', hasFile: true, status: 'pending', submittedDate: '2024-11-11' },
        tin: { idNumber: '555-555-555-000', hasFile: true, status: 'pending', submittedDate: '2024-11-11' },
        pagibig: { idNumber: '5555-5555-5555', hasFile: true, status: 'pending', submittedDate: '2024-11-11' },
        philhealth: { idNumber: '55-555555555-5', hasFile: true, status: 'pending', submittedDate: '2024-11-11' },
      },
      hrRequests: [],
      hasUnviewedUpdate: false,
    },
    {
      id: 4,
      name: 'Ana Reyes',
      position: 'Admin Staff',
      depot: 'Makati',
      deployedDate: '2024-09-20',
      requirements: {
        sss: { idNumber: '10-2222222-2', hasFile: true, status: 'approved', submittedDate: '2024-09-21' },
        tin: { idNumber: '222-222-222-000', hasFile: true, status: 'approved', submittedDate: '2024-09-21' },
        pagibig: { idNumber: '2222-2222-2222', hasFile: true, status: 'approved', submittedDate: '2024-09-21' },
        philhealth: { idNumber: '22-222222222-2', hasFile: true, status: 'approved', submittedDate: '2024-09-21' },
      },
      hrRequests: [
        { id: 1, document: 'Police Clearance', deadline: '2024-12-10', status: 'submitted', priority: 'medium', submittedDate: '2024-11-25', remarks: null },
        { id: 2, document: 'Medical Certificate', deadline: '2024-12-15', status: 'approved', priority: 'low', submittedDate: '2024-11-20', approvedDate: '2024-11-22', remarks: null },
      ],
      hasUnviewedUpdate: false,
    },
    {
      id: 5,
      name: 'Roberto Santos',
      position: 'Mechanic',
      depot: 'Pasig',
      deployedDate: '2024-11-15',
      requirements: {
        sss: { idNumber: '', hasFile: false, status: 'missing', submittedDate: null },
        tin: { idNumber: '', hasFile: false, status: 'missing', submittedDate: null },
        pagibig: { idNumber: '', hasFile: false, status: 'missing', submittedDate: null },
        philhealth: { idNumber: '', hasFile: false, status: 'missing', submittedDate: null },
      },
      hrRequests: [],
      hasUnviewedUpdate: true,
    },
    {
      id: 6,
      name: 'Elena Cruz',
      position: 'Driver',
      depot: 'BGC',
      deployedDate: '2024-10-25',
      requirements: {
        sss: { idNumber: '10-3333333-3', hasFile: true, status: 'approved', submittedDate: '2024-10-26' },
        tin: { idNumber: '333-333-333-000', hasFile: true, status: 'approved', submittedDate: '2024-10-26' },
        pagibig: { idNumber: '3333-3333-3333', hasFile: true, status: 'resubmit', submittedDate: '2024-10-26', remarks: 'Document is expired. Please submit a current copy.' },
        philhealth: { idNumber: '33-333333333-3', hasFile: true, status: 'approved', submittedDate: '2024-10-26' },
      },
      hrRequests: [
        { id: 1, document: 'Barangay Clearance', deadline: '2024-12-01', status: 'resubmit', priority: 'high', remarks: 'Clearance has expired. Please submit a new one dated within the last 6 months.' },
      ],
      hasUnviewedUpdate: true,
    },
  ]);

  // Helper function to check if employee has unviewed update
  const hasUnviewedUpdate = (employee) => {
    return employee.hasUnviewedUpdate && !viewedEmployees.has(employee.id);
  };

  // Mark employee as viewed
  const markAsViewed = (employeeId) => {
    setViewedEmployees(prev => new Set([...prev, employeeId]));
  };

  // Calculate requirement status for an employee
  const getEmployeeStatus = (employee) => {
    const reqs = employee.requirements;
    const hasResubmit = Object.values(reqs).some(r => r.status === 'resubmit') || 
                        employee.hrRequests.some(r => r.status === 'resubmit');
    const hasMissing = Object.values(reqs).some(r => r.status === 'missing');
    const hasPending = Object.values(reqs).some(r => r.status === 'pending') ||
                       employee.hrRequests.some(r => r.status === 'pending' || r.status === 'submitted');
    const allApproved = Object.values(reqs).every(r => r.status === 'approved') &&
                        employee.hrRequests.every(r => r.status === 'approved');
    
    if (hasResubmit) return 'action_required';
    if (hasMissing) return 'incomplete';
    if (hasPending) return 'pending';
    if (allApproved) return 'complete';
    return 'pending';
  };

  // Calculate stats
  const stats = {
    actionRequired: employees.filter(e => getEmployeeStatus(e) === 'action_required').length,
    incomplete: employees.filter(e => getEmployeeStatus(e) === 'incomplete').length,
    pending: employees.filter(e => getEmployeeStatus(e) === 'pending').length,
    complete: employees.filter(e => getEmployeeStatus(e) === 'complete').length,
    total: employees.length,
  };

  // Unviewed counts
  const unviewedCounts = {
    action_required: employees.filter(e => getEmployeeStatus(e) === 'action_required' && hasUnviewedUpdate(e)).length,
    incomplete: employees.filter(e => getEmployeeStatus(e) === 'incomplete' && hasUnviewedUpdate(e)).length,
    pending: employees.filter(e => getEmployeeStatus(e) === 'pending' && hasUnviewedUpdate(e)).length,
    complete: employees.filter(e => getEmployeeStatus(e) === 'complete' && hasUnviewedUpdate(e)).length,
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

  // Filter data based on active tab and search
  const getFilteredData = () => {
    let data = [...employees];

    // Filter by tab
    if (activeTab !== 'all') {
      data = data.filter(e => getEmployeeStatus(e) === activeTab);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter(e => 
        e.name.toLowerCase().includes(query) ||
        e.position.toLowerCase().includes(query) ||
        e.depot.toLowerCase().includes(query) ||
        String(e.id).includes(query)
      );
    }

    return data;
  };

  const filteredData = getFilteredData();
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Helpers
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

  const getStatusStyle = (status) => {
    const styles = {
      approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
      submitted: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Submitted' },
      resubmit: { bg: 'bg-red-100', text: 'text-red-700', label: 'Re-submit' },
      missing: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Missing' },
    };
    return styles[status] || styles.pending;
  };

  const getEmployeeStatusBadge = (status) => {
    const styles = {
      complete: { text: 'text-green-600', label: 'Complete' },
      pending: { text: 'text-yellow-600', label: 'Pending Review' },
      incomplete: { text: 'text-orange-600', label: 'Incomplete' },
      action_required: { text: 'text-red-600', label: 'Action Required' },
    };
    return styles[status] || styles.pending;
  };

  // Count requirements progress
  const getRequirementsProgress = (employee) => {
    const reqs = Object.values(employee.requirements);
    const approved = reqs.filter(r => r.status === 'approved').length;
    return { approved, total: reqs.length };
  };

  // Upload Modal Functions
  const openUploadModal = (employeeId, type, key, name, isResubmit = false, currentIdNumber = '') => {
    setUploadTarget({ employeeId, type, key, name, isResubmit });
    setUploadForm({ idNumber: currentIdNumber || '', file: null });
    setShowUploadModal(true);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setUploadTarget(null);
    setUploadForm({ idNumber: '', file: null });
    setIsDragging(false);
  };

  const handleFileSelect = (file) => {
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload a valid file (PDF, JPG, PNG, DOC, DOCX)');
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setUploadForm(prev => ({ ...prev, file }));
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

  const handleUploadSubmit = () => {
    // Validate form
    if (uploadTarget?.type === 'default' && !uploadForm.idNumber.trim()) {
      alert('Please enter the ID number');
      return;
    }
    if (!uploadForm.file) {
      alert('Please select a file to upload');
      return;
    }
    
    // Here you would implement actual upload logic
    console.log('Uploading:', uploadTarget, uploadForm);
    alert('Document uploaded successfully!');
    closeUploadModal();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.name || 'Unknown';
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
      
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-50">
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
              <button className="pb-1 text-red-600 border-b-2 border-red-600">Requirements</button>
              <Link to="/agency/trainings" className="hover:text-gray-900 transition-colors pb-1">Trainings/Orientation</Link>
              <Link to="/agency/evaluation" className="hover:text-gray-900 transition-colors pb-1">Evaluation</Link>
              <Link to="/agency/separation" className="hover:text-gray-900 transition-colors pb-1">Separation</Link>
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Employee Requirements</h1>
          <p className="text-gray-500 mt-1">Manage and track employment requirements for your deployed employees</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Doc Requests */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Document Requests</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-yellow-600 mt-3 font-medium">Submission pending</p>
          </div>

          {/* Action Required */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Action Required</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.actionRequired}</p>
              </div>
              <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-red-600 mt-3 font-medium">Re-submit required</p>
          </div>

          {/* Incomplete */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Incomplete</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.incomplete}</p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-orange-600 mt-3 font-medium">Complete Submission Required</p>
          </div>

          {/* Complete */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Complete</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.complete}</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-green-600 mt-3 font-medium">All requirements met</p>
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
                All Employees
              </button>
              <button
                onClick={() => { setActiveTab('action_required'); setCurrentPage(1); setExpandedRow(null); }}
                className={`relative px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'action_required'
                    ? 'border-red-600 text-red-600 bg-red-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Action Required
                {unviewedCounts.action_required > 0 && (
                  <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              <button
                onClick={() => { setActiveTab('incomplete'); setCurrentPage(1); setExpandedRow(null); }}
                className={`relative px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'incomplete'
                    ? 'border-red-600 text-red-600 bg-red-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Incomplete
                {unviewedCounts.incomplete > 0 && (
                  <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              <button
                onClick={() => { setActiveTab('pending'); setCurrentPage(1); setExpandedRow(null); }}
                className={`relative px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'pending'
                    ? 'border-red-600 text-red-600 bg-red-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Pending Review
                {unviewedCounts.pending > 0 && (
                  <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              <button
                onClick={() => { setActiveTab('complete'); setCurrentPage(1); setExpandedRow(null); }}
                className={`relative px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'complete'
                    ? 'border-red-600 text-red-600 bg-red-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Complete
                {unviewedCounts.complete > 0 && (
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Position / Depot</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">HR Requests</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.length > 0 ? paginatedData.map((employee) => {
                  const status = getEmployeeStatus(employee);
                  const statusStyle = getEmployeeStatusBadge(status);
                  const progress = getRequirementsProgress(employee);
                  const isUnviewed = hasUnviewedUpdate(employee);
                  const pendingHrRequests = employee.hrRequests.filter(r => r.status === 'pending' || r.status === 'resubmit').length;
                  
                  return (
                    <React.Fragment key={employee.id}>
                      <tr 
                        className={`transition-colors cursor-pointer ${
                          expandedRow === employee.id 
                            ? 'bg-red-50/30' 
                            : isUnviewed 
                              ? 'bg-blue-50/60 hover:bg-blue-100/60' 
                              : 'hover:bg-gray-50/50'
                        }`}
                        onClick={() => {
                          if (isUnviewed) {
                            markAsViewed(employee.id);
                          }
                          setExpandedRow(expandedRow === employee.id ? null : employee.id);
                        }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(employee.name)} flex items-center justify-center text-white text-sm font-medium shadow-sm ${isUnviewed ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}>
                                {getInitials(employee.name)}
                              </div>
                              {isUnviewed && (
                                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className={`text-sm font-medium ${isUnviewed ? 'text-gray-900' : 'text-gray-800'}`}>{employee.name}</p>
                                {isUnviewed && (
                                  <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">NEW</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">Deployed {formatDate(employee.deployedDate)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-800">{employee.position}</p>
                          <p className="text-xs text-gray-500">{employee.depot}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full max-w-[80px]">
                              <div 
                                className={`h-2 rounded-full ${progress.approved === progress.total ? 'bg-green-500' : 'bg-yellow-500'}`}
                                style={{ width: `${(progress.approved / progress.total) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-600">{progress.approved}/{progress.total}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {employee.hrRequests.length > 0 ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-800">{employee.hrRequests.length}</span>
                              {pendingHrRequests > 0 && (
                                <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">{pendingHrRequests} pending</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">None</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${statusStyle.text}`}>
                              {statusStyle.label}
                            </span>
                            <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedRow === employee.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Expanded Row - Requirements Details */}
                      {expandedRow === employee.id && (
                        <tr>
                          <td colSpan="5" className="px-6 py-5 bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
                            <div className="space-y-5">
                              {/* Default Requirements */}
                              <div>
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                      </svg>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-800">Government IDs</p>
                                  </div>
                                  <span className="text-xs text-gray-500">{getRequirementsProgress(employee).approved} of {getRequirementsProgress(employee).total} approved</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {defaultRequirements.map((req) => {
                                    const data = employee.requirements[req.key];
                                    const style = getStatusStyle(data.status);
                                    const needsAction = data.status === 'missing' || data.status === 'resubmit';
                                    
                                    return (
                                      <div 
                                        key={req.key} 
                                        className={`p-4 rounded-xl border-2 transition-all ${
                                          data.status === 'resubmit' 
                                            ? 'bg-red-50 border-red-200 shadow-sm' 
                                            : data.status === 'missing' 
                                              ? 'bg-orange-50/50 border-orange-200 border-dashed' 
                                              : data.status === 'approved'
                                                ? 'bg-green-50/50 border-green-200'
                                                : 'bg-white border-gray-200'
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                              <p className="text-sm font-semibold text-gray-800">{req.name}</p>
                                            </div>
                                            {data.idNumber ? (
                                              <div className="flex items-center gap-1.5 mt-1">
                                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                                </svg>
                                                <p className="text-xs text-gray-600 font-mono">{data.idNumber}</p>
                                              </div>
                                            ) : (
                                              <p className="text-xs text-gray-400 italic mt-1">No ID number</p>
                                            )}
                                            {data.hasFile && data.submittedDate && (
                                              <div className="flex items-center gap-1.5 mt-1">
                                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <p className="text-xs text-gray-500">Submitted {formatDate(data.submittedDate)}</p>
                                              </div>
                                            )}
                                            {data.remarks && (
                                              <div className="mt-2 p-2 bg-red-100/80 rounded-lg text-xs text-red-700 flex items-start gap-1.5">
                                                <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                                <span>{data.remarks}</span>
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex flex-col items-end gap-2">
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${style.bg} ${style.text}`}>
                                              {style.label}
                                            </span>
                                            {needsAction && (
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  openUploadModal(employee.id, 'default', req.key, req.name, data.status === 'resubmit', data.idNumber);
                                                }}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                  data.status === 'resubmit'
                                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                                }`}
                                              >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                </svg>
                                                {data.status === 'resubmit' ? 'Re-upload' : 'Upload'}
                                              </button>
                                            )}
                                            {data.status === 'approved' && (
                                              <div className="flex items-center gap-1 text-green-600">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* HR Requested Documents */}
                              {employee.hrRequests.length > 0 && (
                                <div>
                                  <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-800">HR Requested Documents</p>
                                  </div>
                                  <div className="space-y-3">
                                    {employee.hrRequests.map((req) => {
                                      const style = getStatusStyle(req.status);
                                      const needsAction = req.status === 'pending' || req.status === 'resubmit';
                                      
                                      return (
                                        <div 
                                          key={req.id} 
                                          className={`p-4 rounded-xl border-2 transition-all ${
                                            req.status === 'resubmit' 
                                              ? 'bg-red-50 border-red-200 shadow-sm' 
                                              : req.status === 'pending'
                                                ? 'bg-orange-50/50 border-orange-200 border-dashed'
                                                : req.status === 'approved'
                                                  ? 'bg-green-50/50 border-green-200'
                                                  : 'bg-white border-gray-200'
                                          }`}
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2 mb-1">
                                                <p className="text-sm font-semibold text-gray-800">{req.document}</p>
                                                {req.priority === 'high' && (
                                                  <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold">Urgent</span>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-1.5 mt-1">
                                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <p className="text-xs text-gray-500">Deadline: <span className="font-medium">{formatDate(req.deadline)}</span></p>
                                              </div>
                                              {req.remarks && (
                                                <div className="mt-2 p-2 bg-red-100/80 rounded-lg text-xs text-red-700 flex items-start gap-1.5">
                                                  <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                  </svg>
                                                  <span>{req.remarks}</span>
                                                </div>
                                              )}
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${style.bg} ${style.text}`}>
                                                {style.label}
                                              </span>
                                              {needsAction && (
                                                <button 
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    openUploadModal(employee.id, 'hr', req.id, req.document, req.status === 'resubmit');
                                                  }}
                                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                    req.status === 'resubmit'
                                                      ? 'bg-red-600 text-white hover:bg-red-700'
                                                      : 'bg-blue-600 text-white hover:bg-blue-700'
                                                  }`}
                                                >
                                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                  </svg>
                                                  {req.status === 'resubmit' ? 'Re-upload' : 'Upload'}
                                                </button>
                                              )}
                                              {req.status === 'approved' && (
                                                <div className="flex items-center gap-1 text-green-600">
                                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                  </svg>
                                                </div>
                                              )}
                                              {req.status === 'submitted' && (
                                                <div className="flex items-center gap-1 text-blue-600">
                                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                  </svg>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Quick Actions */}
                              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                                <Link 
                                  to="/agency/endorsements" 
                                  state={{ employeeId: employee.id, openTab: 'documents' }}
                                  className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1.5 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  View Employee Profile
                                </Link>
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
                      <p className="font-medium">No employees found</p>
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
              <h4 className="text-sm font-semibold text-blue-800">About Employee Requirements</h4>
              <p className="text-sm text-blue-700 mt-1">
                <strong>Default requirements</strong> (SSS, TIN, PAG-IBIG, PhilHealth) must be submitted for all deployed employees. 
                <strong> HR may request additional documents</strong> such as NBI Clearance, Police Clearance, or Medical Certificates as needed. 
                Keep track of deadlines and ensure all requirements are submitted on time.
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

      {/* Upload Document Modal */}
      {showUploadModal && uploadTarget && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={closeUploadModal}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`p-5 ${uploadTarget.isResubmit ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${uploadTarget.isResubmit ? 'bg-red-400/30' : 'bg-blue-400/30'}`}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {uploadTarget.isResubmit ? 'Re-upload Document' : 'Upload Document'}
                    </h3>
                    <p className="text-sm text-white/80 mt-0.5">{uploadTarget.name}</p>
                  </div>
                </div>
                <button 
                  onClick={closeUploadModal}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* Employee Name Badge */}
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg">
                <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm text-white font-medium">{getEmployeeName(uploadTarget.employeeId)}</span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5">
              {/* ID Number Input (only for default requirements) */}
              {uploadTarget.type === 'default' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ID Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={uploadForm.idNumber}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, idNumber: e.target.value }))}
                      placeholder={`Enter ${uploadTarget.name} ID Number`}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">Enter the ID number exactly as it appears on the document</p>
                </div>
              )}

              {/* File Upload Area */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Document File <span className="text-gray-500 font-normal">(Photocopy)</span> <span className="text-red-500">*</span>
                </label>
                
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                />

                {/* Drag & Drop Zone */}
                {!uploadForm.file ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      isDragging 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-14 h-14 mx-auto rounded-xl flex items-center justify-center mb-3 ${isDragging ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <svg className={`w-7 h-7 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-700">
                      {isDragging ? 'Drop your file here' : 'Drag & drop your file here'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">or <span className="text-blue-600 font-medium">browse</span> to choose a file</p>
                    <p className="text-xs text-gray-400 mt-3">Supports: PDF, JPG, PNG, DOC, DOCX (Max 10MB)</p>
                  </div>
                ) : (
                  /* File Preview */
                  <div className="border-2 border-green-200 bg-green-50 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{uploadForm.file.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{formatFileSize(uploadForm.file.size)}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Ready to upload</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setUploadForm(prev => ({ ...prev, file: null }))}
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

              {/* Re-submit Warning */}
              {uploadTarget.isResubmit && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-amber-800">This is a re-submission</p>
                      <p className="text-xs text-amber-700 mt-0.5">Please ensure the new document addresses the previous issues noted by HR.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-end gap-3">
              <button
                onClick={closeUploadModal}
                className="px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadSubmit}
                disabled={!uploadForm.file || (uploadTarget.type === 'default' && !uploadForm.idNumber.trim())}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
                  uploadForm.file && (uploadTarget.type !== 'default' || uploadForm.idNumber.trim())
                    ? uploadTarget.isResubmit
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {uploadTarget.isResubmit ? 'Re-submit Document' : 'Upload Document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AgencyRequirements;

