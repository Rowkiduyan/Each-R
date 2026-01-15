import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import emailjs from '@emailjs/browser';

function AdminCreate() {
  const [formData, setFormData] = useState({
    agencyName: '',
    email: '',
    contactPerson: '',
    contactNumber: '',
    address: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');

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
        contactNumber: '',
        address: '',
        description: ''
      });
      setGeneratedPassword('');

    } catch (err) {
      setError(err.message || 'Failed to create agency account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-6 flex flex-col items-center">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-800">Register New Agency</h1>
        <p className="text-gray-600 mt-2">Create a new agency account in the system</p>
      </div>

      {/* Registration Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-6xl w-full">
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
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                placeholder="Enter agency address"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agency Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                placeholder="Enter agency description or additional information"
              />
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