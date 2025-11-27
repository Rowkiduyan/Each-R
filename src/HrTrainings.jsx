import { Link } from 'react-router-dom';
import React, { useState } from "react";
import { NavLink } from "react-router-dom";



function HrTrainings() {
      const [showAdd, setShowAdd] = useState(false);
      const [form, setForm] = useState({
        title: "",
        venue: "",
        date: "",
        time: ""
      });
      const [upcoming, setUpcoming] = useState([
        { title: "Defensive Driving Training", venue: "Pasig Roadwise", date: "June 12, 2025", time: "10:00 AM" },
        { title: "Company Orientation", venue: "Pasig Roadwise", date: "June 15, 2025", time: "1:00 PM" }
      ]);
      const [showParticipants, setShowParticipants] = useState(false);
      const [selected, setSelected] = useState(null);
      const [showCompletedParticipants, setShowCompletedParticipants] = useState(false);
      const [completedEditMode, setCompletedEditMode] = useState(false);
      const [showEdit, setShowEdit] = useState(false);
      const [editIndex, setEditIndex] = useState(null);
      const [editForm, setEditForm] = useState({ title: "", venue: "", date: "", time: "" });
      const [attendeeInputEdit, setAttendeeInputEdit] = useState("");
      const [attendeesEdit, setAttendeesEdit] = useState([]);
      const sampleDescription = "Gmeet link: : https://meet.google.com/landing?pli=1\nMeet link code: a5Gh7t";
      const sampleAttendees = [
        "Dela cruz, Juan",
        "Villanueva, Mark",
        "Manalo, Jose",
        "Santos, Maria",
        "Panares, Franco",
        "Estilla, Paulo",
        "Santiago, Paul",
        "Cane, Jack"
      ];
      const [attendeeInput, setAttendeeInput] = useState("");
      const [attendees, setAttendees] = useState([]);
      const completed = [
        { title: "Excel & Advanced Spreadsheets", venue: "Google Meet (Online)", date: "June 3, 2025", time: "10:00 AM" },
        { title: "Health, Safety, and Emergency Protocols", venue: "Pasig Roadwise", date: "May 28, 2025", time: "10:00 AM" }
      ];

<<<<<<< Updated upstream
      const onChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
      };

      const onSubmit = (e) => {
        e.preventDefault();
        if (!form.title) return;
        if (!window.confirm("Add this schedule?")) return;
        setUpcoming((prev) => [
          ...prev,
          {
            title: form.title,
            venue: form.venue || "",
            date: form.date || "",
            time: form.time || ""
          }
        ]);
        setForm({ title: "", venue: "", date: "", time: "" });
        setAttendees([]);
        setAttendeeInput("");
        setShowAdd(false);
      };
      const onDelete = (index) => {
        if (!window.confirm("Delete this schedule?")) return;
        setUpcoming((prev) => prev.filter((_, i) => i !== index));
      };
      const onAttendeeKeyDown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const name = attendeeInput.trim();
          if (!name) return;
          setAttendees((prev) => [...prev, name]);
          setAttendeeInput("");
