// src/HrRequirements.jsx
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { PieChart, Pie, Cell } from "recharts";
import { getStoredJson } from "./authStorage";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";

function HrRequirements() {
  // Tab, filter, and search state
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('name-asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState(null);
  const itemsPerPage = 8;

  // Get current user info from localStorage
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    const userData = getStoredJson("loggedInHR");
    if (userData) setCurrentUser(userData);
  }, []);

  // Filters
  const [positionFilter, setPositionFilter] = useState('All');
  const [depotFilter, setDepotFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [employmentStatusFilter, setEmploymentStatusFilter] = useState('All');
  const [recruitmentTypeFilter, setRecruitmentTypeFilter] = useState('All');

  // Export menu state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);

  // master department list (shared with Employees.jsx)
  const departments = [
    "Operations Department",
    "Billing Department",
    "HR Department",
    "Security & Safety Department",
    "Collections Department",
    "Repairs and Maintenance Specialist",
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

  // Real data - Employees with their requirements
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Validation modal state
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationTarget, setValidationTarget] = useState(null); // { employeeId, type: 'id'|'doc', key, name }
  const [validationForm, setValidationForm] = useState({ status: 'Validated', remarks: '' });
  const [validating, setValidating] = useState(false);

  // Request Document modal state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestTarget, setRequestTarget] = useState(null); // { employeeId, employeeName, isAgency }
  const [requestForm, setRequestForm] = useState({ documentType: '', deadline: '' });
  const [requesting, setRequesting] = useState(false);

  // View Document modal state
  const [showViewDocumentModal, setShowViewDocumentModal] = useState(false);
  const [viewDocumentTarget, setViewDocumentTarget] = useState(null); // { filePath, documentName }

  // Alert modals
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Agency requirements (default for agency employees)
  const agencyRequirements = [
    { key: 'sss', name: 'SSS (Social Security System)', type: 'id_with_copy' },
    { key: 'tin', name: 'TIN (Tax Identification Number)', type: 'id_with_copy' },
    { key: 'pagibig', name: 'PAG-IBIG (HDMF)', type: 'id_with_copy' },
    { key: 'philhealth', name: 'PhilHealth', type: 'id_with_copy' },
  ];

  // Medical examination tests (matching EmployeeRequirements.jsx)
  const medicalExams = [
    { name: "X-ray", key: "xray" },
    { name: "Stool", key: "stool" },
    { name: "Urine", key: "urine" },
    { name: "HEPA", key: "hepa" },
    { name: "CBC", key: "cbc" },
    { name: "Drug Test", key: "drug_test" },
  ];

  // Personal documents (matching EmployeeRequirements.jsx)
  const personalDocuments = [
    { name: "2x2 Picture w/ White Background", key: "photo_2x2", required: true },
    { name: "PSA Birth Certificate Photocopy", key: "psa_birth_certificate", required: true },
    { name: "Marriage Contract Photocopy", key: "marriage_contract", required: false, note: "If applicable" },
    { name: "PSA Birth Certificate of Dependents", key: "dependents_birth_certificate", required: false, note: "If applicable" },
    { name: "Direction of Residence (House to Depot Sketch)", key: "residence_sketch", required: true },
  ];

  // Clearances (matching EmployeeRequirements.jsx)
  const clearances = [
    { name: "NBI Clearance", key: "nbi_clearance", hasDate: true },
    { name: "Police Clearance", key: "police_clearance", hasDate: true },
    { name: "Barangay Clearance", key: "barangay_clearance", hasDate: true },
  ];

  // Educational documents (matching EmployeeRequirements.jsx)
  const educationalDocuments = [
    { name: "Diploma", key: "diploma" },
    { name: "Transcript of Records", key: "transcript_of_records" },
  ];

  // Depot Compliance Monitoring state
  const [showAllDepots, setShowAllDepots] = useState(false);
  
  // Modern palette: green for compliant, neutral for the remainder
  const COLORS = ["#22c55e", "#e5e7eb"];

  // Load all employees and their requirements
  useEffect(() => {
    const loadEmployees = async () => {
      setLoading(true);
      setError(null);
      try {
        // Get all deployed employees (have hired_at)
        const { data: employeesData, error: empError } = await supabase
          .from('employees')
          // Use '*' so we don't hard-fail when optional profile-like columns differ by schema
          .select('*')
          .not('hired_at', 'is', null) // Only deployed employees
          .order('hired_at', { ascending: false });

        if (empError) throw empError;

        if (employeesData && employeesData.length > 0) {
          // Pull marital status + educational attainment from the recruitment/applicants record.
          // In this project, `applications.user_id` matches `applicants.id` and also becomes `employees.id` on hire.
          // (See HrRecruitment.jsx: applications -> applicants, then employees.id = applicationData.user_id)
          const applicantsById = {};
          const applicantsByEmail = {};

          try {
            const employeeIds = [...new Set(employeesData.map((e) => e?.id).filter(Boolean))];
            if (employeeIds.length > 0) {
              let applicantsData = null;
              let applicantsErr = null;

              ({ data: applicantsData, error: applicantsErr } = await supabase
                .from('applicants')
                .select('id, email, marital_status, educational_attainment')
                .in('id', employeeIds));

              // If schema differs, fall back gracefully.
              const missingColumns =
                applicantsErr &&
                (applicantsErr.code === 'PGRST204' ||
                  String(applicantsErr.message || '').toLowerCase().includes('marital_status') ||
                  String(applicantsErr.message || '').toLowerCase().includes('educational_attainment'));

              if (missingColumns) {
                ({ data: applicantsData, error: applicantsErr } = await supabase
                  .from('applicants')
                  .select('id, email')
                  .in('id', employeeIds));
              }

              if (!applicantsErr && Array.isArray(applicantsData)) {
                applicantsData.forEach((a) => {
                  if (a?.id) applicantsById[a.id] = a;
                  const em = String(a?.email || '').trim().toLowerCase();
                  if (em) applicantsByEmail[em] = a;
                });
              }
            }
          } catch (e) {
            // Don't block the page if applicants lookup fails.
            console.warn('[HrRequirements] Failed to load applicants enrichment:', e);
          }

          // Map employees to the expected structure
          const mappedEmployees = employeesData.map(emp => {
            const enrichmentEmail = String(emp?.personal_email || emp?.email || '').trim().toLowerCase();
            const enrichedApplicant = applicantsById[emp?.id] || (enrichmentEmail ? applicantsByEmail[enrichmentEmail] : null);

            // Parse requirements directly from employee record
            let requirementsData = null;
            
            if (emp.requirements) {
              if (typeof emp.requirements === 'string') {
                try {
                  requirementsData = JSON.parse(emp.requirements);
                } catch {
                  requirementsData = null;
                }
              } else {
                requirementsData = emp.requirements;
              }
            }

            // Map requirements to expected structure
            // If employee has "Agency" tag (is_agency = true), they are agency employee
            // Otherwise, they are a direct employee
            const isAgency = emp.is_agency === true;
            
            const requirements = isAgency ? {
              sss: { idNumber: '', hasFile: false, filePath: null, status: 'missing', submittedDate: null, remarks: null },
              tin: { idNumber: '', hasFile: false, filePath: null, status: 'missing', submittedDate: null, remarks: null },
              pagibig: { idNumber: '', hasFile: false, filePath: null, status: 'missing', submittedDate: null, remarks: null },
              philhealth: { idNumber: '', hasFile: false, filePath: null, status: 'missing', submittedDate: null, remarks: null },
            } : {
              // Direct applicant: initialize with ID numbers and all document sections
              id_numbers: {
                sss: { value: '', status: 'missing' },
                tin: { value: '', status: 'missing' },
                pagibig: { value: '', status: 'missing' },
                philhealth: { value: '', status: 'missing' },
              },
              license: {},
              medicalExams: {},
              personalDocuments: {},
              clearances: {},
              educationalDocuments: {},
              hr_requests: [],
              documents: [], // Legacy documents array
            };

            if (isAgency) {
              // Agency employees: map ID numbers and their document files
              if (requirementsData?.id_numbers) {
                const idNums = requirementsData.id_numbers;
                
                // Map SSS
                if (idNums.sss) {
                  requirements.sss = {
                    idNumber: idNums.sss.value || '',
                    hasFile: !!(idNums.sss.file_path || idNums.sss.filePath),
                    filePath: idNums.sss.file_path || idNums.sss.filePath || null,
                    status: idNums.sss.status === 'Validated' ? 'approved' : 
                            idNums.sss.status === 'Re-submit' ? 'resubmit' :
                            idNums.sss.status === 'Submitted' ? 'pending' : 'missing',
                    submittedDate: idNums.sss.validated_at || idNums.sss.submitted_at || null,
                    remarks: idNums.sss.remarks || null,
                  };
                }

                // Map TIN
                if (idNums.tin) {
                  requirements.tin = {
                    idNumber: idNums.tin.value || '',
                    hasFile: !!(idNums.tin.file_path || idNums.tin.filePath),
                    filePath: idNums.tin.file_path || idNums.tin.filePath || null,
                    status: idNums.tin.status === 'Validated' ? 'approved' : 
                            idNums.tin.status === 'Re-submit' ? 'resubmit' :
                            idNums.tin.status === 'Submitted' ? 'pending' : 'missing',
                    submittedDate: idNums.tin.validated_at || idNums.tin.submitted_at || null,
                    remarks: idNums.tin.remarks || null,
                  };
                }

                // Map PAG-IBIG
                if (idNums.pagibig) {
                  requirements.pagibig = {
                    idNumber: idNums.pagibig.value || '',
                    hasFile: !!(idNums.pagibig.file_path || idNums.pagibig.filePath),
                    filePath: idNums.pagibig.file_path || idNums.pagibig.filePath || null,
                    status: idNums.pagibig.status === 'Validated' ? 'approved' : 
                            idNums.pagibig.status === 'Re-submit' ? 'resubmit' :
                            idNums.pagibig.status === 'Submitted' ? 'pending' : 'missing',
                    submittedDate: idNums.pagibig.validated_at || idNums.pagibig.submitted_at || null,
                    remarks: idNums.pagibig.remarks || null,
                  };
                }

                // Map PhilHealth
                if (idNums.philhealth) {
                  requirements.philhealth = {
                    idNumber: idNums.philhealth.value || '',
                    hasFile: !!(idNums.philhealth.file_path || idNums.philhealth.filePath),
                    filePath: idNums.philhealth.file_path || idNums.philhealth.filePath || null,
                    status: idNums.philhealth.status === 'Validated' ? 'approved' : 
                            idNums.philhealth.status === 'Re-submit' ? 'resubmit' :
                            idNums.philhealth.status === 'Submitted' ? 'pending' : 'missing',
                    submittedDate: idNums.philhealth.validated_at || idNums.philhealth.submitted_at || null,
                    remarks: idNums.philhealth.remarks || null,
                  };
                }
              }

              // Check for document files for agency employees
              if (requirementsData?.documents && Array.isArray(requirementsData.documents)) {
                requirementsData.documents.forEach(doc => {
                  const docKey = (doc.key || doc.type || doc.name || '').toLowerCase();
                  
                  if (docKey === 'sss') {
                    requirements.sss.hasFile = !!doc.file_path;
                    requirements.sss.filePath = doc.file_path || null;
                    if (!requirements.sss.submittedDate && (doc.uploaded_at || doc.submitted_at)) {
                      requirements.sss.submittedDate = doc.uploaded_at || doc.submitted_at;
                    }
                  } else if (docKey === 'tin') {
                    requirements.tin.hasFile = !!doc.file_path;
                    requirements.tin.filePath = doc.file_path || null;
                    if (!requirements.tin.submittedDate && (doc.uploaded_at || doc.submitted_at)) {
                      requirements.tin.submittedDate = doc.uploaded_at || doc.submitted_at;
                    }
                  } else if (docKey === 'pagibig' || docKey === 'pag-ibig') {
                    requirements.pagibig.hasFile = !!doc.file_path;
                    requirements.pagibig.filePath = doc.file_path || null;
                    if (!requirements.pagibig.submittedDate && (doc.uploaded_at || doc.submitted_at)) {
                      requirements.pagibig.submittedDate = doc.uploaded_at || doc.submitted_at;
                    }
                  } else if (docKey === 'philhealth') {
                    requirements.philhealth.hasFile = !!doc.file_path;
                    requirements.philhealth.filePath = doc.file_path || null;
                    if (!requirements.philhealth.submittedDate && (doc.uploaded_at || doc.submitted_at)) {
                      requirements.philhealth.submittedDate = doc.uploaded_at || doc.submitted_at;
                    }
                  }
                });
              }
            } else {
              // Direct applicants: map ID numbers and all document sections
              if (requirementsData?.id_numbers) {
                requirements.id_numbers = requirementsData.id_numbers;
              }
              
              // Map license information
              if (requirementsData?.license) {
                requirements.license = requirementsData.license;
              }
              
              // Map medical exams
              if (requirementsData?.medicalExams) {
                requirements.medicalExams = requirementsData.medicalExams;
              }
              
              // Map personal documents
              if (requirementsData?.personalDocuments) {
                requirements.personalDocuments = requirementsData.personalDocuments;
              }
              
              // Map clearances
              if (requirementsData?.clearances) {
                requirements.clearances = requirementsData.clearances;
              }
              
              // Map educational documents
              if (requirementsData?.educationalDocuments) {
                requirements.educationalDocuments = requirementsData.educationalDocuments;
              }
              
              // Legacy documents array (for backward compatibility)
              if (requirementsData?.documents && Array.isArray(requirementsData.documents)) {
                requirements.documents = requirementsData.documents;
              }
            }

            // Map HR requests from requirements
            let hrRequests = [];
            if (requirementsData?.hr_requests && Array.isArray(requirementsData.hr_requests)) {
              hrRequests = requirementsData.hr_requests.map(req => ({
                // Normalize file path early (avoid showing placeholder/local paths)
                id: req.id || Date.now().toString(),
                document: req.document_type || req.document || '',
                description: req.description || req.remarks || '',
                priority: req.priority || 'normal',
                requested_at: req.requested_at || new Date().toISOString(),
                requested_by: req.requested_by || 'HR',
                status: req.status || 'pending',
                deadline: req.deadline || null,
                remarks: req.remarks || req.description || null,
                // Support both snake_case and camelCase to avoid UI mismatches
                file_path: (() => {
                  const raw = req.file_path || req.filePath || null;
                  if (!raw) return null;
                  const p = String(raw);
                  return p.includes('local-file-path') || p.startsWith('local-') || !p.includes('/') ? null : p;
                })(),
                filePath: (() => {
                  const raw = req.filePath || req.file_path || null;
                  if (!raw) return null;
                  const p = String(raw);
                  return p.includes('local-file-path') || p.startsWith('local-') || !p.includes('/') ? null : p;
                })(),
                submitted_at: req.submitted_at || null,
                validated_at: req.validated_at || null,
                validated_file_path: req.validated_file_path || null,
              }));
            }

            // Build employee name
            const name = `${emp.fname || ''} ${emp.mname || ''} ${emp.lname || ''}`.trim() || emp.email || 'Unknown';

            const employmentStatus =
              emp.status === 'Probationary'
                ? 'Under Probation'
                : emp.status === 'Regular'
                  ? 'Regular'
                  : (emp.status || 'Regular');

            return {
              id: emp.id || emp.email,
              name: name,
              position: emp.position || '—',
              depot: emp.depot || '—',
              deployedDate: emp.hired_at || emp.date_hired || null,
              requirements: requirements,
              hrRequests: hrRequests,
              employeeId: emp.id,
              email: emp.email,
              isAgency: emp.is_agency === true,
              employmentStatus,
              marital_status: emp.marital_status ?? enrichedApplicant?.marital_status ?? null,
              educational_attainment: emp.educational_attainment ?? enrichedApplicant?.educational_attainment ?? null,
            };
          });

          setEmployees(mappedEmployees);
        } else {
          setEmployees([]);
        }
      } catch (err) {
        console.error('Error loading employees:', err);
        setError(err.message || 'Failed to load employees');
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, [reloadTrigger]);

  useEffect(() => {
    const handler = (e) => {
      if (!showExportMenu) return;
      const el = exportMenuRef.current;
      if (el && !el.contains(e.target)) setShowExportMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showExportMenu]);

  // Calculate requirement status for an employee
  const getEmployeeStatus = (employee) => {
    const entries = getRequirementEntries(employee);
    const included = entries.filter((e) => e.includeInStatus);
    const required = included.filter((e) => e.requiredForCompletion);

    const hasResubmit = included.some((e) => e.status === 'resubmit');
    const hasMissingOrExpired = required.some((e) => e.status === 'missing' || e.status === 'expired');
    // Pending only if there's something actually submitted and waiting for validation.
    const hasPending = included.some((e) => e.status === 'pending' && e.submitted);
    const allRequiredApproved = required.length > 0 && required.every((e) => e.status === 'approved');

    if (allRequiredApproved) return 'complete';
    // If there's anything awaiting validation, show Pending (even if other items are missing).
    if (hasPending) return 'pending';
    if (hasMissingOrExpired || hasResubmit) return 'incomplete';
    return 'incomplete';
  };

  // Helper function to check if employee has ANY pending items (regardless of overall status)
  const hasPendingItems = (employee) => {
    const entries = getRequirementEntries(employee);
    const included = entries.filter((e) => e.includeInStatus);
    // Only consider pending when a file is present (i.e., truly waiting for validation).
    return included.some((e) => e.status === 'pending' && e.submitted);
  };

  const normalizeStatus = (value) => {
    if (value == null) return 'missing';
    const s = String(value).trim().toLowerCase();
    if (!s || s === 'no file') return 'missing';
    if (s === 'validated' || s === 'approved') return 'approved';
    if (s === 'submitted' || s === 'pending') return 'pending';
    if (s === 're-submit' || s === 'resubmit') return 'resubmit';
    if (s === 'expired') return 'expired';
    if (s === 'missing') return 'missing';
    return s;
  };

  function parseToLocalDateOnly(dateStr) {
    if (!dateStr) return null;
    const raw = String(dateStr).trim();
    if (!raw) return null;

    // Handle common date-only format (YYYY-MM-DD) as local time to avoid UTC shifting.
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      const dt = new Date(y, mo - 1, d);
      if (!Number.isFinite(dt.getTime())) return null;
      return dt;
    }

    const dt = new Date(raw);
    if (!Number.isFinite(dt.getTime())) return null;
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  }

  function isExpiredDate(validUntil) {
    const d = parseToLocalDateOnly(validUntil);
    if (!d) return false;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return d.getTime() < today.getTime();
  }

  function normalizeStoragePath(value) {
    if (!value) return null;
    let s = String(value).trim();
    if (!s) return null;

    // Drop query/hash (common for public URLs).
    s = s.split('#')[0].split('?')[0];

    // If a full public URL was stored, reduce it back to the storage key.
    // Example: .../storage/v1/object/public/application-files/<key>
    const marker = '/storage/v1/object/public/application-files/';
    const idx = s.indexOf(marker);
    if (idx >= 0) s = s.slice(idx + marker.length);

    // If the bucket name is embedded, strip it.
    s = s.replace(/^application-files\//, '');
    const bucketSeg = '/application-files/';
    const idx2 = s.indexOf(bucketSeg);
    if (idx2 >= 0) s = s.slice(idx2 + bucketSeg.length);

    try {
      s = decodeURIComponent(s);
    } catch {
      // ignore
    }

    return s.trim() || null;
  }

  function isSameStoragePath(a, b) {
    const na = normalizeStoragePath(a);
    const nb = normalizeStoragePath(b);
    if (!na || !nb) return false;
    return na === nb;
  }

  function isAfterDateTime(a, b) {
    if (!a || !b) return false;

    // Treat date-only strings as local midnight (avoid UTC shifts like new Date('YYYY-MM-DD')).
    const parseDateTime = (value) => {
      const raw = String(value).trim();
      const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) {
        const y = Number(m[1]);
        const mo = Number(m[2]);
        const d = Number(m[3]);
        return new Date(y, mo - 1, d);
      }
      return new Date(raw);
    };

    const da = parseDateTime(a);
    const db = parseDateTime(b);
    if (!Number.isFinite(da.getTime()) || !Number.isFinite(db.getTime())) return false;
    return da.getTime() > db.getTime();
  }

  function canonicalizeDocType(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  function isDuplicateDocType(candidate, requiredCanonicalList) {
    const c = canonicalizeDocType(candidate);
    if (!c) return false;
    if (requiredCanonicalList.includes(c)) return true;
    if (c.length < 3) return false;
    return requiredCanonicalList.some((r) => r.includes(c) || c.includes(r));
  }

  function getDaysUntil(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (!Number.isFinite(d.getTime())) return null;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfDeadline = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffMs = startOfDeadline.getTime() - startOfToday.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  function getRequiredDocTypeLabelsForEmployee(employee) {
    if (!employee) return [];

    const labels = [];

    if (employee.isAgency) {
      for (const r of agencyRequirements) labels.push(r.name);
    } else {
      // Always-required government IDs
      labels.push('SSS', 'TIN', 'PAG-IBIG', 'PhilHealth');

      // Conditional: driver/delivery license
      if (isDeliveryCrew(employee)) labels.push("Driver's License");

      // Medical exams
      for (const exam of medicalExams) labels.push(exam.name);

      // Personal docs: only those required for this employee
      for (const docDef of personalDocuments) {
        const rule = getPersonalDocRule(docDef, employee);
        if (!rule.applicable) continue;
        if (rule.required) labels.push(docDef.name);
      }

      // Clearances
      for (const c of clearances) labels.push(c.name);

      // Educational docs only if educational attainment exists
      if (hasEducationalAttainment(employee)) {
        for (const e of educationalDocuments) labels.push(e.name);
      }
    }

    // Already-requested HR docs are also "currently required"
    if (employee.hrRequests && employee.hrRequests.length > 0) {
      for (const r of employee.hrRequests) {
        const name = r?.document || r?.document_type;
        if (name) labels.push(name);
      }
    }

    // De-dupe
    return Array.from(new Set(labels.map((x) => String(x || '').trim()).filter(Boolean)));
  }

  function getDocTypeCatalog() {
    const all = [];
    for (const r of agencyRequirements) all.push(r.name);
    all.push('SSS', 'TIN', 'PAG-IBIG', 'PhilHealth', "Driver's License");
    for (const exam of medicalExams) all.push(exam.name);
    for (const docDef of personalDocuments) all.push(docDef.name);
    for (const c of clearances) all.push(c.name);
    for (const e of educationalDocuments) all.push(e.name);
    return Array.from(new Set(all.map((x) => String(x || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }

  const hasEducationalAttainment = (employee) => {
    const raw = employee?.educational_attainment ?? employee?.educationalAttainment ?? '';
    const s = String(raw).trim();
    if (!s) return false;
    return s.toLowerCase() !== 'n/a';
  };

  const isMarriedEmployee = (employee) => {
    const raw = employee?.marital_status ?? employee?.maritalStatus ?? '';
    const s = String(raw).trim().toLowerCase();
    return s === 'married';
  };

  const isDeliveryCrew = (employee) => {
    const p = String(employee?.position || '').toLowerCase();
    return /(driver|helper|rider|messenger|delivery)/.test(p);
  };

  const isOfficeEmployee = (employee) => !isDeliveryCrew(employee);

  const getPersonalDocRule = (doc, employee) => {
    const key = String(doc?.key || '').trim();
    if (!key) return { applicable: false, required: false };

    if (key === 'marriage_contract') {
      return { applicable: isMarriedEmployee(employee), required: false };
    }

    if (key === 'residence_sketch') {
      const applicable = isOfficeEmployee(employee);
      return { applicable, required: applicable };
    }

    const required = Boolean(doc?.required);
    return { applicable: true, required };
  };

  function getRequirementEntries(employee) {
    if (!employee || !employee.requirements || typeof employee.requirements !== 'object') return [];

    const entries = [];
    const reqs = employee.requirements;

    const pushEntry = ({ status, submitted, requiredForCompletion }) => {
      let s = normalizeStatus(status);
      // If a file is present but status is still missing/empty, treat it as pending validation.
      // This prevents employees from showing as "Incomplete" when they already submitted the document.
      if (Boolean(submitted) && s === 'missing') s = 'pending';
      const includeOptional = Boolean(submitted);
      const required = Boolean(requiredForCompletion);
      entries.push({
        status: s,
        submitted: Boolean(submitted),
        requiredForCompletion: required,
        includeInProgress: required || includeOptional,
        includeInStatus: required || includeOptional,
      });
    };

    if (employee.isAgency) {
      // Agency employees: government IDs (always required)
      const reqVals = Object.values(reqs).filter((r) => r && typeof r === 'object');
      for (const r of reqVals) {
        pushEntry({
          status: r.status,
          submitted: Boolean(r.hasFile || r.filePath),
          requiredForCompletion: true,
        });
      }
    } else {
      const idNums = reqs.id_numbers || {};
      const license = reqs.license || {};
      const medical = reqs.medicalExams || {};
      const personal = reqs.personalDocuments || {};
      const clearance = reqs.clearances || {};
      const education = reqs.educationalDocuments || {};
      const legacyDocs = Array.isArray(reqs.documents) ? reqs.documents : [];

      // IDs (always required)
      for (const key of ['sss', 'tin', 'pagibig', 'philhealth']) {
        const id = idNums?.[key] || {};
        const hasFile = Boolean(id?.file_path || id?.filePath);
        const hasValue = Boolean(String(id?.value || '').trim());
        pushEntry({
          status: id?.status,
          submitted: hasFile && hasValue,
          requiredForCompletion: true,
        });
      }

      // License (required only for drivers/delivery crew)
      if (isDeliveryCrew(employee)) {
        const front = license?.frontFilePath || license?.front_file_path;
        const back = license?.backFilePath || license?.back_file_path;
        const hasFile = Boolean(front && back);
        const expiry = license?.licenseExpiry || license?.license_expiry;
        const expired = hasFile && isExpiredDate(expiry);
        pushEntry({
          status: expired ? 'expired' : license?.status,
          submitted: hasFile,
          requiredForCompletion: true,
        });
      }

      // Medical exams (required)
      for (const exam of medicalExams) {
        const doc = medical?.[exam.key] || {};
        const hasFile = Boolean(doc?.filePath || doc?.file_path);
        const expired = hasFile && isExpiredDate(doc?.validUntil || doc?.valid_until);
        pushEntry({
          status: expired ? 'expired' : doc?.status,
          submitted: hasFile,
          requiredForCompletion: true,
        });
      }

      // Personal docs (some optional / conditional)
      for (const docDef of personalDocuments) {
        const rule = getPersonalDocRule(docDef, employee);
        if (!rule.applicable) continue;

        const doc = personal?.[docDef.key] || {};
        const submitted = Boolean(doc?.filePath || doc?.file_path);
        pushEntry({
          status: doc?.status,
          submitted,
          requiredForCompletion: rule.required,
        });
      }

      // Clearances (required)
      for (const docDef of clearances) {
        const doc = clearance?.[docDef.key] || {};
        const hasFile = Boolean(doc?.filePath || doc?.file_path);
        const expired = hasFile && isExpiredDate(doc?.dateValidity || doc?.date_validity);
        pushEntry({
          status: expired ? 'expired' : doc?.status,
          submitted: hasFile,
          requiredForCompletion: true,
        });
      }

      // Educational docs (only if educational attainment exists)
      if (hasEducationalAttainment(employee)) {
        for (const docDef of educationalDocuments) {
          const doc = education?.[docDef.key] || {};
          pushEntry({
            status: doc?.status,
            submitted: Boolean(doc?.filePath || doc?.file_path),
            requiredForCompletion: true,
          });
        }
      }

      // Legacy docs (required once present)
      for (const doc of legacyDocs) {
        const hasFile = Boolean(doc?.file_path || doc?.filePath);
        pushEntry({
          status: doc?.status,
          submitted: hasFile,
          requiredForCompletion: true,
        });
      }
    }

    // HR requested docs (variable count; required once requested)
    if (employee?.hrRequests && employee.hrRequests.length > 0) {
      for (const r of employee.hrRequests) {
        pushEntry({
          status: r?.status,
          submitted: Boolean(r?.file_path || r?.filePath),
          requiredForCompletion: true,
        });
      }
    }

    return entries;
  }

  // Calculate stats
  const stats = useMemo(() => {
    // Filter employees by depot for HRC users
    let filteredEmployees = employees;
    if (currentUser?.role?.toUpperCase() === 'HRC' && currentUser?.depot) {
      filteredEmployees = employees.filter(e => e.depot === currentUser.depot);
    }

    return {
      incomplete: filteredEmployees.filter(e => getEmployeeStatus(e) === 'incomplete').length,
      pending: filteredEmployees.filter(e => hasPendingItems(e)).length,
      complete: filteredEmployees.filter(e => getEmployeeStatus(e) === 'complete').length,
      total: filteredEmployees.length,
    };
  }, [employees, currentUser]);

  // Get unique positions and depots for filters
  const uniquePositions = useMemo(() => {
    const positions = new Set(employees.map(e => e.position).filter(Boolean));
    return Array.from(positions).sort();
  }, [employees]);

  const depotOptions = useMemo(() => {
    const depotsSet = new Set(employees.map(e => e.depot).filter(Boolean));
    return Array.from(depotsSet).sort();
  }, [employees]);

  const positions = useMemo(() => {
    if (departmentFilter === 'All') {
      const set = new Set(getPositionsForDepartment('All'));
      uniquePositions.forEach((p) => set.add(p));
      return ['All', ...Array.from(set).sort((a, b) => String(a).localeCompare(String(b)))];
    }

    const list = getPositionsForDepartment(departmentFilter);
    return ['All', ...list.sort((a, b) => String(a).localeCompare(String(b)))];
  }, [departmentFilter, uniquePositions]);

  useEffect(() => {
    if (positionFilter === 'All') return;
    if (departmentFilter === 'All') return;
    const allowed = new Set(getPositionsForDepartment(departmentFilter));
    if (!allowed.has(positionFilter)) {
      setPositionFilter('All');
      setCurrentPage(1);
      setExpandedRow(null);
    }
  }, [departmentFilter, positionFilter]);

  const employmentStatuses = ['All', 'Regular', 'Under Probation', 'Part Time'];
  const recruitmentTypes = ['All', 'Agency', 'Direct'];

  // Filter data based on active tab, search, and filters
  const getFilteredData = () => {
    let data = [...employees];

    // Filter by depot for HRC users first
    if (currentUser?.role?.toUpperCase() === 'HRC' && currentUser?.depot) {
      data = data.filter(e => e.depot === currentUser.depot);
    }

    // Filter by recruitment type (agency vs direct)
    if (recruitmentTypeFilter === 'Agency') {
      data = data.filter(e => e.isAgency);
    } else if (recruitmentTypeFilter === 'Direct') {
      data = data.filter(e => !e.isAgency);
    }

    // Filter by status tab
    if (activeTab !== 'all') {
      if (activeTab === 'pending') {
        // For pending tab, check if employee has ANY pending items
        data = data.filter(e => hasPendingItems(e));
      } else {
        data = data.filter(e => getEmployeeStatus(e) === activeTab);
      }
    }

    // Filter by department (derived from position)
    if (departmentFilter !== 'All') {
      data = data.filter(e => {
        const derived = getDepartmentForPosition(e.position);
        return normalizeDepartmentName(derived) === normalizeDepartmentName(departmentFilter);
      });
    }

    // Filter by position
    if (positionFilter !== 'All') {
      data = data.filter(e => e.position === positionFilter);
    }

    // Filter by depot
    if (depotFilter !== 'All') {
      data = data.filter(e => e.depot === depotFilter);
    }

    // Filter by employment status
    if (employmentStatusFilter !== 'All') {
      data = data.filter(e => e.employmentStatus === employmentStatusFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter(e => 
        String(e?.name || '').toLowerCase().includes(query) ||
        String(e?.position || '').toLowerCase().includes(query) ||
        String(e?.depot || '').toLowerCase().includes(query) ||
        String(e?.email || '').toLowerCase().includes(query) ||
        String(e.id).includes(query)
      );
    }

    // Sort
    const [sortKey, sortDir] = String(sortOption || 'name-asc').split('-');
    const isAsc = sortDir === 'asc';
    data.sort((a, b) => {
      if (sortKey === 'hired') {
        const at = a.deployedDate ? new Date(a.deployedDate).getTime() : null;
        const bt = b.deployedDate ? new Date(b.deployedDate).getTime() : null;

        if (at == null && bt == null) return 0;
        if (at == null) return 1;
        if (bt == null) return -1;

        return isAsc ? at - bt : bt - at;
      }

      return isAsc
        ? String(a.name || '').localeCompare(String(b.name || ''))
        : String(b.name || '').localeCompare(String(a.name || ''));
    });

    return data;
  };

  const exportRequirementsPdf = useCallback((rows, title = "Employee Requirements") => {
    const list = Array.isArray(rows) ? rows : [];
    if (list.length === 0) {
      setAlertMessage("No employees to export for the current filters.");
      setShowErrorAlert(true);
      return;
    }

    try {
      const exportedAt = new Date();
      const exportedAtLabel = exportedAt.toLocaleString("en-US");

      const filterSummary = [
        activeTab && activeTab !== 'all' ? `Tab: ${activeTab}` : null,
        searchQuery ? `Search: ${searchQuery}` : null,
        depotFilter !== 'All' ? `Depot: ${depotFilter}` : null,
        departmentFilter !== 'All' ? `Department: ${departmentFilter}` : null,
        positionFilter !== 'All' ? `Position: ${positionFilter}` : null,
        employmentStatusFilter !== 'All' ? `Employment: ${employmentStatusFilter}` : null,
        recruitmentTypeFilter !== 'All' ? `Recruitment: ${recruitmentTypeFilter}` : null,
        `Sort: ${sortOption}`,
      ]
        .filter(Boolean)
        .join(" | ");

      const safeText = (v) => {
        const s = String(v ?? "").trim();
        return s.length ? s : "—";
      };

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      doc.setFontSize(16);
      doc.text(`${title} (${list.length})`, 28, 40);

      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text(`Exported: ${exportedAtLabel}`, 28, 58);
      if (filterSummary) doc.text(filterSummary, 28, 74);
      doc.setTextColor(0);

      const body = list.map((emp) => {
        const status = getEmployeeStatus(emp);
        const statusBadge = getEmployeeStatusBadge(status);
        const progress = getRequirementsProgress(emp);
        return [
          safeText(emp.name),
          safeText(emp.email),
          safeText(emp.position),
          safeText(emp.depot),
          emp.isAgency ? "Agency" : "Direct",
          safeText(statusBadge.label),
          `${progress.approved}/${progress.total}`,
          safeText(formatDate(emp.deployedDate)),
        ];
      });

      autoTable(doc, {
        startY: filterSummary ? 90 : 78,
        head: [["Name", "Email", "Position", "Depot", "Type", "Status", "Progress", "Deployed"]],
        body,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
        headStyles: { fillColor: [245, 245, 245], textColor: 20 },
        margin: { left: 28, right: 28 },
        columnStyles: {
          0: { cellWidth: 85 },
          1: { cellWidth: 115 },
          2: { cellWidth: 85 },
          3: { cellWidth: 50 },
          4: { cellWidth: 40 },
          5: { cellWidth: 60 },
          6: { cellWidth: 55 },
          7: { cellWidth: 50 },
        },
      });

      const yyyyMmDd = exportedAt.toISOString().slice(0, 10);
      const rawParts = [
        "requirements",
        activeTab && activeTab !== 'all' ? activeTab : null,
        depotFilter !== 'All' ? depotFilter : null,
        departmentFilter !== 'All' ? departmentFilter : null,
        positionFilter !== 'All' ? positionFilter : null,
        employmentStatusFilter !== 'All' ? employmentStatusFilter : null,
        recruitmentTypeFilter !== 'All' ? recruitmentTypeFilter : null,
        yyyyMmDd,
      ]
        .filter(Boolean)
        .join("_");
      const fileName = `${rawParts}`.replace(/[^a-zA-Z0-9_-]+/g, "_") + ".pdf";
      doc.save(fileName);
    } catch (err) {
      console.error("exportRequirementsPdf error:", err);
      setAlertMessage("Failed to export PDF. Please try again.");
      setShowErrorAlert(true);
    }
  }, [activeTab, searchQuery, depotFilter, departmentFilter, positionFilter, employmentStatusFilter, recruitmentTypeFilter, sortOption]);

  const exportRequirementsExcel = useCallback(async (rows, title = "Employee Requirements") => {
    const list = Array.isArray(rows) ? rows : [];
    if (list.length === 0) {
      setAlertMessage("No employees to export for the current filters.");
      setShowErrorAlert(true);
      return;
    }

    try {
      const exportedAt = new Date();
      const yyyyMmDd = exportedAt.toISOString().slice(0, 10);
      const rawParts = [
        "requirements",
        activeTab && activeTab !== 'all' ? activeTab : null,
        depotFilter !== 'All' ? depotFilter : null,
        departmentFilter !== 'All' ? departmentFilter : null,
        positionFilter !== 'All' ? positionFilter : null,
        employmentStatusFilter !== 'All' ? employmentStatusFilter : null,
        recruitmentTypeFilter !== 'All' ? recruitmentTypeFilter : null,
        yyyyMmDd,
      ]
        .filter(Boolean)
        .join("_");
      const fileName = `${rawParts}`.replace(/[^a-zA-Z0-9_-]+/g, "_") + ".xlsx";

      const safeText = (v) => {
        const s = String(v ?? "").trim();
        return s.length ? s : "—";
      };

      const header = ["Name", "Email", "Position", "Depot", "Type", "Status", "Progress", "Deployed Date"];
      const rowsAoa = [];

      for (const emp of list) {
        const status = getEmployeeStatus(emp);
        const statusBadge = getEmployeeStatusBadge(status);
        const progress = getRequirementsProgress(emp);
        rowsAoa.push([
          safeText(emp.name),
          safeText(emp.email),
          safeText(emp.position),
          safeText(emp.depot),
          emp.isAgency ? "Agency" : "Direct",
          safeText(statusBadge.label),
          `${progress.approved}/${progress.total}`,
          safeText(formatDate(emp.deployedDate)),
        ]);
      }

      const sheetName = String(title || "Requirements").slice(0, 31) || "Requirements";
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(sheetName);
      worksheet.addRow(header);
      worksheet.addRows(rowsAoa);
      worksheet.getRow(1).font = { bold: true };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("exportRequirementsExcel error:", err);
      setAlertMessage("Failed to export Excel file. Please try again.");
      setShowErrorAlert(true);
    }
  }, [activeTab, depotFilter, departmentFilter, positionFilter, employmentStatusFilter, recruitmentTypeFilter]);

  const filteredData = useMemo(() => getFilteredData(), [
    employees,
    currentUser,
    recruitmentTypeFilter,
    activeTab,
    departmentFilter,
    positionFilter,
    depotFilter,
    employmentStatusFilter,
    searchQuery,
    sortOption,
  ]);

  const depotCompliance = useMemo(() => {
    const byDepot = new Map();

    for (const emp of filteredData) {
      const depotName = String(emp?.depot || '').trim();
      if (!depotName || depotName === '—') continue;

      const progress = getRequirementsProgress(emp);
      const approved = Number(progress?.approved || 0);
      const total = Number(progress?.total || 0);

      if (!byDepot.has(depotName)) {
        byDepot.set(depotName, { name: depotName, approved: 0, total: 0, employees: 0 });
      }

      const agg = byDepot.get(depotName);
      agg.approved += approved;
      agg.total += total;
      agg.employees += 1;
    }

    const rows = Array.from(byDepot.values()).map((d) => {
      const raw = d.total > 0 ? (d.approved / d.total) * 100 : 0;
      const safeRaw = Number.isFinite(raw) ? raw : 0;
      const compliance = Math.max(0, Math.min(100, Math.round(safeRaw)));
      return {
        name: d.name,
        employees: d.employees,
        approved: d.approved,
        total: d.total,
        compliance,
        nonCompliance: 100 - compliance,
      };
    });

    rows.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return rows;
  }, [filteredData]);

  const displayedDepots = showAllDepots
    ? depotCompliance
    : depotCompliance.slice(0, 6);
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Helpers
  const getInitials = (name) => {
    const s = String(name || '').trim();
    if (!s) return '--';
    return s
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
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
    const s = String(name || '');
    const index = s.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (!Number.isFinite(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusStyle = (status) => {
    const styles = {
      approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
      submitted: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Submitted' },
      resubmit: { bg: 'bg-red-100', text: 'text-red-700', label: 'Re-submit' },
      expired: { bg: 'bg-red-100', text: 'text-red-700', label: 'Expired' },
      missing: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Missing' },
    };
    return styles[status] || styles.pending;
  };

  const getEmployeeStatusBadge = (status) => {
    const styles = {
      complete: { text: 'text-green-600', label: 'Complete' },
      pending: { text: 'text-orange-600', label: 'Pending' },
      incomplete: { text: 'text-red-600', label: 'Incomplete' },
    };
    return styles[status] || styles.pending;
  };

  function getRequirementsProgress(employee) {
    const entries = getRequirementEntries(employee);
    const included = entries.filter((e) => e.includeInProgress);
    const total = included.length;
    const approved = included.filter((e) => e.status === 'approved').length;
    const expired = included.filter((e) => e.status === 'expired' && e.submitted).length;
    // Pending progress includes submitted items waiting validation, plus resubmits that have a file.
    // (Unuploaded HR requests are excluded because e.submitted is false.)
    const pending = included.filter((e) => (e.status === 'pending' || e.status === 'resubmit') && e.submitted).length;
    const submitted = approved + pending + expired;
    return { approved, pending, expired, submitted, total };
  }

  // Validation Modal Functions
  const openValidationModal = (employeeId, type, key, name, currentStatus = 'pending', currentRemarks = '') => {
    setValidationTarget({ employeeId, type, key, name });
    setValidationForm({ 
      status: currentStatus === 'approved' ? 'Validated' : currentStatus === 'resubmit' ? 'Re-submit' : 'Validated',
      remarks: currentRemarks || '' 
    });
    setShowValidationModal(true);
  };

  const closeValidationModal = () => {
    setShowValidationModal(false);
    setValidationTarget(null);
    setValidationForm({ status: 'Validated', remarks: '' });
  };

  const handleValidationSubmit = async () => {
    if (!validationTarget?.employeeId) {
      setAlertMessage('Employee ID not found');
      setShowErrorAlert(true);
      return;
    }

    setValidating(true);
    try {
      // Get current employee data
      const { data: employeeData, error: empError } = await supabase
        .from('employees')
        .select('id, requirements, is_agency, agency_profile_id')
        .eq('id', validationTarget.employeeId)
        .single();

      if (empError) throw empError;

      const isAgency = employeeData.is_agency === true;

      // Parse current requirements
      let currentRequirements = null;
      if (employeeData.requirements) {
        if (typeof employeeData.requirements === 'string') {
          try {
            currentRequirements = JSON.parse(employeeData.requirements);
          } catch {
            currentRequirements = {};
          }
        } else {
          currentRequirements = employeeData.requirements;
        }
      }

      if (!currentRequirements) {
        currentRequirements = isAgency ? {} : {
          id_numbers: {},
          license: {},
          medicalExams: {},
          personalDocuments: {},
          clearances: {},
          educationalDocuments: {},
          documents: [],
        };
      }

      if (isAgency) {
        // Agency employees: update ID numbers
        if (!currentRequirements.id_numbers) {
          currentRequirements.id_numbers = {};
        }

        const idKey = validationTarget.key;
        if (!currentRequirements.id_numbers[idKey]) {
          currentRequirements.id_numbers[idKey] = {};
        }

        currentRequirements.id_numbers[idKey] = {
          ...currentRequirements.id_numbers[idKey],
          status: validationForm.status,
          remarks: validationForm.remarks.trim() || null,
          validated_at: validationForm.status === 'Validated' ? new Date().toISOString() : null,
        };
      } else {
        // Direct applicants: update based on document type
        if (validationTarget.type === 'id') {
          // Update ID number
          if (!currentRequirements.id_numbers) {
            currentRequirements.id_numbers = {};
          }

          const idKey = validationTarget.key;
          if (!currentRequirements.id_numbers[idKey]) {
            currentRequirements.id_numbers[idKey] = {};
          }

          currentRequirements.id_numbers[idKey] = {
            ...currentRequirements.id_numbers[idKey],
            status: validationForm.status,
            remarks: validationForm.remarks.trim() || null,
            validated_at: validationForm.status === 'Validated' ? new Date().toISOString() : null,
          };
        } else if (validationTarget.type === 'license') {
          // Update license
          if (!currentRequirements.license) {
            currentRequirements.license = {};
          }

          const front = currentRequirements.license?.frontFilePath || currentRequirements.license?.front_file_path || null;
          const back = currentRequirements.license?.backFilePath || currentRequirements.license?.back_file_path || null;

          currentRequirements.license = {
            ...currentRequirements.license,
            status: validationForm.status === 'Validated' ? 'approved' : validationForm.status === 'Re-submit' ? 'resubmit' : 'pending',
            remarks: validationForm.remarks.trim() || null,
            validated_at: new Date().toISOString(),
            validated_front_file_path: front,
            validated_back_file_path: back,
          };
        } else if (validationTarget.type === 'medical') {
          // Update medical exam
          if (!currentRequirements.medicalExams) {
            currentRequirements.medicalExams = {};
          }

          const medicalKey = validationTarget.key;
          if (!currentRequirements.medicalExams[medicalKey]) {
            currentRequirements.medicalExams[medicalKey] = {};
          }

          const fp =
            currentRequirements.medicalExams[medicalKey]?.filePath ||
            currentRequirements.medicalExams[medicalKey]?.file_path ||
            null;

          currentRequirements.medicalExams[medicalKey] = {
            ...currentRequirements.medicalExams[medicalKey],
            status: validationForm.status === 'Validated' ? 'approved' : validationForm.status === 'Re-submit' ? 'resubmit' : 'pending',
            remarks: validationForm.remarks.trim() || null,
            validated_at: new Date().toISOString(),
            validated_file_path: fp,
          };
        } else if (validationTarget.type === 'personal') {
          // Update personal document
          if (!currentRequirements.personalDocuments) {
            currentRequirements.personalDocuments = {};
          }

          const personalKey = validationTarget.key;
          if (!currentRequirements.personalDocuments[personalKey]) {
            currentRequirements.personalDocuments[personalKey] = {};
          }

          const fp =
            currentRequirements.personalDocuments[personalKey]?.filePath ||
            currentRequirements.personalDocuments[personalKey]?.file_path ||
            null;

          currentRequirements.personalDocuments[personalKey] = {
            ...currentRequirements.personalDocuments[personalKey],
            status: validationForm.status === 'Validated' ? 'approved' : validationForm.status === 'Re-submit' ? 'resubmit' : 'pending',
            remarks: validationForm.remarks.trim() || null,
            validated_at: new Date().toISOString(),
            validated_file_path: fp,
          };
        } else if (validationTarget.type === 'clearance') {
          // Update clearance
          if (!currentRequirements.clearances) {
            currentRequirements.clearances = {};
          }

          const clearanceKey = validationTarget.key;
          if (!currentRequirements.clearances[clearanceKey]) {
            currentRequirements.clearances[clearanceKey] = {};
          }

          const fp =
            currentRequirements.clearances[clearanceKey]?.filePath ||
            currentRequirements.clearances[clearanceKey]?.file_path ||
            null;

          currentRequirements.clearances[clearanceKey] = {
            ...currentRequirements.clearances[clearanceKey],
            status: validationForm.status === 'Validated' ? 'approved' : validationForm.status === 'Re-submit' ? 'resubmit' : 'pending',
            remarks: validationForm.remarks.trim() || null,
            validated_at: new Date().toISOString(),
            validated_file_path: fp,
          };
        } else if (validationTarget.type === 'educational') {
          // Update educational document
          if (!currentRequirements.educationalDocuments) {
            currentRequirements.educationalDocuments = {};
          }

          const educationalKey = validationTarget.key;
          if (!currentRequirements.educationalDocuments[educationalKey]) {
            currentRequirements.educationalDocuments[educationalKey] = {};
          }

          const fp =
            currentRequirements.educationalDocuments[educationalKey]?.filePath ||
            currentRequirements.educationalDocuments[educationalKey]?.file_path ||
            null;

          currentRequirements.educationalDocuments[educationalKey] = {
            ...currentRequirements.educationalDocuments[educationalKey],
            status: validationForm.status === 'Validated' ? 'approved' : validationForm.status === 'Re-submit' ? 'resubmit' : 'pending',
            remarks: validationForm.remarks.trim() || null,
            validated_at: new Date().toISOString(),
            validated_file_path: fp,
          };
        } else if (validationTarget.type === 'doc') {
          // Legacy documents array (for backward compatibility)
          if (!Array.isArray(currentRequirements.documents)) {
            currentRequirements.documents = [];
          }

          const docKey = validationTarget.key;
          const docIndex = currentRequirements.documents.findIndex(d => 
            d.key === docKey || d.name === validationTarget.name
          );

          if (docIndex >= 0) {
            currentRequirements.documents[docIndex] = {
              ...currentRequirements.documents[docIndex],
              status: validationForm.status,
              remarks: validationForm.remarks.trim() || null,
              validated_at: validationForm.status === 'Validated' ? new Date().toISOString() : null,
            };
          } else {
            // Document doesn't exist yet, add it
            currentRequirements.documents.push({
              key: docKey,
              name: validationTarget.name,
              status: validationForm.status,
              remarks: validationForm.remarks.trim() || null,
              validated_at: validationForm.status === 'Validated' ? new Date().toISOString() : null,
            });
          }
        } else if (validationTarget.type === 'hr_request') {
          // HR requested documents
          if (!Array.isArray(currentRequirements.hr_requests)) {
            currentRequirements.hr_requests = [];
          }

          const requestId = validationTarget.key;
          const idx = currentRequirements.hr_requests.findIndex((r) => String(r?.id || '') === String(requestId));

          const nextStatus =
            validationForm.status === 'Validated'
              ? 'approved'
              : validationForm.status === 'Re-submit'
                ? 'resubmit'
                : 'pending';

          if (idx >= 0) {
            const fp = currentRequirements.hr_requests[idx]?.file_path || currentRequirements.hr_requests[idx]?.filePath || null;
            currentRequirements.hr_requests[idx] = {
              ...currentRequirements.hr_requests[idx],
              status: nextStatus,
              remarks: validationForm.remarks.trim() || null,
              validated_at: new Date().toISOString(),
              validated_file_path: fp,
            };
          } else {
            // Fallback: if request wasn't found by id, add a minimal record to preserve validation.
            currentRequirements.hr_requests.push({
              id: requestId,
              document_type: validationTarget.name,
              document: validationTarget.name,
              status: nextStatus,
              remarks: validationForm.remarks.trim() || null,
              validated_at: new Date().toISOString(),
              validated_file_path: null,
            });
          }
        }
      }

      // Update requirements in employees table
      const { error: updateError } = await supabase
        .from('employees')
        .update({ requirements: currentRequirements })
        .eq('id', validationTarget.employeeId);

      if (updateError) {
        throw new Error(`Failed to save validation: ${updateError.message}`);
      }

      // Close modal and show success
      closeValidationModal();
      setAlertMessage('Requirement validated successfully!');
      setShowSuccessAlert(true);

      // Reload employees data
      setReloadTrigger(prev => prev + 1);

    } catch (err) {
      console.error('Error validating requirement:', err);
      setAlertMessage(err.message || 'Failed to validate requirement. Please try again.');
      setShowErrorAlert(true);
    } finally {
      setValidating(false);
    }
  };

  // Request Document Functions
  const openRequestModal = (employeeId, employeeName, isAgency) => {
    setRequestTarget({ employeeId, employeeName, isAgency });
    setRequestForm({ documentType: '', deadline: '' });
    setShowRequestModal(true);
  };

  const closeRequestModal = () => {
    setShowRequestModal(false);
    setRequestTarget(null);
    setRequestForm({ documentType: '', deadline: '' });
  };

  const handleRequestSubmit = async () => {
    if (!requestTarget?.employeeId) {
      setAlertMessage('Employee ID not found');
      setShowErrorAlert(true);
      return;
    }

    if (!requestForm.documentType.trim()) {
      setAlertMessage('Please specify the document type');
      setShowErrorAlert(true);
      return;
    }

    // Block duplicates against currently-required docs for the target employee
    const targetEmployee = employees.find((e) => e?.employeeId === requestTarget.employeeId) || null;
    const requiredLabels = getRequiredDocTypeLabelsForEmployee(targetEmployee);
    const requiredCanon = requiredLabels.map(canonicalizeDocType);
    if (isDuplicateDocType(requestForm.documentType, requiredCanon)) {
      setAlertMessage('That document is already required for this employee. Please choose a different document.');
      setShowErrorAlert(true);
      return;
    }

    if (!requestForm.deadline) {
      setAlertMessage('Please specify a deadline');
      setShowErrorAlert(true);
      return;
    }

    setRequesting(true);
    try {
      // Get current employee data
      const { data: employeeData, error: empError } = await supabase
        .from('employees')
        .select('id, requirements')
        .eq('id', requestTarget.employeeId)
        .single();

      if (empError) throw empError;

      // Parse current requirements
      let currentRequirements = null;
      if (employeeData.requirements) {
        if (typeof employeeData.requirements === 'string') {
          try {
            currentRequirements = JSON.parse(employeeData.requirements);
          } catch {
            currentRequirements = {};
          }
        } else {
          currentRequirements = employeeData.requirements;
        }
      }

      if (!currentRequirements) {
        currentRequirements = {
          id_numbers: {},
          documents: [],
          hr_requests: [],
        };
      }

      // Initialize hr_requests if it doesn't exist
      if (!Array.isArray(currentRequirements.hr_requests)) {
        currentRequirements.hr_requests = [];
      }

      // Add new HR request
      const newRequest = {
        id: Date.now().toString(),
        document_type: requestForm.documentType.trim(),
        document: requestForm.documentType.trim(), // Also add 'document' for compatibility
        description: null,
        remarks: null,
        priority: 'normal',
        requested_at: new Date().toISOString(),
        requested_by: currentUser?.email || 'HR',
        status: 'pending',
        deadline: requestForm.deadline,
      };

      currentRequirements.hr_requests.push(newRequest);

      // Update requirements in employees table
      const { error: updateError } = await supabase
        .from('employees')
        .update({ requirements: currentRequirements })
        .eq('id', requestTarget.employeeId);

      if (updateError) {
        throw new Error(`Failed to save document request: ${updateError.message}`);
      }

      // Close modal and show success
      closeRequestModal();
      setAlertMessage(`Document request sent to ${requestTarget.isAgency ? 'agency' : 'employee'} successfully!`);
      setShowSuccessAlert(true);

      // Reload employees data
      setReloadTrigger(prev => prev + 1);

    } catch (err) {
      console.error('Error requesting document:', err);
      setAlertMessage(err.message || 'Failed to send document request. Please try again.');
      setShowErrorAlert(true);
    } finally {
      setRequesting(false);
    }
  };

  // View Document Functions
  const closeViewDocument = () => {
    setShowViewDocumentModal(false);
    setViewDocumentTarget(null);
  };

  const handleDownloadDocument = async (filePath) => {
    try {
      const { data, error } = await supabase.storage
        .from('application-files')
        .download(filePath);

      if (error) throw error;

      // Create a blob URL and trigger download
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath.split('/').pop() || 'document';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading document:', err);
      setAlertMessage('Failed to download document. Please try again.');
      setShowErrorAlert(true);
    }
  };

  const getDocumentUrl = (filePath) => {
    if (!filePath) return null;
    const { data } = supabase.storage
      .from('application-files')
      .getPublicUrl(filePath);
    return data?.publicUrl || null;
  };

  const requestTargetEmployee = requestTarget
    ? employees.find((e) => e?.employeeId === requestTarget.employeeId)
    : null;

  const requestRequiredLabels = requestTargetEmployee
    ? getRequiredDocTypeLabelsForEmployee(requestTargetEmployee)
    : [];
  const requestRequiredCanon = requestRequiredLabels.map(canonicalizeDocType);

  const requestDocCatalog = getDocTypeCatalog();
  const requestDocSuggestions = requestDocCatalog.filter(
    (name) => !isDuplicateDocType(name, requestRequiredCanon)
  );

  const requestDocDuplicate = isDuplicateDocType(requestForm.documentType, requestRequiredCanon);
  const requestDeadlineDays = getDaysUntil(requestForm.deadline);
  const requestDeadlineSoon =
    requestDeadlineDays != null && requestDeadlineDays >= 0 && requestDeadlineDays <= 7;

  return (
    <div className="min-h-screen bg-gray-50">
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

      {/* Content */}
      <div className="w-full py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Employee Requirements</h1>
          <p className="text-gray-500 mt-1">Request additional documents from agencies/employees and validate submitted requirements</p>
        </div>

        {/* Depot Compliance Monitoring */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Depot Compliance Monitoring</h2>
              <p className="text-sm text-gray-500">Compliance rate per depot</p>
            </div>

            {depotCompliance.length > 6 && (
              <button
                onClick={() => setShowAllDepots((v) => !v)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {showAllDepots ? "Show less" : `Show all (${depotCompliance.length})`}
                <svg
                  className={`w-4 h-4 transition-transform ${showAllDepots ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>

          {depotCompliance.length === 0 ? (
            <div className="p-6 text-sm text-gray-600 bg-gray-50 rounded-xl border border-gray-100">
              No depot compliance data to display for the current list.
            </div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {displayedDepots.map((depot) => {
              const data = [
                { name: "Compliant", value: depot.compliance },
                { name: "Remaining", value: depot.nonCompliance },
              ];

              return (
                <div
                  key={depot.name}
                  className="group rounded-2xl border border-gray-100 bg-gradient-to-b from-white to-gray-50 p-3 shadow-sm hover:shadow-md hover:border-gray-200 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{depot.name}</div>
                      <div className="mt-0.5 flex items-baseline gap-2">
                        <div className="text-lg sm:text-xl font-bold text-gray-900">{depot.compliance}%</div>
                        <div className="text-xs font-medium text-gray-500">compliant</div>
                      </div>
                    </div>

                    <div className="relative shrink-0">
                      <PieChart width={76} height={76}>
                        <Pie
                          data={data}
                          cx="50%"
                          cy="50%"
                          innerRadius={22}
                          outerRadius={32}
                          paddingAngle={2}
                          cornerRadius={6}
                          dataKey="value"
                          startAngle={90}
                          endAngle={-270}
                        >
                          {data.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
          )}
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="flex flex-col gap-3">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by employee name..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                    setExpandedRow(null);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                />
              </div>

              {/* Filters row (below search, uniform with Employees) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(6,minmax(0,1fr))_auto] gap-2 items-center">
                {/* Depot */}
                <select
                  value={depotFilter}
                  onChange={(e) => {
                    setDepotFilter(e.target.value);
                    setCurrentPage(1);
                    setExpandedRow(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                >
                  <option value="All">All Depots</option>
                  {depotOptions.filter(d => d !== "All").map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                {/* Department */}
                <select
                  value={departmentFilter}
                  onChange={(e) => {
                    setDepartmentFilter(e.target.value);
                    setCurrentPage(1);
                    setExpandedRow(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                >
                  <option value="All">All Departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                {/* Position */}
                <select
                  value={positionFilter}
                  onChange={(e) => {
                    setPositionFilter(e.target.value);
                    setCurrentPage(1);
                    setExpandedRow(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                >
                  <option value="All">All Positions</option>
                  {positions.filter(p => p !== 'All').map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>

                {/* Employment Status */}
                <select
                  value={employmentStatusFilter}
                  onChange={(e) => {
                    setEmploymentStatusFilter(e.target.value);
                    setCurrentPage(1);
                    setExpandedRow(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                >
                  <option value="All">Employment Status</option>
                  {employmentStatuses.filter((s) => s !== 'All').map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                {/* Recruitment Type */}
                <select
                  value={recruitmentTypeFilter}
                  onChange={(e) => {
                    setRecruitmentTypeFilter(e.target.value);
                    setCurrentPage(1);
                    setExpandedRow(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                >
                  <option value="All">All Recruitment Type</option>
                  {recruitmentTypes.filter((t) => t !== 'All').map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>

                {/* Sort */}
                <select
                  value={sortOption}
                  onChange={(e) => {
                    setSortOption(e.target.value);
                    setCurrentPage(1);
                    setExpandedRow(null);
                  }}
                  aria-label="Sort"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                >
                  <option value="name-asc">Alphabetically (A → Z)</option>
                  <option value="name-desc">Alphabetically (Z → A)</option>
                  <option value="hired-asc">Date Hired (Oldest → Newest)</option>
                  <option value="hired-desc">Date Hired (Newest → Oldest)</option>
                </select>

                {/* Export Button */}
                <div className="relative" ref={exportMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowExportMenu((prev) => !prev)}
                    className="w-full sm:w-auto px-4 py-2 border border-gray-200 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2 bg-white"
                    title="Export the currently filtered list"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export
                  </button>

                  {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-50 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          setShowExportMenu(false);
                          exportRequirementsPdf(getFilteredData(), "Employee Requirements");
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50"
                      >
                        Export list as PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowExportMenu(false);
                          exportRequirementsExcel(getFilteredData(), "Employee Requirements");
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50"
                      >
                        Export list as Excel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Row: Status Tabs */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  setActiveTab('all');
                  setCurrentPage(1);
                  setExpandedRow(null);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => {
                  setActiveTab('pending');
                  setCurrentPage(1);
                  setExpandedRow(null);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'pending'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Pending Review ({stats.pending})
              </button>
              <button
                onClick={() => {
                  setActiveTab('incomplete');
                  setCurrentPage(1);
                  setExpandedRow(null);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'incomplete'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Incomplete ({stats.incomplete})
              </button>
              <button
                onClick={() => {
                  setActiveTab('complete');
                  setCurrentPage(1);
                  setExpandedRow(null);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'complete'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Complete ({stats.complete})
              </button>
            </div>
          </div>
        </div>

        {/* Employees Table */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            <p className="text-gray-500 mt-4">Loading employees...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6 text-center">
            <p className="text-red-600">{error}</p>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="text-gray-500">No employees found</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Position / Depot</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Progress</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedData.map((employee) => {
                    const status = getEmployeeStatus(employee);
                    const statusBadge = getEmployeeStatusBadge(status);
                    const progress = getRequirementsProgress(employee);
                    const isExpanded = expandedRow === employee.id;

                    return (
                      <React.Fragment key={employee.id}>
                        <tr 
                          className={`transition-colors cursor-pointer ${
                            expandedRow === employee.id 
                              ? 'bg-red-50/30' 
                              : 'hover:bg-gray-50/50'
                          }`}
                          onClick={() => setExpandedRow(expandedRow === employee.id ? null : employee.id)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(employee.name)} flex items-center justify-center text-white text-sm font-medium shadow-sm`}>
                                {getInitials(employee.name)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-gray-800">{employee.name}</p>
                                  {employee.isAgency && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">AGENCY</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500">Deployed {formatDate(employee.deployedDate)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-800">{employee.position}</p>
                            <p className="text-xs text-gray-500">{employee.depot}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full max-w-[80px]">
                                <div className="h-2 w-full rounded-full overflow-hidden flex">
                                  {(() => {
                                    const total = Number(progress.total || 0);
                                    if (!Number.isFinite(total) || total <= 0) return null;

                                    const approved = Math.max(0, Number(progress.approved || 0));
                                    const pending = Math.max(0, Number(progress.pending || 0));
                                    const expired = Math.max(0, Number(progress.expired || 0));

                                    const toPct = (n) => Math.max(0, Math.min((n / total) * 100, 100));
                                    const approvedPct = toPct(approved);
                                    const pendingPct = toPct(pending);
                                    const expiredPct = toPct(expired);

                                    return (
                                      <>
                                        {approvedPct > 0 && (
                                          <div className="h-2 bg-green-500" style={{ width: `${approvedPct}%` }} />
                                        )}
                                        {pendingPct > 0 && (
                                          <div className="h-2 bg-orange-500" style={{ width: `${pendingPct}%` }} />
                                        )}
                                        {expiredPct > 0 && (
                                          <div className="h-2 bg-red-500" style={{ width: `${expiredPct}%` }} />
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                              <span className="text-xs text-gray-600">{progress.submitted}/{progress.total}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-semibold ${statusBadge.text}`}>
                                {statusBadge.label}
                              </span>
                              <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedRow === employee.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={4} className="px-6 py-5 bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
                              <div className="space-y-5">
                                {employee.isAgency ? (
                                  // Agency employees: show ID number requirements
                                  <div>
                                    <div className="flex items-center justify-between mb-4">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                          </svg>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-800">Government IDs</p>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {agencyRequirements.map((req) => {
                                        const reqData = employee.requirements[req.key];
                                        if (!reqData) return null;
                                        const statusStyle = getStatusStyle(reqData.status);
                                        const needsAction = reqData.status === 'missing' || reqData.status === 'resubmit';

                                        return (
                                          <div 
                                            key={req.key} 
                                            className={`p-4 rounded-xl border-2 transition-all ${
                                              reqData.status === 'resubmit' 
                                                ? 'bg-red-50 border-red-200 shadow-sm' 
                                                : reqData.status === 'missing' 
                                                  ? 'bg-orange-50/50 border-orange-200 border-dashed' 
                                                  : reqData.status === 'approved'
                                                    ? 'bg-green-50/50 border-green-200'
                                                    : 'bg-white border-gray-200'
                                            }`}
                                          >
                                            <div className="flex items-start justify-between gap-3">
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <p className="text-sm font-semibold text-gray-800">{req.name}</p>
                                                </div>
                                                {reqData.idNumber ? (
                                                  <div className="flex items-center gap-1.5 mt-1">
                                                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                                    </svg>
                                                    <p className="text-xs text-gray-600 font-mono">{reqData.idNumber}</p>
                                                  </div>
                                                ) : (
                                                  <p className="text-xs text-gray-400 italic mt-1">No ID number</p>
                                                )}
                                                {reqData.hasFile && reqData.submittedDate && (
                                                  <div className="flex items-center gap-1.5 mt-1">
                                                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    <p className="text-xs text-gray-500">Submitted {formatDate(reqData.submittedDate)}</p>
                                                  </div>
                                                )}
                                                {reqData.hasFile && reqData.filePath && (
                                                  <div className="flex items-center gap-1.5 mt-1">
                                                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                    </svg>
                                                    {getDocumentUrl(reqData.filePath) ? (
                                                      <a
                                                        href={getDocumentUrl(reqData.filePath)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                                                      >
                                                        View File
                                                      </a>
                                                    ) : (
                                                      <span className="text-xs text-gray-500">File uploaded</span>
                                                    )}
                                                  </div>
                                                )}
                                                {reqData.remarks && (
                                                  <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 flex items-start gap-1.5">
                                                    <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    <span>{reqData.remarks}</span>
                                                  </div>
                                                )}
                                              </div>
                                              <div className="flex flex-col items-end gap-2">
                                                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                                                  {statusStyle.label}
                                                </span>
                                                {(needsAction || reqData.status === 'pending') && (
                                                  <button 
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      openValidationModal(
                                                        employee.employeeId,
                                                        'id',
                                                        req.key,
                                                        req.name,
                                                        reqData.status,
                                                        reqData.remarks || ''
                                                      );
                                                    }}
                                                    disabled={!reqData.hasFile || !reqData.filePath}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                      !reqData.hasFile || !reqData.filePath
                                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                        : 'bg-red-600 text-white hover:bg-red-700'
                                                    }`}
                                                  >
                                                    Validate
                                                  </button>
                                                )}
                                                {reqData.status === 'approved' && (
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
                                ) : (
                                  // Direct applicants: show ID numbers and all documents
                                  <div className="space-y-5">
                                    {/* ID Numbers Section */}
                                    <div>
                                      <div className="flex items-center gap-2 mb-4">
                                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                          </svg>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-800">ID Numbers</p>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {[
                                          { key: 'sss', name: 'SSS No.' },
                                          { key: 'tin', name: 'TIN No.' },
                                          { key: 'pagibig', name: 'Pag-IBIG No.' },
                                          { key: 'philhealth', name: 'PhilHealth No.' },
                                        ].map((item) => {
                                          const idData = employee.requirements.id_numbers?.[item.key];
                                          const idStatus = idData?.status || 'missing';
                                          const idValue = idData?.value || '';
                                          const idRemarks = idData?.remarks || '';
                                          const statusStyle = getStatusStyle(
                                            idStatus === 'Validated' ? 'approved' :
                                            idStatus === 'Re-submit' ? 'resubmit' :
                                            idStatus === 'Submitted' ? 'pending' : 'missing'
                                          );

                                          const needsAction = idStatus === 'missing' || idStatus === 'Re-submit';
                                          
                                          return (
                                            <div 
                                              key={item.key} 
                                              className={`p-4 rounded-xl border-2 transition-all ${
                                                idStatus === 'Re-submit' 
                                                  ? 'bg-red-50 border-red-200 shadow-sm' 
                                                  : idStatus === 'missing' 
                                                    ? 'bg-orange-50/50 border-orange-200 border-dashed' 
                                                    : idStatus === 'Validated'
                                                      ? 'bg-green-50/50 border-green-200'
                                                      : 'bg-white border-gray-200'
                                              }`}
                                            >
                                              <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                                                  </div>
                                                  {idValue ? (
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                                      </svg>
                                                      <p className="text-xs text-gray-600 font-mono">{idValue}</p>
                                                    </div>
                                                  ) : (
                                                    <p className="text-xs text-gray-400 italic mt-1">No ID number</p>
                                                  )}
                                                  {(idData?.file_path || idData?.filePath) && (
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                      </svg>
                                                      {getDocumentUrl(idData.file_path || idData.filePath) ? (
                                                        <a
                                                          href={getDocumentUrl(idData.file_path || idData.filePath)}
                                                          target="_blank"
                                                          rel="noopener noreferrer"
                                                          onClick={(e) => e.stopPropagation()}
                                                          className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                                                        >
                                                          View File
                                                        </a>
                                                      ) : (
                                                        <span className="text-xs text-gray-500">File uploaded</span>
                                                      )}
                                                    </div>
                                                  )}
                                                  {idData?.submitted_at && (
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                      </svg>
                                                      <p className="text-xs text-gray-500">Submitted {formatDate(idData.submitted_at)}</p>
                                                    </div>
                                                  )}
                                                  {idRemarks && (
                                                    <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 flex items-start gap-1.5">
                                                      <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                      </svg>
                                                      <span>{idRemarks}</span>
                                                    </div>
                                                  )}
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                                                    {statusStyle.label}
                                                  </span>
                                                  {(needsAction || idStatus === 'Submitted') && (
                                                    <button 
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        openValidationModal(
                                                          employee.employeeId,
                                                          'id',
                                                          item.key,
                                                          item.name,
                                                          idStatus === 'Validated' ? 'approved' :
                                                          idStatus === 'Re-submit' ? 'resubmit' :
                                                          idStatus === 'Submitted' ? 'pending' : 'missing',
                                                          idRemarks
                                                        );
                                                      }}
                                                      disabled={!idValue || !(idData?.file_path || idData?.filePath)}
                                                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                        !idValue || !(idData?.file_path || idData?.filePath)
                                                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                          : 'bg-red-600 text-white hover:bg-red-700'
                                                      }`}
                                                    >
                                                      Validate
                                                    </button>
                                                  )}
                                                  {idStatus === 'Validated' && (
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

                                    {/* Driver's License Information Section */}
                                    {!employee.isAgency && isDeliveryCrew(employee) && employee.requirements.license !== undefined && (
                                      <div>
                                        <div className="flex items-center gap-2 mb-4">
                                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                          </div>
                                          <p className="text-sm font-semibold text-gray-800">Driver's License Information</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          {(() => {
                                            const licenseData = employee.requirements.license;
                                            const licenseStatus = typeof licenseData === 'object' ? (licenseData.status || 'missing') : 'missing';
                                            const front = licenseData?.frontFilePath || licenseData?.front_file_path;
                                            const back = licenseData?.backFilePath || licenseData?.back_file_path;
                                            const hasFile = Boolean(front && back);
                                            const rawStatus = normalizeStatus(licenseStatus);
                                            const validatedFront = licenseData?.validated_front_file_path || null;
                                            const validatedBack = licenseData?.validated_back_file_path || null;
                                            const alreadyReviewedThisFile =
                                              hasFile &&
                                              isSameStoragePath(front, validatedFront) &&
                                              isSameStoragePath(back, validatedBack);
                                            const hasNewUpload =
                                              hasFile &&
                                              (Boolean(validatedFront || validatedBack)) &&
                                              !alreadyReviewedThisFile;

                                            const effectiveStatus = hasFile
                                              ? (hasNewUpload
                                                  ? 'pending'
                                                  : (rawStatus === 'missing' ? 'pending' : rawStatus))
                                              : 'missing';
                                            const expired = hasFile && isExpiredDate(licenseData?.licenseExpiry || licenseData?.license_expiry);
                                            const displayStatus = expired ? 'expired' : effectiveStatus;
                                            const statusStyle = getStatusStyle(displayStatus);
                                            const canValidate =
                                              hasFile &&
                                              !alreadyReviewedThisFile &&
                                              // Allow validating if not approved yet, or if a new file was uploaded after approval.
                                              (rawStatus !== 'approved' || hasNewUpload);
                                            
                                            return (
                                              <div 
                                                className={`p-4 rounded-xl border-2 transition-all ${
                                                  expired
                                                    ? 'bg-red-50 border-red-300 shadow-sm'
                                                    : effectiveStatus === 'resubmit'
                                                      ? 'bg-red-50 border-red-200 shadow-sm' 
                                                      : effectiveStatus === 'missing' 
                                                        ? 'bg-orange-50/50 border-orange-200 border-dashed' 
                                                        : effectiveStatus === 'approved'
                                                          ? 'bg-green-50/50 border-green-200'
                                                          : 'bg-white border-gray-200'
                                                }`}
                                              >
                                                <div className="flex items-start justify-between gap-3">
                                                  <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                      <p className="text-sm font-semibold text-gray-800">Driver's License</p>
                                                      {expired && (
                                                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700 border border-red-200">
                                                          Expired
                                                        </span>
                                                      )}
                                                    </div>
                                                    {licenseData.licenseNumber && (
                                                      <div className="flex items-center gap-1.5 mt-1">
                                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                                        </svg>
                                                        <p className="text-xs text-gray-600 font-mono">{licenseData.licenseNumber}</p>
                                                      </div>
                                                    )}
                                                    {licenseData.licenseExpiry && (
                                                      <div className="flex items-center gap-1.5 mt-1">
                                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <p className="text-xs text-gray-500">Expires: <span className="font-medium">{formatDate(licenseData.licenseExpiry)}</span></p>
                                                      </div>
                                                    )}
                                                    {licenseData.submittedDate && (
                                                      <div className="flex items-center gap-1.5 mt-1">
                                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        <p className="text-xs text-gray-500">Submitted {formatDate(licenseData.submittedDate)}</p>
                                                      </div>
                                                    )}
                                                    {licenseData.frontFilePath && (
                                                      <div className="flex items-center gap-1.5 mt-1">
                                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                        </svg>
                                                        {getDocumentUrl(licenseData.frontFilePath) ? (
                                                          <a
                                                            href={getDocumentUrl(licenseData.frontFilePath)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                                                          >
                                                            View Front
                                                          </a>
                                                        ) : (
                                                          <span className="text-xs text-gray-500">Front file uploaded</span>
                                                        )}
                                                      </div>
                                                    )}
                                                    {licenseData.backFilePath && (
                                                      <div className="flex items-center gap-1.5 mt-1">
                                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                        </svg>
                                                        {getDocumentUrl(licenseData.backFilePath) ? (
                                                          <a
                                                            href={getDocumentUrl(licenseData.backFilePath)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                                                          >
                                                            View Back
                                                          </a>
                                                        ) : (
                                                          <span className="text-xs text-gray-500">Back file uploaded</span>
                                                        )}
                                                      </div>
                                                    )}
                                                    {licenseData.remarks && (
                                                      <div className="mt-2 p-2 bg-red-100/80 rounded-lg text-xs text-red-700 flex items-start gap-1.5">
                                                        <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                        </svg>
                                                        <span>{licenseData.remarks}</span>
                                                      </div>
                                                    )}
                                                  </div>
                                                  <div className="flex flex-col items-end gap-2">
                                                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                                                      {statusStyle.label}
                                                    </span>
                                                    {alreadyReviewedThisFile && rawStatus === 'resubmit' && (
                                                      <span className="text-[10px] text-gray-500">Awaiting new upload</span>
                                                    )}
                                                    {canValidate && (
                                                      <button 
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          openValidationModal(
                                                            employee.employeeId,
                                                            'license',
                                                            'license',
                                                            'Driver\'s License',
                                                            effectiveStatus,
                                                            licenseData.remarks || ''
                                                          );
                                                        }}
                                                        disabled={!front || !back}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                          !front || !back
                                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                            : 'bg-red-600 text-white hover:bg-red-700'
                                                        }`}
                                                      >
                                                        Validate
                                                      </button>
                                                    )}
                                                    {(licenseStatus === 'approved' || licenseStatus === 'Validated') && (
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
                                          })()}
                                        </div>
                                      </div>
                                    )}

                                    {/* Medical Examination Results Section */}
                                    {!employee.isAgency && employee.requirements.medicalExams !== undefined && (
                                      <div>
                                        <div className="flex items-center gap-2 mb-4">
                                          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                          </div>
                                          <p className="text-sm font-semibold text-gray-800">Medical Examination Results</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                          {medicalExams.map((exam) => {
                                            const examData = employee.requirements.medicalExams?.[exam.key] || {};
                                            const examStatus = typeof examData === 'object' && examData !== null ? (examData.status || 'missing') : 'missing';
                                            const validUntil = examData?.validUntil || examData?.valid_until;
                                            const filePath = examData?.filePath || examData?.file_path;
                                            const hasFile = Boolean(filePath);
                                            const rawStatus = normalizeStatus(examStatus);
                                            const validatedPath = examData?.validated_file_path || examData?.validatedFilePath || null;
                                            const submittedAt =
                                              examData?.submittedDate ||
                                              examData?.submitted_at ||
                                              examData?.uploaded_at ||
                                              null;
                                            const validatedAt = examData?.validated_at || examData?.validatedAt || null;

                                            // Legacy support: older records may not have validated_file_path.
                                            // If HR reviewed it and no newer upload happened since, treat the current file as the reviewed one.
                                            const hasNewUploadSinceReview =
                                              Boolean(validatedAt) && Boolean(submittedAt) && isAfterDateTime(submittedAt, validatedAt);
                                            const reviewedPath =
                                              validatedPath ||
                                              (validatedAt && !hasNewUploadSinceReview ? filePath : null);

                                            const alreadyReviewedThisFile =
                                              hasFile && Boolean(reviewedPath) && isSameStoragePath(filePath, reviewedPath);
                                            const hasNewUpload =
                                              hasFile && (hasNewUploadSinceReview || (Boolean(validatedPath) && !alreadyReviewedThisFile));

                                            const effectiveStatus = hasFile
                                              ? (hasNewUpload
                                                  ? 'pending'
                                                  : (rawStatus === 'missing' ? 'pending' : rawStatus))
                                              : 'missing';
                                            const expired = hasFile && isExpiredDate(validUntil);
                                            const displayStatus = expired ? 'expired' : effectiveStatus;
                                            const statusStyle = getStatusStyle(displayStatus);
                                            const canValidate =
                                              hasFile &&
                                              !alreadyReviewedThisFile &&
                                              (rawStatus !== 'approved' || hasNewUpload);
                                            
                                            return (
                                              <div 
                                                key={exam.key}
                                                className={`p-4 rounded-xl border-2 transition-all ${
                                                  expired
                                                    ? 'bg-red-50 border-red-300 shadow-sm'
                                                    : effectiveStatus === 'resubmit'
                                                      ? 'bg-red-50 border-red-200 shadow-sm' 
                                                      : effectiveStatus === 'missing' 
                                                        ? 'bg-orange-50/50 border-orange-200 border-dashed' 
                                                        : effectiveStatus === 'approved'
                                                          ? 'bg-green-50/50 border-green-200'
                                                          : 'bg-white border-gray-200'
                                                }`}
                                              >
                                                <div className="flex items-start justify-between gap-3">
                                                  <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                      <p className="text-sm font-semibold text-gray-800">{exam.name}</p>
                                                      {expired && (
                                                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700 border border-red-200">
                                                          Expired
                                                        </span>
                                                      )}
                                                    </div>
                                                    {validUntil && (
                                                      <div className="flex items-center gap-1.5 mt-1">
                                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <p className="text-xs text-gray-500">Valid until: <span className="font-medium">{formatDate(validUntil)}</span></p>
                                                      </div>
                                                    )}
                                                    {examData.submittedDate && (
                                                      <div className="flex items-center gap-1.5 mt-1">
                                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        <p className="text-xs text-gray-500">Submitted {formatDate(examData.submittedDate)}</p>
                                                      </div>
                                                    )}
                                                    {filePath && (
                                                      <div className="flex items-center gap-1.5 mt-1">
                                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                        </svg>
                                                        {getDocumentUrl(filePath) ? (
                                                          <a
                                                            href={getDocumentUrl(filePath)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                                                          >
                                                            View File
                                                          </a>
                                                        ) : (
                                                          <span className="text-xs text-gray-500">File uploaded</span>
                                                        )}
                                                      </div>
                                                    )}
                                                    {examData.remarks && (
                                                      <div className="mt-2 p-2 bg-red-100/80 rounded-lg text-xs text-red-700 flex items-start gap-1.5">
                                                        <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                        </svg>
                                                        <span>{examData.remarks}</span>
                                                      </div>
                                                    )}
                                                  </div>
                                                  <div className="flex flex-col items-end gap-2">
                                                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                                                      {statusStyle.label}
                                                    </span>
                                                    {alreadyReviewedThisFile && rawStatus === 'resubmit' && (
                                                      <span className="text-[10px] text-gray-500">Awaiting new upload</span>
                                                    )}
                                                    {canValidate && (
                                                      <button 
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          openValidationModal(
                                                            employee.employeeId,
                                                            'medical',
                                                            exam.key,
                                                            exam.name,
                                                            effectiveStatus,
                                                            examData.remarks || ''
                                                          );
                                                        }}
                                                        disabled={!filePath}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                          !filePath
                                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                            : 'bg-red-600 text-white hover:bg-red-700'
                                                        }`}
                                                      >
                                                        Validate
                                                      </button>
                                                    )}
                                                    {(examStatus === 'approved' || examStatus === 'Validated') && (
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
                                    )}

                                    {/* Personal Documents Section */}
                                    {!employee.isAgency && employee.requirements.personalDocuments !== undefined && (
                                      <div>
                                        <div className="flex items-center gap-2 mb-4">
                                          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                          </div>
                                          <p className="text-sm font-semibold text-gray-800">Personal Documents</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          {personalDocuments.map((doc) => {
                                            const rule = getPersonalDocRule(doc, employee);
                                            if (!rule.applicable) return null;
                                            const docData = employee.requirements.personalDocuments?.[doc.key] || {};
                                            const docStatus = typeof docData === 'object' && docData !== null ? (docData.status || 'missing') : 'missing';
                                            const statusStyle = getStatusStyle(
                                              docStatus === 'approved' || docStatus === 'Validated' ? 'approved' :
                                              docStatus === 'resubmit' || docStatus === 'Re-submit' ? 'resubmit' :
                                              docStatus === 'pending' || docStatus === 'Submitted' ? 'pending' : 'missing'
                                            );
                                            const needsAction = docStatus === 'missing' || docStatus === 'resubmit' || docStatus === 'Re-submit';
                                            
                                            return (
                                              <div 
                                                key={doc.key}
                                                className={`p-4 rounded-xl border-2 transition-all ${
                                                  docStatus === 'resubmit' || docStatus === 'Re-submit'
                                                    ? 'bg-red-50 border-red-200 shadow-sm' 
                                                    : docStatus === 'missing' 
                                                      ? 'bg-orange-50/50 border-orange-200 border-dashed' 
                                                      : docStatus === 'approved' || docStatus === 'Validated'
                                                        ? 'bg-green-50/50 border-green-200'
                                                        : 'bg-white border-gray-200'
                                                }`}
                                              >
                                                <div className="flex items-start justify-between gap-3">
                                                  <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                      <p className="text-sm font-semibold text-gray-800">{doc.name}</p>
                                                      {doc.note && (
                                                        <span className="text-xs text-gray-500 italic">({doc.note})</span>
                                                      )}
                                                    </div>
                                                    {docData.submittedDate && (
                                                      <div className="flex items-center gap-1.5 mt-1">
                                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        <p className="text-xs text-gray-500">Submitted {formatDate(docData.submittedDate)}</p>
                                                      </div>
                                                    )}
                                                    {docData.filePath && (
                                                      <div className="flex items-center gap-1.5 mt-1">
                                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                        </svg>
                                                        {getDocumentUrl(docData.filePath) ? (
                                                          <a
                                                            href={getDocumentUrl(docData.filePath)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                                                          >
                                                            View File
                                                          </a>
                                                        ) : (
                                                          <span className="text-xs text-gray-500">File uploaded</span>
                                                        )}
                                                      </div>
                                                    )}
                                                    {docData.remarks && (
                                                      <div className="mt-2 p-2 bg-red-100/80 rounded-lg text-xs text-red-700 flex items-start gap-1.5">
                                                        <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                        </svg>
                                                        <span>{docData.remarks}</span>
                                                      </div>
                                                    )}
                                                  </div>
                                                  <div className="flex flex-col items-end gap-2">
                                                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                                                      {statusStyle.label}
                                                    </span>
                                                    {(needsAction || docStatus === 'pending' || docStatus === 'Submitted') && (
                                                      <button 
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          openValidationModal(
                                                            employee.employeeId,
                                                            'personal',
                                                            doc.key,
                                                            doc.name,
                                                            docStatus === 'approved' || docStatus === 'Validated' ? 'approved' :
                                                            docStatus === 'resubmit' || docStatus === 'Re-submit' ? 'resubmit' :
                                                            docStatus === 'pending' || docStatus === 'Submitted' ? 'pending' : 'missing',
                                                            docData.remarks || ''
                                                          );
                                                        }}
                                                        disabled={!docData.filePath}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                          !docData.filePath
                                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                            : 'bg-red-600 text-white hover:bg-red-700'
                                                        }`}
                                                      >
                                                        Validate
                                                      </button>
                                                    )}
                                                    {(docStatus === 'approved' || docStatus === 'Validated') && (
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
                                    )}

                                    {/* Clearances Section */}
                                    {!employee.isAgency && employee.requirements.clearances !== undefined && (
                                      <div>
                                        <div className="flex items-center gap-2 mb-4">
                                          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                            </svg>
                                          </div>
                                          <p className="text-sm font-semibold text-gray-800">Clearances</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                          {clearances.map((clearance) => {
                                            const clearanceData = employee.requirements.clearances?.[clearance.key] || {};
                                            const clearanceStatus = typeof clearanceData === 'object' && clearanceData !== null ? (clearanceData.status || 'missing') : 'missing';
                                            const validUntil = clearanceData?.dateValidity || clearanceData?.date_validity;
                                            const filePath = clearanceData?.filePath || clearanceData?.file_path;
                                            const hasFile = Boolean(filePath);
                                            const rawStatus = normalizeStatus(clearanceStatus);
                                            const validatedPath = clearanceData?.validated_file_path || clearanceData?.validatedFilePath || null;
                                            const submittedAt =
                                              clearanceData?.submittedDate ||
                                              clearanceData?.submitted_at ||
                                              clearanceData?.uploaded_at ||
                                              null;
                                            const validatedAt = clearanceData?.validated_at || clearanceData?.validatedAt || null;

                                            const hasNewUploadSinceReview =
                                              Boolean(validatedAt) && Boolean(submittedAt) && isAfterDateTime(submittedAt, validatedAt);
                                            const reviewedPath =
                                              validatedPath ||
                                              (validatedAt && !hasNewUploadSinceReview ? filePath : null);

                                            const alreadyReviewedThisFile =
                                              hasFile && Boolean(reviewedPath) && isSameStoragePath(filePath, reviewedPath);
                                            const hasNewUpload =
                                              hasFile && (hasNewUploadSinceReview || (Boolean(validatedPath) && !alreadyReviewedThisFile));

                                            const effectiveStatus = hasFile
                                              ? (hasNewUpload
                                                  ? 'pending'
                                                  : (rawStatus === 'missing' ? 'pending' : rawStatus))
                                              : 'missing';
                                            const expired = hasFile && isExpiredDate(validUntil);
                                            const displayStatus = expired ? 'expired' : effectiveStatus;
                                            const statusStyle = getStatusStyle(displayStatus);
                                            const canValidate =
                                              hasFile &&
                                              !alreadyReviewedThisFile &&
                                              (rawStatus !== 'approved' || hasNewUpload);
                                            
                                            return (
                                              <div 
                                                key={clearance.key}
                                                className={`p-4 rounded-xl border-2 transition-all ${
                                                  expired
                                                    ? 'bg-red-50 border-red-300 shadow-sm'
                                                    : effectiveStatus === 'resubmit'
                                                      ? 'bg-red-50 border-red-200 shadow-sm' 
                                                      : effectiveStatus === 'missing' 
                                                        ? 'bg-orange-50/50 border-orange-200 border-dashed' 
                                                        : effectiveStatus === 'approved'
                                                          ? 'bg-green-50/50 border-green-200'
                                                          : 'bg-white border-gray-200'
                                                }`}
                                              >
                                                <div className="flex items-start justify-between gap-3">
                                                  <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                      <p className="text-sm font-semibold text-gray-800">{clearance.name}</p>
                                                      {expired && (
                                                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700 border border-red-200">
                                                          Expired
                                                        </span>
                                                      )}
                                                    </div>
                                                    {validUntil && (
                                                      <div className="flex items-center gap-1.5 mt-1">
                                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <p className="text-xs text-gray-500">Valid until: <span className="font-medium">{formatDate(validUntil)}</span></p>
                                                      </div>
                                                    )}
                                                    {clearanceData.submittedDate && (
                                                      <div className="flex items-center gap-1.5 mt-1">
                                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        <p className="text-xs text-gray-500">Submitted {formatDate(clearanceData.submittedDate)}</p>
                                                      </div>
                                                    )}
                                                    {filePath && (
                                                      <div className="flex items-center gap-1.5 mt-1">
                                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                        </svg>
                                                        {getDocumentUrl(filePath) ? (
                                                          <a
                                                            href={getDocumentUrl(filePath)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                                                          >
                                                            View File
                                                          </a>
                                                        ) : (
                                                          <span className="text-xs text-gray-500">File uploaded</span>
                                                        )}
                                                      </div>
                                                    )}
                                                    {clearanceData.remarks && (
                                                      <div className="mt-2 p-2 bg-red-100/80 rounded-lg text-xs text-red-700 flex items-start gap-1.5">
                                                        <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                        </svg>
                                                        <span>{clearanceData.remarks}</span>
                                                      </div>
                                                    )}
                                                  </div>
                                                  <div className="flex flex-col items-end gap-2">
                                                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                                                      {statusStyle.label}
                                                    </span>
                                                    {alreadyReviewedThisFile && rawStatus === 'resubmit' && (
                                                      <span className="text-[10px] text-gray-500">Awaiting new upload</span>
                                                    )}
                                                    {canValidate && (
                                                      <button 
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          openValidationModal(
                                                            employee.employeeId,
                                                            'clearance',
                                                            clearance.key,
                                                            clearance.name,
                                                            effectiveStatus,
                                                            clearanceData.remarks || ''
                                                          );
                                                        }}
                                                        disabled={!filePath}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                          !filePath
                                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                            : 'bg-red-600 text-white hover:bg-red-700'
                                                        }`}
                                                      >
                                                        Validate
                                                      </button>
                                                    )}
                                                    {(clearanceStatus === 'approved' || clearanceStatus === 'Validated') && (
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
                                    )}

                                    {/* Educational Documents Section */}
                                    {!employee.isAgency && hasEducationalAttainment(employee) && employee.requirements.educationalDocuments !== undefined && (
                                      <div>
                                        <div className="flex items-center gap-2 mb-4">
                                          <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                            </svg>
                                          </div>
                                          <p className="text-sm font-semibold text-gray-800">Educational Documents</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          {educationalDocuments.map((doc) => {
                                            const docData = employee.requirements.educationalDocuments?.[doc.key] || {};
                                            const docStatus = typeof docData === 'object' && docData !== null ? (docData.status || 'missing') : 'missing';
                                            const statusStyle = getStatusStyle(
                                              docStatus === 'approved' || docStatus === 'Validated' ? 'approved' :
                                              docStatus === 'resubmit' || docStatus === 'Re-submit' ? 'resubmit' :
                                              docStatus === 'pending' || docStatus === 'Submitted' ? 'pending' : 'missing'
                                            );
                                            const needsAction = docStatus === 'missing' || docStatus === 'resubmit' || docStatus === 'Re-submit';
                                            
                                            return (
                                              <div 
                                                key={doc.key}
                                                className={`p-4 rounded-xl border-2 transition-all ${
                                                  docStatus === 'resubmit' || docStatus === 'Re-submit'
                                                    ? 'bg-red-50 border-red-200 shadow-sm' 
                                                    : docStatus === 'missing' 
                                                      ? 'bg-orange-50/50 border-orange-200 border-dashed' 
                                                      : docStatus === 'approved' || docStatus === 'Validated'
                                                        ? 'bg-green-50/50 border-green-200'
                                                        : 'bg-white border-gray-200'
                                                }`}
                                              >
                                                <div className="flex items-start justify-between gap-3">
                                                  <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                      <p className="text-sm font-semibold text-gray-800">{doc.name}</p>
                                                    </div>
                                                    {docData.submittedDate && (
                                                      <div className="flex items-center gap-1.5 mt-1">
                                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        <p className="text-xs text-gray-500">Submitted {formatDate(docData.submittedDate)}</p>
                                                      </div>
                                                    )}
                                                    {docData.filePath && (
                                                      <div className="flex items-center gap-1.5 mt-1">
                                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                        </svg>
                                                        {getDocumentUrl(docData.filePath) ? (
                                                          <a
                                                            href={getDocumentUrl(docData.filePath)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                                                          >
                                                            View File
                                                          </a>
                                                        ) : (
                                                          <span className="text-xs text-gray-500">File uploaded</span>
                                                        )}
                                                      </div>
                                                    )}
                                                    {docData.remarks && (
                                                      <div className="mt-2 p-2 bg-red-100/80 rounded-lg text-xs text-red-700 flex items-start gap-1.5">
                                                        <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                        </svg>
                                                        <span>{docData.remarks}</span>
                                                      </div>
                                                    )}
                                                  </div>
                                                  <div className="flex flex-col items-end gap-2">
                                                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                                                      {statusStyle.label}
                                                    </span>
                                                    {(needsAction || docStatus === 'pending' || docStatus === 'Submitted') && (
                                                      <button 
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          openValidationModal(
                                                            employee.employeeId,
                                                            'educational',
                                                            doc.key,
                                                            doc.name,
                                                            docStatus === 'approved' || docStatus === 'Validated' ? 'approved' :
                                                            docStatus === 'resubmit' || docStatus === 'Re-submit' ? 'resubmit' :
                                                            docStatus === 'pending' || docStatus === 'Submitted' ? 'pending' : 'missing',
                                                            docData.remarks || ''
                                                          );
                                                        }}
                                                        disabled={!docData.filePath}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                          !docData.filePath
                                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                            : 'bg-red-600 text-white hover:bg-red-700'
                                                        }`}
                                                      >
                                                        Validate
                                                      </button>
                                                    )}
                                                    {(docStatus === 'approved' || docStatus === 'Validated') && (
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
                                    )}
                                  </div>
                                )}

                                {/* HR Requested Documents Section - Show for both agency and direct employees */}
                                {employee.hrRequests && employee.hrRequests.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-2 mb-4">
                                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                      </div>
                                      <p className="text-sm font-semibold text-gray-800">HR Requested Documents</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {employee.hrRequests.map((req) => {
                                        const reqStatus = normalizeStatus(req.status || 'pending');
                                        const reqFilePath = req.file_path || req.filePath || null;
                                        const hasFile = Boolean(reqFilePath);
                                        const validatedPath = req.validated_file_path || null;
                                        const submittedAt = req.submitted_at || req.uploaded_at || null;
                                        const validatedAt = req.validated_at || null;

                                        const hasNewUploadSinceReview =
                                          Boolean(validatedAt) && Boolean(submittedAt) && isAfterDateTime(submittedAt, validatedAt);
                                        const reviewedPath =
                                          validatedPath ||
                                          (validatedAt && !hasNewUploadSinceReview ? reqFilePath : null);

                                        const alreadyReviewedThisFile =
                                          hasFile && Boolean(reviewedPath) && isSameStoragePath(reqFilePath, reviewedPath);
                                        const hasNewUpload =
                                          hasFile && (hasNewUploadSinceReview || (Boolean(validatedPath) && !alreadyReviewedThisFile));
                                        // Normalize to match other cards:
                                        // - no file => missing
                                        // - file + missing => pending (awaiting validation)
                                        // - file + pending => pending
                                        // - resubmit/approved remain
                                        const effectiveStatus = hasFile
                                          ? (hasNewUpload
                                              ? 'pending'
                                              : (reqStatus === 'missing' ? 'pending' : reqStatus))
                                          : 'missing';
                                        const statusStyle = getStatusStyle(
                                          effectiveStatus === 'approved' || effectiveStatus === 'Validated' ? 'approved' :
                                          effectiveStatus === 'resubmit' || effectiveStatus === 'Re-submit' ? 'resubmit' :
                                          effectiveStatus === 'pending' ? 'pending' : 'missing'
                                        );
                                        const needsAction = effectiveStatus === 'missing' || effectiveStatus === 'resubmit' || effectiveStatus === 'Re-submit';
                                        const canValidate = hasFile && !alreadyReviewedThisFile && (reqStatus !== 'approved' || hasNewUpload);
                                        
                                        return (
                                          <div 
                                            key={req.id} 
                                            className={`p-4 rounded-xl border-2 transition-all ${
                                              effectiveStatus === 'resubmit' || effectiveStatus === 'Re-submit'
                                                ? 'bg-red-50 border-red-200 shadow-sm' 
                                                : effectiveStatus === 'missing' 
                                                  ? 'bg-orange-50/50 border-orange-200 border-dashed' 
                                                  : effectiveStatus === 'approved' || effectiveStatus === 'Validated'
                                                    ? 'bg-green-50/50 border-green-200'
                                                    : 'bg-white border-gray-200'
                                            }`}
                                          >
                                            <div className="flex items-start justify-between gap-3">
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <p className="text-sm font-semibold text-gray-800">{req.document || req.document_type}</p>
                                                  {(req.priority === 'high' || req.priority === 'urgent') && (
                                                    <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold">Urgent</span>
                                                  )}
                                                </div>
                                                {req.deadline && (
                                                  <div className="flex items-center gap-1.5 mt-1">
                                                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <p className="text-xs text-gray-500">Deadline: <span className="font-medium">{formatDate(req.deadline)}</span></p>
                                                  </div>
                                                )}
                                                {req.requested_at && (
                                                  <div className="flex items-center gap-1.5 mt-1">
                                                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    <p className="text-xs text-gray-500">Requested {formatDate(req.requested_at)}</p>
                                                  </div>
                                                )}
                                                {reqFilePath && (
                                                  <div className="flex items-center gap-1.5 mt-1">
                                                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                    </svg>
                                                    {getDocumentUrl(reqFilePath) ? (
                                                      <a
                                                        href={getDocumentUrl(reqFilePath)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                                                      >
                                                        View File
                                                      </a>
                                                    ) : (
                                                      <span className="text-xs text-gray-500">File uploaded</span>
                                                    )}
                                                  </div>
                                                )}
                                                {(req.description || req.remarks) && (
                                                  <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 flex items-start gap-1.5">
                                                    <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    <span>{req.description || req.remarks}</span>
                                                  </div>
                                                )}
                                              </div>
                                              <div className="flex flex-col items-end gap-2">
                                                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                                                  {statusStyle.label}
                                                </span>
                                                {alreadyReviewedThisFile && reqStatus === 'resubmit' && (
                                                  <span className="text-[10px] text-gray-500">Awaiting new upload</span>
                                                )}
                                                {canValidate && (needsAction || effectiveStatus === 'pending') && (
                                                  <button 
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      openValidationModal(
                                                        employee.employeeId,
                                                        'hr_request',
                                                        req.id,
                                                        req.document || req.document_type || 'HR Requested Document',
                                                        effectiveStatus === 'approved' || effectiveStatus === 'Validated' ? 'approved' :
                                                        effectiveStatus === 'resubmit' || effectiveStatus === 'Re-submit' ? 'resubmit' :
                                                        effectiveStatus === 'pending' ? 'pending' : 'missing',
                                                        req.remarks || ''
                                                      );
                                                    }}
                                                    disabled={!hasFile}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                      !hasFile
                                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                        : 'bg-red-600 text-white hover:bg-red-700'
                                                    }`}
                                                  >
                                                    Validate
                                                  </button>
                                                )}
                                                {(effectiveStatus === 'approved' || effectiveStatus === 'Validated') && (
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
                                )}

                                {/* Quick Actions */}
                                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openRequestModal(employee.employeeId, employee.name, employee.isAgency);
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Request Document
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} employees
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Request Document Modal */}
      {showRequestModal && requestTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Request Additional Document</h3>
              <p className="text-sm text-gray-500 mt-1">Requesting from: <span className="font-medium">{requestTarget.employeeName}</span> ({requestTarget.isAgency ? 'Agency' : 'Direct Employee'})</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Document Type <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  list="hr-doc-suggestions"
                  value={requestForm.documentType}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, documentType: e.target.value }))}
                  placeholder="e.g., NBI Clearance, Medical Certificate, etc."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
                <datalist id="hr-doc-suggestions">
                  {requestDocSuggestions.map((opt) => (
                    <option key={opt} value={opt} />
                  ))}
                </datalist>
                <p className="text-xs text-gray-500 mt-1">
                  Suggestions only show documents not currently required for this employee.
                </p>
                {requestDocDuplicate && (
                  <div className="mt-2 p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                    This document is already required for this employee. Please choose a different document.
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Deadline <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={requestForm.deadline}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, deadline: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
                {requestDeadlineSoon && (
                  <div className="mt-2 p-2 rounded-lg bg-yellow-50 border border-yellow-200 text-xs text-yellow-800">
                    Warning: deadline is within 7 days ({requestDeadlineDays} day{requestDeadlineDays === 1 ? '' : 's'}).
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
              <button
                onClick={closeRequestModal}
                className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestSubmit}
                disabled={requesting || requestDocDuplicate}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  requesting || requestDocDuplicate
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {requesting ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Document Modal */}
      {showViewDocumentModal && viewDocumentTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full shadow-xl">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">View Document</h3>
                <p className="text-sm text-gray-500 mt-1">{viewDocumentTarget.documentName}</p>
              </div>
              <button
                onClick={closeViewDocument}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">File Path:</span> {viewDocumentTarget.filePath}
                </p>
                <div className="flex gap-2 mt-4">
                  <a
                    href={getDocumentUrl(viewDocumentTarget.filePath) || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open in New Tab
                  </a>
                  <button
                    onClick={() => handleDownloadDocument(viewDocumentTarget.filePath)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>
                </div>
              </div>
              {getDocumentUrl(viewDocumentTarget.filePath) && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <iframe
                    src={getDocumentUrl(viewDocumentTarget.filePath)}
                    className="w-full h-96"
                    title="Document Preview"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Validation Modal */}
      {showValidationModal && validationTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Validate Requirement</h3>
              <p className="text-sm text-gray-500 mt-1">{validationTarget.name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={validationForm.status}
                  onChange={(e) => setValidationForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                >
                  <option value="Validated">Validated</option>
                  <option value="Re-submit">Re-submit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Remarks (Optional)</label>
                <textarea
                  value={validationForm.remarks}
                  onChange={(e) => setValidationForm(prev => ({ ...prev, remarks: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  placeholder="Add any remarks or notes..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
              <button
                onClick={closeValidationModal}
                className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleValidationSubmit}
                disabled={validating}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  validating
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {validating ? 'Validating...' : 'Submit Validation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {showSuccessAlert && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{alertMessage}</span>
          <button onClick={() => setShowSuccessAlert(false)} className="ml-4 hover:text-green-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Error Alert */}
      {showErrorAlert && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>{alertMessage}</span>
          <button onClick={() => setShowErrorAlert(false)} className="ml-4 hover:text-red-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default HrRequirements;

