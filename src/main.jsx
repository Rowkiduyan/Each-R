import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
//import ApplicantLogin from "./ApplicantLogin.jsx";//
import HrHome from "./HrHome.jsx";
//import EmHome from './EmHome';//
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
