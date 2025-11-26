import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function ManageAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      
      // Get employees from employees table
      const { data: employeesData, error: empError } = await supabase
        .from('employees')
        .select('id, email, fname, lname, position');

      if (empError) throw empError;

      // Get HR users from profiles table
      const { data: hrData, error: hrError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role')
        .eq('role', 'HR');

      if (hrError) throw hrError;

      // Combine both datasets
      const combinedAccounts = [
        // Map employees
        ...(employeesData || []).map(emp => ({
          id: emp.id,
          email: emp.email,
          first_name: emp.fname,
          last_name: emp.lname,
          role: 'Employee',
          source: 'employees'
        })),
        // Map HR users
        ...(hrData || []).map(hr => ({
          id: hr.id,
          email: hr.email,
          first_name: hr.first_name,
          last_name: hr.last_name,
          role: hr.role,
          source: 'profiles'
        }))
      ];

      setAccounts(combinedAccounts);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (account, role) => {
    setSelectedAccount(account);
    setNewRole(role);
    setShowConfirmModal(true);
  };

  const confirmRoleChange = async () => {
    try {
      // Update role in profiles table
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('email', selectedAccount.email);

      if (error) throw error;

      // Refresh the accounts list
      fetchAccounts();
      setShowConfirmModal(false);
      setSelectedAccount(null);
      setNewRole('');
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  if (loading) {
    return <div className="py-6 text-center">Loading accounts...</div>;
  }

  return (
    <div className="py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Manage Accounts</h1>
        <p className="text-gray-600 mt-2">Manage user roles and access levels</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Email</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Name</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Current Role</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Change Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {accounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-700">{account.email}</td>
                  <td className="px-6 py-4 text-gray-700">
                    {account.first_name && account.last_name 
                      ? `${account.first_name} ${account.last_name}` 
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      account.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                      account.role === 'HR' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {account.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={account.role}
                      onChange={(e) => handleRoleChange(account, e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                    >
                      <option value="Employee">Employee</option>
                      <option value="HR">HR</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                    No accounts found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Role Change</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to change <strong>{selectedAccount?.email}</strong> from{' '}
              <strong>{selectedAccount?.role}</strong> to <strong>{newRole}</strong>?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={confirmRoleChange}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageAccounts;