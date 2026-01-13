import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { getStoredJson } from "./authStorage";

// Keep job titles/positions aligned with Employees.jsx
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
  "Billing Department": ["Billing Specialist", "POD Specialist"],
  "HR Department": ["HR Specialist", "Recruitment Specialist", "HR Manager"],
  "Security & Safety Department": ["Safety Officer 2", "Safety Officer 3", "Security Officer"],
  "Collections Department": ["Billing & Collections Specialist", "Charges Specialist"],
  "Repairs and Maintenance Specialist": [
    "Diesel Mechanic",
    "Truck Refrigeration Technician",
    "Welder",
    "Tinsmith",
  ],
};

const getDepartmentForPosition = (position) => {
  if (!position) return "";
  for (const [dept, list] of Object.entries(departmentToPositions)) {
    if ((list || []).includes(position)) return dept;
  }
  return "";
};

const splitLines = (text) =>
  String(text || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

const allJobTitles = Object.values(departmentToPositions).flatMap((list) => list || []);

function HrCreateJob() {
  const navigate = useNavigate();
  
  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };
  
  const [form, setForm] = useState({
    title: "",
    depot: "",
    department: "",
    posted: "Just now",
    description: "",
    mainResponsibilities: "",
    keyRequirements: "",
    urgent: true,
    jobType: "office_employee", // "delivery_crew" or "office_employee"
    endDate: "",
    positions_needed: 1,
    positionsNoLimit: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  // Get current user info from localStorage and Supabase
  const [currentUser, setCurrentUser] = useState(null);
  const [userId, setUserId] = useState(null);
  
  useEffect(() => {
    const fetchUser = async () => {
      // Get user role from localStorage
      const storedUser = getStoredJson("loggedInHR");
      if (storedUser) {
        setCurrentUser(storedUser);

        // If user is HRC, auto-fill depot
        if (storedUser.role?.toUpperCase() === 'HRC' && storedUser.depot) {
          setForm(prev => ({ ...prev, depot: storedUser.depot }));
        }
      }
      
      // Get user UUID from Supabase auth
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    
    fetchUser();
  }, []);

  const depotOptions = [
    "Batangas", "Bulacan", "Cagayan", "Calamba", "Calbayog", "Cebu", 
    "Davao", "Dipolog", "Iloilo", "Isabela", "Kalibo", "Kidapawan", 
    "La Union", "Liip", "Manggahan", "Mindoro", "Naga", "Ozamis", 
    "Palawan", "Pampanga", "Pasig", "Sucat", "Tacloban", "Tarlac", 
    "Taytay", "Tuguegarao", "Vigan"
  ];

  const setField = (k, v) => {
    // Auto-fill department when job title matches a known position
    if (k === "title") {
      const dept = getDepartmentForPosition(v);
      const inferredJobType = dept === "Operations Department" ? "delivery_crew" : "office_employee";
      setForm((prev) => ({
        ...prev,
        title: v,
        department: dept ? dept : prev.department,
        jobType: dept ? inferredJobType : prev.jobType,
      }));
      return;
    }

    // Department can be edited; if it no longer matches the selected title, clear title so user can re-select.
    if (k === "department") {
      setForm((prev) => {
        const mappedDept = getDepartmentForPosition(prev.title);
        const shouldClearTitle = Boolean(prev.title) && Boolean(mappedDept) && mappedDept !== v;
        const inferredJobType = v === "Operations Department" ? "delivery_crew" : "office_employee";
        return {
          ...prev,
          department: v,
          title: shouldClearTitle ? "" : prev.title,
          jobType: shouldClearTitle || !prev.title ? inferredJobType : prev.jobType,
        };
      });
      return;
    }

    if (k === "positionsNoLimit") {
      const enabled = Boolean(v);
      setForm((prev) => ({
        ...prev,
        positionsNoLimit: enabled,
        positions_needed: enabled ? null : (Number(prev.positions_needed) > 0 ? prev.positions_needed : 1),
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [k]: v }));
  };

  // Check if form is complete (all required fields filled)
  const isFormComplete = () => {
    const hasTitle = form.title && form.title.trim() !== "";
    const hasDepot = form.depot && form.depot.trim() !== "";
    const hasDescription = form.description && form.description.trim() !== "";
    const hasResponsibilities = splitLines(form.mainResponsibilities).length > 0;
    return hasTitle && hasDepot && hasDescription && hasResponsibilities;
  };

  const withBulletAutoContinue = (fieldKey) => (e) => {
    if (e.key !== "Enter") return;

    const target = e.target;
    if (!target || typeof target.selectionStart !== "number") return;

    const value = String(form[fieldKey] || "");
    const start = target.selectionStart;
    const end = target.selectionEnd;

    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const lineEnd = value.indexOf("\n", start);
    const currentLine = value.slice(lineStart, lineEnd === -1 ? value.length : lineEnd);

    const bulletMatch = currentLine.match(/^\s*(?:\*\s+|-\s+|•\s+)/);
    if (!bulletMatch) return; // default Enter behavior

    e.preventDefault();
    const prefix = bulletMatch[0];
    const lineContentAfterPrefix = currentLine.slice(prefix.length).trim();

    // If user presses Enter on an empty bullet line, remove the bullet instead of creating another.
    if (!lineContentAfterPrefix) {
      const newValue = value.slice(0, lineStart) + value.slice(lineStart + prefix.length);
      setForm((prev) => ({ ...prev, [fieldKey]: newValue }));
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start - prefix.length;
      });
      return;
    }

    // Otherwise continue the bullet on the next line.
    const insertText = "\n" + prefix;
    const newValue = value.slice(0, start) + insertText + value.slice(end);
    setForm((prev) => ({ ...prev, [fieldKey]: newValue }));
    requestAnimationFrame(() => {
      const nextPos = start + insertText.length;
      target.selectionStart = target.selectionEnd = nextPos;
    });
  };
  // safe create + debug function
  // call: await createJobPost({ title, depot, department, description, responsibilities, urgent, job_type, expires_at, created_by_uuid, created_by_role, positions_needed })
  const createJobPost = async ({ title, depot, department = null, description = null, responsibilities = [], urgent = false, is_active = true, job_type = "delivery_crew", expires_at = null, created_by_uuid = null, created_by_role = null, positions_needed = 1 }) => {
    // client-side validation (title & depot are NOT NULL in your DB)
    if (!title || String(title).trim() === "") {
      throw new Error("Job title is required.");
    }
    if (!depot || String(depot).trim() === "") {
      throw new Error("Depot is required.");
    }
    
    // Validate depot is from the allowed list
    if (!depotOptions.includes(String(depot).trim())) {
      throw new Error("Invalid depot selected. Please choose from the dropdown list.");
    }

    // Determine approval status based on user role
    // HRC posts need approval, HR posts are auto-approved
    const approvalStatus = created_by_role?.toUpperCase() === 'HRC' ? 'pending' : 'approved';

    // positions_needed: null means "no limit"
    const hasLimit = positions_needed !== null && positions_needed !== undefined && String(positions_needed) !== "";
    const parsedPositionsNeeded = hasLimit ? Number(positions_needed) : null;
    if (hasLimit && (!Number.isFinite(parsedPositionsNeeded) || parsedPositionsNeeded < 1)) {
      throw new Error('Employees Needed must be at least 1, or choose No limit.');
    }
    
    const payload = {
      title: String(title).trim(),
      depot: String(depot).trim(),
      department: department ?? null,
      description: description ?? null,
      // ensure array and remove empty lines
      responsibilities: Array.isArray(responsibilities)
        ? responsibilities.map(r => (r == null ? "" : String(r))).filter(Boolean)
        : [],
      urgent: Boolean(urgent),
      is_active: Boolean(is_active),
      job_type: String(job_type).trim(), // Add job_type to payload
      expires_at: expires_at ?? null, // Job post expiration date
      created_by: created_by_uuid ?? null, // UUID of the user who created the job post
      approval_status: approvalStatus, // HRC posts are 'pending', HR posts are 'approved'
      positions_needed: parsedPositionsNeeded, // Number of positions to hire (null = no limit)
    };

    // VERY IMPORTANT: log the payload so you can see what is being sent
    console.log("JOB_POST PAYLOAD ->", payload);

    const { data, error } = await supabase
      .from("job_posts")
      .insert([payload])
      .select(); // helpful for debugging (may be affected by RLS for read-after-write)

    if (error) {
      // show everything useful in console
      console.error("job_posts insert error:", error);
      console.error("error.details:", error.details);
      console.error("error.hint:", error.hint);
      console.error("error.code:", error.code);
      throw error;
    }

    console.log("job_posts inserted:", data);
    return data;
  };

  const handleSaveDraft = async () => {
    setError(null);
    setSuccess("");
    setSaving(true);
    
    // Validate minimum required fields for draft
    if (!form.title || !form.title.trim()) {
      setError("Job title is required to save as draft.");
      setSaving(false);
      return;
    }
    if (!form.depot || !form.depot.trim()) {
      setError("Depot is required to save as draft.");
      setSaving(false);
      return;
    }
    
    const combinedResponsibilities = [
      ...splitLines(form.mainResponsibilities),
      ...splitLines(form.keyRequirements).map((s) => `REQ: ${s}`),
    ];
    
    // Use endDate for expires_at field
    const expiresAt = form.endDate || null;
    try {
      // Save as draft (is_active = false)
      await createJobPost({
        title: form.title,
        depot: form.depot,
        department: form.department || null,
        description: form.description || null,
        responsibilities: combinedResponsibilities,
        urgent: form.urgent,
        is_active: false, // Draft
        job_type: form.jobType,
        expires_at: expiresAt,
        created_by_uuid: userId,
        created_by_role: currentUser?.role,
        positions_needed: form.positions_needed,
      });

      // Redirect to recruitment page
      navigate("/hr/recruitment", { state: { activeSubTab: "JobPosts" } });
    } catch (err) {
      const msg = err?.message || "Failed to save draft. Check console for details.";
      setError(msg);
      setSaving(false);
    }
  };

  const handlePost = async () => {
    setError(null);
    setSuccess("");
    setSaving(true);

    if (!form.description || !form.description.trim()) {
      setError("Job title description is required.");
      setSaving(false);
      return;
    }
    const combinedResponsibilities = [
      ...splitLines(form.mainResponsibilities),
      ...splitLines(form.keyRequirements).map((s) => `REQ: ${s}`),
    ];
    
    // Use endDate for expires_at field
    const expiresAt = form.endDate || null;
    
    try {
      // attempt to create a job post (this will throw if validations fail)
      await createJobPost({
        title: form.title,
        depot: form.depot,
        department: form.department || null,
        description: form.description || null,
        responsibilities: combinedResponsibilities,
        urgent: form.urgent,
        is_active: true, // Active
        job_type: form.jobType, // Add job_type to the payload
        expires_at: expiresAt, // Job post expiration date
        created_by_uuid: userId,
        created_by_role: currentUser?.role,
        positions_needed: form.positions_needed,
      });

      // Redirect to recruitment page after successful post
      navigate("/hr/recruitment", { state: { activeSubTab: "JobPosts" } });
      setSuccess("Job post created successfully.");
      setForm({
        title: "",
        depot: "",
        department: "",
        posted: "Just now",
        description: "",
        mainResponsibilities: "",
        keyRequirements: "",
        urgent: true,
        jobType: "office_employee",
        endDate: "",
        positions_needed: 1,
        positionsNoLimit: false,
      });
      setShowConfirm(false);
    } catch (err) {
      // show user-friendly message, but console contains full details
      const msg = err?.message || "Failed to create job post. Check console for details.";
      setError(msg);
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Create Job Post</h1>
          <Link to="/hr/recruitment" className="text-blue-600 hover:underline">← Back to Recruitment</Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded">
              {success}
            </div>
          )}

          <div className="space-y-4">
            {/* Job Type Toggle */}
            <div>
              <label className="block text-sm font-medium mb-2">Job Type</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setField("jobType", "delivery_crew")}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                    form.jobType === "delivery_crew"
                      ? "border-red-600 bg-red-50 text-red-700 font-semibold"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                  }`}
                >
                  <div className="text-lg mb-1">🚚</div>
                  <div className="text-sm font-medium">Drivers/Delivery Crew</div>
                </button>
                <button
                  type="button"
                  onClick={() => setField("jobType", "office_employee")}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                    form.jobType === "office_employee"
                      ? "border-red-600 bg-red-50 text-red-700 font-semibold"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                  }`}
                >
                  <div className="text-lg mb-1">💼</div>
                  <div className="text-sm font-medium">Office Employee</div>
                </button>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setField("urgent", !form.urgent)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                  form.urgent
                    ? "border-red-600 bg-red-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
                aria-pressed={form.urgent}
              >
                <div className="text-left">
                  <div className={`text-sm font-semibold ${form.urgent ? "text-red-700" : "text-gray-800"}`}>
                    Mark as Urgent
                  </div>
                  <div className="text-xs text-gray-500">
                    Highlight this job post as a priority opening.
                  </div>
                </div>
                <div className={`h-6 w-11 rounded-full p-1 transition-colors ${form.urgent ? "bg-red-600" : "bg-gray-300"}`}>
                  <div className={`h-4 w-4 rounded-full bg-white transition-transform ${form.urgent ? "translate-x-5" : "translate-x-0"}`} />
                </div>
              </button>
            </div>
          </div>

          {/* Job Title (single row) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Job Title <span className="text-red-600">*</span>
            </label>
            <input
              list="job-title-options"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="e.g., Driver"
            />
            <datalist id="job-title-options">
              {allJobTitles.map((title) => (
                <option key={title} value={title} />
              ))}
            </datalist>
           
          </div>

          {/* Department + Depot (shared row) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all bg-white"
                value={form.department}
                onChange={(e) => setField("department", e.target.value)}
              >
                <option value="">Department</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Department is set automatically based on the selected job title.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Depot <span className="text-red-600">*</span></label>
              <input
                list="depot-options"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                value={form.depot}
                onChange={(e) => setField("depot", e.target.value)}
                placeholder="e.g., Batangas"
                disabled={currentUser?.role?.toUpperCase() === 'HRC'}
                style={currentUser?.role?.toUpperCase() === 'HRC' ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
              />
              <datalist id="depot-options">
                {depotOptions.map((depot) => (
                  <option key={depot} value={depot} />
                ))}
              </datalist>
              {currentUser?.role?.toUpperCase() === 'HRC' && (
                <p className="text-xs text-gray-500 mt-1">HRC users can only create jobs for their assigned depot</p>
              )}
            </div>
          </div>

          {/* Employees Needed (row below) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Employees Needed <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              min="1"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              value={form.positionsNoLimit ? "" : (form.positions_needed ?? 1)}
              onChange={(e) => setField("positions_needed", parseInt(e.target.value, 10) || 1)}
              placeholder="Number of hires needed (e.g., 3)"
              disabled={form.positionsNoLimit}
            />
            <label className="mt-2 inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={Boolean(form.positionsNoLimit)}
                onChange={(e) => setField("positionsNoLimit", e.target.checked)}
              />
              No limit
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Duration (Optional)</label>
            <div>
              <label className="block text-xs text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                value={form.endDate}
                onChange={(e) => setField("endDate", e.target.value)}
                min={getTodayDate()}
              />
              <p className="text-xs text-gray-500 mt-1">
                The job post will close automatically when the end date is reached, or when hired employees reach Employees Needed (if limited).
              </p>
            </div>
            {form.endDate && (
              <p className="text-xs text-gray-500 mt-1">
                Applications close on: {form.endDate}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Job Title Description <span className="text-red-600">*</span>
            </label>
            <textarea
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-y"
              rows={4}
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              onKeyDown={withBulletAutoContinue("description")}
              placeholder="Example: This role supports daily operations by coordinating tasks, documenting updates, and ensuring deadlines are met."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Main Responsibilities <span className="text-red-600">*</span></label>
            <textarea
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-y"
              rows={5}
              value={form.mainResponsibilities}
              onChange={(e) => setField("mainResponsibilities", e.target.value)}
              onKeyDown={withBulletAutoContinue("mainResponsibilities")}
              placeholder="Example: Deliver goods safely and on time; Maintain accurate delivery documents; Follow safety and company procedures."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Basic Key Requirements</label>
            <textarea
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-y"
              rows={4}
              value={form.keyRequirements}
              onChange={(e) => setField("keyRequirements", e.target.value)}
              onKeyDown={withBulletAutoContinue("keyRequirements")}
              placeholder="Example: Willing to work shifting schedules; Strong communication and teamwork; Relevant experience is an advantage."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={() => navigate("/hr/recruitment")} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
            {/* Hide Save as Draft button for HRC users */}
            {currentUser?.role?.toUpperCase() !== 'HRC' && (
              <button
                onClick={handleSaveDraft}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-60"
                disabled={saving || !form.title || !form.depot}
              >
                {saving ? "Saving..." : "Save as Draft"}
              </button>
            )}
            <button
              onClick={() => setShowConfirm(true)}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60"
              disabled={saving || !isFormComplete()}
              title={!isFormComplete() ? "Please complete all required fields (Title, Depot, and at least one Responsibility)" : ""}
            >
              {saving ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-solid border-gray-300 shadow-lg w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Post Job?</h2>
            <p className="text-sm text-gray-600">
              {currentUser?.role?.toUpperCase() === 'HRC'
                ? 'Please confirm you want to submit this job posting. It will be marked as Pending Approval until HR approves it.'
                : 'Please confirm you want to publish this job posting. It will be marked as Active and visible to applicants.'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                onClick={handlePost}
                disabled={saving}
              >
                {saving ? "Posting..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HrCreateJob;
