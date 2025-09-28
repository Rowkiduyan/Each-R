import { Link } from 'react-router-dom';
import { useState } from 'react';
import Logo from './Logo.png';

function ApplicantApplications() {
  const steps = ["Application", "Assessment", "Requirements", "Agreements"];
  const [activeStep, setActiveStep] = useState("Application");
  // status: done -> green, pending -> yellow, waiting -> orange
  const [stepStatus, setStepStatus] = useState({
    Application: "done",
    Assessment: "pending",
    Requirements: "waiting",
    Agreements: "waiting",
  });

  // Requirements: ID numbers state + lock state
  const [idFields, setIdFields] = useState({
    sss: "",
    philhealth: "",
    pagibig: "",
    tin: "",
  });
  const [idLocked, setIdLocked] = useState({
    sss: false,
    philhealth: false,
    pagibig: false,
    tin: false,
  });

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showRetractDialog, setShowRetractDialog] = useState(false);
  const [applicationRetracted, setApplicationRetracted] = useState(false);

  const interview = {
    date: "June 30, 2025",
    time: "8:00 AM",
    location: "HR Office, Roadwise Pasig Depot",
    interviewer: "Raezelle Ferrer",
  };

//   const getStepClasses = (step) => {
//     const base = "px-4 py-1 rounded text-sm font-semibold border";
//     const status = stepStatus[step];
//     if (status === "done") return `${base} bg-green-100 text-green-800 border-green-300`;
//     if (status === "pending") return `${base} bg-yellow-100 text-yellow-800 border-yellow-300`;
//     return `${base} bg-orange-100 text-orange-800 border-orange-300`;
//   };

  return (
    <div className="min-h-screen bg-white">
      {/* Top header copied to match ApplicantLHome */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="flex-shrink-0 text-red-600 font-bold text-3xl italic">
                  Each-R
              </div>
              </div>
            </div>
            <div className="flex-1 text-center">
              <h1 className="text-3xl font-bold text-gray-800">Application Details</h1>
            </div>
            <div className="flex items-end space-x-5">
              <Link to="/applicant/login" className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">Logout</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">My Applications</h2>
            <p className="text-sm text-gray-500">Track your progress and complete all steps.</p>
          </div>
          <Link to="/applicantl/home" className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors">Back</Link>
        </div>

        {/* Steps header */}
        <div className="flex items-center gap-3 mb-6 overflow-x-auto">
          {steps.map((step) => {
            const isActive = activeStep === step;
            const status = stepStatus[step];
            let bgColor = 'bg-gray-200 text-gray-800 hover:bg-gray-300';
            
            if (isActive) {
              bgColor = 'bg-red-600 text-white';
            } else if (status === 'done') {
              bgColor = 'bg-green-100 text-green-800 hover:bg-green-200';
            } else if (status === 'pending') {
              bgColor = 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
            } else if (status === 'waiting') {
              bgColor = 'bg-orange-100 text-orange-800 hover:bg-orange-200';
            }
            
            return (
              <button
                key={step}
                type="button"
                onClick={() => setActiveStep(step)}
                className={`px-4 py-2 rounded ${bgColor}`}
              >
                {step}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="bg-white border rounded-md shadow-sm">
          {/* Application */}
          <section className={`p-4 ${activeStep === "Application" ? "" : "hidden"}`}>
            {/* Header row */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center text-gray-500 text-sm">JD</div>
                <div>
                  <div className="font-semibold text-gray-800">Dela Cruz, Juan</div>
                  <div className="text-sm text-gray-700">Position: Delivery Driver</div>
                  <div className="text-xs text-gray-500">Applied: June 25, 2025</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">#003342</div>
                <button 
                  type="button" 
                  className="text-sm text-blue-600 hover:underline mt-2 disabled:text-gray-400 disabled:cursor-not-allowed"
                  onClick={() => setShowRetractDialog(true)}
                  disabled={applicationRetracted}
                >
                  {applicationRetracted ? "Application Retracted" : "Retract Application"}
                </button>
              </div>
            </div>

            {/* Steps bar already above; show details below */}
            <div className="border rounded-md overflow-hidden">
              {/* Job Details */}
              <div className="bg-gray-100 text-gray-800 px-3 py-2 text-sm font-semibold border-b">Job Details</div>
              <div className="p-3 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 border-b">
                <div><span className="font-semibold">Department:</span> Delivery</div>
                <div><span className="font-semibold">Current Employment Status:</span> Unemployed</div>
                <div><span className="font-semibold">Position Applying For:</span> Delivery Driver</div>
                <div><span className="font-semibold">Available Start Date:</span> 10/10/25</div>
                <div><span className="font-semibold">Depot:</span> Pasig</div>
                <div>
                  <span className="font-semibold">Resume:</span> <a href="#" className="text-blue-600 hover:underline">delacruzresume.pdf</a>
                </div>
              </div>

              {/* Personal Information */}
              <div className="bg-gray-100 text-gray-800 px-3 py-2 text-sm font-semibold border-b">Personal Information</div>
              <div className="p-3 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                <div><span className="font-semibold">Full Name:</span> Dela Cruz, Juan</div>
                <div><span className="font-semibold">Sex:</span> Male</div>
                <div><span className="font-semibold">Address:</span> Blk 4 Lot 159 Papaya St., Brgy. San Lupalop, Pasig City 1860</div>
                <div><span className="font-semibold">Birthday:</span> 10/10/1978</div>
                <div><span className="font-semibold">Contact Number:</span> 09123456789</div>
                <div><span className="font-semibold">Age:</span> 47</div>
                <div><span className="font-semibold">Email:</span> delacruzjuan@gmail.com</div>
                <div><span className="font-semibold">Marital Status:</span> Married</div>
              </div>
            </div>
          </section>

          {/* Assessment */}
          <section className={`p-4 ${activeStep === "Assessment" ? "" : "hidden"}`}>
            {/* Header summary */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center text-gray-500 text-sm">JD</div>
                <div>
                  <div className="font-semibold text-gray-800">Dela Cruz, Juan</div>
                  <div className="text-sm text-gray-700">Position: Delivery Driver</div>
                  <div className="text-xs text-gray-500">Applied: June 25, 2025</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">#003342</div>
                <button 
                  type="button" 
                  className="text-sm text-blue-600 hover:underline mt-2 disabled:text-gray-400 disabled:cursor-not-allowed"
                  onClick={() => setShowRetractDialog(true)}
                  disabled={applicationRetracted}
                >
                  {applicationRetracted ? "Application Retracted" : "Retract Application"}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800">Assessment</h2>
              {stepStatus.Assessment === "done" && (
                <span className="text-sm px-2 py-1 rounded bg-green-100 text-green-800 border border-green-300">Confirmed</span>
              )}
            </div>
            <div className="bg-gray-50 border rounded-md p-4">
              <div className="text-sm text-gray-800 font-semibold mb-2">Interview Schedule</div>
              <div className="text-sm text-gray-700 space-y-1">
                <div><span className="font-medium">Date:</span> {interview.date}</div>
                <div><span className="font-medium">Time:</span> {interview.time}</div>
                <div><span className="font-medium">Location:</span> {interview.location}</div>
                <div><span className="font-medium">Interviewer:</span> {interview.interviewer}</div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-gray-500 italic">
                  Important Reminder: Please confirm at least a day before your schedule.
                </div>
                {stepStatus.Assessment !== "done" && (
                  <button type="button" className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700" onClick={() => setShowConfirmDialog(true)}>
                    Confirm Interview
                  </button>
                )}
              </div>
            </div>

            {/* In-Person Assessments - shown after interview confirmation */}
            {stepStatus.Assessment === "done" && (
              <div className="mt-4">
                <div className="text-sm font-semibold text-gray-800 mb-2">In-Person Assessments</div>
                <div className="bg-gray-50 border rounded-md p-3">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-600">
                      <path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75ZM6.75 15a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V15.75a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V15.75a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                    </svg>
                    <a href="#" className="text-blue-600 hover:underline text-sm">delacruztestdrive(passed).pdf</a>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Requirements */}
          <section className={`p-4 ${activeStep === "Requirements" ? "" : "hidden"}`}>
            {/* Header summary (same as Application header portion inside card) */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center text-gray-500 text-sm">JD</div>
                <div>
                  <div className="font-semibold text-gray-800">Dela Cruz, Juan</div>
                  <div className="text-sm text-gray-700">Position: Delivery Driver</div>
                  <div className="text-xs text-gray-500">Applied: June 25, 2025</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">#003342</div>
                <button 
                  type="button" 
                  className="text-sm text-blue-600 hover:underline mt-2 disabled:text-gray-400 disabled:cursor-not-allowed"
                  onClick={() => setShowRetractDialog(true)}
                  disabled={applicationRetracted}
                >
                  {applicationRetracted ? "Application Retracted" : "Retract Application"}
                </button>
              </div>
            </div>

            {/* ID numbers row with lock/unlock */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
              {[{key: 'sss', label: 'SSS No.'}, {key: 'philhealth', label: 'Philhealth No.'}, {key: 'pagibig', label: 'Pag-IBIG No.'}, {key: 'tin', label: 'TIN No.'}].map((item) => (
                <div key={item.key} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={item.label}
                    value={idFields[item.key]}
                    onChange={(e) => setIdFields((f) => ({ ...f, [item.key]: e.target.value }))}
                    disabled={idLocked[item.key]}
                    className={`flex-1 px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500 ${idLocked[item.key] ? 'bg-gray-100 text-gray-600' : ''}`}
                  />
                  {!idLocked[item.key] ? (
                    <button
                      type="button"
                      className="text-xs px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                      onClick={() => setIdLocked((l) => ({ ...l, [item.key]: true }))}
                      title="Lock value"
                    >
                      ✓
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="text-xs px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                      onClick={() => setIdLocked((l) => ({ ...l, [item.key]: false }))}
                      title="Unlock to edit"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Documents table-like list */}
            <div className="bg-gray-100 text-gray-800 px-3 py-2 text-sm font-semibold border rounded-t-md">Document Name</div>
            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-gray-600 border-b">
              <div className="col-span-6">&nbsp;</div>
              <div className="col-span-3">Submission</div>
              <div className="col-span-3">Remarks</div>
            </div>

            {[
              {name: 'PSA Birth Certificate *'},
              {name: "Photocopy of Driver's License (Front and Back) *"},
              {name: 'Photocopy of SSS ID'},
              {name: 'Photocopy of TIN ID'},
              {name: 'Photocopy of Philhealth MDR'},
              {name: 'Photocopy of HDMF or Proof of HDMF No. (Pag-IBIG)'},
              {name: 'Medical Examination Results *', hasDate: true, dateLabel: 'Date Validity *'},
              {name: 'NBI Clearance', hasDate: true, dateLabel: 'Date Validity *'},
              {name: 'Police Clearance', hasDate: true, dateLabel: 'Date Validity *'},
            ].map((doc, idx) => (
              <div key={idx} className="border-b">
                <div className="grid grid-cols-12 items-center gap-3 px-3 py-3">
                  <div className="col-span-12 md:col-span-6 text-sm text-gray-800">
                    {doc.name}
                    {doc.hasDate && (
                      <div className="mt-2">
                        <label className="text-xs text-gray-600 mr-2">{doc.dateLabel}</label>
                        <input type="date" className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500" />
                      </div>
                    )}
                  </div>
                  <div className="col-span-12 md:col-span-3">
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-2 px-2 py-1 border border-gray-300 rounded bg-white text-xs cursor-pointer hover:bg-gray-50">
                        <input type="file" accept=".pdf,.docx" className="hidden" onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const fileName = e.target.files[0].name;
                            e.target.nextElementSibling.textContent = fileName;
                          }
                        }} />
                        <span>Choose File</span>
                        <span className="text-gray-500">No file chosen</span>
                      </label>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">PDF, DOCX | Max file size 10 mb</div>
                  </div>
                  <div className="col-span-12 md:col-span-3">
                    <span className="inline-block text-xs px-3 py-1 rounded bg-red-700 text-white">No File</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Emergency contact */}
            <div className="mt-4">
              <div className="text-sm font-semibold text-gray-800 mb-2">Emergency Contact Information</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                <input type="text" placeholder="Contact Person's Name *" className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500" />
                <input type="text" placeholder="Contact Person's Contact Number *" className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                <input type="text" placeholder="Contact Person's Address *" className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500" />
                <input type="text" placeholder="Relation *" className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500" />
              </div>
              <div className="text-xs text-gray-600 italic mt-2">Important Reminder: Please wait for your requirements to be validated by your HR Department. Once validated, you may now proceed onsite to further process your employment.</div>
              <div className="flex justify-end mt-4">
                <button 
                  type="button" 
                  className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  onClick={() => {
                    setStepStatus(prev => ({ ...prev, Requirements: "done", Agreements: "pending" }));
                    setActiveStep("Agreements");
                    alert("Requirements submitted successfully! You can now proceed to Agreements.");
                  }}
                >
                  Submit
                </button>
              </div>
            </div>
          </section>

          {/* Agreements */}
          <section className={`p-4 ${activeStep === "Agreements" ? "" : "hidden"}`}>
            {/* Header summary */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center text-gray-500 text-sm">JD</div>
                <div>
                  <div className="font-semibold text-gray-800">Dela Cruz, Juan</div>
                  <div className="text-sm text-gray-700">Position: Delivery Driver</div>
                  <div className="text-xs text-gray-500">Applied: June 25, 2025</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">#003342</div>
                <button 
                  type="button" 
                  className="text-sm text-blue-600 hover:underline mt-2 disabled:text-gray-400 disabled:cursor-not-allowed"
                  onClick={() => setShowRetractDialog(true)}
                  disabled={applicationRetracted}
                >
                  {applicationRetracted ? "Application Retracted" : "Retract Application"}
                </button>
                <div className="text-lg font-bold text-green-600 mt-1">HIRED</div>
                <div className="text-xs text-gray-500">10/10/2025</div>
              </div>
            </div>

            <div className="bg-gray-100 text-gray-800 px-3 py-2 text-sm font-semibold border rounded-t-md">Document Name</div>
            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-gray-600 border-b">
              <div className="col-span-6">&nbsp;</div>
              <div className="col-span-3">File</div>
              <div className="col-span-3">&nbsp;</div>
            </div>

            <div className="border-b">
              <div className="grid grid-cols-12 items-center gap-3 px-3 py-3">
                <div className="col-span-12 md:col-span-6 text-sm text-gray-800">Employee Appointment Letter</div>
                <div className="col-span-12 md:col-span-3 text-sm">
                  <a href="#" className="text-blue-600 hover:underline">applicantfile.pdf</a>
                  <span className="ml-2 text-xs text-gray-500">10/09/2025</span>
                </div>
                <div className="col-span-12 md:col-span-3" />
              </div>
            </div>

            <div className="text-xs text-gray-600 italic mt-4">
              Important: You have been successfully hired! Please see your email for your employee account details and you may login as an employee. Thank you.
            </div>
          </section>
        </div>
      </div>

      {/* Confirm dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50" onClick={() => setShowConfirmDialog(false)}>
          <div className="bg-white rounded-md w-full max-w-md mx-4 overflow-hidden border" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">Confirm Interview</h3>
            </div>
            <div className="p-4 text-sm text-gray-700">
              Are you sure you want to confirm your interview schedule?
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button type="button" className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300" onClick={() => setShowConfirmDialog(false)}>Cancel</button>
              <button
                type="button"
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                onClick={() => {
                  setShowConfirmDialog(false);
                  setStepStatus((s) => ({ ...s, Assessment: "done", Requirements: s.Requirements }));
                  setShowSuccessDialog(true);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success dialog */}
      {showSuccessDialog && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50" onClick={() => setShowSuccessDialog(false)}>
          <div className="bg-white rounded-md w-full max-w-md mx-4 overflow-hidden border" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-green-600"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.525-1.72-1.72a.75.75 0 1 0-1.06 1.061l2.25 2.25a.75.75 0 0 0 1.144-.094l3.843-5.15Z" clipRule="evenodd" /></svg>
                </div>
              </div>
              <div className="text-lg font-semibold text-gray-800 mb-2">Your interview schedule has been confirmed.</div>
              <div className="border rounded-md text-left p-3 text-sm text-gray-700">
                <div><span className="font-medium">Date:</span> {interview.date}</div>
                <div><span className="font-medium">Time:</span> {interview.time}</div>
                <div><span className="font-medium">Location:</span> {interview.location}</div>
                <div><span className="font-medium">Interviewer:</span> {interview.interviewer}</div>
              </div>
              <div className="mt-3 text-sm text-gray-600 italic">We look forward to seeing you soon!</div>
              <div className="mt-4">
                <button type="button" className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700" onClick={() => setShowSuccessDialog(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Retract Application Dialog */}
      {showRetractDialog && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50" onClick={() => setShowRetractDialog(false)}>
          <div className="bg-white rounded-md w-full max-w-md mx-4 overflow-hidden border" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">Retract Application</h3>
            </div>
            <div className="p-4 text-sm text-gray-700">
              Are you sure you want to retract your application? This action cannot be undone and you will need to reapply if you change your mind.
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button type="button" className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300" onClick={() => setShowRetractDialog(false)}>Cancel</button>
              <button
                type="button"
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                onClick={() => {
                  setShowRetractDialog(false);
                  setApplicationRetracted(true);
                  alert("Your application has been successfully retracted.");
                }}
              >
                Retract Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApplicantApplications;


