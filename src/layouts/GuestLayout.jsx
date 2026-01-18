// src/layouts/GuestLayout.jsx
import React from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import LogoCropped from "./photos/logo(cropped).png";

function GuestLayout() {
  const location = useLocation();
  
  // Check if we're on a login page
  const isLoginPage = location.pathname === "/applicant/login" || location.pathname === "/employee/login";
  // Check if we're on a register page
  const isRegisterPage = location.pathname === "/applicant/register";
  // Check if we're on a verify page
  const isVerifyPage = location.pathname === "/applicant/verify";

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
              <NavLink
                to="/about"
                className={({ isActive }) =>
                  `pb-1 ${isActive ? "text-red-600 border-b-2 border-red-600" : "hover:text-gray-900 transition-colors"}`
                }
              >
                About
              </NavLink>
            </nav>

            {/* Right: Login */}
            <div className="flex items-center justify-end space-x-4">
              {!isLoginPage && !isRegisterPage && !isVerifyPage && (
                <NavLink
                  to="/applicant/login"
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Login
                </NavLink>
              )}
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
              <NavLink to="/terms-and-conditions" className="hover:text-gray-700 hover:underline">Terms &amp; Conditions</NavLink>
              <NavLink to="/privacy" className="hover:text-gray-700 hover:underline">Privacy</NavLink>
              <span className="text-gray-400">Copyright © 2025, Roadwise</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default GuestLayout;

