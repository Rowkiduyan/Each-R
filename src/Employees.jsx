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

  // ---- Load employees (and subscribe for realtime) ----
  useEffect(() => {
    let channel;

    const normalize = (row) => ({
      id: row.id, // uuid
      name:
        [row.fname, row.mname, row.lname]
          .filter(Boolean)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim() || row.email,
      position: row.position || "Employee",
      depot: row.depot || "Main",
      email: row.email || "",
      role: row.role || "Employee",
      hired_at: row.hired_at,
      agency: false,
    });

    const load = async () => {
      setLoading(true);
      setLoadError("");
      const { data, error } = await supabase
        .from("employees")
        .select(
          "id, email, fname, lname, mname, contact_number, position, depot, role, hired_at"
        )
        .order("hired_at", { ascending: false });

      if (error) {
        console.error("❌ employees load error:", error);
        setLoadError(error.message || "Failed to load employees");
        setEmployees([]);
      } else {
        setEmployees((data || []).map(normalize));
      }
      setLoading(false);
    };

    load();

    // realtime subscription
    channel = supabase
      .channel("employees-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employees" },
        load
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

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
                      <td className="border px-4 py-2 font-bold">
                        <span>{emp.name}</span>
                        {emp.agency && (
                          <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 align-middle">
                            <span className="text-red-500">⚑</span>
                            Agency
                          </span>
                        )}
                      </td>
                      <td className="border px-4 py-2 text-gray-600">{emp.position}</td>
                      <td className="border px-4 py-2 text-gray-600">{emp.depot}</td>
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
