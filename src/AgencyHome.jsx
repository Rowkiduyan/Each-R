// src/AgencyHome.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase, supabasePublic } from "./supabaseClient";
import { createNotification } from './notifications';
import LogoCropped from './layouts/photos/logo(cropped).png';
import Roadwise from './Roadwise.png';

function AgencyHome() {
  const navigate = useNavigate();
  const [activeTab] = useState("Job Postings");
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const profileDropdownRef = useRef(null);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  
  // Split view state
  const [showDetails, setShowDetails] = useState(false);

  // job posts state
  const [jobCards, setJobCards] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState(null);

  // hired state (for hired employee details modal)
  const [hiredEmployees, setHiredEmployees] = useState([]);
  const [hiredLoading, setHiredLoading] = useState(true);
  const [hiredError, setHiredError] = useState(null);

  // UI helpers for details
  const [selectedHiredEmployee, setSelectedHiredEmployee] = useState(null);
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  // Endorse-from-job flow (select employees)
  const [showEmployeePickerModal, setShowEmployeePickerModal] = useState(false);
  const [employeePickerJob, setEmployeePickerJob] = useState(null);
  const [employeePickerLoading, setEmployeePickerLoading] = useState(false);
  const [employeePickerSubmitting, setEmployeePickerSubmitting] = useState(false);
  const [employeePickerError, setEmployeePickerError] = useState(null);
  const [employeePickerSuccess, setEmployeePickerSuccess] = useState(null);
  const [employeePickerQuery, setEmployeePickerQuery] = useState('');
  const [employeePickerEmployees, setEmployeePickerEmployees] = useState([]);
  const [employeePickerSelectedIds, setEmployeePickerSelectedIds] = useState(() => new Set());
  const [showConfirmBulkEndorse, setShowConfirmBulkEndorse] = useState(false);

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

  // Search functions
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchTerm(searchInput.trim());
    setLocationFilter(locationInput.trim());
  };

  const locationSuggestions = Array.from(
    new Set(
      jobCards
        .map((job) => job.depot)
        .filter((loc) => typeof loc === 'string' && loc.trim().length > 0)
    )
  );

  const filteredLocationSuggestions = locationSuggestions.filter((loc) =>
    loc.toLowerCase().includes(locationInput.toLowerCase())
  );

  const filteredJobs = jobCards.filter((job) => {
    const keywordMatch = searchTerm
      ? job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description?.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    const locationMatch = locationFilter
      ? (job.depot || '').toLowerCase().includes(locationFilter.toLowerCase())
      : true;
    return keywordMatch && locationMatch;
  });

  const handleCardSelect = (job) => {
    setSelectedJob(job);
    setShowDetails(true);
  };

  const handleViewAll = () => {
    setShowDetails(false);
    setSelectedJob(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/employee/login");
  };

  const attachHiringStats = async (jobsList) => {
    try {
      const ids = (jobsList || []).map((j) => j?.id).filter(Boolean);
      if (ids.length === 0) return jobsList || [];

      const idSet = new Set(ids.map((v) => String(v)));
      const hiredByJobId = new Map();

      const bump = (jobId) => {
        const key = String(jobId || '');
        if (!key || !idSet.has(key)) return;
        hiredByJobId.set(key, (hiredByJobId.get(key) || 0) + 1);
      };

      const { data, error } = await supabasePublic
        .from("applications")
        .select("job_id, status")
        .in("job_id", ids);

      if (error) {
        console.warn("AgencyHome: failed to load application stats:", error);
        return jobsList || [];
      }

      for (const row of data || []) {
        if (!row?.job_id) continue;
        if (String(row.status || "").trim().toLowerCase() !== "hired") continue;
        bump(row.job_id);
      }

      // Back-compat: older application rows may store job id inside payload meta.
      const { data: legacyData, error: legacyError } = await supabasePublic
        .from("applications")
        .select("job_id, status, payload")
        .is("job_id", null)
        .limit(5000);

      if (legacyError) {
        console.warn("AgencyHome: failed to load legacy application stats:", legacyError);
      } else {
        for (const row of legacyData || []) {
          if (String(row?.status || "").trim().toLowerCase() !== "hired") continue;

          const payload = row?.payload;
          const legacyJobId =
            payload?.meta?.job_id ||
            payload?.meta?.jobId ||
            payload?.job_id ||
            payload?.jobId;

          if (legacyJobId) bump(legacyJobId);
        }
      }

      return (jobsList || []).map((j) => {
        const totalNum = Number(j.positions_needed);
        const hasLimit = Number.isFinite(totalNum) && totalNum > 0;
        const hiredCount = hiredByJobId.get(String(j.id)) || 0;
        const remaining = hasLimit ? Math.max(0, totalNum - hiredCount) : null;
        return { ...j, hired_count: hiredCount, remaining_slots: remaining };
      });
    } catch (e) {
      console.warn("AgencyHome: unexpected error computing remaining slots:", e);
      return jobsList || [];
    }
  };

  const isJobExpired = (job) => {
    if (!job?.expires_at) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiresAt = new Date(job.expires_at);
    expiresAt.setHours(0, 0, 0, 0);
    return today >= expiresAt;
  };

  // ---------- Load job posts ----------
  const loadJobPosts = async () => {
    setJobsLoading(true);
    setJobsError(null);
    try {
      const { data, error } = await supabase
        .from("job_posts")
        // Use '*' to avoid select-list mismatches when the table schema changes
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase fetch job_posts error:", error);
        setJobsError(error.message || "Failed to load job posts");
        setJobCards([]);
      } else {
        const normalized = (data || []).map((row) => {
          let responsibilities = [];
          if (Array.isArray(row.responsibilities)) responsibilities = row.responsibilities;
          else if (typeof row.responsibilities === "string")
            responsibilities = row.responsibilities.split(/\r?\n|;/).map(s => s.trim()).filter(Boolean);

          let posted = "Unknown";
          if (row.created_at) {
            posted = new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
          }

          return {
            id: row.id,
            title: row.title || "Untitled",
            department: row.department || "",
            depot: row.depot || "—",
            salary_range: row.salary_range || "",
            description: row.description || "",
            responsibilities,
            posted,
            jobType: row.job_type,
            urgent: row.urgent,
            expires_at: row.expires_at,
            positions_needed: row.positions_needed,
            raw: row,
          };
        });

        const withHiringStats = await attachHiringStats(normalized);
        const closable = withHiringStats.filter((job) => {
          const expired = isJobExpired(job);
          const totalNum = Number(job?.positions_needed);
          const hasLimit = Number.isFinite(totalNum) && totalNum > 0;
          const filled = hasLimit && (Number(job?.hired_count) || 0) >= totalNum;
          return expired || filled;
        });

        if (closable.length > 0) {
          await Promise.all(
            closable.map((job) => supabase.from('job_posts').update({ is_active: false }).eq('id', job.id))
          );
        }

        const openJobs = withHiringStats.filter((job) => {
          const expired = isJobExpired(job);
          const totalNum = Number(job?.positions_needed);
          const hasLimit = Number.isFinite(totalNum) && totalNum > 0;
          const filled = hasLimit && (Number(job?.hired_count) || 0) >= totalNum;
          return !expired && !filled;
        });

        setJobCards(openJobs);
      }
    } catch (err) {
      console.error("Unexpected error loading job posts:", err);
      setJobsError(String(err));
      setJobCards([]);
    } finally {
      setJobsLoading(false);
    }
  };

  // ---------- Load hired employees (employees table) ----------
  const loadHired = async () => {
    setHiredLoading(true);
    setHiredError(null);
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, email, fname, lname, mname, contact_number, position, depot, hired_at, agency_profile_id, source")
        .order("hired_at", { ascending: false });

      if (error) {
        console.error("Failed loading employees:", error);
        setHiredError(error.message || String(error));
        setHiredEmployees([]);
      } else {
        const normalized = (data || []).map((r) => {
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

  // initial loads + realtime subscriptions
  useEffect(() => {
    loadJobPosts();
    loadHired();

    // subscribe to employees changes
    const employeesChannel = supabase
      .channel("employees-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employees" },
        () => {
          loadHired();
        }
      )
      .subscribe();

    const jobsChannel = supabase
      .channel("job-posts-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "job_posts" },
        () => loadJobPosts()
      )
      .subscribe();

    const applicationsChannel = supabase
      .channel("applications-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "applications" },
        () => loadJobPosts()
      )
      .subscribe();

    return () => {
      if (employeesChannel) supabase.removeChannel(employeesChannel);
      if (jobsChannel) supabase.removeChannel(jobsChannel);
      if (applicationsChannel) supabase.removeChannel(applicationsChannel);
    };
  
  }, []);

  const parseRequirementsObject = (req) => {
    if (!req) return null;
    if (typeof req === 'object') return req;
    if (typeof req === 'string') {
      try { return JSON.parse(req); } catch { return null; }
    }
    return null;
  };

  const normalizeEmail = (v) => {
    const s = String(v || '').trim().toLowerCase();
    if (!s) return null;
    if (!s.includes('@')) return null;
    return s;
  };

  const extractApplicantFromPayload = (payload) => {
    if (!payload) return null;
    if (typeof payload === 'string') {
      try { return extractApplicantFromPayload(JSON.parse(payload)); } catch { return null; }
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

  const closeEmployeePicker = () => {
    setShowEmployeePickerModal(false);
    setEmployeePickerJob(null);
    setEmployeePickerLoading(false);
    setEmployeePickerSubmitting(false);
    setEmployeePickerError(null);
    setEmployeePickerSuccess(null);
    setEmployeePickerQuery('');
    setEmployeePickerEmployees([]);
    setEmployeePickerSelectedIds(new Set());
    setShowConfirmBulkEndorse(false);
  };

  const openConfirmBulkEndorse = () => {
    setEmployeePickerError(null);
    setEmployeePickerSuccess(null);
    setShowConfirmBulkEndorse(true);
  };

  const loadEmployeePickerEmployees = async (job) => {
    setEmployeePickerLoading(true);
    setEmployeePickerError(null);
    try {
      const { data: authRes, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authRes?.user) throw new Error('Unable to verify user.');
      const user = authRes.user;

      const { data, error } = await supabase
        .from('employees')
        .select('id, auth_user_id, email, fname, lname, mname, contact_number, position, depot, department, birthday, created_at, hired_at, agency_profile_id, endorsed_by_agency_id, is_agency, source, status, requirements, personal_email')
        .or(`agency_profile_id.eq.${user.id},endorsed_by_agency_id.eq.${user.id}`)
        .neq('source', 'internal')
        .order('hired_at', { ascending: false });

      if (error) throw error;

      // Exclude employees already in pending/deployed endorsements (match AgencyEndorsements behavior)
      const hideIds = new Set();
      try {
        const { data: apps, error: appsErr } = await supabase
          .from('applications')
          .select('id, payload, endorsed, status')
          .eq('endorsed', true)
          .neq('status', 'retracted')
          .neq('status', 'rejected')
          .limit(2500);

        if (!appsErr && Array.isArray(apps)) {
          for (const a of apps) {
            const payload = a?.payload;
            let employeeId = null;
            if (payload && typeof payload === 'object') {
              employeeId = payload?.meta?.employee_id || payload?.meta?.employeeId || payload?.employee_id || payload?.employeeId || null;
            }
            if (employeeId != null) {
              hideIds.add(String(employeeId));
              continue;
            }
          }
        }
      } catch {
        // Non-fatal; we can still show list
      }

      const normalized = (data || [])
        .filter((r) => r?.source !== 'internal')
        .filter((r) => !hideIds.has(String(r.id)))
        .map((r) => {
          const name = [r.fname, r.mname, r.lname].filter(Boolean).join(' ').trim() || r.email || 'Unnamed';
          return {
            id: r.id,
            name,
            auth_user_id: r.auth_user_id || null,
            email: r.email || null,
            personal_email: r.personal_email || null,
            contact: r.contact_number || null,
            position: r.position || 'Employee',
            depot: r.depot || '—',
            department: r.department || null,
            birthday: r.birthday || null,
            requirements: r.requirements && typeof r.requirements === 'object' ? r.requirements : (parseRequirementsObject(r.requirements) || null),
            raw: r,
          };
        });

      setEmployeePickerEmployees(normalized);

      // If this job post is driver/helper, precompute warnings (UI-only)
      const role = getJobRoleForEligibility(job);
      if (role === 'driver' || role === 'helper') {
        // no-op; computed on render
      }
    } catch (err) {
      console.error('AgencyHome employee picker load error:', err);
      setEmployeePickerEmployees([]);
      setEmployeePickerError(err?.message || String(err));
    } finally {
      setEmployeePickerLoading(false);
    }
  };

  const openEmployeePickerForJob = async (job) => {
    setEmployeePickerJob(job);
    setShowEmployeePickerModal(true);
    setEmployeePickerSelectedIds(new Set());
    setEmployeePickerSuccess(null);
    setEmployeePickerError(null);
    await loadEmployeePickerEmployees(job);
  };

  const toggleEmployeeSelection = (empId) => {
    const id = String(empId);
    setEmployeePickerSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedEmployees = useMemo(() => {
    const set = employeePickerSelectedIds;
    const list = employeePickerEmployees || [];
    if (!set || set.size === 0) return [];
    const byId = new Map(list.map((e) => [String(e.id), e]));
    const out = [];
    for (const id of set) {
      const emp = byId.get(String(id));
      if (emp) out.push(emp);
    }
    return out;
  }, [employeePickerEmployees, employeePickerSelectedIds]);

  const bulkEndorseSelectedEmployees = async () => {
    const job = employeePickerJob;
    if (!job?.id) {
      setEmployeePickerError('No job selected.');
      return;
    }
    if (!selectedEmployees || selectedEmployees.length === 0) {
      setEmployeePickerError('Select at least one employee.');
      return;
    }

    setEmployeePickerSubmitting(true);
    setEmployeePickerError(null);
    setEmployeePickerSuccess(null);

    try {
      const { data: authRes, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authRes?.user) throw new Error('Unable to verify user.');
      const user = authRes.user;

      // Load existing endorsements for this job once
      let existingByEmail = new Map();
      try {
        const { data: apps, error: appsErr } = await supabase
          .from('applications')
          .select('id, payload, endorsed, status')
          .eq('job_id', job.id)
          .eq('endorsed', true)
          .neq('status', 'retracted');

        if (!appsErr && Array.isArray(apps)) {
          for (const a of apps) {
            const em = extractEmailFromApplicationPayload(a.payload);
            if (em) existingByEmail.set(em, a);
          }
        }
      } catch {
        // non-fatal
      }

      // Preload HR users once
      let hrUsers = [];
      try {
        const { data: hrData, error: hrError } = await supabase
          .from('profiles')
          .select('id, role, depot')
          .in('role', ['HR', 'HRC']);
        if (!hrError && Array.isArray(hrData)) hrUsers = hrData;
      } catch {
        // non-fatal
      }

      const role = getJobRoleForEligibility(job);
      const results = {
        endorsed: 0,
        skipped: 0,
        failed: 0,
        details: [],
      };

      for (const employee of selectedEmployees) {
        try {
          // Eligibility gate for Driver/Helper job posts
          if (role === 'driver' || role === 'helper') {
            const missing = getEmployeeMissingFieldsForRole(employee, role);
            if (missing.length > 0) {
              results.skipped += 1;
              results.details.push({ employeeId: employee.id, name: employee.name, outcome: 'skipped', reason: `Incomplete info: ${missing.join(', ')}` });
              continue;
            }
          }

          const empEmail = normalizeEmail(employee.email);
          if (!empEmail) {
            results.failed += 1;
            results.details.push({ employeeId: employee.id, name: employee.name, outcome: 'failed', reason: 'Missing email' });
            continue;
          }

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
              endorsement_source: 'agency_home_bulk',
              employee_id: employee.id,
            },
          };

          const existing = existingByEmail.get(empEmail) || null;
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
          if (applicationId && Array.isArray(hrUsers) && hrUsers.length > 0) {
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

          results.endorsed += 1;
          results.details.push({ employeeId: employee.id, name: employee.name, outcome: 'endorsed' });
        } catch (e) {
          console.error('AgencyHome bulk endorse failed for employee:', employee?.id, e);
          results.failed += 1;
          results.details.push({ employeeId: employee.id, name: employee.name, outcome: 'failed', reason: e?.message || String(e) });
        }
      }

      const msgParts = [];
      if (results.endorsed > 0) msgParts.push(`Endorsed ${results.endorsed}`);
      if (results.skipped > 0) msgParts.push(`Skipped ${results.skipped}`);
      if (results.failed > 0) msgParts.push(`Failed ${results.failed}`);
      const msg = msgParts.length > 0 ? `${msgParts.join(' · ')} employees.` : 'No changes made.';

      if (results.endorsed > 0) {
        setEmployeePickerSuccess(msg);
        // Refresh job stats
        await loadJobPosts();
        // Reload employee pool to reflect removal from My Employees
        await loadEmployeePickerEmployees(job);
        setEmployeePickerSelectedIds(new Set());
      } else {
        setEmployeePickerError(msg);
      }
    } catch (err) {
      console.error('AgencyHome bulk endorse error:', err);
      setEmployeePickerError(err?.message || String(err));
    } finally {
      setEmployeePickerSubmitting(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }); }
    catch { return String(d); }
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
                className="pb-1 text-[#800000] border-b-2 border-[#800000]"
              >
                Home
              </button>

              <button
                type="button"
                onClick={() => navigate("/agency/endorsements")}
                className="pb-1 hover:text-gray-900 transition-colors"
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

      {/* Search Bar with Photo Banner - Only show on Job Postings tab */}
      {activeTab === "Job Postings" && (
        <div className="relative -mx-6" style={{ width: 'calc(100% + 3rem)' }}>
          <div className="relative">
            <img
              src={Roadwise}
              alt="Delivery trucks on the road"
              className="w-full h-[200px] object-cover"
            />
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute inset-0 flex items-center justify-center px-4">
              <form className="w-full max-w-4xl" onSubmit={handleSearchSubmit}>
                <div className="flex flex-col gap-3">
                  <div className="flex items-stretch bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                    <div className="flex-1 flex items-center px-5 py-4">
                      <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none"
                        placeholder=" Job title, keywords, or company"
                      />
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
                        className="bg-[#800000] text-white px-5 py-2 text-base font-semibold rounded-xl hover:bg-[#990000] transition-colors"
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
      )}

      {/* Content */}
      <div className="flex flex-col items-center flex-1">
        <div className="w-full px-6 py-8">
          {/* Job Postings */}
          <section className={`${activeTab === "Job Postings" ? "" : "hidden"}`}>
              {jobsLoading ? (
                <div className="text-gray-600">Loading job postings…</div>
              ) : jobsError ? (
                <div className="text-[#800000]">Error loading job posts: {jobsError}</div>
              ) : jobCards.length === 0 ? (
                <div className="text-gray-600">No job postings available.</div>
              ) : filteredJobs.length === 0 ? (
                <div className="text-gray-600">No job postings match your search.</div>
              ) : showDetails && selectedJob ? (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={handleViewAll}
                    className="flex items-center text-blue-600 hover:text-blue-700 font-medium gap-2"
                  >
                    ← View all Job posts
                  </button>
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="lg:w-1/3 max-h-[70vh] overflow-y-auto no-scrollbar pr-2">
                      <div className="space-y-4">
                        {filteredJobs.map((job) => {
                          const isSelected = selectedJob?.id === job.id;
                          return (
                            <div
                              key={job.id}
                              className={`bg-white rounded-lg shadow-md p-6 flex flex-col relative overflow-hidden cursor-pointer transition-colors ${
                                isSelected ? 'border-2 border-[#800000]' : 'border border-transparent'
                              } hover:bg-gray-100`}
                              onClick={() => handleCardSelect(job)}
                            >
                              {job.urgent && (
                                <div className="absolute top-0 left-0 bg-[#800000] text-white text-xs font-bold px-4 py-1">
                                  URGENT HIRING!
                                </div>
                              )}
                              <div className="mt-4 flex flex-col flex-grow">
                                <h3 className="text-xl font-bold text-gray-800 mb-2">{job.title}</h3>
                                <div className="flex justify-between items-center mb-2 text-sm text-gray-600">
                                  <span>{job.depot}</span>
                                  <span>Posted {job.posted}</span>
                                </div>
                                {String(job.salary_range || '').trim() && (
                                  <div className="text-xs text-gray-500 mb-2">Salary: {String(job.salary_range || '').trim()}</div>
                                )}
                                <p className="text-gray-700 line-clamp-3">{job.description}</p>
                                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                                  <span className="px-2 py-1 bg-gray-100 rounded">
                                    {job.positions_needed == null
                                      ? 'Employees Needed: No limit'
                                      : `Employees Needed: ${typeof job.remaining_slots === 'number' ? job.remaining_slots : (job.positions_needed || 1)}`}
                                  </span>
                                  <span className="px-2 py-1 bg-gray-100 rounded">
                                    {job.expires_at
                                      ? `Closes on: ${formatDate(job.expires_at)}`
                                      : (job.positions_needed == null ? 'Open until manually closed' : 'Closes when filled')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="lg:w-2/3 flex flex-col gap-4">
                      <div className="bg-white rounded-lg shadow-md p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div className="space-y-3">
                          {selectedJob.urgent && (
                            <div className="inline-block px-4 py-1 rounded bg-[#800000]/20 text-[#800000] text-2xl font-semibold">
                              Urgent Hiring
                            </div>
                          )}
                          <div className="flex items-start justify-between gap-4">
                            <h2 className="text-2xl font-bold text-gray-800">{selectedJob.title}</h2>
                            <button
                              className="px-5 py-2.5 bg-[#800000] text-white rounded-lg font-medium hover:bg-[#990000] transition-colors"
                              onClick={() => openEmployeePickerForJob(selectedJob)}
                            >
                              Endorse
                            </button>
                          </div>
                          <div className="text-sm text-gray-600 flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center justify-center w-5 h-5 text-[#800000]">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
                                </svg>
                              </span>
                              <span className="font-semibold">{selectedJob.depot}</span>
                            </div>
                            <span className="text-xs text-gray-500">Posted {selectedJob.posted}</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                              <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2">
                                <div className="text-[11px] text-gray-500">Employees Needed</div>
                                <div className="text-sm font-semibold text-gray-800">
                                  {selectedJob.positions_needed == null
                                    ? 'No limit'
                                    : `${typeof selectedJob.remaining_slots === 'number' ? selectedJob.remaining_slots : (selectedJob.positions_needed || 1)}`}
                                </div>
                              </div>
                              <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2">
                                <div className="text-[11px] text-gray-500">Application Duration</div>
                                <div className="text-sm font-semibold text-gray-800">
                                  {selectedJob.expires_at ? `Closes on ${formatDate(selectedJob.expires_at)}` : 'Closes when headcount is reached'}
                                </div>
                              </div>
                            </div>
                            {String(selectedJob.salary_range || '').trim() && (
                              <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2 mt-2">
                                <div className="text-[11px] text-gray-500">Salary Range</div>
                                <div className="text-sm font-semibold text-gray-800">{String(selectedJob.salary_range || '').trim()}</div>
                              </div>
                            )}
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
                                    <ul className="list-none text-gray-700 space-y-1">
                                      {responsibilities.map((item, idx) => (
                                        <li key={idx}>{item}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {keyRequirements.length > 0 && (
                                  <div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Basic Key Requirements</h3>
                                    <ul className="list-none text-gray-700 space-y-1">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredJobs.map((job) => (
                    <div
                      key={job.id}
                      className="bg-white rounded-lg shadow-md p-6 flex flex-col relative overflow-hidden cursor-pointer transition-colors hover:bg-gray-100 border border-transparent"
                      onClick={() => handleCardSelect(job)}
                    >
                      {job.urgent && (
                        <div className="absolute top-0 left-0 bg-[#800000] text-white text-xs font-bold px-4 py-1">
                          URGENT HIRING!
                        </div>
                      )}
                      <div className="mt-4 flex flex-col flex-grow">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">{job.title}</h3>
                        <div className="flex justify-between items-center mb-2 text-sm text-gray-600">
                          <span>{job.depot}</span>
                          <span>Posted {job.posted}</span>
                        </div>
                        {String(job.salary_range || '').trim() && (
                          <div className="text-xs text-gray-500 mb-2">Salary: {String(job.salary_range || '').trim()}</div>
                        )}
                        <p className="text-gray-700 line-clamp-3">{job.description}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                          <span className="px-2 py-1 bg-gray-100 rounded">
                            {job.positions_needed == null
                              ? 'Employees Needed: No limit'
                              : `Employees Needed: ${typeof job.remaining_slots === 'number' ? job.remaining_slots : (job.positions_needed || 1)}`}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 rounded">
                            {job.expires_at
                              ? `Closes on: ${formatDate(job.expires_at)}`
                              : (job.positions_needed == null ? 'Open until manually closed' : 'Closes when filled')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </section>

        {/* Employees Hired */}
        <section className={`${activeTab === "Hired" ? "" : "hidden"}`}>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Employees Hired</h2>

            {hiredLoading ? (
              <div className="p-6 text-gray-600">Loading hired employees…</div>
            ) : hiredError ? (
              <div className="p-4 bg-[#800000]/10 text-[#800000] rounded">{hiredError}</div>
            ) : hiredEmployees.length === 0 ? (
              <div className="p-6 text-gray-600">No hired employees yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-3 py-2 text-left">ID</th>
                      <th className="border px-3 py-2 text-left">Name</th>
                      <th className="border px-3 py-2 text-left">Position</th>
                      <th className="border px-3 py-2 text-left">Depot</th>
                      <th className="border px-3 py-2 text-left">Hired Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hiredEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedHiredEmployee(emp); setShowEmployeeDetails(true); }}>
                        <td className="border px-3 py-2 text-gray-500">{emp.id}</td>
                        <td className="border px-3 py-2 font-medium text-blue-600 underline">{emp.name}</td>
                        <td className="border px-3 py-2">{emp.position}</td>
                        <td className="border px-3 py-2">{emp.depot}</td>
                        <td className="border px-3 py-2">{formatDate(emp.hired_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
        </div>
      </div>

      {/* Job Detail Modal */}
      {showJobModal && selectedJob && (
        <div className="fixed inset-0 flex items-center justify-center z-50" onClick={() => setShowJobModal(false)}>
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] border-2 border-black overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">{selectedJob.title}</h2>
              <button onClick={() => setShowJobModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[80vh] space-y-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-700 font-semibold">{selectedJob.depot}</span>
                <span className="text-sm text-gray-500">Posted {selectedJob.posted}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2">
                  <div className="text-[11px] text-gray-500">Employees Needed</div>
                  <div className="text-sm font-semibold text-gray-800">
                    {selectedJob.positions_needed == null
                      ? 'No limit'
                      : `${typeof selectedJob.remaining_slots === 'number' ? selectedJob.remaining_slots : (selectedJob.positions_needed || 1)}`}
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2">
                  <div className="text-[11px] text-gray-500">Application Duration</div>
                  <div className="text-sm font-semibold text-gray-800">
                    {selectedJob.expires_at ? `Closes on ${formatDate(selectedJob.expires_at)}` : 'Closes when headcount is reached'}
                  </div>
                </div>
              </div>

              {String(selectedJob.salary_range || '').trim() && (
                <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2">
                  <div className="text-[11px] text-gray-500">Salary Range</div>
                  <div className="text-sm font-semibold text-gray-800">{String(selectedJob.salary_range || '').trim()}</div>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Job Description</h3>
                <p className="text-gray-700">{selectedJob.description}</p>
              </div>

              {(() => {
                const { responsibilities, keyRequirements } = splitJobDetails(selectedJob.responsibilities);
                return (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-2">Main Responsibilities</h3>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {responsibilities.length > 0 ? (
                          responsibilities.map((resp, idx) => <li key={idx}>{resp}</li>)
                        ) : (
                          <li className="text-gray-500">No responsibilities listed.</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-2">Basic Key Requirements</h3>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {keyRequirements.length > 0 ? (
                          keyRequirements.map((req, idx) => <li key={idx}>{req}</li>)
                        ) : (
                          <li className="text-gray-500">No requirements listed.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={() => setShowJobModal(false)} className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">Close</button>
                <button
                  onClick={() => {
                    setShowJobModal(false);
                    openEmployeePickerForJob(selectedJob);
                  }}
                  className="px-5 py-2.5 bg-[#800000] text-white rounded-lg font-medium hover:bg-[#990000] transition-colors"
                >
                  Endorse Employee
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Picker Modal (Endorse from Job) */}
      {showEmployeePickerModal && employeePickerJob && (
        <div className="fixed inset-0 flex items-center justify-center z-50" onClick={closeEmployeePicker}>
          <div
            className="bg-white rounded-lg w-full max-w-5xl mx-4 max-h-[90vh] border border-gray-200 shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-4 border-b bg-gray-50">
              <div>
                <div className="text-sm text-gray-600">Select employees to endorse</div>
                <div className="text-lg font-bold text-gray-900">{employeePickerJob.title || 'Job Post'}</div>
                <div className="text-xs text-gray-500">{employeePickerJob.depot || '—'} · {employeePickerJob.department || '—'}</div>
              </div>
              <button
                type="button"
                onClick={closeEmployeePicker}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="p-4">
              {employeePickerError ? (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm whitespace-pre-wrap">{employeePickerError}</div>
              ) : null}
              {employeePickerSuccess ? (
                <div className="mb-3 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{employeePickerSuccess}</div>
              ) : null}

              <div className="flex items-center gap-3 mb-4">
                <input
                  value={employeePickerQuery}
                  onChange={(e) => setEmployeePickerQuery(e.target.value)}
                  placeholder="Search employee name, email, depot…"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
                />
                <button
                  type="button"
                  onClick={() => loadEmployeePickerEmployees(employeePickerJob)}
                  disabled={employeePickerLoading || employeePickerSubmitting}
                  className={`px-4 py-2.5 rounded-lg text-sm font-semibold border ${
                    (employeePickerLoading || employeePickerSubmitting) ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Refresh
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Employee list */}
                <div className="lg:col-span-2 border border-gray-200 rounded-lg overflow-hidden">
                  <div className="max-h-[55vh] overflow-y-auto">
                    {employeePickerLoading ? (
                      <div className="p-4 text-sm text-gray-600">Loading employees…</div>
                    ) : employeePickerEmployees.length === 0 ? (
                      <div className="p-4 text-sm text-gray-600">No employees found in My Employees.</div>
                    ) : (() => {
                      const q = String(employeePickerQuery || '').trim().toLowerCase();
                      const role = getJobRoleForEligibility(employeePickerJob);
                      const filtered = (employeePickerEmployees || []).filter((emp) => {
                        if (!q) return true;
                        const hay = `${emp?.name || ''} ${emp?.email || ''} ${emp?.depot || ''} ${emp?.department || ''} ${emp?.position || ''}`.toLowerCase();
                        return hay.includes(q);
                      });

                      if (filtered.length === 0) {
                        return <div className="p-4 text-sm text-gray-600">No matching employees.</div>;
                      }

                      return (
                        <div className="divide-y divide-gray-100">
                          {filtered.map((emp) => {
                            const id = String(emp.id);
                            const checkboxId = `agency-home-endorse-emp-${id}`;
                            const checked = employeePickerSelectedIds.has(id);
                            const missing = (role === 'driver' || role === 'helper') ? getEmployeeMissingFieldsForRole(emp, role) : [];
                            const blocked = missing.length > 0;

                            return (
                              <div
                                key={id}
                                className={`w-full p-4 flex items-start gap-3 transition-colors ${
                                  blocked ? 'bg-gray-50' : 'hover:bg-gray-50'
                                }`}
                              >
                                <div className="pt-0.5">
                                  <input
                                    id={checkboxId}
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleEmployeeSelection(emp.id)}
                                    disabled={employeePickerSubmitting || blocked}
                                    className="h-4 w-4"
                                  />
                                </div>
                                <label
                                  htmlFor={checkboxId}
                                  className={`flex-1 ${blocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-semibold text-gray-900">{emp.name}</div>
                                    <div className="text-xs text-gray-500">#{emp.id}</div>
                                  </div>
                                  <div className="mt-1 text-xs text-gray-600">{emp.position || 'Employee'} · {emp.department || '—'} · {emp.depot || '—'}</div>
                                  {emp.email ? <div className="mt-1 text-xs text-gray-500">{emp.email}</div> : null}
                                  {blocked ? (
                                    <div className="mt-2 text-xs text-red-600 font-medium">
                                      Incomplete employee info for this {role} post
                                    </div>
                                  ) : null}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Summary */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <div className="text-sm font-semibold text-gray-900">Selected ({selectedEmployees.length})</div>
                    <div className="text-xs text-gray-500">Review before endorsing</div>
                  </div>
                  <div className="p-4 max-h-[55vh] overflow-y-auto">
                    {selectedEmployees.length === 0 ? (
                      <div className="text-sm text-gray-600">No employees selected yet.</div>
                    ) : (
                      <div className="space-y-3">
                        {selectedEmployees.map((emp) => (
                          <div key={String(emp.id)} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-sm font-semibold text-gray-900">{emp.name}</div>
                                <div className="text-xs text-gray-600">{emp.position || 'Employee'} · {emp.depot || '—'}</div>
                                {emp.email ? <div className="text-xs text-gray-500">{emp.email}</div> : null}
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleEmployeeSelection(emp.id)}
                                disabled={employeePickerSubmitting}
                                className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-4 border-t bg-white">
                    <button
                      type="button"
                      onClick={openConfirmBulkEndorse}
                      disabled={employeePickerSubmitting || selectedEmployees.length === 0}
                      className={`w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors ${
                        (employeePickerSubmitting || selectedEmployees.length === 0) ? 'bg-gray-400' : 'bg-[#800000] hover:bg-[#990000]'
                      }`}
                    >
                      {employeePickerSubmitting ? 'Endorsing…' : 'Endorse Selected'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmployeePickerSelectedIds(new Set())}
                      disabled={employeePickerSubmitting || selectedEmployees.length === 0}
                      className={`mt-2 w-full px-4 py-2.5 rounded-lg text-sm font-semibold border ${
                        (employeePickerSubmitting || selectedEmployees.length === 0) ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Bulk Endorse Modal */}
      {showEmployeePickerModal && employeePickerJob && showConfirmBulkEndorse && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60]"
          onClick={() => setShowConfirmBulkEndorse(false)}
        >
          <div
            className="bg-white rounded-lg w-full max-w-lg mx-4 border border-gray-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b bg-gray-50">
              <div className="text-lg font-bold text-gray-900">Confirm endorsement</div>
              <div className="text-xs text-gray-500">{employeePickerJob.title || 'Job Post'}</div>
            </div>
            <div className="p-4">
              <div className="text-sm text-gray-700">
                Are you sure you want to Summarize ({selectedEmployees.map((e) => e?.name || 'Unnamed').join(', ')})?
              </div>
              <div className="mt-3 border border-gray-200 rounded-lg max-h-56 overflow-y-auto">
                {selectedEmployees.map((emp) => (
                  <div key={String(emp.id)} className="px-3 py-2 border-b last:border-b-0">
                    <div className="text-sm font-semibold text-gray-900">{emp.name}</div>
                    <div className="text-xs text-gray-600">{emp.position || 'Employee'} · {emp.depot || '—'}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmBulkEndorse(false)}
                  disabled={employeePickerSubmitting}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setShowConfirmBulkEndorse(false);
                    await bulkEndorseSelectedEmployees();
                  }}
                  disabled={employeePickerSubmitting || selectedEmployees.length === 0}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold text-white ${
                    (employeePickerSubmitting || selectedEmployees.length === 0) ? 'bg-gray-400' : 'bg-[#800000] hover:bg-[#990000]'
                  }`}
                >
                  {employeePickerSubmitting ? 'Endorsing…' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hired employee details modal */}
      {showEmployeeDetails && selectedHiredEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto border-2 border-black">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">Employee Details - {selectedHiredEmployee.name}</h2>
              <button onClick={() => { setShowEmployeeDetails(false); setSelectedHiredEmployee(null); }} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>

            <div className="p-6">
              <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold">{selectedHiredEmployee.name}</h2>
                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 align-middle">
                    <span className="text-[#800000]">⚑</span> Agency
                  </span>
                </div>
                <span className="text-gray-500">ID: {selectedHiredEmployee.id}</span>
                <div className="mt-2 text-gray-600">{selectedHiredEmployee.position} | {selectedHiredEmployee.depot}</div>
                <div className="mt-4 text-sm text-gray-700">Email: {selectedHiredEmployee.email || "—"}</div>
              </div>

              <div className="bg-white shadow-md rounded-lg p-6">
                <div className="text-gray-600">Employee modal content (details, docs, onboarding, etc.)</div>
              </div>

              <button className="fixed bottom-6 right-6 bg-gray-800 text-white px-4 py-2 rounded-lg shadow hover:bg-gray-700 z-40">Options</button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
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
                className="px-4 py-2 rounded bg-[#800000] text-white hover:bg-[#990000]"
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

export default AgencyHome;

