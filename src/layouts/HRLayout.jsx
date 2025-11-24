import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate, Outlet } from "react-router-dom";

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
      <nav className="w-full bg-white shadow-md mb-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-25">
            <div className="flex-shrink-0 text-red-600 font-bold text-2xl italic">Each-R</div>

            <div className="flex space-x-6 ml-0 md:ml-32 lg:ml-10">
              <NavLink
                to="/hr/home"
                className={({ isActive }) =>
                  `hover:text-red-600 ${
                    isActive ? "text-red-600 font-semibold border-b-2 border-red-600" : "text-gray-700 font-medium"
                  }`
                }
              >
                Home
              </NavLink>

              <NavLink to="/hr/employees" className={({ isActive }) =>
              `hover:text-red-600 ${isActive ? "text-red-600 font-semibold border-b-2 border-red-600" : "text-gray-700 font-medium"
                }`
              }
              >
                Employees
              </NavLink>

              <NavLink to="/hr/recruitment" className={({ isActive }) =>
              `hover:text-red-600 ${isActive ? "text-red-600 font-semibold border-b-2 border-red-600" : "text-gray-700 font-medium"
                }`
              }
              >
                Recruitment
              </NavLink>

              <NavLink to="/hr/trainings" className={({ isActive }) =>
              `hover:text-red-600 ${isActive ? "text-red-600 font-semibold border-b-2 border-red-600" : "text-gray-700 font-medium"
                }`
              }
              >
                Trainings/Seminars
              </NavLink>

              <NavLink to="/hr/eval" className={({ isActive }) =>
              `hover:text-red-600 ${isActive ? "text-red-600 font-semibold border-b-2 border-red-600" : "text-gray-700 font-medium"
                }`
              }
              >
                Evaluation
              </NavLink>

              <NavLink to="/hr/seperation" className={({ isActive }) =>
              `hover:text-red-600 ${isActive ? "text-red-600 font-semibold border-b-2 border-red-600" : "text-gray-700 font-medium"
                }`
              }
              >
                Separation
              </NavLink>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notification Bell */}
              <Link to="/hr/notif" className="relative">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 cursor-pointer">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                {/* Notification badge - can add count later */}
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">3</span>
              </Link>
              
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
      </nav>

      
      <main className="max-w-7xl mx-auto px-4">
        <Outlet />
      </main>
    </>
  );
}