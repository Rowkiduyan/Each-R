import { useState } from "react";
import { useLocation } from "react-router-dom";
import Logo from "./Logo.png";

function DriverAddRecord() {
  const [step, setStep] = useState(1);
  const location = useLocation();
  const job = location.state?.job;
  const [applicants, setApplicants] = useState([
    { id: 1, name: "Applicant 1" },
    { id: 2, name: "Applicant 2" },
  ]);
  const [activeApplicant, setActiveApplicant] = useState(1);

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 5));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  // Add a new applicant
  const addApplicant = () => {
    const newId = applicants.length + 1;
    setApplicants([...applicants, { id: newId, name: `Applicant ${newId}` }]);
    setActiveApplicant(newId);
  };

  // Remove an applicant
  const removeApplicant = (id) => {
    if (applicants.length === 1) return; // always keep at least one applicant
    const filtered = applicants.filter((a) => a.id !== id);
    setApplicants(filtered);
    if (activeApplicant === id) {
      setActiveApplicant(filtered[0].id); // switch to first applicant if active is removed
    }
  };

  const [workExperiences, setWorkExperiences] = useState([
  { date: "", company: "", role: "", notes: "", tasks: "", reason: "" },
]);

const addWorkExperience = () => {
  setWorkExperiences([
    ...workExperiences,
    { date: "", company: "", role: "", notes: "", tasks: "", reason: "" },
  ]);
};

const removeWorkExperience = (index) => {
  const updated = [...workExperiences];
  updated.splice(index, 1);
  setWorkExperiences(updated);
};

