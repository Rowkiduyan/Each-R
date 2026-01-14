import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

function ApplicantGHome() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);

  // Helper to check if job is expired based on expires_at date
  const isJobExpired = (job) => {
    if (!job.expires_at) return false;
    
    // Get today's date at start of day (00:00:00)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get expiration date at start of day
    const expiresAt = new Date(job.expires_at);
    expiresAt.setHours(0, 0, 0, 0);
    
    // Job is expired if today is equal to or past the expiration date
    return today >= expiresAt;
  };

  const splitJobDetails = (items) => {
    const list = Array.isArray(items) ? items : (items ? [items] : []);
    const responsibilities = [];
    const keyRequirements = [];
    for (const item of list) {
      const s = String(item || "").trim();
      if (!s) continue;
      if (s.toUpperCase().startsWith("REQ:")) {
        const v = s.slice(4).trim();
        if (v) keyRequirements.push(v);
      } else {
        responsibilities.push(s);
      }
    }
    return { responsibilities, keyRequirements };
  };

  const attachHiringStats = async (jobsList) => {
    const ids = (jobsList || []).map((j) => j?.id).filter(Boolean);
    if (ids.length === 0) return jobsList;

    const { data, error } = await supabase
      .from('applications')
      .select('job_id, status')
      .in('job_id', ids);

    if (error) {
      console.error('load applications stats error:', error);
      return jobsList;
    }

    const hiredByJobId = new Map();
    for (const row of data || []) {
      const jobId = row?.job_id;
      if (!jobId) continue;
      const status = String(row?.status || '').toLowerCase();
      if (status === 'hired') {
        hiredByJobId.set(jobId, (hiredByJobId.get(jobId) || 0) + 1);
      }
    }

    return (jobsList || []).map((job) => {
      const totalNum = Number(job?.positions_needed);
      const hasLimit = Number.isFinite(totalNum) && totalNum > 0;
      const total = hasLimit ? totalNum : null;
      const hired = hiredByJobId.get(job?.id) || 0;
      const remaining = hasLimit ? Math.max(totalNum - hired, 0) : null;
      return { ...job, hired_count: hired, remaining_slots: remaining };
    });
  };

  useEffect(() => {
    let channel;

    const fetchJobs = async () => {
      const { data, error } = await supabase
        .from('job_posts')
        .select('id, title, depot, department, description, responsibilities, urgent, created_at, expires_at, job_type, positions_needed, duration')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load job posts:', error);
        setJobs([]);
      } else {
        // Only show office_employee jobs for applicants
        const officeJobs = (data || []).filter((job) => job.job_type?.toLowerCase() === 'office_employee');
        const withStats = await attachHiringStats(officeJobs);

        const closable = withStats.filter((job) => {
          const expired = isJobExpired(job);
          const totalNum = Number(job?.positions_needed);
          const hasLimit = Number.isFinite(totalNum) && totalNum > 0;
          const filled = hasLimit && (Number(job?.hired_count) || 0) >= totalNum;
          return expired || filled;
        });

        if (closable.length > 0) {
          await Promise.all(
            closable.map((job) => supabase.from('job_posts').update({ is_active: false }).eq('id', job.id))
          );
        }

        const openJobs = withStats.filter((job) => {
          const expired = isJobExpired(job);
          const totalNum = Number(job?.positions_needed);
          const hasLimit = Number.isFinite(totalNum) && totalNum > 0;
          const filled = hasLimit && (Number(job?.hired_count) || 0) >= totalNum;
          return !expired && !filled;
        });

        setJobs(openJobs);
      }
      setLoading(false);
    };

    fetchJobs();

    channel = supabase
      .channel('guest-job-posts-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_posts' }, fetchJobs)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, fetchJobs)
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const handleCardSelect = (job) => {
    setSelectedJob(job);
    setShowDetails(true);
  };

  const proceedToApply = () => {
    if (!selectedJob) return;
    setMessage('Please log in to apply for this position.');
    const jobId = selectedJob.id;
    setTimeout(() => {
      navigate('/applicant/login', {
        replace: false,
        state: { redirectTo: '/applicantl/home', jobId: jobId },
      });
    }, 2000);
  };

  const filteredJobs = jobs.filter((job) => {
    const keywordMatch = searchTerm
      ? job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description?.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    const locationMatch = locationFilter
      ? (job.depot || '').toLowerCase().includes(locationFilter.toLowerCase())
      : true;
    return keywordMatch && locationMatch;
  });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchTerm(searchInput.trim());
    setLocationFilter(locationInput.trim());
  };

  const locationSuggestions = Array.from(
    new Set(
      jobs
        .map((job) => job.depot)
        .filter((loc) => typeof loc === 'string' && loc.trim().length > 0)
    )
  );

  const filteredLocationSuggestions = locationSuggestions.filter((loc) =>
    loc.toLowerCase().includes(locationInput.toLowerCase())
  );

  const searchSuggestions = Array.from(
    new Set(
      jobs
        .map((job) => job.title)
        .filter((title) => typeof title === 'string' && title.trim().length > 0)
    )
  );

  const filteredSearchSuggestions = searchInput.trim() === ''
    ? searchSuggestions
    : searchSuggestions.filter((title) =>
        title.toLowerCase().includes(searchInput.toLowerCase())
      );

  const formatPostedLabel = (job) => {
    const createdAt = job?.created_at ? new Date(job.created_at) : null;
    const hasValidDate = createdAt instanceof Date && !isNaN(createdAt);
    return hasValidDate
      ? createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Not available';
  };

  const jobCardElements = filteredJobs.map((job) => {
    const createdAt = job?.created_at ? new Date(job.created_at) : null;
    const hasValidDate = createdAt instanceof Date && !isNaN(createdAt);
    const postedLabel = hasValidDate
      ? createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Not available';
    const isSelected = selectedJob?.id === job.id;

    return (
      <div
        key={job.id}
        className={`bg-white rounded-lg shadow-md p-6 flex flex-col relative overflow-hidden cursor-pointer transition-colors ${
          isSelected ? 'border-2 border-red-600' : 'border border-transparent'
        } hover:bg-gray-100`}
        onClick={() => handleCardSelect(job)}
      >
        {job.urgent && (
          <div className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-4 py-1">
            URGENT HIRING!
          </div>
        )}
        <div className="mt-4 flex flex-col flex-grow">
          <h3 className="text-xl font-bold text-gray-800 mb-2">{job.title}</h3>
          <div className="flex justify-between items-center mb-2 text-sm text-gray-600">
            <div className="flex flex-col gap-1">
              <span>{job.depot}</span>
              {job.department && (
                <span className="text-xs text-gray-500">{job.department}</span>
              )}
            </div>
            <span>Posted {postedLabel}</span>
          </div>
          <p className="text-gray-700 line-clamp-3">{job.description}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
            <span className="px-2 py-1 bg-gray-100 rounded">
              {job.positions_needed == null
                ? 'Slots Remaining: No limit'
                : `Slots Remaining: ${typeof job.remaining_slots === 'number' ? job.remaining_slots : (job.positions_needed || 1)} / ${job.positions_needed || 1}`}
            </span>
            <span className="px-2 py-1 bg-gray-100 rounded">
              {job.expires_at
                ? `Closes on: ${new Date(job.expires_at).toLocaleDateString('en-US')}`
                : (job.positions_needed == null ? 'Open until manually closed' : 'Closes when filled')}
            </span>
          </div>
        </div>
      </div>
    );
  });

  const handleViewAll = () => {
    setShowDetails(false);
    setSelectedJob(null);
    setMessage('');
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <style>{`
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {/* Search Bar with Photo Banner */}
      <div className="w-full">
        <div className="relative">
          <img
            src={'/roadwise-banner.png'}
            alt="Delivery trucks on the road"
            className="w-full h-[200px] object-cover"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/vite.svg';
            }}
          />
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <form className="w-full max-w-4xl" onSubmit={handleSearchSubmit}>
              <div className="flex flex-col gap-3">
                <div className="flex items-stretch bg-white rounded-2xl shadow-xl border border-gray-200 overflow-visible relative">
                  <div className="flex-1 flex items-center px-5 py-4 relative">
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onFocus={() => setShowSearchSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
                      className="w-full bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none"
                      placeholder=" Job title, keywords, or company"
                    />
                    {showSearchSuggestions && filteredSearchSuggestions.length > 0 && (
                      <ul className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto z-[9999]">
                        {filteredSearchSuggestions.map((title) => (
                          <li
                            key={title}
                            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                            onMouseDown={() => {
                              setSearchInput(title);
                              setShowSearchSuggestions(false);
                            }}
                          >
                            {title}
                          </li>
                        ))}
                      </ul>
                    )}
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
                <div className="flex justify-end pr-4">
                  <button
                    type="button"
                    className="text-white text-sm font-medium hover:underline"
                  >
                    More options
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="w-full px-6 py-8">
        {loading ? (
          <div className="text-gray-600">Loading job postings…</div>
        ) : jobs.length === 0 ? (
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
                {message && (
                  <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
                    {message}
                  </div>
                )}
                <div className="bg-white rounded-lg shadow-md p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div className="space-y-3">
                    {selectedJob.urgent && (
                      <div className="inline-block px-4 py-1 rounded bg-red-100 text-red-700 text-2xl font-semibold">
                        Urgent Hiring
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="text-2xl font-bold text-gray-800">{selectedJob.title}</h2>
                      <button
                        className="px-10 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                        onClick={proceedToApply}
                      >
                        Apply
                      </button>
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2">
                          <div className="text-[11px] text-gray-500">Slots Remaining</div>
                          <div className="text-sm font-semibold text-gray-800">
                            {selectedJob.positions_needed == null
                              ? 'No limit'
                              : `${typeof selectedJob.remaining_slots === 'number' ? selectedJob.remaining_slots : (selectedJob.positions_needed || 1)} / ${selectedJob.positions_needed || 1}`}
                          </div>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2">
                          <div className="text-[11px] text-gray-500">Application Duration</div>
                          <div className="text-sm font-semibold text-gray-800">
                            {selectedJob.expires_at ? `Closes on ${new Date(selectedJob.expires_at).toLocaleDateString('en-US')}` : (selectedJob.duration || "Closes when headcount is reached")}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-700">{selectedJob.description || 'No description provided.'}</p>
                  <div>
                    {(() => {
                      const { responsibilities, keyRequirements } = splitJobDetails(selectedJob.responsibilities);
                      const hasAny = responsibilities.length > 0 || keyRequirements.length > 0;
                      if (!hasAny) {
                        return <p className="text-sm text-gray-500">No additional details provided.</p>;
                      }
                      return (
                        <div className="space-y-4">
                          {responsibilities.length > 0 && (
                            <div>
                              <h3 className="text-lg font-semibold text-gray-800 mb-2">Main Responsibilities</h3>
                              <ul className="list-disc list-inside text-gray-700 space-y-1">
                                {responsibilities.map((item, idx) => (
                                  <li key={idx}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {keyRequirements.length > 0 && (
                            <div>
                              <h3 className="text-lg font-semibold text-gray-800 mb-2">Basic Key Requirements</h3>
                              <ul className="list-disc list-inside text-gray-700 space-y-1">
                                {keyRequirements.map((item, idx) => (
                                  <li key={idx}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })()}
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
  );
}

export default ApplicantGHome;