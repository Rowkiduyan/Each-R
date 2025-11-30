import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function AdminHome() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeAccounts: 0,
    disabledAccounts: 0,
    adminUsers: 0,
    hrAccounts: 0,
    agencyAccounts: 0
  });
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    fetchStatistics();
    fetchEmployees();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);

      // Get role counts (admin from profiles)
      const { data: roleCounts, error: roleError } = await supabase
        .rpc('get_role_counts');
      
      if (roleError) throw roleError;

      // Get total employees from employees table only
      const { count: employeeCount, error: empError } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true });
      
      if (empError) throw empError;

      console.log('Role counts data:', roleCounts);
      console.log('Employee count:', employeeCount);
      
      const adminCount = roleCounts?.[0]?.admin_count || 0;
      const hrCount = roleCounts?.[0]?.hr_count || 0;
      const totalEmployees = employeeCount || 0;
      
      // Get Agency count from profiles
      const { data: agencyProfiles, count: agencyCount, error: agencyError } = await supabase
        .from('profiles')
        .select('id, email, role', { count: 'exact' })
        .ilike('role', 'Agency');
      
      if (agencyError) {
        console.error('Error counting agencies:', agencyError);
      }
      
      console.log('Agency profiles found:', agencyProfiles);
      console.log('Agency count:', agencyCount);
      
      // Active accounts = employees from employees table
      const activeAccounts = totalEmployees;

      setStats({
        totalEmployees,
        activeAccounts, 
        disabledAccounts: 0, // Set to 0 for now since we don't have disabled account info
        adminUsers: adminCount,
        hrAccounts: hrCount,
        agencyAccounts: agencyCount || 0
      });

    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, fname, lname, position')
        .limit(10); // Limit to 10 records for display

      if (error) throw error;

      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  return (
    <div className="py-6">
        {/* Welcome Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Welcome Admin!</h1>
          <p className="text-gray-600 mt-2">Manage your system overview and statistics</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Total Employees Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-4.5a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? "..." : stats.totalEmployees}
                </p>
              </div>
            </div>
          </div>

          {/* Active Accounts Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Accounts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? "..." : stats.activeAccounts}
                </p>
              </div>
            </div>
          </div>

          {/* Disabled Accounts Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 text-red-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Disabled Accounts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? "..." : stats.disabledAccounts}
                </p>
              </div>
            </div>
          </div>

          {/* Admin Users Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Admin Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? "..." : stats.adminUsers}
                </p>
              </div>
            </div>
          </div>

          {/* HR Accounts Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">HR Accounts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? "..." : stats.hrAccounts}
                </p>
              </div>
            </div>
          </div>

          {/* Agency Accounts Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Agency Accounts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? "..." : stats.agencyAccounts}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Employee Overview Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Employee Overview</h3>
            <p className="text-sm text-gray-600 mt-1">Recent employee records</p>
          </div>
          <div className="overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-left font-semibold text-gray-800">Employee ID</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-800">Name</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-800">Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {employees.map((employee, index) => (
                  <tr key={employee.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-700">{employee.id}</td>
                    <td className="px-6 py-4 text-gray-700">{employee.fname} {employee.lname}</td>
                    <td className="px-6 py-4 text-gray-700">{employee.position}</td>
                  </tr>
                ))}
                {employees.length === 0 && !loading && (
                  <tr>
                    <td colSpan="3" className="px-6 py-4 text-center text-gray-500">
                      No employees found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}export default AdminHome;

