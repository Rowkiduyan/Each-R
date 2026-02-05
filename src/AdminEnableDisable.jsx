import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { getStoredJson } from './authStorage';
import emailjs from '@emailjs/browser';

function AdminEnableDisable() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [actionType, setActionType] = useState(''); // 'enable' or 'disable'
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordAccount, setResetPasswordAccount] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      
      // Get all profiles with their account status
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role, depot, account_disabled, disabled_at, disabled_by')
        .order('email');

      if (profilesError) throw profilesError;

      // Get employees data for additional info
      const { data: employeesData, error: empError } = await supabase
        .from('employees')
        .select('id, email, fname, lname, position, depot');

      if (empError) throw empError;

      // Get ALL employee_separations (not just terminated) to check the data
      // Note: May need RLS policy adjustment if this returns empty
      const { data: allSeparationsData, error: allSepError } = await supabase
        .from('employee_separations')
        .select('id, employee_id, is_terminated, terminated_at, status');

      if (allSepError) {
        console.error('Error fetching separations:', allSepError);
      }

      console.log('ALL Separations (including non-terminated):', allSeparationsData);

      // Filter terminated in JavaScript instead of SQL to handle different data types
      const separationsData = (allSeparationsData || []).filter(sep => {
        // Handle boolean true, string "true", or number 1
        return sep.is_terminated === true || 
               sep.is_terminated === 'true' || 
               sep.is_terminated === 1 ||
               sep.is_terminated === '1';
      });

      console.log('Filtered terminated separations:', separationsData);
      console.log('Employees data:', employeesData);

      // Create a map of employees by email
      const employeeMap = {};
      const employeeIdMap = {};
      (employeesData || []).forEach(emp => {
        employeeMap[emp.email] = emp;
        employeeIdMap[emp.id] = emp;
      });

      // Create a map of profiles by email
      const profileMap = {};
      (profilesData || []).forEach(profile => {
        profileMap[profile.email] = profile;
      });

      // Create a map of terminated employees by employee_id
      const terminatedMap = {};
      (separationsData || []).forEach(sep => {
        terminatedMap[sep.employee_id] = {
          is_terminated: sep.is_terminated,
          terminated_at: sep.terminated_at
        };
      });

      console.log('Terminated map:', terminatedMap);
      console.log('Employee ID map:', employeeIdMap);

      const accountsSet = new Map();

      // Add all profiles
      (profilesData || []).forEach(profile => {
        const employee = employeeMap[profile.email];
        const terminated = employee ? terminatedMap[employee.id] : null;
        
        // For Admin, HR, HRC, Agency: use depot from profiles table
        // For Employee: use depot from employees table
        const isNonEmployeeRole = ['Admin', 'HR', 'HRC', 'Agency'].includes(profile.role);
        const depot = isNonEmployeeRole ? (profile.depot || 'N/A') : (employee?.depot || 'N/A');
        
        accountsSet.set(profile.email, {
          id: profile.id,
          email: profile.email,
          first_name: profile.first_name || employee?.fname || 'N/A',
          last_name: profile.last_name || employee?.lname || 'N/A',
          role: profile.role,
          position: employee?.position || 'N/A',
          depot: depot,
          account_disabled: profile.account_disabled || false,
          disabled_at: profile.disabled_at,
          disabled_by: profile.disabled_by,
          is_terminated: terminated?.is_terminated || false,
          terminated_at: terminated?.terminated_at
        });
      });

      console.log('Accounts after profiles:', Array.from(accountsSet.values()));

      // Add terminated employees that might not have profiles
      (separationsData || []).forEach(sep => {
        const empData = employeeIdMap[sep.employee_id];
        console.log('Processing separation:', sep, 'Employee data:', empData);
        
        if (empData) {
          // Update existing account or add new one
          const existingAccount = accountsSet.get(empData.email);
          if (existingAccount) {
            // Update existing account with termination info
            existingAccount.is_terminated = sep.is_terminated;
            existingAccount.terminated_at = sep.terminated_at;
          } else {
            // Add new account for terminated employee without profile
            const profile = profileMap[empData.email];
            accountsSet.set(empData.email, {
              id: profile?.id || empData.id,
              email: empData.email,
              first_name: profile?.first_name || empData.fname || 'N/A',
              last_name: profile?.last_name || empData.lname || 'N/A',
              role: profile?.role || 'Employee',
              position: empData.position || 'N/A',
              depot: empData.depot || 'N/A',
              account_disabled: profile?.account_disabled || false,
              disabled_at: profile?.disabled_at,
              disabled_by: profile?.disabled_by,
              is_terminated: sep.is_terminated || false,
              terminated_at: sep.terminated_at
            });
          }
        }
      });

      console.log('Final accounts:', Array.from(accountsSet.values()));

      const combinedAccounts = Array.from(accountsSet.values()).sort((a, b) => {
        const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
        const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      });

      setAccounts(combinedAccounts);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAccount = (account, action) => {
    setSelectedAccount(account);
    setActionType(action);
    setShowConfirmModal(true);
  };

  const handleResetPassword = (account) => {
    setResetPasswordAccount(account);
    setNewPassword('');
    setConfirmPassword('');
    setShowResetPasswordModal(true);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
    setConfirmPassword(password);
  };

  const confirmResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      alert('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    try {
      setResetPasswordLoading(true);

      // Initialize userData
      let userData = {
        email: resetPasswordAccount.email,
        fname: resetPasswordAccount.first_name,
        lname: resetPasswordAccount.last_name,
        position: resetPasswordAccount.position || resetPasswordAccount.role,
        emailToNotify: resetPasswordAccount.email
      };

      if (resetPasswordAccount.role === 'Employee') {
        // Get employee-specific data from employees table
        const { data: empData } = await supabase
          .from('employees')
          .select('id, email, fname, lname, position')
          .eq('email', resetPasswordAccount.email)
          .maybeSingle();

        if (empData) {
          userData.fname = empData.fname || userData.fname;
          userData.lname = empData.lname || userData.lname;
          userData.position = empData.position || userData.position;
          userData.emailToNotify = empData.email || userData.emailToNotify;
        }
      }

      console.log('Final userData:', userData);

      // Call edge function to reset password using work email
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: {
          email: userData.email, // Work email
          new_password: newPassword
        }
      });

      if (error) {
        console.error('Password reset error:', error);
        alert('Failed to reset password: ' + (error.message || 'Unknown error'));
        setResetPasswordLoading(false);
        return;
      }

      // Send email using Email.js
      try {
        await emailjs.send(
          'service_ig5n2rj', // Service ID
          'template_gyptu3p', // Template ID
          {
            to_email: userData.emailToNotify,
            to_name: `${userData.fname} ${userData.lname}`,
            employee_name: `${userData.fname} ${userData.lname}`,
            work_email: userData.email,
            position: userData.position || resetPasswordAccount.role,
            new_password: newPassword,
            reset_date: new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })
          },
          'oHk27FGa4-HFKIfdX' // Public Key
        );

        setSuccessMessage(
          `Password reset successfully for ${resetPasswordAccount.first_name} ${resetPasswordAccount.last_name}. ` +
          `Email sent to ${userData.emailToNotify}`
        );
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        setSuccessMessage(
          `Password reset successfully for ${resetPasswordAccount.first_name} ${resetPasswordAccount.last_name}. ` +
          `However, failed to send email. Temporary password: ${newPassword} (send this to ${userData.emailToNotify})`
        );
      }

      setShowSuccessModal(true);
      setShowResetPasswordModal(false);
      setResetPasswordAccount(null);
      setNewPassword('');
      setConfirmPassword('');
      setResetPasswordLoading(false);
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Failed to reset password. Please try again.');
      setResetPasswordLoading(false);
    }
  };

  const confirmToggleAccount = async () => {
    try {
      const isDisabling = actionType === 'disable';
      
      // Get current admin user
      const adminUser = getStoredJson("loggedInHR");

      // Update account status in profiles table
      const updateData = {
        account_disabled: isDisabling,
        disabled_at: isDisabling ? new Date().toISOString() : null,
        disabled_by: isDisabling ? adminUser?.id : null
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', selectedAccount.id);

      if (error) throw error;

      // If enabling account and user was terminated, also update employee_separations
      if (!isDisabling && selectedAccount.is_terminated) {
        // Find employee record by email
        const { data: empData } = await supabase
          .from('employees')
          .select('id')
          .eq('email', selectedAccount.email)
          .maybeSingle();

        if (empData) {
          // Update separation record to un-terminate
          const { error: sepError } = await supabase
            .from('employee_separations')
            .update({ 
              is_terminated: false,
              terminated_at: null
            })
            .eq('employee_id', empData.id);

          if (sepError) {
            console.error('Error updating separation status:', sepError);
          }
        }
      }

      // Refresh the accounts list
      await fetchAccounts();
      
      // Show success message
      setSuccessMessage(
        isDisabling 
          ? `Account for ${selectedAccount.first_name} ${selectedAccount.last_name} has been disabled successfully.`
          : `Account for ${selectedAccount.first_name} ${selectedAccount.last_name} has been enabled successfully.`
      );
      setShowSuccessModal(true);
      
      setShowConfirmModal(false);
      setSelectedAccount(null);
      setActionType('');
    } catch (error) {
      console.error('Error toggling account:', error);
      alert('Failed to update account status. Please try again.');
    }
  };

  // Filter accounts based on search and filters
  const filteredAccounts = accounts.filter(account => {
    const email = account.email || '';
    const fullName = `${account.first_name || ''} ${account.last_name || ''}`;
    const position = account.position || '';
    
    const matchesSearch = 
      email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      position.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = filterRole === 'all' || account.role === filterRole;
    const isInactive = account.account_disabled || account.is_terminated;
    const matchesStatus = 
      filterStatus === 'all' || 
      (filterStatus === 'active' && !isInactive) ||
      (filterStatus === 'disabled' && isInactive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getStatusBadge = (isDisabled, isTerminated) => {
    if (isTerminated) {
      return (
        <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
          Terminated
        </span>
      );
    }
    if (isDisabled) {
      return (
        <span className="px-3 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
          Disabled
        </span>
      );
    }
    return (
      <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
        Active
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const colors = {
      Admin: 'bg-purple-100 text-purple-800',
      HR: 'bg-blue-100 text-blue-800',
      HRC: 'bg-indigo-100 text-indigo-800',
      Employee: 'bg-gray-100 text-gray-800',
      Agency: 'bg-orange-100 text-orange-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${colors[role] || 'bg-gray-100 text-gray-800'}`}>
        {role}
      </span>
    );
  };

  if (loading) {
    return <div className="py-6 text-center">Loading accounts...</div>;
  }

  return (
    <div className="py-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Total Accounts</div>
          <div className="text-2xl font-bold text-gray-800">{accounts.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Active Accounts</div>
          <div className="text-2xl font-bold text-green-600">
            {accounts.filter(a => !a.account_disabled && !a.is_terminated).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Inactive Accounts</div>
          <div className="text-2xl font-bold text-red-600">
            {accounts.filter(a => a.account_disabled || a.is_terminated).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Total Employees</div>
          <div className="text-2xl font-bold text-blue-600">
            {accounts.filter(a => a.role === 'Employee').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Total Agencies</div>
          <div className="text-2xl font-bold text-orange-600">
            {accounts.filter(a => a.role === 'Agency').length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by name, email, or position..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter by Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Role</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="HR">HR</option>
              <option value="HRC">HRC</option>
              <option value="Employee">Employee</option>
              <option value="Agency">Agency</option>
              <option value="Applicant">Applicant</option>
            </select>
          </div>

          {/* Filter by Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="disabled">Inactive (Disabled/Terminated)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Position
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Depot
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Password
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAccounts.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                  No accounts found
                </td>
              </tr>
            ) : (
              filteredAccounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {account.first_name} {account.last_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{account.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(account.role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {account.position !== 'N/A' ? account.position : 'None'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {account.depot !== 'N/A' ? account.depot : 'None'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      {getStatusBadge(account.account_disabled, account.is_terminated)}
                      {account.disabled_at && !account.is_terminated && (
                        <div className="text-xs text-gray-500">
                          Disabled: {new Date(account.disabled_at).toLocaleDateString()}
                        </div>
                      )}
                      {account.terminated_at && (
                        <div className="text-xs text-gray-500">
                          Terminated: {new Date(account.terminated_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {account.role === 'Admin' ? (
                      <span className="text-gray-400 italic">Cannot modify</span>
                    ) : account.account_disabled || account.is_terminated ? (
                      <button
                        onClick={() => handleToggleAccount(account, 'enable')}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                      >
                        Enable Account
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleAccount(account, 'disable')}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      >
                        Disable Account
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {(account.role === 'Employee' || account.role === 'HR' || account.role === 'HRC' || account.role === 'Agency') && (
                      <button
                        onClick={() => handleResetPassword(account)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Reset Password
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-black max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {actionType === 'disable' ? 'Disable Account?' : 'Enable Account?'}
            </h3>
            <p className="text-gray-600 mb-2">
              {actionType === 'disable' 
                ? `Are you sure you want to disable the account for ${selectedAccount?.first_name} ${selectedAccount?.last_name}? This user will no longer be able to log in.`
                : `Are you sure you want to enable the account for ${selectedAccount?.first_name} ${selectedAccount?.last_name}? This user will be able to log in again.`
              }
            </p>
            <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
              <div><strong>Email:</strong> {selectedAccount?.email}</div>
              <div><strong>Role:</strong> {selectedAccount?.role}</div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedAccount(null);
                  setActionType('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmToggleAccount}
                className={`px-4 py-2 rounded-md text-white ${
                  actionType === 'disable' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {actionType === 'disable' ? 'Disable Account' : 'Enable Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-black max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Reset Password</h3>
            <p className="text-gray-600 mb-4">
              Set new password for {resetPasswordAccount?.first_name} {resetPasswordAccount?.last_name}
            </p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password (min 8 characters)
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="text"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <button
                onClick={generateRandomPassword}
                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md border border-gray-300 flex items-center justify-center gap-2"
              >
                🎲 Generate Random Password
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setResetPasswordAccount(null);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md border border-gray-300"
                disabled={resetPasswordLoading}
              >
                Cancel
              </button>
              <button
                onClick={confirmResetPassword}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
                disabled={resetPasswordLoading}
              >
                {resetPasswordLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-black max-w-md w-full mx-4 p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Success!</h3>
            </div>
            <p className="text-gray-600 mb-6 ml-16">{successMessage}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminEnableDisable;
