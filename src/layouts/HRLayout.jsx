import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate, Outlet } from "react-router-dom";

export default function HRLayout() {
  const [hrUser, setHrUser] = useState(null);
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

              <NavLink to="/employees" className={({ isActive }) =>
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
              
              <NavLink to="/hr/notif" className={({ isActive }) =>
              `hover:text-red-600 ${isActive ? "text-red-600 font-semibold border-b-2 border-red-600" : "text-gray-700 font-medium"
                }`
              }
              >
                Notifications
              </NavLink>
            </div>

            <div className="flex items-center space-x-10">
              <span className="text-red-600 font-semibold">{hrUser?.first_name && hrUser?.last_name ? `${hrUser.first_name} ${hrUser.last_name}`: hrUser?.email}</span>
              <button onClick={handleLogout} className="text-gray-700 hover:text-red-600 font-medium">Logout</button>
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