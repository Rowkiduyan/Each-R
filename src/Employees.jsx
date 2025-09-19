import React, { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

function Employees() {
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [positionFilter, setPositionFilter] = useState("All");
  const [depotFilter, setDepotFilter] = useState("All");
  const [page, setPage] = useState(1);
  const perPage = 10;

  const depots = [
    "Pasig","Cagayan","Butuan","Davao","Cebu","Laguna","Iloilo",
    "Bacolod","Zamboanga","Manila","Quezon City","Taguig",
    "Baguio","General Santos","Palawan"
  ];

  const depotCompliance = depots.map((d) => ({
    name: d,
    compliance: Math.floor(Math.random() * 40) + 60,
    nonCompliance: Math.floor(Math.random() * 20) + 5,
  }));

  const COLORS = ["#4ade80", "#f87171"];
  const displayedDepots = showAll ? depotCompliance : depotCompliance.slice(0,5);

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

  const [dummyEmployees] = useState(() => 
  Array.from({ length: 44 }, (_, i) => {
    const depot = depots[i % depots.length];
    const pos = positions[i % positions.length];
    return {
      id: `E${(i + 1).toString().padStart(3, "0")}`,
      name: filipinoNames[i % filipinoNames.length], // assuming you replaced with Filipino names
      position: pos,
      status: Math.random() > 0.2 ? "Active" : "Inactive", // chosen only once
      depot,
    };
  })
);

  const [redDotIDs] = useState(() => {
  const randomIDs = dummyEmployees
    .map((e) => e.id)
    .sort(() => 0.5 - Math.random())
    .slice(0, 10);
  return new Set(randomIDs);
});

  const filtered = dummyEmployees
    .filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    .filter((e) => (positionFilter === "All" ? true : e.position === positionFilter))
    .filter((e) => (depotFilter === "All" ? true : e.depot === depotFilter))
    .sort((a, b) => 
      sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    );

  const totalPages = Math.ceil(filtered.length / perPage);
  const currentEmployees = filtered.slice((page-1)*perPage, page*perPage);

  const toggleSort = () => setSortOrder(sortOrder === "asc" ? "desc" : "asc");

  return (
    <>
      {/* Navbar */}
      <nav className="w-full bg-white shadow-md mb-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-25">
            <div className="flex-shrink-0 text-red-600 font-bold text-2xl italic">Each-R</div>
            <div className="flex space-x-6 ml-0 md:ml-32 lg:ml-10">
              <a href="/" className="text-gray-700 hover:text-red-600 font-medium">Home</a>
              <a href="/employees" className="text-gray-700 hover:text-red-600 font-medium">Employees</a>
              <a href="#" className="text-gray-700 hover:text-red-600 font-medium">Recruitment</a>
              <a href="#" className="text-gray-700 hover:text-red-600 font-medium">Agencies</a>
              <a href="#" className="text-gray-700 hover:text-red-600 font-medium">Trainings/Seminars</a>
              <a href="#" className="text-gray-700 hover:text-red-600 font-medium">Evaluation</a>
              <a href="#" className="text-gray-700 hover:text-red-600 font-medium">Seperation</a>
              <a href="#" className="text-gray-700 hover:text-red-600 font-medium">Notifications</a>
              <a href="#" className="text-gray-700 hover:text-red-600 font-medium">Logout</a>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-700 font-semibold">Alexis Yvone</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Compliance Section */}
      <div className="max-w-7xl mx-auto px-4 mb-8">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-700">Depot Compliance Monitoring</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {displayedDepots.map((depot, index) => {
  const data = [
    { name: "Compliance", value: depot.compliance },
    { name: "Non-Compliance", value: depot.nonCompliance },
  ];
  return (
    <div key={index} className="bg-gray-50 p-4 rounded-lg shadow flex flex-col items-center">
      {/* Depot name */}
      <h3 className="text-center font-semibold mb-1">{depot.name}</h3>

      {/* Percentage preview above the pie chart */}
      <div className="text-green-600 font-bold mb-1">
        {`${depot.compliance}%`}
      </div>

      {/* Pie chart */}
      <PieChart width={180} height={180}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          outerRadius={60}
          // Removed `label` here to stop pushing text outside the box
          dataKey="value"
        >
          {data.map((entry, idx) => (
            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </div>
  );
})}

          </div>
          <div className="flex justify-center mt-4">
            <button onClick={() => setShowAll(!showAll)} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              {showAll ? "Show Less" : "Show More"}
            </button>
          </div>
        </div>
      </div>

      {/* Employee Table */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white shadow-md rounded-lg p-6 relative">
          <h2 className="text-xl font-bold mb-4 text-gray-700">Employee List</h2>

          {/* Controls */}
          <div className="flex flex-wrap justify-between gap-2 mb-4">
            <input
              type="text"
              placeholder="Search Employee..."
              value={search}
              onChange={(e) => {setSearch(e.target.value); setPage(1);}}
              className="px-4 py-2 border rounded w-full md:w-1/3"
            />
            <button onClick={toggleSort} className="px-4 py-2 bg-gray-200 rounded">
              Sort by Name ({sortOrder === "asc" ? "A–Z" : "Z–A"})
            </button>
            <select value={positionFilter} onChange={(e) => {setPositionFilter(e.target.value); setPage(1);}} className="px-4 py-2 border rounded">
              <option value="All">All Positions</option>
              {positions.map((p) => <option key={p}>{p}</option>)}
            </select>
            <select value={depotFilter} onChange={(e) => {setDepotFilter(e.target.value); setPage(1);}} className="px-4 py-2 border rounded">
              <option value="All">All Depots</option>
              {depots.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>

          {/* Table */}
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">Employee ID</th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Position</th>
                <th className="px-4 py-2 text-left">Depot</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {currentEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 border-b">
                  <td className="px-4 py-2">{emp.id}</td>
                  <td className="px-4 py-2 flex items-center gap-2">
                    {emp.name}
                    {redDotIDs.has(emp.id) && <span className="text-red-600 text-lg">●</span>}
                  </td>
                  <td className="px-4 py-2">{emp.position}</td>
                  <td className="px-4 py-2">{emp.depot}</td>
                  <td className="px-4 py-2">
                    <span className={emp.status === "Active" ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                      {emp.status} 
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <button
              disabled={page === 1}
              onClick={() => setPage(page-1)}
              className={`px-4 py-2 rounded ${page===1 ? "bg-gray-300" : "bg-red-600 text-white hover:bg-red-700"}`}
            >
              Prev
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page+1)}
              className={`px-4 py-2 rounded ${page===totalPages ? "bg-gray-300" : "bg-red-600 text-white hover:bg-red-700"}`}
            >
              Next
            </button>
          </div>
        
              {/* Bottom buttons */}
            <div className="flex justify-center gap-4 mt-6">
            <button
                onClick={() => window.location.href = "/benefits"}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
                View Benefits Report
            </button>
            <button
                onClick={() => window.location.href = "/attendance"}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
                View Attendance
            </button>
            </div>


        </div>
      </div>
    </>
  );
}

export default Employees;
