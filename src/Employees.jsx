// src/Employees.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

function Employees() {
  const navigate = useNavigate();

  // master depot list (kept)
  const depots = [
    "Pasig","Cagayan","Butuan","Davao","Cebu","Laguna","Iloilo",
    "Bacolod","Zamboanga","Manila","Quezon City","Taguig",
    "Baguio","General Santos","Palawan","Olongapo","Tacloban",
    "Roxas","Legazpi","Cauayan","Cavite","Batangas","Ormoc","Koronadal",
    "Calbayog","Catbalogan","Tuguegarao","Baler","Iligan","Koronadal City"
  ];
  const COLORS = ["#4ade80", "#f87171"];

  // controls
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [positionFilter, setPositionFilter] = useState("All");
  const [depotFilter, setDepotFilter] = useState("All");
  const [employmentStatusFilter, setEmploymentStatusFilter] = useState("All");
  const [viewMode, setViewMode] = useState("all"); // all, pending_requirements
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // data
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Helper: safely parse payload to object
  const safePayload = (p) => {
    if (!p) return {};
    if (typeof p === "object") return p;
    try {
      return JSON.parse(p);
    } catch {
      return {};
    }
  };

  // extract candidate email(s) from a payload object (many possible shapes)
  const extractEmailsFromPayload = (payloadObj) => {
    if (!payloadObj) return [];
    const emails = new Set();
    const pushIf = (v) => { if (v && typeof v === "string" && v.trim()) emails.add(v.trim()); };
    pushIf(payloadObj.email);
    // payload.form.email or payload.applicant.email
    if (payloadObj.form && typeof payloadObj.form === "object") pushIf(payloadObj.form.email || payloadObj.form.contact);
    if (payloadObj.applicant && typeof payloadObj.applicant === "object") pushIf(payloadObj.applicant.email || payloadObj.applicant.contactNumber || payloadObj.applicant.contact);
    // sometimes the job meta contains contact email
    if (payloadObj.meta && typeof payloadObj.meta === "object") pushIf(payloadObj.meta.email);
    return Array.from(emails);
  };

  // extract position/depot from many possible payload locations
  const extractPositionDepotFromPayload = (payloadObj, job_posts) => {
    if (!payloadObj && !job_posts) return { position: null, depot: null };

    // Try job_posts nested object first (most reliable)
    if (job_posts && typeof job_posts === "object") {
      const p = job_posts.title || job_posts.position || null;
      const d = job_posts.depot || null;
      if (p || d) return { position: p || null, depot: d || null };
    }

    // job object inside payload
    if (payloadObj.job && typeof payloadObj.job === "object") {
      const p = payloadObj.job.title || payloadObj.job.position || null;
      const d = payloadObj.job.depot || null;
      if (p || d) return { position: p || null, depot: d || null };
    }

    // form object inside payload
    if (payloadObj.form && typeof payloadObj.form === "object") {
      const p = payloadObj.form.position || payloadObj.form.appliedPosition || payloadObj.form.jobTitle || null;
      const d = payloadObj.form.depot || payloadObj.form.city || null;
      if (p || d) return { position: p || null, depot: d || null };
    }

    // applicant object inside payload
    if (payloadObj.applicant && typeof payloadObj.applicant === "object") {
      const p = payloadObj.applicant.position || payloadObj.applicant.job || null;
      const d = payloadObj.applicant.depot || payloadObj.applicant.city || null;
      if (p || d) return { position: p || null, depot: d || null };
    }

    // top-level fallback
    const p = payloadObj.position || payloadObj.jobTitle || null;
    const d = payloadObj.depot || payloadObj.city || null;
    return { position: p || null, depot: d || null };
  };

  // ---- Load employees (and subscribe for realtime) ----
  useEffect(() => {
    let channel;
    let cancelled = false;

    const normalize = (row) => {
      const sourceLower = row.source ? String(row.source).toLowerCase() : "";

      // Base agency flag from employees table only on explicit agency markers,
      // not on generic "recruitment" source. This prevents direct hires from
      // being incorrectly tagged as agency.
      const baseAgency =
        (sourceLower === "agency") ||
        (row.role && String(row.role).toLowerCase() === "agency") ||
        !!row.agency_profile_id ||
        !!row.endorsed_by_agency_id ||
        row.is_agency === true;

      return {
        id: row.id, // uuid
        name:
          [row.fname, row.mname, row.lname]
            .filter(Boolean)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim() || row.email || "Unnamed",
        position: row.position || null, // null means "try to fill"
        depot: row.depot || null,
        email: row.email || "",
        role: row.role || "Employee",
        hired_at: row.hired_at,
        agency: baseAgency,
        source: row.source || null,
        endorsed_by_agency_id: row.endorsed_by_agency_id || row.agency_profile_id || null,
        endorsed_at: row.endorsed_at || null,
      };
    };

    const load = async () => {
      setLoading(true);
      setLoadError("");
      try {
        // 1) fetch employees rows
        const { data: empRows, error: empErr } = await supabase
          .from("employees")
          .select(
            "id, email, fname, lname, mname, contact_number, position, depot, role, hired_at, source, endorsed_by_agency_id, endorsed_at, agency_profile_id"
          )
          .order("hired_at", { ascending: false });

        if (empErr) throw empErr;

        const normalized = (empRows || []).map(normalize);

        // Build unique emails for those employees we want to fill
        const emailsToFill = Array.from(new Set(
          normalized.filter(e => (!e.position || !e.depot) && e.email).map(e => e.email)
        ));

        // If nothing to fill, set and return
        if (emailsToFill.length === 0) {
          if (!cancelled) setEmployees(normalized);
          return;
        }

        // Prepare in-list for supabase "in" filters (double quoted)
        const inList = `(${emailsToFill.map(em => `"${em.replace(/"/g, '\\"')}"`).join(",")})`;

        // We will run multiple queries to catch different payload shapes:
        // a) applications where payload->>email IN (...)
        // b) applications where payload->'form'->>email IN (...)
        // c) applications where payload->'applicant'->>email IN (...)
        // d) recruitment_endorsements where email IN (...)
        // We'll combine results by email, preferring hired status and job_posts info.
        const appsByEmail = {};

        // helper to process application row list
        const processApps = (apps) => {
          for (const a of apps || []) {
            // parse payload into object
            const payloadObj = safePayload(a.payload);
            // get candidate emails
            const _emails = extractEmailsFromPayload(payloadObj);
            for (const em of _emails) {
              if (!emailsToFill.includes(em)) continue;
              if (!appsByEmail[em]) appsByEmail[em] = [];
              appsByEmail[em].push({ row: a, payloadObj });
            }
          }
        };

        // Query 1: payload->>email
        const { data: apps1, error: appsErr1 } = await supabase
          .from("applications")
          .select("id, payload, job_posts(id,title,depot), status, created_at")
          .filter("payload->>email", "in", inList)
          .order("created_at", { ascending: false })
          .limit(500);
        if (!appsErr1) processApps(apps1);

        // Query 2: payload->'form'->>email
        const { data: apps2, error: appsErr2 } = await supabase
          .from("applications")
          .select("id, payload, job_posts(id,title,depot), status, created_at")
          .filter("payload->form->>email", "in", inList)
          .order("created_at", { ascending: false })
          .limit(500);
        if (!appsErr2) processApps(apps2);

        // Query 3: payload->'applicant'->>email
        const { data: apps3, error: appsErr3 } = await supabase
          .from("applications")
          .select("id, payload, job_posts(id,title,depot), status, created_at")
          .filter("payload->applicant->>email", "in", inList)
          .order("created_at", { ascending: false })
          .limit(500);
        if (!appsErr3) processApps(apps3);

        // Query 4: endorsed applications (where endorsed=true)
        // We'll fetch all endorsed apps and filter by email in memory since Supabase doesn't support complex JSONB queries easily
        const { data: endorseApps, error: endorseErr } = await supabase
          .from("applications")
          .select("id, payload, status, created_at, job_posts(id, title, depot), endorsed")
          .eq("endorsed", true)
          .order("created_at", { ascending: false })
          .limit(500);
        if (!endorseErr && Array.isArray(endorseApps)) {
          for (const r of endorseApps) {
            const p = safePayload(r.payload);
            const emails = extractEmailsFromPayload(p);
            for (const em of emails) {
              if (!emailsToFill.includes(em)) continue;
              if (!appsByEmail[em]) appsByEmail[em] = [];
              appsByEmail[em].push({ row: { id: r.id, payload: r.payload, status: r.status, created_at: r.created_at, job_posts: r.job_posts, endorsed: r.endorsed }, payloadObj: p });
            }
          }
        }

        // For each email, pick the best candidate app/endorsement:
        // prefer status === 'hired', else newest created_at
        const bestByEmail = {};
        for (const em of Object.keys(appsByEmail)) {
          const list = appsByEmail[em];
          if (!list || list.length === 0) continue;
          // find any with status 'hired'
          const hired = list.find(it => (it.row?.status || "").toLowerCase() === "hired");
          if (hired) {
            bestByEmail[em] = hired;
            continue;
          }
          // else pick newest by created_at
          list.sort((a, b) => new Date(b.row.created_at || 0) - new Date(a.row.created_at || 0));
          bestByEmail[em] = list[0];
        }

        // merge into normalized employees and check for agency source
        const merged = normalized.map((emp) => {
          let updatedEmp = { ...emp };
          
          if ((!emp.position || !emp.depot) && emp.email) {
            const match = bestByEmail[emp.email];
            if (match) {
              const job_posts = match.row?.job_posts || null;
              const { position: derivedPos, depot: derivedDepot } = extractPositionDepotFromPayload(match.payloadObj, job_posts);
              updatedEmp = {
                ...updatedEmp,
                position: emp.position || (derivedPos ? derivedPos : null),
                depot: emp.depot || (derivedDepot ? derivedDepot : null),
              };
            }
          }
          
          // Check if employee came from agency endorsement by checking applications payload
          if (!updatedEmp.agency && updatedEmp.email) {
            const match = bestByEmail[updatedEmp.email];
            if (match && match.payloadObj) {
              const meta = match.payloadObj.meta || {};
              const source = meta.source || "";
              if (source && String(source).toLowerCase() === "agency") {
                updatedEmp.agency = true;
              }
              // Also check if the application has endorsed=true
              if (match.row && match.row.endorsed === true) {
                updatedEmp.agency = true;
              }
            }
          }
          
          return updatedEmp;
        });

        if (!cancelled) setEmployees(merged);
      } catch (err) {
        console.error("❌ employees load error:", err);
        setLoadError(err.message || "Failed to load employees");
        setEmployees([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // initial load and subscription
    load();

    channel = supabase
      .channel("employees-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employees" },
        load
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []); // run once on mount

  // distinct positions from live data (stable list)
  const positions = useMemo(() => {
    const s = new Set(
      employees
        .map((e) => e.position)
        .filter(Boolean)
    );
    return ["All", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [employees]);

  const toggleSort = () =>
    setSortOrder((o) => (o === "asc" ? "desc" : "asc"));

  // Employment status options
  const employmentStatuses = ["All", "Regular", "Under Probation", "Part Time"];

  // filters
  const filtered = employees
    .filter((e) =>
      e.name.toLowerCase().includes(search.toLowerCase())
    )
    .filter((e) => positionFilter === "All" || e.position === positionFilter)
    .filter((e) => depotFilter === "All" || e.depot === depotFilter)
    .filter((e) => {
      if (viewMode === "pending_requirements") {
        // Filter for employees with pending requirement validation
        // This would need to check actual requirement status from database
        return true; // Placeholder - implement based on your requirements data
      }
      return true;
    })
    .sort((a, b) =>
      sortOrder === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    );

  return (
    <>
      {/* Employee List */}
      <div className="max-w-7xl mx-auto px-4">
        {!selectedEmployee ? (
          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-700">Employee List</h2>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search Employee..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="px-4 py-2 border rounded"
                />
                <div className="relative">
                  <button
                    onClick={() => setShowFilterMenu(!showFilterMenu)}
                    className="px-4 py-2 bg-gray-200 rounded flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  {showFilterMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-white border rounded-lg shadow-lg z-10 p-4">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Sort by Name</label>
                          <button
                            onClick={() => {
                              toggleSort();
                              setShowFilterMenu(false);
                            }}
                            className="w-full px-3 py-2 bg-gray-100 rounded text-left hover:bg-gray-200"
                          >
                            {sortOrder === "asc" ? "A–Z" : "Z–A"}
                          </button>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">View by Job Positions</label>
                          <select
                            value={positionFilter}
                            onChange={(e) => setPositionFilter(e.target.value)}
                            className="w-full px-3 py-2 border rounded"
                          >
                            {positions.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">View by Depot</label>
                          <select
                            value={depotFilter}
                            onChange={(e) => setDepotFilter(e.target.value)}
                            className="w-full px-3 py-2 border rounded"
                          >
                            <option value="All">All Depots</option>
                            {depots.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">View by Employment Status</label>
                          <select
                            value={employmentStatusFilter}
                            onChange={(e) => setEmploymentStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 border rounded"
                          >
                            {employmentStatuses.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">View Options</label>
                          <select
                            value={viewMode}
                            onChange={(e) => setViewMode(e.target.value)}
                            className="w-full px-3 py-2 border rounded"
                          >
                            <option value="all">View All</option>
                            <option value="pending_requirements">View All with Pending Requirement Validation</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          {loading && <div className="p-6 text-gray-600">Loading employees…</div>}

          {!loading && loadError && (
            <div className="p-4 bg-red-50 text-red-700 rounded">
              Failed to load employees: {loadError}
            </div>
          )}

          {!loading && !loadError && filtered.length === 0 && (
            <div className="p-6 text-gray-600">No employees found.</div>
          )}

            {!loading && !loadError && filtered.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-4 py-2 text-left">Employee ID</th>
                      <th className="border px-4 py-2 text-left">Name</th>
                      <th className="border px-4 py-2 text-left">Position</th>
                      <th className="border px-4 py-2 text-left">Depot</th>
                      <th className="border px-4 py-2 text-left">Employment Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((emp) => (
                      <tr
                        key={emp.id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => setSelectedEmployee(emp)}
                      >
                        <td className="border px-4 py-2 text-gray-500 text-sm">{emp.id}</td>

                        {/* Name column: left name, right badge */}
                        <td className="border px-4 py-2 font-bold">
                          <div className="flex items-center justify-between">
                            <span className="truncate mr-4">{emp.name}</span>

                            {emp.agency && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200 ml-2">
                                Agency
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="border px-4 py-2 text-gray-600">
                          {emp.position || "—"}
                        </td>
                        <td className="border px-4 py-2 text-gray-600">
                          {emp.depot || "—"}
                        </td>
                        <td className="border px-4 py-2 text-gray-600">
                          <select
                            className="border rounded px-2 py-1 text-sm"
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              // Update employment status - would need to save to database
                              console.log("Update employment status for", emp.id, "to", e.target.value);
                            }}
                            defaultValue="Regular"
                          >
                            <option value="Regular">Regular</option>
                            <option value="Under Probation">Under Probation</option>
                            <option value="Part Time">Part Time</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <EmployeeDetailView 
            employee={selectedEmployee} 
            employees={filtered}
            onBack={() => setSelectedEmployee(null)}
            onSelectEmployee={(emp) => setSelectedEmployee(emp)}
          />
        )}
      </div>
    </>
  );
}

// Employee Detail View Component
function EmployeeDetailView({ employee, employees, onBack, onSelectEmployee }) {
  if (!employee) return null;
  
  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Left Sidebar - Employee List */}
      <div className="col-span-3 bg-gray-50 border rounded-lg p-4 max-h-[85vh] overflow-y-auto">
        <h3 className="font-bold text-gray-800 mb-3 text-sm">Employee List</h3>
        <div className="space-y-2">
          {employees.map((emp) => (
            <div
              key={emp.id}
              onClick={() => onSelectEmployee(emp)}
              className={`p-2 rounded cursor-pointer transition-colors text-xs ${
                employee.id === emp.id
                  ? "bg-blue-100 border-2 border-blue-500"
                  : "bg-white border border-gray-200 hover:bg-gray-100"
              }`}
            >
              <div className="font-semibold text-gray-800 truncate">{emp.name}</div>
              <div className="text-gray-500 truncate">{emp.position || "—"}</div>
              {emp.agency && (
                <span className="inline-block mt-1 px-1 py-0.5 text-xs bg-blue-100 text-blue-600 rounded border border-blue-200">
                  🚩 Agency
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right Side - Detail View */}
      <div className="col-span-9">
        <div className="bg-white border rounded-md shadow-sm">
          <EmployeeDetailsWrapper employee={employee} employees={employees} onBack={onBack} />
        </div>
      </div>
    </div>
  );
}

// Wrapper component - navigates to EmployeeDetails page with employees list
function EmployeeDetailsWrapper({ employee, employees, onBack }) {
  const navigate = useNavigate();
  
  React.useEffect(() => {
    if (employee) {
      navigate("/hr/employee/details", { 
        state: { 
          employee,
          employees,
          returnTo: "/hr/employees"
        } 
      });
    }
  }, [employee, employees, navigate]);
  
  return (
    <div className="p-4">
      <div className="text-gray-600">Redirecting to employee details...</div>
    </div>
  );
}

export default Employees;
