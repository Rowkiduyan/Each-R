import { Routes, Route } from "react-router-dom";
import ApplicantRegister from "./ApplicantRegister";
import ApplicantLogin from "./ApplicantLogin";
import HrHome from "./HrHome";
import DriverAddRecord from "./DriverAddRecord";
import Employees from "./Employees";
import ApplicantGHome from "./ApplicantGHome";
import ApplicantLHome from "./ApplicantLHome";
import EmployeeDetails from "./EmployeeDetails"; 
import EmployeeLogin from "./EmployeeLogin";
import EmHome from "./EmHome";
import AdminHome from "./AdminHome";
import HrTrainings from "./HrTrainings";
import EmployeeTrainings from "./EmployeeTrainings";
import EmployeeNotif from "./EmployeeNotif";
import EmpProfile from "./EmProfile";
import HrNotif from "./HrNotif";
import HrEval from "./HrEval";

function App() {
  return (
    <Routes>
      <Route path="/" element={<ApplicantGHome />} />
      <Route path="/applicant/register" element={<ApplicantRegister />} />
      <Route path="/applicant/login" element={<ApplicantLogin />} />
      <Route path="/hr/home" element={<HrHome />} />
      <Route path="/driver/add/record" element={<DriverAddRecord />} />
      <Route path="/employees" element={<Employees />} />
      <Route path="/applicantg/home" element={<ApplicantGHome />} />
      <Route path="/applicantl/home" element={<ApplicantLHome />} />
      <Route path="/employee/details" element={<EmployeeDetails />} />
      <Route path="/employee/login" element={<EmployeeLogin />} />
      <Route path="/employee/home" element={<EmHome />} />
      <Route path="/admin/home" element={<AdminHome />} />
      <Route path="/hr/trainings" element={<HrTrainings />} />
      <Route path="/employee/trainings" element={<EmployeeTrainings />} />
      <Route path="/employee/notif" element={<EmployeeNotif />} />
      <Route path="/employee/profile" element={<EmpProfile />} />
      <Route path="/hr/notif" element={<HrNotif />} />
      <Route path="/hr/eval" element={<HrEval />} />
    </Routes>
  );
}

export default App;
