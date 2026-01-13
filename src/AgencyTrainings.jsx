// src/AgencyTrainings.jsx
import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "./supabaseClient";
import LogoCropped from './layouts/photos/logo(cropped).png';
import { generateCertificatePDF } from './utils/certificateGenerator';
import EmployeeCertificatesView from './components/EmployeeCertificatesView';

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

  // Data state
  const [loading, setLoading] = useState(true);
  const [upcomingTrainings, setUpcomingTrainings] = useState([]);
  const [pendingAttendance, setPendingAttendance] = useState([]);
  const [trainingHistory, setTrainingHistory] = useState([]);
  const [agencyUserId, setAgencyUserId] = useState(null);
  
  // Details modal state
  const [showDetails, setShowDetails] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [attendeeSearchQuery, setAttendeeSearchQuery] = useState("");
  
  // Action menu state
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch agency user ID and trainings
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Get current logged-in user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          console.error('Error getting user:', authError);
          setLoading(false);
          return;
        }

        setAgencyUserId(user.id);

        // Fetch all employees belonging to this agency
        // Use separate queries to ensure we get all employees
        const [result1, result2] = await Promise.all([
          supabase
            .from('employees')
            .select('id, fname, lname, mname, email')
            .eq('agency_profile_id', user.id),
          supabase
            .from('employees')
            .select('id, fname, lname, mname, email')
            .eq('endorsed_by_agency_id', user.id)
        ]);

        // Combine and deduplicate by id
        const combined = [...(result1.data || []), ...(result2.data || [])];
        const uniqueMap = new Map();
        combined.forEach(emp => {
          if (!uniqueMap.has(emp.id)) {
            uniqueMap.set(emp.id, emp);
          }
        });
        const finalEmployees = Array.from(uniqueMap.values());

        // Log employee fetch results
        console.log('Employee fetch results:', {
          result1Count: result1.data?.length || 0,
          result1Error: result1.error,
          result2Count: result2.data?.length || 0,
          result2Error: result2.error,
          finalCount: finalEmployees.length
        });

        if (result1.error && result2.error && finalEmployees.length === 0) {
          console.error('Error fetching agency employees:', result1.error, result2.error);
          setLoading(false);
          return;
        }

        if (finalEmployees.length === 0) {
          console.warn('No employees found for this agency. User ID:', user.id);
          setLoading(false);
          return;
        }

        // Generate name variations for matching (same format as HrTrainings uses)
        const employeeNameVariations = new Set();
        const employeeMap = {}; // Map from name to employee data
        const normalizedEmployeeMap = {}; // Map from normalized name to original name

        finalEmployees.forEach(emp => {
          // Use EXACT same format as HrTrainings.jsx (line 116-117)
          const lastFirst = [emp.lname, emp.fname].filter(Boolean).join(", ");
          const full = [lastFirst, emp.mname].filter(Boolean).join(" "); // No trim() to match HR format exactly
          
          if (full) {
            employeeNameVariations.add(full);
            employeeMap[full] = {
              id: emp.id,
              name: full,
              email: emp.email
            };
            // Also create normalized version for matching (lowercase, trimmed)
            const normalized = full.toLowerCase().trim();
            normalizedEmployeeMap[normalized] = full;
            // Also add trimmed version for matching
            const trimmed = full.trim();
            if (trimmed !== full) {
              normalizedEmployeeMap[trimmed.toLowerCase()] = full;
            }
          }
        });

        // Fetch all trainings (not filtered by created_by - agencies should see trainings where their employees are attendees)
        const { data: allTrainings, error: trainingError } = await supabase
          .from('trainings')
          .select('*')
          .order('start_at', { ascending: true });

        if (trainingError) {
          console.error('Error fetching trainings:', trainingError);
          setLoading(false);
          return;
        }

        // Get unique creator IDs to fetch trainer names
        const creatorIds = [...new Set((allTrainings || [])
          .map(t => t.created_by)
          .filter(Boolean))];

        // Fetch trainer names from profiles
        const trainerMap = {};
        if (creatorIds.length > 0) {
          const { data: trainers, error: trainerError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', creatorIds);

          if (!trainerError && trainers) {
            trainers.forEach(trainer => {
              const trainerName = [trainer.first_name, trainer.last_name]
                .filter(Boolean)
                .join(' ') || 'Unknown Trainer';
              trainerMap[trainer.id] = trainerName;
            });
          }
        }

        const now = new Date();
        const upcoming = [];
        const pending = [];
        const history = [];

        // Debug logging
        console.log('=== Agency Trainings Debug ===');
        console.log('Agency employees found:', finalEmployees.length);
        console.log('Employee name variations:', Array.from(employeeNameVariations));
        console.log('Total trainings fetched:', (allTrainings || []).length);
        
        // Log sample of trainings with attendees
        const trainingsWithAttendees = (allTrainings || []).filter(t => t.attendees && t.attendees.length > 0);
        console.log('Trainings with attendees:', trainingsWithAttendees.length);
        if (trainingsWithAttendees.length > 0) {
          console.log('Sample training attendees:', trainingsWithAttendees[0].attendees);
          console.log('Sample training title:', trainingsWithAttendees[0].title);
        }

        // Helper function to format time
        const formatTime = (date) => {
          if (!date) return '';
          const d = new Date(date);
          return d.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true 
          });
        };

        // Filter trainings that have any of the agency's employees as attendees
        (allTrainings || []).forEach(training => {
          const attendees = training.attendees || [];
          
          // Helper function to extract and normalize attendee name
          const getAttendeeName = (attendee) => {
            if (typeof attendee === 'string') {
              return attendee.trim();
            }
            if (attendee && typeof attendee === 'object') {
              return (attendee.name || '').trim();
            }
            return '';
          };

          // Check if any attendee matches the agency's employees
          const matchingAttendees = [];
          attendees.forEach(attendee => {
            const attendeeName = getAttendeeName(attendee);
            if (!attendeeName) return;
            
            const trimmedAttendeeName = attendeeName.trim();
            
            // Try exact match first
            if (employeeNameVariations.has(trimmedAttendeeName)) {
              matchingAttendees.push(trimmedAttendeeName);
              return;
            }
            
            // Try normalized match (case-insensitive, trimmed)
            const normalized = trimmedAttendeeName.toLowerCase();
            if (normalizedEmployeeMap[normalized]) {
              matchingAttendees.push(normalizedEmployeeMap[normalized]);
              return;
            }
            
            // Try matching with original name (in case it has extra spaces)
            if (employeeNameVariations.has(attendeeName)) {
              matchingAttendees.push(attendeeName);
              return;
            }
          });

          // Debug logging for first few trainings
          if ((allTrainings || []).indexOf(training) < 5) {
            console.log(`Training "${training.title}":`, {
              rawAttendees: attendees,
              processedAttendees: attendees.map(a => getAttendeeName(a)),
              matchingAttendees: matchingAttendees,
              hasMatch: matchingAttendees.length > 0
            });
          }

          if (matchingAttendees.length === 0) {
            return; // Skip trainings with no agency employees
          }

          // Format attendees with employee data
          const formattedAttendees = matchingAttendees.map(attendeeName => {
            const emp = employeeMap[attendeeName];
            return {
              id: emp?.id || attendeeName,
              name: attendeeName
            };
          });

          const start = training.start_at ? new Date(training.start_at) : null;
          const end = training.end_at ? new Date(training.end_at) : null;
          const trainingEnd = end || (start ? new Date(
            start.getFullYear(),
            start.getMonth(),
            start.getDate(),
            23, 59, 59, 999
          ) : null);

          // Get trainer name
          const trainerName = training.created_by 
            ? (trainerMap[training.created_by] || 'HR Team')
            : 'HR Team';

          const formattedTraining = {
            id: training.id,
            training: training.title || 'Untitled Training',
            title: training.title || 'Untitled Training',
            description: training.description || '',
            image_url: training.image_url || null,
            date: start ? start.toISOString().slice(0, 10) : '',
            time: start && end 
              ? `${formatTime(start)} - ${formatTime(end)}`
              : start 
              ? formatTime(start)
              : '',
            location: training.venue || 'TBA',
            trainer: trainerName,
            attendees: formattedAttendees,
            start_at: training.start_at,
            end_at: training.end_at,
            schedule_type: training.schedule_type || 'onsite',
            is_online: training.schedule_type === 'online'
          };

          if (start && trainingEnd) {
            if (trainingEnd < now) {
              // Past training - check if attendance is recorded
              const hasAttendance = training.attendance && Object.keys(training.attendance || {}).length > 0;
              
              if (hasAttendance) {
                // Format history with attendance data
                const historyAttendees = formattedAttendees.map(attendee => {
                  const attendanceData = training.attendance?.[attendee.name];
                  return {
                    ...attendee,
                    score: attendanceData?.score || null,
                    certificate: attendanceData?.certificate || false,
                    status: attendanceData?.status || (attendanceData ? 'completed' : 'pending')
                  };
                });
                
                history.push({
                  ...formattedTraining,
                  completedDate: start.toISOString().slice(0, 10),
                  attendees: historyAttendees
                });
              } else {
                // Past training without attendance → Pending Attendance
                pending.push(formattedTraining);
              }
            } else {
              // Upcoming training
              upcoming.push(formattedTraining);
            }
          } else {
            // No start date, treat as upcoming
            upcoming.push(formattedTraining);
          }
        });

        setUpcomingTrainings(upcoming);
        setPendingAttendance(pending);
        setTrainingHistory(history);
        
        // Final debug summary
        console.log('=== Matching Summary ===');
        console.log('Upcoming trainings matched:', upcoming.length);
        console.log('Pending attendance trainings matched:', pending.length);
        console.log('History trainings matched:', history.length);
        console.log('Total matched:', upcoming.length + pending.length + history.length);
        console.log('========================');
      } catch (error) {
        console.error('Error fetching trainings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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

  // Get current data based on active tab
  const getCurrentData = () => {
    let data = [];
    switch (activeTab) {
      case 'upcoming':
        data = upcomingTrainings;
        break;
      case 'pending':
        data = pendingAttendance;
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
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Format time to 12-hour with AM/PM
  const formatTime = (timeStr) => {
    if (!timeStr) return 'Not set';
    try {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  // Format start time from start_at timestamp
  const formatStartTime = (startAtTimestamp) => {
    if (!startAtTimestamp) return "N/A";
    try {
      const date = new Date(startAtTimestamp);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHour = hours % 12 || 12;
      const displayMinutes = minutes.toString().padStart(2, '0');
      return `${displayHour}:${displayMinutes} ${ampm}`;
    } catch {
      return "N/A";
    }
  };

  // Format end time from end_at timestamp
  const formatEndTime = (endAtTimestamp) => {
    if (!endAtTimestamp) return "N/A";
    try {
      const date = new Date(endAtTimestamp);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHour = hours % 12 || 12;
      const displayMinutes = minutes.toString().padStart(2, '0');
      return `${displayHour}:${displayMinutes} ${ampm}`;
    } catch {
      return "N/A";
    }
  };

  // Calculate duration between start and end time
  const calculateDuration = (startAt, endAt) => {
    if (!startAt || !endAt) return "N/A";
    try {
      const start = new Date(startAt);
      const end = new Date(endAt);
      const diffMs = end - start;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0 && minutes > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
      } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''}`;
      } else {
        return `${minutes} minute${minutes > 1 ? 's' : ''}`;
      }
    } catch {
      return "N/A";
    }
  };

  // View training details
  const viewDetails = (training) => {
    setSelectedTraining(training);
    setAttendeeSearchQuery(""); // Reset search when opening modal
    setShowDetails(true);
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
        <div className="w-full py-4">
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
              <button className="pb-1 text-[#800000] border-b-2 border-[#800000]">Trainings/Orientation</button>
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
      <div className="w-full py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Trainings & Orientation</h1>
          <p className="text-gray-500 mt-1">Track and manage training schedules and orientation for your deployed employees</p>
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
                    ? 'border-[#800000] text-[#800000] bg-[#800000]/10/50'
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
                onClick={() => { setActiveTab('pending'); setCurrentPage(1); }}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'pending'
                    ? 'border-[#800000] text-[#800000] bg-[#800000]/10/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Pending Attendance
                  <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">{pendingAttendance.length}</span>
                </div>
              </button>
              <button
                onClick={() => { setActiveTab('history'); setCurrentPage(1); }}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'history'
                    ? 'border-[#800000] text-[#800000] bg-[#800000]/10/50'
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
              <button
                onClick={() => { setActiveTab('certificates'); setCurrentPage(1); }}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'certificates'
                    ? 'border-[#800000] text-[#800000] bg-[#800000]/10/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  Employee Certificates
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

          {/* Loading State */}
          {loading && (
            <div className="px-6 py-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000] mx-auto mb-4"></div>
              <p className="text-gray-500">Loading trainings...</p>
            </div>
          )}

          {/* Table */}
          {!loading && (
          <div className="overflow-x-auto">
            {activeTab === 'upcoming' && (
              <div className="h-[500px] overflow-y-auto no-scrollbar p-4 space-y-3">
                {paginatedData.length > 0 ? paginatedData.map((training) => (
                  <div
                    key={training.id}
                    className="group border border-blue-200 rounded-xl p-5 hover:shadow-md hover:border-blue-300 transition-all bg-white cursor-pointer"
                    onClick={() => viewDetails(training)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-3">{training.title}</h3>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                            <span className="font-medium">{formatDate(training.start_at)}</span>
                            <span className="text-gray-300">•</span>
                            <span>{formatStartTime(training.start_at)} - {formatEndTime(training.end_at)}</span>
                            <span className="text-gray-300">•</span>
                            <div className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">
                              {training.is_online ? 'Online' : 'Onsite'}
                            </div>
                            <span className="text-gray-300">•</span>
                            <span className="font-semibold text-blue-600">{training.attendees?.length || 0} attendees</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-medium text-gray-600">No trainings found</p>
                    <p className="text-sm text-gray-500">Try adjusting your search criteria</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'pending' && (
              <div className="h-[500px] overflow-y-auto no-scrollbar p-4 space-y-3">
                {paginatedData.length > 0 ? paginatedData.map((training) => (
                  <div
                    key={training.id}
                    className="group border border-orange-200 rounded-xl p-5 hover:shadow-md hover:border-orange-300 transition-all bg-white cursor-pointer"
                    onClick={() => viewDetails(training)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-bold text-gray-900 group-hover:text-orange-600 transition-colors truncate mb-3">{training.title}</h3>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                            <span className="font-medium">{formatDate(training.start_at)}</span>
                            <span className="text-gray-300">•</span>
                            <span>{formatStartTime(training.start_at)} - {formatEndTime(training.end_at)}</span>
                            <span className="text-gray-300">•</span>
                            <div className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">
                              {training.is_online ? 'Online' : 'Onsite'}
                            </div>
                            <span className="text-gray-300">•</span>
                            <span className="font-medium text-orange-600">{training.attendees?.length || 0} attendees</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center">
                    <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-medium text-gray-600">No pending attendance</p>
                    <p className="text-sm text-gray-500">All completed trainings have been marked.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="h-[500px] overflow-y-auto no-scrollbar p-4 space-y-3">
                {paginatedData.length > 0 ? paginatedData.map((training) => (
                  <div
                    key={training.id}
                    className="group border border-green-200 rounded-xl p-5 hover:shadow-md hover:border-green-300 transition-all bg-white cursor-pointer"
                    onClick={() => viewDetails(training)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-bold text-gray-900 group-hover:text-green-600 transition-colors mb-3">{training.title}</h3>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                            <span className="font-medium">{formatDate(training.end_at)}</span>
                            <span className="text-gray-300">•</span>
                            <span>{formatStartTime(training.start_at)} - {formatEndTime(training.end_at)}</span>
                            <span className="text-gray-300">•</span>
                            <div className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">
                              {training.is_online ? 'Online' : 'Onsite'}
                            </div>
                            <span className="text-gray-300">•</span>
                            <span className="font-semibold text-green-600">{training.attendees?.length || 0} attendees</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-medium text-gray-600">No training history found</p>
                    <p className="text-sm text-gray-500">Try adjusting your search criteria</p>
                  </div>
                )}
              </div>
            )}
          </div>
          )}
          
          {/* Certificates Tab */}
          {activeTab === 'certificates' && (
            <div className="p-6">
              <EmployeeCertificatesView userId={agencyUserId} isAgencyView={true} />
            </div>
          )}

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
                          ? 'bg-[#800000] text-white'
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

      {/* Training Details Modal */}
      {showDetails && selectedTraining && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-50" onClick={() => setShowDetails(false)}>
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Schedule Details</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Complete information about this schedule</p>
                </div>
                <button 
                  onClick={() => setShowDetails(false)} 
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content - Two Column Layout */}
            <div className="flex-1 overflow-hidden flex">
              {/* Left Side - Training Information */}
              <div className="w-[55%] overflow-y-auto p-6 border-r border-gray-200">
                {/* Title Section */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{selectedTraining.training || selectedTraining.title}</h3>
                </div>

                {/* Description Section */}
                <div className="mb-6">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{selectedTraining.description || 'No description provided'}</p>
                </div>

                {/* Training Image */}
                {selectedTraining.image_url && (
                  <div className="mb-4">
                    <img 
                      src={selectedTraining.image_url} 
                      alt={selectedTraining.training || selectedTraining.title}
                      className="w-full h-auto object-contain rounded-lg shadow-md border border-gray-200 max-h-96"
                      onError={(e) => {
                        console.error('Failed to load image:', selectedTraining.image_url);
                        e.target.style.display = 'none';
                      }}
                      onLoad={() => console.log('Image loaded successfully:', selectedTraining.image_url)}
                    />
                  </div>
                )}
                {!selectedTraining.image_url && (
                  <div className="mb-4 p-4 bg-gray-100 rounded-lg border border-gray-200 text-center">
                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs text-gray-500">No image available</p>
                  </div>
                )}

                {/* Divider */}
                <div className="my-6 border-t border-gray-200"></div>

                {/* Schedule Information Section */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Schedule Information</h4>
                  
                  {/* Schedule Type Badge */}
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600">Location Type</p>
                      <p className="text-sm font-bold text-indigo-700">Training Schedule</p>
                    </div>
                  </div>

                  {/* Date & Time Card */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 mb-0.5">Date</p>
                        <p className="text-sm font-bold text-gray-900">{formatDate(selectedTraining.date)}</p>
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-100 pt-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="text-xs font-medium text-gray-500">Start</p>
                            <p className="text-sm font-bold text-gray-900">{selectedTraining.time.split('-')[0]?.trim() || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-orange-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="text-xs font-medium text-gray-500">End</p>
                            <p className="text-sm font-bold text-gray-900">{selectedTraining.time.split('-')[1]?.trim() || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 inline">Duration: </p>
                        <span className="text-sm font-bold text-purple-700">{calculateDuration(selectedTraining.start_at, selectedTraining.end_at)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Location Card */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 mb-1">Location</p>
                        <p className="text-sm font-semibold text-gray-900">{selectedTraining.location || 'Not set'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Trainer Card */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 mb-1">Trainer</p>
                        <p className="text-sm font-semibold text-gray-900">{selectedTraining.trainer || 'HR Team'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Attendees List */}
              <div className="w-[45%] flex flex-col bg-gray-50">
                <div className="p-4 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">
                        Attendees ({selectedTraining.attendees?.length || 0})
                      </h3>
                    </div>
                  </div>
                  
                  {/* Search Bar */}
                  <div className="relative">
                    <svg
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search attendees..."
                      value={attendeeSearchQuery}
                      onChange={(e) => setAttendeeSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3">
                  <div className="space-y-2">
                    {(() => {
                      const filteredAttendees = selectedTraining.attendees?.filter(attendee => {
                        const name = typeof attendee === "string" ? attendee : attendee.name || "";
                        return name.toLowerCase().includes(attendeeSearchQuery.toLowerCase());
                      }) || [];
                      
                      if (filteredAttendees.length === 0) {
                        return (
                          <div className="text-center py-8 text-gray-500">
                            <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <p className="text-sm font-medium">No attendees found</p>
                            <p className="text-xs mt-1">Try adjusting your search</p>
                          </div>
                        );
                      }
                      
                      return filteredAttendees.map((attendee, idx) => {
                        const name = typeof attendee === "string" ? attendee : attendee.name || "";
                        // Check if this is a completed training with attendance marked
                        const hasAttendance = selectedTraining.attendance && typeof selectedTraining.attendance === 'object';
                        const attendanceStatus = hasAttendance ? selectedTraining.attendance[name] : null;
                        const isPresent = attendanceStatus === true || (typeof attendanceStatus === 'object' && attendanceStatus?.status === true);
                        const isCompleted = !selectedTraining.is_active;
                        
                        return (
                          <div 
                            key={idx} 
                            className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-sm transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(name)} flex items-center justify-center text-white text-sm font-semibold shadow-sm flex-shrink-0`}>
                                {getInitials(name)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">{name}</p>
                                {/* Show attendance status for completed trainings */}
                                {isCompleted && hasAttendance && (
                                  <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-semibold mt-1 ${
                                    isPresent 
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    {isPresent ? '✓ Present' : '✗ Absent'}
                                  </span>
                                )}
                              </div>
                              {/* View Certificate button for present employees in completed trainings */}
                              {isCompleted && isPresent && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    generateCertificatePDF(
                                      name,
                                      selectedTraining.title,
                                      selectedTraining.date || selectedTraining.end_at
                                    );
                                  }}
                                  className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-sm text-xs font-semibold flex items-center gap-1.5"
                                  title="View certificate"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  Certificate
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-6 py-3 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowDetails(false)}
                className="px-5 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-semibold text-sm shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
    </>
  );
}

export default AgencyTrainings;
