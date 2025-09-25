import { Link } from "react-router-dom";
import { useState } from "react";

function HrEval() {
    const [showModal, setShowModal] = useState(false);
    const [expandedEmployee, setExpandedEmployee] = useState(null);
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
                <a href="/employees" className="text-gray-700 hover:text-red-600 font-medium">Employees</a>
                <a href="#" className="text-gray-700 hover:text-red-600 font-medium">Recruitment</a>
                <Link to ="/hr/trainings" className="text-gray-700 hover:text-red-600 font-medium">Trainings/Seminars</Link>
                <Link to="/hr/eval" className="text-gray-700 hover:text-red-600 font-medium">Evaluation</Link>
                <a href="#" className="text-gray-700 hover:text-red-600 font-medium">Seperation</a>
                <Link to ="/hr/notif" className="text-gray-700 hover:text-red-600 font-medium relative">
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
        
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dept</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Appraisal Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">00011</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Delacruz, Juan</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Delivery</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">P</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">05-08-25</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">No File</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <button onClick={() => setShowModal(true)} className="text-blue-600 hover:text-blue-800 cursor-pointer">+ add a record</button>
                    <button onClick={() => setExpandedEmployee(expandedEmployee === '00011' ? null : '00011')} className="ml-2 text-gray-400 cursor-pointer">
                      {expandedEmployee === '00011' ? '▲' : '▼'}
                    </button>
                  </td>
                </tr>
                {expandedEmployee === '00011' && (
                  <>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Delivery</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">05-08-24</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">employeefile.pdf</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Retained</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Delivery</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">P</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">05-08-23</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">employeefile.pdf</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Observe</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Delivery</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">05-08-22</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">employeefile.pdf</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Retained</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Delivery</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">P</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">05-08-22</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">employeefile.pdf</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Observe</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Delivery</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">05-08-22</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">employeefile.pdf</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Retained</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Delivery</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">P</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">05-08-22</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">employeefile.pdf</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Observe</td>
                    </tr>
                  </>
                )}
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">00012</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Santos, Maria</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Sales</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">A</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">05-08-25</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">No File</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <button onClick={() => setShowModal(true)} className="text-blue-600 hover:text-blue-800 cursor-pointer">+ add a record</button>
                    <button onClick={() => setExpandedEmployee(expandedEmployee === '00012' ? null : '00012')} className="ml-2 text-gray-400 cursor-pointer">
                      {expandedEmployee === '00012' ? '▲' : '▼'}
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">00013</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Garcia, Pedro</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Marketing</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">B</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">05-08-25</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">No File</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <button onClick={() => setShowModal(true)} className="text-blue-600 hover:text-blue-800 cursor-pointer">+ add a record</button>
                    <button onClick={() => setExpandedEmployee(expandedEmployee === '00013' ? null : '00013')} className="ml-2 text-gray-400 cursor-pointer">
                      {expandedEmployee === '00013' ? '▲' : '▼'}
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">00014</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Lopez, Ana</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">HR</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">A</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">05-08-25</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">No File</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <button onClick={() => setShowModal(true)} className="text-blue-600 hover:text-blue-800 cursor-pointer">+ add a record</button>
                    <button onClick={() => setExpandedEmployee(expandedEmployee === '00014' ? null : '00014')} className="ml-2 text-gray-400 cursor-pointer">
                      {expandedEmployee === '00014' ? '▲' : '▼'}
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">00015</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Martinez, Carlos</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">IT</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">P</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">05-08-25</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">No File</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <button onClick={() => setShowModal(true)} className="text-blue-600 hover:text-blue-800 cursor-pointer">+ add a record</button>
                    <button onClick={() => setExpandedEmployee(expandedEmployee === '00015' ? null : '00015')} className="ml-2 text-gray-400 cursor-pointer">
                      {expandedEmployee === '00015' ? '▲' : '▼'}
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">00016</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Rodriguez, Sofia</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Finance</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">B</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">05-08-25</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">No File</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <button onClick={() => setShowModal(true)} className="text-blue-600 hover:text-blue-800 cursor-pointer">+ add a record</button>
                    <button onClick={() => setExpandedEmployee(expandedEmployee === '00016' ? null : '00016')} className="ml-2 text-gray-400 cursor-pointer">
                      {expandedEmployee === '00016' ? '▲' : '▼'}
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">00017</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Hernandez, Luis</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Operations</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">A</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">05-08-25</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">No File</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <button onClick={() => setShowModal(true)} className="text-blue-600 hover:text-blue-800 cursor-pointer">+ add a record</button>
                    <button onClick={() => setExpandedEmployee(expandedEmployee === '00017' ? null : '00017')} className="ml-2 text-gray-400 cursor-pointer">
                      {expandedEmployee === '00017' ? '▲' : '▼'}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 border-2 border-gray-300">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Evaluation Date</label>
                  <input type="text" defaultValue="05-08-25" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Files</label>
                  <div className="flex items-center px-3 py-2 border border-gray-300 rounded-md">
                    <span className="text-gray-500">📎 Attach</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md cursor-pointer">
                    <option>Select</option>
                    <option>Retain</option>
                    <option>Observe</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-500 text-white rounded-md">Cancel</button>
                <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-red-600 text-white rounded-md">Save</button>
              </div>
            </div>
          </div>
        )}
        </>
     );
}
export default HrEval;