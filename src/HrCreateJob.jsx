import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "./supabaseClient";

function HrCreateJob() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    depot: "",
    posted: "Just now",
    description: "",
    responsibilities: [""],
    others: [""],
    urgent: true,
    jobType: "delivery_crew", // "delivery_crew" or "office_employee"
    durationDays: "",
    durationHours: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  // Get current user info from localStorage
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
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
  }, []);

  const depotOptions = [
    "Batangas", "Bulacan", "Cagayan", "Calamba", "Calbayog", "Cebu", 
    "Davao", "Dipolog", "Iloilo", "Isabela", "Kalibo", "Kidapawan", 
    "La Union", "Liip", "Manggahan", "Mindoro", "Naga", "Ozamis", 
    "Palawan", "Pampanga", "Pasig", "Sucat", "Tacloban", "Tarlac", 
    "Taytay", "Tuguegarao", "Vigan"
  ];

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

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

  // safe create + debug function
  // call: await createJobPost({ title, depot, description, responsibilities, urgent, job_type, duration })
  const createJobPost = async ({ title, depot, description = null, responsibilities = [], urgent = false, is_active = true, job_type = "delivery_crew", duration = null }) => {
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

    const payload = {
      title: String(title).trim(),
      depot: String(depot).trim(),
      description: description ?? null,
      // ensure array and remove empty lines
      responsibilities: Array.isArray(responsibilities)
        ? responsibilities.map(r => (r == null ? "" : String(r))).filter(Boolean)
        : [],
      urgent: Boolean(urgent),
      is_active: Boolean(is_active),
      job_type: String(job_type).trim(), // Add job_type to payload
      duration: duration ?? null, // Add duration to payload
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

  const handlePost = async () => {
    setError(null);
    setSuccess("");
    setSaving(true);
    const combinedResponsibilities = [
      ...form.responsibilities,
      ...form.others,
    ];
    
    // Format duration if days or hours are provided
    let duration = null;
    if (form.durationDays || form.durationHours) {
      const days = form.durationDays ? parseInt(form.durationDays) : 0;
      const hours = form.durationHours ? parseInt(form.durationHours) : 0;
      duration = `${days}d ${hours}h`;
    }
    
    try {
      // attempt to create a job post (this will throw if validations fail)
      await createJobPost({
        title: form.title,
        depot: form.depot,
        description: form.description || null,
        responsibilities: combinedResponsibilities,
        urgent: form.urgent,
        is_active: true,
        job_type: form.jobType, // Add job_type to the payload
        duration: duration, // Add duration to the payload
      });

      setSuccess("Job post created successfully.");
      setForm({
        title: "",
        depot: "",
        posted: "Just now",
        description: "",
        responsibilities: [""],
        others: [""],
        urgent: true,
        jobType: "delivery_crew",
        durationDays: "",
        durationHours: "",
      });
      setShowConfirm(false);
    } catch (err) {
      // show user-friendly message, but console contains full details
      const msg = err?.message || "Failed to create job post. Check console for details.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Create Job Post</h1>
          <Link to="/hr/home" className="text-blue-600 hover:underline">← Back to HR Home</Link>
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
              <label className="block text-sm font-medium mb-1">Job Title</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="Delivery Driver"
              />
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
            <label className="block text-sm font-medium mb-1">Duration (Optional)</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Days</label>
                <input
                  type="number"
                  min="0"
                  className="w-full border rounded px-3 py-2"
                  value={form.durationDays}
                  onChange={(e) => setField("durationDays", e.target.value)}
                  placeholder="e.g., 5"
                />
                
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Hours (0-23)</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  className="w-full border rounded px-3 py-2"
                  value={form.durationHours}
                  onChange={(e) => setField("durationHours", e.target.value)}
                  placeholder="e.g., 8"
                />
              </div>
            </div>
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
            <button onClick={() => navigate("/hr/home")} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
            <button
              onClick={() => setShowConfirm(true)}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      </div>
      {showConfirm && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Post Job?</h2>
            <p className="text-sm text-gray-600">Please confirm you want to publish this job posting.</p>
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
