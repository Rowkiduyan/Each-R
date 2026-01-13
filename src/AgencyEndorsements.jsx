// src/AgencyEndorsements.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "./supabaseClient";
import LogoCropped from './layouts/photos/logo(cropped).png';
import { notifyHRAboutInterviewResponse, notifyHRAboutApplicationRetraction } from './notifications';

function AgencyEndorsements() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const profileDropdownRef = useRef(null);
  
  // Check if navigated from Separation page to submit resignation
  const [showSeparationPrompt, setShowSeparationPrompt] = useState(false);
  
  useEffect(() => {
    if (location.state?.openSeparationTab) {
      setShowSeparationPrompt(true);
      // Clear the state to prevent showing prompt on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // endorsed/hired state
  const [endorsedEmployees, setEndorsedEmployees] = useState([]);
  const [endorsedLoading, setEndorsedLoading] = useState(true);
  const [endorsedError, setEndorsedError] = useState(null);

  const [hiredEmployees, setHiredEmployees] = useState([]);
  const [hiredLoading, setHiredLoading] = useState(true);
  const [hiredError, setHiredError] = useState(null);

  // UI helpers for details
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  
  // Search and filter for endorsements
  const [endorsementsSearch, setEndorsementsSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeDetailTab, setEmployeeDetailTab] = useState('profiling');
  
  // Confirmation dialog state
  const [showConfirmInterviewDialog, setShowConfirmInterviewDialog] = useState(false);
  const [showRejectInterviewDialog, setShowRejectInterviewDialog] = useState(false);
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

  // Assessment records state
  const [assessmentRecords, setAssessmentRecords] = useState([]);
  
  // Interview calendar state
  const [interviews, setInterviews] = useState([]);
  const [calendarActiveTab, setCalendarActiveTab] = useState('today'); // 'today', 'tomorrow', 'week'


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
           job_posts:job_posts ( id, title, depot )`
        )
        .eq("endorsed", true)
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

          const app = payload?.applicant || payload?.form || payload || null;
          const meta = payload?.meta || {};

          const first = app?.firstName || app?.fname || app?.first_name || null;
          const last = app?.lastName || app?.lname || app?.last_name || null;
          const middle = app?.middleName || app?.mname || null;
          const email = app?.email || app?.contact || null;
          const contact = app?.contactNumber || app?.contact || app?.phone || null;
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

          if (email && hiredEmployees.length > 0) {
            const hiredEmp = hiredEmployees.find(h => h.email === email);

            if (hiredEmp) {
              endorsedEmployeeId = hiredEmp.id;
              const isAgencyEmployee =
                hiredEmp.is_agency ||
                !!hiredEmp.agency_profile_id ||
                !!hiredEmp.endorsed_by_agency_id ||
                hiredEmp.source === "recruitment" ||
                hiredEmp.source === "agency";
              hasAgencyEmployee = isAgencyEmployee;

              // Only update status to deployed if application status is also hired
              if (isAgencyEmployee && appStatus === "hired") {
                status = "deployed";
              }
            }
          }

          // If this application has already been converted to an agency employee,
          // skip listing the application row and let the employee row represent it.
          if (hasAgencyEmployee && appStatus === "hired") {
            return null;
          }

          return {
            id: r.id,
            name: displayName,
            first,
            middle,
            last,
            email,
            contact,
            position: pos || "—",
            depot: depot || "—",
            status,
            agency_profile_id: meta?.endorsed_by_profile_id || null,
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
          // If agency_profile_id (endorsed_by_profile_id from meta) exists, it must match the current user
          if (item.agency_profile_id && item.agency_profile_id !== user.id) {
            return false;
          }
          
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

  // ---------- Load hired employees (employees table) ----------
  const loadHired = async () => {
    setHiredLoading(true);
    setHiredError(null);
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, email, fname, lname, mname, contact_number, position, depot, hired_at, agency_profile_id, endorsed_by_agency_id, is_agency, source")
        // Only include employees that are agency-sourced / endorsed
        // Explicitly exclude source: "internal" (direct applicants)
        .or("is_agency.eq.true,agency_profile_id.not.is.null,endorsed_by_agency_id.not.is.null,source.eq.recruitment,source.eq.agency")
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
            return {
              id: r.id,
              name,
              email: r.email || null,
              contact: r.contact_number || null,
              position: r.position || "Employee",
              depot: r.depot || "—",
              hired_at: r.hired_at || null,
              agency_profile_id: r.agency_profile_id || null,
              endorsed_by_agency_id: r.endorsed_by_agency_id || null,
              is_agency: !!r.is_agency,
              source: r.source || null,
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

      setInterviews(formatted);
    } catch (err) {
      console.error('Error fetching interviews:', err);
    }
  };

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
          .map(e => [e.email, e])
      );

      // First, update existing endorsements that now have an employee row
      const updatedList = existing.map((emp) => {
        if (!emp.email) return emp;
        const hiredEmp = hiredEmployees.find(h => h.email === emp.email);
        if (!hiredEmp) return emp;

        // Explicitly exclude internal/direct applicants
        if (hiredEmp.source === "internal") return emp;

        const isAgencyEmployee =
          hiredEmp.is_agency ||
          !!hiredEmp.agency_profile_id ||
          !!hiredEmp.endorsed_by_agency_id ||
          hiredEmp.source === "recruitment" ||
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
          depot: emp.depot || hiredEmp.depot || "—",
        };
      });

      // Then, add any agency employees that don't yet appear in the endorsements list
      hiredEmployees.forEach((h) => {
        // Explicitly exclude internal/direct applicants
        if (h.source === "internal") return;

        const isAgencyEmployee =
          h.is_agency ||
          !!h.agency_profile_id ||
          !!h.endorsed_by_agency_id ||
          h.source === "recruitment" ||
          h.source === "agency";

        if (!isAgencyEmployee) return;
        if (!h.email) return;
        if (byEmail.has(h.email)) return;

        updatedList.push({
          id: `emp-${h.id}`,
          name: h.name,
          first: null,
          middle: null,
          last: null,
          email: h.email,
          contact: h.contact,
          position: h.position || "Employee",
          depot: h.depot || "—",
          status: "deployed",
          agency_profile_id: h.agency_profile_id || h.endorsed_by_agency_id || null,
          payload: null,
          endorsed_employee_id: h.id,
          job_id: null,
          created_at: h.hired_at || null,
          // No interview data on pure employee rows
          interview_date: null,
          interview_time: null,
          interview_location: null,
          interviewer: null,
          interview_confirmed: null,
          interview_details_file: null,
          assessment_results_file: null,
          raw: { source: h.source || null, from: "employees" },
        });

        byEmail.set(h.email, true);
      });

      return updatedList;
    });
  }, [hiredEmployees]);

  // Keep selectedEmployee in sync with latest endorsedEmployees data
  useEffect(() => {
    if (!selectedEmployee) return;
    const updated = endorsedEmployees.find(e => e.id === selectedEmployee.id);
    if (updated && updated !== selectedEmployee) {
      setSelectedEmployee(updated);
    }
  }, [endorsedEmployees, selectedEmployee]);

  // Load requirements for selected employee
  useEffect(() => {
    const loadEmployeeRequirements = async () => {
      if (!selectedEmployee) {
        setEmployeeRequirements(null);
        return;
      }

      // Prefer the linked employee id; if missing, try to resolve by email
      let employeeId = selectedEmployee.endorsed_employee_id;

      setLoadingRequirements(true);

      setLoadingRequirements(true);
      try {
        let data = null;
        let error = null;

        if (employeeId) {
          const result = await supabase
            .from('employees')
            .select('id, email, requirements')
            .eq('id', employeeId)
            .single();
          data = result.data;
          error = result.error;
        } else if (selectedEmployee.email) {
          // Fallback: try to find employee by email (same logic Requirements tab uses)
          const result = await supabase
            .from('employees')
            .select('id, email, requirements')
            .ilike('email', selectedEmployee.email.trim());

          if (result.error) {
            error = result.error;
          } else if (result.data && result.data.length > 0) {
            data = result.data[0];
            employeeId = data.id;
            // Update selectedEmployee to remember this mapping for next time
            setSelectedEmployee(prev => prev ? { ...prev, endorsed_employee_id: employeeId } : prev);
          }
        }
        
        if (error) {
          console.error('Error loading employee requirements:', error);
          setEmployeeRequirements(null);
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
        }
      } catch (err) {
        console.error('Unexpected error loading requirements:', err);
        setEmployeeRequirements(null);
      } finally {
        setLoadingRequirements(false);
      }
    };
    
    loadEmployeeRequirements();
  }, [selectedEmployee]);
  
  // Subscribe to employees table changes to refresh requirements
  useEffect(() => {
    if (!selectedEmployee?.endorsed_employee_id) return;
    
    const employeesChannel = supabase
      .channel(`employees-requirements-rt-${selectedEmployee.endorsed_employee_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'employees',
          filter: `id=eq.${selectedEmployee.endorsed_employee_id}`
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
  }, [selectedEmployee?.endorsed_employee_id]);

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
          .select('id, interview_details_file, assessment_results_file, appointment_letter_file, undertaking_file, application_form_file, undertaking_duties_file, pre_employment_requirements_file, id_form_file, created_at, user_id, job_posts:job_id(title, depot)')
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
          // Use the most recent application to show all document types
          // Always show all document types, even if file doesn't exist
          const mostRecentApp = applicationsData[0]; // Already sorted by created_at DESC
          const jobTitle = mostRecentApp.job_posts?.title || 'N/A';
          const depot = mostRecentApp.job_posts?.depot || 'N/A';
          const date = mostRecentApp.created_at;
          
          const records = [];
          
          // Assessment Files - always show both
          records.push({
            id: `${mostRecentApp.id}-interview-details`,
            type: 'assessment',
            documentName: 'Interview Details',
            fileName: mostRecentApp.interview_details_file ? mostRecentApp.interview_details_file.split('/').pop() : null,
            filePath: mostRecentApp.interview_details_file,
            fileUrl: mostRecentApp.interview_details_file ? getFileUrl(mostRecentApp.interview_details_file) : null,
            date: date,
            jobTitle: jobTitle,
            depot: depot,
            applicationId: mostRecentApp.id,
            icon: 'blue'
          });
          
          records.push({
            id: `${mostRecentApp.id}-assessment-results`,
            type: 'assessment',
            documentName: 'In-Person Assessment Results',
            fileName: mostRecentApp.assessment_results_file ? mostRecentApp.assessment_results_file.split('/').pop() : null,
            filePath: mostRecentApp.assessment_results_file,
            fileUrl: mostRecentApp.assessment_results_file ? getFileUrl(mostRecentApp.assessment_results_file) : null,
            date: date,
            jobTitle: jobTitle,
            depot: depot,
            applicationId: mostRecentApp.id,
            icon: 'green'
          });
          
          // Agreement Files - always show all 6
          const agreementDocs = [
            { key: 'appointment-letter', name: 'Employee Appointment Letter', file: mostRecentApp.appointment_letter_file },
            { key: 'undertaking', name: 'Undertaking', file: mostRecentApp.undertaking_file },
            { key: 'application-form', name: 'Application Form', file: mostRecentApp.application_form_file },
            { key: 'undertaking-duties', name: 'Undertaking of Duties and Responsibilities', file: mostRecentApp.undertaking_duties_file },
            { key: 'pre-employment', name: 'Roadwise Pre Employment Requirements', file: mostRecentApp.pre_employment_requirements_file },
            { key: 'id-form', name: 'ID Form', file: mostRecentApp.id_form_file }
          ];
          
          agreementDocs.forEach(doc => {
            records.push({
              id: `${mostRecentApp.id}-${doc.key}`,
              type: 'agreement',
              documentName: doc.name,
              fileName: doc.file ? doc.file.split('/').pop() : null,
              filePath: doc.file,
              fileUrl: doc.file ? getFileUrl(doc.file) : null,
              date: date,
              jobTitle: jobTitle,
              depot: depot,
              applicationId: mostRecentApp.id
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
          if (payload.new?.endorsed === true || payload.old?.endorsed === true) {
            loadEndorsed();
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
        }
      )
      .subscribe();

    return () => {
      if (applicationsChannel) supabase.removeChannel(applicationsChannel);
      if (employeesChannel) supabase.removeChannel(employeesChannel);
    };
  
  }, []);

  const formatDate = (d) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }); }
    catch { return String(d); }
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
    
    const idData = idNums[key] || {};
    const docData = documents.find(d => (d.key || d.type || d.name || '').toLowerCase() === key.toLowerCase());
    
    const idNumber = idData.value || null;
    const filePath = docData?.file_path || null;
    
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
  };

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
            <div className="w-[30%]">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col p-4 h-[calc(100vh-200px)]">
                <h2 className="text-base font-bold text-gray-800 mb-3">Interview Schedule</h2>
                
                {/* Stats Overview */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg p-2 text-white">
                    <p className="text-xs opacity-90">Total</p>
                    <p className="text-lg font-bold">{getActiveInterviews().length}</p>
                  </div>
                  <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-2 text-white">
                    <p className="text-xs opacity-90">Online</p>
                    <p className="text-lg font-bold">
                      {getActiveInterviews().filter(i => i.interview_type === 'online').length}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg p-2 text-white">
                    <p className="text-xs opacity-90">Onsite</p>
                    <p className="text-lg font-bold">
                      {getActiveInterviews().filter(i => i.interview_type === 'onsite').length}
                    </p>
                  </div>
                </div>

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
                    Today
                  </button>
                  <button
                    onClick={() => setCalendarActiveTab('tomorrow')}
                    className={`flex-1 px-3 py-1.5 font-medium text-xs rounded-lg transition-all ${
                      calendarActiveTab === 'tomorrow'
                        ? 'bg-white text-[#800000] shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Tomorrow
                  </button>
                  <button
                    onClick={() => setCalendarActiveTab('week')}
                    className={`flex-1 px-3 py-1.5 font-medium text-xs rounded-lg transition-all ${
                      calendarActiveTab === 'week'
                        ? 'bg-white text-[#800000] shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Week
                  </button>
                </div>

                <div className="mb-2">
                  <h3 className="text-sm font-bold text-gray-800">{getTabTitle()}</h3>
                  <p className="text-xs text-gray-500">{getTabDate()}</p>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2">
                  {getActiveInterviews().length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs text-gray-500">No interviews scheduled</p>
                    </div>
                  ) : (
                    getActiveInterviews().map((interview) => (
                      <div
                        key={interview.id}
                        className="bg-gradient-to-r from-gray-50 to-white rounded-lg p-3 cursor-pointer hover:shadow-md transition-all border border-gray-200 hover:border-[#800000]"
                        onClick={() => {
                          // Find the employee in the endorsed list
                          const employee = endorsedEmployees.find(e => e.id === interview.id);
                          if (employee) {
                            setSelectedEmployee(employee);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="font-bold text-gray-900 text-sm">{formatTime(interview.time)}</div>
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
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Endorsements Table - Right Side (70%) */}
            <div className="w-[70%] bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
              {/* Search and Filters */}
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by employee name, ID, position, or depot..."
                    value={endorsementsSearch}
                    onChange={(e) => {
                      setEndorsementsSearch(e.target.value);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] bg-white"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); }}
                  className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] bg-white min-w-[160px]"
                >
                  <option value="all">All Status</option>
                  <option value="deployed">Deployed</option>
                  <option value="pending">Pending</option>
                </select>

                {/* Export Button */}
                <button className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2 bg-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export
                </button>
              </div>
            </div>

            {/* Separation Prompt Banner */}
            {showSeparationPrompt && (
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
              {endorsedLoading ? (
                <div className="p-6 text-gray-600">Loading endorsements…</div>
              ) : endorsedError ? (
                <div className="p-4 bg-[#800000]/10 text-[#800000] rounded">{endorsedError}</div>
              ) : endorsedEmployees.length === 0 ? (
                <div className="p-6 text-gray-600">No endorsements yet.</div>
              ) : (() => {
                // Filter employees based on search and status filter
                const filteredEmployees = endorsedEmployees.filter((emp) => {
                  // Status filter
                  if (statusFilter !== 'all' && emp.status !== statusFilter) return false;
                  
                  // Search filter
                  if (!endorsementsSearch.trim()) return true;
                  const searchLower = endorsementsSearch.toLowerCase();
                  return (
                    emp.name?.toLowerCase().includes(searchLower) ||
                    emp.position?.toLowerCase().includes(searchLower) ||
                    emp.depot?.toLowerCase().includes(searchLower) ||
                    emp.status?.toLowerCase().includes(searchLower) ||
                    String(emp.id).includes(searchLower)
                  );
                });

                return (
                <>
                  <div className="flex flex-col lg:flex-row gap-4 flex-1 overflow-hidden min-h-0">
                    {/* Table on the left */}
                    <div className={`${selectedEmployee ? 'lg:w-[30%]' : 'w-full'} overflow-x-auto overflow-y-auto no-scrollbar`}>
                      {filteredEmployees.length === 0 ? (
                        <div className="p-6 text-gray-600">No endorsements match your search.</div>
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
                                        <span className={`text-sm font-semibold ${emp.status === "deployed" ? "text-green-600" : "text-yellow-600"}`}>
                                          {emp.status.toUpperCase()}
                                        </span>
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
                      // Extract payload data for display
                      const payload = selectedEmployee.payload || {};
                      const formData = payload.form || payload.applicant || payload || {};
                      const workExperiences = payload.workExperiences || [];
                      const characterReferences = payload.characterReferences || [];
                      const job = payload.job || {};
                      const isDeployed = selectedEmployee.status === "deployed";

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
                            <div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center text-blue-600 font-bold">
                              {selectedEmployee.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </div>
                      <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-gray-800">{selectedEmployee.name}</h4>
                                {isDeployed ? (
                                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">DEPLOYED</span>
                                ) : (
                                  <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">ENDORSED</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">#{selectedEmployee.id}</p>
                              <p className="text-sm text-gray-600">{selectedEmployee.position} | {selectedEmployee.depot}</p>
                              {!isDeployed && (
                                <button
                                  type="button"
                                  className="text-xs text-blue-600 hover:underline cursor-pointer mt-1"
                                  onClick={() => {
                                    setConfirmMessage(`Retract the endorsement for ${selectedEmployee.name}? This will remove the application from HR's recruitment list.`);
                                    setConfirmCallback(() => async () => {
                                      if (!selectedEmployee.id) {
                                        setAlertMessage('Error: Application ID not found');
                                        setShowErrorAlert(true);
                                        return;
                                      }

                                      try {
                                        // Get applicant info before deleting for notification
                                        const applicantName = selectedEmployee.name || 'Applicant';
                                        const position = selectedEmployee.position || selectedEmployee.raw?.job_posts?.title || 'Position';
                                        const depot = selectedEmployee.depot || selectedEmployee.raw?.job_posts?.depot || '';
                                        
                                        // Notify HR before deleting the application
                                        await notifyHRAboutApplicationRetraction({
                                          applicationId: selectedEmployee.id,
                                          applicantName,
                                          position,
                                          depot
                                        });
                                        
                                        // Delete the application to remove it from HR's list
                                        // The database will automatically set application_id to NULL in notifications
                                        const { error } = await supabase
                                          .from('applications')
                                          .delete()
                                          .eq('id', selectedEmployee.id);

                                        if (error) {
                                          console.error('Error retracting endorsement:', error);
                                          setAlertMessage('Failed to retract endorsement. Please try again.');
                                          setShowErrorAlert(true);
                                          return;
                                        }

                                        // Reload list and clear selected employee
                                        await loadEndorsed();
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

                        {/* Tabs */}
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

                        {/* Tab Content */}
                        <div className="bg-white border border-t-0 border-gray-300 rounded-b-lg p-6 flex-1 overflow-y-auto">
                          
                          {/* PROFILING TAB */}
                          {currentTab === 'profiling' && (
                            <div className="space-y-6">
                              {/* Employment Details */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Employment Details</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Department:</span>
                                    <span className="ml-2 text-gray-800">{formData.department || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Position:</span>
                                    <span className="ml-2 text-gray-800">{formData.position || job.title || selectedEmployee.position || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Depot Assignment:</span>
                                    <span className="ml-2 text-gray-800">{formData.depot || job.depot || selectedEmployee.depot || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Date Available:</span>
                                    <span className="ml-2 text-gray-800">{formData.dateAvailable ? formatDate(formData.dateAvailable) : "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Currently Employed:</span>
                                    <span className="ml-2 text-gray-800">{formData.employed || "—"}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Personal Information */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Personal Information</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Last Name:</span>
                                    <span className="ml-2 text-gray-800">{formData.lastName || formData.lname || selectedEmployee.last || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">First Name:</span>
                                    <span className="ml-2 text-gray-800">{formData.firstName || formData.fname || selectedEmployee.first || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Middle Name:</span>
                                    <span className="ml-2 text-gray-800">{formData.middleName || formData.mname || selectedEmployee.middle || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Sex:</span>
                                    <span className="ml-2 text-gray-800">{formData.sex || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Birthday:</span>
                                    <span className="ml-2 text-gray-800">{formData.birthday ? formatDate(formData.birthday) : "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Marital Status:</span>
                                    <span className="ml-2 text-gray-800">{formData.maritalStatus || formData.marital_status || "—"}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Address Information */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Address Information</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">House/Unit No.:</span>
                                    <span className="ml-2 text-gray-800">{formData.residenceNo || formData.unit_house_number || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Street/Village:</span>
                                    <span className="ml-2 text-gray-800">{formData.street || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">City/Municipality:</span>
                                    <span className="ml-2 text-gray-800">{formData.city || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Zip Code:</span>
                                    <span className="ml-2 text-gray-800">{formData.zip || "—"}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Contact Information */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Contact Information</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Contact Number:</span>
                                    <span className="ml-2 text-gray-800">{formData.contactNumber || formData.contact || selectedEmployee.contact || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Email Address:</span>
                                    <span className="ml-2 text-gray-800">{formData.email || selectedEmployee.email || "—"}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Education & Skills */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Education & Skills</h5>
                                <div className="space-y-4">
                                  {/* Highest Educational Attainment */}
                                  <div>
                                    <div className="font-medium text-gray-700 mb-2">Highest Educational Attainment:</div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                      <div>
                                        <span className="text-gray-500">Educational Level:</span>
                                        <span className="ml-2 text-gray-800">{formData.education || formData.educational_attainment || "—"}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Year Graduated:</span>
                                        <span className="ml-2 text-gray-800">{formData.tertiaryYear || formData.year_graduated || "—"}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">School/Institution:</span>
                                        <span className="ml-2 text-gray-800">{formData.tertiarySchool || formData.institution_name || "—"}</span>
                                      </div>
                                      <div className="md:col-span-3">
                                        <span className="text-gray-500">Course/Program:</span>
                                        <span className="ml-2 text-gray-800">{formData.tertiaryProgram || "—"}</span>
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
                                        <span className="text-gray-500">—</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Specialized Training */}
                                  {(formData.specializedTraining || formData.specializedYear) && (
                                    <div>
                                      <div className="font-medium text-gray-700 mb-2">Specialized Training:</div>
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <span className="text-gray-500">Training/Certification Name:</span>
                                          <span className="ml-2 text-gray-800">{formData.specializedTraining || "—"}</span>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Year Completed:</span>
                                          <span className="ml-2 text-gray-800">{formData.specializedYear || "—"}</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* License Information (only for Delivery Drivers) */}
                              {(formData.position === 'Delivery Drivers' || job.title === 'Delivery Drivers') && (
                                <div>
                                  <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">License Information</h5>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="text-gray-500">License Classification:</span>
                                      <span className="ml-2 text-gray-800">{formData.licenseClassification || "—"}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">License Expiry Date:</span>
                                      <span className="ml-2 text-gray-800">{formData.licenseExpiry ? formatDate(formData.licenseExpiry) : "—"}</span>
                                    </div>
                                    {formData.restrictionCodes && Array.isArray(formData.restrictionCodes) && formData.restrictionCodes.length > 0 && (
                                      <div className="col-span-2">
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
                                </div>
                              )}

                              {/* Driving History (only for Delivery Drivers) */}
                              {(formData.position === 'Delivery Drivers' || job.title === 'Delivery Drivers') && (
                                <div>
                                  <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Driving History</h5>
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <span className="text-gray-500">Years of Driving Experience:</span>
                                        <span className="ml-2 text-gray-800">{formData.yearsDriving || "—"}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Has Truck Troubleshooting Knowledge:</span>
                                        <span className="ml-2 text-gray-800">{formData.truckKnowledge === 'yes' ? 'Yes' : formData.truckKnowledge === 'no' ? 'No' : "—"}</span>
                                      </div>
                                    </div>

                                    {formData.troubleshootingTasks && Array.isArray(formData.troubleshootingTasks) && formData.troubleshootingTasks.length > 0 && (
                                      <div>
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

                                    {formData.vehicleTypes && Array.isArray(formData.vehicleTypes) && formData.vehicleTypes.length > 0 && (
                                      <div>
                                        <span className="text-gray-500">Vehicles Driven:</span>
                                        <div className="ml-2 mt-1 flex flex-wrap gap-2">
                                          {formData.vehicleTypes.map((vehicle, idx) => (
                                            <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-gray-800 text-sm">
                                              {vehicle}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {(formData.takingMedications !== undefined || formData.tookMedicalTest !== undefined) && (
                                      <div>
                                        <span className="text-gray-500">Medical Information:</span>
                                        <div className="ml-2 mt-1 space-y-1 text-sm">
                                          <div>
                                            <span className="text-gray-600">Taking Medications:</span>
                                            <span className="ml-2 text-gray-800">{formData.takingMedications ? 'Yes' : 'No'}</span>
                                            {formData.takingMedications && formData.medicationReason && (
                                              <span className="ml-2 text-gray-600">({formData.medicationReason})</span>
                                            )}
                                          </div>
                                          <div>
                                            <span className="text-gray-600">Has Taken Medical Test:</span>
                                            <span className="ml-2 text-gray-800">{formData.tookMedicalTest ? 'Yes' : 'No'}</span>
                                            {formData.tookMedicalTest && formData.medicalTestDate && (
                                              <span className="ml-2 text-gray-600">({formatDate(formData.medicalTestDate)})</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Work Experience */}
                              {workExperiences && workExperiences.length > 0 && (
                                <div>
                                  <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Work Experience</h5>
                                  <div className="space-y-3">
                                    {workExperiences.map((exp, idx) => (
                                      <div key={idx} className="border border-gray-200 rounded p-3 text-sm">
                                        <div className="font-medium text-gray-800">{exp.company || "—"}</div>
                                        <div className="text-gray-600">{exp.role || exp.title || "—"} • {exp.date || exp.period || "—"}</div>
                                        {exp.reason && (
                                          <div className="text-gray-500 text-xs mt-1">Reason for leaving: {exp.reason}</div>
                                        )}
                                        {exp.notes && (
                                          <div className="text-gray-500 text-xs mt-1">{exp.notes}</div>
                                        )}
                                        {exp.tasks && (
                                          <div className="text-gray-500 text-xs mt-1">Tasks: {exp.tasks}</div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Character References */}
                              {!selectedEmployee?.is_agency && (
                                <div>
                                  <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Character References</h5>
                                  <div className="space-y-2">
                                    {(() => {
                                      const rawRefs = Array.isArray(characterReferences) ? characterReferences : [];
                                      const displayRefs = rawRefs.length > 0 ? rawRefs : [{}];

                                      return displayRefs.map((ref, idx) => (
                                        <div key={idx} className="border border-gray-200 rounded p-3 text-sm">
                                          <div className="font-medium text-gray-800">{ref?.name || ''}</div>
                                          <div className="text-gray-600">{ref?.contact || ref?.contactNumber || ''}</div>
                                          <div className="text-gray-500 text-xs mt-1">{ref?.remarks || ''}</div>
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* DOCUMENTS TAB - View Only */}
                          {currentTab === 'documents' && (
                            <div className="space-y-6">
                              {/* Header with link to Requirements */}
                              <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-600">View employee's submitted documents and their status.</p>
                                <Link 
                                  to="/agency/requirements" 
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                  </svg>
                                  Manage Requirements
                                </Link>
                              </div>
                              
                              {/* Default Requirements Table */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Default Requirements (Government IDs)</h5>
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-gray-600 font-medium">Document</th>
                                        <th className="px-4 py-3 text-left text-gray-600 font-medium">ID Number</th>
                                        <th className="px-4 py-3 text-left text-gray-600 font-medium">File</th>
                                        <th className="px-4 py-3 text-left text-gray-600 font-medium">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {(() => {
                                        const requirements = [
                                          { key: 'sss', name: 'SSS', desc: 'Social Security System' },
                                          { key: 'tin', name: 'TIN', desc: 'Tax Identification Number' },
                                          { key: 'pagibig', name: 'PAG-IBIG', desc: 'HDMF' },
                                          { key: 'philhealth', name: 'PhilHealth', desc: 'Philippine Health Insurance' },
                                        ];
                                        
                                        return requirements.map((req) => {
                                          const reqData = getRequirementData(req.key);
                                          const fileUrl = getFileUrl(reqData.filePath);
                                          
                                          let statusBadge = null;
                                          if (reqData.status === 'approved') {
                                            statusBadge = <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">Approved</span>;
                                          } else if (reqData.status === 'resubmit') {
                                            statusBadge = <span className="px-2 py-1 text-xs font-medium bg-[#800000]/20 text-[#800000] rounded">Re-submit</span>;
                                          } else if (reqData.status === 'pending') {
                                            statusBadge = <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded">Pending</span>;
                                          } else {
                                            statusBadge = <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">Missing</span>;
                                          }
                                          
                                          return (
                                            <tr key={req.key} className="hover:bg-gray-50/50">
                                              <td className="px-4 py-3">
                                                <p className="font-medium text-gray-800">{req.name}</p>
                                                <p className="text-xs text-gray-500">{req.desc}</p>
                                              </td>
                                              <td className="px-4 py-3 text-gray-600">
                                                {reqData.idNumber ? (
                                                  <span className="text-gray-800">{reqData.idNumber}</span>
                                                ) : (
                                                  <span className="text-gray-400 italic">Not provided</span>
                                                )}
                                              </td>
                                              <td className="px-4 py-3">
                                                {fileUrl ? (
                                                  <a 
                                                    href={fileUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:text-blue-800 underline text-sm"
                                                  >
                                                    View File
                                                  </a>
                                                ) : (
                                                  <span className="text-gray-400 italic">No file</span>
                                                )}
                                              </td>
                                              <td className="px-4 py-3">
                                                {statusBadge}
                                              </td>
                                            </tr>
                                          );
                                        });
                                      })()}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {/* HR Requested Documents Section */}
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="font-semibold text-gray-800 bg-gray-100 px-3 py-2 rounded flex-1">HR Requested Documents</h5>
                                </div>
                                
                                {(!documentRequests || documentRequests.filter(d => d.employeeId === selectedEmployee.id).length === 0) ? (
                                  <div className="border border-gray-200 rounded-lg p-6 text-center">
                                    <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="text-sm text-gray-500">No additional documents have been requested by HR yet.</p>
                                  </div>
                                ) : (
                                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          <th className="px-4 py-3 text-left text-gray-600 font-medium">Document</th>
                                          <th className="px-4 py-3 text-left text-gray-600 font-medium">Deadline</th>
                                          <th className="px-4 py-3 text-left text-gray-600 font-medium">Status</th>
                                          <th className="px-4 py-3 text-left text-gray-600 font-medium">Remarks</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                        {documentRequests
                                          .filter(d => d.employeeId === selectedEmployee.id)
                                          .sort((a, b) => {
                                            const statusOrder = { resubmit: 0, pending: 1, submitted: 2, approved: 3 };
                                            return statusOrder[a.status] - statusOrder[b.status];
                                          })
                                          .map((request) => (
                                          <tr key={request.id} className={`${
                                            request.status === 'resubmit' ? 'bg-[#800000]/10/50' : 
                                            request.status === 'pending' ? 'bg-orange-50/50' : 
                                            'hover:bg-gray-50/50'
                                          }`}>
                                            <td className="px-4 py-3">
                                              <p className="font-medium text-gray-800">{request.document}</p>
                                              {request.priority === 'high' && (
                                                <span className="text-xs text-[#800000] font-medium">High Priority</span>
                                              )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{formatDate(request.deadline)}</td>
                                            <td className="px-4 py-3">
                                              {request.status === 'resubmit' && (
                                                <span className="px-2 py-1 text-xs font-medium bg-[#800000]/20 text-[#800000] rounded">Re-submit</span>
                                              )}
                                              {request.status === 'pending' && (
                                                <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded">Pending</span>
                                              )}
                                              {request.status === 'submitted' && (
                                                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">Under Review</span>
                                              )}
                                              {request.status === 'approved' && (
                                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">Approved</span>
                                              )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 max-w-xs">
                                              {request.remarks ? (
                                                <p className="text-xs text-[#800000] truncate" title={request.remarks}>{request.remarks}</p>
                                              ) : (
                                                <span className="text-gray-400 italic text-xs">—</span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>

                              {/* Assessment and Agreement Records Section */}
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="font-semibold text-gray-800 bg-gray-100 px-3 py-2 rounded flex-1">Assessment and Agreement Records</h5>
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

                              {/* Info Banner */}
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <div>
                                    <p className="text-sm text-blue-800">
                                      <strong>Need to upload or update documents?</strong> Go to the <Link to="/agency/requirements" className="underline font-semibold hover:text-blue-900">Requirements</Link> module to manage all employee documents in one place.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ONBOARDING TAB */}
                          {currentTab === 'onboarding' && (
                            <div className="space-y-6">
                              {/* Trainings Section */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Trainings</h5>
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-4 py-2 text-left text-gray-600">Training Name</th>
                                        <th className="px-4 py-2 text-left text-gray-600">Date</th>
                                        <th className="px-4 py-2 text-left text-gray-600">Status</th>
                                        <th className="px-4 py-2 text-left text-gray-600">Certificate</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr className="border-t border-gray-200">
                                        <td className="px-4 py-3 text-gray-500 italic" colSpan="4">No trainings assigned yet.</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {/* Training History Section */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Training History</h5>
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-4 py-2 text-left text-gray-600">Training Name</th>
                                        <th className="px-4 py-2 text-left text-gray-600">Date</th>
                                        <th className="px-4 py-2 text-left text-gray-600">Taken At</th>
                                        <th className="px-4 py-2 text-left text-gray-600">Certificate</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr className="border-t border-gray-200">
                                        <td className="px-4 py-3 text-gray-500 italic" colSpan="4">No training history yet.</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                                <button className="mt-2 text-sm text-blue-600 hover:underline">+ Add Training History</button>
                              </div>

                              {/* Orientation Section */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Orientation</h5>
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-4 py-2 text-left text-gray-600">Orientation Date</th>
                                        <th className="px-4 py-2 text-left text-gray-600">Status</th>
                                        <th className="px-4 py-2 text-left text-gray-600">Notes</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr className="border-t border-gray-200">
                                        <td className="px-4 py-3 text-gray-500 italic" colSpan="3">No orientation scheduled yet.</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {/* Deployed Items Section */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Deployed Items</h5>
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-4 py-2 text-left text-gray-600">Item</th>
                                        <th className="px-4 py-2 text-left text-gray-600">Serial/ID</th>
                                        <th className="px-4 py-2 text-left text-gray-600">Date Issued</th>
                                        <th className="px-4 py-2 text-left text-gray-600">Condition</th>
                                        <th className="px-4 py-2 text-left text-gray-600">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr className="border-t border-gray-200">
                                        <td className="px-4 py-3 text-gray-500 italic" colSpan="5">No items deployed yet.</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
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
                              {/* Employment Details */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Employment Details</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Department:</span>
                                    <span className="ml-2 text-gray-800">{formData.department || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Position:</span>
                                    <span className="ml-2 text-gray-800">{formData.position || job.title || selectedEmployee.position || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Depot Assignment:</span>
                                    <span className="ml-2 text-gray-800">{formData.depot || job.depot || selectedEmployee.depot || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Date Available:</span>
                                    <span className="ml-2 text-gray-800">{formData.dateAvailable ? formatDate(formData.dateAvailable) : "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Currently Employed:</span>
                                    <span className="ml-2 text-gray-800">{formData.employed || "—"}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Personal Information */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Personal Information</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Last Name:</span>
                                    <span className="ml-2 text-gray-800">{formData.lastName || formData.lname || selectedEmployee.last || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">First Name:</span>
                                    <span className="ml-2 text-gray-800">{formData.firstName || formData.fname || selectedEmployee.first || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Middle Name:</span>
                                    <span className="ml-2 text-gray-800">{formData.middleName || formData.mname || selectedEmployee.middle || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Sex:</span>
                                    <span className="ml-2 text-gray-800">{formData.sex || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Birthday:</span>
                                    <span className="ml-2 text-gray-800">{formData.birthday ? formatDate(formData.birthday) : "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Marital Status:</span>
                                    <span className="ml-2 text-gray-800">{formData.maritalStatus || formData.marital_status || "—"}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Address Information */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Address Information</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">House/Unit No.:</span>
                                    <span className="ml-2 text-gray-800">{formData.residenceNo || formData.unit_house_number || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Street/Village:</span>
                                    <span className="ml-2 text-gray-800">{formData.street || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">City/Municipality:</span>
                                    <span className="ml-2 text-gray-800">{formData.city || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Zip Code:</span>
                                    <span className="ml-2 text-gray-800">{formData.zip || "—"}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Contact Information */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Contact Information</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Contact Number:</span>
                                    <span className="ml-2 text-gray-800">{formData.contactNumber || formData.contact || selectedEmployee.contact || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Email Address:</span>
                                    <span className="ml-2 text-gray-800">{formData.email || selectedEmployee.email || "—"}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Education & Skills */}
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Education & Skills</h5>
                                <div className="space-y-4">
                                  {/* Highest Educational Attainment */}
                                  <div>
                                    <div className="font-medium text-gray-700 mb-2">Highest Educational Attainment:</div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                      <div>
                                        <span className="text-gray-500">Educational Level:</span>
                                        <span className="ml-2 text-gray-800">{formData.education || formData.educational_attainment || "—"}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Year Graduated:</span>
                                        <span className="ml-2 text-gray-800">{formData.tertiaryYear || formData.year_graduated || "—"}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">School/Institution:</span>
                                        <span className="ml-2 text-gray-800">{formData.tertiarySchool || formData.institution_name || "—"}</span>
                                      </div>
                                      <div className="md:col-span-3">
                                        <span className="text-gray-500">Course/Program:</span>
                                        <span className="ml-2 text-gray-800">{formData.tertiaryProgram || "—"}</span>
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
                                        <span className="text-gray-500">—</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Specialized Training */}
                                  {(formData.specializedTraining || formData.specializedYear) && (
                                    <div>
                                      <div className="font-medium text-gray-700 mb-2">Specialized Training:</div>
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <span className="text-gray-500">Training/Certification Name:</span>
                                          <span className="ml-2 text-gray-800">{formData.specializedTraining || "—"}</span>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Year Completed:</span>
                                          <span className="ml-2 text-gray-800">{formData.specializedYear || "—"}</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* License Information (only for Delivery Drivers) */}
                              {(formData.position === 'Delivery Drivers' || job.title === 'Delivery Drivers') && (
                                <div>
                                  <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">License Information</h5>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="text-gray-500">License Classification:</span>
                                      <span className="ml-2 text-gray-800">{formData.licenseClassification || "—"}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">License Expiry Date:</span>
                                      <span className="ml-2 text-gray-800">{formData.licenseExpiry ? formatDate(formData.licenseExpiry) : "—"}</span>
                                    </div>
                                    {formData.restrictionCodes && Array.isArray(formData.restrictionCodes) && formData.restrictionCodes.length > 0 && (
                                      <div className="col-span-2">
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
                                </div>
                              )}

                              {/* Driving History (only for Delivery Drivers) */}
                              {(formData.position === 'Delivery Drivers' || job.title === 'Delivery Drivers') && (
                                <div>
                                  <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Driving History</h5>
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <span className="text-gray-500">Years of Driving Experience:</span>
                                        <span className="ml-2 text-gray-800">{formData.yearsDriving || "—"}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Has Truck Troubleshooting Knowledge:</span>
                                        <span className="ml-2 text-gray-800">{formData.truckKnowledge === 'yes' ? 'Yes' : formData.truckKnowledge === 'no' ? 'No' : "—"}</span>
                                      </div>
                                    </div>

                                    {formData.troubleshootingTasks && Array.isArray(formData.troubleshootingTasks) && formData.troubleshootingTasks.length > 0 && (
                                      <div>
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

                                    {formData.vehicleTypes && Array.isArray(formData.vehicleTypes) && formData.vehicleTypes.length > 0 && (
                                      <div>
                                        <span className="text-gray-500">Vehicles Driven:</span>
                                        <div className="ml-2 mt-1 flex flex-wrap gap-2">
                                          {formData.vehicleTypes.map((vehicle, idx) => (
                                            <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-gray-800 text-sm">
                                              {vehicle}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {(formData.takingMedications !== undefined || formData.tookMedicalTest !== undefined) && (
                                      <div>
                                        <span className="text-gray-500">Medical Information:</span>
                                        <div className="ml-2 mt-1 space-y-1 text-sm">
                                          <div>
                                            <span className="text-gray-600">Taking Medications:</span>
                                            <span className="ml-2 text-gray-800">{formData.takingMedications ? 'Yes' : 'No'}</span>
                                            {formData.takingMedications && formData.medicationReason && (
                                              <span className="ml-2 text-gray-600">({formData.medicationReason})</span>
                                            )}
                                          </div>
                                          <div>
                                            <span className="text-gray-600">Has Taken Medical Test:</span>
                                            <span className="ml-2 text-gray-800">{formData.tookMedicalTest ? 'Yes' : 'No'}</span>
                                            {formData.tookMedicalTest && formData.medicalTestDate && (
                                              <span className="ml-2 text-gray-600">({formatDate(formData.medicalTestDate)})</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Work Experience */}
                              {workExperiences && workExperiences.length > 0 && (
                                <div>
                                  <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Work Experience</h5>
                                  <div className="space-y-3">
                                    {workExperiences.map((exp, idx) => (
                                      <div key={idx} className="border border-gray-200 rounded p-3 text-sm">
                                        <div className="font-medium text-gray-800">{exp.company || "—"}</div>
                                        <div className="text-gray-600">{exp.role || exp.title || "—"} • {exp.date || exp.period || "—"}</div>
                                        {exp.reason && (
                                          <div className="text-gray-500 text-xs mt-1">Reason for leaving: {exp.reason}</div>
                                        )}
                                        {exp.notes && (
                                          <div className="text-gray-500 text-xs mt-1">{exp.notes}</div>
                                        )}
                                        {exp.tasks && (
                                          <div className="text-gray-500 text-xs mt-1">Tasks: {exp.tasks}</div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Character References */}
                              {!selectedEmployee?.is_agency && (
                                <div>
                                  <h5 className="font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">Character References</h5>
                                  <div className="space-y-2">
                                    {(() => {
                                      const rawRefs = Array.isArray(characterReferences) ? characterReferences : [];
                                      const displayRefs = rawRefs.length > 0 ? rawRefs : [{}];

                                      return displayRefs.map((ref, idx) => (
                                        <div key={idx} className="border border-gray-200 rounded p-3 text-sm">
                                          <div className="font-medium text-gray-800">{ref?.name || ''}</div>
                                          <div className="text-gray-600">{ref?.contact || ref?.contactNumber || ''}</div>
                                          <div className="text-gray-500 text-xs mt-1">{ref?.remarks || ''}</div>
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                </div>
                              )}
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
                            const isConfirmed = interviewConfirmedNormalized && interviewConfirmedNormalized.toLowerCase() === 'confirmed';
                            const isRejected = interviewConfirmedNormalized && interviewConfirmedNormalized.toLowerCase() === 'rejected';
                            const isIdle = interviewConfirmedNormalized && interviewConfirmedNormalized.toLowerCase() === 'idle';
                            
                            return (
                            <div className="space-y-6">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="font-semibold text-gray-800">Assessment</h5>
                              </div>
                              
                              <div className="bg-gray-50 border rounded-md p-4">
                                <div className="text-sm text-gray-800 font-semibold mb-2">Interview Schedule</div>
                                {hasInterview ? (
                                  <>
                                    <div className="text-sm text-gray-700 space-y-1">
                                      <div><span className="font-medium">Date:</span> <span className="text-gray-800">{interviewDate || "—"}</span></div>
                                      <div><span className="font-medium">Time:</span> <span className="text-gray-800">{interviewTime || "—"}</span></div>
                                      <div><span className="font-medium">Location:</span> <span className="text-gray-800">{selectedEmployee.interview_location || "—"}</span></div>
                                      <div><span className="font-medium">Interviewer:</span> <span className="text-gray-800">{selectedEmployee.interviewer || "—"}</span></div>
                                    </div>
                                    {/* Show status badge only if confirmed or rejected */}
                                    {(isConfirmed || isRejected) && (
                                      <div className="mt-3">
                                        <span className={`text-xs px-2 py-1 rounded font-medium ${
                                          isConfirmed
                                            ? 'bg-green-100 text-green-800 border border-green-300' 
                                            : 'bg-orange-100 text-orange-800 border border-orange-300'
                                        }`}>
                                          {isConfirmed ? '✓ Interview Confirmed' : 'Reschedule Requested'}
                                        </span>
                                      </div>
                                    )}
                                    {/* Show pending status if not confirmed/rejected */}
                                    {!isConfirmed && !isRejected && (
                                      <div className="mt-3">
                                        <span className="text-xs px-2 py-1 rounded font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                                          Interview Pending Confirmation
                                        </span>
                                      </div>
                                    )}
                                    <div className="mt-3 flex items-center justify-between">
                                      <div className="text-xs text-gray-500 italic">
                                        Important Reminder: {isConfirmed
                                          ? 'Interview has been confirmed by the applicant.' 
                                          : isRejected
                                          ? 'Interview was rejected by the applicant.'
                                          : 'Please confirm at least a day before your schedule.'}
                                      </div>
                                      {/* Show Confirm/Reject Interview buttons only if not yet confirmed/rejected */}
                                      {!isConfirmed && !isRejected && (
                                        <div className="flex gap-2">
                                          <button
                                            type="button"
                                            onClick={() => setShowRejectInterviewDialog(true)}
                                            className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 text-sm font-medium transition-colors"
                                          >
                                            Request for Reschedule
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setShowConfirmInterviewDialog(true)}
                                            className="px-4 py-2 bg-[#800000] text-white rounded-md hover:bg-[#990000] text-sm font-medium transition-colors"
                                          >
                                            Confirm Interview
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="text-sm text-gray-700 space-y-1">
                                      <div><span className="font-medium">Date:</span> <span className="text-gray-500 italic">To be scheduled</span></div>
                                      <div><span className="font-medium">Time:</span> <span className="text-gray-500 italic">To be scheduled</span></div>
                                      <div><span className="font-medium">Location:</span> <span className="text-gray-500 italic">To be scheduled</span></div>
                                      <div><span className="font-medium">Interviewer:</span> <span className="text-gray-500 italic">To be assigned</span></div>
                                    </div>
                                    <div className="mt-3 text-xs text-gray-500 italic">
                                      Important Reminder: Interview schedule will be set by HR once the endorsement is reviewed.
                                    </div>
                                  </>
                                )}
                              </div>

                              {/* Assessment Files */}
                              <div className="mt-6">
                                <div className="bg-gray-100 text-gray-800 px-3 py-2 text-sm font-semibold border rounded-t-md">Assessment Files</div>
                                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-gray-600 border-b bg-gray-50">
                                  <div className="col-span-6">Document</div>
                                  <div className="col-span-6">File</div>
                                </div>

                                {/* Interview Details File Row */}
                                <div className="border-b">
                                  <div className="grid grid-cols-12 items-center gap-3 px-3 py-3">
                                    <div className="col-span-12 md:col-span-6 text-sm text-gray-800 flex items-center gap-2">
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-600">
                                        <path fillRule="evenodd" d="M4.5 3.75a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V6.75a3 3 0 0 0-3-3h-15Zm4.125 3a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Zm-3.873 8.703a4.126 4.126 0 0 1 7.746 0 .75.75 0 0 1-.372.84A7.72 7.72 0 0 1 8 18.75a7.72 7.72 0 0 1-5.501-2.607.75.75 0 0 1-.372-.84Zm4.622-1.44a5.076 5.076 0 0 0 5.024 0l.348-1.597c.271.1.56.153.856.153h6a.75.75 0 0 0 0-1.5h-3.045c.01-.1.02-.2.02-.3V11.25c0-5.385-4.365-9.75-9.75-9.75S2.25 5.865 2.25 11.25v.756a2.25 2.25 0 0 0 1.988 2.246l.217.037a2.25 2.25 0 0 0 2.163-1.684l1.38-4.276a1.125 1.125 0 0 1 1.08-.82Z" clipRule="evenodd" />
                                      </svg>
                                      Interview Details
                                    </div>
                                    <div className="col-span-12 md:col-span-6 text-sm">
                                      {(() => {
                                        // Check multiple sources for the file path
                                        let interviewFile = selectedEmployee.interview_details_file;
                                        
                                        // If not found, check raw database column
                                        if (!interviewFile && selectedEmployee.raw?.interview_details_file) {
                                          interviewFile = selectedEmployee.raw.interview_details_file;
                                        }
                                        
                                        // If still not found, check parsed payload
                                        if (!interviewFile && selectedEmployee.payload?.interview_details_file) {
                                          interviewFile = selectedEmployee.payload.interview_details_file;
                                        }
                                        
                                        // If still not found, try parsing raw payload (might be a string)
                                        if (!interviewFile && selectedEmployee.raw?.payload) {
                                          let payloadObj = selectedEmployee.raw.payload;
                                          if (typeof payloadObj === 'string') {
                                            try {
                                              payloadObj = JSON.parse(payloadObj);
                                            } catch {
                                              payloadObj = {};
                                            }
                                          }
                                          if (payloadObj?.interview_details_file) {
                                            interviewFile = payloadObj.interview_details_file;
                                          }
                                        }
                                        
                                        if (interviewFile) {
                                          const fileUrl = supabase.storage.from('application-files').getPublicUrl(interviewFile)?.data?.publicUrl;
                                          const fileName = interviewFile.split('/').pop() || 'Interview Details';
                                          return (
                                            <div className="flex items-center gap-2">
                                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-600">
                                                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.525-1.72-1.72a.75.75 0 1 0-1.06 1.061l2.25 2.25a.75.75 0 0 0 1.144-.094l3.843-5.15Z" clipRule="evenodd" />
                                              </svg>
                                              <a 
                                                href={fileUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                                              >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                                  <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                                                  <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v3.5A2.75 2.75 0 0 0 4.75 19h10.5A2.75 2.75 0 0 0 18 16.25v-3.5a.75.75 0 0 0-1.5 0v3.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-3.5Z" />
                                                </svg>
                                                {fileName}
                                              </a>
                                            </div>
                                          );
                                        }
                                        return (
                                          <div className="flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gray-400">
                                              <path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75ZM6.75 15a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V15.75a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V15.75a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                                            </svg>
                                            <span className="text-sm text-gray-500 italic">No file uploaded yet</span>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Assessment Results File Row */}
                                <div className="border-b">
                                  <div className="grid grid-cols-12 items-center gap-3 px-3 py-3">
                                    <div className="col-span-12 md:col-span-6 text-sm text-gray-800 flex items-center gap-2">
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-600">
                                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.525-1.72-1.72a.75.75 0 1 0-1.06 1.061l2.25 2.25a.75.75 0 0 0 1.144-.094l3.843-5.15Z" clipRule="evenodd" />
                                      </svg>
                                      In-Person Assessment Results
                                    </div>
                                    <div className="col-span-12 md:col-span-6 text-sm">
                                      {(() => {
                                        // Check multiple sources for the file path
                                        let assessmentFile = selectedEmployee.assessment_results_file;
                                        
                                        // If not found, check raw database column
                                        if (!assessmentFile && selectedEmployee.raw?.assessment_results_file) {
                                          assessmentFile = selectedEmployee.raw.assessment_results_file;
                                        }
                                        
                                        // If still not found, check parsed payload
                                        if (!assessmentFile && selectedEmployee.payload?.assessment_results_file) {
                                          assessmentFile = selectedEmployee.payload.assessment_results_file;
                                        }
                                        
                                        // If still not found, try parsing raw payload (might be a string)
                                        if (!assessmentFile && selectedEmployee.raw?.payload) {
                                          let payloadObj = selectedEmployee.raw.payload;
                                          if (typeof payloadObj === 'string') {
                                            try {
                                              payloadObj = JSON.parse(payloadObj);
                                            } catch {
                                              payloadObj = {};
                                            }
                                          }
                                          if (payloadObj?.assessment_results_file) {
                                            assessmentFile = payloadObj.assessment_results_file;
                                          }
                                        }
                                        
                                        if (assessmentFile) {
                                          const fileUrl = supabase.storage.from('application-files').getPublicUrl(assessmentFile)?.data?.publicUrl;
                                          const fileName = assessmentFile.split('/').pop() || 'Assessment Results';
                                          return (
                                            <div className="flex items-center gap-2">
                                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-600">
                                                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.525-1.72-1.72a.75.75 0 1 0-1.06 1.061l2.25 2.25a.75.75 0 0 0 1.144-.094l3.843-5.15Z" clipRule="evenodd" />
                                              </svg>
                                              <a 
                                                href={fileUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                                              >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                                  <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                                                  <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v3.5A2.75 2.75 0 0 0 4.75 19h10.5A2.75 2.75 0 0 0 18 16.25v-3.5a.75.75 0 0 0-1.5 0v3.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-3.5Z" />
                                                </svg>
                                                {fileName}
                                              </a>
                                            </div>
                                          );
                                        }
                                        return (
                                          <div className="flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gray-400">
                                              <path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75ZM6.75 15a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V15.75a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V15.75a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                                            </svg>
                                            <span className="text-sm text-gray-500 italic">No file uploaded yet</span>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            );
                          })()}

                          {/* AGREEMENTS TAB (for pending) */}
                          {currentTab === 'agreements' && (
                            <div className="space-y-6">
                              <div className="bg-gray-100 text-gray-800 px-3 py-2 text-sm font-semibold border rounded-t-md">Document Name</div>
                              <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-gray-600 border-b">
                                <div className="col-span-6">&nbsp;</div>
                                <div className="col-span-3">File</div>
                                <div className="col-span-3">&nbsp;</div>
                              </div>

                              {/* Helper function to render agreement document row */}
                              {(() => {
                                const renderAgreementRow = (documentName, fileKey) => {
                                  // Check multiple sources for the file path
                                  let filePath = selectedEmployee?.[fileKey];
                                  
                                  // If not found, check raw database column
                                  if (!filePath && selectedEmployee?.raw?.[fileKey]) {
                                    filePath = selectedEmployee.raw[fileKey];
                                  }
                                  
                                  // If still not found, check parsed payload
                                  if (!filePath && selectedEmployee?.payload?.[fileKey]) {
                                    filePath = selectedEmployee.payload[fileKey];
                                  }
                                  
                                  // If still not found, try parsing raw payload (might be a string)
                                  if (!filePath && selectedEmployee?.raw?.payload) {
                                    let payloadObj = selectedEmployee.raw.payload;
                                    if (typeof payloadObj === 'string') {
                                      try {
                                        payloadObj = JSON.parse(payloadObj);
                                      } catch {
                                        payloadObj = {};
                                      }
                                    }
                                    if (payloadObj?.[fileKey]) {
                                      filePath = payloadObj[fileKey];
                                    }
                                  }
                                  
                                  const hasFile = !!filePath;
                                  
                                  return (
                                    <div key={fileKey} className="border-b">
                                      <div className="grid grid-cols-12 items-center gap-3 px-3 py-3">
                                        <div className="col-span-12 md:col-span-6 text-sm text-gray-800">{documentName}</div>
                                        <div className="col-span-12 md:col-span-3 text-sm">
                                          {hasFile ? (
                                            <>
                                              <a 
                                                href={supabase.storage.from('application-files').getPublicUrl(filePath)?.data?.publicUrl} 
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline"
                                              >
                                                {filePath.split('/').pop() || documentName}
                                              </a>
                                              {selectedEmployee.created_at && (
                                                <span className="ml-2 text-xs text-gray-500">
                                                  {new Date(selectedEmployee.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}
                                                </span>
                                              )}
                                            </>
                                          ) : (
                                            <span className="text-gray-400 italic">No file uploaded yet</span>
                                          )}
                                        </div>
                                        <div className="col-span-12 md:col-span-3" />
                                      </div>
                                    </div>
                                  );
                                };

                                return (
                                  <>
                                    {renderAgreementRow("Employee Appointment Letter", "appointment_letter_file")}
                                    {renderAgreementRow("Undertaking", "undertaking_file")}
                                    {renderAgreementRow("Application Form", "application_form_file")}
                                    {renderAgreementRow("Undertaking of Duties and Responsibilities", "undertaking_duties_file")}
                                    {renderAgreementRow("Roadwise Pre Employment Requirements", "pre_employment_requirements_file")}
                                    {renderAgreementRow("ID Form", "id_form_file")}
                                  </>
                                );
                              })()}

                              <div className="text-xs text-gray-500 italic mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                                <strong>Note:</strong> Once the employee is deployed, the appointment letter will be uploaded here by HR. The employee will receive their employee account credentials via email.
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                      );
                    })()}
                  </div>
                </>
                );
              })()}
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Interview Dialog */}
      {showConfirmInterviewDialog && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowConfirmInterviewDialog(false)}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">Confirm Interview</h3>
            <div className="text-sm text-gray-700 mb-6">
              Are you sure you want to confirm this interview schedule?
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                onClick={() => setShowConfirmInterviewDialog(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded bg-[#800000] text-white hover:bg-[#990000]"
                onClick={async () => {
                  if (!selectedEmployee.id) {
                    setAlertMessage('Error: Application ID not found');
                    setShowErrorAlert(true);
                    setShowConfirmInterviewDialog(false);
                    return;
                  }
                  
                  try {
                    const confirmedAt = new Date().toISOString();
                    
                    // Get applicant and interview info for notification
                    const applicantName = selectedEmployee.name || 'Applicant';
                    const position = selectedEmployee.position || selectedEmployee.raw?.job_posts?.title || 'Position';
                    const interviewDate = selectedEmployee.interview_date || selectedEmployee.raw?.interview_date || null;
                    const interviewTime = selectedEmployee.interview_time || selectedEmployee.raw?.interview_time || null;
                    
                    const { error: updateError } = await supabase
                      .from('applications')
                      .update({
                        interview_confirmed: 'Confirmed',
                        interview_confirmed_at: confirmedAt
                      })
                      .eq('id', selectedEmployee.id);
                    
                    if (updateError) {
                      console.error('Error confirming interview:', updateError);
                      setAlertMessage('Failed to confirm interview. Please try again.');
                      setShowErrorAlert(true);
                      setShowConfirmInterviewDialog(false);
                      return;
                    }
                    
                    // Notify HR about interview confirmation
                    await notifyHRAboutInterviewResponse({
                      applicationId: selectedEmployee.id,
                      applicantName,
                      position,
                      responseType: 'confirmed',
                      interviewDate,
                      interviewTime
                    });
                    
                    // Reload the endorsed employees to update the UI
                    loadEndorsed();
                    
                    // Update local state immediately
                    setSelectedEmployee(prev => ({
                      ...prev,
                      interview_confirmed: 'Confirmed',
                      interview_confirmed_at: confirmedAt,
                      raw: {
                        ...prev.raw,
                        interview_confirmed: 'Confirmed',
                        interview_confirmed_at: confirmedAt
                      }
                    }));
                    
                    setShowConfirmInterviewDialog(false);
                    setAlertMessage('Interview confirmed successfully! ✓');
                    setShowSuccessAlert(true);
                  } catch (err) {
                    console.error('Error confirming interview:', err);
                    setAlertMessage('Failed to confirm interview. Please try again.');
                    setShowErrorAlert(true);
                    setShowConfirmInterviewDialog(false);
                  }
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

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
                  if (!selectedEmployee.id) {
                    setShowRejectInterviewDialog(false);
                    return;
                  }
                  
                  try {
                    const rejectedAt = new Date().toISOString();
                    
                    // Get applicant and interview info for notification
                    const applicantName = selectedEmployee.name || 'Applicant';
                    const position = selectedEmployee.position || selectedEmployee.raw?.job_posts?.title || 'Position';
                    const interviewDate = selectedEmployee.interview_date || selectedEmployee.raw?.interview_date || null;
                    const interviewTime = selectedEmployee.interview_time || selectedEmployee.raw?.interview_time || null;
                    
                    const { error: updateError } = await supabase
                      .from('applications')
                      .update({
                        interview_confirmed: 'Rejected',
                        interview_confirmed_at: rejectedAt
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
                      interviewTime
                    });
                    
                    // Reload the endorsed employees to update the UI
                    loadEndorsed();
                    
                    // Update local state immediately
                    setSelectedEmployee(prev => ({
                      ...prev,
                      interview_confirmed: 'Rejected',
                      interview_confirmed_at: rejectedAt,
                      raw: {
                        ...prev.raw,
                        interview_confirmed: 'Rejected',
                        interview_confirmed_at: rejectedAt
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

