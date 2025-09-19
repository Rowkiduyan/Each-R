import React, { useState } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";


function Employees() {
  // --- Depots and Colors ---
  const depots = [
    "Pasig","Cagayan","Butuan","Davao","Cebu","Laguna","Iloilo",
    "Bacolod","Zamboanga","Manila","Quezon City","Taguig",
    "Baguio","General Santos","Palawan","Olongapo","Tacloban",
    "Roxas","Legazpi","Cauayan","Cavite","Batangas","Ormoc","Koronadal",
    "Calbayog","Catbalogan","Tuguegarao","Baler","Iligan","Koronadal City"
  ];
  const COLORS = ["#4ade80", "#f87171"];

  // --- State ---
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [positionFilter, setPositionFilter] = useState("All");
  const [depotFilter, setDepotFilter] = useState("All");
  const [showAllDepots, setShowAllDepots] = useState(false);

  // --- Positions & Names ---
  const positions = ["Driver", "Helper", "HR Coordinator", "Truck Driver", "Delivery Helper"];
  const filipinoNames = [
    "Juan Dela Cruz","Maria Santos","Jose Rizal","Andres Bonifacio","Emilio Aguinaldo",
    "Apolinario Mabini","Melchora Aquino","Gregoria De Jesus","Isabelo Delos Reyes","Lea Salonga",
    "Nora Aunor","Fernando Poe Jr.","Vilma Santos","Sarah Geronimo","Piolo Pascual",
    "Liza Soberano","Enrique Gil","Coco Martin","Kathryn Bernardo","Daniel Padilla",
    "Alden Richards","Maine Mendoza","Vice Ganda","Anne Curtis","Luis Manzano",
    "Kris Aquino","Dingdong Dantes","Marian Rivera","Angel Locsin","Bea Alonzo",
    "John Lloyd Cruz","Kim Chiu","Xian Lim","Gerald Anderson","Maja Salvador",
    "Joshua Garcia","Janella Salvador","Donny Pangilinan","Belle Mariano","James Reid",
    "Nadine Lustre","Iñigo Pascual","Morissette Amon","Erik Santos"
  ];

  // --- Dummy Employees ---
  const [dummyEmployees] = useState(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: `E${(i + 1).toString().padStart(3, "0")}`,
      name: filipinoNames[i % filipinoNames.length],
      position: positions[i % positions.length],
      depot: depots[i % depots.length],
      status: "Active", // Fixed
    }))
  );

  // --- Depot Compliance (fixed percentages for demo) ---
  const depotCompliance = depots.map((d, i) => ({
    name: d,
    compliance: 70 + (i % 10), // just some variation
    nonCompliance: 30 - (i % 10),
  }));

  // --- Sorting ---
  const toggleSort = () => setSortOrder(sortOrder === "asc" ? "desc" : "asc");

  // --- Filtering ---
  const filtered = dummyEmployees
    .filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
    .filter(e => positionFilter === "All" ? true : e.position === positionFilter)
    .filter(e => depotFilter === "All" ? true : e.depot === depotFilter)
    .sort((a,b) => sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));

  // --- Depots to show in Pie Chart ---
  const displayedDepots = showAllDepots ? depotCompliance : depotCompliance.slice(0, 5);

  return (
    <>
      {/* Navbar */}
      <nav className="w-full bg-white shadow-md mb-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-25">
            <div className="flex-shrink-0 text-red-600 font-bold text-2xl italic">Each-R</div>
            <div className="flex space-x-6 ml-0 md:ml-32 lg:ml-10 flex-wrap">
              <a href="/hr/home" className="text-gray-700 hover:text-red-600 font-medium">Home</a>
              <a href="/employees" className="text-gray-700 hover:text-red-600 font-medium">Employees</a>
              {["Recruitment","Agencies","Trainings/Seminars","Evaluation","Seperation","Notifications","Logout"].map((link,i)=>(
                <a key={i} href="#" className="text-gray-700 hover:text-red-600 font-medium">{link}</a>
              ))}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-700 font-semibold">Alexis Yvone</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Compliance Monitoring */}
      <div className="max-w-7xl mx-auto px-4 mb-8">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-700">Depot Compliance Monitoring</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {displayedDepots.map((depot) => {
              const data = [
                { name: "Compliance", value: depot.compliance },
                { name: "Non-Compliance", value: depot.nonCompliance }
              ];
              return (
                <div key={depot.name} className="relative bg-white p-4 rounded-2xl shadow-md flex flex-col items-center hover:shadow-xl transition-transform cursor-pointer">
                  <PieChart width={180} height={180}>
                    <Pie data={data} cx="50%" cy="50%" outerRadius={70} dataKey="value">
                      {data.map((entry,i)=><Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-sm font-semibold">{depot.name}</span>
                    <span className="font-bold text-black">{depot.compliance}%</span>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Show More / Arrow */}
          {depotCompliance.length > 5 && (
            <div className="flex justify-end mt-2">
              <button onClick={() => setShowAllDepots(!showAllDepots)} className="text-gray-700 text-xl font-bold">
                {showAllDepots ? "▲" : "▼"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Employee Cards Section */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white shadow-md rounded-lg p-6 relative">
          <h2 className="text-xl font-bold mb-4 text-gray-700">Employee List</h2>

          {/* Sticky Controls */}
          <div className="sticky top-0 bg-white z-10 flex flex-wrap gap-4 justify-center mb-4 p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search Employee..."
              value={search}
              onChange={(e)=>setSearch(e.target.value)}
              className="px-4 py-2 border rounded w-full sm:w-auto"
            />
            <button onClick={toggleSort} className="px-4 py-2 bg-gray-200 rounded">
              Sort by Name ({sortOrder==="asc"?"A–Z":"Z–A"})
            </button>
            <select value={positionFilter} onChange={(e)=>setPositionFilter(e.target.value)} className="px-4 py-2 border rounded">
              <option value="All">All Positions</option>
              {positions.map(p => <option key={p}>{p}</option>)}
            </select>
            <select value={depotFilter} onChange={(e)=>setDepotFilter(e.target.value)} className="px-4 py-2 border rounded">
              <option value="All">All Depots</option>
              {depots.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>

          {/* Employee Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map(emp => (
              <div key={emp.id} className="relative bg-slate-50 rounded-2xl shadow-lg p-4 flex flex-col gap-2 hover:shadow-xl hover:scale-105 transition-transform cursor-pointer">
                <span className="text-gray-500 text-sm">ID: {emp.id}</span>
                <span className="font-bold text-lg">{emp.name}</span>
                <span className="text-gray-600 text-sm">{emp.position} | {emp.depot}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default Employees;
