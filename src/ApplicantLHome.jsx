  import { Link, useNavigate, useLocation } from 'react-router-dom';
  import { useState, useEffect, useRef } from 'react';
  import { supabase, supabasePublic } from './supabaseClient';
import { createNotification, notifyHRAboutInterviewResponse } from './notifications';
  import AutocompleteInput from './components/AutocompleteInput';
import SkillsInput from './components/SkillsInput';
import {
  AssessmentSectionCard,
  RemarksAndFilesCard,
  SigningScheduleCard,
  UploadedDocumentsSection,
} from './components/ApplicantArtifactsPanels';

  const EDUCATION_LEVEL_OPTIONS = [
    { value: '', label: 'Select highest education' },
    { value: 'N/A', label: 'N/A' },
    { value: 'Elementary', label: 'Elementary' },
    { value: 'Junior High School', label: 'Junior High School' },
    { value: 'Senior High School', label: 'Senior High School' },
    { value: 'Vocational', label: 'Vocational/Technical Course' },
    { value: 'College', label: 'College' },
    { value: 'Post Graduate', label: 'Post Graduate (Masters/Doctorate)' },
  ];

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
    const [showRejectInterviewDialog, setShowRejectInterviewDialog] = useState(false);
    const [showProfileIncompleteModal, setShowProfileIncompleteModal] = useState(false);
    const [profileIncompleteMessage, setProfileIncompleteMessage] = useState('');
    const [applicationTab, setApplicationTab] = useState('personal');
    const jobDetailsRef = useRef(null);

    // Update activeTab when location.state changes (e.g., from View Profile button)
    useEffect(() => {
      if (location.state?.activeTab) {
        setActiveTab(location.state.activeTab);
      }
    }, [location.state]);

    const formTabs = [
      { key: 'personal', label: 'Personal' },
      { key: 'education', label: 'Education & Skills' },
      { key: 'experience', label: 'Experience' },
      { key: 'references', label: 'References' },
    ];

    const requiredFormFields = [
      { key: 'firstName', label: 'first name', tab: 'personal' },
      { key: 'lastName', label: 'last name', tab: 'personal' },
      { key: 'street', label: 'street name', tab: 'personal' },
      { key: 'barangay', label: 'barangay', tab: 'personal' },
      { key: 'city', label: 'city', tab: 'personal' },
      { key: 'province', label: 'province', tab: 'personal' },
      { key: 'zip', label: 'zip code', tab: 'personal' },
      { key: 'contact', label: 'contact number', tab: 'personal' },
      { key: 'email', label: 'email', tab: 'personal' },
      { key: 'birthday', label: 'birthday', tab: 'personal' },
      { key: 'sex', label: 'sex', tab: 'personal' },
      { key: 'maritalStatus', label: 'marital status', tab: 'personal' },
      { key: 'startDate', label: 'available start date', tab: 'personal' },
      { key: 'heardFrom', label: 'how you learned about us', tab: 'personal' },
      { key: 'employed', label: 'currently employed', tab: 'personal' },
    ];


    const [isEditMode, setIsEditMode] = useState(false);
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [birthdayError, setBirthdayError] = useState('');
    const [formBirthdayError, setFormBirthdayError] = useState('');
    const [startDateError, setStartDateError] = useState('');
    const [yearErrors, setYearErrors] = useState({ edu1Year: '', edu2Year: '' });
    const [profileYearGraduatedError, setProfileYearGraduatedError] = useState('');
    const [employmentPeriodErrors, setEmploymentPeriodErrors] = useState([]);
    const [profileEmploymentPeriodErrors, setProfileEmploymentPeriodErrors] = useState([]);
    const [referenceContactErrors, setReferenceContactErrors] = useState([]);
    const [referenceNameErrors, setReferenceNameErrors] = useState([]);
    const [referenceEmailErrors, setReferenceEmailErrors] = useState([]);
    const [contactError, setContactError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [showAllResponsibilities, setShowAllResponsibilities] = useState(false);
    const [profileForm, setProfileForm] = useState({
      fname: '',
      mname: '',
      lname: '',
        address: '',
        unit_house_number: '',
        street: '',
        barangay: '',
        city: '',
        province: '',
        postal_code: '',
        sex: '',
        birthday: '',
        age: '',
        marital_status: '',
        educational_attainment: '',
        institution_name: '',
        year_graduated: '',
        education_program: '',
        skills: [],
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
      unit_house_number: '',
      street: '',
      barangay: '',
      city: '',
      province: '',
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
      hasPAGIBIG: false,

      // education (two rows just like your Summary)
      edu1Level: '',
      edu1Institution: '',
      edu1Year: '',
      edu1Program: '',
      edu2Level: '',
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
    const [characterReferences, setCharacterReferences] = useState([{}]);
    const [resumeFile, setResumeFile] = useState(null);
    const [profileResumeFile, setProfileResumeFile] = useState(null);
    const [certificateFiles, setCertificateFiles] = useState([]);
    const [userApplication, setUserApplication] = useState(null);
    const [userApplications, setUserApplications] = useState([]);
    const [myApplicationsStep, setMyApplicationsStep] = useState('Application');
    const [selectedApplicationId, setSelectedApplicationId] = useState(null);

    // PSGC API states for location dropdowns
    const [provinces, setProvinces] = useState([]);
    const [cities, _setCities] = useState([]);
    const [_barangays, _setBarangays] = useState([]);
    const [profileCities, setProfileCities] = useState([]);
    const [profileBarangays, setProfileBarangays] = useState([]);
    const [applicationCities, setApplicationCities] = useState([]);
    const [applicationBarangays, setApplicationBarangays] = useState([]);
    const [loadingProvinces, setLoadingProvinces] = useState(false);
    const [_loadingCities, _setLoadingCities] = useState(false);
    const [_loadingBarangays, _setLoadingBarangays] = useState(false);
    const [loadingProfileCities, setLoadingProfileCities] = useState(false);
    const [loadingProfileBarangays, setLoadingProfileBarangays] = useState(false);
    const [loadingApplicationCities, setLoadingApplicationCities] = useState(false);
    const [loadingApplicationBarangays, setLoadingApplicationBarangays] = useState(false);

    // Cache for API responses
    const cityCache = useRef({});
    const barangayCache = useRef({});

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
            const resolvedBirthday = resolveBirthdayValue(mergedProfile);
            const calculatedAge = resolvedBirthday ? calculateAge(resolvedBirthday) : '';

            const mergedWithBirthday = { ...mergedProfile, birthday: resolvedBirthday };

            setProfileData(mergedWithBirthday);
            setProfileForm({
              fname: mergedWithBirthday.fname || '',
              mname: mergedWithBirthday.mname || '',
              lname: mergedWithBirthday.lname || '',
              address: mergedWithBirthday.address || '',
              unit_house_number: mergedWithBirthday.unit_house_number || '',
              street: mergedWithBirthday.street || '',
              barangay: mergedWithBirthday.barangay || '',
              city: mergedWithBirthday.city || '',
              province: mergedWithBirthday.province || '',
              postal_code: mergedWithBirthday.postal_code || mergedWithBirthday.zip || '',
              zip: mergedWithBirthday.zip || mergedWithBirthday.postal_code || '',
              sex: mergedWithBirthday.sex || '',
              birthday: mergedWithBirthday.birthday || '',
              age: calculatedAge || mergedWithBirthday.age || '',
              marital_status: mergedWithBirthday.marital_status || '',
              educational_attainment: normalizeEducationAttainment(mergedWithBirthday.educational_attainment) || '',
              institution_name: mergedWithBirthday.institution_name || '',
              year_graduated: mergedWithBirthday.year_graduated || '',
              education_program: mergedWithBirthday.education_program || '',
              skills: normalizeSkills(mergedWithBirthday.skills),
              work_experiences: mergedWithBirthday.work_experiences || [],
              character_references: normalizeCharacterReferences(mergedWithBirthday.character_references),
              preferred_depot: mergedWithBirthday.preferred_depot || '',
              resume_path: mergedWithBirthday.resume_path || ''
            });
            prefillApplicationForm(mergedWithBirthday);
          }
        } catch (err) {
          console.error('Error:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchProfileData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

useEffect(() => {
  if (profileData) {
    prefillApplicationForm(profileData);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // Validate year format (4 digits, bounded range; optionally relative to birthday)
    const validateYear = (year, birthdayForMinYear = '') => {
      if (!year || String(year).trim() === '') return ''; // Allow empty

      const yearStr = String(year).trim();
      const yearNum = parseInt(yearStr, 10);
      const currentYear = new Date().getFullYear();

      if (!/^\d{4}$/.test(yearStr)) {
        return 'Please enter a valid 4-digit year (e.g., 2023)';
      }

      let minYear = 1950;
      if (birthdayForMinYear) {
        const birthDate = new Date(birthdayForMinYear);
        if (!Number.isNaN(birthDate.getTime())) {
          minYear = birthDate.getFullYear() + 1; // must be above birth year
        }
      }

      if (yearNum < minYear || yearNum > currentYear) {
        return `Year must be between ${minYear} and ${currentYear}`;
      }

      return '';
    };

    // Validate employment period format - accepts Month Year or Year format
    const validateEmploymentPeriod = (period) => {
      if (!period || period.trim() === '') return ''; // Allow empty
      
      // Accept formats:
      // 1. Month Year - Month Year (e.g., January 2020 - June 2021 or Jan 2020 - Jun 2021)
      // 2. Month Year - Present (e.g., June 2021 - Present)
      // 3. Year - Year (e.g., 2020 - 2025)
      // 4. Year - Present (e.g., 2020 - Present)
      
      const monthYearFormat = /^[A-Za-z]{3,9}\s\d{4}\s-\s([A-Za-z]{3,9}\s\d{4}|Present)$/i;
      const yearOnlyFormat = /^\d{4}\s-\s(\d{4}|Present)$/i;
      
      if (!monthYearFormat.test(period.trim()) && !yearOnlyFormat.test(period.trim())) {
        return 'Use format: January 2020 - June 2021, June 2021 - Present, or 2020 - 2025';
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

    const validateEmail = (email) => {
      if (!email || String(email).trim() === '') return '';
      const val = String(email).trim();
      if (!val.includes('@') || !val.split('@')[1]?.includes('.')) {
        return 'Please enter a valid email address';
      }
      return '';
    };

    // Validate reference name - should not match applicant's name
    const validateReferenceName = (refName) => {
      if (!refName || refName.trim() === '') return ''; // Allow empty for validation, required check happens on submit
      
      const applicantFullName = `${form.firstName} ${form.lastName}`.toLowerCase().trim();
      const refFullName = refName.toLowerCase().trim();
      
      // Check if reference name matches applicant's full name or individual names
      if (refFullName === applicantFullName) {
        return 'Reference cannot be the applicant';
      }
      
      // Check if it matches first and last name combination in any order
      const firstName = form.firstName.toLowerCase().trim();
      const lastName = form.lastName.toLowerCase().trim();
      
      if (firstName && lastName && 
          (refFullName === `${firstName} ${lastName}` || 
           refFullName === `${lastName} ${firstName}` ||
           refFullName.includes(`${firstName} ${lastName}`) ||
           refFullName.includes(`${lastName} ${firstName}`))) {
        return 'Reference cannot be the applicant';
      }
      
      return '';
    };

    // Handle form input change
    const handleFormChange = (field, value) => {
      console.log('🔥 handleFormChange called:', field, value);

      if (field === 'postal_code' || field === 'zip') {
        value = String(value ?? '').replace(/\D/g, '').slice(0, 4);
      }

      if (field === 'year_graduated') {
        let numericValue = String(value ?? '').replace(/\D/g, '').slice(0, 4);
        if (numericValue.length === 4) {
          const currentYear = new Date().getFullYear();
          const yearNum = parseInt(numericValue, 10);
          if (!Number.isNaN(yearNum) && yearNum > currentYear) {
            numericValue = String(currentYear);
          }
        }
        value = numericValue;
        setProfileYearGraduatedError(validateYear(value, profileForm.birthday));
      }

      const updatedForm = {
        ...profileForm,
        [field]: value
      };

      if (field === 'postal_code') {
        updatedForm.zip = value;
      }
      if (field === 'zip') {
        updatedForm.postal_code = value;
      }

      if (field === 'birthday') {
        validateBirthday(value);
        updatedForm.age = calculateAge(value);

        if (updatedForm.year_graduated) {
          setProfileYearGraduatedError(validateYear(updatedForm.year_graduated, value));
        }
      }

      setProfileForm(updatedForm);
      console.log('🔥 Updated profileForm:', updatedForm);
      if (field === 'province') {
        console.log('🔥 Province changed to:', value, 'This should trigger city fetch useEffect');
      }
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
      { key: 'lname', label: 'Last Name' },
      { key: 'fname', label: 'First Name' },
      { key: 'street', label: 'Street Name' },
      { key: 'barangay', label: 'Barangay' },
      { key: 'city', label: 'City' },
      { key: 'province', label: 'Province' },
      { key: 'postal_code', label: 'ZIP Code', altKey: 'zip' },
      { key: 'sex', label: 'Sex' },
      { key: 'birthday', label: 'Birthday' },
      { key: 'marital_status', label: 'Marital Status' },
      { key: 'educational_attainment', label: 'Highest Educational Attainment' },
    ];
    const missing = requiredFields.find((field) => {
      const val = profileForm[field.key] || (field.altKey ? profileForm[field.altKey] : '');
      return String(val ?? '').trim() === '';
    });
    if (missing) {
      setErrorMessage(`Please fill out the ${missing.label} field before saving your profile.`);
      setSaving(false);
      return;
    }

    // Education rules: if educational attainment is selected and not N/A, institution + year are required
    const eduAttainment = String(profileForm.educational_attainment || '').trim();
    if (eduAttainment && eduAttainment !== 'N/A') {
      if (!String(profileForm.institution_name || '').trim()) {
        setErrorMessage('Please fill out the Institution Name field before saving your profile.');
        setSaving(false);
        return;
      }
      if (!String(profileForm.year_graduated || '').trim()) {
        setErrorMessage('Please fill out the Year Graduated field before saving your profile.');
        setSaving(false);
        return;
      }
    }

    // Validate year graduated (if provided)
    if (profileForm.year_graduated && String(profileForm.year_graduated).trim() !== '') {
      const profileYearError = validateYear(String(profileForm.year_graduated).trim(), profileForm.birthday);
      if (profileYearError) {
        setProfileYearGraduatedError(profileYearError);
        setErrorMessage('Education: ' + profileYearError);
        setSaving(false);
        return;
      }
    }

    // Validate ZIP Code format (4 digits)
    const zipToValidate = String(profileForm.postal_code || profileForm.zip || '').trim();
    if (zipToValidate && !/^\d{4}$/.test(zipToValidate)) {
      setErrorMessage('ZIP Code must be exactly 4 digits.');
      setSaving(false);
      return;
    }

    // Validate profile work experiences (match Submit Application layout)
    const profileWork = Array.isArray(profileForm.work_experiences) ? profileForm.work_experiences : [];
    for (let i = 0; i < profileWork.length; i++) {
      const exp = profileWork[i] || {};
      if (!exp.start) continue;
      const startDate = new Date(String(exp.start) + '-01');
      if (Number.isNaN(startDate.getTime())) continue;
      const today = new Date();
      if (startDate > today) {
        setErrorMessage(`Work Experience #${i + 1}: Start date cannot be in the future`);
        setSaving(false);
        return;
      }
      if (exp.end) {
        const endDate = new Date(String(exp.end) + '-01');
        if (!Number.isNaN(endDate.getTime()) && endDate < startDate) {
          setErrorMessage(`Work Experience #${i + 1}: End date cannot be before start date`);
          setSaving(false);
          return;
        }
        if (!Number.isNaN(endDate.getTime()) && endDate > today) {
          setErrorMessage(`Work Experience #${i + 1}: End date cannot be in the future`);
          setSaving(false);
          return;
        }
      }
    }

    // Compute a human-friendly period string (backward compatible)
    const workExperiencesToSave = profileWork.map((exp) => {
      const e = exp && typeof exp === 'object' ? { ...exp } : {};
      if (e.start) {
        const startLabel = (() => {
          const d = new Date(String(e.start) + '-01');
          if (Number.isNaN(d.getTime())) return String(e.start);
          return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        })();
        const endLabel = e.end
          ? (() => {
              const d = new Date(String(e.end) + '-01');
              if (Number.isNaN(d.getTime())) return String(e.end);
              return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            })()
          : 'Present';
        e.period = `${startLabel} - ${endLabel}`;
      }
      return e;
    });

    // Combine unit_house_number and street for the address field
    const streetPart = [
      profileForm.unit_house_number,
      profileForm.street
    ]
      .map((part) => String(part || '').trim())
      .filter(Boolean)
      .join(' ');

    const combinedAddress = [
      streetPart,
      profileForm.barangay,
      profileForm.city,
      profileForm.province,
      profileForm.postal_code || profileForm.zip,
    ]
      .map((part) => String(part || '').trim())
      .filter(Boolean)
      .join(', ');

    // Handle resume upload if a new file was selected
    let resumePathToSave = profileForm.resume_path || null;
    if (profileResumeFile) {
      const sanitizedFileName = profileResumeFile.name.replace(/\s+/g, '_');
      const filePath = `${user.id}/${Date.now()}-${sanitizedFileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resume')
        .upload(filePath, profileResumeFile, {
          upsert: true,
        });

      if (uploadError) {
        console.error('Error uploading resume:', uploadError);
        setErrorMessage('Failed to upload resume: ' + uploadError.message);
        setSaving(false);
        return;
      }

      resumePathToSave = uploadData.path;
      setProfileResumeFile(null);
    }

    const birthdayValue = profileForm.birthday || '';
    const birthdayPatch = { birthday: birthdayValue };
    if (profileData && typeof profileData === 'object') {
      if ('birth_date' in profileData) birthdayPatch.birth_date = birthdayValue;
      if ('birthdate' in profileData) birthdayPatch.birthdate = birthdayValue;
      if ('date_of_birth' in profileData) birthdayPatch.date_of_birth = birthdayValue;
      if ('dob' in profileData) birthdayPatch.dob = birthdayValue;
    }

    const baseUpdatePayload = {
      fname: String(profileForm.fname || '').trim(),
      mname: String(profileForm.mname || '').trim() || null,
      lname: String(profileForm.lname || '').trim(),
        address: combinedAddress,
        unit_house_number: profileForm.unit_house_number,
        street: profileForm.street,
        barangay: profileForm.barangay,
        city: profileForm.city,
        province: profileForm.province,
        zip: profileForm.postal_code || profileForm.zip || '', // Use zip column (postal_code is just the form field name)
        sex: profileForm.sex,
        ...birthdayPatch,
        age: profileForm.age,
        marital_status: profileForm.marital_status,
        educational_attainment: normalizeEducationAttainment(profileForm.educational_attainment) || null,
        institution_name: profileForm.institution_name || null,
        year_graduated: profileForm.year_graduated || null,
        education_program: profileForm.education_program || null,
        skills: Array.isArray(profileForm.skills) ? profileForm.skills : normalizeSkills(profileForm.skills),
        work_experiences: workExperiencesToSave,
        character_references: profileForm.character_references || [],
        preferred_depot: profileForm.preferred_depot || null,
        resume_path: resumePathToSave
      };

    // Some deployments may not yet have the education_program column.
    // Try update with it; if PostgREST rejects the column, retry without it.
    let updateError = null;
    {
      const res = await supabase
        .from('applicants')
        .update(baseUpdatePayload)
        .ilike('email', user.email);
      updateError = res?.error || null;
    }

    let didWarnProgramNotSaved = false;
    if (updateError && String(updateError.message || '').toLowerCase().includes('education_program')) {
      const { education_program: _drop, ...fallbackPayload } = baseUpdatePayload;
      const res2 = await supabase
        .from('applicants')
        .update(fallbackPayload)
        .ilike('email', user.email);
      updateError = res2?.error || null;
      if (!updateError) {
        didWarnProgramNotSaved = true;
      }
    }

    if (updateError) {
      console.error('Error updating profile:', updateError);
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
      const mergedProfile = { ...updatedData, ...parseAddressParts(updatedData) };

      const resolvedBirthday = resolveBirthdayValue(mergedProfile);
      const calculatedAge = resolvedBirthday ? calculateAge(resolvedBirthday) : mergedProfile.age || '';
      const mergedWithBirthday = { ...mergedProfile, birthday: resolvedBirthday };

      setProfileData(mergedWithBirthday);
      setProfileForm({
        fname: mergedWithBirthday.fname || '',
        mname: mergedWithBirthday.mname || '',
        lname: mergedWithBirthday.lname || '',
        address: mergedWithBirthday.address || '',
        unit_house_number: mergedWithBirthday.unit_house_number || '',
        street: mergedWithBirthday.street || '',
        barangay: mergedWithBirthday.barangay || '',
        city: mergedWithBirthday.city || '',
        province: mergedWithBirthday.province || '',
        postal_code: mergedWithBirthday.postal_code || mergedWithBirthday.zip || '',
        zip: mergedWithBirthday.zip || mergedWithBirthday.postal_code || '',
        sex: mergedWithBirthday.sex || '',
        birthday: mergedWithBirthday.birthday || '',
        age: calculatedAge || '',
        marital_status: mergedWithBirthday.marital_status || '',
        educational_attainment: normalizeEducationAttainment(mergedWithBirthday.educational_attainment) || '',
        institution_name: mergedWithBirthday.institution_name || '',
        year_graduated: mergedWithBirthday.year_graduated || '',
        education_program: mergedWithBirthday.education_program || '',
        skills: normalizeSkills(mergedWithBirthday.skills),
        work_experiences: mergedWithBirthday.work_experiences || [],
        character_references: normalizeCharacterReferences(mergedWithBirthday.character_references),
        preferred_depot: mergedWithBirthday.preferred_depot || '',
        resume_path: mergedWithBirthday.resume_path || ''
      });
      prefillApplicationForm(mergedWithBirthday);
    }

    setIsEditMode(false);
    setSuccessMessage('Profile updated successfully!');
    if (didWarnProgramNotSaved && (profileForm.education_program || '').trim()) {
      setErrorMessage('Strand/Program could not be saved because the database is missing the "education_program" column. Ask an admin to add the column, then try again.');
      setTimeout(() => setErrorMessage(''), 8000);
    }
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
        fname: profileData.fname || '',
        mname: profileData.mname || '',
        lname: profileData.lname || '',
        address: profileData.address || '',
        unit_house_number: profileData.unit_house_number || '',
        street: profileData.street || '',
        barangay: profileData.barangay || '',
        city: profileData.city || '',
        province: profileData.province || '',
        postal_code: profileData.postal_code || profileData.zip || '',
        zip: profileData.zip || profileData.postal_code || '',
        sex: profileData.sex || '',
        birthday: profileData.birthday || '',
        age: profileData.age || '',
        marital_status: profileData.marital_status || '',
        educational_attainment: normalizeEducationAttainment(profileData.educational_attainment) || '',
        institution_name: profileData.institution_name || '',
        year_graduated: profileData.year_graduated || '',
        education_program: profileData.education_program || '',
        skills: normalizeSkills(profileData.skills),
        work_experiences: profileData.work_experiences || [],
        character_references: normalizeCharacterReferences(profileData.character_references),
        preferred_depot: profileData.preferred_depot || '',
        resume_path: profileData.resume_path || ''
      });
  }
  setProfileResumeFile(null);
  setBirthdayError('');
  setProfileYearGraduatedError('');
  setProfileEmploymentPeriodErrors([]);
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

// Birthday can be stored under different column names depending on deployment.
// Prefer explicit DOB fields over a generic `birthday`.
const resolveBirthdayValue = (record = {}) => {
  if (!record || typeof record !== 'object') return '';
  return (
    record.birth_date ||
    record.birthdate ||
    record.date_of_birth ||
    record.dob ||
    record.birthday ||
    ''
  );
};

const parsePayloadObject = (payload) => {
  if (!payload) return {};
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return payload && typeof payload === 'object' ? payload : {};
};

const getInterviewScheduleFromApplication = (application) => {
  const payloadObj = parsePayloadObject(application?.payload);
  const interviewObj = payloadObj?.interview || payloadObj?.form?.interview || {};

  const date = application?.interview_date || interviewObj?.date || payloadObj?.form?.interview_date || null;
  const time = application?.interview_time || interviewObj?.time || payloadObj?.form?.interview_time || null;
  const location = application?.interview_location || interviewObj?.location || payloadObj?.form?.interview_location || null;
  const interviewer = application?.interviewer || interviewObj?.interviewer || payloadObj?.form?.interviewer || null;
  const type =
    application?.interview_type ||
    payloadObj?.interview_type ||
    interviewObj?.type ||
    'onsite';

  return { date, time, location, interviewer, type };
};

const getInterviewNotesFromApplication = (application) => {
  const payloadObj = parsePayloadObject(application?.payload);
  const notes =
    application?.interview_notes ??
    payloadObj?.interview_notes ??
    payloadObj?.interviewNotes ??
    '';

  const rawList = payloadObj?.interview_notes_attachments || payloadObj?.interviewNotesAttachments;
  const list = Array.isArray(rawList) ? rawList.slice() : [];
  const single = payloadObj?.interview_notes_attachment || payloadObj?.interviewNotesAttachment || null;
  if (single && typeof single === 'object' && single.path) {
    const exists = list.some((x) => x && typeof x === 'object' && x.path === single.path);
    if (!exists) list.push(single);
  }

  // Keep backwards-compat with single-file columns.
  const colPath = application?.interview_notes_file || payloadObj?.interview_notes_file || payloadObj?.interviewNotesFile || null;
  const colLabel = application?.interview_notes_file_label || payloadObj?.interview_notes_file_label || payloadObj?.interviewNotesFileLabel || null;
  if (colPath) {
    const exists = list.some((x) => x && typeof x === 'object' && x.path === colPath);
    if (!exists) {
      list.push({
        path: colPath,
        label: colLabel || 'Interview Attachment',
        originalName: null,
        uploadedAt: null,
      });
    }
  }

  return { notes: String(notes || ''), attachments: list.filter(Boolean) };
};

const getAgreementSigningFromApplication = (application) => {
  const payloadObj = parsePayloadObject(application?.payload);
  const signing =
    payloadObj?.agreement_signing ||
    payloadObj?.agreementSigning ||
    payloadObj?.signing_interview ||
    payloadObj?.signingInterview ||
    null;

  const date =
    application?.agreement_signing_date ||
    signing?.date ||
    null;
  const time =
    application?.agreement_signing_time ||
    signing?.time ||
    null;
  const location =
    application?.agreement_signing_location ||
    signing?.location ||
    null;

  const status =
    application?.agreement_signing_confirmed ||
    payloadObj?.agreement_signing_confirmed ||
    payloadObj?.agreementSigningConfirmed ||
    'Idle';

  return { date, time, location, status };
};

const getAgreementDocumentsFromApplication = (application) => {
  const payloadObj = parsePayloadObject(application?.payload);
  const rawList =
    payloadObj?.agreement_documents ||
    payloadObj?.agreementDocuments ||
    payloadObj?.agreements_documents ||
    null;
  const list = Array.isArray(rawList) ? rawList.slice() : [];

  // Compatibility: also show known agreement-related columns if present.
  const compatKeys = [
    { key: 'appointment_letter_file', label: 'Appointment Letter' },
    { key: 'undertaking_file', label: 'Undertaking' },
    { key: 'application_form_file', label: 'Application Form' },
    { key: 'undertaking_duties_file', label: 'Undertaking Duties' },
    { key: 'pre_employment_requirements_file', label: 'Pre-employment Requirements' },
    { key: 'id_form_file', label: 'ID Form' },
  ];
  for (const item of compatKeys) {
    const path = application?.[item.key] || payloadObj?.[item.key] || null;
    if (!path) continue;
    const exists = list.some((x) => x && typeof x === 'object' && x.path === path);
    if (!exists) {
      list.push({
        path,
        label: item.label,
        originalName: null,
        uploadedAt: null,
      });
    }
  }

  return list.filter((x) => x && typeof x === 'object' && x.path);
};

const getApplicationFilesPublicUrl = (path) => {
  if (!path) return null;
  return supabase.storage.from('application-files').getPublicUrl(path)?.data?.publicUrl || null;
};

    // Helper function to normalize skills (array or string to array)
    const normalizeSkills = (skills) => {
      if (Array.isArray(skills)) {
        return skills.filter(s => s && s.trim() !== '');
      }
      if (typeof skills === 'string' && skills.trim() !== '') {
        // Try to parse as JSON first (in case it's stored as JSON string in database)
        try {
          const parsed = JSON.parse(skills);
          if (Array.isArray(parsed)) {
            return parsed.filter(s => s && s.trim() !== '');
          }
        } catch {
          // Not valid JSON, treat as comma-separated string
        }
        // Fallback to comma-separated parsing
        return skills.split(',').map(s => s.trim()).filter(Boolean);
      }
      return [];
    };

    const normalizeCharacterReferences = (refs) => {
      if (!Array.isArray(refs)) return [];

      return refs.map((r) => {
        const record = r && typeof r === 'object' ? r : {};
        return {
          fullName: record.fullName || record.name || '',
          relationship: record.relationship || '',
          jobTitle: record.jobTitle || '',
          company: record.company || '',
          phone: record.phone || record.contact || '',
          email: record.email || '',
        };
      });
    };
    const parseAddressParts = (record = {}) => {
      const address = record.address || '';
      const parts = address
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);

      return {
        unit_house_number: record.unit_house_number || '',
        street: record.street || parts[0] || '',
        barangay: record.barangay || parts[1] || '',
        city: record.city || parts[2] || '',
        province: record.province || parts[3] || '',
        postal_code: record.postal_code || record.zip || parts[4] || '',
        zip: record.zip || record.postal_code || parts[4] || '',
      };
    };

    const normalizeEducationAttainment = (val) => {
      const raw = String(val ?? '').trim();
      if (!raw) return '';

      const canonical = new Set(EDUCATION_LEVEL_OPTIONS.map((o) => o.value).filter(Boolean));
      if (canonical.has(raw) || raw === 'N/A') return raw;

      const mapped = {
        'Elementary School': 'Elementary',
        'High School Graduate': 'Senior High School',
        'Secondary School Graduate': 'Senior High School',
        'College Graduate': 'College',
        'Vocational/Technical Course': 'Vocational',
        'Post Graduate (Masters/Doctorate)': 'Post Graduate',
      };

      return mapped[raw] || raw;
    };

    const prefillApplicationForm = (profile) => {
      if (!profile) return;
      // Normalize skills to array format
      const skillsValue = normalizeSkills(profile.skills);
      const { unit_house_number, street, barangay, city, province, zip } = parseAddressParts(profile);
      const resolvedBirthday = resolveBirthdayValue(profile);

      const workFromProfile = Array.isArray(profile.work_experiences) ? profile.work_experiences : [];
      const refsFromProfile = normalizeCharacterReferences(profile.character_references);

      // Get resume name from path if available
      const resumeName = profile.resume_path ? profile.resume_path.split('/').pop() : '';

      setForm((prev) => ({
        ...prev,
        firstName: profile.fname || '',
        middleName: profile.mname || '',
        lastName: profile.lname || '',
        unit_house_number: unit_house_number || '',
        street: street || '',
        barangay: barangay || '',
        city: city || '',
        province: province || '',
        zip: zip || '',
        contact: profile.contact_number || '',
        email: profile.email || '',
        birthday: resolvedBirthday || '',
        maritalStatus: profile.marital_status ? profile.marital_status.toLowerCase() : '',
        sex: profile.sex || '',
        skills: skillsValue,
        edu1Level: normalizeEducationAttainment(profile.educational_attainment || prev.edu1Level),
        edu1Institution: profile.institution_name || '',
        edu1Year: profile.year_graduated || '',
        edu1Program: profile.education_program || prev.edu1Program || '',
        resumePath: profile.resume_path || prev.resumePath || '',
        resumeName: resumeName || prev.resumeName || '',
      }));

      setWorkExperiences(workFromProfile.length ? workFromProfile : [{}]);
      setCharacterReferences(refsFromProfile.length ? refsFromProfile : [{}]);
    };

    // helpers
    const handleInput = (e) => {
      const { name, value } = e.target;
      
      // Handle contact number - only allow numbers and max 11 digits
      if (name === 'contact') {
        const numericValue = value.replace(/\D/g, '');
        const limitedValue = numericValue.slice(0, 11);
        setForm((f) => ({ ...f, [name]: limitedValue }));
        
        // Validate contact number length
        if (limitedValue.length > 0 && limitedValue.length !== 11) {
          setContactError('Contact number must be exactly 11 digits');
        } else {
          setContactError('');
        }
        return;
      }
      if (name === 'zip') {
        const numericValue = value.replace(/\D/g, '').slice(0, 4);
        setForm((f) => ({ ...f, [name]: numericValue }));
        return;
      }
      
      setForm((f) => ({ ...f, [name]: value }));
      
      if (name === 'birthday') {
        validateFormBirthday(value);
        if (form.edu1Year) {
          setYearErrors((prev) => ({ ...prev, edu1Year: validateYear(form.edu1Year, value) }));
        }
        if (form.edu2Year) {
          setYearErrors((prev) => ({ ...prev, edu2Year: validateYear(form.edu2Year, value) }));
        }
      }
      if (name === 'startDate') {
        validateStartDate(value);
      }
      if (name === 'email') {
        // Validate email format - check for @ and domain
        if (value.trim() === '') {
          setEmailError('');
        } else if (!value.includes('@') || !value.split('@')[1]?.includes('.')) {
          setEmailError('Please enter a valid email address');
        } else {
          setEmailError('');
        }
      }
    };

    const handleCheckbox = (e) => {
      const { name, checked } = e.target;
      setForm((f) => ({ ...f, [name]: checked }));
    };

    const handleResumeChange = (e) => {
      const file = e.target.files?.[0];
      if (!file) {
        setForm((f) => ({ ...f, resumeName: '' }));
        setResumeFile(null);
        return;
      }

      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        setErrorMessage('Please upload a PDF file only.');
        e.target.value = '';
        setForm((f) => ({ ...f, resumeName: '' }));
        setResumeFile(null);
        return;
      }

      setForm((f) => ({ ...f, resumeName: file.name }));
      setResumeFile(file);
    };

    const handleCertificateChange = (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const validFiles = [];
      for (const file of files) {
        const isValidType = 
          file.type === 'application/pdf' || 
          file.type.startsWith('image/') ||
          file.name.toLowerCase().match(/\.(pdf|png|jpg|jpeg)$/);
        
        if (!isValidType) {
          setErrorMessage('Please upload only PDF or image files (PNG, JPG, JPEG).');
          e.target.value = '';
          return;
        }

        if (file.size > 10 * 1024 * 1024) {
          setErrorMessage(`File ${file.name} exceeds 10MB limit.`);
          e.target.value = '';
          return;
        }

        validFiles.push(file);
      }

      setCertificateFiles(prev => [...prev, ...validFiles]);
      e.target.value = '';
    };

    const removeCertificateFile = (index) => {
      setCertificateFiles(prev => prev.filter((_, i) => i !== index));
    };

    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    const fetchUserApplication = async (userId) => {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        console.error('Error fetching user application(s):', error);
        return;
      }

      const list = Array.isArray(data) ? data : [];
      setUserApplications(list);
      setUserApplication(list.length > 0 ? list[0] : null); // keep backward-compatible “latest”
    };

    useEffect(() => {
      const list = Array.isArray(userApplications) ? userApplications : [];
      if (list.length === 0) {
        setSelectedApplicationId(null);
        return;
      }

      // Preserve current selection if it still exists.
      const currentId = selectedApplicationId;
      const stillExists = currentId && list.some((a) => String(a?.id) === String(currentId));
      if (stillExists) return;

      setSelectedApplicationId(list[0].id);
      setMyApplicationsStep('Application');
    }, [userApplications, selectedApplicationId]);

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

    const updateProfileWork = (idx, key, value) => {
      setProfileForm((prev) => {
        const current = Array.isArray(prev.work_experiences) ? prev.work_experiences : [];
        const copy = [...current];
        copy[idx] = { ...(copy[idx] || {}), [key]: value };
        return { ...prev, work_experiences: copy };
      });
    };

    const addProfileWork = () => {
      setProfileForm((prev) => {
        const current = Array.isArray(prev.work_experiences) ? prev.work_experiences : [];
        return { ...prev, work_experiences: [...current, {}] };
      });
    };

    const updateProfileReference = (idx, key, value) => {
      setProfileForm((prev) => {
        const current = Array.isArray(prev.character_references) ? prev.character_references : [];
        const copy = [...current];
        copy[idx] = { ...(copy[idx] || {}), [key]: value };
        return { ...prev, character_references: copy };
      });
    };

    const addProfileReference = () => {
      setProfileForm((prev) => {
        const current = Array.isArray(prev.character_references) ? prev.character_references : [];
        return { ...prev, character_references: [...current, {}] };
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
      setWorkExperiences(
        Array.isArray(profileForm.work_experiences) && profileForm.work_experiences.length
          ? profileForm.work_experiences
          : [{}]
      );
      setCharacterReferences(
        Array.isArray(profileForm.character_references) && profileForm.character_references.length
          ? profileForm.character_references
          : [{}]
      );
      setApplicationTab('personal');
      setShowModal(true);
    };

    const validatePersonalTabForProceed = () => {
      const nonEditableKeys = new Set(['firstName', 'lastName', 'email', 'birthday']);

      const missingRequired = requiredFormFields.find(({ key }) => {
        if (nonEditableKeys.has(key)) return false;
        const value = form[key];
        return String(value ?? '').trim() === '';
      });

      if (missingRequired) {
        return `Please complete the ${missingRequired.label} field before proceeding.`;
      }

      // Resume is required, but file input is hidden when a profile resume exists.
      if (!form.resumePath && !resumeFile) {
        return 'Please upload your resume (PDF) before proceeding.';
      }

      // Do not block on non-editable (read-only) fields.
      if (!nonEditableKeys.has('birthday') && form.birthday && !validateFormBirthday(form.birthday)) {
        return 'Please fix the birthday field before proceeding.';
      }

      if (form.startDate && !validateStartDate(form.startDate)) {
        return 'Please fix the available start date before proceeding.';
      }

      if (form.zip && String(form.zip).trim().length !== 4) {
        return 'ZIP code must be exactly 4 digits.';
      }

      if (form.contact && validatePhoneNumber(form.contact)) {
        return 'Please fix the contact number field before proceeding.';
      }

      if (!nonEditableKeys.has('email')) {
        const emailErr = validateEmail(form.email);
        if (emailErr) return emailErr;
      }

      return '';
    };

    const attemptSetApplicationTab = (nextTabKey) => {
      // Prevent leaving Personal tab if required fields are incomplete/invalid.
      if (applicationTab === 'personal' && nextTabKey !== 'personal') {
        const err = validatePersonalTabForProceed();
        if (err) {
          setErrorMessage(err);
          return;
        }
      }

      setErrorMessage('');
      setApplicationTab(nextTabKey);
    };

    // submit -> show summary with what user typed
    const onSubmitApplication = (e) => {
      e.preventDefault();
      setErrorMessage('');
      
      // Find current tab index first
      const currentTabIndex = formTabs.findIndex(tab => tab.key === applicationTab);
      const isLastTab = currentTabIndex === formTabs.length - 1;
      
      // Require personal fields before leaving the Personal tab.
      if (applicationTab === 'personal') {
        const err = validatePersonalTabForProceed();
        if (err) {
          setErrorMessage(err);
          return;
        }

        if (!selectedJob && !newJob) {
          setErrorMessage('Please choose a job first (click View on a job card).');
          return;
        }
      }
      
      // Validate current tab fields based on which tab we're on
      if (applicationTab === 'education' || isLastTab) {
        // Validate year fields only if they have values
        if (form.edu1Year && form.edu1Year.trim() !== '') {
          const edu1YearError = validateYear(form.edu1Year, form.birthday);
          if (edu1YearError) {
            setErrorMessage('Education: ' + edu1YearError);
            return;
          }
        }
        if (form.edu2Year && form.edu2Year.trim() !== '') {
          const edu2YearError = validateYear(form.edu2Year, form.birthday);
          if (edu2YearError) {
            setErrorMessage('Education: ' + edu2YearError);
            return;
          }
        }
      }

      if (applicationTab === 'experience' || isLastTab) {
        // Validate start/end dates only if they have values
        for (let i = 0; i < workExperiences.length; i++) {
          const exp = workExperiences[i];
          if (exp.start && exp.end) {
            // Validate that end date is not before start date
            const startDate = new Date(exp.start);
            const endDate = new Date(exp.end);
            if (endDate < startDate) {
              setErrorMessage(`Work Experience #${i + 1}: End date cannot be before start date`);
              return;
            }
          }
        }
      }

      if (applicationTab === 'references' || isLastTab) {
        for (let i = 0; i < characterReferences.length; i++) {
          const ref = characterReferences[i] || {};
          const hasAnyValue = ['fullName', 'relationship', 'jobTitle', 'company', 'phone', 'email'].some(
            (k) => String(ref[k] ?? '').trim() !== ''
          );

          if (!hasAnyValue) continue;

          const requiredRefFields = [
            { key: 'fullName', label: 'Full Name' },
            { key: 'relationship', label: 'Relationship' },
            { key: 'jobTitle', label: 'Job Title' },
            { key: 'company', label: 'Company' },
            { key: 'phone', label: 'Phone Number' },
            { key: 'email', label: 'Email' },
          ];

          const missing = requiredRefFields.find(({ key }) => String(ref[key] ?? '').trim() === '');
          if (missing) {
            setErrorMessage(`Reference #${i + 1}: ${missing.label} is required.`);
            return;
          }

          const nameError = validateReferenceName(String(ref.fullName || ''));
          if (nameError) {
            setErrorMessage(`Reference #${i + 1}: ${nameError}`);
            return;
          }

          const phoneError = validatePhoneNumber(String(ref.phone || ''));
          if (phoneError) {
            setErrorMessage(`Reference #${i + 1}: ${phoneError}`);
            return;
          }

          const emailErrorMsg = validateEmail(String(ref.email || ''));
          if (emailErrorMsg) {
            setErrorMessage(`Reference #${i + 1}: ${emailErrorMsg}`);
            return;
          }
        }
      }
      
      // If on the last tab (references), validate references for office workers and submit
      if (isLastTab) {
        const jobType = (selectedJob || newJob)?.job_type?.toLowerCase();
        
        // Require at least one complete reference for office employees
        if (jobType === 'office_employee') {
          const hasValidReference = characterReferences.some((ref) => {
            const r = ref || {};
            const requiredKeys = ['fullName', 'relationship', 'jobTitle', 'company', 'phone', 'email'];
            const complete = requiredKeys.every((k) => String(r[k] ?? '').trim() !== '');
            if (!complete) return false;

            if (validateReferenceName(String(r.fullName || ''))) return false;
            if (validatePhoneNumber(String(r.phone || ''))) return false;
            if (validateEmail(String(r.email || ''))) return false;

            return true;
          });
          
          if (!hasValidReference) {
            setErrorMessage('Please provide at least one complete reference for office positions.');
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
      if (submitting) return; // Prevent double submission
      
      setSubmitting(true);
      setErrorMessage('');

      const { data: { session }, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) {
        setErrorMessage('Could not check session: ' + sessErr.message);
        setSubmitting(false);
        return;
      }
      if (!session) {
        setErrorMessage('Please log in again.');
        setSubmitting(false);
        setTimeout(() => {
          navigate('/applicant/login', { replace: true, state: { redirectTo: '/applicantl/home' } });
        }, 2000);
        return;
      }

      const userId = session.user.id;

      const job = selectedJob || newJob || null;

      let resumeStoragePath = form.resumePath || null;

      // If no resume file was uploaded in the form, try to get it from profile
      if (!resumeFile && !resumeStoragePath) {
        // Fetch profile to get resume_path
        const { data: applicantData } = await supabase
          .from('applicants')
          .select('resume_path')
          .eq('id', userId)
          .maybeSingle();
        
        if (applicantData?.resume_path) {
          resumeStoragePath = applicantData.resume_path;
          // Update form state to reflect the profile resume
          setForm((prev) => ({ ...prev, resumePath: resumeStoragePath }));
        }
      }

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

      // Upload certificates
      const certificatesPaths = [];
      for (let i = 0; i < certificateFiles.length; i++) {
        const certFile = certificateFiles[i];
        const sanitizedFileName = certFile.name.replace(/\s+/g, '_');
        const filePath = `${userId}/certificates/${Date.now()}-${i}-${sanitizedFileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('external_certificates')
          .upload(filePath, certFile, {
            upsert: true,
          });

        if (uploadError) {
          console.error(uploadError);
          setErrorMessage(`Failed to upload certificate ${certFile.name}: ` + uploadError.message);
          return;
        }

        certificatesPaths.push({
          path: uploadData.path,
          name: certFile.name,
          size: certFile.size
        });
      }

      setCertificateFiles([]);

      const skillsArray = normalizeSkills(form.skills);
      const formPayload = {
        ...form,
        skills: skillsArray,
        skills_text: skillsArray.join(', '),
        department: job?.department || null, // Add department from job post
        certificates: certificatesPaths, // Add certificates to payload
      };
      if (resumeStoragePath) {
        formPayload.resumePath = resumeStoragePath;
      }

      // Format work experiences with period from start/end dates
      const formattedWorkExperiences = workExperiences.map(exp => {
        if (exp.start || exp.end) {
          const startFormatted = exp.start ? new Date(exp.start + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';
          const endFormatted = exp.end ? new Date(exp.end + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Present';
          return {
            ...exp,
            period: exp.start && exp.end ? `${startFormatted} - ${endFormatted}` : exp.start ? `${startFormatted} - Present` : ''
          };
        }
        return exp;
      });

      const payload = {
        form: formPayload,
        workExperiences: formattedWorkExperiences,
        characterReferences,
        job, // snapshot of the job
      };

      const jobId = job?.id;
      if (!jobId) {
        setErrorMessage('Selected job post is invalid. Please refresh and try again.');
        return;
      }

      // Prevent new applications if job is already closed/filled.
      const { data: jobPost, error: jobFetchError } = await supabase
        .from('job_posts')
        .select('id, is_active, expires_at, positions_needed')
        .eq('id', jobId)
        .maybeSingle();

      if (jobFetchError || !jobPost) {
        console.error('Failed to fetch job post before applying:', jobFetchError);
        setErrorMessage('Unable to verify job post status. Please try again.');
        return;
      }

      // Close expired jobs proactively
      if (jobPost.expires_at) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiresAt = new Date(jobPost.expires_at);
        expiresAt.setHours(0, 0, 0, 0);
        if (today >= expiresAt) {
          await supabase.from('job_posts').update({ is_active: false }).eq('id', jobId);
          setErrorMessage('This job post is already closed.');
          return;
        }
      }

      if (jobPost.is_active === false) {
        setErrorMessage('This job post is already closed.');
        return;
      }

      const positionsNeededNum = Number(jobPost.positions_needed);
      const hasLimit = Number.isFinite(positionsNeededNum) && positionsNeededNum > 0;
      if (hasLimit) {
        const { count: hiredCount, error: hiredCountError } = await supabase
          .from('applications')
          .select('id', { count: 'exact', head: true })
          .eq('job_id', jobId)
          .eq('status', 'hired');

        if (hiredCountError) {
          console.error('Failed to count hired applications:', hiredCountError);
          setErrorMessage('Unable to verify available slots. Please try again.');
          return;
        }

        if ((hiredCount || 0) >= positionsNeededNum) {
          await supabase.from('job_posts').update({ is_active: false }).eq('id', jobId);
          setErrorMessage('This job post is already closed (employees needed has been reached).');
          return;
        }
      }

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

      // Create notifications for HR users
      if (insertedData && insertedData.length > 0) {
        try {
          // Get all HR and HRC users
          const { data: hrUsers, error: hrError } = await supabase
            .from('profiles')
            .select('id, role, depot')
            .in('role', ['HR', 'HRC']);

          if (!hrError && hrUsers && hrUsers.length > 0) {
            const applicantName = `${form.firstName || ''} ${form.lastName || ''}`.trim() || 'Unknown Applicant';
            const position = job?.title || 'Unknown Position';
            const jobDepot = job?.depot;

            // Create notification for each HR user (filter by depot for HRC)
            for (const hrUser of hrUsers) {
              // Skip if HRC and depot doesn't match
              if (hrUser.role === 'HRC' && hrUser.depot && hrUser.depot !== jobDepot) {
                continue;
              }

              await createNotification({
                userId: hrUser.id,
                applicationId: insertedData[0].id,
                type: 'application',
                title: 'New Application Received',
                message: `${applicantName} applied for ${position}`,
                userType: 'profile'
              });
            }
          }
        } catch (notifError) {
          console.error('Error creating HR notifications:', notifError);
          // Don't fail the application if notification fails
        }

        setUserApplication(insertedData[0]);
        setUserApplications((prev) => {
          const next = [insertedData[0], ...(Array.isArray(prev) ? prev : [])];
          // Ensure newest first and avoid duplicate ids
          const seen = new Set();
          const deduped = [];
          for (const item of next) {
            const id = item?.id;
            if (!id || seen.has(id)) continue;
            seen.add(id);
            deduped.push(item);
          }
          deduped.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
          return deduped;
        });
      }

      setShowSummary(false);
      setShowSuccessPage(true);
      setSubmitting(false);
    };

    const [authChecked, setAuthChecked] = useState(false);

    const latestApplicationStatus = String(userApplication?.status || '').toLowerCase();
    const hasExistingApplication = Boolean(userApplication);
    const appliedJobId = userApplication?.job_id || null;
    // Keep the existing “only show my job” behavior except when the latest application is rejected.
    const shouldLockToAppliedJob = hasExistingApplication && !!appliedJobId && latestApplicationStatus !== 'rejected';

    const selectedApplication = (() => {
      const list = Array.isArray(userApplications) ? userApplications : [];
      if (selectedApplicationId) {
        const found = list.find((a) => String(a?.id) === String(selectedApplicationId));
        if (found) return found;
      }
      return userApplication || (list.length > 0 ? list[0] : null);
    })();

    const selectedApplicationPayload = parsePayloadObject(selectedApplication?.payload);
    const selectedApplicationJob = selectedApplicationPayload?.job || selectedApplicationPayload?.form?.job || null;

    const getLatestStatusForJob = (jobId) => {
      if (!jobId) return '';
      let best = null;
      for (const app of (Array.isArray(userApplications) ? userApplications : [])) {
        if (app?.job_id !== jobId) continue;
        if (!best) {
          best = app;
          continue;
        }
        const a = new Date(app?.created_at || 0);
        const b = new Date(best?.created_at || 0);
        if (a > b) best = app;
      }
      return String(best?.status || '').toLowerCase();
    };
    

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

    // Fetch all provinces from PSGC API on mount
    useEffect(() => {
      const fetchProvinces = async () => {
        setLoadingProvinces(true);
        try {
          const response = await fetch('https://psgc.gitlab.io/api/provinces/');
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          console.log('Provinces loaded:', data.length);
          
          // Add Metro Manila (NCR) to the provinces list since it's not included as a province
          // Metro Manila is the National Capital Region
          const metroManila = {
            code: '130000000',
            name: 'Metro Manila',
            regionCode: '13',
            regionName: 'National Capital Region'
          };
          
          // Combine fetched provinces with Metro Manila, placing Metro Manila at the beginning
          const allProvinces = [metroManila, ...(Array.isArray(data) ? data : [])];
          setProvinces(allProvinces);
        } catch (error) {
          console.error('Error fetching provinces:', error);
          // Even if API fails, include Metro Manila
          const metroManila = {
            code: '130000000',
            name: 'Metro Manila',
            regionCode: '13',
            regionName: 'National Capital Region'
          };
          setProvinces([metroManila]);
        } finally {
          setLoadingProvinces(false);
        }
      };
      fetchProvinces();
    }, []);

    // Fetch cities when province is selected (for profile form)
    useEffect(() => {
      if (profileForm.province && provinces.length > 0) {
        const fetchProfileCities = async () => {
          setLoadingProfileCities(true);
          try {
            // Find the province code from the province name (case-insensitive match)
            const selectedProvince = provinces.find(p => 
              p.name && p.name.toLowerCase().trim() === profileForm.province.toLowerCase().trim()
            );
            
            // Special handling for Metro Manila - fetch from NCR endpoint
            if (selectedProvince && selectedProvince.name === 'Metro Manila') {
              setLoadingProfileCities(true);
              try {
                // Metro Manila cities are fetched from the NCR region endpoint
                const response = await fetch('https://psgc.gitlab.io/api/regions/130000000/cities-municipalities/');
                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setProfileCities(Array.isArray(data) ? data : []);
                cityCache.current['130000000'] = Array.isArray(data) ? data : [];
              } catch (error) {
                console.error('Error fetching Metro Manila cities:', error);
                setProfileCities([]);
              } finally {
                setLoadingProfileCities(false);
              }
              return;
            }
            
            if (selectedProvince && selectedProvince.code) {
              // Check cache first
              if (cityCache.current[selectedProvince.code]) {
                setProfileCities(cityCache.current[selectedProvince.code]);
                setLoadingProfileCities(false);
                return;
              }

              const response = await fetch(`https://psgc.gitlab.io/api/provinces/${selectedProvince.code}/cities-municipalities/`);
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              const data = await response.json();
              cityCache.current[selectedProvince.code] = data;
              setProfileCities(Array.isArray(data) ? data : []);
            }
          } catch (error) {
            console.error('Error fetching profile cities:', error);
            setProfileCities([]);
          } finally {
            setLoadingProfileCities(false);
          }
        };
        fetchProfileCities();
      } else if (!profileForm.province) {
        setProfileCities([]);
        setProfileBarangays([]);
      }
    }, [profileForm.province, provinces.length]);

    // Fetch barangays when city is selected (for profile form)
    useEffect(() => {
      if (profileForm.city && profileCities.length > 0) {
        const fetchProfileBarangays = async () => {
          setLoadingProfileBarangays(true);
          try {
            // Find the city code from the city name
            const selectedCity = profileCities.find(c => c.name === profileForm.city);
            if (selectedCity) {
              // Check cache first
              if (barangayCache.current[selectedCity.code]) {
                setProfileBarangays(barangayCache.current[selectedCity.code]);
                setLoadingProfileBarangays(false);
                return;
              }

              const response = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${selectedCity.code}/barangays/`);
              const data = await response.json();
              barangayCache.current[selectedCity.code] = data;
              setProfileBarangays(data);
            }
          } catch (error) {
            console.error('Error fetching profile barangays:', error);
          } finally {
            setLoadingProfileBarangays(false);
          }
        };
        fetchProfileBarangays();
      } else {
        setProfileBarangays([]);
      }
    }, [profileForm.city, profileCities.length]);

    // Fetch cities when province is selected (for application form)
    useEffect(() => {
      if (form.province && provinces.length > 0) {
        const fetchApplicationCities = async () => {
          setLoadingApplicationCities(true);
          try {
            // Find the province code from the province name (case-insensitive match)
            const selectedProvince = provinces.find(p => 
              p.name && p.name.toLowerCase().trim() === form.province.toLowerCase().trim()
            );
            
            // Special handling for Metro Manila - fetch from NCR endpoint
            if (selectedProvince && selectedProvince.name === 'Metro Manila') {
              setLoadingApplicationCities(true);
              try {
                // Metro Manila cities are fetched from the NCR region endpoint
                const response = await fetch('https://psgc.gitlab.io/api/regions/130000000/cities-municipalities/');
                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setApplicationCities(Array.isArray(data) ? data : []);
                cityCache.current['130000000'] = Array.isArray(data) ? data : [];
              } catch (error) {
                console.error('Error fetching Metro Manila cities:', error);
                setApplicationCities([]);
              } finally {
                setLoadingApplicationCities(false);
              }
              return;
            }
            
            if (selectedProvince && selectedProvince.code) {
              // Check cache first
              if (cityCache.current[selectedProvince.code]) {
                setApplicationCities(cityCache.current[selectedProvince.code]);
                setLoadingApplicationCities(false);
                return;
              }

              const response = await fetch(`https://psgc.gitlab.io/api/provinces/${selectedProvince.code}/cities-municipalities/`);
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              const data = await response.json();
              cityCache.current[selectedProvince.code] = data;
              setApplicationCities(Array.isArray(data) ? data : []);
            }
          } catch (error) {
            console.error('Error fetching application cities:', error);
            setApplicationCities([]);
          } finally {
            setLoadingApplicationCities(false);
          }
        };
        fetchApplicationCities();
      } else if (!form.province) {
        setApplicationCities([]);
        setApplicationBarangays([]);
      }
    }, [form.province, provinces.length]);

    // Fetch barangays when city is selected (for application form)
    useEffect(() => {
      if (form.city && applicationCities.length > 0) {
        const fetchApplicationBarangays = async () => {
          setLoadingApplicationBarangays(true);
          try {
            // Find the city code from the city name
            const selectedCity = applicationCities.find(c => c.name === form.city);
            if (selectedCity) {
              // Check cache first
              if (barangayCache.current[selectedCity.code]) {
                setApplicationBarangays(barangayCache.current[selectedCity.code]);
                setLoadingApplicationBarangays(false);
                return;
              }

              const response = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${selectedCity.code}/barangays/`);
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              const data = await response.json();
              barangayCache.current[selectedCity.code] = data;
              setApplicationBarangays(Array.isArray(data) ? data : []);
            }
          } catch (error) {
            console.error('Error fetching application barangays:', error);
            setApplicationBarangays([]);
          } finally {
            setLoadingApplicationBarangays(false);
          }
        };
        fetchApplicationBarangays();
      } else {
        setApplicationBarangays([]);
      }
    }, [form.city, applicationCities.length]);

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

      const idSet = new Set(ids.map((v) => String(v)));
      const hiredByJobId = new Map();

      const bump = (jobId) => {
        const key = String(jobId || '');
        if (!key || !idSet.has(key)) return;
        hiredByJobId.set(key, (hiredByJobId.get(key) || 0) + 1);
      };

      const { data, error } = await supabasePublic
        .from('applications')
        .select('job_id, status')
        .in('job_id', ids);

      if (error) {
        console.error('load applications stats error:', error);
        return jobsList;
      }

      for (const row of data || []) {
        const jobId = row?.job_id;
        if (!jobId) continue;
        const status = String(row?.status || '').trim().toLowerCase();
        if (status === 'hired') bump(jobId);
      }

      // Back-compat: older application rows may store job id inside payload meta.
      const { data: legacyData, error: legacyError } = await supabasePublic
        .from('applications')
        .select('job_id, status, payload')
        .is('job_id', null)
        .limit(5000);

      if (legacyError) {
        console.warn('load legacy application stats error:', legacyError);
      } else {
        for (const row of legacyData || []) {
          const status = String(row?.status || '').trim().toLowerCase();
          if (status !== 'hired') continue;

          const payload = row?.payload;
          const legacyJobId =
            payload?.meta?.job_id ||
            payload?.meta?.jobId ||
            payload?.job_id ||
            payload?.jobId;

          if (legacyJobId) bump(legacyJobId);
        }
      }

      return (jobsList || []).map((job) => {
        const totalNum = Number(job?.positions_needed);
        const hasLimit = Number.isFinite(totalNum) && totalNum > 0;
        const total = hasLimit ? totalNum : null;
        const hired = hiredByJobId.get(String(job?.id)) || 0;
        const remaining = hasLimit ? Math.max(totalNum - hired, 0) : null;
        return { ...job, hired_count: hired, remaining_slots: remaining };
      });
    };

    useEffect(() => {
      let channel;

      const loadJobs = async () => {
        setJobsLoading(true);
        const activeIds = new Set();
        const { data, error } = await supabase
          .from('job_posts')
          .select('id, title, depot, department, description, responsibilities, urgent, created_at, job_type, expires_at, positions_needed, duration, is_active')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('load job_posts error:', error);
          setJobs([]);
          setJobsLoading(false);
          return;
        }

        const list = data || [];
        list.forEach((j) => j?.id && activeIds.add(j.id));
        // Only show office_employee jobs for applicants
        const officeJobs = list.filter((job) => job.job_type?.toLowerCase() === 'office_employee');
        
        // ensure redirected job appears even if cache delay (avoid dupe)
        let merged = newJob
          ? [officeJobs.find(j => j.id === newJob.id) ? null : newJob, ...officeJobs].filter(Boolean)
          : officeJobs;

        // Always include the job the user applied to, even if it becomes inactive/filled.
        // This allows showing a stable "Hired"/"Applied"/"Rejected" badge on the job card.
        if (appliedJobId) {
          try {
            const { data: appliedJobRow, error: appliedJobErr } = await supabase
              .from('job_posts')
              .select('id, title, depot, department, description, responsibilities, urgent, created_at, job_type, expires_at, positions_needed, duration, is_active')
              .eq('id', appliedJobId)
              .maybeSingle();

            if (!appliedJobErr && appliedJobRow && appliedJobRow.job_type?.toLowerCase() === 'office_employee') {
              const exists = merged.some((j) => j?.id === appliedJobRow.id);
              if (!exists) {
                merged = [appliedJobRow, ...merged];
              }
            }
          } catch (e) {
            console.warn('Failed to fetch applied job post:', e);
          }
        }

        const withStats = await attachHiringStats(merged);

        const closable = withStats.filter((job) => {
          const expired = isJobExpired(job);
          const totalNum = Number(job?.positions_needed);
          const hasLimit = Number.isFinite(totalNum) && totalNum > 0;
          const filled = hasLimit && (Number(job?.hired_count) || 0) >= totalNum;
          return expired || filled;
        });

        if (closable.length > 0) {
          await Promise.all(
            closable
              .filter((job) => activeIds.has(job.id))
              .map((job) => supabase.from('job_posts').update({ is_active: false }).eq('id', job.id))
          );
        }

        const openJobs = withStats.filter((job) => {
          if (job?.is_active === false) return false;
          const expired = isJobExpired(job);
          const totalNum = Number(job?.positions_needed);
          const hasLimit = Number.isFinite(totalNum) && totalNum > 0;
          const filled = hasLimit && (Number(job?.hired_count) || 0) >= totalNum;
          return !expired && !filled;
        });

        // Ensure applied job stays visible even if inactive/filled/expired
        let finalList = openJobs;
        if (appliedJobId) {
          const applied = withStats.find((j) => j?.id === appliedJobId);
          if (applied && !finalList.some((j) => j?.id === appliedJobId)) {
            finalList = [applied, ...finalList];
          }
        }

        setJobs(finalList);
        setJobsLoading(false);
      };

      loadJobs();

      channel = supabase
        .channel('job_posts-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'job_posts' },
          loadJobs
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'applications' },
          loadJobs
        )
        .subscribe();

      return () => {
        if (channel) supabase.removeChannel(channel);
      };
    }, [newJob, appliedJobId, latestApplicationStatus]);

    // ✅ Safe early return AFTER the hook has been called this render
    if (!authChecked) {
      return (
        <div className="min-h-screen grid place-items-center">
          <div className="text-gray-600">Checking session…</div>
        </div>
      );
    }

    // Check if the job_type is 'delivery_crew' to show license and driving fields
    const jobType = (selectedJob || newJob)?.job_type || '';
    const isDeliveryCrewJob = jobType === 'delivery_crew';
    const showLicenseSection = isDeliveryCrewJob;

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
      // If user has an active (non-rejected) latest application, only show that job.
      // If rejected, allow browsing/applying to other job offers.
      if (shouldLockToAppliedJob && appliedJobId) {
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

    const eduAttainmentForCompleteness = String(profileForm.educational_attainment || '').trim();
    const isEducationComplete =
      eduAttainmentForCompleteness &&
      (eduAttainmentForCompleteness === 'N/A' ||
        (String(profileForm.institution_name || '').trim() &&
          String(profileForm.year_graduated || '').trim()));

    // Check if profile is complete
    const isProfileComplete =
      profileForm.street &&
      profileForm.barangay &&
      profileForm.city &&
      profileForm.province &&
      profileForm.zip &&
      profileForm.sex &&
      profileForm.birthday &&
      profileForm.marital_status &&
      isEducationComplete;

    // Get missing fields for the indicator
    const missingFields = [];
    if (!profileForm.street) missingFields.push('Street/Village');
    if (!profileForm.barangay) missingFields.push('Barangay');
    if (!profileForm.city) missingFields.push('City');
    if (!profileForm.province) missingFields.push('Province');
    if (!profileForm.zip) missingFields.push('ZIP Code');
    if (!profileForm.sex) missingFields.push('Sex');
    if (!profileForm.birthday) missingFields.push('Birthday');
    if (!profileForm.marital_status) missingFields.push('Marital Status');
    if (!eduAttainmentForCompleteness) missingFields.push('Highest Educational Attainment');
    if (eduAttainmentForCompleteness && eduAttainmentForCompleteness !== 'N/A') {
      if (!String(profileForm.institution_name || '').trim()) missingFields.push('Institution Name');
      if (!String(profileForm.year_graduated || '').trim()) missingFields.push('Year Graduated');
    }

    // Build job card elements for the split-view
    const jobCardElements = filteredJobs.map((job) => {
      const createdAt = job?.created_at ? new Date(job.created_at) : null;
      const hasValidDate = createdAt instanceof Date && !isNaN(createdAt);
      const postedLabel = hasValidDate
        ? createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Not available';
      const isSelected = selectedJob?.id === job.id;
      const jobStatus = getLatestStatusForJob(job.id);
      const hasApplicationForJob = !!jobStatus;
      const isCurrentApplication = appliedJobId === job.id;
      const isLockedCurrent = shouldLockToAppliedJob && isCurrentApplication;
      const isPreferredDepot = profileForm.preferred_depot && job.depot === profileForm.preferred_depot;

      return (
        <div
          key={job.id}
          className={`bg-white rounded-lg shadow-md p-6 flex flex-col relative overflow-hidden cursor-pointer transition-colors ${
            isSelected ? 'border-2 border-red-600' : 'border border-transparent'
          } hover:bg-gray-100`}
          onClick={() => {
            if (isLockedCurrent) return;
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
              <div className="flex flex-col">
                <span className={isPreferredDepot ? 'font-semibold text-blue-600' : ''}>{job.depot}</span>
                {job.department && <span className="text-xs text-gray-500">{job.department}</span>}
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
            {hasApplicationForJob && (
              <div
                className={`mt-2 px-3 py-1 text-sm font-medium rounded-full text-center ${
                  jobStatus === 'hired'
                    ? 'bg-green-100 text-green-700'
                    : jobStatus === 'rejected'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {jobStatus === 'hired' ? 'Hired' : jobStatus === 'rejected' ? 'Rejected' : 'Applied'}
              </div>
            )}
          </div>
        </div>
      );
    });

    return (
      <>
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
        {activeTab === 'Home' && (
          <div className="relative -mx-6" style={{ width: 'calc(100% + 3rem)' }}>
            <div className="relative">
              <img
                src={'/roadwise-banner.png'}
                alt="Delivery trucks on the road"
                className="w-full h-[200px] object-cover"
                onError={(e) => {
                  // Fallback to a bundled asset if the public file is missing
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/vite.svg';
                }}
              />
              <div className="absolute inset-0 bg-black/30" />
              <div className="absolute inset-0 flex items-center justify-center px-4">
                <div className="w-full max-w-4xl">
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
                  </div>
                </form>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-y-auto">
          <section className={`w-full ${activeTab === 'Home' ? '' : 'hidden'}`}>
            <div className="w-full px-6 py-8">
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
                                {(() => {
                                  const selectedStatus = getLatestStatusForJob(selectedJob.id);
                                  const hasAppliedToSelected = !!selectedStatus;

                                  if (hasAppliedToSelected) {
                                    if (selectedStatus === 'hired') {
                                      return (
                                        <span className="px-10 py-2 rounded bg-green-100 text-green-700 font-medium">
                                          Hired
                                        </span>
                                      );
                                    }
                                    if (selectedStatus === 'rejected') {
                                      return (
                                        <span className="px-10 py-2 rounded bg-red-100 text-red-700 font-medium">
                                          Rejected
                                        </span>
                                      );
                                    }
                                    return (
                                      <span className="px-10 py-2 rounded bg-green-100 text-green-700 font-medium">
                                        Already Applied
                                      </span>
                                    );
                                  }

                                  if (shouldLockToAppliedJob) {
                                    return (
                                      <span className="px-10 py-2 rounded bg-gray-300 text-gray-600 cursor-not-allowed">
                                        Apply (Disabled)
                                      </span>
                                    );
                                  }

                                  if (!isProfileComplete) {
                                    return (
                                      <button
                                        className="px-10 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                                        onClick={proceedToApplicationForm}
                                        title="Complete your profile to apply"
                                      >
                                        Apply
                                      </button>
                                    );
                                  }

                                  return (
                                    <button
                                      className="px-10 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                                      onClick={proceedToApplicationForm}
                                    >
                                      Apply
                                    </button>
                                  );
                                })()}
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
                                    {selectedJob.expires_at ? `Closes on ${new Date(selectedJob.expires_at).toLocaleDateString('en-US')}` : "Closes when headcount is reached"}
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
                                {(() => {
                                  const status = getLatestStatusForJob(filteredJobs[0]?.id) || latestApplicationStatus;
                                  const isHired = status === 'hired';
                                  const isRejected = status === 'rejected';
                                  const label = isHired ? '✓ Hired' : isRejected ? '✕ Rejected' : '✓ Applied';
                                  const colors = isHired
                                    ? 'bg-green-100 text-green-700 border-green-500'
                                    : isRejected
                                    ? 'bg-red-100 text-red-700 border-red-500'
                                    : 'bg-green-100 text-green-700 border-green-500';
                                  return (
                                    <div className={`px-4 py-2 text-sm font-semibold rounded-lg border-2 ${colors}`}>
                                      {label}
                                    </div>
                                  );
                                })()}
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
                                  {(() => {
                                    const { responsibilities } = splitJobDetails(filteredJobs[0].responsibilities);
                                    const list = showAllResponsibilities ? responsibilities : responsibilities.slice(0, 4);
                                    return list.map((item, idx) => (
                                      <li key={idx} className="leading-relaxed">{item}</li>
                                    ));
                                  })()}
                                </ul>
                                {(() => {
                                  const { responsibilities } = splitJobDetails(filteredJobs[0].responsibilities);
                                  return responsibilities.length > 4;
                                })() && (
                                  <button
                                    className="text-blue-600 hover:text-blue-800 italic font-medium cursor-pointer transition-colors text-sm mt-1 ml-1"
                                    onClick={() => setShowAllResponsibilities(!showAllResponsibilities)}
                                  >
                                    {(() => {
                                      const { responsibilities } = splitJobDetails(filteredJobs[0].responsibilities);
                                      return showAllResponsibilities
                                        ? '- Show less'
                                        : `+ ${Math.max(0, responsibilities.length - 4)} more`;
                                    })()}
                                  </button>
                                )}
                              </div>
                            )}

                            {(() => {
                              const { keyRequirements } = splitJobDetails(filteredJobs[0].responsibilities);
                              if (keyRequirements.length === 0) return null;
                              return (
                                <div>
                                  <h4 className="text-base font-semibold text-gray-800 mb-2">Basic Key Requirements</h4>
                                  <ul className="list-disc list-inside text-gray-700 text-sm space-y-1 ml-1">
                                    {keyRequirements.map((item, idx) => (
                                      <li key={idx} className="leading-relaxed">{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            })()}
                            
                            {/* Compact Job Information Grid */}
                            <div className="grid grid-cols-2 gap-3 pt-2">
                              {filteredJobs[0].job_type && (
                                <div className="bg-gray-50 p-3 rounded">
                                  <div className="text-xs text-gray-600 mb-0.5">Position Type</div>
                                  <div className="font-semibold text-gray-800 text-sm capitalize">{filteredJobs[0].job_type.replace(/_/g, ' ')}</div>
                                </div>
                              )}
                              {(filteredJobs[0].expires_at || filteredJobs[0].duration) && (
                                <div className="bg-gray-50 p-3 rounded">
                                  <div className="text-xs text-gray-600 mb-0.5">Application Duration</div>
                                  <div className="font-semibold text-gray-800 text-sm">
                                    {filteredJobs[0].expires_at ? `Closes on ${new Date(filteredJobs[0].expires_at).toLocaleDateString('en-US')}` : filteredJobs[0].duration}
                                  </div>
                                </div>
                              )}
                              <div className="bg-gray-50 p-3 rounded">
                                <div className="text-xs text-gray-600 mb-0.5">Slots Remaining</div>
                                <div className="font-semibold text-gray-800 text-sm">
                                  {filteredJobs[0].positions_needed == null
                                    ? 'No limit'
                                    : `${typeof filteredJobs[0].remaining_slots === 'number' ? filteredJobs[0].remaining_slots : (filteredJobs[0].positions_needed || 1)} / ${filteredJobs[0].positions_needed || 1}`}
                                </div>
                              </div>
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
              <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
                <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">My Applications</h2>
                    <p className="text-gray-600 mt-1">Track your application progress, assessment schedule, and agreements.</p>
                  </div>
                  <button
                    onClick={() => navigate('/applicant/applications')}
                    className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 text-sm font-medium"
                  >
                    Open Full View
                  </button>
                </div>

                {!selectedApplication ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="text-gray-700 font-medium">No applications yet.</div>
                    <div className="text-sm text-gray-500 mt-1">Apply to a job to start tracking your progress here.</div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold text-gray-900">
                          {selectedApplicationJob?.title || selectedApplicationPayload?.job?.title || 'Application'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {selectedApplicationJob?.depot ? `Depot: ${selectedApplicationJob.depot}` : null}
                          {selectedApplicationJob?.depot ? <span className="mx-2">•</span> : null}
                          {selectedApplication?.created_at ? (
                            <span>
                              Submitted {new Date(selectedApplication.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                          ) : (
                            <span>Submitted date unavailable</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <select
                          value={selectedApplicationId || selectedApplication?.id || ''}
                          onChange={(e) => {
                            setSelectedApplicationId(e.target.value);
                            setMyApplicationsStep('Application');
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                        >
                          {(Array.isArray(userApplications) ? userApplications : []).map((app) => {
                            const payloadObj = parsePayloadObject(app?.payload);
                            const job = payloadObj?.job || payloadObj?.form?.job || null;
                            const title = job?.title || `Job #${String(app?.job_id || '').slice(0, 8)}`;
                            const when = app?.created_at
                              ? new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : 'Unknown date';
                            return (
                              <option key={app.id} value={app.id}>
                                {title} — {when}
                              </option>
                            );
                          })}
                        </select>

                        {(() => {
                          const status = String(selectedApplication?.status || '').toLowerCase();
                          const style =
                            status === 'hired'
                              ? 'bg-green-100 text-green-700 border-green-300'
                              : status === 'rejected'
                              ? 'bg-red-100 text-red-700 border-red-300'
                              : 'bg-blue-100 text-blue-700 border-blue-300';
                          const label = status ? status.replace(/_/g, ' ') : 'submitted';
                          return (
                            <span className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${style}`}>
                              {label.toUpperCase()}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Stepper */}
                    <div className="px-6 py-4 border-b border-gray-200">
                      {(() => {
                        const steps = ['Application', 'Assessment', 'Agreements'];
                        return (
                          <div className="flex flex-wrap gap-2">
                            {steps.map((s) => {
                              const active = myApplicationsStep === s;
                              return (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => setMyApplicationsStep(s)}
                                  className={
                                    active
                                      ? 'px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold'
                                      : 'px-4 py-2 rounded-lg bg-gray-100 text-gray-800 text-sm font-semibold hover:bg-gray-200'
                                  }
                                >
                                  {s}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Application */}
                    {myApplicationsStep === 'Application' && (
                      <div className="p-6 space-y-4">
                        <div className="text-sm text-gray-700">
                          {selectedApplicationJob?.description ? (
                            <>
                              <div className="font-semibold text-gray-900 mb-1">Job Description</div>
                              <div className="text-gray-700">{selectedApplicationJob.description}</div>
                            </>
                          ) : (
                            <span className="text-gray-500 italic">Job details will appear here when available.</span>
                          )}
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="text-sm font-semibold text-gray-900">Application Snapshot</div>
                          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-600">Position:</span>{' '}
                              <span className="text-gray-900">{selectedApplicationJob?.title || '—'}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Depot:</span>{' '}
                              <span className="text-gray-900">{selectedApplicationJob?.depot || '—'}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Department:</span>{' '}
                              <span className="text-gray-900">{selectedApplicationJob?.department || selectedApplicationPayload?.form?.department || '—'}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Submitted:</span>{' '}
                              <span className="text-gray-900">
                                {selectedApplication?.created_at ? formatDate(selectedApplication.created_at) : '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Assessment */}
                    {myApplicationsStep === 'Assessment' && (
                      <div className="p-6 space-y-6">
                        {(() => {
                          const interview = getInterviewScheduleFromApplication(selectedApplication);
                          const payloadObj = parsePayloadObject(selectedApplication?.payload);
                          const interviewConfirmed =
                            selectedApplication?.interview_confirmed ||
                            payloadObj?.interview_confirmed ||
                            null;

                          const rescheduleRequest =
                            payloadObj?.interview_reschedule_request || payloadObj?.interviewRescheduleRequest || null;

                          return (
                            <AssessmentSectionCard
                              schedule={interview}
                              interviewConfirmed={interviewConfirmed}
                              rescheduleRequest={rescheduleRequest}
                              onRequestReschedule={() => setShowRejectInterviewDialog(true)}
                            />
                          );
                        })()}

                        {(() => {
                          const { notes, attachments } = getInterviewNotesFromApplication(selectedApplication);
                          const legacy = [];
                          if (selectedApplication?.interview_details_file) {
                            legacy.push({ path: selectedApplication.interview_details_file, label: 'Interview Details' });
                          }
                          if (selectedApplication?.assessment_results_file) {
                            legacy.push({ path: selectedApplication.assessment_results_file, label: 'Assessment Result' });
                          }

                          const files = [...(Array.isArray(attachments) ? attachments : []), ...legacy];

                          return (
                            <RemarksAndFilesCard
                              title="Assessment Remarks and Files"
                              remarks={notes}
                              emptyRemarksText="No uploaded remarks or files."
                              files={files}
                              getPublicUrl={getApplicationFilesPublicUrl}
                            />
                          );
                        })()}
                      </div>
                    )}

                    {/* Agreements */}
                    {myApplicationsStep === 'Agreements' && (
                      <div className="p-6 space-y-6">
                        {(() => {
                          const payloadObj = parsePayloadObject(selectedApplication?.payload);
                          const interviewConfirmedRaw =
                            selectedApplication?.interview_confirmed || payloadObj?.interview_confirmed || null;
                          const interviewConfirmedNormalized = interviewConfirmedRaw
                            ? String(interviewConfirmedRaw).trim().toLowerCase()
                            : null;
                          const legacyRejected = interviewConfirmedNormalized === 'rejected';
                          const rescheduleReqObj =
                            payloadObj?.interview_reschedule_request || payloadObj?.interviewRescheduleRequest || null;
                          const rescheduleReqHandled = Boolean(rescheduleReqObj && (rescheduleReqObj.handled_at || rescheduleReqObj.handledAt));
                          const rescheduleReqActive = Boolean(
                            rescheduleReqObj &&
                            typeof rescheduleReqObj === 'object' &&
                            !rescheduleReqHandled &&
                            (rescheduleReqObj.requested_at || rescheduleReqObj.requestedAt || rescheduleReqObj.note)
                          );
                          const locked = legacyRejected || rescheduleReqActive;

                          const signing = getAgreementSigningFromApplication(selectedApplication);
                          return <SigningScheduleCard signing={signing} locked={locked} />;
                        })()}

                        {(() => {
                          const docs = getAgreementDocumentsFromApplication(selectedApplication);
                          return (
                            <UploadedDocumentsSection
                              title="Uploaded Agreements"
                              emptyText="No uploaded documents"
                              documents={docs}
                              getPublicUrl={getApplicationFilesPublicUrl}
                              variant="list"
                            />
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
            
            <section className={`w-full ${activeTab === 'Notifications' ? '' : 'hidden'}`}>
              <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Notifications content */}
              </div>
            </section>

            {/* Request Reschedule Dialog (My Applications) */}
            {showRejectInterviewDialog && (
              <div
                className="fixed inset-0 bg-transparent flex items-center justify-center z-50"
                onClick={() => setShowRejectInterviewDialog(false)}
              >
                <div
                  className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-lg font-bold mb-4">Request for Reschedule</h3>
                  <div className="text-sm text-gray-700 mb-6">
                    Are you sure you want to request for a reschedule of this interview? HR will be notified and will reschedule your interview.
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                      onClick={() => setShowRejectInterviewDialog(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 rounded bg-orange-500 text-white hover:bg-orange-600"
                      onClick={async () => {
                        if (!selectedApplication?.id) {
                          setShowRejectInterviewDialog(false);
                          return;
                        }

                        try {
                          const rejectedAt = new Date().toISOString();

                          const currentPayload = parsePayloadObject(selectedApplication?.payload);
                          const existingReq =
                            currentPayload?.interview_reschedule_request || currentPayload?.interviewRescheduleRequest || null;
                          const existingEver = Boolean(
                            existingReq &&
                            (typeof existingReq !== 'object' ||
                              existingReq.requested_at ||
                              existingReq.requestedAt ||
                              existingReq.note ||
                              existingReq.preferred_date ||
                              existingReq.preferredDate ||
                              existingReq.preferred_time_from ||
                              existingReq.preferredTimeFrom ||
                              existingReq.preferred_time_to ||
                              existingReq.preferredTimeTo ||
                              existingReq.handled_at ||
                              existingReq.handledAt)
                          );
                          if (existingEver) {
                            setErrorMessage('You can only request an assessment reschedule once for this interview.');
                            setTimeout(() => setErrorMessage(''), 5000);
                            return;
                          }

                          const req = {
                            requested_at: rejectedAt,
                            requestedAt: rejectedAt,
                            source: 'applicant',
                            note: 'Requested via My Applications',
                          };

                          const updatedPayload = {
                            ...currentPayload,
                            interview_reschedule_request: req,
                            interviewRescheduleRequest: req,
                          };
                          const { error: updateError } = await supabase
                            .from('applications')
                            .update({
                              interview_confirmed: 'Rejected',
                              interview_confirmed_at: rejectedAt,
                              payload: updatedPayload,
                            })
                            .eq('id', selectedApplication.id);

                          if (updateError) {
                            console.error('Error requesting reschedule:', updateError);
                            setErrorMessage('Failed to request reschedule. Please try again.');
                            setTimeout(() => setErrorMessage(''), 5000);
                            return;
                          }

                          // Update local list so UI reflects immediately.
                          setUserApplications((prev) =>
                            (Array.isArray(prev) ? prev : []).map((app) =>
                              String(app?.id) === String(selectedApplication.id)
                                ? { ...app, interview_confirmed: 'Rejected', interview_confirmed_at: rejectedAt, payload: updatedPayload }
                                : app
                            )
                          );

                          // Notify HR (best effort)
                          try {
                            const payloadObj = parsePayloadObject(selectedApplication?.payload);
                            const form = payloadObj.form || payloadObj.applicant || payloadObj || {};
                            const applicantName = `${form.firstName || ''} ${form.middleName || ''} ${form.lastName || ''}`.trim() || 'Applicant';
                            const position = selectedApplicationJob?.title || payloadObj?.job?.title || form.position || 'Position';
                            const interview = getInterviewScheduleFromApplication(selectedApplication);
                            await notifyHRAboutInterviewResponse({
                              applicationId: selectedApplication.id,
                              applicantName,
                              position,
                              responseType: 'reschedule_requested',
                              interviewDate: interview?.date || null,
                              interviewTime: interview?.time || null,
                              responseNote: 'Requested via My Applications',
                            });
                          } catch (notifyError) {
                            console.error('Error notifying HR about reschedule:', notifyError);
                          }

                          setShowRejectInterviewDialog(false);
                        } catch (err) {
                          console.error('Error requesting reschedule:', err);
                          setErrorMessage('Failed to request reschedule. Please try again.');
                          setTimeout(() => setErrorMessage(''), 5000);
                        }
                      }}
                    >
                      Request Reschedule
                    </button>
                  </div>
                </div>
              </div>
            )}

            <section className={`w-full ${activeTab === 'Profile' ? '' : 'hidden'}`}>
              <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900">My Profile</h2>
                      <p className="text-gray-600 mt-1">Manage your personal information and preferences</p>
                    </div>
                    {profileData && (
                      !isEditMode ? (
                        <button
                          onClick={handleEdit}
                          className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 font-medium"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit Profile
                        </button>
                      ) : (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={handleCancel}
                            className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                          >
                            {saving ? (
                              <>
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Saving...
                              </>
                            ) : (
                              <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Save Changes
                              </>
                            )}
                          </button>
                        </div>
                      )
                    )}
                  </div>

                  {/* Error/Success Messages */}
                  {errorMessage && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-red-700 text-sm">{errorMessage}</p>
                    </div>
                  )}

                  {successMessage && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg flex items-start gap-3">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-green-700 text-sm">{successMessage}</p>
                    </div>
                  )}

                  {loading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
                      <p className="text-gray-600 mt-4">Loading profile...</p>
                    </div>
                  ) : profileData ? (
                    <div className="space-y-6">
                      {/* Personal Information Card */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-red-50 to-orange-50 px-6 py-4 border-b border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Personal Information
                          </h3>
                        </div>
                        <div className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                              {isEditMode ? (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <input
                                    type="text"
                                    value={profileForm.lname}
                                    onChange={(e) => handleFormChange('lname', e.target.value)}
                                    placeholder="Last name"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                  />
                                  <input
                                    type="text"
                                    value={profileForm.fname}
                                    onChange={(e) => handleFormChange('fname', e.target.value)}
                                    placeholder="First name"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                  />
                                  <input
                                    type="text"
                                    value={profileForm.mname}
                                    onChange={(e) => handleFormChange('mname', e.target.value)}
                                    placeholder="Middle name (optional)"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                  />
                                </div>
                              ) : (
                                <div className="text-gray-900 font-medium">{getFullName()}</div>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                              <div className="text-gray-900">{profileData.email || 'Not provided'}</div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
                              <div className="text-gray-900">{profileData.contact_number || 'Not provided'}</div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Sex <span className="text-red-600">*</span></label>
                              {isEditMode ? (
                                <select
                                  value={profileForm.sex}
                                  onChange={(e) => handleFormChange('sex', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                >
                                  <option value="">Select</option>
                                  <option value="Male">Male</option>
                                  <option value="Female">Female</option>
                                </select>
                              ) : (
                                <div className="text-gray-900">{profileForm.sex || 'Not provided'}</div>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Birthday <span className="text-red-600">*</span></label>
                              {isEditMode ? (
                                <div>
                                  <input
                                    type="date"
                                    value={formatDateForInput(profileForm.birthday)}
                                    onChange={(e) => handleFormChange('birthday', e.target.value)}
                                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                                      birthdayError ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                  />
                                  {birthdayError && (
                                    <p className="mt-1 text-sm text-red-600">{birthdayError}</p>
                                  )}
                                </div>
                              ) : (
                                <div className="text-gray-900">{profileForm.birthday ? formatDate(profileForm.birthday) : 'Not provided'}</div>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={profileForm.age}
                                  readOnly
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
                                />
                              ) : (
                                <div className="text-gray-900">{profileForm.age || 'Not provided'}</div>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Marital Status <span className="text-red-600">*</span></label>
                              {isEditMode ? (
                                <select
                                  value={profileForm.marital_status}
                                  onChange={(e) => handleFormChange('marital_status', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                >
                                  <option value="">Select</option>
                                  <option value="Single">Single</option>
                                  <option value="Married">Married</option>
                                  <option value="Widowed">Widowed</option>
                                  <option value="Divorced">Divorced</option>
                                </select>
                              ) : (
                                <div className="text-gray-900">{profileForm.marital_status || 'Not provided'}</div>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Depot</label>
                              {isEditMode ? (
                                <>
                                  <input
                                    list="profile-depot-list"
                                    value={profileForm.preferred_depot || ''}
                                    onChange={(e) => handleFormChange('preferred_depot', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    placeholder="Select preferred depot"
                                  />
                                  <datalist id="profile-depot-list">
                                    {depotOptions.map((depot) => (
                                      <option key={depot} value={depot} />
                                    ))}
                                  </datalist>
                                </>
                              ) : (
                                <div className="text-gray-900">{profileForm.preferred_depot || 'Not provided'}</div>
                              )}
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Resume</label>
                              {isEditMode ? (
                                <div className="space-y-2">
                                  {profileForm.resume_path && !profileResumeFile && (
                                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      {(() => {
                                        const url = supabase.storage.from('resume').getPublicUrl(profileForm.resume_path).data.publicUrl;
                                        return (
                                          <a
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-red-600 hover:text-red-700 font-medium text-sm"
                                          >
                                            View Current Resume
                                          </a>
                                        );
                                      })()}
                                    </div>
                                  )}
                                  <input
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) {
                                        setProfileResumeFile(null);
                                        return;
                                      }

                                      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                                      if (!isPdf) {
                                        setErrorMessage('Please upload a PDF file only.');
                                        e.target.value = '';
                                        setProfileResumeFile(null);
                                        return;
                                      }

                                      setProfileResumeFile(file);
                                    }}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                  />
                                  {profileResumeFile && (
                                    <p className="text-sm text-gray-600">New file selected: {profileResumeFile.name}</p>
                                  )}
                                  <p className="text-xs text-gray-500">Upload a PDF file. This resume will be auto-filled when you apply for jobs.</p>
                                </div>
                              ) : (
                                <div>
                                  {profileForm.resume_path ? (
                                    (() => {
                                      const url = supabase.storage.from('resume').getPublicUrl(profileForm.resume_path).data.publicUrl;
                                      return (
                                        <a
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-red-600 hover:text-red-700 font-medium"
                                        >
                                          View Resume
                                        </a>
                                      );
                                    })()
                                  ) : (
                                    <div className="text-gray-500">Not uploaded</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Address Information Card */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-visible">
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Address Information
                          </h3>
                        </div>
                        <div className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Unit/House Number, Street Name, Subdivision/Village <span className="text-red-600">*</span>
                              </label>
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={
                                    [profileForm.unit_house_number, profileForm.street]
                                      .filter(Boolean)
                                      .join(' ') || ''
                                  }
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    // Update both fields in a single state update
                                    setProfileForm(prev => ({
                                      ...prev,
                                      street: value,
                                      unit_house_number: '' // Clear unit_house_number since we're combining
                                    }));
                                  }}
                                  placeholder="e.g., Unit 123 Main Street"
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                />
                              ) : (
                                <div className="text-gray-900">
                                  {profileForm.unit_house_number && profileForm.street
                                    ? `${profileForm.unit_house_number} ${profileForm.street}`
                                    : profileForm.street || 'Not provided'}
                                </div>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Province <span className="text-red-600">*</span></label>
                              {isEditMode ? (
                                <AutocompleteInput
                                  value={profileForm.province || ''}
                                  onChange={(value) => {
                                    const oldProvince = profileForm.province;
                                    handleFormChange('province', value);
                                    // Clear city and barangay when province changes
                                    if (oldProvince !== value) {
                                      handleFormChange('city', '');
                                      handleFormChange('barangay', '');
                                    }
                                  }}
                                  options={Array.isArray(provinces) ? provinces : []}
                                  placeholder="Select or type to search province"
                                  loading={loadingProvinces}
                                  listId="profile-province-list"
                                  onSelect={(option) => {
                                    if (option && option.name) {
                                      // Update all fields at once to ensure state consistency
                                      setProfileForm(prev => ({
                                        ...prev,
                                        province: option.name,
                                        city: '',
                                        barangay: ''
                                      }));
                                    }
                                  }}
                                />
                              ) : (
                                <div className="text-gray-900">{profileForm.province || 'Not provided'}</div>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                City / Municipality <span className="text-red-600">*</span>
                              </label>
                              {isEditMode ? (
                                <AutocompleteInput
                                  value={profileForm.city || ''}
                                  onChange={(value) => {
                                    handleFormChange('city', value);
                                    // Clear barangay when city changes
                                    if (profileForm.city !== value) {
                                      handleFormChange('barangay', '');
                                    }
                                  }}
                                  options={Array.isArray(profileCities) ? profileCities : []}
                                  placeholder={profileForm.province ? "Select or type to search city" : "Select province first"}
                                  disabled={!profileForm.province}
                                  loading={loadingProfileCities}
                                  listId="profile-city-list"
                                  helperText={!profileForm.province ? "Please select a province first" : profileCities.length > 0 ? `${profileCities.length} cities available` : "Loading cities..."}
                                  onSelect={(option) => {
                                    if (option && option.name) {
                                      // Update city and clear barangay in one state update
                                      setProfileForm(prev => ({
                                        ...prev,
                                        city: option.name,
                                        barangay: ''
                                      }));
                                    }
                                  }}
                                />
                              ) : (
                                <div className="text-gray-900">{profileForm.city || 'Not provided'}</div>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Barangay <span className="text-red-600">*</span>
                              </label>
                              {isEditMode ? (
                                <AutocompleteInput
                                  value={profileForm.barangay || ''}
                                  onChange={(value) => handleFormChange('barangay', value)}
                                  options={Array.isArray(profileBarangays) ? profileBarangays : []}
                                  placeholder={profileForm.city ? "Select or type to search barangay" : "Select city first"}
                                  disabled={!profileForm.city}
                                  loading={loadingProfileBarangays}
                                  listId="profile-barangay-list"
                                  helperText={!profileForm.city ? "Please select a city first" : ""}
                                  onSelect={(option) => {
                                    if (option && option.name) {
                                      handleFormChange('barangay', option.name);
                                    }
                                  }}
                                />
                              ) : (
                                <div className="text-gray-900">{profileForm.barangay || 'Not provided'}</div>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code <span className="text-red-600">*</span></label>
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={profileForm.postal_code || ''}
                                  onChange={(e) => handleFormChange('postal_code', e.target.value)}
                                  placeholder="Enter ZIP code"
                                  inputMode="numeric"
                                  pattern="\d*"
                                  maxLength={4}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                />
                              ) : (
                                <div className="text-gray-900">{profileForm.postal_code || 'Not provided'}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Education & Skills Card */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200" style={{ overflowX: 'hidden', overflowY: 'visible' }}>
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            Education & Skills
                          </h3>
                        </div>
                        <div className="p-6" style={{ overflow: 'visible' }}>
                          <div className="mb-4">
                            <p className="text-sm text-gray-600 italic">If not applicable, select N/A</p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Educational Level <span className="text-red-600">*</span></label>
                              {isEditMode ? (
                                <select
                                  value={profileForm.educational_attainment || ''}
                                  onChange={(e) => {
                                    const selectedValue = e.target.value;
                                    // Update educational attainment
                                    setProfileForm(prev => {
                                      const updated = { ...prev, educational_attainment: selectedValue };
                                      // Clear institution and year when N/A is selected or when cleared
                                      if (selectedValue === 'N/A' || selectedValue === '') {
                                        updated.institution_name = '';
                                        updated.year_graduated = '';
                                      }
                                      return updated;
                                    });
                                  }}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                >
                                  {EDUCATION_LEVEL_OPTIONS.map((opt) => (
                                    <option key={opt.value || 'empty'} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <div className="text-gray-900">{profileForm.educational_attainment || 'Not provided'}</div>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Institution Name
                                {profileForm.educational_attainment && profileForm.educational_attainment !== 'N/A' && (
                                  <span className="text-red-600"> *</span>
                                )}
                              </label>
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={profileForm.institution_name || ''}
                                  onChange={(e) => handleFormChange('institution_name', e.target.value)}
                                  placeholder="Enter school or institution name"
                                  required={Boolean(profileForm.educational_attainment && profileForm.educational_attainment !== 'N/A')}
                                  disabled={!profileForm.educational_attainment || profileForm.educational_attainment === 'N/A' || profileForm.educational_attainment === ''}
                                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                                    (!profileForm.educational_attainment || profileForm.educational_attainment === 'N/A' || profileForm.educational_attainment === '') 
                                      ? 'bg-gray-100 cursor-not-allowed' 
                                      : ''
                                  }`}
                                />
                              ) : (
                                <div className="text-gray-900">{profileForm.institution_name || 'Not provided'}</div>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Strand/Program (If applicable)
                              </label>
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={profileForm.education_program || ''}
                                  onChange={(e) => handleFormChange('education_program', e.target.value)}
                                  placeholder="Enter strand/program"
                                  disabled={!profileForm.educational_attainment || profileForm.educational_attainment === 'N/A' || profileForm.educational_attainment === ''}
                                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                                    (!profileForm.educational_attainment || profileForm.educational_attainment === 'N/A' || profileForm.educational_attainment === '')
                                      ? 'bg-gray-100 cursor-not-allowed'
                                      : ''
                                  }`}
                                />
                              ) : (
                                <div className="text-gray-900">{profileForm.education_program || 'Not provided'}</div>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Year Graduated
                                {profileForm.educational_attainment && profileForm.educational_attainment !== 'N/A' && (
                                  <span className="text-red-600"> *</span>
                                )}
                              </label>
                              {isEditMode ? (
                                <div>
                                  <input
                                    type="text"
                                    value={profileForm.year_graduated || ''}
                                    onChange={(e) => handleFormChange('year_graduated', e.target.value)}
                                    placeholder="e.g., 2020"
                                    inputMode="numeric"
                                    pattern="\d*"
                                    maxLength={4}
                                    required={Boolean(profileForm.educational_attainment && profileForm.educational_attainment !== 'N/A')}
                                    disabled={!profileForm.educational_attainment || profileForm.educational_attainment === 'N/A' || profileForm.educational_attainment === ''}
                                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                                      profileYearGraduatedError ? 'border-red-500' : 'border-gray-300'
                                    } ${
                                      (!profileForm.educational_attainment || profileForm.educational_attainment === 'N/A' || profileForm.educational_attainment === '') 
                                        ? 'bg-gray-100 cursor-not-allowed' 
                                        : ''
                                    }`}
                                  />
                                  {profileYearGraduatedError && (
                                    <p className="mt-1 text-sm text-red-600">{profileYearGraduatedError}</p>
                                  )}
                                </div>
                              ) : (
                                <div className="text-gray-900">{profileForm.year_graduated || 'Not provided'}</div>
                              )}
                            </div>
                            <div className="md:col-span-2 relative" style={{ zIndex: 1 }}>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Skills (optional)</label>
                              {isEditMode ? (
                                <div className="relative" style={{ zIndex: 50 }}>
                                  <SkillsInput
                                    skills={normalizeSkills(profileForm.skills)}
                                    onChange={(skillsArray) => handleFormChange('skills', skillsArray)}
                                  />
                                </div>
                              ) : (
                                <div className="text-gray-900">
                                  {(() => {
                                    // Handle different skill formats
                                    let skillsToDisplay = [];
                                    
                                    if (Array.isArray(profileForm.skills)) {
                                      skillsToDisplay = profileForm.skills;
                                    } else if (typeof profileForm.skills === 'string') {
                                      // Try to parse as JSON first
                                      try {
                                        const parsed = JSON.parse(profileForm.skills);
                                        if (Array.isArray(parsed)) {
                                          skillsToDisplay = parsed;
                                        } else {
                                          // Not a JSON array, treat as comma-separated string
                                          skillsToDisplay = profileForm.skills.split(',').map(s => s.trim()).filter(Boolean);
                                        }
                                      } catch {
                                        // Not valid JSON, treat as comma-separated string
                                        skillsToDisplay = profileForm.skills.split(',').map(s => s.trim()).filter(Boolean);
                                      }
                                    }
                                    
                                    return skillsToDisplay.length > 0 
                                      ? skillsToDisplay.join(', ')
                                      : 'Not provided';
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Work Experience & Character References Card */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-6 py-4 border-b border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Work Experience & Character References
                          </h3>
                        </div>
                        <div className="p-6 space-y-8">
                          {/* Work Experience */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-base font-semibold text-gray-900">Work Experience</h4>
                              {isEditMode && (
                                <button
                                  type="button"
                                  onClick={addProfileWork}
                                  className="text-red-600 hover:underline text-sm font-medium"
                                >
                                  + add another work experience
                                </button>
                              )}
                            </div>

                            {isEditMode ? (
                              <div className="space-y-4">
                                {(Array.isArray(profileForm.work_experiences) ? profileForm.work_experiences : []).length === 0 && (
                                  <div className="text-sm text-gray-500 italic">No work experiences yet.</div>
                                )}
                                {(Array.isArray(profileForm.work_experiences) ? profileForm.work_experiences : []).map((exp, index) => (
                                  <div
                                    key={index}
                                    className="border p-4 rounded-md space-y-3 bg-gray-50"
                                  >
                                    <h5 className="font-medium text-gray-700">
                                      Work Experience #{index + 1}
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          Company Name and Location
                                        </label>
                                        <input
                                          type="text"
                                          value={exp.company || ''}
                                          onChange={(e) => updateProfileWork(index, 'company', e.target.value)}
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
                                          onChange={(e) => updateProfileWork(index, 'role', e.target.value)}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                                        />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Start (Month &amp; Year)</label>
                                        <input
                                          type="month"
                                          value={exp.start || ''}
                                          max={new Date().toISOString().slice(0, 7)}
                                          onChange={(e) => {
                                            const nextStart = e.target.value;
                                            updateProfileWork(index, 'start', nextStart);
                                            setProfileEmploymentPeriodErrors((prev) => {
                                              const copy = Array.isArray(prev) ? [...prev] : [];
                                              const maxMonth = new Date().toISOString().slice(0, 7);
                                              let msg = '';
                                              if (nextStart && nextStart > maxMonth) msg = 'Start date cannot be in the future';
                                              if (nextStart && exp.end && nextStart > exp.end) msg = 'Start date cannot be after end date';
                                              copy[index] = msg;
                                              return copy;
                                            });
                                          }}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">End (Month &amp; Year)</label>
                                        <input
                                          type="month"
                                          value={exp.end || ''}
                                          max={new Date().toISOString().slice(0, 7)}
                                          onChange={(e) => {
                                            const nextEnd = e.target.value;
                                            updateProfileWork(index, 'end', nextEnd);
                                            setProfileEmploymentPeriodErrors((prev) => {
                                              const copy = Array.isArray(prev) ? [...prev] : [];
                                              const maxMonth = new Date().toISOString().slice(0, 7);
                                              let msg = '';
                                              if (nextEnd && nextEnd > maxMonth) msg = 'End date cannot be in the future';
                                              if (nextEnd && exp.start && nextEnd < exp.start) msg = 'End date cannot be before start date';
                                              copy[index] = msg;
                                              return copy;
                                            });
                                          }}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                                        />
                                      </div>
                                      {profileEmploymentPeriodErrors[index] && (
                                        <div className="md:col-span-2">
                                          <p className="text-xs text-red-600 mt-1">{profileEmploymentPeriodErrors[index]}</p>
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Reason for Leaving
                                      </label>
                                      <textarea
                                        value={exp.reason || ''}
                                        onChange={(e) => updateProfileWork(index, 'reason', e.target.value)}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className="grid grid-cols-5 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
                                  <div>Company</div>
                                  <div>Role</div>
                                  <div>Start</div>
                                  <div>End</div>
                                  <div>Reason</div>
                                </div>
                                {(Array.isArray(profileForm.work_experiences) ? profileForm.work_experiences : []).length === 0 ? (
                                  <div className="px-4 py-3 text-sm text-gray-500 italic">None</div>
                                ) : (
                                  (Array.isArray(profileForm.work_experiences) ? profileForm.work_experiences : []).map((w, i) => (
                                    <div
                                      key={i}
                                      className={`grid grid-cols-5 px-4 py-2 text-sm ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}
                                    >
                                      <div className="text-gray-900">{w.company || <span className="text-gray-500 italic">None</span>}</div>
                                      <div className="text-gray-900">{w.role || <span className="text-gray-500 italic">None</span>}</div>
                                      <div className="text-gray-900">
                                        {w.start || w.period || <span className="text-gray-500 italic">None</span>}
                                      </div>
                                      <div className="text-gray-900">
                                        {w.end || <span className="text-gray-500 italic">—</span>}
                                      </div>
                                      <div className="text-gray-900">{w.reason || <span className="text-gray-500 italic">None</span>}</div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>

                          {/* Character References */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-base font-semibold text-gray-900">Character References</h4>
                              {isEditMode && (
                                <button
                                  type="button"
                                  onClick={addProfileReference}
                                  className="text-red-600 hover:underline text-sm font-medium"
                                >
                                  + add another person
                                </button>
                              )}
                            </div>

                            {isEditMode ? (
                              <div className="space-y-4">
                                {(Array.isArray(profileForm.character_references) ? profileForm.character_references : []).length === 0 && (
                                  <div className="text-sm text-gray-500 italic">No character references yet.</div>
                                )}
                                {(Array.isArray(profileForm.character_references) ? profileForm.character_references : []).map((ref, index) => (
                                  <div key={index} className="border p-4 rounded-md bg-gray-50">
                                    <h5 className="font-medium text-gray-700 mb-3">Reference #{index + 1}</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                        <input
                                          type="text"
                                          value={ref.fullName || ''}
                                          onChange={(e) => updateProfileReference(index, 'fullName', e.target.value)}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                                        <input
                                          type="text"
                                          value={ref.relationship || ''}
                                          onChange={(e) => updateProfileReference(index, 'relationship', e.target.value)}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                                        <input
                                          type="text"
                                          value={ref.jobTitle || ''}
                                          onChange={(e) => updateProfileReference(index, 'jobTitle', e.target.value)}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                                        <input
                                          type="text"
                                          value={ref.company || ''}
                                          onChange={(e) => updateProfileReference(index, 'company', e.target.value)}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                        <input
                                          type="text"
                                          placeholder="09XXXXXXXXX"
                                          value={ref.phone || ''}
                                          onChange={(e) => {
                                            const numeric = e.target.value.replace(/\D/g, '').slice(0, 11);
                                            updateProfileReference(index, 'phone', numeric);
                                          }}
                                          maxLength={11}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <input
                                          type="email"
                                          value={ref.email || ''}
                                          onChange={(e) => updateProfileReference(index, 'email', e.target.value)}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className="grid grid-cols-6 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
                                  <div>Full Name</div>
                                  <div>Relationship</div>
                                  <div>Job Title</div>
                                  <div>Company</div>
                                  <div>Phone</div>
                                  <div>Email</div>
                                </div>
                                {(Array.isArray(profileForm.character_references) ? profileForm.character_references : []).length === 0 ? (
                                  <div className="px-4 py-3 text-sm text-gray-500 italic">None</div>
                                ) : (
                                  (Array.isArray(profileForm.character_references) ? profileForm.character_references : [])
                                    .filter((r) => r.fullName || r.relationship || r.jobTitle || r.company || r.phone || r.email)
                                    .map((r, i) => (
                                      <div
                                        key={i}
                                        className={`grid grid-cols-6 px-4 py-2 text-sm ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}
                                      >
                                        <div className="text-gray-900">{r.fullName || <span className="text-gray-500 italic">None</span>}</div>
                                        <div className="text-gray-900">{r.relationship || <span className="text-gray-500 italic">None</span>}</div>
                                        <div className="text-gray-900">{r.jobTitle || <span className="text-gray-500 italic">None</span>}</div>
                                        <div className="text-gray-900">{r.company || <span className="text-gray-500 italic">None</span>}</div>
                                        <div className="text-gray-900">{r.phone || <span className="text-gray-500 italic">None</span>}</div>
                                        <div className="text-gray-900">{r.email || <span className="text-gray-500 italic">None</span>}</div>
                                      </div>
                                    ))
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <p className="text-gray-500 text-lg">No profile data found.</p>
                    </div>
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
                  className="bg-white rounded-lg max-w-2xl w-full mx-4 h-[90vh] border-2 border-black flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
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
                    className="flex flex-col flex-1 overflow-hidden"
                    onSubmit={onSubmitApplication}
                    noValidate
                  >
                    {errorMessage && (
                      <div className="px-4 pt-4 flex-shrink-0">
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                          {errorMessage}
                        </div>
                      </div>
                    )}
                    <div className="px-4 pt-4 border-b bg-gray-50 flex-shrink-0">
                      <div className="flex flex-wrap gap-2">
                        {formTabs.map((tab) => (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() => attemptSetApplicationTab(tab.key)}
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
                              First Name <span className="text-red-600">*</span>
                            </label>
                            <input
                              type="text"
                              name="firstName"
                              value={form.firstName}
                              readOnly
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 bg-gray-100 cursor-not-allowed"
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
                              readOnly
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 bg-gray-100 cursor-not-allowed"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Last Name <span className="text-red-600">*</span>
                            </label>
                            <input
                              type="text"
                              name="lastName"
                              value={form.lastName}
                              readOnly
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 bg-gray-100 cursor-not-allowed"
                            />
                          </div>
                        </div>

                        {/* Address */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Address:
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Unit/House Number, Street Name, Subdivision/Village <span className="text-red-600">*</span>
                              </label>
                              <input
                                type="text"
                                name="street"
                                value={[form.unit_house_number, form.street].filter(Boolean).join(' ') || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setForm((prev) => ({ ...prev, street: value, unit_house_number: '' }));
                                }}
                                required
                                placeholder="e.g., Unit 123 Main Street"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Province <span className="text-red-600">*</span>
                              </label>
                              <AutocompleteInput
                                value={form.province || ''}
                                onChange={(value) => {
                                  const oldProvince = form.province;
                                  setForm(prev => ({ ...prev, province: value }));
                                  // Clear city and barangay when province changes
                                  if (oldProvince !== value) {
                                    setForm(prev => ({ ...prev, city: '', barangay: '' }));
                                  }
                                }}
                                options={Array.isArray(provinces) ? provinces : []}
                                placeholder="Select or type to search province"
                                loading={loadingProvinces}
                                listId="application-province-list"
                                onSelect={(option) => {
                                  if (option && option.name) {
                                    setForm(prev => ({ 
                                      ...prev, 
                                      province: option.name,
                                      city: '',
                                      barangay: ''
                                    }));
                                  }
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                City / Municipality <span className="text-red-600">*</span>
                              </label>
                              <AutocompleteInput
                                value={form.city || ''}
                                onChange={(value) => {
                                  setForm(prev => ({ ...prev, city: value }));
                                  // Clear barangay when city changes
                                  if (form.city !== value) {
                                    setForm(prev => ({ ...prev, barangay: '' }));
                                  }
                                }}
                                options={Array.isArray(applicationCities) ? applicationCities : []}
                                placeholder={form.province ? "Select or type to search city" : "Select province first"}
                                disabled={!form.province}
                                loading={loadingApplicationCities}
                                listId="application-city-list"
                                helperText={!form.province ? "Please select a province first" : applicationCities.length > 0 ? `${applicationCities.length} cities available` : "Loading cities..."}
                                onSelect={(option) => {
                                  if (option && option.name) {
                                    setForm(prev => ({ 
                                      ...prev, 
                                      city: option.name,
                                      barangay: ''
                                    }));
                                  }
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Barangay / Village / Subdivision <span className="text-red-600">*</span>
                              </label>
                              <AutocompleteInput
                                value={form.barangay || ''}
                                onChange={(value) => setForm(prev => ({ ...prev, barangay: value }))}
                                options={Array.isArray(applicationBarangays) ? applicationBarangays : []}
                                placeholder={form.city ? "Select or type to search barangay" : "Select city first"}
                                disabled={!form.city}
                                loading={loadingApplicationBarangays}
                                listId="application-barangay-list"
                                helperText={!form.city ? "Please select a city first" : ""}
                                onSelect={(option) => {
                                  if (option && option.name) {
                                    setForm(prev => ({ ...prev, barangay: option.name }));
                                  }
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code <span className="text-red-600">*</span></label>
                              <input
                                type="text"
                                name="zip"
                                value={form.zip}
                                onChange={handleInput}
                                required
                                placeholder="Enter ZIP code"
                                inputMode="numeric"
                                pattern="\d*"
                                maxLength={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Contact + Email */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Contact Number <span className="text-red-600">*</span>
                            </label>
                            <input
                              type="tel"
                              name="contact"
                              value={form.contact}
                              onChange={handleInput}
                              required
                              maxLength={11}
                              placeholder="09XXXXXXXXX"
                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 ${
                                contactError ? 'border-red-500' : 'border-gray-300'
                              }`}
                            />
                            {contactError && (
                              <div className="mt-1 text-sm text-red-600">
                                {contactError}
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Email <span className="text-red-600">*</span>
                            </label>
                            <input
                              type="email"
                              name="email"
                              value={form.email}
                              readOnly
                              required
                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 bg-gray-100 cursor-not-allowed ${
                                emailError ? 'border-red-500' : 'border-gray-300'
                              }`}
                            />
                            {emailError && (
                              <div className="mt-1 text-sm text-red-600">
                                {emailError}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Birthday + Marital */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Birthday <span className="text-red-600">*</span>
                            </label>
                            <input
                              type="date"
                              name="birthday"
                              value={form.birthday}
                              readOnly
                              required
                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 bg-gray-100 cursor-not-allowed ${
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
                              Marital Status <span className="text-red-600">*</span>
                            </label>
                            <select
                              name="maritalStatus"
                              value={form.maritalStatus}
                              onChange={handleInput}
                              required
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
                          <label className="text-sm font-medium text-gray-700">Sex: <span className="text-red-600">*</span></label>
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
                              Available Start Date: <span className="text-red-600">*</span>
                            </label>
                            <input
                              type="date"
                              name="startDate"
                              value={form.startDate}
                              onChange={handleInput}
                              min={new Date().toISOString().split('T')[0]}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                            {startDateError && (
                              <div className="mt-1 text-sm text-red-600">{startDateError}</div>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              How did you learn about our company? <span className="text-red-600">*</span>
                            </label>
                            <select
                              name="heardFrom"
                              value={form.heardFrom}
                              onChange={handleInput}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                            >
                              <option value="">Select an answer</option>
                              <option value="N/A">N/A</option>
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
                            Currently Employed? <span className="text-red-600">*</span>
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
                            Upload Resume: <span className="text-red-600">*</span>
                          </label>
                          {form.resumePath && !resumeFile && (
                            <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded-md">
                              <p className="text-xs text-green-700">
                                ✓ Resume from profile will be used: {form.resumePath.split('/').pop()}
                              </p>
                              <a
                                href={supabase.storage.from('resume').getPublicUrl(form.resumePath).data.publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-green-600 hover:text-green-800 underline"
                              >
                                View Profile Resume
                              </a>
                            </div>
                          )}
                          {(!form.resumePath || resumeFile) && (
                            <input
                              type="file"
                              accept=".pdf,application/pdf"
                              onChange={handleResumeChange}
                              required={!form.resumePath}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            PDF file. Max 10MB {form.resumePath && !resumeFile && '(Leave empty to use profile resume)'}
                          </p>
                        </div>

                        {/* Certificates */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Upload Certificates
                          </label>
                          <div className="flex items-center gap-2 mb-2">
                            <label className="cursor-pointer px-4 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium border border-blue-200">
                              Choose Files
                              <input
                                type="file"
                                multiple
                                accept=".pdf,.png,.jpg,.jpeg,image/*,application/pdf"
                                onChange={handleCertificateChange}
                                className="hidden"
                              />
                            </label>
                            {certificateFiles.length > 0 && (
                              <span className="text-xs text-gray-600">
                                {certificateFiles.map(f => f.name).join(', ')}
                              </span>
                            )}
                          </div>
                          
                          {certificateFiles.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium text-gray-700 mb-2">
                                Selected Files ({certificateFiles.length})
                              </p>
                              <div className="space-y-2">
                                {certificateFiles.map((file, index) => (
                                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <svg className="w-8 h-8 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-900 truncate">{file.name}</p>
                                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeCertificateFile(index)}
                                      className="ml-2 text-red-600 hover:text-red-800 flex-shrink-0"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Upload certificates, licenses, or credentials (PDF, PNG, JPG). Max 10MB per file.
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
                              name="hasPAGIBIG"
                              checked={form.hasPAGIBIG}
                              onChange={handleCheckbox}
                              className="mr-2"
                            />
                            <span className="text-sm">PAGIBIG</span>
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
                                        <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-md p-3">
                                          Education & skills are pulled from your profile and can’t be edited here.
                                          You may optionally add your strand/program for this application.
                          <button
                            type="button"
                            className="ml-2 underline font-medium"
                            onClick={() => {
                              setShowModal(false);
                              setActiveTab('Profile');
                            }}
                          >
                            Edit in My Profile
                          </button>
                        </div>

                        {/* Education (read-only; managed in Profile) */}
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Educational Level
                            </label>
                            <select
                              value={normalizeEducationAttainment(form.edu1Level)}
                              disabled
                              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                            >
                              {EDUCATION_LEVEL_OPTIONS.map((opt) => (
                                <option key={opt.value || 'empty'} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                School/Institution Name
                              </label>
                              <input
                                type="text"
                                value={form.edu1Institution || ''}
                                readOnly
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Year Graduated
                              </label>
                              <input
                                type="text"
                                value={form.edu1Year || ''}
                                readOnly
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Strand/Program (optional; stored in application payload) */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Strand/Program (If applicable)
                          </label>
                          <input
                            type="text"
                            name="edu1Program"
                            value={form.edu1Program || ''}
                            onChange={handleInput}
                            placeholder="e.g. STEM, ABM, BS Computer Science"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">Optional; saved with this application only.</p>
                        </div>

                        {/* Skills (read-only; managed in Profile) */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
                          <textarea
                            value={normalizeSkills(form.skills).join(', ')}
                            readOnly
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                          />
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
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Start (Month & Year)
                                  </label>
                                  <input
                                    type="month"
                                    value={exp.start || ''}
                                    max={new Date().toISOString().slice(0, 7)}
                                    onChange={(e) => {
                                      const selectedDate = new Date(e.target.value + '-01');
                                      const today = new Date();
                                      
                                      if (selectedDate > today) {
                                        setEmploymentPeriodErrors(prev => {
                                          const newErrors = [...prev];
                                          newErrors[index] = 'Start date cannot be in the future';
                                          return newErrors;
                                        });
                                        return;
                                      }
                                      
                                      updateWork(index, 'start', e.target.value);
                                      
                                      // Check if end date is before start date
                                      if (exp.end) {
                                        const endDate = new Date(exp.end + '-01');
                                        if (endDate < selectedDate) {
                                          setEmploymentPeriodErrors(prev => {
                                            const newErrors = [...prev];
                                            newErrors[index] = 'End date cannot be before start date';
                                            return newErrors;
                                          });
                                          return;
                                        }
                                      }
                                      
                                      setEmploymentPeriodErrors(prev => {
                                        const newErrors = [...prev];
                                        newErrors[index] = '';
                                        return newErrors;
                                      });
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    End (Month & Year)
                                  </label>
                                  <input
                                    type="month"
                                    value={exp.end || ''}
                                    max={new Date().toISOString().slice(0, 7)}
                                    onChange={(e) => {
                                      if (exp.start && e.target.value) {
                                        const startDate = new Date(exp.start + '-01');
                                        const endDate = new Date(e.target.value + '-01');
                                        
                                        if (endDate < startDate) {
                                          setEmploymentPeriodErrors(prev => {
                                            const newErrors = [...prev];
                                            newErrors[index] = 'End date cannot be before start date';
                                            return newErrors;
                                          });
                                          return;
                                        }
                                      }
                                      
                                      updateWork(index, 'end', e.target.value);
                                      setEmploymentPeriodErrors(prev => {
                                        const newErrors = [...prev];
                                        newErrors[index] = '';
                                        return newErrors;
                                      });
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    Leave blank if currently employed
                                  </p>
                                </div>
                              </div>
                              {employmentPeriodErrors[index] && (
                                <p className="text-xs text-red-600 mt-1">{employmentPeriodErrors[index]}</p>
                              )}
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
                              References
                            </h3>
                          </div>
                          <div className="space-y-3">
                            {characterReferences.map((ref, index) => (
                              <div key={index} className="border p-4 rounded-md bg-gray-50">
                                <h4 className="font-medium text-gray-700 mb-3">Reference #{index + 1}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Full Name
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="e.g., Juan Dela Cruz"
                                      value={ref.fullName || ''}
                                      onChange={(e) => {
                                        updateRef(index, 'fullName', e.target.value);
                                        const error = validateReferenceName(e.target.value);
                                        setReferenceNameErrors((prev) => {
                                          const newErrors = [...prev];
                                          newErrors[index] = error;
                                          return newErrors;
                                        });
                                      }}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                                    />
                                    {referenceNameErrors[index] && (
                                      <p className="text-xs text-red-600 mt-1">{referenceNameErrors[index]}</p>
                                    )}
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Relationship
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="e.g., Former Supervisor"
                                      value={ref.relationship || ''}
                                      onChange={(e) => updateRef(index, 'relationship', e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Job Title
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="e.g., Operations Manager"
                                      value={ref.jobTitle || ''}
                                      onChange={(e) => updateRef(index, 'jobTitle', e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Company
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="e.g., ABC Logistics"
                                      value={ref.company || ''}
                                      onChange={(e) => updateRef(index, 'company', e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Phone Number
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="09XXXXXXXXX"
                                      value={ref.phone || ''}
                                      onChange={(e) => {
                                        const numeric = e.target.value.replace(/\D/g, '').slice(0, 11);
                                        updateRef(index, 'phone', numeric);
                                        const error = validatePhoneNumber(numeric);
                                        setReferenceContactErrors((prev) => {
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
                                      Email
                                    </label>
                                    <input
                                      type="email"
                                      placeholder="e.g., person@email.com"
                                      value={ref.email || ''}
                                      onChange={(e) => {
                                        updateRef(index, 'email', e.target.value);
                                        const error = validateEmail(e.target.value);
                                        setReferenceEmailErrors((prev) => {
                                          const newErrors = [...prev];
                                          newErrors[index] = error;
                                          return newErrors;
                                        });
                                      }}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                                    />
                                    {referenceEmailErrors[index] && (
                                      <p className="text-xs text-red-600 mt-1">{referenceEmailErrors[index]}</p>
                                    )}
                                  </div>
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
                    <div className="flex justify-between px-4 py-3 border-t bg-gray-50 flex-shrink-0">
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
                    <p className="text-xs text-gray-600 px-4 pb-4 flex-shrink-0">
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
                          <div>{form.contact || <span className="text-gray-500 italic">None</span>}</div>
                        </div>
                        <div className="grid grid-cols-2 p-2">
                          <div>Email</div>
                          <div>{form.email || <span className="text-gray-500 italic">None</span>}</div>
                        </div>
                        <div className="grid grid-cols-2 bg-gray-100 p-2">
                          <div>Birthday</div>
                          <div>{form.birthday || <span className="text-gray-500 italic">None</span>}</div>
                        </div>
                        <div className="grid grid-cols-2 p-2">
                          <div>Marital Status</div>
                          <div>{form.maritalStatus || <span className="text-gray-500 italic">None</span>}</div>
                        </div>
                        <div className="grid grid-cols-2 bg-gray-100 p-2">
                          <div>Sex</div>
                          <div>{form.sex || <span className="text-gray-500 italic">None</span>}</div>
                        </div>
                        <div className="grid grid-cols-2 p-2">
                          <div>Available Start Date</div>
                          <div>{form.startDate || <span className="text-gray-500 italic">None</span>}</div>
                        </div>
                        <div className="grid grid-cols-2 bg-gray-100 p-2">
                          <div>How did you learn about our company?</div>
                          <div>{form.heardFrom || <span className="text-gray-500 italic">None</span>}</div>
                        </div>
                        <div className="grid grid-cols-2 p-2">
                          <div>Currently Employed?</div>
                          <div>{form.employed || <span className="text-gray-500 italic">None</span>}</div>
                        </div>
                        <div className="grid grid-cols-2 bg-gray-100 p-2">
                          <div>Resume</div>
                          <div>
                            {resumeFile ? form.resumeName : 
                             form.resumePath ? 
                               <a
                                 href={supabase.storage.from('resume').getPublicUrl(form.resumePath).data.publicUrl}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="text-red-600 hover:text-red-700 underline"
                               >
                                 {form.resumePath.split('/').pop()} (from profile)
                               </a> : 
                               'Not uploaded'}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 p-2">
                          <div>Government IDs</div>
                          <div>
                            {[
                              form.hasSSS ? 'SSS' : null,
                              form.hasPAGIBIG ? 'PAGIBIG' : null,
                              form.hasPhilHealth ? 'PhilHealth' : null,
                              form.hasTIN ? 'TIN' : null,
                            ]
                              .filter(Boolean)
                              .join(', ') || <span className="text-gray-500 italic">None</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Education */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Education</h3>
                      <div className="border border-gray-300">
                        <div className="grid grid-cols-4 bg-gray-100 p-2 font-medium">
                          <div>Level</div>
                          <div>Institution</div>
                          <div>Strand/Program</div>
                          <div>Year Finished</div>
                        </div>
                        <div className="grid grid-cols-4 p-2">
                          <div>{form.edu1Level || <span className="text-gray-500 italic">None</span>}</div>
                          <div>{form.edu1Institution || <span className="text-gray-500 italic">None</span>}</div>
                          <div>{form.edu1Program || <span className="text-gray-500 italic">None</span>}</div>
                          <div>{form.edu1Year || <span className="text-gray-500 italic">None</span>}</div>
                        </div>
                      </div>
                    </div>

                    {/* Skills */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Skills</h3>
                      <div className="border border-gray-300 p-2">
                        {normalizeSkills(form.skills).join(', ') || <span className="text-gray-500 italic">None</span>}
                      </div>
                    </div>

                    {/* License - Only show for delivery_crew jobs */}
                    {showLicenseSection && (
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
                            <div>{form.licenseType || <span className="text-gray-500 italic">None</span>}</div>
                            <div>{form.licenseExpiry || <span className="text-gray-500 italic">None</span>}</div>
                          </div>
                        </div>
                      </div>
                    )}

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
                          <div className="p-2"><span className="text-gray-500 italic">None</span></div>
                        ) : (
                          workExperiences.map((w, i) => {
                            const startFormatted = w.start ? new Date(w.start + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';
                            const endFormatted = w.end ? new Date(w.end + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Present';
                            const period = w.start && w.end ? `${startFormatted} - ${endFormatted}` : w.start ? `${startFormatted} - Present` : w.period || '';
                            return (
                              <div
                                key={i}
                                className={`grid grid-cols-4 p-2 ${
                                  i % 2 === 1 ? 'bg-gray-100' : ''
                                }`}
                              >
                                <div>{w.company || <span className="text-gray-500 italic">None</span>}</div>
                                <div>{w.role || <span className="text-gray-500 italic">None</span>}</div>
                                <div>{period || <span className="text-gray-500 italic">None</span>}</div>
                                <div>{w.reason || <span className="text-gray-500 italic">None</span>}</div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Character References */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        Character References
                      </h3>
                      <div className="border border-gray-300">
                        <div className="grid grid-cols-6 bg-gray-100 p-2 font-medium min-w-0">
                          <div>Full Name</div>
                          <div>Relationship</div>
                          <div>Job Title</div>
                          <div>Company</div>
                          <div>Phone</div>
                          <div>Email</div>
                        </div>
                        {characterReferences.length === 0 ? (
                          <div className="p-2"><span className="text-gray-500 italic">None</span></div>
                        ) : (
                          characterReferences
                            .filter((r) => r.fullName || r.relationship || r.jobTitle || r.company || r.phone || r.email)
                            .map((r, i) => (
                              <div
                                key={i}
                                className={`grid grid-cols-6 p-2 min-w-0 ${
                                  i % 2 === 1 ? 'bg-gray-100' : ''
                                }`}
                              >
                                <div>{r.fullName || <span className="text-gray-500 italic">None</span>}</div>
                                <div>{r.relationship || <span className="text-gray-500 italic">None</span>}</div>
                                <div>{r.jobTitle || <span className="text-gray-500 italic">None</span>}</div>
                                <div>{r.company || <span className="text-gray-500 italic">None</span>}</div>
                                <div>{r.phone || <span className="text-gray-500 italic">None</span>}</div>
                                <div className="min-w-0 truncate" title={r.email || ''}>
                                  {r.email ? r.email : <span className="text-gray-500 italic">None</span>}
                                </div>
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
                      className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      disabled={submitting}
                      onClick={async () => {
                        setShowConfirmDialog(false);
                        await handleFinalSubmit();
                      }}
                    >
                      {submitting ? 'Submitting...' : 'Confirm'}
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

          </div>
      </>
    );
  }

  export default ApplicantLHome;
