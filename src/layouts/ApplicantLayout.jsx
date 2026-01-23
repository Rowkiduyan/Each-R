// src/layouts/ApplicantLayout.jsx
import React, { useState, useRef, useEffect } from "react";
import { Outlet, useNavigate, NavLink, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import LogoCropped from "./photos/logo(cropped).png";
import NotificationBell from "../NotificationBell";

function ApplicantLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const profileDropdownRef = useRef(null);
  const [applicantUser, setApplicantUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasCheckedAuth = useRef(false);
  const isRedirecting = useRef(false);

  const redirectToLogin = (extraState = {}) => {
    const redirectTarget = `${location.pathname}${location.search || ''}`;
    try {
      sessionStorage.setItem('applicant:redirectTo', redirectTarget);
    } catch {
      // ignore storage issues
    }

    navigate(`/applicant/login?redirectTo=${encodeURIComponent(redirectTarget)}`, {
      replace: true,
      state: { redirectTo: redirectTarget, ...extraState },
    });
  };

  // Check authentication and fetch applicant profile
  useEffect(() => {
    const fetchApplicantProfile = async () => {
      if (hasCheckedAuth.current || isRedirecting.current) return;
      hasCheckedAuth.current = true;

      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          setLoading(false);
          if (!isRedirecting.current) redirectToLogin();
          return;
        }

        // First, check if user exists in applicants table
        const { data: applicant, error: applicantError } = await supabase
          .from('applicants')
          .select('id, email, fname, lname, mname')
          .eq('email', user.email)
          .maybeSingle();

        console.log('🔍 Applicant check:', { email: user.email, applicant, applicantError });

        // If user is in applicants table, check if they've been hired
        if (applicant && !isRedirecting.current) {
          // Check if this email exists in the employees table (means they've been hired)
          const { data: employee, error: empError } = await supabase
            .from('employees')
            .select('id, email, personal_email')
            .or(`email.eq."${user.email}",personal_email.eq."${user.email}"`)
            .maybeSingle();

          console.log('👤 Employee check:', { employee, empError });

          if (employee && !isRedirecting.current) {
            console.log('🚫 Blocking access - applicant was hired and is now an employee');
            // Applicant has been hired - deny access to applicant portal
            isRedirecting.current = true;
            setLoading(false);
            // Navigate first with the message, then sign out
            navigate("/applicant/login", { 
              replace: true,
              state: { message: "Your application has been accepted and you are now an employee." }
            });
            // Sign out after navigation to preserve the state message
            await supabase.auth.signOut();
            return;
          }

          if (!isRedirecting.current) {
            console.log('✅ Allowing access - applicant not hired yet');
            // Allow access for applicants who haven't been hired
            setApplicantUser(applicant);
            setLoading(false);
          }
          return;
        }

        // If not in applicants table, check profiles table to see if they have a different role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
        }

        // If user has a non-applicant role, redirect them away
        if (profile && profile.role) {
          const role = profile.role.toLowerCase();
          if (role === 'hr' || role === 'hrc' || role === 'employee' || role === 'admin' || role === 'agency') {
            setLoading(false);
            // Sign them out and redirect to appropriate login
            await supabase.auth.signOut();
            navigate("/employee/login", { replace: true });
            return;
          }
        }

        // If no applicant record and no profile record (or profile is applicant), redirect to login
        setLoading(false);
        await supabase.auth.signOut();
        if (!isRedirecting.current) redirectToLogin();
      } catch (error) {
        console.error('Error fetching applicant user:', error);
        setLoading(false);
        if (!isRedirecting.current) redirectToLogin();
      }
    };

    fetchApplicantProfile();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Don't reset if we're in the middle of a redirect
      if (isRedirecting.current) return;
      
      if (session) {
        hasCheckedAuth.current = false;
      } else {
        setApplicantUser(null);
        hasCheckedAuth.current = false;
        // If they were logged out while on a protected applicant page,
        // send them to login but preserve the deep-link.
        redirectToLogin();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname, location.search]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return; // Prevent double-click
    
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      setShowLogoutConfirm(false);
      setShowProfileDropdown(false);
      navigate("/applicantg/home");
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (applicantUser?.fname && applicantUser?.lname) {
      return `${applicantUser.fname[0]}${applicantUser.lname[0]}`.toUpperCase();
    } else if (applicantUser?.first_name && applicantUser?.last_name) {
      return `${applicantUser.first_name[0]}${applicantUser.last_name[0]}`.toUpperCase();
    } else if (applicantUser?.email) {
      return applicantUser.email[0].toUpperCase();
    }
    return "A";
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (applicantUser?.fname && applicantUser?.lname) {
      return `${applicantUser.fname} ${applicantUser.lname}`;
    } else if (applicantUser?.first_name && applicantUser?.last_name) {
      return `${applicantUser.first_name} ${applicantUser.last_name}`;
    } else if (applicantUser?.email) {
      return applicantUser.email;
    }
    return "Applicant";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <style>{`
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
        * {
          scrollbar-width: thin;
          scrollbar-color: #d1d5db transparent;
        }
      `}</style>

      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-50 w-full">
        <div className="w-full px-6 py-4">
          <div className="grid grid-cols-3 items-center">
            {/* Left: Logo */}
            <div className="flex items-center">
              <NavLink
                to="/applicantl/home"
                state={{ activeTab: 'Home' }}
                aria-label="Go to home"
                className="inline-flex items-center"
              >
                <img
                  src={LogoCropped}
                  alt="Each-R Logo"
                  className="h-10 w-auto object-contain"
                />
              </NavLink>
            </div>

            {/* Center: Navigation */}
            <nav className="flex items-center justify-center space-x-6 text-sm font-medium text-gray-600">
              <NavLink
                to="/applicantl/home"
                className={({ isActive }) =>
                  `pb-1 ${isActive ? "text-red-600 border-b-2 border-red-600" : "hover:text-gray-900 transition-colors"}`
                }
              >
                Job Search
              </NavLink>
              <NavLink
                to="/applicant/applications"
                className={({ isActive }) =>
                  `pb-1 ${isActive ? "text-red-600 border-b-2 border-red-600" : "hover:text-gray-900 transition-colors"}`
                }
              >
                My Application
              </NavLink>
              <NavLink
                to="/applicant/about"
                className={({ isActive }) =>
                  `pb-1 ${isActive ? "text-red-600 border-b-2 border-red-600" : "hover:text-gray-900 transition-colors"}`
                }
              >
                About
              </NavLink>
            </nav>

            {/* Right: Notification & Profile */}
            <div className="flex items-center justify-end space-x-4">
              {/* Notification Bell */}
              <NotificationBell />

              {/* User Profile with Dropdown */}
              <div className="relative" ref={profileDropdownRef}>
                <div
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold cursor-pointer hover:bg-gray-300"
                >
                  {getUserInitials()}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full border-2 border-white flex items-center justify-center pointer-events-none">
                  <svg className="w-2 h-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {showProfileDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border z-50">
                    <div className="py-1">
                      <div className="px-4 py-3 border-b">
                        <p className="text-sm font-semibold text-gray-800">{getUserDisplayName()}</p>
                        <p className="text-xs text-gray-500 mt-1">{applicantUser?.email}</p>
                        <p className="text-xs text-red-600 mt-1 font-medium">Applicant</p>
                      </div>
                      <button
                        onClick={() => {
                          setShowProfileDropdown(false);
                          navigate('/applicantl/home', { state: { activeTab: 'Profile' } });
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        View Profile
                      </button>
                      <NavLink
                        to="/applicant/account-settings"
                        onClick={() => setShowProfileDropdown(false)}
                        className={({ isActive }) =>
                          `block w-full text-left px-4 py-2 text-sm ${isActive ? "bg-gray-100 text-red-600" : "text-gray-700 hover:bg-gray-100"} flex items-center gap-2`
                        }
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Account Settings
                      </NavLink>
                      <button
                        onClick={() => {
                          setShowProfileDropdown(false);
                          setShowLogoutConfirm(true);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full">
        <div className="w-full px-6">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 mt-auto w-full">
        <div className="w-full px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1 hover:text-gray-700 cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Philippines</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </div>
            
            <div className="flex items-center gap-6">
              <NavLink to="/terms-and-conditions" className="hover:text-gray-700 hover:underline">Terms &amp; Conditions</NavLink>
              <NavLink to="/privacy" className="hover:text-gray-700 hover:underline">Privacy</NavLink>
              <span className="text-gray-400">Copyright © 2025, Roadwise</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full mx-4 overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">Confirm Logout</h3>
            </div>
            <div className="p-5 text-sm text-gray-600">
              Are you sure you want to logout from your account?
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Logging out...
                  </>
                ) : (
                  "Logout"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApplicantLayout;

