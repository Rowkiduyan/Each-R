import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { PieChart, Pie, Cell, Tooltip } from "recharts";

function HrHome() {
  const [date, setDate] = useState(new Date());
  const [hrUser, setHrUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAllDepots, setShowAllDepots] = useState(false);
  const [showJobPostsModal, setShowJobPostsModal] = useState(false);
  const [jobPosts, setJobPosts] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all'); // 'all', 'title', 'depot'
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest', 'oldest'
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deletingJob, setDeletingJob] = useState(null);
  const [deleting, setDeleting] = useState(false);
  // const [jwtRoles, setJwtRoles] = useState(null); // <- shows what Supabase sees in your JWT
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

  // Function to fetch job posts
  const fetchJobPosts = async () => {
    setJobsLoading(true);
    try {
      const { data, error } = await supabase
        .from('job_posts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching job posts:', error);
      } else {
        setJobPosts(data || []);
      }
    } catch (err) {
      console.error('Unexpected error fetching job posts:', err);
    } finally {
      setJobsLoading(false);
    }
  };

  const handleViewJobPosts = () => {
    setShowJobPostsModal(true);
    fetchJobPosts();
  };

  // Filter and sort job posts
  const getFilteredAndSortedJobs = () => {
    let filtered = [...jobPosts];

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(job => {
        if (filterBy === 'title') {
          return job.title?.toLowerCase().includes(search);
        } else if (filterBy === 'depot') {
          return job.depot?.toLowerCase().includes(search);
        } else {
          // Search in all fields
          return (
            job.title?.toLowerCase().includes(search) ||
            job.depot?.toLowerCase().includes(search) ||
            job.description?.toLowerCase().includes(search)
          );
        }
      });
    }

    // Apply sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      
      if (sortOrder === 'newest') {
        return dateB - dateA;
      } else {
        return dateA - dateB;
      }
    });

    return filtered;
  };

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
        fetchJobPosts(); // Refresh the job posts
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
          fetchJobPosts(); // Refresh the job posts
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
        fetchJobPosts(); // Refresh the job posts
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

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 mb-4">
        <div className="flex gap-3">
          <Link
            to="/hr/create/job"
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            + Create Job Post
          </Link>
          <button
            onClick={handleViewJobPosts}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            📋 View Job Posts
          </button>
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

      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row gap-6">
        <div className="md:w-1/3 w-full">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-black-600 mb-2">
              Welcome to your Homepage!
            </h2>
            <p className="text-gray-700">
              Here you can manage your HR tasks and view important updates.
            </p>
            <p className="mt-3 text-sm text-gray-500">
              Signed in as: <strong>{hrUser?.email}</strong>
            </p>
          </div>

          {/* ... rest of your static cards (kept unchanged) ... */}
        </div>

        <div className="md:w-1/3 w-full">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-black-600 mb-2">Interviews Schedule</h2>
            <Calendar onChange={setDate} value={date} className="w-full" />
          </div>
        </div>

        <div className="md:w-1/3 w-full">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-black-600 mb-2">Upcoming Birthdays</h2>
            <div className="flex flex-col gap-4 max-h-75 overflow-y-auto">
              <div className="bg-yellow-200 rounded shadow p-4">
                <p className="text-gray-700">Alexis Enovy Drilon</p>
                <p className="text-sm text-gray-500">Nov 11, 2025</p>
              </div>
              <div className="bg-yellow-200 rounded shadow p-4">
                <p className="text-gray-700">Chales Roque</p>
                <p className="text-sm text-gray-500">Jan 32, 2025</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Job Posts Modal */}
      {showJobPostsModal && (
        <div className="fixed inset-0 bg-transparent bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden border border-black">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-800">Job Posts Management</h2>
              <button
                onClick={() => setShowJobPostsModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Search and Filter Controls */}
              <div className="mb-6 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Search Bar */}
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Search job posts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* Filter Dropdown */}
                  <div className="md:w-48">
                    <select
                      value={filterBy}
                      onChange={(e) => setFilterBy(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="all">Search All Fields</option>
                      <option value="title">Search Title Only</option>
                      <option value="depot">Search Depot Only</option>
                    </select>
                  </div>
                  
                  {/* Sort Dropdown */}
                  <div className="md:w-48">
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                    </select>
                  </div>
                </div>
              </div>

              {jobsLoading ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Loading job posts...</p>
                </div>
              ) : jobPosts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No job posts found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getFilteredAndSortedJobs().length === 0 ? (
                    <div className="col-span-full text-center py-8">
                      <p className="text-gray-600">
                        {searchTerm ? 'No job posts match your search criteria.' : 'No job posts found.'}
                      </p>
                    </div>
                  ) : (
                    getFilteredAndSortedJobs().map((job) => (
                    <div
                      key={job.id}
                      className="bg-white border rounded-lg shadow-md hover:shadow-lg transition-shadow flex flex-col"
                    >
                      <div className="p-4 flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-800 line-clamp-2">
                            {job.title}
                          </h3>
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            {job.job_type?.replace('_', ' ') || 'N/A'}
                          </span>
                        </div>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium">Depot:</span>
                            <span className="ml-1">{job.depot}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium">Posted:</span>
                            <span className="ml-1">
                              {new Date(job.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="mb-3">
                          <p className="text-sm text-gray-700 line-clamp-3">
                            {job.description}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 pt-0">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              handleEditJob(job);
                            }}
                            className="flex-1 px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm font-medium transition-colors"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => {
                              setDeletingJob(job);
                              setShowConfirmDelete(true);
                            }}
                            className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium transition-colors"
                          >
                            🗑️ Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
    </>
  );
}

export default HrHome;
