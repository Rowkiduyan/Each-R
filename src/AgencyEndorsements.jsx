// src/AgencyEndorsements.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "./supabaseClient";
import LogoCropped from './layouts/photos/logo(cropped).png';
import { createNotification, notifyHRAboutInterviewResponse, notifyHRAboutApplicationRetraction } from './notifications';
import { UploadedDocumentsSection } from './components/ApplicantArtifactsPanels';
import { validateNoSunday, validateOfficeHours } from './utils/dateTimeRules';

function AgencyEndorsements() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const profileDropdownRef = useRef(null);
  
  // Check if navigated from Separation page to submit resignation
  const [showSeparationPrompt, setShowSeparationPrompt] = useState(false);
  const [endorsementsTab, setEndorsementsTab] = useState('pending'); // 'pending' | 'deployed' | 'myEmployees' | 'retracted'
  
  useEffect(() => {
    if (location.state?.openSeparationTab) {
      setShowSeparationPrompt(true);
      setEndorsementsTab('deployed');
      // Clear the state to prevent showing prompt on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // endorsed/hired state
  const [endorsedEmployees, setEndorsedEmployees] = useState([]);
  const [endorsedLoading, setEndorsedLoading] = useState(true);
  const [endorsedError, setEndorsedError] = useState(null);

  const [retractedEndorsements, setRetractedEndorsements] = useState([]);
  const [retractedLoading, setRetractedLoading] = useState(true);
  const [retractedError, setRetractedError] = useState(null);

  const [hiredEmployees, setHiredEmployees] = useState([]);
  const [hiredLoading, setHiredLoading] = useState(true);
  const [hiredError, setHiredError] = useState(null);

  // UI helpers for details
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // My Employees -> Edit employee
  const [isEditingEmployee, setIsEditingEmployee] = useState(false);
  const [employeeEditDraft, setEmployeeEditDraft] = useState(null);
  const [employeeEditSaving, setEmployeeEditSaving] = useState(false);
  const [employeeEditError, setEmployeeEditError] = useState('');
  const [employeeEditSuccess, setEmployeeEditSuccess] = useState('');
  const [autoEditEmployeeId, setAutoEditEmployeeId] = useState(null);

  // My Employees -> History
  const [employeeHistoryRows, setEmployeeHistoryRows] = useState([]);
  const [employeeHistoryLoading, setEmployeeHistoryLoading] = useState(false);
  const [employeeHistoryError, setEmployeeHistoryError] = useState('');
  
  // Search and filter for endorsements
  const [endorsementsSearch, setEndorsementsSearch] = useState('');
  const [sortOption, setSortOption] = useState('name-asc');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [positionFilter, setPositionFilter] = useState('All');
  const [depotFilter, setDepotFilter] = useState('All');
  const [employmentStatusFilter, setEmploymentStatusFilter] = useState('All');
  const [employeeDetailTab, setEmployeeDetailTab] = useState('profiling');

  // Initialize/clear edit/history state when switching employees/tabs
  useEffect(() => {
    setEmployeeEditError('');
    setEmployeeEditSuccess('');
    setEmployeeHistoryRows([]);
    setEmployeeHistoryError('');
    setEmployeeHistoryLoading(false);

    if (endorsementsTab === 'myEmployees' && selectedEmployee) {
      setEmployeeEditDraft(makeEmployeeEditDraft(selectedEmployee));
      if (autoEditEmployeeId && String(selectedEmployee?.id) === String(autoEditEmployeeId)) {
        setIsEditingEmployee(true);
        setAutoEditEmployeeId(null);
      } else {
        setIsEditingEmployee(false);
      }
    } else {
      setEmployeeEditDraft(null);
      setIsEditingEmployee(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endorsementsTab, selectedEmployee?.id]);

  useEffect(() => {
    if (endorsementsTab !== 'myEmployees') return;
    if (!selectedEmployee) return;
    if (employeeDetailTab !== 'history') return;
    fetchEmployeeHistory(selectedEmployee);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endorsementsTab, employeeDetailTab, selectedEmployee?.id]);

  // Add Employee modal (My Employees)
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [addEmployeeStep, setAddEmployeeStep] = useState(1);
  const addEmployeeCsvSectionRef = useRef(null);

  // Add Employee (My Employees -> Add)
  const [addEmployeeSubmitting, setAddEmployeeSubmitting] = useState(false);
  const [addEmployeeError, setAddEmployeeError] = useState('');
  const [addEmployeeSuccess, setAddEmployeeSuccess] = useState('');
  const [addEmployeeDepotOptions, setAddEmployeeDepotOptions] = useState([]);

  const todayIso = () => new Date().toISOString().split('T')[0];
  const getBirthdayMaxForMinAge = (minAgeYears) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - Number(minAgeYears || 0));
    return d.toISOString().split('T')[0];
  };

  const sanitizeDigits = (value, maxLen) => String(value || '').replace(/\D+/g, '').slice(0, maxLen);
  const sanitizeYear = (value) => sanitizeDigits(value, 4);
  const sanitizeZip = (value) => sanitizeDigits(value, 4);
  const sanitizeContact = (value) => sanitizeDigits(value, 11);
  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  const getBirthYear = (birthdayStr) => {
    const s = String(birthdayStr || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const y = Number(s.slice(0, 4));
    return Number.isFinite(y) ? y : null;
  };
  const getAgeFromBirthday = (birthdayStr) => {
    const s = String(birthdayStr || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const dob = new Date(s + 'T00:00:00');
    if (Number.isNaN(dob.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
    return age;
  };

  const makeEmptyAddEmployeeForm = () => ({
    // Employment details
    department: 'Operations Department',
    position: 'Helper',
    depot: '',
    dateAvailable: '',
    employed: 'no',

    // Personal info
    lname: '',
    fname: '',
    mname: '',
    birthday: '',
    maritalStatus: '',
    sex: '',

    // Address
    unit_house_number: '',
    street: '',
    barangay: '',
    city: '',
    province: '',
    zip: '',

    // Alternate address (optional)
    residenceNoAlt: '',
    streetAlt: '',
    cityAlt: '',
    zipAlt: '',

    // Contacts
    contactNumber: '',
    email: '',
    personalEmail: '',

    // Government IDs (availability flags)
    hasSSS: false,
    hasPAGIBIG: false,
    hasTIN: false,
    hasPhilHealth: false,

    // Education & skills
    education: '',
    secondarySchool: '',
    secondaryYear: '',
    tertiarySchool: '',
    tertiaryYear: '',
    tertiaryProgram: '',
    graduateSchool: '',
    graduateYear: '',
    graduateProgram: '',
    specializedTraining: '',
    specializedYear: '',
    trainingCertFile: null,
    skills: '',

    // Medical
    takingMedications: false,
    medicationReason: '',
    tookMedicalTest: false,
    medicalTestDate: '',

    // Driver fields
    employeeType: 'helper', // 'helper' | 'driver'
    licenseExpiry: '',
    licenseClassification: '',
    restrictionCodes: [],
    yearsDriving: '',
    truckKnowledge: 'no', // 'yes' | 'no'
    vehicleTypes: [],
    troubleshootingTasks: [],

    // Files
    resumeFile: null,
    licenseFile: null,
  });

  const [addEmployeeForm, setAddEmployeeForm] = useState(makeEmptyAddEmployeeForm);

  // Load depot locations for dropdowns
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('depot_locations')
          .select('depot')
          .order('depot', { ascending: true });

        if (cancelled) return;
        if (error) {
          console.error('Error loading depot locations:', error);
          return;
        }

        const list = (data || [])
          .map((x) => (x?.depot ? String(x.depot).trim() : ''))
          .filter(Boolean);
        setAddEmployeeDepotOptions(list);
      } catch (err) {
        if (!cancelled) console.error('Error loading depot locations:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // CSV Import (Add Employee)
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [csvError, setCsvError] = useState('');
  const [isDraggingCsv, setIsDraggingCsv] = useState(false);
  const csvInputRef = useRef(null);

  // Endorse existing employee -> pick a job first
  const [showJobPickerModal, setShowJobPickerModal] = useState(false);
  const [jobPickerLoading, setJobPickerLoading] = useState(false);
  const [jobPickerSubmitting, setJobPickerSubmitting] = useState(false);
  const [jobPickerError, setJobPickerError] = useState(null);
  const [jobPickerSuccess, setJobPickerSuccess] = useState(null);
  const [jobPickerJobs, setJobPickerJobs] = useState([]);
  const [jobPickerQuery, setJobPickerQuery] = useState('');
  const [employeeToEndorse, setEmployeeToEndorse] = useState(null);

  useEffect(() => {
    if (!showJobPickerModal) return;

    let cancelled = false;
    (async () => {
      setJobPickerLoading(true);
      setJobPickerSubmitting(false);
      setJobPickerError(null);
      setJobPickerSuccess(null);
      setJobPickerQuery('');
      try {
        const { data, error } = await supabase
          .from('job_posts')
          .select('id, title, department, depot, created_at, is_active, positions_needed, expires_at')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (cancelled) return;
        if (error) {
          console.error('Job picker load error:', error);
          setJobPickerError(error.message || String(error));
          setJobPickerJobs([]);
        } else {
          setJobPickerJobs(data || []);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Job picker unexpected error:', err);
        setJobPickerError(String(err));
        setJobPickerJobs([]);
      } finally {
        if (!cancelled) setJobPickerLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showJobPickerModal]);

  const isMyEmployeesTab = endorsementsTab === 'myEmployees';
  const isAddEmployeeModalOpen = isMyEmployeesTab && showAddEmployeeModal;
  const addEmployeeTotalSteps = addEmployeeForm.employeeType === 'driver' ? 4 : 2;

  useEffect(() => {
    if (addEmployeeStep > addEmployeeTotalSteps) {
      setAddEmployeeStep(addEmployeeTotalSteps);
    }
  }, [addEmployeeTotalSteps, addEmployeeStep]);

  const resetAddEmployeeState = () => {
    setAddEmployeeError('');
    setAddEmployeeSuccess('');
    setAddEmployeeSubmitting(false);
    setAddEmployeeForm(makeEmptyAddEmployeeForm());
    setCsvFile(null);
    setCsvPreview([]);
    setCsvRows([]);
    setCsvError('');
    setIsDraggingCsv(false);
  };

  const closeAddEmployeeModal = () => {
    setShowAddEmployeeModal(false);
    setAddEmployeeStep(1);
    setSelectedEmployee(null);
    resetAddEmployeeState();
  };

  const openAddEmployeeModal = () => {
    resetAddEmployeeState();
    setAddEmployeeStep(1);
    setShowAddEmployeeModal(true);
    setSelectedEmployee(null);
  };

  const splitCsvLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const parseEmployeesCSV = (text) => {
    const lines = String(text || '')
      .split(/\r?\n/)
      .map((l) => String(l || '').trim())
      .filter((l) => l && !/^\s*#/.test(l));
    if (lines.length < 2) return { headers: [], data: [] };

    const headers = splitCsvLine(lines[0])
      .map((h, idx) => {
        const cleaned = String(h || '').trim().replace(/^["']|["']$/g, '');
        return idx === 0 ? cleaned.replace(/^\uFEFF/, '') : cleaned;
      })
      .filter(Boolean);
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      let values = splitCsvLine(lines[i]).map((v) => String(v || '').trim().replace(/^["']|["']$/g, ''));

      if (!values.some((v) => String(v || '').trim() !== '')) continue;

      if (values.length < headers.length) {
        while (values.length < headers.length) values.push('');
      } else if (values.length > headers.length) {
        const head = values.slice(0, Math.max(0, headers.length - 1));
        const tail = values.slice(Math.max(0, headers.length - 1)).join(',');
        values = [...head, tail];
      }

      const rowObj = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] ?? '';
      });
      data.push(rowObj);
    }

    return { headers, data };
  };

  const handleCsvFileSelect = (file) => {
    setCsvError('');
    setCsvPreview([]);
    setCsvRows([]);
    setCsvFile(null);
    if (!file) return;

    if (!String(file.name || '').toLowerCase().endsWith('.csv')) {
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
        const { data } = parseEmployeesCSV(e.target.result);
        if (!data || data.length === 0) {
          setCsvError('No valid data found in CSV file');
          return;
        }
        if (data.length > 50) {
          setCsvError('Maximum 50 employees can be imported at once');
          return;
        }
        setCsvFile(file);
        setCsvRows(data);
        setCsvPreview(data.slice(0, 5));
      } catch (err) {
        console.error('CSV parse error:', err);
        setCsvError('Error parsing CSV file. Please check the format.');
      }
    };
    reader.readAsText(file);
  };

  const normalizeCsvKey = (k) => String(k || '').trim().toLowerCase().replace(/\s+/g, '_');

  const toCsvBool = (v) => {
    const s = String(v ?? '').trim().toLowerCase();
    return s === '1' || s === 'true' || s === 'yes' || s === 'y' || s === 'checked';
  };

  const toCsvList = (v) => {
    const s = String(v ?? '').trim();
    if (!s) return [];
    const parts = s.includes('|') ? s.split('|') : s.includes(';') ? s.split(';') : s.split(',');
    return parts.map((p) => p.trim()).filter(Boolean);
  };

  const normalizeCsvDate = (value) => {
    let raw = String(value ?? '').trim();
    if (!raw) return '';

    // Handle "1 01 2027" => "1/01/2027"
    if (/^\d{1,2}\s+\d{1,2}\s+\d{4}$/.test(raw)) {
      raw = raw.replace(/\s+/g, '/');
    }

    // Excel serial date
    if (/^\d{5}$/.test(raw)) {
      const serial = Number(raw);
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const dt = new Date(excelEpoch.getTime() + serial * 86400 * 1000);
      return dt.toISOString().slice(0, 10);
    }

    // DD/MM/YYYY or MM/DD/YYYY
    const m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      const year = Number(m[3]);

      let month;
      let day;
      if (a > 12 && b <= 12) {
        day = a;
        month = b;
      } else if (b > 12 && a <= 12) {
        month = a;
        day = b;
      } else {
        month = a;
        day = b;
      }

      if (month < 1 || month > 12 || day < 1 || day > 31) return '';
      const dt = new Date(Date.UTC(year, month - 1, day));
      return dt.toISOString().slice(0, 10);
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()))
        .toISOString()
        .slice(0, 10);
    }
    return '';
  };

  const getCsvValue = (row, candidates) => {
    const keys = Object.keys(row || {});
    const map = {};
    keys.forEach((k) => {
      map[normalizeCsvKey(k)] = row[k];
    });
    for (const cand of candidates) {
      const v = map[normalizeCsvKey(cand)];
      if (v != null && String(v).trim() !== '') return String(v).trim();
    }
    return '';
  };

  const uploadEmployeeFile = async ({ employeeId, file, key, name }) => {
    if (!file || !employeeId) return null;
    const safeName = String(file.name || 'file').replace(/[^a-zA-Z0-9_.-]+/g, '_');
    const path = `employees/${employeeId}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from('application-files').upload(path, file);
    if (error) throw error;
    return {
      key: key || null,
      name: name || null,
      label: name || null,
      file_path: path,
      path,
      originalName: file.name,
      status: 'Submitted',
      submitted_at: new Date().toISOString(),
      uploadedAt: new Date().toISOString(),
    };
  };

  const coerceArray = (val) => (Array.isArray(val) ? val : []);

  const makeEmployeeEditDraft = (emp) => {
    if (!emp) return null;
    const req = emp?.requirements && typeof emp.requirements === 'object' ? emp.requirements : {};
    const profile = req?.profile && typeof req.profile === 'object' ? req.profile : {};
    const address = profile?.address && typeof profile.address === 'object' ? profile.address : {};
    const education = profile?.education && typeof profile.education === 'object' ? profile.education : {};
    const medical = profile?.medical && typeof profile.medical === 'object' ? profile.medical : {};
    const driver = req?.driver && typeof req.driver === 'object' ? req.driver : {};

    const employeeTypeInReq = String(req?.employeeType || '').toLowerCase();
    const inferredIsDriver = employeeTypeInReq === 'driver' || /driver/i.test(String(emp?.position || emp?.raw?.position || ''));
    const employeeType = inferredIsDriver ? 'driver' : 'helper';

    return {
      fname: String(emp?.raw?.fname ?? '').trim(),
      mname: String(emp?.raw?.mname ?? '').trim(),
      lname: String(emp?.raw?.lname ?? '').trim(),
      email: String(emp?.email ?? '').trim(),
      personal_email: String(emp?.personal_email ?? emp?.raw?.personal_email ?? '').trim(),
      contact_number: String(emp?.contact ?? emp?.raw?.contact_number ?? '').trim(),
      birthday: String(emp?.birthday ?? emp?.raw?.birthday ?? '').trim(),
      depot: String(emp?.depot ?? emp?.raw?.depot ?? '').trim(),
      department: String(emp?.department ?? emp?.raw?.department ?? '').trim(),
      position: String(emp?.position ?? emp?.raw?.position ?? '').trim(),
      requirements: {
        employeeType,
        profile: {
          employed: profile?.employed ?? 'no',
          dateAvailable: profile?.dateAvailable ?? '',
          maritalStatus: profile?.maritalStatus ?? '',
          sex: profile?.sex ?? '',
          address: {
            unit_house_number: address?.unit_house_number ?? profile?.unit_house_number ?? '',
            street: address?.street ?? profile?.street ?? '',
            barangay: address?.barangay ?? profile?.barangay ?? '',
            city: address?.city ?? profile?.city ?? '',
            province: address?.province ?? profile?.province ?? '',
            zip: address?.zip ?? profile?.zip ?? '',
          },
          education: {
            education: education?.education ?? profile?.education ?? '',
            secondarySchool: education?.secondarySchool ?? '',
            secondaryYear: education?.secondaryYear ?? '',
            tertiarySchool: education?.tertiarySchool ?? '',
            tertiaryYear: education?.tertiaryYear ?? '',
            tertiaryProgram: education?.tertiaryProgram ?? '',
            graduateSchool: education?.graduateSchool ?? '',
            graduateYear: education?.graduateYear ?? '',
            graduateProgram: education?.graduateProgram ?? '',
            specializedTraining: education?.specializedTraining ?? profile?.specializedTraining ?? '',
            specializedYear: education?.specializedYear ?? profile?.specializedYear ?? '',
          },
          skills: profile?.skills ?? '',
          medical: {
            takingMedications: Boolean(medical?.takingMedications),
            medicationReason: medical?.medicationReason ?? '',
            tookMedicalTest: Boolean(medical?.tookMedicalTest),
            medicalTestDate: medical?.medicalTestDate ?? '',
          },
        },
        driver: {
          licenseClassification: driver?.licenseClassification ?? '',
          licenseExpiry: driver?.licenseExpiry ?? '',
          restrictionCodes: coerceArray(driver?.restrictionCodes),
          yearsDriving: driver?.yearsDriving ?? '',
          truckKnowledge: driver?.truckKnowledge ?? '',
          vehicleTypes: coerceArray(driver?.vehicleTypes),
          troubleshootingTasks: coerceArray(driver?.troubleshootingTasks),
        },
        documents: coerceArray(req?.documents),
      },
      files: {
        resumeFile: null,
        trainingCertFile: null,
        licenseFile: null,
        extraCertLabel: '',
        extraCertFile: null,
      },
    };
  };

  const updateEmployeeEditDraft = (path, value) => {
    setEmployeeEditDraft((prev) => {
      const next = prev ? { ...prev } : {};
      const parts = String(path || '').split('.').filter(Boolean);
      if (parts.length === 0) return prev;
      let cur = next;
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        const existing = cur[key];
        cur[key] = existing && typeof existing === 'object' ? { ...existing } : {};
        cur = cur[key];
      }
      cur[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const validateEmployeeEditDraft = (draft) => {
    const errors = [];
    if (!draft) return ['No changes to save.'];

    const email = String(draft.email || '').trim().toLowerCase();
    if (!email || !isValidEmail(email)) errors.push('Email Address must be a valid email format (e.g., name@domain.com)');

    const contactStr = sanitizeContact(draft.contact_number || '');
    if (!contactStr || !/^09\d{9}$/.test(contactStr)) {
      errors.push('Contact Number must be exactly 11 digits and start with 09');
    }

    const fname = String(draft.fname || '').trim();
    const lname = String(draft.lname || '').trim();
    if (!fname) errors.push('First Name is required');
    if (!lname) errors.push('Last Name is required');

    const profile = draft?.requirements?.profile || {};
    const addr = profile?.address || {};
    const zipStr = String(addr?.zip || '').trim();
    if (zipStr && !/^\d{4}$/.test(zipStr)) errors.push('ZIP Code must be exactly 4 digits');

    return errors;
  };

  const mergeEmployeeDocuments = (existingDocs, newDocs) => {
    let docs = coerceArray(existingDocs).filter(Boolean);
    for (const d of coerceArray(newDocs)) {
      if (!d) continue;
      const key = String(d.key || '').trim();
      if (['resume', 'training_certificate', 'license_photocopy'].includes(key)) {
        docs = docs.filter((x) => String(x?.key || '') !== key);
      }
      docs.push(d);
    }
    return docs;
  };

  const saveEmployeeEdits = async () => {
    setEmployeeEditError('');
    setEmployeeEditSuccess('');

    const emp = selectedEmployee;
    const draft = employeeEditDraft;
    if (!emp?.id || !draft) {
      setEmployeeEditError('No employee selected.');
      return;
    }

    const errs = validateEmployeeEditDraft(draft);
    if (errs.length > 0) {
      setEmployeeEditError(`Please fix the following before saving:\n\n- ${errs.join('\n- ')}`);
      return;
    }

    setEmployeeEditSaving(true);
    try {
      const email = String(draft.email || '').trim().toLowerCase();
      const prevEmail = normalizeEmail(emp?.email);

      // Ensure email uniqueness if changed
      if (prevEmail && normalizeEmail(email) !== prevEmail) {
        const { data: existing, error: existingErr } = await supabase
          .from('employees')
          .select('id,email')
          .eq('email', email)
          .maybeSingle();

        if (existingErr) throw existingErr;
        if (existing?.id && String(existing.id) !== String(emp.id)) {
          throw new Error(`Another employee already uses the email "${email}".`);
        }
      }

      const baseReq = emp?.requirements && typeof emp.requirements === 'object' ? emp.requirements : {};
      const draftReq = draft?.requirements && typeof draft.requirements === 'object' ? draft.requirements : {};

      const employeeType = String(draftReq?.employeeType || baseReq?.employeeType || 'helper').toLowerCase() === 'driver'
        ? 'driver'
        : 'helper';

      const nextProfile = {
        ...(baseReq?.profile && typeof baseReq.profile === 'object' ? baseReq.profile : {}),
        ...(draftReq?.profile && typeof draftReq.profile === 'object' ? draftReq.profile : {}),
      };
      nextProfile.address = {
        ...((baseReq?.profile?.address && typeof baseReq.profile.address === 'object') ? baseReq.profile.address : {}),
        ...((draftReq?.profile?.address && typeof draftReq.profile.address === 'object') ? draftReq.profile.address : {}),
      };
      nextProfile.education = {
        ...((baseReq?.profile?.education && typeof baseReq.profile.education === 'object') ? baseReq.profile.education : {}),
        ...((draftReq?.profile?.education && typeof draftReq.profile.education === 'object') ? draftReq.profile.education : {}),
      };
      nextProfile.medical = {
        ...((baseReq?.profile?.medical && typeof baseReq.profile.medical === 'object') ? baseReq.profile.medical : {}),
        ...((draftReq?.profile?.medical && typeof draftReq.profile.medical === 'object') ? draftReq.profile.medical : {}),
      };

      const nextDriver = employeeType === 'driver'
        ? {
            ...((baseReq?.driver && typeof baseReq.driver === 'object') ? baseReq.driver : {}),
            ...((draftReq?.driver && typeof draftReq.driver === 'object') ? draftReq.driver : {}),
            restrictionCodes: coerceArray(draftReq?.driver?.restrictionCodes ?? baseReq?.driver?.restrictionCodes),
            vehicleTypes: coerceArray(draftReq?.driver?.vehicleTypes ?? baseReq?.driver?.vehicleTypes),
            troubleshootingTasks: coerceArray(draftReq?.driver?.troubleshootingTasks ?? baseReq?.driver?.troubleshootingTasks),
          }
        : null;

      // Upload any new files and merge into requirements.documents
      const uploads = [];
      if (draft?.files?.resumeFile) {
        uploads.push(uploadEmployeeFile({ employeeId: emp.id, file: draft.files.resumeFile, key: 'resume', name: 'Resume' }));
      }
      if (draft?.files?.trainingCertFile) {
        uploads.push(uploadEmployeeFile({ employeeId: emp.id, file: draft.files.trainingCertFile, key: 'training_certificate', name: 'Training Certificate' }));
      }
      if (employeeType === 'driver' && draft?.files?.licenseFile) {
        uploads.push(uploadEmployeeFile({ employeeId: emp.id, file: draft.files.licenseFile, key: 'license_photocopy', name: 'License Photocopy' }));
      }
      if (draft?.files?.extraCertFile && String(draft?.files?.extraCertLabel || '').trim()) {
        const label = String(draft.files.extraCertLabel || '').trim();
        uploads.push(uploadEmployeeFile({ employeeId: emp.id, file: draft.files.extraCertFile, key: 'certificate', name: label }));
      }

      const uploadedDocs = (await Promise.allSettled(uploads))
        .map((r) => (r.status === 'fulfilled' ? r.value : null))
        .filter(Boolean);

      const nextDocuments = mergeEmployeeDocuments(
        coerceArray(draftReq?.documents ?? baseReq?.documents),
        uploadedDocs
      );

      const nextRequirements = {
        ...(baseReq && typeof baseReq === 'object' ? baseReq : {}),
        ...(draftReq && typeof draftReq === 'object' ? draftReq : {}),
        employeeType,
        profile: nextProfile,
        driver: nextDriver,
        documents: nextDocuments,
      };

      const updates = {
        email,
        fname: String(draft.fname || '').trim() || null,
        mname: String(draft.mname || '').trim() || null,
        lname: String(draft.lname || '').trim() || null,
        personal_email: String(draft.personal_email || '').trim() || null,
        contact_number: sanitizeContact(draft.contact_number || '') || null,
        birthday: String(draft.birthday || '').trim() || null,
        depot: String(draft.depot || '').trim() || null,
        department: String(draft.department || '').trim() || null,
        position: String(draft.position || '').trim() || null,
        requirements: nextRequirements,
      };

      const { error: updErr } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', emp.id);
      if (updErr) throw updErr;

      const name = [updates.fname, updates.mname, updates.lname].filter(Boolean).join(' ').trim() || updates.email || 'Unnamed';
      const mergedEmployee = {
        ...emp,
        name,
        email: updates.email,
        personal_email: updates.personal_email,
        contact: updates.contact_number,
        birthday: updates.birthday,
        depot: updates.depot,
        department: updates.department,
        position: updates.position,
        requirements: nextRequirements,
        raw: {
          ...(emp?.raw || {}),
          email: updates.email,
          fname: updates.fname,
          mname: updates.mname,
          lname: updates.lname,
          personal_email: updates.personal_email,
          contact_number: updates.contact_number,
          birthday: updates.birthday,
          depot: updates.depot,
          department: updates.department,
          position: updates.position,
          requirements: nextRequirements,
        },
      };

      setHiredEmployees((prev) => (Array.isArray(prev) ? prev.map((h) => (String(h?.id) === String(emp.id) ? mergedEmployee : h)) : prev));
      setSelectedEmployee(mergedEmployee);
      setEmployeeEditDraft(makeEmployeeEditDraft(mergedEmployee));
      setIsEditingEmployee(false);
      setEmployeeEditSuccess('Employee updated successfully.');
    } catch (err) {
      console.error('Save employee edits error:', err);
      setEmployeeEditError(err?.message || String(err));
    } finally {
      setEmployeeEditSaving(false);
    }
  };

  const fetchEmployeeHistory = async (emp) => {
    if (!emp) return;
    setEmployeeHistoryLoading(true);
    setEmployeeHistoryError('');
    setEmployeeHistoryRows([]);

    const employeeId = emp?.id != null ? String(emp.id) : null;
    const employeeEmail = normalizeEmail(emp?.email);
    const employeeAuthUserId = emp?.auth_user_id ? String(emp.auth_user_id) : null;

    const normalizeRow = (r) => {
      let payloadObj = r?.payload ?? {};
      if (typeof payloadObj === 'string') {
        try { payloadObj = JSON.parse(payloadObj); } catch { payloadObj = {}; }
      }

      const meta = payloadObj?.meta || {};
      const metaEmpId = meta?.employee_id || meta?.employeeId || meta?.employeeID || null;
      const rowEmail = extractEmailFromApplicationPayload(payloadObj);

      const matches =
        (metaEmpId != null && employeeId && String(metaEmpId) === employeeId) ||
        (rowEmail && employeeEmail && rowEmail === employeeEmail) ||
        (employeeAuthUserId && r?.user_id != null && String(r.user_id) === employeeAuthUserId);

      if (!matches) return null;

      const jobTitle = r?.job_posts?.title || payloadObj?.job?.title || payloadObj?.job_title || null;
      const depot = r?.job_posts?.depot || payloadObj?.job?.depot || null;
      const department = r?.job_posts?.department || payloadObj?.job?.department || null;

      const rejectionRemarks =
        r?.rejection_remarks ||
        payloadObj?.rejection_remarks ||
        payloadObj?.rejectionRemarks ||
        payloadObj?.meta?.rejection_remarks ||
        payloadObj?.meta?.rejectionRemarks ||
        null;

      return {
        id: r?.id,
        status: String(r?.status || '').toLowerCase() || 'submitted',
        endorsed: !!r?.endorsed,
        created_at: r?.created_at || null,
        updated_at: r?.updated_at || null,
        jobTitle,
        depot,
        department,
        rejectionRemarks: rejectionRemarks ? String(rejectionRemarks) : null,
        raw: r,
      };
    };

    try {
      const selectWithRemarks = `id,user_id,job_id,status,created_at,updated_at,endorsed,payload,rejection_remarks,retract_remarks,job_posts:job_posts ( id, title, depot, department )`;
      const selectWithoutRemarks = `id,user_id,job_id,status,created_at,updated_at,endorsed,payload,job_posts:job_posts ( id, title, depot, department )`;

      let res = await supabase
        .from('applications')
        .select(selectWithRemarks)
        .order('created_at', { ascending: false })
        .limit(250);

      if (res.error) {
        const msg = String(res.error.message || '').toLowerCase();
        const missingRemarksColumn = msg.includes('rejection_remarks') || msg.includes('retract_remarks');
        if (missingRemarksColumn) {
          res = await supabase
            .from('applications')
            .select(selectWithoutRemarks)
            .order('created_at', { ascending: false })
            .limit(250);
        }
      }

      if (res.error) throw res.error;

      const normalized = (res.data || [])
        .map(normalizeRow)
        .filter(Boolean);

      setEmployeeHistoryRows(normalized);
    } catch (err) {
      console.error('Fetch employee history error:', err);
      setEmployeeHistoryError(err?.message || String(err));
      setEmployeeHistoryRows([]);
    } finally {
      setEmployeeHistoryLoading(false);
    }
  };

  const validateYearAfterBirth = (yearStr, birthYear) => {
    if (!yearStr) return null;
    if (!/^\d{4}$/.test(yearStr)) return 'must be 4 digits';
    if (birthYear && parseInt(yearStr, 10) <= birthYear) return `must be after birth year (${birthYear})`;
    return null;
  };

  const validateAddEmployeeStep = (stepNum) => {
    const v = addEmployeeForm || makeEmptyAddEmployeeForm();
    const errors = [];
    const req = (val, label) => {
      if (Array.isArray(val)) {
        if (!val.length) errors.push(label);
        return;
      }
      if (typeof val === 'boolean') return;
      if (val == null) {
        errors.push(label);
        return;
      }
      if (typeof val === 'string' && !val.trim()) {
        errors.push(label);
      }
    };

    const birthYear = getBirthYear(v.birthday);
    const todayStr = todayIso();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const isDriver = String(v.employeeType || '').toLowerCase() === 'driver' || /driver/i.test(String(v.position || ''));

    if (stepNum === 1) {
      req(v.department, 'Department');
      req(v.position, 'Position');
      req(v.depot, 'Depot Assignment');
      req(v.dateAvailable, 'Available Start Date');
      req(v.employed, 'Currently Employed');

      req(v.lname, 'Last Name');
      req(v.fname, 'First Name');
      req(v.birthday, 'Birthday');
      req(v.maritalStatus, 'Marital Status');
      req(v.sex, 'Sex');

      req(v.street, 'Street Address');
      req(v.province, 'Province');
      req(v.city, 'City / Municipality');
      req(v.barangay, 'Barangay');
      req(v.zip, 'ZIP Code');

      req(v.contactNumber, 'Contact Number');
      req(v.email, 'Email Address');

      if (v.birthday && v.birthday > todayStr) errors.push('Birthday cannot be in the future');
      const age = getAgeFromBirthday(v.birthday);
      if (age != null && age < 15) errors.push('Employee must be at least 15 years old');

      if (v.dateAvailable && v.dateAvailable < todayStr) errors.push('Available Start Date cannot be before today');
      const zipStr = String(v.zip || '').trim();
      if (zipStr && !/^\d{4}$/.test(zipStr)) errors.push('ZIP Code must be exactly 4 digits');

      const contactStr = String(v.contactNumber || '').trim();
      if (contactStr && !/^09\d{9}$/.test(contactStr)) {
        errors.push('Contact Number must be exactly 11 digits and start with 09');
      }
      if (v.email && !isValidEmail(v.email)) {
        errors.push('Email Address must be a valid email format (e.g., name@domain.com)');
      }
    }

    if (stepNum === 2) {
      req(v.education, 'Educational Level');
      const educationIsNA = v.education === 'N/A';
      if (!educationIsNA) {
        req(v.tertiaryYear, 'Year Graduated');
        req(v.tertiarySchool, 'School/Institution Name');
        req(v.tertiaryProgram, 'Course/Program');
      }

      const yearGrad = sanitizeYear(v.tertiaryYear);
      const yearGradErr = validateYearAfterBirth(yearGrad, birthYear);
      if (yearGrad && yearGradErr) errors.push(`Year Graduated ${yearGradErr}`);

      const specYear = sanitizeYear(v.specializedYear);
      if (specYear) {
        const specErr = validateYearAfterBirth(specYear, birthYear);
        if (specErr) errors.push(`Year Completed ${specErr}`);
      }
    }

    if (stepNum === 3 && isDriver) {
      req(v.licenseClassification, 'License Classification');
      req(v.licenseExpiry, 'License Expiry Date');
      req(v.licenseFile, 'License Photocopy');
      if (!Array.isArray(v.restrictionCodes) || v.restrictionCodes.length < 1) {
        errors.push('Restriction Codes (select at least 1)');
      }
      if (v.licenseExpiry && v.licenseExpiry < tomorrowStr) {
        errors.push('License Expiry Date must be from tomorrow onwards');
      }
    }

    if (stepNum === 4 && isDriver) {
      req(v.yearsDriving, 'Years of Driving Experience');
      req(v.truckKnowledge, 'Truck Troubleshooting Knowledge');
      req(v.vehicleTypes, 'Vehicles Driven');
      const age = getAgeFromBirthday(v.birthday);
      const years = v.yearsDriving === '' ? null : Number(v.yearsDriving);
      if (years != null && Number.isFinite(years) && age != null && years > age) {
        errors.push(`Years of Driving Experience cannot exceed age (${age})`);
      }
    }

    return errors;
  };

  const submitAddEmployee = async (e) => {
    e?.preventDefault?.();
    setAddEmployeeError('');
    setAddEmployeeSuccess('');

    for (let s = 1; s <= addEmployeeTotalSteps; s++) {
      const errs = validateAddEmployeeStep(s);
      if (errs.length > 0) {
        setAddEmployeeError(`Please complete the required fields (Step ${s}):\n\n- ${errs.join('\n- ')}`);
        return;
      }
    }

    const email = String(addEmployeeForm.email || '').trim().toLowerCase();
    const fname = String(addEmployeeForm.fname || '').trim();
    const lname = String(addEmployeeForm.lname || '').trim();
    const contactNumber = sanitizeContact(addEmployeeForm.contactNumber || '');

    setAddEmployeeSubmitting(true);
    try {
      const { data: auth, error: authErr } = await supabase.auth.getUser();
      if (authErr || !auth?.user) throw new Error('Unable to verify user');

      const { data: existing } = await supabase
        .from('employees')
        .select('id,email')
        .eq('email', email)
        .maybeSingle();

      if (existing?.id) {
        setAddEmployeeError(`An employee with email "${email}" already exists.`);
        setAddEmployeeSubmitting(false);
        return;
      }

      const department = addEmployeeForm.department || null;
      const position = addEmployeeForm.position || null;
      const depot = String(addEmployeeForm.depot || '').trim() || null;
      const birthday = addEmployeeForm.birthday || null;
      const dateAvailable = addEmployeeForm.dateAvailable || null;
      const employed = addEmployeeForm.employed || 'no';

      const personalEmail = String(addEmployeeForm.personalEmail || '').trim() || null;
      const contact_number = contactNumber || null;

      const isDriver = String(addEmployeeForm.employeeType || '').toLowerCase() === 'driver' || /driver/i.test(String(position || ''));
      const requirements = {
        employeeType: isDriver ? 'driver' : 'helper',
        profile: {
          employed,
          dateAvailable,
          maritalStatus: addEmployeeForm.maritalStatus || null,
          sex: addEmployeeForm.sex || null,
          address: {
            unit_house_number: addEmployeeForm.unit_house_number || null,
            street: addEmployeeForm.street || null,
            barangay: addEmployeeForm.barangay || null,
            city: addEmployeeForm.city || null,
            province: addEmployeeForm.province || null,
            zip: addEmployeeForm.zip || null,
          },
          alternateAddress: {
            residenceNoAlt: addEmployeeForm.residenceNoAlt || null,
            streetAlt: addEmployeeForm.streetAlt || null,
            cityAlt: addEmployeeForm.cityAlt || null,
            zipAlt: addEmployeeForm.zipAlt || null,
          },
          id_availability: {
            hasSSS: !!addEmployeeForm.hasSSS,
            hasPAGIBIG: !!addEmployeeForm.hasPAGIBIG,
            hasTIN: !!addEmployeeForm.hasTIN,
            hasPhilHealth: !!addEmployeeForm.hasPhilHealth,
          },
          education: {
            education: addEmployeeForm.education || null,
            secondarySchool: addEmployeeForm.secondarySchool || null,
            secondaryYear: addEmployeeForm.secondaryYear || null,
            tertiarySchool: addEmployeeForm.tertiarySchool || null,
            tertiaryYear: addEmployeeForm.tertiaryYear || null,
            tertiaryProgram: addEmployeeForm.tertiaryProgram || null,
            graduateSchool: addEmployeeForm.graduateSchool || null,
            graduateYear: addEmployeeForm.graduateYear || null,
            graduateProgram: addEmployeeForm.graduateProgram || null,
            specializedTraining: addEmployeeForm.specializedTraining || null,
            specializedYear: addEmployeeForm.specializedYear || null,
          },
          skills: addEmployeeForm.skills || null,
          medical: {
            takingMedications: !!addEmployeeForm.takingMedications,
            medicationReason: addEmployeeForm.medicationReason || null,
            tookMedicalTest: !!addEmployeeForm.tookMedicalTest,
            medicalTestDate: addEmployeeForm.medicalTestDate || null,
          },
        },
        driver: isDriver
          ? {
              licenseClassification: addEmployeeForm.licenseClassification || null,
              licenseExpiry: addEmployeeForm.licenseExpiry || null,
              restrictionCodes: Array.isArray(addEmployeeForm.restrictionCodes) ? addEmployeeForm.restrictionCodes : [],
              yearsDriving: addEmployeeForm.yearsDriving || null,
              truckKnowledge: addEmployeeForm.truckKnowledge || null,
              vehicleTypes: Array.isArray(addEmployeeForm.vehicleTypes) ? addEmployeeForm.vehicleTypes : [],
              troubleshootingTasks: Array.isArray(addEmployeeForm.troubleshootingTasks) ? addEmployeeForm.troubleshootingTasks : [],
            }
          : null,
        documents: [],
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('employees')
        .insert([
          {
            email,
            fname,
            mname: String(addEmployeeForm.mname || '').trim() || null,
            lname,
            personal_email: personalEmail,
            contact_number,
            birthday,
            depot,
            department,
            position,
            role: 'Employee',
            source: 'agency',
            agency_profile_id: auth.user.id,
            requirements,
          },
        ])
        .select('id,requirements')
        .single();

      if (insertErr) throw insertErr;

      const employeeId = inserted?.id;
      const docs = [];
      if (addEmployeeForm.resumeFile) {
        docs.push(await uploadEmployeeFile({ employeeId, file: addEmployeeForm.resumeFile, key: 'resume', name: 'Resume' }));
      }
      if (addEmployeeForm.trainingCertFile) {
        docs.push(await uploadEmployeeFile({ employeeId, file: addEmployeeForm.trainingCertFile, key: 'training_certificate', name: 'Training Certificate' }));
      }
      if (isDriver && addEmployeeForm.licenseFile) {
        docs.push(await uploadEmployeeFile({ employeeId, file: addEmployeeForm.licenseFile, key: 'license_photocopy', name: 'License Photocopy' }));
      }

      if (docs.filter(Boolean).length > 0) {
        const nextReq = {
          ...(inserted?.requirements && typeof inserted.requirements === 'object' ? inserted.requirements : requirements),
          documents: docs.filter(Boolean),
        };
        const { error: updErr } = await supabase
          .from('employees')
          .update({ requirements: nextReq })
          .eq('id', employeeId);
        if (updErr) throw updErr;
      }

      setAddEmployeeSuccess('Employee added successfully.');
      await loadHired();
      setAlertMessage('Employee added successfully.');
      setShowSuccessAlert(true);
      closeAddEmployeeModal();
    } catch (err) {
      console.error('Add employee error:', err);
      setAddEmployeeError(err?.message || String(err));
    } finally {
      setAddEmployeeSubmitting(false);
    }
  };

  const importEmployeesFromCsv = async () => {
    setAddEmployeeError('');
    setAddEmployeeSuccess('');
    setCsvError('');
    if (!csvRows || csvRows.length === 0) {
      setCsvError('Please select a CSV file first.');
      return;
    }

    setAddEmployeeSubmitting(true);
    try {
      const { data: auth, error: authErr } = await supabase.auth.getUser();
      if (authErr || !auth?.user) throw new Error('Unable to verify user');

      const mapped = csvRows
        .map((row) => {
          const emailRaw = getCsvValue(row, ['email', 'Email Address', 'email_address']);
          const email = String(emailRaw || '').trim().toLowerCase();
          const fname = getCsvValue(row, ['fname', 'first_name', 'first name', 'firstname', 'First Name', 'Firstname']);
          const mname = getCsvValue(row, ['mname', 'middle_name', 'middle name', 'middlename', 'Middle Name', 'Middlename']);
          const lname = getCsvValue(row, ['lname', 'last_name', 'last name', 'lastname', 'Last Name', 'Lastname']);

          const personalEmail = getCsvValue(row, ['personal_email', 'personal email', 'personalEmail']);
          const contactNumber = sanitizeContact(
            getCsvValue(row, ['contact_number', 'contact', 'contact number', 'phone', 'mobile'])
          );

          const depot = getCsvValue(row, ['depot', 'Depot']) || addEmployeeForm.depot || null;
          const department = getCsvValue(row, ['department', 'Department']) || addEmployeeForm.department || null;
          const position = getCsvValue(row, ['position', 'Position']) || addEmployeeForm.position || null;

          const birthday = normalizeCsvDate(getCsvValue(row, ['birthday', 'Birthday', 'date_of_birth', 'dob', 'birthdate', 'date of birth'])) || null;
          const dateAvailable = normalizeCsvDate(
            getCsvValue(row, ['date_available', 'dateAvailable', 'available_start_date', 'available start date'])
          ) || null;

          const employedRaw = getCsvValue(row, ['employed', 'currently_employed', 'currently employed']);
          const employed = employedRaw ? (toCsvBool(employedRaw) ? 'yes' : 'no') : 'no';

          const maritalStatus = getCsvValue(row, ['marital_status', 'maritalStatus', 'marital status', 'civil status']) || null;
          const sex = getCsvValue(row, ['sex', 'gender']) || null;

          const unit_house_number = getCsvValue(row, ['unit_house_number', 'unit house number', 'house number', 'house no', 'house_no']) || null;
          const street = getCsvValue(row, ['street', 'street_address', 'street address', 'address']) || null;
          const province = getCsvValue(row, ['province']) || null;
          const city = getCsvValue(row, ['city', 'city_municipality', 'city / municipality', 'municipality']) || null;
          const barangay = getCsvValue(row, ['barangay']) || null;
          const zip = sanitizeZip(getCsvValue(row, ['zip', 'zip_code', 'zip code', 'postal code', 'zipcode'])) || null;

          const education = getCsvValue(row, ['education', 'educational_level', 'educational level', 'educational attainment']) || null;
          const tertiarySchool = getCsvValue(row, ['tertiary_school', 'tertiarySchool', 'school', 'school/institution', 'institution']) || null;
          const tertiaryYear = sanitizeYear(getCsvValue(row, ['tertiary_year', 'tertiaryYear', 'year_graduated', 'year graduated', 'yeargraduated'])) || null;
          const tertiaryProgram = getCsvValue(row, ['tertiary_program', 'tertiaryProgram', 'course', 'course/program', 'program']) || null;

          const skills = getCsvValue(row, ['skills']) || null;
          const specializedTraining = getCsvValue(row, ['specialized_training', 'specialized training']) || null;
          const specializedYear = sanitizeYear(getCsvValue(row, ['specialized_year', 'specialized year', 'year_completed', 'year completed'])) || null;

          const hasSSS = toCsvBool(getCsvValue(row, ['has_sss', 'has sss', 'sss']));
          const hasPAGIBIG = toCsvBool(getCsvValue(row, ['has_pagibig', 'has pagibig', 'pagibig']));
          const hasTIN = toCsvBool(getCsvValue(row, ['has_tin', 'has tin', 'tin']));
          const hasPhilHealth = toCsvBool(getCsvValue(row, ['has_philhealth', 'has philhealth', 'philhealth']));

          const takingMedications = toCsvBool(getCsvValue(row, ['taking_medications', 'taking medications']));
          const medicationReason = getCsvValue(row, ['medication_reason', 'medication reason']) || null;
          const tookMedicalTest = toCsvBool(getCsvValue(row, ['took_medical_test', 'took medical test']));
          const medicalTestDate = normalizeCsvDate(getCsvValue(row, ['medical_test_date', 'medical test date'])) || null;

          const licenseClassification = getCsvValue(row, ['license_classification', 'license classification']) || null;
          const licenseExpiry = normalizeCsvDate(getCsvValue(row, ['license_expiry', 'license expiry'])) || null;
          const restrictionCodes = toCsvList(getCsvValue(row, ['restriction_codes', 'restriction codes']));
          const yearsDriving = getCsvValue(row, ['years_driving', 'years driving', 'driving experience', 'yearsdriving']) || null;
          const truckKnowledge = getCsvValue(row, ['truck_knowledge', 'truck knowledge']);
          const vehicleTypes = toCsvList(getCsvValue(row, ['vehicles_driven', 'vehicles driven', 'vehicle types', 'vehicle_types']));
          const troubleshootingTasks = toCsvList(getCsvValue(row, ['troubleshooting_tasks', 'troubleshooting tasks']));

          const employeeTypeCsv = getCsvValue(row, ['employee_type', 'employeeType', 'type']) || '';
          const isDriver =
            /driver/i.test(String(employeeTypeCsv || position || '')) ||
            !!licenseClassification ||
            !!licenseExpiry ||
            (restrictionCodes && restrictionCodes.length > 0) ||
            !!yearsDriving ||
            (vehicleTypes && vehicleTypes.length > 0);

          if (!email || !isValidEmail(email)) return null;
          if (!fname || !lname) return null;
          if (!contactNumber || !/^09\d{9}$/.test(contactNumber)) return null;

          const requirements = {
            employeeType: isDriver ? 'driver' : 'helper',
            profile: {
              employed,
              dateAvailable: dateAvailable || null,
              maritalStatus,
              sex,
              unit_house_number,
              address: {
                street,
                province,
                city,
                barangay,
                zip,
              },
              ids: {
                hasSSS,
                hasPAGIBIG,
                hasTIN,
                hasPhilHealth,
              },
              education: {
                education,
                tertiarySchool,
                tertiaryYear,
                tertiaryProgram,
              },
              skills,
              specializedTraining,
              specializedYear,
              medical: {
                takingMedications,
                medicationReason,
                tookMedicalTest,
                medicalTestDate,
              },
            },
            driver: isDriver
              ? {
                  licenseClassification,
                  licenseExpiry,
                  restrictionCodes,
                  yearsDriving,
                  truckKnowledge: truckKnowledge ? (toCsvBool(truckKnowledge) ? 'yes' : 'no') : null,
                  vehicleTypes,
                  troubleshootingTasks,
                }
              : null,
            documents: [],
            importedFromCsv: true,
          };

          return {
            email,
            fname,
            mname: mname || null,
            lname,
            personal_email: personalEmail || null,
            contact_number: contactNumber || null,
            depot: depot || null,
            department: department || null,
            position: position || null,
            birthday: birthday || null,
            role: 'Employee',
            source: 'agency',
            agency_profile_id: auth.user.id,
            requirements,
          };
        })
        .filter(Boolean);

      if (mapped.length === 0) {
        setCsvError('No valid rows found. Required columns: email, firstname, lastname, contact.');
        setAddEmployeeSubmitting(false);
        return;
      }

      const emails = Array.from(new Set(mapped.map((r) => r.email)));
      const { data: existing } = await supabase
        .from('employees')
        .select('id,email')
        .in('email', emails);
      const existingEmails = new Set((existing || []).map((r) => String(r.email || '').toLowerCase()));

      const toInsert = mapped.filter((r) => !existingEmails.has(r.email));
      if (toInsert.length === 0) {
        setCsvError('All emails in this CSV already exist in the system.');
        setAddEmployeeSubmitting(false);
        return;
      }

      const { error: insertErr } = await supabase.from('employees').insert(toInsert);
      if (insertErr) throw insertErr;

      setAddEmployeeSuccess(`Imported ${toInsert.length} employee(s) successfully.`);
      await loadHired();
      setAlertMessage(`Imported ${toInsert.length} employee(s) successfully.`);
      setShowSuccessAlert(true);
      closeAddEmployeeModal();
    } catch (err) {
      console.error('CSV import error:', err);
      setCsvError(err?.message || String(err));
    } finally {
      setAddEmployeeSubmitting(false);
    }
  };

  // master department list (kept in sync with Employees.jsx)
  const departments = [
    "Operations Department",
    "Billing Department",
    "HR Department",
    "Security & Safety Department",
    "Collections Department",
    "Repairs and Maintenance Specialist",
  ];

  const restrictionCodesCatalog = [
    { code: '3', label: 'Code 3 (C equivalent)' },
    { code: 'b2', label: 'Code B2 (up to 1T vehicles)' },
    { code: 'c', label: 'Code C (1T and 2T vehicles)' },
  ];

  const vehicleTypesCatalog = [
    'Motorcycle',
    'Sedan',
    'SUV',
    'Van',
    'Pickup',
    'Truck (Light)',
    'Truck (Medium)',
    'Truck (Heavy)',
  ];

  const troubleshootingTasksCatalog = [
    'Tire change',
    'Battery jumpstart',
    'Basic engine check (fluids)',
    'Replace light bulbs/fuses',
    'Minor mechanical troubleshooting',
  ];

  const departmentToPositions = {
    "Operations Department": [
      "Driver",
      "Helper",
      "Rider/Messenger",
      "Base Dispatcher",
      "Site Coordinator",
      "Transport Coordinator",
      "Customer Service Representative",
    ],
    "Billing Department": [
      "Billing Specialist",
      "POD Specialist",
    ],
    "HR Department": [
      "HR Specialist",
      "Recruitment Specialist",
      "HR Manager",
    ],
    "Security & Safety Department": [
      "Safety Officer 2",
      "Safety Officer 3",
      "Security Officer",
    ],
    "Collections Department": [
      "Billing & Collections Specialist",
      "Charges Specialist",
    ],
    "Repairs and Maintenance Specialist": [
      "Diesel Mechanic",
      "Truck Refrigeration Technician",
      "Welder",
      "Tinsmith",
    ],
  };

  const getPositionsForDepartment = (department) => {
    if (department === "All") {
      const all = new Set();
      Object.values(departmentToPositions).forEach((list) => {
        (list || []).forEach((p) => all.add(p));
      });
      return Array.from(all);
    }

    // Backward-compat alias (in case existing data uses "and" instead of "&")
    if (department === "Security & Safety Department") {
      return departmentToPositions["Security & Safety Department"] || [];
    }

    return departmentToPositions[department] || [];
  };

  const normalizeDepartmentName = (name) => {
    if (!name) return "";
    return String(name).replace(/\s+/g, " ").trim().replace(/\sand\s/g, " & ");
  };

  const getDepartmentForPosition = (position) => {
    if (!position) return null;
    for (const [dept, list] of Object.entries(departmentToPositions)) {
      if ((list || []).includes(position)) return dept;
    }
    return null;
  };
  
  // Confirmation dialog state
  const [showRejectInterviewDialog, setShowRejectInterviewDialog] = useState(false);
  const [rescheduleNote, setRescheduleNote] = useState('');
  const [reschedulePreferredDate, setReschedulePreferredDate] = useState('');
  const [reschedulePreferredTimeFrom, setReschedulePreferredTimeFrom] = useState('');
  const [reschedulePreferredTimeTo, setReschedulePreferredTimeTo] = useState('');
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmCallback, setConfirmCallback] = useState(null);
  
  // Document requests state (for deployed employees)
  const [documentRequests, setDocumentRequests] = useState([]);
  
  // Requirements data for selected employee
  const [employeeRequirements, setEmployeeRequirements] = useState(null);
  const [loadingRequirements, setLoadingRequirements] = useState(false);
  const [employeeIsAgency, setEmployeeIsAgency] = useState(false);
  const [employeeDocuments, setEmployeeDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [resolvedEmployeeId, setResolvedEmployeeId] = useState(null);

  // Onboarding records (read-only for agency; sourced from HR uploads)
  const [onboardingItems, setOnboardingItems] = useState([]);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [onboardingError, setOnboardingError] = useState(null);
  const [onboardingRefreshTrigger, setOnboardingRefreshTrigger] = useState(0);

  // Assessment records state
  const [assessmentRecords, setAssessmentRecords] = useState([]);
  
  // Interview calendar state
  const [interviews, setInterviews] = useState([]);
  const [calendarActiveTab, setCalendarActiveTab] = useState('today'); // 'today', 'tomorrow', 'week'

  // Schedule mode (left panel)
  const [scheduleMode, setScheduleMode] = useState('interview'); // 'interview' | 'signing'

  // Track which scheduled interviews have been viewed (for red-dot indicator)
  const [viewedInterviewIds, setViewedInterviewIds] = useState(() => {
    try {
      const raw = localStorage.getItem('agencyViewedInterviewIds');
      const arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) return new Set();
      return new Set(arr.map(String));
    } catch {
      return new Set();
    }
  });

  const markInterviewViewed = (id) => {
    const key = String(id);
    setViewedInterviewIds((prev) => {
      const next = new Set(prev);
      next.add(key);
      try {
        localStorage.setItem('agencyViewedInterviewIds', JSON.stringify(Array.from(next)));
      } catch {
        // ignore storage failures
      }
      return next;
    });
  };

  const isInterviewViewed = (id) => viewedInterviewIds.has(String(id));

  // Track which signing schedules have been viewed (separate from interview schedules)
  const [viewedSigningScheduleIds, setViewedSigningScheduleIds] = useState(() => {
    try {
      const raw = localStorage.getItem('agencyViewedSigningScheduleIds');
      const arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) return new Set();
      return new Set(arr.map(String));
    } catch {
      return new Set();
    }
  });

  const markSigningScheduleViewed = (id) => {
    const key = String(id);
    setViewedSigningScheduleIds((prev) => {
      const next = new Set(prev);
      next.add(key);
      try {
        localStorage.setItem('agencyViewedSigningScheduleIds', JSON.stringify(Array.from(next)));
      } catch {
        // ignore storage failures
      }
      return next;
    });
  };

  const isSigningScheduleViewed = (id) => viewedSigningScheduleIds.has(String(id));

  useEffect(() => {
    if (!selectedEmployee) return;

    const hasInterviewSchedule = Boolean(
      selectedEmployee.interview_date ||
      selectedEmployee.interview_time ||
      selectedEmployee.interview_location
    );
    if (hasInterviewSchedule && selectedEmployee.id) {
      markInterviewViewed(selectedEmployee.id);
    }

    // Signing schedule (stored in payload conventions; always onsite)
    const rawPayload =
      selectedEmployee.payload ??
      selectedEmployee.raw?.payload ??
      {};

    let payloadObj = rawPayload;
    if (typeof payloadObj === 'string') {
      try {
        payloadObj = JSON.parse(payloadObj);
      } catch {
        payloadObj = {};
      }
    }

    const signingDate =
      payloadObj?.signing_date ??
      payloadObj?.signingDate ??
      payloadObj?.signing?.date ??
      payloadObj?.agreements?.signing?.date ??
      payloadObj?.agreement_signing?.date ??
      payloadObj?.agreementSigning?.date ??
      payloadObj?.agreement_signing_date ??
      null;

    if (signingDate && selectedEmployee.id) {
      markSigningScheduleViewed(selectedEmployee.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployee]);


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

  // ---------- Load endorsed employees (from applications table with endorsed=true) ----------
  const loadEndorsed = async () => {
    setEndorsedLoading(true);
    setEndorsedError(null);
    try {
      // Get current agency user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Error getting user:', userError);
        setEndorsedError('Unable to verify user');
        setEndorsedLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("applications")
        .select(
          `id,
           user_id,
           job_id,
           status,
           payload,
           endorsed,
           created_at,
           interview_date,
           interview_time,
           interview_location,
           interviewer,
           interview_confirmed,
           interview_details_file,
           assessment_results_file,
           appointment_letter_file,
           undertaking_file,
           application_form_file,
           undertaking_duties_file,
           pre_employment_requirements_file,
           id_form_file,
            job_posts:job_posts ( id, title, department, depot )`
        )
        .eq("endorsed", true)
          .neq("status", "retracted")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed loading endorsements:", error);
        setEndorsedError(error.message || String(error));
        setEndorsedEmployees([]);
      } else {
        const normalized = (data || []).map((r) => {
          let payload = r.payload;
          if (typeof payload === "string") {
            try { payload = JSON.parse(payload); } catch { payload = {}; }
          }

          if (payload?.endorsement_retracted || payload?.endorsementRetracted) {
            return null;
          }

          const app = payload?.applicant || payload?.form || payload || null;
          const meta = payload?.meta || {};

          const endorsedByProfileId =
            meta?.endorsed_by_profile_id ||
            meta?.endorsedByProfileId ||
            meta?.endorsed_by_agency_id ||
            meta?.endorsedByAgencyId ||
            null;

          const endorsedByAuthUserId =
            meta?.endorsed_by_auth_user_id ||
            meta?.endorsedByAuthUserId ||
            meta?.endorsed_by_user_id ||
            meta?.endorsedByUserId ||
            null;

          const first = app?.firstName || app?.fname || app?.first_name || null;
          const last = app?.lastName || app?.lname || app?.last_name || null;
          const middle = app?.middleName || app?.mname || null;

          const rawContact = app?.contactNumber || app?.phone || app?.contact || null;
          const emailFromContact =
            typeof rawContact === 'string' && rawContact.includes('@') ? rawContact : null;

          const emailRaw =
            app?.email ||
            app?.Email ||
            payload?.email ||
            payload?.Email ||
            emailFromContact ||
            null;
          const email = emailRaw ? normalizeEmail(emailRaw) : null;

          const contact =
            app?.contactNumber ||
            app?.phone ||
            (typeof app?.contact === 'string' && !app.contact.includes('@') ? app.contact : null) ||
            null;
          const pos = r.job_posts?.title || app?.position || null;
          const depot = r.job_posts?.depot || app?.depot || null;

          const displayName = [first, middle, last].filter(Boolean).join(" ").trim() || (app?.fullName || app?.name) || "Unnamed";

          // Normalize status: Only set to "deployed" if application status is "hired"
          // Otherwise, it's "pending" (even if employee exists, we check application status first)
          let status = "pending";
          const appStatus = (r.status || "").toLowerCase();
          if (appStatus === "hired") {
            status = "deployed";
          }

          // Check if employee exists in employees table to get employee ID
          let endorsedEmployeeId = null;
          let hasAgencyEmployee = false;

          if (hiredEmployees.length > 0) {
            const hiredEmp = findHiredEmployeeMatch({
              user_id: r.user_id || null,
              email,
              first,
              last,
              name: displayName,
              position: pos || null,
            });

            if (hiredEmp) {
              endorsedEmployeeId = hiredEmp.id;
              const isAgencyEmployee =
                hiredEmp.is_agency ||
                !!hiredEmp.agency_profile_id ||
                !!hiredEmp.endorsed_by_agency_id ||
                hiredEmp.source === "agency";
              hasAgencyEmployee = isAgencyEmployee;

              // Only update status to deployed if application status is also hired
              if (isAgencyEmployee && appStatus === "hired") {
                status = "deployed";
              }
            }
          }

          return {
            id: r.id,
            user_id: r.user_id || null,
            name: displayName,
            first,
            middle,
            last,
            email,
            contact,
            position: pos || null,
            depot: depot || null,
            status,
            agency_profile_id: endorsedByProfileId,
            endorsed_by_auth_user_id: endorsedByAuthUserId,
            payload,
            endorsed_employee_id: endorsedEmployeeId,
            job_id: r.job_id || null,
            created_at: r.created_at || null,
            // Interview fields
            interview_date: r.interview_date || null,
            interview_time: r.interview_time || null,
            interview_location: r.interview_location || null,
            interviewer: r.interviewer || null,
            interview_confirmed: r.interview_confirmed || null,
            interview_details_file: r.interview_details_file || payload?.interview_details_file || null,
            assessment_results_file: r.assessment_results_file || payload?.assessment_results_file || null,
            // Agreement file fields
            appointment_letter_file: r.appointment_letter_file || payload?.appointment_letter_file || null,
            undertaking_file: r.undertaking_file || payload?.undertaking_file || null,
            application_form_file: r.application_form_file || payload?.application_form_file || null,
            undertaking_duties_file: r.undertaking_duties_file || payload?.undertaking_duties_file || null,
            pre_employment_requirements_file: r.pre_employment_requirements_file || payload?.pre_employment_requirements_file || null,
            id_form_file: r.id_form_file || payload?.id_form_file || null,
            raw: r,
          };
        }).filter(item => {
          // Filter 1: Remove null items (already deployed agency employees)
          if (item === null) return false;

          // Filter 2: Only show endorsements made by the current agency
          // IMPORTANT: If the endorsement isn't explicitly stamped to an agency user, do not show it.
          const hasStamp = Boolean(item.agency_profile_id || item.endorsed_by_auth_user_id);
          if (!hasStamp) return false;

          if (item.agency_profile_id && item.agency_profile_id !== user.id) return false;
          if (item.endorsed_by_auth_user_id && item.endorsed_by_auth_user_id !== user.id) return false;

          return true;
        });

        setEndorsedEmployees(normalized);
      }
    } catch (err) {
      console.error("Unexpected endorsed load error:", err);
      setEndorsedError(String(err));
      setEndorsedEmployees([]);
    } finally {
      setEndorsedLoading(false);
    }
  };

  const loadRetractedEndorsements = async () => {
    setRetractedLoading(true);
    setRetractedError(null);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Error getting user:', userError);
        setRetractedError('Unable to verify user');
        setRetractedEndorsements([]);
        return;
      }

      const { data, error } = await supabase
        .from("applications")
        .select(
          `id,
           user_id,
           job_id,
           status,
           payload,
           endorsed,
           created_at,
           updated_at,
           job_posts:job_posts ( id, title, department, depot )`
        )
        .eq("status", "retracted")
        .eq("endorsed", true)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Failed loading retracted endorsements:", error);
        setRetractedError(error.message || String(error));
        setRetractedEndorsements([]);
        return;
      }

      const normalized = (data || []).map((r) => {
        let payload = r.payload;
        if (typeof payload === "string") {
          try { payload = JSON.parse(payload); } catch { payload = {}; }
        }

        const app = payload?.applicant || payload?.form || payload || null;
        const meta = payload?.meta || {};

        const endorsedByAuthUserId =
          meta?.endorsed_by_auth_user_id ||
          meta?.endorsedByAuthUserId ||
          meta?.endorsed_by_user_id ||
          meta?.endorsedByUserId ||
          payload?.endorsed_by_auth_user_id ||
          payload?.endorsedByAuthUserId ||
          null;

        if (!endorsedByAuthUserId || String(endorsedByAuthUserId) !== String(user.id)) {
          return null;
        }

        const first = app?.firstName || app?.fname || app?.first_name || null;
        const last = app?.lastName || app?.lname || app?.last_name || null;
        const middle = app?.middleName || app?.mname || null;
        const pos = r.job_posts?.title || app?.position || null;
        const depot = r.job_posts?.depot || app?.depot || null;
        const email = app?.email || app?.contact || payload?.email || payload?.contact || null;
        const displayName = [first, middle, last].filter(Boolean).join(" ").trim() || (app?.fullName || app?.name) || "Unnamed";

        return {
          id: r.id,
          name: displayName,
          email,
          position: pos || null,
          depot: depot || null,
          status: 'retracted',
          agency: true,
          retractedAt: r.updated_at || r.created_at || null,
          payload,
          raw: r,
        };
      }).filter(Boolean);

      setRetractedEndorsements(normalized);
    } catch (err) {
      console.error("Unexpected retracted endorsements load error:", err);
      setRetractedError(String(err));
      setRetractedEndorsements([]);
    } finally {
      setRetractedLoading(false);
    }
  };

  // ---------- Load hired employees (employees table) ----------
  const loadHired = async () => {
    setHiredLoading(true);
    setHiredError(null);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Error getting user:', userError);
        setHiredError('Unable to verify user');
        setHiredEmployees([]);
        return;
      }

      const { data, error } = await supabase
        .from("employees")
        .select("id, auth_user_id, email, fname, lname, mname, contact_number, position, depot, department, hired_at, created_at, agency_profile_id, endorsed_by_agency_id, is_agency, source, status, requirements, birthday, personal_email")
        // Only include employees that belong to the current agency.
        .or(`agency_profile_id.eq.${user.id},endorsed_by_agency_id.eq.${user.id}`)
        .neq("source", "internal")
        .order("hired_at", { ascending: false });

      if (error) {
        console.error("Failed loading employees:", error);
        setHiredError(error.message || String(error));
        setHiredEmployees([]);
      } else {
        const normalized = (data || [])
          // Double-check: explicitly filter out any employees with source: "internal"
          .filter((r) => r.source !== "internal")
          .map((r) => {
            const name = [r.fname, r.mname, r.lname].filter(Boolean).join(" ").trim() || r.email || "Unnamed";
            const employmentStatus =
              r.status === "Probationary" ? "Under Probation" :
              r.status === "Regular" ? "Regular" :
              (r.status || null);
            return {
              id: r.id,
              name,
              auth_user_id: r.auth_user_id || null,
              email: r.email || null,
              personal_email: r.personal_email || null,
              contact: r.contact_number || null,
              position: r.position || "Employee",
              depot: r.depot || null,
              department: r.department || null,
              birthday: r.birthday || null,
              hired_at: r.hired_at || null,
              created_at: r.created_at || null,
              agency_profile_id: r.agency_profile_id || null,
              endorsed_by_agency_id: r.endorsed_by_agency_id || null,
              is_agency: !!r.is_agency,
              source: r.source || null,
              status: r.status || null,
              employmentStatus,
              requirements: r.requirements && typeof r.requirements === 'object' ? r.requirements : null,
              agency: true,
              raw: r,
            };
          });

        setHiredEmployees(normalized);
      }
    } catch (err) {
      console.error("Unexpected hired load error:", err);
      setHiredError(String(err));
      setHiredEmployees([]);
    } finally {
      setHiredLoading(false);
    }
  };

  // ---------- Fetch interviews for calendar ----------
  const fetchInterviews = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Error getting user:', userError);
        return;
      }

      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          interview_date,
          interview_time,
          interview_location,
          status,
          payload,
          endorsed,
          job_posts:job_posts ( title )
        `)
        .eq('endorsed', true)
        .not('interview_date', 'is', null)
        .order('interview_date', { ascending: true });

      if (error) throw error;

      const formatted = (data || []).map(app => {
        // Parse payload if it's a string
        let payloadObj = app.payload || {};
        if (typeof payloadObj === 'string') {
          try { payloadObj = JSON.parse(payloadObj); } catch { payloadObj = {}; }
        }

        const meta = payloadObj?.meta || {};
        const endorsedByProfileId =
          meta?.endorsed_by_profile_id ||
          meta?.endorsedByProfileId ||
          meta?.endorsed_by_agency_id ||
          meta?.endorsedByAgencyId ||
          null;
        const endorsedByAuthUserId =
          meta?.endorsed_by_auth_user_id ||
          meta?.endorsedByAuthUserId ||
          meta?.endorsed_by_user_id ||
          meta?.endorsedByUserId ||
          null;

        // If not explicitly stamped to this agency, ignore.
        const hasStamp = Boolean(endorsedByProfileId || endorsedByAuthUserId);
        if (!hasStamp) return null;
        if (endorsedByProfileId && endorsedByProfileId !== user.id) return null;
        if (endorsedByAuthUserId && endorsedByAuthUserId !== user.id) return null;
        
        // For endorsed applicants, get name from payload.applicant or payload.form
        let applicant_name = 'Unknown';
        const applicantData = payloadObj.applicant || payloadObj.form || {};
        const fname = applicantData.firstName || applicantData.fname || '';
        const lname = applicantData.lastName || applicantData.lname || '';
        if (fname || lname) {
          applicant_name = `${fname} ${lname}`.trim();
        }
        
        // Get source for position extraction
        const source = payloadObj.form || payloadObj.applicant || payloadObj || {};
        
        // Get position/title - prioritize job_posts.title, then payload fields
        const position = app.job_posts?.title ?? source.position ?? source.title ?? 'Position Not Set';
        const interview_type = payloadObj.interview_type || source.interview_type || 'onsite';
        
        return {
          id: app.id,
          applicant_name,
          position,
          time: app.interview_time,
          date: app.interview_date,
          location: app.interview_location,
          status: app.status,
          interview_type
        };
      });

      setInterviews(formatted
        .filter(Boolean)
        .filter(i => (i.status || '').toLowerCase() !== 'hired')
      );
    } catch (err) {
      console.error('Error fetching interviews:', err);
    }
  };

  const parsePayloadObject = (payload) => {
    if (!payload) return {};
    if (typeof payload === 'object') return payload;
    if (typeof payload === 'string') {
      try {
        const obj = JSON.parse(payload);
        return obj && typeof obj === 'object' ? obj : {};
      } catch {
        return {};
      }
    }
    return {};
  };

  const getSigningScheduleFromApplication = (app) => {
    const payloadObj = parsePayloadObject(app?.payload ?? app?.raw?.payload ?? {});

    const signingDate =
      app?.agreement_signing_date ??
      payloadObj?.signing_date ??
      payloadObj?.signingDate ??
      payloadObj?.signing?.date ??
      payloadObj?.agreements?.signing?.date ??
      payloadObj?.agreement_signing?.date ??
      payloadObj?.agreementSigning?.date ??
      payloadObj?.agreement_signing_date ??
      null;
    const signingTime =
      app?.agreement_signing_time ??
      payloadObj?.signing_time ??
      payloadObj?.signingTime ??
      payloadObj?.signing?.time ??
      payloadObj?.agreements?.signing?.time ??
      payloadObj?.agreement_signing?.time ??
      payloadObj?.agreementSigning?.time ??
      payloadObj?.agreement_signing_time ??
      null;
    const signingLocation =
      app?.agreement_signing_location ??
      payloadObj?.signing_location ??
      payloadObj?.signingLocation ??
      payloadObj?.signing?.location ??
      payloadObj?.agreements?.signing?.location ??
      payloadObj?.agreement_signing?.location ??
      payloadObj?.agreementSigning?.location ??
      payloadObj?.agreement_signing_location ??
      null;

    if (!signingDate && !signingTime) return null;
    return {
      date: signingDate,
      time: signingTime,
      location: signingLocation || null,
    };
  };

  const signingSchedules = React.useMemo(() => {
    const list = (endorsedEmployees || [])
      .filter((app) => (String(app?.status || '').toLowerCase() !== 'hired'))
      .map((app) => {
        const payloadObj = parsePayloadObject(app?.payload ?? app?.raw?.payload ?? {});
        const applicantData = payloadObj?.applicant || payloadObj?.form || {};
        const fname = applicantData.firstName || applicantData.fname || '';
        const lname = applicantData.lastName || applicantData.lname || '';
        const applicant_name = (fname || lname) ? `${fname} ${lname}`.trim() : (app?.applicant_name || 'Unknown');

        const source = payloadObj?.form || payloadObj?.applicant || payloadObj || {};
        const position = app?.job_posts?.title ?? source.position ?? source.title ?? app?.position ?? 'Position Not Set';

        const sched = getSigningScheduleFromApplication({ ...app, payload: payloadObj });
        if (!sched) return null;

        return {
          id: app.id,
          applicant_name,
          position,
          date: sched.date,
          time: sched.time,
          location: sched.location,
          interview_type: 'onsite',
        };
      })
      .filter(Boolean);

    // Sort by date, then time (best-effort)
    return list.sort((a, b) => {
      const ad = String(a.date || '');
      const bd = String(b.date || '');
      if (ad !== bd) return ad.localeCompare(bd);
      const at = String(a.time || '');
      const bt = String(b.time || '');
      return at.localeCompare(bt);
    });
  }, [endorsedEmployees]);

  // Calendar helper functions
  const formatTime = (time24) => {
    if (!time24) return 'N/A';
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const getTodayInterviews = () => {
    const today = new Date().toISOString().split('T')[0];
    return interviews.filter(i => i.date === today);
  };

  const getTomorrowInterviews = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    return interviews.filter(i => i.date === tomorrowStr);
  };

  const getThisWeekInterviews = () => {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    const todayStr = today.toISOString().split('T')[0];
    const nextWeekStr = nextWeek.toISOString().split('T')[0];
    return interviews.filter(i => i.date >= todayStr && i.date <= nextWeekStr);
  };

  const getActiveInterviews = () => {
    if (calendarActiveTab === 'today') return getTodayInterviews();
    if (calendarActiveTab === 'tomorrow') return getTomorrowInterviews();
    if (calendarActiveTab === 'week') return getThisWeekInterviews();
    return [];
  };

  const getTodaySigningSchedules = () => {
    const today = new Date().toISOString().split('T')[0];
    return signingSchedules.filter((i) => i.date === today);
  };

  const getTomorrowSigningSchedules = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    return signingSchedules.filter((i) => i.date === tomorrowStr);
  };

  const getThisWeekSigningSchedules = () => {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    const todayStr = today.toISOString().split('T')[0];
    const nextWeekStr = nextWeek.toISOString().split('T')[0];
    return signingSchedules.filter((i) => i.date >= todayStr && i.date <= nextWeekStr);
  };

  const getActiveSchedules = () => {
    if (scheduleMode === 'signing') {
      if (calendarActiveTab === 'today') return getTodaySigningSchedules();
      if (calendarActiveTab === 'tomorrow') return getTomorrowSigningSchedules();
      if (calendarActiveTab === 'week') return getThisWeekSigningSchedules();
      return [];
    }
    return getActiveInterviews();
  };

  const hasNewScheduleInTab = (tabKey) => {
    const list =
      scheduleMode === 'signing'
        ? tabKey === 'today'
          ? getTodaySigningSchedules()
          : tabKey === 'tomorrow'
          ? getTomorrowSigningSchedules()
          : tabKey === 'week'
          ? getThisWeekSigningSchedules()
          : []
        : tabKey === 'today'
          ? getTodayInterviews()
          : tabKey === 'tomorrow'
          ? getTomorrowInterviews()
          : tabKey === 'week'
          ? getThisWeekInterviews()
          : [];

    return list.some((i) =>
      scheduleMode === 'signing' ? !isSigningScheduleViewed(i.id) : !isInterviewViewed(i.id)
    );
  };

  const getTabTitle = () => {
    if (calendarActiveTab === 'today') return 'Today';
    if (calendarActiveTab === 'tomorrow') return 'Tomorrow';
    if (calendarActiveTab === 'week') return 'This Week';
    return 'Interviews';
  };

  const getTabDate = () => {
    const formatDate = (date) => {
      const options = { month: 'long', day: 'numeric', year: 'numeric' };
      return new Date(date).toLocaleDateString('en-US', options);
    };

    if (calendarActiveTab === 'today') {
      return formatDate(new Date());
    }
    if (calendarActiveTab === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return formatDate(tomorrow);
    }
    if (calendarActiveTab === 'week') {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      return `${formatDate(today)} - ${formatDate(nextWeek)}`;
    }
    return '';
  };

  const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

  const parseRequirementsObject = (req) => {
    if (!req) return null;
    if (typeof req === 'string') {
      try {
        return parseRequirementsObject(JSON.parse(req));
      } catch {
        return null;
      }
    }
    if (typeof req !== 'object') return null;
    return req;
  };

  const getJobRoleForEligibility = (job) => {
    const title = String(job?.title || '').toLowerCase();
    if (!title) return null;
    if (title.includes('driver')) return 'driver';
    if (title.includes('helper')) return 'helper';
    return null;
  };

  const isValidContactPH = (contact) => {
    const s = String(contact || '').trim();
    return /^09\d{9}$/.test(s);
  };

  const getEmployeeMissingFieldsForRole = (employee, role) => {
    const missing = [];
    const raw = employee?.raw || employee || {};
    const req = parseRequirementsObject(employee?.requirements) || parseRequirementsObject(raw?.requirements) || {};
    const profile = (req?.profile && typeof req.profile === 'object') ? req.profile : {};
    const address = (profile?.address && typeof profile.address === 'object') ? profile.address : {};
    const education = (profile?.education && typeof profile.education === 'object') ? profile.education : {};
    const driver = (req?.driver && typeof req.driver === 'object') ? req.driver : {};
    const documents = Array.isArray(req?.documents) ? req.documents : [];

    const fname = raw?.fname || raw?.firstName || raw?.first_name || null;
    const lname = raw?.lname || raw?.lastName || raw?.last_name || null;
    const email = raw?.email || employee?.email || null;
    const contact = raw?.contact_number || employee?.contact || raw?.contact || null;
    const depot = raw?.depot || employee?.depot || null;
    const department = raw?.department || employee?.department || null;
    const position = raw?.position || employee?.position || null;
    const birthday = raw?.birthday || employee?.birthday || null;

    if (!fname) missing.push('First Name');
    if (!lname) missing.push('Last Name');
    if (!email) missing.push('Email Address');
    if (!contact || !isValidContactPH(contact)) missing.push('Contact Number (must be 11 digits starting with 09)');
    if (!depot) missing.push('Depot Assignment');
    if (!department) missing.push('Department');
    if (!position) missing.push('Position');
    if (!birthday) missing.push('Birthday');

    if (!profile?.sex) missing.push('Sex');
    if (!profile?.maritalStatus) missing.push('Marital Status');

    if (!address?.street) missing.push('Street Address');
    if (!address?.barangay) missing.push('Barangay');
    if (!address?.city) missing.push('City / Municipality');
    if (!address?.province) missing.push('Province');
    if (!address?.zip || !/^\d{4}$/.test(String(address.zip || '').trim())) missing.push('ZIP Code (4 digits)');

    const eduLevel = String(education?.education || '').trim();
    if (!eduLevel) {
      missing.push('Educational Level');
    } else if (eduLevel !== 'N/A') {
      if (!String(education?.tertiarySchool || '').trim()) missing.push('School/Institution Name');
      if (!String(education?.tertiaryProgram || '').trim()) missing.push('Course/Program');
      if (!/^\d{4}$/.test(String(education?.tertiaryYear || '').trim())) missing.push('Year Graduated (4 digits)');
    }

    if (role === 'driver') {
      if (!String(driver?.licenseClassification || '').trim()) missing.push('License Classification');
      if (!String(driver?.licenseExpiry || '').trim()) missing.push('License Expiry Date');
      if (!Array.isArray(driver?.restrictionCodes) || driver.restrictionCodes.length < 1) missing.push('Restriction Codes (select at least 1)');
      if (!String(driver?.yearsDriving ?? '').trim()) missing.push('Years of Driving Experience');
      if (!String(driver?.truckKnowledge || '').trim()) missing.push('Basic truck troubleshooting knowledge (Yes/No)');
      if (!Array.isArray(driver?.vehicleTypes) || driver.vehicleTypes.length < 1) missing.push('Vehicles Driven (select at least 1)');

      const hasLicenseDoc = documents.some((d) => {
        const key = String(d?.key || d?.type || d?.name || '').toLowerCase();
        const fp = d?.file_path || d?.filePath || d?.path || null;
        if (!fp) return false;
        return key.includes('license') || key.includes('drivers_license') || key.includes('license_photocopy');
      });
      if (!hasLicenseDoc) missing.push('License Photocopy (upload)');
    }

    return missing;
  };

  const extractApplicantFromPayload = (payload) => {
    if (!payload) return null;
    if (typeof payload === 'string') {
      try {
        return extractApplicantFromPayload(JSON.parse(payload));
      } catch {
        return null;
      }
    }
    return payload?.applicant || payload?.form || payload || null;
  };

  const extractEmailFromApplicationPayload = (payload) => {
    const app = extractApplicantFromPayload(payload);
    const raw =
      app?.email ||
      app?.Email ||
      app?.contact ||
      app?.contactNumber ||
      payload?.email ||
      payload?.Email ||
      payload?.contact ||
      null;
    if (typeof raw !== 'string') return null;
    if (!raw.includes('@')) return null;
    return normalizeEmail(raw);
  };

  const closeJobPicker = () => {
    setShowJobPickerModal(false);
    setJobPickerLoading(false);
    setJobPickerSubmitting(false);
    setJobPickerError(null);
    setJobPickerSuccess(null);
    setJobPickerQuery('');
    setJobPickerJobs([]);
    setEmployeeToEndorse(null);
  };

  const openEditEmployeeFromJobPicker = (emp) => {
    // Bring the user back to My Employees and open the employee detail panel.
    // Editing itself is handled in the My Employees detail panel (Edit button).
    closeJobPicker();
    setEndorsementsTab('myEmployees');
    setSelectedEmployee(emp);
    setEmployeeDetailTab('profiling');
    setEmployeeEditDraft(makeEmployeeEditDraft(emp));
    setAutoEditEmployeeId(emp?.id != null ? String(emp.id) : null);
  };

  const endorseExistingEmployeeToJob = async (job) => {
    setJobPickerSubmitting(true);
    setJobPickerError(null);
    setJobPickerSuccess(null);

    try {
      const employee = employeeToEndorse;
      if (!employee) throw new Error('No employee selected for endorsement.');
      if (!job?.id) throw new Error('No job selected.');

      // Eligibility gate for Driver/Helper job posts
      const role = getJobRoleForEligibility(job);
      if (role === 'driver' || role === 'helper') {
        const missing = getEmployeeMissingFieldsForRole(employee, role);
        if (missing.length > 0) {
          const headline = role === 'driver'
            ? 'This employee cannot be endorsed to a Driver job post yet.'
            : 'This employee cannot be endorsed to a Helper job post yet.';

          const msg = `${headline}\n\nMissing / incomplete information:\n- ${missing.join('\n- ')}\n\nTo proceed, open this employee in “My Employees” and add the missing information (Profiling / Driver Details), then try endorsing again.`;
          setJobPickerError(msg);
          setJobPickerSubmitting(false);
          return;
        }
      }

      const empEmail = normalizeEmail(employee.email);
      if (!empEmail) throw new Error('Employee email is required to endorse.');

      const { data: authRes, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authRes?.user) throw new Error('Unable to verify user.');
      const user = authRes.user;

      const applicant = {
        fname: employee?.raw?.fname || employee?.fname || employee?.first || employee?.firstName || null,
        mname: employee?.raw?.mname || employee?.mname || employee?.middle || employee?.middleName || null,
        lname: employee?.raw?.lname || employee?.lname || employee?.last || employee?.lastName || null,
        firstName: employee?.raw?.fname || employee?.fname || employee?.first || employee?.firstName || null,
        middleName: employee?.raw?.mname || employee?.mname || employee?.middle || employee?.middleName || null,
        lastName: employee?.raw?.lname || employee?.lname || employee?.last || employee?.lastName || null,
        email: employee.email,
        contactNumber: employee.contact || employee.contact_number || employee?.raw?.contact_number || null,
        contact: employee.contact || employee.contact_number || employee?.raw?.contact_number || null,
        depot: employee.depot || employee?.raw?.depot || null,
        position: employee.position || employee?.raw?.position || null,
        department: employee.department || employee?.raw?.department || null,
        fullName: employee.name || null,
      };

      const payload = {
        applicant,
        form: applicant,
        job: {
          id: job.id,
          title: job.title || null,
          depot: job.depot || null,
          department: job.department || null,
        },
        meta: {
          endorsed_by_auth_user_id: user.id,
          endorsed_by_profile_id: user.id,
          endorsed_at: new Date().toISOString(),
          endorsement_source: 'employee_pool',
          employee_id: employee.id,
        },
      };

      // Try to find existing endorsement by matching email for the same job
      let existing = null;
      try {
        const { data: apps, error: appsErr } = await supabase
          .from('applications')
          .select('id, payload, endorsed, status')
          .eq('job_id', job.id)
          .eq('endorsed', true)
          .neq('status', 'retracted');

        if (!appsErr && Array.isArray(apps) && apps.length > 0) {
          const match = apps.find((a) => extractEmailFromApplicationPayload(a.payload) === empEmail);
          if (match) existing = match;
        }
      } catch {
        // If lookup fails, proceed with insert
      }

      let applicationId = null;
      if (existing?.id) {
        const { data: updated, error: updErr } = await supabase
          .from('applications')
          .update({ payload, status: 'submitted', endorsed: true })
          .eq('id', existing.id)
          .select('id')
          .maybeSingle();

        if (updErr) throw updErr;
        applicationId = updated?.id || existing.id;
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from('applications')
          .insert([{ job_id: job.id, payload, status: 'submitted', endorsed: true }])
          .select('id')
          .maybeSingle();

        if (insErr) throw insErr;
        applicationId = inserted?.id || null;
      }

      // Notify HR users
      if (applicationId) {
        try {
          const { data: hrUsers, error: hrError } = await supabase
            .from('profiles')
            .select('id, role, depot')
            .in('role', ['HR', 'HRC']);

          if (!hrError && hrUsers && hrUsers.length > 0) {
            const applicantName = employee.name || 'Unknown Employee';
            const positionTitle = job.title || 'Unknown Position';
            const jobDepot = job.depot || null;

            for (const hrUser of hrUsers) {
              if (hrUser.role === 'HRC' && hrUser.depot && jobDepot && hrUser.depot !== jobDepot) {
                continue;
              }

              await createNotification({
                userId: hrUser.id,
                applicationId,
                type: 'application',
                title: 'New Agency Endorsement',
                message: `${applicantName} was endorsed by agency for ${positionTitle}`,
                userType: 'profile',
              });
            }
          }
        } catch (notifError) {
          console.error('Error creating HR notifications:', notifError);
        }
      }

      setJobPickerSuccess('Employee endorsed successfully.');
      setAlertMessage('Employee endorsed successfully.');
      setShowSuccessAlert(true);
      closeJobPicker();
      setEndorsementsTab('pending');
      setSelectedEmployee(null);
      await loadEndorsed();
    } catch (err) {
      console.error('Endorse employee error:', err);
      setJobPickerError(err?.message || String(err));
    } finally {
      setJobPickerSubmitting(false);
    }
  };

  const normalizeNameToken = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

  const getPersonKey = ({ first, last, name }) => {
    const f = normalizeNameToken(first);
    const l = normalizeNameToken(last);
    if (f && l) return `${f}|${l}`;
    const n = normalizeNameToken(name);
    if (!n) return null;
    const parts = n.split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0]}|${parts[parts.length - 1]}`;
    return n;
  };

  const findHiredEmployeeMatch = (emp) => {
    if (!Array.isArray(hiredEmployees) || hiredEmployees.length === 0 || !emp) return null;

    // 1) Prefer auth_user_id match
    if (emp.user_id) {
      const byUser = hiredEmployees.find((h) => h?.auth_user_id && String(h.auth_user_id) === String(emp.user_id));
      if (byUser) return byUser;
    }

    // 2) Then email match
    const keyEmail = normalizeEmail(emp.email);
    if (keyEmail) {
      const byEmail = hiredEmployees.find((h) => normalizeEmail(h?.email) === keyEmail);
      if (byEmail) return byEmail;
    }

    // 3) Finally, name match (best-effort)
    const empKey = getPersonKey({ first: emp.first, last: emp.last, name: emp.name });
    if (!empKey) return null;

    const posNorm = normalizeNameToken(emp.position);
    const candidates = hiredEmployees.filter((h) => {
      const hKey = getPersonKey({ first: h?.raw?.fname, last: h?.raw?.lname, name: h?.name });
      return hKey && hKey === empKey;
    });
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    const byPos = posNorm ? candidates.find((h) => normalizeNameToken(h?.position) === posNorm) : null;
    return byPos || candidates[0];
  };

  // Sync endorsed list with agency-sourced employees
  // - If an endorsed application has a matching agency employee, mark it as deployed and link employee row
  // - If there is an agency employee without an application row (but still endorsed/from agency), add it to the list as deployed
  // NOTE: Depend only on hiredEmployees to avoid infinite loops
  useEffect(() => {
    if (hiredEmployees.length === 0) return;

    setEndorsedEmployees(prev => {
      const existing = prev || [];

      // Map emails to existing endorsement entries for quick lookup
      const byEmail = new Map(
        existing
          .filter(e => e.email)
          .map(e => [normalizeEmail(e.email), e])
      );

      const byAuthUserId = new Map(
        existing
          .filter(e => e.user_id)
          .map(e => [String(e.user_id), e])
      );

      // First, update existing endorsements that now have an employee row
      const updatedList = existing.map((emp) => {
        const hiredEmp = findHiredEmployeeMatch(emp);
        if (!hiredEmp) return emp;

        // Explicitly exclude internal/direct applicants
        if (hiredEmp.source === "internal") return emp;

        const isAgencyEmployee =
          hiredEmp.is_agency ||
          !!hiredEmp.agency_profile_id ||
          !!hiredEmp.endorsed_by_agency_id ||
          hiredEmp.source === "agency";

        if (!isAgencyEmployee) return emp;

        // Only set to deployed if the underlying application status is "hired"
        const appStatus = (emp.raw?.status || "").toLowerCase();
        const isDeployedFromApp = appStatus === "hired";

        return {
          ...emp,
          status: isDeployedFromApp ? "deployed" : emp.status,
          endorsed_employee_id: hiredEmp.id,
          // Prefer employee position/depot if application data is missing
          position: emp.position || hiredEmp.position || "Employee",
          depot: emp.depot || hiredEmp.depot || null,
          employmentStatus: emp.employmentStatus || hiredEmp.employmentStatus || null,
          agency: true,
        };
      });

      // Final dedupe: if both an application row and a synthetic employee row exist, keep the application row.
      const indexByKey = new Map();
      const deduped = [];
      for (const item of updatedList) {
        const key = item?.user_id
          ? `u:${String(item.user_id)}`
          : item?.email
            ? `e:${normalizeEmail(item.email)}`
            : `id:${String(item?.id || '')}`;

        if (!indexByKey.has(key)) {
          indexByKey.set(key, deduped.length);
          deduped.push(item);
          continue;
        }

        const idx = indexByKey.get(key);
        const existingItem = deduped[idx];
        const existingIsEmp = String(existingItem?.id || '').startsWith('emp-');
        const currentIsEmp = String(item?.id || '').startsWith('emp-');

        if (existingIsEmp && !currentIsEmp) {
          deduped[idx] = item;
        }
      }

      // If an employee-backed synthetic row exists alongside an application row linked
      // to the same employee id, drop the synthetic row.
      const appEmployeeIds = new Set(
        deduped
          .filter((x) => !String(x?.id || '').startsWith('emp-'))
          .map((x) => x?.endorsed_employee_id)
          .filter(Boolean)
      );

      return deduped.filter((x) => {
        const isEmpRow = String(x?.id || '').startsWith('emp-');
        if (!isEmpRow) return true;
        if (!x?.endorsed_employee_id) return true;
        return !appEmployeeIds.has(x.endorsed_employee_id);
      });
    });
  }, [hiredEmployees]);

  const depotOptions = React.useMemo(() => {
    const set = new Set();
    for (const e of endorsedEmployees || []) {
      const d = e?.depot ? String(e.depot).trim() : "";
      if (d && d !== "—" && d !== "None") set.add(d);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [endorsedEmployees]);

  const positions = React.useMemo(() => {
    const list = getPositionsForDepartment(departmentFilter);
    return ["All", ...list.sort((a, b) => a.localeCompare(b))];
  }, [departmentFilter]);

  useEffect(() => {
    if (positionFilter === "All") return;
    const allowed = new Set(getPositionsForDepartment(departmentFilter));
    if (!allowed.has(positionFilter)) setPositionFilter("All");
  }, [departmentFilter, positionFilter]);

  const employmentStatuses = ["All", "Regular", "Under Probation", "Part Time"];

  const getIsAgency = (emp) => {
    if (!emp) return false;
    if (emp?.agency === true) return true;
    if (emp?.raw?.source === 'agency') return true;
    if (emp?.raw?.from === 'agency') return true;
    if (emp?.agency_profile_id) return true;
    return false;
  };

  // Hide employees from "My Employees" once they are already in the endorsed list
  // (pending or deployed), so they don't show up in two tabs at once.
  const visibleHiredEmployees = React.useMemo(() => {
    const pool = Array.isArray(hiredEmployees) ? hiredEmployees : [];
    const endorsements = Array.isArray(endorsedEmployees) ? endorsedEmployees : [];
    if (pool.length === 0 || endorsements.length === 0) return pool;

    const endorsedEmployeeIds = new Set();
    const endorsedEmails = new Set();

    for (const e of endorsements) {
      if (!e) continue;

      // If the application was rejected by HR, it should return to My Employees.
      const rawStatus = String(e?.raw?.status || '').toLowerCase();
      if (rawStatus === 'rejected') continue;

      if (e.endorsed_employee_id != null) endorsedEmployeeIds.add(String(e.endorsed_employee_id));

      const meta = e?.payload?.meta || {};
      const metaEmpId = meta?.employee_id || meta?.employeeId || meta?.employeeID || null;
      if (metaEmpId != null) endorsedEmployeeIds.add(String(metaEmpId));

      const emailKey = normalizeEmail(e?.email);
      if (emailKey) endorsedEmails.add(emailKey);
    }

    return pool.filter((emp) => {
      if (!emp) return false;
      if (emp?.id != null && endorsedEmployeeIds.has(String(emp.id))) return false;
      const key = normalizeEmail(emp?.email);
      if (key && endorsedEmails.has(key)) return false;
      return true;
    });
  }, [hiredEmployees, endorsedEmployees]);

  const filteredEmployees = React.useMemo(() => {
    const [sortKey, sortDir] = String(sortOption || "name-asc").split("-");
    const isAsc = sortDir === "asc";
    const searchLower = String(endorsementsSearch || "").trim().toLowerCase();

    const getEmploymentStatus = (emp) => {
      if (emp?.employmentStatus) return emp.employmentStatus;
      const hiredById = emp?.endorsed_employee_id
        ? hiredEmployees.find(h => h.id === emp.endorsed_employee_id)
        : null;
      if (hiredById?.employmentStatus) return hiredById.employmentStatus;

      const key = normalizeEmail(emp?.email);
      if (!key) return null;
      const hiredByEmail = hiredEmployees.find((h) => normalizeEmail(h?.email) === key);
      return hiredByEmail?.employmentStatus || null;
    };

    const getHiredAt = (emp) => {
      const hiredById = emp?.endorsed_employee_id
        ? hiredEmployees.find(h => h.id === emp.endorsed_employee_id)
        : null;
      if (hiredById?.hired_at) return hiredById.hired_at;

      const key = normalizeEmail(emp?.email);
      if (!key) return null;
      const hiredByEmail = hiredEmployees.find((h) => normalizeEmail(h?.email) === key);
      return hiredByEmail?.hired_at || null;
    };

    const sourceList = endorsementsTab === 'myEmployees'
      ? (visibleHiredEmployees || [])
      : endorsementsTab === 'retracted'
        ? (retractedEndorsements || [])
        : (endorsedEmployees || []);

    return sourceList
      .filter((emp) => {
        if (endorsementsTab === 'myEmployees') return true;
        if (endorsementsTab === 'retracted') return true;
        return emp?.status === endorsementsTab;
      })
      .filter((emp) => {
        if (!searchLower) return true;
        return (
          String(emp?.name || "").toLowerCase().includes(searchLower) ||
          String(emp?.position || "").toLowerCase().includes(searchLower) ||
          String(emp?.depot || "").toLowerCase().includes(searchLower) ||
          String(emp?.status || "").toLowerCase().includes(searchLower) ||
          String(emp?.employmentStatus || "").toLowerCase().includes(searchLower) ||
          String(emp?.id || "").toLowerCase().includes(searchLower)
        );
      })
      .filter((emp) => {
        if (departmentFilter === "All") return true;
        const derived = getDepartmentForPosition(emp?.position);
        return normalizeDepartmentName(derived) === normalizeDepartmentName(departmentFilter);
      })
      .filter((emp) => positionFilter === "All" || emp?.position === positionFilter)
      .filter((emp) => {
        if (depotFilter === "All") return true;
        return String(emp?.depot || "") === depotFilter;
      })
      .filter((emp) => {
        if (employmentStatusFilter === "All") return true;
        return getEmploymentStatus(emp) === employmentStatusFilter;
      })
      .sort((a, b) => {
        if (sortKey === "hired") {
          const at = getHiredAt(a) ? new Date(getHiredAt(a)).getTime() : null;
          const bt = getHiredAt(b) ? new Date(getHiredAt(b)).getTime() : null;

          if (at == null && bt == null) return 0;
          if (at == null) return 1;
          if (bt == null) return -1;

          return isAsc ? at - bt : bt - at;
        }

        const an = String(a?.name || "");
        const bn = String(b?.name || "");
        return isAsc ? an.localeCompare(bn) : bn.localeCompare(an);
      });
  }, [endorsedEmployees, retractedEndorsements, hiredEmployees, visibleHiredEmployees, endorsementsTab, endorsementsSearch, departmentFilter, positionFilter, depotFilter, employmentStatusFilter, sortOption]);

  // Keep selectedEmployee in sync with latest endorsedEmployees data
  useEffect(() => {
    const selectedId = selectedEmployee?.id;
    if (!selectedId) return;
    const backingList = endorsementsTab === 'myEmployees'
      ? hiredEmployees
      : endorsedEmployees;
    const updated = (backingList || []).find((e) => e?.id === selectedId);
    if (!updated) return;

    const stableStringify = (v) => {
      try {
        return typeof v === 'string' ? v : JSON.stringify(v);
      } catch {
        return String(v);
      }
    };

    setSelectedEmployee((prev) => {
      if (!prev || prev.id !== selectedId) return prev;

      const merged = {
        ...prev,
        ...updated,
      };

      // Preserve any resolved employee linkage we already computed locally
      if (prev.endorsed_employee_id && !merged.endorsed_employee_id) {
        merged.endorsed_employee_id = prev.endorsed_employee_id;
      }

      // Prefer previous raw overrides if present
      if (prev.raw || updated.raw) {
        merged.raw = { ...(updated.raw || {}), ...(prev.raw || {}) };
      }

      const keys = [
        'status',
        'endorsed',
        'interview_date',
        'interview_time',
        'interview_location',
        'interviewer',
        'interview_confirmed',
        'endorsed_employee_id',
        'payload',
      ];

      const changed = keys.some((k) => {
        if (k === 'payload') return stableStringify(prev.payload) !== stableStringify(merged.payload);
        return String(prev?.[k] ?? '') !== String(merged?.[k] ?? '');
      });

      return changed ? merged : prev;
    });
  }, [endorsedEmployees, hiredEmployees, endorsementsTab, selectedEmployee?.id]);

  // Load requirements for selected employee
  useEffect(() => {
    const loadEmployeeRequirements = async () => {
      if (!selectedEmployee) {
        setEmployeeRequirements(null);
        setEmployeeIsAgency(false);
        setResolvedEmployeeId(null);
        return;
      }

      // Prefer the linked employee id; if missing, try auth_user_id, then email
      let employeeId =
        selectedEmployee.endorsed_employee_id ||
        selectedEmployee?.raw?.endorsed_employee_id ||
        selectedEmployee.employee_id ||
        selectedEmployee?.raw?.employee_id ||
        null;
      const derivedIsAgency = getIsAgency(selectedEmployee);

      setLoadingRequirements(true);
      try {
        let data = null;
        let error = null;

        // If the application row isn't linked yet, try matching against hiredEmployees.
        if (!employeeId) {
          const hiredMatch = findHiredEmployeeMatch(selectedEmployee);
          if (hiredMatch?.id) {
            employeeId = hiredMatch.id;
            setSelectedEmployee((prev) => {
              if (!prev) return prev;
              if (String(prev.endorsed_employee_id || '') === String(employeeId || '')) return prev;
              return {
                ...prev,
                endorsed_employee_id: employeeId,
                raw: { ...(prev.raw || {}), endorsed_employee_id: employeeId },
              };
            });
          }
        }

        if (employeeId) {
          const result = await supabase
            .from('employees')
            .select('id, email, requirements, is_agency')
            .eq('id', employeeId)
            .single();
          data = result.data;
          error = result.error;
        } else if (selectedEmployee.user_id) {
          const result = await supabase
            .from('employees')
            .select('id, email, requirements, is_agency')
            .eq('auth_user_id', selectedEmployee.user_id)
            .maybeSingle();

          data = result.data;
          error = result.error;

          if (!error && data?.id) {
            employeeId = data.id;
            setSelectedEmployee((prev) => {
              if (!prev) return prev;
              if (String(prev.endorsed_employee_id || '') === String(employeeId || '')) return prev;
              return {
                ...prev,
                endorsed_employee_id: employeeId,
                raw: { ...(prev.raw || {}), endorsed_employee_id: employeeId },
              };
            });
          }
        } else if (selectedEmployee.email) {
          // Fallback: try to find employee by email (same logic Requirements tab uses)
          const result = await supabase
            .from('employees')
            .select('id, email, requirements, is_agency')
            .ilike('email', selectedEmployee.email.trim());

          if (result.error) {
            error = result.error;
          } else if (result.data && result.data.length > 0) {
            data = result.data[0];
            employeeId = data.id;
            // Update selectedEmployee to remember this mapping for next time
            setSelectedEmployee((prev) => {
              if (!prev) return prev;
              if (String(prev.endorsed_employee_id || '') === String(employeeId || '')) return prev;
              return {
                ...prev,
                endorsed_employee_id: employeeId,
                raw: { ...(prev.raw || {}), endorsed_employee_id: employeeId },
              };
            });
          }
        }
        
        if (error) {
          console.error('Error loading employee requirements:', error);
          setEmployeeRequirements(null);
          setEmployeeIsAgency(derivedIsAgency);
          setResolvedEmployeeId(employeeId || null);
        } else {
          // Parse requirements
          let requirementsData = null;
          if (data?.requirements) {
            if (typeof data.requirements === 'string') {
              try {
                requirementsData = JSON.parse(data.requirements);
              } catch {
                requirementsData = null;
              }
            } else {
              requirementsData = data.requirements;
            }
          }
          setEmployeeRequirements(requirementsData);
          // In this module, treat endorsed agency employees as agency even if is_agency is missing.
          setEmployeeIsAgency((data?.is_agency === true) || derivedIsAgency);
          setResolvedEmployeeId(employeeId || data?.id || null);
        }
      } catch (err) {
        console.error('Unexpected error loading requirements:', err);
        setEmployeeRequirements(null);
        setEmployeeIsAgency(getIsAgency(selectedEmployee));
        setResolvedEmployeeId(employeeId || null);
      } finally {
        setLoadingRequirements(false);
      }
    };
    
    loadEmployeeRequirements();
  }, [
    selectedEmployee?.id,
    selectedEmployee?.endorsed_employee_id,
    selectedEmployee?.raw?.endorsed_employee_id,
    selectedEmployee?.employee_id,
    selectedEmployee?.raw?.employee_id,
    selectedEmployee?.user_id,
    selectedEmployee?.email,
    hiredEmployees,
  ]);
  
  // Subscribe to employees table changes to refresh requirements
  useEffect(() => {
    const employeeId =
      resolvedEmployeeId ||
      selectedEmployee?.endorsed_employee_id ||
      selectedEmployee?.raw?.endorsed_employee_id ||
      selectedEmployee?.employee_id ||
      selectedEmployee?.raw?.employee_id ||
      null;

    if (!employeeId) return;
    
    const employeesChannel = supabase
      .channel(`employees-requirements-rt-${employeeId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'employees',
          filter: `id=eq.${employeeId}`
        },
        (payload) => {
          // Reload requirements when employee record is updated
          if (payload.new?.requirements) {
            let requirementsData = null;
            if (typeof payload.new.requirements === 'string') {
              try {
                requirementsData = JSON.parse(payload.new.requirements);
              } catch {
                requirementsData = null;
              }
            } else {
              requirementsData = payload.new.requirements;
            }
            setEmployeeRequirements(requirementsData);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(employeesChannel);
    };
  }, [selectedEmployee, resolvedEmployeeId]);

  // Fetch onboarding records (read-only) from onboarding table
  useEffect(() => {
    const fetchOnboardingItems = async () => {
      if (!selectedEmployee || employeeDetailTab !== 'onboarding') {
        setOnboardingItems([]);
        setOnboardingError(null);
        setOnboardingLoading(false);
        return;
      }

      const employeeId =
        resolvedEmployeeId ||
        selectedEmployee?.endorsed_employee_id ||
        selectedEmployee?.raw?.endorsed_employee_id ||
        selectedEmployee?.employee_id ||
        selectedEmployee?.raw?.employee_id ||
        null;

      if (!employeeId) {
        setOnboardingItems([]);
        setOnboardingError(null);
        setOnboardingLoading(false);
        return;
      }

      setOnboardingLoading(true);
      setOnboardingError(null);

      try {
        const { data, error } = await supabase
          .from('onboarding')
          .select('*')
          .eq('employee_id', employeeId)
          .order('date_issued', { ascending: false });

        if (error) {
          console.error('Error fetching onboarding items:', error);
          setOnboardingError(error.message || String(error));
          setOnboardingItems([]);
          return;
        }

        const items = (data || []).map((item) => {
          const filePath = item.file_path || item.filePath || null;
          const fileUrl = filePath
            ? (supabase.storage.from('application-files').getPublicUrl(filePath)?.data?.publicUrl || null)
            : null;

          return {
            id: item.id,
            item: item.item || item.name || '',
            description: item.description || '',
            date: item.date_issued || item.date || '',
            filePath,
            fileUrl,
          };
        });

        setOnboardingItems(items);
      } catch (e) {
        console.error('Unexpected onboarding fetch error:', e);
        setOnboardingError(String(e));
        setOnboardingItems([]);
      } finally {
        setOnboardingLoading(false);
      }
    };

    fetchOnboardingItems();
  }, [selectedEmployee, employeeDetailTab, resolvedEmployeeId, onboardingRefreshTrigger]);

  // Subscribe to onboarding table changes so HR uploads appear immediately
  useEffect(() => {
    if (!selectedEmployee || employeeDetailTab !== 'onboarding') return;

    const employeeId =
      resolvedEmployeeId ||
      selectedEmployee?.endorsed_employee_id ||
      selectedEmployee?.raw?.endorsed_employee_id ||
      selectedEmployee?.employee_id ||
      selectedEmployee?.raw?.employee_id ||
      null;

    if (!employeeId) return;

    const channel = supabase
      .channel(`onboarding-rt-${employeeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'onboarding',
          filter: `employee_id=eq.${employeeId}`,
        },
        () => {
          setOnboardingRefreshTrigger((x) => x + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedEmployee, employeeDetailTab, resolvedEmployeeId]);

  const getFilename = (filePath) => {
    if (!filePath) return null;
    return String(filePath).split('/').pop() || String(filePath);
  };

  const normalizeDocStatus = (rawStatus) => {
    const s = String(rawStatus || '').trim();
    if (s === 'Validated' || s === 'approved') return 'Validated';
    if (s === 'Re-submit' || s === 'resubmit') return 'Re-submit';
    if (s === 'Submitted' || s === 'pending') return 'Submitted';
    if (s === 'Optional') return 'Optional';
    return 'Missing';
  };

  const buildEmployeeDocuments = (requirementsData, isAgency) => {
    const documents = [];

    const addDoc = ({ id, name, filePath, status }) => {
      documents.push({
        id,
        name,
        file: filePath ? { name: getFilename(filePath) } : null,
        previewUrl: filePath ? getFileUrl(filePath) : null,
        status,
      });
    };

    const extractFilePath = (obj) => {
      if (!obj || typeof obj !== 'object') return null;
      return (
        obj.file_path ||
        obj.filePath ||
        obj.path ||
        obj.storagePath ||
        obj.storage_path ||
        obj.url ||
        obj.publicUrl ||
        obj.public_url ||
        null
      );
    };

    const idNumbers = requirementsData?.id_numbers || {};
    const legacyDocs = Array.isArray(requirementsData?.documents) ? requirementsData.documents : [];

    const findLegacyDoc = (key) => {
      const needle = String(key || '').trim().toLowerCase();
      if (!needle) return null;
      return (
        legacyDocs.find((doc) => {
          const docKey = String(doc?.key || doc?.type || doc?.name || '').trim().toLowerCase();
          return docKey === needle || docKey === needle.replace('-', '') || docKey.replace(/\s+/g, '') === needle;
        }) || null
      );
    };

    if (isAgency) {
      const idMapping = [
        { key: 'sss', name: 'SSS (Social Security System)' },
        { key: 'tin', name: 'TIN (Tax Identification Number)' },
        { key: 'pagibig', name: 'PAG-IBIG (HDMF)' },
        { key: 'philhealth', name: 'PhilHealth' },
      ];

      idMapping.forEach(({ key, name }) => {
        const idData = idNumbers[key];
        const legacyDoc = findLegacyDoc(key);
        const filePath = extractFilePath(idData) || extractFilePath(legacyDoc);
        const status = normalizeDocStatus(idData?.status || legacyDoc?.status);
        addDoc({ id: key, name, filePath, status });
      });

      return documents;
    }

    // Direct employees: extract from all document sections
    const directIdMapping = [
      { key: 'sss', name: 'Photocopy of SSS ID' },
      { key: 'tin', name: 'TIN (Tax Identification Number)' },
      { key: 'pagibig', name: 'PAG-IBIG (HDMF)' },
      { key: 'philhealth', name: 'PhilHealth' },
    ];

    directIdMapping.forEach(({ key, name }) => {
      const idData = idNumbers[key];
      const filePath = extractFilePath(idData);
      const status = normalizeDocStatus(idData?.status);
      addDoc({ id: key, name, filePath, status });
    });

    // Driver's License
    const license = requirementsData?.license || {};
    if (license && typeof license === 'object') {
      const photocopyPath =
        license.filePath ||
        license.file_path ||
        license.licenseFilePath ||
        license.license_file_path ||
        null;
      const frontPath = license.frontFilePath || license.front_file_path;
      const backPath = license.backFilePath || license.back_file_path;
      const bestPath = photocopyPath || frontPath || backPath || null;
      const status = normalizeDocStatus(license.status);
      addDoc({
        id: 'drivers_license',
        name: 'Photocopy of Drivers License',
        filePath: bestPath,
        status,
      });
    } else {
      addDoc({ id: 'drivers_license', name: 'Photocopy of Drivers License', filePath: null, status: 'Missing' });
    }

    // Personal Documents
    const personalDocs = requirementsData?.personalDocuments || {};
    const personalDocMapping = [
      { key: 'psa_birth_certificate', name: 'PSA Birth Cert' },
      { key: 'photo_2x2', name: '2x2 Picture w/ White Background' },
      { key: 'marriage_contract', name: 'Marriage Contract Photocopy (If applicable)' },
      { key: 'dependents_birth_certificate', name: 'PSA Birth Certificate of Dependents (If applicable)' },
      { key: 'residence_sketch', name: 'Direction of Residence (House to Depot Sketch)' },
    ];

    personalDocMapping.forEach(({ key, name }) => {
      const docData = personalDocs[key];
      const filePath = docData?.filePath || docData?.file_path || null;
      const isIfApplicable = key === 'marriage_contract' || key === 'dependents_birth_certificate';
      const status = !filePath && isIfApplicable ? 'Optional' : normalizeDocStatus(docData?.status);
      addDoc({ id: key, name, filePath, status });
    });

    // Clearances
    const clearances = requirementsData?.clearances || {};
    const clearanceMapping = [
      { key: 'nbi_clearance', name: 'NBI Clearance' },
      { key: 'police_clearance', name: 'Police Clearance' },
      { key: 'barangay_clearance', name: 'Barangay Clearance' },
    ];
    clearanceMapping.forEach(({ key, name }) => {
      const docData = clearances[key];
      const filePath = docData?.filePath || docData?.file_path || null;
      const status = normalizeDocStatus(docData?.status);
      addDoc({ id: key, name, filePath, status });
    });

    // Educational Documents
    const educationalDocs = requirementsData?.educationalDocuments || {};
    const educationalDocMapping = [
      { key: 'diploma', name: 'Diploma' },
      { key: 'transcript_of_records', name: 'Transcript of Records' },
    ];
    educationalDocMapping.forEach(({ key, name }) => {
      const docData = educationalDocs[key];
      const filePath = docData?.filePath || docData?.file_path || null;
      const status = normalizeDocStatus(docData?.status);
      addDoc({ id: key, name, filePath, status });
    });

    // Medical Exams
    const medicalExams = requirementsData?.medicalExams || {};
    const medicalExamMapping = [
      { key: 'xray', name: 'X-ray' },
      { key: 'stool', name: 'Stool' },
      { key: 'urine', name: 'Urine' },
      { key: 'hepa', name: 'HEPA' },
      { key: 'cbc', name: 'CBC' },
      { key: 'drug_test', name: 'Drug Test' },
    ];
    medicalExamMapping.forEach(({ key, name }) => {
      const docData = medicalExams[key];
      const filePath = docData?.filePath || docData?.file_path || null;
      const status = normalizeDocStatus(docData?.status);
      addDoc({ id: key, name, filePath, status });
    });

    // Legacy Documents Array (backward compatibility)
    const legacyDocuments = requirementsData?.documents || [];
    legacyDocuments.forEach((doc) => {
      const filePath = doc?.file_path || doc?.filePath || null;
      const name = doc?.name || doc?.key || 'Unknown Document';
      const id = doc?.key || doc?.name || `doc-${documents.length}`;

      if (documents.some((d) => d.id === id || d.name === name)) return;

      const status = normalizeDocStatus(doc?.status);
      addDoc({ id, name, filePath, status });
    });

    return documents;
  };

  // Build the HR-standard documents list when the documents tab is active
  useEffect(() => {
    if (employeeDetailTab !== 'documents') {
      setEmployeeDocuments([]);
      setLoadingDocuments(false);
      return;
    }

    if (loadingRequirements) {
      setLoadingDocuments(true);
      return;
    }

    setLoadingDocuments(true);
    try {
      const effectiveIsAgency = employeeIsAgency || getIsAgency(selectedEmployee);
      setEmployeeDocuments(buildEmployeeDocuments(employeeRequirements, effectiveIsAgency));
    } finally {
      setLoadingDocuments(false);
    }
  }, [employeeDetailTab, loadingRequirements, employeeRequirements, employeeIsAgency, selectedEmployee]);

  // Load assessment records when documents tab is active
  useEffect(() => {
    const loadAssessmentRecords = async () => {
      if (!selectedEmployee || employeeDetailTab !== 'documents') {
        setAssessmentRecords([]);
        return;
      }

      try {
        const employeeEmail = selectedEmployee.email;
        if (!employeeEmail) {
          setAssessmentRecords([]);
          return;
        }

        // Try multiple approaches to find assessment files:
        // 1. If selectedEmployee has user_id (from application), use it directly
        // 2. Find applicant record by email
        // 3. Search applications by email in payload

        let applicantUserId = null;
        
        // Approach 1: Check if selectedEmployee has user_id from the application
        // This could be in raw.user_id (from application) or we need to find it
        if (selectedEmployee.raw?.user_id) {
          applicantUserId = selectedEmployee.raw.user_id;
        }
        
        // Approach 2: If selectedEmployee has an id that's an application ID (not emp-xxx), 
        // we can fetch the application directly to get user_id
        if (!applicantUserId && selectedEmployee.id && !selectedEmployee.id.startsWith('emp-')) {
          try {
            const { data: appData, error: appError } = await supabase
              .from('applications')
              .select('user_id')
              .eq('id', selectedEmployee.id)
              .maybeSingle();
            
            if (!appError && appData?.user_id) {
              applicantUserId = appData.user_id;
            }
          } catch (err) {
            console.error('Error fetching application user_id:', err);
          }
        }
        
        // Approach 3: If still no user_id, try to find applicant record by email
        if (!applicantUserId) {
          const { data: applicantData, error: applicantError } = await supabase
            .from('applicants')
            .select('id')
            .eq('email', employeeEmail)
            .maybeSingle();

          if (!applicantError && applicantData?.id) {
            applicantUserId = applicantData.id;
          }
        }

        // Build query to find all applications (not just those with assessment files)
        // We'll check for all file types: assessment and agreement files
        let applicationsQuery = supabase
          .from('applications')
          .select('id, payload, created_at, user_id, status, job_posts:job_id(title, depot)')
          .order('created_at', { ascending: false });

        // If we have applicant user_id, use it (most reliable)
        if (applicantUserId) {
          applicationsQuery = applicationsQuery.eq('user_id', applicantUserId);
        } else {
          // Fallback: search by email in payload using multiple paths
          // This handles cases where applicant record doesn't exist or email doesn't match
          applicationsQuery = applicationsQuery.or(
            `payload->>email.eq.${employeeEmail},payload->form->>email.eq.${employeeEmail},payload->applicant->>email.eq.${employeeEmail}`
          );
        }

        const { data: applicationsData, error: applicationsError } = await applicationsQuery;

        if (applicationsError) {
          console.error('Error loading assessment records:', applicationsError);
          setAssessmentRecords([]);
          return;
        }

        if (applicationsData && applicationsData.length > 0) {
          // Prefer the application that became the employee (status=hired), else most recent
          const sortedApps = [...applicationsData].sort((a, b) => {
            const aHired = String(a?.status || '').toLowerCase() === 'hired';
            const bHired = String(b?.status || '').toLowerCase() === 'hired';
            if (aHired && !bHired) return -1;
            if (!aHired && bHired) return 1;
            return new Date(b.created_at) - new Date(a.created_at);
          });

          const mostRecentApp = sortedApps[0];
          const jobTitle = mostRecentApp.job_posts?.title || 'N/A';
          const depot = mostRecentApp.job_posts?.depot || 'N/A';
          const date = mostRecentApp.created_at;
          
          const records = [];
          const payloadObj = parsePayloadObject(mostRecentApp?.payload ?? {});
          
          // Get interview_notes_attachments from payload
          const rawInterviewNotesList = payloadObj?.interview_notes_attachments || payloadObj?.interviewNotesAttachments;
          const interviewNotesList = Array.isArray(rawInterviewNotesList) ? rawInterviewNotesList.slice() : [];
          
          // Add single interview note attachment if exists
          const singleInterviewNote = payloadObj?.interview_notes_attachment || payloadObj?.interviewNotesAttachment || null;
          if (singleInterviewNote && typeof singleInterviewNote === 'object') {
            const singlePath = singleInterviewNote.path || singleInterviewNote.file_path || singleInterviewNote.filePath || singleInterviewNote.storagePath || null;
            if (singlePath && !interviewNotesList.some((item) => (item?.path || item?.file_path || item?.filePath || item?.storagePath) === singlePath)) {
              interviewNotesList.push(singleInterviewNote);
            }
          }

          // Process interview notes attachments (includes Interview Details and Assessment Results)
          interviewNotesList.forEach((attachment, idx) => {
            const filePath = attachment?.path || attachment?.file_path || attachment?.filePath || attachment?.storagePath || null;
            if (!filePath) return;
            
            const label = attachment?.label || 'Assessment Attachment';
            
            records.push({
              id: `${mostRecentApp.id}-assessment-note-${idx}`,
              type: 'assessment',
              documentName: label,
              fileName: attachment?.originalName || attachment?.original_name || filePath.split('/').pop() || null,
              filePath: filePath,
              fileUrl: getFileUrl(filePath),
              date: attachment?.uploadedAt || attachment?.uploaded_at || date,
              jobTitle: jobTitle,
              depot: depot,
              applicationId: mostRecentApp.id,
              icon: label === 'Interview Details' ? 'blue' : 'green'
            });
          });
          
          // Agreement Files
          const payloadAgreementDocs = Array.isArray(payloadObj?.agreement_documents)
            ? payloadObj.agreement_documents
            : Array.isArray(payloadObj?.agreementDocuments)
              ? payloadObj.agreementDocuments
              : [];

          payloadAgreementDocs
            .filter(doc => !doc.removed) // Filter out removed documents
            .forEach((doc, index) => {
              const filePath = doc?.path || doc?.file_path || doc?.filePath || doc?.storagePath || null;
              if (!filePath) return;
              const label = doc?.label || doc?.name || 'Agreement Document';
              const originalName = doc?.originalName || doc?.original_name || null;

              records.push({
                id: `${mostRecentApp.id}-agreement-${index}`,
                type: 'agreement',
                documentName: label,
                fileName: originalName || String(filePath).split('/').pop() || null,
                filePath,
                fileUrl: getFileUrl(filePath),
                date: doc?.uploadedAt || doc?.uploaded_at || date,
                jobTitle,
                depot,
                applicationId: mostRecentApp.id,
              });
            });
          
          setAssessmentRecords(records);
        } else {
          setAssessmentRecords([]);
        }
      } catch (err) {
        console.error('Error loading assessment records:', err);
        setAssessmentRecords([]);
      }
    };

    loadAssessmentRecords();
  }, [selectedEmployee, employeeDetailTab]);

  // initial loads + realtime subscriptions
  useEffect(() => {
    loadEndorsed();
    loadRetractedEndorsements();
    loadHired();
    fetchInterviews();

    // subscribe to applications changes (where endorsed=true)
    const applicationsChannel = supabase
      .channel("applications-endorsed-rt")
      .on(
        "postgres_changes",
        { 
          event: "*", 
          schema: "public", 
          table: "applications"
        },
        (payload) => {
          // Only reload if the change affects an endorsed application
          const newPayload = payload.new || {};
          const oldPayload = payload.old || {};
          const affectsEndorsed = newPayload.endorsed === true || oldPayload.endorsed === true;
          const affectsRetracted =
            String(newPayload.status || '').toLowerCase() === 'retracted' ||
            String(oldPayload.status || '').toLowerCase() === 'retracted' ||
            newPayload.payload?.endorsement_retracted === true ||
            oldPayload.payload?.endorsement_retracted === true;
          if (affectsEndorsed || affectsRetracted) {
            loadEndorsed();
            loadRetractedEndorsements();
          }
        }
      )
      .subscribe();

    // subscribe to employees changes - when employees change, update hires + endorsed (so status flips to deployed)
    const employeesChannel = supabase
      .channel("employees-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employees" },
        () => {
          loadHired();
          loadEndorsed();
          loadRetractedEndorsements();
        }
      )
      .subscribe();

    return () => {
      if (applicationsChannel) supabase.removeChannel(applicationsChannel);
      if (employeesChannel) supabase.removeChannel(employeesChannel);
    };
  
  }, []);

  const formatDate = (d) => {
    if (!d) return "None";
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }); }
    catch { return String(d); }
  };

  const renderNone = () => <span className="text-gray-500 italic">None</span>;
  const renderNA = () => <span className="text-gray-500 italic">N/A</span>;

  const displayValue = (val) => {
    if (val === null || val === undefined) return renderNone();
    if (typeof val === 'string') {
      const s = val.trim();
      if (!s) return renderNone();
      if (s === '—' || s === '--' || s.toLowerCase() === 'n/a') return renderNone();
      return s;
    }
    return val;
  };

  const displayDate = (val) => {
    if (!val || val === '—' || val === '--' || String(val).trim().toLowerCase() === 'n/a') return renderNone();
    return formatDate(val);
  };

  const isMedicalInfoUnanswered = (data) => {
    const hasReason = String(data?.medicationReason ?? '').trim() !== '';
    const hasDate = String(data?.medicalTestDate ?? '').trim() !== '';

    // Treat as unanswered when both flags are false and no other details provided
    return data?.takingMedications === false && data?.tookMedicalTest === false && !hasReason && !hasDate;
  };

  const formatNameLastFirstMiddle = ({ last, first, middle }) => {
    const l = String(last ?? '').trim();
    const f = String(first ?? '').trim();
    const m = String(middle ?? '').trim();

    if (!l && !f && !m) return null;
    if (l && (f || m)) {
      const tail = [f, m].filter(Boolean).join(' ').trim();
      return tail ? `${l}, ${tail}` : l;
    }
    return [f, m, l].filter(Boolean).join(' ').trim();
  };

  const getEmploymentStatusForEmployee = (emp) => {
    if (!emp) return null;
    if (emp?.employmentStatus) return emp.employmentStatus;

    const byEndorsedId = emp?.endorsed_employee_id
      ? hiredEmployees.find((h) => h.id === emp.endorsed_employee_id)
      : null;
    if (byEndorsedId?.employmentStatus) return byEndorsedId.employmentStatus;

    const empKey = normalizeEmail(emp?.email);
    if (empKey) {
      const byEmail = hiredEmployees.find((h) => normalizeEmail(h?.email) === empKey);
      if (byEmail?.employmentStatus) return byEmail.employmentStatus;
    }

    const fallback = hiredEmployees.find(
      (h) => h.id === emp.id || h.endorsed_employee_id === emp.id
    );
    return fallback?.employmentStatus || null;
  };

  const calculateAge = (birthday) => {
    if (!birthday) return null;
    const dt = new Date(birthday);
    if (Number.isNaN(dt.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - dt.getFullYear();
    const m = now.getMonth() - dt.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dt.getDate())) age -= 1;
    return age >= 0 ? age : null;
  };

  const formatAddress = ({ unit, street, barangay, city, province, zip }) => {
    const parts = [unit, street, barangay, city, province].map(v => String(v ?? '').trim()).filter(Boolean);
    const base = parts.join(', ');
    const z = String(zip ?? '').trim();
    if (!base && !z) return null;
    return z ? `${base}${base ? ' ' : ''}${z}` : base;
  };

  const isDeliveryCrew = (row, job) => {
    const title = String(job?.title || row?.position || row?.raw?.job_posts?.title || row?.payload?.job?.title || '').toLowerCase();
    if (!title) return false;
    if (title === 'delivery drivers') return true;
    return title.includes('delivery') || title.includes('driver');
  };

  // HR-style status label (mirrors HrRecruitment.jsx logic, adapted for agency endorsements)
  const getEndorsementStatus = (row) => {
    // `row.status` is used for the Agency UI tab grouping (pending/deployed).
    // The real recruitment pipeline status lives on the application row (`row.raw.status`).
    const derivedStatus = String(row?.status || '').toLowerCase();
    const rawStatus = String(row?.raw?.status || '').toLowerCase();
    const status = (rawStatus || (derivedStatus !== 'pending' && derivedStatus !== 'deployed' ? derivedStatus : '') || 'submitted').toLowerCase();

    let payloadObj = row?.raw?.payload ?? row?.payload ?? {};
    if (typeof payloadObj === 'string') {
      try { payloadObj = JSON.parse(payloadObj); } catch { payloadObj = {}; }
    }

    const hasInterview = !!(row?.interview_date || row?.raw?.interview_date);
    const interviewConfirmedRaw = row?.interview_confirmed ?? row?.raw?.interview_confirmed ?? null;
    const interviewConfirmedNorm = interviewConfirmedRaw ? String(interviewConfirmedRaw).trim().toLowerCase() : '';
    const reqObj = payloadObj?.interview_reschedule_request || payloadObj?.interviewRescheduleRequest || null;
    const reqHandled = Boolean(reqObj && (reqObj.handled_at || reqObj.handledAt));
    const reqActive = Boolean(reqObj && typeof reqObj === 'object' && !reqHandled && (reqObj.requested_at || reqObj.requestedAt || reqObj.note));
    const rescheduleRequested = (interviewConfirmedNorm === 'rejected' && hasInterview) || reqActive;

    if (status === 'hired') {
      return { label: 'HIRED', color: 'text-green-600', bg: 'bg-green-50' };
    }
    if (status === 'retracted') {
      return { label: 'RETRACTED', color: 'text-red-600', bg: 'bg-red-50' };
    }
    if (status === 'rejected') {
      return { label: 'REJECTED', color: 'text-red-600', bg: 'bg-red-50' };
    }
    if (status === 'waitlisted') {
      return { label: 'WAITLISTED', color: 'text-slate-700', bg: 'bg-slate-50' };
    }
    if (['agreement', 'agreements', 'final_agreement'].includes(status)) {
      return { label: 'AGREEMENT', color: 'text-purple-600', bg: 'bg-purple-50' };
    }
    if (['requirements', 'docs_needed', 'awaiting_documents'].includes(status)) {
      return { label: 'REQUIREMENTS', color: 'text-orange-600', bg: 'bg-orange-50' };
    }
    if (rescheduleRequested) {
      return { label: 'RESCHEDULE REQUESTED', color: 'text-orange-600', bg: 'bg-orange-50' };
    }
    if (hasInterview) {
      return { label: 'INTERVIEW SET', color: 'text-cyan-600', bg: 'bg-cyan-50' };
    }
    if (['screening', 'interview', 'scheduled', 'onsite'].includes(status)) {
      return { label: 'IN REVIEW', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    }
    return { label: 'SUBMITTED', color: 'text-gray-600', bg: 'bg-gray-50' };
  };

  // Get initials from name
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };
  
  // Helper function to get requirement data for a document type
  const getRequirementData = (key) => {
    if (!employeeRequirements) {
      return { idNumber: null, filePath: null, status: 'missing' };
    }
    
    const idNums = employeeRequirements.id_numbers || {};
    const documents = employeeRequirements.documents || [];

    const k = String(key || '').trim().toLowerCase();
    const aliases = k === 'pagibig' ? ['pagibig', 'pag-ibig', 'pag_ibig'] : [k];
    const matchKey = (value) => {
      const s = String(value || '').trim().toLowerCase();
      return aliases.includes(s);
    };
    
    const idData = aliases.map((a) => idNums[a]).find(Boolean) || {};
    const docData = documents.find(d => matchKey(d.key || d.type || d.name || ''));
    
    const idNumber = idData.value || null;
    const filePath =
      idData?.file_path ||
      idData?.filePath ||
      docData?.file_path ||
      docData?.filePath ||
      docData?.path ||
      docData?.storagePath ||
      docData?.url ||
      null;
    
    // Determine status
    let status = 'missing';
    if (idData.status === 'Validated') {
      status = 'approved';
    } else if (idData.status === 'Re-submit') {
      status = 'resubmit';
    } else if (idData.status === 'Submitted' || idNumber || filePath) {
      status = 'pending';
    }
    
    return { idNumber, filePath, status, remarks: idData.remarks || null };
  };
  
  // Helper function to get file URL
  const getFileUrl = (filePath) => {
    if (!filePath) return null;
    const asString = String(filePath);
    if (/^https?:\/\//i.test(asString)) return asString;
    const { data } = supabase.storage.from('application-files').getPublicUrl(filePath);
    return data?.publicUrl || null;
  };

  // Generate consistent color based on name
  const getAvatarColor = (name) => {
    const colors = [
      'from-[#800000] to-[#990000]',
      'from-blue-500 to-blue-600',
      'from-green-500 to-green-600',
      'from-purple-500 to-purple-600',
      'from-orange-500 to-orange-600',
      'from-pink-500 to-pink-600',
      'from-teal-500 to-teal-600',
      'from-indigo-500 to-indigo-600',
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  // Calculate stats
  const stats = {
    totalDeployed: endorsedEmployees.filter(e => e.status === 'deployed').length,
    pendingEndorsements: endorsedEmployees.filter(e => e.status === 'pending').length,
    totalEndorsements: endorsedEmployees.length,
    retractedEndorsements: retractedEndorsements.length,
  };

  const isRetractedTab = endorsementsTab === 'retracted';
  const listLoading = isMyEmployeesTab ? hiredLoading : (isRetractedTab ? retractedLoading : endorsedLoading);
  const listError = isMyEmployeesTab ? hiredError : (isRetractedTab ? retractedError : endorsedError);
  const listCount = isMyEmployeesTab ? visibleHiredEmployees.length : (isRetractedTab ? retractedEndorsements.length : endorsedEmployees.length);
  const emptyListMessage = isMyEmployeesTab
    ? 'No employees yet.'
    : (isRetractedTab ? 'No retracted applications yet.' : 'No endorsements yet.');

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
        
        /* Modern sleek scrollbar */
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
        
        /* Firefox */
        * {
          scrollbar-width: thin;
          scrollbar-color: #d1d5db transparent;
        }
      `}</style>
      
      {/* Header (hidden because AgencyLayout provides the main header) */}
      <div className="bg-white shadow-sm sticky top-0 z-50 hidden">
        <div className="w-full py-4">
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
                type="button"
                onClick={() => navigate("/agency/home")}
                className="pb-1 hover:text-gray-900 transition-colors"
              >
                Home
              </button>

              <button
                type="button"
                className="pb-1 text-[#800000] border-b-2 border-red-600"
              >
                Endorsements
              </button>
              <button
                type="button"
                onClick={() => navigate("/agency/requirements")}
                className="hover:text-gray-900 transition-colors pb-1"
              >
                Requirements
              </button>
              <button
                type="button"
                onClick={() => navigate("/agency/trainings")}
                className="hover:text-gray-900 transition-colors pb-1"
              >
                Trainings/Orientation
              </button>
              <button
                type="button"
                onClick={() => navigate("/agency/evaluation")}
                className="hover:text-gray-900 transition-colors pb-1"
              >
                Evaluation
              </button>
              <button
                type="button"
                onClick={() => navigate("/agency/separation")}
                className="hover:text-gray-900 transition-colors pb-1"
              >
                Separation
              </button>
            </nav>

            <div className="flex items-center space-x-4">
              {/* Notification Bell */}
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 cursor-pointer">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <span className="absolute -top-1 -right-1 bg-[#800000] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">3</span>
              </div>
              
              {/* User Profile with Dropdown */}
              <div className="relative" ref={profileDropdownRef}>
                <div 
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold cursor-pointer hover:bg-gray-300"
                >
                  AU
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
                        Agency User
                      </div>
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

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="w-full py-4 flex flex-col flex-1">
          {/* Page Header */}
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Endorsements</h1>
            <p className="text-gray-500 mt-1">Track and manage all your endorsed employees at Roadwise</p>
          </div>

          {/* Stats Cards - Hidden when employee is selected */}
          {!selectedEmployee && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 flex-shrink-0">
            {/* Total Deployed */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Deployed</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalDeployed}</p>
                </div>
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-green-600 mt-2 font-medium">Deployed employees</p>
            </div>

            {/* Pending Endorsements */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Pending Endorsements</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{stats.pendingEndorsements}</p>
                </div>
                <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-yellow-600 mt-2 font-medium">Awaiting review</p>
            </div>

            {/* Total Endorsements */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Endorsements</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalEndorsements}</p>
                </div>
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2 font-medium">All time</p>
            </div>
          </div>
          )}

          {/* Main Content Area - Side by Side Layout */}
          <div className="flex gap-4 flex-1 overflow-hidden min-h-0">
            {/* Interview Schedule - Left Side (30%) */}
            {endorsementsTab === 'pending' && (
            <div className="w-[30%]">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col p-4 h-[calc(100vh-200px)]">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 className="text-base font-bold text-gray-800">Schedules</h2>
                  <div className="inline-flex rounded-lg bg-gray-100 p-1">
                    <button
                      type="button"
                      onClick={() => setScheduleMode('interview')}
                      className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-all ${
                        scheduleMode === 'interview'
                          ? 'bg-white text-[#800000] shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Interview
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleMode('signing')}
                      className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-all ${
                        scheduleMode === 'signing'
                          ? 'bg-white text-[#800000] shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Signing
                    </button>
                  </div>
                </div>
                
                {/* Stats Overview */}
                {scheduleMode !== 'signing' && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg p-2 text-white">
                      <p className="text-xs opacity-90">Total</p>
                      <p className="text-lg font-bold">{getActiveSchedules().length}</p>
                    </div>
                    <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-2 text-white">
                      <p className="text-xs opacity-90">Online</p>
                      <p className="text-lg font-bold">
                        {getActiveSchedules().filter(i => i.interview_type === 'online').length}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg p-2 text-white">
                      <p className="text-xs opacity-90">Onsite</p>
                      <p className="text-lg font-bold">
                        {getActiveSchedules().filter(i => i.interview_type === 'onsite').length}
                      </p>
                    </div>
                  </div>
                )}

                {/* Tabs */}
                <div className="flex gap-1 mb-3 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setCalendarActiveTab('today')}
                    className={`flex-1 px-3 py-1.5 font-medium text-xs rounded-lg transition-all ${
                      calendarActiveTab === 'today'
                        ? 'bg-white text-[#800000] shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      Today
                      {hasNewScheduleInTab('today') && <span className="w-2 h-2 bg-red-500 rounded-full" />}
                    </span>
                  </button>
                  <button
                    onClick={() => setCalendarActiveTab('tomorrow')}
                    className={`flex-1 px-3 py-1.5 font-medium text-xs rounded-lg transition-all ${
                      calendarActiveTab === 'tomorrow'
                        ? 'bg-white text-[#800000] shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      Tomorrow
                      {hasNewScheduleInTab('tomorrow') && <span className="w-2 h-2 bg-red-500 rounded-full" />}
                    </span>
                  </button>
                  <button
                    onClick={() => setCalendarActiveTab('week')}
                    className={`flex-1 px-3 py-1.5 font-medium text-xs rounded-lg transition-all ${
                      calendarActiveTab === 'week'
                        ? 'bg-white text-[#800000] shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      Week
                      {hasNewScheduleInTab('week') && <span className="w-2 h-2 bg-red-500 rounded-full" />}
                    </span>
                  </button>
                </div>

                <div className="mb-2">
                  <h3 className="text-sm font-bold text-gray-800">{getTabTitle()}</h3>
                  <p className="text-xs text-gray-500">{getTabDate()}</p>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2">
                  {getActiveSchedules().length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs text-gray-500">No schedules</p>
                    </div>
                  ) : (
                    getActiveSchedules().map((interview) => {
                      const isNew = scheduleMode === 'signing'
                        ? !isSigningScheduleViewed(interview.id)
                        : !isInterviewViewed(interview.id);

                      return (
                      <div
                        key={interview.id}
                        className={[
                          'rounded-lg p-3 cursor-pointer transition-all border',
                          isNew
                            ? 'bg-gradient-to-r from-[#800000]/10 to-white border-[#800000]/25 shadow-sm motion-safe:animate-pulse'
                            : 'bg-gradient-to-r from-gray-50 to-white border-gray-200',
                          'hover:shadow-md hover:border-[#800000]'
                        ].join(' ')}
                        onClick={() => {
                          if (scheduleMode === 'signing') {
                            markSigningScheduleViewed(interview.id);
                          } else {
                            markInterviewViewed(interview.id);
                          }
                          // Find the employee in the endorsed list
                          const employee = endorsedEmployees.find(e => e.id === interview.id);
                          if (employee) {
                            setEndorsementsTab('pending');
                            setSelectedEmployee(employee);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                            {formatTime(interview.time)}
                          </div>
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                            interview.interview_type === 'online'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {interview.interview_type === 'online' ? 'ONLINE' : 'ONSITE'}
                          </span>
                        </div>
                        <h4 className="font-semibold text-gray-900 text-sm leading-tight mb-0.5">{interview.applicant_name}</h4>
                        <p className="text-xs text-gray-600">{interview.position}</p>
                        {calendarActiveTab === 'week' && (
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(interview.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </p>
                        )}
                      </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            )}

              <div className={`${endorsementsTab === 'pending' ? 'w-[70%]' : 'w-full'} bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden`}>
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
              <div className="flex flex-col gap-3">
                {/* Search + Pending/Deployed toggle */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search by employee name, ID, position, or depot..."
                      value={endorsementsSearch}
                      onChange={(e) => setEndorsementsSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] bg-white"
                    />
                  </div>

                  <div className="flex justify-end sm:flex-none w-full sm:w-auto">
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setEndorsementsTab('pending');
                          setSelectedEmployee(null);
                          closeAddEmployeeModal();
                        }}
                        className={`px-4 py-2 font-medium text-sm rounded-lg transition-all whitespace-nowrap ${
                          endorsementsTab === 'pending'
                            ? 'bg-white text-[#800000] shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        Pending ({stats.pendingEndorsements})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEndorsementsTab('deployed');
                          setSelectedEmployee(null);
                          closeAddEmployeeModal();
                        }}
                        className={`px-4 py-2 font-medium text-sm rounded-lg transition-all whitespace-nowrap ${
                          endorsementsTab === 'deployed'
                            ? 'bg-white text-[#800000] shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        Deployed ({stats.totalDeployed})
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEndorsementsTab('myEmployees');
                          setSelectedEmployee(null);
                          closeAddEmployeeModal();
                        }}
                        className={`px-4 py-2 font-medium text-sm rounded-lg transition-all whitespace-nowrap ${
                          endorsementsTab === 'myEmployees'
                            ? 'bg-white text-[#800000] shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        My Employees ({visibleHiredEmployees.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEndorsementsTab('retracted');
                          setSelectedEmployee(null);
                          closeAddEmployeeModal();
                        }}
                        className={`px-4 py-2 font-medium text-sm rounded-lg transition-all whitespace-nowrap ${
                          endorsementsTab === 'retracted'
                            ? 'bg-white text-[#800000] shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        Retracted ({stats.retractedEndorsements})
                      </button>
                    </div>
                  </div>
                </div>

                {/* Filters + Export (responsive: one row on wide screens, wraps below on smaller) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto] gap-2 items-center">
                    {/* Depot Filter */}
                    <select
                      value={depotFilter}
                      onChange={(e) => setDepotFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] bg-white"
                    >
                      <option value="All">All Depots</option>
                      {depotOptions.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>

                    {/* Department Filter */}
                    <select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] bg-white"
                    >
                      <option value="All">All Departments</option>
                      {departments.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>

                    {/* Position Filter */}
                    <select
                      value={positionFilter}
                      onChange={(e) => setPositionFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] bg-white"
                    >
                      <option value="All">All Positions</option>
                      {positions.filter(p => p !== "All").map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>

                    {/* Employment Status */}
                    <select
                      value={employmentStatusFilter}
                      onChange={(e) => setEmploymentStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] bg-white"
                    >
                      <option value="All">Employment Status</option>
                      {employmentStatuses.filter((s) => s !== "All").map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>

                    {/* Sort */}
                    <select
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value)}
                      aria-label="Sort"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] bg-white"
                    >
                      <option value="name-asc">Alphabetically (A → Z)</option>
                      <option value="name-desc">Alphabetically (Z → A)</option>
                      <option value="hired-asc">Date Hired (Oldest → Newest)</option>
                      <option value="hired-desc">Date Hired (Newest → Oldest)</option>
                    </select>

                    {endorsementsTab === 'myEmployees' ? (
                      <button
                        type="button"
                        onClick={() => {
                          openAddEmployeeModal();
                        }}
                        className="w-full xl:w-auto px-5 py-2.5 bg-[#800000] text-white rounded-lg font-medium hover:bg-[#990000] transition-colors"
                      >
                        Add Employee
                      </button>
                    ) : (
                      <button className="w-full xl:w-auto px-2.5 py-2 border border-gray-200 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2 bg-white">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export
                      </button>
                    )}
                </div>
              </div>
            </div>


            {/* Separation Prompt Banner */}
            {showSeparationPrompt && endorsementsTab === 'deployed' && (
              <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-[#800000]/10 to-orange-50 border border-[#800000]/20 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#800000]/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Submit Resignation Request</p>
                    <p className="text-sm text-gray-600">Select a <strong>deployed employee</strong> from the list below to submit a resignation request.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSeparationPrompt(false)}
                  className="p-1.5 hover:bg-[#800000]/20 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            <div className="flex-1 flex flex-col overflow-hidden p-4 min-h-0">
              {listLoading ? (
                <div className="p-6 text-gray-600">
                  {isRetractedTab ? 'Loading retracted applications…' : isMyEmployeesTab ? 'Loading employees…' : 'Loading endorsements…'}
                </div>
              ) : listError ? (
                <div className="p-4 bg-[#800000]/10 text-[#800000] rounded">{listError}</div>
              ) : listCount === 0 ? (
                <div className="p-6 text-gray-600">{emptyListMessage}</div>
              ) : (
                <>
                  <div className="flex flex-col lg:flex-row gap-4 flex-1 overflow-hidden min-h-0">
                    {/* Table on the left */}
                    <div className={`${selectedEmployee ? 'lg:w-[30%]' : 'w-full'} overflow-x-auto overflow-y-auto no-scrollbar`}>
                      {filteredEmployees.length === 0 ? (
                        <div className="p-6 text-gray-600">{isMyEmployeesTab ? 'No employees match your search.' : 'No endorsements match your search.'}</div>
                      ) : isMyEmployeesTab ? (
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                              {!selectedEmployee && (
                                <>
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Position / Depot</th>
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Added</th>
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {filteredEmployees.map((emp) => {
                              const isSelected = selectedEmployee?.id === emp.id;
                              const dateAdded = emp.created_at ? formatDate(emp.created_at) : 'None';
                              return (
                                <tr
                                  key={emp.id}
                                  className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${isSelected ? 'bg-[#800000]/10/50' : ''}`}
                                  onClick={() => {
                                    setEndorsementsTab('myEmployees');
                                    setSelectedEmployee(emp);
                                    setEmployeeDetailTab('profiling');
                                  }}
                                >
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(emp.name)} flex items-center justify-center text-white text-sm font-medium shadow-sm`}>
                                        {getInitials(emp.name)}
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-gray-800">{emp.name}</p>
                                        <p className="text-xs text-gray-500">{emp.email || `#${emp.id}`}</p>
                                      </div>
                                    </div>
                                  </td>
                                  {!selectedEmployee && (
                                    <>
                                      <td className="px-6 py-4">
                                        <p className="text-sm text-gray-800">{emp.position || 'Employee'}</p>
                                        <p className="text-xs text-gray-500">{emp.depot || 'None'}</p>
                                      </td>
                                      <td className="px-6 py-4">
                                        <p className="text-sm text-gray-800">{dateAdded}</p>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                        <button
                                          type="button"
                                          onClick={(ev) => {
                                            ev.preventDefault();
                                            ev.stopPropagation();
                                            setEmployeeToEndorse(emp);
                                            setShowJobPickerModal(true);
                                          }}
                                          className="px-5 py-2.5 bg-[#800000] text-white rounded-lg font-medium hover:bg-[#990000] transition-colors"
                                        >
                                          Endorse
                                        </button>
                                      </td>
                                    </>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                              {!selectedEmployee && (
                                <>
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Position / Depot</th>
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {filteredEmployees.map((emp) => {
                              // Find deployed date from hiredEmployees if this endorsement was deployed
                              const deployedEmployee = emp.endorsed_employee_id 
                                ? hiredEmployees.find(h => h.id === emp.endorsed_employee_id)
                                : null;
                              const deployedDate = deployedEmployee?.hired_at ? formatDate(deployedEmployee.hired_at) : null;
                              const isSelected = selectedEmployee?.id === emp.id;
                              
                              return (
                                <tr 
                                  key={emp.id} 
                                  className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${isSelected ? 'bg-[#800000]/10/50' : ''}`} 
                                  onClick={() => {
                                    if (emp.status === 'retracted') {
                                      setEndorsementsTab('retracted');
                                    } else {
                                      setEndorsementsTab(emp.status === 'deployed' ? 'deployed' : 'pending');
                                    }
                                    setSelectedEmployee(emp);
                                    // If coming from Separation page, auto-open the separation tab
                                    if (showSeparationPrompt && emp.status === 'deployed') {
                                      setEmployeeDetailTab('separation');
                                      setShowSeparationPrompt(false);
                                    }
                                  }}
                                >
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="relative">
                                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(emp.name)} flex items-center justify-center text-white text-sm font-medium shadow-sm ${emp.status === 'pending' ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}`}>
                                          {getInitials(emp.name)}
                                        </div>
                                        {emp.status === 'pending' && (
                                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white">
                                            <svg className="w-2.5 h-2.5 text-yellow-800" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                            </svg>
                                          </div>
                                        )}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <p className="text-sm font-medium text-gray-800">{emp.name}</p>
                                          {emp.status === 'pending' && (
                                            <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded font-medium">ENDORSED</span>
                                          )}
                                        </div>
                                        <p className="text-xs text-gray-500">#{emp.id}</p>
                                      </div>
                                    </div>
                                  </td>
                                  {!selectedEmployee && (
                                    <>
                                      <td className="px-6 py-4">
                                        <p className="text-sm text-gray-800">{emp.position}</p>
                                        <p className="text-xs text-gray-500">{emp.depot}</p>
                                      </td>
                                      <td className="px-6 py-4">
                                        {(() => {
                                          if (emp.status === 'deployed') {
                                            return (
                                              <span className="text-sm font-semibold text-green-600">
                                                DEPLOYED
                                              </span>
                                            );
                                          }

                                          const info = getEndorsementStatus(emp);
                                          return (
                                            <span className={`text-sm font-semibold ${info.color}`}>
                                              {info.label}
                                            </span>
                                          );
                                        })()}
                                        {emp.status === "deployed" && (
                                          <p className="text-xs text-gray-400 mt-0.5">{deployedDate || "date unavailable"}</p>
                                        )}
                                      </td>
                                    </>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}

                    </div>

                    {/* Detail panel on the right */}
                    {selectedEmployee && (() => {
                      if (isMyEmployeesTab) {
                        const req = selectedEmployee.requirements && typeof selectedEmployee.requirements === 'object' ? selectedEmployee.requirements : {};
                        const docs = Array.isArray(req.documents) ? req.documents : [];
                        const isDriver = String(req.employeeType || '').toLowerCase() === 'driver' || /driver/i.test(String(selectedEmployee.position || ''));

                        const draft = employeeEditDraft;
                        const effectiveReq = (isEditingEmployee && draft?.requirements && typeof draft.requirements === 'object') ? draft.requirements : req;
                        const effectiveDocs = Array.isArray(effectiveReq?.documents) ? effectiveReq.documents : docs;
                        const effectiveIsDriver = String(effectiveReq?.employeeType || '').toLowerCase() === 'driver' || isDriver;

                        const detailTabs = [
                          { key: 'profiling', label: 'Profiling' },
                          { key: 'documents', label: 'Documents' },
                          { key: 'history', label: 'History' },
                        ];
                        const validTabKeys = detailTabs.map((t) => t.key);
                        const currentTab = validTabKeys.includes(employeeDetailTab) ? employeeDetailTab : 'profiling';

                        return (
                          <div className="lg:w-[70%] overflow-y-auto flex flex-col">
                            <div className="bg-white border border-gray-300 rounded-t-lg p-4 relative">
                              <button
                                onClick={() => setSelectedEmployee(null)}
                                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>

                              <div className="flex items-center gap-3 pr-10">
                                <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${getAvatarColor(selectedEmployee.name)} flex items-center justify-center text-white text-lg font-semibold shadow-md`}>
                                  {getInitials(selectedEmployee.name)}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-800 text-lg">{selectedEmployee.name}</h4>
                                  <p className="text-sm text-gray-600">
                                    {displayValue(selectedEmployee.position)}
                                    <span className="text-gray-400"> | </span>
                                    {displayValue(selectedEmployee.depot)}
                                  </p>
                                  <p className="text-xs text-gray-500">{selectedEmployee.email || `#${selectedEmployee.id}`}</p>
                                </div>
                                <div className="text-right">
                                  {isEditingEmployee ? (
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        disabled={employeeEditSaving}
                                        onClick={saveEmployeeEdits}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                                          employeeEditSaving ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
                                        }`}
                                      >
                                        {employeeEditSaving ? 'Saving…' : 'Save'}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={employeeEditSaving}
                                        onClick={() => {
                                          setEmployeeEditError('');
                                          setEmployeeEditSuccess('');
                                          setIsEditingEmployee(false);
                                          setEmployeeEditDraft(makeEmployeeEditDraft(selectedEmployee));
                                        }}
                                        className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 justify-end">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEmployeeToEndorse(selectedEmployee);
                                          setShowJobPickerModal(true);
                                        }}
                                        className="px-4 py-2 bg-[#800000] text-white rounded-lg text-sm font-medium hover:bg-[#990000] transition-colors"
                                      >
                                        Endorse
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEmployeeEditError('');
                                          setEmployeeEditSuccess('');
                                          setEmployeeEditDraft(makeEmployeeEditDraft(selectedEmployee));
                                          setIsEditingEmployee(true);
                                        }}
                                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex border-b border-gray-300 bg-white overflow-x-auto">
                              {detailTabs.map((tab) => (
                                <button
                                  key={tab.key}
                                  onClick={() => setEmployeeDetailTab(tab.key)}
                                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                    currentTab === tab.key
                                      ? 'border-orange-500 text-orange-600 bg-orange-50'
                                      : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                                  }`}
                                >
                                  {tab.label}
                                </button>
                              ))}
                            </div>

                            <div className="bg-white border-l border-r border-b border-gray-300 p-4 space-y-4">
                              {employeeEditError ? (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm whitespace-pre-line">{employeeEditError}</div>
                              ) : null}
                              {employeeEditSuccess ? (
                                <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{employeeEditSuccess}</div>
                              ) : null}

                              {currentTab === 'profiling' ? (
                                isEditingEmployee ? (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                                        <div className="text-xs font-semibold text-gray-600">Employee</div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                          <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Last Name</label>
                                            <input
                                              value={draft?.lname || ''}
                                              onChange={(e) => updateEmployeeEditDraft('lname', e.target.value)}
                                              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">First Name</label>
                                            <input
                                              value={draft?.fname || ''}
                                              onChange={(e) => updateEmployeeEditDraft('fname', e.target.value)}
                                              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Middle Name</label>
                                            <input
                                              value={draft?.mname || ''}
                                              onChange={(e) => updateEmployeeEditDraft('mname', e.target.value)}
                                              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
                                            />
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                                            <input
                                              value={draft?.email || ''}
                                              onChange={(e) => updateEmployeeEditDraft('email', e.target.value)}
                                              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Personal Email</label>
                                            <input
                                              value={draft?.personal_email || ''}
                                              onChange={(e) => updateEmployeeEditDraft('personal_email', e.target.value)}
                                              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
                                            />
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Number</label>
                                            <input
                                              value={draft?.contact_number || ''}
                                              onChange={(e) => updateEmployeeEditDraft('contact_number', sanitizeContact(e.target.value))}
                                              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
                                              placeholder="09xxxxxxxxx"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Birthday</label>
                                            <input
                                              type="date"
                                              value={draft?.birthday || ''}
                                              onChange={(e) => updateEmployeeEditDraft('birthday', e.target.value)}
                                              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
                                            />
                                          </div>
                                        </div>
                                      </div>

                                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                                        <div className="text-xs font-semibold text-gray-600">Employment</div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Department</label>
                                            <select
                                              value={draft?.department || ''}
                                              onChange={(e) => {
                                                const dept = e.target.value;
                                                updateEmployeeEditDraft('department', dept);
                                                const allowed = getPositionsForDepartment(dept);
                                                const currentPos = String(draft?.position || '');
                                                if (allowed.length && !allowed.includes(currentPos)) {
                                                  updateEmployeeEditDraft('position', allowed[0]);
                                                }
                                              }}
                                              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
                                            >
                                              <option value="">Select department</option>
                                              {departments.map((d) => (
                                                <option key={d} value={d}>{d}</option>
                                              ))}
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Position</label>
                                            <select
                                              value={draft?.position || ''}
                                              onChange={(e) => updateEmployeeEditDraft('position', e.target.value)}
                                              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
                                            >
                                              <option value="">Select position</option>
                                              {getPositionsForDepartment(draft?.department || '').map((p) => (
                                                <option key={p} value={p}>{p}</option>
                                              ))}
                                            </select>
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Depot Assignment</label>
                                            <input
                                              list="agency-depots"
                                              value={draft?.depot || ''}
                                              onChange={(e) => updateEmployeeEditDraft('depot', e.target.value)}
                                              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
                                            />
                                            <datalist id="agency-depots">
                                              {(addEmployeeDepotOptions || []).map((d) => (
                                                <option key={d} value={d} />
                                              ))}
                                            </datalist>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Employee Type</label>
                                            <select
                                              value={String(draft?.requirements?.employeeType || 'helper')}
                                              onChange={(e) => updateEmployeeEditDraft('requirements.employeeType', e.target.value)}
                                              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
                                            >
                                              <option value="helper">Helper</option>
                                              <option value="driver">Driver</option>
                                            </select>
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Sex</label>
                                            <select
                                              value={draft?.requirements?.profile?.sex || ''}
                                              onChange={(e) => updateEmployeeEditDraft('requirements.profile.sex', e.target.value)}
                                              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
                                            >
                                              <option value="">Select</option>
                                              <option value="Male">Male</option>
                                              <option value="Female">Female</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Marital Status</label>
                                            <input
                                              value={draft?.requirements?.profile?.maritalStatus || ''}
                                              onChange={(e) => updateEmployeeEditDraft('requirements.profile.maritalStatus', e.target.value)}
                                              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
                                              placeholder="e.g. Single"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                                        <div className="text-sm font-semibold text-gray-900">Address</div>
                                      </div>
                                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {[
                                          { key: 'street', label: 'Street Address' },
                                          { key: 'barangay', label: 'Barangay' },
                                          { key: 'city', label: 'City / Municipality' },
                                          { key: 'province', label: 'Province' },
                                          { key: 'zip', label: 'ZIP Code' },
                                        ].map((item) => (
                                          <div key={item.key}>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">{item.label}</label>
                                            <input
                                              value={draft?.requirements?.profile?.address?.[item.key] || ''}
                                              onChange={(e) => {
                                                const v = item.key === 'zip' ? sanitizeZip(e.target.value) : e.target.value;
                                                updateEmployeeEditDraft(`requirements.profile.address.${item.key}`, v);
                                              }}
                                              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                                        <div className="text-sm font-semibold text-gray-900">Education</div>
                                      </div>
                                      <div className="p-4 space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Educational Level</label>
                                            <select
                                              value={draft?.requirements?.profile?.education?.education || ''}
                                              onChange={(e) => {
                                                const v = e.target.value;
                                                updateEmployeeEditDraft('requirements.profile.education.education', v);
                                                if (v === 'N/A') {
                                                  updateEmployeeEditDraft('requirements.profile.education.tertiarySchool', '');
                                                  updateEmployeeEditDraft('requirements.profile.education.tertiaryProgram', '');
                                                  updateEmployeeEditDraft('requirements.profile.education.tertiaryYear', '');
                                                }
                                              }}
                                              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
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
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Year Graduated</label>
                                            <input
                                              value={draft?.requirements?.profile?.education?.tertiaryYear || ''}
                                              onChange={(e) => updateEmployeeEditDraft('requirements.profile.education.tertiaryYear', sanitizeYear(e.target.value))}
                                              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
                                              maxLength={4}
                                              inputMode="numeric"
                                            />
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">School/Institution Name</label>
                                            <input
                                              value={draft?.requirements?.profile?.education?.tertiarySchool || ''}
                                              onChange={(e) => updateEmployeeEditDraft('requirements.profile.education.tertiarySchool', e.target.value)}
                                              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Course/Program</label>
                                            <input
                                              value={draft?.requirements?.profile?.education?.tertiaryProgram || ''}
                                              onChange={(e) => updateEmployeeEditDraft('requirements.profile.education.tertiaryProgram', e.target.value)}
                                              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                                        <div className="text-sm font-semibold text-gray-900">Uploads (optional)</div>
                                      </div>
                                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                          <label className="block text-xs font-semibold text-gray-600 mb-1">Resume</label>
                                          <input
                                            type="file"
                                            accept=".pdf,.doc,.docx"
                                            onChange={(e) => updateEmployeeEditDraft('files.resumeFile', e.target.files?.[0] || null)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
                                          />
                                          {draft?.files?.resumeFile ? (
                                            <div className="text-xs text-gray-500 mt-1">Selected: {draft.files.resumeFile.name}</div>
                                          ) : null}
                                        </div>
                                        <div>
                                          <label className="block text-xs font-semibold text-gray-600 mb-1">Training Certificate</label>
                                          <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={(e) => updateEmployeeEditDraft('files.trainingCertFile', e.target.files?.[0] || null)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
                                          />
                                          {draft?.files?.trainingCertFile ? (
                                            <div className="text-xs text-gray-500 mt-1">Selected: {draft.files.trainingCertFile.name}</div>
                                          ) : null}
                                        </div>
                                        <div>
                                          <label className="block text-xs font-semibold text-gray-600 mb-1">Extra Certificate Label</label>
                                          <input
                                            value={draft?.files?.extraCertLabel || ''}
                                            onChange={(e) => updateEmployeeEditDraft('files.extraCertLabel', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
                                            placeholder="e.g. TESDA Certificate"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-semibold text-gray-600 mb-1">Extra Certificate File</label>
                                          <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={(e) => updateEmployeeEditDraft('files.extraCertFile', e.target.files?.[0] || null)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
                                          />
                                          {draft?.files?.extraCertFile ? (
                                            <div className="text-xs text-gray-500 mt-1">Selected: {draft.files.extraCertFile.name}</div>
                                          ) : null}
                                        </div>
                                      </div>
                                    </div>

                                    {String(draft?.requirements?.employeeType || '') === 'driver' ? (
                                      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                                          <div className="text-sm font-semibold text-gray-900">Driver Details</div>
                                        </div>
                                        <div className="p-4 space-y-3">
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                              <label className="block text-xs font-semibold text-gray-600 mb-1">License Classification</label>
                                              <input
                                                value={draft?.requirements?.driver?.licenseClassification || ''}
                                                onChange={(e) => updateEmployeeEditDraft('requirements.driver.licenseClassification', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-xs font-semibold text-gray-600 mb-1">License Expiry</label>
                                              <input
                                                type="date"
                                                value={draft?.requirements?.driver?.licenseExpiry || ''}
                                                onChange={(e) => updateEmployeeEditDraft('requirements.driver.licenseExpiry', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
                                              />
                                            </div>
                                          </div>

                                          <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Restriction Codes</label>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                              {restrictionCodesCatalog.map((item) => (
                                                <label key={item.code} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                                                  <input
                                                    type="checkbox"
                                                    className="w-4 h-4 accent-[#800000]"
                                                    checked={Array.isArray(draft?.requirements?.driver?.restrictionCodes) && draft.requirements.driver.restrictionCodes.includes(item.code)}
                                                    onChange={() => {
                                                      const prev = Array.isArray(draft?.requirements?.driver?.restrictionCodes) ? draft.requirements.driver.restrictionCodes : [];
                                                      const next = new Set(prev);
                                                      if (next.has(item.code)) next.delete(item.code);
                                                      else next.add(item.code);
                                                      updateEmployeeEditDraft('requirements.driver.restrictionCodes', Array.from(next));
                                                    }}
                                                  />
                                                  <span className="text-sm text-gray-700">{item.code}</span>
                                                </label>
                                              ))}
                                            </div>
                                          </div>

                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                              <label className="block text-xs font-semibold text-gray-600 mb-1">Years Driving</label>
                                              <input
                                                value={draft?.requirements?.driver?.yearsDriving || ''}
                                                onChange={(e) => updateEmployeeEditDraft('requirements.driver.yearsDriving', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-xs font-semibold text-gray-600 mb-1">Truck Knowledge (Yes/No)</label>
                                              <select
                                                value={draft?.requirements?.driver?.truckKnowledge || ''}
                                                onChange={(e) => updateEmployeeEditDraft('requirements.driver.truckKnowledge', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
                                              >
                                                <option value="">Select</option>
                                                <option value="yes">Yes</option>
                                                <option value="no">No</option>
                                              </select>
                                            </div>
                                          </div>

                                          <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Vehicles Driven</label>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                              {vehicleTypesCatalog.map((vt) => (
                                                <label key={vt} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                                                  <input
                                                    type="checkbox"
                                                    className="w-4 h-4 accent-[#800000]"
                                                    checked={Array.isArray(draft?.requirements?.driver?.vehicleTypes) && draft.requirements.driver.vehicleTypes.includes(vt)}
                                                    onChange={() => {
                                                      const prev = Array.isArray(draft?.requirements?.driver?.vehicleTypes) ? draft.requirements.driver.vehicleTypes : [];
                                                      const next = new Set(prev);
                                                      if (next.has(vt)) next.delete(vt);
                                                      else next.add(vt);
                                                      updateEmployeeEditDraft('requirements.driver.vehicleTypes', Array.from(next));
                                                    }}
                                                  />
                                                  <span className="text-sm text-gray-700">{vt}</span>
                                                </label>
                                              ))}
                                            </div>
                                          </div>

                                          <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">License Photocopy (required for driver endorsements)</label>
                                            <input
                                              type="file"
                                              accept=".pdf,.jpg,.jpeg,.png"
                                              onChange={(e) => updateEmployeeEditDraft('files.licenseFile', e.target.files?.[0] || null)}
                                              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
                                            />
                                            {draft?.files?.licenseFile ? (
                                              <div className="text-xs text-gray-500 mt-1">Selected: {draft.files.licenseFile.name}</div>
                                            ) : null}
                                          </div>
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                ) : (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                        <div className="text-xs font-semibold text-gray-600 mb-2">Contact</div>
                                        <div className="text-sm text-gray-800">Email: <span className="font-semibold">{selectedEmployee.email || 'None'}</span></div>
                                        <div className="text-sm text-gray-800">Personal Email: <span className="font-semibold">{selectedEmployee.personal_email || 'None'}</span></div>
                                        <div className="text-sm text-gray-800">Contact: <span className="font-semibold">{selectedEmployee.contact || 'None'}</span></div>
                                      </div>
                                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                        <div className="text-xs font-semibold text-gray-600 mb-2">Info</div>
                                        <div className="text-sm text-gray-800">Department: <span className="font-semibold">{selectedEmployee.department || 'None'}</span></div>
                                        <div className="text-sm text-gray-800">Birthday: <span className="font-semibold">{selectedEmployee.birthday ? String(selectedEmployee.birthday) : 'None'}</span></div>
                                        <div className="text-sm text-gray-800">Date Added: <span className="font-semibold">{selectedEmployee.created_at ? formatDate(selectedEmployee.created_at) : 'None'}</span></div>
                                      </div>
                                    </div>

                                    {effectiveIsDriver && effectiveReq?.driver ? (
                                      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                                          <div className="text-sm font-semibold text-gray-900">Driver Details</div>
                                        </div>
                                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-800">
                                          <div>License Classification: <span className="font-semibold">{effectiveReq.driver.licenseClassification || 'None'}</span></div>
                                          <div>License Expiry: <span className="font-semibold">{effectiveReq.driver.licenseExpiry || 'None'}</span></div>
                                          <div>Restriction Codes: <span className="font-semibold">{Array.isArray(effectiveReq.driver.restrictionCodes) && effectiveReq.driver.restrictionCodes.length ? effectiveReq.driver.restrictionCodes.join(', ') : 'None'}</span></div>
                                          <div>Years Driving: <span className="font-semibold">{effectiveReq.driver.yearsDriving || 'None'}</span></div>
                                          <div>Truck Knowledge: <span className="font-semibold">{effectiveReq.driver.truckKnowledge || 'None'}</span></div>
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                )
                              ) : currentTab === 'documents' ? (
                                <UploadedDocumentsSection
                                  title="Uploaded Documents"
                                  emptyText="No documents uploaded for this employee."
                                  documents={effectiveDocs}
                                  getPublicUrl={getFileUrl}
                                  columns={2}
                                  variant="list"
                                />
                              ) : (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <div>
                                      <div className="text-sm font-semibold text-gray-900">Application History</div>
                                      <div className="text-xs text-gray-500">Shows applications matched by employee id / auth user id / email.</div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => fetchEmployeeHistory(selectedEmployee)}
                                      className="px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                                    >
                                      Refresh
                                    </button>
                                  </div>

                                  {employeeHistoryLoading ? (
                                    <div className="p-4 text-sm text-gray-600">Loading history…</div>
                                  ) : employeeHistoryError ? (
                                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{employeeHistoryError}</div>
                                  ) : employeeHistoryRows.length === 0 ? (
                                    <div className="p-4 text-sm text-gray-600">No applications found for this employee.</div>
                                  ) : (
                                    <div className="space-y-2">
                                      {employeeHistoryRows.map((row) => (
                                        <div key={row.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                                          <div className="flex items-start justify-between gap-3">
                                            <div>
                                              <div className="text-sm font-semibold text-gray-800">{row.jobTitle || 'Untitled Job'}</div>
                                              <div className="text-xs text-gray-500">{[row.department, row.depot].filter(Boolean).join(' • ') || '—'}</div>
                                              <div className="text-xs text-gray-400 mt-0.5">Applied: {row.created_at ? formatDate(row.created_at) : '—'}{row.updated_at ? ` • Updated: ${formatDate(row.updated_at)}` : ''}</div>
                                            </div>
                                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                              row.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                              row.status === 'hired' ? 'bg-green-100 text-green-700' :
                                              row.status === 'retracted' ? 'bg-slate-100 text-slate-700' :
                                              'bg-gray-100 text-gray-700'
                                            }`}>{String(row.status || 'submitted').toUpperCase()}</span>
                                          </div>
                                          {row.status === 'rejected' && row.rejectionRemarks ? (
                                            <div className="mt-2 text-xs text-red-700 whitespace-pre-wrap">Remarks: {row.rejectionRemarks}</div>
                                          ) : null}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // Extract payload data for display
                      const payload = selectedEmployee.payload || {};
                      const formData = payload.form || payload.applicant || payload || {};
                      const workExperiences = payload.workExperiences || [];
                      const characterReferences = payload.characterReferences || [];
                      const job = payload.job || {};
                      const isDeployed = selectedEmployee.status === "deployed";

                      const endorsedAtRaw =
                        payload?.meta?.endorsed_at ||
                        payload?.meta?.endorsedAt ||
                        selectedEmployee.created_at ||
                        selectedEmployee.raw?.created_at ||
                        null;
                      const endorsedAtLabel = endorsedAtRaw ? formatDate(endorsedAtRaw) : 'None';

                      const appliedAtRaw = selectedEmployee.created_at || selectedEmployee.raw?.created_at || null;
                      const appliedAtLabel = appliedAtRaw ? formatDate(appliedAtRaw) : 'None';

                      const statusInfo = getEndorsementStatus(selectedEmployee);
                      const shortId = String(selectedEmployee.id || '').slice(0, 8);

                      // Different tabs based on status
                      const deployedTabs = [
                        { key: 'profiling', label: 'Profiling' },
                        { key: 'documents', label: 'Documents' },
                        { key: 'onboarding', label: 'Onboarding' },
                        { key: 'evaluation', label: 'Evaluation' },
                        { key: 'separation', label: 'Separation' },
                      ];

                      const pendingTabs = [
                        { key: 'endorsement', label: 'Endorsement Details' },
                        { key: 'assessment', label: 'Assessment' },
                        { key: 'agreements', label: 'Agreements' },
                      ];

                      const detailTabs = isDeployed ? deployedTabs : pendingTabs;

                      // Reset tab if switching between deployed/pending and tab doesn't exist
                      const validTabKeys = detailTabs.map(t => t.key);
                      const currentTab = validTabKeys.includes(employeeDetailTab) ? employeeDetailTab : detailTabs[0].key;

                      return (
                      <div className="lg:w-[70%] overflow-y-auto flex flex-col">
                        {/* Employee Header */}
                        <div className="bg-white border border-gray-300 rounded-t-lg p-4 relative">
                          {/* Close button - upper right */}
                          <button 
                            onClick={() => setSelectedEmployee(null)} 
                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          
                          <div className="flex items-center gap-3 pr-10">
                            <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${getAvatarColor(selectedEmployee.name)} flex items-center justify-center text-white text-lg font-semibold shadow-md`}>
                              {getInitials(selectedEmployee.name)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-gray-800 text-lg">{selectedEmployee.name}</h4>
                              </div>
                              <p className="text-xs text-gray-500">#{shortId || String(selectedEmployee.id || '')}</p>
                              <p className="text-sm text-gray-600">
                                {displayValue(selectedEmployee.position || job.title)}
                                <span className="text-gray-400"> | </span>
                                {displayValue(selectedEmployee.depot || job.depot)}
                              </p>
                              {(() => {
                                const resumePath = formData?.resumePath || formData?.resume_path || payload?.applicant?.resumePath || payload?.form?.resumePath || null;
                                if (!resumePath) return null;
                                const resumeUrl = supabase.storage.from('resume').getPublicUrl(resumePath)?.data?.publicUrl || null;
                                if (!resumeUrl) return null;
                                return (
                                  <a
                                    href={resumeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1 mt-1"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    View Resume
                                  </a>
                                );
                              })()}
                            </div>
                            <div className="text-right space-y-1">
                              <span className={`inline-block text-xs font-semibold ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                              <p className="text-xs text-gray-500">Applied: {appliedAtLabel}</p>
                              {!isDeployed && (
                                <button
                                  type="button"
                                  className="mt-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors border-orange-300 text-orange-700 hover:bg-orange-50"
                                  title="Retract endorsement"
                                  onClick={() => {
                                    setConfirmMessage(`Retract the endorsement for ${selectedEmployee.name}? This will remove the application from HR's recruitment list.`);
                                    setConfirmCallback(() => async () => {
                                      if (!selectedEmployee.id) {
                                        setAlertMessage('Error: Application ID not found');
                                        setShowErrorAlert(true);
                                        return;
                                      }

                                      try {
                                        const applicantName = selectedEmployee.name || 'Applicant';
                                        const position = selectedEmployee.position || selectedEmployee.raw?.job_posts?.title || 'Position';
                                        const depot = selectedEmployee.depot || selectedEmployee.raw?.job_posts?.depot || '';
                                        await notifyHRAboutApplicationRetraction({
                                          applicationId: selectedEmployee.id,
                                          applicantName,
                                          position,
                                          depot
                                        });

                                        const { error } = await supabase
                                          .rpc('retract_endorsement', {
                                            p_application_id: selectedEmployee.id,
                                          });

                                        if (error) {
                                          console.error('Error retracting endorsement:', error);
                                          setAlertMessage('Failed to retract endorsement. Please try again.');
                                          setShowErrorAlert(true);
                                          return;
                                        }

                                        await loadEndorsed();
                                        await loadRetractedEndorsements();
                                        setSelectedEmployee(null);

                                        setAlertMessage('Endorsement retracted successfully. The application has been removed from HR\'s recruitment list.');
                                        setShowSuccessAlert(true);
                                      } catch (err) {
                                        console.error('Error retracting endorsement:', err);
                                        setAlertMessage('Failed to retract endorsement. Please try again.');
                                        setShowErrorAlert(true);
                                      }
                                    });
                                    setShowConfirmDialog(true);
                                  }}
                                >
                                  Retract Endorsement
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Tabs / Stepper */}
                        {isDeployed ? (
                          <div className="flex border-b border-gray-300 bg-white overflow-x-auto">
                            {detailTabs.map((tab) => (
                              <button
                                key={tab.key}
                                onClick={() => setEmployeeDetailTab(tab.key)}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                  currentTab === tab.key
                                    ? 'border-orange-500 text-orange-600 bg-orange-50'
                                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                                }`}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>
                        ) : (() => {
                          const hasAssessmentSchedule = Boolean(
                            selectedEmployee.interview_date ||
                            selectedEmployee.interview_time ||
                            selectedEmployee.interview_location
                          );

                          const interviewConfirmedRaw = selectedEmployee.interview_confirmed || selectedEmployee.raw?.interview_confirmed;
                          const interviewConfirmedNormalized = interviewConfirmedRaw ? String(interviewConfirmedRaw).trim().toLowerCase() : null;
                          const isRejected = interviewConfirmedNormalized === 'rejected';
                          const rescheduleRequested = hasAssessmentSchedule && isRejected;

                          const hasAssessmentResult = Boolean(
                            selectedEmployee.assessment_results_file ||
                            selectedEmployee.raw?.assessment_results_file ||
                            selectedEmployee.payload?.assessment_results_file
                          );

                          const assessmentComplete = hasAssessmentSchedule && !rescheduleRequested;
                          const agreementsLocked = !hasAssessmentSchedule || rescheduleRequested;

                          return (
                            <div className="bg-white border-l border-r border-b border-gray-300 px-4 pt-3 pb-4">
                              <div className="flex items-center justify-between gap-3">
                                {[ 
                                  { key: 'endorsement', label: 'Endorsement', description: 'View submitted details' },
                                  { key: 'assessment', label: 'Assessment', description: 'View assessment schedule' },
                                  { key: 'agreements', label: 'Agreements', description: 'View signing appointment and uploads' },
                                ].map((step, index, arr) => {
                                  const isActive = currentTab === step.key;

                                  const hasAnyAgreementUpload = Boolean(
                                    selectedEmployee.appointment_letter_file ||
                                    selectedEmployee.undertaking_file ||
                                    selectedEmployee.application_form_file ||
                                    selectedEmployee.undertaking_duties_file ||
                                    selectedEmployee.pre_employment_requirements_file ||
                                    selectedEmployee.id_form_file ||
                                    selectedEmployee.raw?.appointment_letter_file ||
                                    selectedEmployee.raw?.undertaking_file ||
                                    selectedEmployee.raw?.application_form_file ||
                                    selectedEmployee.raw?.undertaking_duties_file ||
                                    selectedEmployee.raw?.pre_employment_requirements_file ||
                                    selectedEmployee.raw?.id_form_file ||
                                    selectedEmployee.payload?.appointment_letter_file ||
                                    selectedEmployee.payload?.undertaking_file ||
                                    selectedEmployee.payload?.application_form_file ||
                                    selectedEmployee.payload?.undertaking_duties_file ||
                                    selectedEmployee.payload?.pre_employment_requirements_file ||
                                    selectedEmployee.payload?.id_form_file
                                  );

                                  // Determine step completion and unlock status (match existing agency gating)
                                  let isCompleted = false;
                                  let isUnlocked = false;

                                  if (step.key === 'endorsement') {
                                    isUnlocked = true;
                                    // Endorsement exists for all pending items; treat as completed.
                                    isCompleted = true;
                                  } else if (step.key === 'assessment') {
                                    isUnlocked = true;
                                    isCompleted = assessmentComplete;
                                  } else if (step.key === 'agreements') {
                                    isUnlocked = !agreementsLocked;
                                    isCompleted = !agreementsLocked && hasAnyAgreementUpload;
                                  }

                                  const isLocked = !isUnlocked;

                                  return (
                                    <button
                                      key={step.key}
                                      type="button"
                                      onClick={() => {
                                        if (!isLocked) {
                                          setEmployeeDetailTab(step.key);
                                        }
                                      }}
                                      disabled={isLocked}
                                      className={`flex-1 flex items-center text-left focus:outline-none ${
                                        isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                                      }`}
                                      title={isLocked ? `Complete previous steps to unlock ${step.label}` : ''}
                                    >
                                      <div className="flex items-center gap-3 w-full">
                                        <div
                                          className={[
                                            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors',
                                            isActive
                                              ? 'bg-red-600 text-white border-red-600 shadow'
                                              : isCompleted
                                              ? 'bg-green-50 text-green-700 border-green-500'
                                              : isLocked
                                              ? 'bg-gray-100 text-gray-400 border-gray-200'
                                              : 'bg-gray-50 text-gray-500 border-gray-300',
                                          ].join(' ')}
                                        >
                                          {isLocked ? (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                          ) : (
                                            index + 1
                                          )}
                                        </div>
                                        <div className="flex flex-col">
                                          <span
                                            className={[
                                              'text-xs font-semibold',
                                              isActive
                                                ? 'text-red-600'
                                                : isCompleted
                                                ? 'text-green-700'
                                                : isLocked
                                                ? 'text-gray-400'
                                                : 'text-gray-600',
                                            ].join(' ')}
                                          >
                                            {step.label}
                                            {isLocked && <span className="ml-1 text-[10px]">(Locked)</span>}
                                          </span>
                                          <span className={`text-[10px] ${isLocked ? 'text-gray-300' : 'text-gray-400'}`}>
                                            {step.description}
                                          </span>
                                        </div>
                                        {index < arr.length - 1 && (
                                          <div
                                            className={`flex-1 h-px mx-2 rounded-full ${
                                              isLocked || (step.key === 'assessment' && !isUnlocked)
                                                ? 'bg-gray-200'
                                                : 'bg-gradient-to-r from-gray-200 via-gray-200 to-gray-200'
                                            }`}
                                          />
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Tab Content */}
                        <div className="bg-white border border-t-0 border-gray-300 rounded-b-lg p-6 flex-1 overflow-y-auto">
                          
                          {/* PROFILING TAB */}
                          {currentTab === 'profiling' && (
                            <div className="space-y-6">
                              {/* Job Details */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Job Details</h5>
                                <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                  <div>
                                    <span className="text-gray-500">Department:</span>
                                    <span className="ml-2">{displayValue(formData.department)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Position Applying For:</span>
                                    <span className="ml-2">{displayValue(formData.position || job.title || selectedEmployee.position)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Depot:</span>
                                    <span className="ml-2">{displayValue(formData.depot || job.depot || selectedEmployee.depot)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Date Available:</span>
                                    <span className="ml-2">{displayDate(formData.dateAvailable)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Currently Employed:</span>
                                    <span className="ml-2">{displayValue(formData.employed)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Employment Status:</span>
                                    <span className="ml-2">{displayValue(getEmploymentStatusForEmployee(selectedEmployee))}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Personal Information */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Personal Information</h5>
                                <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                  <div className="md:col-span-2">
                                    <span className="text-gray-500">Name:</span>
                                    <span className="ml-2">
                                      {displayValue(
                                        formatNameLastFirstMiddle({
                                          last: formData.lastName || formData.lname || selectedEmployee.last,
                                          first: formData.firstName || formData.fname || selectedEmployee.first,
                                          middle: formData.middleName || formData.mname || selectedEmployee.middle,
                                        })
                                      )}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Sex:</span>
                                    <span className="ml-2">{displayValue(formData.sex)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Birthday:</span>
                                    <span className="ml-2">{displayDate(formData.birthday)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Age:</span>
                                    <span className="ml-2">{displayValue(calculateAge(formData.birthday))}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Marital Status:</span>
                                    <span className="ml-2">{displayValue(formData.maritalStatus || formData.marital_status)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Contact Number:</span>
                                    <span className="ml-2">{displayValue(formData.contactNumber || formData.contact || selectedEmployee.contact)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Email Address:</span>
                                    <span className="ml-2">{displayValue(formData.email || selectedEmployee.email)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Address Information */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Address Information</h5>
                                <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 space-y-2">
                                  <div>
                                    <span className="text-gray-500">Current Address:</span>
                                    <span className="ml-2">
                                      {displayValue(formatAddress({
                                        unit: formData.unit_house_number || formData.unit_house_no || formData.residenceNo,
                                        street: formData.street,
                                        barangay: formData.barangay,
                                        city: formData.city,
                                        province: formData.province,
                                        zip: formData.zip,
                                      }))}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Alternate Address:</span>
                                    <span className="ml-2">
                                      {displayValue(formatAddress({
                                        unit: formData.residenceNoAlt,
                                        street: formData.streetAlt,
                                        barangay: null,
                                        city: formData.cityAlt,
                                        province: null,
                                        zip: formData.zipAlt,
                                      }))}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Education & Skills */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Education & Skills</h5>
                                <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 space-y-4">
                                  {/* Highest Educational Attainment */}
                                  <div>
                                    <div className="font-medium text-gray-700 mb-2">Highest Educational Attainment:</div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                      <div>
                                        <span className="text-gray-500">Educational Level:</span>
                                        <span className="ml-2">{displayValue(formData.education || formData.educational_attainment)}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Year Graduated:</span>
                                        <span className="ml-2">{displayValue(formData.tertiaryYear || formData.year_graduated)}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">School/Institution:</span>
                                        <span className="ml-2">{displayValue(formData.tertiarySchool || formData.institution_name)}</span>
                                      </div>
                                      <div className="md:col-span-3">
                                        <span className="text-gray-500">Course/Program:</span>
                                        <span className="ml-2">{displayValue(formData.tertiaryProgram)}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Skills */}
                                  <div>
                                    <span className="text-gray-500">Skills:</span>
                                    <div className="ml-2 mt-1">
                                      {formData.skills ? (
                                        typeof formData.skills === 'string' ? (
                                          <span className="text-gray-800">{formData.skills}</span>
                                        ) : Array.isArray(formData.skills) ? (
                                          <div className="flex flex-wrap gap-2">
                                            {formData.skills.map((skill, idx) => (
                                              <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-gray-800 text-sm">
                                                {skill}
                                              </span>
                                            ))}
                                          </div>
                                        ) : (
                                          <span className="text-gray-800">{String(formData.skills)}</span>
                                        )
                                      ) : (
                                        renderNone()
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Specialized Training */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Specialized Training</h5>
                                <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                  <div>
                                    <span className="text-gray-500">Training/Certification Name:</span>
                                    <span className="ml-2">{displayValue(formData.specializedTraining)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Year Completed:</span>
                                    <span className="ml-2">{displayValue(formData.specializedYear)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* License Information (only for Delivery Drivers) */}
                              {isDeliveryCrew(selectedEmployee, job) && (
                                <div>
                                  <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">License Information</h5>
                                  <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                      <div>
                                        <span className="text-gray-500">License Classification:</span>
                                        <span className="ml-2">{displayValue(formData.licenseClassification)}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">License Expiry Date:</span>
                                        <span className="ml-2">{displayDate(formData.licenseExpiry)}</span>
                                      </div>
                                      {formData.restrictionCodes && Array.isArray(formData.restrictionCodes) && formData.restrictionCodes.length > 0 && (
                                        <div className="md:col-span-2">
                                          <span className="text-gray-500">Restriction Codes:</span>
                                          <div className="ml-2 mt-1 flex flex-wrap gap-2">
                                            {formData.restrictionCodes.map((code, idx) => (
                                              <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-gray-800 text-sm">
                                                {code}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                      <div className="text-xs font-semibold text-gray-600 mb-2">Photocopy of License</div>
                                      {(() => {
                                        const isPdfUrl = (url) => /\.pdf($|\?|#)/i.test(String(url || ''));
                                        const isImageUrl = (url) => /\.(png|jpe?g|webp|gif)($|\?|#)/i.test(String(url || ''));

                                        if (loadingRequirements) {
                                          return <div className="text-xs text-gray-400">Loading…</div>;
                                        }

                                        const payloadRequirements =
                                          payload?.requirements ||
                                          payload?.form?.requirements ||
                                          payload?.applicant?.requirements ||
                                          null;

                                        const licenseReq =
                                          payloadRequirements?.license ||
                                          employeeRequirements?.license ||
                                          employeeRequirements?.requirements?.license ||
                                          {};

                                        const photocopyPath =
                                          licenseReq.filePath ||
                                          licenseReq.file_path ||
                                          licenseReq.licenseFilePath ||
                                          licenseReq.license_file_path ||
                                          licenseReq.photocopyPath ||
                                          licenseReq.photocopy_path ||
                                          licenseReq.licensePhotocopyPath ||
                                          licenseReq.license_photocopy_path ||
                                          null;

                                        const photocopyUrl = photocopyPath
                                          ? String(photocopyPath).startsWith('http')
                                            ? String(photocopyPath)
                                            : getFileUrl(photocopyPath)
                                          : null;

                                        if (!photocopyUrl) return <div className="text-xs text-gray-400 italic">None</div>;

                                        return (
                                          <div className="space-y-3">
                                            <div>
                                              <a href={photocopyUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                                                Open
                                              </a>
                                            </div>
                                            {isImageUrl(photocopyUrl) ? (
                                              <a href={photocopyUrl} target="_blank" rel="noopener noreferrer">
                                                <img src={photocopyUrl} alt="License Photocopy" className="w-full max-h-[420px] object-contain bg-gray-50 rounded" />
                                              </a>
                                            ) : isPdfUrl(photocopyUrl) ? (
                                              <iframe title="License Photocopy" src={photocopyUrl} className="w-full h-[420px] rounded bg-gray-50 border" />
                                            ) : (
                                              <div className="text-xs text-gray-400">Preview unavailable. Use Open.</div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Driving History (only for Delivery Drivers) */}
                              {isDeliveryCrew(selectedEmployee, job) && (
                                <>
                                  <div>
                                    <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Driving History</h5>
                                    <div className="space-y-4">
                                      <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                                        <div>
                                          <span className="text-gray-500">Years of Driving Experience:</span>
                                          <span className="ml-2">{displayValue(formData.yearsDriving)}</span>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Has Truck Troubleshooting Knowledge:</span>
                                          <span className="ml-2">{formData.truckKnowledge === 'yes' ? 'Yes' : formData.truckKnowledge === 'no' ? 'No' : renderNone()}</span>
                                        </div>
                                        <div className="md:col-span-2">
                                          <span className="text-gray-500">Vehicles Driven:</span>
                                          {Array.isArray(formData.vehicleTypes) && formData.vehicleTypes.filter(Boolean).length > 0 ? (
                                            <div className="ml-2 mt-1 flex flex-wrap gap-2">
                                              {formData.vehicleTypes.filter(Boolean).map((vehicle, idx) => (
                                                <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-gray-800 text-sm">
                                                  {vehicle}
                                                </span>
                                              ))}
                                            </div>
                                          ) : (
                                            <span className="ml-2">{renderNone()}</span>
                                          )}
                                        </div>

                                        {formData.troubleshootingTasks && Array.isArray(formData.troubleshootingTasks) && formData.troubleshootingTasks.length > 0 && (
                                          <div className="md:col-span-2">
                                            <span className="text-gray-500">Troubleshooting Capabilities:</span>
                                            <div className="ml-2 mt-1 flex flex-wrap gap-2">
                                              {formData.troubleshootingTasks.map((task, idx) => (
                                                <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-gray-800 text-sm">
                                                  {task}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Medical Information</h5>
                                    <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                      <div>
                                        <span className="text-gray-500">Taking Medications:</span>
                                        <span className="ml-2">{isMedicalInfoUnanswered(formData) ? renderNA() : (formData.takingMedications === true ? 'Yes' : formData.takingMedications === false ? 'No' : renderNone())}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Medication Reason:</span>
                                        <span className="ml-2">{isMedicalInfoUnanswered(formData) ? renderNA() : (formData.takingMedications ? displayValue(formData.medicationReason) : renderNone())}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Has Taken Medical Test:</span>
                                        <span className="ml-2">{isMedicalInfoUnanswered(formData) ? renderNA() : (formData.tookMedicalTest === true ? 'Yes' : formData.tookMedicalTest === false ? 'No' : renderNone())}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Medical Test Date:</span>
                                        <span className="ml-2">{isMedicalInfoUnanswered(formData) ? renderNA() : (formData.tookMedicalTest ? displayDate(formData.medicalTestDate) : renderNone())}</span>
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )}

                              {/* Character References removed (Agency-side) */}
                            </div>
                          )}

                          {/* DOCUMENTS TAB */}
                          {currentTab === 'documents' && (
                            <div className="space-y-6">
                              <div className="mb-4">
                                <h5 className="font-semibold text-gray-800">Required Documents</h5>
                              </div>

                              {loadingDocuments ? (
                                <div className="text-center py-8 text-gray-500">Loading documents...</div>
                              ) : (
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-gray-600 font-medium">Document</th>
                                        <th className="px-4 py-3 text-left text-gray-600 font-medium">File</th>
                                        <th className="px-4 py-3 text-left text-gray-600 font-medium">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {employeeDocuments.length === 0 ? (
                                        <tr>
                                          <td colSpan="3" className="px-4 py-8 text-center text-gray-500">
                                            No documents found
                                          </td>
                                        </tr>
                                      ) : (
                                        employeeDocuments.map((doc) => {
                                          const displayStatus = doc.status || (doc.file ? 'Submitted' : 'Missing');
                                          const badgeClass =
                                            displayStatus === 'Submitted' ? 'bg-orange-100 text-orange-700' :
                                            displayStatus === 'Re-submit' ? 'bg-red-100 text-red-700' :
                                            displayStatus === 'Validated' ? 'bg-green-100 text-green-700' :
                                            'bg-gray-100 text-gray-600';

                                          return (
                                            <tr key={doc.id} className="hover:bg-gray-50/50">
                                              <td className="px-4 py-3 text-gray-800">{doc.name}</td>
                                              <td className="px-4 py-3">
                                                {doc.file ? (
                                                  <a
                                                    href={doc.previewUrl || '#'}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline"
                                                  >
                                                    {doc.file.name}
                                                  </a>
                                                ) : (
                                                  <span className="text-gray-400 italic">No file</span>
                                                )}
                                              </td>
                                              <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${badgeClass}`}>
                                                  {displayStatus}
                                                </span>
                                              </td>
                                            </tr>
                                          );
                                        })
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {/* Specialized Training */}
                              <div className="mt-6">
                                <div className="mb-4">
                                  <h5 className="font-semibold text-gray-800">Specialized Training</h5>
                                </div>

                                {(() => {
                                  const rawPayload = selectedEmployee?.payload || selectedEmployee?.raw?.payload || {};
                                  let payloadObj = {};
                                  try {
                                    payloadObj = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
                                  } catch {
                                    payloadObj = {};
                                  }

                                  const form = payloadObj?.applicant || payloadObj?.form || payloadObj || {};

                                  const trainingName = form?.specializedTraining || form?.specialized_training || null;
                                  const trainingYear = form?.specializedYear || form?.specialized_year || null;

                                  const trainingCertPath =
                                    form?.trainingCertFilePath ||
                                    form?.training_cert_file_path ||
                                    form?.trainingCertPath ||
                                    form?.training_cert_path ||
                                    form?.specializedTrainingCertFilePath ||
                                    form?.specialized_training_cert_file_path ||
                                    payloadObj?.trainingCertFilePath ||
                                    payloadObj?.training_cert_file_path ||
                                    payloadObj?.trainingCertPath ||
                                    payloadObj?.training_cert_path ||
                                    null;

                                  const trainingCertUrl = trainingCertPath ? getFileUrl(trainingCertPath) : null;
                                  const hasAnything = Boolean(String(trainingName || '').trim() || String(trainingYear || '').trim() || trainingCertPath);

                                  if (!hasAnything) {
                                    return (
                                      <div className="border border-gray-200 rounded-lg p-6 text-center">
                                        <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <p className="text-sm text-gray-500">No uploaded specialized training yet.</p>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                      <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-gray-600 border-b bg-gray-50">
                                        <div className="col-span-5">Training</div>
                                        <div className="col-span-2">Year</div>
                                        <div className="col-span-5">Certificate</div>
                                      </div>
                                      <div className="grid grid-cols-12 items-center gap-3 px-3 py-3">
                                        <div className="col-span-12 md:col-span-5 text-sm text-gray-800">
                                          {trainingName ? String(trainingName) : <span className="text-gray-400 italic">None</span>}
                                        </div>
                                        <div className="col-span-12 md:col-span-2 text-sm text-gray-700">
                                          {trainingYear ? String(trainingYear) : <span className="text-gray-400 italic">—</span>}
                                        </div>
                                        <div className="col-span-12 md:col-span-5 text-sm">
                                          {trainingCertUrl ? (
                                            <div className="flex items-center gap-2">
                                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gray-400">
                                                <path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75ZM6.75 15a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V15.75a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V15.75a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                                              </svg>
                                              <a
                                                href={trainingCertUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800 underline text-sm"
                                              >
                                                {String(trainingCertPath).split('/').pop() || 'View File'}
                                              </a>
                                            </div>
                                          ) : (
                                            <span className="text-gray-400 italic text-sm">No file uploaded yet</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Assessment and Agreement Records Section */}
                              <div className="mt-6">
                                <div className="mb-4">
                                  <h5 className="font-semibold text-gray-800">Assessment and Agreement Records</h5>
                                </div>

                                {assessmentRecords.length === 0 ? (
                                  <div className="border border-gray-200 rounded-lg p-6 text-center">
                                    <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="text-sm text-gray-500">No assessment or agreement records found.</p>
                                    <p className="text-xs text-gray-400 mt-1">Files from the application process will appear here.</p>
                                  </div>
                                ) : (
                                  <div className="space-y-6">
                                    {assessmentRecords.filter(r => r.type === 'assessment').length > 0 && (
                                      <div>
                                        <div className="bg-gray-100 text-gray-800 px-3 py-2 text-sm font-semibold border rounded-t-md">Assessment Files</div>
                                        <div className="border border-gray-200 rounded-b-lg overflow-hidden">
                                          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-gray-600 border-b bg-gray-50">
                                            <div className="col-span-6">Document</div>
                                            <div className="col-span-6">File</div>
                                          </div>
                                          {assessmentRecords
                                            .filter(r => r.type === 'assessment')
                                            .map((record) => (
                                            <div key={record.id} className="border-b">
                                              <div className="grid grid-cols-12 items-center gap-3 px-3 py-3">
                                                <div className="col-span-12 md:col-span-6 text-sm text-gray-800 flex items-center gap-2">
                                                  {record.documentName === 'Interview Details' ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-600">
                                                      <path fillRule="evenodd" d="M4.5 3.75a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V6.75a3 3 0 0 0-3-3h-15Zm4.125 3a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Zm-3.873 8.703a4.126 4.126 0 0 1 7.746 0 .75.75 0 0 1-.372.84A7.72 7.72 0 0 1 8 18.75a7.72 7.72 0 0 1-5.501-2.607.75.75 0 0 1-.372-.84Zm4.622-1.44a5.076 5.076 0 0 0 5.024 0l.348-1.597c.271.1.56.153.856.153h6a.75.75 0 0 0 0-1.5h-3.045c.01-.1.02-.2.02-.3V11.25c0-5.385-4.365-9.75-9.75-9.75S2.25 5.865 2.25 11.25v.756a2.25 2.25 0 0 0 1.988 2.246l.217.037a2.25 2.25 0 0 0 2.163-1.684l1.38-4.276a1.125 1.125 0 0 1 1.08-.82Z" clipRule="evenodd" />
                                                    </svg>
                                                  ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-600">
                                                      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.525-1.72-1.72a.75.75 0 1 0-1.06 1.061l2.25 2.25a.75.75 0 0 0 1.144-.094l3.843-5.15Z" clipRule="evenodd" />
                                                    </svg>
                                                  )}
                                                  {record.documentName}
                                                </div>
                                                <div className="col-span-12 md:col-span-6 text-sm">
                                                  {record.fileUrl ? (
                                                    <div className="flex items-center gap-2">
                                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gray-400">
                                                        <path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75ZM6.75 15a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V15.75a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V15.75a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                                                      </svg>
                                                      <a
                                                        href={record.fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 underline text-sm"
                                                      >
                                                        {record.fileName}
                                                      </a>
                                                      <button
                                                        onClick={async () => {
                                                          try {
                                                            const response = await fetch(record.fileUrl);
                                                            const blob = await response.blob();
                                                            const url = window.URL.createObjectURL(blob);
                                                            const link = document.createElement('a');
                                                            link.href = url;
                                                            link.download = record.fileName;
                                                            document.body.appendChild(link);
                                                            link.click();
                                                            document.body.removeChild(link);
                                                            window.URL.revokeObjectURL(url);
                                                          } catch (error) {
                                                            console.error('Error downloading file:', error);
                                                            window.open(record.fileUrl, '_blank');
                                                          }
                                                        }}
                                                        className="text-purple-600 hover:text-purple-800 underline text-sm"
                                                      >
                                                        Download
                                                      </button>
                                                    </div>
                                                  ) : (
                                                    <span className="text-gray-400 italic text-sm">No file uploaded yet</span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {assessmentRecords.filter(r => r.type === 'agreement').length > 0 && (
                                      <div>
                                        <div className="bg-gray-100 text-gray-800 px-3 py-2 text-sm font-semibold border rounded-t-md">Agreement Documents</div>
                                        <div className="border border-gray-200 rounded-b-lg overflow-hidden">
                                          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-gray-600 border-b bg-gray-50">
                                            <div className="col-span-6">&nbsp;</div>
                                            <div className="col-span-6">File</div>
                                          </div>
                                          {assessmentRecords
                                            .filter(r => r.type === 'agreement')
                                            .map((record) => (
                                            <div key={record.id} className="border-b">
                                              <div className="grid grid-cols-12 items-center gap-3 px-3 py-3">
                                                <div className="col-span-12 md:col-span-6 text-sm text-gray-800">
                                                  {record.documentName}
                                                </div>
                                                <div className="col-span-12 md:col-span-6 text-sm">
                                                  {record.fileUrl ? (
                                                    <div className="flex items-center gap-2">
                                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gray-400">
                                                        <path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75ZM6.75 15a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V15.75a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V15.75a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                                                      </svg>
                                                      <a
                                                        href={record.fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 underline text-sm"
                                                      >
                                                        {record.fileName}
                                                      </a>
                                                      <button
                                                        onClick={async () => {
                                                          try {
                                                            const response = await fetch(record.fileUrl);
                                                            const blob = await response.blob();
                                                            const url = window.URL.createObjectURL(blob);
                                                            const link = document.createElement('a');
                                                            link.href = url;
                                                            link.download = record.fileName;
                                                            document.body.appendChild(link);
                                                            link.click();
                                                            document.body.removeChild(link);
                                                            window.URL.revokeObjectURL(url);
                                                          } catch (error) {
                                                            console.error('Error downloading file:', error);
                                                            window.open(record.fileUrl, '_blank');
                                                          }
                                                        }}
                                                        className="text-purple-600 hover:text-purple-800 underline text-sm"
                                                      >
                                                        Download
                                                      </button>
                                                    </div>
                                                  ) : (
                                                    <span className="text-gray-400 italic text-sm">No file uploaded yet</span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* ONBOARDING TAB */}
                          {currentTab === 'onboarding' && (
                            <div className="space-y-6">
                              <div className="flex items-center justify-between mb-4">
                                <h5 className="text-lg font-semibold text-gray-800">Onboarding Records</h5>
                              </div>

                              {onboardingLoading ? (
                                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-sm text-gray-500">
                                  Loading onboarding records...
                                </div>
                              ) : onboardingError ? (
                                <div className="bg-white rounded-lg border border-red-200 p-6 text-sm text-red-700">
                                  Failed to load onboarding records: {onboardingError}
                                </div>
                              ) : onboardingItems.length === 0 ? (
                                <div className="bg-white rounded-lg border border-gray-200">
                                  <div className="flex px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600 uppercase tracking-wider">
                                    <div className="flex-1 text-center">Item Name</div>
                                    <div className="flex-1 text-center">Description</div>
                                    <div className="flex-1 text-center">Date Issued</div>
                                    <div className="flex-1 text-center">Attachment</div>
                                  </div>
                                  <div className="p-16 text-center">
                                    <svg className="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="text-gray-400 text-sm">No onboarding records yet</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                  <div className="flex px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600 uppercase tracking-wider">
                                    <div className="flex-1 text-center">Item Name</div>
                                    <div className="flex-1 text-center">Description</div>
                                    <div className="flex-1 text-center">Date Issued</div>
                                    <div className="flex-1 text-center">Attachment</div>
                                  </div>

                                  <div className="divide-y divide-gray-200">
                                    {onboardingItems.map((ob) => (
                                      <div key={ob.id} className="flex px-6 py-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex-1 text-sm text-gray-800 font-medium text-center">
                                          {ob.item || 'None'}
                                        </div>
                                        <div className="flex-1 text-sm text-gray-600 text-center">
                                          {ob.description || <span className="text-gray-400">None</span>}
                                        </div>
                                        <div className="flex-1 text-sm text-gray-600 text-center">
                                          {ob.date ? new Date(ob.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'None'}
                                        </div>
                                        <div className="flex-1 text-sm flex justify-center">
                                          {ob.fileUrl ? (
                                            <a
                                              href={ob.fileUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                              </svg>
                                              View
                                            </a>
                                          ) : (
                                            <span className="text-gray-400">None</span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* EVALUATION TAB */}
                          {currentTab === 'evaluation' && (
                            <div className="space-y-6">
                              <h5 className="font-semibold text-gray-800 mb-4">Evaluation Records</h5>

                              <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-4 py-3 text-left text-gray-600">Evaluation Type</th>
                                      <th className="px-4 py-3 text-left text-gray-600">Period</th>
                                      <th className="px-4 py-3 text-left text-gray-600">Score/Rating</th>
                                      <th className="px-4 py-3 text-left text-gray-600">Conducted By</th>
                                      <th className="px-4 py-3 text-left text-gray-600">Date</th>
                                      <th className="px-4 py-3 text-left text-gray-600">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr className="border-t border-gray-200">
                                      <td className="px-4 py-4 text-gray-500 italic text-center" colSpan="6">
                                        No evaluations have been conducted yet.
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>

                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
                                <h6 className="font-medium text-gray-700 mb-2">Evaluation Summary</h6>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Total Evaluations:</span>
                                    <span className="ml-2 font-medium text-gray-800">0</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Average Score:</span>
                                    <span className="ml-2 font-medium text-gray-800">N/A</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Last Evaluation:</span>
                                    <span className="ml-2 font-medium text-gray-800">N/A</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* SEPARATION TAB - View Only */}
                          {currentTab === 'separation' && (
                            <div className="space-y-6">
                              {/* Header with link to Separation module */}
                              <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-600">View employee's separation request status and history.</p>
                                <Link 
                                  to="/agency/separation" 
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#800000] text-white rounded-lg text-sm font-medium hover:bg-[#990000] transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                  Submit Request
                                </Link>
                              </div>

                              {/* Current Separation Status */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Current Separation Status</h5>
                                
                                {/* No Active Request - Placeholder */}
                                <div className="border border-gray-200 rounded-lg p-6 text-center">
                                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                  </div>
                                  <p className="text-sm font-medium text-gray-700">No Active Separation Request</p>
                                  <p className="text-xs text-gray-500 mt-1">This employee has no pending or active resignation requests.</p>
                                </div>
                              </div>

                              {/* Separation Request History */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Separation History</h5>
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-gray-600 font-medium">Type</th>
                                        <th className="px-4 py-3 text-left text-gray-600 font-medium">Last Working Day</th>
                                        <th className="px-4 py-3 text-left text-gray-600 font-medium">Submitted</th>
                                        <th className="px-4 py-3 text-left text-gray-600 font-medium">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      <tr>
                                        <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                                          <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                          </svg>
                                          <p className="text-sm">No separation requests found</p>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {/* Info Banner */}
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <div>
                                    <p className="text-sm text-blue-800">
                                      <strong>Need to submit a resignation request?</strong> Go to the <Link to="/agency/separation" className="underline font-semibold hover:text-blue-900">Separation</Link> module to submit and manage all employee resignation requests.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ========== PENDING STATUS TABS ========== */}

                          {/* ENDORSEMENT DETAILS TAB (for pending) */}
                          {currentTab === 'endorsement' && (
                            <div className="space-y-6">
                              {/* Job Details */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Job Details</h5>
                                <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                  <div>
                                    <span className="text-gray-500">Department:</span>
                                    <span className="ml-2">{displayValue(formData.department)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Position Applying For:</span>
                                    <span className="ml-2">{displayValue(formData.position || job.title || selectedEmployee.position)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Depot:</span>
                                    <span className="ml-2">{displayValue(formData.depot || job.depot || selectedEmployee.depot)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Date Available:</span>
                                    <span className="ml-2">{displayDate(formData.dateAvailable)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Currently Employed:</span>
                                    <span className="ml-2">{displayValue(formData.employed)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Employment Status:</span>
                                    <span className="ml-2">{displayValue(getEmploymentStatusForEmployee(selectedEmployee))}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Personal Information */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Personal Information</h5>
                                <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                  <div className="md:col-span-2">
                                    <span className="text-gray-500">Name:</span>
                                    <span className="ml-2">
                                      {displayValue(
                                        formatNameLastFirstMiddle({
                                          last: formData.lastName || formData.lname || selectedEmployee.last,
                                          first: formData.firstName || formData.fname || selectedEmployee.first,
                                          middle: formData.middleName || formData.mname || selectedEmployee.middle,
                                        })
                                      )}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Sex:</span>
                                    <span className="ml-2">{displayValue(formData.sex)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Birthday:</span>
                                    <span className="ml-2">{displayDate(formData.birthday)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Age:</span>
                                    <span className="ml-2">{displayValue(calculateAge(formData.birthday))}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Marital Status:</span>
                                    <span className="ml-2">{displayValue(formData.maritalStatus || formData.marital_status)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Contact Number:</span>
                                    <span className="ml-2">{displayValue(formData.contactNumber || formData.contact || selectedEmployee.contact)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Email Address:</span>
                                    <span className="ml-2">{displayValue(formData.email || selectedEmployee.email)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Address Information */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Address Information</h5>
                                <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 space-y-2">
                                  <div>
                                    <span className="text-gray-500">Current Address:</span>
                                    <span className="ml-2">
                                      {displayValue(formatAddress({
                                        unit: formData.unit_house_number || formData.unit_house_no || formData.residenceNo,
                                        street: formData.street,
                                        barangay: formData.barangay,
                                        city: formData.city,
                                        province: formData.province,
                                        zip: formData.zip,
                                      }))}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Alternate Address:</span>
                                    <span className="ml-2">
                                      {displayValue(formatAddress({
                                        unit: formData.residenceNoAlt,
                                        street: formData.streetAlt,
                                        barangay: null,
                                        city: formData.cityAlt,
                                        province: null,
                                        zip: formData.zipAlt,
                                      }))}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Government IDs (Declared) */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Government IDs (Declared)</h5>
                                <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                  <div>
                                    <span className="text-gray-500">SSS:</span>
                                    <span className="ml-2">{formData.hasSSS ? 'Yes' : 'No'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">PAG-IBIG:</span>
                                    <span className="ml-2">{formData.hasPAGIBIG ? 'Yes' : 'No'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">TIN:</span>
                                    <span className="ml-2">{formData.hasTIN ? 'Yes' : 'No'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">PhilHealth:</span>
                                    <span className="ml-2">{formData.hasPhilHealth ? 'Yes' : 'No'}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Education & Skills */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Education & Skills</h5>
                                <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 space-y-4">
                                  {/* Highest Educational Attainment */}
                                  <div>
                                    <div className="font-medium text-gray-700 mb-2">Highest Educational Attainment:</div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                      <div>
                                        <span className="text-gray-500">Educational Level:</span>
                                        <span className="ml-2">{displayValue(formData.education || formData.educational_attainment)}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Year Graduated:</span>
                                        <span className="ml-2">{displayValue(formData.tertiaryYear || formData.year_graduated)}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">School/Institution:</span>
                                        <span className="ml-2">{displayValue(formData.tertiarySchool || formData.institution_name)}</span>
                                      </div>
                                      <div className="md:col-span-3">
                                        <span className="text-gray-500">Course/Program:</span>
                                        <span className="ml-2">{displayValue(formData.tertiaryProgram)}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Skills */}
                                  <div>
                                    <span className="text-gray-500">Skills:</span>
                                    <div className="ml-2 mt-1">
                                      {formData.skills ? (
                                        typeof formData.skills === 'string' ? (
                                          <span className="text-gray-800">{formData.skills}</span>
                                        ) : Array.isArray(formData.skills) ? (
                                          <div className="flex flex-wrap gap-2">
                                            {formData.skills.map((skill, idx) => (
                                              <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-gray-800 text-sm">
                                                {skill}
                                              </span>
                                            ))}
                                          </div>
                                        ) : (
                                          <span className="text-gray-800">{String(formData.skills)}</span>
                                        )
                                      ) : (
                                        renderNone()
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Specialized Training */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Specialized Training</h5>
                                <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                  <div>
                                    <span className="text-gray-500">Training/Certification Name:</span>
                                    <span className="ml-2">{displayValue(formData.specializedTraining)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Year Completed:</span>
                                    <span className="ml-2">{displayValue(formData.specializedYear)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* License Information (only for Delivery Drivers) */}
                              {isDeliveryCrew(selectedEmployee, job) && (
                                <div>
                                  <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">License Information</h5>
                                  <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                      <div>
                                        <span className="text-gray-500">License Classification:</span>
                                        <span className="ml-2">{displayValue(formData.licenseClassification)}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">License Expiry Date:</span>
                                        <span className="ml-2">{displayDate(formData.licenseExpiry)}</span>
                                      </div>
                                      {formData.restrictionCodes && Array.isArray(formData.restrictionCodes) && formData.restrictionCodes.length > 0 && (
                                        <div className="md:col-span-2">
                                          <span className="text-gray-500">Restriction Codes:</span>
                                          <div className="ml-2 mt-1 flex flex-wrap gap-2">
                                            {formData.restrictionCodes.map((code, idx) => (
                                              <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-gray-800 text-sm">
                                                {code}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                      <div className="text-xs font-semibold text-gray-600 mb-2">Photocopy of License</div>
                                      {(() => {
                                        const isPdfUrl = (url) => /\.pdf($|\?|#)/i.test(String(url || ''));
                                        const isImageUrl = (url) => /\.(png|jpe?g|webp|gif)($|\?|#)/i.test(String(url || ''));

                                        if (loadingRequirements) {
                                          return <div className="text-xs text-gray-400">Loading…</div>;
                                        }

                                        const payloadRequirements =
                                          payload?.requirements ||
                                          payload?.form?.requirements ||
                                          payload?.applicant?.requirements ||
                                          null;

                                        const licenseReq =
                                          payloadRequirements?.license ||
                                          employeeRequirements?.license ||
                                          employeeRequirements?.requirements?.license ||
                                          {};

                                        const photocopyPath =
                                          licenseReq.filePath ||
                                          licenseReq.file_path ||
                                          licenseReq.licenseFilePath ||
                                          licenseReq.license_file_path ||
                                          licenseReq.photocopyPath ||
                                          licenseReq.photocopy_path ||
                                          licenseReq.licensePhotocopyPath ||
                                          licenseReq.license_photocopy_path ||
                                          null;

                                        const photocopyUrl = photocopyPath
                                          ? String(photocopyPath).startsWith('http')
                                            ? String(photocopyPath)
                                            : getFileUrl(photocopyPath)
                                          : null;

                                        if (!photocopyUrl) return <div className="text-xs text-gray-400 italic">None</div>;

                                        return (
                                          <div className="space-y-3">
                                            <div>
                                              <a href={photocopyUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                                                Open
                                              </a>
                                            </div>
                                            {isImageUrl(photocopyUrl) ? (
                                              <a href={photocopyUrl} target="_blank" rel="noopener noreferrer">
                                                <img src={photocopyUrl} alt="License Photocopy" className="w-full max-h-[420px] object-contain bg-gray-50 rounded" />
                                              </a>
                                            ) : isPdfUrl(photocopyUrl) ? (
                                              <iframe title="License Photocopy" src={photocopyUrl} className="w-full h-[420px] rounded bg-gray-50 border" />
                                            ) : (
                                              <div className="text-xs text-gray-400">Preview unavailable. Use Open.</div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Driving History (only for Delivery Drivers) */}
                              {isDeliveryCrew(selectedEmployee, job) && (
                                <>
                                  <div>
                                    <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Driving History</h5>
                                    <div className="space-y-4">
                                      <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                                        <div>
                                          <span className="text-gray-500">Years of Driving Experience:</span>
                                          <span className="ml-2">{displayValue(formData.yearsDriving)}</span>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Has Truck Troubleshooting Knowledge:</span>
                                          <span className="ml-2">{formData.truckKnowledge === 'yes' ? 'Yes' : formData.truckKnowledge === 'no' ? 'No' : renderNone()}</span>
                                        </div>
                                        <div className="md:col-span-2">
                                          <span className="text-gray-500">Vehicles Driven:</span>
                                          {Array.isArray(formData.vehicleTypes) && formData.vehicleTypes.filter(Boolean).length > 0 ? (
                                            <div className="ml-2 mt-1 flex flex-wrap gap-2">
                                              {formData.vehicleTypes.filter(Boolean).map((vehicle, idx) => (
                                                <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-gray-800 text-sm">
                                                  {vehicle}
                                                </span>
                                              ))}
                                            </div>
                                          ) : (
                                            <span className="ml-2">{renderNone()}</span>
                                          )}
                                        </div>

                                        {formData.troubleshootingTasks && Array.isArray(formData.troubleshootingTasks) && formData.troubleshootingTasks.length > 0 && (
                                          <div className="md:col-span-2">
                                            <span className="text-gray-500">Troubleshooting Capabilities:</span>
                                            <div className="ml-2 mt-1 flex flex-wrap gap-2">
                                              {formData.troubleshootingTasks.map((task, idx) => (
                                                <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-gray-800 text-sm">
                                                  {task}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Medical Information</h5>
                                    <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                      <div>
                                        <span className="text-gray-500">Taking Medications:</span>
                                        <span className="ml-2">{isMedicalInfoUnanswered(formData) ? renderNA() : (formData.takingMedications === true ? 'Yes' : formData.takingMedications === false ? 'No' : renderNone())}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Medication Reason:</span>
                                        <span className="ml-2">{isMedicalInfoUnanswered(formData) ? renderNA() : (formData.takingMedications ? displayValue(formData.medicationReason) : renderNone())}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Has Taken Medical Test:</span>
                                        <span className="ml-2">{isMedicalInfoUnanswered(formData) ? renderNA() : (formData.tookMedicalTest === true ? 'Yes' : formData.tookMedicalTest === false ? 'No' : renderNone())}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Medical Test Date:</span>
                                        <span className="ml-2">{isMedicalInfoUnanswered(formData) ? renderNA() : (formData.tookMedicalTest ? displayDate(formData.medicalTestDate) : renderNone())}</span>
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )}

                              {/* Character References removed (Agency-side) */}
                            </div>
                          )}

                          {/* ASSESSMENT TAB (for pending) */}
                          {currentTab === 'assessment' && (() => {
                            const hasInterview = selectedEmployee.interview_date || selectedEmployee.interview_time || selectedEmployee.interview_location;
                            const interviewDate = selectedEmployee.interview_date 
                              ? formatDate(selectedEmployee.interview_date) 
                              : null;
                            const interviewTime = selectedEmployee.interview_time 
                              ? new Date(`2000-01-01T${selectedEmployee.interview_time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                              : null;
                            // Normalize interview_confirmed value (handle case-insensitive and trim)
                            // Check both selectedEmployee and raw data as fallback
                            const interviewConfirmedRaw = selectedEmployee.interview_confirmed || selectedEmployee.raw?.interview_confirmed;
                            const interviewConfirmedNormalized = interviewConfirmedRaw 
                              ? String(interviewConfirmedRaw).trim() 
                              : null;
                            const isRejected = interviewConfirmedNormalized && interviewConfirmedNormalized.toLowerCase() === 'rejected';

                            let payloadObj = selectedEmployee?.raw?.payload ?? selectedEmployee?.payload ?? {};
                            if (typeof payloadObj === 'string') {
                              try { payloadObj = JSON.parse(payloadObj); } catch { payloadObj = {}; }
                            }
                            const reqObj = payloadObj?.interview_reschedule_request || payloadObj?.interviewRescheduleRequest || null;
                            const reqHandled = Boolean(reqObj && (reqObj.handled_at || reqObj.handledAt));
                            const reqActive = Boolean(
                              reqObj &&
                              typeof reqObj === 'object' &&
                              !reqHandled &&
                              (reqObj.requested_at || reqObj.requestedAt || reqObj.note || reqObj.preferred_date || reqObj.preferredDate)
                            );
                            const reqEver = Boolean(
                              reqObj &&
                              (typeof reqObj !== 'object' ||
                                reqObj.requested_at ||
                                reqObj.requestedAt ||
                                reqObj.note ||
                                reqObj.preferred_date ||
                                reqObj.preferredDate ||
                                reqObj.preferred_time_from ||
                                reqObj.preferredTimeFrom ||
                                reqObj.preferred_time_to ||
                                reqObj.preferredTimeTo ||
                                reqObj.handled_at ||
                                reqObj.handledAt)
                            );
                            const isRescheduleRequested = Boolean(hasInterview && (isRejected || reqActive));
                            const hasEverRescheduleRequest = Boolean(hasInterview && (isRejected || reqEver));
                            
                            return (
                            <div className="space-y-6">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="font-semibold text-gray-800">Assessment</h5>
                              </div>
                              
                              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-[#800000]/10 text-[#800000] flex items-center justify-center">
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                        <path fillRule="evenodd" d="M6.75 2.25A2.25 2.25 0 0 0 4.5 4.5v15A2.25 2.25 0 0 0 6.75 21.75h10.5A2.25 2.25 0 0 0 19.5 19.5v-15A2.25 2.25 0 0 0 17.25 2.25H6.75Zm.75 4.5a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                    <div>
                                      <div className="text-sm font-semibold text-gray-900">Assessment Schedule</div>
                                      <div className="text-xs text-gray-500">Set by HR after review</div>
                                    </div>
                                  </div>
                                  {hasInterview && (
                                    <span className={`text-xs px-2 py-1 rounded-full font-semibold border ${
                                      isRescheduleRequested
                                        ? 'bg-orange-50 text-orange-800 border-orange-200'
                                        : 'bg-cyan-50 text-cyan-800 border-cyan-200'
                                    }`}>
                                      {isRescheduleRequested ? 'Reschedule Requested' : 'Schedule Set'}
                                    </span>
                                  )}
                                </div>
                                {hasInterview ? (
                                  <>
                                    <div className="grid grid-cols-1 gap-2 text-sm text-gray-700">
                                      <div className="grid grid-cols-[110px_1fr] gap-4">
                                        <span className="text-gray-500">Date</span>
                                        <span className="font-semibold text-gray-900 text-left break-words">{interviewDate || 'None'}</span>
                                      </div>
                                      <div className="grid grid-cols-[110px_1fr] gap-4">
                                        <span className="text-gray-500">Time</span>
                                        <span className="font-semibold text-gray-900 text-left break-words">{interviewTime || 'None'}</span>
                                      </div>
                                      <div className="grid grid-cols-[110px_1fr] gap-4">
                                        <span className="text-gray-500">Location</span>
                                        <span className="font-semibold text-gray-900 text-left break-words">{selectedEmployee.interview_location || 'None'}</span>
                                      </div>
                                      <div className="grid grid-cols-[110px_1fr] gap-4">
                                        <span className="text-gray-500">Interviewer</span>
                                        <span className="font-semibold text-gray-900 text-left break-words">{selectedEmployee.interviewer || 'None'}</span>
                                      </div>
                                    </div>

                                    <div className="mt-3 flex items-center justify-between">
                                      <div className="text-xs text-gray-500">
                                        {isRescheduleRequested
                                          ? 'Reschedule has been requested. Please wait for HR to update the schedule.'
                                          : hasEverRescheduleRequest
                                            ? 'A reschedule was already requested once for this interview.'
                                            : 'If you need changes, request a reschedule.'}
                                      </div>
                                      {!hasEverRescheduleRequest && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setRescheduleNote('');
                                            setReschedulePreferredDate('');
                                            setReschedulePreferredTimeFrom('');
                                            setReschedulePreferredTimeTo('');
                                            setShowRejectInterviewDialog(true);
                                          }}
                                          className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 text-sm font-medium transition-colors"
                                        >
                                          Request Reschedule
                                        </button>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="grid grid-cols-1 gap-2 text-sm text-gray-700">
                                      <div className="grid grid-cols-[110px_1fr] gap-4">
                                        <span className="text-gray-500">Date</span>
                                        <span className="text-gray-500 italic text-left">To be scheduled</span>
                                      </div>
                                      <div className="grid grid-cols-[110px_1fr] gap-4">
                                        <span className="text-gray-500">Time</span>
                                        <span className="text-gray-500 italic text-left">To be scheduled</span>
                                      </div>
                                      <div className="grid grid-cols-[110px_1fr] gap-4">
                                        <span className="text-gray-500">Location</span>
                                        <span className="text-gray-500 italic text-left">To be scheduled</span>
                                      </div>
                                      <div className="grid grid-cols-[110px_1fr] gap-4">
                                        <span className="text-gray-500">Interviewer</span>
                                        <span className="text-gray-500 italic text-left">To be assigned</span>
                                      </div>
                                    </div>
                                    <div className="mt-3 text-xs text-gray-500">
                                      Important Reminder: The assessment schedule will be set by HR once the endorsement is reviewed.
                                    </div>
                                  </>
                                )}
                              </div>

                              {/* Assessment Remarks and Files */}
                              <div className="mt-6">
                                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                  <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
                                    <div className="text-sm font-semibold text-gray-900">Assessment Remarks and Files</div>
                                  </div>

                                  {(() => {
                                    const payloadObj = parsePayloadObject(selectedEmployee.payload ?? selectedEmployee.raw?.payload ?? {});

                                    const remarks =
                                      selectedEmployee.assessment_remarks ||
                                      selectedEmployee.raw?.assessment_remarks ||
                                      selectedEmployee.payload?.assessment_remarks ||
                                      selectedEmployee.payload?.assessmentRemarks ||
                                      selectedEmployee.raw?.payload?.assessment_remarks ||
                                      selectedEmployee.raw?.payload?.assessmentRemarks ||
                                      selectedEmployee.interview_notes ||
                                      selectedEmployee.raw?.interview_notes ||
                                      selectedEmployee.payload?.interview_notes ||
                                      selectedEmployee.payload?.interviewNotes ||
                                      selectedEmployee.raw?.payload?.interview_notes ||
                                      selectedEmployee.raw?.payload?.interviewNotes ||
                                      null;

                                    const normalized = remarks ? String(remarks).trim() : '';
                                    const isEmpty =
                                      !normalized ||
                                      normalized.toLowerCase() === 'no uploaded remarks or files.';
                                    const displayText = isEmpty ? 'No uploaded remarks or files.' : normalized;

                                    const rawNotesList = payloadObj?.interview_notes_attachments || payloadObj?.interviewNotesAttachments;
                                    const notesAttachments = Array.isArray(rawNotesList) ? rawNotesList.slice() : [];
                                    const singleNote = payloadObj?.interview_notes_attachment || payloadObj?.interviewNotesAttachment || null;
                                    if (singleNote && typeof singleNote === 'object') {
                                      const singlePath = singleNote.path || singleNote.file_path || singleNote.filePath || singleNote.storagePath || null;
                                      if (singlePath && !notesAttachments.some((f) => (f?.path || f?.file_path || f?.filePath || f?.storagePath) === singlePath)) {
                                        notesAttachments.push(singleNote);
                                      }
                                    }

                                    const notesFilePath =
                                      selectedEmployee.interview_notes_file ||
                                      selectedEmployee.raw?.interview_notes_file ||
                                      payloadObj?.interview_notes_file ||
                                      payloadObj?.interviewNotesFile ||
                                      null;
                                    const notesFileLabel =
                                      selectedEmployee.interview_notes_file_label ||
                                      selectedEmployee.raw?.interview_notes_file_label ||
                                      payloadObj?.interview_notes_file_label ||
                                      payloadObj?.interviewNotesFileLabel ||
                                      null;
                                    if (notesFilePath && !notesAttachments.some((f) => (f?.path || f?.file_path || f?.filePath || f?.storagePath) === notesFilePath)) {
                                      notesAttachments.push({
                                        path: notesFilePath,
                                        label: notesFileLabel || 'Assessment Attachment',
                                        originalName: null,
                                        uploadedAt: null,
                                      });
                                    }

                                    const legacyAssessmentFile =
                                      selectedEmployee.assessment_results_file ||
                                      selectedEmployee.raw?.assessment_results_file ||
                                      payloadObj?.assessment_results_file ||
                                      null;
                                    if (legacyAssessmentFile && !notesAttachments.some((f) => (f?.path || f?.file_path || f?.filePath || f?.storagePath) === legacyAssessmentFile)) {
                                      notesAttachments.push({
                                        path: legacyAssessmentFile,
                                        label: 'Assessment Result',
                                        originalName: null,
                                        uploadedAt: null,
                                      });
                                    }

                                    const hasFiles = notesAttachments.length > 0;

                                    return (
                                      <div className="p-4 text-sm">
                                        {!isEmpty ? (
                                          <div className="text-xs font-semibold text-gray-600">Remarks</div>
                                        ) : null}
                                        {isEmpty ? (
                                          <div className="flex items-center gap-2 text-gray-500 italic">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 18a6 6 0 100-12 6 6 0 000 12z" />
                                            </svg>
                                            <span>{displayText}</span>
                                          </div>
                                        ) : (
                                          <div className="mt-2">
                                            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-800">
                                              {displayText}
                                            </div>
                                          </div>
                                        )}

                                        <div className="mt-4">
                                          <div className="text-xs font-semibold text-gray-600">Files</div>
                                          {!hasFiles ? (
                                            <div className="mt-2 text-sm text-gray-500 italic">No uploaded files.</div>
                                          ) : (
                                            <div className="mt-2 space-y-2">
                                              {notesAttachments.map((file, idx) => {
                                                const filePath = file.path || file.file_path || file.filePath || file.storagePath || null;
                                                if (!filePath) return null;
                                                const fileUrl = getFileUrl(filePath);
                                                const label = file.label || file.originalName || filePath.split('/').pop() || 'Attachment';
                                                return (
                                                  <div key={`${filePath}-${idx}`} className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2">
                                                    <div className="min-w-0">
                                                      <div className="text-sm font-medium text-gray-800 truncate">{label}</div>
                                                      <div className="text-xs text-gray-500 truncate">{filePath.split('/').pop()}</div>
                                                    </div>
                                                    {fileUrl ? (
                                                      <a
                                                        href={fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                                                      >
                                                        View
                                                      </a>
                                                    ) : (
                                                      <span className="text-xs text-gray-400">Unavailable</span>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                            );
                          })()}

                          {/* AGREEMENTS TAB (for pending) */}
                          {currentTab === 'agreements' && (
                            <div className="space-y-6">
                              {(() => {
                                const interviewConfirmedRaw = selectedEmployee.interview_confirmed || selectedEmployee.raw?.interview_confirmed;
                                const interviewConfirmedNormalized = interviewConfirmedRaw ? String(interviewConfirmedRaw).trim().toLowerCase() : null;
                                const isRejected = interviewConfirmedNormalized === 'rejected';

                                const hasAssessmentSchedule = Boolean(
                                  selectedEmployee.interview_date ||
                                  selectedEmployee.interview_time ||
                                  selectedEmployee.interview_location
                                );

                                const payloadObj = parsePayloadObject(selectedEmployee.payload ?? selectedEmployee.raw?.payload ?? {});

                                const rescheduleReqObj = payloadObj?.interview_reschedule_request || payloadObj?.interviewRescheduleRequest || null;
                                const rescheduleReqHandled = Boolean(rescheduleReqObj && (rescheduleReqObj.handled_at || rescheduleReqObj.handledAt));
                                const rescheduleReqActive = Boolean(
                                  rescheduleReqObj &&
                                    typeof rescheduleReqObj === 'object' &&
                                    !rescheduleReqHandled &&
                                    (rescheduleReqObj.requested_at || rescheduleReqObj.requestedAt || rescheduleReqObj.note)
                                );
                                const reschedulePending = Boolean(hasAssessmentSchedule && (isRejected || rescheduleReqActive));
                                const agreementsUnlocked = Boolean(hasAssessmentSchedule && !reschedulePending);

                                const signing = getSigningScheduleFromApplication({ payload: payloadObj }) || null;
                                const signingDate = signing?.date ? formatDate(signing.date) : null;
                                const signingTime = signing?.time ? formatTime(signing.time) : null;
                                const signingLocation = signing?.location || null;

                                const keys = [
                                  'appointment_letter_file',
                                  'undertaking_file',
                                  'application_form_file',
                                  'undertaking_duties_file',
                                  'pre_employment_requirements_file',
                                  'id_form_file',
                                ];

                                const getFilePathForKey = (fileKey) => {
                                  let filePath = selectedEmployee?.[fileKey];
                                  if (!filePath && selectedEmployee?.raw?.[fileKey]) filePath = selectedEmployee.raw[fileKey];
                                  if (!filePath && selectedEmployee?.payload?.[fileKey]) filePath = selectedEmployee.payload[fileKey];
                                  if (!filePath && selectedEmployee?.raw?.payload) {
                                    let payloadObj = selectedEmployee.raw.payload;
                                    if (typeof payloadObj === 'string') {
                                      try { payloadObj = JSON.parse(payloadObj); } catch { payloadObj = {}; }
                                    }
                                    if (payloadObj?.[fileKey]) filePath = payloadObj[fileKey];
                                  }
                                  return filePath || null;
                                };

                                const uploaded = keys
                                  .map((k) => ({ key: k, path: getFilePathForKey(k) }))
                                  .filter((x) => Boolean(x.path));

                                return (
                                  <>
                                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <div className="text-sm font-semibold text-gray-900">Signing appointment schedule</div>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full font-semibold border ${
                                          signingDate || signingTime
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                            : 'bg-gray-50 text-gray-600 border-gray-200'
                                        }`}>
                                          {signingDate || signingTime ? 'Schedule Set' : 'Not Set'}
                                        </span>
                                      </div>
                                      <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-700">
                                        <div className="grid grid-cols-[110px_1fr] gap-4">
                                          <span className="text-gray-500">Date</span>
                                          <span className="font-semibold text-gray-900 text-left break-words">{signingDate || 'None'}</span>
                                        </div>
                                        <div className="grid grid-cols-[110px_1fr] gap-4">
                                          <span className="text-gray-500">Time</span>
                                          <span className="font-semibold text-gray-900 text-left break-words">{signingTime || 'None'}</span>
                                        </div>
                                        <div className="grid grid-cols-[110px_1fr] gap-4">
                                          <span className="text-gray-500">Location</span>
                                          <span className="font-semibold text-gray-900 text-left break-words">{signingLocation || 'None'}</span>
                                        </div>
                                      </div>
                                      {!(signingDate || signingTime || signingLocation) && (
                                        <div className="mt-3 text-xs text-gray-500">
                                          Stay posted for the agreement signing schedule. We will post as soon as possible.
                                        </div>
                                      )}
                                      {reschedulePending ? (
                                        <div className="mt-3 text-xs text-gray-500">
                                          Agreements are locked while reschedule is pending.
                                        </div>
                                      ) : null}
                                    </div>

                                      <UploadedDocumentsSection
                                        title="Uploaded Agreements"
                                        emptyText="No uploaded documents"
                                        documents={uploaded.map((d) => ({
                                          path: d.path,
                                          label: (String(d.key || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || null),
                                          originalName: String(d.path).split('/').pop() || null,
                                        }))}
                                        getPublicUrl={(path) =>
                                          supabase.storage
                                            .from('application-files')
                                            .getPublicUrl(path)?.data?.publicUrl || null
                                        }
                                        variant="list"
                                      />
                                  </>
                                );
                              })()}
                            </div>
                          )}

                        </div>
                      </div>
                      );
                    })()}
                  </div>
                </>
              )}

              {/* Add Employee Modal (AgencyEndorse stepper style) */}
              {isAddEmployeeModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onMouseDown={(e) => {
                  if (e.target === e.currentTarget) closeAddEmployeeModal();
                }}>
                  <div className="bg-white rounded-2xl shadow-2xl max-w-5xl lg:max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#800000]/10 to-orange-50">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#800000]/20 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">Add Employee</h3>
                            <p className="text-sm text-gray-500">Adds to your agency’s employee pool</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={closeAddEmployeeModal}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          aria-label="Close"
                        >
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      {addEmployeeError ? (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{addEmployeeError}</div>
                      ) : null}

                      {/* Progress Indicator */}
                      {(() => {
                        const stepLabels = addEmployeeForm.employeeType === 'driver'
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
                        return (
                          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center justify-between">
                              {stepLabels.map((s, idx) => (
                                <div key={s.num} className="flex items-center flex-1">
                                  <div className="flex flex-col items-center flex-shrink-0">
                                    <div
                                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                                        addEmployeeStep === s.num
                                          ? 'bg-[#800000] text-white ring-4 ring-[#800000]/10'
                                          : addEmployeeStep > s.num
                                            ? 'bg-green-500 text-white'
                                            : 'bg-gray-200 text-gray-500'
                                      }`}
                                    >
                                      {addEmployeeStep > s.num ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      ) : (
                                        s.num
                                      )}
                                    </div>
                                    <span
                                      className={`text-xs mt-2 font-medium ${
                                        addEmployeeStep === s.num
                                          ? 'text-[#800000]'
                                          : addEmployeeStep > s.num
                                            ? 'text-green-600'
                                            : 'text-gray-400'
                                      }`}
                                    >
                                      {s.label}
                                    </span>
                                  </div>
                                  {idx < stepLabels.length - 1 && (
                                    <div
                                      className={`flex-1 h-1 mx-3 rounded ${addEmployeeStep > s.num ? 'bg-green-500' : 'bg-gray-200'}`}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* CSV Import */}
                      <div ref={addEmployeeCsvSectionRef} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-4 py-3 bg-gradient-to-r from-[#800000] to-[#990000] flex items-center justify-between">
                          <span className="text-white font-semibold flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Import CSV
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setCsvFile(null);
                                setCsvPreview([]);
                                setCsvRows([]);
                                setCsvError('');
                              }}
                              className="px-4 py-2 rounded-lg text-sm font-medium bg-white/90 hover:bg-white text-gray-700 transition-colors"
                            >
                              Clear
                            </button>
                            <button
                              type="button"
                              onClick={importEmployeesFromCsv}
                              disabled={addEmployeeSubmitting || !csvRows || csvRows.length === 0}
                              className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${
                                addEmployeeSubmitting || !csvRows || csvRows.length === 0
                                  ? 'bg-white/40 cursor-not-allowed'
                                  : 'bg-white/20 hover:bg-white/30'
                              }`}
                            >
                              {addEmployeeSubmitting ? 'Importing…' : 'Import Employees'}
                            </button>
                          </div>
                        </div>
                        <div className="p-5">
                          {csvError ? (
                            <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{csvError}</div>
                          ) : null}
                          <input
                            ref={csvInputRef}
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleCsvFileSelect(file);
                            }}
                          />

                          {!csvFile ? (
                            <div
                              className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors cursor-pointer ${
                                isDraggingCsv ? 'border-[#800000] bg-[#800000]/5' : 'border-gray-300 hover:border-[#800000]/50 hover:bg-gray-50'
                              }`}
                              onClick={() => csvInputRef.current?.click?.()}
                              onDragEnter={(e) => {
                                e.preventDefault();
                                setIsDraggingCsv(true);
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                setIsDraggingCsv(true);
                              }}
                              onDragLeave={(e) => {
                                e.preventDefault();
                                setIsDraggingCsv(false);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                setIsDraggingCsv(false);
                                const file = e.dataTransfer?.files?.[0];
                                if (file) handleCsvFileSelect(file);
                              }}
                            >
                              <div className="text-sm font-semibold text-gray-800">Drop your CSV here or click to upload</div>
                              <div className="text-xs text-gray-500 mt-1">Required: email, firstname, lastname, contact</div>
                            </div>
                          ) : (
                            <div className="border-2 border-emerald-200 bg-emerald-50 rounded-xl p-4">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <svg className="w-5 h-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold text-gray-900 truncate">{csvFile.name}</div>
                                  <div className="text-xs text-gray-600 mt-0.5">{csvRows?.length || 0} row(s) detected</div>
                                  <div className="mt-2 flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => csvInputRef.current?.click?.()}
                                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                                    >
                                      Change file
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCsvFile(null);
                                        setCsvPreview([]);
                                        setCsvRows([]);
                                        setCsvError('');
                                        if (csvInputRef.current) csvInputRef.current.value = '';
                                      }}
                                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {csvPreview && csvPreview.length > 0 ? (
                            <div className="mt-4">
                              <div className="text-xs font-semibold text-gray-700 mb-2">Preview</div>
                              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                <table className="min-w-full text-xs">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Email</th>
                                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Name</th>
                                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Position</th>
                                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Depot</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {csvPreview.map((row, idx) => {
                                      const email = getCsvValue(row, ['email', 'email_address', 'email address']);
                                      const fname = getCsvValue(row, ['fname', 'first_name', 'first name', 'firstname', 'First Name', 'Firstname']);
                                      const lname = getCsvValue(row, ['lname', 'last_name', 'last name', 'lastname', 'Last Name', 'Lastname']);
                                      const position = getCsvValue(row, ['position']) || addEmployeeForm.position;
                                      const depot = getCsvValue(row, ['depot']) || addEmployeeForm.depot;
                                      return (
                                        <tr key={idx}>
                                          <td className="px-3 py-2 text-gray-700">{email || 'None'}</td>
                                          <td className="px-3 py-2 text-gray-700">{[fname, lname].filter(Boolean).join(' ') || 'None'}</td>
                                          <td className="px-3 py-2 text-gray-700">{position || 'None'}</td>
                                          <td className="px-3 py-2 text-gray-700">{depot || 'None'}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : null}

                          <div className="mt-4 bg-blue-50 rounded-xl p-4 border border-blue-100">
                            <div className="flex items-start gap-3">
                              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div>
                                <p className="text-sm font-medium text-blue-800 mb-1">CSV Format Requirements</p>
                                <p className="text-xs text-blue-700">Your CSV file should include column headers. Download the template below for the full supported list.</p>
                                <p className="text-xs text-blue-600 mt-1 font-mono bg-blue-100 px-2 py-1 rounded">
                                  lastname, firstname, middlename, email, contact, available_start_date, employed, birthday, marital_status, sex, unit_house_number, street, barangay, city, province, zip, education, ...
                                </p>
                                <p className="text-xs text-blue-700 mt-2">
                                  Notes: booleans accept <span className="font-mono">yes/no</span>, <span className="font-mono">true/false</span>, or <span className="font-mono">1/0</span>. Lists use <span className="font-mono">|</span> (e.g. <span className="font-mono">restriction_codes=1|2</span>).
                                </p>
                                <p className="text-xs text-blue-700 mt-1">
                                  Dates: supports Excel serial dates (e.g. <span className="font-mono">46000</span>) or <span className="font-mono">DD/MM/YYYY</span> / <span className="font-mono">MM/DD/YYYY</span>. The import converts these to <span className="font-mono">YYYY-MM-DD</span>.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
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
                              type="button"
                              onClick={() => {
                                const template = 'firstname,lastname,middlename,email,contact,available_start_date,employed,birthday,marital_status,sex,unit_house_number,street,barangay,city,province,zip,education,tertiary_school,tertiary_program,tertiary_year,skills,specialized_training,specialized_year,has_sss,has_pagibig,has_tin,has_philhealth,license_classification,license_expiry,restriction_codes,years_driving,truck_knowledge,vehicles_driven,troubleshooting_tasks,taking_medications,medication_reason,took_medical_test,medical_test_date\nJuan,Dela Cruz,Santos,juan@email.com,09171234567,01/15/2026,yes,05/15/1990,Single,Male,123,Main Street,Barangay 1,Makati,Metro Manila,1200,College,ABC University,BS Logistics,2012,"Driving, Customer Service",Defensive Driving,2023,yes,no,yes,yes,Professional,01/01/2027,1|2,8,yes,Motorcycle|Van,Engine|Electrical,no,,yes,01/01/2026\nMaria,Santos,,maria@email.com,09181234567,01/15/2026,no,08/20/1992,Single,Female,456,Ortigas Avenue,Barangay 2,Pasig,Metro Manila,1600,Senior High School,,,"","Packing, Inventory",,,no,no,no,no,,,,,,no,,no,';
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
                      </div>

                      {/* Manual Add (Stepper) */}
                      <form onSubmit={submitAddEmployee} className="space-y-6">
                        {addEmployeeStep === 1 && (
                          <div className="space-y-6">
                            {/* Employment Details */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                <div>
                                  <h2 className="text-base font-semibold text-gray-800">Employment Details</h2>
                                  <p className="text-xs text-gray-500 mt-0.5">Assign department, position, and availability</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={resetAddEmployeeState}
                                  className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                                >
                                  Reset
                                </button>
                              </div>
                              <div className="p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Department <span className="text-[#800000]">*</span></label>
                                    <select
                                      value={addEmployeeForm.department}
                                      onChange={(e) => {
                                        const dep = e.target.value;
                                        const posOptions = getPositionsForDepartment(dep).filter((p) => p !== 'All');
                                        setAddEmployeeForm((p) => ({ ...p, department: dep, position: posOptions[0] || p.position }));
                                      }}
                                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] bg-white"
                                    >
                                      {departments.map((d) => (
                                        <option key={d} value={d}>{d}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Position <span className="text-[#800000]">*</span></label>
                                    <select
                                      value={addEmployeeForm.position}
                                      onChange={(e) => {
                                        const nextPos = e.target.value;
                                        const inferredDept = getDepartmentForPosition(nextPos) || addEmployeeForm.department;
                                        setAddEmployeeForm((p) => ({ ...p, position: nextPos, department: inferredDept }));
                                      }}
                                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] bg-white"
                                    >
                                      {getPositionsForDepartment(addEmployeeForm.department)
                                        .filter((p) => p !== 'All')
                                        .map((p) => (
                                          <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Depot Assignment <span className="text-[#800000]">*</span></label>
                                    <select
                                      value={addEmployeeForm.depot}
                                      onChange={(e) => setAddEmployeeForm((p) => ({ ...p, depot: e.target.value }))}
                                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] bg-white"
                                    >
                                      <option value="">Select depot…</option>
                                      {(addEmployeeDepotOptions.length ? addEmployeeDepotOptions : depotOptions).map((d) => (
                                        <option key={d} value={d}>{d}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Available Start Date <span className="text-[#800000]">*</span></label>
                                    <input
                                      type="date"
                                      min={todayIso()}
                                      value={addEmployeeForm.dateAvailable}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        if (!validateNoSunday(e.target, v)) return;
                                        setAddEmployeeForm((p) => ({ ...p, dateAvailable: v }));
                                      }}
                                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Currently Employed? <span className="text-[#800000]">*</span></label>
                                  <div className="flex gap-4">
                                    <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${addEmployeeForm.employed === 'yes' ? 'border-[#800000] bg-[#800000]/10 text-[#800000]' : 'border-gray-200 hover:bg-gray-50'}`}>
                                      <input
                                        type="radio"
                                        name="add-emp-employed"
                                        className="accent-[#800000]"
                                        checked={addEmployeeForm.employed === 'yes'}
                                        onChange={() => setAddEmployeeForm((p) => ({ ...p, employed: 'yes' }))}
                                      />
                                      Yes
                                    </label>
                                    <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${addEmployeeForm.employed !== 'yes' ? 'border-[#800000] bg-[#800000]/10 text-[#800000]' : 'border-gray-200 hover:bg-gray-50'}`}>
                                      <input
                                        type="radio"
                                        name="add-emp-employed"
                                        className="accent-[#800000]"
                                        checked={addEmployeeForm.employed !== 'yes'}
                                        onChange={() => setAddEmployeeForm((p) => ({ ...p, employed: 'no' }))}
                                      />
                                      No
                                    </label>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Employee Type</label>
                                  <div className="flex gap-3">
                                    <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all flex-1 justify-center ${addEmployeeForm.employeeType === 'helper' ? 'border-[#800000] bg-[#800000]/10 text-[#800000]' : 'border-gray-200 hover:bg-gray-50'}`}>
                                      <input
                                        type="radio"
                                        name="employeeType"
                                        className="accent-[#800000]"
                                        checked={addEmployeeForm.employeeType === 'helper'}
                                        onChange={() => setAddEmployeeForm((p) => ({ ...p, employeeType: 'helper', position: 'Helper', department: 'Operations Department' }))}
                                      />
                                      Helper
                                    </label>
                                    <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all flex-1 justify-center ${addEmployeeForm.employeeType === 'driver' ? 'border-[#800000] bg-[#800000]/10 text-[#800000]' : 'border-gray-200 hover:bg-gray-50'}`}>
                                      <input
                                        type="radio"
                                        name="employeeType"
                                        className="accent-[#800000]"
                                        checked={addEmployeeForm.employeeType === 'driver'}
                                        onChange={() => setAddEmployeeForm((p) => ({ ...p, employeeType: 'driver', position: 'Driver', department: 'Operations Department' }))}
                                      />
                                      Driver
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
                                    <input
                                      value={addEmployeeForm.lname}
                                      onChange={(e) => setAddEmployeeForm((p) => ({ ...p, lname: e.target.value }))}
                                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
                                      placeholder="Dela Cruz"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name <span className="text-[#800000]">*</span></label>
                                    <input
                                      value={addEmployeeForm.fname}
                                      onChange={(e) => setAddEmployeeForm((p) => ({ ...p, fname: e.target.value }))}
                                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
                                      placeholder="Juan"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Middle Name</label>
                                    <input
                                      value={addEmployeeForm.mname}
                                      onChange={(e) => setAddEmployeeForm((p) => ({ ...p, mname: e.target.value }))}
                                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
                                      placeholder="D."
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Birthday <span className="text-[#800000]">*</span></label>
                                    <input
                                      type="date"
                                      max={getBirthdayMaxForMinAge(15)}
                                      value={addEmployeeForm.birthday}
                                      onChange={(e) => setAddEmployeeForm((p) => ({ ...p, birthday: e.target.value }))}
                                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Marital Status <span className="text-[#800000]">*</span></label>
                                    <select
                                      value={addEmployeeForm.maritalStatus}
                                      onChange={(e) => setAddEmployeeForm((p) => ({ ...p, maritalStatus: e.target.value }))}
                                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] bg-white"
                                    >
                                      <option value="">Select status</option>
                                      <option value="Single">Single</option>
                                      <option value="Married">Married</option>
                                      <option value="Widowed">Widowed</option>
                                      <option value="Separated">Separated</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Sex <span className="text-[#800000]">*</span></label>
                                    <div className="flex gap-3">
                                      <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all flex-1 justify-center ${addEmployeeForm.sex === 'Male' ? 'border-[#800000] bg-[#800000]/10 text-[#800000]' : 'border-gray-200 hover:bg-gray-50'}`}>
                                        <input
                                          type="radio"
                                          name="add-emp-sex"
                                          className="accent-[#800000]"
                                          checked={addEmployeeForm.sex === 'Male'}
                                          onChange={() => setAddEmployeeForm((p) => ({ ...p, sex: 'Male' }))}
                                        />
                                        Male
                                      </label>
                                      <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all flex-1 justify-center ${addEmployeeForm.sex === 'Female' ? 'border-[#800000] bg-[#800000]/10 text-[#800000]' : 'border-gray-200 hover:bg-gray-50'}`}>
                                        <input
                                          type="radio"
                                          name="add-emp-sex"
                                          className="accent-[#800000]"
                                          checked={addEmployeeForm.sex === 'Female'}
                                          onChange={() => setAddEmployeeForm((p) => ({ ...p, sex: 'Female' }))}
                                        />
                                        Female
                                      </label>
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Unit/House No.</label>
                                    <input
                                      value={addEmployeeForm.unit_house_number}
                                      onChange={(e) => setAddEmployeeForm((p) => ({ ...p, unit_house_number: e.target.value }))}
                                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
                                      placeholder="Unit/House No."
                                    />
                                  </div>
                                  <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Street Address <span className="text-[#800000]">*</span></label>
                                    <input
                                      value={addEmployeeForm.street}
                                      onChange={(e) => setAddEmployeeForm((p) => ({ ...p, street: e.target.value }))}
                                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
                                      placeholder="Street"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                  <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Province <span className="text-[#800000]">*</span></label>
                                    <input
                                      value={addEmployeeForm.province}
                                      onChange={(e) => setAddEmployeeForm((p) => ({ ...p, province: e.target.value }))}
                                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
                                      placeholder="Province"
                                    />
                                  </div>
                                  <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">City / Municipality <span className="text-[#800000]">*</span></label>
                                    <input
                                      value={addEmployeeForm.city}
                                      onChange={(e) => setAddEmployeeForm((p) => ({ ...p, city: e.target.value }))}
                                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
                                      placeholder="City"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">ZIP Code <span className="text-[#800000]">*</span></label>
                                    <input
                                      inputMode="numeric"
                                      pattern="\d*"
                                      maxLength={4}
                                      value={addEmployeeForm.zip}
                                      onChange={(e) => setAddEmployeeForm((p) => ({ ...p, zip: sanitizeZip(e.target.value) }))}
                                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
                                      placeholder="0000"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Barangay <span className="text-[#800000]">*</span></label>
                                  <input
                                    value={addEmployeeForm.barangay}
                                    onChange={(e) => setAddEmployeeForm((p) => ({ ...p, barangay: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
                                    placeholder="Barangay"
                                  />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Number <span className="text-[#800000]">*</span></label>
                                    <input
                                      value={addEmployeeForm.contactNumber}
                                      onChange={(e) => setAddEmployeeForm((p) => ({ ...p, contactNumber: sanitizeContact(e.target.value) }))}
                                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
                                      placeholder="09xxxxxxxxx"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address <span className="text-[#800000]">*</span></label>
                                    <input
                                      type="email"
                                      value={addEmployeeForm.email}
                                      onChange={(e) => setAddEmployeeForm((p) => ({ ...p, email: e.target.value }))}
                                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
                                      placeholder="employee@email.com"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Personal Email (optional)</label>
                                    <input
                                      type="email"
                                      value={addEmployeeForm.personalEmail}
                                      onChange={(e) => setAddEmployeeForm((p) => ({ ...p, personalEmail: e.target.value }))}
                                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
                                      placeholder="personal@email.com"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Resume (optional)</label>
                                    <input
                                      type="file"
                                      accept=".pdf,.doc,.docx"
                                      onChange={(e) => setAddEmployeeForm((p) => ({ ...p, resumeFile: e.target.files?.[0] || null }))}
                                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white"
                                    />
                                    {addEmployeeForm.resumeFile ? (
                                      <div className="text-xs text-gray-500 mt-1">Selected: {addEmployeeForm.resumeFile.name}</div>
                                    ) : null}
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Government IDs (availability)</label>
                                    <div className="grid grid-cols-2 gap-2">
                                      {[
                                        { key: 'hasSSS', label: 'SSS' },
                                        { key: 'hasPAGIBIG', label: 'PAG-IBIG' },
                                        { key: 'hasTIN', label: 'TIN' },
                                        { key: 'hasPhilHealth', label: 'PhilHealth' },
                                      ].map((item) => (
                                        <label key={item.key} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            className="w-4 h-4 accent-[#800000]"
                                            checked={!!addEmployeeForm[item.key]}
                                            onChange={() => setAddEmployeeForm((p) => ({ ...p, [item.key]: !p[item.key] }))}
                                          />
                                          <span className="text-sm text-gray-700">{item.label}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {addEmployeeStep === 2 && (
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
                                      value={addEmployeeForm.education || ''}
                                      onChange={(e) => {
                                        const selectedValue = e.target.value;
                                        setAddEmployeeForm((p) => ({
                                          ...p,
                                          education: selectedValue,
                                          ...(selectedValue === 'N/A'
                                            ? { tertiaryYear: '', tertiarySchool: '', tertiaryProgram: '' }
                                            : null),
                                        }));
                                      }}
                                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] bg-white"
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
                                      disabled={addEmployeeForm.education === 'N/A'}
                                      value={addEmployeeForm.tertiaryYear || ''}
                                      onChange={(e) => setAddEmployeeForm((p) => ({ ...p, tertiaryYear: sanitizeYear(e.target.value) }))}
                                      className={`w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] ${addEmployeeForm.education === 'N/A' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                      placeholder="e.g. 2020"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">School/Institution Name <span className="text-[#800000]">*</span></label>
                                    <input
                                      disabled={addEmployeeForm.education === 'N/A'}
                                      value={addEmployeeForm.tertiarySchool || ''}
                                      onChange={(e) => setAddEmployeeForm((p) => ({ ...p, tertiarySchool: e.target.value }))}
                                      className={`w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] ${addEmployeeForm.education === 'N/A' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                      placeholder="Enter school name"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Strand/Program <span className="text-[#800000]">*</span></label>
                                    <input
                                      disabled={addEmployeeForm.education === 'N/A'}
                                      value={addEmployeeForm.tertiaryProgram || ''}
                                      onChange={(e) => setAddEmployeeForm((p) => ({ ...p, tertiaryProgram: e.target.value }))}
                                      className={`w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] ${addEmployeeForm.education === 'N/A' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                      placeholder="e.g. BS Mechanical Engineering"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Skills, Training, Medical */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                                <h2 className="text-base font-semibold text-gray-800">Skills & Additional Info</h2>
                              </div>
                              <div className="p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Specialized Training (optional)</label>
                                    <input
                                      value={addEmployeeForm.specializedTraining || ''}
                                      onChange={(e) => setAddEmployeeForm((p) => ({ ...p, specializedTraining: e.target.value }))}
                                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
                                      placeholder="e.g. Forklift Training"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Year Completed (optional)</label>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      pattern="\d*"
                                      maxLength={4}
                                      value={addEmployeeForm.specializedYear || ''}
                                      onChange={(e) => setAddEmployeeForm((p) => ({ ...p, specializedYear: sanitizeYear(e.target.value) }))}
                                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
                                      placeholder="e.g. 2022"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Training Certificate (optional)</label>
                                  <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => setAddEmployeeForm((p) => ({ ...p, trainingCertFile: e.target.files?.[0] || null }))}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white"
                                  />
                                  {addEmployeeForm.trainingCertFile ? (
                                    <div className="text-xs text-gray-500 mt-1">Selected: {addEmployeeForm.trainingCertFile.name}</div>
                                  ) : null}
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Skills (optional)</label>
                                  <textarea
                                    rows={4}
                                    value={addEmployeeForm.skills || ''}
                                    onChange={(e) => setAddEmployeeForm((p) => ({ ...p, skills: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
                                    placeholder="List skills and proficiencies"
                                  />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Taking Medications? (optional)</label>
                                    <div className="flex gap-3">
                                      <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all flex-1 justify-center ${addEmployeeForm.takingMedications ? 'border-[#800000] bg-[#800000]/10 text-[#800000]' : 'border-gray-200 hover:bg-gray-50'}`}>
                                        <input
                                          type="checkbox"
                                          className="w-4 h-4 accent-[#800000]"
                                          checked={!!addEmployeeForm.takingMedications}
                                          onChange={() => setAddEmployeeForm((p) => ({ ...p, takingMedications: !p.takingMedications }))}
                                        />
                                        Yes
                                      </label>
                                    </div>
                                    {addEmployeeForm.takingMedications ? (
                                      <input
                                        value={addEmployeeForm.medicationReason || ''}
                                        onChange={(e) => setAddEmployeeForm((p) => ({ ...p, medicationReason: e.target.value }))}
                                        className="mt-2 w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
                                        placeholder="Reason (optional)"
                                      />
                                    ) : null}
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Took Medical Test? (optional)</label>
                                    <div className="flex gap-3">
                                      <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all flex-1 justify-center ${addEmployeeForm.tookMedicalTest ? 'border-[#800000] bg-[#800000]/10 text-[#800000]' : 'border-gray-200 hover:bg-gray-50'}`}>
                                        <input
                                          type="checkbox"
                                          className="w-4 h-4 accent-[#800000]"
                                          checked={!!addEmployeeForm.tookMedicalTest}
                                          onChange={() => setAddEmployeeForm((p) => ({ ...p, tookMedicalTest: !p.tookMedicalTest }))}
                                        />
                                        Yes
                                      </label>
                                    </div>
                                    {addEmployeeForm.tookMedicalTest ? (
                                      <input
                                        type="date"
                                        value={addEmployeeForm.medicalTestDate || ''}
                                        onChange={(e) => setAddEmployeeForm((p) => ({ ...p, medicalTestDate: e.target.value }))}
                                        className="mt-2 w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
                                      />
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {addEmployeeStep === 3 && addEmployeeForm.employeeType === 'driver' && (
                          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                              <h2 className="text-base font-semibold text-gray-800">License Information</h2>
                            </div>
                            <div className="p-6 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1.5">License Classification <span className="text-[#800000]">*</span></label>
                                  <select
                                    value={addEmployeeForm.licenseClassification}
                                    onChange={(e) => setAddEmployeeForm((p) => ({ ...p, licenseClassification: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] bg-white"
                                  >
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
                                  <input
                                    type="date"
                                    value={addEmployeeForm.licenseExpiry}
                                    onChange={(e) => setAddEmployeeForm((p) => ({ ...p, licenseExpiry: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Restriction Codes <span className="text-[#800000]">*</span></label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                  {restrictionCodesCatalog.map((item) => (
                                    <label
                                      key={item.code}
                                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${addEmployeeForm.restrictionCodes.includes(item.code) ? 'border-[#800000] bg-[#800000]/10' : 'border-gray-200 hover:bg-gray-50'}`}
                                    >
                                      <input
                                        type="checkbox"
                                        className="w-4 h-4 accent-[#800000]"
                                        checked={addEmployeeForm.restrictionCodes.includes(item.code)}
                                        onChange={() =>
                                          setAddEmployeeForm((p) => {
                                            const next = new Set(p.restrictionCodes || []);
                                            if (next.has(item.code)) next.delete(item.code);
                                            else next.add(item.code);
                                            return { ...p, restrictionCodes: Array.from(next) };
                                          })
                                        }
                                      />
                                      <span className="text-sm text-gray-700">{item.label}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">License Photocopy <span className="text-[#800000]">*</span></label>
                                <input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(e) => setAddEmployeeForm((p) => ({ ...p, licenseFile: e.target.files?.[0] || null }))}
                                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white"
                                />
                                {addEmployeeForm.licenseFile ? (
                                  <div className="text-xs text-gray-500 mt-1">Selected: {addEmployeeForm.licenseFile.name}</div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        )}

                        {addEmployeeStep === 4 && addEmployeeForm.employeeType === 'driver' && (
                          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                              <h2 className="text-base font-semibold text-gray-800">Driving History</h2>
                            </div>
                            <div className="p-6 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Years of Driving Experience <span className="text-[#800000]">*</span></label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={addEmployeeForm.yearsDriving}
                                    onChange={(e) => setAddEmployeeForm((p) => ({ ...p, yearsDriving: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
                                    placeholder="e.g. 5"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Basic truck troubleshooting knowledge? <span className="text-[#800000]">*</span></label>
                                  <div className="flex gap-3">
                                    <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all flex-1 justify-center ${addEmployeeForm.truckKnowledge === 'yes' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                                      <input
                                        type="radio"
                                        name="truckKnowledge"
                                        className="accent-green-600"
                                        checked={addEmployeeForm.truckKnowledge === 'yes'}
                                        onChange={() => setAddEmployeeForm((p) => ({ ...p, truckKnowledge: 'yes' }))}
                                      />
                                      Yes
                                    </label>
                                    <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all flex-1 justify-center ${addEmployeeForm.truckKnowledge === 'no' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                                      <input
                                        type="radio"
                                        name="truckKnowledge"
                                        className="accent-red-600"
                                        checked={addEmployeeForm.truckKnowledge === 'no'}
                                        onChange={() => setAddEmployeeForm((p) => ({ ...p, truckKnowledge: 'no' }))}
                                      />
                                      No
                                    </label>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Vehicles Driven <span className="text-[#800000]">*</span></label>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                  {vehicleTypesCatalog.map((vt) => (
                                    <label key={vt} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${addEmployeeForm.vehicleTypes.includes(vt) ? 'border-[#800000] bg-[#800000]/10' : 'border-gray-200 hover:bg-gray-50'}`}>
                                      <input
                                        type="checkbox"
                                        className="w-4 h-4 accent-[#800000]"
                                        checked={addEmployeeForm.vehicleTypes.includes(vt)}
                                        onChange={() =>
                                          setAddEmployeeForm((p) => {
                                            const next = new Set(p.vehicleTypes || []);
                                            if (next.has(vt)) next.delete(vt);
                                            else next.add(vt);
                                            return { ...p, vehicleTypes: Array.from(next) };
                                          })
                                        }
                                      />
                                      <span className="text-sm text-gray-700">{vt}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Troubleshooting Tasks (optional)</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                  {troubleshootingTasksCatalog.map((task) => (
                                    <label key={task} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${addEmployeeForm.troubleshootingTasks.includes(task) ? 'border-[#800000] bg-[#800000]/10' : 'border-gray-200 hover:bg-gray-50'}`}>
                                      <input
                                        type="checkbox"
                                        className="w-4 h-4 accent-[#800000]"
                                        checked={addEmployeeForm.troubleshootingTasks.includes(task)}
                                        onChange={() =>
                                          setAddEmployeeForm((p) => {
                                            const next = new Set(p.troubleshootingTasks || []);
                                            if (next.has(task)) next.delete(task);
                                            else next.add(task);
                                            return { ...p, troubleshootingTasks: Array.from(next) };
                                          })
                                        }
                                      />
                                      <span className="text-sm text-gray-700">{task}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => setAddEmployeeStep((s) => Math.max(1, s - 1))}
                              disabled={addEmployeeStep === 1}
                              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
                                addEmployeeStep === 1
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                              Previous
                            </button>

                            <span className="text-sm text-gray-500">Step {addEmployeeStep} of {addEmployeeTotalSteps}</span>

                            {addEmployeeStep < addEmployeeTotalSteps ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => addEmployeeCsvSectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })}
                                  className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                                >
                                  Import CSV
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const errs = validateAddEmployeeStep(addEmployeeStep);
                                    if (errs.length > 0) {
                                      setAddEmployeeError(`Please complete the required fields before proceeding:\n\n- ${errs.join('\n- ')}`);
                                      return;
                                    }
                                    setAddEmployeeStep((s) => Math.min(s + 1, addEmployeeTotalSteps));
                                  }}
                                  className="flex items-center gap-2 px-5 py-2.5 bg-[#800000] text-white rounded-lg font-medium hover:bg-[#990000] transition-colors"
                                >
                                  Next Step
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <button
                                type="submit"
                                disabled={addEmployeeSubmitting}
                                className={`flex items-center gap-2 px-6 py-2.5 text-white rounded-lg font-medium transition-colors ${
                                  addEmployeeSubmitting ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
                                }`}
                              >
                                {addEmployeeSubmitting ? 'Adding…' : 'Add Employee'}
                              </button>
                            )}
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Request Reschedule Dialog */}
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
            <div className="text-sm text-gray-700 mb-4">
              Provide a short reason and your preferred time window. HR will be notified and will set a new schedule.
            </div>

            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Note (required)</label>
                <textarea
                  rows={3}
                  value={rescheduleNote}
                  onChange={(e) => setRescheduleNote(e.target.value)}
                  placeholder="e.g., Candidate is unavailable at the scheduled time."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Preferred date (optional)</label>
                  <input
                    type="date"
                    value={reschedulePreferredDate}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!validateNoSunday(e.target, v)) return;
                      setReschedulePreferredDate(v);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Preferred time window (optional)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="time"
                      value={reschedulePreferredTimeFrom}
                      onChange={(e) => {
                        const t = e.target.value;
                        if (!validateOfficeHours(e.target, t)) return;
                        setReschedulePreferredTimeFrom(t);
                      }}
                      min="08:00"
                      max="17:00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      aria-label="Preferred time from"
                    />
                    <input
                      type="time"
                      value={reschedulePreferredTimeTo}
                      onChange={(e) => {
                        const t = e.target.value;
                        if (!validateOfficeHours(e.target, t)) return;
                        setReschedulePreferredTimeTo(t);
                      }}
                      min="08:00"
                      max="17:00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      aria-label="Preferred time to"
                    />
                  </div>
                </div>
              </div>
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
                  if (!selectedEmployee.id) {
                    setShowRejectInterviewDialog(false);
                    return;
                  }
                  
                  try {
                    const rejectedAt = new Date().toISOString();

                    const note = String(rescheduleNote || '').trim();
                    if (!note) {
                      setAlertMessage('Please provide a note for the reschedule request.');
                      setShowErrorAlert(true);
                      return;
                    }

                    let currentPayload = selectedEmployee?.raw?.payload ?? selectedEmployee?.payload ?? {};
                    if (typeof currentPayload === 'string') {
                      try { currentPayload = JSON.parse(currentPayload); } catch { currentPayload = {}; }
                    }

                    const existingReq = currentPayload?.interview_reschedule_request || currentPayload?.interviewRescheduleRequest || null;
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
                      setAlertMessage('You can only request an assessment reschedule once for this interview.');
                      setShowErrorAlert(true);
                      return;
                    }

                    const req = {
                      requested_at: rejectedAt,
                      requestedAt: rejectedAt,
                      source: 'agency',
                      note,
                      preferred_date: reschedulePreferredDate || null,
                      preferredDate: reschedulePreferredDate || null,
                      preferred_time_from: reschedulePreferredTimeFrom || null,
                      preferredTimeFrom: reschedulePreferredTimeFrom || null,
                      preferred_time_to: reschedulePreferredTimeTo || null,
                      preferredTimeTo: reschedulePreferredTimeTo || null,
                    };

                    const updatedPayload = {
                      ...currentPayload,
                      interview_reschedule_request: req,
                      interviewRescheduleRequest: req,
                    };
                    
                    // Get applicant and interview info for notification
                    const applicantName = selectedEmployee.name || 'Applicant';
                    const position = selectedEmployee.position || selectedEmployee.raw?.job_posts?.title || 'Position';
                    const interviewDate = selectedEmployee.interview_date || selectedEmployee.raw?.interview_date || null;
                    const interviewTime = selectedEmployee.interview_time || selectedEmployee.raw?.interview_time || null;
                    
                    const { error: updateError } = await supabase
                      .from('applications')
                      .update({
                        interview_confirmed: 'Rejected',
                        interview_confirmed_at: rejectedAt,
                        payload: updatedPayload,
                      })
                      .eq('id', selectedEmployee.id);
                    
                    if (updateError) {
                      console.error('Error requesting reschedule:', updateError);
                      setShowRejectInterviewDialog(false);
                      return;
                    }
                    
                    // Notify HR about reschedule request
                    await notifyHRAboutInterviewResponse({
                      applicationId: selectedEmployee.id,
                      applicantName,
                      position,
                      responseType: 'reschedule_requested',
                      interviewDate,
                      interviewTime,
                      responseNote: note,
                      preferredDate: reschedulePreferredDate || null,
                      preferredTimeFrom: reschedulePreferredTimeFrom || null,
                      preferredTimeTo: reschedulePreferredTimeTo || null,
                    });
                    
                    // Reload the endorsed employees to update the UI
                    loadEndorsed();
                    
                    // Update local state immediately
                    setSelectedEmployee(prev => ({
                      ...prev,
                      interview_confirmed: 'Rejected',
                      interview_confirmed_at: rejectedAt,
                      payload: updatedPayload,
                      raw: {
                        ...prev.raw,
                        interview_confirmed: 'Rejected',
                        interview_confirmed_at: rejectedAt,
                        payload: updatedPayload,
                      }
                    }));
                    
                    setShowRejectInterviewDialog(false);
                    setAlertMessage('Reschedule request submitted. HR has been notified and will reschedule your interview.');
                    setShowSuccessAlert(true);
                  } catch (err) {
                    console.error('Error requesting reschedule:', err);
                    setShowRejectInterviewDialog(false);
                  }
                }}
              >
                Request Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generic Confirm Dialog Modal (for actions like retract endorsement) */}
      {showConfirmDialog && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => {
            setShowConfirmDialog(false);
            setConfirmCallback(null);
          }}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
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

      {/* Job Picker Modal (Endorse Existing Employee) */}
      {showJobPickerModal && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          onClick={closeJobPicker}
        >
          <div
            className="bg-white rounded-xl max-w-2xl w-full mx-4 overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Select a Job to Endorse</h3>
                <div className="text-xs text-gray-500">
                  {employeeToEndorse?.name ? `Employee: ${employeeToEndorse.name}` : 'Employee'}
                </div>
              </div>
              <button
                type="button"
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
                onClick={closeJobPicker}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {jobPickerError ? (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  <div className="whitespace-pre-line">{jobPickerError}</div>
                  {employeeToEndorse ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEditEmployeeFromJobPicker(employeeToEndorse)}
                        className="px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-red-200 text-red-700 hover:bg-red-50"
                      >
                        Go to My Employees
                      </button>
                      <button
                        type="button"
                        onClick={() => setJobPickerError(null)}
                        className="px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                      >
                        Dismiss
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {jobPickerSuccess ? (
                <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{jobPickerSuccess}</div>
              ) : null}

              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    value={jobPickerQuery}
                    onChange={(e) => setJobPickerQuery(e.target.value)}
                    placeholder="Search job title, depot, or department…"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
                  />
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-[60vh] overflow-y-auto">
                  {jobPickerLoading ? (
                    <div className="p-4 text-sm text-gray-600">Loading jobs…</div>
                  ) : (
                    (() => {
                      const q = String(jobPickerQuery || '').trim().toLowerCase();
                      const filtered = (jobPickerJobs || []).filter((j) => {
                        if (!q) return true;
                        const hay = `${j?.title || ''} ${j?.depot || ''} ${j?.department || ''}`.toLowerCase();
                        return hay.includes(q);
                      });

                      if (filtered.length === 0) {
                        return <div className="p-4 text-sm text-gray-600">No matching jobs.</div>;
                      }

                      return (
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Job</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Depot</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                              <th className="px-4 py-3"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {filtered.map((job) => {
                              const role = getJobRoleForEligibility(job);
                              const missing = (role === 'driver' || role === 'helper')
                                ? getEmployeeMissingFieldsForRole(employeeToEndorse, role)
                                : [];
                              const blocked = missing.length > 0;

                              return (
                              <tr key={job.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">
                                  <div className="text-sm font-semibold text-gray-800">{job.title || 'Untitled'}</div>
                                  {blocked ? (
                                    <div className="mt-1 text-xs text-red-600 font-medium">
                                      Incomplete employee info for this {role} post
                                    </div>
                                  ) : null}
                                  <div className="text-xs text-gray-500">#{job.id}</div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700">{job.depot || 'None'}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{job.department || 'None'}</td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    disabled={jobPickerSubmitting || blocked}
                                    onClick={() => {
                                      if (blocked) {
                                        const headline = role === 'driver'
                                          ? 'This employee cannot be endorsed to a Driver job post yet.'
                                          : 'This employee cannot be endorsed to a Helper job post yet.';
                                        setJobPickerError(`${headline}\n\nMissing / incomplete information:\n- ${missing.join('\n- ')}\n\nTo proceed, open this employee in “My Employees” and add the missing information, then try endorsing again.`);
                                        return;
                                      }
                                      endorseExistingEmployeeToJob(job);
                                    }}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${
                                      (jobPickerSubmitting || blocked) ? 'bg-gray-400' : 'bg-[#800000] hover:bg-[#990000]'
                                    }`}
                                  >
                                    {jobPickerSubmitting ? 'Endorsing…' : 'Endorse'}
                                  </button>
                                </td>
                              </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      );
                    })()
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Alert Modal */}
      {showSuccessAlert && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50" onClick={() => setShowSuccessAlert(false)}>
          <div className="bg-white rounded-md w-full max-w-md mx-4 overflow-hidden border" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-green-600">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.525-1.72-1.72a.75.75 0 1 0-1.06 1.061l2.25 2.25a.75.75 0 0 0 1.144-.094l3.843-5.15Z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="text-lg font-semibold text-gray-800 mb-2">{alertMessage}</div>
              <div className="mt-4">
                <button 
                  type="button" 
                  className="px-4 py-2 rounded bg-[#800000] text-white hover:bg-[#990000]" 
                  onClick={() => setShowSuccessAlert(false)}
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
              <div className="text-lg font-semibold text-gray-800 mb-2">{alertMessage}</div>
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

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full mx-4 overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">Confirm Logout</h3>
            </div>
            <div className="p-5 text-sm text-gray-600">
              Are you sure you want to logout from your account?
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-[#800000] text-white hover:bg-[#990000] text-sm font-medium"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

export default AgencyEndorsements;

