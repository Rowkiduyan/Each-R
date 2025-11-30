import { useState } from "react";
import { useEmployeeUser } from "./layouts/EmployeeLayout";

<<<<<<< HEAD
function  EmployeeSeparation () {
  const { userId, userEmail } = useEmployeeUser();
  const [status1, setStatus1] = useState("Validated");
  const [status2, setStatus2] = useState("None");
  const [status3, setStatus3] = useState("None");
    return(
    <>
        <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Separation</h1>
        <div className="bg-white shadow-md rounded-lg overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 md:px-4 md:py-2 lg:px-8 lg:py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">File</th>
                <th className="px-6 py-3 md:px-4 md:py-2 lg:px-8 lg:py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 md:px-4 md:py-2 lg:px-8 lg:py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Submit</th>
                <th className="px-6 py-3 md:px-4 md:py-2 lg:px-8 lg:py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Remove</th>
                <th className="px-6 py-3 md:px-4 md:py-2 lg:px-8 lg:py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 md:px-4 md:py-3 lg:px-8 lg:py-4 whitespace-nowrap text-sm md:text-base text-gray-900"><a href="resignation_letter.pdf" download>resignation_letter.pdf</a></td>
                <td className="px-6 py-4 md:px-4 md:py-3 lg:px-8 lg:py-4 whitespace-nowrap text-sm md:text-base text-gray-900">Resignation Letter</td>
                <td className="px-6 py-4 md:px-4 md:py-3 lg:px-8 lg:py-4 whitespace-nowrap text-sm md:text-base text-gray-900"><button onClick={() => setStatus1("Submitted")} className="bg-green-500 text-white rounded cursor-pointer px-4 py-2">Submit</button></td>
                <td className="px-6 py-4 md:px-4 md:py-3 lg:px-8 lg:py-4 whitespace-nowrap text-sm md:text-base text-gray-900"><button onClick={() => setStatus1("None")} className="bg-red-500 text-white rounded cursor-pointer px-4 py-2">Remove</button></td>
                <td className="px-6 py-4 md:px-4 md:py-3 lg:px-8 lg:py-4 whitespace-nowrap text-sm md:text-base text-gray-900" style={status1 === "Validated" ? {backgroundColor: 'green', color: 'white'} : status1 === "Submitted" ? {backgroundColor: 'orange', color: 'white'} : {backgroundColor: 'white', color: 'black'}}>{status1}</td>
              </tr>
            </tbody>
          </table>
=======
function EmployeeSeparation() {
  // Stage 1: Resignation Letter
  const [resignationFile, setResignationFile] = useState(null);
  const [resignationStatus, setResignationStatus] = useState("None"); // None, Submitted, Validated
  
  // Stage 2: Clearance & Exit Interview (unlocked when resignation is validated)
  const [exitClearanceFile, setExitClearanceFile] = useState(null);
  const [exitInterviewFile, setExitInterviewFile] = useState(null);
  const [exitClearanceStatus, setExitClearanceStatus] = useState("None");
  const [exitInterviewStatus, setExitInterviewStatus] = useState("None");
  
  // Stage 3: Final Review
  const [clearanceReviewStatus, setClearanceReviewStatus] = useState("Pending Validation");
  const [interviewReviewStatus, setInterviewReviewStatus] = useState("Pending Validation");

  const isStage2Unlocked = resignationStatus === "Validated";
  const isStage3Active = exitClearanceStatus === "Submitted" && exitInterviewStatus === "Submitted";

  const handleResignationSubmit = () => {
    if (resignationFile) {
      setResignationStatus("Submitted");
    }
  };

  const handleExitClearanceSubmit = () => {
    if (exitClearanceFile) {
      setExitClearanceStatus("Submitted");
    }
  };

  const handleExitInterviewSubmit = () => {
    if (exitInterviewFile) {
      setExitInterviewStatus("Submitted");
    }
  };

  // Determine current stage for progress bar
  const getCurrentStage = () => {
    if (resignationStatus === "Validated" && isStage3Active) return 3;
    if (resignationStatus === "Validated") return 2;
    return 1;
  };

  const currentStage = getCurrentStage();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Separation Process</h1>

      {/* Progress Bar */}
      <div className="mb-12">
        <div className="flex items-center justify-between relative">
          {/* Progress Line */}
          <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 z-0">
            <div 
              className="h-full bg-blue-600 transition-all duration-500"
              style={{ width: `${((currentStage - 1) / 2) * 100}%` }}
            ></div>
          </div>

          {/* Stage 1 */}
          <div className="relative z-10 flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              currentStage >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {resignationStatus === "Validated" ? '✓' : '1'}
            </div>
            <div className="mt-2 text-center">
              <p className="text-sm font-medium text-gray-700">Resignation</p>
              <p className="text-xs text-gray-500">Submission</p>
            </div>
          </div>

          {/* Stage 2 */}
          <div className="relative z-10 flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              currentStage >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            } ${!isStage2Unlocked ? 'opacity-50' : ''}`}>
              {isStage3Active ? '✓' : '2'}
            </div>
            <div className="mt-2 text-center">
              <p className="text-sm font-medium text-gray-700">Clearance &</p>
              <p className="text-xs text-gray-500">Exit Interview</p>
            </div>
          </div>

          {/* Stage 3 */}
          <div className="relative z-10 flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              currentStage >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              3
            </div>
            <div className="mt-2 text-center">
              <p className="text-sm font-medium text-gray-700">Final</p>
              <p className="text-xs text-gray-500">Review</p>
            </div>
          </div>
>>>>>>> alexisfix
        </div>
      </div>

      {/* Stage 1: Resignation Submission */}
      <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Stage 1: Resignation Submission</h2>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            resignationStatus === "Validated" ? 'bg-green-100 text-green-800' :
            resignationStatus === "Submitted" ? 'bg-orange-100 text-orange-800' :
            'bg-gray-100 text-gray-600'
          }`}>
            {resignationStatus === "Validated" ? "Validated" : resignationStatus === "Submitted" ? "Pending HR Review" : "Not Submitted"}
          </span>
        </div>
        <p className="text-gray-600 mb-4">Upload your resignation letter to begin the separation process.</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resignation Letter
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setResignationFile(e.target.files[0])}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              disabled={resignationStatus === "Validated"}
            />
            {resignationFile && (
              <p className="mt-2 text-sm text-gray-600">Selected: {resignationFile.name}</p>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleResignationSubmit}
              disabled={!resignationFile || resignationStatus === "Validated"}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Submit
            </button>
            {resignationFile && resignationStatus !== "Validated" && (
              <button
                onClick={() => {
                  setResignationFile(null);
                  setResignationStatus("None");
                }}
                className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stage 2: Clearance & Exit Interview */}
      <div className={`bg-white shadow-lg rounded-lg p-6 mb-6 ${!isStage2Unlocked ? 'opacity-60' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Stage 2: Clearance & Exit Interview</h2>
          {!isStage2Unlocked && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              Locked - Awaiting HR Approval
            </span>
          )}
        </div>
        <p className="text-gray-600 mb-4">
          {!isStage2Unlocked 
            ? "This stage will be unlocked once HR validates your resignation letter."
            : "Download the forms, complete them, and upload the signed documents."}
        </p>

        {isStage2Unlocked ? (
          <div className="space-y-6">
            {/* Exit Clearance Form */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-800 mb-3">Exit Clearance Form</h3>
              <div className="space-y-3">
                <a
                  href="exitform.pdf"
                  download
                  className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Form
                </a>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Signed Exit Clearance Form
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setExitClearanceFile(e.target.files[0])}
                    disabled={exitClearanceStatus === "Submitted"}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                  />
                  {exitClearanceFile && (
                    <p className="mt-2 text-sm text-gray-600">Selected: {exitClearanceFile.name}</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleExitClearanceSubmit}
                    disabled={!exitClearanceFile || exitClearanceStatus === "Submitted"}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    Submit
                  </button>
                  {exitClearanceFile && exitClearanceStatus !== "Submitted" && (
                    <button
                      onClick={() => {
                        setExitClearanceFile(null);
                        setExitClearanceStatus("None");
                      }}
                      className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {exitClearanceStatus === "Submitted" && (
                  <p className="text-sm text-orange-600 font-medium">✓ Submitted - Awaiting HR Review</p>
                )}
              </div>
            </div>

            {/* Exit Interview Form */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-800 mb-3">Exit Interview Form</h3>
              <div className="space-y-3">
                <a
                  href="interviewform.pdf"
                  download
                  className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Form
                </a>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Signed Exit Interview Form
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setExitInterviewFile(e.target.files[0])}
                    disabled={exitInterviewStatus === "Submitted"}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                  />
                  {exitInterviewFile && (
                    <p className="mt-2 text-sm text-gray-600">Selected: {exitInterviewFile.name}</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleExitInterviewSubmit}
                    disabled={!exitInterviewFile || exitInterviewStatus === "Submitted"}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    Submit
                  </button>
                  {exitInterviewFile && exitInterviewStatus !== "Submitted" && (
                    <button
                      onClick={() => {
                        setExitInterviewFile(null);
                        setExitInterviewStatus("None");
                      }}
                      className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {exitInterviewStatus === "Submitted" && (
                  <p className="text-sm text-orange-600 font-medium">✓ Submitted - Awaiting HR Review</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p>This section is locked until your resignation letter is validated by HR.</p>
          </div>
        )}
      </div>

      {/* Stage 3: Final Review */}
      {isStage3Active && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Stage 3: Final Review</h2>
          </div>
          <p className="text-gray-600 mb-6">HR is reviewing your submitted documents. Status updates will appear below.</p>

          <div className="space-y-4">
            {/* Exit Clearance Review Status */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-800">Exit Clearance Form</h3>
                  <p className="text-sm text-gray-600 mt-1">Review Status</p>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                  clearanceReviewStatus === "Validated" ? 'bg-green-100 text-green-800' :
                  clearanceReviewStatus === "Re-submission Required" ? 'bg-red-100 text-red-800' :
                  'bg-orange-100 text-orange-800'
                }`}>
                  {clearanceReviewStatus}
                </span>
              </div>
            </div>

            {/* Exit Interview Review Status */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-800">Exit Interview Form</h3>
                  <p className="text-sm text-gray-600 mt-1">Review Status</p>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                  interviewReviewStatus === "Validated" ? 'bg-green-100 text-green-800' :
                  interviewReviewStatus === "Re-submission Required" ? 'bg-red-100 text-red-800' :
                  'bg-orange-100 text-orange-800'
                }`}>
                  {interviewReviewStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeSeparation;