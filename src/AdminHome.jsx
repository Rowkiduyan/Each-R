import { Link } from 'react-router-dom';
import { useState } from 'react';
import Logo from './Logo.png';


function AdminHome() {
    const [activeTab, setActiveTab] = useState("Home");
    const tabs = ["Home", "Manage Accounts", "Create Account", "Enable/Disable Accounts"];
    const [showModal, setShowModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [credentials, setCredentials] = useState({
        email: "",
        password: "",
        newPassword: "",
        confirmPassword: ""
    });
    
  return (
    <div className="min-h-screen bg-white">
          <div className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                
                <div className="flex items-center">
                  <div className="flex items-center">
                    <div className="text-white font-bold text-xl px-3 py-2 rounded mr-2">
                      <img
                        src={Logo}
                        alt="Roadwise Logo"
                        className="w-15 h-10"
                        />
                    </div>
                    <div className="text-black font-semibold">
                      <div>ROADWISE</div>
                      <div className="text-sm">LOGISTICS CORP.</div>
                    </div>
                  </div>
                </div>
    
        
                <div className="flex-1 text-center">
                  <h1 className="text-3xl font-bold text-gray-800">Welcome Admin!</h1>
                </div>
    
    
                <div className="flex items-end space-x-5">
    
                  <Link to ="/employee/login"
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                    Logout
                  </Link>
                </div>
    
              </div>
            </div>
          </div>
          <div className="flex justify-around mt-4 pt-20">
            <ul className="list-none flex space-x-6 mt-2">
                {tabs.map((tab) => (
                  <li key={tab}>
                      <button type='button' onClick={() => setActiveTab(tab)}
                      className={`appearance-none border-0 font-semibold text-white px-5 rounded-sm tracking-wider transition-colors
                        ${activeTab === tab
                          ? "bg-red-600"              
                          : "bg-red-500 hover:bg-red-600"}`}
                          >
                          {tab}
                      </button>
                  </li>
                ))}
            </ul>
    
            
            <div className="flex items-center">
                    <input 
                      type="text" 
                      placeholder="Search an Employee" 
                      className="w-70 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
          </div>          
          
          {(activeTab === "Home" || activeTab === "Manage Accounts") && (
            <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-115">
              <div className="overflow-auto flex-1">
                <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-6 py-4 text-left font-semibold text-gray-800">Employee ID</th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-800">Name</th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-800">Position</th>
                        {activeTab === "Manage Accounts" && (
                          <th className="px-6 py-4 text-left font-semibold text-gray-800">Action</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-700">00785</td>
                        <td className="px-6 py-4 text-gray-700">Dela Cruz, Juan</td>
                        <td className="px-6 py-4 text-gray-700">Truck Driver</td>
                        {activeTab === "Manage Accounts" && (
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => {
                                setSelectedEmployee({id: "00785", name: "Dela Cruz, Juan", position: "Truck Driver"});
                                setShowModal(true);
                              }}
                              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
                              Manage
                            </button>
                          </td>
                        )}
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-700">00784</td>
                        <td className="px-6 py-4 text-gray-700">Torres, Juan Miguel</td>
                        <td className="px-6 py-4 text-gray-700">Delivery Helper</td>
                        {activeTab === "Manage Accounts" && (
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => {
                                setSelectedEmployee({id: "00785", name: "Dela Cruz, Juan", position: "Truck Driver"});
                                setShowModal(true);
                              }}
                              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
                              Manage
                            </button>
                          </td>
                        )}
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-700">00783</td>
                        <td className="px-6 py-4 text-gray-700">Rivera, Paolo Andres</td>
                        <td className="px-6 py-4 text-gray-700">Truck Driver</td>
                        {activeTab === "Manage Accounts" && (
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => {
                                setSelectedEmployee({id: "00785", name: "Dela Cruz, Juan", position: "Truck Driver"});
                                setShowModal(true);
                              }}
                              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
                              Manage
                            </button>
                          </td>
                        )}
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-700">00782</td>
                        <td className="px-6 py-4 text-gray-700">Reyes, Christian</td>
                        <td className="px-6 py-4 text-gray-700">HR Coordinator</td>
                        {activeTab === "Manage Accounts" && (
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => {
                                setSelectedEmployee({id: "00785", name: "Dela Cruz, Juan", position: "Truck Driver"});
                                setShowModal(true);
                              }}
                              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
                              Manage
                            </button>
                          </td>
                        )}
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-700">00781</td>
                        <td className="px-6 py-4 text-gray-700">Santos, Nathaniel</td>
                        <td className="px-6 py-4 text-gray-700">Delivery Helper</td>
                        {activeTab === "Manage Accounts" && (
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => {
                                setSelectedEmployee({id: "00785", name: "Dela Cruz, Juan", position: "Truck Driver"});
                                setShowModal(true);
                              }}
                              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
                              Manage
                            </button>
                          </td>
                        )}
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-700">00780</td>
                        <td className="px-6 py-4 text-gray-700">Navarro, Elijah</td>
                        <td className="px-6 py-4 text-gray-700">Truck Driver</td>
                        {activeTab === "Manage Accounts" && (
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => {
                                setSelectedEmployee({id: "00785", name: "Dela Cruz, Juan", position: "Truck Driver"});
                                setShowModal(true);
                              }}
                              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
                              Manage
                            </button>
                          </td>
                        )}
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-700">00779</td>
                        <td className="px-6 py-4 text-gray-700">Ramos, Gabriel</td>
                        <td className="px-6 py-4 text-gray-700">Security Personnel</td>
                        {activeTab === "Manage Accounts" && (
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => {
                                setSelectedEmployee({id: "00785", name: "Dela Cruz, Juan", position: "Truck Driver"});
                                setShowModal(true);
                              }}
                              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
                              Manage
                            </button>
                          </td>
                        )}
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-700">00779</td>
                        <td className="px-6 py-4 text-gray-700">Drilon, Alexis</td>
                        <td className="px-6 py-4 text-gray-700">Security Personnel</td>
                        {activeTab === "Manage Accounts" && (
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => {
                                setSelectedEmployee({id: "00785", name: "Dela Cruz, Juan", position: "Truck Driver"});
                                setShowModal(true);
                              }}
                              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
                              Manage
                            </button>
                          </td>
                        )}
                      </tr>
                    </tbody>
                  </table>
              </div>
            </div>
            </div>
          )}
          
          {activeTab === "Create Account" && (
            <div className="max-w-7xl mx-auto px-6 py-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Create Account</h2>
                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
                    <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                    <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input type="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <input type="password" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500" />
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                      Create Account
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          
          {activeTab === "Enable/Disable Accounts" && (
            <div className="max-w-7xl mx-auto px-6 py-8">
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-115">
                  <div className="p-4 border-b border-gray-200">
                    <input 
                      type="text" 
                      placeholder="Search active employees..." 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div className="overflow-auto flex-1">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-6 py-4 text-left font-semibold text-gray-800">Employee ID</th>
                          <th className="px-6 py-4 text-left font-semibold text-gray-800">Name</th>
                          <th className="px-6 py-4 text-left font-semibold text-gray-800">Position</th>
                          <th className="px-6 py-4 text-left font-semibold text-gray-800">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-gray-700">00785</td>
                          <td className="px-6 py-4 text-gray-700">Dela Cruz, Juan</td>
                          <td className="px-6 py-4 text-gray-700">Truck Driver</td>
                          <td className="px-6 py-4">
                            <button className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
                              Disable
                            </button>
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-gray-700">00784</td>
                          <td className="px-6 py-4 text-gray-700">Torres, Juan Miguel</td>
                          <td className="px-6 py-4 text-gray-700">Delivery Helper</td>
                          <td className="px-6 py-4">
                            <button className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
                              Disable
                            </button>
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-gray-700">00783</td>
                          <td className="px-6 py-4 text-gray-700">Rivera, Paolo Andres</td>
                          <td className="px-6 py-4 text-gray-700">Truck Driver</td>
                          <td className="px-6 py-4">
                            <button className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
                              Disable
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-115">
                  <div className="p-4 border-b border-gray-200">
                    <input 
                      type="text" 
                      placeholder="Search disabled employees..." 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div className="overflow-auto flex-1">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-6 py-4 text-left font-semibold text-gray-800">Employee ID</th>
                          <th className="px-6 py-4 text-left font-semibold text-gray-800">Name</th>
                          <th className="px-6 py-4 text-left font-semibold text-gray-800">Position</th>
                          <th className="px-6 py-4 text-left font-semibold text-gray-800">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-gray-700">00777</td>
                          <td className="px-6 py-4 text-gray-700">Garcia, Maria</td>
                          <td className="px-6 py-4 text-gray-700">Office Clerk</td>
                          <td className="px-6 py-4">
                            <button className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm">
                              Enable
                            </button>
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-gray-700">00776</td>
                          <td className="px-6 py-4 text-gray-700">Lopez, Carlos</td>
                          <td className="px-6 py-4 text-gray-700">Maintenance</td>
                          <td className="px-6 py-4">
                            <button className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm">
                              Enable
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-115">
                  <div className="p-4 border-b border-gray-200">
                    <input 
                      type="text" 
                      placeholder="Search accounts to disable..." 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div className="overflow-auto flex-1">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-6 py-4 text-left font-semibold text-gray-800">Employee ID</th>
                          <th className="px-6 py-4 text-left font-semibold text-gray-800">Name</th>
                          <th className="px-6 py-4 text-left font-semibold text-gray-800">Position</th>
                          <th className="px-6 py-4 text-left font-semibold text-gray-800">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-gray-700">00778</td>
                          <td className="px-6 py-4 text-gray-700">Smith, John</td>
                          <td className="px-6 py-4 text-gray-700">Office Assistant</td>
                          <td className="px-6 py-4">
                            <button className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
                              Disable
                            </button>
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-gray-700">00779</td>
                          <td className="px-6 py-4 text-gray-700">Johnson, Sarah</td>
                          <td className="px-6 py-4 text-gray-700">Data Entry</td>
                          <td className="px-6 py-4">
                            <button className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
                              Disable
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          
          {showModal && (
            <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 border-black-300">
              <div className="bg-white rounded-lg p-6 w-96 border-2 border-gray-300">
                <h3 className="text-lg font-semibold mb-4">Manage Login Credentials</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Employee: {selectedEmployee?.name} ({selectedEmployee?.id})
                </p>
                
                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={credentials.email}
                      onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                    <input
                      type="password"
                      value={credentials.password}
                      onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <input
                      type="password"
                      value={credentials.newPassword}
                      onChange={(e) => setCredentials({...credentials, newPassword: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={credentials.confirmPassword}
                      onChange={(e) => setCredentials({...credentials, confirmPassword: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setCredentials({email: "", password: "", newPassword: "", confirmPassword: ""});
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Update Credentials
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          
        </div>
  );
    
}
export default AdminHome;

