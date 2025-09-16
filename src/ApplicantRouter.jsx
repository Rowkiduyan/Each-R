import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ApplicantRegister from "./ApplicantRegister";
import ApplicantLogin from "./ApplicantLogin";

export default function ApplicantRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/applicant/register" element={<ApplicantRegister />} />
        <Route path="/applicant/login" element={<ApplicantLogin />} />
      </Routes>
    </Router>
  );
}