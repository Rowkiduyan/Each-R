  import { Link, useNavigate, useLocation } from 'react-router-dom';
  import { useState, useEffect } from 'react';
  import { supabase } from './supabaseClient';

<<<<<<< HEAD
function ApplicantLHome() {
const navigate = useNavigate();
const location = useLocation();
const newJob = location.state?.newJob;
const [activeTab, setActiveTab] = useState("Home");
const [showModal, setShowModal] = useState(false);
const [showSummary, setShowSummary] = useState(false);
const [workExperiences, setWorkExperiences] = useState([{}]);
const [characterReferences, setCharacterReferences] = useState([{}, {}, {}]);

// Profile state
const [isEditMode, setIsEditMode] = useState(false);
const [profileData, setProfileData] = useState(null);
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [profileForm, setProfileForm] = useState({
  address: '',
  sex: '',
  birthday: '',
  age: '',
  marital_status: '',
  educational_attainment: '',
  institution_name: '',
  year_graduated: '',
  skills: '',
  work_experiences: [],
  character_references: []
});

// Fetch profile data
useEffect(() => {
  const fetchProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('applicants')
        .select('*')
        .eq('email', user.email)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setLoading(false);
        return;
      }

      if (data) {
        setProfileData(data);
        setProfileForm({
          address: data.address || '',
          sex: data.sex || '',
          birthday: data.birthday || '',
          age: data.age || '',
          marital_status: data.marital_status || '',
          educational_attainment: data.educational_attainment || '',
          institution_name: data.institution_name || '',
          year_graduated: data.year_graduated || '',
          skills: data.skills || '',
        });
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  fetchProfileData();
}, []);

// Calculate age from birthday
const calculateAge = (birthday) => {
  if (!birthday) return '';
  const today = new Date();
  const birthDate = new Date(birthday);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age.toString();
};

// Handle form input change
const handleFormChange = (field, value) => {
  const updatedForm = {
    ...profileForm,
    [field]: value
  };
  
  if (field === 'birthday') {
    updatedForm.age = calculateAge(value);
  }
  
  setProfileForm(updatedForm);
};

// Handle edit button
const handleEdit = () => {
  setIsEditMode(true);
};

// Handle save
const handleSave = async () => {
  setSaving(true);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('User not found');
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('applicants')
      .update({
        address: profileForm.address,
        sex: profileForm.sex,
        birthday: profileForm.birthday,
        age: profileForm.age,
        marital_status: profileForm.marital_status,
        educational_attainment: profileForm.educational_attainment,
        institution_name: profileForm.institution_name,
        year_graduated: profileForm.year_graduated,
        skills: profileForm.skills,
        work_experiences: profileForm.work_experiences,
        character_references: profileForm.character_references
      })
      .eq('email', user.email);

    if (error) {
      console.error('Error updating profile:', error);
      alert('Error saving profile. Please try again.');
      setSaving(false);
      return;
    }

    const { data: updatedData, error: fetchError } = await supabase
      .from('applicants')
      .select('*')
      .eq('email', user.email)
      .single();

    if (!fetchError && updatedData) {
      setProfileData(updatedData);
    }

    setIsEditMode(false);
    alert('Profile updated successfully!');
  } catch (err) {
    console.error('Error:', err);
    alert('Error saving profile. Please try again.');
  } finally {
    setSaving(false);
  }
};

// Handle cancel
const handleCancel = () => {
  if (profileData) {
    setProfileForm({
      address: profileData.address || '',
      sex: profileData.sex || '',
      birthday: profileData.birthday || '',
      age: profileData.age || '',
      marital_status: profileData.marital_status || '',
      educational_attainment: profileData.educational_attainment || '',
      institution_name: profileData.institution_name || '',
      year_graduated: profileData.year_graduated || '',
      skills: profileData.skills || '',
      work_experiences: profileData.work_experiences || [],
      character_references: profileData.character_references || []
    });
  }
  setIsEditMode(false);
};

// Format full name
const getFullName = () => {
  if (!profileData) return 'Loading...';
  const { lname, fname, mname } = profileData;
  const middleInitial = mname ? ` ${mname.charAt(0)}.` : '';
  return `${lname || ''}, ${fname || ''}${middleInitial}`;
};

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
};

