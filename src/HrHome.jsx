import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

function HrHome() {
  const [hrUser, setHrUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAllDepots, setShowAllDepots] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    depot: '',
    description: '',
    responsibilities: [],
    urgent: false
  });
  const [saving, setSaving] = useState(false);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deletingJob, setDeletingJob] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // Interview schedule states
  const [date, setDate] = useState(new Date());
  const [interviews, setInterviews] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState('today'); // 'today', 'tomorrow', 'week'
  const [newInterview, setNewInterview] = useState({
    applicant_name: '',
    position: '',
    time: '',
    date: '',
    status: 'scheduled'
  });
  
  const navigate = useNavigate();
  const location = useLocation();

//   useEffect(() => {
//   (async () => {
//     const { data, error } = await supabase.auth.getUser();
//     console.log("Supabase User:", data?.user);
//     console.log("app_metadata.role:", data?.user?.app_metadata?.role);
//     console.log("user_metadata.role:", data?.user?.user_metadata?.role);
//   })();
// }, []);




  useEffect(() => {
    try {
      // debug: show where we came from
      console.log("HrHome mounted. location:", location?.pathname, location?.state);

      const stored = localStorage.getItem("loggedInHR");
      console.log("localStorage.loggedInHR raw:", stored);

      if (stored) {
        // parse safely
        try {
          const parsed = JSON.parse(stored);
          console.log("parsed loggedInHR:", parsed);
          setHrUser(parsed);
        } catch (parseErr) {
          console.error("Failed to parse loggedInHR from localStorage:", parseErr);
          // clear corrupted storage to avoid loops
          localStorage.removeItem("loggedInHR");
        }
      } else {
        console.warn("No loggedInHR found in localStorage. Redirecting to login.");
        // small timeout to allow console messages to be readable
        setTimeout(() => navigate("/employee/login"), 200);
      }
    } catch (err) {
      console.error("Unexpected error in HrHome useEffect:", err);
    } finally {
      setLoading(false);
    }
  }, [navigate, location]);

  // Fetch interviews on mount
  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      // First get applications with interview dates
      const { data: applicationsData, error: appsError } = await supabase
        .from('applications')
        .select('id, user_id, payload, interview_date, interview_time, status')
        .not('interview_date', 'is', null)
        .order('interview_date', { ascending: true });
      
      if (appsError) {
        console.error('Error fetching applications:', appsError);
        setInterviews([]);
        return;
      }

      if (!applicationsData || applicationsData.length === 0) {
        console.log('No applications with interview_date found');
        setInterviews([]);
        return;
      }

      console.log('Applications data:', applicationsData);

      // Get all unique applicant IDs
      const applicantIds = [...new Set(applicationsData.map(app => app.user_id).filter(Boolean))];

      if (applicantIds.length === 0) {
        console.log('No valid user_ids found');
        setInterviews([]);
        return;
      }

      // Fetch applicant names
      const { data: applicantsData, error: applicantsError } = await supabase
        .from('applicants')
        .select('id, fname, lname')
        .in('id', applicantIds);

      if (applicantsError) {
        console.error('Error fetching applicants:', applicantsError);
      }

      console.log('Applicants data:', applicantsData);

      // Create a map of applicant IDs to names
      const applicantMap = {};
      if (applicantsData) {
        applicantsData.forEach(applicant => {
          applicantMap[applicant.id] = `${applicant.fname} ${applicant.lname}`;
        });
      }

      // Transform the data to match our component's expected format
      const transformedData = applicationsData.map(app => {
        console.log('Processing app:', app.id, 'payload:', app.payload);
        // Randomly assign interview type for demo purposes (you can replace this with actual data from payload)
        const interviewType = Math.random() > 0.5 ? 'online' : 'onsite';
        return {
          id: app.id,
          applicant_name: applicantMap[app.user_id] || 'Unknown Applicant',
          position: app.payload?.job?.title || app.payload?.title || app.payload?.job_title || 'N/A',
          date: app.interview_date,
          time: app.interview_time || 'Not set',
          status: app.status || 'scheduled',
          interview_type: app.payload?.interview_type || interviewType
        };
      });
      
      console.log('Transformed interviews:', transformedData);
      setInterviews(transformedData);
    } catch (error) {
      console.error('Error fetching interviews:', error);
      setInterviews([]);
    }
  };

  // 🔍 Check the actual logged-in user role directly from Supabase
