import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
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

  const handleLogout = () => {
    localStorage.removeItem("loggedInHR");
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
    <>
      {/* Header -  navbar*/}
      <div className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
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
                to="/hr/home"
                className={({ isActive }) =>
                  `pb-1 transition-colors ${
                    isActive
                      ? "text-red-600 border-b-2 border-red-600"
                      : "hover:text-gray-900"
                  }`
                }
              >
                Home
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

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </>
  );
}