import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "./supabaseClient";

function HrHome() {
  const [date, setDate] = useState(new Date());
  const [hrUser, setHrUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // const [jwtRoles, setJwtRoles] = useState(null); // <- shows what Supabase sees in your JWT
  const navigate = useNavigate();
  const location = useLocation();

//   useEffect(() => {
//   (async () => {
//     const { data, error } = await supabase.auth.getUser();
//     console.log("Supabase User:", data?.user);
//     console.log("app_metadata.role:", data?.user?.app_metadata?.role);
//     console.log("user_metadata.role:", data?.user?.user_metadata?.role);
//   })();
// }, []);




  useEffect(() => {
    try {
      // debug: show where we came from
      console.log("HrHome mounted. location:", location?.pathname, location?.state);

      const stored = localStorage.getItem("loggedInHR");
      console.log("localStorage.loggedInHR raw:", stored);

      if (stored) {
        // parse safely
        try {
          const parsed = JSON.parse(stored);
          console.log("parsed loggedInHR:", parsed);
          setHrUser(parsed);
        } catch (parseErr) {
          console.error("Failed to parse loggedInHR from localStorage:", parseErr);
          // clear corrupted storage to avoid loops
          localStorage.removeItem("loggedInHR");
        }
      } else {
        console.warn("No loggedInHR found in localStorage. Redirecting to login.");
        // small timeout to allow console messages to be readable
        setTimeout(() => navigate("/employee/login"), 200);
      }
    } catch (err) {
      console.error("Unexpected error in HrHome useEffect:", err);
    } finally {
      setLoading(false);
    }
  }, [navigate, location]);

  // 🔍 Check the actual logged-in user role directly from Supabase
useEffect(() => {
  (async () => {
    try {
      // 🔹 Run who_am_i() from the backend to see what your JWT actually contains
      const { data, error } = await supabase.rpc("who_am_i");

      if (error) {
        console.error("who_am_i() failed:", error.message);
        return;
      }

      console.log("🔍 who_am_i() result:", data);
    } catch (e) {
      console.error("Unexpected error running who_am_i():", e);
    }
  })();
}, []);

useEffect(() => {
  (async () => {
    const { data, error } = await supabase.rpc("who_am_i");
    if (error) {
      console.error("who_am_i error:", error);
    } else {
      console.log("who_am_i result:", data);
    }
  })();
}, []);




  

  // // 🔎 Debug: ask Supabase what role the backend sees in your JWT
  // useEffect(() => {
  //   (async () => {
  //     try {
  //       const { data, error } = await supabase.rpc("debug_claims");
  //       if (error) {
  //         console.error("debug_claims failed:", error);
  //         setJwtRoles({ error: error.message });
  //         return;
  //       }
  //       console.log("JWT app_metadata.role:", data?.app_metadata?.role);
  //       console.log("JWT user_metadata.role:", data?.user_metadata?.role);
  //       setJwtRoles({
  //         app: data?.app_metadata?.role || "(none)",
  //         user: data?.user_metadata?.role || "(none)",
  //       });
  //     } catch (e) {
  //       console.error("debug_claims threw:", e);
  //       setJwtRoles({ error: String(e?.message || e) });
  //     }
  //   })();
  // }, []);

  // const handleLogout = () => {
  //   localStorage.removeItem("loggedInHR");
  //   navigate("/employee/login");
  // };

  // Defensive render: show loading / error message instead of blank white page
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading HR dashboard…</p>
      </div>
    );
  }

  if (!hrUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">You are not logged in as HR.</p>
          <button
            onClick={() => navigate("/employee/login")}
            className="bg-red-600 text-white px-4 py-2 rounded"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 mb-4">
        <Link
          to="/hr/create/job"
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          + Create Job Post
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row gap-6">
        <div className="md:w-1/3 w-full">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-black-600 mb-2">
              Welcome to your Homepage!
            </h2>
            <p className="text-gray-700">
              Here you can manage your HR tasks and view important updates.
            </p>
            <p className="mt-3 text-sm text-gray-500">
              Signed in as: <strong>{hrUser?.email}</strong>
            </p>
          </div>

          {/* ... rest of your static cards (kept unchanged) ... */}
        </div>

        <div className="md:w-1/3 w-full">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-black-600 mb-2">Interviews Schedule</h2>
            <Calendar onChange={setDate} value={date} className="w-full" />
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
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default HrHome;
