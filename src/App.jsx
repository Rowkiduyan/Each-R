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
import ManageAccounts from "./ManageAccounts";
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
import AgencyEndorsements from "./AgencyEndorsements";
import AgencyTrainings from "./AgencyTrainings";
import AgencyEval from "./AgencyEval";
import AgencySeparation from "./AgencySeparation";
import HrCreateJob from "./HrCreateJob";
import VerifyEmail from "./VerifyEmail";
import RequireRole from "./RequireRole";
import HRLayout from "./layouts/HRLayout";
import AdminLayout from "./layouts/AdminLayout";
import TermsAndPrivacy from "./TermsAndPrivacy";



function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<ApplicantGHome />} />
      <Route path="/applicant/register" element={<ApplicantRegister />} />
      <Route path="/applicant/verify" element={<VerifyEmail />} />
      <Route path="/applicant/login" element={<ApplicantLogin />} />
      <Route path="/terms-and-privacy" element={<TermsAndPrivacy />} />

      {/* HR protected routes */}
      <Route
        path="/hr"
        element={
          <RequireRole role="HR">
            <HRLayout />
          </RequireRole>
        }
      >
        <Route path="home" element={<HrHome />} />
        <Route path="trainings" element={<HrTrainings />} />
        <Route path="recruitment" element={<HrRecruitment />} />
        <Route path="eval" element={<HrEval />} />
        <Route path="seperation" element={<HrSeperation />} />
        <Route path="notif" element={<HrNotif />} />
        <Route path="create/job" element={<HrCreateJob />} />
        <Route path="recruitment/applicant/:id" element={<ApplicantDetails />} />
        <Route path="employees" element={<Employees />} />
        <Route path="employee/details" element={<EmployeeDetails />} />
      </Route>
      
      
      
     
  

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

      {/* Admin protected routes */}
      <Route
        path="/admin"
        element={
          <RequireRole role="Admin">
            <AdminLayout />
          </RequireRole>
        }
        >
        <Route path="home" element={<AdminHome />} />
        <Route path="accounts" element={<ManageAccounts />} />
      </Route>      {/* Public routes (no protection) */}
      <Route path="/employee/login" element={<EmployeeLogin />} />
      <Route path="/driver/add/record" element={<DriverAddRecord />} />
      <Route path="/applicantg/home" element={<ApplicantGHome />} />
      <Route path="/applicantl/home" element={<ApplicantLHome />} />
      <Route path="/applicant/applications" element={<ApplicantApplications />} />
      <Route path="/agency/home" element={<AgencyHome />} />
      <Route path="/agency/endorsements" element={<AgencyEndorsements />} />
      <Route path="/agency/trainings" element={<AgencyTrainings />} />
      <Route path="/agency/evaluation" element={<AgencyEval />} />
      <Route path="/agency/separation" element={<AgencySeparation />} />

      {/* Default */}
      <Route path="/not-authorized" element={<div>Not authorized</div>} />
    </Routes>
  );
}

export default App;
