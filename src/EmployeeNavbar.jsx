import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";

function EmployeeNavbar() {
    const [employeeUser, setEmployeeUser] = useState(null);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const profileDropdownRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchEmployeeData = async () => {
            try {
                // First check if there's logged-in employee data in localStorage
                const storedEmployee = localStorage.getItem("loggedInEmployee");
                if (storedEmployee) {
                    try {
                        const parsedEmployee = JSON.parse(storedEmployee);
                        setEmployeeUser(parsedEmployee);
                        return;
                    } catch (parseErr) {
                        console.error("Failed to parse logged-in employee data:", parseErr);
                    }
                }

                // If no localStorage data, try to get from Supabase auth
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // Fetch employee data from employees table
                    const { data: employee, error } = await supabase
                        .from('employees')
                        .select('fname, mname, lname, email')
                        .eq('email', user.email)
                        .single();
                    
                    if (!error && employee) {
                        setEmployeeUser(employee);
                    } else {
                        // Fallback to user email if employee data not found
                        setEmployeeUser({ email: user.email });
                    }
                } else {
                    // Default fallback - you can customize this
                    setEmployeeUser({ fname: "Stephen", lname: "Yvone" });
                }
            } catch (err) {
                console.error('Error fetching employee data:', err);
                // Default fallback
                setEmployeeUser({ fname: "Stephen", lname: "Yvone" });
            }
        };

        fetchEmployeeData();
    }, []);

    const handleLogout = () => {
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

    return (
        <nav className="w-full bg-white shadow-md mb-6">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between items-center h-25">
                    <div className="flex-shrink-0 text-red-600 font-bold text-2xl italic">Each-R</div>

                    <div className="flex space-x-6 ml-0 md:ml-32 lg:ml-10">
                        <NavLink to="/employee/home" className={({ isActive }) => `hover:text-red-600 ${
                            isActive ? "text-red-600 font-semibold border-b-2 border-red-600" : "text-gray-700 font-medium"
                        }`}>Home</NavLink>
                        <NavLink to="/employee/separation" className={({ isActive }) => `hover:text-red-600 ${
                            isActive ? "text-red-600 font-semibold border-b-2 border-red-600" : "text-gray-700 font-medium"
                        }`}>Separation</NavLink>
                        <NavLink to="/employee/trainings" className={({ isActive }) => `hover:text-red-600 ${
                            isActive ? "text-red-600 font-semibold border-b-2 border-red-600" : "text-gray-700 font-medium"
                        }`}>Trainings</NavLink>
                        <NavLink to="/employee/profile" className={({ isActive }) => `hover:text-red-600 ${
                            isActive ? "text-red-600 font-semibold border-b-2 border-red-600" : "text-gray-700 font-medium"
                        }`}>Profile</NavLink>
                    </div>

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
                                            {getFullName()}
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
    );
}

export default EmployeeNavbar;