import React, { useState } from "react";
import { validateNoSunday } from "./utils/dateTimeRules";

const statuses = ["Present","Absent","Late","Under Verification","Leave","Non-working"];
const statusColors = {
  "Present": "bg-green-300",
  "Absent": "bg-red-300",
  "Late": "bg-orange-300",
  "Under Verification": "bg-blue-300",
  "Leave": "bg-purple-300",
  "Non-working": "bg-gray-200",
};

// ✅ 34 employees total (mix of Delivery Crew & Office)
const employees = [
  { id:"E001", name:"Juan Dela Cruz", type:"Delivery Crew" },
  { id:"E002", name:"Maria Santos", type:"Delivery Crew" },
  { id:"E003", name:"Jose Rizal", type:"Office" },
  { id:"E004", name:"Andres Bonifacio", type:"Office" },
  { id:"E005", name:"Ramon Bautista", type:"Delivery Crew" },
  { id:"E006", name:"Ana Villanueva", type:"Delivery Crew" },
  { id:"E007", name:"Carlos Garcia", type:"Office" },
  { id:"E008", name:"Rosa Mendoza", type:"Office" },
  { id:"E009", name:"Miguel Cruz", type:"Delivery Crew" },
  { id:"E010", name:"Elena Navarro", type:"Delivery Crew" },
  { id:"E011", name:"Paulo Reyes", type:"Office" },
  { id:"E012", name:"Liza Marquez", type:"Office" },
  { id:"E013", name:"Roberto Aquino", type:"Delivery Crew" },
  { id:"E014", name:"Carmen Flores", type:"Delivery Crew" },
  { id:"E015", name:"Diego Torres", type:"Office" },
  { id:"E016", name:"Isabel Ramos", type:"Office" },
  { id:"E017", name:"Nico Morales", type:"Delivery Crew" },
  { id:"E018", name:"Patricia Jimenez", type:"Delivery Crew" },
  { id:"E019", name:"Eduardo Lopez", type:"Office" },
  { id:"E020", name:"Teresa Vargas", type:"Office" },
  { id:"E021", name:"Joel Bautista", type:"Delivery Crew" },
  { id:"E022", name:"Sandra Perez", type:"Delivery Crew" },
  { id:"E023", name:"Victor Lim", type:"Office" },
  { id:"E024", name:"Bea Salvador", type:"Office" },
  { id:"E025", name:"Rico Fernandez", type:"Delivery Crew" },
  { id:"E026", name:"Alma Castillo", type:"Delivery Crew" },
  { id:"E027", name:"Fernando Cruz", type:"Office" },
  { id:"E028", name:"Grace Molina", type:"Office" },
  { id:"E029", name:"Jomar Villareal", type:"Delivery Crew" },
  { id:"E030", name:"Katrina Ramos", type:"Delivery Crew" },
  { id:"E031", name:"Luis Navarro", type:"Office" },
  { id:"E032", name:"Marites Santos", type:"Office" },
  { id:"E033", name:"Pedro Gutierrez", type:"Delivery Crew" },
  { id:"E034", name:"Sofia Cruz", type:"Office" },
];

export default function Attendance(){
  const [viewType,setViewType] = useState("Delivery Crew");
  const [search,setSearch] = useState("");
  const [dateFilter,setDateFilter] = useState("");
  const [page,setPage] = useState(1);
  const perPage = 10;

  const [data,setData] = useState(
    employees.reduce((acc,e)=>{
      acc[e.id] = Array.from({length:31},()=>statuses[Math.floor(Math.random()*statuses.length)]);
      return acc;
    },{})
  );

  const toggleStatus = (empId,dayIdx)=>{
    const next = statuses[(statuses.indexOf(data[empId][dayIdx])+1)%statuses.length];
    const newData = {...data};
    newData[empId][dayIdx] = next;
    setData(newData);
  };

  const filtered = employees.filter(e=>
    e.type===viewType && e.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / perPage);
  const startIdx = (page - 1) * perPage;
  const displayed = filtered.slice(startIdx, startIdx + perPage);

  return (
    <>
      {/* NAVBAR */}
      <nav className="w-full bg-white shadow-md mb-6">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-16">
          <div className="text-red-600 font-bold text-2xl italic">Each-R</div>
          <div className="flex space-x-6">
            <a href="/" className="hover:text-red-600">Home</a>
            <a href="/employees" className="hover:text-red-600">Employees</a>
            <a href="/attendance" className="hover:text-red-600 font-bold underline">Attendance</a>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4">
        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-4">
          <input
            value={search}
            onChange={(e)=>{setSearch(e.target.value); setPage(1);}}
            placeholder="Search Employee..."
            className="border px-3 py-2 rounded"
          />
          <input
            type="date"
            value={dateFilter}
            onChange={(e)=>{
              const v = e.target.value;
              if (!validateNoSunday(e.target, v)) return;
              setDateFilter(v);
            }}
            className="border px-3 py-2 rounded"
          />
          <button
            onClick={()=>{
              setViewType(viewType==="Delivery Crew"?"Office":"Delivery Crew");
              setPage(1);
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            {viewType==="Delivery Crew"?"Switch to Office Employees":"Switch to Delivery Crew"}
          </button>
        </div>

        {/* Legends */}
        <div className="flex flex-wrap gap-4 mb-4">
          {Object.entries(statusColors).map(([status,color])=>(
            <div key={status} className="flex items-center gap-1">
              <div className={`w-5 h-5 ${color} rounded ring-1 ring-gray-400`}></div>
              <span className="text-sm">{status}</span>
            </div>
          ))}
        </div>

        {/* Attendance Table */}
        <div className="overflow-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-1 border">ID</th>
                <th className="px-2 py-1 border">Name</th>
                {Array.from({length:31},(_,i)=><th key={i} className="px-2 py-1 border">{i+1}</th>)}
              </tr>
            </thead>
            <tbody>
              {displayed.map(emp=>(
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{emp.id}</td>
                  <td className="border px-2 py-1">{emp.name}</td>
                  {data[emp.id].map((status,idx)=>(
                    <td
                      key={idx}
                      onClick={()=>toggleStatus(emp.id,idx)}
                      className={`border cursor-pointer w-8 h-8 text-center rounded shadow-sm ring-1 ring-gray-300 ${statusColors[status]} hover:scale-105 hover:brightness-110 transition-transform`}
                      title={status}
                    ></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex justify-center gap-4 mt-4">
          <button
            onClick={()=>setPage(p=>Math.max(p-1,1))}
            disabled={page===1}
            className={`px-4 py-2 rounded ${page===1?'bg-gray-300 text-gray-600':'bg-red-600 text-white hover:bg-red-700'}`}
          >
            Previous
          </button>
          <span className="px-2 py-2">Page {page} of {totalPages}</span>
          <button
            onClick={()=>setPage(p=>Math.min(p+1,totalPages))}
            disabled={page===totalPages}
            className={`px-4 py-2 rounded ${page===totalPages?'bg-gray-300 text-gray-600':'bg-red-600 text-white hover:bg-red-700'}`}
          >
            Next
          </button>
        </div>

        {/* Underlined report link */}
        <div className="mt-4 text-center">
          <button className="underline opacity-70 hover:opacity-100">
            View Attendance Report
          </button>
        </div>
      </div>
    </>
  );
}
