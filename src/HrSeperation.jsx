import { Link } from "react-router-dom";
import { NavLink } from "react-router-dom";
import { useState } from "react";

function HrSeperation() {
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [statuses, setStatuses] = useState(['None', 'None', 'Submitted']);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocFile, setNewDocFile] = useState(null);

  const employees = [
    { id: "000785", name: "Dela Cruz, Juan", position: "Truck Driver", status: "To be reviewed" },
    { id: "000784", name: "Torres, Paolo Andres", position: "Delivery Helper", status: "To be reviewed" },
    { id: "000783", name: "Rivera, Paolo Miguel", position: "Delivery Helper", status: "To be reviewed" },
    { id: "000782", name: "Reyes, Christian", position: "HR Coordinator", status: "To be reviewed" },
    { id: "000786", name: "Dela Cruz Miguel", position: "Truck Helper", status: "To be reviewed" },
    { id: "000787", name: "Torres, Paolo Andres", position: "Delivery Helper", status: "To be reviewed" },
    { id: "000788", name: "Reyes, Christian", position: "HR Coordinator", status: "To be reviewed" },
  ];

  const handleRowClick = (employee) => {
    setSelectedEmployee(employee);
    setShowModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Validated': return 'bg-green-500 text-white';
      case 'Submitted': return 'bg-orange-500 text-white';
      case 'Re-Submit': return 'bg-red-500 text-white';
      case 'None' : return 'bg-white-500 text-black'
      default: return 'bg-gray-500 text-white';
    }
  };

  const handleSaveDoc = () => {
    if (newDocName && newDocFile) {
      setUploadedDocs([...uploadedDocs, { name: newDocName, file: newDocFile.name }]);
      setNewDocName('');
      setNewDocFile(null);
      setShowUploadForm(false);
    }
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
              <Link to="/hr/home" className="text-gray-700 hover:text-red-600 font-medium">Home</Link>
              <a href="/employees" className="text-gray-700 hover:text-red-600 font-medium">Employees</a>
              <Link to="/hr/recruitment" className="text-gray-700 hover:text-red-600 font-medium">Recruitment</Link>
              <Link to="/hr/trainings" className="text-gray-700 hover:text-red-600 font-medium">Trainings/Seminars</Link>
              <Link to="/hr/eval" className="text-gray-700 hover:text-red-600 font-medium">Evaluation</Link>

              <NavLink to="/hr/seperation" className={({ isActive }) => `hover:text-red-600 ${
                isActive ? "text-red-600 font-semibold border-b-2 border-red-600" : "text-gray-700"
              }`}>Separation</NavLink>

              <Link to="/hr/notif" className="text-gray-700 hover:text-red-600 font-medium relative">
                Notifications
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">3</span>
              </Link>
              <Link to="/employee/login" className="text-gray-700 hover:text-red-600 font-medium">Logout</Link>
            </div>
            <div className="flex items-center space-x-2 lg: ml-20 max-w-7xl">
              <span className="text-gray-700 font-semibold">Alexis Yvone</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Employee Separation</h1>
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.map((employee) => (
                <tr
                  key={employee.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleRowClick(employee)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.position}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && selectedEmployee && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto border-2 border-black">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">Separation Documents - {selectedEmployee.name}</h2>
              <div className="flex items-center space-x-4">
                <button onClick={() => setShowUploadForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Upload File</button>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
              </div>
            </div>
            {showUploadForm && (
              <div className="p-4 border-t">
                <h3 className="text-lg font-semibold mb-2">Upload New Document</h3>
                <div className="flex space-x-4">
                  <input
                    type="text"
                    placeholder="Document Name"
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    className="border border-gray-300 rounded-md px-2 py-1 flex-1"
                  />
                  <input
                    type="file"
                    onChange={(e) => setNewDocFile(e.target.files[0])}
                    className="border border-gray-300 rounded-md px-2 py-1"
                  />
                  <button onClick={handleSaveDoc} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Save</button>
                  <button onClick={() => setShowUploadForm(false)} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">Cancel</button>
                </div>
              </div>
            )}
            <div className="p-4">
              <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 w-full table-fixed">
                  <thead className="bg-gray-50 w-full">
                    <tr className="w-full">
                      <th className="w-1/5 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document Name</th>
                      <th className="w-1/5 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                      <th className="w-1/5 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                      <th className="w-1/5 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Upload</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Resignation Letter</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">resignation_letter.pdf 11/15/2024</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select 
                          value={statuses[2]} 
                          onChange={(e) => setStatuses([statuses[0], statuses[1], e.target.value])}
                          className={`border border-gray-300 rounded-md px-2 py-1 text-xs ${getStatusColor(statuses[2])}`}
                        >
                          <option value="Validated" style={{backgroundColor: 'green', color: 'white'}}>Validated</option>
                          <option value="Submitted" style={{backgroundColor: 'orange', color: 'white'}}>Submitted</option>
                          <option value="Re-Submit" style={{backgroundColor: 'red', color: 'white'}}>Re-Submit</option>
                          <option value="None" style={{backgroundColor: 'white', color: 'black'}}>None</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                  
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Exit Interview Form</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">No File Uploaded</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select 
                          value={statuses[1]} 
                          onChange={(e) => setStatuses([statuses[0], e.target.value, statuses[2]])}
                          className={`border border-gray-300 rounded-md px-2 py-1 text-xs ${getStatusColor(statuses[1])}`}
                        >
                          <option value="Validated" style={{backgroundColor: 'green', color: 'white'}}>Validated</option>
                          <option value="Submitted" style={{backgroundColor: 'orange', color: 'white'}}>Submitted</option>
                          <option value="Re-Submit" style={{backgroundColor: 'red', color: 'white'}}>Re-Submit</option>
                          <option value="None" style={{backgroundColor: 'white', color: 'black'}}>None</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input type="file" className="border border-gray-300 rounded-md px-2 py-1 w-40 text-xs" />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Exit Clearance Form</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">No File Uploaded</td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select 
                          value={statuses[0]} 
                          onChange={(e) => setStatuses([e.target.value, statuses[1], statuses[2]])}
                          className={`border border-gray-300 rounded-md px-2 py-1 text-xs ${getStatusColor(statuses[0])}`}
                        >
                          <option value="Validated" style={{backgroundColor: 'green', color: 'white'}}>Validated</option>
                          <option value="Submitted" style={{backgroundColor: 'orange', color: 'white'}}>Submitted</option>
                          <option value="Re-Submit" style={{backgroundColor: 'red', color: 'white'}}>Re-Submit</option>
                          <option value="None" style={{backgroundColor: 'white', color: 'black'}}>None</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input type="file" className="border border-gray-300 rounded-md w-40 px-2 py-1 text-xs" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {uploadedDocs.length > 0 && (
                <div className="mt-4 bg-white shadow-md rounded-lg overflow-hidden">
                  <h3 className="px-6 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">Additional Documents</h3>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {uploadedDocs.map((doc, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{doc.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{doc.file}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </>
  );
}

export default HrSeperation;
