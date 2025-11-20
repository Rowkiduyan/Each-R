import { useState } from "react";
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
    urgent: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const addResp = () =>
    setForm(prev => ({ ...prev, responsibilities: [...prev.responsibilities, ""] }));
  const setResp = (i, v) =>
    setForm(prev => ({ ...prev, responsibilities: prev.responsibilities.map((r, idx) => (idx === i ? v : r)) }));
  const removeResp = (i) =>
    setForm(prev => ({ ...prev, responsibilities: prev.responsibilities.filter((_, idx) => idx !== i) }));

  // safe create + debug function
  // call: await createJobPost({ title, depot, description, responsibilities, urgent })
  const createJobPost = async ({ title, depot, description = null, responsibilities = [], urgent = false, is_active = true }) => {
    // client-side validation (title & depot are NOT NULL in your DB)
    if (!title || String(title).trim() === "") {
      throw new Error("Job title is required.");
    }
    if (!depot || String(depot).trim() === "") {
      throw new Error("Depot is required.");
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
    setSaving(true);
    try {
      // attempt to create a job post (this will throw if validations fail)
      await createJobPost({
        title: form.title,
        depot: form.depot,
        description: form.description || null,
        responsibilities: form.responsibilities,
        urgent: form.urgent,
        is_active: true,
      });

      // if successful, go to HR home (or show a message)
      navigate("/hr/home");
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

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Mark as Urgent</label>
            <input
              type="checkbox"
              checked={form.urgent}
              onChange={(e) => setField("urgent", e.target.checked)}
            />
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
                className="w-full border rounded px-3 py-2"
                value={form.depot}
                onChange={(e) => setField("depot", e.target.value)}
                placeholder="Pasig Depot"
              />
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

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={() => navigate("/hr/home")} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
            <button
              onClick={handlePost}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HrCreateJob;
