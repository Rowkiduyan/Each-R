// src/layouts/GuestLayout.jsx
import React, { useState, useRef, useEffect } from "react";
import { Outlet, useNavigate, NavLink, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import LogoCropped from "./photos/logo(cropped).png";
import NotificationBell from "../NotificationBell";

function GuestLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const profileDropdownRef = useRef(null);
  const [applicantUser, setApplicantUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Check if we're on a login page
  const isLoginPage = location.pathname === "/applicant/login" || location.pathname === "/employee/login";
  // Check if we're on a register page
  const isRegisterPage = location.pathname === "/applicant/register";
  // Check if we're on a verify page
  const isVerifyPage = location.pathname === "/applicant/verify";

  // Check authentication and fetch applicant profile
  useEffect(() => {
    const fetchApplicantProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsAuthenticated(false);
          setApplicantUser(null);
          setLoading(false);
          return;
        }

        setIsAuthenticated(true);

        // Fetch applicant data from applicants table
        const { data: applicant, error } = await supabase
          .from('applicants')
          .select('id, email, fname, lname')
          .eq('email', user.email)
          .maybeSingle();

        if (error) {
          console.error('Error fetching applicant profile:', error);
        } else if (applicant) {
          setApplicantUser(applicant);
        } else {
          // If no applicant record, use auth user data
          setApplicantUser({
            email: user.email,
            fname: user.user_metadata?.first_name || null,
            lname: user.user_metadata?.last_name || null,
          });
        }
      } catch (error) {
        console.error('Error fetching applicant user:', error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    fetchApplicantProfile();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchApplicantProfile();
      } else {
        setIsAuthenticated(false);
        setApplicantUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
    await supabase.auth.signOut();
    setShowLogoutConfirm(false);
    setShowProfileDropdown(false);
    navigate("/applicantg/home");
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (applicantUser?.fname && applicantUser?.lname) {
      return `${applicantUser.fname[0]}${applicantUser.lname[0]}`.toUpperCase();
    } else if (applicantUser?.email) {
      return applicantUser.email[0].toUpperCase();
    }
    return "A";
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (applicantUser?.fname && applicantUser?.lname) {
      return `${applicantUser.fname} ${applicantUser.lname}`;
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
              <img
                src={LogoCropped}
                alt="Each-R Logo"
                className="h-10 w-auto object-contain"
              />
            </div>

            {/* Center: Navigation */}
            <nav className="flex items-center justify-center space-x-6 text-sm font-medium text-gray-600">
              <NavLink
                to="/applicantg/home"
                className={({ isActive }) =>
                  `pb-1 ${isActive ? "text-red-600 border-b-2 border-red-600" : "hover:text-gray-900 transition-colors"}`
                }
              >
                Job Search
              </NavLink>
              {isAuthenticated && (
                <>
                  <NavLink
                    to="/applicantl/home"
                    className={({ isActive }) =>
                      `pb-1 ${isActive ? "text-red-600 border-b-2 border-red-600" : "hover:text-gray-900 transition-colors"}`
                    }
                  >
                    Home
                  </NavLink>
                  <NavLink
                    to="/applicant/applications"
                    className={({ isActive }) =>
                      `pb-1 ${isActive ? "text-red-600 border-b-2 border-red-600" : "hover:text-gray-900 transition-colors"}`
                    }
                  >
                    My Applications
                  </NavLink>
                </>
              )}
              <NavLink
                to="#"
                className="pb-1 hover:text-gray-900 transition-colors"
              >
                About
              </NavLink>
              <NavLink
                to="#"
                className="pb-1 hover:text-gray-900 transition-colors"
              >
                Contact Us
              </NavLink>
            </nav>

            {/* Right: Login/Profile */}
            <div className="flex items-center justify-end space-x-4">
              {isAuthenticated ? (
                <>
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
                </>
              ) : !isLoginPage && !isRegisterPage && !isVerifyPage ? (
                <NavLink
                  to="/applicant/login"
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Login
                </NavLink>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full">
        <Outlet />
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
              <a href="#" className="hover:text-gray-700 hover:underline">Terms & conditions</a>
              <a href="#" className="hover:text-gray-700 hover:underline">Security</a>
              <a href="#" className="hover:text-gray-700 hover:underline">Privacy</a>
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
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-medium"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GuestLayout;

