  import { Link, useNavigate, useLocation } from 'react-router-dom';
  import { useState, useEffect, useRef } from 'react';
  import { supabase } from './supabaseClient';
  import LogoCropped from './layouts/photos/logo(cropped).png';
  import Roadwise from './Roadwise.png';
  import NotificationBell from './NotificationBell';

  function ApplicantLHome() {
    const navigate = useNavigate();
    const location = useLocation();
    const newJob = location.state?.newJob;
    const jobIdFromGuest = location.state?.jobId;

    const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'Home');
    const [showModal, setShowModal] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showSuccessPage, setShowSuccessPage] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showProfileIncompleteModal, setShowProfileIncompleteModal] = useState(false);
    const [profileIncompleteMessage, setProfileIncompleteMessage] = useState('');
    const [applicationTab, setApplicationTab] = useState('personal');
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const profileDropdownRef = useRef(null);
    const jobDetailsRef = useRef(null);

    const formTabs = [
      { key: 'personal', label: 'Personal' },
      { key: 'education', label: 'Education & Skills' },
      { key: 'experience', label: 'Experience' },
      { key: 'references', label: 'References' },
    ];

    const requiredFormFields = [
      { key: 'firstName', label: 'first name', tab: 'personal' },
      { key: 'lastName', label: 'last name', tab: 'personal' },
      { key: 'street', label: 'street or village', tab: 'personal' },
      { key: 'barangay', label: 'barangay', tab: 'personal' },
      { key: 'city', label: 'city', tab: 'personal' },
      { key: 'zip', label: 'zip code', tab: 'personal' },
      { key: 'contact', label: 'contact number', tab: 'personal' },
      { key: 'email', label: 'email', tab: 'personal' },
      { key: 'birthday', label: 'birthday', tab: 'personal' },
    ];


    const [isEditMode, setIsEditMode] = useState(false);
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [birthdayError, setBirthdayError] = useState('');
    const [formBirthdayError, setFormBirthdayError] = useState('');
    const [startDateError, setStartDateError] = useState('');
    const [yearErrors, setYearErrors] = useState({ edu1Year: '', edu2Year: '' });
    const [employmentPeriodErrors, setEmploymentPeriodErrors] = useState([]);
    const [referenceContactErrors, setReferenceContactErrors] = useState([]);
    const [showAllResponsibilities, setShowAllResponsibilities] = useState(false);
    const [selectedJobFromGuest, setSelectedJobFromGuest] = useState(null);
    const [profileForm, setProfileForm] = useState({
        address: '',
        street: '',
        barangay: '',
        city: '',
        zip: '',
        sex: '',
        birthday: '',
        age: '',
        marital_status: '',
        educational_attainment: '',
        institution_name: '',
        year_graduated: '',
        skills: '',
        work_experiences: [],
        character_references: [],
        preferred_depot: ''
      });

    // NEW: jobs from DB + selected job
    const [jobs, setJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [jobsLoading, setJobsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [locationInput, setLocationInput] = useState('');
    const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
    const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);

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
      marital_status: '',
      maritalStatus: '',
      sex: '',
      startDate: '',
      heardFrom: '',
      employed: '',
      resumeName: '',
      resumePath: '',
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
      skills: '',

      // license
      licenseType: '',
      licenseExpiry: '',
    });

    // keep using your arrays for dynamic sections
    const [workExperiences, setWorkExperiences] = useState([{}]);
    const [characterReferences, setCharacterReferences] = useState([{}, {}, {}]);
    const [resumeFile, setResumeFile] = useState(null);
    const [userApplication, setUserApplication] = useState(null);

    // PSGC API states for location dropdowns
    const [cities, setCities] = useState([]);
    const [barangays, setBarangays] = useState([]);
    const [profileBarangays, setProfileBarangays] = useState([]);

    // Depot options for preferred depot dropdown
    const depotOptions = [
      "Batangas", "Bulacan", "Cagayan", "Calamba", "Calbayog", "Cebu", 
      "Davao", "Dipolog", "Iloilo", "Isabela", "Kalibo", "Kidapawan", 
      "La Union", "Liip", "Manggahan", "Mindoro", "Naga", "Ozamis", 
      "Palawan", "Pampanga", "Pasig", "Sucat", "Tacloban", "Tarlac", 
      "Taytay", "Tuguegarao", "Vigan"
    ];

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
          .ilike('email', user.email)
          .maybeSingle();


          if (error) {
            console.error('Error fetching profile:', error);
            setLoading(false);
            return;
          }

          if (data) {
            console.log('Profile data found:', data);
            const addressParts = parseAddressParts(data);
            const mergedProfile = { ...data, ...addressParts };

            // Calculate age if birthday exists
            const calculatedAge = data.birthday ? calculateAge(data.birthday) : '';

            setProfileData(mergedProfile);
            setProfileForm({
              address: mergedProfile.address || '',
              street: mergedProfile.street || '',
              barangay: mergedProfile.barangay || '',
              city: mergedProfile.city || '',
              zip: mergedProfile.zip || '',
              sex: mergedProfile.sex || '',
              birthday: mergedProfile.birthday || '',
              age: calculatedAge || mergedProfile.age || '',
              marital_status: mergedProfile.marital_status || '',
              educational_attainment: mergedProfile.educational_attainment || '',
              institution_name: mergedProfile.institution_name || '',
              year_graduated: mergedProfile.year_graduated || '',
              skills: mergedProfile.skills || '',
              preferred_depot: mergedProfile.preferred_depot || ''
            });
            prefillApplicationForm(mergedProfile);
          }
        } catch (err) {
          console.error('Error:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchProfileData();
    }, []);

