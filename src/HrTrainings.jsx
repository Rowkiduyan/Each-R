import { Link } from 'react-router-dom';
import React, { useState, useEffect, useRef } from "react";
import { supabase } from './supabaseClient';

function HrTrainings() {
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  
  const [form, setForm] = useState({
    title: "",
    venue: "",
    date: "",
    time: "",
    description: ""
  });
  
  const [editForm, setEditForm] = useState({
    title: "",
    venue: "",
    date: "",
    time: "",
    description: ""
  });
  
  const [attendees, setAttendees] = useState([]);
  const [attendeesEdit, setAttendeesEdit] = useState([]);
  const [attendance, setAttendance] = useState({});
  
  // Employee / attendee search state
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [employeeSearchQueryEdit, setEmployeeSearchQueryEdit] = useState("");
  const [showEmployeeSuggestions, setShowEmployeeSuggestions] = useState(false);
  const [showEmployeeSuggestionsEdit, setShowEmployeeSuggestionsEdit] = useState(false);
  const [employeeOptions, setEmployeeOptions] = useState([]);

  // Tab & search state for main table
  const [activeTab, setActiveTab] = useState("upcoming");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch trainings from Supabase
  useEffect(() => {
    fetchTrainings();
  }, []);

  // Get current logged-in user (for created_by)
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!error && data?.user) {
          setCurrentUserId(data.user.id);
        }
      } catch (err) {
        console.error("Error fetching current user for trainings:", err);
      }
    };

    loadUser();
  }, []);

  // Load employees for attendee suggestions (from employees table)
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("id, fname, lname, mname");

        if (error) {
          console.error("Error loading employees for training attendees:", error);
          return;
        }

        const options =
          data?.map((emp) => {
            const lastFirst = [emp.lname, emp.fname].filter(Boolean).join(", ");
            const full = [lastFirst, emp.mname].filter(Boolean).join(" ");
            return full || "Unnamed employee";
          }) || [];

        const uniqueSorted = Array.from(new Set(options)).sort((a, b) =>
          a.localeCompare(b)
        );
        setEmployeeOptions(uniqueSorted);
      } catch (err) {
        console.error("Unexpected error loading employees for trainings:", err);
      }
    };

    fetchEmployees();
  }, []);


  const fetchTrainings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trainings')
        .select('*')
        .order('start_at', { ascending: true });

      if (error) {
        console.error('Error fetching trainings:', error);
        return;
      }

      // Normalize and separate upcoming and completed trainings
      const upcomingTrainings = [];
      const completedTrainings = [];

      (data || []).forEach((training) => {
        const start = training.start_at ? new Date(training.start_at) : null;
        const normalized = {
          ...training,
          date: start ? start.toISOString().slice(0, 10) : "",
          time: start ? start.toISOString().slice(11, 16) : "",
        };

        if (training.is_active === false) {
          completedTrainings.push(normalized);
        } else {
          upcomingTrainings.push(normalized);
        }
      });

      setUpcoming(upcomingTrainings);
      setCompleted(completedTrainings);
    } catch (error) {
      console.error('Error fetching trainings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter employees based on search query (from employees table)
  const filteredEmployees = employeeSearchQuery
    ? employeeOptions.filter(emp =>
        emp.toLowerCase().includes(employeeSearchQuery.toLowerCase())
      )
    : [];
  
  const filteredEmployeesEdit = employeeSearchQueryEdit
    ? employeeOptions.filter(emp =>
        emp.toLowerCase().includes(employeeSearchQueryEdit.toLowerCase())
      )
    : [];

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEmployeeSelect = (employeeName) => {
    if (!attendees.includes(employeeName)) {
      setAttendees((prev) => [...prev, employeeName]);
    }
    setEmployeeSearchQuery("");
    setShowEmployeeSuggestions(false);
  };

  const handleEmployeeSelectEdit = (employeeName) => {
    if (!attendeesEdit.includes(employeeName)) {
      setAttendeesEdit((prev) => [...prev, employeeName]);
    }
    setEmployeeSearchQueryEdit("");
    setShowEmployeeSuggestionsEdit(false);
  };

  const removeAttendee = (idx) => {
    setAttendees((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeAttendeeEdit = (idx) => {
    setAttendeesEdit((prev) => prev.filter((_, i) => i !== idx));
  };

  const onAttendeeKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const name = employeeSearchQuery.trim();
      if (!name) return;
      if (attendees.includes(name)) return;
      handleEmployeeSelect(name);
    }
  };

  const onAttendeeKeyDownEdit = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const name = employeeSearchQueryEdit.trim();
      if (!name) return;
      if (attendeesEdit.includes(name)) return;
      handleEmployeeSelectEdit(name);
    }
  };

  // Create new training
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.title) {
      alert("Title is required.");
      return;
    }
    if (!form.date || !form.time) {
      alert("Please provide both date and time.");
      return;
    }

    const startAt = new Date(`${form.date}T${form.time}:00`);

    try {
      const { data, error } = await supabase
        .from('trainings')
        .insert([
          {
            title: form.title,
            venue: form.venue || null,
            start_at: startAt.toISOString(),
            description: form.description || null,
            // store attendees as plain names only
            attendees: attendees || [],
            is_active: true,
            created_by: currentUserId || null,
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating training:', error);
        alert(`Failed to create training schedule: ${error.message || 'Unknown error'}`);
        return;
      }

      // Reset form
      setForm({ title: "", venue: "", date: "", time: "", description: "" });
      setAttendees([]);
      setEmployeeSearchQuery("");
      setShowAdd(false);
      
      // Refresh list
      fetchTrainings();
    } catch (error) {
      console.error('Error creating training:', error);
      alert(`Failed to create training schedule: ${error.message || 'Unknown error'}`);
    }
  };

  // Update training
  const onSaveChanges = async (e) => {
    e.preventDefault();
    if (!selectedTraining) return;
    if (!editForm.title) {
      alert("Title is required.");
      return;
    }
    if (!editForm.date || !editForm.time) {
      alert("Please provide both date and time.");
      return;
    }

    const startAt = new Date(`${editForm.date}T${editForm.time}:00`);

    try {
      const { data, error } = await supabase
        .from('trainings')
        .update({
          title: editForm.title,
          venue: editForm.venue || null,
          start_at: startAt.toISOString(),
          description: editForm.description || null,
          // keep attendees as plain names only
          attendees: attendeesEdit || [],
        })
        .eq('id', selectedTraining.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating training:', error);
        alert(`Failed to update training schedule: ${error.message || 'Unknown error'}`);
        return;
      }

      setShowEdit(false);
      setSelectedTraining(null);
      setActionMenuOpen(null);
      
      // Refresh list
      fetchTrainings();
    } catch (error) {
      console.error('Error updating training:', error);
      alert(`Failed to update training schedule: ${error.message || 'Unknown error'}`);
    }
  };

  // Delete training
  const onDelete = async (trainingId) => {
    if (!window.confirm("Are you sure you want to delete this training schedule?")) return;

    try {
      const { error } = await supabase
        .from('trainings')
        .delete()
        .eq('id', trainingId);

      if (error) {
        console.error('Error deleting training:', error);
        alert('Failed to delete training schedule');
        return;
      }

      setActionMenuOpen(null);
      fetchTrainings();
    } catch (error) {
      console.error('Error deleting training:', error);
      alert('Failed to delete training schedule');
    }
  };

  // Open edit modal
  const openEdit = (training) => {
    setSelectedTraining(training);
    setEditForm({
      title: training.title || "",
      venue: training.venue || "",
      date: training.date || "",
      time: training.time || "",
      description: training.description || ""
    });
    setAttendeesEdit(
      (training.attendees || []).map((a) =>
        typeof a === "string" ? a : a.name || ""
      )
    );
    setActionMenuOpen(null);
    setShowEdit(true);
  };

  // Open attendance modal
  const openAttendance = (training) => {
    setSelectedTraining(training);
    const initialAttendance = {};
    (training.attendees || []).forEach((att) => {
      const name = typeof att === "string" ? att : att.name || "";
      if (!name) return;
      const existing = training.attendance || {};
      initialAttendance[name] = !!existing[name];
    });
    setAttendance(initialAttendance);
    setActionMenuOpen(null);
    setShowAttendance(true);
  };

  // Save attendance and mark as completed
  const saveAttendance = async () => {
    if (!selectedTraining) return;

    try {
      const { error } = await supabase
        .from('trainings')
        .update({
          attendance: attendance,
          is_active: false
        })
        .eq('id', selectedTraining.id);

      if (error) {
        console.error('Error saving attendance:', error);
        alert('Failed to save attendance');
        return;
      }

      setShowAttendance(false);
      setSelectedTraining(null);
      fetchTrainings();
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Failed to save attendance');
    }
  };

  // View training details
  const viewDetails = (training) => {
    setSelectedTraining(training);
    setShowDetails(true);
  };

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

  // Stats
  const stats = {
    upcoming: upcoming.length,
    completed: completed.length,
    totalAttendees: upcoming.reduce((sum, t) => sum + (t.attendees?.length || 0), 0)
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

  const filteredCompleted = completed.filter((t) => {
    if (!searchQuery) return true;
    return normalizeForSearch(t).includes(searchQuery.toLowerCase());
  });

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
          <p className="text-gray-500 mt-1">Manage training schedules and track employee participation</p>
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

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Attendees</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalAttendees}</p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-orange-600 mt-3 font-medium">Employees scheduled</p>
          </div>
        </div>

        {/* Main Content Card with Tabs (Upcoming / History) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-">
          {/* Tabs - styled like AgencyTrainings */}
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
                onClick={() => setActiveTab('history')}
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
                  History
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">{completed.length}</span>
                </div>
              </button>
            </div>
          </div>

          {/* Search + Add button bar */}
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
              onClick={() => setShowAdd(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm font-medium self-start sm:self-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Schedule
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
                <p className="font-medium">No upcoming </p>
                <p className="text-sm mt-1">Adjust your search or add a new schedule.</p>
              </div>
            ) : (
              <div className="relative divide-y divide-gray-100 h-[500px] overflow-y-auto no-scrollbar">
                {filteredUpcoming.map((training) => (
                  <div
                    key={training.id}
                    className="px-6 py-4 hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => viewDetails(training)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-gray-800">{training.title}</h3>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <span>{formatDate(training.date)}</span>
                            <span>•</span>
                            <span>{training.time || 'Time not set'}</span>
                            <span>•</span>
                            <span>{training.venue || 'Venue not set'}</span>
                            <span>•</span>
                            <span>{training.attendees?.length || 0} attendees</span>
                          </div>
                        </div>
                      </div>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuOpen(actionMenuOpen === training.id ? null : training.id);
                          }}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                        {actionMenuOpen === training.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(training);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openAttendance(training);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Mark Attendance
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(training.id);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4h8M8 20h8M12 8v8m0 0l-3-3m3 3l3-3" />
                  </svg>
                </div>
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
            <div className="relative divide-y divide-gray-100 h-[500px] overflow-y-auto no-scrollbar">
              {filteredCompleted.map((training) => (
                <div
                  key={training.id}
                  className="px-6 py-4 hover:bg-gray-50/50 transition-colors cursor-pointer"
                  onClick={() => viewDetails(training)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-gray-800">{training.title}</h3>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span>{formatDate(training.date)}</span>
                          <span>•</span>
                          <span>{training.time || 'Time not set'}</span>
                          <span>•</span>
                          <span>{training.venue || 'Venue not set'}</span>
                          {training.attendance && (
                            <>
                              <span>•</span>
                              <span className="text-green-600">
                                {Object.values(training.attendance || {}).filter(Boolean).length} present
                              </span>
                              <span>•</span>
                              <span className="text-red-600">
                                {Object.values(training.attendance || {}).filter((v) => v === false).length} absent
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionMenuOpen(actionMenuOpen === training.id ? null : training.id);
                        }}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                      {actionMenuOpen === training.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openAttendance(training);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Mark Attendance
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(training.id);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4h8M8 20h8M12 8v8m0 0l-3-3m3 3l3-3" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Training Details Modal */}
      {showDetails && selectedTraining && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50" onClick={() => setShowDetails(false)}>
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Training Details</h2>
              <button onClick={() => setShowDetails(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Title</label>
                <p className="text-base text-gray-800 mt-1">{selectedTraining.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Date</label>
                  <p className="text-base text-gray-800 mt-1">{formatDate(selectedTraining.date)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Time</label>
                  <p className="text-base text-gray-800 mt-1">{selectedTraining.time || 'Not set'}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Venue</label>
                <p className="text-base text-gray-800 mt-1">{selectedTraining.venue || 'Not set'}</p>
              </div>
            <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="text-base text-gray-800 mt-1 whitespace-pre-line">{selectedTraining.description || 'No description'}</p>
            </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Attendees ({selectedTraining.attendees?.length || 0})
                </label>
                <div className="mt-2 space-y-2">
                  {selectedTraining.attendees?.map((attendee, idx) => {
                    const name = typeof attendee === "string" ? attendee : attendee.name || "";
                    const attendedFlag = !!selectedTraining.attendance?.[name];
                    return (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <div
                          className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(
                            name
                          )} flex items-center justify-center text-white text-xs font-medium`}
                        >
                          {getInitials(name)}
                        </div>
                        <span className="text-sm text-gray-700 flex-1">{name}</span>
                        {!selectedTraining.is_active && (
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              attendedFlag
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {attendedFlag ? "Present" : "Absent"}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
          </div>
        </div>
      </div>
    )}

      {/* Add Training Modal */}
      {showAdd && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="text-center font-semibold text-xl mb-6">Add Training/Seminar Schedule</div>
            <form onSubmit={onSubmit}>
              <div className="grid grid-cols-1 gap-4">
                <label className="text-sm font-medium text-gray-700">
                  Title: *
                  <input
                    name="title"
                    value={form.title}
                    onChange={onChange}
                    required
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Personal Development"
                  />
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="text-sm font-medium text-gray-700">
                    Date:
                    <input
                      name="date"
                      value={form.date}
                      onChange={onChange}
                      type="date"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </label>
                  <label className="text-sm font-medium text-gray-700">
                    Time:
                    <input
                      name="time"
                      value={form.time}
                      onChange={onChange}
                      type="time"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </label>
                </div>
                <label className="text-sm font-medium text-gray-700">
                  Venue:
                  <input
                    name="venue"
                    value={form.venue}
                    onChange={onChange}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Google Meet (Online)"
                  />
              </label>
                <label className="text-sm font-medium text-gray-700">
                  Description:
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={onChange}
                    rows="3"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Gmeet link: https://..."
                  />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Attendees:
                  <div className="mt-1 relative">
                    <input
                      type="text"
                      value={employeeSearchQuery}
                      onChange={(e) => {
                        setEmployeeSearchQuery(e.target.value);
                        setShowEmployeeSuggestions(e.target.value.length > 0);
                      }}
                      onKeyDown={onAttendeeKeyDown}
                      onFocus={() => {
                        if (employeeSearchQuery) setShowEmployeeSuggestions(true);
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Search employee name..."
                    />
                    {showEmployeeSuggestions && filteredEmployees.length > 0 && (
                      <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredEmployees.map((emp, i) => {
                          const alreadyAdded = attendees.includes(emp);
                          return (
                            <li
                              key={i}
                              className={`px-3 py-2 text-sm border-b last:border-b-0 ${
                                alreadyAdded
                                  ? 'text-gray-400 bg-gray-50 cursor-not-allowed'
                                  : 'text-gray-700 hover:bg-gray-100 cursor-pointer'
                              }`}
                              onMouseDown={(e) => {
                                if (alreadyAdded) return;
                                e.preventDefault();
                                handleEmployeeSelect(emp);
                              }}
                            >
                              {emp}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  <div className="mt-2 border border-gray-300 rounded-lg h-32 overflow-y-auto p-2 bg-gray-50">
                    {attendees.length > 0 ? (
                      attendees.map((name, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 mb-1 bg-white rounded border border-gray-200">
                          <span className="text-sm text-gray-700 truncate">{name}</span>
                          <button
                            type="button"
                            onClick={() => removeAttendee(i)}
                            className="text-red-600 hover:text-red-700 text-lg font-bold ml-2"
                          >
                            ×
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-4">No attendees added yet</p>
                    )}
                  </div>
                </label>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdd(false);
                    setEmployeeSearchQuery("");
                    setShowEmployeeSuggestions(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
                >
                  Add Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Training Modal */}
      {showEdit && selectedTraining && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="text-center font-semibold text-xl mb-6">Edit Training/Seminar Schedule</div>
            <form onSubmit={onSaveChanges}>
              <div className="grid grid-cols-1 gap-4">
                <label className="text-sm font-medium text-gray-700">
                  Title: *
                  <input
                    name="title"
                    value={editForm.title}
                    onChange={onEditChange}
                    required
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Personal Development"
                  />
              </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="text-sm font-medium text-gray-700">
                    Date:
                    <input
                      name="date"
                      value={editForm.date}
                      onChange={onEditChange}
                      type="date"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
              </label>
                  <label className="text-sm font-medium text-gray-700">
                    Time:
                <input
                      name="time"
                      value={editForm.time}
                      onChange={onEditChange}
                      type="time"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </label>
                </div>
                <label className="text-sm font-medium text-gray-700">
                  Venue:
                  <input
                    name="venue"
                    value={editForm.venue}
                    onChange={onEditChange}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Google Meet (Online)"
                  />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Description:
                  <textarea
                    name="description"
                    value={editForm.description}
                    onChange={onEditChange}
                    rows="3"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Gmeet link: https://..."
                  />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Attendees:
                  <div className="mt-1 relative">
                    <input
                      type="text"
                      value={employeeSearchQueryEdit}
                      onChange={(e) => {
                        setEmployeeSearchQueryEdit(e.target.value);
                        setShowEmployeeSuggestionsEdit(e.target.value.length > 0);
                      }}
                      onKeyDown={onAttendeeKeyDownEdit}
                      onFocus={() => {
                        if (employeeSearchQueryEdit) setShowEmployeeSuggestionsEdit(true);
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Search employee name..."
                    />
                    {showEmployeeSuggestionsEdit && filteredEmployeesEdit.length > 0 && (
                      <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredEmployeesEdit.map((emp, i) => {
                          const alreadyAdded = attendeesEdit.includes(emp);
                          return (
                            <li
                              key={i}
                              className={`px-3 py-2 text-sm border-b last:border-b-0 ${
                                alreadyAdded
                                  ? 'text-gray-400 bg-gray-50 cursor-not-allowed'
                                  : 'text-gray-700 hover:bg-gray-100 cursor-pointer'
                              }`}
                              onMouseDown={(e) => {
                                if (alreadyAdded) return;
                                e.preventDefault();
                                handleEmployeeSelectEdit(emp);
                              }}
                            >
                              {emp}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  <div className="mt-2 border border-gray-300 rounded-lg h-32 overflow-y-auto p-2 bg-gray-50">
                    {attendeesEdit.length > 0 ? (
                      attendeesEdit.map((name, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 mb-1 bg-white rounded border border-gray-200">
                          <span className="text-sm text-gray-700 truncate">{name}</span>
                          <button
                            type="button"
                            onClick={() => removeAttendeeEdit(i)}
                            className="text-red-600 hover:text-red-700 text-lg font-bold ml-2"
                          >
                            ×
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-4">No attendees added yet</p>
                    )}
                </div>
              </label>
            </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEdit(false);
                    setEmployeeSearchQueryEdit("");
                    setShowEmployeeSuggestionsEdit(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
                >
                  Save Changes
                </button>
            </div>
          </form>
        </div>
      </div>
    )}
         
      {/* Mark Attendance Modal */}
      {showAttendance && selectedTraining && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="text-center font-semibold text-xl mb-6">Mark Attendance</div>
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Training:</strong> {selectedTraining.title}
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Check the box next to each attendee who attended the training session.
              </p>
            </div>
            <div className="space-y-2 mb-6">
              {(selectedTraining.attendees || []).map((attendee, idx) => (
                <label
                  key={idx}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(attendee)} flex items-center justify-center text-white text-sm font-medium`}>
                      {getInitials(attendee)}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{attendee}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={attendance[attendee] || false}
                    onChange={(e) => {
                      setAttendance(prev => ({
                        ...prev,
                        [attendee]: e.target.checked
                      }));
                    }}
                    className="h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAttendance(false);
                  setSelectedTraining(null);
                  setAttendance({});
                }}
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={saveAttendance}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
              >
                Save Attendance & Mark Complete
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
    
  );
}

export default HrTrainings;