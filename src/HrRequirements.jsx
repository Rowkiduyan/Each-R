// src/HrRequirements.jsx
import React, { useState, useRef, useEffect, useMemo } from "react";
import { supabase } from "./supabaseClient";
import { PieChart, Pie, Cell, Tooltip } from "recharts";

function HrRequirements() {
  // Tab, filter, and search state
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState(null);
  const itemsPerPage = 8;

  // Get current user info from localStorage
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    const stored = localStorage.getItem("loggedInHR");
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch (err) {
        console.error("Failed to parse loggedInHR:", err);
      }
    }
  }, []);

  // Advanced filters
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState('all'); // 'all', 'agency', 'direct'
  const [positionFilter, setPositionFilter] = useState('All');
  const [depotFilter, setDepotFilter] = useState('All');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const advancedFiltersRef = useRef(null);

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
  const [requestForm, setRequestForm] = useState({ documentType: '', description: '', priority: 'normal', deadline: '' });
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

  // Depot list for compliance monitoring
  const depots = [
    "Pasig","Cagayan","Butuan","Davao","Cebu","Laguna","Iloilo",
    "Bacolod","Zamboanga","Manila","Quezon City","Taguig",
    "Baguio","General Santos","Palawan","Olongapo","Tacloban",
    "Roxas","Legazpi","Cauayan","Cavite","Batangas","Ormoc","Koronadal",
    "Calbayog","Catbalogan","Tuguegarao","Baler","Iligan","Koronadal City"
  ];
  
  const COLORS = ["#4ade80", "#f87171"];

  // Depot compliance data
  const depotCompliance = depots.map((d, i) => ({
    name: d,
    compliance: 70 + (i % 10),
    nonCompliance: 30 - (i % 10),
  }));

  const displayedDepots = showAllDepots
    ? depotCompliance
    : depotCompliance.slice(0, 5);

  // Load all employees and their requirements
  useEffect(() => {
    const loadEmployees = async () => {
      setLoading(true);
      setError(null);
      try {
        // Get all deployed employees (have hired_at)
        const { data: employeesData, error: empError } = await supabase
          .from('employees')
          .select('id, email, fname, lname, mname, position, depot, hired_at, date_hired, requirements, is_agency, agency_profile_id')
          .not('hired_at', 'is', null) // Only deployed employees
          .order('hired_at', { ascending: false });

        if (empError) throw empError;

        if (employeesData && employeesData.length > 0) {
          // Map employees to the expected structure
          const mappedEmployees = employeesData.map(emp => {
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
                id: req.id || Date.now().toString(),
                document: req.document_type || req.document || '',
                description: req.description || req.remarks || '',
                priority: req.priority || 'normal',
                requested_at: req.requested_at || new Date().toISOString(),
                requested_by: req.requested_by || 'HR',
                status: req.status || 'pending',
                deadline: req.deadline || null,
                remarks: req.remarks || req.description || null,
                file_path: req.file_path || null,
                submitted_at: req.submitted_at || null,
              }));
            }

            // Build employee name
            const name = `${emp.fname || ''} ${emp.mname || ''} ${emp.lname || ''}`.trim() || emp.email || 'Unknown';

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

  // Calculate requirement status for an employee
  const getEmployeeStatus = (employee) => {
    const reqs = employee.requirements;
    const isAgency = employee.isAgency;
    
    if (isAgency) {
      // Agency employees: check ID number requirements
      const hasResubmit = Object.values(reqs).some(r => r && typeof r === 'object' && r.status === 'resubmit');
      const hasMissing = Object.values(reqs).some(r => r && typeof r === 'object' && r.status === 'missing');
      const hasPending = Object.values(reqs).some(r => r && typeof r === 'object' && r.status === 'pending');
      const allApproved = Object.values(reqs).every(r => r && typeof r === 'object' && r.status === 'approved');
      
      if (hasResubmit) return 'action_required';
      if (hasMissing) return 'incomplete';
      if (hasPending) return 'pending';
      if (allApproved) return 'complete';
      return 'pending';
    } else {
      // Direct applicants: check all document sections
      const idNums = reqs.id_numbers || {};
      const license = reqs.license || {};
      const medicalExams = reqs.medicalExams || {};
      const personalDocs = reqs.personalDocuments || {};
      const clearances = reqs.clearances || {};
      const educationalDocs = reqs.educationalDocuments || {};
      const documents = reqs.documents || []; // Legacy documents array
      
      // Helper function to get status from a document object
      const getDocStatus = (doc) => {
        if (!doc) return 'missing';
        if (typeof doc === 'string') return doc;
        return doc.status || 'missing';
      };
      
      // Check ID numbers status
      const idStatuses = Object.values(idNums).map(id => id?.status || 'missing');
      const hasIdResubmit = idStatuses.some(s => s === 'Re-submit');
      const hasIdMissing = idStatuses.some(s => s === 'missing');
      const hasIdPending = idStatuses.some(s => s === 'Submitted' || s === 'pending');
      const allIdsValidated = idStatuses.every(s => s === 'Validated');
      
      // Check license status
      const licenseStatus = getDocStatus(license);
      const hasLicenseResubmit = licenseStatus === 'resubmit' || licenseStatus === 'Re-submit';
      const hasLicenseMissing = licenseStatus === 'missing';
      const hasLicensePending = licenseStatus === 'pending' || licenseStatus === 'Submitted';
      const licenseValidated = licenseStatus === 'approved' || licenseStatus === 'Validated';
      
      // Check medical exams status
      const medicalStatuses = Object.values(medicalExams).map(getDocStatus);
      const hasMedicalResubmit = medicalStatuses.some(s => s === 'resubmit' || s === 'Re-submit');
      const hasMedicalMissing = medicalStatuses.some(s => s === 'missing');
      const hasMedicalPending = medicalStatuses.some(s => s === 'pending' || s === 'Submitted');
      const allMedicalValidated = medicalStatuses.length > 0 && medicalStatuses.every(s => s === 'approved' || s === 'Validated');
      
      // Check personal documents status
      const personalStatuses = Object.values(personalDocs).map(getDocStatus);
      const hasPersonalResubmit = personalStatuses.some(s => s === 'resubmit' || s === 'Re-submit');
      const hasPersonalMissing = personalStatuses.some(s => s === 'missing');
      const hasPersonalPending = personalStatuses.some(s => s === 'pending' || s === 'Submitted');
      const allPersonalValidated = personalStatuses.length > 0 && personalStatuses.every(s => s === 'approved' || s === 'Validated');
      
      // Check clearances status
      const clearanceStatuses = Object.values(clearances).map(getDocStatus);
      const hasClearanceResubmit = clearanceStatuses.some(s => s === 'resubmit' || s === 'Re-submit');
      const hasClearanceMissing = clearanceStatuses.some(s => s === 'missing');
      const hasClearancePending = clearanceStatuses.some(s => s === 'pending' || s === 'Submitted');
      const allClearanceValidated = clearanceStatuses.length > 0 && clearanceStatuses.every(s => s === 'approved' || s === 'Validated');
      
      // Check educational documents status
      const educationalStatuses = Object.values(educationalDocs).map(getDocStatus);
      const hasEducationalResubmit = educationalStatuses.some(s => s === 'resubmit' || s === 'Re-submit');
      const hasEducationalMissing = educationalStatuses.some(s => s === 'missing');
      const hasEducationalPending = educationalStatuses.some(s => s === 'pending' || s === 'Submitted');
      const allEducationalValidated = educationalStatuses.length > 0 && educationalStatuses.every(s => s === 'approved' || s === 'Validated');
      
      // Check legacy documents status
      const docStatuses = documents.map(doc => doc?.status || 'No File');
      const hasDocResubmit = docStatuses.some(s => s === 'Re-submit');
      const hasDocMissing = docStatuses.some(s => s === 'No File' || s === 'missing');
      const hasDocPending = docStatuses.some(s => s === 'Submitted' || s === 'pending');
      const allDocsValidated = docStatuses.length > 0 && docStatuses.every(s => s === 'Validated');
      
      // Aggregate all statuses
      const hasResubmit = hasIdResubmit || hasLicenseResubmit || hasMedicalResubmit || hasPersonalResubmit || hasClearanceResubmit || hasEducationalResubmit || hasDocResubmit;
      const hasMissing = hasIdMissing || hasLicenseMissing || hasMedicalMissing || hasPersonalMissing || hasClearanceMissing || hasEducationalMissing || hasDocMissing;
      const hasPending = hasIdPending || hasLicensePending || hasMedicalPending || hasPersonalPending || hasClearancePending || hasEducationalPending || hasDocPending;
      const allValidated = allIdsValidated && licenseValidated && allMedicalValidated && allPersonalValidated && allClearanceValidated && allEducationalValidated && allDocsValidated;
      
      if (hasResubmit) return 'action_required';
      if (hasMissing) return 'incomplete';
      if (hasPending) return 'pending';
      if (allValidated) return 'complete';
      return 'pending';
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    // Filter employees by depot for HRC users
    let filteredEmployees = employees;
    if (currentUser?.role?.toUpperCase() === 'HRC' && currentUser?.depot) {
      filteredEmployees = employees.filter(e => e.depot === currentUser.depot);
    }

    return {
      actionRequired: filteredEmployees.filter(e => getEmployeeStatus(e) === 'action_required').length,
      incomplete: filteredEmployees.filter(e => getEmployeeStatus(e) === 'incomplete').length,
      pending: filteredEmployees.filter(e => getEmployeeStatus(e) === 'pending').length,
      complete: filteredEmployees.filter(e => getEmployeeStatus(e) === 'complete').length,
      total: filteredEmployees.length,
    };
  }, [employees, currentUser]);

  // Get unique positions and depots for filters
  const uniquePositions = useMemo(() => {
    const positions = new Set(employees.map(e => e.position).filter(Boolean));
    return Array.from(positions).sort();
  }, [employees]);

  const uniqueDepots = useMemo(() => {
    const depots = new Set(employees.map(e => e.depot).filter(Boolean));
    return Array.from(depots).sort();
  }, [employees]);

  // Close advanced filters when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (advancedFiltersRef.current && !advancedFiltersRef.current.contains(event.target)) {
        setShowAdvancedFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter data based on active tab, search, and filters
  const getFilteredData = () => {
    let data = [...employees];

    // Filter by depot for HRC users first
    if (currentUser?.role?.toUpperCase() === 'HRC' && currentUser?.depot) {
      data = data.filter(e => e.depot === currentUser.depot);
    }

    // Filter by employee type (agency vs direct)
    if (employeeTypeFilter === 'agency') {
      data = data.filter(e => e.isAgency);
    } else if (employeeTypeFilter === 'direct') {
      data = data.filter(e => !e.isAgency);
    }

    // Filter by status tab
    if (activeTab !== 'all') {
      data = data.filter(e => getEmployeeStatus(e) === activeTab);
    }

    // Filter by position
    if (positionFilter !== 'All') {
      data = data.filter(e => e.position === positionFilter);
    }

    // Filter by depot
    if (depotFilter !== 'All') {
      data = data.filter(e => e.depot === depotFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter(e => 
        e.name.toLowerCase().includes(query) ||
        e.position.toLowerCase().includes(query) ||
        e.depot.toLowerCase().includes(query) ||
        e.email.toLowerCase().includes(query) ||
        String(e.id).includes(query)
      );
    }

    return data;
  };

  // Export function
  const handleExport = () => {
    const filteredData = getFilteredData();
    
    // Prepare CSV data
    const headers = ['Name', 'Email', 'Position', 'Depot', 'Type', 'Status', 'Progress', 'Deployed Date'];
    const rows = filteredData.map(emp => {
      const status = getEmployeeStatus(emp);
      const statusBadge = getEmployeeStatusBadge(status);
      const progress = getRequirementsProgress(emp);
      
      return [
        emp.name || '',
        emp.email || '',
        emp.position || '',
        emp.depot || '',
        emp.isAgency ? 'Agency' : 'Direct',
        statusBadge.label,
        `${progress.approved}/${progress.total}`,
        formatDate(emp.deployedDate) || '',
      ];
    });

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `employee_requirements_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredData = getFilteredData();
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Helpers
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusStyle = (status) => {
    const styles = {
      approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
      submitted: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Submitted' },
      resubmit: { bg: 'bg-red-100', text: 'text-red-700', label: 'Re-submit' },
      missing: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Missing' },
    };
    return styles[status] || styles.pending;
  };

  const getEmployeeStatusBadge = (status) => {
    const styles = {
      complete: { text: 'text-green-600', label: 'Complete' },
      pending: { text: 'text-yellow-600', label: 'Doc Requests' },
      incomplete: { text: 'text-orange-600', label: 'Incomplete' },
      action_required: { text: 'text-red-600', label: 'Action Required' },
    };
    return styles[status] || styles.pending;
  };

  const getRequirementsProgress = (employee) => {
    const isAgency = employee.isAgency;
    
    if (isAgency) {
      // Agency employees: count ID number requirements
      const reqs = Object.values(employee.requirements).filter(r => r && typeof r === 'object');
      // Count files that have been uploaded (hasFile) or are approved
      const uploaded = reqs.filter(r => r.hasFile || r.status === 'approved' || r.status === 'pending').length;
      const approved = reqs.filter(r => r.status === 'approved').length;
      return { approved, uploaded, total: reqs.length || 4 }; // Default to 4 if empty
    } else {
      // Direct applicants: count all sections
      const idNums = employee.requirements.id_numbers || {};
      const license = employee.requirements.license || {};
      const medicalExams = employee.requirements.medicalExams || {};
      const personalDocs = employee.requirements.personalDocuments || {};
      const clearances = employee.requirements.clearances || {};
      const educationalDocs = employee.requirements.educationalDocuments || {};
      const documents = employee.requirements.documents || []; // Legacy documents
      
      // Helper to get status
      const getDocStatus = (doc) => {
        if (!doc) return 'missing';
        if (typeof doc === 'string') return doc;
        return doc.status || 'missing';
      };
      
      // Count totals - use actual expected counts, not defaults
      // ID Numbers: SSS, TIN, PAG-IBIG, PhilHealth = 4
      const idCount = 4;
      // Driver's License = 1
      const licenseCount = 1;
      // Medical Exams: X-ray, Stool, Urine, HEPA, CBC, Drug Test = 6
      const medicalCount = 6;
      // Personal Documents: 2x2 Picture, PSA Birth Cert, Marriage Contract, Dependents Birth Cert, Residence Sketch = 5
      const personalCount = 5;
      // Clearances: NBI, Police, Barangay = 3
      const clearanceCount = 3;
      // Educational Documents: Diploma, Transcript of Records = 2
      const educationalCount = 2;
      // Legacy documents (if any)
      const legacyDocCount = Array.isArray(documents) ? documents.length : 0;
      
      const total = idCount + licenseCount + medicalCount + personalCount + clearanceCount + educationalCount + legacyDocCount;
      
      // Count uploaded files (have file_path or status is Submitted/Validated)
      const uploadedIds = Object.values(idNums).filter(id => 
        !!(id?.file_path || id?.filePath) || id?.status === 'Submitted' || id?.status === 'Validated'
      ).length;
      
      const uploadedLicense = (license && (!!(license?.frontFilePath || license?.front_file_path || license?.backFilePath || license?.back_file_path) || 
        license?.status === 'Submitted' || license?.status === 'Validated')) ? 1 : 0;
      
      const uploadedMedical = Object.values(medicalExams).filter(doc => 
        !!(doc?.file_path || doc?.filePath) || doc?.status === 'Submitted' || doc?.status === 'Validated'
      ).length;
      
      const uploadedPersonal = Object.values(personalDocs).filter(doc => 
        !!(doc?.file_path || doc?.filePath) || doc?.status === 'Submitted' || doc?.status === 'Validated'
      ).length;
      
      const uploadedClearances = Object.values(clearances).filter(doc => 
        !!(doc?.file_path || doc?.filePath) || doc?.status === 'Submitted' || doc?.status === 'Validated'
      ).length;
      
      const uploadedEducational = Object.values(educationalDocs).filter(doc => 
        !!(doc?.file_path || doc?.filePath) || doc?.status === 'Submitted' || doc?.status === 'Validated'
      ).length;
      
      const uploadedDocs = documents.filter(doc => 
        !!(doc?.file_path || doc?.filePath) || doc?.status === 'Submitted' || doc?.status === 'Validated'
      ).length;
      
      const uploaded = uploadedIds + uploadedLicense + uploadedMedical + uploadedPersonal + uploadedClearances + uploadedEducational + uploadedDocs;
      
      // Count approved
      const approvedIds = Object.values(idNums).filter(id => id?.status === 'Validated').length;
      const licenseApproved = (license && (getDocStatus(license) === 'approved' || getDocStatus(license) === 'Validated')) ? 1 : 0;
      const medicalApproved = Object.values(medicalExams).filter(doc => {
        const status = getDocStatus(doc);
        return status === 'approved' || status === 'Validated';
      }).length;
      const personalApproved = Object.values(personalDocs).filter(doc => {
        const status = getDocStatus(doc);
        return status === 'approved' || status === 'Validated';
      }).length;
      const clearanceApproved = Object.values(clearances).filter(doc => {
        const status = getDocStatus(doc);
        return status === 'approved' || status === 'Validated';
      }).length;
      const educationalApproved = Object.values(educationalDocs).filter(doc => {
        const status = getDocStatus(doc);
        return status === 'approved' || status === 'Validated';
      }).length;
      const legacyDocsApproved = Array.isArray(documents) ? documents.filter(doc => doc?.status === 'Validated').length : 0;
      
      const approved = approvedIds + licenseApproved + medicalApproved + personalApproved + clearanceApproved + educationalApproved + legacyDocsApproved;
      
      return { approved, uploaded, total };
    }
  };

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

          currentRequirements.license = {
            ...currentRequirements.license,
            status: validationForm.status === 'Validated' ? 'approved' : validationForm.status === 'Re-submit' ? 'resubmit' : 'pending',
            remarks: validationForm.remarks.trim() || null,
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

          currentRequirements.medicalExams[medicalKey] = {
            ...currentRequirements.medicalExams[medicalKey],
            status: validationForm.status === 'Validated' ? 'approved' : validationForm.status === 'Re-submit' ? 'resubmit' : 'pending',
            remarks: validationForm.remarks.trim() || null,
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

          currentRequirements.personalDocuments[personalKey] = {
            ...currentRequirements.personalDocuments[personalKey],
            status: validationForm.status === 'Validated' ? 'approved' : validationForm.status === 'Re-submit' ? 'resubmit' : 'pending',
            remarks: validationForm.remarks.trim() || null,
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

          currentRequirements.clearances[clearanceKey] = {
            ...currentRequirements.clearances[clearanceKey],
            status: validationForm.status === 'Validated' ? 'approved' : validationForm.status === 'Re-submit' ? 'resubmit' : 'pending',
            remarks: validationForm.remarks.trim() || null,
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

          currentRequirements.educationalDocuments[educationalKey] = {
            ...currentRequirements.educationalDocuments[educationalKey],
            status: validationForm.status === 'Validated' ? 'approved' : validationForm.status === 'Re-submit' ? 'resubmit' : 'pending',
            remarks: validationForm.remarks.trim() || null,
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
    setRequestForm({ documentType: '', description: '', priority: 'normal' });
    setShowRequestModal(true);
  };

  const closeRequestModal = () => {
    setShowRequestModal(false);
    setRequestTarget(null);
    setRequestForm({ documentType: '', description: '', priority: 'normal', deadline: '' });
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
        description: requestForm.description.trim() || null,
        remarks: requestForm.description.trim() || null, // Also add 'remarks' for compatibility
        priority: requestForm.priority,
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Pending Review */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Pending Review</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-yellow-600 mt-3 font-medium">Awaiting HR validation</p>
          </div>

          {/* Action Required */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Action Required</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.actionRequired}</p>
              </div>
              <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-red-600 mt-3 font-medium">Re-submission requested</p>
          </div>

          {/* Incomplete */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Incomplete</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.incomplete}</p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-orange-600 mt-3 font-medium">Missing required documents</p>
          </div>

          {/* Complete */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Complete</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.complete}</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-green-600 mt-3 font-medium">All validated by HR</p>
          </div>
        </div>

        {/* Depot Compliance Monitoring */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-700">
            Depot Compliance Monitoring
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {displayedDepots.map((depot) => {
              const data = [
                { name: "Compliance", value: depot.compliance },
                { name: "Non-Compliance", value: depot.nonCompliance },
              ];
              return (
                <div
                  key={depot.name}
                  className="relative bg-white p-4 rounded-2xl shadow-md flex flex-col items-center hover:shadow-xl transition-transform cursor-pointer"
                >
                  <PieChart width={180} height={180}>
                    <Pie data={data} cx="50%" cy="50%" outerRadius={70} dataKey="value">
                      {data.map((entry, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-sm font-semibold">{depot.name}</span>
                    <span className="font-bold text-black">
                      {depot.compliance}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {depotCompliance.length > 5 && (
            <div className="flex justify-end mt-2">
              <button
                onClick={() => setShowAllDepots((v) => !v)}
                className="text-gray-700 text-xl font-bold"
              >
                {showAllDepots ? "▲" : "▼"}
              </button>
            </div>
          )}
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col gap-4">
            {/* Top Row: Search, Filters, Export */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name, position, depot, or email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                    setExpandedRow(null);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                />
              </div>

              {/* Employee Type Filter */}
              <select
                value={employeeTypeFilter}
                onChange={(e) => {
                  setEmployeeTypeFilter(e.target.value);
                  setCurrentPage(1);
                  setExpandedRow(null);
                }}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white min-w-[140px]"
              >
                <option value="all">All Types</option>
                <option value="agency">Agency</option>
                <option value="direct">Direct</option>
              </select>

              {/* Advanced Filters Button */}
              <div className="relative" ref={advancedFiltersRef}>
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2 bg-white"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filters
                </button>
                {showAdvancedFilters && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border rounded-lg shadow-lg z-10 p-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Position</label>
                        <select
                          value={positionFilter}
                          onChange={(e) => {
                            setPositionFilter(e.target.value);
                            setCurrentPage(1);
                            setExpandedRow(null);
                          }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        >
                          <option value="All">All Positions</option>
                          {uniquePositions.map((pos) => (
                            <option key={pos} value={pos}>{pos}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Depot</label>
                        <select
                          value={depotFilter}
                          onChange={(e) => {
                            setDepotFilter(e.target.value);
                            setCurrentPage(1);
                            setExpandedRow(null);
                          }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        >
                          <option value="All">All Depots</option>
                          {uniqueDepots.map((depot) => (
                            <option key={depot} value={depot}>{depot}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={() => {
                          setPositionFilter('All');
                          setDepotFilter('All');
                          setCurrentPage(1);
                        }}
                        className="w-full px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Export Button */}
              <button 
                onClick={handleExport}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2 bg-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </button>
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
                  setActiveTab('action_required');
                  setCurrentPage(1);
                  setExpandedRow(null);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'action_required'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Action Required ({stats.actionRequired})
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
                                <div 
                                  className={`h-2 rounded-full ${progress.approved === progress.total ? 'bg-green-500' : (progress.uploaded || progress.approved) > 0 ? 'bg-yellow-500' : 'bg-gray-300'}`}
                                  style={{ width: `${Math.max(((progress.uploaded || progress.approved) / progress.total) * 100, 0)}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-600">{progress.uploaded || progress.approved}/{progress.total}</span>
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
                                    {!employee.isAgency && employee.requirements.license !== undefined && (
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
                                            const statusStyle = getStatusStyle(
                                              licenseStatus === 'approved' || licenseStatus === 'Validated' ? 'approved' :
                                              licenseStatus === 'resubmit' || licenseStatus === 'Re-submit' ? 'resubmit' :
                                              licenseStatus === 'pending' || licenseStatus === 'Submitted' ? 'pending' : 'missing'
                                            );
                                            const needsAction = licenseStatus === 'missing' || licenseStatus === 'resubmit' || licenseStatus === 'Re-submit';
                                            
                                            return (
                                              <div 
                                                className={`p-4 rounded-xl border-2 transition-all ${
                                                  licenseStatus === 'resubmit' || licenseStatus === 'Re-submit'
                                                    ? 'bg-red-50 border-red-200 shadow-sm' 
                                                    : licenseStatus === 'missing' 
                                                      ? 'bg-orange-50/50 border-orange-200 border-dashed' 
                                                      : licenseStatus === 'approved' || licenseStatus === 'Validated'
                                                        ? 'bg-green-50/50 border-green-200'
                                                        : 'bg-white border-gray-200'
                                                }`}
                                              >
                                                <div className="flex items-start justify-between gap-3">
                                                  <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                      <p className="text-sm font-semibold text-gray-800">Driver's License</p>
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
                                                    {(needsAction || licenseStatus === 'pending' || licenseStatus === 'Submitted') && (
                                                      <button 
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          openValidationModal(
                                                            employee.employeeId,
                                                            'license',
                                                            'license',
                                                            'Driver\'s License',
                                                            licenseStatus === 'approved' || licenseStatus === 'Validated' ? 'approved' :
                                                            licenseStatus === 'resubmit' || licenseStatus === 'Re-submit' ? 'resubmit' :
                                                            licenseStatus === 'pending' || licenseStatus === 'Submitted' ? 'pending' : 'missing',
                                                            licenseData.remarks || ''
                                                          );
                                                        }}
                                                        disabled={!licenseData.frontFilePath || !licenseData.backFilePath}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                          !licenseData.frontFilePath || !licenseData.backFilePath
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
                                            const statusStyle = getStatusStyle(
                                              examStatus === 'approved' || examStatus === 'Validated' ? 'approved' :
                                              examStatus === 'resubmit' || examStatus === 'Re-submit' ? 'resubmit' :
                                              examStatus === 'pending' || examStatus === 'Submitted' ? 'pending' : 'missing'
                                            );
                                            const needsAction = examStatus === 'missing' || examStatus === 'resubmit' || examStatus === 'Re-submit';
                                            
                                            return (
                                              <div 
                                                key={exam.key}
                                                className={`p-4 rounded-xl border-2 transition-all ${
                                                  examStatus === 'resubmit' || examStatus === 'Re-submit'
                                                    ? 'bg-red-50 border-red-200 shadow-sm' 
                                                    : examStatus === 'missing' 
                                                      ? 'bg-orange-50/50 border-orange-200 border-dashed' 
                                                      : examStatus === 'approved' || examStatus === 'Validated'
                                                        ? 'bg-green-50/50 border-green-200'
                                                        : 'bg-white border-gray-200'
                                                }`}
                                              >
                                                <div className="flex items-start justify-between gap-3">
                                                  <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                      <p className="text-sm font-semibold text-gray-800">{exam.name}</p>
                                                    </div>
                                                    {examData.validUntil && (
                                                      <div className="flex items-center gap-1.5 mt-1">
                                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <p className="text-xs text-gray-500">Valid until: <span className="font-medium">{formatDate(examData.validUntil)}</span></p>
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
                                                    {examData.filePath && (
                                                      <div className="flex items-center gap-1.5 mt-1">
                                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                        </svg>
                                                        {getDocumentUrl(examData.filePath) ? (
                                                          <a
                                                            href={getDocumentUrl(examData.filePath)}
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
                                                    {(needsAction || examStatus === 'pending' || examStatus === 'Submitted') && (
                                                      <button 
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          openValidationModal(
                                                            employee.employeeId,
                                                            'medical',
                                                            exam.key,
                                                            exam.name,
                                                            examStatus === 'approved' || examStatus === 'Validated' ? 'approved' :
                                                            examStatus === 'resubmit' || examStatus === 'Re-submit' ? 'resubmit' :
                                                            examStatus === 'pending' || examStatus === 'Submitted' ? 'pending' : 'missing',
                                                            examData.remarks || ''
                                                          );
                                                        }}
                                                        disabled={!examData.filePath}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                          !examData.filePath
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
                                            const statusStyle = getStatusStyle(
                                              clearanceStatus === 'approved' || clearanceStatus === 'Validated' ? 'approved' :
                                              clearanceStatus === 'resubmit' || clearanceStatus === 'Re-submit' ? 'resubmit' :
                                              clearanceStatus === 'pending' || clearanceStatus === 'Submitted' ? 'pending' : 'missing'
                                            );
                                            const needsAction = clearanceStatus === 'missing' || clearanceStatus === 'resubmit' || clearanceStatus === 'Re-submit';
                                            
                                            return (
                                              <div 
                                                key={clearance.key}
                                                className={`p-4 rounded-xl border-2 transition-all ${
                                                  clearanceStatus === 'resubmit' || clearanceStatus === 'Re-submit'
                                                    ? 'bg-red-50 border-red-200 shadow-sm' 
                                                    : clearanceStatus === 'missing' 
                                                      ? 'bg-orange-50/50 border-orange-200 border-dashed' 
                                                      : clearanceStatus === 'approved' || clearanceStatus === 'Validated'
                                                        ? 'bg-green-50/50 border-green-200'
                                                        : 'bg-white border-gray-200'
                                                }`}
                                              >
                                                <div className="flex items-start justify-between gap-3">
                                                  <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                      <p className="text-sm font-semibold text-gray-800">{clearance.name}</p>
                                                    </div>
                                                    {clearanceData.dateValidity && (
                                                      <div className="flex items-center gap-1.5 mt-1">
                                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <p className="text-xs text-gray-500">Valid until: <span className="font-medium">{formatDate(clearanceData.dateValidity)}</span></p>
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
                                                    {clearanceData.filePath && (
                                                      <div className="flex items-center gap-1.5 mt-1">
                                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                        </svg>
                                                        {getDocumentUrl(clearanceData.filePath) ? (
                                                          <a
                                                            href={getDocumentUrl(clearanceData.filePath)}
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
                                                    {(needsAction || clearanceStatus === 'pending' || clearanceStatus === 'Submitted') && (
                                                      <button 
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          openValidationModal(
                                                            employee.employeeId,
                                                            'clearance',
                                                            clearance.key,
                                                            clearance.name,
                                                            clearanceStatus === 'approved' || clearanceStatus === 'Validated' ? 'approved' :
                                                            clearanceStatus === 'resubmit' || clearanceStatus === 'Re-submit' ? 'resubmit' :
                                                            clearanceStatus === 'pending' || clearanceStatus === 'Submitted' ? 'pending' : 'missing',
                                                            clearanceData.remarks || ''
                                                          );
                                                        }}
                                                        disabled={!clearanceData.filePath}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                          !clearanceData.filePath
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
                                    {!employee.isAgency && employee.requirements.educationalDocuments !== undefined && (
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
                                        const reqStatus = req.status || 'pending';
                                        const statusStyle = getStatusStyle(
                                          reqStatus === 'approved' || reqStatus === 'Validated' ? 'approved' :
                                          reqStatus === 'resubmit' || reqStatus === 'Re-submit' ? 'resubmit' :
                                          reqStatus === 'submitted' ? 'submitted' :
                                          reqStatus === 'pending' ? 'pending' : 'missing'
                                        );
                                        
                                        return (
                                          <div 
                                            key={req.id} 
                                            className={`p-4 rounded-xl border-2 transition-all ${
                                              reqStatus === 'resubmit' || reqStatus === 'Re-submit'
                                                ? 'bg-red-50 border-red-200 shadow-sm' 
                                                : reqStatus === 'pending' 
                                                  ? 'bg-orange-50/50 border-orange-200 border-dashed' 
                                                  : reqStatus === 'approved' || reqStatus === 'Validated'
                                                    ? 'bg-green-50/50 border-green-200'
                                                    : reqStatus === 'submitted'
                                                      ? 'bg-blue-50/50 border-blue-200'
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
                                                {req.file_path && (
                                                  <div className="flex items-center gap-1.5 mt-1">
                                                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                    </svg>
                                                    {getDocumentUrl(req.file_path) ? (
                                                      <a
                                                        href={getDocumentUrl(req.file_path)}
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
                                                {(reqStatus === 'approved' || reqStatus === 'Validated') && (
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
                  value={requestForm.documentType}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, documentType: e.target.value }))}
                  placeholder="e.g., NBI Clearance, Medical Certificate, etc."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                <textarea
                  value={requestForm.description}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Add any specific instructions or requirements..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <select
                  value={requestForm.priority}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
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
                disabled={requesting}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  requesting
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

