// src/AgencyEval.jsx
import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "./supabaseClient";
import LogoCropped from './layouts/photos/logo(cropped).png';

function AgencyEval() {
  const navigate = useNavigate();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const profileDropdownRef = useRef(null);
  
  // Tab and filter state
  const [activeTab, setActiveTab] = useState('due');
  const [searchQuery, setSearchQuery] = useState('');
  const [employmentFilter, setEmploymentFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState(null);
  const itemsPerPage = 8;

  // Helper function to calculate status dynamically by comparing nextEvaluation date vs real today's date
  // - "uptodate": nextEvaluation is in the future (after today)
  // - "duetoday": nextEvaluation exactly matches today's date
  // - "overdue": nextEvaluation is in the past (at least 1 day before today)
  const calculateStatus = (nextEvaluation) => {
    if (!nextEvaluation) return 'uptodate';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    const dueDate = new Date(nextEvaluation);
    dueDate.setHours(0, 0, 0, 0); // Reset time to start of day
    
    // Check if due date exactly matches today (same day, month, year)
    if (dueDate.getTime() === today.getTime()) {
      return 'duetoday';
    }
    
    // Check if due date is in the past (overdue by 1+ days)
    if (dueDate < today) {
      return 'overdue';
    }
    
    // Due date is in the future - up to date
    return 'uptodate';
  };

  // Mock data - Employees with evaluation records
  // nextEvaluation is based on hire date anniversary (+ 1 year after last evaluation year for regular, + 1 month for probationary)
  // Status is calculated dynamically by comparing nextEvaluation vs real today's date
  
  const employeesRaw = [
    // === UP TO DATE EXAMPLES ===
    { 
      id: 'EMP-001', 
      name: 'Juan Dela Cruz', 
      position: 'Driver',
      depot: 'Makati',
      employmentType: 'regular', // yearly evaluation on hire anniversary
      hireDate: '2022-12-15',
      lastEvaluation: '2024-12-18', // Completed 2024 eval (due was March 15)
      nextEvaluation: '2025-12-15', // Next year's due date (future = uptodate)
      evaluations: [
        { id: 1, period: '2024', type: 'Annual Performance Review', date: '2024-03-18', rating: 'Exceeds Expectations', score: '4.5/5', evaluator: 'Maria Santos (HR)', remarks: 'Excellent attendance and performance. Recommended for salary increase.' },
        { id: 2, period: '2023', type: 'Annual Performance Review', date: '2023-03-16', rating: 'Meets Expectations', score: '3.8/5', evaluator: 'Maria Santos (HR)', remarks: 'Good overall performance. Needs improvement in documentation.' },
      ]
    },
    { 
      id: 'EMP-002', 
      name: 'Maria Santos', 
      position: 'Dispatcher',
      depot: 'BGC',
      employmentType: 'regular',
      hireDate: '2021-12-01',
      lastEvaluation: '2024-12-01', // Completed 2024 eval
      nextEvaluation: '2025-12-01', // Future = uptodate
      evaluations: [
        { id: 1, period: '2024', type: 'Annual Performance Review', date: '2024-06-05', rating: 'Exceeds Expectations', score: '4.7/5', evaluator: 'Roberto Cruz (HR Manager)', remarks: 'Outstanding leadership and coordination skills.' },
        { id: 2, period: '2023', type: 'Annual Performance Review', date: '2023-06-02', rating: 'Exceeds Expectations', score: '4.5/5', evaluator: 'Roberto Cruz (HR Manager)', remarks: 'Consistently exceeds targets.' },
      ]
    },
    
  
    
    // === DUE TODAY EXAMPLES (nextEvaluation = Nov 27, 2024 - today's date) ===
    { 
      id: 'EMP-005', 
      name: 'Carlos Mendoza', 
      position: 'Senior Driver',
      depot: 'Makati',
      employmentType: 'regular',
      hireDate: '2023-11-27', // Hired Nov 27, 2023
      lastEvaluation: null, // First year - no previous eval
      nextEvaluation: '2025-11-27', // Due on hire anniversary (1 year later)
      evaluations: []
    },
    { 
      id: 'EMP-012', 
      name: 'Miguel Torres', 
      position: 'Driver',
      depot: 'BGC',
      employmentType: 'probationary',
      hireDate: '2024-11-27', // Hired Oct 27, 2024
      lastEvaluation: null, // First month - due today
      nextEvaluation: '2025-11-27', // Due 1 month after hire
      evaluations: []
    },
    
    // === OVERDUE EXAMPLES (past dates = overdue) ===
    { 
      id: 'EMP-011', 
      name: 'Lucia Villanueva', 
      position: 'Admin Staff',
      depot: 'Makati',
      employmentType: 'probationary',
      hireDate: '2024-09-15',
      lastEvaluation: '2024-10-16', // October eval done
      nextEvaluation: '2024-11-15', // November eval was due Nov 15 - overdue!
      evaluations: [
        { id: 1, period: 'Oct 2024', type: 'Monthly Probation Review', date: '2024-10-16', rating: 'Meets Expectations', score: '3.8/5', evaluator: 'Pedro Garcia (Admin Head)', remarks: 'Good communication skills. Quick learner.' },
        { id: 2, period: 'Sep 2024', type: 'Monthly Probation Review', date: '2024-09-18', rating: 'On Track', score: '3.5/5', evaluator: 'Pedro Garcia (Admin Head)', remarks: 'Good first month. Adapting well.' },
      ]
    },

  ];

  // Apply dynamic status calculation to employees based on real today's date
  const employees = employeesRaw.map(emp => ({
    ...emp,
    status: calculateStatus(emp.nextEvaluation)
  }));

  // Calculate stats
  const stats = {
    totalEmployees: employees.length,
    dueForEval: employees.filter(e => e.status === 'duetoday' || e.status === 'overdue').length,
    overdueCount: employees.filter(e => e.status === 'overdue').length,
    probationaryCount: employees.filter(e => e.employmentType === 'probationary').length,
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

  // Get current data based on active tab
  const getCurrentData = () => {
    let data = [...employees];
    
    // Filter by tab
    switch (activeTab) {
      case 'due':
        // Show only employees that need attention (due today or overdue)
        data = data.filter(e => e.status === 'duetoday' || e.status === 'overdue');
        break;
      case 'all':
        // Show all employees
        break;
      case 'history':
        // Show employees with evaluation history
        data = data.filter(e => e.evaluations.length > 0);
        break;
      default:
        break;
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query) ||
        item.position.toLowerCase().includes(query) ||
        item.depot.toLowerCase().includes(query)
      );
    }

    // Filter by employment type
    if (employmentFilter !== 'all') {
      data = data.filter(item => item.employmentType === employmentFilter);
    }

    return data;
  };

  const filteredData = getCurrentData();
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Get initials from name
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Generate consistent color based on name
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
      overdue: { text: 'text-red-600', label: 'Overdue' },
      duetoday: { text: 'text-orange-600', label: 'Due Today' },
      uptodate: { text: 'text-green-600', label: 'Up to Date' },
    };
    return styles[status] || styles.uptodate;
  };

  const getRatingColor = (rating) => {
    if (rating.includes('Outstanding') || rating.includes('Exceeds')) return 'text-green-600';
    if (rating.includes('Meets') || rating.includes('On Track')) return 'text-blue-600';
    if (rating.includes('Needs')) return 'text-orange-600';
    return 'text-gray-600';
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
              <button className="pb-1 text-red-600 border-b-2 border-red-600">Evaluation</button>
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
          <h1 className="text-2xl font-bold text-gray-800">Employee Evaluations</h1>
          <p className="text-gray-500 mt-1">Monitor and track performance evaluation records for your deployed employees</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Due for Evaluation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Due for Evaluation</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.dueForEval}</p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-orange-600 mt-3 font-medium">Requires attention</p>
          </div>

          {/* Overdue */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Overdue</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.overdueCount}</p>
              </div>
              <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-red-600 mt-3 font-medium">Past due date</p>
          </div>

          {/* Probationary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Under Probation</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.probationaryCount}</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-purple-600 mt-3 font-medium">Monthly evaluations</p>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => { setActiveTab('due'); setCurrentPage(1); setExpandedRow(null); }}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'due'
                    ? 'border-red-600 text-red-600 bg-red-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Due for Evaluation
                  {stats.dueForEval > 0 && (
                    <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">{stats.dueForEval}</span>
                  )}
                </div>
              </button>
              <button
                onClick={() => { setActiveTab('all'); setCurrentPage(1); setExpandedRow(null); }}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'all'
                    ? 'border-red-600 text-red-600 bg-red-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  All Employees
                </div>
              </button>
              <button
                onClick={() => { setActiveTab('history'); setCurrentPage(1); setExpandedRow(null); }}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'history'
                    ? 'border-red-600 text-red-600 bg-red-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  Evaluation History
                </div>
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
                  placeholder="Search by employee name, ID, position, or depot..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); setExpandedRow(null); }}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                />
              </div>
              
              {/* Employment Type Filter */}
              <select
                value={employmentFilter}
                onChange={(e) => { setEmploymentFilter(e.target.value); setCurrentPage(1); setExpandedRow(null); }}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white min-w-[180px]"
              >
                <option value="all">All Employment Types</option>
                <option value="regular">Regular (Yearly)</option>
                <option value="probationary">Probationary (Monthly)</option>
              </select>

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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Evaluation</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Next Due</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.length > 0 ? paginatedData.map((employee) => {
                  const statusStyle = getStatusBadge(employee.status);
                  const daysUntilDue = getDaysUntilDue(employee.nextEvaluation);
                  
                  return (
                    <React.Fragment key={employee.id}>
                      <tr 
                        className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${expandedRow === employee.id ? 'bg-blue-50/30' : ''}`}
                        onClick={() => setExpandedRow(expandedRow === employee.id ? null : employee.id)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(employee.name)} flex items-center justify-center text-white text-sm font-medium shadow-sm`}>
                              {getInitials(employee.name)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{employee.name}</p>
                              <p className="text-xs text-gray-500">{employee.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-800">{employee.position}</p>
                          <p className="text-xs text-gray-500">{employee.depot}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className={`text-sm font-medium ${
                            employee.employmentType === 'regular' 
                              ? 'text-blue-600' 
                              : 'text-purple-600'
                          }`}>
                            {employee.employmentType === 'regular' ? 'Regular' : 'Probationary'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {employee.employmentType === 'regular' ? 'Yearly eval' : 'Monthly eval'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-800">{formatDate(employee.lastEvaluation)}</p>
                          {employee.evaluations.length > 0 && (
                            <p className="text-xs text-gray-500">{employee.evaluations.length} record{employee.evaluations.length !== 1 ? 's' : ''}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-800">{formatDate(employee.nextEvaluation)}</p>
                          {daysUntilDue !== null && employee.status !== 'uptodate' && (
                            <p className={`text-xs ${daysUntilDue < 0 ? 'text-red-600' : daysUntilDue <= 7 ? 'text-orange-600' : 'text-gray-500'}`}>
                              {daysUntilDue < 0 
                                ? `${Math.abs(daysUntilDue)} days overdue`
                                : daysUntilDue === 0 
                                ? 'Due today'
                                : `${daysUntilDue} days left`
                              }
                            </p>
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
                      
                      {/* Expanded Row - Evaluation History */}
                      {expandedRow === employee.id && (
                        <tr>
                          <td colSpan="6" className="px-6 py-4 bg-gray-50/80">
                            <div className="ml-12">
                              <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-semibold text-gray-700">Evaluation History</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  Hire Date: {formatDate(employee.hireDate)}
                                </div>
                              </div>
                              
                              {employee.evaluations.length > 0 ? (
                                <div className="space-y-3">
                                  {employee.evaluations.map((evaluation) => (
                                    <div key={evaluation.id} className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-3 mb-2">
                                            <span className="text-sm font-semibold text-gray-800">{evaluation.type}</span>
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{evaluation.period}</span>
                                          </div>
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                              <span className="text-gray-500">Date:</span>
                                              <span className="ml-2 text-gray-800">{formatDate(evaluation.date)}</span>
                                            </div>
                                            <div>
                                              <span className="text-gray-500">Rating:</span>
                                              <span className={`ml-2 font-medium ${getRatingColor(evaluation.rating)}`}>{evaluation.rating}</span>
                                            </div>
                                            <div>
                                              <span className="text-gray-500">Score:</span>
                                              <span className="ml-2 text-gray-800 font-medium">{evaluation.score}</span>
                                            </div>
                                            <div>
                                              <span className="text-gray-500">Evaluator:</span>
                                              <span className="ml-2 text-gray-800">{evaluation.evaluator}</span>
                                            </div>
                                          </div>
                                          {evaluation.remarks && (
                                            <div className="mt-3 pt-3 border-t border-gray-100">
                                              <span className="text-xs text-gray-500 font-medium">Remarks:</span>
                                              <p className="text-sm text-gray-600 mt-1">{evaluation.remarks}</p>
                                            </div>
                                          )}
                                        </div>
                                        <button className="text-blue-600 hover:text-blue-700 p-2" title="View Full Report">
                                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                          </svg>
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="bg-white rounded-lg p-6 border border-gray-100 text-center">
                                  <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                  </svg>
                                  <p className="text-sm text-gray-500">No evaluation records yet</p>
                                  <p className="text-xs text-gray-400 mt-1">HR will upload evaluation results after the scheduled assessment</p>
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
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
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
              <h4 className="text-sm font-semibold text-blue-800">Evaluation Schedule Reminder</h4>
              <p className="text-sm text-blue-700 mt-1">
                <strong>Regular employees</strong> are evaluated <strong>annually</strong> (every 12 months from hire date). 
                <strong> Probationary employees</strong> are evaluated <strong>monthly</strong> until regularization. 
                Evaluation records are uploaded and managed by HR.
              </p>
            </div>
          </div>
        </div>
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
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-medium"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AgencyEval;
