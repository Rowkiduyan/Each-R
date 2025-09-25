import React, { useState } from "react";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Link } from 'react-router-dom';

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
            <a href="#" className="text-gray-700 hover:text-red-600 font-medium">Home</a>
            <a href="/employees" className="text-gray-700 hover:text-red-600 font-medium">Employees</a>
            <Link to="/hr/recruitment" className="text-gray-700 hover:text-red-600 font-medium">Recruitment</Link>
            <Link to ="/hr/trainings" className="text-gray-700 hover:text-red-600 font-medium">Trainings/Seminars</Link>
            <a href="#" className="text-gray-700 hover:text-red-600 font-medium">Evaluation</a>
            <a href="#" className="text-gray-700 hover:text-red-600 font-medium">Seperation</a>
            <a href="#" className="text-gray-700 hover:text-red-600 font-medium">Notifications</a>
            <a href="#" className="text-gray-700 hover:text-red-600 font-medium">Logout</a>
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
        </div>
        
        
         <div className="md:w-1/3 w-full">
          <div className="bg-white rounded-lg shadow-md p-6 h-100">
            <h2 className="text-2xl font-bold text-black-600 mb-2">Interviews Schedule</h2>
            <Calendar
            onChange={setDate}
            value={date}
            className="w-full"
            />
            
          </div>
        </div>

        <div className="md:w-1/3 w-full">
          <div className="bg-white rounded-lg shadow-md p-6 h-100">
            <h2 className="text-2xl font-bold text-black-600 mb-2">Upcoming Birthdays</h2>
            <div className="flex flex-col gap-4 max-h-75 overflow-y-auto">

                <div className="bg-yellow-200 rounded shadow p-4">
                    <p className="text-gray-700">Alexis Enovy Drilon</p>
                    <p className="text-sm text-gray-500">Nov 11, 2025</p>
                </div>

            </div>
          </div>
        </div>

      </div>


</>
    
    );
} 
export default HrHome;