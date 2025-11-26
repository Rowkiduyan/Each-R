import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Logo from './Logo.png';

function ApplicantApplications() {
  const steps = ["Application", "Assessment", "Requirements", "Agreements"];
  const [activeStep, setActiveStep] = useState("Application");
  const [loading, setLoading] = useState(true);
  const [applicationData, setApplicationData] = useState(null);
  const [jobData, setJobData] = useState(null);
  const [profileData, setProfileData] = useState(null);
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

  // Requirements: Document files and date validities
  const [documentFiles, setDocumentFiles] = useState({});
  const [documentDateValidities, setDocumentDateValidities] = useState({});
  const [uploadingDocuments, setUploadingDocuments] = useState({});
  const [submittingRequirements, setSubmittingRequirements] = useState(false);

  // Emergency contact information
  const [emergencyContact, setEmergencyContact] = useState({
    name: "",
    contactNumber: "",
    address: "",
    relation: "",
  });

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showRetractDialog, setShowRetractDialog] = useState(false);
  const [applicationRetracted, setApplicationRetracted] = useState(false);
  const [retracting, setRetracting] = useState(false);
  const [showRetractSuccess, setShowRetractSuccess] = useState(false);
  const [retractError, setRetractError] = useState('');

  const interview = {
  date: applicationData?.interview_date || applicationData?.payload?.interview?.date || applicationData?.payload?.form?.interview_date || null,
  time: applicationData?.interview_time || applicationData?.payload?.interview?.time || applicationData?.payload?.form?.interview_time || null,
  location: applicationData?.interview_location || applicationData?.payload?.interview?.location || applicationData?.payload?.form?.interview_location || null,
  interviewer: applicationData?.interviewer || applicationData?.payload?.interview?.interviewer || applicationData?.payload?.form?.interviewer || "",
};


  const resumeName = applicationData?.payload?.form?.resumeName;
  const resumePath = applicationData?.payload?.form?.resumePath || resumeName;
  const resumePublicUrl = resumePath
    ? supabase.storage.from('resume').getPublicUrl(resumePath)?.data?.publicUrl || null
    : null;

  const parseAddressParts = (record = {}) => {
    const address = record.address || '';
    const parts = address
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    return {
      street: record.street || parts[0] || '',
      barangay: record.barangay || parts[1] || '',
      city: record.city || parts[2] || '',
      zip: record.zip || parts[3] || '',
    };
  };

  // Fetch application data
  useEffect(() => {
    let channel;
    let userId = null;

    const fetchApplication = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        userId = user.id;

        // Fetch application for current user
        const { data: application, error: appError } = await supabase
          .from('applications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (appError) {
          console.error('Error fetching application:', appError);
          setLoading(false);
          return;
        }

        if (application) {
          // Parse payload if it's a string
          let payloadObj = application.payload;
          if (typeof payloadObj === 'string') {
            try {
              payloadObj = JSON.parse(payloadObj);
            } catch {
              payloadObj = {};
            }
          }

          // Load requirements data if exists - check both requirements column and payload
          let requirements = null;
          
          // First try requirements column
          if (application.requirements) {
            if (typeof application.requirements === 'string') {
              try {
                requirements = JSON.parse(application.requirements);
              } catch {
                requirements = null;
              }
            } else {
              requirements = application.requirements;
            }
          }
          
          // Fallback to payload if requirements column is empty
          if (!requirements && payloadObj?.requirements) {
            requirements = payloadObj.requirements;
            if (typeof requirements === 'string') {
              try {
                requirements = JSON.parse(requirements);
              } catch {
                requirements = {};
              }
            }
          }
          
          if (!requirements) {
            requirements = {};
          }

          // Update application data with parsed requirements
          setApplicationData({
            ...application,
            requirements: requirements,
            payload: payloadObj
          });

          // Check if interview is confirmed (check both column and payload)
          let isConfirmed = false;
          if (application.interview_confirmed || application.interview_confirmed_at) {
            isConfirmed = true;
          } else {
            if (payloadObj?.interview_confirmed || payloadObj?.interview_confirmed_at) {
              isConfirmed = true;
            }
          }
          
          if (isConfirmed) {
            setStepStatus((s) => ({ ...s, Assessment: "done" }));
          }

          if (requirements.id_numbers) {
            const idNums = requirements.id_numbers;
            setIdFields({
              sss: idNums.sss?.value || "",
              philhealth: idNums.philhealth?.value || "",
              pagibig: idNums.pagibig?.value || "",
              tin: idNums.tin?.value || "",
            });
            setIdLocked({
              sss: !!idNums.sss?.value,
              philhealth: !!idNums.philhealth?.value,
              pagibig: !!idNums.pagibig?.value,
              tin: !!idNums.tin?.value,
            });
          }

          if (requirements.emergency_contact) {
            setEmergencyContact({
              name: requirements.emergency_contact.name || "",
              contactNumber: requirements.emergency_contact.contact_number || requirements.emergency_contact.contactNumber || "",
              address: requirements.emergency_contact.address || "",
              relation: requirements.emergency_contact.relation || "",
            });
          }

          // Load document date validities and log documents for debugging
          if (requirements.documents && Array.isArray(requirements.documents)) {
            console.log('Loaded requirements documents:', requirements.documents);
            console.log('Total documents loaded:', requirements.documents.length);
            requirements.documents.forEach((doc, idx) => {
              console.log(`Document ${idx}:`, doc.key, doc.name, doc.file_path);
            });
            const dateValidities = {};
            requirements.documents.forEach(doc => {
              if (doc.date_validity && doc.key) {
                dateValidities[doc.key] = doc.date_validity;
              }
            });
            setDocumentDateValidities(dateValidities);
          } else {
            console.log('No documents found in requirements:', requirements);
            console.log('Requirements object:', JSON.stringify(requirements, null, 2));
          }

          if (requirements.submitted) {
            setStepStatus((s) => ({ ...s, Requirements: "done" }));
          }

          // Fetch job data if job_id exists
          if (application.job_id) {
            const { data: job, error: jobError } = await supabase
              .from('job_posts')
              .select('title, depot')
              .eq('id', application.job_id)
              .maybeSingle();

            if (!jobError && job) {
              setJobData(job);
            }
          }
        }

        const { data: profile, error: profileError } = await supabase
          .from('applicants')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();

        if (!profileError && profile) {
          const addressParts = parseAddressParts(profile);
          setProfileData({ ...profile, ...addressParts });
        }

        setLoading(false);
      } catch (error) {
        console.error('Error:', error);
        setLoading(false);
      }
    };

    fetchApplication();

    // Set up realtime subscription to refresh when application is updated
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        channel = supabase
          .channel(`application-updates-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'applications',
              filter: `user_id=eq.${user.id}`
            },
            () => {
              fetchApplication();
            }
          )
          .subscribe();
      }
    })();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

//   const getStepClasses = (step) => {
//     const base = "px-4 py-1 rounded text-sm font-semibold border";
//     const status = stepStatus[step];
//     if (status === "done") return `${base} bg-green-100 text-green-800 border-green-300`;
//     if (status === "pending") return `${base} bg-yellow-100 text-yellow-800 border-yellow-300`;
//     return `${base} bg-orange-100 text-orange-800 border-orange-300`;
//   };

  const handleRetractApplication = async () => {
    if (!applicationData?.id || retracting) return;

    try {
      setRetracting(true);
      setRetractError('');
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', applicationData.id)
        .eq('user_id', applicationData.user_id);

      if (error) {
        throw error;
      }

      setApplicationRetracted(true);
      setApplicationData(null);
      setJobData(null);
      setStepStatus({
        Application: 'waiting',
        Assessment: 'waiting',
        Requirements: 'waiting',
        Agreements: 'waiting',
      });
      setShowRetractDialog(false);
      setShowRetractSuccess(true);
    } catch (err) {
      console.error('Error retracting application:', err);
      setRetractError('Failed to retract application. Please try again.');
    } finally {
      setRetracting(false);
    }
  };

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
          {loading ? (
            <div className="p-8 text-center text-gray-600">Loading application data...</div>
          ) : !applicationData ? (
            <div className="p-8 text-center text-gray-600">No application found.</div>
          ) : (
            <>
              {/* Application */}
              <section className={`p-4 ${activeStep === "Application" ? "" : "hidden"}`}>
                {/* Header row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                      {applicationData.payload?.form?.firstName?.[0] || ''}{applicationData.payload?.form?.lastName?.[0] || ''}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">
                        {applicationData.payload?.form?.lastName || ''}, {applicationData.payload?.form?.firstName || ''} {applicationData.payload?.form?.middleName || ''}
                      </div>
                      <div className="text-xs text-gray-500">
                        Applied: {new Date(applicationData.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">#{applicationData.id.slice(0, 8)}</div>
                    <button 
                      type="button" 
                      className="text-sm text-blue-600 hover:underline mt-2 disabled:text-gray-400 disabled:cursor-not-allowed"
                      onClick={() => setShowRetractDialog(true)}
                      disabled={applicationRetracted || retracting}
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
                    <div><span className="font-semibold">Position Applying For:</span> {jobData?.title || applicationData.payload?.job?.title || 'N/A'}</div>
                    <div><span className="font-semibold">Current Employment Status:</span> {applicationData.payload?.form?.employed === 'Yes' ? 'Employed' : 'Unemployed'}</div>
                    <div><span className="font-semibold">Available Start Date:</span> {applicationData.payload?.form?.startDate ? new Date(applicationData.payload.form.startDate).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) : 'N/A'}</div>
                    <div><span className="font-semibold">Depot:</span> {jobData?.depot || applicationData.payload?.job?.depot || 'N/A'}</div>
                    <div>
                      <span className="font-semibold">Resume:</span>{' '}
                      {resumePublicUrl ? (
                        <a 
                          href={resumePublicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {applicationData.payload.form.resumeName || 'View Resume'}
                        </a>
                      ) : (
                        <span className="text-gray-500">No resume uploaded</span>
                      )}
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div className="bg-gray-100 text-gray-800 px-3 py-2 text-sm font-semibold border-b">Personal Information</div>
                  <div className="p-3 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                    <div>
                      <span className="font-semibold">Full Name:</span>{' '}
                      {applicationData.payload?.form?.lastName || ''}, {applicationData.payload?.form?.firstName || ''} {applicationData.payload?.form?.middleName || ''}
                    </div>
                    <div><span className="font-semibold">Sex:</span> {applicationData.payload?.form?.sex || 'N/A'}</div>
                    <div>
                      <span className="font-semibold">Address:</span>{' '}
                      {(() => {
                        const addressParts = profileData
                          ? [
                              profileData.street,
                              profileData.barangay,
                              profileData.city,
                              profileData.zip,
                            ]
                          : [
                              applicationData.payload?.form?.street,
                              applicationData.payload?.form?.barangay,
                              applicationData.payload?.form?.city,
                              applicationData.payload?.form?.zip,
                            ];
                        return addressParts.filter(Boolean).join(', ') || 'N/A';
                      })()}
                    </div>
                    <div>
                      <span className="font-semibold">Birthday:</span>{' '}
                      {applicationData.payload?.form?.birthday ? new Date(applicationData.payload.form.birthday).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) : 'N/A'}
                    </div>
                    <div><span className="font-semibold">Contact Number:</span> {applicationData.payload?.form?.contact || 'N/A'}</div>
                    <div>
                      <span className="font-semibold">Age:</span>{' '}
                      {applicationData.payload?.form?.birthday ? 
                        Math.floor((new Date() - new Date(applicationData.payload.form.birthday)) / (365.25 * 24 * 60 * 60 * 1000)) : 'N/A'}
                    </div>
                    <div><span className="font-semibold">Email:</span> {applicationData.payload?.form?.email || 'N/A'}</div>
                    <div>
                      <span className="font-semibold">Marital Status:</span>{' '}
                      {profileData?.marital_Status ||
                        applicationData.payload?.form?.marital_status ||
                        'N/A'}
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* Assessment */}
          {applicationData && (
            <section className={`p-4 ${activeStep === "Assessment" ? "" : "hidden"}`}>
              {/* Header summary */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                    {applicationData.payload?.form?.firstName?.[0] || ''}{applicationData.payload?.form?.lastName?.[0] || ''}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">
                      {applicationData.payload?.form?.lastName || ''}, {applicationData.payload?.form?.firstName || ''} {applicationData.payload?.form?.middleName || ''}
                    </div>
                    <div className="text-xs text-gray-500">
                      Applied: {new Date(applicationData.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">#{applicationData.id.slice(0, 8)}</div>
                  <button 
                    type="button" 
                    className="text-sm text-blue-600 hover:underline mt-2 disabled:text-gray-400 disabled:cursor-not-allowed"
                    onClick={() => setShowRetractDialog(true)}
                    disabled={applicationRetracted || retracting}
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
                  <div className="bg-gray-50 border rounded-md p-3 space-y-2">
                    {/* Interview Details File */}
                    {(() => {
                      const interviewFile = applicationData?.interview_details_file || applicationData?.payload?.interview_details_file;
                      if (interviewFile) {
                        const fileUrl = supabase.storage.from('application-files').getPublicUrl(interviewFile)?.data?.publicUrl;
                        const fileName = interviewFile.split('/').pop() || 'Interview Details';
                        return (
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-600">
                        <path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75ZM6.75 15a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V15.75a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V15.75a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                      </svg>
                            <a 
                              href={fileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              {fileName}
                            </a>
                    </div>
                        );
                      }
                      return null;
                    })()}
                    
                    {/* Assessment Results File */}
                    {(() => {
                      const assessmentFile = applicationData?.assessment_results_file || applicationData?.payload?.assessment_results_file;
                      if (assessmentFile) {
                        const fileUrl = supabase.storage.from('application-files').getPublicUrl(assessmentFile)?.data?.publicUrl;
                        const fileName = assessmentFile.split('/').pop() || 'Assessment Results';
                        return (
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-600">
                              <path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75ZM6.75 15a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V15.75a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V15.75a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                            </svg>
                            <a 
                              href={fileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              {fileName}
                            </a>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    {/* Show message if no files uploaded yet */}
                    {!applicationData?.interview_details_file && 
                     !applicationData?.assessment_results_file &&
                     !applicationData?.payload?.interview_details_file &&
                     !applicationData?.payload?.assessment_results_file && (
                      <div className="text-sm text-gray-500 italic">
                        No assessment files uploaded yet. Please wait for HR to upload your assessment results.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Requirements */}
          {applicationData && (
            <section className={`p-4 ${activeStep === "Requirements" ? "" : "hidden"}`}>
              {/* Header summary (same as Application header portion inside card) */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                    {applicationData.payload?.form?.firstName?.[0] || ''}{applicationData.payload?.form?.lastName?.[0] || ''}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">
                      {applicationData.payload?.form?.lastName || ''}, {applicationData.payload?.form?.firstName || ''} {applicationData.payload?.form?.middleName || ''}
                    </div>
                    <div className="text-xs text-gray-500">
                      Applied: {new Date(applicationData.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">#{applicationData.id.slice(0, 8)}</div>
                  <button 
                    type="button" 
                    className="text-sm text-blue-600 hover:underline mt-2 disabled:text-gray-400 disabled:cursor-not-allowed"
                    onClick={() => setShowRetractDialog(true)}
                    disabled={applicationRetracted || retracting}
                  >
                    {applicationRetracted ? "Application Retracted" : "Retract Application"}
                  </button>
                </div>
              </div>

            {/* ID numbers row with lock/unlock */}
            {(() => {
              let requirements = applicationData?.requirements;
              if (typeof requirements === 'string') {
                try { requirements = JSON.parse(requirements); } catch { requirements = {}; }
              }
              const idNumbers = requirements?.id_numbers || {};

              return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  {[{key: 'sss', label: 'SSS No.'}, {key: 'philhealth', label: 'Philhealth No.'}, {key: 'pagibig', label: 'Pag-IBIG No.'}, {key: 'tin', label: 'TIN No.'}].map((item) => {
                    const idData = idNumbers[item.key];
                    const idStatus = idData?.status || "Submitted";
                    const idRemarks = idData?.remarks || "";

                    return (
                      <div key={item.key} className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
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
                        {idData && (
                          <div className="flex flex-col gap-1">
                            <span className={`text-xs px-2 py-1 rounded ${
                              idStatus === "Validated" 
                                ? "bg-green-100 text-green-800" 
                                : idStatus === "Re-submit"
                                ? "bg-red-100 text-red-800"
                                : "bg-orange-100 text-orange-800"
                            }`}>
                              {idStatus}
                            </span>
                            {idRemarks && (
                              <div className="text-xs text-gray-600 italic">HR Remarks: {idRemarks}</div>
                            )}
            </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Documents table-like list */}
            <div className="bg-gray-100 text-gray-800 px-3 py-2 text-sm font-semibold border rounded-t-md">Document Name</div>
            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-gray-600 border-b">
              <div className="col-span-6">&nbsp;</div>
              <div className="col-span-3">Submission</div>
              <div className="col-span-3">Remarks</div>
            </div>

            {(() => {
              // Get requirements data - ensure it's properly loaded
              let requirements = applicationData?.requirements;
              
              // If requirements is not set, try to get it from payload
              if (!requirements && applicationData?.payload) {
                let payload = applicationData.payload;
                if (typeof payload === 'string') {
                  try {
                    payload = JSON.parse(payload);
                  } catch {
                    payload = {};
                  }
                }
                requirements = payload?.requirements;
              }
              
              // Parse if string
              if (typeof requirements === 'string') {
                try { 
                  requirements = JSON.parse(requirements); 
                } catch { 
                  requirements = {}; 
                }
              }
              
              if (!requirements) {
                requirements = {};
              }
              
              const submittedDocuments = requirements?.documents || [];
              console.log('Rendering documents - submittedDocuments:', submittedDocuments);
              console.log('Rendering documents - requirements:', requirements);
              console.log('Rendering documents - applicationData:', applicationData);
              console.log('Rendering documents - applicationData.requirements:', applicationData?.requirements);

              return [
                {name: 'PSA Birth Certificate *', key: 'psa_birth_certificate'},
                {name: "Photocopy of Driver's License (Front and Back) *", key: 'drivers_license'},
                {name: 'Photocopy of SSS ID', key: 'sss_id'},
                {name: 'Photocopy of TIN ID', key: 'tin_id'},
                {name: 'Photocopy of Philhealth MDR', key: 'philhealth_mdr'},
                {name: 'Photocopy of HDMF or Proof of HDMF No. (Pag-IBIG)', key: 'pagibig'},
                {name: 'Medical Examination Results *', hasDate: true, dateLabel: 'Date Validity *', key: 'medical_exam'},
                {name: 'NBI Clearance', hasDate: true, dateLabel: 'Date Validity *', key: 'nbi_clearance'},
                {name: 'Police Clearance', hasDate: true, dateLabel: 'Date Validity *', key: 'police_clearance'},
              ].map((doc, idx) => {
                const docKey = doc.key || `doc_${idx}`;
                const file = documentFiles[docKey];
                // Get date validity from state or existing file
                const existingFile = submittedDocuments.find(d => d.key === docKey || d.name === doc.name);
                const dateValidity = documentDateValidities[docKey] || existingFile?.date_validity || "";
                const isUploading = uploadingDocuments[docKey];

              return (
              <div key={idx} className="border-b">
                <div className="grid grid-cols-12 items-center gap-3 px-3 py-3">
                  <div className="col-span-12 md:col-span-6 text-sm text-gray-800">
                    {doc.name}
                    {doc.hasDate && (
                      <div className="mt-2">
                        <label className="text-xs text-gray-600 mr-2">{doc.dateLabel}</label>
                          <input 
                            type="date" 
                            value={dateValidity}
                            onChange={(e) => setDocumentDateValidities(prev => ({ ...prev, [docKey]: e.target.value }))}
                            className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500" 
                          />
                      </div>
                    )}
                  </div>
                  <div className="col-span-12 md:col-span-3">
                    <div className="flex items-center gap-2">
                        {existingFile?.file_path ? (
                          <div className="flex items-center gap-2">
                            <a 
                              href={supabase.storage.from('application-files').getPublicUrl(existingFile.file_path)?.data?.publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-xs"
                            >
                              {existingFile.file_path.split('/').pop()}
                            </a>
                            <button
                              type="button"
                              className="text-xs px-2 py-1 text-red-600 hover:text-red-800"
                              onClick={() => {
                                // Allow re-upload by clearing existing file reference
                                setDocumentFiles(prev => {
                                  const newFiles = { ...prev };
                                  delete newFiles[docKey];
                                  return newFiles;
                                });
                              }}
                            >
                              Change
                            </button>
                          </div>
                        ) : file ? (
                          <div className="flex items-center gap-2">
                            <span className="text-blue-600 text-xs">{file.name}</span>
                            <button
                              type="button"
                              className="text-xs px-2 py-1 text-red-600 hover:text-red-800"
                              onClick={() => {
                                setDocumentFiles(prev => {
                                  const newFiles = { ...prev };
                                  delete newFiles[docKey];
                                  return newFiles;
                                });
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                      <label className="inline-flex items-center gap-2 px-2 py-1 border border-gray-300 rounded bg-white text-xs cursor-pointer hover:bg-gray-50">
                            <input 
                              type="file" 
                              accept=".pdf,.docx" 
                              className="hidden" 
                              onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                                  setDocumentFiles(prev => ({ ...prev, [docKey]: e.target.files[0] }));
                          }
                              }} 
                            />
                        <span>Choose File</span>
                        <span className="text-gray-500">No file chosen</span>
                      </label>
                        )}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">PDF, DOCX | Max file size 10 mb</div>
                  </div>
                  <div className="col-span-12 md:col-span-3">
                      {existingFile?.file_path ? (
                        <div className="flex flex-col gap-1">
                          <span className={`inline-block text-xs px-3 py-1 rounded ${
                            existingFile.status === "Validated" 
                              ? "bg-green-100 text-green-800 border border-green-300" 
                              : existingFile.status === "Re-submit"
                              ? "bg-red-100 text-red-800 border border-red-300"
                              : "bg-orange-100 text-orange-800 border border-orange-300"
                          }`}>
                            {existingFile.status || "Submitted"}
                          </span>
                          {existingFile.remarks && (
                            <div className="text-xs text-gray-600 italic mt-1">HR Remarks: {existingFile.remarks}</div>
                          )}
                        </div>
                      ) : file ? (
                        <span className="inline-block text-xs px-3 py-1 rounded bg-blue-100 text-blue-800">Ready to upload</span>
                      ) : (
                    <span className="inline-block text-xs px-3 py-1 rounded bg-red-700 text-white">No File</span>
                      )}
                  </div>
                </div>
              </div>
              );
              });
            })()}

            {/* Emergency contact */}
            <div className="mt-4">
              <div className="text-sm font-semibold text-gray-800 mb-2">Emergency Contact Information</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                <input 
                  type="text" 
                  placeholder="Contact Person's Name *" 
                  value={emergencyContact.name}
                  onChange={(e) => setEmergencyContact(prev => ({ ...prev, name: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500" 
                />
                <input 
                  type="text" 
                  placeholder="Contact Person's Contact Number *" 
                  value={emergencyContact.contactNumber}
                  onChange={(e) => setEmergencyContact(prev => ({ ...prev, contactNumber: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500" 
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                <input 
                  type="text" 
                  placeholder="Contact Person's Address *" 
                  value={emergencyContact.address}
                  onChange={(e) => setEmergencyContact(prev => ({ ...prev, address: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500" 
                />
                <input 
                  type="text" 
                  placeholder="Relation *" 
                  value={emergencyContact.relation}
                  onChange={(e) => setEmergencyContact(prev => ({ ...prev, relation: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500" 
                />
              </div>
              <div className="text-xs text-gray-600 italic mt-2">Important Reminder: Please wait for your requirements to be validated by your HR Department. Once validated, you may now proceed onsite to further process your employment.</div>
              <div className="flex justify-end mt-4">
                <button 
                  type="button" 
                  className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
                  disabled={submittingRequirements}
                  onClick={async () => {
                    if (!applicationData?.id) {
                      alert("No application found. Please refresh the page.");
                      return;
                    }

                    // Validate required fields
                    if (!emergencyContact.name || !emergencyContact.contactNumber || !emergencyContact.address || !emergencyContact.relation) {
                      alert("Please fill in all emergency contact fields.");
                      return;
                    }

                    setSubmittingRequirements(true);
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) {
                        alert("Please log in again.");
                        return;
                      }

                      // Upload all document files
                      const documents = [];
                      const docList = [
                        {name: 'PSA Birth Certificate *', key: 'psa_birth_certificate'},
                        {name: "Photocopy of Driver's License (Front and Back) *", key: 'drivers_license'},
                        {name: 'Photocopy of SSS ID', key: 'sss_id'},
                        {name: 'Photocopy of TIN ID', key: 'tin_id'},
                        {name: 'Photocopy of Philhealth MDR', key: 'philhealth_mdr'},
                        {name: 'Photocopy of HDMF or Proof of HDMF No. (Pag-IBIG)', key: 'pagibig'},
                        {name: 'Medical Examination Results *', hasDate: true, key: 'medical_exam'},
                        {name: 'NBI Clearance', hasDate: true, key: 'nbi_clearance'},
                        {name: 'Police Clearance', hasDate: true, key: 'police_clearance'},
                      ];

                      for (const doc of docList) {
                        const docKey = doc.key;
                        const file = documentFiles[docKey];
                        const dateValidity = documentDateValidities[docKey] || null;

                        // Check if file already exists in requirements
                        let existingDoc = null;
                        if (applicationData?.requirements) {
                          let requirements = applicationData.requirements;
                          if (typeof requirements === 'string') {
                            try { requirements = JSON.parse(requirements); } catch { requirements = {}; }
                          }
                          existingDoc = requirements.documents?.find(d => d.key === docKey || d.name === doc.name);
                        }

                        if (file) {
                          // Upload new file
                          setUploadingDocuments(prev => ({ ...prev, [docKey]: true }));
                          const sanitizedFileName = file.name.replace(/\s+/g, '_');
                          const filePath = `requirements/${applicationData.id}/${docKey}/${Date.now()}-${sanitizedFileName}`;

                          const { data: uploadData, error: uploadError } = await supabase.storage
                            .from('application-files')
                            .upload(filePath, file, { upsert: true });

                          if (uploadError) {
                            throw new Error(`Failed to upload ${doc.name}: ${uploadError.message}`);
                          }

                          documents.push({
                            key: docKey,
                            name: doc.name,
                            file_path: uploadData.path,
                            date_validity: dateValidity,
                            status: "Submitted",
                            remarks: "",
                            submitted_at: new Date().toISOString(),
                          });
                        } else if (existingDoc) {
                          // Keep existing document data, but update date validity if changed
                          documents.push({
                            ...existingDoc,
                            date_validity: dateValidity || existingDoc.date_validity,
                          });
                        } else {
                          // No file uploaded for this document
                          documents.push({
                            key: docKey,
                            name: doc.name,
                            file_path: null,
                            date_validity: dateValidity,
                            status: "No File",
                            remarks: "",
                            submitted_at: new Date().toISOString(),
                          });
                        }
                        setUploadingDocuments(prev => ({ ...prev, [docKey]: false }));
                      }

                      // Prepare requirements data
                      const requirementsData = {
                        id_numbers: {
                          sss: { value: idFields.sss, status: "Submitted" },
                          philhealth: { value: idFields.philhealth, status: "Submitted" },
                          pagibig: { value: idFields.pagibig, status: "Submitted" },
                          tin: { value: idFields.tin, status: "Submitted" },
                        },
                        documents: documents,
                        emergency_contact: {
                          name: emergencyContact.name,
                          contact_number: emergencyContact.contactNumber,
                          address: emergencyContact.address,
                          relation: emergencyContact.relation,
                        },
                        submitted_at: new Date().toISOString(),
                        submitted: true,
                      };

                      // Try to update requirements column, fallback to payload
                      let updateSuccess = false;
                      const { error: updateError } = await supabase
                        .from('applications')
                        .update({ requirements: requirementsData })
                        .eq('id', applicationData.id);

                      if (updateError && updateError.code === 'PGRST204') {
                        // Column doesn't exist, store in payload
                        console.log('Requirements column not found, saving to payload');
                        let currentPayload = applicationData.payload;
                        if (typeof currentPayload === 'string') {
                          try {
                            currentPayload = JSON.parse(currentPayload);
                          } catch {
                            currentPayload = {};
                          }
                        }
                        
                        const updatedPayload = {
                          ...currentPayload,
                          requirements: requirementsData
                        };
                        
                        const { error: payloadError } = await supabase
                          .from('applications')
                          .update({ payload: updatedPayload })
                          .eq('id', applicationData.id);
                        
                        if (payloadError) {
                          throw payloadError;
                        }
                        updateSuccess = true;
                      } else if (updateError) {
                        throw updateError;
                      } else {
                        updateSuccess = true;
                      }

                      // Reload application data to ensure we have the latest
                      if (updateSuccess) {
                        const { data: updatedApp, error: reloadError } = await supabase
                          .from('applications')
                          .select('*')
                          .eq('id', applicationData.id)
                          .single();
                        
                        if (!reloadError && updatedApp) {
                          // Parse payload and requirements properly
                          let payloadObj = updatedApp.payload;
                          if (typeof payloadObj === 'string') {
                            try {
                              payloadObj = JSON.parse(payloadObj);
                            } catch {
                              payloadObj = {};
                            }
                          }

                          // Get requirements from column or payload
                          let loadedRequirements = null;
                          if (updatedApp.requirements) {
                            if (typeof updatedApp.requirements === 'string') {
                              try {
                                loadedRequirements = JSON.parse(updatedApp.requirements);
                              } catch {
                                loadedRequirements = null;
                              }
                            } else {
                              loadedRequirements = updatedApp.requirements;
                            }
                          }
                          
                          if (!loadedRequirements && payloadObj?.requirements) {
                            loadedRequirements = payloadObj.requirements;
                            if (typeof loadedRequirements === 'string') {
                              try {
                                loadedRequirements = JSON.parse(loadedRequirements);
                              } catch {
                                loadedRequirements = {};
                              }
                            }
                          }
                          
                          if (!loadedRequirements) {
                            loadedRequirements = requirementsData; // Use what we just saved
                          }

                          setApplicationData({
                            ...updatedApp,
                            requirements: loadedRequirements,
                            payload: payloadObj
                          });
                        } else {
                          // Update local state as fallback
                          setApplicationData(prev => ({
                            ...prev,
                            requirements: requirementsData,
                            payload: prev.payload ? (typeof prev.payload === 'string' ? JSON.parse(prev.payload) : prev.payload) : {}
                          }));
                        }
                      }

                    setStepStatus(prev => ({ ...prev, Requirements: "done", Agreements: "pending" }));
                    setActiveStep("Agreements");
                    alert("Requirements submitted successfully! You can now proceed to Agreements.");
                    } catch (err) {
                      console.error('Error submitting requirements:', err);
                      alert(`Failed to submit requirements: ${err.message || 'Unknown error'}`);
                    } finally {
                      setSubmittingRequirements(false);
                    }
                  }}
                >
                  {submittingRequirements ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
          </section>
          )}

          {/* Agreements */}
          {applicationData && (
            <section className={`p-4 ${activeStep === "Agreements" ? "" : "hidden"}`}>
              {/* Header summary */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                    {applicationData.payload?.form?.firstName?.[0] || ''}{applicationData.payload?.form?.lastName?.[0] || ''}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">
                      {applicationData.payload?.form?.lastName || ''}, {applicationData.payload?.form?.firstName || ''} {applicationData.payload?.form?.middleName || ''}
                    </div>
                    <div className="text-xs text-gray-500">
                      Applied: {new Date(applicationData.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">#{applicationData.id.slice(0, 8)}</div>
                  <button 
                    type="button" 
                    className="text-sm text-blue-600 hover:underline mt-2 disabled:text-gray-400 disabled:cursor-not-allowed"
                    onClick={() => setShowRetractDialog(true)}
                    disabled={applicationRetracted || retracting}
                  >
                    {applicationRetracted ? "Application Retracted" : "Retract Application"}
                  </button>
                  {applicationData.status === 'hired' && (
                    <>
                      <div className="text-lg font-bold text-green-600 mt-1">HIRED</div>
                      <div className="text-xs text-gray-500">
                        {applicationData.updated_at ? new Date(applicationData.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) : ''}
                      </div>
                    </>
                  )}
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
                  {(() => {
                    const appointmentLetter = applicationData?.appointment_letter_file || applicationData?.payload?.appointment_letter_file;
                    if (appointmentLetter) {
                      const fileUrl = supabase.storage.from('application-files').getPublicUrl(appointmentLetter)?.data?.publicUrl;
                      const fileName = appointmentLetter.split('/').pop() || 'Appointment Letter';
                      const uploadDate = applicationData.updated_at || applicationData.created_at;
                      return (
                        <>
                          <a 
                            href={fileUrl} 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {fileName}
                          </a>
                          {uploadDate && (
                            <span className="ml-2 text-xs text-gray-500">
                              {new Date(uploadDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}
                            </span>
                          )}
                        </>
                      );
                    }
                    return (
                      <span className="text-gray-400 italic">No appointment letter uploaded yet</span>
                    );
                  })()}
                </div>
                <div className="col-span-12 md:col-span-3" />
              </div>
            </div>

            <div className="text-xs text-gray-600 italic mt-4">
              Important: You have been successfully hired! Please see your email for your employee account details and you may login as an employee. Thank you.
            </div>
          </section>
          )}
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
                onClick={async () => {
                  if (!applicationData?.id) {
                    console.error('No application ID found');
                    return;
                  }

                  try {
                    const confirmedAt = new Date().toISOString();
                    
                    // Try to update the dedicated columns first (if they exist)
                    const { error: updateError } = await supabase
                      .from('applications')
                      .update({
                        interview_confirmed: true,
                        interview_confirmed_at: confirmedAt
                      })
                      .eq('id', applicationData.id);

                    // If columns don't exist, fall back to storing in payload
                    if (updateError && updateError.code === 'PGRST204') {
                      console.warn('Interview confirmation columns not found, storing in payload instead');
                      
                      // Get current payload
                      let currentPayload = applicationData.payload;
                      if (typeof currentPayload === 'string') {
                        try {
                          currentPayload = JSON.parse(currentPayload);
                        } catch {
                          currentPayload = {};
                        }
                      }
                      
                      // Update payload with confirmation
                      const updatedPayload = {
                        ...currentPayload,
                        interview_confirmed: true,
                        interview_confirmed_at: confirmedAt
                      };
                      
                      const { error: payloadError } = await supabase
                        .from('applications')
                        .update({ payload: updatedPayload })
                        .eq('id', applicationData.id);
                      
                      if (payloadError) {
                        console.error('Error updating payload:', payloadError);
                        alert('Failed to confirm interview. Please try again.');
                        return;
                      }
                      
                      // Update local state with payload method
                      setApplicationData((prev) => ({
                        ...prev,
                        payload: updatedPayload,
                        interview_confirmed: true,
                        interview_confirmed_at: confirmedAt
                      }));
                    } else if (updateError) {
                      // Some other error occurred
                      console.error('Error confirming interview:', updateError);
                      alert('Failed to confirm interview. Please try again.');
                      return;
                    } else {
                      // Success with column update
                      setApplicationData((prev) => ({
                        ...prev,
                        interview_confirmed: true,
                        interview_confirmed_at: confirmedAt
                      }));
                    }

                    // Update UI state
                  setShowConfirmDialog(false);
                  setStepStatus((s) => ({ ...s, Assessment: "done", Requirements: s.Requirements }));
                  setShowSuccessDialog(true);
                  } catch (err) {
                    console.error('Error confirming interview:', err);
                    alert('Failed to confirm interview. Please try again.');
                  }
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
            {retractError && (
              <div className="px-4 pb-4">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm">
                  {retractError}
                </div>
              </div>
            )}
            <div className="p-4 border-t flex justify-end gap-2">
              <button type="button" className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300" onClick={() => setShowRetractDialog(false)} disabled={retracting}>
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
                onClick={handleRetractApplication}
                disabled={retracting}
              >
                Retract Application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Retract Success Message */}
      {showRetractSuccess && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50" onClick={() => setShowRetractSuccess(false)}>
          <div className="bg-white rounded-md w-full max-w-md mx-4 overflow-hidden border" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-green-600">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.525-1.72-1.72a.75.75 0 1 0-1.06 1.061l2.25 2.25a.75.75 0 0 0 1.144-.094l3.843-5.15Z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="text-lg font-semibold text-gray-800 mb-2">Your application has been successfully retracted.</div>
              <div className="mt-4">
                <button type="button" className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700" onClick={() => setShowRetractSuccess(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApplicantApplications;


