import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, createContext, useContext } from "react";
import { supabase } from "../supabaseClient";
import { Outlet } from "react-router-dom";
import LogoCropped from "./photos/logo(cropped).png";
import NotificationBell from "../NotificationBell";

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
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
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

                // Check if employee is terminated and if account has expired
                const { data: separationData, error: sepError } = await supabase
                    .from('employee_separations')
                    .select('is_terminated, account_expires_at')
                    .eq('employee_id', user.id)
                    .maybeSingle();

                if (!sepError && separationData?.is_terminated && separationData?.account_expires_at) {
                    const expiryDate = new Date(separationData.account_expires_at);
                    const now = new Date();
                    
                    if (now >= expiryDate) {
                        // Account has expired - force logout
                        console.log('Account has expired. Logging out...');
                        await supabase.auth.signOut();
                        navigate("/employee/login");
                        return;
                    }
                }

                // User is authenticated and is an employee
                // Try to get employee data from employees table
                // The employees table has its own 'id' which is different from auth user id
                try {
                    // First try to find by auth user id if that's how it's linked
                    let { data: employee, error: empError } = await supabase
                        .from('employees')
                        .select('id, fname, mname, lname, email, personal_email, hired_at, position, depot')
                        .eq('id', user.id)
                        .maybeSingle();
                    
                    // If not found by auth id, try by email
                    if (!employee && !empError) {
                        const result = await supabase
                            .from('employees')
                            .select('id, fname, mname, lname, email, personal_email, hired_at, position, depot')
                            .eq('email', user.email)
                            .maybeSingle();
                        
                        employee = result.data;
                        empError = result.error;
                    }
                    
                    if (!empError && employee) {
                        setEmployeeUser({
                            ...employee,
                            authUserId: user.id // Keep auth ID for storage paths
                        });
                    } else {
                        // Use profile data as fallback
                        setEmployeeUser({
                            id: null,
                            authUserId: user.id,
                            fname: profile.first_name || "",
                            lname: profile.last_name || "",
                            email: profile.email || user.email
                        });
                    }
                } catch (queryErr) {
                    console.warn('Exception fetching employee data:', queryErr);
                    // Use profile data as fallback
                    setEmployeeUser({
                        id: null,
                        authUserId: user.id,
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

    // Periodic check for account expiration (every 30 seconds)
    useEffect(() => {
        if (!currentUserId) return;

        const checkExpiration = async () => {
            try {
                const { data: separationData, error: sepError } = await supabase
                    .from('employee_separations')
                    .select('is_terminated, account_expires_at')
                    .eq('employee_id', currentUserId)
                    .maybeSingle();

                if (!sepError && separationData?.is_terminated && separationData?.account_expires_at) {
                    const expiryDate = new Date(separationData.account_expires_at);
                    const now = new Date();
                    
                    if (now >= expiryDate) {
                        // Account has expired - force logout
                        console.log('Account has expired during session. Logging out...');
                        await supabase.auth.signOut();
                        navigate("/employee/login");
                    }
                }
            } catch (err) {
                console.error('Error checking expiration:', err);
            }
        };

        // Check immediately
        checkExpiration();

        // Then check every 30 seconds
        const interval = setInterval(checkExpiration, 30000);

        return () => clearInterval(interval);
    }, [currentUserId, navigate]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setShowLogoutConfirm(false);
        setShowProfileDropdown(false);
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
                            <NotificationBell />

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
                                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border z-50">
                                        <div className="py-1">
                                            <div className="px-4 py-3 border-b">
                                                <p className="text-sm font-semibold text-gray-800">{getFullName()}</p>
                                                <p className="text-xs text-gray-500 mt-1">{employeeUser?.email}</p>
                                                <p className="text-xs text-red-600 mt-1 font-medium">Employee</p>
                                            </div>
                                            <NavLink
                                                to="/employee/profile"
                                                onClick={() => setShowProfileDropdown(false)}
                                                className={({ isActive }) =>
                                                    `block w-full text-left px-4 py-2 text-sm ${isActive ? "bg-gray-100 text-red-600" : "text-gray-700 hover:bg-gray-100"} flex items-center gap-2`
                                                }
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                Profile
                                            </NavLink>
                                            <NavLink
                                                to="/employee/account-settings"
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
            <main className="flex-1">
                <div className="w-full px-6">
                    <EmployeeUserContext.Provider value={{ 
                        userId: currentUserId, 
                        userEmail: currentUserEmail,
                        employeeData: employeeUser 
                    }}>
                        <Outlet />
                    </EmployeeUserContext.Provider>
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

export default EmployeeLayout;