// Format date for input
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};


  return (
<div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0 text-red-600 font-bold text-2xl italic">
                Each-R
=======
  function ApplicantLHome() {
    const navigate = useNavigate();
    const location = useLocation();
    const newJob = location.state?.newJob;

    const [activeTab, setActiveTab] = useState('Home');
    const [showModal, setShowModal] = useState(false);
    const [showSummary, setShowSummary] = useState(false);

    // NEW: jobs from DB + selected job
    const [jobs, setJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [jobsLoading, setJobsLoading] = useState(true);

    // --- MAIN FORM STATE (simple + flat so it’s easy to wire) ---
    const [form, setForm] = useState({
      firstName: '',
      middleName: '',
      lastName: '',
      street: '',
      barangay: '',
      city: '',
      zip: '',
      contact: '',
      email: '',
      birthday: '',
      maritalStatus: '',
      sex: '',
      startDate: '',
      heardFrom: '',
      employed: '',
      resumeName: '',
      hasSSS: false,
      hasPhilHealth: false,
      hasTIN: false,

      // education (two rows just like your Summary)
      edu1Level: 'College Graduate',
      edu1Institution: '',
      edu1Year: '',
      edu2Level: 'High School Graduate',
      edu2Institution: '',
      edu2Year: '',

      // skills
      skill1: '',
      skill2: '',
      skill3: '',

      // license
      licenseType: '',
      licenseExpiry: '',
    });

    // keep using your arrays for dynamic sections
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
>>>>>>> a33d790ebc7d47da76fda5401073977c790e5692
              </div>

<<<<<<< HEAD
            <div className="flex-1 flex justify-center">
              <nav className="flex space-x-8">
                <button 
                  onClick={() => setActiveTab("Home")}
                  className={`pb-2 font-medium ${
                    activeTab === "Home" 
                      ? "text-red-600 border-b-2 border-red-600" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Home
                </button>
                <button 
                  onClick={() => {
                    setActiveTab("Applications");
                    navigate('/applicant/applications');
                  }}
                  className={`pb-2 font-medium ${
                    activeTab === "Applications" 
                      ? "text-red-600 border-b-2 border-red-600" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
=======
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
>>>>>>> a33d790ebc7d47da76fda5401073977c790e5692
                >
                  Logout
                </button>
<<<<<<< HEAD
                <button 
                  onClick={() => setActiveTab("Profile")}
                  className={`pb-2 font-medium ${
                    activeTab === "Profile" 
                      ? "text-red-600 border-b-2 border-red-600" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Profile
                </button>
              </nav>
            </div>

            <div className="flex items-center space-x-3">
              <Link to="/applicant/login" className="text-gray-600 hover:text-gray-900 font-medium">Logout</Link>
=======
              </div>

>>>>>>> a33d790ebc7d47da76fda5401073977c790e5692
            </div>
          </div>
        </div>

<<<<<<< HEAD
      {/* Search Bar */}
      {activeTab !== "Profile" && (
      <div className="max-w-7xl mx-auto px-6 mt-4 flex justify-end">
        <input
          placeholder="Search"
          className="w-80 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
      </div>
      )}
          
      
      <div className="flex flex-col items-center  min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">      
            <section className={`p-4 ${activeTab === "Home" ? "" : "hidden"}`}>

            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {newJob && (
                      <div className="bg-white rounded-lg shadow-md p-6 relative overflow-hidden flex flex-col">
                        {newJob.urgent && (
                          <div className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-4 py-1 transform">URGENT HIRING!</div>
                        )}
                        <div className="mt-6 flex flex-col flex-grow">
                          <h3 className="text-xl font-bold text-gray-800 mb-2">{newJob.title}</h3>
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-gray-700">{newJob.depot}</span>
                            <span className="text-sm text-gray-500">Posted {newJob.posted || 'Just now'}</span>
                          </div>
                          <p className="text-gray-700 mb-4">{newJob.description}</p>
                          {Array.isArray(newJob.responsibilities) && newJob.responsibilities.length > 0 && (
                            <div className="mb-4">
                              <h4 className="font-semibold text-gray-800 mb-2">Main Responsibilities</h4>
                              <ul className="text-sm text-gray-700 space-y-1">
                                {newJob.responsibilities.filter(Boolean).map((r, i) => (
                                  <li key={i}>• {r}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors mt-auto" onClick={() => setShowModal(true)}>
                            View
                          </button>
                        </div>
                      </div>
                    )}

                        <div className="bg-white rounded-lg shadow-md p-6 relative overflow-hidden flex flex-col">
                            <div className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-4 py-1 transform">
                                URGENT HIRING!
                            </div>
            <div className="mt-6 flex flex-col flex-grow">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Delivery Driver</h3>
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-gray-700">Pasig Depot</span>
                                <span className="text-sm text-gray-500">Posted 10hrs ago</span>
                            </div>
                            <p className="text-gray-700 mb-4">
                                We are seeking a reliable and safety-conscious Truck Driver to transport goods efficiently and on schedule to various destinations.
                            </p>
                            <div className="mb-4">
                                <h4 className="font-semibold text-gray-800 mb-2">Main Responsibilities</h4>
                                <ul className="text-sm text-gray-700 space-y-1">
                                    <li>• Safely operate company-based trucks</li>
                                    <li>• Conduct pre-trip and post-trip inspections of vehicle systems and equipment</li>
                                    <li>• Load and unload cargo</li>
                                    <li>• Ensure accurate documentation</li>
                                </ul>
                            </div>
                                <button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors mt-auto" onClick={() => setShowModal(true)}>
                                View
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-md p-6 relative overflow-hidden flex flex-col">
                                 <div className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-4 py-1 transform">
                                    URGENT HIRING!
                                    </div>
                                    <div className="mt-6 flex flex-col flex-grow">
                                    <h3 className="text-xl font-bold text-gray-800 mb-2">Delivery Helper</h3>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-gray-700">Butuan Depot</span>
                                        <span className="text-sm text-gray-500">Posted 1 day ago</span>
                                    </div>
                                    <p className="text-gray-700 mb-4">
                                        We are seeking a reliable and safety-conscious Truck Driver to transport goods efficiently and on schedule to various destinations.
                                    </p>
                                    <div className="mb-4 flex-grow">
                                        <h4 className="font-semibold text-gray-800 mb-2">Main Responsibilities</h4>
                                        <ul className="text-sm text-gray-700 space-y-1">
                                        <li>• Safely operate company-based trucks</li>
                                        <li>• Conduct pre-trip and post-trip inspections of vehicle systems and equipment</li>
                                        <li>• Load and unload cargo</li>
                                        <li>• Ensure accurate documentation</li>
                                        </ul>
                                    </div>
                                    <button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors mt-auto" onClick={() => setShowModal(true)}>
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
                                We are looking for a detail-oriented and proactive HR Coordinator to support daily human resources operations.
                            </p>
                            <div className="mb-4 flex-grow flex-grow">
                                <h4 className="font-semibold text-gray-800 mb-2">Main Responsibilities</h4>
                                <ul className="text-sm text-gray-700 space-y-1">
                                <li>• Assist with recruitment activities</li>
                                <li>• Coordinate onboarding and offboarding processes</li>
                                <li>• Maintain and update employee records</li>
                                <li>• Respond to employee inquiries</li>
                                <li>• Prepare HR-related reports</li>
                                <li>• Support the HR team</li>
                                </ul>
                            </div>
                            <button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors mt-auto" onClick={() => setShowModal(true)}>
                                View
                            </button>
                            </div>
                        </div>

                        
                        <div className="bg-white rounded-lg shadow-md p-6 flex flex-col">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">HR Coordinator</h3>
                            <div className="flex justify-between items-center mb-3">
                            <span className="text-gray-700">Cagayan Depot</span>
                            <span className="text-sm text-gray-500">Posted May 20</span>
                            </div>
                            <p className="text-gray-700 mb-4">
                            We are looking for a detail-oriented and proactive HR Coordinator to support daily human resources operations.
                            </p>
                            <div className="mb-4 flex-grow">
                            <h4 className="font-semibold text-gray-800 mb-2">Main Responsibilities</h4>
                            <ul className="text-sm text-gray-700 space-y-1">
                                <li>• Assist with recruitment activities</li>
                                <li>• Coordinate onboarding and offboarding processes</li>
                                <li>• Maintain and update employee records</li>
                                <li>• Respond to employee inquiries</li>
                                <li>• Prepare HR-related reports</li>
                            </ul>
                            </div>
                            <button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors mt-auto" onClick={() => setShowModal(true)}>
                            View
                            </button>
                        </div>

                        
                        <div className="bg-white rounded-lg shadow-md p-6 flex flex-col">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">HR Coordinator</h3>
                            <div className="flex justify-between items-center mb-3">
                            <span className="text-gray-700">Pasig Depot</span>
                            <span className="text-sm text-gray-500">Posted May 21</span>
                            </div>
                            <p className="text-gray-700 mb-4">
                            We are looking for a detail-oriented and proactive HR Coordinator to support daily human resources operations.
                            </p>
                            <div className="mb-4 flex-grow">
                            <h4 className="font-semibold text-gray-800 mb-2">Main Responsibilities</h4>
                            <ul className="text-sm text-gray-700 space-y-1">
                                <li>• Assist with recruitment activities</li>
                                <li>• Coordinate onboarding and offboarding processes</li>
                                <li>• Maintain and update employee records</li>
                                <li>• Respond to employee inquiries</li>
                                <li>• Prepare HR-related reports</li>
                            </ul>
                            </div>
                            <button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors mt-auto" onClick={() => setShowModal(true)}>
                            View
                            </button>
                        </div>

                
                        <div className="bg-white rounded-lg shadow-md p-6 flex flex-col">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Security Personnel</h3>
                            <div className="flex justify-between items-center mb-3">
                            <span className="text-gray-700">Cebu Depot</span>
                            <span className="text-sm text-gray-500">Posted May 22</span>
                            </div>
                            <p className="text-gray-700 mb-4">
                            We are looking for a vigilant and responsible Security Personnel to protect company property, staff, and visitors by maintaining a safe and secure environment.
                            </p>
                            <div className="mb-4  flex-grow">
                            <h4 className="font-semibold text-gray-800 mb-2">Main Responsibilities</h4>
                            <ul className="text-sm text-gray-700 space-y-1">
                                <li>• Monitor and authorize entrance and departure of employees</li>
                                <li>• Conduct regular patrols</li>
                                <li>• Inspect doors, windows, and gates</li>
                                <li>• Respond to alarms, emergencies, and incidents</li>
                            </ul>
                            </div>
                            <button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors mt-auto" onClick={() => setShowModal(true)}>
                            View
                            </button>
                        </div>                                                    
                    </div>
                </div>
            </section>

            <section className={`p-4 ${activeTab === "Applications" ? "" : "hidden"}`}>
                
            </section>

            <section className={`p-4 ${activeTab === "Notifications" ? "" : "hidden"}`}>
                
            </section>

            <section className={`p-4 ${activeTab === "Profile" ? "" : "hidden"}`}>
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Profile Information</h2>
                        
                        {loading ? (
                            <div className="text-center py-8">Loading profile...</div>
                        ) : profileData ? (
                            <>
                                {/* Personal Information */}
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div>
                                            <span className="font-bold">Full Name:</span> {getFullName()}
                                        </div>
                                        <div>
                                            <span className="font-bold">Address:</span>{' '}
                                            {isEditMode ? (
                                                <input
                                                    type="text"
                                                    value={profileForm.address}
                                                    onChange={(e) => handleFormChange('address', e.target.value)}
                                                    className="ml-2 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500 w-80"
                                                />
                                            ) : (
                                                profileForm.address || 'Not provided'
                                            )}
                                        </div>
                                        <div>
                                            <span className="font-bold">Contact Number:</span> {profileData.contact_number || 'Not provided'}
                                        </div>
                                        <div>
                                            <span className="font-bold">Email:</span> {profileData.email || 'Not provided'}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <span className="font-bold">Sex:</span>{' '}
                                            {isEditMode ? (
                                                <select
                                                    value={profileForm.sex}
                                                    onChange={(e) => handleFormChange('sex', e.target.value)}
                                                    className="ml-2 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
                                                >
                                                    <option value="">Select</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                </select>
                                            ) : (
                                                profileForm.sex || 'Not provided'
                                            )}
                                        </div>
                                        <div>
                                            <span className="font-bold">Birthday:</span>{' '}
                                            {isEditMode ? (
                                                <input
                                                    type="date"
                                                    value={formatDateForInput(profileForm.birthday)}
                                                    onChange={(e) => handleFormChange('birthday', e.target.value)}
                                                    className="ml-2 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
                                                />
                                            ) : (
                                                profileForm.birthday ? formatDate(profileForm.birthday) : 'Not provided'
                                            )}
                                        </div>
                                        <div>
                                            <span className="font-bold">Age:</span>{' '}
                                            {isEditMode ? (
                                                <input
                                                    type="text"
                                                    value={profileForm.age}
                                                    readOnly
                                                    className="ml-2 px-2 py-1 border border-gray-300 rounded bg-gray-100 w-20"
                                                />
                                            ) : (
                                                profileForm.age || 'Not provided'
                                            )}
                                        </div>
                                        <div>
                                            <span className="font-bold">Marital Status:</span>{' '}
                                            {isEditMode ? (
                                                <select
                                                    value={profileForm.marital_status}
                                                    onChange={(e) => handleFormChange('marital_status', e.target.value)}
                                                    className="ml-2 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
                                                >
                                                    <option value="">Select</option>
                                                    <option value="Single">Single</option>
                                                    <option value="Married">Married</option>
                                                    <option value="Widowed">Widowed</option>
                                                    <option value="Divorced">Divorced</option>
                                                </select>
                                            ) : (
                                                profileForm.marital_status || 'Not provided'
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="border-t border-gray-300 my-6"></div>
                                
                                {/* Application Information - Non-editable */}
                                <div className="grid grid-cols-3 gap-8">
                                    <div className="space-y-4">
                                        <div>
                                            <span className="font-bold">Application ID:</span> {profileData.application_id || 'Not available'}
                                        </div>
                                        <div>
                                            <span className="font-bold">Applied Position:</span> {profileData.applied_position || 'Not available'}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <span className="font-bold">Preferred Depot:</span> {profileData.preferred_depot || 'Not available'}
                                        </div>
                                        <div>
                                            <span className="font-bold">Application Date:</span> {profileData.application_date ? formatDate(profileData.application_date) : 'Not available'}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <span className="font-bold">Application Status:</span>{' '}
                                            <span className="ml-2 px-2 py-1 bg-orange-500 text-white text-xs rounded">{profileData.application_status || 'Not available'}</span>
                                        </div>
                                        <div>
                                            <span className="font-bold">Resume:</span>{' '}
                                            {profileData.resume ? (
                                                <a href={profileData.resume} className="text-blue-600">View Resume</a>
                                            ) : (
                                                'Not available'
                                            )}
                                        </div>
                                        <div>
                                            <span className="font-bold">Available Start Date:</span> {profileData.available_start_date ? formatDate(profileData.available_start_date) : 'Not available'}
                                        </div>
                                        <div>
                                            <span className="font-bold">How did you learn about us:</span> {profileData.learned_about_us || 'Not available'}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="border-t border-gray-300 my-6"></div>
                                
                                {/* Education & Skills */}
                                <div className="space-y-4">
                                    <div>
                                        <span className="font-bold">Educational Attainment:</span>{' '}
                                        {isEditMode ? (
                                            <select
                                                value={profileForm.educational_attainment}
                                                onChange={(e) => handleFormChange('educational_attainment', e.target.value)}
                                                className="ml-2 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
                                            >
                                                <option value="">Select</option>
                                                <option value="Elementary School">Elementary School</option>
                                                <option value="High School Graduate">High School Graduate</option>
                                                <option value="Secondary School Graduate">Secondary School Graduate</option>
                                                <option value="College Graduate">College Graduate</option>
                                            </select>
                                        ) : (
                                            profileForm.educational_attainment || 'Not provided'
                                        )}
                                    </div>
                                    <div>
                                        <span className="font-bold">Institution Name:</span>{' '}
                                        {isEditMode ? (
                                            <input
                                                type="text"
                                                value={profileForm.institution_name}
                                                onChange={(e) => handleFormChange('institution_name', e.target.value)}
                                                className="ml-2 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500 w-80"
                                            />
                                        ) : (
                                            profileForm.institution_name || 'Not provided'
                                        )}
                                    </div>
                                    <div>
                                        <span className="font-bold">Year Graduated:</span>{' '}
                                        {isEditMode ? (
                                            <input
                                                type="text"
                                                value={profileForm.year_graduated}
                                                onChange={(e) => handleFormChange('year_graduated', e.target.value)}
                                                className="ml-2 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500 w-32"
                                            />
                                        ) : (
                                            profileForm.year_graduated || 'Not provided'
                                        )}
                                    </div>
                                    <div>
                                        <span className="font-bold">Skills:</span>{' '}
                                        {isEditMode ? (
                                            <input
                                                type="text"
                                                value={profileForm.skills}
                                                onChange={(e) => handleFormChange('skills', e.target.value)}
                                                placeholder="e.g., Driving, Customer Service, Logistics"
                                                className="ml-2 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500 w-96"
                                            />
                                        ) : (
                                            profileForm.skills || 'Not provided'
                                        )}
                                    </div>
                                </div>
                                
      
                                
                                
                                <div className="flex justify-end gap-3 mt-6">
                                    {isEditMode ? (
                                        <>
                                            <button
                                                onClick={handleCancel}
                                                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSave}
                                                disabled={saving}
                                                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400"
                                            >
                                                {saving ? 'Saving...' : 'Save Changes'}
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={handleEdit}
                                            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                        >
                                            Edit Profile
                                        </button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8 text-gray-500">No profile data found.</div>
                        )}
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address:</label>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Street/Village *</label>
                          <input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 text-xs" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Barangay *</label>
                          <input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 text-xs" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">City *</label>
                          <input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 text-xs" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Zip Code *</label>
                          <input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 text-xs" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number *</label>
                        <input type="tel" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                        <input type="email" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Birthday *</label>
                        <input type="date" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500">
=======
        {/* Search Bar */}
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

            {/* Submit Application Modal (now controlled inputs) */}
            {showModal && (
              <div
                className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50"
                onClick={() => setShowModal(false)}
              >
                <div
                  className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] border-2 border-black overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">
                      Submit Application{selectedJob ? ` — ${selectedJob.title} (${selectedJob.depot})` : ''}
                    </h2>
                    <button
                      onClick={() => setShowModal(false)}
                      className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                      &times;
                    </button>
                  </div>

                  <form
                    className="p-4 overflow-y-auto max-h-[80vh] space-y-4"
                    onSubmit={onSubmitApplication}
                  >
                    {/* Name */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name *
                        </label>
                        <input
                          type="text"
                          name="firstName"
                          value={form.firstName}
                          onChange={handleInput}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Middle Name
                        </label>
                        <input
                          type="text"
                          name="middleName"
                          value={form.middleName}
                          onChange={handleInput}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          name="lastName"
                          value={form.lastName}
                          onChange={handleInput}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                        />
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
>>>>>>> a33d790ebc7d47da76fda5401073977c790e5692
                          <option value="">Select</option>
                          <option value="single">Single</option>
                          <option value="married">Married</option>
                          <option value="widowed">Widowed</option>
                          <option value="divorced">Divorced</option>
                        </select>
                      </div>
                    </div>

<<<<<<< HEAD
                    <div className="flex items-center space-x-4">
                      <label className="text-sm font-medium text-gray-700">Sex:</label>
                      <label className="flex items-center">
                        <input type="radio" name="sex" value="male" className="mr-1" />
                        <span className="text-sm">Male</span>
                      </label>
                      <label className="flex items-center">
                        <input type="radio" name="sex" value="female" className="mr-1" />
=======
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
>>>>>>> a33d790ebc7d47da76fda5401073977c790e5692
                        <span className="text-sm">Female</span>
                      </label>
                    </div>

<<<<<<< HEAD
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Available Start Date:</label>
                        <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">How did you learn about our company?</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500">
                          <option value="">Select an answer</option>
                          <option value="job-portal">Job Portal</option>
                          <option value="referral">Referral</option>
                          <option value="social-media">Social Media</option>
                          <option value="advertisement">Advertisement</option>
=======
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
>>>>>>> a33d790ebc7d47da76fda5401073977c790e5692
                        </select>
                      </div>
                    </div>

<<<<<<< HEAD
                    <div className="flex items-center space-x-4">
                      <label className="text-sm font-medium text-gray-700">Currently Employed?</label>
                      <label className="flex items-center">
                        <input type="radio" name="employed" value="yes" className="mr-1" />
                        <span className="text-sm">Yes</span>
                      </label>
                      <label className="flex items-center">
                        <input type="radio" name="employed" value="no" className="mr-1" />
=======
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
>>>>>>> a33d790ebc7d47da76fda5401073977c790e5692
                        <span className="text-sm">No</span>
                      </label>
                    </div>

<<<<<<< HEAD
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Upload Resume:</label>
                      <input type="file" accept=".pdf,.docx" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" />
                      <p className="text-xs text-gray-500 mt-1">PDF/DOCX file. Max 10MB</p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Do you have the following? (Check all that apply):</label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        <span className="text-sm">SSS</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        <span className="text-sm">PhilHealth</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
=======
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
>>>>>>> a33d790ebc7d47da76fda5401073977c790e5692
                        <span className="text-sm">TIN</span>
                      </label>
                    </div>

<<<<<<< HEAD
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Educational Attainment:</label>
                      <select className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none">
=======
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
>>>>>>> a33d790ebc7d47da76fda5401073977c790e5692
                        <option>Elementary School</option>
                        <option>High School Graduate</option>
                        <option>Secondary School Graduate</option>
                        <option>College Graduate</option>
                      </select>
<<<<<<< HEAD
                      <label className="flex items-center">
                        <span className="text-sm font-medium">Institution Name</span>
                      </label>
                      <div className='flex gap-1'>
                        <label className="flex">
                          <input type="text" placeholder='Education' className="mr-2 border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none" />
                          
                        </label>
                        <label className="flex ">
                          <input type="text" placeholder='Year Finished (dd-mm-yy)' className="mr-2 border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none" />
                          
                        </label>
                      </div>
                      <div className='flex gap-1 mb-2'>
                        <label className="flex">
                          <input type="text" placeholder='Education' className="mr-2 border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none" />
                          
                        </label>
                        <label className="flex ">
                          <input type="text" placeholder='Year Finished (dd-mm-yy)' className="mr-2 border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none" />
                          
                        </label>
                      </div>
                       <label className="flex items-center">
                        <span className="text-sm mt-4 font-medium">Please list your areas of highest proficiency, special skills or other items that may
                        contribute to your abilities in performing the the positioned being applied to.</span>
                      </label>
                      <div className='flex gap-1'>
                        <label className="flex">
                          <input type="text" placeholder='Skills' className="mr-2 border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none" />
                          
                        </label>
                        <label className="flex ">
                          <input type="text" placeholder='Skills' className="mr-2 border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none" />
                          
                        </label>

                        <label className="flex ">
                          <input type="text" placeholder='Skills' className="mr-2 border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none" />
                          
                        </label>
                      </div>
                      <label className="flex items-center">
                        <span className="text-sm mt-4 font-medium">License Information</span>
                      </label>
                      <div className='flex gap-1'>
                        <label className="flex">
                          <input type="text" placeholder='License Expiry Date (dd-mm-yy)' className="w-10vh mr-2 border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none" />
                          
                        </label>
                        <label className="flex ">
                          <input type="text" placeholder='Skills' className="mr-2 border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none" />
                          
                        </label>
                        
                      </div>

                      <div className="space-y-2 mt-4">
                        <p className="text-xs text-gray-600 mb-2">To qualify as a driver, applicants must possess one of the following restrictions:</p>
                        <p className="text-xs text-gray-600 mb-2">• Code B - Equivalent to Code C in new LTO system.</p>
                        <p className="text-xs text-gray-600 mb-2">Note: Code C - Truck up to 4500kg / 8 seats</p>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm">A: All types</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm">B1: Up to 4500kg / 8 seats</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm">B2: Up to 5000kg / 10 or more seats</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm">C: 5000kg</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm">D: Bus 5000kg / 9 or more seats</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm">E: Articulated C 3500kg</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm">1: Motorcycles / Motorized Tricycle</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm">2: Vehicle up to 4500kg</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm">3: Automatic clutch up to 4500kg</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm">4: Automatic clutch up to 5000kg</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm">5: Automatic clutch above 5000kg</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm">6: Automatic clutch 160 up to 4500kg</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm">7: Articulated vehicle 160 up to 4500kg</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm">8: Articulated vehicle 160 above 4500kg</span>
                        </label>
                        <p className="text-xs text-gray-600">Note: Preference given to applicants with Code 3 or Code C.</p>
                      </div>
                      </div>

                    <div className="mt-6 space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800">Previous Work Experiences</h3>
                      {workExperiences.map((exp, index) => (
                        <div key={index} className="border p-4 rounded-md space-y-3 bg-gray-50">
                          <h4 className="font-medium text-gray-700">Work Experience #{index + 1}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name and Location</label>
                              <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Role/Title</label>
                              <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date Employed</label>
                            <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Job Notes</label>
                            <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" rows={3} />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tasks Performed</label>
                            <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" rows={3} />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Leaving</label>
                            <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" rows={2} />
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={() => setWorkExperiences([...workExperiences, {}])} className="text-red-600 hover:underline text-sm font-medium">+ add another work experience</button>
                    </div>

                    <div className="mt-6 space-y-4">
                      <div className="flex items-start space-x-2">
                        <h3 className="text-lg font-semibold text-gray-800">Character Reference (required only for non-drivers)</h3>
  
                      </div>
                      <p className="text-sm text-gray-600">List at least three (3) characters (referrers only for non-delivery applicants):</p>
=======
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
>>>>>>> a33d790ebc7d47da76fda5401073977c790e5692
                      <div className="space-y-3">
                        {characterReferences.map((ref, index) => (
                          <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
<<<<<<< HEAD
                              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                              <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number/s</label>
                              <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                              <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500" rows={2} />
=======
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
>>>>>>> a33d790ebc7d47da76fda5401073977c790e5692
                            </div>
                          </div>
                        ))}
                      </div>
<<<<<<< HEAD
                      <button type="button" onClick={() => setCharacterReferences([...characterReferences, {}])} className="text-red-600 hover:underline text-sm font-medium">+ add another person</button>
                    </div>

                    <div className="flex justify-between pt-4 border-t mt-6">
                      <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
                        Back
                      </button>
                      <button type="submit" className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                        Proceed
                      </button>
                    </div>

                    <p className="text-xs text-gray-600 mt-4 p-2 bg-gray-50 rounded">
                      By submitting an application for this position, you consent to Roadwise collecting and storing your personal information as part of the recruitment process.
                    </p>
                  </form>
                </div>
              </div>
            )}

            {showSummary && (
              <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowSummary(false)}>
                <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] border-2 border-black overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">Application Summary</h2>
                    <button onClick={() => setShowSummary(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                  </div>
                  <div className="p-4 overflow-y-auto max-h-[80vh] space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Personal Information</h3>
                      <div className="border border-gray-300">
                        <div className="grid grid-cols-2 bg-gray-100 p-2 font-medium">
                          <div>Name</div>
                          <div>Juan Dela Cruz</div>
                        </div>
                        <div className="grid grid-cols-2 p-2">
                          <div>Address</div>
                          <div>123 Main St, Barangay 1, Manila, 1000</div>
                        </div>
                        <div className="grid grid-cols-2 bg-gray-100 p-2">
                          <div>Contact Number</div>
                          <div>09123456789</div>
                        </div>
                        <div className="grid grid-cols-2 p-2">
                          <div>Email</div>
                          <div>juan.delacruz@example.com</div>
                        </div>
                        <div className="grid grid-cols-2 bg-gray-100 p-2">
                          <div>Birthday</div>
                          <div>01/01/1990</div>
                        </div>
                        <div className="grid grid-cols-2 p-2">
                          <div>Marital Status</div>
                          <div>Single</div>
                        </div>
                        <div className="grid grid-cols-2 bg-gray-100 p-2">
                          <div>Sex</div>
                          <div>Male</div>
                        </div>
                        <div className="grid grid-cols-2 p-2">
                          <div>Available Start Date</div>
                          <div>01/01/2024</div>
                        </div>
                        <div className="grid grid-cols-2 bg-gray-100 p-2">
                          <div>How did you learn about our company?</div>
                          <div>Job Portal</div>
                        </div>
                        <div className="grid grid-cols-2 p-2">
                          <div>Currently Employed?</div>
                          <div>No</div>
                        </div>
                        <div className="grid grid-cols-2 bg-gray-100 p-2">
                          <div>Resume</div>
                          <div>Uploaded</div>
                        </div>
                        <div className="grid grid-cols-2 p-2">
                          <div>Government IDs</div>
                          <div>SSS, PhilHealth, TIN</div>
=======
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
>>>>>>> a33d790ebc7d47da76fda5401073977c790e5692
                        </div>
                      </div>
                    </div>

<<<<<<< HEAD
=======
                    {/* Education */}
>>>>>>> a33d790ebc7d47da76fda5401073977c790e5692
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Education</h3>
                      <div className="border border-gray-300">
                        <div className="grid grid-cols-3 bg-gray-100 p-2 font-medium">
                          <div>Level</div>
                          <div>Institution</div>
                          <div>Year Finished</div>
                        </div>
                        <div className="grid grid-cols-3 p-2">
<<<<<<< HEAD
                          <div>College Graduate</div>
                          <div>University of the Philippines</div>
                          <div>2012</div>
                        </div>
                        <div className="grid grid-cols-3 bg-gray-100 p-2">
                          <div>High School Graduate</div>
                          <div>Manila High School</div>
                          <div>2008</div>
=======
                          <div>{form.edu1Level || '-'}</div>
                          <div>{form.edu1Institution || '-'}</div>
                          <div>{form.edu1Year || '-'}</div>
                        </div>
                        <div className="grid grid-cols-3 bg-gray-100 p-2">
                          <div>{form.edu2Level || '-'}</div>
                          <div>{form.edu2Institution || '-'}</div>
                          <div>{form.edu2Year || '-'}</div>
>>>>>>> a33d790ebc7d47da76fda5401073977c790e5692
                        </div>
                      </div>
                    </div>

<<<<<<< HEAD
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Skills</h3>
                      <div className="border border-gray-300 p-2">
                        Driving, Customer Service, Logistics
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">License Information</h3>
=======
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
>>>>>>> a33d790ebc7d47da76fda5401073977c790e5692
                      <div className="border border-gray-300">
                        <div className="grid grid-cols-2 bg-gray-100 p-2 font-medium">
                          <div>License Type</div>
                          <div>Expiry Date</div>
                        </div>
                        <div className="grid grid-cols-2 p-2">
<<<<<<< HEAD
                          <div>Code 3</div>
                          <div>01/01/2025</div>
=======
                          <div>{form.licenseType || '-'}</div>
                          <div>{form.licenseExpiry || '-'}</div>
>>>>>>> a33d790ebc7d47da76fda5401073977c790e5692
                        </div>
                      </div>
                    </div>

<<<<<<< HEAD
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Work Experience</h3>
=======
                    {/* Work Experience */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        Work Experience
                      </h3>
>>>>>>> a33d790ebc7d47da76fda5401073977c790e5692
                      <div className="border border-gray-300">
                        <div className="grid grid-cols-4 bg-gray-100 p-2 font-medium">
                          <div>Company</div>
                          <div>Role</div>
                          <div>Period</div>
                          <div>Reason for Leaving</div>
                        </div>
<<<<<<< HEAD
                        <div className="grid grid-cols-4 p-2">
                          <div>ABC Logistics, Manila</div>
                          <div>Delivery Driver</div>
                          <div>2015-2020</div>
                          <div>Seeking new opportunities</div>
                        </div>
                        <div className="grid grid-cols-4 bg-gray-100 p-2">
                          <div>XYZ Transport, Quezon City</div>
                          <div>Helper</div>
                          <div>2012-2015</div>
                          <div>Career advancement</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Character References</h3>
=======
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
>>>>>>> a33d790ebc7d47da76fda5401073977c790e5692
                      <div className="border border-gray-300">
                        <div className="grid grid-cols-3 bg-gray-100 p-2 font-medium">
                          <div>Name</div>
                          <div>Contact</div>
                          <div>Remarks</div>
                        </div>
<<<<<<< HEAD
                        <div className="grid grid-cols-3 p-2">
                          <div>John Smith</div>
                          <div>09123456780</div>
                          <div>Reliable and hardworking</div>
                        </div>
                        <div className="grid grid-cols-3 bg-gray-100 p-2">
                          <div>Jane Doe</div>
                          <div>09123456781</div>
                          <div>Honest and punctual</div>
                        </div>
                        <div className="grid grid-cols-3 p-2">
                          <div>Bob Johnson</div>
                          <div>09123456782</div>
                          <div>Team player</div>
                        </div>
=======
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
>>>>>>> a33d790ebc7d47da76fda5401073977c790e5692
                      </div>
                    </div>

                    <div className="flex justify-between pt-4 border-t mt-6">
<<<<<<< HEAD
                      <button type="button" onClick={() => {
                        setShowSummary(false);
                        setShowModal(true);
                      }} className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
                        Start Over
                      </button>
                      <button type="button" onClick={() => {
                        if (window.confirm('Are you sure you want to submit the application?')) {
                          alert('Application submitted successfully!');
                        }
                      }} className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                        Submit
                      </button>
=======
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

>>>>>>> a33d790ebc7d47da76fda5401073977c790e5692
                    </div>
                  </div>
                </div>
              </div>
            )}
<<<<<<< HEAD
        </div>



    </div>
    </div>
  );
} export default ApplicantLHome;
=======
          </div>
        </div>
      </div>
    );
  }

  export default ApplicantLHome;
>>>>>>> a33d790ebc7d47da76fda5401073977c790e5692
