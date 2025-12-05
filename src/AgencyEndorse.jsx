// src/AgencyEndorse.jsx
import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { supabase } from "./supabaseClient";
import LogoCropped from './layouts/photos/logo(cropped).png';

function AgencyEndorse() {
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  const location = useLocation();
  const navigate = useNavigate();
  const job = location.state?.job;

  // Header state
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const profileDropdownRef = useRef(null);

  // Custom alert / confirm state (match site-wide design)
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmCallback, setConfirmCallback] = useState(null);
  const [successNavigatePath, setSuccessNavigatePath] = useState(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileDropdown]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/employee/login");
  };

  const isValidUuid = (val) =>
    typeof val === "string" &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      val
    );

  const [applicants, setApplicants] = useState([{ id: 1, name: "Employee 1" }]);
  const [activeApplicant, setActiveApplicant] = useState(1);

  const makeEmptyValues = () => ({
    department: "",
    position: "",
    depot: "",
    dateAvailable: "",
    employed: "no",
    lastName: "",
    firstName: "",
    middleName: "",
    birthday: "",
    maritalStatus: "",
    sex: "",
    residenceNo: "",
    street: "",
    city: "",
    zip: "",
    residenceNoAlt: "",
    streetAlt: "",
    cityAlt: "",
    zipAlt: "",
    contactNumber: "",
    email: "",
    education: "",
    secondarySchool: "",
    secondaryYear: "",
    tertiarySchool: "",
    tertiaryYear: "",
    tertiaryProgram: "",
    graduateSchool: "",
    graduateYear: "",
    graduateProgram: "",
    specializedTraining: "",
    specializedYear: "",
    trainingCertFile: null,
    skills: "",
    licenseExpiry: "",
    licenseClassification: "",
    licenseFile: null,
    restrictionCodes: [],
    yearsDriving: "",
    truckKnowledge: "no",
    troubleshootingTasks: [],
    takingMedications: false,
    medicationReason: "",
    tookMedicalTest: false,
    medicalTestDate: "",
    vehicleTypes: [],
  });

  const [formValues, setFormValues] = useState(() => {
    const init = {};
    applicants.forEach((a) => {
      init[a.id] = makeEmptyValues();
    });
    return init;
  });

  const [workExperiences, setWorkExperiences] = useState([
    { date: "", company: "", role: "", notes: "", tasks: "", reason: "" },
  ]);

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // CSV Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvError, setCsvError] = useState('');
  const [isDraggingCsv, setIsDraggingCsv] = useState(false);
  const csvInputRef = useRef(null);

  const addApplicant = () => {
    const newId = applicants.length + 1;
    setApplicants((prev) => [...prev, { id: newId, name: `Applicant ${newId}` }]);
    setFormValues((prev) => ({ ...prev, [newId]: makeEmptyValues() }));
    setActiveApplicant(newId);
  };

  const removeApplicant = (id) => {
    if (applicants.length === 1) return;
    const filtered = applicants.filter((a) => a.id !== id);
    setApplicants(filtered);
    setFormValues((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    if (activeApplicant === id) setActiveApplicant(filtered[0].id);
  };

  const addWorkExperience = () =>
    setWorkExperiences((prev) => [...prev, { date: "", company: "", role: "", notes: "", tasks: "", reason: "" }]);

  const removeWorkExperience = (index) =>
    setWorkExperiences((prev) => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });

  const updateWorkExperience = (index, updatedExp) =>
    setWorkExperiences((prev) => {
      const copy = [...prev];
      copy[index] = updatedExp;
      return copy;
    });

  const handleChange = (appId, key, value) => {
    setFormValues((prev) => ({
      ...prev,
      [appId]: {
        ...(prev[appId] || makeEmptyValues()),
        [key]: value,
      },
    }));
  };

  const toggleArrayValue = (appId, key, value) => {
    setFormValues((prev) => {
      const arr = new Set((prev[appId]?.[key] || []).slice());
      if (arr.has(value)) arr.delete(value);
      else arr.add(value);
      return {
        ...prev,
        [appId]: { ...(prev[appId] || makeEmptyValues()), [key]: Array.from(arr) },
      };
    });
  };

  const toggleFlag = (appId, key) => {
    setFormValues((prev) => ({
      ...prev,
      [appId]: { ...(prev[appId] || makeEmptyValues()), [key]: !prev[appId]?.[key] },
    }));
  };

  // CSV Import Functions
  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return { headers: [], data: [] };
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''));
      if (values.length === headers.length) {
        const row = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx];
        });
        data.push(row);
      }
    }
    return { headers, data };
  };

  const mapCsvToFormValues = (csvRow) => {
    const values = makeEmptyValues();
    
    // Map common CSV column names to form fields
    const fieldMappings = {
      'lastname': 'lastName', 'last_name': 'lastName', 'last name': 'lastName', 'surname': 'lastName',
      'firstname': 'firstName', 'first_name': 'firstName', 'first name': 'firstName', 'given name': 'firstName',
      'middlename': 'middleName', 'middle_name': 'middleName', 'middle name': 'middleName',
      'email': 'email', 'email address': 'email', 'emailaddress': 'email',
      'contact': 'contactNumber', 'contact_number': 'contactNumber', 'contactnumber': 'contactNumber', 
      'phone': 'contactNumber', 'mobile': 'contactNumber', 'phone number': 'contactNumber',
      'position': 'position', 'job title': 'position', 'jobtitle': 'position',
      'department': 'department', 'dept': 'department',
      'depot': 'depot', 'location': 'depot', 'branch': 'depot',
      'birthday': 'birthday', 'birthdate': 'birthday', 'birth_date': 'birthday', 'date of birth': 'birthday',
      'sex': 'sex', 'gender': 'sex',
      'marital status': 'maritalStatus', 'maritalstatus': 'maritalStatus', 'civil status': 'maritalStatus',
      'street': 'street', 'address': 'street',
      'city': 'city', 'municipality': 'city',
      'zip': 'zip', 'zipcode': 'zip', 'zip_code': 'zip', 'postal': 'zip',
      'education': 'education', 'educational attainment': 'education',
      'school': 'tertiarySchool', 'institution': 'tertiarySchool',
      'course': 'tertiaryProgram', 'program': 'tertiaryProgram',
      'year graduated': 'tertiaryYear', 'yeargraduated': 'tertiaryYear',
      'skills': 'skills',
      'license classification': 'licenseClassification', 'licenseclassification': 'licenseClassification',
      'license expiry': 'licenseExpiry', 'licenseexpiry': 'licenseExpiry',
      'years driving': 'yearsDriving', 'yearsdriving': 'yearsDriving', 'driving experience': 'yearsDriving',
    };

    Object.keys(csvRow).forEach(key => {
      const normalizedKey = key.toLowerCase().trim();
      const formField = fieldMappings[normalizedKey];
      if (formField && csvRow[key]) {
        values[formField] = csvRow[key];
      }
    });

    return values;
  };

  const handleCsvFileSelect = (file) => {
    setCsvError('');
    setCsvPreview([]);
    
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
      setCsvError('Please upload a CSV file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setCsvError('File size must be less than 5MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const { headers, data } = parseCSV(e.target.result);
        if (data.length === 0) {
          setCsvError('No valid data found in CSV file');
          return;
        }
        if (data.length > 50) {
          setCsvError('Maximum 50 employees can be imported at once');
          return;
        }
        setCsvFile(file);
        setCsvPreview(data.slice(0, 5)); // Preview first 5 rows
      } catch (err) {
        setCsvError('Error parsing CSV file. Please check the format.');
      }
    };
    reader.readAsText(file);
  };

  const handleCsvImport = () => {
    if (!csvFile) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const { data } = parseCSV(e.target.result);
      
      // Create new applicants from CSV data
      const newApplicants = [];
      const newFormValues = { ...formValues };
      let nextId = Math.max(...applicants.map(a => a.id)) + 1;
      
      data.forEach((row, idx) => {
        const values = mapCsvToFormValues(row);
        const name = values.firstName && values.lastName 
          ? `${values.firstName} ${values.lastName}` 
          : `Employee ${nextId}`;
        
        newApplicants.push({ id: nextId, name });
        newFormValues[nextId] = values;
        nextId++;
      });
      
      setApplicants(prev => [...prev, ...newApplicants]);
      setFormValues(newFormValues);
      if (newApplicants.length > 0) {
        setActiveApplicant(newApplicants[0].id);
      }
      
      // Close modal and reset
      setShowImportModal(false);
      setCsvFile(null);
      setCsvPreview([]);
      setCsvError('');

      // Custom success alert (site-wide design)
      setSuccessMessage(`Successfully imported ${data.length} employee(s). Please review and complete their information.`);
      setSuccessNavigatePath(null);
      setShowSuccessAlert(true);
    };
    reader.readAsText(csvFile);
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const stepLabels = [
    { num: 1, label: 'Personal Info' },
    { num: 2, label: 'Education & Skills' },
    { num: 3, label: 'License Info' },
    { num: 4, label: 'Driving History' },
  ];

  // --- Endorse implementation (no blocking auth alert) ---
  // Endorse handler (AgencyEndorse.jsx)
  const handleEndorse = async () => {
    const vals = formValues[activeApplicant] || makeEmptyValues();
    const fname = vals.firstName?.trim() || "";
    const lname = vals.lastName?.trim() || "";
    const mname = vals.middleName?.trim() || "";
    const email = (vals.email || "").trim().toLowerCase();
    const contact = vals.contactNumber || "";
    const position = vals.position || null;
    const depot = vals.depot || null;

    // required fields
    if (!fname || !lname || !email) {
      setErrorMessage("Please fill required fields before endorsing: First Name, Last Name, Email.");
      setShowErrorAlert(true);
      return;
    }

    try {
      // get current auth user (best-effort). If not found, continue with null.
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) console.warn("auth.getUser error (continuing):", authErr);
      const authUserId = authData?.user?.id ?? null;

      // try to find a profiles row for the agency profile id (best-effort)
      let agencyProfileId = null;
      try {
        const { data: profileRow, error: profileErr } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", authUserId)
          .maybeSingle();
        if (profileErr) console.warn("profiles lookup error (continuing):", profileErr);
        agencyProfileId = profileRow?.id ?? null;
      } catch (e) {
        console.warn("profiles lookup unexpected error (continuing):", e);
        agencyProfileId = null;
      }

      // ensure job id is a UUID before sending; otherwise set null
      const jobIdToSend = isValidUuid(job?.id) ? job.id : null;
      if (job?.id && !jobIdToSend) {
        console.warn("job.id present but not a valid UUID; sending null for job_id to avoid DB error", job);
      }

      // prepare payload
      const payload = {
        applicant: vals,
        workExperiences,
        meta: {
          source: "agency",
          endorsed_by_profile_id: agencyProfileId,
          endorsed_by_auth_user_id: authUserId,
          endorsed_at: new Date().toISOString(),
          job_id: jobIdToSend,
        },
      };

      // ---------- PRE-CHECK: avoid duplicates ----------
      // Check applications for same job + applicant email
      const { data: existingApps, error: errAppCheck } = await supabase
        .from("applications")
        .select("id, created_at, endorsed")
        .eq("job_id", jobIdToSend)
        .or(`payload->applicant->>email.eq.${email}, payload->form->applicant->>email.eq.${email}, payload->>email.eq.${email}`)
        .limit(1);

      if (errAppCheck) {
        console.warn("applications pre-check warning:", errAppCheck);
        // continue anyway
      } else if (existingApps && existingApps.length > 0) {
        setErrorMessage("This application already exists (someone else endorsed it). Endorsement skipped.");
        setShowErrorAlert(true);
        return;
      }

      // ---------- INSERT: directly into applications table with endorsed=true ----------
      // For agency endorsements, we no longer tie applications.user_id to the agency auth user.
      // Insert with NULL user_id to avoid foreign key issues; HR/Employees modules will use payload/meta.

      const { error: errAppInsert } = await supabase
        .from("applications")
        .insert([
          {
            job_id: jobIdToSend,
            payload,
            status: "submitted",
            endorsed: true, // Mark as endorsed by agency
          },
        ]);

      if (errAppInsert) {
        console.error("Failed to create application:", errAppInsert);
        setErrorMessage("Failed to create endorsement. See console for details.");
        setShowErrorAlert(true);
        return;
      }

      // Success: application created directly with endorsed=true
      setSuccessMessage("Successfully endorsed. ✅");
      setSuccessNavigatePath("/agency/endorsements");
      setShowSuccessAlert(true);
    } catch (err) {
      console.error("unexpected endorse error:", err);
      setErrorMessage("An unexpected error occurred. Check console.");
      setShowErrorAlert(true);
    }
  };


  const fv = formValues[activeApplicant] || makeEmptyValues();

  const restrictionCodesList = [
    "A - MOTORCYCLE",
    "1 - MOTORCYLES / MOTORIZED TRICYCLE",
    "A1 - TRICYLE",
    "2 - VEHICLE UP TO 4500 GVW",
    "B - UP TO 5000 KGS GVW / 8 SEATS",
    "3 - VEHICLE ABOVE 4500 GVW *",
    "B1 - UP TO 5000 KGS GVW / 9 OR MORE SEATS",
    "4 - AUTOMATIC CLUTCH UP TO 4500 GVW",
    "B2 - GOODS < 3500 KGS GVW *",
    "5 - AUTOMATIC CLUTCH UP ABOVE 4500 GVW",
    "C - GOODS > 3500 KGS GVW *",
    "6 - ARTICULATED VEHICLE 1600 GVW AND BELOW",
    "D - BUS > 5000 KGS GVW / 9 OR MORE SEATS",
    "7 - ARTICULATED VEHICLE 1601 UP TO 4500 GVW",
    "BE - TRAILERS < 3500 KGS",
    "8 - ARTICULATED VEHICLE 4501 & ABOVE GVW",
    "CE - ARTICULATED C > 3500 KGS COMBINED GVW",
  ];

  const troubleshootingTasksList = [
    "Replacing lights or bulbs for the headlights, brake lights, etc.",
    "Adding brake fluid.",
    "Adding engine oil.",
    "Adding power steering fluid.",
    "Adjusting the engine belt.",
    "Replacing the tire.",
    "No knowledge of basic troubleshooting.",
  ];

  const vehicleTypesList = ["Sedan or Car", "Van", "L300", "Hino / Canter (4 wheels - 6 wheels)", "10 Wheeler", "None"];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <style>{`
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
        * {
          scrollbar-width: thin;
          scrollbar-color: #d1d5db transparent;
        }
      `}</style>

      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img src={LogoCropped} alt="Each-R Logo" className="h-10 w-auto object-contain" />
                </div>

            <nav className="flex items-center space-x-6 text-sm font-medium text-gray-600">
              <Link to="/agency/home" className="pb-1 hover:text-gray-900 transition-colors">Home</Link>
              <Link to="/agency/endorsements" className="pb-1 hover:text-gray-900 transition-colors">Endorsements</Link>
              <Link to="/agency/requirements" className="hover:text-gray-900 transition-colors pb-1">Requirements</Link>
              <Link to="/agency/trainings" className="hover:text-gray-900 transition-colors pb-1">Trainings/Orientation</Link>
              <Link to="/agency/evaluation" className="hover:text-gray-900 transition-colors pb-1">Evaluation</Link>
              <Link to="/agency/separation" className="hover:text-gray-900 transition-colors pb-1">Separation</Link>
            </nav>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 cursor-pointer">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
            </div>
                <span className="absolute -top-1 -right-1 bg-[#800000] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">3</span>
              </div>
              
              <div className="relative" ref={profileDropdownRef}>
                <div onClick={() => setShowProfileDropdown(!showProfileDropdown)} className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold cursor-pointer hover:bg-gray-300">AU</div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full border-2 border-white flex items-center justify-center pointer-events-none">
                  <svg className="w-2 h-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {showProfileDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 text-sm text-gray-700 border-b">Agency User</div>
                      <button onClick={() => { setShowProfileDropdown(false); setShowLogoutConfirm(true); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Logout</button>
          </div>
        </div>
      )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Link to="/agency/endorsements" className="hover:text-[#800000]">Endorsements</Link>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              <span className="text-gray-700">New Endorsement</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Endorse New Employee</h1>
            <p className="text-gray-500 mt-1">Fill out the form below to endorse an employee to HR for review</p>
      </div>

          {/* Progress Indicator */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between">
              {stepLabels.map((s, idx) => (
                <div key={s.num} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      step === s.num 
                        ? 'bg-[#800000] text-white ring-4 ring-[#800000]/10' 
                        : step > s.num 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-200 text-gray-500'
                    }`}>
                      {step > s.num ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : s.num}
                    </div>
                    <span className={`text-xs mt-2 font-medium ${step === s.num ? 'text-[#800000]' : step > s.num ? 'text-green-600' : 'text-gray-400'}`}>
                      {s.label}
                    </span>
                  </div>
                  {idx < stepLabels.length - 1 && (
                    <div className={`flex-1 h-1 mx-3 rounded ${step > s.num ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
      </div>

          {/* Employee Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-[#800000] to-[#990000] flex items-center justify-between">
              <span className="text-white font-semibold flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Employees to Endorse
              </span>
              <span className="text-white/80 text-sm">{applicants.length} employee{applicants.length > 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center p-3 gap-2 flex-wrap bg-gray-50 border-b border-gray-100">
        {applicants.map((applicant) => (
                <div key={applicant.id} className="relative group">
                  <button 
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeApplicant === applicant.id 
                        ? "bg-[#800000] text-white shadow-md" 
                        : "bg-white text-gray-600 border border-gray-200 hover:border-[#800000]/30 hover:bg-[#800000]/10"
                    }`} 
                    onClick={() => setActiveApplicant(applicant.id)}
                  >
                    {fv.firstName && fv.lastName ? `${fv.firstName} ${fv.lastName}` : applicant.name}
                  </button>
            {applicants.length > 1 && (
                    <button 
                      onClick={() => removeApplicant(applicant.id)} 
                      className="absolute -top-2 -right-2 bg-[#800000] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center hover:bg-[#990000] opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    >
                      ×
                    </button>
            )}
          </div>
        ))}
              <button 
                className="px-4 py-2 rounded-lg text-sm font-medium text-[#800000] border-2 border-dashed border-[#800000]/30 hover:bg-[#800000]/10 transition-colors flex items-center gap-1" 
                onClick={addApplicant}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Employee
              </button>
              <button 
                className="px-4 py-2 rounded-lg text-sm font-medium text-blue-600 border border-blue-300 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center gap-1.5" 
                onClick={() => setShowImportModal(true)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import CSV
              </button>
            </div>
      </div>

          {/* Step 1: Personal Information */}
      {step === 1 && (
            <div className="space-y-6">
              {/* Employment Details */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <h2 className="text-base font-semibold text-gray-800">Employment Details</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
                      <select className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" value={fv.department} onChange={(e) => handleChange(activeApplicant, "department", e.target.value)}>
                <option value="">Select Department</option>
                <option>Operations</option>
                <option>HR</option>
                <option>Admin</option>
                <option>Delivery Crew</option>
              </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Position <span className="text-[#800000]">*</span></label>
                      <select className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" value={fv.position} onChange={(e) => handleChange(activeApplicant, "position", e.target.value)}>
                <option value="">Select Position</option>
                <option>Delivery Driver</option>
                <option>Delivery Helper</option>
                <option>Driver</option>
                <option>Security Personnel</option>
              </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Depot Assignment <span className="text-[#800000]">*</span></label>
                      <select className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" value={fv.depot} onChange={(e) => handleChange(activeApplicant, "depot", e.target.value)}>
                        <option value="">Select Depot</option>
                <option>Pasig</option>
                <option>Cebu</option>
                <option>Butuan</option>
                <option>Manila</option>
                <option>Quezon City</option>
                <option>Taguig</option>
              </select>
            </div>
            <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Available</label>
                      <input type="date" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" value={fv.dateAvailable || ""} onChange={(e) => handleChange(activeApplicant, "dateAvailable", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Currently Employed?</label>
                    <div className="flex gap-4">
                      <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${fv.employed === "yes" ? 'border-[#800000] bg-[#800000]/10 text-[#800000]' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <input type="radio" name={`employed-${activeApplicant}`} className="accent-[#800000]" checked={fv.employed === "yes"} onChange={() => handleChange(activeApplicant, "employed", "yes")} /> Yes
              </label>
                      <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${fv.employed !== "yes" ? 'border-[#800000] bg-[#800000]/10 text-[#800000]' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <input type="radio" name={`employed-${activeApplicant}`} className="accent-[#800000]" checked={fv.employed !== "yes"} onChange={() => handleChange(activeApplicant, "employed", "no")} /> No
              </label>
                    </div>
                  </div>
            </div>
          </div>

              {/* Personal Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <h2 className="text-base font-semibold text-gray-800">Personal Information</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name <span className="text-[#800000]">*</span></label>
                      <input className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" placeholder="Enter last name" value={fv.lastName} onChange={(e) => handleChange(activeApplicant, "lastName", e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name <span className="text-[#800000]">*</span></label>
                      <input className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" placeholder="Enter first name" value={fv.firstName} onChange={(e) => handleChange(activeApplicant, "firstName", e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Middle Name</label>
                      <input className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" placeholder="Enter middle name" value={fv.middleName} onChange={(e) => handleChange(activeApplicant, "middleName", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Birthday</label>
                      <input type="date" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" value={fv.birthday} onChange={(e) => handleChange(activeApplicant, "birthday", e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Marital Status</label>
                      <select className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" value={fv.maritalStatus} onChange={(e) => handleChange(activeApplicant, "maritalStatus", e.target.value)}>
                        <option value="">Select status</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                        <option value="Widowed">Widowed</option>
                        <option value="Separated">Separated</option>
              </select>
              </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sex</label>
                      <div className="flex gap-3">
                        <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all flex-1 justify-center ${fv.sex === "Male" ? 'border-[#800000] bg-[#800000]/10 text-[#800000]' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <input type="radio" name={`sex-${activeApplicant}`} className="accent-[#800000]" checked={fv.sex === "Male"} onChange={() => handleChange(activeApplicant, "sex", "Male")} /> Male
                        </label>
                        <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all flex-1 justify-center ${fv.sex === "Female" ? 'border-[#800000] bg-[#800000]/10 text-[#800000]' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <input type="radio" name={`sex-${activeApplicant}`} className="accent-[#800000]" checked={fv.sex === "Female"} onChange={() => handleChange(activeApplicant, "sex", "Female")} /> Female
                        </label>
            </div>
          </div>
                  </div>
            </div>
          </div>

              {/* Address */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <h2 className="text-base font-semibold text-gray-800">Address</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">House/Unit No.</label>
                      <input className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" placeholder="e.g. 123" value={fv.residenceNo} onChange={(e) => handleChange(activeApplicant, "residenceNo", e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Street/Village</label>
                      <input className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" placeholder="Enter street" value={fv.street} onChange={(e) => handleChange(activeApplicant, "street", e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">City/Municipality</label>
                      <input className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" placeholder="Enter city" value={fv.city} onChange={(e) => handleChange(activeApplicant, "city", e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Zip Code</label>
                      <input className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" placeholder="e.g. 1600" value={fv.zip} onChange={(e) => handleChange(activeApplicant, "zip", e.target.value)} />
                    </div>
                  </div>
            </div>
          </div>

              {/* Contact Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <h2 className="text-base font-semibold text-gray-800">Contact Information</h2>
            </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Number <span className="text-[#800000]">*</span></label>
                      <input className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" placeholder="e.g. 09XX XXX XXXX" value={fv.contactNumber} onChange={(e) => handleChange(activeApplicant, "contactNumber", e.target.value)} />
          </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address <span className="text-[#800000]">*</span></label>
                      <input type="email" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" placeholder="e.g. employee@email.com" value={fv.email} onChange={(e) => handleChange(activeApplicant, "email", e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Education & Skills */}
      {step === 2 && (
        <div className="space-y-6">
              {/* Highest Educational Attainment */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <h2 className="text-base font-semibold text-gray-800">Highest Educational Attainment</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Provide the highest level of education completed</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Educational Level <span className="text-[#800000]">*</span></label>
                      <select className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" value={fv.education || ""} onChange={(e) => handleChange(activeApplicant, "education", e.target.value)}>
                        <option value="">Select highest education</option>
                        <option value="Elementary">Elementary Graduate</option>
                <option value="High School">High School Graduate</option>
                        <option value="Vocational">Vocational/Technical Course</option>
                <option value="College">College Graduate</option>
                        <option value="Post Graduate">Post Graduate (Masters/Doctorate)</option>
              </select>
            </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Year Graduated</label>
                      <input type="number" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" placeholder="e.g. 2020" value={fv.tertiaryYear || ""} onChange={(e) => handleChange(activeApplicant, "tertiaryYear", e.target.value)} />
          </div>
            </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">School/Institution Name</label>
                      <input className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" placeholder="Enter school name" value={fv.tertiarySchool || ""} onChange={(e) => handleChange(activeApplicant, "tertiarySchool", e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Course/Program (if applicable)</label>
                      <input className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" placeholder="e.g. BS Mechanical Engineering" value={fv.tertiaryProgram || ""} onChange={(e) => handleChange(activeApplicant, "tertiaryProgram", e.target.value)} />
                    </div>
                  </div>
                </div>
            </div>

              {/* Skills & Proficiency */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <h2 className="text-base font-semibold text-gray-800">Skills & Proficiency</h2>
                </div>
                <div className="p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Areas of Expertise</label>
                  <textarea 
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] resize-none" 
                    rows={4} 
                    placeholder="List the employee's skills and areas of proficiency (e.g., defensive driving, vehicle maintenance, customer service, route planning...)"
                    value={fv.skills || ""} 
                    onChange={(e) => handleChange(activeApplicant, "skills", e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-2">Separate each skill with a comma</p>
                </div>
            </div>

              {/* Specialized Training (Optional) */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <h2 className="text-base font-semibold text-gray-800">
                    Specialized Training
                    <span className="text-xs font-normal text-gray-400 ml-2">(Optional)</span>
                  </h2>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Training/Certification Name</label>
                      <input className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" placeholder="e.g. Defensive Driving Course" value={fv.specializedTraining || ""} onChange={(e) => handleChange(activeApplicant, "specializedTraining", e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Year Completed</label>
                      <input type="number" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" placeholder="e.g. 2023" value={fv.specializedYear || ""} onChange={(e) => handleChange(activeApplicant, "specializedYear", e.target.value)} />
            </div>
          </div>

                  {/* Certificate Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Certificate <span className="text-gray-400 font-normal">(Photocopy)</span>
                    </label>
                    {!fv.trainingCertFile ? (
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#800000]/40 hover:bg-[#800000]/10 transition-colors">
                        <div className="flex flex-col items-center justify-center py-3">
                          <svg className="w-7 h-7 text-gray-400 mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-sm text-gray-500">Upload certificate</p>
                          <p className="text-xs text-gray-400">PDF, JPG, PNG (Max 5MB)</p>
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                setErrorMessage('File size must be less than 5MB');
                                setShowErrorAlert(true);
                                return;
                              }
                              handleChange(activeApplicant, "trainingCertFile", file);
                            }
                          }}
                        />
                      </label>
                    ) : (
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800 truncate max-w-xs">{fv.trainingCertFile.name}</p>
                            <p className="text-xs text-gray-500">{(fv.trainingCertFile.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => handleChange(activeApplicant, "trainingCertFile", null)}
                          className="p-1.5 text-gray-400 hover:text-[#800000] hover:bg-[#800000]/10 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
          </div>
        </div>
      )}

          {/* Step 3: License Information */}
      {step === 3 && (
        <div className="space-y-6">
              {/* License Details */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <h2 className="text-base font-semibold text-gray-800">Driver's License Details</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">License Classification <span className="text-[#800000]">*</span></label>
                      <select className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" value={fv.licenseClassification || ""} onChange={(e) => handleChange(activeApplicant, "licenseClassification", e.target.value)}>
                        <option value="">Select classification</option>
                <option>Non-Professional</option>
                <option>Professional</option>
                <option>Student Permit</option>
                <option>Conductor</option>
                <option>International Driving Permit</option>
              </select>
            </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">License Expiry Date <span className="text-[#800000]">*</span></label>
                      <input type="date" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" value={fv.licenseExpiry || ""} onChange={(e) => handleChange(activeApplicant, "licenseExpiry", e.target.value)} />
                    </div>
          </div>

                  {/* License Photocopy Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      License Photocopy <span className="text-gray-400 font-normal">(Front & Back)</span>
                    </label>
                    {!fv.licenseFile ? (
                      <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#800000]/40 hover:bg-[#800000]/10 transition-colors">
                        <div className="flex flex-col items-center justify-center py-4">
                          <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                          <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG (Max 5MB)</p>
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                setErrorMessage('File size must be less than 5MB');
                                setShowErrorAlert(true);
                                return;
                              }
                              handleChange(activeApplicant, "licenseFile", file);
                            }
                          }}
                        />
                      </label>
                    ) : (
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800 truncate max-w-xs">{fv.licenseFile.name}</p>
                            <p className="text-xs text-gray-500">{(fv.licenseFile.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => handleChange(activeApplicant, "licenseFile", null)}
                          className="p-1.5 text-gray-400 hover:text-[#800000] hover:bg-[#800000]/10 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Restriction Codes */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <h2 className="text-base font-semibold text-gray-800">Restriction Codes</h2>
                </div>
                <div className="p-6 space-y-4">
                  {/* Info Box */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-amber-800">Driver Qualification Requirements</p>
                        <ul className="text-xs text-amber-700 mt-1 space-y-0.5">
                          <li>• <strong>Code 3</strong> - Equivalent to Code C in the new LTO license system</li>
                          <li>• <strong>Code B2</strong> - They can only drive up to 1T vehicles</li>
                          <li>• <strong>Code C</strong> - They can drive up to 1T and 2T vehicles</li>
            </ul>
                      </div>
                    </div>
                  </div>

                  {/* Restriction Codes Grid */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Select applicable restriction codes:</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {restrictionCodesList.map((code) => (
                        <label 
                          key={code} 
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            fv.restrictionCodes.includes(code) 
                              ? 'border-[#800000] bg-[#800000]/10' 
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 accent-[#800000] rounded" 
                            checked={fv.restrictionCodes.includes(code)} 
                            onChange={() => toggleArrayValue(activeApplicant, "restrictionCodes", code)} 
                          />
                          <span className={`text-sm ${fv.restrictionCodes.includes(code) ? 'text-[#800000] font-medium' : 'text-gray-700'}`}>{code}</span>
                </label>
              ))}
                    </div>
                  </div>
            </div>
          </div>
        </div>
      )}

          {/* Step 4: Driving History */}
      {step === 4 && (
        <div className="space-y-6">
              {/* Driving Experience */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <h2 className="text-base font-semibold text-gray-800">Driving Experience</h2>
              </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Years of Driving Experience</label>
                      <input type="number" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" placeholder="e.g. 5" value={fv.yearsDriving || ""} onChange={(e) => handleChange(activeApplicant, "yearsDriving", e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Has basic truck troubleshooting knowledge?</label>
                      <div className="flex gap-3">
                        <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all flex-1 justify-center ${fv.truckKnowledge === "yes" ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <input type="radio" name={`truckKnowledge-${activeApplicant}`} className="accent-green-600" checked={fv.truckKnowledge === "yes"} onChange={() => handleChange(activeApplicant, "truckKnowledge", "yes")} /> Yes
                        </label>
                        <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all flex-1 justify-center ${fv.truckKnowledge !== "yes" ? 'border-[#800000] bg-[#800000]/10 text-[#800000]' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <input type="radio" name={`truckKnowledge-${activeApplicant}`} className="accent-[#800000]" checked={fv.truckKnowledge !== "yes"} onChange={() => handleChange(activeApplicant, "truckKnowledge", "no")} /> No
                        </label>
                      </div>
                    </div>
                  </div>
            </div>
          </div>

              {/* Troubleshooting Tasks */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <h2 className="text-base font-semibold text-gray-800">Troubleshooting Capabilities</h2>
                </div>
                <div className="p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">What troubleshooting tasks can the employee perform?</label>
                  <div className="grid grid-cols-1 gap-2">
              {troubleshootingTasksList.map((task) => (
                      <label 
                        key={task} 
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          fv.troubleshootingTasks.includes(task) 
                            ? 'border-purple-500 bg-purple-50' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 accent-purple-600 rounded" 
                          checked={fv.troubleshootingTasks.includes(task)} 
                          onChange={() => toggleArrayValue(activeApplicant, "troubleshootingTasks", task)} 
                        />
                        <span className={`text-sm ${fv.troubleshootingTasks.includes(task) ? 'text-purple-700 font-medium' : 'text-gray-700'}`}>{task}</span>
                </label>
              ))}
            </div>
          </div>
          </div>

              {/* Vehicle Types */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <h2 className="text-base font-semibold text-gray-800">Vehicles Driven</h2>
                </div>
                <div className="p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">What types of vehicles has the employee driven?</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {vehicleTypesList.map((vehicle) => (
                      <label 
                        key={vehicle} 
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          fv.vehicleTypes.includes(vehicle) 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 accent-green-600 rounded" 
                          checked={fv.vehicleTypes.includes(vehicle)} 
                          onChange={() => toggleArrayValue(activeApplicant, "vehicleTypes", vehicle)} 
                        />
                        <span className={`text-sm ${fv.vehicleTypes.includes(vehicle) ? 'text-green-700 font-medium' : 'text-gray-700'}`}>{vehicle}</span>
                </label>
              ))}
                  </div>
            </div>
          </div>

              {/* Medical Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <h2 className="text-base font-semibold text-gray-800">Medical Information</h2>
                </div>
                <div className="p-6 space-y-4">
                  <label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${fv.takingMedications ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input type="checkbox" className="w-4 h-4 accent-amber-600 rounded" checked={!!fv.takingMedications} onChange={() => toggleFlag(activeApplicant, "takingMedications")} />
                    <span className="text-sm text-gray-700">Currently taking any maintenance medications?</span>
                  </label>
                  {fv.takingMedications && (
                    <input className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" placeholder="Please specify the medication and reason..." value={fv.medicationReason || ""} onChange={(e) => handleChange(activeApplicant, "medicationReason", e.target.value)} />
                  )}

                  <label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${fv.tookMedicalTest ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input type="checkbox" className="w-4 h-4 accent-green-600 rounded" checked={!!fv.tookMedicalTest} onChange={() => toggleFlag(activeApplicant, "tookMedicalTest")} />
                    <span className="text-sm text-gray-700">Has taken medical and drug test?</span>
                  </label>
                  {fv.tookMedicalTest && (
                    <input className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" placeholder="When was the last test taken? (e.g. November 2024)" value={fv.medicalTestDate || ""} onChange={(e) => handleChange(activeApplicant, "medicalTestDate", e.target.value)} />
                  )}
                </div>
          </div>
        </div>
      )}

          {/* Navigation Buttons */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mt-6">
            <div className="flex items-center justify-between">
              <button 
                onClick={prevStep} 
                disabled={step === 1}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
                  step === 1 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>

              <span className="text-sm text-gray-500">Step {step} of {totalSteps}</span>

              {step < totalSteps ? (
                <button 
                  onClick={nextStep} 
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#800000] text-white rounded-lg font-medium hover:bg-[#990000] transition-colors"
                >
                  Next Step
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button 
                  onClick={() => setShowConfirmModal(true)} 
                  className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Submit Endorsement
                </button>
              )}
                </div>
              </div>
        </div>
      </div>

      {/* Confirmation Modal with Terms & Privacy */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#800000]/10 to-orange-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#800000]/20 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Confirm Endorsement</h3>
                    <p className="text-sm text-gray-500">Please review and accept the terms below</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowConfirmModal(false);
                    setTermsAccepted(false);
                    setPrivacyAccepted(false);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Data Privacy Notice */}
              <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-800 mb-2">Data Privacy Notice</h4>
                    <div className="text-sm text-blue-700 space-y-2">
                      <p>In compliance with the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong>, we inform you that:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Personal information collected will be used solely for employment processing and HR management purposes.</li>
                        <li>Data will be stored securely and accessed only by authorized personnel.</li>
                        <li>Information may be shared with relevant government agencies as required by law (SSS, PhilHealth, Pag-IBIG, BIR).</li>
                        <li>The employee has the right to access, correct, and request deletion of their personal data.</li>
                        <li>Data will be retained only for the duration required by employment records retention policies.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Terms and Conditions</h4>
                    <div className="text-sm text-gray-600 space-y-2">
                      <p>By submitting this endorsement, you acknowledge and agree that:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>All information provided is true, accurate, and complete to the best of your knowledge.</li>
                        <li>Falsification of any information may result in disqualification or termination of employment.</li>
                        <li>The endorsee meets the minimum qualifications required for the position.</li>
                        <li>Required documents and certifications will be submitted as requested by HR.</li>
                        <li>Background verification may be conducted as part of the hiring process.</li>
                        <li>The company reserves the right to verify all information provided.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Agency Certification */}
              <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-amber-800 mb-2">Agency Certification</h4>
                    <p className="text-sm text-amber-700">
                      As the endorsing agency, we certify that the candidate has undergone our internal screening process and 
                      we recommend them for employment consideration. We assume responsibility for the accuracy of the 
                      information provided in this endorsement.
                    </p>
                  </div>
                </div>
              </div>

              {/* Acceptance Checkboxes */}
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={privacyAccepted}
                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-gray-300 text-[#800000] focus:ring-[#800000] cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    I have read and understood the <strong>Data Privacy Notice</strong>. I consent to the collection, processing, 
                    and storage of personal information as described above.
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-gray-300 text-[#800000] focus:ring-[#800000] cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    I agree to the <strong>Terms and Conditions</strong> and certify that all information provided is 
                    accurate and complete.
                  </span>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <button 
                onClick={() => {
                  setShowConfirmModal(false);
                  setTermsAccepted(false);
                  setPrivacyAccepted(false);
                }}
                className="px-5 py-2.5 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (termsAccepted && privacyAccepted) {
                    const vals = formValues[activeApplicant] || makeEmptyValues();
                    const fname = vals.firstName?.trim() || "";
                    const lname = vals.lastName?.trim() || "";
                    const displayName = `${fname} ${lname}`.trim() || "this applicant";

                    setShowConfirmModal(false);
                    setTermsAccepted(false);
                    setPrivacyAccepted(false);

                    setConfirmMessage(`Endorse ${displayName} to HR?`);
                    setConfirmCallback(() => async () => {
                      await handleEndorse();
                    });
                    setShowConfirmDialog(true);
                  }
                }}
                disabled={!termsAccepted || !privacyAccepted}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
                  termsAccepted && privacyAccepted
                    ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-600/25'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Import Employees from CSV</h3>
                    <p className="text-sm text-gray-500">Bulk import multiple employees at once</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowImportModal(false);
                    setCsvFile(null);
                    setCsvPreview([]);
                    setCsvError('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Instructions */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-800 mb-1">CSV Format Requirements</p>
                    <p className="text-xs text-blue-700">Your CSV file should include column headers. Supported columns:</p>
                    <p className="text-xs text-blue-600 mt-1 font-mono bg-blue-100 px-2 py-1 rounded">
                      firstname, lastname, middlename, email, contact, position, department, depot, birthday, sex
                    </p>
                  </div>
                </div>
              </div>

              {/* File Upload Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload CSV File</label>
                <input
                  ref={csvInputRef}
                  type="file"
                  className="hidden"
                  accept=".csv"
                  onChange={(e) => handleCsvFileSelect(e.target.files[0])}
                />
                
                {!csvFile ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingCsv(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDraggingCsv(false); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingCsv(false);
                      handleCsvFileSelect(e.dataTransfer.files[0]);
                    }}
                    onClick={() => csvInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      isDraggingCsv 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-14 h-14 mx-auto rounded-xl flex items-center justify-center mb-3 ${isDraggingCsv ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <svg className={`w-7 h-7 ${isDraggingCsv ? 'text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-700">
                      {isDraggingCsv ? 'Drop your CSV file here' : 'Drag & drop your CSV file here'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">or <span className="text-blue-600 font-medium">browse</span> to choose a file</p>
                    <p className="text-xs text-gray-400 mt-3">CSV files only (Max 5MB, up to 50 employees)</p>
                  </div>
                ) : (
                  <div className="border-2 border-green-200 bg-green-50 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{csvFile.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{(csvFile.size / 1024).toFixed(1)} KB</p>
                        <p className="text-xs text-green-600 font-medium mt-1">{csvPreview.length > 0 ? `${csvPreview.length}+ employees found` : 'Ready to import'}</p>
                      </div>
                      <button
                        onClick={() => {
                          setCsvFile(null);
                          setCsvPreview([]);
                          setCsvError('');
                        }}
                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {csvError && (
                  <div className="mt-3 p-3 bg-[#800000]/10 border border-[#800000]/20 rounded-lg flex items-start gap-2">
                    <svg className="w-5 h-5 text-[#800000] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-[#800000]">{csvError}</p>
                  </div>
                )}
              </div>

              {/* Preview Table */}
              {csvPreview.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preview (First 5 rows)</label>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-48">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            {Object.keys(csvPreview[0]).slice(0, 6).map((key) => (
                              <th key={key} className="px-3 py-2 text-left text-gray-600 font-medium capitalize border-b">
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {csvPreview.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              {Object.values(row).slice(0, 6).map((val, vidx) => (
                                <td key={vidx} className="px-3 py-2 text-gray-700 truncate max-w-[120px]">
                                  {val || <span className="text-gray-400 italic">empty</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Download Template */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Need a template?</p>
                    <p className="text-xs text-gray-500">Download our sample CSV file</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    const template = 'firstname,lastname,middlename,email,contact,position,department,depot,birthday,sex\nJuan,Dela Cruz,Santos,juan@email.com,09171234567,Delivery Driver,Delivery Crew,Makati,1990-05-15,Male\nMaria,Santos,,maria@email.com,09181234567,Helper,Delivery Crew,BGC,1992-08-20,Female';
                    const blob = new Blob([template], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'employee_template.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Download Template
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <button 
                onClick={() => {
                  setShowImportModal(false);
                  setCsvFile(null);
                  setCsvPreview([]);
                  setCsvError('');
                }}
                className="px-5 py-2.5 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCsvImport}
                disabled={!csvFile || csvPreview.length === 0}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
                  csvFile && csvPreview.length > 0
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import Employees
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Alert Modal */}
      {showSuccessAlert && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50" onClick={() => {
          setShowSuccessAlert(false);
          if (successNavigatePath) {
            const path = successNavigatePath;
            setSuccessNavigatePath(null);
            navigate(path);
          }
        }}>
          <div className="bg-white rounded-md w-full max-w-md mx-4 overflow-hidden border" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-green-600">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.525-1.72-1.72a.75.75 0 1 0-1.06 1.061l2.25 2.25a.75.75 0 0 0 1.144-.094l3.843-5.15Z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="text-lg font-semibold text-gray-800 mb-2">{successMessage}</div>
              <div className="mt-4">
                <button 
                  type="button" 
                  className="px-4 py-2 rounded bg-[#800000] text-white hover:bg-[#990000]" 
                  onClick={() => {
                    setShowSuccessAlert(false);
                    if (successNavigatePath) {
                      const path = successNavigatePath;
                      setSuccessNavigatePath(null);
                      navigate(path);
                    }
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert Modal */}
      {showErrorAlert && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50" onClick={() => setShowErrorAlert(false)}>
          <div className="bg-white rounded-md w-full max-w-md mx-4 overflow-hidden border" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="w-10 h-10 rounded-full bg-[#800000]/20 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#800000]">
                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="text-lg font-semibold text-gray-800 mb-2">{errorMessage}</div>
              <div className="mt-4">
                <button 
                  type="button" 
                  className="px-4 py-2 rounded bg-[#800000] text-white hover:bg-[#990000]" 
                  onClick={() => setShowErrorAlert(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog Modal */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => {
          setShowConfirmDialog(false);
          setConfirmCallback(null);
        }}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{confirmMessage}</h3>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                onClick={() => {
                  setShowConfirmDialog(false);
                  setConfirmCallback(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded bg-[#800000] text-white hover:bg-[#990000]"
                onClick={async () => {
                  if (confirmCallback) {
                    await confirmCallback();
                  }
                  setShowConfirmDialog(false);
                  setConfirmCallback(null);
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1 hover:text-gray-700 cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Philippines</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
      </div>

            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-gray-700 hover:underline">Terms & conditions</a>
              <a href="#" className="hover:text-gray-700 hover:underline">Security</a>
              <a href="#" className="hover:text-gray-700 hover:underline">Privacy</a>
              <span className="text-gray-400">Copyright © 2025, Roadwise</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowLogoutConfirm(false)}>
          <div className="bg-white rounded-xl max-w-md w-full mx-4 overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">Confirm Logout</h3>
            </div>
            <div className="p-5 text-sm text-gray-600">Are you sure you want to logout from your account?</div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
              <button className="px-4 py-2 rounded-lg bg-[#800000] text-white hover:bg-[#990000] text-sm font-medium" onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AgencyEndorse;
