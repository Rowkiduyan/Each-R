import React, { useState, useRef, useEffect } from 'react';
import { supabase } from './supabaseClient';
import emailjs from '@emailjs/browser';

function AdminImportEmployees() {
  const [csvFile, setCsvFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [emailProgress, setEmailProgress] = useState({ sent: 0, total: 0 });
  const fileInputRef = useRef(null);

  // Initialize EmailJS
  useEffect(() => {
    emailjs.init('kI-Qln13uhklvNQOH');
  }, []);

  const requiredColumns = ['email', 'fname', 'lname', 'mname', 'contact_number', 'position', 'depot', 'role', 'department', 'source', 'status', 'personal_email'];
  const optionalColumns = [];
  const allowedRoles = ['Employee', 'HR', 'HRC', 'Admin'];
  const allowedSources = ['Internal', 'Agency'];
  const allowedStatuses = ['Regular', 'Probationary'];

  // Parse CSV file
  const parseCSV = (text) => {
    // Handle both \r\n (Windows) and \n (Unix) line endings
    const lines = text.replace(/\r\n/g, '\n').split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    // Parse header row
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parsing (handles basic quoted fields)
      const values = [];
      let current = '';
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim()); // Push last value

      if (values.length === 0 || values.every(v => !v)) continue;

      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }

    return rows;
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setError('');
    setCsvFile(file);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const data = parseCSV(text);
        
        // Validate headers
        if (data.length === 0) {
          setError('CSV file is empty');
          setLoading(false);
          return;
        }

        const headers = Object.keys(data[0]);
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        
        if (missingColumns.length > 0) {
          setError(`Missing required columns: ${missingColumns.join(', ')}`);
          setLoading(false);
          return;
        }

        // Validate data
        const validationErrors = [];
        data.forEach((row, index) => {
          const rowNum = index + 2; // +2 because index is 0-based and we skip header row
          
          // Check only critical required fields (some can be empty)
          if (!row.email || row.email.trim() === '') {
            validationErrors.push(`Row ${rowNum}: Missing email`);
          }
          if (!row.fname || row.fname.trim() === '') {
            validationErrors.push(`Row ${rowNum}: Missing fname`);
          }
          if (!row.lname || row.lname.trim() === '') {
            validationErrors.push(`Row ${rowNum}: Missing lname`);
          }
          if (!row.position || row.position.trim() === '') {
            validationErrors.push(`Row ${rowNum}: Missing position`);
          }
          if (!row.depot || row.depot.trim() === '') {
            validationErrors.push(`Row ${rowNum}: Missing depot`);
          }
          if (!row.role || row.role.trim() === '') {
            validationErrors.push(`Row ${rowNum}: Missing role`);
          }

          // Validate email format
          if (row.email && !row.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            validationErrors.push(`Row ${rowNum}: Invalid email format`);
          }

          // Validate role
          if (row.role && !allowedRoles.includes(row.role)) {
            validationErrors.push(`Row ${rowNum}: Invalid role. Must be one of: ${allowedRoles.join(', ')}`);
          }

          // Validate source
          if (row.source && !allowedSources.includes(row.source)) {
            validationErrors.push(`Row ${rowNum}: Invalid source. Must be one of: ${allowedSources.join(', ')}`);
          }

          // Validate status
          if (row.status && !allowedStatuses.includes(row.status)) {
            validationErrors.push(`Row ${rowNum}: Invalid status. Must be one of: ${allowedStatuses.join(', ')}`);
          }
        });

        if (validationErrors.length > 0) {
          setError(validationErrors.slice(0, 5).join('\n') + (validationErrors.length > 5 ? '\n... and more' : ''));
          setLoading(false);
          return;
        }

        setCsvData(data);
        setShowPreview(true);
        setLoading(false);
      } catch (err) {
        setError('Error parsing CSV file: ' + err.message);
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError('Error reading file');
      setLoading(false);
    };

    reader.readAsText(file);
  };

  // Handle import
  const handleImport = async () => {
    setImporting(true);
    setError('');
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Process employees locally
      const importResult = {
        success: true,
        created: 0,
        skipped: 0,
        errors: [],
        details: []
      };

      for (let i = 0; i < csvData.length; i++) {
        const emp = csvData[i];
        const rowNum = i + 1;

        try {
          const email = emp.email.toLowerCase().trim();

          // Check if user already exists in employees table
          const { data: existingEmp } = await supabase
            .from('employees')
            .select('email')
            .eq('email', email)
            .maybeSingle();

          if (existingEmp) {
            importResult.details.push({
              email: email,
              status: 'Skipped - User already exists'
            });
            importResult.skipped++;
            continue;
          }

          // Generate password
          const password = generatePassword();

          // Create auth user
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
              emailRedirectTo: window.location.origin + '/employee/login',
              data: {
                role: emp.role,
                full_name: `${emp.fname} ${emp.lname}`
              }
            }
          });

          if (authError) {
            if (authError.message.includes('already registered')) {
              importResult.details.push({
                email: email,
                status: 'Skipped - User already exists'
              });
              importResult.skipped++;
            } else {
              importResult.errors.push({
                row: rowNum,
                email: email,
                error: authError.message
              });
              importResult.skipped++;
            }
            continue;
          }

          if (!authData.user) {
            importResult.errors.push({
              row: rowNum,
              email: email,
              error: 'Failed to create user'
            });
            importResult.skipped++;
            continue;
          }

          // Create profile
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              email: email,
              role: emp.role,
              first_name: emp.fname,
              last_name: emp.lname
            });

          // Create employee record
          const { error: employeeError } = await supabase
            .from('employees')
            .insert({
              email: email,
              fname: emp.fname,
              lname: emp.lname,
              mname: emp.mname || '',
              contact_number: emp.contact_number || '',
              position: emp.position,
              depot: emp.depot,
              role: emp.role,
              department: emp.department || '',
              source: emp.source || 'Internal',
              status: emp.status || 'Active',
              personal_email: emp.personal_email || ''
            });

          if (employeeError) {
            console.error('Employee error:', employeeError);
            importResult.errors.push({
              row: rowNum,
              email: email,
              error: `Employee record error: ${employeeError.message}`
            });
            importResult.skipped++;
            continue;
          }

          importResult.details.push({
            email: email,
            password: password,
            status: 'Created successfully'
          });
          importResult.created++;

        } catch (error) {
          importResult.errors.push({
            row: rowNum,
            email: emp.email || 'unknown',
            error: error.message
          });
          importResult.skipped++;
        }
      }

      setResult(importResult);
      setShowPreview(false);
      setCsvFile(null);
      setCsvData([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Automatically send emails to successfully created accounts
      if (importResult.details && importResult.details.length > 0) {
        const createdAccounts = importResult.details.filter(d => d.password && d.status.includes('Created'));
        if (createdAccounts.length > 0) {
          await sendCredentialsEmails(createdAccounts);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to import employees');
    } finally {
      setImporting(false);
    }
  };

  // Generate secure password
  const generatePassword = () => {
    const length = 12;
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '@$!%*?&';
    const allChars = uppercase + lowercase + numbers + special;
    
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  // Send credentials via EmailJS
  const sendCredentialsEmails = async (accounts) => {
    setSendingEmails(true);
    setEmailProgress({ sent: 0, total: accounts.length });

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      try {
        // Get employee data from database
        const { data: employeeData } = await supabase
          .from('employees')
          .select('fname, lname, position, depot, personal_email')
          .eq('email', account.email)
          .maybeSingle();
        
        if (!employeeData || !employeeData.personal_email) {
          console.error(`No personal email found for ${account.email}`);
          setEmailProgress({ sent: i + 1, total: accounts.length });
          continue;
        }
        
        await emailjs.send(
          'service_1mdfp37', // Service ID
          'template_k8bt6ed', // New Employee Template ID
          {
            to_name: `${employeeData.fname} ${employeeData.lname}`,
            to_email: employeeData.personal_email, // Send to personal email from database
            email: account.email, // Work email for login
            password: account.password,
            login_url: window.location.origin + '/employee/login',
            position: employeeData.position || '',
            depot: employeeData.depot || ''
          },
          'kI-Qln13uhklvNQOH' // Public Key
        );
        setEmailProgress({ sent: i + 1, total: accounts.length });
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (emailError) {
        console.error(`Failed to send email to ${account.email}:`, emailError);
        // Continue sending to others even if one fails
      }
    }

    setSendingEmails(false);
  };

  // Download template
  const downloadTemplate = () => {
    const headers = requiredColumns.join(',');
    const example = 'john.doe@roadwise.com,John,Doe,Smith,09171234567,Driver,Manila,Employee,Operations,Internal,Regular,john.doe@gmail.com';
    const csv = `${headers}\n${example}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Download results with passwords
  const downloadResults = () => {
    if (!result || !result.details) return;

    const headers = 'Email,Password,Status';
    const rows = result.details.map(d => `${d.email},${d.password || 'N/A'},${d.status}`).join('\n');
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import_results_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="py-6 flex flex-col items-center">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-800">Import Employees from CSV</h1>
        <p className="text-gray-600 mt-2">Bulk create employee accounts from a CSV file</p>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 max-w-4xl w-full">
        <h3 className="font-semibold text-blue-800 mb-2">📋 Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-900">
          <li>Download the CSV template below</li>
          <li>Fill in employee data in this exact order: email, fname, lname, mname, contact_number, position, depot, role, department, source, status, personal_email</li>
          <li>Valid roles: {allowedRoles.join(', ')}</li>
          <li>Valid sources: {allowedSources.join(', ')}</li>
          <li>Valid statuses: {allowedStatuses.join(', ')}</li>
          <li>Upload the completed CSV file</li>
          <li>Review the preview and confirm import</li>
          <li>Download the results file containing generated passwords</li>
        </ol>
        <button
          onClick={downloadTemplate}
          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          📥 Download CSV Template
        </button>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-4xl w-full">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select CSV File
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
          />
        </div>

        {loading && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            <p className="text-gray-600 mt-2">Processing CSV...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 whitespace-pre-line">
            {error}
          </div>
        )}

        {/* Preview */}
        {showPreview && csvData.length > 0 && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Preview ({csvData.length} employees)
              </h3>
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-6 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? 'Importing...' : 'Confirm Import'}
              </button>
            </div>

            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">First Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Depot</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {csvData.slice(0, 10).map((row, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 text-sm text-gray-900">{row.email}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{row.fname}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{row.lname}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{row.position}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{row.depot}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            row.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                            row.role === 'HR' || row.role === 'HRC' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {row.role}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            row.source === 'Agency' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {row.source || 'Internal'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            row.status === 'Regular' ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {row.status || 'Regular'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {csvData.length > 10 && (
                <div className="px-3 py-2 bg-gray-50 text-sm text-gray-500 text-center">
                  ... and {csvData.length - 10} more rows
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mt-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-green-800 mb-2">✅ Import Complete</h3>
              <div className="text-sm text-green-900 space-y-1">
                <p>✓ Successfully created: {result.created} accounts</p>
                <p>⊘ Skipped: {result.skipped} entries</p>
                {result.errors.length > 0 && (
                  <p className="text-red-700">✗ Errors: {result.errors.length}</p>
                )}
              </div>
            </div>

            {sendingEmails && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <div>
                    <h3 className="font-semibold text-blue-800">Sending Credentials via Email...</h3>
                    <p className="text-sm text-blue-900">
                      Sent {emailProgress.sent} of {emailProgress.total} emails
                    </p>
                  </div>
                </div>
              </div>
            )}

            {result.details.length > 0 && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-gray-800">Created Accounts</h4>
                  <button
                    onClick={downloadResults}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    📥 Download Credentials
                  </button>
                </div>
                <div className="border border-gray-300 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Password</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {result.details.map((detail, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 text-sm text-gray-900">{detail.email}</td>
                          <td className="px-3 py-2 text-sm font-mono text-gray-900">{detail.password || 'N/A'}</td>
                          <td className="px-3 py-2 text-sm">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              detail.status.includes('Created') ? 'bg-green-100 text-green-800' :
                              detail.status.includes('Skipped') ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {detail.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2">Errors</h4>
                <div className="text-sm text-red-900 space-y-1 max-h-48 overflow-y-auto">
                  {result.errors.map((err, index) => (
                    <p key={index}>Row {err.row} ({err.email}): {err.error}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6 max-w-4xl w-full">
        <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Important Notes:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-yellow-900">
          <li>Secure passwords will be auto-generated for each account</li>
          <li>Credentials will be automatically sent to each employee's email</li>
          <li>Download and securely store the credentials file as backup</li>
          <li>Existing users (by email) will be skipped</li>
          <li>This operation cannot be undone</li>
        </ul>
      </div>
    </div>
  );
}

export default AdminImportEmployees;
