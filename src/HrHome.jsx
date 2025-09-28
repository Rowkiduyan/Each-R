import React, { useState } from "react";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Link } from 'react-router-dom';
import { NavLink } from "react-router-dom";

function HrHome() {
  const [date, setDate] = useState(new Date ());
  return (
<>
  <nav className="w-full bg-white shadow-md mb-6 ">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-25">
          <div className="flex-shrink-0 text-red-600 font-bold text-2xl italic">
            Each-R
          </div>
          <div className="flex space-x-6 ml-0 md:ml-32 lg:ml-10">
            <NavLink to = "/hr/home" className={({ isActive }) => `hover:text-red-600 ${
            isActive ? "text-red-600 font-semibold border-b-2 border-red-600" : "text-gray-700"
            }`}>Home</NavLink>
            <Link to="/employees" className="text-gray-700 hover:text-red-600 font-medium">Employees</Link>
            <Link to="/hr/recruitment" className="text-gray-700 hover:text-red-600 font-medium">Recruitment</Link>
            <Link to ="/hr/trainings" className="text-gray-700 hover:text-red-600 font-medium">Trainings/Seminars</Link>
            <Link to="/hr/eval" className="text-gray-700 hover:text-red-600 font-medium">Evaluation</Link>
            <Link to="/hr/seperation" className="text-gray-700 hover:text-red-600 font-medium">Separation</Link>
            <Link to ="/hr/notif" className="text-gray-700 hover:text-red-600 font-medium relative">
                    Notifications
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">3</span>
            </Link>
            <Link to="/employee/login" className="text-gray-700 hover:text-red-600 font-medium">Logout</Link>
          </div>
          <div className="flex items-center space-x-2 lg: ml-20 max-w-7xl">
            <span className="text-gray-700 font-semibold">Alexis Yvone</span>
          </div>
        </div>
      </div>
    </nav>

    <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row gap-6">
        <div className="md:w-1/3 w-full">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-black-600 mb-2">Welcome to your Homepage!</h2>
            <p className="text-gray-700">Here you can manage your HR tasks and view important updates.</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-2 mt-4">
            <h2 className="text-lg font-bold text-black-600 mb-2">HR Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="bg-gray-100 rounded-lg shadow p-2 text-center min-h-10 flex flex-col justify-center">
                <h3 className="text-xs font-semibold text-gray-800 break-words">Active Employees</h3>
                <p className="text-xs text-gray-600 mb-0.5">(Nationwide)</p>
                <p className="text-lg font-bold text-red-600">1,500</p>
              </div>
              <div className="bg-gray-100 rounded-lg shadow p-2 text-center min-h-10 flex flex-col justify-center">
                <h3 className="text-xs font-semibold text-gray-800 break-words">Active Employees</h3>
                <p className="text-xs text-gray-600 mb-0.5">(Pasig)</p>
                <p className="text-lg font-bold text-red-600">150</p>
              </div>
              <div className="bg-gray-100 rounded-lg shadow p-2 text-center min-h-10 flex flex-col justify-center">
                <h3 className="text-xs font-semibold text-gray-800 break-words">Pending Status</h3>
                <p className="text-xs text-gray-600 mb-0.5">(Pasig)</p>
                <p className="text-lg font-bold text-red-600">12</p>
              </div>
              <div className="bg-gray-100 rounded-lg shadow p-2 text-center min-h-10 flex flex-col justify-center">
                <h3 className="text-xs font-semibold text-gray-800 break-words">Agencies</h3>
                <p className="text-lg font-bold text-red-600">10</p>
              </div>
              <div className="bg-gray-100 rounded-lg shadow p-2 text-center min-h-10 flex flex-col justify-center">
                <h3 className="text-xs font-semibold text-gray-800 break-words">Applications</h3>
                <p className="text-xs text-gray-600 mb-0.5">(Direct)</p>
                <p className="text-lg font-bold text-red-600">15</p>
              </div>
              <div className="bg-gray-100 rounded-lg shadow p-2 text-center min-h-10 flex flex-col justify-center">
                <h3 className="text-xs font-semibold text-gray-800 break-words">Applications</h3>
                <p className="text-xs text-gray-600 mb-0.5">(Agencies)</p>
                <p className="text-lg font-bold text-red-600">15</p>
              </div>
            </div>
          </div>
        </div>
        
        
         <div className="md:w-1/3 w-full">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-black-600 mb-2">Interviews Schedule</h2>
            <Calendar
            onChange={setDate}
            value={date}
            className="w-full"
            />
            
          </div>
        </div>

        <div className="md:w-1/3 w-full">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-black-600 mb-2">Upcoming Birthdays</h2>
            <div className="flex flex-col gap-4 max-h-75 overflow-y-auto">

                <div className="bg-yellow-200 rounded shadow p-4">
                    <p className="text-gray-700">Alexis Enovy Drilon</p>
                    <p className="text-sm text-gray-500">Nov 11, 2025</p>
                </div>

                <div className="bg-yellow-200 rounded shadow p-4">
                    <p className="text-gray-700">Chales Roque</p>
                    <p className="text-sm text-gray-500">Jan 32, 2025</p>
                </div>

                <div className="bg-yellow-200 rounded shadow p-4">
                    <p className="text-gray-700">Lorenz Adalem</p>
                    <p className="text-sm text-gray-500">Nov 26, 2025</p>
                </div>

                <div className="bg-yellow-200 rounded shadow p-4">
                    <p className="text-gray-700">Angel Artiaga</p>
                    <p className="text-sm text-gray-500">Oct 27, 2025</p>
                </div>

            </div>
          </div>
        </div>

      </div>


</>
    
    );
} 
export default HrHome;