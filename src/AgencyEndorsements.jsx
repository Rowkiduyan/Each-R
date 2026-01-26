// src/AgencyEndorsements.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "./supabaseClient";
import LogoCropped from './layouts/photos/logo(cropped).png';
import { notifyHRAboutInterviewResponse, notifyHRAboutApplicationRetraction } from './notifications';
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
  const [endorsementsTab, setEndorsementsTab] = useState('pending'); // 'pending' | 'deployed' | 'retracted'
  
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
  
  // Search and filter for endorsements
  const [endorsementsSearch, setEndorsementsSearch] = useState('');
  const [sortOption, setSortOption] = useState('name-asc');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [positionFilter, setPositionFilter] = useState('All');
  const [depotFilter, setDepotFilter] = useState('All');
  const [employmentStatusFilter, setEmploymentStatusFilter] = useState('All');
  const [recruitmentTypeFilter, setRecruitmentTypeFilter] = useState('All');
  const [employeeDetailTab, setEmployeeDetailTab] = useState('profiling');

  // master department list (kept in sync with Employees.jsx)
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
            const hiredEmp = hiredEmployees.find(h =>
              (h.auth_user_id && r.user_id && String(h.auth_user_id) === String(r.user_id)) ||
              (email && h.email && normalizeEmail(h.email) === email)
            );

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
            position: pos || "—",
            depot: depot || "—",
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
          position: pos || "—",
          depot: depot || "—",
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
        .select("id, auth_user_id, email, fname, lname, mname, contact_number, position, depot, hired_at, agency_profile_id, endorsed_by_agency_id, is_agency, source, status")
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
              contact: r.contact_number || null,
              position: r.position || "Employee",
              depot: r.depot || "—",
              hired_at: r.hired_at || null,
              agency_profile_id: r.agency_profile_id || null,
              endorsed_by_agency_id: r.endorsed_by_agency_id || null,
              is_agency: !!r.is_agency,
              source: r.source || null,
              status: r.status || null,
              employmentStatus,
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
        const hiredEmp = hiredEmployees.find(h =>
          (h.auth_user_id && emp.user_id && String(h.auth_user_id) === String(emp.user_id)) ||
          (emp.email && h.email && normalizeEmail(h.email) === normalizeEmail(emp.email))
        );
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
          depot: emp.depot || hiredEmp.depot || "—",
          employmentStatus: emp.employmentStatus || hiredEmp.employmentStatus || null,
          agency: true,
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
          h.source === "agency";

        if (!isAgencyEmployee) return;

        const authKey = h.auth_user_id ? String(h.auth_user_id) : null;
        const emailKey = h.email ? normalizeEmail(h.email) : null;
        if (authKey && byAuthUserId.has(authKey)) return;
        if (emailKey && byEmail.has(emailKey)) return;
        if (!authKey && !emailKey) return;

        updatedList.push({
          id: `emp-${h.id}`,
          user_id: h.auth_user_id || null,
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
          employmentStatus: h.employmentStatus || null,
          agency: true,
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

        if (emailKey) byEmail.set(emailKey, true);
        if (authKey) byAuthUserId.set(authKey, true);
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

      return deduped;
    });
  }, [hiredEmployees]);

  const depotOptions = React.useMemo(() => {
    const set = new Set();
    for (const e of endorsedEmployees || []) {
      const d = e?.depot ? String(e.depot).trim() : "";
      if (d && d !== "—") set.add(d);
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
  const recruitmentTypes = ["All", "Agency", "Direct"];

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

    const getIsAgency = (emp) => {
      if (emp?.agency === true) return true;
      // Endorsements page is agency-scoped; treat unknown as agency.
      return true;
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

    const sourceList = endorsementsTab === 'retracted'
      ? (retractedEndorsements || [])
      : (endorsedEmployees || []);

    return sourceList
      .filter((emp) => endorsementsTab === 'retracted' ? true : emp?.status === endorsementsTab)
      .filter((emp) => {
        if (!searchLower) return true;
        return (
          String(emp?.name || "").toLowerCase().includes(searchLower) ||
          String(emp?.position || "").toLowerCase().includes(searchLower) ||
          String(emp?.depot || "").toLowerCase().includes(searchLower) ||
          String(emp?.status || "").toLowerCase().includes(searchLower) ||
          String(emp?.id || "").toLowerCase().includes(searchLower)
        );
      })
      .filter((emp) => {
        if (recruitmentTypeFilter === "All") return true;
        const isAgency = getIsAgency(emp);
        if (recruitmentTypeFilter === "Agency") return !!isAgency;
        if (recruitmentTypeFilter === "Direct") return !isAgency;
        return true;
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
  }, [endorsedEmployees, retractedEndorsements, hiredEmployees, endorsementsTab, endorsementsSearch, recruitmentTypeFilter, departmentFilter, positionFilter, depotFilter, employmentStatusFilter, sortOption]);

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
        setEmployeeIsAgency(false);
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
            .select('id, email, requirements, is_agency')
            .eq('id', employeeId)
            .single();
          data = result.data;
          error = result.error;
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
            setSelectedEmployee(prev => prev ? { ...prev, endorsed_employee_id: employeeId } : prev);
          }
        }
        
        if (error) {
          console.error('Error loading employee requirements:', error);
          setEmployeeRequirements(null);
          setEmployeeIsAgency(false);
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
          setEmployeeIsAgency(data?.is_agency === true);
        }
      } catch (err) {
        console.error('Unexpected error loading requirements:', err);
        setEmployeeRequirements(null);
        setEmployeeIsAgency(false);
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

    const idNumbers = requirementsData?.id_numbers || {};

    if (isAgency) {
      const idMapping = [
        { key: 'sss', name: 'SSS (Social Security System)' },
        { key: 'tin', name: 'TIN (Tax Identification Number)' },
        { key: 'pagibig', name: 'PAG-IBIG (HDMF)' },
        { key: 'philhealth', name: 'PhilHealth' },
      ];

      idMapping.forEach(({ key, name }) => {
        const idData = idNumbers[key];
        const filePath = idData?.file_path || idData?.filePath || null;
        const status = normalizeDocStatus(idData?.status);
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
      const filePath = idData?.file_path || idData?.filePath || null;
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
      setEmployeeDocuments(buildEmployeeDocuments(employeeRequirements, employeeIsAgency));
    } finally {
      setLoadingDocuments(false);
    }
  }, [employeeDetailTab, loadingRequirements, employeeRequirements, employeeIsAgency]);

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
          .select('id, interview_details_file, assessment_results_file, interview_notes_file, interview_notes_file_label, interview_notes, payload, appointment_letter_file, undertaking_file, application_form_file, undertaking_duties_file, pre_employment_requirements_file, id_form_file, created_at, user_id, status, job_posts:job_id(title, depot)')
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
          
          // Assessment Files (only if uploaded)
          if (mostRecentApp.interview_details_file) {
            records.push({
              id: `${mostRecentApp.id}-interview-details`,
              type: 'assessment',
              documentName: 'Interview Details',
              fileName: mostRecentApp.interview_details_file.split('/').pop() || null,
              filePath: mostRecentApp.interview_details_file,
              fileUrl: getFileUrl(mostRecentApp.interview_details_file),
              date: date,
              jobTitle: jobTitle,
              depot: depot,
              applicationId: mostRecentApp.id,
              icon: 'blue'
            });
          }

          if (mostRecentApp.assessment_results_file) {
            records.push({
              id: `${mostRecentApp.id}-assessment-results`,
              type: 'assessment',
              documentName: 'In-Person Assessment Results',
              fileName: mostRecentApp.assessment_results_file.split('/').pop() || null,
              filePath: mostRecentApp.assessment_results_file,
              fileUrl: getFileUrl(mostRecentApp.assessment_results_file),
              date: date,
              jobTitle: jobTitle,
              depot: depot,
              applicationId: mostRecentApp.id,
              icon: 'green'
            });
          }

          const rawInterviewNotesList = payloadObj?.interview_notes_attachments || payloadObj?.interviewNotesAttachments;
          const interviewNotesList = Array.isArray(rawInterviewNotesList) ? rawInterviewNotesList.slice() : [];
          const singleInterviewNote = payloadObj?.interview_notes_attachment || payloadObj?.interviewNotesAttachment || null;
          if (singleInterviewNote && typeof singleInterviewNote === 'object') {
            const singlePath = singleInterviewNote.path || singleInterviewNote.file_path || singleInterviewNote.filePath || singleInterviewNote.storagePath || null;
            if (singlePath && !interviewNotesList.some((item) => (item?.path || item?.file_path || item?.filePath || item?.storagePath) === singlePath)) {
              interviewNotesList.push(singleInterviewNote);
            }
          }

          const interviewNotesFilePath =
            mostRecentApp.interview_notes_file ||
            payloadObj?.interview_notes_file ||
            payloadObj?.interviewNotesFile ||
            null;
          const interviewNotesFileLabel =
            mostRecentApp.interview_notes_file_label ||
            payloadObj?.interview_notes_file_label ||
            payloadObj?.interviewNotesFileLabel ||
            null;
          if (interviewNotesFilePath && !interviewNotesList.some((item) => (item?.path || item?.file_path || item?.filePath || item?.storagePath) === interviewNotesFilePath)) {
            interviewNotesList.push({
              path: interviewNotesFilePath,
              label: interviewNotesFileLabel || 'Assessment Attachment',
              originalName: null,
              uploadedAt: null,
            });
          }

          interviewNotesList.forEach((attachment, idx) => {
            const filePath = attachment?.path || attachment?.file_path || attachment?.filePath || attachment?.storagePath || null;
            if (!filePath) return;
            records.push({
              id: `${mostRecentApp.id}-assessment-note-${idx}`,
              type: 'assessment',
              documentName: attachment?.label || 'Assessment Attachment',
              fileName: filePath.split('/').pop() || null,
              filePath: filePath,
              fileUrl: getFileUrl(filePath),
              date: date,
              jobTitle: jobTitle,
              depot: depot,
              applicationId: mostRecentApp.id,
              icon: 'green'
            });
          });
          
          // Agreement Files
          const payloadAgreementDocs = Array.isArray(payloadObj?.agreement_documents)
            ? payloadObj.agreement_documents
            : Array.isArray(payloadObj?.agreementDocuments)
              ? payloadObj.agreementDocuments
              : [];

          payloadAgreementDocs.forEach((doc, index) => {
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

          // Legacy agreement columns fallback (only if payload list is empty)
          if (payloadAgreementDocs.length === 0) {
            const agreementDocs = [
              { key: 'appointment-letter', name: 'Employee Appointment Letter', file: mostRecentApp.appointment_letter_file },
              { key: 'undertaking', name: 'Undertaking', file: mostRecentApp.undertaking_file },
              { key: 'application-form', name: 'Application Form', file: mostRecentApp.application_form_file },
              { key: 'undertaking-duties', name: 'Undertaking of Duties and Responsibilities', file: mostRecentApp.undertaking_duties_file },
              { key: 'pre-employment', name: 'Roadwise Pre Employment Requirements', file: mostRecentApp.pre_employment_requirements_file },
              { key: 'id-form', name: 'ID Form', file: mostRecentApp.id_form_file }
            ];

            agreementDocs.forEach((doc) => {
              if (!doc.file) return;
              records.push({
                id: `${mostRecentApp.id}-${doc.key}`,
                type: 'agreement',
                documentName: doc.name,
                fileName: String(doc.file).split('/').pop() || null,
                filePath: doc.file,
                fileUrl: getFileUrl(doc.file),
                date: date,
                jobTitle: jobTitle,
                depot: depot,
                applicationId: mostRecentApp.id,
              });
            });
          }
          
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
  const listLoading = isRetractedTab ? retractedLoading : endorsedLoading;
  const listError = isRetractedTab ? retractedError : endorsedError;
  const listCount = isRetractedTab ? retractedEndorsements.length : endorsedEmployees.length;
  const emptyListMessage = isRetractedTab ? 'No retracted applications yet.' : 'No endorsements yet.';

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
                          setEndorsementsTab('retracted');
                          setSelectedEmployee(null);
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(6,minmax(0,1fr))_auto] gap-2 items-center">
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

                    {/* Recruitment Type */}
                    <select
                      value={recruitmentTypeFilter}
                      onChange={(e) => setRecruitmentTypeFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] bg-white"
                    >
                      <option value="All">All Recruitment Type</option>
                      {recruitmentTypes.filter((t) => t !== "All").map((t) => (
                        <option key={t} value={t}>{t}</option>
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

                    {/* Export Button */}
                    <button className="w-full xl:w-auto px-2.5 py-2 border border-gray-200 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2 bg-white">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export
                    </button>
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
                  {isRetractedTab ? 'Loading retracted applications…' : 'Loading endorsements…'}
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
                      const endorsedAtLabel = endorsedAtRaw ? formatDate(endorsedAtRaw) : '—';

                      const appliedAtRaw = selectedEmployee.created_at || selectedEmployee.raw?.created_at || null;
                      const appliedAtLabel = appliedAtRaw ? formatDate(appliedAtRaw) : '—';

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
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">SSS:</span>
                                    <span className="ml-2 text-gray-800">{formData.hasSSS ? 'Yes' : 'No'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">PAG-IBIG:</span>
                                    <span className="ml-2 text-gray-800">{formData.hasPAGIBIG ? 'Yes' : 'No'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">TIN:</span>
                                    <span className="ml-2 text-gray-800">{formData.hasTIN ? 'Yes' : 'No'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">PhilHealth:</span>
                                    <span className="ml-2 text-gray-800">{formData.hasPhilHealth ? 'Yes' : 'No'}</span>
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
                                        <span className="font-semibold text-gray-900 text-left break-words">{interviewDate || '—'}</span>
                                      </div>
                                      <div className="grid grid-cols-[110px_1fr] gap-4">
                                        <span className="text-gray-500">Time</span>
                                        <span className="font-semibold text-gray-900 text-left break-words">{interviewTime || '—'}</span>
                                      </div>
                                      <div className="grid grid-cols-[110px_1fr] gap-4">
                                        <span className="text-gray-500">Location</span>
                                        <span className="font-semibold text-gray-900 text-left break-words">{selectedEmployee.interview_location || '—'}</span>
                                      </div>
                                      <div className="grid grid-cols-[110px_1fr] gap-4">
                                        <span className="text-gray-500">Interviewer</span>
                                        <span className="font-semibold text-gray-900 text-left break-words">{selectedEmployee.interviewer || '—'}</span>
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
                                          <span className="font-semibold text-gray-900 text-left break-words">{signingDate || '—'}</span>
                                        </div>
                                        <div className="grid grid-cols-[110px_1fr] gap-4">
                                          <span className="text-gray-500">Time</span>
                                          <span className="font-semibold text-gray-900 text-left break-words">{signingTime || '—'}</span>
                                        </div>
                                        <div className="grid grid-cols-[110px_1fr] gap-4">
                                          <span className="text-gray-500">Location</span>
                                          <span className="font-semibold text-gray-900 text-left break-words">{signingLocation || '—'}</span>
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

