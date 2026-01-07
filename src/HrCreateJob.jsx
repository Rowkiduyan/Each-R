import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "./supabaseClient";

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
    responsibilities: [""],
    others: [""],
    urgent: true,
    jobType: "delivery_crew", // "delivery_crew" or "office_employee"
    startDate: getTodayDate(),
    endDate: "",
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
      const stored = localStorage.getItem("loggedInHR");
      if (stored) {
        try {
          const user = JSON.parse(stored);
          setCurrentUser(user);
          
          // If user is HRC, auto-fill depot
          if (user.role?.toUpperCase() === 'HRC' && user.depot) {
            setForm(prev => ({ ...prev, depot: user.depot }));
          }
        } catch (err) {
          console.error("Failed to parse loggedInHR:", err);
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

  // Job title to department mapping
  const jobTitleToDepartment = {
    "Delivery Drivers": "Delivery Crew",
    "Delivery Helpers": "Delivery Crew",
    "Transport Coordinators": "Delivery Crew",
    "Dispatchers": "Delivery Crew",
    "Customer Service Representative": "Delivery Crew",
    "POD (Proof of Delivery) Specialist": "Delivery Crew",
    "HR Specialist": "HR Department",
    "Recruitment Specialist": "HR Department",
    "Safety Officer 2": "Security & Safety Department",
    "Safety Officer 3": "Security & Safety Department",
    "Security Officer": "Security & Safety Department",
    "Billing & Collections Specialist": "Collections Department",
    "Charges Specialist": "Collections Department",
    "Diesel Mechanics": "Repairs and Maintenance Specialist",
    "Truck Refrigeration Technician": "Repairs and Maintenance Specialist",
    "Welders": "Repairs and Maintenance Specialist",
    "Tinsmith": "Repairs and Maintenance Specialist",
  };

  const setField = (k, v) => {
    setForm(prev => ({ ...prev, [k]: v }));
    
    // When job type changes to delivery_crew, auto-set department to "Delivery Crew"
    if (k === "jobType" && v === "delivery_crew") {
      setForm(prev => ({ ...prev, jobType: v, department: "Delivery Crew" }));
      return;
    }
    
    // Auto-fill department when job title is selected
    if (k === "title" && jobTitleToDepartment[v]) {
      setForm(prev => ({ ...prev, title: v, department: jobTitleToDepartment[v] }));
    }
  };

  const addResp = () =>
    setForm(prev => ({ ...prev, responsibilities: [...prev.responsibilities, ""] }));
  const setResp = (i, v) =>
    setForm(prev => ({ ...prev, responsibilities: prev.responsibilities.map((r, idx) => (idx === i ? v : r)) }));
  const removeResp = (i) =>
    setForm(prev => ({ ...prev, responsibilities: prev.responsibilities.filter((_, idx) => idx !== i) }));

  const addOther = () =>
    setForm(prev => ({ ...prev, others: [...prev.others, ""] }));
  const setOther = (i, v) =>
    setForm(prev => ({ ...prev, others: prev.others.map((r, idx) => (idx === i ? v : r)) }));
  const removeOther = (i) =>
    setForm(prev => ({ ...prev, others: prev.others.filter((_, idx) => idx !== i) }));

  // Check if form is complete (all required fields filled)
  const isFormComplete = () => {
    const hasTitle = form.title && form.title.trim() !== "";
    const hasDepot = form.depot && form.depot.trim() !== "";
    const hasResponsibilities = form.responsibilities.some(r => r && r.trim() !== "");
    return hasTitle && hasDepot && hasResponsibilities;
  };
  // safe create + debug function
  // call: await createJobPost({ title, depot, department, description, responsibilities, urgent, job_type, expires_at, created_by_uuid, created_by_role })
  const createJobPost = async ({ title, depot, department = null, description = null, responsibilities = [], urgent = false, is_active = true, job_type = "delivery_crew", expires_at = null, created_by_uuid = null, created_by_role = null }) => {
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
      ...form.responsibilities,
      ...form.others,
    ].filter(Boolean);
    
    // Validate that start and end dates are not the same
    if (form.startDate && form.endDate && form.startDate === form.endDate) {
      setError("Start date and end date cannot be the same.");
      setSaving(false);
      return;
    }
    
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
    const combinedResponsibilities = [
      ...form.responsibilities,
      ...form.others,
    ];
    
    // Validate that start and end dates are not the same
    if (form.startDate && form.endDate && form.startDate === form.endDate) {
      setError("Start date and end date cannot be the same.");
      setSaving(false);
      return;
    }
    
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
        responsibilities: [""],
        others: [""],
        urgent: true,
        jobType: "delivery_crew",
        startDate: "",
        endDate: "",
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

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Mark as Urgent</label>
              <input
                type="checkbox"
                checked={form.urgent}
                onChange={(e) => setField("urgent", e.target.checked)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Job Title <span className="text-red-600">*</span></label>
              <input
                list="job-title-options"
                className="w-full border rounded px-3 py-2"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="Select or type job title"
              />
              <datalist id="job-title-options">
                {form.jobType === "delivery_crew" ? (
                  <>
                    <option value="Delivery Drivers" />
                    <option value="Delivery Helpers" />
                    <option value="Transport Coordinators" />
                    <option value="Dispatchers" />
                    <option value="Customer Service Representative" />
                    <option value="POD (Proof of Delivery) Specialist" />
                  </>
                ) : (
                  <>
                    <option value="HR Specialist" />
                    <option value="Recruitment Specialist" />
                    <option value="Safety Officer 2" />
                    <option value="Safety Officer 3" />
                    <option value="Security Officer" />
                    <option value="Billing & Collections Specialist" />
                    <option value="Charges Specialist" />
                    <option value="Diesel Mechanics" />
                    <option value="Truck Refrigeration Technician" />
                    <option value="Welders" />
                    <option value="Tinsmith" />
                  </>
                )}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Depot</label>
              <input
                list="depot-options"
                className="w-full border rounded px-3 py-2"
                value={form.depot}
                onChange={(e) => setField("depot", e.target.value)}
                placeholder="Select or type depot"
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

          <div>
            <label className="block text-sm font-medium mb-1">Department</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={form.department}
              onChange={(e) => setField("department", e.target.value)}
              disabled={form.jobType === "delivery_crew"}
              style={form.jobType === "delivery_crew" ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
            >
              <option value="">Select Department</option>
              {form.jobType === "delivery_crew" && (
                <option value="Delivery Crew">Delivery Crew</option>
              )}
              {form.jobType === "office_employee" && (
                <>
                  <option value="HR Department">HR Department</option>
                  <option value="Security & Safety Department">Security & Safety Department</option>
                  <option value="Collections Department">Collections Department</option>
                  <option value="Repairs and Maintenance Specialist">Repairs and Maintenance Specialist</option>
                </>
              )}
            </select>
            {form.jobType === "delivery_crew" && (
              <p className="text-xs text-gray-500 mt-1">Department is automatically set to "Delivery Crew" for Drivers/Delivery Crew job type</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Duration (Optional)</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2 bg-gray-100 cursor-not-allowed"
                  value={form.startDate}
                  readOnly
                  disabled
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">End Date</label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2"
                  value={form.endDate}
                  onChange={(e) => setField("endDate", e.target.value)}
                  min={form.startDate ? new Date(new Date(form.startDate).getTime() + 86400000).toISOString().split('T')[0] : undefined}
                />
              </div>
            </div>
            {form.startDate && form.endDate && (
              <p className="text-xs text-gray-500 mt-1">
                Duration: {form.startDate} to {form.endDate}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Short Description</label>
            <textarea
              className="w-full border rounded px-3 py-2"
              rows={3}
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="We are seeking a reliable and safety-conscious Truck Driver..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Main Responsibilities</label>
              <button onClick={addResp} className="text-sm text-blue-600 hover:underline">+ Add Responsibility</button>
            </div>
            <div className="space-y-2">
              {form.responsibilities.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className="flex-1 border rounded px-3 py-2"
                    value={r}
                    onChange={(e) => setResp(i, e.target.value)}
                    placeholder="e.g., Safely operate company-based trucks"
                  />
                  {form.responsibilities.length > 1 && (
                    <button onClick={() => removeResp(i)} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">Remove</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Other Notes</label>
              <button onClick={addOther} className="text-sm text-blue-600 hover:underline">+ Add Other</button>
            </div>
            <div className="space-y-2">
              {form.others.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className="flex-1 border rounded px-3 py-2"
                    value={r}
                    onChange={(e) => setOther(i, e.target.value)}
                    placeholder="e.g., Must be willing to travel"
                  />
                  {form.others.length > 1 && (
                    <button onClick={() => removeOther(i)} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">Remove</button>
                  )}
                </div>
              ))}
            </div>
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