const updateWorkExperience = (index, updatedExp) => {
  const updated = [...workExperiences];
  updated[index] = updatedExp;
  setWorkExperiences(updated);
};


  return (
    <div className="min-h-screen bg-neutral-100 p-6 space-y-6">
      {/* Selected Job Post (if any) */}
      {job && (
        <div className="bg-white p-4 rounded shadow border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-block bg-red-600 text-white text-xs font-bold px-3 py-1 rounded">URGENT HIRING!</div>
              <h2 className="text-xl font-bold text-gray-800 mt-2">{job.title}</h2>
              <div className="text-sm text-gray-600">{job.depot} • Posted {job.posted}</div>
              {job.description && (
                <p className="text-gray-700 mt-3">{job.description}</p>
              )}
              {Array.isArray(job.responsibilities) && job.responsibilities.length > 0 && (
                <div className="mt-3">
                  <h4 className="font-semibold text-gray-800 mb-1">Main Responsibilities</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {job.responsibilities.map((r, i) => (
                      <li key={i}>• {r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <img src={Logo} alt="Roadwise Logo" className="w-20 h-auto" />
        <button className="bg-red-600 text-white font-bold py-2 px-4 rounded hover:bg-red-700">
          + Import File
        </button>
      </div>

      <h1 className="text-4xl font-bold">Good afternoon, Agency!</h1>
      <p>Add a record below, to endorse an Employee to HR Roadwise. Check your email for any updates.</p>

      {/* Add a Record Tab */}
      <div className="flex justify-between items-center bg-red-600 text-white px-4 py-2 rounded-t">
        <span className="font-semibold">Add a Record</span>
      </div>

      {/* Applicant Tabs with Remove Buttons */}
      <div className="flex items-center border border-t-0 border-gray-300 p-2 space-x-2">
        {applicants.map((applicant) => (
          <div key={applicant.id} className="relative inline-block">
            <button
              className={`px-3 py-1 rounded ${
                activeApplicant === applicant.id ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
              onClick={() => setActiveApplicant(applicant.id)}
            >
              {applicant.name}
            </button>
            {applicants.length > 1 && (
              <button
                onClick={() => removeApplicant(applicant.id)}
                className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-700"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          className="px-3 py-1 text-blue-500 underline"
          onClick={addApplicant}
        >
          + Add Another Employee
        </button>
      </div>

      {/* Step 1: Full Page for Active Applicant */}
      {step === 1 && (
        <>
          {/* Employment Info */}
          <div className="bg-white p-4 rounded shadow space-y-4">
            <h2 className="text-lg font-semibold">Employment Details for {`Applicant ${activeApplicant}`}</h2>
            <div className="grid grid-cols-4 gap-4">
              <select className="p-2 border rounded">
                <option>Select Department</option>
                <option>Delivery Crew</option>
              </select>
              <select className="p-2 border rounded">
                <option>Select Position</option>
                <option>Driver</option>
              </select>
              <select className="p-2 border rounded">
                <option>Select Depot Assignment</option>
                <option>Select Depot Assignment</option>
              </select>
              <input type="date" className="p-2 border rounded" />
            </div>

            <div>
              <label className="mr-2">Currently Employed?</label>
              <input type="radio" name={`employed-${activeApplicant}`} className="ml-2" /> Yes
              <input type="radio" name={`employed-${activeApplicant}`} className="ml-4" /> No
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-white p-4 rounded shadow space-y-4">
            <h2 className="text-lg font-semibold">Personal Information</h2>
            <div className="grid grid-cols-3 gap-4">
              <input className="p-2 border rounded" placeholder="Last Name *" />
              <input className="p-2 border rounded" placeholder="First Name *" />
              <input className="p-2 border rounded" placeholder="Middle Name" />
              <input type="date" className="p-2 border rounded" placeholder="Birthday *" />
              <select className="p-2 border rounded">
                <option>Marital Status</option>
              </select>
              <div className="flex items-center gap-2">
                <span>Sex:</span>
                <label>
                  <input type="radio" name={`sex-${activeApplicant}`} /> Female
                </label>
                <label>
                  <input type="radio" name={`sex-${activeApplicant}`} /> Male
                </label>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white p-4 rounded shadow space-y-4">
            <h2 className="text-lg font-semibold">Address</h2>
            <div className="grid grid-cols-3 gap-4">
              <input className="p-2 border rounded" placeholder="Residence # *" />
              <input className="p-2 border rounded" placeholder="Street/Village *" />
              <input className="p-2 border rounded" placeholder="City *" />
              <input className="p-2 border rounded" placeholder="Zip Code *" />
            </div>
          </div>

          {/* Alternative Address */}
          <div className="bg-white p-4 rounded shadow space-y-4">
            <h2 className="text-lg font-semibold">Alternative Address</h2>
            <div className="grid grid-cols-3 gap-4">
              <input className="p-2 border rounded" placeholder="Residence #" />
              <input className="p-2 border rounded" placeholder="Street/Village" />
              <input className="p-2 border rounded" placeholder="City" />
              <input className="p-2 border rounded" placeholder="Zip Code" />
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white p-4 rounded shadow space-y-4">
            <h2 className="text-lg font-semibold">Contact Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <input className="p-2 border rounded" placeholder="Contact Number *" />
              <input className="p-2 border rounded" placeholder="Email *" />
            </div>
          </div>
        </>
      )}


      {/* Placeholder for Steps 2–4 */}
{step === 2 && (
  <div className="space-y-6">
    {/* Educational Background */}
    <div className="bg-white p-4 rounded shadow space-y-4">
      <h2 className="text-lg font-semibold">Educational Background</h2>
      <div className="grid grid-cols-2 gap-4">
        <select className="p-2 border rounded">
          <option>Educational Attainment</option>
          <option>High School Graduate</option>
          <option>College Graduate</option>
          <option>Vocational/Trade</option>
          <option>Post Graduate</option>
        </select>
      </div>
    </div>

    {/* Institution Name + Secondary */}
    <div className="bg-white p-4 rounded shadow space-y-4">
      <h3 className="text-md font-semibold">Institution Name & Years Graduated</h3>
      <div className="grid grid-cols-2 gap-4">
        <input className="p-2 border rounded" placeholder="Secondary Education" />
        <input type="number" className="p-2 border rounded" placeholder="Year Graduated" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <input className="p-2 border rounded" placeholder="Tertiary Education" />
        <input type="number" className="p-2 border rounded" placeholder="Year Graduated" />
        <input className="p-2 border rounded" placeholder="Program" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <input className="p-2 border rounded" placeholder="Graduate Studies" />
        <input type="number" className="p-2 border rounded" placeholder="Year Graduated" />
        <input className="p-2 border rounded" placeholder="Program" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <input className="p-2 border rounded" placeholder="Specialized Training/Trade School" />
        <input type="number" className="p-2 border rounded" placeholder="Year Graduated" />
        <input className="p-2 border rounded" placeholder="Program" />
      </div>
    </div>

    {/* Skills Section */}
    <div className="bg-white p-4 rounded shadow space-y-4">
      <h3 className="text-md font-semibold">Skills & Proficiency</h3>
      <textarea
        className="w-full p-2 border rounded"
        rows={4}
        placeholder="Please list the employee's areas of highest proficiency, special skills, or other items that may contribute to their abilities in performing the position being endorsed to"
      ></textarea>
    </div>
  </div>
)}


{/* Step 3: License Information */}
{step === 3 && (
  <div className="space-y-6">
    {/* License Information */}
    <div className="bg-white p-4 rounded shadow space-y-4">
      <h2 className="text-lg font-semibold">License Information</h2>
      <div className="grid grid-cols-2 gap-4">
        <input type="date" className="p-2 border rounded" placeholder="License Expiry Date *" />
        <select className="p-2 border rounded">
          <option>License Classification</option>
          <option>Non-Professional</option>
          <option>Professional</option>
          <option>Student Permit</option>
          <option>Conductor</option>
          <option>International Driving Permit</option>
        </select>
      </div>
    </div>

    {/* Restriction Codes Note */}
    <div className="bg-white p-4 rounded shadow space-y-2">
      <p className="text-sm text-gray-700">
        <strong>To qualify as a driver, applicants must possess one of the following restriction codes:</strong>
      </p>
      <ul className="list-disc list-inside text-sm text-gray-700">
        <li><strong>Code 3</strong> - Equivalent to Code C in the new LTO license system</li>
        <li><strong>Code B2</strong> - They can only drive up to 1T vehicles</li>
        <li><strong>Code C</strong> - They can drive up to 1T and 2T vehicles</li>
      </ul>
      <p className="text-sm text-gray-600">
        <em>Preference is given to applicants with Code 3 or Code C.</em>
      </p>
    </div>

    {/* Restriction Codes Checklist */}
    <div className="bg-white p-4 rounded shadow space-y-4">
      <h3 className="text-md font-semibold">Check all that apply:</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
        {[
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
        ].map((code) => (
          <label key={code} className="flex items-center gap-2">
            <input type="checkbox" className="accent-red-600" />
            {code}
          </label>
        ))}
      </div>
    </div>
  </div>
)}

{/* Step 4: Driving History */}
{step === 4 && (
  <div className="space-y-6">
    {/* Driving Experience */}
    <div className="bg-white p-4 rounded shadow space-y-4">
      <h2 className="text-lg font-semibold">Driving History</h2>
      <div className="grid grid-cols-2 gap-4">
        <input
          type="number"
          className="p-2 border rounded"
          placeholder="Years of Driving Experience"
        />
        <div className="flex items-center gap-4">
          <span>Has basic truck troubleshooting knowledge?</span>
          <label>
            <input type="radio" name="truckKnowledge" className="accent-red-600" /> Yes
          </label>
          <label>
            <input type="radio" name="truckKnowledge" className="accent-red-600" /> No
          </label>
        </div>
      </div>
    </div>

    {/* Troubleshooting Tasks */}
    <div className="bg-white p-4 rounded shadow space-y-4">
      <h3 className="text-md font-semibold">
        Read each item and check all the boxes that describe the employee.
      </h3>
      <p className="text-sm text-gray-700">
        Choose which of these tasks the employee knows how to do on a truck:
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
        {[
          "Replacing lights or bulbs for the headlights, brake lights, etc.",
          "Adding brake fluid.",
          "Adding engine oil.",
          "Adding power steering fluid.",
          "Adjusting the engine belt.",
          "Replacing the tire.",
          "No knowledge of basic troubleshooting.",
        ].map((task) => (
          <label key={task} className="flex items-center gap-2">
            <input type="checkbox" className="accent-red-600" />
            {task}
          </label>
        ))}
      </div>
    </div>

    {/* Accident/Driving Behavior */}
    <div className="bg-white p-4 rounded shadow space-y-2">
      {[
        "Been involved in 2 or more serious accidents in the last 3 years?",
        "Been involved in 2 or more overspeeding incidents in the last 3 years?",
        "Been involved in a near-accident in the past year?",
        "Experiences stress from the length of duty or driving hours?",
        "Experiences extreme fatigue due to long hours and working at night?",
      ].map((item) => (
        <label key={item} className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-red-600" />
          {item}
        </label>
      ))}
    </div>

    {/* Medical and Drug Test */}
    <div className="bg-white p-4 rounded shadow space-y-4">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="accent-red-600" />
        Currently taking any maintenance medications?
      </label>
      <input
        className="w-full p-2 border rounded"
        placeholder="Please specify reason for taking any maintenance medications:"
      />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="accent-red-600" />
        Took medical and drug test?
      </label>
      <input
        className="w-full p-2 border rounded"
        placeholder="When was the last time you took it?:"
      />
    </div>

    {/* Vehicle Types Driven */}
    <div className="bg-white p-4 rounded shadow space-y-4">
      <h3 className="text-md font-semibold">What types of vehicles has the employee driven?</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
        {[
          "Sedan or Car",
          "Van",
          "L300",
          "Hino / Canter (4 wheels - 6 wheels)",
          "10 Wheeler",
          "None",
        ].map((vehicle) => (
          <label key={vehicle} className="flex items-center gap-2">
            <input type="checkbox" className="accent-red-600" />
            {vehicle}
          </label>
        ))}
      </div>
    </div>
  </div>
)}

{/* Step 5: Previous Work Experience */}
{step === 5 && (
  <div className="space-y-6">
    <div className="bg-white p-4 rounded shadow space-y-4">
      <h2 className="text-lg font-semibold">Previous Work Experience</h2>

      {workExperiences.map((exp, index) => (
        <div
          key={index}
          className="border rounded p-4 space-y-4 bg-gray-50 relative"
        >
          <h3 className="font-semibold text-md">Work Experience #{index + 1}</h3>
          <div className="grid grid-cols-2 gap-4">
            <input
            placeholder="Date Employed"
              type="date"
              className="p-2 border rounded"
              
              value={exp.date}
              onChange={(e) =>
                updateWorkExperience(index, { ...exp, date: e.target.value })
              }
            />
            <input
              className="p-2 border rounded"
              placeholder="Company Name and Location"
              value={exp.company}
              onChange={(e) =>
                updateWorkExperience(index, { ...exp, company: e.target.value })
              }
            />
          </div>
          <input
            className="p-2 border rounded w-full"
            placeholder="Role/Title"
            value={exp.role}
            onChange={(e) =>
              updateWorkExperience(index, { ...exp, role: e.target.value })
            }
          />
          <textarea
            className="p-2 border rounded w-full"
            rows={2}
            placeholder="Job Notes"
            value={exp.notes}
            onChange={(e) =>
              updateWorkExperience(index, { ...exp, notes: e.target.value })
            }
          ></textarea>
          <textarea
            className="p-2 border rounded w-full"
            rows={2}
            placeholder="Tasks Performed"
            value={exp.tasks}
            onChange={(e) =>
              updateWorkExperience(index, { ...exp, tasks: e.target.value })
            }
          ></textarea>
          <input
            className="p-2 border rounded w-full"
            placeholder="Reason for Leaving"
            value={exp.reason}
            onChange={(e) =>
              updateWorkExperience(index, { ...exp, reason: e.target.value })
            }
          />
          {workExperiences.length > 1 && (
            <button
              onClick={() => removeWorkExperience(index)}
              className="absolute top-2 right-2 text-xs bg-red-500 text-white rounded px-2 py-1 hover:bg-red-600"
            >
              Remove
            </button>
          )}
        </div>
      ))}

      <button
        onClick={addWorkExperience}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        + Add Another Work Experience
      </button>
    </div>
  </div>
)}

{/* Step 6 removed entirely */}

{/* Step 5 removed */}













      {/* Navigation Buttons */}
      <div className="flex justify-between mt-4">
        <button
          onClick={prevStep}
          className="bg-gray-400 text-white font-bold py-2 px-6 rounded hover:bg-gray-500"
        >
          Back
        </button>
        {step < 4 && (
          <button
            onClick={nextStep}
            className="bg-red-600 text-white font-bold py-2 px-6 rounded hover:bg-red-700"
          >
            Next
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500 mt-2">Page {step} of 4</p>
    </div>
  );
}

export default DriverAddRecord;
