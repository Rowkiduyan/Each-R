// src/EmployeeRequirements.jsx
import React, { useState, useRef, useEffect } from "react";
import { useEmployeeUser } from "./layouts/EmployeeLayout";
import { supabase } from "./supabaseClient";
import { validateNoSunday } from "./utils/dateTimeRules";

function EmployeeRequirements() {
  const { employeeData } = useEmployeeUser();

  // Upload Modal State (UI only)
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTarget, setUploadTarget] = useState(null); // { type: 'default'|'hr'|'license', key, name, isResubmit }
  const [uploadForm, setUploadForm] = useState({ idNumber: '', licenseNumber: '', licenseExpiry: '', validUntil: '', file: null, frontFile: null, backFile: null });
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingFront, setIsDraggingFront] = useState(false);
  const [isDraggingBack, setIsDraggingBack] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const frontFileInputRef = useRef(null);
  const backFileInputRef = useRef(null);

  // Alert modals (UI only)
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [showFileErrorModal, setShowFileErrorModal] = useState(false);
  const [fileErrorMessage, setFileErrorMessage] = useState('');

  // Privacy Policy State
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(() => {
    // Check if user has already accepted privacy policy (stored in localStorage)
    return localStorage.getItem('privacyPolicyAccepted') === 'true';
  });

  // Default requirements (static) – government IDs
  const defaultRequirements = [
    { key: "sss", name: "SSS (Social Security System)", type: "id_with_copy" },
    { key: "tin", name: "TIN (Tax Identification Number)", type: "id_with_copy" },
    { key: "pagibig", name: "PAG-IBIG (HDMF)", type: "id_with_copy" },
    { key: "philhealth", name: "PhilHealth", type: "id_with_copy" },
  ];

  // Direct employee required documents (mirrors HrRequirements.jsx > directApplicantDocuments)
  // Note: Driver's License is now in a separate License Information section
  // Note: Medical Examination Results is now in a separate Medical Examination section
  // Note: PSA Birth Certificate is now in Personal Documents section
  // Note: Clearances (NBI, Police, Barangay) are now in a separate Clearances section
  const directApplicantDocuments = [
    // Government ID photocopies (SSS, TIN, PhilHealth, Pag-IBIG) are already covered in the
    // Government IDs section above, so they are intentionally omitted here to avoid duplication.
    // All clearances and personal documents have been moved to their respective sections.
  ];

  // Medical examination tests
  const medicalExams = [
    { name: "X-ray", key: "xray" },
    { name: "Stool", key: "stool" },
    { name: "Urine", key: "urine" },
    { name: "HEPA", key: "hepa" },
    { name: "CBC", key: "cbc" },
    { name: "Drug Test", key: "drug_test" },
  ];

  // Personal documents
  const personalDocuments = [
    { name: "2x2 Picture w/ White Background", key: "photo_2x2", required: true },
    { name: "PSA Birth Certificate Photocopy", key: "psa_birth_certificate", required: true },
    { name: "Marriage Contract Photocopy", key: "marriage_contract", required: false, note: "If applicable" },
    { name: "PSA Birth Certificate of Dependents", key: "dependents_birth_certificate", required: false, note: "If applicable" },
    { name: "Direction of Residence (House to Depot Sketch)", key: "residence_sketch", required: true },
  ];

  // Clearances
  const clearances = [
    { name: "NBI Clearance", key: "nbi_clearance", hasDate: true },
    { name: "Police Clearance", key: "police_clearance", hasDate: true },
    { name: "Barangay Clearance", key: "barangay_clearance", hasDate: true },
  ];

  // Educational documents
  const educationalDocuments = [
    { name: "Diploma", key: "diploma" },
    { name: "Transcript of Records", key: "transcript_of_records" },
  ];

  // Local UI-only employee + requirements state
  const [employee, setEmployee] = useState(() => {
    const fullName = employeeData
      ? `${employeeData.fname || ""} ${employeeData.mname || ""} ${employeeData.lname || ""}`.trim() ||
        employeeData.email ||
        "Employee"
      : "Employee";

    const baseRequirements = {
      sss: { idNumber: "", hasFile: false, filePath: null, status: "missing", submittedDate: null },
      tin: { idNumber: "", hasFile: false, filePath: null, status: "missing", submittedDate: null },
      pagibig: { idNumber: "", hasFile: false, filePath: null, status: "missing", submittedDate: null },
      philhealth: { idNumber: "", hasFile: false, filePath: null, status: "missing", submittedDate: null },
    };

    // Base documents for a direct employee (all required docs HR needs)
    const baseDocuments = directApplicantDocuments.reduce((acc, doc) => {
      acc[doc.key] = {
        hasFile: false,
        filePath: null,
        status: "missing", // 'missing' | 'pending' | 'approved' | 'resubmit'
        submittedDate: null,
        dateValidity: null,
        remarks: null,
      };
      return acc;
    }, {});

    // Medical examination results (separate section)
    const medicalExamsData = medicalExams.reduce((acc, exam) => {
      acc[exam.key] = {
        hasFile: false,
        filePath: null,
        status: "missing", // 'missing' | 'pending' | 'approved' | 'resubmit'
        submittedDate: null,
        validUntil: null, // Date when the test result is valid until
        remarks: null,
        versions: [], // Array of previous versions for renewal history
        currentVersion: null, // Index of current active version
      };
      return acc;
    }, {});

    // Personal documents (separate section)
    const personalDocumentsData = personalDocuments.reduce((acc, doc) => {
      acc[doc.key] = {
        hasFile: false,
        filePath: null,
        status: "missing", // 'missing' | 'pending' | 'approved' | 'resubmit'
        submittedDate: null,
        remarks: null,
      };
      return acc;
    }, {});

    // Clearances (separate section)
    const clearancesData = clearances.reduce((acc, clearance) => {
      acc[clearance.key] = {
        hasFile: false,
        filePath: null,
        status: "missing", // 'missing' | 'pending' | 'approved' | 'resubmit'
        submittedDate: null,
        dateValidity: null, // Date when the clearance is valid until
        remarks: null,
        versions: [], // Array of previous versions for renewal history
        currentVersion: null, // Index of current active version
      };
      return acc;
    }, {});

    // Educational documents (separate section)
    const educationalDocumentsData = educationalDocuments.reduce((acc, doc) => {
      acc[doc.key] = {
        hasFile: false,
        filePath: null,
        status: "missing", // 'missing' | 'pending' | 'approved' | 'resubmit'
        submittedDate: null,
        remarks: null,
      };
      return acc;
    }, {});

    // License information (separate section)
    const licenseInfo = {
      licenseNumber: "",
      licenseExpiry: "",
      file: null,
      filePath: null,
      frontFile: null,
      frontFilePath: null,
      backFile: null,
      backFilePath: null,
      status: "missing", // 'missing' | 'pending' | 'approved' | 'resubmit'
      submittedDate: null,
      remarks: null,
      versions: [], // Array of previous versions for renewal history
      currentVersion: null, // Index of current active version
    };

    return {
      id: "local-employee",
      name: fullName,
      position: "Your position",
      depot: "Your depot",
      deployedDate: null,
      requirements: baseRequirements,
      documents: baseDocuments,
      medicalExams: medicalExamsData,
      personalDocuments: personalDocumentsData,
      clearances: clearancesData,
      educationalDocuments: educationalDocumentsData,
      license: licenseInfo,
      hrRequests: [], // HR additional document requests will appear here (UI only)
      email: employeeData?.email || "",
    };
  });

  // Get public URL for uploaded files
  const getFileUrl = (filePath) => {
    if (!filePath) return null;
    // Filter out placeholder paths that are not actual Supabase storage paths
    if (filePath.includes('local-file-path') || filePath.startsWith('local-') || !filePath.includes('/')) {
      return null;
    }
    try {
      const { data } = supabase.storage
        .from('application-files')
        .getPublicUrl(filePath);
      return data?.publicUrl || null;
    } catch (err) {
      console.error('Error getting file URL:', err);
      return null;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get today's date in YYYY-MM-DD format for date input min attribute
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Check if a document is expired or expiring soon (within 30 days)
  const isExpiredOrExpiring = (expiryDate) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30; // Expired or expiring within 30 days
  };

  // Medical Examination Results: expiry starts from hire time (for testing: 1 day; later: 365 days)
  const MEDICAL_EXAMS_VALIDITY_DAYS = 1;
  const getMedicalExamsExpiryDate = (deployedDate) => {
    if (!deployedDate) return null;
    const base = new Date(deployedDate);
    if (Number.isNaN(base.getTime())) return null;
    return new Date(base.getTime() + MEDICAL_EXAMS_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
  };
  const isMedicalExamsExpired = (deployedDate) => {
    const exp = getMedicalExamsExpiryDate(deployedDate);
    if (!exp) return false;
    return Date.now() > exp.getTime();
  };

  // Check if a document is expired
  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    return expiry < today;
  };

  // Check if a date is in the past
  const isDateInPast = (dateStr) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date < today;
  };

  // State to trigger requirement reloads
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Onboarding items state
  const [onboardingItems, setOnboardingItems] = useState([]);

  // Assessment and agreement records state
  const [assessmentRecords, setAssessmentRecords] = useState([]);

  // Load employee requirements from database on mount and when employeeData changes
  useEffect(() => {
    const loadEmployeeRequirements = async () => {
      if (!employeeData?.email) return;

      try {
        // Get employee record with requirements
        const { data: employeeRecord, error } = await supabase
          .from('employees')
          .select('requirements, position, depot, hired_at')
          .eq('email', employeeData.email)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error loading employee requirements:', error);
          return;
        }

        if (!employeeRecord?.requirements) return;

        // Parse requirements
        let requirementsData = employeeRecord.requirements;
        if (typeof requirementsData === 'string') {
          try {
            requirementsData = JSON.parse(requirementsData);
          } catch {
            return;
          }
        }

        // Map database structure to local state structure
        setEmployee((prev) => {
          const updated = { ...prev };
          
          // Update position and depot if available
          if (employeeRecord.position) updated.position = employeeRecord.position;
          if (employeeRecord.depot) updated.depot = employeeRecord.depot;
          if (employeeRecord.hired_at) updated.deployedDate = employeeRecord.hired_at;

          // Map ID numbers
          if (requirementsData.id_numbers) {
            const idNums = requirementsData.id_numbers;
            
            ['sss', 'tin', 'pagibig', 'philhealth'].forEach(key => {
              if (idNums[key]) {
                const idData = idNums[key];
                // Map status - handle both HR format ('approved'/'resubmit') and database format ('Validated'/'Re-submit')
                let idStatus = 'missing';
                if (idData.status === 'Validated' || idData.status === 'approved') {
                  idStatus = 'approved';
                } else if (idData.status === 'Re-submit' || idData.status === 'resubmit') {
                  idStatus = 'resubmit';
                } else if (idData.status === 'Submitted' || idData.status === 'pending') {
                  idStatus = 'pending';
                }
                
                updated.requirements[key] = {
                  idNumber: idData.value || '',
                  hasFile: !!(idData.file_path || idData.filePath),
                  filePath: idData.file_path || idData.filePath || null,
                  status: idStatus,
                  submittedDate: idData.submitted_at || idData.validated_at || null,
                  remarks: idData.remarks || null,
                };
              }
            });
          }

          // Map documents
          if (requirementsData.documents && Array.isArray(requirementsData.documents)) {
            requirementsData.documents.forEach(doc => {
              if (doc.key && updated.documents[doc.key]) {
                // Map status - handle both HR format ('approved'/'resubmit') and database format ('Validated'/'Re-submit')
                let docStatus = 'missing';
                if (doc.status === 'Validated' || doc.status === 'approved') {
                  docStatus = 'approved';
                } else if (doc.status === 'Re-submit' || doc.status === 'resubmit') {
                  docStatus = 'resubmit';
                } else if (doc.status === 'Submitted' || doc.status === 'pending') {
                  docStatus = 'pending';
                }
                
                updated.documents[doc.key] = {
                  hasFile: !!(doc.file_path || doc.filePath),
                  filePath: doc.file_path || doc.filePath || null,
                  status: docStatus,
                  submittedDate: doc.submitted_at || doc.validated_at || null,
                  dateValidity: doc.date_validity || null,
                  remarks: doc.remarks || null,
                };
              }
            });
          }

          // Map medical exams
          if (requirementsData.medicalExams) {
            Object.keys(requirementsData.medicalExams).forEach(key => {
              if (updated.medicalExams[key]) {
                const medData = requirementsData.medicalExams[key];
                // Filter out placeholder paths
                const medFilePath = medData.file_path || medData.filePath;
                const validMedPath = medFilePath && !medFilePath.includes('local-file-path') && !medFilePath.startsWith('local-') && medFilePath.includes('/') ? medFilePath : null;
                
                // Map status - handle both HR format ('approved'/'resubmit') and database format ('Validated'/'Re-submit')
                let medStatus = 'missing';
                if (medData.status === 'Validated' || medData.status === 'approved') {
                  medStatus = 'approved';
                } else if (medData.status === 'Re-submit' || medData.status === 'resubmit') {
                  medStatus = 'resubmit';
                } else if (medData.status === 'Submitted' || medData.status === 'pending') {
                  medStatus = 'pending';
                }
                
                updated.medicalExams[key] = {
                  ...updated.medicalExams[key],
                  hasFile: !!validMedPath,
                  filePath: validMedPath,
                  status: medStatus,
                  submittedDate: medData.submitted_at || medData.validated_at || null,
                  validUntil: medData.validUntil || medData.valid_until || null,
                  remarks: medData.remarks || null,
                  versions: medData.versions || [],
                  currentVersion: medData.currentVersion || null,
                };
              }
            });
          }

          // Map personal documents
          if (requirementsData.personalDocuments) {
            Object.keys(requirementsData.personalDocuments).forEach(key => {
              if (updated.personalDocuments[key]) {
                const docData = requirementsData.personalDocuments[key];
                // Filter out placeholder paths
                const personalFilePath = docData.file_path || docData.filePath;
                const validPersonalPath = personalFilePath && !personalFilePath.includes('local-file-path') && !personalFilePath.startsWith('local-') && personalFilePath.includes('/') ? personalFilePath : null;
                
                // Map status - handle both HR format ('approved'/'resubmit') and database format ('Validated'/'Re-submit')
                let personalStatus = 'missing';
                if (docData.status === 'Validated' || docData.status === 'approved') {
                  personalStatus = 'approved';
                } else if (docData.status === 'Re-submit' || docData.status === 'resubmit') {
                  personalStatus = 'resubmit';
                } else if (docData.status === 'Submitted' || docData.status === 'pending') {
                  personalStatus = 'pending';
                }
                
                updated.personalDocuments[key] = {
                  ...updated.personalDocuments[key],
                  hasFile: !!validPersonalPath,
                  filePath: validPersonalPath,
                  status: personalStatus,
                  submittedDate: docData.submitted_at || docData.validated_at || null,
                  remarks: docData.remarks || null,
                };
              }
            });
          }

          // Mark "(If applicable)" personal docs as optional when not submitted.
          ['marriage_contract', 'dependents_birth_certificate'].forEach((key) => {
            const doc = updated.personalDocuments?.[key];
            if (!doc) return;
            const hasFile = Boolean(doc?.hasFile || doc?.filePath || doc?.file_path);
            if (!hasFile && (doc.status === 'missing' || !doc.status)) {
              updated.personalDocuments[key] = { ...doc, status: 'optional' };
            }
          });

          // Map clearances
          if (requirementsData.clearances) {
            Object.keys(requirementsData.clearances).forEach(key => {
              if (updated.clearances[key]) {
                const clearData = requirementsData.clearances[key];
                // Filter out placeholder paths
                const clearFilePath = clearData.file_path || clearData.filePath;
                const validClearPath = clearFilePath && !clearFilePath.includes('local-file-path') && !clearFilePath.startsWith('local-') && clearFilePath.includes('/') ? clearFilePath : null;
                
                // Map status - handle both HR format ('approved'/'resubmit') and database format ('Validated'/'Re-submit')
                let clearanceStatus = 'missing';
                if (clearData.status === 'Validated' || clearData.status === 'approved') {
                  clearanceStatus = 'approved';
                } else if (clearData.status === 'Re-submit' || clearData.status === 'resubmit') {
                  clearanceStatus = 'resubmit';
                } else if (clearData.status === 'Submitted' || clearData.status === 'pending') {
                  clearanceStatus = 'pending';
                }
                
                updated.clearances[key] = {
                  ...updated.clearances[key],
                  hasFile: !!validClearPath,
                  filePath: validClearPath,
                  status: clearanceStatus,
                  submittedDate: clearData.submitted_at || clearData.validated_at || null,
                  dateValidity: clearData.dateValidity || clearData.date_validity || null,
                  remarks: clearData.remarks || null,
                  versions: clearData.versions || [],
                  currentVersion: clearData.currentVersion || null,
                };
              }
            });
          }

          // Map HR requests
          if (requirementsData.hr_requests && Array.isArray(requirementsData.hr_requests)) {
            updated.hrRequests = requirementsData.hr_requests.map(req => {
              const rawStatus = String(req.status || '').trim().toLowerCase();
              const filePath = req.file_path || req.filePath || null;

              let status = 'pending';
              if (rawStatus === 'validated' || rawStatus === 'approved') status = 'approved';
              else if (rawStatus === 're-submit' || rawStatus === 'resubmit') status = 'resubmit';
              else if (filePath) status = 'submitted';

              return {
                id: req.id || Date.now().toString(),
                document: req.document_type || req.document || '',
                description: req.description || req.remarks || '',
                priority: req.priority || 'normal',
                requested_at: req.requested_at || new Date().toISOString(),
                requested_by: req.requested_by || 'HR',
                status,
                deadline: req.deadline || null,
                remarks: req.remarks || req.description || null,
                file_path: filePath,
                submitted_at: req.submitted_at || null,
              };
            });
          } else {
            updated.hrRequests = [];
          }

          // Map educational documents
          if (requirementsData.educationalDocuments) {
            Object.keys(requirementsData.educationalDocuments).forEach(key => {
              if (updated.educationalDocuments[key]) {
                const eduData = requirementsData.educationalDocuments[key];
                // Filter out placeholder paths
                const eduFilePath = eduData.file_path || eduData.filePath;
                const validEduPath = eduFilePath && !eduFilePath.includes('local-file-path') && !eduFilePath.startsWith('local-') && eduFilePath.includes('/') ? eduFilePath : null;
                
                // Map status - handle both HR format ('approved'/'resubmit') and database format ('Validated'/'Re-submit')
                let eduStatus = 'missing';
                if (eduData.status === 'Validated' || eduData.status === 'approved') {
                  eduStatus = 'approved';
                } else if (eduData.status === 'Re-submit' || eduData.status === 'resubmit') {
                  eduStatus = 'resubmit';
                } else if (eduData.status === 'Submitted' || eduData.status === 'pending') {
                  eduStatus = 'pending';
                }
                
                updated.educationalDocuments[key] = {
                  ...updated.educationalDocuments[key],
                  hasFile: !!validEduPath,
                  filePath: validEduPath,
                  status: eduStatus,
                  submittedDate: eduData.submitted_at || eduData.validated_at || null,
                  remarks: eduData.remarks || null,
                };
              }
            });
          }

          // Map license
          if (requirementsData.license) {
            const licenseData = requirementsData.license;
            // Filter out placeholder paths
            const photocopyPath =
              licenseData.filePath ||
              licenseData.file_path ||
              licenseData.licenseFilePath ||
              licenseData.license_file_path ||
              null;
            const frontPath = licenseData.frontFilePath || licenseData.front_file_path;
            const backPath = licenseData.backFilePath || licenseData.back_file_path;
            const validPhotocopyPath = photocopyPath && !photocopyPath.includes('local-file-path') && !photocopyPath.startsWith('local-') && photocopyPath.includes('/') ? photocopyPath : null;
            const validFrontPath = frontPath && !frontPath.includes('local-file-path') && !frontPath.startsWith('local-') && frontPath.includes('/') ? frontPath : null;
            const validBackPath = backPath && !backPath.includes('local-file-path') && !backPath.startsWith('local-') && backPath.includes('/') ? backPath : null;
            
            // Map status - handle both HR format ('approved'/'resubmit') and database format ('Validated'/'Re-submit')
            let licenseStatus = 'missing';
            if (licenseData.status === 'Validated' || licenseData.status === 'approved') {
              licenseStatus = 'approved';
            } else if (licenseData.status === 'Re-submit' || licenseData.status === 'resubmit') {
              licenseStatus = 'resubmit';
            } else if (licenseData.status === 'Submitted' || licenseData.status === 'pending') {
              licenseStatus = 'pending';
            }
            
            updated.license = {
              ...updated.license,
              licenseNumber: licenseData.licenseNumber || licenseData.license_number || '',
              licenseExpiry: licenseData.licenseExpiry || licenseData.license_expiry || '',
              filePath: validPhotocopyPath,
              frontFilePath: validFrontPath,
              backFilePath: validBackPath,
              hasFile: !!(validPhotocopyPath || (validFrontPath && validBackPath)),
              status: licenseStatus,
              submittedDate: licenseData.submitted_at || licenseData.validated_at || null,
              remarks: licenseData.remarks || null,
              versions: licenseData.versions || [],
              currentVersion: licenseData.currentVersion || null,
            };
          }

          return updated;
        });
      } catch (err) {
        console.error('Error loading employee requirements:', err);
      }
    };

    loadEmployeeRequirements();
  }, [employeeData?.email, refreshTrigger]);

  // Load onboarding items
  useEffect(() => {
    const loadOnboardingItems = async () => {
      if (!employeeData?.email) return;

      try {
        console.log('🔍 Looking for employee with email:', employeeData.email);
        
        // Get employee record to find employee_id
        const { data: employeeRecord, error: empError } = await supabase
          .from('employees')
          .select('id, email, personal_email')
          .eq('email', employeeData.email)
          .single();

        if (empError || !employeeRecord?.id) {
          console.error('❌ Error loading employee ID:', empError);
          console.log('Employee record not found, checking if data exists:', employeeRecord);
          return;
        }

        console.log('✅ Found employee ID:', employeeRecord.id);

        // Fetch onboarding items
        const { data: onboardingData, error } = await supabase
          .from('onboarding')
          .select('*')
          .eq('employee_id', employeeRecord.id)
          .order('date_issued', { ascending: false });

        if (error) {
          console.error('❌ Error loading onboarding items:', error);
          setOnboardingItems([]);
          return;
        }

        console.log('📦 Onboarding data retrieved:', onboardingData?.length || 0, 'items');

        if (onboardingData && onboardingData.length > 0) {
          const items = onboardingData.map(item => ({
            id: item.id,
            item: item.item || item.name || '',
            description: item.description || '',
            date: item.date_issued || item.date || '',
            file: item.file_path || item.filePath || null,
            fileUrl: item.file_path || item.filePath ? getFileUrl(item.file_path || item.filePath) : null
          }));
          setOnboardingItems(items);
          console.log('✅ Onboarding items set:', items);
        } else {
          setOnboardingItems([]);
          console.log('ℹ️ No onboarding items found');
        }
      } catch (err) {
        console.error('❌ Error loading onboarding items:', err);
        setOnboardingItems([]);
      }
    };

    loadOnboardingItems();
  }, [employeeData?.email, refreshTrigger]);

  // Load assessment records (from when employee was an applicant)
  useEffect(() => {
    const loadAssessmentRecords = async () => {
      const workEmail = employeeData?.email?.trim();

      if (!workEmail) {
        console.log('📋 No employee email, skipping assessment records');
        setAssessmentRecords([]);
        return;
      }

      try {
        console.log('📋 Loading assessment records for work email:', workEmail);
        
        // First, get the employee's personal_email from employees table
        const { data: employeeRecord, error: empError } = await supabase
          .from('employees')
          .select('personal_email')
          .eq('email', workEmail)
          .maybeSingle();

        if (empError) {
          console.error('❌ Error fetching employee personal_email:', empError);
          setAssessmentRecords([]);
          return;
        }

        console.log('📧 Employee record:', employeeRecord);
        
        const personalEmail = employeeRecord?.personal_email?.trim();
        
        if (!personalEmail) {
          console.log('⚠️ No personal_email found for employee, trying with work email');
        } else {
          console.log('✅ Found personal email:', personalEmail);
        }

        // Use personal email if available, otherwise fall back to work email
        const applicantEmail = personalEmail || workEmail;
        const normalizedEmail = applicantEmail.toLowerCase();
        
        console.log('🔍 Searching for applicant with email:', applicantEmail);
        
        const baseSelect =
          'id, interview_details_file, assessment_results_file, appointment_letter_file, undertaking_file, application_form_file, undertaking_duties_file, pre_employment_requirements_file, id_form_file, created_at, user_id, status, job_posts:job_id(title, depot), payload';

        let applicationsData = null;

        // Approach 1: find applicant by email (original or lowercased) to get user_id
        let applicantId = null;
        try {
          const { data: applicantData } = await supabase
            .from('applicants')
            .select('id')
            .eq('email', applicantEmail)
            .maybeSingle();

          if (applicantData?.id) {
            applicantId = applicantData.id;
            console.log('✅ Found applicant by email:', applicantId);
          } else {
            const { data: applicantData2 } = await supabase
              .from('applicants')
              .select('id')
              .eq('email', normalizedEmail)
              .maybeSingle();
            if (applicantData2?.id) {
              applicantId = applicantData2.id;
              console.log('✅ Found applicant by normalized email:', applicantId);
            }
          }
        } catch (err) {
          console.error('Error looking up applicant by email:', err);
        }

        if (!applicantId) {
          console.log('⚠️ No applicant found in applicants table');
        }

        if (applicantId) {
          console.log('🔍 Querying applications with user_id:', applicantId);
          const { data, error, count } = await supabase
            .from('applications')
            .select(baseSelect, { count: 'exact' })
            .eq('user_id', applicantId)
            .order('created_at', { ascending: false });
          
          console.log('📊 Query result - count:', count, 'data:', data?.length, 'error:', error);
          
          if (error) {
            console.error('❌ Error querying applications by user_id:', error);
          } else if (data && data.length > 0) {
            applicationsData = data;
            console.log('✅ Found applications by user_id:', data.length, 'applications');
            console.log('📄 Application status:', data[0].status);
            console.log('📄 Application files:', {
              appointment_letter: data[0].appointment_letter_file,
              undertaking: data[0].undertaking_file,
              application_form: data[0].application_form_file,
            });
          } else {
            console.log('⚠️ No applications found for user_id:', applicantId);
            console.log('🔍 Trying alternate search by email in payload...');
          }
        }

        // Approach 2: query by email in payload paths (personal email variants)
        if (!applicationsData || applicationsData.length === 0) {
          const emailsToTry = [applicantEmail, normalizedEmail];
          for (const email of emailsToTry) {
            console.log('🔍 Trying payload->>email for:', email);
            let { data, error } = await supabase
              .from('applications')
              .select(baseSelect)
              .eq('payload->>email', email)
              .order('created_at', { ascending: false });
            if (!error && data && data.length > 0) {
              applicationsData = data;
              console.log('✅ Found', data.length, 'applications by payload->>email');
              break;
            }

            console.log('🔍 Trying payload->form->>email for:', email);
            const { data: data2, error: error2 } = await supabase
              .from('applications')
              .select(baseSelect)
              .eq('payload->form->>email', email)
              .order('created_at', { ascending: false });
            if (!error2 && data2 && data2.length > 0) {
              applicationsData = data2;
              console.log('✅ Found', data2.length, 'applications by payload->form->>email');
              break;
            }

            console.log('🔍 Trying payload->applicant->>email for:', email);
            const { data: data3, error: error3 } = await supabase
              .from('applications')
              .select(baseSelect)
              .eq('payload->applicant->>email', email)
              .order('created_at', { ascending: false });
            if (!error3 && data3 && data3.length > 0) {
              applicationsData = data3;
              console.log('✅ Found', data3.length, 'applications by payload->applicant->>email');
              break;
            }
          }
          if (!applicationsData || applicationsData.length === 0) {
            console.log('⚠️ No applications found by payload email search');
          }
        }

        // Approach 3: case-insensitive parsing of recent applications
        if (!applicationsData || applicationsData.length === 0) {
          console.log('🔍 Trying broad search of all applications with status=hired...');
          const { data: allApps } = await supabase
            .from('applications')
            .select(baseSelect)
            .eq('status', 'hired')
            .order('created_at', { ascending: false })
            .limit(1000);

          if (allApps) {
            console.log('📋 Found', allApps.length, 'hired applications to search through');
            const matches = allApps.filter((app) => {
              if (!app.payload) return false;
              try {
                const payload =
                  typeof app.payload === 'string'
                    ? JSON.parse(app.payload)
                    : app.payload;
                const src = payload.form || payload.applicant || payload || {};
                const email = (src.email || '').trim().toLowerCase();
                const match = email && email === normalizedEmail;
                if (match) {
                  console.log('✅ Found matching application:', app.id, 'with status:', app.status);
                }
                return match;
              } catch {
                return false;
              }
            });
            if (matches.length > 0) {
              applicationsData = matches;
              console.log('✅ Found', matches.length, 'matching applications by manual parsing');
            } else {
              console.log('⚠️ No matches found in hired applications');
            }
          }
        }

        if (applicationsData && applicationsData.length > 0) {
          // Prioritize hired applications, then most recent
          const sorted = [...applicationsData].sort((a, b) => {
            const aHired = (a.status || '').toLowerCase() === 'hired';
            const bHired = (b.status || '').toLowerCase() === 'hired';
            if (aHired && !bHired) return -1;
            if (!aHired && bHired) return 1;
            return new Date(b.created_at) - new Date(a.created_at);
          });

          const mostRecentApp = sorted[0];
          console.log('📋 Using application:', mostRecentApp.id, 'status:', mostRecentApp.status);
          const jobTitle = mostRecentApp.job_posts?.title || 'N/A';
          const depot = mostRecentApp.job_posts?.depot || 'N/A';
          const date = mostRecentApp.created_at;

          // Parse payload to get interview_notes_attachments
          let payload = null;
          try {
            payload = typeof mostRecentApp.payload === 'string' 
              ? JSON.parse(mostRecentApp.payload) 
              : mostRecentApp.payload;
          } catch (err) {
            console.error('Error parsing payload:', err);
          }

          const interviewNotesAttachments = payload?.interview_notes_attachments || [];
          const agreementDocuments = payload?.agreement_documents || [];

          // Find Interview Details and Assessment Result from payload
          const interviewDetailsDoc = interviewNotesAttachments.find(doc => 
            doc.label === 'Interview Details'
          );
          const assessmentResultDoc = interviewNotesAttachments.find(doc => 
            doc.label === 'Assessment Result'
          );

          const records = [];

          records.push({
            id: `${mostRecentApp.id}-interview-details`,
            type: 'assessment',
            documentName: 'Interview Details',
            fileName: interviewDetailsDoc?.originalName || (interviewDetailsDoc?.path ? interviewDetailsDoc.path.split('/').pop() : null),
            filePath: interviewDetailsDoc?.path || mostRecentApp.interview_details_file,
            fileUrl: interviewDetailsDoc?.path 
              ? getFileUrl(interviewDetailsDoc.path)
              : (mostRecentApp.interview_details_file ? getFileUrl(mostRecentApp.interview_details_file) : null),
            date,
            jobTitle,
            depot,
            applicationId: mostRecentApp.id,
            icon: 'blue',
          });

          records.push({
            id: `${mostRecentApp.id}-assessment-results`,
            type: 'assessment',
            documentName: 'In-Person Assessment Results',
            fileName: assessmentResultDoc?.originalName || (assessmentResultDoc?.path ? assessmentResultDoc.path.split('/').pop() : null),
            filePath: assessmentResultDoc?.path || mostRecentApp.assessment_results_file,
            fileUrl: assessmentResultDoc?.path 
              ? getFileUrl(assessmentResultDoc.path)
              : (mostRecentApp.assessment_results_file ? getFileUrl(mostRecentApp.assessment_results_file) : null),
            date,
            jobTitle,
            depot,
            applicationId: mostRecentApp.id,
            icon: 'green',
          });

          // Get agreement documents from payload (with labels matching exactly)
          const agreementDocsMapping = [
            { key: 'appointment-letter', name: 'Employee Appointment Letter', label: 'Employee Appointment Letter' },
            { key: 'undertaking', name: 'Undertaking', label: 'Undertaking' },
            { key: 'undertaking-duties', name: 'Undertaking of Duties and Responsibilities', label: 'Undertaking of Duties and Responsibilities' },
          ];

          agreementDocsMapping.forEach((docDef) => {
            const payloadDoc = agreementDocuments.find(doc => doc.label === docDef.label);
            const filePath = payloadDoc?.path || null;
            const fileName = payloadDoc?.originalName || (filePath ? filePath.split('/').pop() : null);

            records.push({
              id: `${mostRecentApp.id}-${docDef.key}`,
              type: 'agreement',
              documentName: docDef.name,
              fileName,
              filePath,
              fileUrl: filePath ? getFileUrl(filePath) : null,
              date,
              jobTitle,
              depot,
              applicationId: mostRecentApp.id,
            });
          });

          console.log('✅ Created', records.length, 'assessment/agreement records');
          console.log('📋 Records with files:', records.filter(r => r.filePath).length);
          setAssessmentRecords(records);
        } else {
          console.log('⚠️ No applications data found for employee');
          setAssessmentRecords([]);
        }
      } catch (err) {
        console.error('Error loading assessment records:', err);
        setAssessmentRecords([]);
      }
    };

    loadAssessmentRecords();
  }, [employeeData?.email]);

  // Refresh onboarding items periodically (every 5 seconds) to catch new items from HR
  useEffect(() => {
    if (!employeeData?.email) return;
    
    const interval = setInterval(() => {
      // Trigger refresh by updating refreshTrigger
      setRefreshTrigger(Date.now());
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [employeeData?.email]);

  const getStatusStyle = (status) => {
    const styles = {
      approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
      submitted: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Submitted' },
      resubmit: { bg: 'bg-red-100', text: 'text-red-700', label: 'Re-submit' },
      optional: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Optional' },
      missing: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Missing' },
    };
    return styles[status] || styles.pending;
  };

  const OPTIONAL_PERSONAL_DOC_KEYS = new Set(['marriage_contract', 'dependents_birth_certificate']);
  const shouldCountPersonalDoc = (key, doc) => {
    const k = String(key || '').trim();
    const isOptional = OPTIONAL_PERSONAL_DOC_KEYS.has(k);
    const hasFile = Boolean(doc?.hasFile || doc?.filePath || doc?.file_path);
    return !isOptional || hasFile;
  };

  // Calculate employee status (pure UI)
  const getEmployeeStatus = () => {
    if (!employee) return 'pending';
    const govReqs = Object.values(employee.requirements || {});
    const docReqs = Object.values(employee.documents || {});
    const medicalReqs = Object.values(employee.medicalExams || {});
    const personalReqs = Object.entries(employee.personalDocuments || {})
      .filter(([key, doc]) => shouldCountPersonalDoc(key, doc))
      .map(([, doc]) => doc);
    const clearanceReqs = Object.values(employee.clearances || {});
    const educationalReqs = Object.values(employee.educationalDocuments || {});
    const licenseReq = employee.license ? [employee.license] : [];

    const allReqs = [...govReqs, ...docReqs, ...medicalReqs, ...personalReqs, ...clearanceReqs, ...educationalReqs, ...licenseReq];

    const hasResubmit = allReqs.some(r => r.status === 'resubmit') ||
                        employee.hrRequests.some(r => r.status === 'resubmit');
    const hasMissing = allReqs.some(r => r.status === 'missing');
    const hasPending = allReqs.some(r => r.status === 'pending') ||
                       employee.hrRequests.some(r => r.status === 'pending' || r.status === 'submitted');
    const allApproved = allReqs.length > 0 &&
                        allReqs.every(r => r.status === 'approved') &&
                        employee.hrRequests.every(r => r.status === 'approved');
    
    if (hasResubmit) return 'action_required';
    if (hasMissing) return 'incomplete';
    if (hasPending) return 'pending';
    if (allApproved) return 'complete';
    return 'pending';
  };

  const getEmployeeStatusBadge = (status) => {
    const styles = {
      complete: { text: 'text-green-600', label: 'Complete' },
      pending: { text: 'text-yellow-600', label: 'Pending Review' },
      incomplete: { text: 'text-orange-600', label: 'Incomplete' },
      action_required: { text: 'text-red-600', label: 'Action Required' },
    };
    return styles[status] || styles.pending;
  };

  // Count requirements progress (pure UI)
  const getRequirementsProgress = () => {
    if (!employee) return { approved: 0, total: 0 };
    const govReqs = Object.values(employee.requirements || {});
    const docReqs = Object.values(employee.documents || {});
    const medicalReqs = Object.values(employee.medicalExams || {});
    const personalReqs = Object.entries(employee.personalDocuments || {})
      .filter(([key, doc]) => shouldCountPersonalDoc(key, doc))
      .map(([, doc]) => doc);
    const clearanceReqs = Object.values(employee.clearances || {});
    const educationalReqs = Object.values(employee.educationalDocuments || {});
    const licenseReq = employee.license ? [employee.license] : [];
    const allReqs = [...govReqs, ...docReqs, ...medicalReqs, ...personalReqs, ...clearanceReqs, ...educationalReqs, ...licenseReq];
    const approved = allReqs.filter(r => r.status === 'approved').length;
    return { approved, total: allReqs.length };
  };

  // Calculate statistics for requirements
  const getRequirementsStatistics = () => {
    if (!employee) return { approved: 0, pending: 0, missing: 0, resubmit: 0, expired: 0 };
    const govReqs = Object.values(employee.requirements || {});
    const docReqs = Object.values(employee.documents || {});
    const medicalReqs = Object.values(employee.medicalExams || {});
    const personalReqs = Object.entries(employee.personalDocuments || {})
      .filter(([key, doc]) => shouldCountPersonalDoc(key, doc))
      .map(([, doc]) => doc);
    const clearanceReqs = Object.values(employee.clearances || {});
    const educationalReqs = Object.values(employee.educationalDocuments || {});
    const licenseReq = employee.license ? [employee.license] : [];
    const allReqs = [...govReqs, ...docReqs, ...medicalReqs, ...personalReqs, ...clearanceReqs, ...educationalReqs, ...licenseReq];
    
    // Count expired documents (only for documents with expiry dates)
    let expiredCount = 0;
    // Check medical exams
    medicalReqs.forEach(req => {
      // Medical exams expire based on hire date, not submission date
      if (req.hasFile && req.status === 'approved' && isMedicalExamsExpired(employee?.deployedDate)) {
        expiredCount++;
      }
    });
    // Check clearances
    clearanceReqs.forEach(req => {
      if (req.dateValidity && isExpired(req.dateValidity) && req.status === 'approved') {
        expiredCount++;
      }
    });
    // Check license
    if (licenseReq.length > 0) {
      const license = licenseReq[0];
      if (license.licenseExpiry && isExpired(license.licenseExpiry) && license.status === 'approved') {
        expiredCount++;
      }
    }
    
    return {
      approved: allReqs.filter(r => r.status === 'approved').length,
      pending: allReqs.filter(r => r.status === 'pending').length,
      missing: allReqs.filter(r => r.status === 'missing').length,
      resubmit: allReqs.filter(r => r.status === 'resubmit').length,
      expired: expiredCount,
    };
  };

  // Upload Modal Functions (UI only – local state, no backend)
  const openUploadModal = (type, key, name, isResubmit = false, currentValue = '', isRenewal = false) => {
    // Check if privacy policy has been accepted
    if (!privacyAccepted) {
      setShowPrivacyModal(true);
      // Store the upload target to open after privacy acceptance
      setUploadTarget({ type, key, name, isResubmit, isRenewal });
      return;
    }
    
    setUploadTarget({ type, key, name, isResubmit, isRenewal });
    if (type === 'license') {
      const licenseData = employee?.license || {};
      setUploadForm({ 
        idNumber: '', 
        licenseNumber: currentValue || licenseData.licenseNumber || '', 
        licenseExpiry: licenseData.licenseExpiry || '',
        validUntil: '',
        file: null,
        frontFile: null,
        backFile: null
      });
    } else if (type === 'medical') {
      setUploadForm({ 
        idNumber: '', 
        licenseNumber: '', 
        licenseExpiry: '',
        validUntil: '',
        file: null,
        frontFile: null,
        backFile: null
      });
    } else if (type === 'clearance') {
      const clearanceData = employee?.clearances?.[key] || {};
      setUploadForm({ 
        idNumber: '', 
        licenseNumber: '', 
        licenseExpiry: '',
        validUntil: currentValue || clearanceData.dateValidity || '',
        file: null,
        frontFile: null,
        backFile: null
      });
    } else {
      setUploadForm({ 
        idNumber: currentValue || '', 
        licenseNumber: '', 
        licenseExpiry: '',
        validUntil: '',
        file: null,
        frontFile: null,
        backFile: null
      });
    }
    setShowUploadModal(true);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setUploadTarget(null);
    setUploadForm({ idNumber: '', licenseNumber: '', licenseExpiry: '', validUntil: '', file: null, frontFile: null, backFile: null });
    setIsDragging(false);
    setIsDraggingFront(false);
    setIsDraggingBack(false);
  };


  const handleFileSelect = (file) => {
    if (file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        setFileErrorMessage('Please upload a valid file (PDF, JPG, PNG, DOC, DOCX)');
        setShowFileErrorModal(true);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setFileErrorMessage('File size must be less than 10MB');
        setShowFileErrorModal(true);
        return;
      }
      setUploadForm(prev => ({ ...prev, file }));
    }
  };

  const handleFrontFileSelect = (file) => {
    if (file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setFileErrorMessage('Please upload a valid image file (JPG, PNG) or PDF');
        setShowFileErrorModal(true);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setFileErrorMessage('File size must be less than 10MB');
        setShowFileErrorModal(true);
        return;
      }
      setUploadForm(prev => ({ ...prev, frontFile: file }));
    }
  };

  const handleBackFileSelect = (file) => {
    if (file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setFileErrorMessage('Please upload a valid image file (JPG, PNG) or PDF');
        setShowFileErrorModal(true);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setFileErrorMessage('File size must be less than 10MB');
        setShowFileErrorModal(true);
        return;
      }
      setUploadForm(prev => ({ ...prev, backFile: file }));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleFrontDragOver = (e) => {
    e.preventDefault();
    setIsDraggingFront(true);
  };

  const handleFrontDragLeave = (e) => {
    e.preventDefault();
    setIsDraggingFront(false);
  };

  const handleFrontDrop = (e) => {
    e.preventDefault();
    setIsDraggingFront(false);
    const file = e.dataTransfer.files[0];
    handleFrontFileSelect(file);
  };

  const handleBackDragOver = (e) => {
    e.preventDefault();
    setIsDraggingBack(true);
  };

  const handleBackDragLeave = (e) => {
    e.preventDefault();
    setIsDraggingBack(false);
  };

  const handleBackDrop = (e) => {
    e.preventDefault();
    setIsDraggingBack(false);
    const file = e.dataTransfer.files[0];
    handleBackFileSelect(file);
  };

  const handleUploadSubmit = () => {
    if (!employee) return;

    // Simple UI validation (no backend)
    if (uploadTarget?.type === "default" && !uploadForm.idNumber.trim()) {
      setAlertMessage("Please enter the ID number");
      setShowErrorAlert(true);
      return;
    }
    if (uploadTarget?.type === "license" && !uploadForm.licenseNumber.trim()) {
      setAlertMessage("Please enter the license number");
      setShowErrorAlert(true);
      return;
    }
    if (uploadTarget?.type === "license" && !uploadForm.licenseExpiry.trim()) {
      setAlertMessage("Please enter the license expiry date");
      setShowErrorAlert(true);
      return;
    }
    if (uploadTarget?.type === "license" && uploadForm.licenseExpiry.trim() && isDateInPast(uploadForm.licenseExpiry)) {
      setAlertMessage("License expiry date cannot be in the past. Please select today's date or later.");
      setShowErrorAlert(true);
      return;
    }
    if (uploadTarget?.type === "clearance" && !uploadForm.validUntil.trim()) {
      setAlertMessage("Please enter the valid until date");
      setShowErrorAlert(true);
      return;
    }
    if (uploadTarget?.type === "clearance" && uploadForm.validUntil.trim() && isDateInPast(uploadForm.validUntil)) {
      setAlertMessage("Valid until date cannot be in the past. Please select today's date or later.");
      setShowErrorAlert(true);
      return;
    }
    if (uploadTarget?.type === "license") {
      if (!uploadForm.file) {
        setAlertMessage("Please select a license photocopy file to upload");
        setShowErrorAlert(true);
        return;
      }
    } else if (!uploadForm.file) {
      setAlertMessage("Please select a file to upload");
      setShowErrorAlert(true);
      return;
    }

    setUploading(true);

    // Actually save to database
    (async () => {
      try {
        if (!employeeData?.email) {
          setAlertMessage("Employee email not found. Please refresh the page.");
          setShowErrorAlert(true);
          setUploading(false);
          return;
        }

        // Get current employee requirements from database
        const { data: employeeRecord, error: fetchError } = await supabase
          .from('employees')
          .select('requirements')
          .eq('email', employeeData.email)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error fetching employee:', fetchError);
          setAlertMessage("Failed to load employee data. Please try again.");
          setShowErrorAlert(true);
          setUploading(false);
          return;
        }

        // Parse existing requirements
        let currentRequirements = {};
        if (employeeRecord?.requirements) {
          if (typeof employeeRecord.requirements === 'string') {
            try {
              currentRequirements = JSON.parse(employeeRecord.requirements);
            } catch {
              currentRequirements = {};
            }
          } else {
            currentRequirements = employeeRecord.requirements;
          }
        }

        // Initialize structure if needed
        if (!currentRequirements.id_numbers) currentRequirements.id_numbers = {};
        if (!currentRequirements.documents) currentRequirements.documents = [];
        if (!currentRequirements.hr_requests) currentRequirements.hr_requests = [];
        if (!currentRequirements.medicalExams) currentRequirements.medicalExams = {};
        if (!currentRequirements.personalDocuments) currentRequirements.personalDocuments = {};
        if (!currentRequirements.clearances) currentRequirements.clearances = {};
        if (!currentRequirements.educationalDocuments) currentRequirements.educationalDocuments = {};
        if (!currentRequirements.license) currentRequirements.license = {};

        // Prepare updated requirements structure
        const updated = {
          ...currentRequirements,
          id_numbers: { ...currentRequirements.id_numbers },
          documents: [...(currentRequirements.documents || [])],
          hr_requests: [...(currentRequirements.hr_requests || [])],
          medicalExams: { ...currentRequirements.medicalExams },
          personalDocuments: { ...currentRequirements.personalDocuments },
          clearances: { ...currentRequirements.clearances },
          educationalDocuments: { ...currentRequirements.educationalDocuments },
          license: { ...currentRequirements.license },
        };

        // Helper function to upload file to storage
        const uploadFileToStorage = async (file, folder, fileName) => {
          if (!file) return null;
          const fileExt = file.name.split('.').pop();
          const filePath = `${folder}/${employeeData.email}/${fileName}_${Date.now()}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('application-files')
            .upload(filePath, file, { upsert: false });
          
          if (uploadError) {
            console.error('File upload error:', uploadError);
            throw new Error(`Failed to upload file: ${uploadError.message}`);
          }
          
          return filePath;
        };

        // Upload files and update requirements based on type
        if (uploadTarget.type === "default") {
          const key = uploadTarget.key;
          
          // Upload file
          const filePath = await uploadFileToStorage(
            uploadForm.file,
            'employee-requirements',
            `${key}_id`
          );

          // Update id_numbers structure (this is what HR reads)
          if (!updated.id_numbers[key]) {
            updated.id_numbers[key] = {};
          }
          
          updated.id_numbers[key] = {
            ...updated.id_numbers[key],
            value: uploadForm.idNumber.trim(),
            status: "Submitted", // Set to Submitted for HR to validate
            submitted_at: new Date().toISOString(),
            file_path: filePath,
          };
        } else if (uploadTarget.type === "document") {
          const key = uploadTarget.key;
          
          // Upload file
          const filePath = await uploadFileToStorage(
            uploadForm.file,
            'employee-requirements',
            `doc_${key}`
          );

          // Find or create document in documents array
          const docIndex = updated.documents.findIndex(d => d.key === key);
          const docData = {
            key: key,
            name: uploadTarget.name,
            file_path: filePath,
            status: "Submitted", // Set to Submitted for HR to validate
            submitted_at: new Date().toISOString(),
            date_validity: null,
            remarks: null,
          };

          if (docIndex >= 0) {
            updated.documents[docIndex] = { ...updated.documents[docIndex], ...docData };
          } else {
            updated.documents.push(docData);
          }
        } else if (uploadTarget.type === "medical") {
          const key = uploadTarget.key;
          const currentMedical = updated.medicalExams[key] || {
            hasFile: false,
            filePath: null,
            status: "missing",
            submittedDate: null,
            validUntil: null,
            remarks: null,
            versions: [],
            currentVersion: null,
          };

          // If this is a renewal, save current version to history
          if (uploadTarget.isRenewal && currentMedical.hasFile) {
            const versionToSave = {
              filePath: currentMedical.filePath,
              submittedDate: currentMedical.submittedDate,
              validUntil: currentMedical.validUntil,
              status: currentMedical.status,
              archivedDate: new Date().toISOString(),
            };
            currentMedical.versions = [...(currentMedical.versions || []), versionToSave];
          }

          // Upload file to storage
          const filePath = await uploadFileToStorage(
            uploadForm.file,
            'employee-requirements',
            `medical_${key}`
          );

          updated.medicalExams[key] = {
            ...currentMedical,
            hasFile: true,
            filePath: filePath,
            file_path: filePath, // Also store as file_path for HR compatibility
            status: "Submitted", // Set to Submitted for HR to validate
            submitted_at: new Date().toISOString(),
            submittedDate: new Date().toISOString(),
            validUntil: null,
            currentVersion: uploadTarget.isRenewal ? (currentMedical.versions?.length || 0) : currentMedical.currentVersion,
            remarks: null, // Clear any previous remarks when submitting a renewal
          };
        } else if (uploadTarget.type === "personal") {
          const key = uploadTarget.key;
          const currentPersonal = updated.personalDocuments[key] || {
            hasFile: false,
            filePath: null,
            status: "missing",
            submittedDate: null,
            remarks: null,
          };

          // Upload file to storage
          const filePath = await uploadFileToStorage(
            uploadForm.file,
            'employee-requirements',
            `personal_${key}`
          );

          updated.personalDocuments[key] = {
            ...currentPersonal,
            hasFile: true,
            filePath: filePath,
            file_path: filePath, // Also store as file_path for HR compatibility
            status: "Submitted", // Set to Submitted for HR to validate
            submitted_at: new Date().toISOString(),
            submittedDate: new Date().toISOString(),
          };
        } else if (uploadTarget.type === "hr") {
          const requestId = String(uploadTarget.key || '').trim();
          if (!requestId) {
            throw new Error('HR request ID not found');
          }

          const filePath = await uploadFileToStorage(
            uploadForm.file,
            'employee-requirements',
            `hr_${requestId}`
          );

          const idx = updated.hr_requests.findIndex((r) => String(r?.id || '') === requestId);
          const patch = {
            id: requestId,
            document_type: uploadTarget.name,
            document: uploadTarget.name,
            file_path: filePath,
            filePath: filePath,
            submitted_at: new Date().toISOString(),
            // Keep it pending for HR review; UI will show "Submitted" when file exists
            status: 'pending',
          };

          if (idx >= 0) {
            updated.hr_requests[idx] = { ...updated.hr_requests[idx], ...patch };
          } else {
            updated.hr_requests.push(patch);
          }
        } else if (uploadTarget.type === "clearance") {
          const key = uploadTarget.key;
          const currentClearance = updated.clearances[key] || {
            hasFile: false,
            filePath: null,
            status: "missing",
            submittedDate: null,
            dateValidity: null,
            remarks: null,
            versions: [],
            currentVersion: null,
          };

          // If this is a renewal, save current version to history
          if (uploadTarget.isRenewal && currentClearance.hasFile) {
            const versionToSave = {
              filePath: currentClearance.filePath,
              submittedDate: currentClearance.submittedDate,
              dateValidity: currentClearance.dateValidity,
              status: currentClearance.status,
              archivedDate: new Date().toISOString(),
            };
            currentClearance.versions = [...(currentClearance.versions || []), versionToSave];
          }

          // Upload file to storage
          const filePath = await uploadFileToStorage(
            uploadForm.file,
            'employee-requirements',
            `clearance_${key}`
          );

          updated.clearances[key] = {
            ...currentClearance,
            hasFile: true,
            filePath: filePath,
            file_path: filePath, // Also store as file_path for HR compatibility
            status: "Submitted", // Set to Submitted for HR to validate
            submitted_at: new Date().toISOString(),
            submittedDate: new Date().toISOString(),
            dateValidity: uploadForm.validUntil.trim(),
            date_validity: uploadForm.validUntil.trim(), // Also store as date_validity for HR compatibility
            currentVersion: uploadTarget.isRenewal ? (currentClearance.versions?.length || 0) : currentClearance.currentVersion,
            remarks: null, // Clear any previous remarks when submitting a renewal
          };
        } else if (uploadTarget.type === "educational") {
          const key = uploadTarget.key;
          const currentEducational = updated.educationalDocuments[key] || {
            hasFile: false,
            filePath: null,
            status: "missing",
            submittedDate: null,
            remarks: null,
          };

          // Upload file to storage
          const filePath = await uploadFileToStorage(
            uploadForm.file,
            'employee-requirements',
            `educational_${key}`
          );

          updated.educationalDocuments[key] = {
            ...currentEducational,
            hasFile: true,
            filePath: filePath,
            file_path: filePath, // Also store as file_path for HR compatibility
            status: "Submitted", // Set to Submitted for HR to validate
            submitted_at: new Date().toISOString(),
            submittedDate: new Date().toISOString(),
          };
        } else if (uploadTarget.type === "license") {
          const currentLicense = updated.license || {
            licenseNumber: "",
            licenseExpiry: "",
            file: null,
            filePath: null,
            frontFile: null,
            frontFilePath: null,
            backFile: null,
            backFilePath: null,
            status: "missing",
            submittedDate: null,
            remarks: null,
            versions: [],
            currentVersion: null,
          };

          // If this is a renewal, save current version to history
          if (uploadTarget.isRenewal && (currentLicense.filePath || currentLicense.file_path || currentLicense.frontFilePath || currentLicense.backFilePath)) {
            const versionToSave = {
              licenseNumber: currentLicense.licenseNumber,
              licenseExpiry: currentLicense.licenseExpiry,
              filePath: currentLicense.filePath || currentLicense.file_path || null,
              frontFilePath: currentLicense.frontFilePath,
              backFilePath: currentLicense.backFilePath,
              submittedDate: currentLicense.submittedDate,
              status: currentLicense.status,
              archivedDate: new Date().toISOString(),
            };
            currentLicense.versions = [...(currentLicense.versions || []), versionToSave];
          }

          // Upload a single photocopy file
          const licenseFilePath = await uploadFileToStorage(
            uploadForm.file,
            'employee-requirements',
            'license_photocopy'
          );

          updated.license = {
            ...currentLicense,
            licenseNumber: uploadForm.licenseNumber.trim(),
            licenseExpiry: uploadForm.licenseExpiry.trim(),
            file: uploadForm.file,
            filePath: licenseFilePath,
            file_path: licenseFilePath,
            frontFile: null,
            frontFilePath: null,
            backFile: null,
            backFilePath: null,
            status: "Submitted", // Set to Submitted for HR to validate
            submitted_at: new Date().toISOString(),
            submittedDate: new Date().toISOString(),
            hasFile: true,
            currentVersion: uploadTarget.isRenewal ? (currentLicense.versions?.length || 0) : currentLicense.currentVersion,
            remarks: null, // Clear any previous remarks when submitting a renewal
          };
        }

        // Save updated requirements to database
        const { error: saveError } = await supabase
          .from('employees')
          .update({ requirements: updated })
          .eq('email', employeeData.email);

        if (saveError) {
          console.error('Error saving requirements:', saveError);
          setAlertMessage("Failed to save requirements. Please try again.");
          setShowErrorAlert(true);
          setUploading(false);
          return;
        }

        // Update local state to reflect changes
        setEmployee((prev) => {
          if (!prev) return prev;
          // Reload from the updated structure
          return {
            ...prev,
            requirements: updated.id_numbers ? {
              sss: updated.id_numbers.sss ? {
                idNumber: updated.id_numbers.sss.value || '',
                hasFile: !!updated.id_numbers.sss.file_path,
                filePath: updated.id_numbers.sss.file_path,
                status: updated.id_numbers.sss.status === 'Validated' ? 'approved' : 
                        updated.id_numbers.sss.status === 'Re-submit' ? 'resubmit' :
                        updated.id_numbers.sss.status === 'Submitted' ? 'pending' : 'missing',
                submittedDate: updated.id_numbers.sss.submitted_at,
                remarks: updated.id_numbers.sss.remarks,
              } : prev.requirements.sss,
              tin: updated.id_numbers.tin ? {
                idNumber: updated.id_numbers.tin.value || '',
                hasFile: !!updated.id_numbers.tin.file_path,
                filePath: updated.id_numbers.tin.file_path,
                status: updated.id_numbers.tin.status === 'Validated' ? 'approved' : 
                        updated.id_numbers.tin.status === 'Re-submit' ? 'resubmit' :
                        updated.id_numbers.tin.status === 'Submitted' ? 'pending' : 'missing',
                submittedDate: updated.id_numbers.tin.submitted_at,
                remarks: updated.id_numbers.tin.remarks,
              } : prev.requirements.tin,
              pagibig: updated.id_numbers.pagibig ? {
                idNumber: updated.id_numbers.pagibig.value || '',
                hasFile: !!updated.id_numbers.pagibig.file_path,
                filePath: updated.id_numbers.pagibig.file_path,
                status: updated.id_numbers.pagibig.status === 'Validated' ? 'approved' : 
                        updated.id_numbers.pagibig.status === 'Re-submit' ? 'resubmit' :
                        updated.id_numbers.pagibig.status === 'Submitted' ? 'pending' : 'missing',
                submittedDate: updated.id_numbers.pagibig.submitted_at,
                remarks: updated.id_numbers.pagibig.remarks,
              } : prev.requirements.pagibig,
              philhealth: updated.id_numbers.philhealth ? {
                idNumber: updated.id_numbers.philhealth.value || '',
                hasFile: !!updated.id_numbers.philhealth.file_path,
                filePath: updated.id_numbers.philhealth.file_path,
                status: updated.id_numbers.philhealth.status === 'Validated' ? 'approved' : 
                        updated.id_numbers.philhealth.status === 'Re-submit' ? 'resubmit' :
                        updated.id_numbers.philhealth.status === 'Submitted' ? 'pending' : 'missing',
                submittedDate: updated.id_numbers.philhealth.submitted_at,
                remarks: updated.id_numbers.philhealth.remarks,
              } : prev.requirements.philhealth,
            } : prev.requirements,
            documents: updated.documents ? updated.documents.reduce((acc, doc) => {
              acc[doc.key] = {
                hasFile: !!doc.file_path,
                filePath: doc.file_path,
                status: doc.status === 'Validated' ? 'approved' : 
                        doc.status === 'Re-submit' ? 'resubmit' :
                        doc.status === 'Submitted' ? 'pending' : 'missing',
                submittedDate: doc.submitted_at,
                dateValidity: doc.date_validity,
                remarks: doc.remarks,
              };
              return acc;
            }, {}) : prev.documents,
            hrRequests: Array.isArray(updated.hr_requests)
              ? updated.hr_requests.map((req) => {
                  const filePath = req.file_path || req.filePath || null;
                  const rawStatus = String(req.status || '').trim().toLowerCase();

                  let status = 'pending';
                  if (rawStatus === 'validated' || rawStatus === 'approved') status = 'approved';
                  else if (rawStatus === 're-submit' || rawStatus === 'resubmit') status = 'resubmit';
                  else if (filePath) status = 'submitted';

                  return {
                    id: req.id || Date.now().toString(),
                    document: req.document_type || req.document || '',
                    description: req.description || req.remarks || '',
                    priority: req.priority || 'normal',
                    requested_at: req.requested_at || new Date().toISOString(),
                    requested_by: req.requested_by || 'HR',
                    status,
                    deadline: req.deadline || null,
                    remarks: req.remarks || req.description || null,
                    file_path: filePath,
                    submitted_at: req.submitted_at || null,
                  };
                })
              : prev.hrRequests,
          };
        });

        setUploading(false);
        closeUploadModal();
        
        // Reload employee requirements data without full page reload
        const { data: refreshedEmployee, error: refreshError } = await supabase
          .from('employees')
          .select('requirements, position, depot, hired_at')
          .eq('email', employeeData.email)
          .single();

        if (!refreshError && refreshedEmployee?.requirements) {
          // Parse refreshed requirements
          let requirementsData = refreshedEmployee.requirements;
          if (typeof requirementsData === 'string') {
            try {
              requirementsData = JSON.parse(requirementsData);
            } catch {
              requirementsData = {};
            }
          }

          // Update employee state with refreshed data using the same logic as useEffect
          setEmployee((prev) => {
            if (!prev) return prev;
            const updated = { ...prev };
            
            // Update position and depot if available
            if (refreshedEmployee.position) updated.position = refreshedEmployee.position;
            if (refreshedEmployee.depot) updated.depot = refreshedEmployee.depot;
            if (refreshedEmployee.hired_at) updated.deployedDate = refreshedEmployee.hired_at;
            
            // Trigger a re-fetch by updating the refresh trigger
            setRefreshTrigger(Date.now());
            return updated;
          });
        }
        
        setAlertMessage(
          uploadTarget.isRenewal 
            ? `${uploadTarget.name} renewal submitted successfully! Previous version has been archived. The renewed document is now pending HR review and approval.`
            : `${uploadTarget.name} ${uploadTarget.isResubmit ? "re-submitted" : "uploaded"} successfully! The document is now pending HR review.`
        );
        setShowSuccessAlert(true);
      } catch (err) {
        console.error('Upload error:', err);
        setAlertMessage(err.message || "Failed to upload file. Please try again.");
        setShowErrorAlert(true);
        setUploading(false);
      }
    })();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = [
      'from-red-500 to-red-600',
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

  const status = getEmployeeStatus();
  const statusStyle = getEmployeeStatusBadge(status);
  const progress = getRequirementsProgress();

    return (
    <>
      {/* Loading Overlay */}
      {uploading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-red-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="text-gray-700 font-medium">Uploading file...</p>
          </div>
        </div>
      )}
      
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
      
        <div className="w-full py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">My Requirements</h1>
          <p className="text-gray-500 mt-1">Track and submit your employment requirements</p>
            </div>

        {/* Statistics Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {(() => {
                const stats = getRequirementsStatistics();
                return (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
        </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-800">{stats.approved}</p>
                        <p className="text-xs text-gray-500">Approved</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                        <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-800">{stats.pending}</p>
                        <p className="text-xs text-gray-500">Pending</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-800">{stats.missing}</p>
                        <p className="text-xs text-gray-500">Missing</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-800">{stats.resubmit}</p>
                        <p className="text-xs text-gray-500">Resubmit</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center border-2 border-red-200">
                        <svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-800">{stats.expired}</p>
                        <p className="text-xs text-gray-500">Expired</p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">Overall Status</p>
              <span className={`text-sm font-semibold ${statusStyle.text}`}>
                {statusStyle.label}
              </span>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full max-w-[120px]">
                  <div 
                    className={`h-2 rounded-full ${progress.approved === progress.total ? 'bg-green-500' : 'bg-yellow-500'}`}
                    style={{ width: `${(progress.approved / progress.total) * 100}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-600">{progress.approved}/{progress.total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Government IDs Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-800">Government IDs</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {defaultRequirements.map((req) => {
                const data = employee.requirements[req.key];
                const style = getStatusStyle(data.status);
                const needsAction = data.status === 'missing' || data.status === 'resubmit';
                
                return (
                  <div 
                    key={req.key} 
                    className={`p-4 rounded-xl border-2 transition-all ${
                      data.status === 'resubmit' 
                        ? 'bg-red-50 border-red-200 shadow-sm' 
                        : data.status === 'missing' 
                          ? 'bg-orange-50/50 border-orange-200 border-dashed' 
                          : data.status === 'approved'
                            ? 'bg-green-50/50 border-green-200'
                            : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-800">{req.name}</p>
                        </div>
                        {data.idNumber ? (
                          <div className="flex items-center gap-1.5 mt-1">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                            </svg>
                            <p className="text-xs text-gray-600 font-mono">{data.idNumber}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic mt-1">No ID number</p>
                        )}
                        {data.hasFile && data.submittedDate && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-xs text-gray-500">Submitted {formatDate(data.submittedDate)}</p>
                          </div>
                        )}
                        {data.hasFile && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            {getFileUrl(data.filePath) ? (
                              <a
                                href={getFileUrl(data.filePath)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                              >
                                View File
                              </a>
                            ) : (
                              <span className="text-xs text-gray-500">File uploaded</span>
                            )}
                          </div>
                        )}
                        {data.remarks && (
                          <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 flex items-start gap-1.5">
                            <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>{data.remarks}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                        {needsAction && (
                          <button 
                            onClick={() => openUploadModal('default', req.key, req.name, data.status === 'resubmit', data.idNumber)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              data.status === 'resubmit'
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : data.hasFile && data.status !== 'approved'
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            {data.hasFile && data.status !== 'approved' ? 'Re-upload' : 'Upload'}
                          </button>
                        )}
                        {data.status === 'approved' && (
                          <div className="flex items-center gap-1 text-green-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* License Information Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-800">Driver's License Information</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {(() => {
              const licenseData = employee.license || {
                licenseNumber: "",
                licenseExpiry: "",
                file: null,
                filePath: null,
                frontFile: null,
                frontFilePath: null,
                backFile: null,
                backFilePath: null,
                status: "missing",
                submittedDate: null,
                remarks: null,
              };
              const style = getStatusStyle(licenseData.status);
              const needsAction = licenseData.status === "missing" || licenseData.status === "resubmit";
              const hasLicenseFile = !!(licenseData.filePath || (licenseData.frontFilePath && licenseData.backFilePath));
              const isExpiredDoc = licenseData.licenseExpiry && isExpired(licenseData.licenseExpiry);
              const canRenew = licenseData.status === "approved" && licenseData.licenseExpiry && isExpiredDoc;

              return (
                <div
                  className={`p-6 rounded-xl border-2 transition-all ${
                    licenseData.status === "resubmit"
                      ? "bg-red-50 border-red-200 shadow-sm"
                      : licenseData.status === "missing"
                        ? "bg-orange-50/50 border-orange-200 border-dashed"
                        : licenseData.status === "approved"
                          ? "bg-green-50/50 border-green-200"
                          : "bg-white border-gray-200"
                  }`}
                >
                  <div className="space-y-4">
                    {/* License Number and Expiry Date Display */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* License Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          License Number
                        </label>
                        {licenseData.licenseNumber ? (
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                            </svg>
                            <p className="text-sm text-gray-800 font-mono">{licenseData.licenseNumber}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 italic">No license number entered</p>
                        )}
                      </div>
                      {/* License Expiry Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          License Expiry Date
                        </label>
                        {licenseData.licenseExpiry ? (
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className={`text-sm ${isExpiredDoc ? 'text-red-600 font-semibold' : 'text-gray-800'}`}>
                              {formatDate(licenseData.licenseExpiry)}
                              {isExpiredDoc && <span className="ml-2 text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">Expired</span>}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 italic">No expiry date entered</p>
                        )}
                      </div>
                    </div>
                    {licenseData.versions && licenseData.versions.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs text-gray-500">
                          {licenseData.versions.length} previous version{licenseData.versions.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    )}

                    {/* License Photocopy Display (single field; supports legacy front/back) */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-gray-800">License Photocopy</p>
                        {hasLicenseFile && (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Uploaded</span>
                        )}
                      </div>

                      {licenseData.filePath && getFileUrl(licenseData.filePath) ? (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          <a href={getFileUrl(licenseData.filePath)} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            View File
                          </a>
                        </div>
                      ) : (licenseData.frontFilePath || licenseData.backFilePath) ? (
                        <div className="flex flex-col gap-2 text-sm text-blue-600">
                          {licenseData.frontFilePath && getFileUrl(licenseData.frontFilePath) && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              <a href={getFileUrl(licenseData.frontFilePath)} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                View Front
                              </a>
                            </div>
                          )}
                          {licenseData.backFilePath && getFileUrl(licenseData.backFilePath) && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              <a href={getFileUrl(licenseData.backFilePath)} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                View Back
                              </a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">Not uploaded</p>
                      )}
                    </div>

                    {/* Status and Remarks */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                        {licenseData.submittedDate && (
                          <span className="text-xs text-gray-500">
                            Submitted {formatDate(licenseData.submittedDate)}
                          </span>
                        )}
                      </div>
                      {needsAction && (
                        <button
                          onClick={() => openUploadModal("license", "drivers_license", "Driver's License", licenseData.status === "resubmit", licenseData.licenseNumber)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            licenseData.status === "resubmit"
                              ? "bg-red-600 text-white hover:bg-red-700"
                              : hasLicenseFile && licenseData.status !== "approved"
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          {hasLicenseFile && licenseData.status !== "approved" ? "Re-upload" : licenseData.status === "resubmit" ? "Re-upload" : "Upload"}
                        </button>
                      )}
                      {licenseData.status === "approved" && !canRenew && (
                        <div className="flex items-center gap-1 text-green-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      {licenseData.status === "approved" && (
                        <button
                          onClick={() => openUploadModal("license", "drivers_license", "Driver's License", false, licenseData.licenseNumber, true)}
                          disabled={!isExpiredDoc}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            isExpiredDoc
                              ? "bg-amber-600 text-white hover:bg-amber-700 cursor-pointer"
                              : "bg-gray-300 text-gray-500 cursor-not-allowed opacity-60"
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Renew
                        </button>
                      )}
                    </div>

                    {licenseData.remarks && (
                      <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 flex items-start gap-1.5">
                        <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>{licenseData.remarks}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Medical Examination Results Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Medical Examination Results</p>
                <p className="text-xs text-gray-500">Medical examination results are done annually; you will be required to submit again after a year.</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {medicalExams.map((exam) => {
                const data = employee.medicalExams?.[exam.key] || {
                  hasFile: false,
                  filePath: null,
                  status: "missing",
                  submittedDate: null,
                  validUntil: null,
                  remarks: null,
                };
                const style = getStatusStyle(data.status);
                const needsAction = data.status === "missing" || data.status === "resubmit";
                const computedExpiry = getMedicalExamsExpiryDate(employee?.deployedDate);
                const isExpiredDoc = Boolean(computedExpiry) && data.status === 'approved' && Date.now() > computedExpiry.getTime();
                const canRenew = data.status === 'approved' && Boolean(computedExpiry) && isExpiredOrExpiring(computedExpiry.toISOString());

                return (
                  <div
                    key={exam.key}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      data.status === "resubmit"
                        ? "bg-red-50 border-red-200 shadow-sm"
                        : data.status === "missing"
                          ? "bg-orange-50/50 border-orange-200 border-dashed"
                          : data.status === "approved"
                            ? "bg-green-50/50 border-green-200"
                            : "bg-white border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-800">{exam.name}</p>
                          {isExpiredDoc && (
                            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold">
                              Expired
                            </span>
                          )}
                        </div>
                        {data.versions && data.versions.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-xs text-gray-500">
                              {data.versions.length} previous version{data.versions.length > 1 ? 's' : ''}
                            </p>
                          </div>
                        )}
                        {data.submittedDate && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-xs text-gray-500">
                              Submitted {formatDate(data.submittedDate)}
                            </p>
                          </div>
                        )}
                        {data.hasFile && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            {getFileUrl(data.filePath) ? (
                              <a
                                href={getFileUrl(data.filePath)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                              >
                                View File
                              </a>
                            ) : (
                              <span className="text-xs text-gray-500">File uploaded</span>
                            )}
                          </div>
                        )}
                        {data.remarks && (
                          <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 flex items-start gap-1.5">
                            <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>{data.remarks}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                        {needsAction && (
                          <button
                            onClick={() =>
                              openUploadModal(
                                "medical",
                                exam.key,
                                exam.name,
                                data.status === "resubmit",
                                ''
                              )
                            }
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              data.status === "resubmit"
                                ? "bg-red-600 text-white hover:bg-red-700"
                                : data.hasFile && data.status !== "approved"
                                  ? "bg-blue-600 text-white hover:bg-blue-700"
                                  : "bg-blue-600 text-white hover:bg-blue-700"
                            }`}
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                              />
                            </svg>
                            {data.hasFile && data.status !== "approved" ? "Re-upload" : data.status === "resubmit" ? "Re-upload" : "Upload"}
                          </button>
                        )}
                        {data.status === "approved" && !canRenew && (
                          <div className="flex items-center gap-1 text-green-600">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}
                        {canRenew && (
                          <button
                            onClick={() =>
                              openUploadModal(
                                "medical",
                                exam.key,
                                exam.name,
                                false,
                                '',
                                true
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-amber-600 text-white hover:bg-amber-700"
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                              />
                            </svg>
                            Renew
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Personal Documents Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-800">Personal Documents</p>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {personalDocuments.map((doc) => {
                const data = employee.personalDocuments?.[doc.key] || {
                  hasFile: false,
                  filePath: null,
                  status: "missing",
                  submittedDate: null,
                  remarks: null,
                };
                const isIfApplicable = String(doc?.note || '').trim().toLowerCase() === 'if applicable';
                const effectiveStatus = isIfApplicable && !data.hasFile ? 'optional' : data.status;
                const style = getStatusStyle(effectiveStatus);
                const needsAction = effectiveStatus === "missing" || effectiveStatus === "resubmit";
                const showUploadButton = needsAction || effectiveStatus === 'optional';

                return (
                  <div
                    key={doc.key}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      effectiveStatus === "resubmit"
                        ? "bg-red-50 border-red-200 shadow-sm"
                        : effectiveStatus === "missing"
                          ? doc.required
                            ? "bg-orange-50/50 border-orange-200 border-dashed"
                            : "bg-gray-50/50 border-gray-200 border-dashed"
                          : effectiveStatus === "optional"
                            ? "bg-gray-50/50 border-gray-200 border-dashed"
                          : effectiveStatus === "approved"
                            ? "bg-green-50/50 border-green-200"
                            : "bg-white border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-800">{doc.name}</p>
                          {!doc.required && doc.note && (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">
                              {doc.note}
                            </span>
                          )}
                        </div>
                        {data.submittedDate && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-xs text-gray-500">
                              Submitted {formatDate(data.submittedDate)}
                            </p>
                          </div>
                        )}
                        {data.hasFile && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            {getFileUrl(data.filePath) ? (
                              <a
                                href={getFileUrl(data.filePath)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                              >
                                View File
                              </a>
                            ) : (
                              <span className="text-xs text-gray-500">File uploaded</span>
                            )}
                          </div>
                        )}
                        {data.remarks && (
                          <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 flex items-start gap-1.5">
                            <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>{data.remarks}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                        {showUploadButton && (
                          <button
                            onClick={() =>
                              openUploadModal(
                                "personal",
                                doc.key,
                                doc.name,
                                effectiveStatus === "resubmit"
                              )
                            }
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              effectiveStatus === "resubmit"
                                ? "bg-red-600 text-white hover:bg-red-700"
                                : data.hasFile && effectiveStatus !== "approved"
                                  ? "bg-blue-600 text-white hover:bg-blue-700"
                                  : "bg-blue-600 text-white hover:bg-blue-700"
                            }`}
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                              />
                            </svg>
                            {data.hasFile && effectiveStatus !== "approved"
                              ? "Re-upload"
                              : effectiveStatus === "resubmit"
                                ? "Re-upload"
                                : "Upload"}
                          </button>
                        )}
                        {effectiveStatus === "approved" && (
                          <div className="flex items-center gap-1 text-green-600">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Clearances Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-800">Clearances</p>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clearances.map((clearance) => {
                const data = employee.clearances?.[clearance.key] || {
                  hasFile: false,
                  filePath: null,
                  status: "missing",
                  submittedDate: null,
                  dateValidity: null,
                  remarks: null,
                };
                const style = getStatusStyle(data.status);
                const needsAction = data.status === "missing" || data.status === "resubmit";
                const canRenew = data.status === "approved" && data.dateValidity && isExpiredOrExpiring(data.dateValidity);
                const isExpiredDoc = data.dateValidity && isExpired(data.dateValidity);

                return (
                  <div
                    key={clearance.key}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      data.status === "resubmit"
                        ? "bg-red-50 border-red-200 shadow-sm"
                        : data.status === "missing"
                          ? "bg-orange-50/50 border-orange-200 border-dashed"
                          : data.status === "approved"
                            ? "bg-green-50/50 border-green-200"
                            : "bg-white border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-800">{clearance.name}</p>
                          {isExpiredDoc && (
                            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold">
                              Expired
                            </span>
                          )}
                        </div>
                        {data.dateValidity && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className={`text-xs ${isExpiredDoc ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                              Valid until: <span className="font-medium">{formatDate(data.dateValidity)}</span>
                            </p>
                          </div>
                        )}
                        {data.versions && data.versions.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-xs text-gray-500">
                              {data.versions.length} previous version{data.versions.length > 1 ? 's' : ''}
                            </p>
                          </div>
                        )}
                        {data.submittedDate && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-xs text-gray-500">
                              Submitted {formatDate(data.submittedDate)}
                            </p>
                          </div>
                        )}
                        {data.hasFile && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            {getFileUrl(data.filePath) ? (
                              <a
                                href={getFileUrl(data.filePath)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                              >
                                View File
                              </a>
                            ) : (
                              <span className="text-xs text-gray-500">File uploaded</span>
                            )}
                          </div>
                        )}
                        {data.remarks && (
                          <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 flex items-start gap-1.5">
                            <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>{data.remarks}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                        {needsAction && (
                          <button
                            onClick={() =>
                              openUploadModal(
                                "clearance",
                                clearance.key,
                                clearance.name,
                                data.status === "resubmit",
                                data.dateValidity
                              )
                            }
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              data.status === "resubmit"
                                ? "bg-red-600 text-white hover:bg-red-700"
                                : data.hasFile && data.status !== "approved"
                                  ? "bg-blue-600 text-white hover:bg-blue-700"
                                  : "bg-blue-600 text-white hover:bg-blue-700"
                            }`}
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                              />
                            </svg>
                            {data.hasFile && data.status !== "approved" ? "Re-upload" : data.status === "resubmit" ? "Re-upload" : "Upload"}
                          </button>
                        )}
                        {data.status === "approved" && !canRenew && (
                          <div className="flex items-center gap-1 text-green-600">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}
                        {canRenew && (
                          <button
                            onClick={() =>
                              openUploadModal(
                                "clearance",
                                clearance.key,
                                clearance.name,
                                false,
                                data.dateValidity,
                                true
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-amber-600 text-white hover:bg-amber-700"
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                              />
                            </svg>
                            Renew
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Educational Documents Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v9M5 13l7 7 7-7" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-800">Educational Documents</p>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {educationalDocuments.map((doc) => {
                const data = employee.educationalDocuments?.[doc.key] || {
                  hasFile: false,
                  filePath: null,
                  status: "missing",
                  submittedDate: null,
                  remarks: null,
                };
                const style = getStatusStyle(data.status);
                const needsAction = data.status === "missing" || data.status === "resubmit";

                return (
                  <div
                    key={doc.key}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      data.status === "resubmit"
                        ? "bg-red-50 border-red-200 shadow-sm"
                        : data.status === "missing"
                          ? "bg-orange-50/50 border-orange-200 border-dashed"
                          : data.status === "approved"
                            ? "bg-green-50/50 border-green-200"
                            : "bg-white border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-800">{doc.name}</p>
                        </div>
                        {data.submittedDate && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-xs text-gray-500">
                              Submitted {formatDate(data.submittedDate)}
                            </p>
                          </div>
                        )}
                        {data.hasFile && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            {getFileUrl(data.filePath) ? (
                              <a
                                href={getFileUrl(data.filePath)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                              >
                                View File
                              </a>
                            ) : (
                              <span className="text-xs text-gray-500">File uploaded</span>
                            )}
                          </div>
                        )}
                        {data.remarks && (
                          <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 flex items-start gap-1.5">
                            <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>{data.remarks}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                        {needsAction && (
                          <button
                            onClick={() =>
                              openUploadModal(
                                "educational",
                                doc.key,
                                doc.name,
                                data.status === "resubmit"
                              )
                            }
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              data.status === "resubmit"
                                ? "bg-red-600 text-white hover:bg-red-700"
                                : data.hasFile && data.status !== "approved"
                                  ? "bg-blue-600 text-white hover:bg-blue-700"
                                  : "bg-blue-600 text-white hover:bg-blue-700"
                            }`}
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                              />
                            </svg>
                            {data.hasFile && data.status !== "approved" ? "Re-upload" : data.status === "resubmit" ? "Re-upload" : "Upload"}
                          </button>
                        )}
                        {data.status === "approved" && (
                          <div className="flex items-center gap-1 text-green-600">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* HR Requested Documents (Section always visible) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-800">HR Additional Document Requests</p>
            </div>
          </div>
          <div className="p-6 space-y-3">
            {employee.hrRequests && employee.hrRequests.length > 0 ? (
              employee.hrRequests.map((req) => {
                const hasFile = Boolean(req.file_path);
                const effectiveStatus = req.status === 'pending' && hasFile ? 'submitted' : req.status;
                const style = getStatusStyle(effectiveStatus);
                const needsAction = effectiveStatus === 'pending' || effectiveStatus === 'resubmit';
                return (
                  <div
                    key={req.id}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      effectiveStatus === "resubmit"
                        ? "bg-red-50 border-red-200 shadow-sm"
                        : effectiveStatus === "pending"
                          ? "bg-orange-50/50 border-orange-200 border-dashed"
                          : effectiveStatus === "approved"
                            ? "bg-green-50/50 border-green-200"
                            : effectiveStatus === "submitted"
                              ? "bg-blue-50/50 border-blue-200"
                            : "bg-white border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-800">
                            {req.document}
                          </p>
                          {req.priority === "high" && (
                            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold">
                              Urgent
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <svg
                            className="w-3.5 h-3.5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <p className="text-xs text-gray-500">
                            Deadline:{" "}
                            <span className="font-medium">
                              {formatDate(req.deadline)}
                            </span>
                          </p>
                        </div>
                        {hasFile && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            {getFileUrl(req.file_path) ? (
                              <a
                                href={getFileUrl(req.file_path)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                              >
                                View File
                              </a>
                            ) : (
                              <span className="text-xs text-gray-500">File uploaded</span>
                            )}
                          </div>
                        )}
                        {req.remarks && (
                          <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 flex items-start gap-1.5">
                            <svg
                              className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            <span>{req.remarks}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`px-2.5 py-1 text-xs font-semibold rounded-full ${style.bg} ${style.text}`}
                        >
                          {style.label}
                        </span>
                        {needsAction && (
                          <button
                            onClick={() => openUploadModal('hr', req.id, req.document, effectiveStatus === 'resubmit')}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              effectiveStatus === 'resubmit'
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            {effectiveStatus === 'resubmit' ? 'Re-upload' : 'Upload'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500">
                No additional document requests from HR at the moment. Any future
                requests will appear here.
              </p>
            )}
          </div>
        </div>

        {/* Onboarding Items Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-800">Onboarding Items</p>
            </div>
          </div>
          <div className="p-6">
            {onboardingItems.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm text-gray-500">No onboarding items have been assigned yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {onboardingItems.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-sm font-semibold text-gray-800">{item.item || 'Untitled Item'}</h4>
                        </div>
                        {item.description && (
                          <p className="text-xs text-gray-600 mb-2">{item.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {item.date && (
                            <div className="flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>Issued: {formatDate(item.date)}</span>
                            </div>
                          )}
                          {item.fileUrl && (
                            <div className="flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              <a
                                href={item.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline font-medium"
                              >
                                View File
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Assessment and Agreement Records Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-800">Assessment and Agreement Records</p>
            </div>
          </div>
          <div className="p-6">
            {assessmentRecords.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm text-gray-500">No assessment or agreement records found.</p>
                <p className="text-xs text-gray-400 mt-1">Files from your application process will appear here.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Assessment Files Section */}
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

                {/* Agreement Documents Section */}
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

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-800">About Requirements</h4>
              <p className="text-sm text-blue-700 mt-1">
                <strong>Default requirements</strong> (SSS, TIN, PAG-IBIG, PhilHealth) must be submitted for all employees. 
                <strong> HR may request additional documents</strong> as needed. 
                Keep track of deadlines and ensure all requirements are submitted on time.
              </p>
              <button
                onClick={() => setShowPrivacyModal(true)}
                className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium underline flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                View Privacy Policy
              </button>
            </div>
          </div>
        </div>
      </div>

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
                  className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700" 
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
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-red-600">
                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="text-lg font-semibold text-gray-800 mb-2">{alertMessage}</div>
              <div className="mt-4">
                <button 
                  type="button" 
                  className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700" 
                  onClick={() => setShowErrorAlert(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowPrivacyModal(false);
            setUploadTarget(null); // Clear upload target if privacy not accepted
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-blue-500 to-blue-600">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-400/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Privacy Policy</h3>
                    <p className="text-sm text-white/80 mt-0.5">Data Collection and Protection</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowPrivacyModal(false);
                    setUploadTarget(null); // Clear upload target if privacy not accepted
                  }}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <h4 className="font-semibold text-blue-800 mb-2">Data Privacy Act of 2012 (Republic Act No. 10173)</h4>
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

              {/* Information We Collect */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-3">Information We Collect</h4>
                <div className="text-sm text-gray-600 space-y-2">
                  <p>When you submit documents through this system, we collect the following types of personal information:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Government ID Numbers:</strong> SSS, TIN, PAG-IBIG, PhilHealth identification numbers</li>
                    <li><strong>License Information:</strong> Driver's license number, classification, expiry date, and license photocopies</li>
                    <li><strong>Medical Records:</strong> Medical examination results (X-ray, Stool, Urine, HEPA, CBC, Drug Test)</li>
                    <li><strong>Personal Documents:</strong> PSA Birth Certificate, Marriage Contract, Dependents' Birth Certificates, Residence Sketch, and photographs</li>
                    <li><strong>Clearances:</strong> NBI Clearance, Police Clearance, Barangay Clearance with validity dates</li>
                    <li><strong>Educational Documents:</strong> Diploma and Transcript of Records</li>
                    <li><strong>Document Files:</strong> Scanned copies and photographs of all submitted documents</li>
                  </ul>
                </div>
              </div>

              {/* How We Use Your Information */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-3">How We Use Your Information</h4>
                <div className="text-sm text-gray-600 space-y-2">
                  <p>Your personal information is used for the following purposes:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Verification of employment eligibility and qualifications</li>
                    <li>Compliance with government regulations and legal requirements</li>
                    <li>Processing of government benefits and contributions (SSS, PhilHealth, Pag-IBIG)</li>
                    <li>Background checks and security clearances</li>
                    <li>Maintenance of employee records and documentation</li>
                    <li>Communication regarding document status and requirements</li>
                  </ul>
                </div>
              </div>

              {/* Data Security */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-3">Data Security</h4>
                <div className="text-sm text-gray-600 space-y-2">
                  <p>We implement appropriate technical and organizational measures to protect your personal information:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Secure storage systems with encryption for sensitive data</li>
                    <li>Access controls limiting data access to authorized HR personnel only</li>
                    <li>Regular security audits and updates to our systems</li>
                    <li>Secure file transfer protocols for document uploads</li>
                    <li>Backup and disaster recovery procedures</li>
                  </ul>
                </div>
              </div>

              {/* Your Rights */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-3">Your Rights</h4>
                <div className="text-sm text-gray-600 space-y-2">
                  <p>Under the Data Privacy Act, you have the right to:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Access:</strong> Request a copy of your personal data held by the company</li>
                    <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                    <li><strong>Objection:</strong> Object to the processing of your personal data for certain purposes</li>
                    <li><strong>Erasure:</strong> Request deletion of your personal data, subject to legal retention requirements</li>
                    <li><strong>Data Portability:</strong> Request transfer of your data to another service provider</li>
                    <li><strong>Complaint:</strong> File a complaint with the National Privacy Commission</li>
                  </ul>
                </div>
              </div>

              {/* Data Retention */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-3">Data Retention</h4>
                <div className="text-sm text-gray-600 space-y-2">
                  <p>We retain your personal information for as long as necessary to:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Fulfill the purposes for which it was collected</li>
                    <li>Comply with legal and regulatory requirements</li>
                    <li>Resolve disputes and enforce agreements</li>
                    <li>Maintain employment records as required by law</li>
                  </ul>
                  <p className="mt-2">After the retention period, your data will be securely deleted or anonymized.</p>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
                <h4 className="font-semibold text-amber-800 mb-2">Contact Information</h4>
                <p className="text-sm text-amber-700">
                  For questions, concerns, or requests regarding your personal data, please contact our Data Protection Officer at:
                </p>
                <p className="text-sm text-amber-700 mt-2">
                  <strong>Email:</strong> privacy@company.com<br />
                  <strong>Phone:</strong> (02) 1234-5678<br />
                  <strong>Address:</strong> [Company Address]
                </p>
              </div>

              {/* Acceptance Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={privacyAccepted}
                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    I have read and understood the <strong>Privacy Policy</strong>. I consent to the collection, processing, 
                    and storage of my personal information as described above. I understand that I can withdraw my consent 
                    at any time by contacting the Data Protection Officer.
                  </span>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <button 
                onClick={() => {
                  setShowPrivacyModal(false);
                  setUploadTarget(null); // Clear upload target if privacy not accepted
                }}
                className="px-5 py-2.5 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (privacyAccepted) {
                    localStorage.setItem('privacyPolicyAccepted', 'true');
                    setShowPrivacyModal(false);
                    // If there's a pending upload target, open the upload modal
                    if (uploadTarget) {
                      setShowUploadModal(true);
                    }
                  }
                }}
                disabled={!privacyAccepted}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
                  privacyAccepted
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Accept & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Error Modal */}
      {showFileErrorModal && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
          onClick={() => setShowFileErrorModal(false)}
        >
          <div
            className="bg-white rounded-lg w-full max-w-md overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Invalid File</h3>
              <p className="text-gray-600 mb-6">{fileErrorMessage}</p>
              <button
                onClick={() => setShowFileErrorModal(false)}
                className="w-full py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadModal && uploadTarget && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={closeUploadModal}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`p-5 ${uploadTarget.isRenewal ? 'bg-gradient-to-r from-amber-500 to-amber-600' : uploadTarget.isResubmit ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${uploadTarget.isRenewal ? 'bg-amber-400/30' : uploadTarget.isResubmit ? 'bg-red-400/30' : 'bg-blue-400/30'}`}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {uploadTarget.isRenewal ? 'Renew Document' : uploadTarget.isResubmit ? 'Re-upload Document' : 'Upload Document'}
                    </h3>
                    <p className="text-sm text-white/80 mt-0.5">{uploadTarget.name}</p>
                  </div>
                </div>
                <button 
                  onClick={closeUploadModal}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5">
              {/* ID Number Input (for default requirements) */}
              {uploadTarget.type === 'default' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ID Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={uploadForm.idNumber}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, idNumber: e.target.value }))}
                      placeholder={`Enter ${uploadTarget.name} ID Number`}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">Enter the ID number exactly as it appears on the document</p>
                </div>
              )}

              {/* License Number and Expiry Date Input (for license) */}
              {uploadTarget.type === 'license' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      License Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={uploadForm.licenseNumber}
                        onChange={(e) => setUploadForm(prev => ({ ...prev, licenseNumber: e.target.value }))}
                        placeholder="Enter License Number"
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      License Expiry Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <input
                        type="date"
                        value={uploadForm.licenseExpiry}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (!validateNoSunday(e.target, v)) return;
                          setUploadForm(prev => ({ ...prev, licenseExpiry: v }));
                        }}
                        min={getTodayDate()}
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">License expiry date must be today or later</p>
                  </div>
                </div>
              )}

              {/* Date Validity Input (for clearances) */}
              {uploadTarget.type === 'clearance' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Valid Until Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      type="date"
                      value={uploadForm.validUntil}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!validateNoSunday(e.target, v)) return;
                        setUploadForm(prev => ({ ...prev, validUntil: v }));
                      }}
                      min={getTodayDate()}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">Enter the date when this clearance expires (must be today or later)</p>
                </div>
              )}

              {/* File Upload Area */}
              {uploadTarget.type === 'license' ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    License Photocopy <span className="text-gray-500 font-normal">(Photocopy)</span> <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileSelect(e.target.files[0])}
                  />
                  {!uploadForm.file ? (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                        isDragging 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-2 ${isDragging ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        <svg className={`w-6 h-6 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-700">
                        {isDragging ? 'Drop file here' : 'Drag & drop file'}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">or <span className="text-blue-600 font-medium">browse</span> to choose</p>
                      <p className="text-xs text-gray-400 mt-2">Supports: PDF, JPG, PNG (Max 10MB)</p>
                    </div>
                  ) : (
                    <div className="border-2 border-green-200 bg-green-50 rounded-xl p-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{uploadForm.file.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{formatFileSize(uploadForm.file.size)}</p>
                        </div>
                        <button
                          onClick={() => setUploadForm(prev => ({ ...prev, file: null }))}
                          className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Document File <span className="text-gray-500 font-normal">(Photocopy)</span> <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => handleFileSelect(e.target.files[0])}
                  />
                  {!uploadForm.file ? (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                        isDragging 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-14 h-14 mx-auto rounded-xl flex items-center justify-center mb-3 ${isDragging ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        <svg className={`w-7 h-7 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-700">
                        {isDragging ? 'Drop your file here' : 'Drag & drop your file here'}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">or <span className="text-blue-600 font-medium">browse</span> to choose a file</p>
                      <p className="text-xs text-gray-400 mt-3">Supports: PDF, JPG, PNG, DOC, DOCX (Max 10MB)</p>
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
                          <p className="text-sm font-semibold text-gray-800 truncate">{uploadForm.file.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{formatFileSize(uploadForm.file.size)}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Ready to upload</span>
                          </div>
                        </div>
                        <button
                          onClick={() => setUploadForm(prev => ({ ...prev, file: null }))}
                          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Renewal Notice */}
              {uploadTarget.isRenewal && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-amber-800">Renewing Document</p>
                      <p className="text-xs text-amber-700 mt-0.5">The current version will be archived and kept in your document history. This renewed document will be submitted for <strong>HR review and approval</strong> before it becomes active.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Re-submit Warning */}
              {uploadTarget.isResubmit && !uploadTarget.isRenewal && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-amber-800">This is a re-submission</p>
                      <p className="text-xs text-amber-700 mt-0.5">Please ensure the new document addresses the previous issues noted by HR.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-end gap-3">
              <button
                onClick={closeUploadModal}
                className="px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadSubmit}
                disabled={uploading || 
                  (uploadTarget.type === 'default' && (!uploadForm.idNumber.trim() || !uploadForm.file)) ||
                  (uploadTarget.type === 'license' && (!uploadForm.licenseNumber.trim() || !uploadForm.licenseExpiry.trim() || !uploadForm.file)) ||
                  (uploadTarget.type === 'medical' && !uploadForm.file) ||
                  (uploadTarget.type === 'clearance' && (!uploadForm.validUntil.trim() || !uploadForm.file)) ||
                  (uploadTarget.type === 'personal' && !uploadForm.file) ||
                  (uploadTarget.type === 'educational' && !uploadForm.file) ||
                  (uploadTarget.type === 'hr' && !uploadForm.file) ||
                  (uploadTarget.type === 'document' && !uploadForm.file)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
                  uploading || 
                  (uploadTarget.type === 'default' && (!uploadForm.idNumber.trim() || !uploadForm.file)) ||
                  (uploadTarget.type === 'license' && (!uploadForm.licenseNumber.trim() || !uploadForm.licenseExpiry.trim() || !uploadForm.file)) ||
                  (uploadTarget.type === 'medical' && !uploadForm.file) ||
                  (uploadTarget.type === 'clearance' && (!uploadForm.validUntil.trim() || !uploadForm.file)) ||
                  (uploadTarget.type === 'personal' && !uploadForm.file) ||
                  (uploadTarget.type === 'educational' && !uploadForm.file) ||
                  (uploadTarget.type === 'hr' && !uploadForm.file) ||
                  (uploadTarget.type === 'document' && !uploadForm.file)
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : uploadTarget.isRenewal
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : uploadTarget.isResubmit
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {uploadTarget.isRenewal ? 'Renew Document' : uploadTarget.isResubmit ? 'Re-submit Document' : 'Upload Document'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default EmployeeRequirements;
