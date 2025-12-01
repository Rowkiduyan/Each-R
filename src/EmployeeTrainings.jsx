import { Link } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { useEmployeeUser } from "./layouts/EmployeeLayout";
import { supabase } from './supabaseClient';

function EmployeeTrainings() {
    const { userId, userEmail, employeeUser } = useEmployeeUser();
    const [loading, setLoading] = useState(true);
    const [upcoming, setUpcoming] = useState([]);
    const [pendingAttendance, setPendingAttendance] = useState([]);
    const [completed, setCompleted] = useState([]);
    const [selectedTraining, setSelectedTraining] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [activeTab, setActiveTab] = useState("upcoming");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentEmployeeData, setCurrentEmployeeData] = useState(null);
    
    // External training upload state
    const [externalTrainings, setExternalTrainings] = useState([]);
    const [newTraining, setNewTraining] = useState({ title: "", date: "", certification: null });

    // Get employee's possible name formats for matching
    const getEmployeeNameVariations = () => {
        const empData = currentEmployeeData || employeeUser;
        if (!empData) return [];
        const { fname, lname, mname } = empData;
        
        const variations = [];
        
        // Format: "Last, First Middle" (same as HrTrainings)
        const lastFirst = [lname, fname].filter(Boolean).join(", ");
        const full = [lastFirst, mname].filter(Boolean).join(" ").trim();
        if (full) variations.push(full);
        
        // Format: "Last, First" (without middle name)
        if (lastFirst) variations.push(lastFirst.trim());
        
        // Format: "First Middle Last"
        const firstMiddleLast = [fname, mname, lname].filter(Boolean).join(" ").trim();
        if (firstMiddleLast) variations.push(firstMiddleLast);
        
        // Format: "First Last"
        const firstLast = [fname, lname].filter(Boolean).join(" ").trim();
        if (firstLast) variations.push(firstLast);
        
        // Normalize all variations (trim and lowercase for comparison)
        return variations.map(v => v.trim()).filter(Boolean);
    };

    // Fetch employee data if not available from context
    useEffect(() => {
        const loadEmployeeData = async () => {
            if (employeeUser) {
                fetchTrainings();
                return;
            }

            // If employeeUser is not available, try to fetch from database using email
            if (userEmail) {
                try {
                    const { data, error } = await supabase
                        .from('employees')
                        .select('fname, lname, mname, email')
                        .eq('email', userEmail)
                        .maybeSingle();

                    if (!error && data) {
                        // Employee data found, fetch trainings
                        fetchTrainings();
                    } else {
                        setLoading(false);
                    }
                } catch (err) {
                    console.error('Error loading employee data:', err);
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        loadEmployeeData();
    }, [employeeUser, userEmail]);

    const fetchTrainings = async () => {
        // Get employee data - either from context or fetch it
        let empData = employeeUser;
        
        if (!empData && userEmail) {
            try {
                const { data, error } = await supabase
                    .from('employees')
                    .select('fname, lname, mname, email')
                    .eq('email', userEmail)
                    .maybeSingle();
                
                if (error || !data) {
                    console.error('Error fetching employee data:', error);
                    setLoading(false);
                    return;
                }
                empData = data;
            } catch (err) {
                console.error('Error fetching employee data:', err);
                setLoading(false);
                return;
            }
        }

        if (!empData) {
            setLoading(false);
            return;
        }

        // Store employee data for use throughout component
        setCurrentEmployeeData(empData);
        
        // Calculate name variations with current employee data
        const { fname, lname, mname } = empData;
        const nameVariations = [];
        
        const lastFirst = [lname, fname].filter(Boolean).join(", ");
        const full = [lastFirst, mname].filter(Boolean).join(" ").trim();
        if (full) nameVariations.push(full);
        
        if (lastFirst) nameVariations.push(lastFirst.trim());
        
        const firstMiddleLast = [fname, mname, lname].filter(Boolean).join(" ").trim();
        if (firstMiddleLast) nameVariations.push(firstMiddleLast);
        
        const firstLast = [fname, lname].filter(Boolean).join(" ").trim();
        if (firstLast) nameVariations.push(firstLast);
        
        const normalizedVariations = nameVariations.map(n => n.trim()).filter(Boolean);
        
        if (normalizedVariations.length === 0) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('trainings')
                .select('*')
                .order('start_at', { ascending: true });

            if (error) {
                console.error('Error fetching trainings:', error);
                setLoading(false);
                return;
            }

            // Normalize name variations for comparison (trim and lowercase)
            const normalizedVariationsForMatch = normalizedVariations.map(n => n.trim().toLowerCase());

            // Filter trainings where this employee is in attendees
            // Try multiple name format matches
            const myTrainings = (data || []).filter((training) => {
                const attendees = training.attendees || [];
                return attendees.some(att => {
                    const attendeeName = typeof att === "string" ? att : att.name || "";
                    const normalizedAttendeeName = attendeeName.trim().toLowerCase();
                    
                    // Check if any name variation matches
                    return normalizedVariationsForMatch.some(variation => 
                        normalizedAttendeeName === variation
                    );
                });
            });

            // Normalize and separate upcoming, pending attendance, and completed trainings
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Start of today (no time)
            const upcomingTrainings = [];
            const pendingAttendanceTrainings = [];
            const completedTrainings = [];

            myTrainings.forEach((training) => {
                const start = training.start_at ? new Date(training.start_at) : null;
                const normalized = {
                    ...training,
                    date: start ? start.toISOString().slice(0, 10) : "",
                    time: start ? start.toISOString().slice(11, 16) : "",
                };

                if (training.is_active === false) {
                    // Attendance has been marked
                    completedTrainings.push(normalized);
                } else {
                    // Still active, check if date has passed
                    if (start) {
                        // Compare dates only (ignore time) to determine if it's a past date
                        const trainingDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                        if (trainingDate < today) {
                            // Past date but no attendance marked yet
                            pendingAttendanceTrainings.push(normalized);
                        } else {
                            // Today or future date
                            upcomingTrainings.push(normalized);
                        }
                    } else {
                        // No start date, treat as upcoming
                        upcomingTrainings.push(normalized);
                    }
                }
            });

            // Sort upcoming in ascending order by date (soonest first)
            upcomingTrainings.sort((a, b) => {
                const dateA = a.start_at ? new Date(a.start_at) : new Date(0);
                const dateB = b.start_at ? new Date(b.start_at) : new Date(0);
                return dateA - dateB;
            });

            // Sort pending attendance in descending order by date (most recent first)
            pendingAttendanceTrainings.sort((a, b) => {
                const dateA = a.start_at ? new Date(a.start_at) : new Date(0);
                const dateB = b.start_at ? new Date(b.start_at) : new Date(0);
                return dateB - dateA;
            });

            // Sort completed in descending order by date (most recent first)
            completedTrainings.sort((a, b) => {
                const dateA = a.start_at ? new Date(a.start_at) : new Date(0);
                const dateB = b.start_at ? new Date(b.start_at) : new Date(0);
                return dateB - dateA;
            });

            setUpcoming(upcomingTrainings);
            setPendingAttendance(pendingAttendanceTrainings);
            setCompleted(completedTrainings);
        } catch (error) {
            console.error('Error fetching trainings:', error);
        } finally {
            setLoading(false);
        }
    };

    // Format date
    const formatDate = (dateStr) => {
        if (!dateStr) return 'Not set';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return dateStr;
        }
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

    // Check if training is happening today
    const isHappeningToday = (training) => {
        if (!training.start_at) return false;
        try {
            const trainingDate = new Date(training.start_at);
            const now = new Date();
            
            // Check if same date (year, month, day)
            const isSameDate = trainingDate.getFullYear() === now.getFullYear() &&
                             trainingDate.getMonth() === now.getMonth() &&
                             trainingDate.getDate() === now.getDate();
            
            return isSameDate;
        } catch {
            return false;
        }
    };

    // View training details
    const viewDetails = (training) => {
        setSelectedTraining(training);
        setShowDetails(true);
    };

    // Stats
    const stats = {
        upcoming: upcoming.length,
        pendingAttendance: pendingAttendance.length,
        completed: completed.length,
    };

    // Search-filtered lists
    const normalizeForSearch = (t) => {
        const haystack = [t.title, t.venue]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
        return haystack;
    };

    const filteredUpcoming = upcoming.filter((t) => {
        if (!searchQuery) return true;
        return normalizeForSearch(t).includes(searchQuery.toLowerCase());
    });

    const filteredPendingAttendance = pendingAttendance.filter((t) => {
        if (!searchQuery) return true;
        return normalizeForSearch(t).includes(searchQuery.toLowerCase());
    });

    const filteredCompleted = completed.filter((t) => {
        if (!searchQuery) return true;
        return normalizeForSearch(t).includes(searchQuery.toLowerCase());
    });

    // Handle upload training
    const handleUploadTraining = () => {
        if (!newTraining.title || !newTraining.date) {
            alert("Title and date are required.");
            return;
        }

        setExternalTrainings([...externalTrainings, { ...newTraining, id: Date.now() }]);
        setNewTraining({ title: "", date: "", certification: null });
        setShowUpload(false);
    };

    return (
        <div className="min-h-screen bg-white">
            <style>{`
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                
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
                
                * {
                    scrollbar-width: thin;
                    scrollbar-color: #d1d5db transparent;
                }
            `}</style>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-0">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-800">Trainings & Orientation</h1>
                    <p className="text-gray-500 mt-1">View your assigned training schedules and upload external trainings</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Upcoming</p>
                                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.upcoming}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-xs text-blue-600 mt-3 font-medium">Scheduled sessions</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Pending Attendance</p>
                                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.pendingAttendance}</p>
                            </div>
                            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-xs text-orange-600 mt-3 font-medium">Awaiting HR confirmation</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Completed Schedules</p>
                                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.completed}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-xs text-green-600 mt-3 font-medium">Finished sessions</p>
                    </div>
                </div>

                {/* Main Content Card with Tabs (Upcoming / History) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-">
                    {/* Tabs */}
                    <div className="border-b border-gray-200">
                        <div className="flex">
                            <button
                                onClick={() => setActiveTab('upcoming')}
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
                                    Upcoming Schedules
                                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{upcoming.length}</span>
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveTab('pending')}
                                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === 'pending'
                                        ? 'border-red-600 text-red-600 bg-red-50/50'
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
                                onClick={() => setActiveTab('history')}
                                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === 'history'
                                        ? 'border-red-600 text-red-600 bg-red-50/50'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    History
                                    <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">{completed.length}</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Search + Upload button bar */}
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                        <div className="relative flex-1">
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
                                placeholder="Search by training title or venue..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                            />
                        </div>
                        <button
                            onClick={() => setShowUpload(true)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm font-medium self-start sm:self-auto"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            Upload Training
                        </button>
                    </div>

                    {/* Tab content */}
                    {loading ? (
                        <div className="px-6 py-12 text-center text-gray-500 h-[500px] flex items-center justify-center">
                            <p>Loading trainings...</p>
                        </div>
                    ) : activeTab === 'upcoming' ? (
                        filteredUpcoming.length === 0 ? (
                            <div className="px-6 py-12 text-center text-gray-500 h-[500px] flex flex-col items-center justify-center">
                                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="font-medium">No upcoming schedules</p>
                                <p className="text-sm mt-1">You have no upcoming training schedules assigned.</p>
                            </div>
                        ) : (
                            <div className="relative h-[500px] overflow-y-auto no-scrollbar p-4 space-y-3">
                                {filteredUpcoming.map((training) => (
                                    <div
                                        key={training.id}
                                        className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
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
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{training.title}</h3>
                                                        {isHappeningToday(training) && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                                                Happening Now
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                                                        <div className="flex items-center gap-1.5">
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                            <span className="font-medium">{formatDate(training.date)}</span>
                                                        </div>
                                                        <span className="text-gray-300">•</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span>{formatTime(training.time)}</span>
                                                        </div>
                                                        <span className="text-gray-300">•</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            </svg>
                                                            <span className="truncate">{training.venue || 'Venue not set'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : activeTab === 'pending' ? (
                        filteredPendingAttendance.length === 0 ? (
                            <div className="px-6 py-12 text-center text-gray-500 h-[500px] flex flex-col items-center justify-center">
                                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="font-medium">No pending attendance</p>
                                <p className="text-sm mt-1">All completed trainings have been marked by HR.</p>
                            </div>
                        ) : (
                            <div className="relative h-[500px] overflow-y-auto no-scrollbar p-4 space-y-3">
                                {filteredPendingAttendance.map((training) => (
                                    <div
                                        key={training.id}
                                        className="bg-white border border-orange-200 rounded-xl p-5 hover:shadow-md hover:border-orange-300 transition-all cursor-pointer group"
                                        onClick={() => viewDetails(training)}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-4 flex-1">
                                                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0">
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">{training.title}</h3>
                                                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                                                        <div className="flex items-center gap-1.5">
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                            <span className="font-medium">{formatDate(training.date)}</span>
                                                        </div>
                                                        <span className="text-gray-300">•</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span>{formatTime(training.time)}</span>
                                                        </div>
                                                        <span className="text-gray-300">•</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            </svg>
                                                            <span className="truncate">{training.venue || 'Venue not set'}</span>
                                                        </div>
                                                        <span className="text-gray-300">•</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">Pending HR Confirmation</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : filteredCompleted.length === 0 ? (
                        <div className="px-6 py-12 text-center text-gray-500 h-[500px] flex flex-col items-center justify-center">
                            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="font-medium">No completed schedules</p>
                            <p className="text-sm mt-1">Completed schedules will appear here.</p>
                        </div>
                    ) : (
                        <div className="relative h-[500px] overflow-y-auto no-scrollbar p-4 space-y-3">
                            {filteredCompleted.map((training) => (
                                <div
                                    key={training.id}
                                    className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-green-300 transition-all cursor-pointer group"
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
                                                <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">{training.title}</h3>
                                                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                                                    <div className="flex items-center gap-1.5">
                                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <span className="font-medium">{formatDate(training.date)}</span>
                                                    </div>
                                                    <span className="text-gray-300">•</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span>{formatTime(training.time)}</span>
                                                    </div>
                                                    <span className="text-gray-300">•</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                        <span className="truncate">{training.venue || 'Venue not set'}</span>
                                                    </div>
                                                    {training.attendance && (() => {
                                                        const nameVariations = getEmployeeNameVariations();
                                                        const attended = nameVariations.some(name => training.attendance[name] === true);
                                                        return (
                                                            <>
                                                                <span className="text-gray-300">•</span>
                                                                <div className="flex items-center gap-1.5">
                                                                    <svg className={`w-4 h-4 ${attended ? 'text-green-500' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={attended ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M6 18L18 6M6 6l12 12"} />
                                                                    </svg>
                                                                    <span className={`font-semibold ${attended ? 'text-green-600' : 'text-red-600'}`}>
                                                                        {attended ? 'Attended' : 'Absent'}
                                                                    </span>
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
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
                                    <h2 className="text-lg font-bold text-gray-900">Training Details</h2>
                                    <p className="text-xs text-gray-500 mt-0.5">Complete information about this training session</p>
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
                            <div className="w-[40%] overflow-y-auto p-6 border-r border-gray-200">
                                {/* Title Section */}
                                <div className="mb-4">
                                    <h3 className="text-xl font-bold text-gray-900">{selectedTraining.title}</h3>
                                </div>

                                {/* Description Section */}
                                <div className="mb-6">
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{selectedTraining.description || 'No description provided'}</p>
                                </div>

                                {/* Basic Info */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-2">
                                        <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <p className="text-xs font-bold text-blue-900">{formatDate(selectedTraining.date)}</p>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-2">
                                        <div className="w-7 h-7 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <p className="text-xs font-bold text-purple-900">{formatTime(selectedTraining.time)}</p>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-2">
                                        <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        <p className="text-xs font-bold text-orange-900">{selectedTraining.venue || 'Not set'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Right Side - Attendees List */}
                            <div className="w-[60%] flex flex-col bg-gray-50">
                                <div className="p-4 border-b border-gray-200 bg-white">
                                    <h3 className="text-sm font-bold text-gray-900">
                                        Attendees ({selectedTraining.attendees?.length || 0})
                                    </h3>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        {selectedTraining.attendees?.map((attendee, idx) => {
                                            const name = typeof attendee === "string" ? attendee : attendee.name || "";
                                            const attendedFlag = !!selectedTraining.attendance?.[name];
                                            return (
                                                <div 
                                                    key={idx} 
                                                    className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-sm transition-all"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-xs font-semibold shadow-sm flex-shrink-0">
                                                            {name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-medium text-gray-900 truncate">{name}</p>
                                                            {!selectedTraining.is_active && (
                                                                <span
                                                                    className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full font-semibold mt-0.5 ${
                                                                        attendedFlag
                                                                            ? "bg-green-100 text-green-700"
                                                                            : "bg-red-100 text-red-700"
                                                                    }`}
                                                                >
                                                                    {attendedFlag ? "✓" : "✗"}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
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

            {/* Upload Training Modal */}
            {showUpload && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
                    <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-xl">
                        <div className="text-center font-semibold text-xl mb-6">Upload Past Training</div>
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newTraining.title}
                                    onChange={(e) => setNewTraining({...newTraining, title: e.target.value})}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    placeholder="Training title"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={newTraining.date}
                                    onChange={(e) => setNewTraining({...newTraining, date: e.target.value})}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Certification
                                </label>
                                <input
                                    type="file"
                                    onChange={(e) => setNewTraining({...newTraining, certification: e.target.files[0]})}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowUpload(false);
                                    setNewTraining({ title: "", date: "", certification: null });
                                }}
                                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUploadTraining}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
                            >
                                Upload Training
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default EmployeeTrainings;