useEffect(() => {
  if (profileData) {
    prefillApplicationForm(profileData);
  }
}, [profileData]);

    // Profile completeness is checked when user clicks Apply button

    // Handle job from guest view - fetch the specific job and show it
    useEffect(() => {
      const fetchGuestJob = async () => {
        if (jobIdFromGuest && !loading) {
          try {
            const { data, error } = await supabase
              .from('job_posts')
              .select('*')
              .eq('id', jobIdFromGuest)
              .single();

            if (!error && data) {
              setSelectedJobFromGuest(data);
              setSelectedJob(data);
              setShowDetails(true);
              // Profile check happens when user clicks Apply button
              
              // Scroll to job details after a short delay to ensure rendering
              setTimeout(() => {
                if (jobDetailsRef.current) {
                  jobDetailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }, 100);
            }
          } catch (err) {
            console.error('Error fetching guest job:', err);
          }
        }
      };

      fetchGuestJob();
    }, [jobIdFromGuest, loading]);

    // Close dropdowns when clicking outside
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
          setShowProfileDropdown(false);
        }
      };

      if (showProfileDropdown) {
        document.addEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [showProfileDropdown]);

    useEffect(() => {
      setForm((prev) => ({
        ...prev,
        street: profileForm.street || '',
        barangay: profileForm.barangay || '',
        city: profileForm.city || '',
        zip: profileForm.zip || '',
        marital_status: profileForm.marital_status || '',
      }));
    }, [
      profileForm.street,
      profileForm.barangay,
      profileForm.city,
      profileForm.zip,
      profileForm.marital_status,
    ]);

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

    // Validate birthday
    const validateBirthday = (birthday) => {
      if (!birthday) {
        setBirthdayError('');
        return true;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const birthDate = new Date(birthday);
      birthDate.setHours(0, 0, 0, 0);

      // Check if birthday is in the future
      if (birthDate > today) {
        setBirthdayError('Birthday cannot be in the future');
        return false;
      }

      // Calculate age in years
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      // Check if age is too young (less than 15 year old)
      if (age < 15) {
        setBirthdayError('Invalid birthday. Age must be at least 15 year old.');
        return false;
      }

      setBirthdayError('');
      return true;
    };

    // Validate form birthday (for application modal)
    const validateFormBirthday = (birthday) => {
      if (!birthday) {
        setFormBirthdayError('');
        return true;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const birthDate = new Date(birthday);
      birthDate.setHours(0, 0, 0, 0);

      // Check if birthday is in the future
      if (birthDate > today) {
        setFormBirthdayError('Birthday cannot be in the future');
        return false;
      }

      // Calculate age in years
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      // Check if age is too young (less than 15 year old)
      if (age < 15) {
        setFormBirthdayError('Invalid birthday. Age must be at least 15 year old.');
        return false;
      }

      setFormBirthdayError('');
      return true;
    };

    const validateStartDate = (date) => {
      if (!date) {
        setStartDateError('');
        return true;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(date);
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate <= today) {
        setStartDateError('Available start date must be after today.');
        return false;
      }

      setStartDateError('');
      return true;
    };

    // Validate year format (4 digits, reasonable range)
    const validateYear = (year) => {
      if (!year || year.trim() === '') return ''; // Allow empty
      const yearNum = parseInt(year, 10);
      const currentYear = new Date().getFullYear();
      if (!/^\d{4}$/.test(year)) {
        return 'Please enter a valid 4-digit year (e.g., 2023)';
      }
      if (yearNum < 1950 || yearNum > currentYear) {
        return `Year must be between 1950 and ${currentYear}`;
      }
      return '';
    };

    // Validate employment period format (e.g., 2015-2020 or 2015-Present)
    const validateEmploymentPeriod = (period) => {
      if (!period || period.trim() === '') return ''; // Allow empty
      const periodPattern = /^\d{4}(-\d{4}|-Present)?$/i;
      if (!periodPattern.test(period.trim())) {
        return 'Please use format: yyyy-yyyy or yyyy-Present (e.g., 2015-2020 or 2015-Present)';
      }
      return '';
    };

    // Validate Philippine mobile number format (09XXXXXXXXX)
    const validatePhoneNumber = (phone) => {
      if (!phone || phone.trim() === '') return ''; // Allow empty
      const phonePattern = /^09\d{9}$/;
      if (!phonePattern.test(phone)) {
        return 'Please enter a valid Philippine mobile number (09XXXXXXXXX)';
      }
      return '';
    };

    // Handle form input change
    const handleFormChange = (field, value) => {
      const updatedForm = {
        ...profileForm,
        [field]: value
      };

      if (field === 'birthday') {
        validateBirthday(value);
        updatedForm.age = calculateAge(value);
      }

      setProfileForm(updatedForm);
  };

    const handleEdit = () => {
    setIsEditMode(true);
  };

  // Handle save
const handleSave = async () => {
  setSaving(true);
  setErrorMessage('');
  setSuccessMessage('');
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErrorMessage('User not found');
      setSaving(false);
      return;
    }

    // Validate birthday before saving
    if (profileForm.birthday && !validateBirthday(profileForm.birthday)) {
      setErrorMessage('Please fix the birthday field before saving.');
      setSaving(false);
      return;
    }

    const requiredFields = [
      'street',
      'barangay',
      'city',
      'zip',
      'sex',
      'birthday',
      'age',
      'marital_status',
      'educational_attainment',
      'institution_name',
      'year_graduated',
      'skills',
    ];
    const missing = requiredFields.find((key) => {
      const val = profileForm[key];
      return String(val ?? '').trim() === '';
    });
    if (missing) {
      setErrorMessage('Please fill out all fields before saving your profile.');
      setSaving(false);
      return;
    }

    const combinedAddress = [
      profileForm.street,
      profileForm.barangay,
      profileForm.city,
      profileForm.zip,
    ]
      .map((part) => String(part || '').trim())
      .filter(Boolean)
      .join(', ');

    const { error } = await supabase
      .from('applicants')
      .update({
        address: combinedAddress,
        street: profileForm.street,
        barangay: profileForm.barangay,
        city: profileForm.city,
        zip: profileForm.zip,
        sex: profileForm.sex,
        birthday: profileForm.birthday,
        age: profileForm.age,
        marital_status: profileForm.marital_status,
        educational_attainment: profileForm.educational_attainment,
        institution_name: profileForm.institution_name,
        year_graduated: profileForm.year_graduated,
        skills: profileForm.skills,
        work_experiences: profileForm.work_experiences,
        character_references: profileForm.character_references,
        preferred_depot: profileForm.preferred_depot
      })
      .ilike('email', user.email);

    if (error) {
      console.error('Error updating profile:', error);
      setErrorMessage('Error saving profile. Please try again.');
      setSaving(false);
      return;
    }

    const { data: updatedData, error: fetchError } = await supabase
      .from('applicants')
      .select('*')
      .ilike('email', user.email)
      .maybeSingle();


    if (!fetchError && updatedData) {
      const merged = { ...updatedData, ...parseAddressParts(updatedData) };
      setProfileData(merged);
      setProfileForm({
        address: merged.address || '',
        street: merged.street || '',
        barangay: merged.barangay || '',
        city: merged.city || '',
        zip: merged.zip || '',
        sex: merged.sex || '',
        birthday: merged.birthday || '',
        age: merged.age || '',
        marital_status: merged.marital_status || '',
        educational_attainment: merged.educational_attainment || '',
        institution_name: merged.institution_name || '',
        year_graduated: merged.year_graduated || '',
        skills: merged.skills || '',
        work_experiences: merged.work_experiences || [],
        character_references: merged.character_references || []
      });
      prefillApplicationForm(merged);
    }

    setIsEditMode(false);
    setSuccessMessage('Profile updated successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  } catch (err) {
    console.error('Error:', err);
    setErrorMessage('Error saving profile. Please try again.');
  } finally {
    setSaving(false);
  }
};



// Handle cancel
const handleCancel = () => {
  if (profileData) {
    setProfileForm({
      address: profileData.address || '',
      street: profileData.street || '',
      barangay: profileData.barangay || '',
      city: profileData.city || '',
      zip: profileData.zip || '',
      sex: profileData.sex || '',
      birthday: profileData.birthday || '',
      age: profileData.age || '',
      marital_status: profileData.marital_status || '',
      educational_attainment: profileData.educational_attainment || '',
      institution_name: profileData.institution_name || '',
      year_graduated: profileData.year_graduated || '',
      skills: profileData.skills || '',
      work_experiences: profileData.work_experiences || [],
      character_references: profileData.character_references || [],
      preferred_depot: profileData.preferred_depot || ''
    });
  }
  setBirthdayError('');
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




    const parseSkills = (value = '') =>
      value
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean);
    const parseAddressParts = (record = {}) => {
      const address = record.address || '';
      const parts = address
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);

      return {
        street: record.street || parts[0] || '',
        barangay: record.barangay || parts[1] || '',
        city: record.city || parts[2] || '',
        zip: record.zip || parts[3] || '',
      };
    };

    const prefillApplicationForm = (profile) => {
      if (!profile) return;
      const skillsValue = Array.isArray(profile.skills)
        ? profile.skills.join(', ')
        : profile.skills || '';
      const { street, barangay, city, zip } = parseAddressParts(profile);

      setForm((prev) => ({
        ...prev,
        firstName: profile.fname || '',
        middleName: profile.mname || '',
        lastName: profile.lname || '',
        street: street || '',
        barangay: barangay || '',
        city: city || '',
        zip: zip || '',
        contact: profile.contact_number || '',
        email: profile.email || '',
        birthday: profile.birthday || '',
        maritalStatus: profile.marital_status ? profile.marital_status.toLowerCase() : '',
        sex: profile.sex || '',
        skills: skillsValue,
        edu1Level: profile.educational_attainment || prev.edu1Level,
        edu1Institution: profile.institution_name || '',
        edu1Year: profile.year_graduated || '',
      }));
    };

    // helpers
    const handleInput = (e) => {
      const { name, value } = e.target;
      setForm((f) => ({ ...f, [name]: value }));
      
      if (name === 'birthday') {
        validateFormBirthday(value);
      }
      if (name === 'startDate') {
        validateStartDate(value);
      }
    };

    const handleCheckbox = (e) => {
      const { name, checked } = e.target;
      setForm((f) => ({ ...f, [name]: checked }));
    };

    const handleResumeChange = (e) => {
      const file = e.target.files?.[0];
      setForm((f) => ({ ...f, resumeName: file ? file.name : '' }));
      setResumeFile(file || null);
    };

    const fetchUserApplication = async (userId) => {
      const { data, error } = await supabase
        .from('applications')
        .select('id, job_id, created_at, payload, status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching user application:', error);
        return;
      }

      if (data && data.length > 0) {
        setUserApplication(data[0]);
      } else {
        setUserApplication(null);
      }
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

    const formatPostedLabel = (job) => {
      const createdAt = job?.created_at ? new Date(job.created_at) : null;
      const hasValidDate = createdAt instanceof Date && !isNaN(createdAt);
      return hasValidDate
        ? createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Not available';
    };

    const proceedToApplicationForm = () => {
      // Check if profile is complete before allowing application
      if (!isProfileComplete) {
        setProfileIncompleteMessage(`Please complete your profile before applying. Missing fields: ${missingFields.join(', ')}`);
        setShowProfileIncompleteModal(true);
        // Redirect to Profile tab after showing the message
        setTimeout(() => {
          setShowProfileIncompleteModal(false);
          setActiveTab('Profile');
          setShowDetails(false);
        }, 1500);
        return;
      }
      setShowDetails(false);
      setApplicationTab('personal');
      setShowModal(true);
    };

    // submit -> show summary with what user typed
    const onSubmitApplication = (e) => {
      e.preventDefault();
      setErrorMessage('');
      
      // Find current tab index first
      const currentTabIndex = formTabs.findIndex(tab => tab.key === applicationTab);
      const isLastTab = currentTabIndex === formTabs.length - 1;
      
      // Only check required fields on personal tab or last tab
      if (applicationTab === 'personal' || isLastTab) {
        const missingRequired = requiredFormFields.find(({ key }) => {
          const value = form[key];
          return String(value ?? '').trim() === '';
        });

        if (missingRequired) {
          setApplicationTab(missingRequired.tab);
          setErrorMessage(`Please complete the ${missingRequired.label} field before proceeding.`);
          return;
        }

        if (!selectedJob && !newJob) {
          setErrorMessage('Please choose a job first (click View on a job card).');
          return;
        }
        
        // Validate birthday before proceeding
        if (form.birthday && !validateFormBirthday(form.birthday)) {
          setErrorMessage('Please fix the birthday field before submitting.');
          return;
        }

        if (form.startDate && !validateStartDate(form.startDate)) {
          setErrorMessage('Please fix the available start date before submitting.');
          return;
        }
      }
      
      // Validate current tab fields based on which tab we're on
      if (applicationTab === 'education' || isLastTab) {
        // Validate year fields only if they have values
        if (form.edu1Year && form.edu1Year.trim() !== '') {
          const edu1YearError = validateYear(form.edu1Year);
          if (edu1YearError) {
            setErrorMessage('Education: ' + edu1YearError);
            return;
          }
        }
        if (form.edu2Year && form.edu2Year.trim() !== '') {
          const edu2YearError = validateYear(form.edu2Year);
          if (edu2YearError) {
            setErrorMessage('Education: ' + edu2YearError);
            return;
          }
        }
      }

      if (applicationTab === 'experience' || isLastTab) {
        // Validate employment periods only if they have values
        for (let i = 0; i < workExperiences.length; i++) {
          const exp = workExperiences[i];
          if (exp.period && exp.period.trim() !== '') {
            const periodError = validateEmploymentPeriod(exp.period);
            if (periodError) {
              setErrorMessage(`Work Experience #${i + 1}: ${periodError}`);
              return;
            }
          }
        }
      }

      if (applicationTab === 'references' || isLastTab) {
        // Validate reference contact numbers only if they have values
        for (let i = 0; i < characterReferences.length; i++) {
          const ref = characterReferences[i];
          if (ref.contact && ref.contact.trim() !== '') {
            const contactError = validatePhoneNumber(ref.contact);
            if (contactError) {
              setErrorMessage(`Character Reference #${i + 1}: ${contactError}`);
              return;
            }
          }
        }
      }
      
      // If on the last tab (references), validate references for office workers and submit
      if (isLastTab) {
        const jobType = (selectedJob || newJob)?.job_type?.toLowerCase();
        
        // Require at least one complete reference for office employees
        if (jobType === 'office_employee') {
          const hasValidReference = characterReferences.some(ref => 
            ref.name && ref.name.trim() !== '' &&
            ref.contact && ref.contact.trim() !== ''
          );
          
          if (!hasValidReference) {
            setErrorMessage('Please provide at least one complete character reference (name and contact number) for office positions.');
            return;
          }
        }
        
        setShowModal(false);
        setShowSummary(true);
      } else {
        // Otherwise, go to next tab
        const nextTab = formTabs[currentTabIndex + 1];
        setApplicationTab(nextTab.key);
      }
    };

    // final submit -> save to Supabase.applications
    const handleFinalSubmit = async () => {
      setErrorMessage('');

      const { data: { session }, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) {
        setErrorMessage('Could not check session: ' + sessErr.message);
        return;
      }
      if (!session) {
        setErrorMessage('Please log in again.');
        setTimeout(() => {
          navigate('/applicant/login', { replace: true, state: { redirectTo: '/applicantl/home' } });
        }, 2000);
        return;
      }

      const userId = session.user.id;

      const job = selectedJob || newJob || null;

      let resumeStoragePath = form.resumePath || null;

      if (resumeFile) {
        const sanitizedFileName = resumeFile.name.replace(/\s+/g, '_');
        const filePath = `${userId}/${Date.now()}-${sanitizedFileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('resume')
          .upload(filePath, resumeFile, {
            upsert: true,
          });

        if (uploadError) {
          console.error(uploadError);
          setErrorMessage('Failed to upload resume: ' + uploadError.message);
          return;
        }

        resumeStoragePath = uploadData.path;
        setResumeFile(null);
        setForm((prev) => ({ ...prev, resumePath: resumeStoragePath }));
      }

      const skillsArray = parseSkills(form.skills);
      const formPayload = {
        ...form,
        skills: skillsArray,
        skills_text: form.skills,
      };
      if (resumeStoragePath) {
        formPayload.resumePath = resumeStoragePath;
      }

      const payload = {
        form: formPayload,
        workExperiences,
        characterReferences,
        job, // snapshot of the job
      };

      const jobId = (job && (job.id || job.title)) || 'unknown';

      const { data: insertedData, error } = await supabase.from('applications').insert([
        {
          user_id: userId,
          job_id: jobId,
          payload,
          status: 'submitted',
        }
      ]).select('id, job_id, created_at, payload, status');

      if (error) {
        console.error(error);
        setErrorMessage('Failed to submit application: ' + error.message);
        return;
      }

      // Update the applicant's profile with depot from the job
      if (job?.depot) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ depot: job.depot })
          .eq('id', userId);
        
        if (profileError) {
          console.error('Failed to update profile depot:', profileError);
          // Don't fail the application, just log the error
        }
      }

      if (insertedData && insertedData.length > 0) {
        setUserApplication(insertedData[0]);
      }

      setShowSummary(false);
      setShowSuccessPage(true);
    };

    const [authChecked, setAuthChecked] = useState(false);
    const hasExistingApplication = Boolean(userApplication);
    const appliedJobId = userApplication?.job_id || null;
    const applicationPayload = userApplication?.payload || null;
    const applicationResumePath = applicationPayload?.form?.resumePath || applicationPayload?.form?.resumeName || null;
    const applicationResumeUrl = applicationResumePath
      ? supabase.storage.from('resume').getPublicUrl(applicationResumePath).data.publicUrl
      : null;

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

        // Verify user is an applicant
        const { data: applicantData, error: roleError } = await supabase
          .from('applicants')
          .select('*')
          .ilike('email', session.user.email)
          .maybeSingle();

        if (roleError) {
          console.error("Error checking applicant role:", roleError);
          await supabase.auth.signOut();
          navigate('/applicant/login', {
            replace: true,
            state: { redirectTo: '/applicantl/home' },
          });
          return;
        }

        if (!applicantData) {
          console.log("No applicant data found for user:", session.user.email);
          await supabase.auth.signOut();
          navigate('/applicant/login', {
            replace: true,
            state: { redirectTo: '/applicantl/home' },
          });
          return;
        }

        // Default to applicant role if not specified
        const userRole = applicantData.role?.toLowerCase() || 'applicant';
        if (userRole !== 'applicant') {
          console.log("User is not an applicant, role:", userRole);
          await supabase.auth.signOut();
          navigate('/applicant/login', {
            replace: true,
            state: { redirectTo: '/applicantl/home' },
          });
          return;
        }

        setAuthChecked(true); // we’re good to render the page

        await fetchUserApplication(session.user.id);

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, sess) => {
          if (!sess) navigate('/applicant/login', { replace: true });
        });
        unsub = () => subscription.unsubscribe();
      })();

      return () => unsub && unsub();
    }, [navigate]);

    // Fetch all cities from PSGC API on mount
    useEffect(() => {
      const fetchAllCities = async () => {
        try {
          const response = await fetch('https://psgc.gitlab.io/api/cities-municipalities/');
          const data = await response.json();
          setCities(data);
        } catch (error) {
          console.error('Error fetching cities:', error);
        }
      };
      fetchAllCities();
    }, []);

    // Fetch barangays when city is selected
    useEffect(() => {
      if (form.city) {
        const fetchBarangays = async () => {
          try {
            // Find the city code from the city name
            const selectedCity = cities.find(city => city.name === form.city);
            if (selectedCity) {
              const response = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${selectedCity.code}/barangays/`);
              const data = await response.json();
              setBarangays(data);
            }
          } catch (error) {
            console.error('Error fetching barangays:', error);
          }
        };
        fetchBarangays();
      } else {
        setBarangays([]);
      }
    }, [form.city, cities]);

    // Fetch barangays when profile city is selected
    useEffect(() => {
      if (profileForm.city) {
        const fetchProfileBarangays = async () => {
          try {
            // Find the city code from the city name
            const selectedCity = cities.find(city => city.name === profileForm.city);
            if (selectedCity) {
              const response = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${selectedCity.code}/barangays/`);
              const data = await response.json();
              setProfileBarangays(data);
            }
          } catch (error) {
            console.error('Error fetching profile barangays:', error);
          }
        };
        fetchProfileBarangays();
      } else {
        setProfileBarangays([]);
      }
    }, [profileForm.city, cities]);

    // NEW: Load job posts from DB and subscribe to realtime inserts
    // Helper to check if job is expired based on duration
    const isJobExpired = (job) => {
      if (!job.duration || !job.created_at) return false;
      
      // Parse duration (format: "Xh Ym")
      const match = job.duration.match(/(\d+)h\s*(\d+)m/);
      if (!match) return false;
      
      const hours = parseInt(match[1]) || 0;
      const minutes = parseInt(match[2]) || 0;
      const durationMs = (hours * 60 * 60 * 1000) + (minutes * 60 * 1000);
      
      const createdAt = new Date(job.created_at).getTime();
      const now = Date.now();
      
      return (now - createdAt) > durationMs;
    };

    useEffect(() => {
      let channel;

      const loadJobs = async () => {
        setJobsLoading(true);
        const { data, error } = await supabase
          .from('job_posts')
          .select('id, title, depot, description, responsibilities, urgent, created_at, job_type, duration')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('load job_posts error:', error);
          setJobs([]);
          setJobsLoading(false);
          return;
        }

        const list = data || [];
        // Filter out expired jobs and only show office_employee jobs for applicants
        const activeList = list.filter(job => {
          const isExpired = isJobExpired(job);
          const isOfficeJob = job.job_type?.toLowerCase() === 'office_employee';
          return !isExpired && isOfficeJob;
        });
        
        // ensure redirected job appears even if cache delay (avoid dupe)
        const merged = newJob
          ? [activeList.find(j => j.id === newJob.id) ? null : newJob, ...activeList].filter(Boolean)
          : activeList;

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

    const currentJobType =
      (selectedJob || newJob)?.job_type?.toLowerCase() || null;
    const showLicenseSection = currentJobType !== 'office_employee';

    // Calculate suggestions after early return
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

    console.log('Jobs count:', jobs.length);
    console.log('Search input value:', `"${searchInput}"`);
    console.log('Search suggestions:', searchSuggestions);
    console.log('Filtered search suggestions:', filteredSearchSuggestions);
    console.log('Show search suggestions:', showSearchSuggestions);

    const filteredJobs = jobs.filter((job) => {
      // If user has already applied, only show the job they applied for
      if (hasExistingApplication && appliedJobId) {
        return job.id === appliedJobId;
      }
      
      // Otherwise, show all jobs matching search/filter criteria
      const keywordMatch = searchTerm
        ? job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.description?.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      const locationMatch = locationFilter
        ? (job.depot || '').toLowerCase().includes(locationFilter.toLowerCase())
        : true;
      return keywordMatch && locationMatch;
    });

    // Check if profile is complete
    const isProfileComplete = 
      profileForm.street &&
      profileForm.barangay &&
      profileForm.city &&
      profileForm.zip &&
      profileForm.sex &&
      profileForm.birthday &&
      profileForm.marital_status;

    // Get missing fields for the indicator
    const missingFields = [];
    if (!profileForm.street) missingFields.push('Street/Village');
    if (!profileForm.barangay) missingFields.push('Barangay');
    if (!profileForm.city) missingFields.push('City');
    if (!profileForm.zip) missingFields.push('ZIP Code');
    if (!profileForm.sex) missingFields.push('Sex');
    if (!profileForm.birthday) missingFields.push('Birthday');
    if (!profileForm.marital_status) missingFields.push('Marital Status');

    // Build job card elements for the split-view
    const jobCardElements = filteredJobs.map((job) => {
      const createdAt = job?.created_at ? new Date(job.created_at) : null;
      const hasValidDate = createdAt instanceof Date && !isNaN(createdAt);
      const postedLabel = hasValidDate
        ? createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Not available';
      const isSelected = selectedJob?.id === job.id;
      const isCurrentApplication = appliedJobId === job.id;
      const isPreferredDepot = profileForm.preferred_depot && job.depot === profileForm.preferred_depot;

      return (
        <div
          key={job.id}
          className={`bg-white rounded-lg shadow-md p-6 flex flex-col relative overflow-hidden cursor-pointer transition-colors ${
            isSelected ? 'border-2 border-red-600' : 'border border-transparent'
          } hover:bg-gray-100`}
          onClick={() => {
            if (isCurrentApplication) return;
            handleCardSelect(job);
          }}
        >
          {job.urgent && (
            <div className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-4 py-1">
              URGENT HIRING!
            </div>
          )}
          {isPreferredDepot && (
            <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-4 py-1 flex items-center gap-1">
              <span>⭐</span> PREFERRED DEPOT
            </div>
          )}
          <div className="mt-4 flex flex-col flex-grow">
            <h3 className="text-xl font-bold text-gray-800 mb-2">{job.title}</h3>
            <div className="flex justify-between items-center mb-2 text-sm text-gray-600">
              <span className={isPreferredDepot ? 'font-semibold text-blue-600' : ''}>{job.depot}</span>
              <span>Posted {postedLabel}</span>
            </div>
            <p className="text-gray-700 line-clamp-3">{job.description}</p>
            {isCurrentApplication && (
              <div className="mt-2 px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full text-center">
                Applied
              </div>
            )}
          </div>
        </div>
      );
    });

    return (
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
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <img
                  src={LogoCropped}
                  alt="Each-R Logo"
                  className="h-10 w-auto object-contain"
                />
              </div>

              <nav className="flex items-center space-x-6 text-sm font-medium text-gray-600">
                <button
                  onClick={() => setActiveTab('Home')}
                  className={`pb-1 ${
                    activeTab === 'Home'
                      ? 'text-red-600 border-b-2 border-red-600'
                      : 'hover:text-gray-900 transition-colors'
                  }`}
                >
                  Home
                </button>
                <button
                  onClick={() => {
                    setActiveTab('Applications');
                    navigate('/applicant/applications');
                  }}
                  className={`pb-1 ${
                    activeTab === 'Applications'
                      ? 'text-red-600 border-b-2 border-red-600'
                      : 'hover:text-gray-900 transition-colors'
                  }`}
                >
                  Applications
                </button>
              </nav>

              <div className="flex items-center space-x-4">
                {/* Notification Bell */}
                <NotificationBell />
                
                {/* User Profile with Dropdown */}
                <div className="relative" ref={profileDropdownRef}>
                  <div 
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold cursor-pointer hover:bg-gray-300"
                  >
                    {profileData?.fname && profileData?.lname 
                      ? `${profileData.fname[0]}${profileData.lname[0]}`.toUpperCase()
                      : profileData?.email?.[0]?.toUpperCase() || "U"}
                  </div>
                  {/* Dropdown arrow */}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full border-2 border-white flex items-center justify-center pointer-events-none">
                    <svg className="w-2 h-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  
                  {/* Dropdown Menu */}
                  {showProfileDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-50">
                      <div className="py-1">
                        <div className="px-4 py-2 text-sm text-gray-700 border-b">
                          {profileData?.fname && profileData?.lname 
                            ? `${profileData.fname} ${profileData.lname}`
                            : profileData?.email || "User"}
                        </div>
                        <button
                          onClick={() => {
                            setShowProfileDropdown(false);
                            setActiveTab('Profile');
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          View Profile
                        </button>
                        <button
                          onClick={() => {
                            setShowProfileDropdown(false);
                            setShowLogoutConfirm(true);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar with Photo Banner */}
        {activeTab === 'Home' && (
          <div className="max-w-7xl mx-auto px-6">
            <div className="relative">
              <div className="overflow-hidden">
                <img
                  src={Roadwise}
                  alt="Delivery trucks on the road"
                  className="w-full h-[200px] object-cover"
                />
              </div>
              <div className="absolute inset-0 bg-black/30 pointer-events-none" />
              <div className="absolute inset-0 flex items-center justify-center px-4 pointer-events-none">
                <div className="w-full max-w-4xl pointer-events-auto">
                  <form onSubmit={handleSearchSubmit}>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-stretch bg-white rounded-2xl shadow-xl border border-gray-200 overflow-visible relative">
                        <div className="flex-1 flex items-center px-5 py-4 relative">
                          <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onFocus={() => {
                              console.log('Search input focused');
                              setShowSearchSuggestions(true);
                            }}
                            onBlur={() => {
                              console.log('Search input blurred');
                              setTimeout(() => setShowSearchSuggestions(false), 200);
                            }}
                            className="w-full bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none"
                            placeholder=" Job title, keywords, or company"
                          />
                          {console.log('Rendering check - show:', showSearchSuggestions, 'length:', filteredSearchSuggestions.length)}
                          {showSearchSuggestions && filteredSearchSuggestions.length > 0 && (
                            <ul 
                              className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto z-[9999]"
                              style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', backgroundColor: 'white', border: '1px solid red', zIndex: 9999 }}
                            >
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
          </div>
        )}

        <div className="flex flex-col items-center min-h-screen">
          <section className={`w-full ${activeTab === 'Home' ? '' : 'hidden'}`}>
            <div className="max-w-7xl mx-auto px-6 py-8">
              {/* Profile Incomplete Warning */}
              {!isProfileComplete && (
                  <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">Complete Your Profile</h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <p>Complete your profile's information to have an easier time applying to jobs.</p>
                          <button
                            onClick={() => setActiveTab('Profile')}
                            className="mt-2 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                          >
                            Go to Profile
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* Jobs from DB */}
                {jobsLoading ? (
                  <div className="text-gray-600">Loading jobs…</div>
                ) : jobs.length === 0 ? (
                  <div className="text-gray-600">No active job postings at the moment.</div>
                ) : filteredJobs.length === 0 ? (
                  <div className="text-gray-600">No job postings match your search.</div>
                ) : showDetails && selectedJob ? (
                  <div ref={jobDetailsRef} className="space-y-4">
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
                              {appliedJobId === selectedJob.id ? (
                                <span className="px-10 py-2 rounded bg-green-100 text-green-700 font-medium">
                                  Already Applied
                                </span>
                              ) : hasExistingApplication ? (
                                <span className="px-10 py-2 rounded bg-gray-300 text-gray-600 cursor-not-allowed">
                                  Apply (Disabled)
                                </span>
                              ) : !isProfileComplete ? (
                                <button
                                  className="px-10 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                                  onClick={proceedToApplicationForm}
                                  title="Complete your profile to apply"
                                >
                                  Apply
                                </button>
                              ) : (
                                <button
                                  className="px-10 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                                  onClick={proceedToApplicationForm}
                                >
                                  Apply
                                </button>
                              )}
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
                  <div className={`${
                    hasExistingApplication && filteredJobs.length === 1
                      ? 'w-full max-w-[89%] mx-auto' // Slightly smaller than full width
                      : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                  }`}>
                    {hasExistingApplication && filteredJobs.length === 1 ? (
                      // Enhanced layout for single applied job
                      <div className="bg-white rounded-lg shadow-lg border-2 border-green-500 overflow-hidden">
                        {filteredJobs[0].urgent && (
                          <div className="bg-red-600 text-white text-xs font-bold px-4 py-1.5 text-center">
                            URGENT HIRING!
                          </div>
                        )}
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="text-2xl font-bold text-gray-800 mb-2">{filteredJobs[0].title}</h3>
                              <div className="flex flex-wrap items-center gap-2 text-gray-600 text-sm mb-3">
                                <div className="flex items-center gap-1.5">
                                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-600">
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
                                  </svg>
                                  <span className="font-semibold">{filteredJobs[0].depot}</span>
                                </div>
                                {filteredJobs[0].job_type && (
                                  <>
                                    <span>•</span>
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                      {filteredJobs[0].job_type.replace(/_/g, ' ')}
                                    </span>
                                  </>
                                )}
                                <span>•</span>
                                <span>Posted {formatPostedLabel(filteredJobs[0])}</span>
                              </div>
                              <button
                                onClick={() => navigate('/applicant/applications')}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm"
                              >
                                View Application Status
                              </button>
                            </div>
                            <div className="ml-3 flex-shrink-0">
                              <div className="px-4 py-2 bg-green-100 text-green-700 text-sm font-semibold rounded-lg border-2 border-green-500">
                                ✓ Applied
                              </div>
                            </div>
                          </div>
                          
                          <div className="border-t border-gray-200 pt-4 mt-4 space-y-4">
                            <div>
                              <h4 className="text-base font-semibold text-gray-800 mb-2">Description</h4>
                              <p className="text-gray-700 text-sm leading-relaxed line-clamp-3">{filteredJobs[0].description || 'No description provided.'}</p>
                            </div>
                            
                            {filteredJobs[0].responsibilities && filteredJobs[0].responsibilities.length > 0 && (
                              <div>
                                <h4 className="text-base font-semibold text-gray-800 mb-2">Key Responsibilities</h4>
                                <ul className="list-disc list-inside text-gray-700 text-sm space-y-1 ml-1">
                                  {(showAllResponsibilities ? filteredJobs[0].responsibilities : filteredJobs[0].responsibilities.slice(0, 4)).map((item, idx) => (
                                    <li key={idx} className="leading-relaxed">{item}</li>
                                  ))}
                                </ul>
                                {filteredJobs[0].responsibilities.length > 4 && (
                                  <button
                                    className="text-blue-600 hover:text-blue-800 italic font-medium cursor-pointer transition-colors text-sm mt-1 ml-1"
                                    onClick={() => setShowAllResponsibilities(!showAllResponsibilities)}
                                  >
                                    {showAllResponsibilities 
                                      ? '- Show less' 
                                      : `+ ${filteredJobs[0].responsibilities.length - 4} more`
                                    }
                                  </button>
                                )}
                              </div>
                            )}
                            
                            {/* Compact Job Information Grid */}
                            <div className="grid grid-cols-2 gap-3 pt-2">
                              {filteredJobs[0].job_type && (
                                <div className="bg-gray-50 p-3 rounded">
                                  <div className="text-xs text-gray-600 mb-0.5">Position Type</div>
                                  <div className="font-semibold text-gray-800 text-sm capitalize">{filteredJobs[0].job_type.replace(/_/g, ' ')}</div>
                                </div>
                              )}
                              {filteredJobs[0].duration && (
                                <div className="bg-gray-50 p-3 rounded">
                                  <div className="text-xs text-gray-600 mb-0.5">Duration</div>
                                  <div className="font-semibold text-gray-800 text-sm">{filteredJobs[0].duration}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      jobCardElements
                    )}
                  </div>
                )}
              </div>
            </section>

            <section className={`w-full ${activeTab === 'Applications' ? '' : 'hidden'}`}>
              <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Applications content */}
              </div>
            </section>
            
            <section className={`w-full ${activeTab === 'Notifications' ? '' : 'hidden'}`}>
              <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Notifications content */}
              </div>
            </section>

            <section className={`w-full ${activeTab === 'Profile' ? '' : 'hidden'}`}>
              {/* your profile panel stays identical (unchanged) */}
              {/* ... omitted for brevity – keep your original Profile section code ... */}
                  <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Profile Information</h2>
                        
                        {errorMessage && (
                          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                            {errorMessage}
                          </div>
                        )}

                        {successMessage && (
                          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                            {successMessage}
                          </div>
                        )}

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
                                        <div className="space-y-2">
                                            <span className="font-bold">Address:</span>
                                            <div className="grid grid-cols-1 gap-2">
                                                <label className="text-sm text-gray-600">
                                                    Street / Village
                                            {isEditMode ? (
                                                <input
                                                    type="text"
                                                            value={profileForm.street}
                                                            onChange={(e) => handleFormChange('street', e.target.value)}
                                                            className="mt-1 w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
                                                />
                                            ) : (
                                                        <span className="block text-gray-800">
                                                            {profileForm.street || 'Not provided'}
                                                        </span>
                                                    )}
                                                </label>
                                                <label className="text-sm text-gray-600">
                                                    City
                                                    {isEditMode ? (
                                                        <>
                                                            <input
                                                                type="text"
                                                                list="profile-city-list"
                                                                value={profileForm.city}
                                                                onChange={(e) => handleFormChange('city', e.target.value)}
                                                                className="mt-1 w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
                                                            />
                                                            <datalist id="profile-city-list">
                                                                {cities.map((city) => (
                                                                    <option key={city.code} value={city.name} />
                                                                ))}
                                                            </datalist>
                                                        </>
                                                    ) : (
                                                        <span className="block text-gray-800">
                                                            {profileForm.city || 'Not provided'}
                                                        </span>
                                                    )}
                                                </label>
                                                <label className="text-sm text-gray-600">
                                                    Barangay
                                                    {isEditMode ? (
                                                        <>
                                                            <input
                                                                type="text"
                                                                list="profile-barangay-list"
                                                                value={profileForm.barangay}
                                                                onChange={(e) => handleFormChange('barangay', e.target.value)}
                                                                className="mt-1 w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
                                                            />
                                                            <datalist id="profile-barangay-list">
                                                                {profileBarangays.map((brgy) => (
                                                                    <option key={brgy.code} value={brgy.name} />
                                                                ))}
                                                            </datalist>
                                                        </>
                                                    ) : (
                                                        <span className="block text-gray-800">
                                                            {profileForm.barangay || 'Not provided'}
                                                        </span>
                                                    )}
                                                </label>
                                                <label className="text-sm text-gray-600">
                                                    ZIP Code
                                                    {isEditMode ? (
                                                        <input
                                                            type="text"
                                                            value={profileForm.zip}
                                                            onChange={(e) => handleFormChange('zip', e.target.value)}
                                                            className="mt-1 w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
                                                        />
                                                    ) : (
                                                        <span className="block text-gray-800">
                                                            {profileForm.zip || 'Not provided'}
                                                        </span>
                                                    )}
                                                </label>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="font-bold">Preferred Depot:</span>{' '}
                                            {isEditMode ? (
                                                <>
                                                    <input
                                                        list="profile-depot-list"
                                                        value={profileForm.preferred_depot || ''}
                                                        onChange={(e) => handleFormChange('preferred_depot', e.target.value)}
                                                        className="ml-2 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
                                                        placeholder="Select preferred depot"
                                                    />
                                                    <datalist id="profile-depot-list">
                                                        {depotOptions.map((depot) => (
                                                            <option key={depot} value={depot} />
                                                        ))}
                                                    </datalist>
                                                </>
                                            ) : (
                                                profileForm.preferred_depot || 'Not provided'
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
                                                <div>
                                                    <input
                                                        type="date"
                                                        value={formatDateForInput(profileForm.birthday)}
                                                        onChange={(e) => handleFormChange('birthday', e.target.value)}
                                                        className={`ml-2 px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-red-500 ${
                                                            birthdayError ? 'border-red-500' : 'border-gray-300'
                                                        }`}
                                                    />
                                                    {birthdayError && (
                                                        <div className="ml-2 mt-1 text-sm text-red-600">
                                                            {birthdayError}
                                                        </div>
                                                    )}
                                                </div>
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
                                            <span className="font-bold">Application ID:</span> {userApplication?.id || 'Not available'}
                                        </div>
                                        <div>
                                            <span className="font-bold">Applied Position:</span> {applicationPayload?.job?.title || 'Not available'}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <span className="font-bold">Applied Depot:</span> {applicationPayload?.job?.depot || 'Not available'}
                                        </div>
                                        <div>
                                            <span className="font-bold">Application Date:</span> {userApplication?.created_at ? formatDate(userApplication.created_at) : 'Not available'}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <span className="font-bold">Application Status:</span>{' '}
                                            <span className="ml-2 px-2 py-1 bg-orange-500 text-white text-xs rounded">{userApplication?.status || 'Not available'}</span>
                                        </div>
                                        <div>
                                            <span className="font-bold">Resume:</span>{' '}
                                            {applicationResumeUrl ? (
                                                <a href={applicationResumeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600">{applicationPayload?.form?.resumeName || 'View Resume'}</a>
                                            ) : ('Not available')}
                                        </div>
                                        <div>
                                            <span className="font-bold">Available Start Date:</span> {applicationPayload?.form?.startDate ? formatDate(applicationPayload.form.startDate) : 'Not available'}
                                        </div>
                                        <div>
                                            <span className="font-bold">How did you learn about us:</span> {applicationPayload?.form?.heardFrom || 'Not available'}
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

            {/* Submit Application Modal (now controlled inputs) */}
            {showModal && (
              <div
                className="fixed inset-0 bg-transparent flex items-center justify-center z-50"
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
                    className="flex flex-col max-h-[80vh]"
                    onSubmit={onSubmitApplication}
                  >
                    {errorMessage && (
                      <div className="px-4 pt-4">
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                          {errorMessage}
                        </div>
                      </div>
                    )}
                    <div className="px-4 pt-4 border-b bg-gray-50">
                      <div className="flex flex-wrap gap-2">
                        {formTabs.map((tab) => (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() => setApplicationTab(tab.key)}
                            className={`px-3 py-2 text-sm font-medium rounded-t border ${
                              applicationTab === tab.key
                                ? 'bg-red-600 text-white border-red-600'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                      <div className={`space-y-4 ${applicationTab === 'personal' ? 'block' : 'hidden'}`}>
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
                              <label className="block text-xs text-gray-600 mb-1">City *</label>
                              <input
                                type="text"
                                name="city"
                                list="city-list"
                                value={form.city}
                                onChange={(e) => {
                                  handleInput(e);
                                  setForm(prev => ({ ...prev, barangay: '' }));
                                }}
                                required
                                disabled={cities.length === 0}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 text-xs disabled:bg-gray-100 disabled:cursor-not-allowed"
                                placeholder="Type or select city"
                              />
                              <datalist id="city-list">
                                {cities.map((city) => (
                                  <option key={city.code} value={city.name} />
                                ))}
                              </datalist>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">
                                Barangay *
                              </label>
                              <input
                                type="text"
                                name="barangay"
                                list="barangay-list"
                                value={form.barangay}
                                onChange={handleInput}
                                required
                                disabled={!form.city || barangays.length === 0}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 text-xs disabled:bg-gray-100 disabled:cursor-not-allowed"
                                placeholder="Type or select barangay"
                              />
                              <datalist id="barangay-list">
                                {barangays.map((brgy) => (
                                  <option key={brgy.code} value={brgy.name} />
                                ))}
                              </datalist>
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
                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 ${
                                formBirthdayError ? 'border-red-500' : 'border-gray-300'
                              }`}
                            />
                            {formBirthdayError && (
                              <div className="mt-1 text-sm text-red-600">
                                {formBirthdayError}
                              </div>
                            )}
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
                      </div>

                      <div className={`space-y-4 ${applicationTab === 'education' ? 'block' : 'hidden'}`}>
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
                            <div className="flex-1">
                              <input
                                type="text"
                                placeholder="Year Finished (yyyy)"
                                name="edu1Year"
                                value={form.edu1Year}
                                onChange={(e) => {
                                  handleInput(e);
                                  const error = validateYear(e.target.value);
                                  setYearErrors(prev => ({ ...prev, edu1Year: error }));
                                }}
                                maxLength="4"
                                className="w-full mr-2 border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none"
                              />
                              {yearErrors.edu1Year && (
                                <p className="text-xs text-red-600 mt-1">{yearErrors.edu1Year}</p>
                              )}
                            </div>
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
                            <div className="flex-1">
                              <input
                                type="text"
                                placeholder="Year Finished (yyyy)"
                                name="edu2Year"
                                value={form.edu2Year}
                                onChange={(e) => {
                                  handleInput(e);
                                  const error = validateYear(e.target.value);
                                  setYearErrors(prev => ({ ...prev, edu2Year: error }));
                                }}
                                maxLength="4"
                                className="w-full mr-2 border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none"
                              />
                              {yearErrors.edu2Year && (
                                <p className="text-xs text-red-600 mt-1">{yearErrors.edu2Year}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Skills */}
                        <div>
                          <label className="flex items-center">
                            <span className="text-sm mt-4 font-medium">
                              Please list your skills
                            </span>
                          </label>
                            <input
                              type="text"
                            placeholder="e.g., Driving, Customer Service, Logistics"
                            name="skills"
                            value={form.skills}
                              onChange={handleInput}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none"
                          />
                          <p className="text-xs text-gray-500 mt-1">Separate skills with commas.</p>
                        </div>

                        {/* License */}
                        {showLicenseSection && (
                        <div>
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
                        )}
                      </div>

                      <div className={`space-y-4 ${applicationTab === 'experience' ? 'block' : 'hidden'}`}>
                        {/* Work Experiences (controlled) */}
                        <div className="space-y-4">
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
                                  Year Employed (period)
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g., 2015-2020 or 2015-Present"
                                  value={exp.period || ''}
                                  onChange={(e) => {
                                    updateWork(index, 'period', e.target.value);
                                    const error = validateEmploymentPeriod(e.target.value);
                                    setEmploymentPeriodErrors(prev => {
                                      const newErrors = [...prev];
                                      newErrors[index] = error;
                                      return newErrors;
                                    });
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                                />
                                {employmentPeriodErrors[index] && (
                                  <p className="text-xs text-red-600 mt-1">{employmentPeriodErrors[index]}</p>
                                )}
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
                      </div>

                      <div className={`space-y-4 ${applicationTab === 'references' ? 'block' : 'hidden'}`}>
                        {/* Character References (controlled) */}
                        <div className="space-y-4">
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
                                    placeholder="09XXXXXXXXX"
                                    value={ref.contact || ''}
                                    onChange={(e) => {
                                      updateRef(index, 'contact', e.target.value);
                                      const error = validatePhoneNumber(e.target.value);
                                      setReferenceContactErrors(prev => {
                                        const newErrors = [...prev];
                                        newErrors[index] = error;
                                        return newErrors;
                                      });
                                    }}
                                    maxLength="11"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                                  />
                                  {referenceContactErrors[index] && (
                                    <p className="text-xs text-red-600 mt-1">{referenceContactErrors[index]}</p>
                                  )}
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
                      </div>
                    </div>
                    <div className="flex justify-between px-4 py-3 border-t">
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
                    <p className="text-xs text-gray-600 px-4 pb-4">
                      By submitting an application for this position, you consent to
                      Roadwise collecting and storing your personal information as part of
                      the recruitment process. <Link to="/terms-and-privacy" className="text-red-600 hover:underline">
            Terms and Privacy
          </Link>
                    </p>
                  </form>
                </div>
              </div>
            )}

            {/* Success Page */}
            {showSuccessPage && (
              <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
                <div className="text-center max-w-md mx-4">
                  <div className="mb-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-green-600">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Application Submitted Successfully!</h2>
                    <p className="text-gray-600 mb-6">Your application has been received. You can track its status in the Applications tab.</p>
                    <button
                      onClick={() => {
                        setShowSuccessPage(false);
                        setActiveTab('Home');
                      }}
                      className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Return to Home
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Summary (now shows user input) */}
            {showSummary && (
              <div
                className="fixed inset-0 bg-transparent flex items-center justify-center z-50"
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
                    {errorMessage && (
                      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {errorMessage}
                      </div>
                    )}
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
                        {parseSkills(form.skills).join(', ') || '-'}
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
                          setApplicationTab('personal');
                          setShowModal(true);
                        }}
                        className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                      >
                        Start Over
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowConfirmDialog(true)}
                        className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        Submit
                      </button>

                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Confirm Dialog */}
            {showConfirmDialog && (
              <div
                className="fixed inset-0 bg-transparent flex items-center justify-center z-50"
                onClick={() => setShowConfirmDialog(false)}
              >
                <div
                  className="bg-white rounded-lg max-w-md w-full mx-4 overflow-hidden border"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-800">Confirm Submission</h3>
                  </div>
                  <div className="p-4 text-sm text-gray-700">
                    Are you sure you want to submit your application? This action cannot be undone.
                  </div>
                  <div className="p-4 border-t flex justify-end gap-2">
                    <button
                      type="button"
                      className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                      onClick={() => setShowConfirmDialog(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                      onClick={async () => {
                        setShowConfirmDialog(false);
                        await handleFinalSubmit();
                      }}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Profile Incomplete Modal */}
            {showProfileIncompleteModal && (
              <div
                className="fixed inset-0 transparent bg-opacity-50 flex items-center justify-center z-50"
              >
                <div
                  className="bg-white rounded-lg max-w-md w-full mx-4 overflow-hidden border border-black"
                >
                  <div className="p-4 border-b bg-red-50">
                    <h3 className="text-lg font-semibold text-red-800 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                        <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                      </svg>
                      Profile Incomplete
                    </h3>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-700 mb-4">{profileIncompleteMessage}</p>
                    <p className="text-xs text-gray-600 italic">Redirecting you to your profile...</p>
                  </div>
                </div>
              </div>
            )}

            {/* Logout Confirmation */}
            {showLogoutConfirm && (
              <div
                className="fixed inset-0 bg-transparent flex items-center justify-center z-50"
                onClick={() => setShowLogoutConfirm(false)}
              >
                <div
                  className="bg-white rounded-lg max-w-md w-full mx-4 overflow-hidden border"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-800">Confirm Logout</h3>
                  </div>
                  <div className="p-4 text-sm text-gray-700">
                    Are you sure you want to logout?
                  </div>
                  <div className="p-4 border-t flex justify-end gap-2">
                    <button
                      type="button"
                      className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                      onClick={() => setShowLogoutConfirm(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                      onClick={async () => {
                        setShowLogoutConfirm(false);
                        await supabase.auth.signOut();
                        navigate('/applicant/login', { replace: true });
                      }}
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
      </div>
    );
  }

  export default ApplicantLHome;
