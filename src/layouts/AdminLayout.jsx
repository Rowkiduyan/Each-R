import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate, Outlet } from "react-router-dom";
import AdminNotificationBell from "../AdminNotificationBell";

export default function AdminLayout() {
  const [adminUser, setAdminUser] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileDropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem("loggedInHR");
    if (stored) {
      try {
        const userData = JSON.parse(stored);
        if (userData.role?.toLowerCase() === 'admin') {
          setAdminUser(userData);
        } else {
          // Not an admin user
          navigate("/employee/login");
        }
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

  if (!adminUser) return null;

  return (
    <>
      <nav className="w-full bg-white shadow-md mb-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-25">
            <div className="flex-shrink-0 text-red-600 font-bold text-2xl italic">Each-R</div>

            <div className="flex space-x-6 ml-0 md:ml-32 lg:ml-10">
              <NavLink
                to="/admin/home"
                className={({ isActive }) =>
                  `hover:text-red-600 ${
                    isActive ? "text-red-600 font-semibold border-b-2 border-red-600" : "text-gray-700 font-medium"
                  }`
                }
              >
                Home
              </NavLink>

              <NavLink to="/admin/create" className={({ isActive }) =>
              `hover:text-red-600 ${isActive ? "text-red-600 font-semibold border-b-2 border-red-600" : "text-gray-700 font-medium"
                }`
              }
              >
                Register Agency
              </NavLink>

              <NavLink to="/admin/enable-disable" className={({ isActive }) =>
              `hover:text-red-600 ${isActive ? "text-red-600 font-semibold border-b-2 border-red-600" : "text-gray-700 font-medium"
                }`
              }
              >
                Enable/Disable Accounts
              </NavLink>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notification Bell */}
              <AdminNotificationBell />
              
              {/* User Profile Picture/Initials with Dropdown */}
              <div className="relative" ref={profileDropdownRef}>
                <div 
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold cursor-pointer hover:bg-gray-300"
                >
                  {adminUser?.first_name && adminUser?.last_name 
                    ? `${adminUser.first_name[0]}${adminUser.last_name[0]}`.toUpperCase()
                    : adminUser?.email?.[0]?.toUpperCase() || "A"}
                </div>
                {/* Dropdown arrow */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full border-2 border-white flex items-center justify-center pointer-events-none">
                  <svg className="w-2 h-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                {/* Dropdown Menu */}
                {showProfileDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 text-sm text-gray-700 border-b">
                        {adminUser?.first_name && adminUser?.last_name 
                          ? `${adminUser.first_name} ${adminUser.last_name}`
                          : adminUser?.email || "Admin"}
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
      </nav>

      
      <main className="max-w-7xl mx-auto px-4">
        <Outlet />
      </main>
    </>
  );
}