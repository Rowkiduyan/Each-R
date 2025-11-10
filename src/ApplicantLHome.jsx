import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function ApplicantLHome() {
const navigate = useNavigate();
const location = useLocation();
const newJob = location.state?.newJob;
const [activeTab, setActiveTab] = useState("Home");
const [showModal, setShowModal] = useState(false);
const [showSummary, setShowSummary] = useState(false);
const [workExperiences, setWorkExperiences] = useState([{}]);
const [characterReferences, setCharacterReferences] = useState([{}, {}, {}]);

  // helpers
  const handleInput = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleCheckbox = (e) => {
    const { name, checked } = e.target;
    setForm((f) => ({ ...f, [name]: checked }));
  };

  const handleResumeChange = (e) => {
    const file = e.target.files?.[0];
    setForm((f) => ({ ...f, resumeName: file ? file.name : '' }));
  };

  const updateWork = (idx, key, value) => {
    setWorkExperiences((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [key]: value };
      return copy;
    });
  };

  const updateRef = (idx, key, value) => {
    setCharacterReferences((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [key]: value };
      return copy;
    });
  };

  // submit -> show summary with what user typed
  const onSubmitApplication = (e) => {
    e.preventDefault();
    if (!selectedJob && !newJob) {
      alert('Please choose a job first (click View on a job card).');
      return;
    }
    setShowModal(false);
    setShowSummary(true);
  };

  // final submit -> save to Supabase.applications
  const handleFinalSubmit = async () => {
    if (!window.confirm('Are you sure you want to submit the application?')) return;

    const { data: { session }, error: sessErr } = await supabase.auth.getSession();
    if (sessErr) {
      alert('Could not check session: ' + sessErr.message);
      return;
    }
    if (!session) {
      alert('Please log in again.');
      navigate('/applicant/login', { replace: true, state: { redirectTo: '/applicantl/home' } });
      return;
    }

    const userId = session.user.id;

    const job = selectedJob || newJob || null;

    const payload = {
      form,
      workExperiences,
      characterReferences,
      job, // snapshot of the job
    };

    const jobId = (job && (job.id || job.title)) || 'unknown';

    const { error } = await supabase.from('applications').insert([
      {
        user_id: userId,
        job_id: jobId,
        payload,
        status: 'submitted',
      }
    ]);

    if (error) {
      console.error(error);
      alert('Failed to submit application: ' + error.message);
      return;
    }

    alert('Application submitted successfully!');
    setShowSummary(false);
    // optionally:
    // setActiveTab('Applications');
    // navigate('/applicant/applications');
  };

  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let unsub;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // not logged in → go to login, remember where to return
        navigate('/applicant/login', {
          replace: true,
          state: { redirectTo: '/applicantl/home' },
        });
        return; // don't set authChecked; we'll leave the page
      }

      setAuthChecked(true); // we’re good to render the page

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, sess) => {
        if (!sess) navigate('/applicant/login', { replace: true });
      });
      unsub = () => subscription.unsubscribe();
    })();

    return () => unsub && unsub();
  }, [navigate]);

  // NEW: Load job posts from DB and subscribe to realtime inserts
  useEffect(() => {
    let channel;

    const loadJobs = async () => {
      setJobsLoading(true);
      const { data, error } = await supabase
        .from('job_posts')
        .select('id, title, depot, description, responsibilities, urgent, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('load job_posts error:', error);
        setJobs([]);
        setJobsLoading(false);
        return;
      }

      const list = data || [];
      // ensure redirected job appears even if cache delay (avoid dupe)
      const merged = newJob
        ? [list.find(j => j.id === newJob.id) ? null : newJob, ...list].filter(Boolean)
        : list;

      setJobs(merged);
      setJobsLoading(false);
    };

    loadJobs();

    channel = supabase
      .channel('job_posts-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'job_posts' },
        loadJobs
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [newJob]);

  // ✅ Safe early return AFTER the hook has been called this render
  if (!authChecked) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-gray-600">Checking session…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0 text-red-600 font-bold text-2xl italic">
                Each-R
              </div>
            </div>

            <div className="flex-1 flex justify-center">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('Home')}
                  className={`pb-2 font-medium ${
                    activeTab === 'Home'
                      ? 'text-red-600 border-b-2 border-red-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Home
                </button>
                <button
                  onClick={() => {
                    setActiveTab('Applications');
                    navigate('/applicant/applications');
                  }}
                  className={`pb-2 font-medium ${
                    activeTab === 'Applications'
                      ? 'text-red-600 border-b-2 border-red-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Applications
                </button>
                <button
                  onClick={() => setActiveTab('Profile')}
                  className={`pb-2 font-medium ${
                    activeTab === 'Profile'
                      ? 'text-red-600 border-b-2 border-red-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Profile
                </button>
              </nav>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate('/applicant/login', { replace: true });
                }}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Logout
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Search Bar */}
      {activeTab !== "Profile" && (
      <div className="max-w-7xl mx-auto px-6 mt-4 flex justify-end">
        <input
          placeholder="Search"
          className="w-80 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
      </div>          
      
      <div className="flex flex-col items-center  min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <section className={`p-4 ${activeTab === 'Home' ? '' : 'hidden'}`}>
            <div className="max-w-7xl mx-auto px-6 py-8">
              {/* Jobs from DB */}
              {jobsLoading ? (
                <div className="text-gray-600">Loading jobs…</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {jobs.map((job) => (
                    <div key={job.id} className="bg-white rounded-lg shadow-md p-6 relative overflow-hidden flex flex-col">
                      {job.urgent && (
                        <div className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-4 py-1 transform">
                          URGENT HIRING!
                        </div>
                      )}
                      <div className="mt-6 flex flex-col flex-grow">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">
                          {job.title}
                        </h3>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-gray-700">{job.depot}</span>
                          <span className="text-sm text-gray-500">
                            Posted {new Date(job.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-700 mb-4">{job.description}</p>
                        {Array.isArray(job.responsibilities) &&
                          job.responsibilities.length > 0 && (
                            <div className="mb-4">
                              <h4 className="font-semibold text-gray-800 mb-2">
                                Main Responsibilities
                              </h4>
                              <ul className="text-sm text-gray-700 space-y-1">
                                {job.responsibilities
                                  .filter(Boolean)
                                  .map((r, i) => (
                                    <li key={i}>• {r}</li>
                                  ))}
                              </ul>
                            </div>
                          )}
                        <button
                          className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors mt-auto"
                          onClick={() => {
                            setSelectedJob(job);
                            setShowModal(true);
                          }}
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* below are your static cards unchanged except the button handlers */}
                  <div className="bg-white rounded-lg shadow-md p-6 relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-4 py-1 transform">
                      URGENT HIRING!
                    </div>
                    <div className="mt-6 flex flex-col flex-grow">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">
                        Delivery Driver
                      </h3>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-700">Pasig Depot</span>
                        <span className="text-sm text-gray-500">Posted 10hrs ago</span>
                      </div>
                      <p className="text-gray-700 mb-4">
                        We are seeking a reliable and safety-conscious Truck Driver to
                        transport goods efficiently and on schedule to various
                        destinations.
                      </p>
                      <div className="mb-4">
                        <h4 className="font-semibold text-gray-800 mb-2">
                          Main Responsibilities
                        </h4>
                        <ul className="text-sm text-gray-700 space-y-1">
                          <li>• Safely operate company-based trucks</li>
                          <li>• Conduct pre-trip and post-trip inspections of vehicle systems and equipment</li>
                          <li>• Load and unload cargo</li>
                          <li>• Ensure accurate documentation</li>
                        </ul>
                      </div>
                      <button
                        className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors mt-auto"
                        onClick={() => {
                          setSelectedJob({
                            id: 'static-driver',
                            title: 'Delivery Driver',
                            depot: 'Pasig Depot',
                            description: 'Static card',
                            responsibilities: []
                          });
                          setShowModal(true);
                        }}
                      >
                        View
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-md p-6 relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-4 py-1 transform">
                      URGENT HIRING!
                    </div>
                    <div className="mt-6 flex flex-col flex-grow">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">
                        Delivery Helper
                      </h3>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-700">Butuan Depot</span>
                        <span className="text-sm text-gray-500">Posted 1 day ago</span>
                      </div>
                      <p className="text-gray-700 mb-4">
                        We are seeking a reliable and safety-conscious Truck Driver to
                        transport goods efficiently and on schedule to various
                        destinations.
                      </p>
                      <div className="mb-4 flex-grow">
                        <h4 className="font-semibold text-gray-800 mb-2">
                          Main Responsibilities
                        </h4>
                        <ul className="text-sm text-gray-700 space-y-1">
                          <li>• Safely operate company-based trucks</li>
                          <li>• Conduct pre-trip and post-trip inspections of vehicle systems and equipment</li>
                          <li>• Load and unload cargo</li>
                          <li>• Ensure accurate documentation</li>
                        </ul>
                      </div>
                      <button
                        className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors mt-auto"
                        onClick={() => {
                          setSelectedJob({
                            id: 'static-helper',
                            title: 'Delivery Helper',
                            depot: 'Butuan Depot',
                            description: 'Static card',
                            responsibilities: []
                          });
                          setShowModal(true);
                        }}
                      >
                        View
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-md p-6 relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-4 py-1 transform">
                      URGENT HIRING!
                    </div>
                    <div className="mt-6 flex flex-col flex-grow">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">HR Coordinator</h3>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-700">Butuan Depot</span>
                        <span className="text-sm text-gray-500">Posted 1 day ago</span>
                      </div>
                      <p className="text-gray-700 mb-4">
                        We are looking for a detail-oriented and proactive HR Coordinator
                        to support daily human resources operations.
                      </p>
                      <div className="mb-4 flex-grow flex-grow">
                        <h4 className="font-semibold text-gray-800 mb-2">
                          Main Responsibilities
                        </h4>
                        <ul className="text-sm text-gray-700 space-y-1">
                          <li>• Assist with recruitment activities</li>
                          <li>• Coordinate onboarding and offboarding processes</li>
                          <li>• Maintain and update employee records</li>
                          <li>• Respond to employee inquiries</li>
                          <li>• Prepare HR-related reports</li>
                          <li>• Support the HR team</li>
                        </ul>
                      </div>
                      <button
                        className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors mt-auto"
                        onClick={() => {
                          setSelectedJob({
                            id: 'static-hr',
                            title: 'HR Coordinator',
                            depot: 'Butuan Depot',
                            description: 'Static card',
                            responsibilities: []
                          });
                          setShowModal(true);
                        }}
                      >
                        View
                      </button>
                    </div>
                  </div>

                  {/* ... your other static cards remain unchanged ... */}
                </div>
              )}
            </div>
          </section>

          <section className={`p-4 ${activeTab === 'Applications' ? '' : 'hidden'}`}></section>
          <section className={`p-4 ${activeTab === 'Notifications' ? '' : 'hidden'}`}></section>

          <section className={`p-4 ${activeTab === 'Profile' ? '' : 'hidden'}`}>
            {/* your profile panel stays identical (unchanged) */}
            {/* ... omitted for brevity – keep your original Profile section code ... */}
          </section>

            <section className={`p-4 ${activeTab === "Notifications" ? "" : "hidden"}`}>
                
            </section>

            <section className={`p-4 ${activeTab === "Profile" ? "" : "hidden"}`}>
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Profile Information</h2>
                        
                        {/* Personal Information */}
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div>
                                    <span className="font-bold">Full Name:</span> Dela Cruz, Juan
                                </div>
                                <div>
                                    <span className="font-bold">Address:</span> Blk 4 Lot 159 Papaya St., Brgy. San Lupalop, Pasig City 1860
                                </div>
                                <div>
                                    <span className="font-bold">Contact Number:</span> 09123456789
                                </div>
                                <div>
                                    <span className="font-bold">Email:</span> delacruzjuan@gmail.com
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <span className="font-bold">Sex:</span> Male
                                </div>
                                <div>
                                    <span className="font-bold">Birthday:</span> 10/10/1978
                                </div>
                                <div>
                                    <span className="font-bold">Age:</span> 47
                                </div>
                                <div>
                                    <span className="font-bold">Marital Status:</span> Married
                                </div>
                            </div>
                        </div>
                        
                        <div className="border-t border-gray-300 my-6"></div>
                        
                        {/* Application Information */}
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div>
                                    <span className="font-bold">Application ID:</span> APP-2024-001
                                </div>
                                <div>
                                    <span className="font-bold">Applied Position:</span> Delivery Driver
                                </div>
                                <div>
                                    <span className="font-bold">Preferred Depot:</span> Pasig
                                </div>
                                <div>
                                    <span className="font-bold">Application Date:</span> 10/10/2024
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <span className="font-bold">Application Status:</span> 
                                    <span className="ml-2 px-2 py-1 bg-orange-500 text-white text-xs rounded">Under Review</span>
                                </div>
                                <div>
                                    <span className="font-bold">Resume:</span> <a href="#" className="text-blue-600">delacruzresume.pdf</a>
                                </div>
                                <div>
                                    <span className="font-bold">Available Start Date:</span> 11/01/2024
                                </div>
                                <div>
                                    <span className="font-bold">How did you learn about us:</span> Job Portal
                                </div>
                            </div>
                        </div>
                        
                        <div className="border-t border-gray-300 my-6"></div>
                        
                        {/* Education & Skills */}
                        <div className="space-y-4">
                            <div>
                                <span className="font-bold">Educational Attainment:</span> High School Graduate
                            </div>
                            <div>
                                <span className="font-bold">Institution Name:</span> Pasig High School
                            </div>
                            <div>
                                <span className="font-bold">Year Graduated:</span> 1996
                            </div>
                            <div>
                                <span className="font-bold">Skills:</span> Driving, Customer Service, Logistics, Time Management
                            </div>
                        </div>
                        
                        <div className="border-t border-gray-300 my-6"></div>
                        
                        {/* License Information */}
                        <div className="space-y-4">
                            <div>
                                <span className="font-bold">Driver's License:</span> Yes
                            </div>
                            <div>
                                <span className="font-bold">License Type:</span> Code 3 (Automatic clutch up to 4500kg)
                            </div>
                            <div>
                                <span className="font-bold">License Expiry Date:</span> 10/10/2025
                            </div>
                            <div>
                                <span className="font-bold">Government IDs:</span> SSS, PhilHealth, TIN
                            </div>
                        </div>
                        
                        <div className="border-t border-gray-300 my-6"></div>
                        
                        {/* Work Experience */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-800">Previous Work Experience</h3>
                            <div className="bg-gray-50 p-4 rounded-md">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="font-bold">Company:</span> ABC Logistics, Manila
                                    </div>
                                    <div>
                                        <span className="font-bold">Position:</span> Delivery Driver
                                    </div>
                                    <div>
                                        <span className="font-bold">Duration:</span> 2015 - 2020
                                    </div>
                                    <div>
                                        <span className="font-bold">Reason for Leaving:</span> Seeking new opportunities
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="border-t border-gray-300 my-6"></div>
                        
                        {/* Character References */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-800">Character References</h3>
                            <div className="space-y-3">
                                <div className="bg-gray-50 p-4 rounded-md">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <span className="font-bold">Name:</span> John Smith
                                        </div>
                                        <div>
                                            <span className="font-bold">Contact:</span> 09123456780
                                        </div>
                                        <div>
                                            <span className="font-bold">Remarks:</span> Reliable and hardworking
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-md">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <span className="font-bold">Name:</span> Jane Doe
                                        </div>
                                        <div>
                                            <span className="font-bold">Contact:</span> 09123456781
                                        </div>
                                        <div>
                                            <span className="font-bold">Remarks:</span> Honest and punctual
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-end mt-6">
                            <button className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                                Edit Profile
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {showModal && (
              <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
                <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] border-2 border-black overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">Submit Application</h2>
                    <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                  </div>
                  <form className="p-4 overflow-y-auto max-h-[80vh] space-y-4" onSubmit={(e) => {
                    e.preventDefault();
                    setShowModal(false);
                    setShowSummary(true);
                  }}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                        <input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                        <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                        <input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" />
                      </div>
                    </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address:
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Street/Village *
                        </label>
                        <input
                          type="text"
                          name="street"
                          value={form.street}
                          onChange={handleInput}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Barangay *
                        </label>
                        <input
                          type="text"
                          name="barangay"
                          value={form.barangay}
                          onChange={handleInput}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">City *</label>
                        <input
                          type="text"
                          name="city"
                          value={form.city}
                          onChange={handleInput}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Zip Code *</label>
                        <input
                          type="text"
                          name="zip"
                          value={form.zip}
                          onChange={handleInput}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact + Email */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Number *
                      </label>
                      <input
                        type="tel"
                        name="contact"
                        value={form.contact}
                        onChange={handleInput}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleInput}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                  </div>

                  {/* Birthday + Marital */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Birthday *
                      </label>
                      <input
                        type="date"
                        name="birthday"
                        value={form.birthday}
                        onChange={handleInput}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Marital Status
                      </label>
                      <select
                        name="maritalStatus"
                        value={form.maritalStatus}
                        onChange={handleInput}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                      >
                        <option value="">Select</option>
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                        <option value="widowed">Widowed</option>
                        <option value="divorced">Divorced</option>
                      </select>
                    </div>
                  </div>

                  {/* Sex */}
                  <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-gray-700">Sex:</label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="sex"
                        value="Male"
                        checked={form.sex === 'Male'}
                        onChange={handleInput}
                        className="mr-1"
                      />
                      <span className="text-sm">Male</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="sex"
                        value="Female"
                        checked={form.sex === 'Female'}
                        onChange={handleInput}
                        className="mr-1"
                      />
                      <span className="text-sm">Female</span>
                    </label>
                  </div>

                  {/* StartDate + HeardFrom */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Available Start Date:
                      </label>
                      <input
                        type="date"
                        name="startDate"
                        value={form.startDate}
                        onChange={handleInput}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        How did you learn about our company?
                      </label>
                      <select
                        name="heardFrom"
                        value={form.heardFrom}
                        onChange={handleInput}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                      >
                        <option value="">Select an answer</option>
                        <option value="Job Portal">Job Portal</option>
                        <option value="Referral">Referral</option>
                        <option value="Social Media">Social Media</option>
                        <option value="Advertisement">Advertisement</option>
                      </select>
                    </div>
                  </div>

                  {/* Employed */}
                  <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-gray-700">
                      Currently Employed?
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="employed"
                        value="Yes"
                        checked={form.employed === 'Yes'}
                        onChange={handleInput}
                        className="mr-1"
                      />
                      <span className="text-sm">Yes</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="employed"
                        value="No"
                        checked={form.employed === 'No'}
                        onChange={handleInput}
                        className="mr-1"
                      />
                      <span className="text-sm">No</span>
                    </label>
                  </div>

                  {/* Resume */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Upload Resume:
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.docx"
                      onChange={handleResumeChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      PDF/DOCX file. Max 10MB
                    </p>
                  </div>

                  {/* IDs */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Do you have the following? (Check all that apply):
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="hasSSS"
                        checked={form.hasSSS}
                        onChange={handleCheckbox}
                        className="mr-2"
                      />
                      <span className="text-sm">SSS</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="hasPhilHealth"
                        checked={form.hasPhilHealth}
                        onChange={handleCheckbox}
                        className="mr-2"
                      />
                      <span className="text-sm">PhilHealth</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="hasTIN"
                        checked={form.hasTIN}
                        onChange={handleCheckbox}
                        className="mr-2"
                      />
                      <span className="text-sm">TIN</span>
                    </label>
                  </div>

                  {/* Education */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Educational Attainment:
                    </label>

                    {/* Row 1 */}
                    <select
                      name="edu1Level"
                      value={form.edu1Level}
                      onChange={handleInput}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none"
                    >
                      <option>Elementary School</option>
                      <option>High School Graduate</option>
                      <option>Secondary School Graduate</option>
                      <option>College Graduate</option>
                    </select>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="Institution"
                        name="edu1Institution"
                        value={form.edu1Institution}
                        onChange={handleInput}
                        className="mr-2 border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Year Finished (yyyy)"
                        name="edu1Year"
                        value={form.edu1Year}
                        onChange={handleInput}
                        className="mr-2 border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none"
                      />
                    </div>

                    {/* Row 2 */}
                    <div className="flex gap-1 mb-2">
                      <input
                        type="text"
                        placeholder="Institution"
                        name="edu2Institution"
                        value={form.edu2Institution}
                        onChange={handleInput}
                        className="mr-2 border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Year Finished (yyyy)"
                        name="edu2Year"
                        value={form.edu2Year}
                        onChange={handleInput}
                        className="mr-2 border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none"
                      />
                    </div>

                    {/* Skills */}
                    <label className="flex items-center">
                      <span className="text-sm mt-4 font-medium">
                        Please list your skills
                      </span>
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="Skill"
                        name="skill1"
                        value={form.skill1}
                        onChange={handleInput}
                        className="mr-2 border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Skill"
                        name="skill2"
                        value={form.skill2}
                        onChange={handleInput}
                        className="mr-2 border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Skill"
                        name="skill3"
                        value={form.skill3}
                        onChange={handleInput}
                        className="mr-2 border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none"
                      />
                    </div>

                    {/* License */}
                    <label className="flex items-center">
                      <span className="text-sm mt-4 font-medium">License Information</span>
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="License Type (e.g., Code 3)"
                        name="licenseType"
                        value={form.licenseType}
                        onChange={handleInput}
                        className="mr-2 border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="License Expiry Date (yyyy-mm-dd)"
                        name="licenseExpiry"
                        value={form.licenseExpiry}
                        onChange={handleInput}
                        className="mr-2 border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Work Experiences (controlled) */}
                  <div className="mt-6 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Previous Work Experiences
                    </h3>
                    {workExperiences.map((exp, index) => (
                      <div
                        key={index}
                        className="border p-4 rounded-md space-y-3 bg-gray-50"
                      >
                        <h4 className="font-medium text-gray-700">
                          Work Experience #{index + 1}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Company Name and Location
                            </label>
                            <input
                              type="text"
                              value={exp.company || ''}
                              onChange={(e) =>
                                updateWork(index, 'company', e.target.value)
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Role/Title
                            </label>
                            <input
                              type="text"
                              value={exp.role || ''}
                              onChange={(e) => updateWork(index, 'role', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date Employed (period)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., 2015-2020"
                            value={exp.period || ''}
                            onChange={(e) => updateWork(index, 'period', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Reason for Leaving
                          </label>
                          <textarea
                            value={exp.reason || ''}
                            onChange={(e) =>
                              updateWork(index, 'reason', e.target.value)
                            }
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                          />
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setWorkExperiences([...workExperiences, {}])}
                      className="text-red-600 hover:underline text-sm font-medium"
                    >
                      + add another work experience
                    </button>
                  </div>

                  {/* Character References (controlled) */}
                  <div className="mt-6 space-y-4">
                    <div className="flex items-start space-x-2">
                      <h3 className="text-lg font-semibold text-gray-800">
                        Character Reference (required only for non-drivers)
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      List at least three (3) characters (referrers only for non-delivery
                      applicants):
                    </p>
                    <div className="space-y-3">
                      {characterReferences.map((ref, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Name
                            </label>
                            <input
                              type="text"
                              value={ref.name || ''}
                              onChange={(e) => updateRef(index, 'name', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Contact Number/s
                            </label>
                            <input
                              type="text"
                              value={ref.contact || ''}
                              onChange={(e) => updateRef(index, 'contact', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Remarks
                            </label>
                            <textarea
                              rows={2}
                              value={ref.remarks || ''}
                              onChange={(e) => updateRef(index, 'remarks', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setCharacterReferences([...characterReferences, {}])}
                      className="text-red-600 hover:underline text-sm font-medium"
                    >
                      + add another person
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between pt-4 border-t mt-6">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Proceed
                    </button>
                  </div>

                  <p className="text-xs text-gray-600 mt-4 p-2 bg-gray-50 rounded">
                    By submitting an application for this position, you consent to
                    Roadwise collecting and storing your personal information as part of
                    the recruitment process.
                  </p>
                </form>
              </div>
            </div>
          )}

          {/* Summary (now shows user input) */}
          {showSummary && (
            <div
              className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50"
              onClick={() => setShowSummary(false)}
            >
              <div
                className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] border-2 border-black overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center p-4 border-b">
                  <h2 className="text-xl font-bold text-gray-800">
                    Application Summary{(selectedJob || newJob) ? ` — ${(selectedJob || newJob).title} (${(selectedJob || newJob).depot})` : ''}
                  </h2>
                  <button
                    onClick={() => setShowSummary(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    &times;
                  </button>
                </div>

                <div className="p-4 overflow-y-auto max-h-[80vh] space-y-6">
                  {/* Personal */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Personal Information
                    </h3>
                    <div className="border border-gray-300">
                      <div className="grid grid-cols-2 bg-gray-100 p-2 font-medium">
                        <div>Name</div>
                        <div>
                          {`${form.firstName || ''} ${form.middleName || ''} ${form.lastName || ''}`.trim()}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 p-2">
                        <div>Address</div>
                        <div>
                          {`${form.street || ''}, ${form.barangay || ''}, ${form.city || ''}, ${form.zip || ''}`}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 bg-gray-100 p-2">
                        <div>Contact Number</div>
                        <div>{form.contact || '-'}</div>
                      </div>
                      <div className="grid grid-cols-2 p-2">
                        <div>Email</div>
                        <div>{form.email || '-'}</div>
                      </div>
                      <div className="grid grid-cols-2 bg-gray-100 p-2">
                        <div>Birthday</div>
                        <div>{form.birthday || '-'}</div>
                      </div>
                      <div className="grid grid-cols-2 p-2">
                        <div>Marital Status</div>
                        <div>{form.maritalStatus || '-'}</div>
                      </div>
                      <div className="grid grid-cols-2 bg-gray-100 p-2">
                        <div>Sex</div>
                        <div>{form.sex || '-'}</div>
                      </div>
                      <div className="grid grid-cols-2 p-2">
                        <div>Available Start Date</div>
                        <div>{form.startDate || '-'}</div>
                      </div>
                      <div className="grid grid-cols-2 bg-gray-100 p-2">
                        <div>How did you learn about our company?</div>
                        <div>{form.heardFrom || '-'}</div>
                      </div>
                      <div className="grid grid-cols-2 p-2">
                        <div>Currently Employed?</div>
                        <div>{form.employed || '-'}</div>
                      </div>
                      <div className="grid grid-cols-2 bg-gray-100 p-2">
                        <div>Resume</div>
                        <div>{form.resumeName || 'Not uploaded'}</div>
                      </div>
                      <div className="grid grid-cols-2 p-2">
                        <div>Government IDs</div>
                        <div>
                          {[
                            form.hasSSS ? 'SSS' : null,
                            form.hasPhilHealth ? 'PhilHealth' : null,
                            form.hasTIN ? 'TIN' : null,
                          ]
                            .filter(Boolean)
                            .join(', ') || 'None'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Education */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Education</h3>
                    <div className="border border-gray-300">
                      <div className="grid grid-cols-3 bg-gray-100 p-2 font-medium">
                        <div>Level</div>
                        <div>Institution</div>
                        <div>Year Finished</div>
                      </div>
                      <div className="grid grid-cols-3 p-2">
                        <div>{form.edu1Level || '-'}</div>
                        <div>{form.edu1Institution || '-'}</div>
                        <div>{form.edu1Year || '-'}</div>
                      </div>
                      <div className="grid grid-cols-3 bg-gray-100 p-2">
                        <div>{form.edu2Level || '-'}</div>
                        <div>{form.edu2Institution || '-'}</div>
                        <div>{form.edu2Year || '-'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Skills */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Skills</h3>
                    <div className="border border-gray-300 p-2">
                      {[form.skill1, form.skill2, form.skill3].filter(Boolean).join(', ') ||
                        '-'}
                    </div>
                  </div>

                  {/* License */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      License Information
                    </h3>
                    <div className="border border-gray-300">
                      <div className="grid grid-cols-2 bg-gray-100 p-2 font-medium">
                        <div>License Type</div>
                        <div>Expiry Date</div>
                      </div>
                      <div className="grid grid-cols-2 p-2">
                        <div>{form.licenseType || '-'}</div>
                        <div>{form.licenseExpiry || '-'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Work Experience */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Work Experience
                    </h3>
                    <div className="border border-gray-300">
                      <div className="grid grid-cols-4 bg-gray-100 p-2 font-medium">
                        <div>Company</div>
                        <div>Role</div>
                        <div>Period</div>
                        <div>Reason for Leaving</div>
                      </div>
                      {workExperiences.length === 0 ? (
                        <div className="p-2">-</div>
                      ) : (
                        workExperiences.map((w, i) => (
                          <div
                            key={i}
                            className={`grid grid-cols-4 p-2 ${
                              i % 2 === 1 ? 'bg-gray-100' : ''
                            }`}
                          >
                            <div>{w.company || '-'}</div>
                            <div>{w.role || '-'}</div>
                            <div>{w.period || '-'}</div>
                            <div>{w.reason || '-'}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Character References */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Character References
                    </h3>
                    <div className="border border-gray-300">
                      <div className="grid grid-cols-3 bg-gray-100 p-2 font-medium">
                        <div>Name</div>
                        <div>Contact</div>
                        <div>Remarks</div>
                      </div>
                      {characterReferences.length === 0 ? (
                        <div className="p-2">-</div>
                      ) : (
                        characterReferences.map((r, i) => (
                          <div
                            key={i}
                            className={`grid grid-cols-3 p-2 ${
                              i % 2 === 1 ? 'bg-gray-100' : ''
                            }`}
                          >
                            <div>{r.name || '-'}</div>
                            <div>{r.contact || '-'}</div>
                            <div>{r.remarks || '-'}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between pt-4 border-t mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSummary(false);
                        setShowModal(true);
                      }}
                      className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                      Start Over
                    </button>
                    <button
                      type="button"
                      onClick={handleFinalSubmit}
                      className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Submit
                    </button>

                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ApplicantLHome;
