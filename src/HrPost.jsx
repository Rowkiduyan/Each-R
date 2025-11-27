import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "./supabaseClient";
import Roadwise from './Roadwise.png';

function HrPost() {
  const [jobPosts, setJobPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [showMenuId, setShowMenuId] = useState(null);
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
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deletingJob, setDeletingJob] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Function to fetch job posts
  const fetchJobPosts = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobPosts();
  }, []);

  const handleCardSelect = (job) => {
    setSelectedJob(job);
    setShowDetails(true);
  };

  const handleViewAll = () => {
    setShowDetails(false);
    setSelectedJob(null);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchTerm(searchInput.trim());
    setLocationFilter(locationInput.trim());
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
    setShowMenuId(null);
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
    if (!editingJob) return;
    
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('job_posts')
        .update({
          title: editForm.title,
          depot: editForm.depot,
          description: editForm.description,
          responsibilities: editForm.responsibilities.filter(r => r.trim()),
          urgent: editForm.urgent
        })
        .eq('id', editingJob.id)
        .select();

      if (error) {
        console.error('Error updating job post:', error);
        alert(`Failed to update job post: ${error.message}`);
      } else {
        setShowEditModal(false);
        setEditingJob(null);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
        fetchJobPosts();
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
        .eq('id', deletingJob.id);

      if (error) {
        console.error('Error deleting job post:', error);
        alert(`Failed to delete job post: ${error.message}`);
      } else {
        setShowConfirmDelete(false);
        setDeletingJob(null);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
        fetchJobPosts();
        if (selectedJob?.id === deletingJob.id) {
          setShowDetails(false);
          setSelectedJob(null);
        }
      }
    } catch (err) {
      console.error('Unexpected error deleting job post:', err);
      alert(`Failed to delete job post: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const locationSuggestions = Array.from(
    new Set(
      jobPosts
        .map((job) => job.depot)
        .filter((loc) => typeof loc === 'string' && loc.trim().length > 0)
    )
  );

  const filteredLocationSuggestions = locationSuggestions.filter((loc) =>
    loc.toLowerCase().includes(locationInput.toLowerCase())
  );

  const formatPostedLabel = (job) => {
    const createdAt = job?.created_at ? new Date(job.created_at) : null;
    const hasValidDate = createdAt instanceof Date && !isNaN(createdAt);
    return hasValidDate
      ? createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Not available';
  };

  // Filter jobs based on search
  const filteredJobs = jobPosts.filter((job) => {
    const matchesSearch = searchTerm === '' || 
      job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLocation = locationFilter === '' || 
      job.depot?.toLowerCase().includes(locationFilter.toLowerCase());
    
    return matchesSearch && matchesLocation;
  });

  // Build job card elements
  const jobCardElements = filteredJobs.map((job) => {
    const isSelected = selectedJob?.id === job.id;

    return (
      <div
        key={job.id}
        className={`bg-white rounded-lg shadow-md p-6 flex flex-col relative overflow-hidden transition-colors ${
          isSelected ? 'border-2 border-red-600' : 'border border-transparent'
        } hover:bg-gray-100`}
      >
        {job.urgent && (
          <div className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-4 py-1">
            URGENT HIRING!
          </div>
        )}
        
        {/* 3-dot menu */}
        <div className="absolute top-2 right-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenuId(showMenuId === job.id ? null : job.id);
            }}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 16 16">
              <circle cx="8" cy="2" r="1.5"/>
              <circle cx="8" cy="8" r="1.5"/>
              <circle cx="8" cy="14" r="1.5"/>
            </svg>
          </button>
          
          {showMenuId === job.id && (
            <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditJob(job);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg"
              >
                ✏️ Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletingJob(job);
                  setShowConfirmDelete(true);
                  setShowMenuId(null);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-b-lg"
              >
                🗑️ Delete
              </button>
            </div>
          )}
        </div>

        <div 
          className="mt-4 flex flex-col flex-grow cursor-pointer"
          onClick={() => handleCardSelect(job)}
        >
          <h3 className="text-xl font-bold text-gray-800 mb-2">{job.title}</h3>
          <div className="flex justify-between items-center mb-2 text-sm text-gray-600">
            <span>{job.depot}</span>
            <span>Posted {formatPostedLabel(job)}</span>
          </div>
          <p className="text-gray-700 line-clamp-3">{job.description}</p>
        </div>
      </div>
    );
  });

  return (
    <>
      <div className="min-h-screen bg-white">
      <style>{`
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Search Bar with Background */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="relative overflow-hidden">
          <img
            src={Roadwise}
            alt="Delivery trucks on the road"
            className="w-full h-[150px] object-cover"
          />
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <form className="w-full max-w-4xl" onSubmit={handleSearchSubmit}>
              <div className="flex flex-col gap-3">
                <div className="flex items-stretch bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                  <div className="flex-1 flex items-center px-5 py-4">
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="w-full bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none"
                      placeholder="Job title, keywords, or company"
                    />
                  </div>
                  <div className="w-px bg-gray-200" />
                  <div className="flex-1 flex items-center px-6 py-3 relative">
                    <input
                      type="text"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      onFocus={() => setShowLocationSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 100)}
                      className="w-full bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none"
                      placeholder="Location"
                    />
                    {showLocationSuggestions && filteredLocationSuggestions.length > 0 && (
                      <ul className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto z-10">
                        {filteredLocationSuggestions.map((loc) => (
                          <li
                            key={loc}
                            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                            onMouseDown={() => {
                              setLocationInput(loc);
                              setShowLocationSuggestions(false);
                            }}
                          >
                            {loc}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="flex items-center pr-4">
                    <button
                      type="submit"
                      className="bg-red-600 text-white px-5 py-2 text-base font-semibold rounded-xl hover:bg-red-700 transition-colors"
                      aria-label="Find jobs"
                    >
                      Find Jobs
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Create Job Post Button */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <Link
          to="/hr/create/job"
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          + Create Job Post
        </Link>
      </div>

      <div className="flex flex-col items-center min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {loading ? (
            <div className="text-gray-600">Loading jobs…</div>
          ) : jobPosts.length === 0 ? (
            <div className="text-gray-600">No active job postings at the moment.</div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-gray-600">No job postings match your search.</div>
          ) : showDetails && selectedJob ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleViewAll}
                className="flex items-center text-blue-600 hover:text-blue-700 font-medium gap-2"
              >
                ← View all Job posts
              </button>
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-1/3 max-h-[70vh] overflow-y-auto no-scrollbar pr-2">
                  <div className="space-y-4">{jobCardElements}</div>
                </div>
                <div className="lg:w-2/3 flex flex-col gap-4">
                  <div className="bg-white rounded-lg shadow-md p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="space-y-3">
                      {selectedJob.urgent && (
                        <div className="inline-block px-4 py-1 rounded bg-red-100 text-red-700 text-2xl font-semibold">
                          Urgent Hiring
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-4">
                        <h2 className="text-2xl font-bold text-gray-800">{selectedJob.title}</h2>
                      </div>
                      <div className="text-sm text-gray-600 flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-5 h-5 text-red-600">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
                            </svg>
                          </span>
                          <span className="font-semibold">{selectedJob.depot}</span>
                        </div>
                        <span className="text-xs text-gray-500">Posted {formatPostedLabel(selectedJob)}</span>
                      </div>
                    </div>
                    <p className="text-gray-700">{selectedJob.description || 'No description provided.'}</p>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Responsibilities & Other Details</h3>
                      {selectedJob.responsibilities && selectedJob.responsibilities.length > 0 ? (
                        <ul className="list-disc list-inside text-gray-700 space-y-1">
                          {selectedJob.responsibilities.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">No additional details provided.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{jobCardElements}</div>
          )}
        </div>
      </div>

      {/* Edit Job Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-transparent bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-black max-w-2xl w-full max-h-[90vh] overflow-hidden">
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
                onClick={handleSaveEdit}
                disabled={saving || !editForm.title || !editForm.depot || !editForm.description}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-black max-w-md w-full mx-4 p-6">
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
                onClick={handleDeleteJob}
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
              <span>Operation completed successfully!</span>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

export default HrPost;