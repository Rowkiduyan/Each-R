import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, createContext, useContext } from "react";
import { supabase } from "../supabaseClient";
import { Outlet } from "react-router-dom";
import LogoCropped from "./photos/logo(cropped).png";

// Create context for employee user data
const EmployeeUserContext = createContext(null);

// Export hook to access employee user data in child components
export const useEmployeeUser = () => {
    const context = useContext(EmployeeUserContext);
    if (!context) {
        throw new Error('useEmployeeUser must be used within EmployeeLayout');
    }
    return context;
};

function EmployeeLayout() {
    const [employeeUser, setEmployeeUser] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [currentUserEmail, setCurrentUserEmail] = useState(null);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const profileDropdownRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // First check if user is authenticated
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                
                if (!user || authError) {
                    // Not authenticated -> redirect to login
                    navigate("/employee/login");
                    return;
                }

                // Check user's role in profiles table
                const { data: profile, error: profileError } = await supabase
                    .from("profiles")
                    .select("role, first_name, last_name, email")
                    .eq("id", user.id)
                    .single();

                if (profileError || !profile) {
                    console.error("Error fetching profile:", profileError);
                    navigate("/employee/login");
                    return;
                }

                // Check if role is Employee (case-insensitive)
                const role = profile.role?.toLowerCase();
                if (role !== "employee") {
                    // Not an employee -> redirect to login
                    console.warn("User is not an employee, role:", role);
                    navigate("/employee/login");
                    return;
                }

                // Store current user ID and email for data filtering
                setCurrentUserId(user.id);
                setCurrentUserEmail(user.email);

                // User is authenticated and is an employee
                // Try to get employee data from employees table
                try {
                    const { data: employee, error: empError } = await supabase
                        .from('employees')
                        .select('fname, mname, lname, email')
                        .eq('email', user.email)
                        .maybeSingle();
                    
                    if (!empError && employee) {
                        setEmployeeUser(employee);
                    } else {
                        // Use profile data as fallback
                        setEmployeeUser({
                            fname: profile.first_name || "",
                            lname: profile.last_name || "",
                            email: profile.email || user.email
                        });
                    }
                } catch (queryErr) {
                    console.warn('Exception fetching employee data:', queryErr);
                    // Use profile data as fallback
                    setEmployeeUser({
                        fname: profile.first_name || "",
                        lname: profile.last_name || "",
                        email: profile.email || user.email
                    });
                }
            } catch (err) {
                console.error('Error in authentication check:', err);
                navigate("/employee/login");
            }
        };

        checkAuth();
    }, [navigate]);

    const handleLogout = async () => {
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

    const getFullName = () => {
        if (employeeUser?.fname && employeeUser?.lname) {
            const middle = employeeUser?.mname ? ` ${employeeUser.mname} ` : ' ';
            return `${employeeUser.fname}${middle}${employeeUser.lname}`;
        }
        return employeeUser?.email || "User";
    };

    const getInitials = () => {
        if (employeeUser?.fname && employeeUser?.lname) {
            return `${employeeUser.fname[0]}${employeeUser.lname[0]}`.toUpperCase();
        }
        return employeeUser?.email?.[0]?.toUpperCase() || "U";
    };

    // Don't render anything until authentication is verified
    if (!employeeUser) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
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
                                to="/employee/home"
                                className={({ isActive }) =>
                                    `pb-1 ${isActive ? "text-red-600 border-b-2 border-red-600" : "hover:text-gray-900 transition-colors"}`
                                }
                            >
                                Home
                            </NavLink>
                            <NavLink
                                to="/employee/requirements"
                                className={({ isActive }) =>
                                    `pb-1 ${isActive ? "text-red-600 border-b-2 border-red-600" : "hover:text-gray-900 transition-colors"}`
                                }
                            >
                                Requirements
                            </NavLink>
                            <NavLink
                                to="/employee/trainings"
                                className={({ isActive }) =>
                                    `pb-1 ${isActive ? "text-red-600 border-b-2 border-red-600" : "hover:text-gray-900 transition-colors"}`
                                }
                            >
                                Trainings/Orientation
                            </NavLink>
                            <NavLink
                                to="/employee/evaluation"
                                className={({ isActive }) =>
                                    `pb-1 ${isActive ? "text-red-600 border-b-2 border-red-600" : "hover:text-gray-900 transition-colors"}`
                                }
                            >
                                Evaluation
                            </NavLink>
                            <NavLink
                                to="/employee/separation"
                                className={({ isActive }) =>
                                    `pb-1 ${isActive ? "text-red-600 border-b-2 border-red-600" : "hover:text-gray-900 transition-colors"}`
                                }
                            >
                                Separation
                            </NavLink>
                        </nav>

                        <div className="flex items-center space-x-4">
                            {/* Notification Bell */}
                            <NavLink to="/employee/notif" className={({ isActive }) => `relative ${
                                isActive ? "text-red-600" : ""
                            }`}>
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 cursor-pointer">
                                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                </div>
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">3</span>
                            </NavLink>

                            {/* User Profile Picture/Initials with Dropdown */}
                            <div className="relative" ref={profileDropdownRef}>
                                <div
                                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                                    className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold cursor-pointer hover:bg-gray-300"
                                >
                                    {getInitials()}
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
                                                {getFullName()}
                                            </div>
                                            <NavLink
                                                to="/employee/profile"
                                                onClick={() => setShowProfileDropdown(false)}
                                                className={({ isActive }) =>
                                                    `block w-full text-left px-4 py-2 text-sm ${isActive ? "bg-gray-100 text-red-600" : "text-gray-700 hover:bg-gray-100"}`
                                                }
                                            >
                                                Profile
                                            </NavLink>
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
            <main className="flex-1 py-8">
                <EmployeeUserContext.Provider value={{ 
                    userId: currentUserId, 
                    userEmail: currentUserEmail,
                    employeeData: employeeUser 
                }}>
                    <Outlet />
                </EmployeeUserContext.Provider>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
                <div className="max-w-7xl mx-auto px-6">
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

export default EmployeeLayout;