=======
      // Sort upcoming in ascending order by date (soonest first)
      upcomingTrainings.sort((a, b) => {
        const dateA = a.start_at ? new Date(a.start_at) : new Date(0);
        const dateB = b.start_at ? new Date(b.start_at) : new Date(0);
        return dateA - dateB;
      });

      // Sort completed in descending order by date (most recent first)
      completedTrainings.sort((a, b) => {
        const dateA = a.start_at ? new Date(a.start_at) : new Date(0);
        const dateB = b.start_at ? new Date(b.start_at) : new Date(0);
        return dateB - dateA;
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
    if (!form.venue) {
      alert("Venue is required.");
      return;
    }
    if (!form.description) {
      alert("Description is required.");
      return;
    }
    if (!attendees || attendees.length === 0) {
      alert("At least one attendee is required.");
      return;
    }

    const startAt = new Date(`${form.date}T${form.time}:00`);

    try {
      const { data, error } = await supabase
        .from('trainings')
        .insert([
          {
            title: form.title,
            venue: form.venue,
            start_at: startAt.toISOString(),
            description: form.description,
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
    if (!editForm.venue) {
      alert("Venue is required.");
      return;
    }
    if (!editForm.description) {
      alert("Description is required.");
      return;
    }
    if (!attendeesEdit || attendeesEdit.length === 0) {
      alert("At least one attendee is required.");
      return;
    }

    const startAt = new Date(`${editForm.date}T${editForm.time}:00`);

    try {
      const { data, error } = await supabase
        .from('trainings')
        .update({
          title: editForm.title,
          venue: editForm.venue,
          start_at: startAt.toISOString(),
          description: editForm.description,
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
>>>>>>> Stashed changes
        }
      };
      const removeAttendee = (idx) => {
        setAttendees((prev) => prev.filter((_, i) => i !== idx));
      };
      const onAttendeeKeyDownEdit = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const name = attendeeInputEdit.trim();
          if (!name) return;
          setAttendeesEdit((prev) => [...prev, name]);
          setAttendeeInputEdit("");
        }
      };
      const removeAttendeeEdit = (idx) => {
        setAttendeesEdit((prev) => prev.filter((_, i) => i !== idx));
      };

<<<<<<< Updated upstream
      const openEditFromParticipants = () => {
        if (!selected) return;
        const index = upcoming.findIndex((u) =>
          u.title === selected.title && u.venue === selected.venue && u.date === selected.date && u.time === selected.time
        );
        setEditIndex(index);
        setEditForm({ title: selected.title, venue: selected.venue, date: selected.date, time: selected.time });
        setAttendeesEdit(sampleAttendees);
        setAttendeeInputEdit("");
        setShowParticipants(false);
        setShowEdit(true);
      };

      const onEditChange = (e) => {
        const { name, value } = e.target;
        setEditForm((prev) => ({ ...prev, [name]: value }));
      };

      const onSaveChanges = (e) => {
        e.preventDefault();
        if (!window.confirm("Save changes?")) return;
        setUpcoming((prev) => prev.map((item, i) => i === editIndex ? { ...item, ...editForm } : item));
        setShowEdit(false);
        setSelected(null);
      };
    return (
    <>
  

    <div className="max-w-7xl mx-auto px-4">
      <div className="bg-white border border-red-200 rounded-lg p-4 shadow">
        <div className="text-orange-400 text-xs font-semibold mb-3">Upcoming</div>
        <div className="overflow-x-auto overflow-y-auto h-47">
          <table className="min-w-full border text-sm table-fixed">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-center p-2 border w-2/5">Title</th>
                <th className="text-center p-2 border">Venue</th>
                <th className="text-center p-2 border">Date</th>
                <th className="text-center p-2 border">Time</th>
                <th className="text-center p-2 border">Action</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="p-2 border text-center">{row.title}</td>
                  <td className="p-2 border text-center">{row.venue}</td>
                  <td className="p-2 border text-center">{row.date}</td>
                  <td className="p-2 border text-center">{row.time}</td>
                  <td className="p-2 border text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => { setSelected(row); setShowParticipants(true); }} className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded">Participants</button>
                      <button onClick={() => onDelete(idx)} className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
=======
      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-0">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Trainings & Orientation</h1>
          <p className="text-gray-500 mt-1">Manage training schedules and track employee participation</p>
>>>>>>> Stashed changes
        </div>

        <div className="text-green-600 text-xs font-semibold my-3">Completed</div>
        <div className="overflow-x-auto overflow-y-auto h-47">
          <table className="min-w-full border text-sm table-fixed ">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-center p-2 border w-2/5">Title</th>
                <th className="text-center p-2 border">Venue</th>
                <th className="text-center p-2 border">Date</th>
                <th className="text-center p-2 border">Time</th>
                <th className="text-center p-2 border">Action</th>
              </tr>
            </thead>
            <tbody>
              {completed.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="p-2 border text-center">{row.title}</td>
                  <td className="p-2 border text-center">{row.venue}</td>
                  <td className="p-2 border text-center">{row.date}</td>
                  <td className="p-2 border text-center">{row.time}</td>
                  <td className="p-2 border text-center">
                    <button onClick={() => { setSelected(row); setShowCompletedParticipants(true); setCompletedEditMode(false); }} className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded">Participants</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <button onClick={() => setShowAdd(true)} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded">+ Add</button>
        </div>
      </div>
    </div>

    {showAdd && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
        <div className="bg-white rounded-md w-full max-w-xl p-5 shadow-lg">
          <div className="text-center font-semibold text-lg mb-4">Add Training/Seminar Schedule</div>
          <form onSubmit={onSubmit}>
            <div className="grid grid-cols-1 gap-3">
              <label className="text-sm">Title:
                <input name="title" value={form.title} onChange={onChange} className="mt-1 w-full border rounded px-2 py-1" placeholder="Personal Development" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">Date:
                  <input name="date" value={form.date} onChange={onChange} type="text" className="mt-1 w-full border rounded px-2 py-1" placeholder="06-05-25" />
                </label>
                <label className="text-sm">Time:
                  <input name="time" value={form.time} onChange={onChange} type="text" className="mt-1 w-full border rounded px-2 py-1" placeholder="10:00 AM" />
                </label>
              </div>
<<<<<<< Updated upstream
              <label className="text-sm">Venue:
                <input name="venue" value={form.venue} onChange={onChange} className="mt-1 w-full border rounded px-2 py-1" placeholder="Google Meet (Online)" />
              </label>
              <label className="text-sm">Description:
                <textarea className="mt-1 w-full border rounded px-2 py-1" rows="3" placeholder="Gmeet link: https://..." />
              </label>
              <label className="text-sm">Attendees:
                <input
                  value={attendeeInput}
                  onChange={(e) => setAttendeeInput(e.target.value)}
                  onKeyDown={onAttendeeKeyDown}
                  className="mt-1 w-full border rounded px-2 py-1"
                  placeholder="Type a name and press enter"
                />
                <div className="mt-2 border rounded h-28 overflow-y-auto">
                  {attendees.map((name, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-1 text-gray-700 border-b last:border-b-0 bg-gray-50">
                      <span className="truncate">{name}</span>
                      <button type="button" onClick={() => removeAttendee(i)} className="text-red-600 text-sm px-2">×</button>
                    </div>
                  ))}
                </div>
              </label>
=======
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
>>>>>>> Stashed changes
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 rounded bg-gray-500 text-white">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded bg-red-600 text-white">Add</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {showCompletedParticipants && selected && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
        <div className="bg-white rounded-md w-full max-w-xl p-5 shadow-lg">
          <div className="text-center font-semibold text-lg mb-4">Participants</div>
          <div className="text-sm space-y-2">
            <div className="flex gap-2"><span className="font-semibold">Title:</span><span>{selected.title}</span></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex gap-2"><span className="font-semibold">Date:</span><span>{selected.date}</span></div>
              <div className="flex gap-2"><span className="font-semibold">Time:</span><span>{selected.time}</span></div>
            </div>
            <div className="font-semibold">Attendees:</div>
            <div className="text-gray-500 italic text-xs -mt-1">Check the box next to a participant's name if they attended the event.</div>
            <div className="mt-1 border rounded h-40 overflow-y-auto">
              {sampleAttendees.map((name, i) => (
                <label key={i} className="flex items-center justify-between px-3 py-2 border-b last:border-b-0">
                  <span className="truncate text-gray-700">{name}</span>
                  <input type="checkbox" className="h-4 w-4" disabled={!completedEditMode} />
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-5">
            <button onClick={() => setShowCompletedParticipants(false)} className="px-4 py-2 rounded bg-gray-500 text-white">Cancel</button>
            <button onClick={() => setCompletedEditMode((prev) => !prev)} className="px-4 py-2 rounded bg-red-600 text-white">{completedEditMode ? "Save" : "Edit"}</button>
          </div>
        </div>
      </div>
    )}

    {showParticipants && selected && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
<<<<<<< Updated upstream
        <div className="bg-white rounded-md w-full max-w-xl p-5 shadow-lg">
          <div className="text-center font-semibold text-lg mb-4">Training/Seminar Schedule</div>
          <div className="text-sm space-y-2">
            <div className="flex gap-2"><span className="font-semibold">Title:</span><span>{selected.title}</span></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex gap-2"><span className="font-semibold">Date:</span><span>{selected.date}</span></div>
              <div className="flex gap-2"><span className="font-semibold">Time:</span><span>{selected.time}</span></div>
            </div>
            <div className="flex gap-2"><span className="font-semibold">Venue:</span><span>{selected.venue}</span></div>
            <div>
              <div className="font-semibold">Description:</div>
              <div className="whitespace-pre-line text-gray-700">{sampleDescription}</div>
            </div>
            <div>
              <div className="font-semibold">Attendees:</div>
              <div className="mt-1 border rounded h-32 overflow-y-auto p-2 text-gray-700 space-y-1">
                {sampleAttendees.map((name, i) => (
                  <div key={i} className="border-b last:border-b-0 px-2 py-1">{name}</div>
                ))}
=======
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
                    Date: *
                    <input
                      name="date"
                      value={form.date}
                      onChange={onChange}
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      required
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </label>
                  <label className="text-sm font-medium text-gray-700">
                    Time: *
                    <input
                      name="time"
                      value={form.time}
                      onChange={onChange}
                      type="time"
                      required
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </label>
                </div>
                <label className="text-sm font-medium text-gray-700">
                  Venue: *
                  <input
                    name="venue"
                    value={form.venue}
                    onChange={onChange}
                    required
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Google Meet (Online)"
                  />
              </label>
                <label className="text-sm font-medium text-gray-700">
                  Description: *
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={onChange}
                    rows="3"
                    required
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Gmeet link: https://..."
                  />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Attendees: *
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
>>>>>>> Stashed changes
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-5">
            <button onClick={() => setShowParticipants(false)} className="px-4 py-2 rounded bg-gray-500 text-white">Back</button>
            <button onClick={openEditFromParticipants} className="px-4 py-2 rounded bg-red-600 text-white">Edit</button>
          </div>
        </div>
      </div>
    )}

    {showEdit && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
        <div className="bg-white rounded-md w-full max-w-xl p-5 shadow-lg">
          <div className="text-center font-semibold text-lg mb-4">Add Training/Seminar Schedule</div>
          <form onSubmit={onSaveChanges}>
            <div className="grid grid-cols-1 gap-3">
              <label className="text-sm">Title:
                <input name="title" value={editForm.title} onChange={onEditChange} className="mt-1 w-full border rounded px-2 py-1" placeholder="Personal Development" />
              </label>
<<<<<<< Updated upstream
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">Date:
                  <input name="date" value={editForm.date} onChange={onEditChange} type="text" className="mt-1 w-full border rounded px-2 py-1" placeholder="06-05-25" />
                </label>
                <label className="text-sm">Time:
                  <input name="time" value={editForm.time} onChange={onEditChange} type="text" className="mt-1 w-full border rounded px-2 py-1" placeholder="10:00 AM" />
                </label>
              </div>
              <label className="text-sm">Venue:
                <input name="venue" value={editForm.venue} onChange={onEditChange} className="mt-1 w-full border rounded px-2 py-1" placeholder="Google Meet (Online)" />
              </label>
              <label className="text-sm">Description:
                <textarea className="mt-1 w-full border rounded px-2 py-1" rows="3" placeholder="Gmeet link: https://..." defaultValue={sampleDescription} />
              </label>
              <label className="text-sm">Attendees:
                <input
                  value={attendeeInputEdit}
                  onChange={(e) => setAttendeeInputEdit(e.target.value)}
                  onKeyDown={onAttendeeKeyDownEdit}
                  className="mt-1 w-full border rounded px-2 py-1"
                  placeholder="Type a name and press enter"
                />
                <div className="mt-2 border rounded h-28 overflow-y-auto">
                  {attendeesEdit.map((name, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-1 text-gray-700 border-b last:border-b-0 bg-gray-50">
                      <span className="truncate">{name}</span>
                      <button type="button" onClick={() => removeAttendeeEdit(i)} className="text-red-600 text-sm px-2">×</button>
                    </div>
                  ))}
=======
                <div className="grid grid-cols-2 gap-4">
                  <label className="text-sm font-medium text-gray-700">
                    Date: *
                    <input
                      name="date"
                      value={editForm.date}
                      onChange={onEditChange}
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      required
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
              </label>
                  <label className="text-sm font-medium text-gray-700">
                    Time: *
                <input
                      name="time"
                      value={editForm.time}
                      onChange={onEditChange}
                      type="time"
                      required
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </label>
                </div>
                <label className="text-sm font-medium text-gray-700">
                  Venue: *
                  <input
                    name="venue"
                    value={editForm.venue}
                    onChange={onEditChange}
                    required
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Google Meet (Online)"
                  />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Description: *
                  <textarea
                    name="description"
                    value={editForm.description}
                    onChange={onEditChange}
                    rows="3"
                    required
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Gmeet link: https://..."
                  />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Attendees: *
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
>>>>>>> Stashed changes
                </div>
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button type="button" onClick={() => setShowEdit(false)} className="px-4 py-2 rounded bg-gray-500 text-white">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded bg-red-600 text-white">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    )}
         



</>);
} 
export default HrTrainings;