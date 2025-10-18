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
import HrRecruitment from "./HrRecruitment";
import ApplicantDetails from "./ApplicantDetails";
import HrEval from "./HrEval";
import HrSeperation from "./HrSeperation";
import HrNotif from "./HrNotif";
import EmployeeNotif from "./EmployeeNotif";
import EmProfile from "./EmProfile";
import ApplicantApplications from "./ApplicantApplications";
import EmployeeSeparation from "./EmployeeSeparation";
import AgencyHome from "./AgencyHome";
import HrCreateJob from "./HrCreateJob";
import VerifyEmail from "./VerifyEmail";


function App() {
  return (
    <Routes>
      <Route path="/" element={<ApplicantGHome />} />
      <Route path="/applicant/register" element={<ApplicantRegister />} />
      <Route path="/applicant/verify" element={<VerifyEmail />} />
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
      <Route path="/hr/recruitment" element={<HrRecruitment />} />
      <Route path="/hr/eval" element={<HrEval />} />
      <Route path="/hr/seperation" element={<HrSeperation />} />
      <Route path="/hr/notif" element={<HrNotif />} />
      <Route path="/employee/notif" element={<EmployeeNotif />} />
      <Route path="/employee/profile" element={<EmProfile />} />
      <Route path="/applicant/applications" element={<ApplicantApplications />} />
      <Route path="/employee/separation" element={<EmployeeSeparation />} />
      <Route path="/agency/home" element={<AgencyHome />} />
      <Route path="/hr/create/job" element={<HrCreateJob />} />
      {/* ✅ Fixed route for applicant details */}
      <Route path="/hr/recruitment/applicant/:id" element={<ApplicantDetails />} />
    </Routes>
  );
}

export default App;
