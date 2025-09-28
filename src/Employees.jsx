import React, { useState } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { useNavigate, Link } from "react-router-dom"; // ✅ Added Link
import { NavLink } from "react-router-dom";


function Employees() {
  const navigate = useNavigate();

  const depots = [
    "Pasig","Cagayan","Butuan","Davao","Cebu","Laguna","Iloilo",
    "Bacolod","Zamboanga","Manila","Quezon City","Taguig",
    "Baguio","General Santos","Palawan","Olongapo","Tacloban",
    "Roxas","Legazpi","Cauayan","Cavite","Batangas","Ormoc","Koronadal",
    "Calbayog","Catbalogan","Tuguegarao","Baler","Iligan","Koronadal City"
  ];
  const COLORS = ["#4ade80", "#f87171"];

  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [positionFilter, setPositionFilter] = useState("All");
  const [depotFilter, setDepotFilter] = useState("All");
  const [showAllDepots, setShowAllDepots] = useState(false);

  const positions = ["Driver","Helper","HR Coordinator","Truck Driver","Delivery Helper"];
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
    Array.from({ length: 60 }, (_, i) => ({
      id: `E${(i + 1).toString().padStart(3,"0")}`,
      name: filipinoNames[i % filipinoNames.length],
      position: positions[i % positions.length],
      depot: depots[i % depots.length],
      status: "Active",
      agency: i % 3 === 0, // Every 3rd employee is from an agency
    }))
  );

  const depotCompliance = depots.map((d,i) => ({
    name: d,
    compliance: 70 + (i % 10),
    nonCompliance: 30 - (i % 10),
  }));

  const toggleSort = () => setSortOrder(sortOrder === "asc" ? "desc" : "asc");

  const filtered = dummyEmployees
    .filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
    .filter(e => positionFilter === "All" || e.position === positionFilter)
    .filter(e => depotFilter === "All" || e.depot === depotFilter)
    .sort((a,b) =>
      sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    );

  const displayedDepots = showAllDepots ? depotCompliance : depotCompliance.slice(0,5);

  return (
    <>
      {/* Navbar */}
<nav className="w-full bg-white shadow-md mb-6">
  <div className="max-w-7xl mx-auto px-4">
    <div className="flex justify-between items-center h-25">
      <div className="flex-shrink-0 text-red-600 font-bold text-2xl italic">
        Each-R
      </div>
      <div className="flex space-x-6 flex-wrap">
        <Link to="/hr/home" className="text-gray-700 hover:text-red-600 font-medium">Home</Link>
        <NavLink to="/employees" className={({ isActive }) => `hover:text-red-600 ${
        isActive ? "text-red-600 font-semibold border-b-2 border-red-600" : "text-gray-700"
        }`}>Employees</NavLink>
        <Link to="/hr/recruitment" className="text-gray-700 hover:text-red-600 font-medium">Recruitment</Link>
        <Link to="/hr/trainings" className="text-gray-700 hover:text-red-600 font-medium">Trainings/Seminars</Link>
        <Link to="/hr/eval" className="text-gray-700 hover:text-red-600 font-medium">Evaluation</Link>
        <Link to="/hr/seperation" className="text-gray-700 hover:text-red-600 font-medium">Seperation</Link>
        <Link to="/hr/notif" className="text-gray-700 hover:text-red-600 font-medium">Notifications</Link>
        <Link to="/employee/login" className="text-gray-700 hover:text-red-600 font-medium">Logout</Link>
      </div>
      <span className="text-gray-700 font-semibold">Alexis Yvone</span>
    </div>
  </div>
</nav>


      {/* Depot Compliance */}
      <div className="max-w-7xl mx-auto px-4 mb-8">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-700">Depot Compliance Monitoring</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {displayedDepots.map(depot=>{
              const data = [
                { name: "Compliance", value: depot.compliance },
                { name: "Non-Compliance", value: depot.nonCompliance },
              ];
              return (
                <div key={depot.name}
                  className="relative bg-white p-4 rounded-2xl shadow-md flex flex-col items-center hover:shadow-xl transition-transform cursor-pointer">
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
          {depotCompliance.length > 5 && (
            <div className="flex justify-end mt-2">
              <button onClick={()=>setShowAllDepots(!showAllDepots)} className="text-gray-700 text-xl font-bold">
                {showAllDepots ? "▲" : "▼"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Employee Cards */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-700">Employee List</h2>
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
              {positions.map(p=><option key={p}>{p}</option>)}
            </select>
            <select value={depotFilter} onChange={(e)=>setDepotFilter(e.target.value)} className="px-4 py-2 border rounded">
              <option value="All">All Depots</option>
              {depots.map(d=><option key={d}>{d}</option>)}
            </select>
          </div>

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
                {filtered.map(emp=>(
                  <tr
                    key={emp.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={()=>navigate("/employee/details", { state: { employee: emp } })}
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
        </div>
      </div>
    </>
  );
}

export default Employees;
