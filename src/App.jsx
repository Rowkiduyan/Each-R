import { Routes, Route } from "react-router-dom";
import ApplicantRegister from "./ApplicantRegister";
import ApplicantLogin from "./ApplicantLogin";
import HrHome from "./HrHome";
import VerifyAgency from "./VerifyAgency";
import DriverAddRecord from "./DriverAddRecord";

function App() {
  return (
    <Routes>
      <Route path="/" element={<ApplicantRegister />} /> {/* default route */}
      <Route path="/applicant/register" element={<ApplicantRegister />} />
      <Route path="/applicant/login" element={<ApplicantLogin />} />
      <Route path="/hr/home" element={<HrHome />} />
      <Route path="/verify/agency" element={<VerifyAgency />} />
      <Route path="/driver/add/record" element={<DriverAddRecord />} />
    </Routes>
  );
}

export default App;
