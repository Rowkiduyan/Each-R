// src/AgencyEndorse.jsx
import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { createNotification } from './notifications';
import LogoCropped from './layouts/photos/logo(cropped).png';
import SkillsInput from './components/SkillsInput';
import AutocompleteInput from './components/AutocompleteInput';

function AgencyEndorse() {
  const [step, setStep] = useState(1);
  const location = useLocation();
  const navigate = useNavigate();
  const job = location.state?.job;

  const getJobPrefill = () => {
    const position =
      job?.title ||
      job?.job_posts?.title ||
      job?.raw?.title ||
      job?.raw?.job_posts?.title ||
      "";

    const depot =
      job?.depot ||
      job?.job_posts?.depot ||
      job?.raw?.depot ||
      job?.raw?.job_posts?.depot ||
      "";

    const department =
      job?.department ||
      job?.job_posts?.department ||
      job?.raw?.department ||
      job?.raw?.job_posts?.department ||
      "";

    return {
      position: String(position || "").trim(),
      depot: String(depot || "").trim(),
      department: String(department || "").trim(),
    };
  };
  
  // Treat "Drivers" and "Delivery Drivers" as the same job type
  const jobTitleNormalized = String(job?.title || '').trim().toLowerCase();
  const isDeliveryDriverJob = ['delivery drivers', 'drivers', 'delivery driver', 'driver'].includes(jobTitleNormalized);
  const totalSteps = isDeliveryDriverJob ? 4 : 2; // 4 steps if driver, 2 steps if not

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
    unit_house_number: "",
    street: "",
    barangay: "",
    city: "",
    province: "",
    zip: "",
    residenceNoAlt: "",
    streetAlt: "",
    cityAlt: "",
    zipAlt: "",
    contactNumber: "",
    email: "",
    resumeFile: null,
    hasSSS: false,
    hasPAGIBIG: false,
    hasTIN: false,
    hasPhilHealth: false,
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

  const isApplicantBlank = (vals) => {
    const baseline = makeEmptyValues();
    const obj = vals || baseline;

    for (const key of Object.keys(baseline)) {
      const v = obj[key];
      const b = baseline[key];

      if (typeof File !== 'undefined' && v instanceof File) return false;
      if (v && typeof v === 'object' && v?.name) return false;

      if (Array.isArray(v) || Array.isArray(b)) {
        const arr = Array.isArray(v) ? v : [];
        if (arr.length > 0) return false;
        continue;
      }

      if (typeof b === 'boolean') {
        if (v !== b) return false;
        continue;
      }

      if (typeof b === 'number') {
        const num = Number(v);
        const baseNum = Number(b);
        if (Number.isFinite(num) && Number.isFinite(baseNum) && num !== baseNum) return false;
        if (Number.isFinite(num) && !Number.isFinite(baseNum)) return false;
        continue;
      }

      // Treat default strings (e.g., "no") as blank.
      const vs = String(v ?? '').trim();
      const bs = String(b ?? '').trim();
      if (vs !== bs) return false;
    }

    return true;
  };

  const isApplicantReusableSlotForCsv = (vals) => {
    const baseline = makeEmptyValues();
    const obj = vals || baseline;

    // If user has started filling personal/required step-1 fields, don't overwrite.
    // Ignore job-prefilled fields (department/position/depot).
    const keys = [
      'dateAvailable',
      'lastName',
      'firstName',
      'middleName',
      'birthday',
      'maritalStatus',
      'sex',
      'street',
      'barangay',
      'city',
      'province',
      'zip',
      'contactNumber',
      'email',
    ];

    for (const key of keys) {
      const v = obj[key];
      const b = baseline[key];
      const vs = String(v ?? '').trim();
      const bs = String(b ?? '').trim();
      if (vs !== bs) return false;
    }

    // Also protect if any uploads/arrays were added (rare on step 1, but safe)
    if (typeof File !== 'undefined') {
      if (obj.resumeFile instanceof File) return false;
    }

    return true;
  };

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

  // Pre-submit summary modal (shown before Confirm Endorsement)
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // CSV Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvError, setCsvError] = useState('');
  const [isDraggingCsv, setIsDraggingCsv] = useState(false);
  const csvInputRef = useRef(null);

  // File inputs
  const resumeInputRef = useRef(null);

  // Reset file inputs on applicant change so selecting the same file still fires onChange.
  useEffect(() => {
    if (resumeInputRef.current) resumeInputRef.current.value = '';
  }, [activeApplicant]);

  // PSGC API states for location dropdowns
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState({}); // Object keyed by applicant ID
  const [barangays, setBarangays] = useState({}); // Object keyed by applicant ID
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState({}); // Object keyed by applicant ID
  const [loadingBarangays, setLoadingBarangays] = useState({}); // Object keyed by applicant ID

  // Cache for API responses
  const cityCache = useRef({});
  const barangayCache = useRef({});

  // Ensure step doesn't exceed totalSteps when job changes
  useEffect(() => {
    if (step > totalSteps) {
      setStep(totalSteps);
    }
  }, [totalSteps, step]);

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
        
        // Add Metro Manila (NCR) to the provinces list since it's not included as a province
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

  // Fetch cities when province is selected for any applicant
  useEffect(() => {
    Object.keys(formValues).forEach((appId) => {
      const vals = formValues[appId] || makeEmptyValues();
      if (vals.province && provinces.length > 0) {
        const fetchCities = async () => {
          setLoadingCities(prev => ({ ...prev, [appId]: true }));
          try {
            // Find the province code from the province name (case-insensitive match)
            const selectedProvince = provinces.find(p => 
              p.name && p.name.toLowerCase().trim() === vals.province.toLowerCase().trim()
            );
            
            // Special handling for Metro Manila - fetch from NCR endpoint
            if (selectedProvince && selectedProvince.name === 'Metro Manila') {
              const response = await fetch('https://psgc.gitlab.io/api/regions/130000000/cities-municipalities/');
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              const data = await response.json();
              setCities(prev => ({ ...prev, [appId]: Array.isArray(data) ? data : [] }));
              cityCache.current['130000000'] = Array.isArray(data) ? data : [];
              setLoadingCities(prev => ({ ...prev, [appId]: false }));
              return;
            }
            
            if (selectedProvince && selectedProvince.code) {
              // Check cache first
              if (cityCache.current[selectedProvince.code]) {
                setCities(prev => ({ ...prev, [appId]: cityCache.current[selectedProvince.code] }));
                setLoadingCities(prev => ({ ...prev, [appId]: false }));
                return;
              }

              const response = await fetch(`https://psgc.gitlab.io/api/provinces/${selectedProvince.code}/cities-municipalities/`);
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              const data = await response.json();
              cityCache.current[selectedProvince.code] = data;
              setCities(prev => ({ ...prev, [appId]: Array.isArray(data) ? data : [] }));
            } else {
              setCities(prev => ({ ...prev, [appId]: [] }));
            }
          } catch (error) {
            console.error('Error fetching cities:', error);
            setCities(prev => ({ ...prev, [appId]: [] }));
          } finally {
            setLoadingCities(prev => ({ ...prev, [appId]: false }));
          }
        };
        fetchCities();
      } else if (!vals.province) {
        setCities(prev => ({ ...prev, [appId]: [] }));
        setBarangays(prev => ({ ...prev, [appId]: [] }));
      }
    });
  }, [formValues, provinces]);

  // Fetch barangays when city is selected for any applicant
  useEffect(() => {
    Object.keys(formValues).forEach((appId) => {
      const vals = formValues[appId] || makeEmptyValues();
      const applicantCities = cities[appId] || [];
      if (vals.city && applicantCities.length > 0) {
        const fetchBarangays = async () => {
          setLoadingBarangays(prev => ({ ...prev, [appId]: true }));
          try {
            const selectedCity = applicantCities.find(c => 
              c.name && c.name.toLowerCase().trim() === vals.city.toLowerCase().trim()
            );
            if (selectedCity && selectedCity.code) {
              // Check cache first
              if (barangayCache.current[selectedCity.code]) {
                setBarangays(prev => ({ ...prev, [appId]: barangayCache.current[selectedCity.code] }));
                setLoadingBarangays(prev => ({ ...prev, [appId]: false }));
                return;
              }

              const response = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${selectedCity.code}/barangays/`);
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              const data = await response.json();
              barangayCache.current[selectedCity.code] = data;
              setBarangays(prev => ({ ...prev, [appId]: Array.isArray(data) ? data : [] }));
            } else {
              setBarangays(prev => ({ ...prev, [appId]: [] }));
            }
          } catch (error) {
            console.error('Error fetching barangays:', error);
            setBarangays(prev => ({ ...prev, [appId]: [] }));
          } finally {
            setLoadingBarangays(prev => ({ ...prev, [appId]: false }));
          }
        };
        fetchBarangays();
      } else if (!vals.city) {
        setBarangays(prev => ({ ...prev, [appId]: [] }));
      }
    });
  }, [formValues, cities]);

  // Auto-fill depot/position/department from job when available
  useEffect(() => {
    const { depot, position, department } = getJobPrefill();
    if (job && (depot || position || department)) {
      // Auto-fill for all existing applicants
      setFormValues((prev) => {
        const updated = { ...prev };
        let hasChanges = false;
        
        Object.keys(updated).forEach((appId) => {
          const currentValues = updated[appId] || makeEmptyValues();
          const newValues = { ...currentValues };
          let applicantHasChanges = false;
          
          // These fields come from the job post. Always enforce them.
          if (depot && currentValues.depot !== depot) {
            newValues.depot = depot;
            applicantHasChanges = true;
          }
          if (position && currentValues.position !== position) {
            newValues.position = position;
            applicantHasChanges = true;
          }
          if (department && currentValues.department !== department) {
            newValues.department = department;
            applicantHasChanges = true;
          }
          
          if (applicantHasChanges) {
            updated[appId] = newValues;
            hasChanges = true;
          }
        });
        
        return hasChanges ? updated : prev;
      });
    }
  }, [job?.depot, job?.title, job?.department, job?.raw?.department]);

  const addApplicant = () => {
    const newId = Math.max(0, ...applicants.map((a) => a.id)) + 1;
    setApplicants((prev) => [...prev, { id: newId, name: `Employee ${newId}` }]);
    const newValues = makeEmptyValues();
    // Always fill from job post
    const { depot, position, department } = getJobPrefill();
    if (depot) newValues.depot = depot;
    if (position) newValues.position = position;
    if (department) newValues.department = department;
    setFormValues((prev) => ({ ...prev, [newId]: newValues }));
    // Initialize cities and barangays arrays for the new applicant
    setCities((prev) => ({ ...prev, [newId]: [] }));
    setBarangays((prev) => ({ ...prev, [newId]: [] }));
    setStep(1);
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

  // Vehicles Driven: make "None" mutually exclusive
  const toggleVehicleType = (appId, vehicle) => {
    setFormValues((prev) => {
      const current = prev[appId] || makeEmptyValues();
      const currentArr = Array.isArray(current.vehicleTypes) ? current.vehicleTypes : [];
      const selected = new Set(currentArr);

      const isNone = vehicle === "None";
      if (isNone) {
        // Selecting None clears all others; unselecting None clears it
        if (selected.has("None")) {
          selected.delete("None");
        } else {
          selected.clear();
          selected.add("None");
        }
      } else {
        // Selecting a real vehicle unselects None
        if (selected.has("None")) selected.delete("None");
        if (selected.has(vehicle)) selected.delete(vehicle);
        else selected.add(vehicle);
      }

      return {
        ...prev,
        [appId]: { ...current, vehicleTypes: Array.from(selected) },
      };
    });
  };

  const toggleFlag = (appId, key) => {
    setFormValues((prev) => ({
      ...prev,
      [appId]: { ...(prev[appId] || makeEmptyValues()), [key]: !prev[appId]?.[key] },
    }));
  };

  // Restriction codes are stored as code tokens (e.g., "1", "B2", "C").
  // UI renders the label; CSV can provide either tokens ("1|2") or full labels.
  const restrictionCodesCatalog = [
    { code: "A", label: "A - MOTORCYCLE" },
    { code: "1", label: "1 - MOTORCYLES / MOTORIZED TRICYCLE" },
    { code: "A1", label: "A1 - TRICYLE" },
    { code: "2", label: "2 - VEHICLE UP TO 4500 GVW" },
    { code: "B", label: "B - UP TO 5000 KGS GVW / 8 SEATS" },
    { code: "3", label: "3 - VEHICLE ABOVE 4500 GVW *" },
    { code: "B1", label: "B1 - UP TO 5000 KGS GVW / 9 OR MORE SEATS" },
    { code: "4", label: "4 - AUTOMATIC CLUTCH UP TO 4500 GVW" },
    { code: "B2", label: "B2 - GOODS < 3500 KGS GVW *" },
    { code: "5", label: "5 - AUTOMATIC CLUTCH UP ABOVE 4500 GVW" },
    { code: "C", label: "C - GOODS > 3500 KGS GVW *" },
    { code: "6", label: "6 - ARTICULATED VEHICLE 1600 GVW AND BELOW" },
    { code: "D", label: "D - BUS > 5000 KGS GVW / 9 OR MORE SEATS" },
    { code: "7", label: "7 - ARTICULATED VEHICLE 1601 UP TO 4500 GVW" },
    { code: "BE", label: "BE - TRAILERS < 3500 KGS" },
    { code: "8", label: "8 - ARTICULATED VEHICLE 4501 & ABOVE GVW" },
    { code: "CE", label: "CE - ARTICULATED C > 3500 KGS COMBINED GVW" },
  ];

  const restrictionCodesAllowed = new Set(restrictionCodesCatalog.map((c) => c.code));

  const normalizeRestrictionCodeToken = (value) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    // Accept either a token ("B2") or a full label ("B2 - GOODS ...").
    // Token is the first chunk before whitespace or hyphen.
    const token = raw.split(/[\s-]+/)[0];
    return String(token || "").trim().toUpperCase();
  };

  const parseRestrictionCodes = (raw) => {
    const list = String(raw ?? "").trim();
    if (!list) return [];
    const parts = list.includes("|")
      ? list.split("|")
      : list.includes(";")
        ? list.split(";")
        : list.split(",");

    const normalized = parts
      .map((p) => normalizeRestrictionCodeToken(p))
      .filter(Boolean)
      .filter((code) => restrictionCodesAllowed.has(code));

    // de-dupe while preserving order
    return Array.from(new Set(normalized));
  };

  // CSV Import Functions
  const normalizeCsvContact = (value) => {
    if (value == null) return "";
    let raw = String(value).trim();
    if (!raw) return "";

    // Handle scientific notation from Excel like 9.171234567E+10
    if (/e\+?/i.test(raw)) {
      const n = Number(raw);
      if (Number.isFinite(n)) {
        raw = String(Math.trunc(n));
      }
    }

    // Keep digits only
    let digits = raw.replace(/\D/g, "");

    // Handle +63 / 63 prefix (PH)
    if (digits.startsWith("63") && digits.length === 12) {
      const local = digits.slice(2);
      if (local.length === 10 && local.startsWith("9")) digits = "0" + local;
    }

    // If Excel dropped the leading 0: 10 digits starting with 9
    if (digits.length === 10 && digits.startsWith("9")) digits = "0" + digits;

    // Final trim to 11 (don’t pad beyond fixing the missing 0)
    return digits.slice(0, 11);
  };

  const normalizeCsvDate = (value) => {
    if (value == null) return "";
    const raw = String(value).trim();
    if (!raw) return "";

    // Strip any time portion (e.g. "13/01/2026 00:00:00")
    const rawDateOnly = raw.split(/[T\s]/)[0];

    // Excel serial date (usually ~ 40k-50k in recent years)
    // Accept integer-like or float-like strings (also allow commas).
    const numericRaw = raw.replace(/,/g, "");
    if (/^\d+(\.\d+)?$/.test(numericRaw)) {
      const num = Number(numericRaw);
      if (Number.isFinite(num) && num >= 20000 && num <= 80000) {
        const serial = Math.floor(num);
        // Excel's day 0 is 1899-12-30 (accounts for the 1900 leap-year bug)
        const ms = Date.UTC(1899, 11, 30) + serial * 86400000;
        const d = new Date(ms);
        return d.toISOString().slice(0, 10);
      }
    }

    // ISO date or ISO datetime
    if (/^\d{4}-\d{2}-\d{2}/.test(rawDateOnly)) {
      return rawDateOnly.slice(0, 10);
    }

    // Slash/dash dates from CSV.
    // Support both MM/DD/YYYY and DD/MM/YYYY because Excel exports vary.
    const mdYorDmY = rawDateOnly.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/);
    if (mdYorDmY) {
      const a = parseInt(mdYorDmY[1], 10);
      const b = parseInt(mdYorDmY[2], 10);
      let year = parseInt(mdYorDmY[3], 10);
      if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(year)) return "";
      if (year < 100) year = year >= 70 ? 1900 + year : 2000 + year;

      let month;
      let day;
      if (a > 12 && b <= 12) {
        // D/M
        day = a;
        month = b;
      } else if (b > 12 && a <= 12) {
        // M/D
        month = a;
        day = b;
      } else {
        // Ambiguous (both <= 12): default to M/D (common Excel export)
        month = a;
        day = b;
      }

      if (month < 1 || month > 12 || day < 1 || day > 31) return "";
      const dt = new Date(Date.UTC(year, month - 1, day));
      return dt.toISOString().slice(0, 10);
    }

    // Fallback: try Date parse
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()))
        .toISOString()
        .slice(0, 10);
    }

    return "";
  };

  const splitCsvLine = (line) => {
    const out = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (ch === ',' && !inQuotes) {
        out.push(current);
        current = '';
        continue;
      }
      current += ch;
    }
    out.push(current);
    return out;
  };

  const parseCSV = (text) => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => String(l || '').trim())
      .filter((l) => l && !l.startsWith('#'));
    if (lines.length < 2) return { headers: [], data: [] };

    const headers = splitCsvLine(lines[0])
      .map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
      .map((h, idx) => (idx === 0 ? String(h).replace(/^\uFEFF/, '') : h));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      let values = splitCsvLine(lines[i]).map(v => v.trim().replace(/['"]/g, ''));

      // Skip completely empty rows
      if (!values.some((v) => String(v || '').trim() !== '')) continue;

      // Normalize row length:
      // - If shorter than headers, pad missing cells.
      // - If longer than headers (often due to unquoted commas), merge extras into the last column.
      if (values.length < headers.length) {
        while (values.length < headers.length) values.push('');
      } else if (values.length > headers.length) {
        const head = values.slice(0, Math.max(0, headers.length - 1));
        const tail = values.slice(Math.max(0, headers.length - 1)).join(',');
        values = [...head, tail];
      }

      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] ?? '';
      });
      data.push(row);
    }
    return { headers, data };
  };

  const mapCsvToFormValues = (csvRow, baseValues) => {
    const values = { ...(baseValues || makeEmptyValues()) };

    const toBool = (v) => {
      const s = String(v ?? '').trim().toLowerCase();
      return s === '1' || s === 'true' || s === 'yes' || s === 'y' || s === 'checked';
    };

    const toList = (v) => {
      const s = String(v ?? '').trim();
      if (!s) return [];
      const parts = s.includes('|')
        ? s.split('|')
        : s.includes(';')
          ? s.split(';')
          : s.split(',');
      return parts.map(p => p.trim()).filter(Boolean);
    };
    
    const normalizeHeader = (k) => String(k ?? '').toLowerCase().trim().replace(/['"]/g, '');
    const canonicalizeHeader = (k) => normalizeHeader(k).replace(/[^a-z0-9]+/g, '');

    // Map common CSV column names to form fields (human-friendly headers)
    const fieldMappings = {
      'lastname': 'lastName', 'last_name': 'lastName', 'last name': 'lastName', 'surname': 'lastName',
      'firstname': 'firstName', 'first_name': 'firstName', 'first name': 'firstName', 'given name': 'firstName',
      'middlename': 'middleName', 'middle_name': 'middleName', 'middle name': 'middleName',
      'email': 'email', 'email address': 'email', 'emailaddress': 'email',
      'contact': 'contactNumber', 'contact_number': 'contactNumber', 'contactnumber': 'contactNumber', 
      'phone': 'contactNumber', 'mobile': 'contactNumber', 'phone number': 'contactNumber',
      // position/department/depot are taken from the job post; ignore CSV columns for them.
      'available start date': 'dateAvailable', 'available_start_date': 'dateAvailable', 'dateavailable': 'dateAvailable', 'date_available': 'dateAvailable',
      'employed': 'employed', 'currently employed': 'employed',
      'birthday': 'birthday', 'birthdate': 'birthday', 'birth_date': 'birthday', 'date of birth': 'birthday',
      'sex': 'sex', 'gender': 'sex',
      'marital status': 'maritalStatus', 'marital_status': 'maritalStatus', 'maritalstatus': 'maritalStatus', 'civil status': 'maritalStatus',
      'unit house number': 'unit_house_number', 'unit_house_number': 'unit_house_number', 'unit house no': 'unit_house_number',
      'house number': 'unit_house_number', 'house_no': 'unit_house_number', 'house no': 'unit_house_number',
      'street': 'street', 'street name': 'street', 'street_name': 'street', 'address': 'street',
      'barangay': 'barangay', 'barangay/village': 'barangay', 'village': 'barangay',
      'province': 'province',
      'city': 'city', 'municipality': 'city', 'city/municipality': 'city',
      'zip': 'zip', 'zipcode': 'zip', 'zip_code': 'zip', 'postal': 'zip', 'postal code': 'zip',
      'education': 'education', 'educational attainment': 'education',
      'school': 'tertiarySchool', 'institution': 'tertiarySchool', 'tertiary_school': 'tertiarySchool',
      'course': 'tertiaryProgram', 'program': 'tertiaryProgram', 'tertiary_program': 'tertiaryProgram',
      'year graduated': 'tertiaryYear', 'yeargraduated': 'tertiaryYear', 'tertiary_year': 'tertiaryYear',
      'skills': 'skills',
      'specialized training': 'specializedTraining', 'specialized_training': 'specializedTraining',
      'year completed': 'specializedYear', 'year_completed': 'specializedYear',
      'license classification': 'licenseClassification', 'licenseclassification': 'licenseClassification', 'license_classification': 'licenseClassification',
      'license expiry': 'licenseExpiry', 'licenseexpiry': 'licenseExpiry', 'license_expiry': 'licenseExpiry',
      'restriction codes': 'restrictionCodes', 'restriction_codes': 'restrictionCodes',
      'years driving': 'yearsDriving', 'yearsdriving': 'yearsDriving', 'driving experience': 'yearsDriving', 'years_driving': 'yearsDriving',
      'truck knowledge': 'truckKnowledge', 'truck_knowledge': 'truckKnowledge',
      'vehicles driven': 'vehicleTypes', 'vehicles_driven': 'vehicleTypes', 'vehicle types': 'vehicleTypes',
      'troubleshooting tasks': 'troubleshootingTasks', 'troubleshooting_tasks': 'troubleshootingTasks',
      'taking medications': 'takingMedications', 'taking_medications': 'takingMedications',
      'medication reason': 'medicationReason', 'medication_reason': 'medicationReason',
      'took medical test': 'tookMedicalTest', 'took_medical_test': 'tookMedicalTest',
      'medical test date': 'medicalTestDate', 'medical_test_date': 'medicalTestDate',
      'has sss': 'hasSSS', 'has_sss': 'hasSSS', 'sss': 'hasSSS',
      'has pagibig': 'hasPAGIBIG', 'has_pagibig': 'hasPAGIBIG', 'pagibig': 'hasPAGIBIG',
      'has tin': 'hasTIN', 'has_tin': 'hasTIN', 'tin': 'hasTIN',
      'has philhealth': 'hasPhilHealth', 'has_philhealth': 'hasPhilHealth', 'philhealth': 'hasPhilHealth',
    };

    // Canonical mappings handle header variants like "YearCompleted" or "Specialized Year Completed".
    const canonicalMappings = {
      // Specialized training year
      'specializedyear': 'specializedYear',
      'specializedyearcompleted': 'specializedYear',
      'specializedtrainingyear': 'specializedYear',
      'specializedtrainingyearcompleted': 'specializedYear',
      'yearcompleted': 'specializedYear',
      'completedyear': 'specializedYear',
      'yearofcompletion': 'specializedYear',
      'yearfinished': 'specializedYear',
    };

    const getMappedField = (key) => {
      const normalizedKey = normalizeHeader(key);
      const canonicalKey = canonicalizeHeader(key);
      if (fieldMappings[normalizedKey]) return fieldMappings[normalizedKey];
      if (canonicalMappings[canonicalKey]) return canonicalMappings[canonicalKey];

      // Heuristic fallback for messy headers
      if (canonicalKey.includes('specialized') && canonicalKey.includes('year')) return 'specializedYear';
      if (canonicalKey.includes('specialized') && canonicalKey.includes('training')) return 'specializedTraining';
      return null;
    };

    Object.keys(csvRow).forEach(key => {
      const formField = getMappedField(key);
      if (formField && csvRow[key] != null && String(csvRow[key]).trim() !== '') {
        const raw = csvRow[key];
        if (formField === 'contactNumber') values[formField] = normalizeCsvContact(raw);
        else if (formField === 'zip') values[formField] = sanitizeZip(raw);
        else if (formField === 'tertiaryYear' || formField === 'specializedYear') values[formField] = sanitizeYear(raw);
        else if (formField === 'birthday' || formField === 'dateAvailable' || formField === 'licenseExpiry' || formField === 'medicalTestDate') values[formField] = normalizeCsvDate(raw);
        else if (formField === 'restrictionCodes') values[formField] = parseRestrictionCodes(raw);
        else if (formField === 'vehicleTypes' || formField === 'troubleshootingTasks') values[formField] = toList(raw);
        else if (formField === 'takingMedications' || formField === 'tookMedicalTest' || formField === 'hasSSS' || formField === 'hasPAGIBIG' || formField === 'hasTIN' || formField === 'hasPhilHealth') values[formField] = toBool(raw);
        else if (formField === 'truckKnowledge') values[formField] = String(raw).trim().toLowerCase() === 'yes' ? 'yes' : 'no';
        else if (formField === 'employed') values[formField] = String(raw).trim().toLowerCase() === 'yes' ? 'yes' : 'no';
        else values[formField] = raw;
      }
    });

    // Post-normalize contact if present but still missing the leading zero
    if (values.contactNumber) {
      values.contactNumber = normalizeCsvContact(values.contactNumber);
    }

    // Enforce job post fields (CSV must not override these)
    const { depot, position, department } = getJobPrefill();
    if (depot) values.depot = depot;
    if (position) values.position = position;
    if (department) values.department = department;

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
      
      // Create/reuse applicants from CSV data.
      // Reuse completely blank slots (e.g., initial Employee 1) so import doesn't leave Employee 1 empty.
      const newFormValues = { ...formValues };
      const updatedApplicants = applicants.map((a) => ({ ...a }));
      const blankSlotIds = updatedApplicants
        .map((a) => a.id)
        .filter((id) => isApplicantReusableSlotForCsv(newFormValues[id] || makeEmptyValues()));

      let nextId = Math.max(...updatedApplicants.map((a) => a.id)) + 1;
      let firstImportedId = null;

      data.forEach((row) => {
        const slotIdPreview = blankSlotIds.length ? blankSlotIds[0] : nextId;
        const base = newFormValues[slotIdPreview] || makeEmptyValues();
        const values = mapCsvToFormValues(row, base);
        const displayName = values.firstName && values.lastName
          ? `${values.firstName} ${values.lastName}`
          : null;

        const slotId = blankSlotIds.length ? blankSlotIds.shift() : nextId++;
        newFormValues[slotId] = values;

        const existingIdx = updatedApplicants.findIndex((a) => a.id === slotId);
        const name = displayName || (existingIdx >= 0 ? updatedApplicants[existingIdx].name : `Employee ${slotId}`);
        if (existingIdx >= 0) {
          updatedApplicants[existingIdx] = { ...updatedApplicants[existingIdx], name };
        } else {
          updatedApplicants.push({ id: slotId, name });
        }

        if (firstImportedId == null) firstImportedId = slotId;
      });

      setApplicants(updatedApplicants);
      setFormValues(newFormValues);
      if (firstImportedId != null) {
        setStep(1);
        setActiveApplicant(firstImportedId);
      }
      
      // Close modal and reset
      setShowImportModal(false);
      setCsvFile(null);
      setCsvPreview([]);
      setCsvError('');
      if (csvInputRef.current) csvInputRef.current.value = '';

      // After import, open Summary so the CSV flow can proceed to endorsement.
      // If validation fails, users will see a validation alert.
      setTimeout(() => {
        if (isDeliveryDriverJob) {
          setSuccessMessage(
            `Successfully imported ${data.length} employee(s). Please upload the required License Photocopy for each employee before endorsing.`
          );
          setSuccessNavigatePath(null);
          setShowSuccessAlert(true);
        } else {
          handleOpenSummary();
        }
      }, 0);
    };
    reader.readAsText(csvFile);
  };

  const formatDateForInput = (date) => {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };

  const todayStr = formatDateForInput(new Date());
  const tomorrowStr = formatDateForInput(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const minAge15BirthdayMaxStr = formatDateForInput(
    new Date(new Date().setFullYear(new Date().getFullYear() - 15))
  );

  const getBirthYear = (birthday) => {
    const year = parseInt(String(birthday || "").slice(0, 4), 10);
    return Number.isFinite(year) ? year : null;
  };

  const getAgeFromBirthday = (birthday) => {
    if (!birthday) return null;
    const b = new Date(birthday);
    if (Number.isNaN(b.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - b.getFullYear();
    const m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1;
    return age;
  };

  const sanitizeDigits = (value, maxLen) => String(value ?? "").replace(/\D/g, "").slice(0, maxLen);
  const sanitizeYear = (value) => sanitizeDigits(value, 4);
  const sanitizeZip = (value) => sanitizeDigits(value, 4);
  const sanitizeContact = (value) => sanitizeDigits(value, 11);

  const isValidEmail = (value) => {
    const email = String(value || "").trim();
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateYearAfterBirth = (yearStr, birthYear) => {
    if (!yearStr) return null;
    if (!/^\d{4}$/.test(yearStr)) return "must be 4 digits";
    if (birthYear && parseInt(yearStr, 10) <= birthYear) return `must be after birth year (${birthYear})`;
    return null;
  };

  const showValidationError = (message) => {
    setErrorMessage(message);
    setShowErrorAlert(true);
  };

  const validateStep = (stepNum, applicantId = activeApplicant) => {
    const vals = formValues[applicantId] || makeEmptyValues();
    const errors = [];
    const req = (key, label) => {
      const v = vals[key];
      if (Array.isArray(v)) {
        if (v.length === 0) errors.push(label);
        return;
      }
      if (typeof v === "boolean") {
        // booleans are always answered
        return;
      }
      if (v == null) {
        errors.push(label);
        return;
      }
      if (typeof v === "string" && v.trim() === "") {
        errors.push(label);
        return;
      }
    };

    const birthYear = getBirthYear(vals.birthday);

    if (stepNum === 1) {
      req("department", "Department");
      req("position", "Position");
      req("depot", "Depot Assignment");
      req("dateAvailable", "Available Start Date");
      req("employed", "Currently Employed");

      req("lastName", "Last Name");
      req("firstName", "First Name");
      req("birthday", "Birthday");
      req("maritalStatus", "Marital Status");
      req("sex", "Sex");

      req("street", "Street Address");
      req("province", "Province");
      req("city", "City / Municipality");
      req("barangay", "Barangay");
      req("zip", "ZIP Code");

      req("contactNumber", "Contact Number");
      req("email", "Email Address");

      if (vals.birthday && vals.birthday > todayStr) {
        errors.push("Birthday cannot be in the future");
      }

      const age = getAgeFromBirthday(vals.birthday);
      if (age != null && age < 15) {
        errors.push("Applicant must be at least 15 years old");
      }

      if (vals.dateAvailable && vals.dateAvailable < todayStr) {
        errors.push("Available Start Date cannot be before today");
      }

      const zipStr = String(vals.zip || "").trim();
      if (zipStr && !/^\d{4}$/.test(zipStr)) {
        errors.push("ZIP Code must be exactly 4 digits");
      }

      const contactStr = String(vals.contactNumber || "").trim();
      if (contactStr && !/^09\d{9}$/.test(contactStr)) {
        errors.push("Contact Number must be exactly 11 digits and start with 09");
      }

      if (vals.email && !isValidEmail(vals.email)) {
        errors.push("Email Address must be a valid email format (e.g., name@domain.com)");
      }
    }

    if (stepNum === 2) {
      req("education", "Educational Level");

      const educationIsNA = vals.education === "N/A";
      if (!educationIsNA) {
        req("tertiaryYear", "Year Graduated");
        req("tertiarySchool", "School/Institution Name");
        req("tertiaryProgram", "Course/Program");
      }

      const yearGrad = sanitizeYear(vals.tertiaryYear);
      const yearGradErr = validateYearAfterBirth(yearGrad, birthYear);
      if (yearGrad && yearGradErr) errors.push(`Year Graduated ${yearGradErr}`);

      const specYear = sanitizeYear(vals.specializedYear);
      if (specYear) {
        const specErr = validateYearAfterBirth(specYear, birthYear);
        if (specErr) errors.push(`Year Completed ${specErr}`);
      }
    }

    if (stepNum === 3 && isDeliveryDriverJob) {
      req("licenseClassification", "License Classification");
      req("licenseExpiry", "License Expiry Date");
      req("licenseFile", "License Photocopy");

      if (!Array.isArray(vals.restrictionCodes) || vals.restrictionCodes.length < 1) {
        errors.push("Restriction Codes (select at least 1)");
      }

      if (vals.licenseExpiry && vals.licenseExpiry < tomorrowStr) {
        errors.push("License Expiry Date must be from tomorrow onwards");
      }
    }

    if (stepNum === 4 && isDeliveryDriverJob) {
      req("yearsDriving", "Years of Driving Experience");
      req("truckKnowledge", "Truck Troubleshooting Knowledge");
      req("vehicleTypes", "Vehicles Driven");

      const age = getAgeFromBirthday(vals.birthday);
      const years = vals.yearsDriving === "" ? null : Number(vals.yearsDriving);
      if (years != null && Number.isFinite(years) && age != null && years > age) {
        errors.push(`Years of Driving Experience cannot exceed age (${age})`);
      }
    }

    return errors;
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleNextStepClick = () => {
    const errs = validateStep(step, activeApplicant);
    if (errs.length > 0) {
      showValidationError(`Please complete the required fields before proceeding:\n\n- ${errs.join("\n- ")}`);
      return;
    }
    nextStep();
  };

  const handleOpenSummary = () => {
    // Validate all applicants + all steps before showing summary
    let hasAtLeastOne = false;
    for (const applicant of applicants) {
      const vals = formValues[applicant.id] || makeEmptyValues();
      if (isApplicantBlank(vals)) continue;
      hasAtLeastOne = true;
      for (let s = 1; s <= totalSteps; s++) {
        const errs = validateStep(s, applicant.id);
        if (errs.length > 0) {
          showValidationError(
            `Please complete the required fields for ${applicant.name} before submitting (Step ${s}):\n\n- ${errs.join("\n- ")}`
          );
          return;
        }
      }
    }
    if (!hasAtLeastOne) {
      showValidationError("No employees to endorse. Please add or import at least one employee.");
      return;
    }
    setShowSummaryModal(true);
  };

  const formatSummaryValue = (value) => {
    if (value == null) return "—";
    if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "string") return value.trim() ? value.trim() : "—";
    if (typeof value === "number") return String(value);
    if (typeof value === "object") {
      // Likely File objects
      if (value?.name) return value.name;
      return "—";
    }
    return String(value);
  };

  const stepLabels = isDeliveryDriverJob 
    ? [
        { num: 1, label: 'Personal Info' },
        { num: 2, label: 'Education & Skills' },
        { num: 3, label: 'License Info' },
        { num: 4, label: 'Driving History' },
      ]
    : [
        { num: 1, label: 'Personal Info' },
        { num: 2, label: 'Education & Skills' },
      ];

  // --- Endorse implementation (no blocking auth alert) ---
  const getApplicantDisplayName = (applicantId) => {
    const vals = formValues[applicantId] || makeEmptyValues();
    const fname = vals.firstName?.trim() || "";
    const lname = vals.lastName?.trim() || "";
    const displayName = `${fname} ${lname}`.trim();
    const fallback = applicants.find((a) => a.id === applicantId)?.name;
    return displayName || fallback || `Employee ${applicantId}`;
  };

  const endorseOneApplicant = async (applicantId) => {
    const vals = formValues[applicantId] || makeEmptyValues();
    const fname = vals.firstName?.trim() || "";
    const lname = vals.lastName?.trim() || "";
    const mname = vals.middleName?.trim() || "";
    const email = (vals.email || "").trim().toLowerCase();
    const contact = sanitizeContact(vals.contactNumber || "");
    const position = vals.position || null;
    const depot = vals.depot || null;

    if (!fname || !lname || !email || !contact) {
      throw new Error("Please fill required fields before endorsing: First Name, Last Name, Contact Number, Email.");
    }
    if (!/^09\d{9}$/.test(contact)) {
      throw new Error("Contact Number must be exactly 11 digits and start with 09.");
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

      // Fetch resume from applicant profile if available
      let applicantResumePath = null;
      if (email) {
        try {
          const { data: applicantProfile } = await supabase
            .from('applicants')
            .select('resume_path')
            .ilike('email', email)
            .maybeSingle();
          
          if (applicantProfile?.resume_path) {
            applicantResumePath = applicantProfile.resume_path;
          }
        } catch (e) {
          console.warn("Error fetching applicant resume from profile:", e);
          // Continue without resume
        }
      }

      // Upload resume from this endorsement form (optional). If provided, it overrides profile resume.
      const resumeFile = vals.resumeFile || null;
      if (resumeFile && resumeFile instanceof File) {
        if (!authUserId) {
          console.warn("No auth user id available; skipping resume upload.");
        } else {
          const sanitizedFileName = String(resumeFile.name || "resume.pdf").replace(/\s+/g, "_");
          const filePath = `${authUserId}/${Date.now()}-${sanitizedFileName}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('resume')
            .upload(filePath, resumeFile, {
              upsert: true,
            });

          if (uploadError) {
            throw new Error('Failed to upload resume: ' + uploadError.message);
          }

          applicantResumePath = uploadData?.path || applicantResumePath;
        }
      }

      // Upload specialized training certificate (optional) to application-files.
      // IMPORTANT: never store raw File/Blob objects in the DB payload.
      // Also preserve any pre-existing stored path if present.
      let trainingCertFilePath =
        vals.trainingCertFilePath ||
        vals.training_cert_file_path ||
        vals.trainingCertPath ||
        vals.training_cert_path ||
        vals.specializedTrainingCertFilePath ||
        vals.specialized_training_cert_file_path ||
        null;

      const trainingCertFile = vals.trainingCertFile || null;
      const isUploadableBlob =
        trainingCertFile &&
        typeof trainingCertFile === 'object' &&
        typeof trainingCertFile.size === 'number' &&
        typeof trainingCertFile.type === 'string' &&
        typeof Blob !== 'undefined' &&
        trainingCertFile instanceof Blob;

      if (isUploadableBlob) {
        const fileName = String(trainingCertFile.name || 'training-certificate').replace(/\s+/g, '_');
        const safeEmail = String(email || 'unknown').replace(/[^a-z0-9@._-]/gi, '_');
        const prefix = authUserId || agencyProfileId || 'agency';
        const filePath = `${prefix}/specialized-training/${safeEmail}/${Date.now()}-${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('application-files')
          .upload(filePath, trainingCertFile, {
            upsert: true,
            contentType: trainingCertFile.type || undefined,
          });

        if (uploadError) {
          throw new Error('Failed to upload training certificate: ' + uploadError.message);
        }

        trainingCertFilePath = uploadData?.path || filePath;
      }

      // Include resume in applicant data if available
      // Avoid including raw File objects in DB payload.
      // eslint-disable-next-line no-unused-vars
      const {
        resumeFile: _resumeFile,
        trainingCertFile: _trainingCertFile,
        licenseFile: _licenseFile,
        ...valsNoFileObjects
      } = vals;

      const { depot: jobDepot, position: jobPosition, department: jobDepartment } = getJobPrefill();
      const applicantData = {
        ...valsNoFileObjects,
        contactNumber: contact,
        depot: jobDepot || vals.depot || null,
        position: jobPosition || vals.position || null,
        department: jobDepartment || vals.department || null,
        ...(applicantResumePath && { resumePath: applicantResumePath }),
        ...(trainingCertFilePath && { trainingCertFilePath }),
      };

      // prepare payload
      const payload = {
        applicant: applicantData,
        ...(trainingCertFilePath && { trainingCertFilePath }),
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
      // Check if email already exists in employees table
      if (email) {
        try {
          const { data: existingEmployee, error: empCheckErr } = await supabase
            .from("employees")
            .select("id, email, fname, lname, status")
            .eq("email", email)
            .maybeSingle();

          if (empCheckErr && empCheckErr.code !== 'PGRST116') {
            console.warn("Employee check error:", empCheckErr);
          } else if (existingEmployee) {
            throw new Error(
              `Cannot endorse: The email "${email}" already exists in the system as an employee (${existingEmployee.fname || ''} ${existingEmployee.lname || ''}). ` +
                `Employees cannot be endorsed as new applicants.`
            );
          }
        } catch (e) {
          console.warn("Error checking employees table:", e);
          // Continue with other checks
        }
      }

      // Check applications for same job + applicant email
      let existingApp = null;
      if (jobIdToSend && email) {
        try {
          // Get all applications for this job and check payload manually
          const { data: allApps, error: errAppCheck } = await supabase
            .from("applications")
            .select("id, created_at, endorsed, status, payload, job_posts:job_posts(title, depot)")
            .eq("job_id", jobIdToSend);

          if (errAppCheck) {
            console.warn("applications pre-check warning:", errAppCheck);
            // continue anyway
          } else if (allApps && allApps.length > 0) {
            // Check payload for matching email
            for (const app of allApps) {
              let payloadObj = app.payload;
              if (typeof payloadObj === 'string') {
                try { payloadObj = JSON.parse(payloadObj); } catch { continue; }
              }
              const appEmail = payloadObj?.applicant?.email || payloadObj?.form?.email || '';
              if (appEmail && appEmail.toLowerCase().trim() === email.toLowerCase().trim()) {
                existingApp = app;
                break;
              }
            }

            if (existingApp) {
              // If already endorsed, show informative message
              if (existingApp.endorsed) {
                const jobTitle = existingApp.job_posts?.title || 'this position';
                throw new Error(
                  `Cannot endorse: This applicant (${email}) has already been endorsed for ${jobTitle}. ` +
                    `Please check your endorsements list or choose a different job posting.`
                );
              }
              // If exists but not endorsed, we can still try to update it
            }
          }
        } catch (e) {
          console.warn("Error checking for existing applications:", e);
          // Continue with insert
        }
      }

      // Check if email exists in applications for other jobs (to provide better error message)
      if (email && !existingApp) {
        try {
          const { data: otherApps, error: otherAppsErr } = await supabase
            .from("applications")
            .select("id, job_id, status, endorsed, payload, job_posts:job_posts(title, depot)")
            .neq("status", "hired")
            .neq("status", "rejected");

          if (!otherAppsErr && otherApps && otherApps.length > 0) {
            for (const app of otherApps) {
              let payloadObj = app.payload;
              if (typeof payloadObj === 'string') {
                try { payloadObj = JSON.parse(payloadObj); } catch { continue; }
              }
              const appEmail = payloadObj?.applicant?.email || payloadObj?.form?.email || '';
              if (appEmail && appEmail.toLowerCase().trim() === email.toLowerCase().trim()) {
                const jobTitle = app.job_posts?.title || 'another position';
                const status = app.status || 'unknown';
                throw new Error(
                  `Cannot endorse: This email "${email}" already has an active application for ${jobTitle} (Status: ${status}). ` +
                    `Please wait for that application to be processed or use a different email address.`
                );
              }
            }
          }
        } catch (e) {
          console.warn("Error checking other applications:", e);
          // Continue with insert attempt
        }
      }

      // ---------- INSERT or UPDATE: directly into applications table with endorsed=true ----------
      let insertSuccess = false;
      
      if (existingApp && existingApp.id) {
        // Update existing application to mark as endorsed
        const { error: errAppUpdate } = await supabase
          .from("applications")
          .update({
            payload,
            endorsed: true,
            status: "submitted",
          })
          .eq("id", existingApp.id);

        if (errAppUpdate) {
          console.error("Failed to update application:", errAppUpdate);
          // If update fails, try insert instead
        } else {
          insertSuccess = true;
          // Create notifications for HR users
          if (existingApp && existingApp.id) {
            try {
              const { data: hrUsers, error: hrError } = await supabase
                .from('profiles')
                .select('id, role, depot')
                .in('role', ['HR', 'HRC']);

              if (!hrError && hrUsers && hrUsers.length > 0) {
                const applicantName = `${fname} ${lname}`.trim() || 'Unknown Applicant';
                const positionTitle = position || job?.title || 'Unknown Position';
                
                // Get job depot
                const { data: jobData } = await supabase
                  .from('job_posts')
                  .select('depot')
                  .eq('id', jobIdToSend)
                  .maybeSingle();
                
                const jobDepot = jobData?.depot;

                // Create notification for each HR user (filter by depot for HRC)
                for (const hrUser of hrUsers) {
                  // Skip if HRC and depot doesn't match
                  if (hrUser.role === 'HRC' && hrUser.depot && hrUser.depot !== jobDepot) {
                    continue;
                  }

                  await createNotification({
                    userId: hrUser.id,
                    applicationId: existingApp.id,
                    type: 'application',
                    title: 'New Agency Endorsement',
                    message: `${applicantName} was endorsed by agency for ${positionTitle}`,
                    userType: 'profile'
                  });
                }
              }
            } catch (notifError) {
              console.error('Error creating HR notifications:', notifError);
              // Don't fail the endorsement if notification fails
            }
          }
        }
      }

      // If no existing app or update failed, try insert
      if (!insertSuccess) {
        const { data: insertedData, error: errAppInsert } = await supabase
          .from("applications")
          .insert([
            {
              job_id: jobIdToSend,
              payload,
              status: "submitted",
              endorsed: true, // Mark as endorsed by agency
            },
          ])
          .select("id");

        if (errAppInsert) {
          // Check for specific error codes
          const errorCode = errAppInsert.code || errAppInsert.status;
          const errorMessage = errAppInsert.message || String(errAppInsert);
          
          // Check if it's a duplicate/conflict error
          if (errorCode === '23505' || errorCode === 'PGRST116' || errorCode === 409 || errorCode === 'PGRST204') {
            // Try to verify if the application was actually created by checking all apps for this job
            try {
              const { data: allApps } = await supabase
                .from("applications")
                .select("id, endorsed, status, payload, job_posts:job_posts(title)")
                .eq("job_id", jobIdToSend);

              if (allApps && allApps.length > 0) {
                // Check payload for matching email and endorsed status
                for (const app of allApps) {
                  let payloadObj = app.payload;
                  if (typeof payloadObj === 'string') {
                    try { payloadObj = JSON.parse(payloadObj); } catch { continue; }
                  }
                  const appEmail = payloadObj?.applicant?.email || payloadObj?.form?.email || '';
                  if (appEmail && appEmail.toLowerCase().trim() === email.toLowerCase().trim()) {
                    if (app.endorsed) {
                      // Application exists and is endorsed - show error instead of success
                      const jobTitle = app.job_posts?.title || 'this position';
                      throw new Error(
                        `Cannot endorse: This applicant (${email}) has already been endorsed for ${jobTitle}. ` +
                          `Please check your endorsements list.`
                      );
                    } else {
                      // Application exists but not endorsed - treat as success (will be updated)
                      insertSuccess = true;
                      break;
                    }
                  }
                }
              }

              if (!insertSuccess) {
                console.error("Failed to create application (conflict, but not found):", errAppInsert);
                throw new Error(
                  `Failed to create endorsement: Duplicate entry detected. ` +
                    `The email "${email}" may already exist in the system. ` +
                    `Please check if this applicant has already been endorsed or exists as an employee.`
                );
              }
            } catch (verifyErr) {
              console.error("Error verifying application after conflict:", verifyErr);
              throw new Error(
                `Failed to create endorsement: Database conflict detected. ` +
                  `The email "${email}" may already exist. ` +
                  `Please verify the applicant doesn't already exist in the system.`
              );
            }
          } else if (errorMessage.includes('duplicate') || errorMessage.includes('already exists') || errorMessage.includes('unique constraint')) {
            // Generic duplicate error
            throw new Error(
              `Cannot endorse: The email "${email}" already exists in the system. ` +
                `Please use a different email address or check if this applicant has already been endorsed.`
            );
          } else {
            // Other database errors
            console.error("Failed to create application:", errAppInsert);
            throw new Error(
              `Failed to create endorsement: ${errorMessage}. ` +
                `Please check the information and try again. If the problem persists, contact support.`
            );
          }
        } else {
          insertSuccess = true;
          // Create notifications for HR users
          if (insertedData && insertedData[0]) {
            try {
              const { data: hrUsers, error: hrError } = await supabase
                .from('profiles')
                .select('id, role, depot')
                .in('role', ['HR', 'HRC']);

              if (!hrError && hrUsers && hrUsers.length > 0) {
                const applicantName = `${fname} ${lname}`.trim() || 'Unknown Applicant';
                const positionTitle = position || job?.title || 'Unknown Position';
                
                // Get job depot
                const { data: jobData } = await supabase
                  .from('job_posts')
                  .select('depot')
                  .eq('id', jobIdToSend)
                  .maybeSingle();
                
                const jobDepot = jobData?.depot;

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
                    title: 'New Agency Endorsement',
                    message: `${applicantName} was endorsed by agency for ${positionTitle}`,
                    userType: 'profile'
                  });
                }
              }
            } catch (notifError) {
              console.error('Error creating HR notifications:', notifError);
              // Don't fail the endorsement if notification fails
            }
          }
        }
      }

      // Success: application created or updated with endorsed=true
      if (insertSuccess) return true;
      throw new Error("Failed to create endorsement. Please try again.");
    } catch (err) {
      console.error("unexpected endorse error:", err);
      throw err instanceof Error ? err : new Error("An unexpected error occurred. Check console.");
    }
  };

  const handleEndorseAll = async () => {
    const results = [];
    let attempted = 0;
    for (const applicant of applicants) {
      const vals = formValues[applicant.id] || makeEmptyValues();
      if (isApplicantBlank(vals)) continue;
      attempted += 1;
      try {
        await endorseOneApplicant(applicant.id);
        results.push({ applicantId: applicant.id, ok: true });
      } catch (e) {
        results.push({
          applicantId: applicant.id,
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    if (attempted === 0) {
      setErrorMessage("No employees to endorse. Please add or import at least one employee.");
      setShowErrorAlert(true);
      return;
    }

    const failed = results.filter((r) => !r.ok);
    const succeeded = results.filter((r) => r.ok);

    if (failed.length > 0) {
      const lines = failed
        .map((r) => `- ${getApplicantDisplayName(r.applicantId)}: ${r.error || "Failed"}`)
        .join("\n");
      const okLine = succeeded.length
        ? `\n\nSucceeded (${succeeded.length}):\n${succeeded
            .map((r) => `- ${getApplicantDisplayName(r.applicantId)}`)
            .join("\n")}`
        : "";

      setErrorMessage(`Some endorsements could not be submitted:\n\n${lines}${okLine}`);
      setShowErrorAlert(true);
      return;
    }

    setSuccessMessage(`Successfully endorsed ${succeeded.length} employee(s). ✅`);
    setSuccessNavigatePath("/agency/endorsements");
    setShowSuccessAlert(true);
  };


  const fv = formValues[activeApplicant] || makeEmptyValues();

  const troubleshootingTasksList = [
    "Replacing lights or bulbs for the headlights, brake lights, etc.",
    "Adding brake fluid.",
    "Adding engine oil.",
    "Adding power steering fluid.",
    "Adjusting the engine belt.",
    "Replacing the tire.",
  ];

  const vehicleTypesList = ["Sedan or Car", "Van", "L300", "Hino / Canter (4 wheels - 6 wheels)", "10 Wheeler", "None"];

  return (
    <div>
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

      {/* Header (hidden because AgencyLayout provides the main header) */}
      <div className="bg-white shadow-sm sticky top-0 z-50 hidden">
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
                    {(() => {
                      const v = formValues[applicant.id] || makeEmptyValues();
                      const f = (v.firstName || "").trim();
                      const l = (v.lastName || "").trim();
                      return f && l ? `${f} ${l}` : applicant.name;
                    })()}
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
                      <input
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-100 cursor-not-allowed"
                        value={fv.department || ""}
                        disabled
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Position</label>
                      <input
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-100 cursor-not-allowed"
                        value={fv.position || ""}
                        disabled
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Depot Assignment</label>
                      <input
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-100 cursor-not-allowed"
                        value={fv.depot || ""}
                        disabled
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Available Start Date <span className="text-[#800000]">*</span></label>
                      <input type="date" min={todayStr} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" value={fv.dateAvailable || ""} onChange={(e) => handleChange(activeApplicant, "dateAvailable", e.target.value)} />
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
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Birthday <span className="text-[#800000]">*</span></label>
                      <input type="date" max={minAge15BirthdayMaxStr} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" value={fv.birthday} onChange={(e) => handleChange(activeApplicant, "birthday", e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Marital Status <span className="text-[#800000]">*</span></label>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Number <span className="text-[#800000]">*</span></label>
                      <input
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
                        placeholder="e.g. 09XXXXXXXXX"
                        value={fv.contactNumber}
                        onChange={(e) => handleChange(activeApplicant, "contactNumber", sanitizeContact(e.target.value))}
                        inputMode="numeric"
                        pattern="\d*"
                        maxLength={11}
                      />
                      <p className="text-xs text-gray-500 mt-2">Must be 11 digits and start with <span className="font-mono">09</span>.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address <span className="text-[#800000]">*</span></label>
                      <input
                        type="email"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
                        placeholder="e.g. employee@email.com"
                        value={fv.email}
                        onChange={(e) => handleChange(activeApplicant, "email", e.target.value)}
                      />
                    </div>
                  </div>

              {/* Address */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-visible">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <h2 className="text-base font-semibold text-gray-800">Address</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Unit/House Number, Street Name, Subdivision/Village <span className="text-[#800000]">*</span>
                            </label>
                            <input
                              type="text"
                              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
                              placeholder="e.g., Unit 123 Main Street"
                              value={[fv.unit_house_number, fv.street].filter(Boolean).join(' ') || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                handleChange(activeApplicant, "street", value);
                                handleChange(activeApplicant, "unit_house_number", "");
                              }}
                            />
                    </div>
                            <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                              Province <span className="text-[#800000]">*</span>
                      </label>
                      <AutocompleteInput
                        value={fv.province || ''}
                        onChange={(value) => {
                          const oldProvince = fv.province;
                          handleChange(activeApplicant, "province", value);
                          // Clear city and barangay when province changes
                          if (oldProvince !== value) {
                            handleChange(activeApplicant, "city", "");
                            handleChange(activeApplicant, "barangay", "");
                          }
                        }}
                        options={Array.isArray(provinces) ? provinces : []}
                        placeholder="Select or type to search province"
                        loading={loadingProvinces}
                        listId={`endorse-province-list-${activeApplicant}`}
                        onSelect={(option) => {
                          if (option && option.name) {
                            handleChange(activeApplicant, "province", option.name);
                            handleChange(activeApplicant, "city", "");
                            handleChange(activeApplicant, "barangay", "");
                          }
                        }}
                      />
                    </div>
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        City / Municipality <span className="text-[#800000]">*</span>
                      </label>
                      <AutocompleteInput
                        value={fv.city || ''}
                        onChange={(value) => {
                          handleChange(activeApplicant, "city", value);
                          // Clear barangay when city changes
                          if (fv.city !== value) {
                            handleChange(activeApplicant, "barangay", "");
                          }
                        }}
                        options={Array.isArray(cities[activeApplicant]) ? cities[activeApplicant] : []}
                        placeholder={fv.province ? "Select or type to search city" : "Select province first"}
                        disabled={!fv.province}
                        loading={loadingCities[activeApplicant] || false}
                        listId={`endorse-city-list-${activeApplicant}`}
                        helperText={!fv.province ? "Please select a province first" : cities[activeApplicant]?.length > 0 ? `${cities[activeApplicant].length} cities available` : "Loading cities..."}
                        onSelect={(option) => {
                          if (option && option.name) {
                            handleChange(activeApplicant, "city", option.name);
                            handleChange(activeApplicant, "barangay", "");
                          }
                        }}
                      />
                    </div>
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Barangay <span className="text-[#800000]">*</span>
                      </label>
                      <AutocompleteInput
                        value={fv.barangay || ''}
                        onChange={(value) => handleChange(activeApplicant, "barangay", value)}
                        options={Array.isArray(barangays[activeApplicant]) ? barangays[activeApplicant] : []}
                        placeholder={fv.city ? "Select or type to search barangay" : "Select city first"}
                        disabled={!fv.city}
                        loading={loadingBarangays[activeApplicant] || false}
                        listId={`endorse-barangay-list-${activeApplicant}`}
                        helperText={!fv.city ? "Please select a city first" : ""}
                        onSelect={(option) => {
                          if (option && option.name) {
                            handleChange(activeApplicant, "barangay", option.name);
                          }
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">ZIP Code <span className="text-[#800000]">*</span></label>
                      <input
                        type="text"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
                        placeholder="e.g. 1600"
                        value={fv.zip || ''}
                        onChange={(e) => handleChange(activeApplicant, "zip", sanitizeZip(e.target.value))}
                        inputMode="numeric"
                        pattern="\d*"
                        maxLength={4}
                      />
                    </div>
                  </div>
            </div>
          </div>

              {/* Resume & Government IDs (Optional) */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <h2 className="text-base font-semibold text-gray-800">Additional Information</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Optional fields</p>
                </div>
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Resume (Optional)</label>
                    <input
                      ref={resumeInputRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        handleChange(activeApplicant, "resumeFile", file);
                      }}
                    />

                    {!fv.resumeFile ? (
                      <button
                        type="button"
                        onClick={() => resumeInputRef.current?.click()}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="min-w-0 text-left">
                            <div className="text-sm font-medium text-gray-800">Upload PDF resume</div>
                            <div className="text-xs text-gray-500 truncate">No file selected — will use profile resume if available</div>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-[#800000]">Browse</span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate max-w-[18rem]">{fv.resumeFile.name}</p>
                            <p className="text-xs text-gray-500">{(fv.resumeFile.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            handleChange(activeApplicant, "resumeFile", null);
                            if (resumeInputRef.current) resumeInputRef.current.value = '';
                          }}
                          className="p-1.5 text-gray-400 hover:text-[#800000] hover:bg-[#800000]/10 rounded-lg transition-colors"
                          title="Remove file"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}

                    <p className="text-xs text-gray-500 mt-1">PDF only. Uploading here overrides the applicant’s profile resume for this endorsement.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Government IDs (Optional)
                      <span className="text-xs font-normal text-gray-400 ml-2">(Check all that apply)</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!fv.hasSSS}
                          onChange={(e) => handleChange(activeApplicant, "hasSSS", e.target.checked)}
                          className="accent-[#800000]"
                        />
                        <span className="text-sm">SSS</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!fv.hasPAGIBIG}
                          onChange={(e) => handleChange(activeApplicant, "hasPAGIBIG", e.target.checked)}
                          className="accent-[#800000]"
                        />
                        <span className="text-sm">PAGIBIG</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!fv.hasTIN}
                          onChange={(e) => handleChange(activeApplicant, "hasTIN", e.target.checked)}
                          className="accent-[#800000]"
                        />
                        <span className="text-sm">TIN</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!fv.hasPhilHealth}
                          onChange={(e) => handleChange(activeApplicant, "hasPhilHealth", e.target.checked)}
                          className="accent-[#800000]"
                        />
                        <span className="text-sm">PhilHealth</span>
                      </label>
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
                  <div className="mb-2">
                    <p className="text-sm text-gray-600 italic">If not applicable, select N/A</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Educational Level <span className="text-[#800000]">*</span></label>
                      <select 
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" 
                        value={fv.education || ""} 
                        onChange={(e) => {
                          const selectedValue = e.target.value;
                          handleChange(activeApplicant, "education", selectedValue);
                          // Clear related fields when N/A is selected
                          if (selectedValue === "N/A") {
                            handleChange(activeApplicant, "tertiaryYear", "");
                            handleChange(activeApplicant, "tertiarySchool", "");
                            handleChange(activeApplicant, "tertiaryProgram", "");
                          }
                        }}
                      >
                        <option value="">Select highest education</option>
                        <option value="N/A">N/A</option>
                        <option value="Elementary">Elementary</option>
                        <option value="Junior High School">Junior High School</option>
                        <option value="Senior High School">Senior High School</option>
                        <option value="Vocational">Vocational/Technical Course</option>
                        <option value="College">College</option>
                        <option value="Post Graduate">Post Graduate (Masters/Doctorate)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Year Graduated <span className="text-[#800000]">*</span></label>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        pattern="\d*"
                        maxLength={4}
                        className={`w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] ${
                          fv.education === "N/A" ? "bg-gray-100 cursor-not-allowed" : ""
                        }`}
                        placeholder="e.g. 2020" 
                        value={fv.tertiaryYear || ""} 
                        onChange={(e) => handleChange(activeApplicant, "tertiaryYear", sanitizeYear(e.target.value))}
                        disabled={fv.education === "N/A"}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">School/Institution Name <span className="text-[#800000]">*</span></label>
                      <input 
                        className={`w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] ${
                          fv.education === "N/A" ? "bg-gray-100 cursor-not-allowed" : ""
                        }`}
                        placeholder="Enter school name" 
                        value={fv.tertiarySchool || ""} 
                        onChange={(e) => handleChange(activeApplicant, "tertiarySchool", e.target.value)}
                        disabled={fv.education === "N/A"}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Course/Program <span className="text-[#800000]">*</span></label>
                      <input 
                        className={`w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] ${
                          fv.education === "N/A" ? "bg-gray-100 cursor-not-allowed" : ""
                        }`}
                        placeholder="e.g. BS Mechanical Engineering" 
                        value={fv.tertiaryProgram || ""} 
                        onChange={(e) => handleChange(activeApplicant, "tertiaryProgram", e.target.value)}
                        disabled={fv.education === "N/A"}
                      />
                    </div>
                  </div>
                </div>
            </div>

              {/* Skills & Proficiency */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100" style={{ overflowX: 'hidden', overflowY: 'visible' }}>
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <h2 className="text-base font-semibold text-gray-800">Skills & Proficiency</h2>
                </div>
                <div className="p-6" style={{ overflow: 'visible' }}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Areas of Expertise</label>
                  {(() => {
                    // Helper function to normalize skills (string or array to array)
                    const normalizeSkills = (skills) => {
                      if (Array.isArray(skills)) {
                        return skills.filter(s => s && s.trim() !== '');
                      }
                      if (typeof skills === 'string' && skills.trim() !== '') {
                        return skills.split(',').map(s => s.trim()).filter(Boolean);
                      }
                      return [];
                    };

                    // Convert skills string to array for SkillsInput
                    const skillsArray = normalizeSkills(fv.skills);

                    return (
                      <div className="relative" style={{ zIndex: 50 }}>
                        <SkillsInput
                          skills={skillsArray}
                          onChange={(skillsArray) => {
                            // Convert array back to comma-separated string
                            handleChange(activeApplicant, "skills", skillsArray.join(', '));
                          }}
                        />
                      </div>
                    );
                  })()}
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
                      <input type="text" inputMode="numeric" pattern="\d*" maxLength={4} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" placeholder="e.g. 2023" value={fv.specializedYear || ""} onChange={(e) => handleChange(activeApplicant, "specializedYear", sanitizeYear(e.target.value))} />
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
      {step === 3 && isDeliveryDriverJob && (
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
                      <input type="date" min={tomorrowStr} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" value={fv.licenseExpiry || ""} onChange={(e) => handleChange(activeApplicant, "licenseExpiry", e.target.value)} />
                    </div>
          </div>

                  {/* License Photocopy Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      License Photocopy <span className="text-[#800000]">*</span> <span className="text-gray-400 font-normal">(Front & Back)</span>
                    </label>
                    <div className="mb-2">
                      <a
                        href="/samples/sample-front-and-back-license.pdf"
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View sample format in PDF
                      </a>
                      <span className="text-xs text-gray-400 ml-2">(opens in a new tab)</span>
                    </div>
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
              {restrictionCodesCatalog.map((item) => (
                        <label 
                          key={item.code} 
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            fv.restrictionCodes.includes(item.code) 
                              ? 'border-[#800000] bg-[#800000]/10' 
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 accent-[#800000] rounded" 
                            checked={fv.restrictionCodes.includes(item.code)} 
                            onChange={() => toggleArrayValue(activeApplicant, "restrictionCodes", item.code)} 
                          />
                          <span className={`text-sm ${fv.restrictionCodes.includes(item.code) ? 'text-[#800000] font-medium' : 'text-gray-700'}`}>{item.label}</span>
                </label>
              ))}
                    </div>
                  </div>
            </div>
          </div>
        </div>
      )}

          {/* Step 4: Driving History */}
      {step === 4 && isDeliveryDriverJob && (
        <div className="space-y-6">
              {/* Driving Experience */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <h2 className="text-base font-semibold text-gray-800">Driving Experience</h2>
              </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Years of Driving Experience <span className="text-[#800000]">*</span></label>
                      <input 
                        type="number" 
                        min={0}
                        max={getAgeFromBirthday(fv.birthday) ?? undefined}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]" 
                        placeholder={getAgeFromBirthday(fv.birthday) != null ? `0 - ${getAgeFromBirthday(fv.birthday)}` : "e.g. 5"}
                        value={fv.yearsDriving || ""} 
                        onChange={(e) => {
                          const age = getAgeFromBirthday(fv.birthday);
                          const raw = e.target.value;
                          if (raw === "") {
                            handleChange(activeApplicant, "yearsDriving", "");
                            return;
                          }
                          let next = Number(raw);
                          if (!Number.isFinite(next)) return;
                          if (next < 0) next = 0;
                          if (age != null && next > age) next = age;
                          handleChange(activeApplicant, "yearsDriving", String(next));
                        }} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Has basic truck troubleshooting knowledge? <span className="text-[#800000]">*</span></label>
                      <div className="flex gap-3">
                        <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all flex-1 justify-center ${fv.truckKnowledge === "yes" ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <input type="radio" name={`truckKnowledge-${activeApplicant}`} className="accent-green-600" checked={fv.truckKnowledge === "yes"} onChange={() => handleChange(activeApplicant, "truckKnowledge", "yes")} /> Yes
                        </label>
                        <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all flex-1 justify-center ${fv.truckKnowledge !== "yes" ? 'border-[#800000] bg-[#800000]/10 text-[#800000]' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <input type="radio" name={`truckKnowledge-${activeApplicant}`} className="accent-[#800000]" checked={fv.truckKnowledge !== "yes"} onChange={() => { handleChange(activeApplicant, "truckKnowledge", "no"); handleChange(activeApplicant, "troubleshootingTasks", []); }} /> No
                        </label>
                      </div>
                    </div>
                  </div>
            </div>
          </div>

              {/* Troubleshooting Tasks (only if Yes) */}
              {fv.truckKnowledge === "yes" && (
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
              )}

              {/* Vehicle Types */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <h2 className="text-base font-semibold text-gray-800">Vehicles Driven</h2>
                </div>
                <div className="p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">What types of vehicles has the employee driven? <span className="text-[#800000]">*</span></label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {vehicleTypesList.map((vehicle) => (
                      (() => {
                        const noneSelected = Array.isArray(fv.vehicleTypes) && fv.vehicleTypes.includes('None');
                        const disabled = noneSelected && vehicle !== 'None';
                        return (
                      <label 
                        key={vehicle} 
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                          disabled
                            ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                            : fv.vehicleTypes.includes(vehicle)
                              ? 'border-green-500 bg-green-50 cursor-pointer'
                              : 'border-gray-200 hover:bg-gray-50 cursor-pointer'
                        }`}
                      >
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 accent-green-600 rounded" 
                          checked={fv.vehicleTypes.includes(vehicle)} 
                          disabled={disabled}
                          onChange={() => toggleVehicleType(activeApplicant, vehicle)} 
                        />
                        <span className={`text-sm ${fv.vehicleTypes.includes(vehicle) ? 'text-green-700 font-medium' : 'text-gray-700'}`}>{vehicle}</span>
                </label>
                        );
                      })()
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
                  onClick={handleNextStepClick} 
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#800000] text-white rounded-lg font-medium hover:bg-[#990000] transition-colors"
                >
                  Next Step
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button 
                  onClick={handleOpenSummary} 
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

      {/* Summary Modal (Review before Terms) */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#800000]/10 to-orange-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#800000]/20 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h6a2 2 0 012 2v14l-5-3-5 3V7a2 2 0 012-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Review Summary</h3>
                    <p className="text-sm text-gray-500">Check details before confirming endorsement</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {applicants.map((a) => {
                const v = formValues[a.id] || makeEmptyValues();
                const showMedicalSection = isDeliveryDriverJob;
                const hasTrainingData = !!(
                  String(v.specializedTraining || '').trim() ||
                  String(v.specializedYear || '').trim() ||
                  v.trainingCertFile
                );

                return (
                  <div key={a.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                      <div className="font-semibold text-gray-800">{a.name}</div>
                      {a.id === activeApplicant && (
                        <span className="text-xs px-2 py-1 rounded-full bg-[#800000]/10 text-[#800000]">Active</span>
                      )}
                    </div>
                    <div className="p-5 space-y-5">
                      <div>
                        <div className="text-sm font-semibold text-gray-700 mb-2">Employment</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div><span className="text-gray-500">Department:</span> {formatSummaryValue(v.department)}</div>
                          <div><span className="text-gray-500">Position:</span> {formatSummaryValue(v.position)}</div>
                          <div><span className="text-gray-500">Depot:</span> {formatSummaryValue(v.depot)}</div>
                          <div><span className="text-gray-500">Available Start Date:</span> {formatSummaryValue(v.dateAvailable)}</div>
                          <div><span className="text-gray-500">Currently Employed:</span> {formatSummaryValue(v.employed)}</div>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-gray-700 mb-2">Personal</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div><span className="text-gray-500">Name:</span> {formatSummaryValue(`${(v.firstName || '').trim()} ${(v.middleName || '').trim()} ${(v.lastName || '').trim()}`)}</div>
                          <div><span className="text-gray-500">Birthday:</span> {formatSummaryValue(v.birthday)}</div>
                          <div><span className="text-gray-500">Marital Status:</span> {formatSummaryValue(v.maritalStatus)}</div>
                          <div><span className="text-gray-500">Sex:</span> {formatSummaryValue(v.sex)}</div>
                          <div><span className="text-gray-500">Contact Number:</span> {formatSummaryValue(v.contactNumber)}</div>
                          <div><span className="text-gray-500">Email:</span> {formatSummaryValue(v.email)}</div>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-gray-700 mb-2">Documents & IDs</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">Resume:</span>{" "}
                            {v.resumeFile?.name ? (
                              <span>{formatSummaryValue(v.resumeFile)}</span>
                            ) : (
                              <span className="text-gray-400 italic">Will use profile resume if available</span>
                            )}
                          </div>
                          <div className="md:col-span-2">
                            <span className="text-gray-500">Government IDs:</span>{" "}
                            {(() => {
                              const ids = [
                                v.hasSSS ? 'SSS' : null,
                                v.hasPAGIBIG ? 'PAGIBIG' : null,
                                v.hasTIN ? 'TIN' : null,
                                v.hasPhilHealth ? 'PhilHealth' : null,
                              ].filter(Boolean);
                              return ids.length ? ids.join(', ') : '—';
                            })()}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-gray-700 mb-2">Address</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div className="md:col-span-2"><span className="text-gray-500">Street Address:</span> {formatSummaryValue(v.street)}</div>
                          <div><span className="text-gray-500">Barangay:</span> {formatSummaryValue(v.barangay)}</div>
                          <div><span className="text-gray-500">City/Municipality:</span> {formatSummaryValue(v.city)}</div>
                          <div><span className="text-gray-500">Province:</span> {formatSummaryValue(v.province)}</div>
                          <div><span className="text-gray-500">ZIP:</span> {formatSummaryValue(v.zip)}</div>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-gray-700 mb-2">Education & Skills</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div><span className="text-gray-500">Education:</span> {formatSummaryValue(v.education)}</div>
                          <div><span className="text-gray-500">Year Graduated:</span> {formatSummaryValue(v.tertiaryYear)}</div>
                          <div><span className="text-gray-500">School:</span> {formatSummaryValue(v.tertiarySchool)}</div>
                          <div><span className="text-gray-500">Course/Program:</span> {formatSummaryValue(v.tertiaryProgram)}</div>
                          <div className="md:col-span-2"><span className="text-gray-500">Skills:</span> {formatSummaryValue(v.skills)}</div>
                          {hasTrainingData ? (
                            <>
                              <div><span className="text-gray-500">Specialized Training:</span> {formatSummaryValue(v.specializedTraining)}</div>
                              <div><span className="text-gray-500">Year Completed:</span> {formatSummaryValue(v.specializedYear)}</div>
                              {v.trainingCertFile ? (
                                <div className="md:col-span-2"><span className="text-gray-500">Training Certificate:</span> {formatSummaryValue(v.trainingCertFile)}</div>
                              ) : null}
                            </>
                          ) : null}
                        </div>
                      </div>

                      {isDeliveryDriverJob && (
                        <div>
                          <div className="text-sm font-semibold text-gray-700 mb-2">Driver Information</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div><span className="text-gray-500">License Classification:</span> {formatSummaryValue(v.licenseClassification)}</div>
                            <div><span className="text-gray-500">License Expiry:</span> {formatSummaryValue(v.licenseExpiry)}</div>
                            <div className="md:col-span-2"><span className="text-gray-500">License Photocopy:</span> {formatSummaryValue(v.licenseFile)}</div>
                            <div><span className="text-gray-500">Restriction Codes:</span> {formatSummaryValue(v.restrictionCodes)}</div>
                            <div><span className="text-gray-500">Years Driving:</span> {formatSummaryValue(v.yearsDriving)}</div>
                            <div><span className="text-gray-500">Truck Knowledge:</span> {formatSummaryValue(v.truckKnowledge)}</div>
                            <div><span className="text-gray-500">Vehicles Driven:</span> {formatSummaryValue(v.vehicleTypes)}</div>
                            <div className="md:col-span-2"><span className="text-gray-500">Troubleshooting Tasks:</span> {formatSummaryValue(v.troubleshootingTasks)}</div>
                          </div>
                        </div>
                      )}

                      {showMedicalSection ? (
                        <div>
                          <div className="text-sm font-semibold text-gray-700 mb-2">Medical</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div><span className="text-gray-500">Taking Maintenance Medications:</span> {formatSummaryValue(!!v.takingMedications)}</div>
                            <div><span className="text-gray-500">Medication Reason:</span> {formatSummaryValue(v.medicationReason)}</div>
                            <div><span className="text-gray-500">Taken Medical/Drug Test:</span> {formatSummaryValue(!!v.tookMedicalTest)}</div>
                            <div><span className="text-gray-500">Test Date:</span> {formatSummaryValue(v.medicalTestDate)}</div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <button
                onClick={() => setShowSummaryModal(false)}
                className="px-5 py-2.5 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  setShowSummaryModal(false);
                  setShowConfirmModal(true);
                }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all bg-[#800000] text-white hover:bg-[#990000]"
              >
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

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
                    const count = applicants.length;

                    setShowConfirmModal(false);
                    setTermsAccepted(false);
                    setPrivacyAccepted(false);

                    setConfirmMessage(`Endorse ${count} employee${count === 1 ? "" : "s"} to HR?`);
                    setConfirmCallback(() => async () => {
                      await handleEndorseAll();
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
                    if (csvInputRef.current) csvInputRef.current.value = '';
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
                    <p className="text-xs text-blue-700">Your CSV file should include column headers. Download the template below for the full supported list.</p>
                    <p className="text-xs text-blue-600 mt-1 font-mono bg-blue-100 px-2 py-1 rounded">
                      firstname, lastname, middlename, email, contact, position, department, depot, available_start_date, employed, birthday, marital_status, sex, unit_house_number, street, barangay, city, province, zip, education, ...
                    </p>
                    <p className="text-xs text-blue-700 mt-2">
                      Notes: booleans accept <span className="font-mono">yes/no</span>, <span className="font-mono">true/false</span>, or <span className="font-mono">1/0</span>. Lists use <span className="font-mono">|</span> (e.g. <span className="font-mono">restriction_codes=1|2</span>). File uploads (resume/license/certificates) are not supported by CSV and must be uploaded manually.
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Dates: CSV supports Excel serial dates (e.g. <span className="font-mono">46000</span>) or <span className="font-mono">DD/MM/YYYY</span> (also accepts <span className="font-mono">DD-MM-YYYY</span>). The form will convert these to the required <span className="font-mono">YYYY-MM-DD</span> for the date picker.
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
                          if (csvInputRef.current) csvInputRef.current.value = '';
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
                    const template = 'firstname,lastname,middlename,email,contact,available_start_date,employed,birthday,marital_status,sex,unit_house_number,street,barangay,city,province,zip,education,tertiary_school,tertiary_program,tertiary_year,skills,specialized_training,specialized_year,has_sss,has_pagibig,has_tin,has_philhealth,license_classification,license_expiry,restriction_codes,years_driving,truck_knowledge,vehicles_driven,troubleshooting_tasks,taking_medications,medication_reason,took_medical_test,medical_test_date\nJuan,Dela Cruz,Santos,juan@email.com,09171234567,01/15/2026,yes,05/15/1990,Single,Male,123,Main Street,Barangay 1,Makati,Metro Manila,1200,College,ABC University,BS Logistics,2012,"Driving, Customer Service",Defensive Driving,2023,yes,no,yes,yes,Professional,01/01/2027,1|2,8,yes,Motorcycle|Van,Engine|Electrical,no,,yes,01/01/2026\nMaria,Santos,,maria@email.com,09181234567,01/15/2026,no,08/20/1992,Single,Female,456,Ortigas Avenue,Barangay 2,Pasig,Metro Manila,1600,Senior High School,,,,"Packing, Inventory",,,no,no,no,no,,,,,,no,,no,';
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
                  if (csvInputRef.current) csvInputRef.current.value = '';
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
