import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { supabase } from "../supabaseClient";
import LogoCropped from "./photos/logo(cropped).png";
import HrNotificationBell from "../HrNotificationBell";

export default function HRLayout() {
  const [hrUser, setHrUser] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileDropdownRef = useRef(null);
  const navigate = useNavigate(); 

  useEffect(() => {
    const stored = localStorage.getItem("loggedInHR");
    if (stored) {
      try {
        setHrUser(JSON.parse(stored));
      } catch (err) {
        console.error("Failed to parse loggedInHR:", err);
        localStorage.removeItem("loggedInHR");
        navigate("/employee/login");
      }
    } else {
      // not logged in -> redirect to login
      navigate("/employee/login");
    }
    
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem("loggedInHR");
    // Also sign out from Supabase to prevent ApplicantLayout from showing
    await supabase.auth.signOut();
    navigate("/employee/login");
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };

    if (showProfileDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileDropdown]);

  if (!hrUser) return null;

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
                to="/hr/recruitment"
                className={({ isActive }) =>
                  `pb-1 transition-colors ${
                    isActive
                      ? "text-red-600 border-b-2 border-red-600"
                      : "hover:text-gray-900"
                  }`
                }
              >
                Recruitment
              </NavLink>

              <NavLink
                to="/hr/employees"
                className={({ isActive }) =>
                  `pb-1 transition-colors ${
                    isActive
                      ? "text-red-600 border-b-2 border-red-600"
                      : "hover:text-gray-900"
                  }`
                }
              >
                Employees
              </NavLink>

              <NavLink
                to="/hr/requirements"
                className={({ isActive }) =>
                  `pb-1 transition-colors ${
                    isActive ? "text-red-600 border-b-2 border-red-600" : "hover:text-gray-900"
                  }`
                }
              >
                Requirements
              </NavLink>

              <NavLink
                to="/hr/trainings"
                className={({ isActive }) =>
                  `pb-1 transition-colors ${
                    isActive
                      ? "text-red-600 border-b-2 border-red-600"
                      : "hover:text-gray-900"
                  }`
                }
              >
                Trainings/Seminars
              </NavLink>

              <NavLink
                to="/hr/eval"
                className={({ isActive }) =>
                  `pb-1 transition-colors ${
                    isActive
                      ? "text-red-600 border-b-2 border-red-600"
                      : "hover:text-gray-900"
                  }`
                }
              >
                Evaluation
              </NavLink>

              <NavLink
                to="/hr/seperation"
                className={({ isActive }) =>
                  `pb-1 transition-colors ${
                    isActive
                      ? "text-red-600 border-b-2 border-red-600"
                      : "hover:text-gray-900"
                  }`
                }
              >
                Separation
              </NavLink>
            </nav>
                
            <div className="flex items-center space-x-4">
              {/* Notification Bell */}
              <HrNotificationBell />
              
              {/* User Profile Picture/Initials with Dropdown */}
              <div className="relative" ref={profileDropdownRef}>
                <div
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold cursor-pointer hover:bg-gray-300"
                >
                  {hrUser?.first_name && hrUser?.last_name
                    ? `${hrUser.first_name[0]}${hrUser.last_name[0]}`.toUpperCase()
                    : hrUser?.email?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full border-2 border-white flex items-center justify-center pointer-events-none">
                  <svg className="w-2 h-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {showProfileDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 text-sm text-gray-700 border-b">
                        {hrUser?.first_name && hrUser?.last_name
                          ? `${hrUser.first_name} ${hrUser.last_name}`
                          : hrUser?.email || "User"}
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
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
              <a href="#" className="hover:text-gray-700 hover:underline">Terms & conditions</a>
              <a href="#" className="hover:text-gray-700 hover:underline">Security</a>
              <a href="#" className="hover:text-gray-700 hover:underline">Privacy</a>
              <span className="text-gray-400">Copyright © 2025, Roadwise</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}