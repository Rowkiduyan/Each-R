import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // ✅ Import BrowserRouter
import './index.css';
import App from './App.jsx';
import ApplicantGHome from './ApplicantGHome.jsx';
// import ApplicantLogin from "./ApplicantLogin.jsx";
// import HrHome from './HrHome';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter> {/* ✅ Wrap App with BrowserRouter once */}
      <ApplicantGHome />
    </BrowserRouter>
  </StrictMode>
);

