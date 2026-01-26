// src/layouts/AgencyLayout.jsx
import React, { useState, useRef, useEffect } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { supabase } from "../supabaseClient";
import LogoCropped from "../layouts/photos/logo(maroon).png";
import AgencyNotificationBell from "../AgencyNotificationBell";

function AgencyLayout() {
  const navigate = useNavigate();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const profileDropdownRef = useRef(null);
  const [agencyUser, setAgencyUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch agency user profile
  useEffect(() => {
    const fetchAgencyProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/employee/login");
          return;
        }

        // Fetch profile data from profiles table.
        // Some environments may not yet have `profiles.contact_number`; fall back if missing.
        const selectWithContact = 'id, email, first_name, last_name, role, agency_name, contact_number';
        const selectWithoutContact = 'id, email, first_name, last_name, role, agency_name';

        let profile = null;
        let error = null;

        {
          const res = await supabase
            .from('profiles')
            .select(selectWithContact)
            .eq('id', user.id)
            .single();
          profile = res.data;
          error = res.error;
        }

        if (error && String(error.message || '').toLowerCase().includes('contact_number')) {
          const res = await supabase
            .from('profiles')
            .select(selectWithoutContact)
            .eq('id', user.id)
            .single();
          profile = res.data;
          error = res.error;
        }

        if (error) {
          console.error('Error fetching agency profile:', error);
        } else {
          setAgencyUser(profile);
        }
      } catch (error) {
        console.error('Error fetching agency user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgencyProfile();
  }, [navigate]);

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
      navigate("/employee/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (agencyUser?.first_name && agencyUser?.last_name) {
      return `${agencyUser.first_name[0]}${agencyUser.last_name[0]}`.toUpperCase();
    } else if (agencyUser?.email) {
      return agencyUser.email[0].toUpperCase();
    }
    return "A";
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (agencyUser?.first_name && agencyUser?.last_name) {
      return `${agencyUser.first_name} ${agencyUser.last_name}`;
    } else if (agencyUser?.email) {
      return agencyUser.email;
    }
    return "Agency User";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000]"></div>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img
                src={LogoCropped}
                alt="Each-R Logo"
                className="h-10 w-auto object-contain"
              />
            </div>

            <nav className="flex items-center space-x-6 text-sm font-medium text-gray-600">
              <NavLink
                to="/agency/home"
                className={({ isActive }) =>
                  `pb-1 ${isActive ? "text-[#800000] border-b-2 border-[#800000]" : "hover:text-gray-900 transition-colors"}`
                }
              >
                Job Search
              </NavLink>
              <NavLink
                to="/agency/endorsements"
                className={({ isActive }) =>
                  `pb-1 ${isActive ? "text-[#800000] border-b-2 border-[#800000]" : "hover:text-gray-900 transition-colors"}`
                }
              >
                Endorsements
              </NavLink>
              <NavLink
                to="/agency/requirements"
                className={({ isActive }) =>
                  `pb-1 ${isActive ? "text-[#800000] border-b-2 border-[#800000]" : "hover:text-gray-900 transition-colors"}`
                }
              >
                Requirements
              </NavLink>
              <NavLink
                to="/agency/trainings"
                className={({ isActive }) =>
                  `pb-1 ${isActive ? "text-[#800000] border-b-2 border-[#800000]" : "hover:text-gray-900 transition-colors"}`
                }
              >
                Trainings/Orientation
              </NavLink>
              <NavLink
                to="/agency/evaluation"
                className={({ isActive }) =>
                  `pb-1 ${isActive ? "text-[#800000] border-b-2 border-[#800000]" : "hover:text-gray-900 transition-colors"}`
                }
              >
                Evaluation
              </NavLink>
              <NavLink
                to="/agency/separation"
                className={({ isActive }) =>
                  `pb-1 ${isActive ? "text-[#800000] border-b-2 border-[#800000]" : "hover:text-gray-900 transition-colors"}`
                }
              >
                Separation
              </NavLink>
            </nav>

            <div className="flex items-center space-x-4">
              {/* Notification Bell */}
              <AgencyNotificationBell />

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
                        <p className="text-xs text-gray-500 mt-1">{agencyUser?.email}</p>
                        {agencyUser?.role && (
                          <p className="text-xs text-[#800000] mt-1 font-medium">
                            {agencyUser.role}
                          </p>
                        )}
                      </div>
                      <NavLink
                        to="/agency/profile"
                        onClick={() => setShowProfileDropdown(false)}
                        className={({ isActive }) =>
                          `block w-full text-left px-4 py-2 text-sm ${isActive ? "bg-gray-100 text-[#800000]" : "text-gray-700 hover:bg-gray-100"} flex items-center gap-2`
                        }
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Profile
                      </NavLink>
                      <NavLink
                        to="/agency/account-settings"
                        onClick={() => setShowProfileDropdown(false)}
                        className={({ isActive }) =>
                          `block w-full text-left px-4 py-2 text-sm ${isActive ? "bg-gray-100 text-[#800000]" : "text-gray-700 hover:bg-gray-100"} flex items-center gap-2`
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
      <main className="flex-1">
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
                className="px-4 py-2 rounded-lg bg-[#800000] text-white hover:bg-[#990000] text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

export default AgencyLayout;


