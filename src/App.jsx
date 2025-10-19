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
import RequireRole from "./RequireRole";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<ApplicantGHome />} />
        <Route path="/applicant/register" element={<ApplicantRegister />} />
        <Route path="/applicant/verify" element={<VerifyEmail />} />
        <Route path="/applicant/login" element={<ApplicantLogin />} />

        {/* HR protected routes */}
        <Route
          path="/hr/home"
          element={
            <RequireRole role="HR">
              <HrHome />
            </RequireRole>
          }
        />
        <Route
          path="/hr/trainings"
          element={
            <RequireRole role="HR">
              <HrTrainings />
            </RequireRole>
          }
        />
        <Route
          path="/hr/recruitment"
          element={
            <RequireRole role="HR">
              <HrRecruitment />
            </RequireRole>
          }
        />
        <Route
          path="/hr/eval"
          element={
            <RequireRole role="HR">
              <HrEval />
            </RequireRole>
          }
        />
        <Route
          path="/hr/seperation"
          element={
            <RequireRole role="HR">
              <HrSeperation />
            </RequireRole>
          }
        />
        <Route
          path="/hr/notif"
          element={
            <RequireRole role="HR">
              <HrNotif />
            </RequireRole>
          }
        />
        <Route
          path="/hr/create/job"
          element={
            <RequireRole role="HR">
              <HrCreateJob />
            </RequireRole>
          }
        />
        <Route
          path="/hr/recruitment/applicant/:id"
          element={
            <RequireRole role="HR">
              <ApplicantDetails />
            </RequireRole>
          }
        />

        {/* Employee protected routes */}
        <Route
          path="/employee/home"
          element={
            <RequireRole role="Employee">
              <EmHome />
            </RequireRole>
          }
        />
        <Route
          path="/employee/trainings"
          element={
            <RequireRole role="Employee">
              <EmployeeTrainings />
            </RequireRole>
          }
        />
        <Route
          path="/employee/notif"
          element={
            <RequireRole role="Employee">
              <EmployeeNotif />
            </RequireRole>
          }
        />
        <Route
          path="/employee/profile"
          element={
            <RequireRole role="Employee">
              <EmProfile />
            </RequireRole>
          }
        />
        <Route
          path="/employee/separation"
          element={
            <RequireRole role="Employee">
              <EmployeeSeparation />
            </RequireRole>
          }
        />

        {/* Public routes (no protection) */}
        <Route path="/employee/login" element={<EmployeeLogin />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/driver/add/record" element={<DriverAddRecord />} />
        <Route path="/applicantg/home" element={<ApplicantGHome />} />
        <Route path="/applicantl/home" element={<ApplicantLHome />} />
        <Route path="/applicant/applications" element={<ApplicantApplications />} />
        <Route path="/agency/home" element={<AgencyHome />} />
        <Route path="/admin/home" element={<AdminHome />} />

        {/* Default */}
        <Route path="/not-authorized" element={<div>Not authorized</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

