import { Link } from "react-router-dom";
import { useState } from "react";
import { NavLink } from "react-router-dom";


function HrEval() {
    const [showModal, setShowModal] = useState(false);
    // const [expandedEmployee, setExpandedEmployee] = useState(null);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [modalRecords, setModalRecords] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({
        date: "05-08-25",
        file: "",
        remarks: "Select"
    });
    const removeRecord = (index) => {
  setModalRecords((prev) => prev.filter((_, i) => i !== index));
    };

    return ( 
        <> 
        <nav className="w-full bg-white shadow-md mb-6 ">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-center h-25">
              <div className="flex-shrink-0 text-red-600 font-bold text-2xl italic">
                Each-R
              </div>
              <div className="flex space-x-6 ml-0 md:ml-32 lg:ml-10">
                <Link to = "/hr/home" className="text-gray-700 hover:text-red-600 font-medium">Home</Link>
                <Link to="/employees" className="text-gray-700 hover:text-red-600 font-medium">Employees</Link>
                <Link to="/hr/recruitment" className="text-gray-700 hover:text-red-600 font-medium">Recruitment</Link>
                <Link to ="/hr/trainings" className="text-gray-700 hover:text-red-600 font-medium">Trainings/Seminars</Link>

                <NavLink to="/hr/eval" className={({ isActive }) => `hover:text-red-600 ${
                isActive ? "text-red-600 font-semibold border-b-2 border-red-600" : "text-gray-700"
                }`}>Evaluation</NavLink>

                <Link to="/hr/seperation" className="text-gray-700 hover:text-red-600 font-medium">Separation</Link>
                <Link to ="/hr/notif" className="text-gray-700 hover:text-red-600 font-medium relative">
                    Notifications
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">3</span>
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-gray-700 font-semibold">Alexis Yvone</span>
                <Link to="/employee/login" className="text-gray-700 hover:text-red-600 font-medium">Logout</Link>
              </div>
            </div>
          </div>
        </nav>
        
        <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-115">
              <div className="overflow-auto flex-1">
                <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-6 py-4 text-left font-semibold text-gray-800">Employee ID</th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-800">Name</th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-800">Department</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                       <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => {setSelectedEmployee({id: "00785", name: "Dela Cruz, Juan", department: "Delivery"}); setShowModal(true);}}>
                         <td className="px-6 py-4 text-gray-700">00785</td>
                         <td className="px-6 py-4 text-gray-700">Dela Cruz, Juan</td>
                         <td className="px-6 py-4 text-gray-700">Delivery</td>
                       </tr>
                       <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => {setSelectedEmployee({id: "00784", name: "Torres, Juan Miguel", department: "Delivery"}); setShowModal(true);}}>
                         <td className="px-6 py-4 text-gray-700">00784</td>
                         <td className="px-6 py-4 text-gray-700">Torres, Juan Miguel</td>
                         <td className="px-6 py-4 text-gray-700">Delivery</td>
                       </tr>
                       <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => {setSelectedEmployee({id: "00783", name: "Rivera, Paolo Andres", department: "Delivery"}); setShowModal(true);}}>
                         <td className="px-6 py-4 text-gray-700">00783</td>
                         <td className="px-6 py-4 text-gray-700">Rivera, Paolo Andres</td>
                         <td className="px-6 py-4 text-gray-700">Delivery</td>
                       </tr>
                       <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => {setSelectedEmployee({id: "00782", name: "Reyes, Christian", department: "Deliver"}); setShowModal(true);}}>
                         <td className="px-6 py-4 text-gray-700">00782</td>
                         <td className="px-6 py-4 text-gray-700">Reyes, Christian</td>
                         <td className="px-6 py-4 text-gray-700">Deliver</td>
                       </tr>
                       <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => {setSelectedEmployee({id: "00781", name: "Santos, Nathaniel", department: "Delivery"}); setShowModal(true);}}>
                         <td className="px-6 py-4 text-gray-700">00781</td>
                         <td className="px-6 py-4 text-gray-700">Santos, Nathaniel</td>
                         <td className="px-6 py-4 text-gray-700">Delivery</td>
                       </tr>
                       <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => {setSelectedEmployee({id: "00780", name: "Navarro, Elijah", department: "Delivery"}); setShowModal(true);}}>
                         <td className="px-6 py-4 text-gray-700">00780</td>
                         <td className="px-6 py-4 text-gray-700">Navarro, Elijah</td>
                         <td className="px-6 py-4 text-gray-700">Delivery</td>
                       </tr>
                       <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => {setSelectedEmployee({id: "00779", name: "Ramos, Gabriel", department: "Security"}); setShowModal(true);}}>
                         <td className="px-6 py-4 text-gray-700">00779</td>
                         <td className="px-6 py-4 text-gray-700">Ramos, Gabriel</td>
                         <td className="px-6 py-4 text-gray-700">Security</td>
                       </tr>
                       <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => {setSelectedEmployee({id: "00779", name: "Drilon, Alexis", department: "Security"}); setShowModal(true);}}>
                         <td className="px-6 py-4 text-gray-700">00779</td>
                         <td className="px-6 py-4 text-gray-700">Drilon, Alexis</td>
                         <td className="px-6 py-4 text-gray-700">Security</td>
                       </tr>
                    </tbody>
                  </table>
              </div>
            </div>
            </div>

        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-[90vh] max-h-[50vh] overflow-y-auto p-6 border-2 border-gray-300 flex flex-col">
              <h3 className="text-lg font-semibold mb-4">Employee Evaluation - {selectedEmployee?.name}</h3>
            <div className="flex-1 overflow-y-auto px-6">
              <table className="w-full mb-4">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-3 py-2 text-left font-semibold text-gray-800">Type</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-800">Appraisal Date</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-800">File</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-800">Remarks</th>
                     <th className="px-3 py-2 text-left font-semibold text-gray-800">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {modalRecords.map((record, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2 text-gray-700">{record.type}</td>
                      <td className="px-3 py-2 text-gray-700">{record.date}</td>
                      <td className="px-3 py-2 text-gray-700">{record.file}</td>
                      <td className="px-3 py-2 text-gray-700">{record.remarks}</td>
                      <td className="px-3 py-2"><button
                      type="button" onClick={() => removeRecord(index)} 
                      className="text-red-600 text-sm px-2 cursor-pointer">x</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200">
                <div className="flex justify-end items-end space-x-3 py-2">
                  <button 
                    onClick={() => setShowAddForm(true)}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Add Record
                  </button>
                  <button 
                    onClick={() => {
                      setShowModal(false);
                      setSelectedEmployee(null);
                      setModalRecords([]);
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showAddForm && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 border-2 border-gray-300">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Evaluation Date</label>
                  <input 
                    type="text" 
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Files</label>
                  <div className="flex items-center px-3 py-2 border border-gray-300 rounded-md">
                    <span className="text-gray-500">📎 Attach</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                  <select 
                    value={formData.remarks}
                    onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md cursor-pointer"
                  >
                    <option>Select</option>
                    <option>Retained</option>
                    <option>Observed</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button 
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    const fileDisplay = formData.file ? "employeefile.pdf" : "employeefile.pdf";
                    setModalRecords([...modalRecords, {
                      type: "P", 
                      date: formData.date, 
                      file: fileDisplay, 
                      remarks: formData.remarks
                    }]);
                    setShowAddForm(false);
                    setFormData({date: "05-08-25", file: "", remarks: "Select"});
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-md"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
        
        </>
     );
}
export default HrEval;