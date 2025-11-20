import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

function ApplicantGHome() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

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
    setMessage('Please log in to apply for this position.');
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
    </div>
  );
}

export default ApplicantGHome;