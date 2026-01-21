import React, { useState, useRef } from 'react';
import { supabase } from './supabaseClient';
import emailjs from '@emailjs/browser';

function AdminCreate() {
  const [formData, setFormData] = useState({
    agencyName: '',
    email: '',
    contactPerson: '',
    contactNumber: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');

  // CSV Import States
  const [csvFile, setCsvFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvError, setCsvError] = useState('');
  const [csvResult, setCsvResult] = useState(null);
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [emailProgress, setEmailProgress] = useState({ sent: 0, total: 0 });
  const fileInputRef = useRef(null);

  const requiredColumns = ['agency_name', 'email', 'contact_person', 'contact_number'];

  // Generate a secure random password
  const generatePassword = () => {
    const length = 12;
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '@$!%*?&';
    const allChars = uppercase + lowercase + numbers + special;
    
    let password = '';
    // Ensure at least one of each required character type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Generate password
    const newPassword = generatePassword();
    setGeneratedPassword(newPassword);

    // Show confirmation modal
    setShowConfirmModal(true);
  };

  const handleConfirmRegister = async () => {
    setLoading(true);
    setShowConfirmModal(false);
    setError('');
    setSuccess('');

    try {
      // Create user account in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: generatedPassword,
        options: {
          data: {
            role: 'Agency',
            agency_name: formData.agencyName
          }
        }
      });

      if (authError) {
        // Handle specific error cases
        if (authError.message.includes('User already registered') || 
            authError.message.includes('already been registered') ||
            authError.message.includes('email address is already in use')) {
          throw new Error('This email address is already registered in the system. Please use a different email address.');
        } else if (authError.message.includes('Invalid email')) {
          throw new Error('Please enter a valid email address.');
        } else if (authError.message.includes('Password')) {
          throw new Error('Password must be at least 6 characters long and meet security requirements.');
        } else {
          throw new Error(authError.message);
        }
      }

      // Create profile entry
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: authData.user.id,
          email: formData.email,
          role: 'Agency',
          first_name: formData.contactPerson.split(' ')[0] || '',
          last_name: formData.contactPerson.split(' ').slice(1).join(' ') || '',
          agency_name: formData.agencyName
        }]);

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Continue anyway, as the main account was created
      }

      // Send credentials email via EmailJS
      try {
        await emailjs.send(
          'service_7dbtuyn', // Service ID
          'template_6949qsc', // Template ID
          {
            contact_person: formData.contactPerson,
            agency_name: formData.agencyName,
            email: formData.email,
            password: generatedPassword,
            login_url: window.location.origin + '/employee/login',
            to_email: formData.email
          },
          'TsWcN7KUc6VQo6a5V' // Public Key
        );
        console.log('Credentials email sent successfully');
      } catch (emailError) {
        console.error('Failed to send credentials email:', emailError);
        // Don't fail the whole process if email fails
      }

      setSuccess('Agency account has been successfully created and credentials have been sent to ' + formData.email + '!');
      
      // Reset form
      setFormData({
        agencyName: '',
        email: '',
        contactPerson: '',
        contactNumber: ''
      });
      setGeneratedPassword('');

    } catch (err) {
      setError(err.message || 'Failed to create agency account');
    } finally {
      setLoading(false);
    }
  };

  // Parse CSV file
  const parseCSV = (text) => {
    const lines = text.replace(/\r\n/g, '\n').split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

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
      values.push(current.trim());

      if (values.length === 0 || values.every(v => !v)) continue;

      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }

    return rows;
  };

  // Handle CSV file selection
  const handleCsvFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setCsvError('Please select a CSV file');
      return;
    }

    setCsvError('');
    setCsvFile(file);
    setCsvLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const data = parseCSV(text);
        
        if (data.length === 0) {
          setCsvError('CSV file is empty');
          setCsvLoading(false);
          return;
        }

        const headers = Object.keys(data[0]);
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        
        if (missingColumns.length > 0) {
          setCsvError(`Missing required columns: ${missingColumns.join(', ')}`);
          setCsvLoading(false);
          return;
        }

        // Validate data
        const validationErrors = [];
        data.forEach((row, index) => {
          const rowNum = index + 2;
          
          if (!row.agency_name || !row.agency_name.trim()) validationErrors.push(`Row ${rowNum}: Missing agency_name`);
          if (!row.email || !row.email.trim()) validationErrors.push(`Row ${rowNum}: Missing email`);
          if (!row.contact_person || !row.contact_person.trim()) validationErrors.push(`Row ${rowNum}: Missing contact_person`);
          
          if (row.email && !row.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            validationErrors.push(`Row ${rowNum}: Invalid email format`);
          }
        });

        if (validationErrors.length > 0) {
          setCsvError(validationErrors.slice(0, 5).join('\n') + (validationErrors.length > 5 ? '\n... and more' : ''));
          setCsvLoading(false);
          return;
        }

        setCsvData(data);
        setShowCsvPreview(true);
        setCsvLoading(false);
      } catch (err) {
        setCsvError('Error parsing CSV file: ' + err.message);
        setCsvLoading(false);
      }
    };

    reader.onerror = () => {
      setCsvError('Error reading file');
      setCsvLoading(false);
    };

    reader.readAsText(file);
  };

  // Handle CSV import
  const handleCsvImport = async () => {
    setCsvImporting(true);
    setCsvError('');
    setCsvResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const importResult = {
        success: true,
        created: 0,
        skipped: 0,
        errors: [],
        details: []
      };

      for (let i = 0; i < csvData.length; i++) {
        const agency = csvData[i];
        const rowNum = i + 1;

        try {
          const email = agency.email.toLowerCase().trim();
          const password = generatePassword();

          // Check if user already exists
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('email', email)
            .maybeSingle();

          if (existingProfile) {
            importResult.details.push({
              email: email,
              agency_name: agency.agency_name,
              status: 'Skipped - User already exists'
            });
            importResult.skipped++;
            continue;
          }

          // Create auth user
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
              data: {
                role: 'Agency',
                agency_name: agency.agency_name
              }
            }
          });

          if (authError) {
            if (authError.message.includes('already registered')) {
              importResult.details.push({
                email: email,
                agency_name: agency.agency_name,
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
              role: 'Agency',
              first_name: agency.contact_person.split(' ')[0] || '',
              last_name: agency.contact_person.split(' ').slice(1).join(' ') || '',
              agency_name: agency.agency_name
            });

          if (profileError) {
            console.error('Profile error:', profileError);
          }

          importResult.details.push({
            email: email,
            password: password,
            agency_name: agency.agency_name,
            contact_person: agency.contact_person,
            contact_number: agency.contact_number || '',
            status: 'Created successfully'
          });
          importResult.created++;

        } catch (error) {
          importResult.errors.push({
            row: rowNum,
            email: agency.email || 'unknown',
            error: error.message
          });
          importResult.skipped++;
        }
      }

      setCsvResult(importResult);
      setShowCsvPreview(false);
      setCsvFile(null);
      setCsvData([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Send emails
      if (importResult.details && importResult.details.length > 0) {
        const createdAccounts = importResult.details.filter(d => d.password && d.status.includes('Created'));
        if (createdAccounts.length > 0) {
          await sendCredentialsEmails(createdAccounts);
        }
      }
    } catch (err) {
      setCsvError(err.message || 'Failed to import agencies');
    } finally {
      setCsvImporting(false);
    }
  };

  // Send credentials via EmailJS
  const sendCredentialsEmails = async (accounts) => {
    setSendingEmails(true);
    setEmailProgress({ sent: 0, total: accounts.length });

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      try {
        await emailjs.send(
          'service_7dbtuyn',
          'template_6949qsc',
          {
            contact_person: account.contact_person,
            agency_name: account.agency_name,
            email: account.email,
            password: account.password,
            login_url: window.location.origin + '/employee/login',
            to_email: account.email
          },
          'TsWcN7KUc6VQo6a5V'
        );
        setEmailProgress({ sent: i + 1, total: accounts.length });
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (emailError) {
        console.error(`Failed to send email to ${account.email}:`, emailError);
      }
    }

    setSendingEmails(false);
  };

  // Download CSV template
  const downloadTemplate = () => {
    const headers = requiredColumns.join(',');
    const example = 'ABC Agency,agency@example.com,John Doe,09171234567';
    const csv = `${headers}\n${example}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agency_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Download results
  const downloadResults = () => {
    if (!csvResult || !csvResult.details) return;

    const headers = 'Email,Agency Name,Password,Status';
    const rows = csvResult.details.map(d => `${d.email},${d.agency_name},${d.password || 'N/A'},${d.status}`).join('\n');
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agency_import_results_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="py-6 flex flex-col items-center">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-800">Register New Agency</h1>
        <p className="text-gray-600 mt-2">Create a new agency account in the system</p>
      </div>

      {/* CSV Import Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-6xl w-full mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">CSV Import</h2>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-blue-800 mb-2">📋 Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-900">
            <li>Download the CSV template below</li>
            <li>Fill in agency data with columns: agency_name, email, contact_person, contact_number</li>
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

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select CSV File
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCsvFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
          />
        </div>

        {csvLoading && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            <p className="text-gray-600 mt-2">Processing CSV...</p>
          </div>
        )}

        {csvError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 whitespace-pre-line">
            {csvError}
          </div>
        )}

        {/* CSV Preview */}
        {showCsvPreview && csvData.length > 0 && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Preview ({csvData.length} agencies)
              </h3>
              <button
                onClick={handleCsvImport}
                disabled={csvImporting}
                className="px-6 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {csvImporting ? 'Importing...' : 'Confirm Import'}
              </button>
            </div>

            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Agency Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contact Person</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contact Number</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {csvData.slice(0, 10).map((row, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 text-sm text-gray-900">{row.agency_name}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{row.email}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{row.contact_person}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{row.contact_number || '-'}</td>
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

        {/* CSV Results */}
        {csvResult && (
          <div className="mt-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-green-800 mb-2">✅ Import Complete</h3>
              <div className="text-sm text-green-900 space-y-1">
                <p>✓ Successfully created: {csvResult.created} accounts</p>
                <p>⊘ Skipped: {csvResult.skipped} entries</p>
                {csvResult.errors.length > 0 && (
                  <p className="text-red-700">✗ Errors: {csvResult.errors.length}</p>
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

            {csvResult.details.length > 0 && (
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
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Agency Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Password</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {csvResult.details.map((detail, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 text-sm text-gray-900">{detail.agency_name}</td>
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

            {csvResult.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2">Errors</h4>
                <div className="text-sm text-red-900 space-y-1 max-h-48 overflow-y-auto">
                  {csvResult.errors.map((err, index) => (
                    <p key={index}>Row {err.row} ({err.email}): {err.error}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Registration Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-6xl w-full">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Manual Registration</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Agency Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Agency Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agency Name *
                </label>
                <input
                  type="text"
                  name="agencyName"
                  value={formData.agencyName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                  placeholder="Enter agency name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Person *
                </label>
                <input
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                  placeholder="Enter contact person name"
                />
              </div>
            </div>
          </div>

          {/* Account Credentials */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Account Credentials</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Number
                </label>
                <input
                  type="tel"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                  placeholder="Enter contact number"
                />
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-4 bg-blue-50 p-3 rounded-md border border-blue-200">
              <strong>Note:</strong> A secure password will be automatically generated and sent to the agency's email address.
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              {success}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Register Agency'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border-2 border-black p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Confirm Agency Registration</h3>
            <div className="space-y-3 mb-6">
              <p className="text-gray-600">
                Are you sure you want to register <strong>{formData.agencyName}</strong> with email <strong>{formData.email}</strong>?
              </p>
              <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                <p className="text-sm text-gray-700 mb-1"><strong>Generated Password:</strong></p>
                <p className="text-sm font-mono bg-white p-2 rounded border border-gray-300 break-all">{generatedPassword}</p>
                <p className="text-xs text-gray-500 mt-2">
                  This password will be sent to the agency's email address.
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRegister}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Confirm Register'}
              </button>
            </div>
          </div>
        </div>
      )}
    
    </div>
  );
}

export default AdminCreate;