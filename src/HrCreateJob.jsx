// src/HrCreateJob.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "./supabaseClient";

function HrCreateJob() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    depot: "",
    posted: "Just now",
    description: "",
    responsibilities: [""],
    urgent: true,
  });

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const addResp = () => setForm(prev => ({ ...prev, responsibilities: [...prev.responsibilities, ""] }));
  const setResp = (i, v) => setForm(prev => ({ ...prev, responsibilities: prev.responsibilities.map((r, idx) => idx === i ? v : r) }));
  const removeResp = (i) => setForm(prev => ({ ...prev, responsibilities: prev.responsibilities.filter((_, idx) => idx !== i) }));

const onPost = async () => {
  if (!form.title || !form.depot) {
    alert("Please fill Job Title and Depot.");
    return;
  }

  const { data: { session }, error: sessErr } = await supabase.auth.getSession();
  if (sessErr) {
    alert("Could not check session: " + sessErr.message);
    return;
  }
  if (!session) {
    alert("Please log in first.");
    return;
  }

  setLoading(true);
  try {
    const payload = {
      title: form.title,
      depot: form.depot,
      description: form.description || null,
      responsibilities: form.responsibilities.filter(Boolean),
      urgent: !!form.urgent,
      // DO NOT send created_by — DB sets it via DEFAULT auth.uid()
    };

    const { data, error } = await supabase
      .from("job_posts")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    navigate("/applicantl/home", { state: { newJob: data } });
  } catch (e) {
    console.error(e);
    alert(e.message || "Failed to post job.");
  } finally {
    setLoading(false);
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
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Mark as Urgent</label>
            <input
              type="checkbox"
              checked={form.urgent}
              onChange={(e)=>setField("urgent", e.target.checked)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Job Title</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={form.title}
                onChange={(e)=>setField("title", e.target.value)}
                placeholder="Delivery Driver"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Depot</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={form.depot}
                onChange={(e)=>setField("depot", e.target.value)}
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
              onChange={(e)=>setField("description", e.target.value)}
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
                    onChange={(e)=>setResp(i, e.target.value)}
                    placeholder="e.g., Safely operate company-based trucks"
                  />
                  {form.responsibilities.length > 1 && (
                    <button onClick={()=>removeResp(i)} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">Remove</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={()=>navigate("/hr/home")} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
            <button
              onClick={onPost}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60"
            >
              {loading ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HrCreateJob;
