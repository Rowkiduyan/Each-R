import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Roadwise from './Roadwise.png';

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
  const [depotFilter, setDepotFilter] = useState('all');
  const [dateOrder, setDateOrder] = useState('desc');
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      const { data, error } = await supabase
        .from('job_posts')
        .select('id, title, depot, description, responsibilities, urgent, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load job posts:', error);
        setJobs([]);
      } else {
        setJobs(data || []);
      }
      setLoading(false);
    };

    fetchJobs();
  }, []);

  const handleApplyClick = (job) => {
    setSelectedJob(job);
    setShowDetails(true);
  };

  const proceedToApply = () => {
    if (!selectedJob) return;
    setShowDetails(false);
    setMessage('Please log in to apply for this position.');
    const job = selectedJob;
    setSelectedJob(null);
    setTimeout(() => {
      navigate('/applicant/login', {
        replace: false,
        state: { redirectTo: '/applicantl/home', jobFromGuest: job },
      });
    }, 2000);
  };

  const depotOptions = Array.from(
    new Set(jobs.map((job) => job.depot).filter(Boolean))
  );

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const getJobTimestamp = (job) => {
    if (!job?.created_at) return 0;
    const date = new Date(job.created_at);
    return date instanceof Date && !isNaN(date) ? date.getTime() : 0;
  };

  const filteredJobs = [...jobs]
    .filter((job) => {
      if (!normalizedSearch) return true;
      const titleMatch = job.title?.toLowerCase().includes(normalizedSearch);
      const depotMatch = job.depot?.toLowerCase().includes(normalizedSearch);
      return titleMatch || depotMatch;
    })
    .filter((job) =>
      depotFilter === 'all' ? true : job.depot === depotFilter
    )
    .sort((a, b) => {
      const timeA = getJobTimestamp(a);
      const timeB = getJobTimestamp(b);
      return dateOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
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

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0 text-red-600 font-bold text-3xl italic">
                Each-R
              </div>
            </div>

            <nav className="flex items-center space-x-6 text-sm font-medium text-gray-600">
              <Link
                to="/applicantg/home"
                className="text-red-600 border-b-2 border-red-600 pb-1"
              >
                Job Search
              </Link>
              <Link to="#" className="hover:text-gray-900 transition-colors">
                About
              </Link>
              <Link to="#" className="hover:text-gray-900 transition-colors">
                Contact Us
              </Link>
            </nav>

            <Link
              to="/applicant/register"
              className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <div className="relative overflow-hidden">
          <img
            src={Roadwise}
            alt="Delivery trucks on the road"
            className="w-full h-[320px] object-cover"
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
                      placeholder=" Job title, keywords, or company"
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
                <div className="flex justify-end pr-4">
                  <button
                    type="button"
                    className="text-gray-900 text-sm font-medium hover:underline"
                  >
                    More options
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 text-center">
              <h1 className="text-3xl font-bold text-gray-800">Job Vacancy Postings</h1>
            </div>

            <div className="flex flex-wrap items-center gap-3 justify-end">
              <input
                type="text"
                placeholder="Search by title or depot"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-1 focus:ring-red-500"
                aria-label="Search job postings"
              />
              <select
                value={depotFilter}
                onChange={(e) => setDepotFilter(e.target.value)}
                className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
                aria-label="Filter by depot"
              >
                <option value="all">All Depots</option>
                {depotOptions.map((depot) => (
                  <option key={depot} value={depot}>
                    {depot}
                  </option>
                ))}
              </select>
              <select
                value={dateOrder}
                onChange={(e) => setDateOrder(e.target.value)}
                className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
                aria-label="Sort by date"
              >
                <option value="desc">Newest to Oldest</option>
                <option value="asc">Oldest to Newest</option>
              </select>

              <Link
                to="/applicant/login"
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Login
              </Link>
            </div>
            </form>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {message && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
            {message}
          </div>
        )}
        {loading ? (
          <div className="text-gray-600">Loading job postings…</div>
        ) : jobs.length === 0 ? (
          <div className="text-gray-600">No active job postings at the moment.</div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-gray-600">No job postings match your search.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.length === 0 ? (
              <div className="col-span-full text-gray-600">
                No job postings match your filters.
            {filteredJobs.map((job) => {
              const createdAt = job?.created_at ? new Date(job.created_at) : null;
              const hasValidDate = createdAt instanceof Date && !isNaN(createdAt);
              const postedLabel = hasValidDate
                ? createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Not available';

              return (
              <div key={job.id} className="bg-white rounded-lg shadow-md p-6 flex flex-col relative overflow-hidden">
                {job.urgent && (
                  <div className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-4 py-1">
                    URGENT HIRING!
                  </div>
                )}
                <div className="mt-4 flex flex-col flex-grow">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{job.title}</h3>
                  <div className="flex justify-between items-center mb-2 text-sm text-gray-600">
                    <span>{job.depot}</span>
                    <span>
                      Posted {postedLabel}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-4 line-clamp-3">{job.description}</p>
                  <button
                    className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors mt-auto"
                    onClick={() => handleApplyClick(job)}
                  >
                    Apply
                  </button>
                </div>
              </div>
            ) : (
              filteredJobs.map((job) => {
                const createdAt = job?.created_at ? new Date(job.created_at) : null;
                const hasValidDate = createdAt instanceof Date && !isNaN(createdAt);
                const postedLabel = hasValidDate
                  ? createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'Not available';

                return (
                  <div key={job.id} className="bg-white rounded-lg shadow-md p-6 flex flex-col relative overflow-hidden">
                    {job.urgent && (
                      <div className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-4 py-1">
                        URGENT HIRING!
                      </div>
                    )}
                    <div className="mt-4 flex flex-col flex-grow">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">{job.title}</h3>
                      <div className="flex justify-between items-center mb-2 text-sm text-gray-600">
                        <span>{job.depot}</span>
                        <span>
                          Posted {postedLabel}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-4 line-clamp-3">{job.description}</p>
                      <button
                        className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors mt-auto"
                        onClick={() => handleApplyClick(job)}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
      {showDetails && selectedJob && (
        <div
          className="fixed inset-0 bg-transparent bg-opacity-30 flex items-center justify-center z-50"
          onClick={() => setShowDetails(false)}
        >
          <div
            className="bg-white rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">{selectedJob.title}</h2>
                <button className="text-gray-500 text-2xl leading-none" onClick={() => setShowDetails(false)}>
                  &times;
                </button>
              </div>
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <span className="font-semibold">{selectedJob.depot}</span>
                {selectedJob.urgent && (
                  <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-semibold">Urgent</span>
                )}
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
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                  onClick={() => setShowDetails(false)}
                >
                  Close
                </button>
                <button className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700" onClick={proceedToApply}>
                  Proceed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApplicantGHome;