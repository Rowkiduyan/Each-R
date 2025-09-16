import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ApplicantRegister from "./ApplicantRegister";
import ApplicantLogin from "./ApplicantLogin";
import HrHome from "./HrHome";

function App() {
  return (
   <Router>
      <Routes>
        <Route path="/applicant/register" element={<ApplicantRegister />} />
        <Route path="/applicant/login" element={<ApplicantLogin />} />
        <Route path="/hr/home" element={<HrHome />} />
      </Routes>
    </Router>
  );
}

export default App;
