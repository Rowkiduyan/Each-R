// src/AgencyTrainings.jsx
import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "./supabaseClient";
import LogoCropped from './layouts/photos/logo(cropped).png';

function AgencyTrainings() {
  const navigate = useNavigate();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const profileDropdownRef = useRef(null);
  
  // Tab and filter state
  const [activeTab, setActiveTab] = useState('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState(null);
  const itemsPerPage = 10;

  // Mock data - Training-centric (one training can have multiple attendees)
  const upcomingTrainings = [
    { 
      id: 1, 
      training: 'Defensive Driving Course', 
      date: '2024-12-05', 
      time: '9:00 AM - 4:00 PM', 
      location: 'Makati Training Center',
      trainer: 'Engr. Roberto Cruz',
      attendees: [
        { id: 'EMP-001', name: 'Juan Dela Cruz' },
        { id: 'EMP-005', name: 'Carlos Mendoza' },
        { id: 'EMP-008', name: 'Roberto Santos' },
        { id: 'EMP-015', name: 'Marco Reyes' },
      ]
    },
    { 
      id: 2, 
      training: 'Safety Protocol Training', 
      date: '2024-12-06', 
      time: '1:00 PM - 5:00 PM', 
      location: 'BGC Training Hub',
      trainer: 'Safety Officer Team',
      attendees: [
        { id: 'EMP-002', name: 'Maria Santos' },
        { id: 'EMP-003', name: 'Pedro Garcia' },
      ]
    },
    { 
      id: 3, 
      training: 'Vehicle Maintenance Basics', 
      date: '2024-12-07', 
      time: '10:00 AM - 3:00 PM', 
      location: 'Quezon City Depot',
      trainer: 'Tech. Jose Villanueva',
      attendees: [
        { id: 'EMP-003', name: 'Pedro Garcia' },
        { id: 'EMP-006', name: 'Elena Cruz' },
        { id: 'EMP-009', name: 'Antonio Reyes' },
      ]
    },
    { 
      id: 4, 
      training: 'Customer Service Excellence', 
      date: '2024-12-08', 
      time: '2:00 PM - 4:00 PM', 
      location: 'Online - Zoom',
      trainer: 'HR Training Team',
      attendees: [
        { id: 'EMP-004', name: 'Ana Reyes' },
      ]
    },
    { 
      id: 5, 
      training: 'First Aid & Emergency Response', 
      date: '2024-12-10', 
      time: '8:00 AM - 12:00 PM', 
      location: 'Red Cross Training Center',
      trainer: 'Red Cross Certified Trainers',
      attendees: [
        { id: 'EMP-001', name: 'Juan Dela Cruz' },
        { id: 'EMP-002', name: 'Maria Santos' },
        { id: 'EMP-007', name: 'Diana Torres' },
        { id: 'EMP-010', name: 'Ricardo Fernandez' },
        { id: 'EMP-011', name: 'Lucia Villanueva' },
        { id: 'EMP-012', name: 'Miguel Torres' },
      ]
    },
  ];

  const orientationSchedule = [
    { 
      id: 1, 
      title: 'New Hire Orientation - Batch A',
      date: '2024-12-04', 
      time: '8:00 AM - 5:00 PM', 
      location: 'Head Office - Makati', 
      conductor: 'HR Team',
      attendees: [
        { id: 'EMP-010', name: 'Ricardo Fernandez' },
        { id: 'EMP-011', name: 'Lucia Villanueva' },
        { id: 'EMP-013', name: 'Gabriel Santos' },
      ]
    },
    { 
      id: 2, 
      title: 'New Hire Orientation - Batch B',
      date: '2024-12-06', 
      time: '8:00 AM - 5:00 PM', 
      location: 'BGC Office', 
      conductor: 'Operations Team',
      attendees: [
        { id: 'EMP-012', name: 'Miguel Torres' },
        { id: 'EMP-014', name: 'Sofia Reyes' },
      ]
    },
    { 
      id: 3, 
      title: 'Safety & Compliance Orientation',
      date: '2024-12-09', 
      time: '9:00 AM - 12:00 PM', 
      location: 'Head Office - Makati', 
      conductor: 'Compliance Officer',
      attendees: [
        { id: 'EMP-010', name: 'Ricardo Fernandez' },
        { id: 'EMP-011', name: 'Lucia Villanueva' },
        { id: 'EMP-012', name: 'Miguel Torres' },
        { id: 'EMP-013', name: 'Gabriel Santos' },
        { id: 'EMP-014', name: 'Sofia Reyes' },
      ]
    },
  ];

  const trainingHistory = [
    { 
      id: 1, 
      training: 'Basic Safety Training', 
      completedDate: '2024-11-15', 
      location: 'Makati Training Center',
      trainer: 'Safety Officer Team',
      attendees: [
        { id: 'EMP-001', name: 'Juan Dela Cruz', score: '95%', certificate: true, status: 'completed' },
        { id: 'EMP-002', name: 'Maria Santos', score: '88%', certificate: true, status: 'completed' },
        { id: 'EMP-003', name: 'Pedro Garcia', score: '92%', certificate: true, status: 'completed' },
        { id: 'EMP-008', name: 'Roberto Santos', score: null, certificate: false, status: 'absent' }, // Failed to attend
      ]
    },
    { 
      id: 2, 
      training: 'First Aid Certification', 
      completedDate: '2024-11-10', 
      location: 'Red Cross Training Center',
      trainer: 'Red Cross Certified Trainers',
      attendees: [
        { id: 'EMP-002', name: 'Maria Santos', score: '88%', certificate: true, status: 'completed' },
        { id: 'EMP-004', name: 'Ana Reyes', score: '90%', certificate: true, status: 'completed' },
        { id: 'EMP-009', name: 'Antonio Reyes', score: null, certificate: false, status: 'pending' }, // Not yet updated by HR
      ]
    },
    { 
      id: 3, 
      training: 'Defensive Driving Course', 
      completedDate: '2024-11-08', 
      location: 'Makati Training Center',
      trainer: 'Engr. Roberto Cruz',
      attendees: [
        { id: 'EMP-003', name: 'Pedro Garcia', score: '92%', certificate: true, status: 'completed' },
        { id: 'EMP-005', name: 'Carlos Mendoza', score: '87%', certificate: true, status: 'completed' },
        { id: 'EMP-006', name: 'Elena Cruz', score: '91%', certificate: true, status: 'completed' },
        { id: 'EMP-015', name: 'Marco Reyes', score: null, certificate: false, status: 'absent' }, // Failed to attend
        { id: 'EMP-016', name: 'Teresa Garcia', score: null, certificate: false, status: 'pending' }, // Not yet updated by HR
      ]
    },
    { 
      id: 4, 
      training: 'Customer Service Basics', 
      completedDate: '2024-11-05', 
      location: 'Online - Zoom',
      trainer: 'HR Training Team',
      attendees: [
        { id: 'EMP-004', name: 'Ana Reyes', score: '90%', certificate: true, status: 'completed' },
        { id: 'EMP-007', name: 'Diana Torres', score: '85%', certificate: true, status: 'completed' },
        { id: 'EMP-017', name: 'Ramon Cruz', score: null, certificate: false, status: 'pending' }, // Not yet updated by HR
      ]
    },
  ];

  // Stats - count total attendees across all sessions
  const stats = {
    upcomingTrainings: upcomingTrainings.reduce((sum, t) => sum + t.attendees.length, 0),
    pendingOrientation: orientationSchedule.reduce((sum, o) => sum + o.attendees.length, 0),
    completedThisMonth: trainingHistory.filter(t => t.completedDate.startsWith('2024-11')).reduce((sum, t) => sum + t.attendees.length, 0),
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
    let data = [];
    switch (activeTab) {
      case 'upcoming':
        data = upcomingTrainings;
        break;
      case 'orientation':
        data = orientationSchedule;
        break;
      case 'history':
        data = trainingHistory;
        break;
      default:
        data = upcomingTrainings;
    }

    // Filter by search (search training name, location, trainer, or attendee names)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter(item => 
        (item.training && item.training.toLowerCase().includes(query)) ||
        (item.title && item.title.toLowerCase().includes(query)) ||
        (item.location && item.location.toLowerCase().includes(query)) ||
        (item.trainer && item.trainer.toLowerCase().includes(query)) ||
        (item.conductor && item.conductor.toLowerCase().includes(query)) ||
        item.attendees.some(a => a.name.toLowerCase().includes(query) || a.id.toLowerCase().includes(query))
      );
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
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
      <div className="bg-white shadow-sm">
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
              <button className="pb-1 text-red-600 border-b-2 border-red-600">Trainings/Orientation</button>
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
          <h1 className="text-2xl font-bold text-gray-800">Trainings & Orientation</h1>
          <p className="text-gray-500 mt-1">Track and manage training schedules and orientation for your deployed employees</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Upcoming Trainings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Training Attendees</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.upcomingTrainings}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-3 font-medium">{upcomingTrainings.length} sessions scheduled</p>
          </div>

          {/* Pending Orientation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Orientation Attendees</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.pendingOrientation}</p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-orange-600 mt-3 font-medium">{orientationSchedule.length} sessions scheduled</p>
          </div>

          {/* Completed This Month */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Completed This Month</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.completedThisMonth}</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-green-600 mt-3 font-medium">Employees trained</p>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => { setActiveTab('upcoming'); setCurrentPage(1); }}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'upcoming'
                    ? 'border-red-600 text-red-600 bg-red-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Upcoming Trainings
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{upcomingTrainings.length}</span>
                </div>
              </button>
              <button
                onClick={() => { setActiveTab('orientation'); setCurrentPage(1); }}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'orientation'
                    ? 'border-red-600 text-red-600 bg-red-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Orientation Schedule
                  <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">{orientationSchedule.length}</span>
                </div>
              </button>
              <button
                onClick={() => { setActiveTab('history'); setCurrentPage(1); }}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'history'
                    ? 'border-red-600 text-red-600 bg-red-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Training History
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
                  placeholder="Search by training, location, trainer, or employee name..."
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
            {activeTab === 'upcoming' && (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Training</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date & Time</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Trainer</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Attendees</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedData.length > 0 ? paginatedData.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr 
                        className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${expandedRow === item.id ? 'bg-red-50/30' : ''}`}
                        onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                            </div>
                            <p className="text-sm font-medium text-gray-800">{item.training}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-800">{formatDate(item.date)}</p>
                          <p className="text-xs text-gray-500">{item.time}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600">{item.location}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600">{item.trainer}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {/* Avatar Stack */}
                            <div className="flex -space-x-2">
                              {item.attendees.slice(0, 4).map((attendee, idx) => (
                                <div 
                                  key={attendee.id}
                                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(attendee.name)} flex items-center justify-center text-white text-xs font-medium border-2 border-white shadow-sm`}
                                  title={attendee.name}
                                >
                                  {getInitials(attendee.name)}
                                </div>
                              ))}
                              {item.attendees.length > 4 && (
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium border-2 border-white">
                                  +{item.attendees.length - 4}
                                </div>
                              )}
                            </div>
                            <span className="text-sm text-gray-500">{item.attendees.length} attendee{item.attendees.length !== 1 ? 's' : ''}</span>
                            <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedRow === item.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </td>
                      </tr>
                      {/* Expanded Row - Attendee List */}
                      {expandedRow === item.id && (
                        <tr>
                          <td colSpan="5" className="px-6 py-4 bg-gray-50/80">
                            <div className="ml-12">
                              <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Assigned Attendees ({item.attendees.length})</p>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {item.attendees.map((attendee) => (
                                  <div key={attendee.id} className="flex items-center gap-2 bg-white rounded-lg p-2 border border-gray-100 shadow-sm">
                                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(attendee.name)} flex items-center justify-center text-white text-xs font-medium`}>
                                      {getInitials(attendee.name)}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-gray-800 truncate">{attendee.name}</p>
                                      <p className="text-xs text-gray-500">{attendee.id}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                        <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="font-medium">No trainings found</p>
                        <p className="text-sm mt-1">Try adjusting your search criteria</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'orientation' && (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Orientation</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date & Time</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Conductor</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Attendees</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedData.length > 0 ? paginatedData.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr 
                        className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${expandedRow === `orientation-${item.id}` ? 'bg-orange-50/30' : ''}`}
                        onClick={() => setExpandedRow(expandedRow === `orientation-${item.id}` ? null : `orientation-${item.id}`)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </div>
                            <p className="text-sm font-medium text-gray-800">{item.title}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-800">{formatDate(item.date)}</p>
                          <p className="text-xs text-gray-500">{item.time}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600">{item.location}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600">{item.conductor}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {/* Avatar Stack */}
                            <div className="flex -space-x-2">
                              {item.attendees.slice(0, 4).map((attendee, idx) => (
                                <div 
                                  key={attendee.id}
                                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(attendee.name)} flex items-center justify-center text-white text-xs font-medium border-2 border-white shadow-sm`}
                                  title={attendee.name}
                                >
                                  {getInitials(attendee.name)}
                                </div>
                              ))}
                              {item.attendees.length > 4 && (
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium border-2 border-white">
                                  +{item.attendees.length - 4}
                                </div>
                              )}
                            </div>
                            <span className="text-sm text-gray-500">{item.attendees.length} attendee{item.attendees.length !== 1 ? 's' : ''}</span>
                            <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedRow === `orientation-${item.id}` ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </td>
                      </tr>
                      {/* Expanded Row - Attendee List */}
                      {expandedRow === `orientation-${item.id}` && (
                        <tr>
                          <td colSpan="5" className="px-6 py-4 bg-orange-50/50">
                            <div className="ml-12">
                              <p className="text-xs font-semibold text-gray-500 uppercase mb-3">New Hires Attending ({item.attendees.length})</p>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {item.attendees.map((attendee) => (
                                  <div key={attendee.id} className="flex items-center gap-2 bg-white rounded-lg p-2 border border-gray-100 shadow-sm">
                                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(attendee.name)} flex items-center justify-center text-white text-xs font-medium`}>
                                      {getInitials(attendee.name)}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-gray-800 truncate">{attendee.name}</p>
                                      <p className="text-xs text-gray-500">{attendee.id}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                        <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="font-medium">No orientation schedules found</p>
                        <p className="text-sm mt-1">Try adjusting your search criteria</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'history' && (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Training</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Completed Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Trainer</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Attendees</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedData.length > 0 ? paginatedData.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr 
                        className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${expandedRow === `history-${item.id}` ? 'bg-green-50/30' : ''}`}
                        onClick={() => setExpandedRow(expandedRow === `history-${item.id}` ? null : `history-${item.id}`)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <p className="text-sm font-medium text-gray-800">{item.training}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-800">{formatDate(item.completedDate)}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600">{item.location}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600">{item.trainer}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {/* Avatar Stack with status indicators */}
                            <div className="flex -space-x-2">
                              {item.attendees.slice(0, 4).map((attendee, idx) => (
                                <div 
                                  key={attendee.id}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white shadow-sm ${
                                    attendee.status === 'completed' 
                                      ? `bg-gradient-to-br ${getAvatarColor(attendee.name)}`
                                      : attendee.status === 'absent'
                                      ? 'bg-red-400'
                                      : 'bg-yellow-400'
                                  }`}
                                  title={`${attendee.name}${attendee.status !== 'completed' ? ` (${attendee.status})` : ''}`}
                                >
                                  {attendee.status === 'completed' ? getInitials(attendee.name) : 
                                   attendee.status === 'absent' ? '✕' : '?'}
                                </div>
                              ))}
                              {item.attendees.length > 4 && (
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium border-2 border-white">
                                  +{item.attendees.length - 4}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm text-gray-600">{item.attendees.length} assigned</span>
                              {(item.attendees.filter(a => a.status === 'absent').length > 0 || item.attendees.filter(a => a.status === 'pending').length > 0) && (
                                <span className="text-xs text-gray-400">
                                  {item.attendees.filter(a => a.status === 'completed').length} completed
                                  {item.attendees.filter(a => a.status === 'absent').length > 0 && (
                                    <span className="text-red-500"> · {item.attendees.filter(a => a.status === 'absent').length} absent</span>
                                  )}
                                  {item.attendees.filter(a => a.status === 'pending').length > 0 && (
                                    <span className="text-yellow-600"> · {item.attendees.filter(a => a.status === 'pending').length} pending</span>
                                  )}
                                </span>
                              )}
                            </div>
                            <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedRow === `history-${item.id}` ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </td>
                      </tr>
                      {/* Expanded Row - Attendee List with Scores */}
                      {expandedRow === `history-${item.id}` && (
                        <tr>
                          <td colSpan="5" className="px-6 py-4 bg-green-50/50">
                            <div className="ml-12">
                              {/* Summary badges */}
                              <div className="flex items-center gap-4 mb-4">
                                <p className="text-xs font-semibold text-gray-500 uppercase">Training Results ({item.attendees.length} employees)</p>
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                    {item.attendees.filter(a => a.status === 'completed').length} Completed
                                  </span>
                                  {item.attendees.filter(a => a.status === 'absent').length > 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                                      {item.attendees.filter(a => a.status === 'absent').length} Absent
                                    </span>
                                  )}
                                  {item.attendees.filter(a => a.status === 'pending').length > 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                                      {item.attendees.filter(a => a.status === 'pending').length} Pending
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {item.attendees.map((attendee) => (
                                  <div 
                                    key={attendee.id} 
                                    className={`flex items-center justify-between rounded-lg p-3 border shadow-sm ${
                                      attendee.status === 'completed' 
                                        ? 'bg-white border-gray-100' 
                                        : attendee.status === 'absent'
                                        ? 'bg-red-50 border-red-200'
                                        : 'bg-yellow-50 border-yellow-200'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${
                                        attendee.status === 'completed'
                                          ? `bg-gradient-to-br ${getAvatarColor(attendee.name)}`
                                          : attendee.status === 'absent'
                                          ? 'bg-red-400'
                                          : 'bg-yellow-400'
                                      }`}>
                                        {attendee.status === 'absent' ? (
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                        ) : attendee.status === 'pending' ? (
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                        ) : (
                                          getInitials(attendee.name)
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <p className={`text-sm font-medium truncate ${
                                          attendee.status === 'completed' ? 'text-gray-800' : 
                                          attendee.status === 'absent' ? 'text-red-800' : 'text-yellow-800'
                                        }`}>{attendee.name}</p>
                                        <p className={`text-xs ${
                                          attendee.status === 'completed' ? 'text-gray-500' : 
                                          attendee.status === 'absent' ? 'text-red-600' : 'text-yellow-600'
                                        }`}>
                                          {attendee.status === 'absent' ? 'Did not attend' : 
                                           attendee.status === 'pending' ? 'Awaiting HR update' : 
                                           attendee.id}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {attendee.status === 'completed' && (
                                        <>
                                          <span className="text-sm font-semibold text-green-600">{attendee.score}</span>
                                          {attendee.certificate && (
                                            <button className="text-blue-600 hover:text-blue-700" title="Download Certificate">
                                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                              </svg>
                                            </button>
                                          )}
                                        </>
                                      )}
                                      {attendee.status === 'absent' && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                                          ABSENT
                                        </span>
                                      )}
                                      {attendee.status === 'pending' && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
                                          PENDING
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                        <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="font-medium">No training history found</p>
                        <p className="text-sm mt-1">Try adjusting your search criteria</p>
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
              <p className="text-sm text-gray-500">
                Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> of{' '}
                <span className="font-medium">{filteredData.length}</span> results
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1.5 text-sm rounded-lg border ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 text-sm rounded-lg ${
                        currentPage === page
                          ? 'bg-red-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
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
            </div>
          )}
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
    </div>
  );
}

export default AgencyTrainings;
