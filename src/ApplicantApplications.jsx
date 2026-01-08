import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { createInterviewScheduledNotification, createInterviewRescheduledNotification, notifyHRAboutInterviewResponse, notifyHRAboutApplicationRetraction } from './notifications';

function ApplicantApplications() {
  const navigate = useNavigate();
  const steps = ["Application", "Assessment", "Agreements"];
  const [activeStep, setActiveStep] = useState("Application");
  const [loading, setLoading] = useState(true);
  const [applicationData, setApplicationData] = useState(null);
  const [jobData, setJobData] = useState(null);
  const [profileData, setProfileData] = useState(null);
  // status: done -> green, pending -> yellow, waiting -> orange
  const [stepStatus, setStepStatus] = useState({
    Application: "done",
    Assessment: "pending",
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
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showRetractDialog, setShowRetractDialog] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
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
    let userId = null;

    const fetchApplication = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        userId = user.id;

        // Fetch application for current user - include all file fields from both columns and payload
        const { data: application, error: appError } = await supabase
          .from('applications')
          .select('*, interview_details_file, assessment_results_file, appointment_letter_file, undertaking_file, application_form_file, undertaking_duties_file, pre_employment_requirements_file, id_form_file, payload')
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

          // Update application data with parsed requirements and all file fields
          // Priority: column value > payload value > null
          console.log('Application Data Debug:', {
            payload: payloadObj,
            form: payloadObj?.form,
            workExperiences: payloadObj?.workExperiences,
            characterReferences: payloadObj?.characterReferences
          });
          setApplicationData({
            ...application,
            requirements: requirements,
            payload: payloadObj,
            // Include file fields from both column and payload - column takes priority
            interview_details_file: application.interview_details_file || payloadObj?.interview_details_file || null,
            assessment_results_file: application.assessment_results_file || payloadObj?.assessment_results_file || null,
            appointment_letter_file: application.appointment_letter_file || payloadObj?.appointment_letter_file || null,
            undertaking_file: application.undertaking_file || payloadObj?.undertaking_file || null,
            application_form_file: application.application_form_file || payloadObj?.application_form_file || null,
            undertaking_duties_file: application.undertaking_duties_file || payloadObj?.undertaking_duties_file || null,
            pre_employment_requirements_file: application.pre_employment_requirements_file || payloadObj?.pre_employment_requirements_file || null,
            id_form_file: application.id_form_file || payloadObj?.id_form_file || null,
          });

          // Determine step statuses based on application progress
          const interviewStatus = application.interview_confirmed || payloadObj?.interview_confirmed || 'Idle';
          const hasInterview = !!application.interview_date || !!payloadObj?.interview?.date;
          const applicationStatus = application.status?.toLowerCase() || 'submitted';
          
          // Update step statuses based on application state
          let newStepStatus = {
            Application: "done", // Always done if application exists
            Assessment: "waiting",
            Agreements: "waiting"
          };
          
          // Assessment step: pending if interview scheduled, done if confirmed
          if (hasInterview) {
            if (interviewStatus === 'Confirmed') {
              newStepStatus.Assessment = "done";
              // If assessment is done, Agreements becomes pending
              newStepStatus.Agreements = "pending";
            } else {
              newStepStatus.Assessment = "pending";
            }
          }
          
          // Agreements step: done if hired
          if (applicationStatus === 'hired') {
            newStepStatus.Agreements = "done";
          } else if (['agreement', 'agreements', 'final_agreement'].includes(applicationStatus)) {
            newStepStatus.Agreements = "pending";
          }
          
          setStepStatus(newStepStatus);

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
          .ilike('email', user.email)
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

    // Polling: refetch every 30 seconds
    const interval = setInterval(fetchApplication, 30000);

    // Refetch when user returns to tab
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchApplication();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
      
      // Get applicant info before deleting for notification
      const payloadObj = typeof applicationData.payload === 'string' 
        ? JSON.parse(applicationData.payload) 
        : applicationData.payload || {};
      const form = payloadObj.form || payloadObj.applicant || payloadObj || {};
      const applicantName = `${form.firstName || ''} ${form.middleName || ''} ${form.lastName || ''}`.trim() || 
                           applicationData.name || 
                           'Applicant';
      const position = jobData?.title || payloadObj.job?.title || form.position || 'Position';
      const depot = jobData?.depot || payloadObj.job?.depot || form.depot || '';
      
      // Notify HR before deleting the application
      await notifyHRAboutApplicationRetraction({
        applicationId: applicationData.id,
        applicantName,
        position,
        depot
      });
      
      // Now we can simply delete the application
      // The database will automatically set application_id to NULL in notifications
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
    <div className="flex-1">
      <div className="w-full py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">My Applications</h2>
            <p className="text-sm text-gray-500">Track your progress and complete all steps.</p>
          </div>
          <Link to="/applicantl/home" className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors">Back</Link>
        </div>

        {/* Enhanced Steps Progress Indicator - Only show when application exists */}
        {!loading && applicationData && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isActive = activeStep === step;
              const status = stepStatus[step];
              const isCompleted = status === 'done';
              const isPending = status === 'pending';
              const isWaiting = status === 'waiting';
              const isLast = index === steps.length - 1;
              
              // Step number and icon
              const getStepIcon = () => {
                if (isCompleted) {
                  return (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  );
                }
                if (isActive) {
                  return (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  );
                }
                return (
                  <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>
                );
              };

              // Step colors based on status
              let stepColors = {
                bg: 'bg-gray-100',
                text: 'text-gray-600',
                border: 'border-gray-300',
                icon: 'text-gray-400'
              };

              if (isActive) {
                stepColors = {
                  bg: 'bg-red-50',
                  text: 'text-red-700',
                  border: 'border-red-500',
                  icon: 'text-red-600'
                };
              } else if (isCompleted) {
                stepColors = {
                  bg: 'bg-green-50',
                  text: 'text-green-700',
                  border: 'border-green-500',
                  icon: 'text-green-600'
                };
              } else if (isPending) {
                stepColors = {
                  bg: 'bg-yellow-50',
                  text: 'text-yellow-700',
                  border: 'border-yellow-400',
                  icon: 'text-yellow-600'
                };
              } else if (isWaiting) {
                stepColors = {
                  bg: 'bg-orange-50',
                  text: 'text-orange-700',
                  border: 'border-orange-300',
                  icon: 'text-orange-500'
                };
              }

              // Status label
              const getStatusLabel = () => {
                if (isCompleted) return 'Completed';
                if (isActive) return 'Current';
                if (isPending) return 'In Progress';
                if (isWaiting) return 'Waiting';
                return 'Not Started';
              };

              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <button
                      type="button"
                      onClick={() => setActiveStep(step)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all hover:shadow-md ${stepColors.bg} ${stepColors.border} ${isActive ? 'ring-2 ring-red-300 ring-offset-2' : ''}`}
                    >
                      <div className={`${stepColors.icon} ${isActive ? 'scale-110' : ''} transition-transform`}>
                        {getStepIcon()}
                      </div>
                      <div className={`font-semibold text-sm ${stepColors.text}`}>
                        {step}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${stepColors.bg} ${stepColors.text} border ${stepColors.border}`}>
                        {getStatusLabel()}
                      </div>
                    </button>
                  </div>
                  {!isLast && (
                    <div className={`flex-1 h-1 mx-2 rounded-full ${
                      isCompleted || (isActive && index > 0) 
                        ? 'bg-green-500' 
                        : isPending && index === 0
                        ? 'bg-yellow-400'
                        : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* Content */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
              <p className="text-gray-600 font-medium">Loading application data...</p>
            </div>
          ) : !applicationData ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-600 font-medium text-lg">No application found.</p>
              <p className="text-gray-500 text-sm mt-2">Start by applying for a job from the home page.</p>
            </div>
          ) : (
            <>
              {/* Application */}
              <section className={`${activeStep === "Application" ? "" : "hidden"}`}>
                <div className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-gray-200 px-6 py-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Application Details
                  </h3>
                </div>
                <div className="p-6">
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

                {/* Application Details */}
                <div className="space-y-4">
                  {/* Personal Details Card */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 px-4 py-3 text-sm font-semibold border-b border-gray-200">Personal Details</div>
                    <div className="p-4 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                      <div>
                        <span className="font-semibold text-gray-600">Name:</span>{' '}
                        <span className="text-gray-800">{applicationData.payload?.form?.firstName || ''} {applicationData.payload?.form?.middleName || ''} {applicationData.payload?.form?.lastName || ''}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-600">Address:</span>{' '}
                        {(() => {
                          const addressParts = [
                            applicationData.payload?.form?.street,
                            applicationData.payload?.form?.barangay,
                            applicationData.payload?.form?.city,
                            applicationData.payload?.form?.zip,
                          ];
                          const address = addressParts.filter(Boolean).join(', ');
                          return address ? <span className="text-gray-800">{address}</span> : <span className="text-gray-400 italic">None</span>;
                        })()}
                      </div>
                      <div><span className="font-semibold text-gray-600">Contact Number:</span> {applicationData.payload?.form?.contact ? <span className="text-gray-800">{applicationData.payload.form.contact}</span> : <span className="text-gray-400 italic">None</span>}</div>
                      <div>
                        <span className="font-semibold text-gray-600">Email:</span>{' '}
                        {applicationData.payload?.form?.email ? <span className="text-gray-800">{applicationData.payload.form.email}</span> : <span className="text-gray-400 italic">None</span>}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-600">Birthday:</span>{' '}
                        {applicationData.payload?.form?.birthday ? <span className="text-gray-800">{new Date(applicationData.payload.form.birthday).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span> : <span className="text-gray-400 italic">None</span>}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-600">Age:</span>{' '}
                        {applicationData.payload?.form?.birthday ? 
                          <span className="text-gray-800">{Math.floor((new Date() - new Date(applicationData.payload.form.birthday)) / (365.25 * 24 * 60 * 60 * 1000))}</span> : <span className="text-gray-400 italic">None</span>}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-600">Marital Status:</span>{' '}
                        {applicationData.payload?.form?.maritalStatus ? <span className="text-gray-800">{applicationData.payload.form.maritalStatus}</span> : <span className="text-gray-400 italic">None</span>}
                      </div>
                      <div><span className="font-semibold text-gray-600">Sex:</span> {applicationData.payload?.form?.sex ? <span className="text-gray-800">{applicationData.payload.form.sex}</span> : <span className="text-gray-400 italic">None</span>}</div>
                      <div><span className="font-semibold text-gray-600">Available Start Date:</span> {applicationData.payload?.form?.startDate ? <span className="text-gray-800">{new Date(applicationData.payload.form.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span> : <span className="text-gray-400 italic">None</span>}</div>
                      <div>
                        <span className="font-semibold text-gray-600">How did you learn about the company?:</span>{' '}
                        {applicationData.payload?.form?.sourceOfInfo ? <span className="text-gray-800">{applicationData.payload.form.sourceOfInfo}</span> : <span className="text-gray-400 italic">None</span>}
                      </div>
                      <div><span className="font-semibold text-gray-600">Currently Employed?:</span> {applicationData.payload?.form?.employed ? <span className="text-gray-800">{applicationData.payload.form.employed}</span> : <span className="text-gray-400 italic">None</span>}</div>
                      <div>
                        <span className="font-semibold text-gray-600">Resume:</span>{' '}
                        {resumePublicUrl ? (
                          <a 
                            href={resumePublicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                          >
                            {applicationData.payload.form.resumeName || 'View Resume'}
                          </a>
                        ) : (
                          <span className="text-gray-400 italic">None</span>
                        )}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-600">Government IDs:</span>{' '}
                        {(() => {
                          const ids = [];
                          if (applicationData.payload?.form?.sss) ids.push(`SSS: ${applicationData.payload.form.sss}`);
                          if (applicationData.payload?.form?.tin) ids.push(`TIN: ${applicationData.payload.form.tin}`);
                          if (applicationData.payload?.form?.philhealth) ids.push(`PhilHealth: ${applicationData.payload.form.philhealth}`);
                          if (applicationData.payload?.form?.pagibig) ids.push(`Pag-IBIG: ${applicationData.payload.form.pagibig}`);
                          return ids.length > 0 ? <span className="text-gray-800">{ids.join(', ')}</span> : <span className="text-gray-400 italic">None</span>;
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Education Card */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 px-4 py-3 text-sm font-semibold border-b border-gray-200">Educational Background</div>
                    <div className="p-4 text-sm text-gray-800">
                      {(() => {
                        const edu1 = applicationData.payload?.form?.edu1Institution || applicationData.payload?.form?.edu1Year;
                        const edu2 = applicationData.payload?.form?.edu2Institution || applicationData.payload?.form?.edu2Year;
                        const hasAnyEducation = edu1 || edu2;

                        if (!hasAnyEducation) {
                          return <div className="text-gray-500 italic">None</div>;
                        }

                        return (
                          <div className="space-y-3">
                            {edu1 && (
                              <div className="border-b pb-3 last:border-b-0">
                                <div><span className="font-semibold text-gray-600">Highest Educational Attainment:</span> <span className="text-gray-800">{applicationData.payload?.form?.edu1Level || 'Education 1'}</span></div>
                                <div><span className="font-semibold text-gray-600">Institution:</span> {applicationData.payload?.form?.edu1Institution ? <span className="text-gray-800">{applicationData.payload.form.edu1Institution}</span> : <span className="text-gray-400 italic">None</span>}</div>
                                <div><span className="font-semibold text-gray-600">Year Finished:</span> {applicationData.payload?.form?.edu1Year ? <span className="text-gray-800">{applicationData.payload.form.edu1Year}</span> : <span className="text-gray-400 italic">None</span>}</div>
                              </div>
                            )}
                            {edu2 && (
                              <div className="border-b pb-3 last:border-b-0">
                                <div><span className="font-semibold text-gray-600">Highest Educational Attainment:</span> <span className="text-gray-800">{applicationData.payload?.form?.edu2Level || 'Education 2'}</span></div>
                                <div><span className="font-semibold text-gray-600">Institution:</span> {applicationData.payload?.form?.edu2Institution ? <span className="text-gray-800">{applicationData.payload.form.edu2Institution}</span> : <span className="text-gray-400 italic">None</span>}</div>
                                <div><span className="font-semibold text-gray-600">Year Finished:</span> {applicationData.payload?.form?.edu2Year ? <span className="text-gray-800">{applicationData.payload.form.edu2Year}</span> : <span className="text-gray-400 italic">None</span>}</div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Skills Card */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 px-4 py-3 text-sm font-semibold border-b border-gray-200">Skills</div>
                    <div className="p-4 text-sm text-gray-800">
                      {applicationData.payload?.form?.skills && applicationData.payload.form.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {applicationData.payload.form.skills.map((skill, idx) => (
                            <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">{skill}</span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-500 italic">None</div>
                      )}
                    </div>
                  </div>

                  {/* License Information Card (only for Delivery Crew) */}
                  {(() => {
                    const jobTitle = (applicationData.payload?.job?.title || '').toLowerCase();
                    if (jobTitle.includes('delivery crew')) {
                      return (
                        <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                          <div className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 px-4 py-3 text-sm font-semibold border-b border-gray-200">License Information</div>
                          <div className="p-4 text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                            <div>
                              <span className="font-semibold text-gray-600">License Type:</span>{' '}
                              {applicationData.payload?.form?.licenseType ? <span className="text-gray-800">{applicationData.payload.form.licenseType}</span> : <span className="text-gray-400 italic">None</span>}
                            </div>
                            <div>
                              <span className="font-semibold text-gray-600">Expiry Date:</span>{' '}
                              {applicationData.payload?.form?.licenseExpiry ? <span className="text-gray-800">{new Date(applicationData.payload.form.licenseExpiry).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span> : <span className="text-gray-400 italic">None</span>}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Work Experience Card */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 px-4 py-3 text-sm font-semibold border-b border-gray-200">Work Experience</div>
                    <div className="p-4 text-sm text-gray-800">
                      {applicationData.payload?.workExperiences && applicationData.payload.workExperiences.length > 0 ? (
                        <div className="space-y-3">
                          {applicationData.payload.workExperiences.map((exp, idx) => (
                            <div key={idx} className="border-b pb-3 last:border-b-0">
                              <div><span className="font-semibold text-gray-600">Company:</span> {exp.company ? <span className="text-gray-800">{exp.company}</span> : <span className="text-gray-400 italic">None</span>}</div>
                              <div><span className="font-semibold text-gray-600">Role:</span> {exp.position ? <span className="text-gray-800">{exp.position}</span> : <span className="text-gray-400 italic">None</span>}</div>
                              <div><span className="font-semibold text-gray-600">Period:</span> {exp.period ? <span className="text-gray-800">{exp.period}</span> : <span className="text-gray-400 italic">None</span>}</div>
                              <div><span className="font-semibold text-gray-600">Reason for leaving:</span> {exp.reason ? <span className="text-gray-800">{exp.reason}</span> : <span className="text-gray-400 italic">None</span>}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-500 italic">None</div>
                      )}
                    </div>
                  </div>

                  {/* Character References Card */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 px-4 py-3 text-sm font-semibold border-b border-gray-200">Character References</div>
                    <div className="p-4 text-sm text-gray-800">
                      {(() => {
                        // Filter out empty references (only show if name or contact exists)
                        const validReferences = applicationData.payload?.characterReferences?.filter(ref => 
                          (ref.name && ref.name.trim() !== '') || (ref.contact && ref.contact.trim() !== '') || (ref.contactNumber && ref.contactNumber.trim() !== '')
                        ) || [];
                        
                        return validReferences.length > 0 ? (
                          <div className="space-y-3">
                            {validReferences.map((ref, idx) => (
                              <div key={idx} className="border-b pb-3 last:border-b-0">
                                <div><span className="font-semibold text-gray-600">Name:</span> {ref.name ? <span className="text-gray-800">{ref.name}</span> : <span className="text-gray-400 italic">None</span>}</div>
                                <div><span className="font-semibold text-gray-600">Contact:</span> {(ref.contact || ref.contactNumber) ? <span className="text-gray-800">{ref.contact || ref.contactNumber}</span> : <span className="text-gray-400 italic">None</span>}</div>
                                <div><span className="font-semibold text-gray-600">Remarks:</span> {(ref.company || ref.remarks) ? <span className="text-gray-800">{ref.company || ref.remarks}</span> : <span className="text-gray-400 italic">None</span>}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-gray-400 italic">None</div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                </div>
              </section>
            </>
          )}

          {/* Assessment */}
          {applicationData && (
            <section className={`${activeStep === "Assessment" ? "" : "hidden"}`}>
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Assessment & Interview
                </h3>
              </div>
              <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Interview Schedule</h2>
                {(() => {
                  // Get interview status from database
                  const interviewStatus = applicationData?.interview_confirmed || applicationData?.payload?.interview_confirmed || 'Idle';
                  
                  // Only show status if applicant has responded (not Idle)
                  if (interviewStatus === 'Confirmed') {
                    return (
                      <span className="text-sm px-2 py-1 rounded bg-green-100 text-green-800 border border-green-300">
                        Status: Confirmed
                      </span>
                    );
                  } else if (interviewStatus === 'Rejected') {
                    return (
                      <span className="text-sm px-2 py-1 rounded bg-red-100 text-red-800 border border-red-300">
                        Status: Interview Rejected
                      </span>
                    );
                  }
                  return null;
                })()}
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
                    {interview.date ? 
                      'Important Reminder: Please confirm at least a day before your schedule.' :
                      'Please wait for HR to schedule your interview.'
                    }
                  </div>
                  {(() => {
                    // Get interview status
                    const interviewStatus = applicationData?.interview_confirmed || applicationData?.payload?.interview_confirmed || 'Idle';
                    
                    // Show buttons only if no response has been made yet and interview is scheduled
                    const showButtons = interviewStatus === 'Idle' && 
                      interview.date && interview.time && interview.location;
                    
                    return showButtons ? (
                      <div className="flex gap-2">
                        <button type="button" className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600" onClick={() => setShowRejectDialog(true)}>
                          Reject Interview
                        </button>
                        <button type="button" className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700" onClick={() => setShowConfirmDialog(true)}>
                          Confirm Interview
                        </button>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>

              {/* Assessment Files - Always show file status */}
              <div className="mt-6">
                <div className="bg-gray-100 text-gray-800 px-3 py-2 text-sm font-semibold border rounded-t-md">Assessment Files</div>
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-gray-600 border-b bg-gray-50">
                  <div className="col-span-6">Document</div>
                  <div className="col-span-6">File</div>
                </div>

                {/* Interview Details File Row */}
                <div className="border-b">
                  <div className="grid grid-cols-12 items-center gap-3 px-3 py-3">
                    <div className="col-span-12 md:col-span-6 text-sm text-gray-800 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-600">
                        <path fillRule="evenodd" d="M4.5 3.75a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V6.75a3 3 0 0 0-3-3h-15Zm4.125 3a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Zm-3.873 8.703a4.126 4.126 0 0 1 7.746 0 .75.75 0 0 1-.372.84A7.72 7.72 0 0 1 8 18.75a7.72 7.72 0 0 1-5.501-2.607.75.75 0 0 1-.372-.84Zm4.622-1.44a5.076 5.076 0 0 0 5.024 0l.348-1.597c.271.1.56.153.856.153h6a.75.75 0 0 0 0-1.5h-3.045c.01-.1.02-.2.02-.3V11.25c0-5.385-4.365-9.75-9.75-9.75S2.25 5.865 2.25 11.25v.756a2.25 2.25 0 0 0 1.988 2.246l.217.037a2.25 2.25 0 0 0 2.163-1.684l1.38-4.276a1.125 1.125 0 0 1 1.08-.82Z" clipRule="evenodd" />
                      </svg>
                      Interview Details
                    </div>
                    <div className="col-span-12 md:col-span-6 text-sm">
                      {(() => {
                        // Check both direct field and payload - column takes priority
                        const interviewFile = applicationData?.interview_details_file || 
                                             (applicationData?.payload && typeof applicationData.payload === 'object' ? applicationData.payload.interview_details_file : null) ||
                                             (typeof applicationData?.payload === 'string' ? (() => {
                                               try {
                                                 const parsed = JSON.parse(applicationData.payload);
                                                 return parsed?.interview_details_file || null;
                                               } catch {
                                                 return null;
                                               }
                                             })() : null);
                        if (interviewFile) {
                          const fileUrl = supabase.storage.from('application-files').getPublicUrl(interviewFile)?.data?.publicUrl;
                          const fileName = interviewFile.split('/').pop() || 'Interview Details';
                          return (
                            <div className="flex items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-600">
                                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.525-1.72-1.72a.75.75 0 1 0-1.06 1.061l2.25 2.25a.75.75 0 0 0 1.144-.094l3.843-5.15Z" clipRule="evenodd" />
                              </svg>
                              <a 
                                href={fileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                  <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                                  <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v3.5A2.75 2.75 0 0 0 4.75 19h10.5A2.75 2.75 0 0 0 18 16.25v-3.5a.75.75 0 0 0-1.5 0v3.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-3.5Z" />
                                </svg>
                                {fileName}
                              </a>
                            </div>
                          );
                        }
                        return (
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gray-400">
                              <path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75ZM6.75 15a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V15.75a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V15.75a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm text-gray-500 italic">No file uploaded yet</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                
                {/* Assessment Results File Row */}
                <div className="border-b">
                  <div className="grid grid-cols-12 items-center gap-3 px-3 py-3">
                    <div className="col-span-12 md:col-span-6 text-sm text-gray-800 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-600">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.525-1.72-1.72a.75.75 0 1 0-1.06 1.061l2.25 2.25a.75.75 0 0 0 1.144-.094l3.843-5.15Z" clipRule="evenodd" />
                      </svg>
                      In-Person Assessment Results
                    </div>
                    <div className="col-span-12 md:col-span-6 text-sm">
                      {(() => {
                        // Check both direct field and payload - column takes priority
                        const assessmentFile = applicationData?.assessment_results_file || 
                                              (applicationData?.payload && typeof applicationData.payload === 'object' ? applicationData.payload.assessment_results_file : null) ||
                                              (typeof applicationData?.payload === 'string' ? (() => {
                                                try {
                                                  const parsed = JSON.parse(applicationData.payload);
                                                  return parsed?.assessment_results_file || null;
                                                } catch {
                                                  return null;
                                                }
                                              })() : null);
                        if (assessmentFile) {
                          const fileUrl = supabase.storage.from('application-files').getPublicUrl(assessmentFile)?.data?.publicUrl;
                          const fileName = assessmentFile.split('/').pop() || 'Assessment Results';
                          return (
                            <div className="flex items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-600">
                                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.525-1.72-1.72a.75.75 0 1 0-1.06 1.061l2.25 2.25a.75.75 0 0 0 1.144-.094l3.843-5.15Z" clipRule="evenodd" />
                              </svg>
                              <a 
                                href={fileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                  <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                                  <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v3.5A2.75 2.75 0 0 0 4.75 19h10.5A2.75 2.75 0 0 0 18 16.25v-3.5a.75.75 0 0 0-1.5 0v3.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-3.5Z" />
                                </svg>
                                {fileName}
                              </a>
                            </div>
                          );
                        }
                        return (
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gray-400">
                              <path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75ZM6.75 15a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V15.75a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V15.75a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm text-gray-500 italic">No file uploaded yet</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
              </div>
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
            <section className={`${activeStep === "Agreements" ? "" : "hidden"}`}>
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Final Agreements & Documents
                  </h3>
                  {applicationData.status === 'hired' && (
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-lg font-bold text-green-600">HIRED</span>
                      {applicationData.updated_at && (
                        <span className="text-xs text-gray-500">
                          {new Date(applicationData.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6">
                <div className="bg-gray-100 text-gray-800 px-3 py-2 text-sm font-semibold border rounded-t-md">Document Name</div>
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-gray-600 border-b">
                  <div className="col-span-6">&nbsp;</div>
                  <div className="col-span-3">File</div>
                  <div className="col-span-3">&nbsp;</div>
                </div>

                {/* Helper function to render agreement document row */}
                {(() => {
                  const renderAgreementRow = (documentName, fileKey) => {
                    const filePath = applicationData?.[fileKey] || applicationData?.payload?.[fileKey];
                    const hasFile = !!filePath;
                    
                    return (
                      <div key={fileKey} className="border-b">
                        <div className="grid grid-cols-12 items-center gap-3 px-3 py-3">
                          <div className="col-span-12 md:col-span-6 text-sm text-gray-800">{documentName}</div>
                          <div className="col-span-12 md:col-span-3 text-sm">
                            {hasFile ? (
                              <>
                                <a 
                                  href={supabase.storage.from('application-files').getPublicUrl(filePath)?.data?.publicUrl} 
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  {filePath.split('/').pop() || documentName}
                                </a>
                                {applicationData.updated_at && (
                                  <span className="ml-2 text-xs text-gray-500">
                                    {new Date(applicationData.updated_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-400 italic">No file uploaded yet</span>
                            )}
                          </div>
                          <div className="col-span-12 md:col-span-3" />
                        </div>
                      </div>
                    );
                  };

                  return (
                    <>
                      {renderAgreementRow("Employee Appointment Letter", "appointment_letter_file")}
                      {renderAgreementRow("Undertaking", "undertaking_file")}
                      {renderAgreementRow("Application Form", "application_form_file")}
                      {renderAgreementRow("Undertaking of Duties and Responsibilities", "undertaking_duties_file")}
                      {renderAgreementRow("Roadwise Pre Employment Requirements", "pre_employment_requirements_file")}
                      {renderAgreementRow("ID Form", "id_form_file")}
                    </>
                  );
                })()}

                <div className="text-xs text-gray-600 italic mt-4">
                  Important: You have been successfully hired! Please see your email for your employee account details and you may login as an employee. Thank you.
                </div>
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
                    
                    // Get applicant and interview info for notification
                    const payloadObj = typeof applicationData.payload === 'string' 
                      ? JSON.parse(applicationData.payload) 
                      : applicationData.payload || {};
                    const form = payloadObj.form || payloadObj.applicant || payloadObj || {};
                    const applicantName = `${form.firstName || ''} ${form.middleName || ''} ${form.lastName || ''}`.trim() || 
                                         applicationData.name || 
                                         'Applicant';
                    const position = jobData?.title || payloadObj.job?.title || form.position || 'Position';
                    const interviewDate = applicationData.interview_date || payloadObj.interview?.date || null;
                    const interviewTime = applicationData.interview_time || payloadObj.interview?.time || null;
                    
                    // Update with new text-based status
                    const { error: updateError } = await supabase
                      .from('applications')
                      .update({
                        interview_confirmed: 'Confirmed',
                        interview_confirmed_at: confirmedAt
                      })
                      .eq('id', applicationData.id);

                    if (updateError) {
                      console.error('Error confirming interview:', updateError);
                      alert('Failed to confirm interview. Please try again.');
                      return;
                    }

                    // Notify HR about interview confirmation
                    await notifyHRAboutInterviewResponse({
                      applicationId: applicationData.id,
                      applicantName,
                      position,
                      responseType: 'confirmed',
                      interviewDate,
                      interviewTime
                    });

                    // Update local state
                    setApplicationData((prev) => ({
                      ...prev,
                      interview_confirmed: 'Confirmed',
                      interview_confirmed_at: confirmedAt
                    }));

                    // Update UI state
                  setShowConfirmDialog(false);
                  setStepStatus((s) => ({ ...s, Assessment: "done", Agreements: "pending" }));
                  setShowConfirmationModal(true);
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

      {/* Reject dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50" onClick={() => setShowRejectDialog(false)}>
          <div className="bg-white rounded-md w-full max-w-md mx-4 overflow-hidden border" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">Reject Interview</h3>
            </div>
            <div className="p-4 text-sm text-gray-700">
              Are you sure you want to reject this interview schedule? HR will be notified and may reschedule.
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button type="button" className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300" onClick={() => setShowRejectDialog(false)}>Cancel</button>
              <button
                type="button"
                className="px-4 py-2 rounded bg-gray-500 text-white hover:bg-gray-600"
                onClick={async () => {
                  if (!applicationData?.id) {
                    console.error('No application ID found');
                    return;
                  }

                  try {
                    const rejectedAt = new Date().toISOString();
                    
                    // Update with new text-based status
                    const { error: updateError } = await supabase
                      .from('applications')
                      .update({
                        interview_confirmed: 'Rejected',
                        interview_confirmed_at: rejectedAt
                      })
                      .eq('id', applicationData.id);

                    if (updateError) {
                      console.error('Error rejecting interview:', updateError);
                      alert('Failed to reject interview. Please try again.');
                      return;
                    }

                    // Update local state
                    setApplicationData((prev) => ({
                      ...prev,
                      interview_confirmed: 'Rejected',
                      interview_confirmed_at: rejectedAt
                    }));

                    // Update UI state
                    setShowRejectDialog(false);
                    setStepStatus((s) => ({ ...s, Assessment: "waiting" }));
                    
                    // Show notification
                    setShowRejectionModal(true);
                  } catch (err) {
                    console.error('Error rejecting interview:', err);
                    alert('Failed to reject interview. Please try again.');
                  }
                }}
              >
                Reject Interview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Success Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 bg-transparent bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowConfirmationModal(false)}>
          <div className="bg-white rounded-md w-full max-w-md mx-4 overflow-hidden border border-black" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-green-600">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.525-1.72-1.72a.75.75 0 1 0-1.06 1.061l2.25 2.25a.75.75 0 0 0 1.144-.094l3.843-5.15Z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="text-lg font-semibold text-gray-800 mb-2">Interview Confirmed Successfully!</div>
              <div className="text-sm text-gray-600 mb-4">Your interview has been confirmed. HR has been notified of your response.</div>
              <div className="border rounded-md text-left p-3 text-sm text-gray-700 mb-4">
                <div><span className="font-medium">Date:</span> {interview.date}</div>
                <div><span className="font-medium">Time:</span> {interview.time}</div>
                <div><span className="font-medium">Location:</span> {interview.location}</div>
                <div><span className="font-medium">Interviewer:</span> {interview.interviewer}</div>
              </div>
              <div className="text-xs text-gray-500 italic mb-4">We look forward to seeing you soon!</div>
              <button type="button" className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700" onClick={() => setShowConfirmationModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Success Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowRejectionModal(false)}>
          <div className="bg-white rounded-md w-full max-w-md mx-4 overflow-hidden border border-black" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-red-600">
                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="text-lg font-semibold text-gray-800 mb-2">Interview Rejected Successfully</div>
              <div className="text-sm text-gray-600 mb-4">Your interview has been rejected. HR has been notified and may reschedule a new interview for you.</div>
              <button type="button" className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700" onClick={() => setShowRejectionModal(false)}>Close</button>
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


