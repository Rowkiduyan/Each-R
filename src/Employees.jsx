// src/Employees.jsx
import React, { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
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
  const [showAllDepots, setShowAllDepots] = useState(false);

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

    const normalize = (row) => ({
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
      agency:
        (row.source && String(row.source).toLowerCase() === "agency")
        || (row.role && String(row.role).toLowerCase() === "agency")
        || !!row.agency_profile_id
        || !!row.endorsed_by_agency_id,
      source: row.source || null,
      endorsed_by_agency_id: row.endorsed_by_agency_id || row.agency_profile_id || null,
      endorsed_at: row.endorsed_at || null,
    });

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

        // Query 4: endorsements (useful when recruitment_endorsements created and job/depot stored there)
        const { data: endorseRows, error: endorseErr } = await supabase
          .from("recruitment_endorsements")
          .select("id, email, fname, lname, position, depot, payload, status, created_at")
          .filter("email", "in", inList)
          .order("created_at", { ascending: false })
          .limit(500);
        if (!endorseErr && Array.isArray(endorseRows)) {
          for (const r of endorseRows) {
            const p = safePayload(r.payload);
            const em = (r.email || (p?.applicant?.email) || (p?.form?.email) || "").toString().trim();
            if (!em) continue;
            if (!emailsToFill.includes(em)) continue;
            if (!appsByEmail[em]) appsByEmail[em] = [];
            // convert endorsement into app-like shape so extraction works similarly
            appsByEmail[em].push({ row: { id: r.id, payload: r.payload, status: r.status, created_at: r.created_at, job_posts: null }, payloadObj: p, endorsement: r });
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

        // merge into normalized employees
        const merged = normalized.map((emp) => {
          if ((!emp.position || !emp.depot) && emp.email) {
            const match = bestByEmail[emp.email];
            if (match) {
              const job_posts = match.row?.job_posts || null;
              const { position: derivedPos, depot: derivedDepot } = extractPositionDepotFromPayload(match.payloadObj, job_posts);
              return {
                ...emp,
                position: emp.position || (derivedPos ? derivedPos : null),
                depot: emp.depot || (derivedDepot ? derivedDepot : null),
              };
            }
          }
          return emp;
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

  // fake depot compliance (unchanged)
  const depotCompliance = depots.map((d, i) => ({
    name: d,
    compliance: 70 + (i % 10),
    nonCompliance: 30 - (i % 10),
  }));

  const toggleSort = () =>
    setSortOrder((o) => (o === "asc" ? "desc" : "asc"));

  // filters
  const filtered = employees
    .filter((e) =>
      e.name.toLowerCase().includes(search.toLowerCase())
    )
    .filter((e) => positionFilter === "All" || e.position === positionFilter)
    .filter((e) => depotFilter === "All" || e.depot === depotFilter)
    .sort((a, b) =>
      sortOrder === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    );

  const displayedDepots = showAllDepots
    ? depotCompliance
    : depotCompliance.slice(0, 5);

  return (
    <>
      {/* Depot Compliance */}
      <div className="max-w-7xl mx-auto px-4 mb-8">
        <div className="bg-white shadow-md rounded-lg p-6">
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
      </div>

      {/* Employee List */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-700">Employee List</h2>

          <div className="sticky top-0 bg-white z-10 flex flex-wrap gap-4 justify-center mb-4 p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search Employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-4 py-2 border rounded w-full sm:w-auto"
            />
            <button
              onClick={toggleSort}
              className="px-4 py-2 bg-gray-200 rounded"
            >
              Sort by Name ({sortOrder === "asc" ? "A–Z" : "Z–A"})
            </button>
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="px-4 py-2 border rounded"
            >
              {positions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={depotFilter}
              onChange={(e) => setDepotFilter(e.target.value)}
              className="px-4 py-2 border rounded"
            >
              <option value="All">All Depots</option>
              {depots.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
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
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((emp) => (
                    <tr
                      key={emp.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() =>
                        navigate("/hr/employee/details", {
                          state: { employee: emp },
                        })
                      }
                    >
                      <td className="border px-4 py-2 text-gray-500">{emp.id}</td>

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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Employees;