useEffect(() => {
  (async () => {
    try {
      // 🔹 Run who_am_i() from the backend to see what your JWT actually contains
      const { data, error } = await supabase.rpc("who_am_i");

      if (error) {
        console.error("who_am_i() failed:", error.message);
        return;
      }

      console.log("🔍 who_am_i() result:", data);
    } catch (e) {
      console.error("Unexpected error running who_am_i():", e);
    }
  })();
}, []);

useEffect(() => {
  (async () => {
    const { data, error } = await supabase.rpc("who_am_i");
    if (error) {
      console.error("who_am_i error:", error);
    } else {
      console.log("who_am_i result:", data);
    }
  })();
}, []);

  const handleDateClick = (clickedDate) => {
    setSelectedDate(clickedDate);
  };

  const getInterviewsForDate = (date) => {
    const dateString = date.toISOString().split('T')[0];
    return interviews.filter(interview => interview.date === dateString);
  };

  const handleAddInterview = () => {
    setNewInterview({
      ...newInterview,
      date: selectedDate ? selectedDate.toISOString().split('T')[0] : ''
    });
    setShowAddModal(true);
  };

  const saveInterview = async () => {
    if (!newInterview.applicant_name || !newInterview.position || !newInterview.date || !newInterview.time) {
      alert('Please fill in all fields');
      return;
    }

    try {
      // Split the full name into first and last name
      const nameParts = newInterview.applicant_name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';

      const { data, error } = await supabase
        .from('applications')
        .insert([{
          first_name: firstName,
          last_name: lastName,
          position: newInterview.position,
          interview_date: newInterview.date,
          interview_time: newInterview.time,
          status: 'scheduled'
        }])
        .select();

      if (error) {
        console.error('Error saving interview:', error);
        alert(`Failed to schedule interview: ${error.message}`);
      } else {
        setShowAddModal(false);
        setNewInterview({
          applicant_name: '',
          position: '',
          time: '',
          date: '',
          status: 'scheduled'
        });
        fetchInterviews(); // Refresh the list
      }
    } catch (err) {
      console.error('Unexpected error saving interview:', err);
      alert(`Failed to schedule interview: ${err.message}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dateString = date.toISOString().split('T')[0];
      const dayInterviews = interviews.filter(interview => interview.date === dateString);
      
      if (dayInterviews.length > 0) {
        return (
          <div className="flex justify-center items-center">
            <div className="w-2 h-2 bg-red-600 rounded-full mt-1"></div>
          </div>
        );
      }
    }
    return null;
  };




  

  // // 🔎 Debug: ask Supabase what role the backend sees in your JWT
  // useEffect(() => {
  //   (async () => {
  //     try {
  //       const { data, error } = await supabase.rpc("debug_claims");
  //       if (error) {
  //         console.error("debug_claims failed:", error);
  //         setJwtRoles({ error: error.message });
  //         return;
  //       }
  //       console.log("JWT app_metadata.role:", data?.app_metadata?.role);
  //       console.log("JWT user_metadata.role:", data?.user_metadata?.role);
  //       setJwtRoles({
  //         app: data?.app_metadata?.role || "(none)",
  //         user: data?.user_metadata?.role || "(none)",
  //       });
  //     } catch (e) {
  //       console.error("debug_claims threw:", e);
  //       setJwtRoles({ error: String(e?.message || e) });
  //     }
  //   })();
  // }, []);

  // const handleLogout = () => {
  //   localStorage.removeItem("loggedInHR");
  //   navigate("/employee/login");
  // };



  const handleEditJob = (job) => {
    setEditingJob(job);
    setEditForm({
      title: job.title || '',
      depot: job.depot || '',
      description: job.description || '',
      responsibilities: Array.isArray(job.responsibilities) ? job.responsibilities : [],
      urgent: job.urgent || false
    });
    setShowEditModal(true);
  };

  const handleEditFormChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleResponsibilityChange = (index, value) => {
    const newResponsibilities = [...editForm.responsibilities];
    newResponsibilities[index] = value;
    setEditForm(prev => ({
      ...prev,
      responsibilities: newResponsibilities
    }));
  };

  const addResponsibility = () => {
    setEditForm(prev => ({
      ...prev,
      responsibilities: [...prev.responsibilities, '']
    }));
  };

  const removeResponsibility = (index) => {
    const newResponsibilities = editForm.responsibilities.filter((_, i) => i !== index);
    setEditForm(prev => ({
      ...prev,
      responsibilities: newResponsibilities
    }));
  };

  const handleSaveEdit = async () => {
    if (!editingJob) {
      console.log('No editing job found');
      return;
    }
    
    setSaving(true);
    console.log('Editing job object:', editingJob);
    console.log('Job ID:', editingJob.id, 'Type:', typeof editingJob.id);
    console.log('Update data:', {
      title: editForm.title,
      depot: editForm.depot,
      description: editForm.description,
      responsibilities: editForm.responsibilities.filter(r => r.trim()),
      urgent: editForm.urgent
    });
    
    try {
      // Debug authentication before update
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user for update:', user);
      console.log('User app_metadata:', user?.app_metadata);
      console.log('User user_metadata:', user?.user_metadata);
      
      // First, let's verify the job exists
      const { data: existingJob, error: fetchError } = await supabase
        .from('job_posts')
        .select('id, title')
        .eq('id', editingJob.id)
        .single();

      console.log('Existing job check:', { existingJob, fetchError });

      if (fetchError || !existingJob) {
        alert('Job post not found. It may have been deleted.');
        setShowEditModal(false);
        fetchJobPosts();
        return;
      }

      // Now perform the update
      const { data, error } = await supabase
        .from('job_posts')
        .update({
          title: editForm.title,
          depot: editForm.depot,
          description: editForm.description,
          responsibilities: editForm.responsibilities.filter(r => r.trim()),
          urgent: editForm.urgent
        })
        .eq('id', String(editingJob.id))
        .select('*');

      console.log('Update response:', { data, error });

      if (error) {
        console.error('Error updating job post:', error);
        alert(`Failed to update job post: ${error.message}`);
      } else if (data && data.length > 0) {
        console.log('Job post updated successfully:', data);
        setShowEditModal(false);
        setEditingJob(null);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
      } else {
        // Try alternative approach - update without select then fetch
        console.warn('Update returned no rows, trying alternative approach');
        const { error: updateError } = await supabase
          .from('job_posts')
          .update({
            title: editForm.title,
            depot: editForm.depot,
            description: editForm.description,
            responsibilities: editForm.responsibilities.filter(r => r.trim()),
            urgent: editForm.urgent
          })
          .eq('id', String(editingJob.id));

        if (updateError) {
          console.error('Alternative update failed:', updateError);
          alert(`Failed to update job post: ${updateError.message}`);
        } else {
          setShowEditModal(false);
          setEditingJob(null);
          setShowSuccessMessage(true);
          setTimeout(() => setShowSuccessMessage(false), 3000);
        }
      }
    } catch (err) {
      console.error('Unexpected error saving job post:', err);
      alert(`Failed to update job post: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteJob = async () => {
    if (!deletingJob) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('job_posts')
        .delete()
        .eq('id', String(deletingJob.id));

      if (error) {
        console.error('Error deleting job post:', error);
        alert(`Failed to delete job post: ${error.message}`);
      } else {
        setShowConfirmDelete(false);
        setDeletingJob(null);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
      }
    } catch (err) {
      console.error('Unexpected error deleting job post:', err);
      alert(`Failed to delete job post: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  // Defensive render: show loading / error message instead of blank white page
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading HR dashboard…</p>
      </div>
    );
  }

  if (!hrUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">You are not logged in as HR.</p>
          <button
            onClick={() => navigate("/employee/login")}
            className="bg-red-600 text-white px-4 py-2 rounded"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  

  // Depot list for compliance monitoring
  const depots = [
    "Pasig","Cagayan","Butuan","Davao","Cebu","Laguna","Iloilo",
    "Bacolod","Zamboanga","Manila","Quezon City","Taguig",
    "Baguio","General Santos","Palawan","Olongapo","Tacloban",
    "Roxas","Legazpi","Cauayan","Cavite","Batangas","Ormoc","Koronadal",
    "Calbayog","Catbalogan","Tuguegarao","Baler","Iligan","Koronadal City"
  ];
  const COLORS = ["#4ade80", "#f87171"];

  // fake depot compliance
  const depotCompliance = depots.map((d, i) => ({
    name: d,
    compliance: 70 + (i % 10),
    nonCompliance: 30 - (i % 10),
  }));

  const displayedDepots = showAllDepots
    ? depotCompliance
    : depotCompliance.slice(0, 5);

  // Get today's interviews sorted by time
  const getTodayInterviews = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayInterviews = interviews.filter(interview => interview.date === today);
    
    // Sort by time
    return todayInterviews.sort((a, b) => {
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      return timeA.localeCompare(timeB);
    });
  };

  // Get tomorrow's interviews sorted by time
  const getTomorrowInterviews = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];
    const tomorrowInterviews = interviews.filter(interview => interview.date === tomorrowDate);
    
    // Sort by time
    return tomorrowInterviews.sort((a, b) => {
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      return timeA.localeCompare(timeB);
    });
  };

  // Get this week's interviews sorted by date and time
  const getThisWeekInterviews = () => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const weekInterviews = interviews.filter(interview => {
      const interviewDate = new Date(interview.date);
      return interviewDate >= today && interviewDate <= nextWeek;
    });
    
    // Sort by date then time
    return weekInterviews.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      return timeA.localeCompare(timeB);
    });
  };

  const formatTime = (time24) => {
    if (!time24 || time24 === 'Not set') return 'Time not set';
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours);
    const m = minutes || '00';
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayHour}:${m} ${period}`;
  };

  const getActiveInterviews = () => {
    switch (activeTab) {
      case 'today':
        return getTodayInterviews();
      case 'tomorrow':
        return getTomorrowInterviews();
      case 'week':
        return getThisWeekInterviews();
      default:
        return getTodayInterviews();
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'today':
        return "Today's Interviews";
      case 'tomorrow':
        return "Tomorrow's Interviews";
      case 'week':
        return "This Week's Interviews";
      default:
        return "Today's Interviews";
    }
  };

  const getTabDate = () => {
    const today = new Date();
    switch (activeTab) {
      case 'today':
        return today.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      case 'tomorrow':
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        return tomorrow.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      case 'week':
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 6);
        return `${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${nextWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      default:
        return '';
    }
  };

  return (
    <>
      {/* Interview Schedule Card - Compact Version */}
      <div className="max-w-7xl mx-auto px-4 mb-8 mt-6">
        <div className="max-w-sm ml-6">
          {/* Interview Schedule */}
          <div className="bg-white rounded-lg shadow-lg p-3 border-l-4 border-indigo-500 h-[450px] flex flex-col">
            <h2 className="text-sm font-bold text-gray-800 mb-2">Interview Schedule</h2>
            
            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded p-1.5 text-white">
                <p className="text-[10px] opacity-90">Total</p>
                <p className="text-sm font-bold">{getActiveInterviews().length}</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded p-1.5 text-white">
                <p className="text-[10px] opacity-90">Online</p>
                <p className="text-sm font-bold">
                  {getActiveInterviews().filter(i => i.interview_type === 'online').length}
                </p>
              </div>
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded p-1.5 text-white">
                <p className="text-[10px] opacity-90">Onsite</p>
                <p className="text-sm font-bold">
                  {getActiveInterviews().filter(i => i.interview_type === 'onsite').length}
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-0.5 mb-2 bg-gray-100 p-0.5 rounded">
              <button
                onClick={() => setActiveTab('today')}
                className={`flex-1 px-2 py-1 font-medium text-[11px] rounded transition-all ${
                  activeTab === 'today'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setActiveTab('tomorrow')}
                className={`flex-1 px-2 py-1 font-medium text-[11px] rounded transition-all ${
                  activeTab === 'tomorrow'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Tomorrow
              </button>
              <button
                onClick={() => setActiveTab('week')}
                className={`flex-1 px-2 py-1 font-medium text-[11px] rounded transition-all ${
                  activeTab === 'week'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Week
              </button>
            </div>

            <div className="mb-1.5">
              <h3 className="text-xs font-bold text-gray-800">{getTabTitle()}</h3>
              <p className="text-[10px] text-gray-500">{getTabDate()}</p>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-1.5">
              {getActiveInterviews().length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded">
                  <p className="text-xs text-gray-500">No interviews scheduled</p>
                </div>
              ) : (
                getActiveInterviews().map((interview) => (
                  <div
                    key={interview.id}
                    className="bg-gradient-to-r from-gray-50 to-white rounded p-2 cursor-pointer hover:shadow-md transition-all border border-gray-200 hover:border-indigo-300"
                    onClick={() => navigate('/hr/recruitment', { state: { applicationId: interview.id, openTab: 'Assessment' } })}
                  >
                    <div className="flex items-start justify-between mb-0.5">
                      <div className="font-bold text-gray-900 text-xs">{formatTime(interview.time)}</div>
                      <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                        interview.interview_type === 'online'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {interview.interview_type === 'online' ? 'ONLINE' : 'ONSITE'}
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900 text-[11px] leading-tight">{interview.applicant_name}</h4>
                    <p className="text-[10px] text-gray-600 truncate">{interview.position}</p>
                    {activeTab === 'week' && (
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {new Date(interview.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Interview Schedules Calendar */}
      <div className="max-w-7xl mx-auto px-4 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Interview Schedules</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar Section */}
            <div className="lg:col-span-2">
              <div className="flex justify-center">
                <Calendar
                  onChange={setDate}
                  value={date}
                  onClickDay={handleDateClick}
                  tileContent={tileContent}
                  className="w-full max-w-none"
                  style={{ width: '100%', fontSize: '18px', maxWidth: '100%' }}
                />
              </div>
              <div className="flex items-center justify-center gap-2 mt-4">
                <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                <p className="text-sm text-gray-600">Interview scheduled</p>
              </div>
              <p className="text-sm text-gray-600 text-center">
                Click on a date to view interviews
              </p>
            </div>

            {/* Interview Details Section */}
            <div className="space-y-6">
              {/* Selected Date Info */}
              {selectedDate && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-800">
                      {selectedDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </h3>
                  </div>
                  
                  <div className="space-y-3">
                    {getInterviewsForDate(selectedDate).map(interview => (
                      <div 
                        key={interview.id} 
                        className="border rounded-lg p-3 cursor-pointer hover:bg-gray-100 transition-colors bg-white"
                        onClick={() => navigate('/hr/recruitment', { state: { applicationId: interview.id, openTab: 'Assessment' } })}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-800">{interview.applicant_name}</h4>
                            <p className="text-sm text-gray-600">{interview.position}</p>
                            <p className="text-sm text-gray-600">Time: {interview.time}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(interview.status)}`}>
                            {interview.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    {getInterviewsForDate(selectedDate).length === 0 && (
                      <p className="text-gray-500 text-center py-4">No interviews scheduled for this date</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Depot Compliance Monitoring */}
      <div className="max-w-7xl mx-auto px-4 mb-8">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-700">
            Depot Compliance Monitoring
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {displayedDepots.map((depot) => {
              const data = [
                { name: "Compliance", value: depot.compliance },
                { name: "Non-Compliance", value: depot.nonCompliance },
              ];
              return (
                <div
                  key={depot.name}
                  className="relative bg-white p-4 rounded-2xl shadow-md flex flex-col items-center hover:shadow-xl transition-transform cursor-pointer"
                >
                  <PieChart width={180} height={180}>
                    <Pie data={data} cx="50%" cy="50%" outerRadius={70} dataKey="value">
                      {data.map((entry, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-sm font-semibold">{depot.name}</span>
                    <span className="font-bold text-black">
                      {depot.compliance}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {depotCompliance.length > 5 && (
            <div className="flex justify-end mt-2">
              <button
                onClick={() => setShowAllDepots((v) => !v)}
                className="text-gray-700 text-xl font-bold"
              >
                {showAllDepots ? "▲" : "▼"}
              </button>
            </div>
          )}
        </div>
      </div>



      {/* Edit Job Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-transparent bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden border border-black">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-800">Edit Job Post</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => handleEditFormChange('title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Depot */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Depot *
                  </label>
                  <input
                    type="text"
                    value={editForm.depot}
                    onChange={(e) => handleEditFormChange('depot', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => handleEditFormChange('description', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Responsibilities */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Responsibilities
                  </label>
                  {editForm.responsibilities.map((responsibility, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={responsibility}
                        onChange={(e) => handleResponsibilityChange(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder={`Responsibility ${index + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeResponsibility(index)}
                        className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addResponsibility}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                  >
                    + Add Responsibility
                  </button>
                </div>

                {/* Urgent */}
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editForm.urgent}
                      onChange={(e) => handleEditFormChange('urgent', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Mark as Urgent</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t">
              <button
                onClick={() => setShowEditModal(false)}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowConfirmSave(true)}
                disabled={saving || !editForm.title || !editForm.depot || !editForm.description}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmSave && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6 border border-black">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Confirm Save</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to save these changes?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmSave(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirmSave(false);
                  handleSaveEdit();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6 border border-black">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this job post? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmDelete(false)}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDeleteJob();
                }}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Job'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-lg">✓</span>
              <span>Job post updated successfully!</span>
            </div>
          </div>
        </div>
      )}

      {/* Add Interview Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 border border-black">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Schedule New Interview</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Applicant Name
                </label>
                <input
                  type="text"
                  value={newInterview.applicant_name}
                  onChange={(e) => setNewInterview({...newInterview, applicant_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter applicant name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position
                </label>
                <input
                  type="text"
                  value={newInterview.position}
                  onChange={(e) => setNewInterview({...newInterview, position: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter position"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={newInterview.date}
                  onChange={(e) => setNewInterview({...newInterview, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={newInterview.time}
                  onChange={(e) => setNewInterview({...newInterview, time: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={saveInterview}
                disabled={!newInterview.applicant_name || !newInterview.position || !newInterview.date || !newInterview.time}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Schedule Interview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default HrHome;
