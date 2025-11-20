import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

function ApplicantGHome() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

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

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="flex-shrink-0 text-red-600 font-bold text-3xl italic">
                  Each-R
                </div>
              </div>
            </div>

            <div className="flex-1 text-center">
              <h1 className="text-3xl font-bold text-gray-800">Job Vacancy Postings</h1>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-96 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-1 focus:ring-red-500"
                  aria-label="Search job postings"
                />
              </div>

              <button className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                Filter
              </button>

              <Link
                to="/applicant/login"
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Login
              </Link>
            </div>
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.filter(job => 
              job.title.toLowerCase().includes(searchTerm.toLowerCase())
            ).map((job) => {
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
            )})}
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