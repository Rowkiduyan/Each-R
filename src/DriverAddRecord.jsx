// DriverAddRecord.jsx
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";
import Logo from "./Logo.png";

function DriverAddRecord() {
  const [step, setStep] = useState(1);
  const location = useLocation();
  const navigate = useNavigate();
  const job = location.state?.job;

  // applicants + active applicant
  const [applicants, setApplicants] = useState([
    { id: 1, name: "Applicant 1" },
    { id: 2, name: "Applicant 2" },
  ]);
  const [activeApplicant, setActiveApplicant] = useState(1);

  // helper to create an empty values object for each applicant
  const makeEmptyValues = () => ({
    // Step 1 - Employment & personal
    department: "",
    position: "",
    depot: "",
    dateAvailable: "",
    employed: "no",

    lastName: "",
    firstName: "",
    middleName: "",
    birthday: "",
    maritalStatus: "",
    sex: "",

    // Address
    residenceNo: "",
    street: "",
    city: "",
    zip: "",

    // Alternative Address
    residenceNoAlt: "",
    streetAlt: "",
    cityAlt: "",
    zipAlt: "",

    // Contact
    contactNumber: "",
    email: "",

    // Step 2 - education & skills
    education: "",
    secondarySchool: "",
    secondaryYear: "",
    tertiarySchool: "",
    tertiaryYear: "",
    tertiaryProgram: "",
    graduateSchool: "",
    graduateYear: "",
    graduateProgram: "",
    specializedTraining: "",
    specializedYear: "",
    skills: "",

    // Step 3 - license
    licenseExpiry: "",
    licenseClassification: "",
    // restriction codes (array)
    restrictionCodes: [],

    // Step 4 - driving history
    yearsDriving: "",
    truckKnowledge: "no",
    troubleshootingTasks: [],

    // Medical / drug test
    takingMedications: false,
    medicationReason: "",
    tookMedicalTest: false,
    medicalTestDate: "",

    // Vehicle types
    vehicleTypes: [],

    // Step 5 - will still use the separate workExperiences state
  });

  // formValues stored per applicant id
  const [formValues, setFormValues] = useState(() => {
    const init = {};
    applicants.forEach((a) => {
      init[a.id] = makeEmptyValues();
    });
    return init;
  });

  // work experiences kept as separate state (array of objects)
  const [workExperiences, setWorkExperiences] = useState([
    { date: "", company: "", role: "", notes: "", tasks: "", reason: "" },
  ]);

  // helpers to manage applicants
  const addApplicant = () => {
    const newId = applicants.length + 1;
    setApplicants((prev) => [...prev, { id: newId, name: `Applicant ${newId}` }]);
    setFormValues((prev) => ({ ...prev, [newId]: makeEmptyValues() }));
    setActiveApplicant(newId);
  };

  const removeApplicant = (id) => {
    if (applicants.length === 1) return;
    const filtered = applicants.filter((a) => a.id !== id);
    setApplicants(filtered);
    setFormValues((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    if (activeApplicant === id) {
      setActiveApplicant(filtered[0].id);
    }
  };

  // work experience helpers
  const addWorkExperience = () =>
    setWorkExperiences((prev) => [...prev, { date: "", company: "", role: "", notes: "", tasks: "", reason: "" }]);

  const removeWorkExperience = (index) =>
    setWorkExperiences((prev) => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });

  const updateWorkExperience = (index, updatedExp) =>
    setWorkExperiences((prev) => {
      const copy = [...prev];
      copy[index] = updatedExp;
      return copy;
    });

  // change handler for controlled inputs
  const handleChange = (appId, key, value) => {
    setFormValues((prev) => ({
      ...prev,
      [appId]: {
        ...(prev[appId] || makeEmptyValues()),
        [key]: value,
      },
    }));
  };

  // multi-checkbox helpers (for arrays in state)
  const toggleArrayValue = (appId, key, value) => {
    setFormValues((prev) => {
      const arr = new Set((prev[appId]?.[key] || []).slice());
      if (arr.has(value)) arr.delete(value);
      else arr.add(value);
      return {
        ...prev,
        [appId]: { ...(prev[appId] || makeEmptyValues()), [key]: Array.from(arr) },
      };
    });
  };

  // simple toggle for boolean flags
  const toggleFlag = (appId, key) => {
    setFormValues((prev) => ({
      ...prev,
      [appId]: { ...(prev[appId] || makeEmptyValues()), [key]: !prev[appId]?.[key] },
    }));
  };

  // pagination steps
  const nextStep = () => setStep((s) => Math.min(s + 1, 5));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  // // get agency profile id (same as before)
  // async function getCurrentAgencyProfileId() {
  //   try {
  //     const { data: userData, error: userErr } = await supabase.auth.getUser();
  //     if (userErr) console.error("auth.getUser error", userErr);
  //     const userId = userData?.user?.id;
  //     if (!userId) return null;
  //     const { data: profile, error } = await supabase.from("profiles").select("id").eq("id", userId).single();
  //     if (error) {
  //       console.error("profiles lookup error", error);
  //       return null;
  //     }
  //     return profile?.id ?? null;
  //   } catch (err) {
  //     console.error("getCurrentAgencyProfileId", err);
  //     return null;
  //   }
  // }

  // Endorse handler (reads from formValues[activeApplicant])
// inside DriverAddRecord.jsx - replace existing handleEndorse with this
// improved handleEndorse — more verbose logging
const handleEndorse = async () => {
  const vals = formValues[activeApplicant] || makeEmptyValues();
  const fname = vals.firstName || "";
  const lname = vals.lastName || "";
  const mname = vals.middleName || "";
  const email = vals.email || "";
  const contact = vals.contactNumber || "";
  const position = vals.position || null;
  const depot = vals.depot || null;

  if (!fname || !lname || !email) {
    alert("Please fill required fields before endorsing: First Name, Last Name, Email.");
    return;
  }
  if (!confirm(`Endorse ${fname} ${lname} to HR?`)) return;

  try {
    // get current auth user (this id must satisfy applications.user_id FK)
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    console.log("auth.getUser ->", { authData, authErr });
    if (authErr || !authData?.user?.id) {
      console.error("Couldn't get auth user id", authErr);
      alert("Could not identify logged-in user. Are you signed in?");
      return;
    }
    const authUserId = authData.user.id;

    // optional: fetch profile row to also store profile id if you need it
    const { data: profileRow, error: profileErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", authUserId)
      .maybeSingle();
    console.log("profile lookup ->", { profileRow, profileErr });
    const agencyProfileId = profileRow?.id ?? null;

    const payload = {
      applicant: vals,
      workExperiences,
      meta: {
        source: "agency",
        endorsed_by_profile_id: agencyProfileId,
        endorsed_by_auth_user_id: authUserId,
        endorsed_at: new Date().toISOString(),
        job_id: job?.id || null,
      },
    };

    // 1) insert into recruitment_endorsements
    const { data: endorsement, error: errEndorse } = await supabase
      .from("recruitment_endorsements")
      .insert([
        {
          agency_profile_id: agencyProfileId,
          fname,
          lname,
          mname: mname || null,
          contact_number: contact || null,
          email,
          position: position || null,
          department: vals.department || null,
          depot: depot || null,
          date_available: vals.dateAvailable || null,
          payload,
          status: "pending",
        },
      ])
      .select()
      .single();

    console.log("recruitment_endorsements insert ->", { endorsement, errEndorse });
    if (errEndorse) {
      console.error("Endorse insert error", errEndorse);
      alert("Failed to create endorsement. See console for details.");
      return;
    }

    // 2) insert into applications — use authUserId for user_id (auth.users.id)
    const appRow = {
      user_id: authUserId,
      job_id: job?.id || null,
      payload,
      status: "submitted",
    };

    const appInsertResp = await supabase
      .from("applications")
      .insert([appRow])
      .select()
      .single();

    // appInsertResp contains { data, error } — log both
    console.log("applications insert ->", appInsertResp);

    if (appInsertResp.error) {
      console.error("Applications insert failed:", appInsertResp.error);
      // rollback endorsement (best-effort)
      try {
        const { error: delErr } = await supabase
          .from("recruitment_endorsements")
          .delete()
          .eq("id", endorsement.id);
        console.log("rollback delete endorsement ->", { delErr });
      } catch (delErr) {
        console.error("Rollback delete failed:", delErr);
      }
      alert("Failed to create application. Endorsement rolled back. See console.");
      return;
    }

    // success
    alert("Successfully endorsed. Saved to Recruitment and Applications.");
    navigate("/recruitment");
  } catch (err) {
    console.error("unexpected endorse error", err);
    alert("An unexpected error occurred. Check console.");
  }
};



  // current applicant values
  const fv = formValues[activeApplicant] || makeEmptyValues();

  // lists used in UI
  const restrictionCodesList = [
    "A - MOTORCYCLE",
    "1 - MOTORCYLES / MOTORIZED TRICYCLE",
    "A1 - TRICYLE",
    "2 - VEHICLE UP TO 4500 GVW",
    "B - UP TO 5000 KGS GVW / 8 SEATS",
    "3 - VEHICLE ABOVE 4500 GVW *",
    "B1 - UP TO 5000 KGS GVW / 9 OR MORE SEATS",
    "4 - AUTOMATIC CLUTCH UP TO 4500 GVW",
    "B2 - GOODS < 3500 KGS GVW *",
    "5 - AUTOMATIC CLUTCH UP ABOVE 4500 GVW",
    "C - GOODS > 3500 KGS GVW *",
    "6 - ARTICULATED VEHICLE 1600 GVW AND BELOW",
    "D - BUS > 5000 KGS GVW / 9 OR MORE SEATS",
    "7 - ARTICULATED VEHICLE 1601 UP TO 4500 GVW",
    "BE - TRAILERS < 3500 KGS",
    "8 - ARTICULATED VEHICLE 4501 & ABOVE GVW",
    "CE - ARTICULATED C > 3500 KGS COMBINED GVW",
  ];

  const troubleshootingTasksList = [
    "Replacing lights or bulbs for the headlights, brake lights, etc.",
    "Adding brake fluid.",
    "Adding engine oil.",
    "Adding power steering fluid.",
    "Adjusting the engine belt.",
    "Replacing the tire.",
    "No knowledge of basic troubleshooting.",
  ];

  const vehicleTypesList = ["Sedan or Car", "Van", "L300", "Hino / Canter (4 wheels - 6 wheels)", "10 Wheeler", "None"];

  return (
    <div className="min-h-screen bg-neutral-100 p-6 space-y-6">
      {/* Selected Job Post */}
      {job && (
        <div className="bg-white p-4 rounded shadow border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-block bg-red-600 text-white text-xs font-bold px-3 py-1 rounded">URGENT HIRING!</div>
              <h2 className="text-xl font-bold text-gray-800 mt-2">{job.title}</h2>
              <div className="text-sm text-gray-600">{job.depot} • Posted {job.posted}</div>
              {job.description && <p className="text-gray-700 mt-3">{job.description}</p>}
              {Array.isArray(job.responsibilities) && job.responsibilities.length > 0 && (
                <div className="mt-3">
                  <h4 className="font-semibold text-gray-800 mb-1">Main Responsibilities</h4>
                  <ul className="text-sm text-gray-700 space-y-1">{job.responsibilities.map((r, i) => <li key={i}>• {r}</li>)}</ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <img src={Logo} alt="Roadwise Logo" className="w-20 h-auto" />
        <button className="bg-red-600 text-white font-bold py-2 px-4 rounded hover:bg-red-700">+ Import File</button>
      </div>

      <h1 className="text-4xl font-bold">Good afternoon, Agency!</h1>
      <p>Add a record below, to endorse an Employee to HR Roadwise. Check your email for any updates.</p>

      {/* Tabs header */}
      <div className="flex justify-between items-center bg-red-600 text-white px-4 py-2 rounded-t">
        <span className="font-semibold">Add a Record</span>
      </div>

      {/* Applicant Tabs */}
      <div className="flex items-center border border-t-0 border-gray-300 p-2 space-x-2">
        {applicants.map((applicant) => (
          <div key={applicant.id} className="relative inline-block">
            <button className={`px-3 py-1 rounded ${activeApplicant === applicant.id ? "bg-blue-500 text-white" : "bg-gray-200"}`} onClick={() => setActiveApplicant(applicant.id)}>{applicant.name}</button>
            {applicants.length > 1 && (
              <button onClick={() => removeApplicant(applicant.id)} className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-700">×</button>
            )}
          </div>
        ))}
        <button className="px-3 py-1 text-blue-500 underline" onClick={addApplicant}>+ Add Another Employee</button>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <>
          <div className="bg-white p-4 rounded shadow space-y-4">
            <h2 className="text-lg font-semibold">Employment Details for {`Applicant ${activeApplicant}`}</h2>
            <div className="grid grid-cols-4 gap-4">
              <select className="p-2 border rounded" value={fv.department} onChange={(e) => handleChange(activeApplicant, "department", e.target.value)}>
                <option value="">Select Department</option>
                <option>Operations</option>
                <option>HR</option>
                <option>Admin</option>
                <option>Delivery Crew</option>
              </select>

              <select className="p-2 border rounded" value={fv.position} onChange={(e) => handleChange(activeApplicant, "position", e.target.value)}>
                <option value="">Select Position</option>
                <option>Delivery Driver</option>
                <option>Delivery Helper</option>
                <option>Driver</option>
                <option>Security Personnel</option>
              </select>

              <select className="p-2 border rounded" value={fv.depot} onChange={(e) => handleChange(activeApplicant, "depot", e.target.value)}>
                <option value="">Select Depot Assignment</option>
                <option>Pasig</option>
                <option>Cebu</option>
                <option>Butuan</option>
                <option>Manila</option>
                <option>Quezon City</option>
                <option>Taguig</option>
                {/* add other depots as needed */}
              </select>

              <input type="date" className="p-2 border rounded" value={fv.dateAvailable || ""} onChange={(e) => handleChange(activeApplicant, "dateAvailable", e.target.value)} />
            </div>

            <div>
              <label className="mr-2">Currently Employed?</label>
              <label className="mr-3">
                <input type="radio" name={`employed-${activeApplicant}`} className="ml-2" checked={fv.employed === "yes"} onChange={() => handleChange(activeApplicant, "employed", "yes")} /> Yes
              </label>
              <label>
                <input type="radio" name={`employed-${activeApplicant}`} className="ml-4" checked={fv.employed !== "yes"} onChange={() => handleChange(activeApplicant, "employed", "no")} /> No
              </label>
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-white p-4 rounded shadow space-y-4">
            <h2 className="text-lg font-semibold">Personal Information</h2>
            <div className="grid grid-cols-3 gap-4">
              <input className="p-2 border rounded" placeholder="Last Name *" value={fv.lastName} onChange={(e) => handleChange(activeApplicant, "lastName", e.target.value)} />
              <input className="p-2 border rounded" placeholder="First Name *" value={fv.firstName} onChange={(e) => handleChange(activeApplicant, "firstName", e.target.value)} />
              <input className="p-2 border rounded" placeholder="Middle Name" value={fv.middleName} onChange={(e) => handleChange(activeApplicant, "middleName", e.target.value)} />
              <input type="date" className="p-2 border rounded" placeholder="Birthday *" value={fv.birthday} onChange={(e) => handleChange(activeApplicant, "birthday", e.target.value)} />
              <select className="p-2 border rounded" value={fv.maritalStatus} onChange={(e) => handleChange(activeApplicant, "maritalStatus", e.target.value)}>
                <option value="">Marital Status</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
              </select>
              <div className="flex items-center gap-2">
                <span>Sex:</span>
                <label><input type="radio" name={`sex-${activeApplicant}`} checked={fv.sex === "Female"} onChange={() => handleChange(activeApplicant, "sex", "Female")} /> Female</label>
                <label><input type="radio" name={`sex-${activeApplicant}`} checked={fv.sex === "Male"} onChange={() => handleChange(activeApplicant, "sex", "Male")} /> Male</label>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white p-4 rounded shadow space-y-4">
            <h2 className="text-lg font-semibold">Address</h2>
            <div className="grid grid-cols-3 gap-4">
              <input className="p-2 border rounded" placeholder="Residence # *" value={fv.residenceNo} onChange={(e) => handleChange(activeApplicant, "residenceNo", e.target.value)} />
              <input className="p-2 border rounded" placeholder="Street/Village *" value={fv.street} onChange={(e) => handleChange(activeApplicant, "street", e.target.value)} />
              <input className="p-2 border rounded" placeholder="City *" value={fv.city} onChange={(e) => handleChange(activeApplicant, "city", e.target.value)} />
              <input className="p-2 border rounded" placeholder="Zip Code *" value={fv.zip} onChange={(e) => handleChange(activeApplicant, "zip", e.target.value)} />
            </div>
          </div>

          {/* Alternative Address */}
          <div className="bg-white p-4 rounded shadow space-y-4">
            <h2 className="text-lg font-semibold">Alternative Address</h2>
            <div className="grid grid-cols-3 gap-4">
              <input className="p-2 border rounded" placeholder="Residence #" value={fv.residenceNoAlt} onChange={(e) => handleChange(activeApplicant, "residenceNoAlt", e.target.value)} />
              <input className="p-2 border rounded" placeholder="Street/Village" value={fv.streetAlt} onChange={(e) => handleChange(activeApplicant, "streetAlt", e.target.value)} />
              <input className="p-2 border rounded" placeholder="City" value={fv.cityAlt} onChange={(e) => handleChange(activeApplicant, "cityAlt", e.target.value)} />
              <input className="p-2 border rounded" placeholder="Zip Code" value={fv.zipAlt} onChange={(e) => handleChange(activeApplicant, "zipAlt", e.target.value)} />
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white p-4 rounded shadow space-y-4">
            <h2 className="text-lg font-semibold">Contact Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <input className="p-2 border rounded" placeholder="Contact Number *" value={fv.contactNumber} onChange={(e) => handleChange(activeApplicant, "contactNumber", e.target.value)} />
              <input className="p-2 border rounded" placeholder="Email *" value={fv.email} onChange={(e) => handleChange(activeApplicant, "email", e.target.value)} />
            </div>
          </div>
        </>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded shadow space-y-4">
            <h2 className="text-lg font-semibold">Educational Background</h2>
            <div className="grid grid-cols-2 gap-4">
              <select className="p-2 border rounded" value={fv.education || ""} onChange={(e) => handleChange(activeApplicant, "education", e.target.value)}>
                <option value="">Educational Attainment</option>
                <option value="High School">High School Graduate</option>
                <option value="College">College Graduate</option>
                <option value="Vocational">Vocational/Trade</option>
                <option value="Post Graduate">Post Graduate</option>
              </select>
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow space-y-4">
            <h3 className="text-md font-semibold">Institution Name & Years Graduated</h3>
            <div className="grid grid-cols-2 gap-4">
              <input className="p-2 border rounded" placeholder="Secondary Education" value={fv.secondarySchool || ""} onChange={(e) => handleChange(activeApplicant, "secondarySchool", e.target.value)} />
              <input type="number" className="p-2 border rounded" placeholder="Year Graduated" value={fv.secondaryYear || ""} onChange={(e) => handleChange(activeApplicant, "secondaryYear", e.target.value)} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <input className="p-2 border rounded" placeholder="Tertiary Education" value={fv.tertiarySchool || ""} onChange={(e) => handleChange(activeApplicant, "tertiarySchool", e.target.value)} />
              <input type="number" className="p-2 border rounded" placeholder="Year Graduated" value={fv.tertiaryYear || ""} onChange={(e) => handleChange(activeApplicant, "tertiaryYear", e.target.value)} />
              <input className="p-2 border rounded" placeholder="Program" value={fv.tertiaryProgram || ""} onChange={(e) => handleChange(activeApplicant, "tertiaryProgram", e.target.value)} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <input className="p-2 border rounded" placeholder="Graduate Studies" value={fv.graduateSchool || ""} onChange={(e) => handleChange(activeApplicant, "graduateSchool", e.target.value)} />
              <input type="number" className="p-2 border rounded" placeholder="Year Graduated" value={fv.graduateYear || ""} onChange={(e) => handleChange(activeApplicant, "graduateYear", e.target.value)} />
              <input className="p-2 border rounded" placeholder="Program" value={fv.graduateProgram || ""} onChange={(e) => handleChange(activeApplicant, "graduateProgram", e.target.value)} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <input className="p-2 border rounded" placeholder="Specialized Training/Trade School" value={fv.specializedTraining || ""} onChange={(e) => handleChange(activeApplicant, "specializedTraining", e.target.value)} />
              <input type="number" className="p-2 border rounded" placeholder="Year Graduated" value={fv.specializedYear || ""} onChange={(e) => handleChange(activeApplicant, "specializedYear", e.target.value)} />
              <input className="p-2 border rounded" placeholder="Program" />
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow space-y-4">
            <h3 className="text-md font-semibold">Skills & Proficiency</h3>
            <textarea className="w-full p-2 border rounded" rows={4} placeholder="Please list the employee's areas of highest proficiency..." value={fv.skills || ""} onChange={(e) => handleChange(activeApplicant, "skills", e.target.value)}></textarea>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded shadow space-y-4">
            <h2 className="text-lg font-semibold">License Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <input type="date" className="p-2 border rounded" placeholder="License Expiry Date *" value={fv.licenseExpiry || ""} onChange={(e) => handleChange(activeApplicant, "licenseExpiry", e.target.value)} />
              <select className="p-2 border rounded" value={fv.licenseClassification || ""} onChange={(e) => handleChange(activeApplicant, "licenseClassification", e.target.value)}>
                <option value="">License Classification</option>
                <option>Non-Professional</option>
                <option>Professional</option>
                <option>Student Permit</option>
                <option>Conductor</option>
                <option>International Driving Permit</option>
              </select>
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow space-y-4">
            <p className="text-sm text-gray-700"><strong>To qualify as a driver, applicants must possess one of the following restriction codes:</strong></p>
            <ul className="list-disc list-inside text-sm text-gray-700">
              <li><strong>Code 3</strong> - Equivalent to Code C in the new LTO license system</li>
              <li><strong>Code B2</strong> - They can only drive up to 1T vehicles</li>
              <li><strong>Code C</strong> - They can drive up to 1T and 2T vehicles</li>
            </ul>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {restrictionCodesList.map((code) => (
                <label key={code} className="flex items-center gap-2">
                  <input type="checkbox" className="accent-red-600" checked={fv.restrictionCodes.includes(code)} onChange={() => toggleArrayValue(activeApplicant, "restrictionCodes", code)} />
                  {code}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 4 */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded shadow space-y-4">
            <h2 className="text-lg font-semibold">Driving History</h2>
            <div className="grid grid-cols-2 gap-4">
              <input type="number" className="p-2 border rounded" placeholder="Years of Driving Experience" value={fv.yearsDriving || ""} onChange={(e) => handleChange(activeApplicant, "yearsDriving", e.target.value)} />
              <div className="flex items-center gap-4">
                <span>Has basic truck troubleshooting knowledge?</span>
                <label><input type="radio" name={`truckKnowledge-${activeApplicant}`} className="accent-red-600" checked={fv.truckKnowledge === "yes"} onChange={() => handleChange(activeApplicant, "truckKnowledge", "yes")} /> Yes</label>
                <label><input type="radio" name={`truckKnowledge-${activeApplicant}`} className="accent-red-600" checked={fv.truckKnowledge !== "yes"} onChange={() => handleChange(activeApplicant, "truckKnowledge", "no")} /> No</label>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow space-y-4">
            <h3 className="text-md font-semibold">Troubleshooting Tasks</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {troubleshootingTasksList.map((task) => (
                <label key={task} className="flex items-center gap-2">
                  <input type="checkbox" className="accent-red-600" checked={fv.troubleshootingTasks.includes(task)} onChange={() => toggleArrayValue(activeApplicant, "troubleshootingTasks", task)} />
                  {task}
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow space-y-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-red-600" checked={!!fv.takingMedications} onChange={() => toggleFlag(activeApplicant, "takingMedications")} /> Currently taking any maintenance medications?</label>
            {fv.takingMedications && <input className="w-full p-2 border rounded" placeholder="Please specify reason for taking any maintenance medications:" value={fv.medicationReason || ""} onChange={(e) => handleChange(activeApplicant, "medicationReason", e.target.value)} />}

            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-red-600" checked={!!fv.tookMedicalTest} onChange={() => toggleFlag(activeApplicant, "tookMedicalTest")} /> Took medical and drug test?</label>
            {fv.tookMedicalTest && <input className="w-full p-2 border rounded" placeholder="When was the last time you took it?:" value={fv.medicalTestDate || ""} onChange={(e) => handleChange(activeApplicant, "medicalTestDate", e.target.value)} />}
          </div>

          <div className="bg-white p-4 rounded shadow space-y-4">
            <h3 className="text-md font-semibold">What types of vehicles has the employee driven?</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {vehicleTypesList.map((vehicle) => (
                <label key={vehicle} className="flex items-center gap-2">
                  <input type="checkbox" className="accent-red-600" checked={fv.vehicleTypes.includes(vehicle)} onChange={() => toggleArrayValue(activeApplicant, "vehicleTypes", vehicle)} />
                  {vehicle}
                </label>
              ))}
            </div>
          </div>

          {/* Endorse button */}
          <div className="flex justify-end">
            <button onClick={handleEndorse} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">Endorse</button>
          </div>
        </div>
      )}

      {/* Step 5 - Previous Work Experience */}
      {step === 5 && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded shadow space-y-4">
            <h2 className="text-lg font-semibold">Previous Work Experience</h2>
            {workExperiences.map((exp, index) => (
              <div key={index} className="border rounded p-4 space-y-4 bg-gray-50 relative">
                <h3 className="font-semibold text-md">Work Experience #{index + 1}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="Date Employed" type="date" className="p-2 border rounded" value={exp.date} onChange={(e) => updateWorkExperience(index, { ...exp, date: e.target.value })} />
                  <input className="p-2 border rounded" placeholder="Company Name and Location" value={exp.company} onChange={(e) => updateWorkExperience(index, { ...exp, company: e.target.value })} />
                </div>
                <input className="p-2 border rounded w-full" placeholder="Role/Title" value={exp.role} onChange={(e) => updateWorkExperience(index, { ...exp, role: e.target.value })} />
                <textarea className="p-2 border rounded w-full" rows={2} placeholder="Job Notes" value={exp.notes} onChange={(e) => updateWorkExperience(index, { ...exp, notes: e.target.value })}></textarea>
                <textarea className="p-2 border rounded w-full" rows={2} placeholder="Tasks Performed" value={exp.tasks} onChange={(e) => updateWorkExperience(index, { ...exp, tasks: e.target.value })}></textarea>
                <input className="p-2 border rounded w-full" placeholder="Reason for Leaving" value={exp.reason} onChange={(e) => updateWorkExperience(index, { ...exp, reason: e.target.value })} />
                {workExperiences.length > 1 && <button onClick={() => removeWorkExperience(index)} className="absolute top-2 right-2 text-xs bg-red-500 text-white rounded px-2 py-1 hover:bg-red-600">Remove</button>}
              </div>
            ))}

            <button onClick={addWorkExperience} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">+ Add Another Work Experience</button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-4">
        <button onClick={prevStep} className="bg-gray-400 text-white font-bold py-2 px-6 rounded hover:bg-gray-500">Back</button>
        {step < 4 && <button onClick={nextStep} className="bg-red-600 text-white font-bold py-2 px-6 rounded hover:bg-red-700">Next</button>}
      </div>

      <p className="text-sm text-gray-500 mt-2">Page {step} of 4</p>
    </div>
  );
}

export default DriverAddRecord;
