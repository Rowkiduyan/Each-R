import { Routes, Route } from "react-router-dom";
import ApplicantRegister from "./ApplicantRegister";
import ApplicantLogin from "./ApplicantLogin";
import AgencyEndorse from "./AgencyEndorse";
import Employees from "./Employees";
import ApplicantGHome from "./ApplicantGHome";
import ApplicantLHome from "./ApplicantLHome";
import EmployeeLogin from "./EmployeeLogin";
import AdminHome from "./AdminHome";
import HrTrainings from "./HrTrainings";
import EmployeeTrainings from "./EmployeeTrainings";
import HrRecruitment from "./HrRecruitment";
import HrRequirements from "./HrRequirements";
import ApplicantDetails from "./ApplicantDetails";
import HrEval from "./HrEval";
import HrSeperation from "./HrSeperation";
import HrSched from "./HrSched";
import HrNotif from "./HrNotif";
import EmployeeNotif from "./EmployeeNotif";
import EmProfile from "./EmProfile";
import ApplicantApplications from "./ApplicantApplications";
import EmployeeSeparation from "./EmployeeSeparation";
import EmployeeRequirements from "./EmployeeRequirements";
import EmployeeEval from "./EmployeeEval";
import AgencyHome from "./AgencyHome";
import AgencyEndorsements from "./AgencyEndorsements";
import AgencyRequirements from "./AgencyRequirements";
import AgencyTrainings from "./AgencyTrainings";
import AgencyEval from "./AgencyEval";
import AgencySeparation from "./AgencySeparation";
import AgencyLayout from "./layouts/AgencyLayout";
import HrCreateJob from "./HrCreateJob";
import HrPost from "./HrPost";
import VerifyEmail from "./VerifyEmail";
import ResetPassword from "./ResetPassword";
import RequireRole from "./RequireRole";
import HRLayout from "./layouts/HRLayout";
import AdminLayout from "./layouts/AdminLayout";
import EmployeeLayout from "./layouts/EmployeeLayout";
import GuestLayout from "./layouts/GuestLayout";
import ApplicantLayout from "./layouts/ApplicantLayout";
import AdminCreate from "./AdminCreate";
import AdminEnableDisable from "./AdminEnableDisable";
import TermsAndPrivacy from "./TermsAndPrivacy";
import AccountSettings from "./AccountSettings";
import AgencyProfile from "./AgencyProfile";



function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/terms-and-privacy" element={<TermsAndPrivacy />} />

      {/* HR protected routes */}
      <Route
        path="/hr"
        element={
          <RequireRole role={["HR", "HRC"]}>
            <HRLayout />
          </RequireRole>
        }
      >
        <Route index element={<HrRecruitment />} />
        <Route path="home" element={<HrRecruitment />} />
        <Route path="schedules" element={<HrSched />} />
        <Route path="trainings" element={<HrTrainings />} />
        <Route path="recruitment" element={<HrRecruitment />} />
        <Route path="recruitment/job/:id" element={<HrPost />} />
        <Route path="recruitment/job/all" element={<HrPost />} />
        <Route path="requirements" element={<HrRequirements />} />
        <Route path="eval" element={<HrEval />} />
        <Route path="seperation" element={<HrSeperation />} />
        <Route path="notif" element={<HrNotif />} />
        <Route path="create/job" element={<HrCreateJob />} />
        <Route path="recruitment/applicant/:id" element={<ApplicantDetails />} />
        <Route path="employees" element={<Employees />} />
        <Route path="account-settings" element={<AccountSettings />} />
      </Route>
      
      
      
     
  

      {/* Employee protected routes */}
      <Route
        path="/employee"
        element={
          <RequireRole role="Employee">
            <EmployeeLayout />
          </RequireRole>
        }
      >
        <Route index element={<EmployeeRequirements />} />
        <Route path="requirements" element={<EmployeeRequirements />} />
        <Route path="trainings" element={<EmployeeTrainings />} />
        <Route path="evaluation" element={<EmployeeEval />} />
        <Route path="separation" element={<EmployeeSeparation />} />
        <Route path="notif" element={<EmployeeNotif />} />
        <Route path="profile" element={<EmProfile />} />
        <Route path="account-settings" element={<AccountSettings />} />
      </Route>

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
        <Route path="create" element={<AdminCreate />} />
        <Route path="enable-disable" element={<AdminEnableDisable />} />
        <Route path="account-settings" element={<AccountSettings />} />
      </Route>

      {/* Applicant routes (public, but with layout) */}
      <Route path="/" element={<GuestLayout />}>
        <Route index element={<ApplicantGHome />} />
        <Route path="applicantg/home" element={<ApplicantGHome />} />
        <Route path="applicant/login" element={<ApplicantLogin />} />
        <Route path="applicant/register" element={<ApplicantRegister />} />
        <Route path="applicant/verify" element={<VerifyEmail />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="employee/login" element={<EmployeeLogin />} />
      </Route>

      {/* Applicant logged-in routes (with ApplicantLayout) */}
      <Route element={<ApplicantLayout />}>
        <Route path="/applicantl/home" element={<ApplicantLHome />} />
        <Route path="/applicant/applications" element={<ApplicantApplications />} />
        <Route path="/applicant/account-settings" element={<AccountSettings />} />
      </Route>

      {/* Agency protected routes */}
      <Route 
        path="/agency" 
        element={
          <RequireRole role="Agency">
            <AgencyLayout />
          </RequireRole>
        }
      >
        <Route path="home" element={<AgencyHome />} />
        <Route path="endorse" element={<AgencyEndorse />} />
        <Route path="endorsements" element={<AgencyEndorsements />} />
        <Route path="requirements" element={<AgencyRequirements />} />
        <Route path="trainings" element={<AgencyTrainings />} />
        <Route path="evaluation" element={<AgencyEval />} />
        <Route path="separation" element={<AgencySeparation />} />
        <Route path="profile" element={<AgencyProfile />} />
        <Route path="account-settings" element={<AccountSettings />} />
      </Route>

      {/* Default */}
      <Route path="/not-authorized" element={<div>Not authorized</div>} />
    </Routes>
  );
}

export default App;
