import { Link, useNavigate } from "react-router-dom"; /* To access this page use "http://localhost:5173/applicant/register" */
import { useState, useEffect } from 'react';
import Logo from './Logo.png';
import { supabase } from './supabaseClient';
import emailjs from '@emailjs/browser';



function ApplicantRegister() {

  const navigate = useNavigate();
  const [lname, setLname] = useState('');
  const [fname, setFname] = useState('');
  const [mname, setMname] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthday, setBirthday] = useState('');
  const [sex, setSex] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');

  // Calculate password strength
  const calculatePasswordStrength = (pwd) => {
    if (!pwd) return '';
    
    const hasUppercase = /[A-Z]/.test(pwd);
    const hasLowercase = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    const hasMinLength = pwd.length >= 6;
    
    const criteriaCount = [hasUppercase, hasLowercase, hasNumber, hasSymbol, hasMinLength].filter(Boolean).length;
    
    if (criteriaCount < 3) return 'weak';
    if (criteriaCount < 5) return 'fair';
    return 'strong';
  };

  // Update password strength when password changes
  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(password));
  }, [password]);

const handleRegister = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);
  setErrorMessage('');
  setSuccessMessage('');

  // Validate password requirements
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasMinLength = password.length >= 6;

  if (!hasMinLength) {
    setErrorMessage("Password must be at least 6 characters long");
    setIsSubmitting(false);
    return;
  }

  if (!hasUppercase) {
    setErrorMessage("Password must contain at least one uppercase letter (A-Z)");
    setIsSubmitting(false);
    return;
  }

  if (!hasLowercase) {
    setErrorMessage("Password must contain at least one lowercase letter (a-z)");
    setIsSubmitting(false);
    return;
  }

  if (!hasNumber) {
    setErrorMessage("Password must contain at least one number (0-9)");
    setIsSubmitting(false);
    return;
  }

  if (!hasSymbol) {
    setErrorMessage("Password must contain at least one special character (!@#$%^&*(),.?\"{}|<>)");
    setIsSubmitting(false);
    return;
  }

  if (password !== confirmPassword) {
    setErrorMessage("Passwords do not match!");
    setIsSubmitting(false);
    return;
  }

  if (!lname || !fname || !email || !password || !contact || !birthday || !sex) {
    setErrorMessage("Please fill in all required fields.");
    setIsSubmitting(false);
    return;
  }

  if (contact.length !== 11 || !contact.startsWith('09')) {
    setErrorMessage("Contact number must be 11 digits starting with 09 (e.g., 09XXXXXXXXX).");
    setIsSubmitting(false);
    return;
  }

  try {
      //  Generate a 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      //  Send verification email using EmailJS
      await emailjs.send(
        "service_nc4wt9g",       
        "template_x50nz3r",     
        {
          user_name: fname,
          email,
          verification_code: verificationCode,
        },
        "m2yll-ASVS8jsxvcM"        
      );

      console.log("✅ Verification email sent!");

      // Check if email already exists in pending_applicants
      const { data: existingPending } = await supabase
        .from("pending_applicants")
        .select("email")
        .eq("email", email)
        .maybeSingle();

      let error;
      if (existingPending) {
        // Update existing record with new verification code and password
        const { error: updateError } = await supabase
          .from("pending_applicants")
          .update({
            fname,
            lname,
            mname,
            contact_number: contact,
            password,
            birthday,
            sex,
            verification_code: verificationCode
          })
          .eq("email", email);
        
        error = updateError;
      } else {
        // Insert new record
        const { error: insertError } = await supabase.from("pending_applicants").insert([
          {
            fname,
            lname,
            mname,
            contact_number: contact,
            email,
            password,  // consider hashing this
            birthday,
            sex,
            verification_code: verificationCode
          }
        ]);
        
        error = insertError;
      }

      if (error) throw error;

      setSuccessMessage("Verification code sent! Please check your email.");
      setTimeout(() => {
        navigate("/applicant/verify", { state: { email } });
      }, 1500);

    } catch (err) {
      console.error("❌ Registration error:", err.message);
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
};



  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-2xl">
        <form onSubmit={handleRegister} className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 px-8 py-6 border-b border-gray-200">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Create Your Account</h1>
            <p className="text-gray-600">
              Join Roadwise and start your career journey with us
            </p>
          </div>

          <div className="p-8 space-y-8">
            {/* Error/Success Messages */}
            {errorMessage && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 text-sm">{errorMessage}</p>
              </div>
            )}

            {successMessage && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-green-700 text-sm">{successMessage}</p>
              </div>
            )}

            {/* Personal Information Section */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-800">Personal Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    First Name <span className="text-red-600">*</span>
                  </label>
                  <input 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" 
                    placeholder="Enter your first name"
                    value={fname}
                    onChange={(e) => setFname(e.target.value)} 
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Last Name <span className="text-red-600">*</span>
                  </label>
                  <input 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" 
                    placeholder="Enter your last name"
                    value={lname}
                    onChange={(e) => setLname(e.target.value)}
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Middle Name <span className="text-gray-400 text-xs">(Optional)</span>
                  </label>
                  <input 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" 
                    placeholder="Enter your middle name"
                    value={mname}
                    onChange={(e) => setMname(e.target.value)} 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Date of Birth <span className="text-red-600">*</span>
                  </label>
                  <input 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all cursor-pointer" 
                    type="date" 
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    min="1900-01-01"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Click to select your date of birth</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Sex <span className="text-red-600">*</span>
                  </label>
                  <div className="flex items-center gap-6 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="sex"
                        value="Male"
                        checked={sex === "Male"}
                        onChange={(e) => setSex(e.target.value)}
                        className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500 focus:ring-2"
                        required
                      />
                      <span className="text-gray-700">Male</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="sex"
                        value="Female"
                        checked={sex === "Female"}
                        onChange={(e) => setSex(e.target.value)}
                        className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500 focus:ring-2"
                        required
                      />
                      <span className="text-gray-700">Female</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-800">Contact Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Contact Number <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <input 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" 
                      placeholder="09XXXXXXXXX"
                      value={contact}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d+$/.test(value)) {
                          if (value === '' || value === '0' || value.startsWith('09')) {
                            if (value.length <= 11) {
                              setContact(value);
                            }
                          }
                        }
                      }}
                      maxLength={11}
                      required
                    />
                    {contact && !contact.startsWith('09') && contact.length > 0 && (
                      <p className="text-xs text-red-600 mt-1">Must start with 09</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">11 digits starting with 09</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email Address <span className="text-red-600">*</span>
                  </label>
                  <input 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" 
                    type="email" 
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)} 
                    required
                  />
                </div>
              </div>
            </div>

            {/* Account Security Section */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-800">Account Security</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Password <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <input 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all pr-12" 
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)} 
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`flex-1 h-1.5 rounded-full ${
                          passwordStrength === 'weak' ? 'bg-red-500' : 
                          passwordStrength === 'fair' ? 'bg-yellow-500' : 
                          passwordStrength === 'strong' ? 'bg-green-500' : 'bg-gray-200'
                        }`}></div>
                        <div className={`flex-1 h-1.5 rounded-full ${
                          passwordStrength === 'fair' ? 'bg-yellow-500' : 
                          passwordStrength === 'strong' ? 'bg-green-500' : 'bg-gray-200'
                        }`}></div>
                        <div className={`flex-1 h-1.5 rounded-full ${
                          passwordStrength === 'strong' ? 'bg-green-500' : 'bg-gray-200'
                        }`}></div>
                      </div>
                      <p className={`text-xs mb-2 ${
                        passwordStrength === 'weak' ? 'text-red-600' : 
                        passwordStrength === 'fair' ? 'text-yellow-600' : 
                        passwordStrength === 'strong' ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {passwordStrength === 'weak' && 'Weak password'}
                        {passwordStrength === 'fair' && 'Fair password'}
                        {passwordStrength === 'strong' && 'Strong password'}
                        {!passwordStrength && 'Password requirements:'}
                      </p>
                      <ul className="text-xs space-y-1">
                        <li className={`flex items-center gap-1 ${
                          /[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          {/[A-Z]/.test(password) ? '✓' : '○'} One uppercase letter
                        </li>
                        <li className={`flex items-center gap-1 ${
                          /[a-z]/.test(password) ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          {/[a-z]/.test(password) ? '✓' : '○'} One lowercase letter
                        </li>
                        <li className={`flex items-center gap-1 ${
                          /[0-9]/.test(password) ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          {/[0-9]/.test(password) ? '✓' : '○'} One number
                        </li>
                        <li className={`flex items-center gap-1 ${
                          /[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          {/[!@#$%^&*(),.?":{}|<>]/.test(password) ? '✓' : '○'} One special character
                        </li>
                        <li className={`flex items-center gap-1 ${
                          password.length >= 6 ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          {password.length >= 6 ? '✓' : '○'} At least 6 characters
                        </li>
                      </ul>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Confirm Password <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <input 
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all pr-12 ${
                        confirmPassword && password !== confirmPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Passwords do not match
                    </p>
                  )}
                  {confirmPassword && password === confirmPassword && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Passwords match
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Terms and Privacy */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500" 
                  required
                />
                <span className="text-sm text-gray-700">
                  I agree to the{' '}
                  <Link to="/terms-and-privacy" className="text-red-600 hover:text-red-700 font-medium underline">
                    Terms and Privacy Policy
                  </Link>
                  {' '}and consent to Roadwise collecting and storing my personal information as part of the recruitment process.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit" 
              disabled={isSubmitting}
              className={`w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                isSubmitting ? "opacity-50 cursor-not-allowed" : "shadow-lg hover:shadow-xl"
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </>
              )}
            </button>

            {/* Login Link */}
            <p className="text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link to="/applicant/login" className="text-red-600 hover:text-red-700 font-semibold underline">
                Sign In
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
export default ApplicantRegister