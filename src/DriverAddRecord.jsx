import { useState } from "react";
import Logo from "./Logo.png";

function DriverAddRecord() {
  const [step, setStep] = useState(1);
  const [applicants, setApplicants] = useState([
    { id: 1, name: "Applicant 1" },
    { id: 2, name: "Applicant 2" },
  ]);
  const [activeApplicant, setActiveApplicant] = useState(1);

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 7));
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

  return (
    <div className="min-h-screen bg-neutral-100 p-6 space-y-6">
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

      {/* Placeholder for Steps 2–7 */}
      {step > 1 && <div className="bg-white p-4 rounded shadow">Step {step} content here</div>}

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-4">
        <button
          onClick={prevStep}
          className="bg-gray-400 text-white font-bold py-2 px-6 rounded hover:bg-gray-500"
        >
          Back
        </button>
        {step < 7 && (
          <button
            onClick={nextStep}
            className="bg-red-600 text-white font-bold py-2 px-6 rounded hover:bg-red-700"
          >
            Next
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500 mt-2">Page {step} of 7</p>
    </div>
  );
}

export default DriverAddRecord;
