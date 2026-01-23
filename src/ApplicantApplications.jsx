import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { notifyHRAboutInterviewResponse, notifyHRAboutApplicationRetraction } from './notifications';
import {
  AssessmentSectionCard,
  RemarksAndFilesCard,
  SigningScheduleCard,
  UploadedDocumentsSection,
} from './components/ApplicantArtifactsPanels';

function ApplicantApplications() {
  const navigate = useNavigate();
  const location = useLocation();
  const deepLinkHandledRef = useRef(false);
  const splitJobDetails = (value) => {
    // job_posts.responsibilities is stored as an array, but handle string/null defensively
    const lines = Array.isArray(value)
      ? value
      : typeof value === 'string'
      ? value.split(/\r?\n/)
      : [];

    const cleaned = lines
      .map((item) => (item == null ? '' : String(item)).trim())
      .filter(Boolean);

    const responsibilities = [];
    const keyRequirements = [];
    for (const item of cleaned) {
      if (/^req\s*:/i.test(item)) {
        keyRequirements.push(item.replace(/^req\s*:/i, '').trim());
      } else {
        responsibilities.push(item);
      }
    }

    return { responsibilities, keyRequirements };
  };

  const formatPostedDate = (job) => {
    const raw = job?.created_at || job?.posted_at || job?.date_posted || null;
    if (!raw) return null;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatJobType = (jobType) => {
    if (!jobType) return null;
    return String(jobType).replace(/_/g, ' ');
  };

  const steps = ["Application", "Assessment", "Agreements"];
  const [activeStep, setActiveStep] = useState("Application");
  const [loading, setLoading] = useState(true);
  const [applicationData, setApplicationData] = useState(null);

  const [jobData, setJobData] = useState(null);
  const [profileData, setProfileData] = useState(null);

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
  const [rescheduleNote, setRescheduleNote] = useState('');
  const [reschedulePreferredDate, setReschedulePreferredDate] = useState('');
  const [reschedulePreferredTimeFrom, setReschedulePreferredTimeFrom] = useState('');
  const [reschedulePreferredTimeTo, setReschedulePreferredTimeTo] = useState('');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showRetractDialog, setShowRetractDialog] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [applicationRetracted, setApplicationRetracted] = useState(false);
  const [retracting, setRetracting] = useState(false);
  const [showRetractSuccess, setShowRetractSuccess] = useState(false);
  const [retractError, setRetractError] = useState('');
  const [certificateUrls, setCertificateUrls] = useState({});

  const parsePayloadObject = (payload) => {
    if (!payload) return {};
    if (typeof payload === 'string') {
      try {
        const parsed = JSON.parse(payload);
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    }
    return payload && typeof payload === 'object' ? payload : {};
  };

  const getApplicationFilesPublicUrl = (path) => {
    if (!path) return null;
    return supabase.storage.from('application-files').getPublicUrl(path)?.data?.publicUrl || null;
  };

  const getInterviewNotesFromApplication = (application) => {
    const payloadObj = parsePayloadObject(application?.payload);
    const notes =
      application?.interview_notes ??
      payloadObj?.interview_notes ??
      payloadObj?.interviewNotes ??
      '';

    const rawList = payloadObj?.interview_notes_attachments || payloadObj?.interviewNotesAttachments;
    const list = Array.isArray(rawList) ? rawList.slice() : [];
    const single = payloadObj?.interview_notes_attachment || payloadObj?.interviewNotesAttachment || null;
    if (single && typeof single === 'object' && single.path) {
      const exists = list.some((x) => x && typeof x === 'object' && x.path === single.path);
      if (!exists) list.push(single);
    }

    const colPath = application?.interview_notes_file || payloadObj?.interview_notes_file || payloadObj?.interviewNotesFile || null;
    const colLabel = application?.interview_notes_file_label || payloadObj?.interview_notes_file_label || payloadObj?.interviewNotesFileLabel || null;
    if (colPath) {
      const exists = list.some((x) => x && typeof x === 'object' && x.path === colPath);
      if (!exists) {
        list.push({
          path: colPath,
          label: colLabel || 'Interview Attachment',
          originalName: null,
          uploadedAt: null,
        });
      }
    }

    return { notes: String(notes || ''), attachments: list.filter(Boolean) };
  };

  const getAgreementSigningFromApplication = (application) => {
    const payloadObj = parsePayloadObject(application?.payload);
    const signing =
      payloadObj?.agreement_signing ||
      payloadObj?.agreementSigning ||
      payloadObj?.signing_interview ||
      payloadObj?.signingInterview ||
      null;

    const date = application?.agreement_signing_date || signing?.date || null;
    const time = application?.agreement_signing_time || signing?.time || null;
    const location = application?.agreement_signing_location || signing?.location || null;
    const status =
      application?.agreement_signing_confirmed ||
      payloadObj?.agreement_signing_confirmed ||
      payloadObj?.agreementSigningConfirmed ||
      'Idle';

    return { date, time, location, status };
  };

  const getAgreementDocumentsFromApplication = (application) => {
    const payloadObj = parsePayloadObject(application?.payload);
    const rawList =
      payloadObj?.agreement_documents ||
      payloadObj?.agreementDocuments ||
      payloadObj?.agreements_documents ||
      null;
    const list = Array.isArray(rawList) ? rawList.slice() : [];

    const compatKeys = [
      { key: 'appointment_letter_file', label: 'Employee Appointment Letter' },
      { key: 'undertaking_file', label: 'Undertaking' },
      { key: 'application_form_file', label: 'Application Form' },
      { key: 'undertaking_duties_file', label: 'Undertaking of Duties and Responsibilities' },
      { key: 'pre_employment_requirements_file', label: 'Roadwise Pre Employment Requirements' },
      { key: 'id_form_file', label: 'ID Form' },
    ];

    for (const item of compatKeys) {
      const path = application?.[item.key] || payloadObj?.[item.key] || null;
      if (!path) continue;
      const exists = list.some((x) => x && typeof x === 'object' && x.path === path);
      if (!exists) {
        list.push({
          path,
          label: item.label,
          originalName: null,
          uploadedAt: null,
        });
      }
    }

    return list.filter((x) => x && typeof x === 'object' && x.path);
  };

  const payloadObj = parsePayloadObject(applicationData?.payload);
  const interviewObj = payloadObj?.interview || payloadObj?.form?.interview || {};
  const interview = {
    date: applicationData?.interview_date || interviewObj?.date || payloadObj?.form?.interview_date || null,
    time: applicationData?.interview_time || interviewObj?.time || payloadObj?.form?.interview_time || null,
    location: applicationData?.interview_location || interviewObj?.location || payloadObj?.form?.interview_location || null,
    interviewer: applicationData?.interviewer || interviewObj?.interviewer || payloadObj?.form?.interviewer || "",
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

    const params = new URLSearchParams(location.search || '');
    const requestedApplicationId = params.get('applicationId');
    const requestedAction = (params.get('action') || params.get('openConfirm') || '').toString().trim();

    const fetchApplication = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        userId = user.id;

        // Fetch application for current user.
        // If applicationId is provided via query string (from email deep-link), load that specific record.
        // Otherwise, load the latest application.
        const baseQuery = supabase
          .from('applications')
          .select('*, interview_details_file, assessment_results_file, appointment_letter_file, undertaking_file, application_form_file, undertaking_duties_file, pre_employment_requirements_file, id_form_file, payload')
          .eq('user_id', user.id);

        const { data: application, error: appError } = requestedApplicationId
          ? await baseQuery.eq('id', requestedApplicationId).maybeSingle()
          : await baseQuery.order('created_at', { ascending: false }).limit(1).maybeSingle();

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

          // If rejected at any point, clearly reflect it in the UI (esp. rejected at step 1)
          if (applicationStatus === 'rejected') {
            newStepStatus = {
              Application: 'rejected',
              Assessment: 'waiting',
              Agreements: 'waiting',
            };
            setActiveStep('Application');
          } else {
          
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
          }
          
          setStepStatus(newStepStatus);

          // Email deep-link UX: jump to Assessment and open Confirm modal once.
          if (!deepLinkHandledRef.current && requestedAction === 'confirmInterview') {
            deepLinkHandledRef.current = true;
            setActiveStep('Assessment');

            const statusLower = String(interviewStatus || '').toLowerCase();
            const interviewObj2 = payloadObj?.interview || payloadObj?.form?.interview || {};
            const interviewDate = application?.interview_date || interviewObj2?.date || payloadObj?.form?.interview_date || null;
            const interviewTime = application?.interview_time || interviewObj2?.time || payloadObj?.form?.interview_time || null;
            const interviewLocation = application?.interview_location || interviewObj2?.location || payloadObj?.form?.interview_location || null;
            const canConfirm = statusLower === 'idle' && interviewDate && interviewTime && interviewLocation;

            if (canConfirm) {
              setShowConfirmDialog(true);
            }
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
              // Use '*' to avoid select-list mismatches when the table schema changes
              .select('*')
              .eq('id', application.job_id)
              .maybeSingle();

            if (jobError) {
              console.error('Error fetching job post for application:', jobError);
            } else if (job) {
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
                  } catch (err) {
                    console.error('Error confirming interview:', err);
                    alert('Failed to confirm interview. Please try again.');
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
  }, [location.search]);

  // Generate signed URLs for certificates
  useEffect(() => {
    const generateCertificateUrls = async () => {
      if (!applicationData) return;
      
      const certificates = applicationData.payload?.form?.certificates || applicationData.payload?.certificates || [];
      if (!Array.isArray(certificates) || certificates.length === 0) return;

      const urlMap = {};
      for (const cert of certificates) {
        if (cert?.path) {
          try {
            const { data, error } = await supabase.storage
              .from('external_certificates')
              .createSignedUrl(cert.path, 604800); // 7 days
            
            if (!error && data?.signedUrl) {
              urlMap[cert.path] = data.signedUrl;
            }
          } catch (err) {
            console.error('Error generating signed URL:', err);
          }
        }
      }
      setCertificateUrls(urlMap);
    };

    generateCertificateUrls();
  }, [applicationData]);


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
              const isRejected = status === 'rejected';
              const isLast = index === steps.length - 1;
              
              // Step number and icon
              const getStepIcon = () => {
                if (isRejected) {
                  return (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  );
                }
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
              } else if (isRejected) {
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
                if (isRejected) return 'Rejected';
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
                      onClick={() => {
                        // Only allow clicking if step is completed or is the current pending/active step
                        if (isCompleted || isPending || isActive) {
                          setActiveStep(step);
                        }
                      }}
                      disabled={isWaiting && !isActive}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                        isWaiting && !isActive 
                          ? 'cursor-not-allowed opacity-50' 
                          : 'hover:shadow-md cursor-pointer'
                      } ${stepColors.bg} ${stepColors.border} ${isActive ? 'ring-2 ring-red-300 ring-offset-2' : ''}`}
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
                      isRejected
                        ? 'bg-red-400'
                        : isCompleted || (isActive && index > 0) 
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
                      <div className="text-xs text-gray-600">
                        {(() => {
                          const title = jobData?.title || applicationData?.payload?.job?.title || applicationData?.payload?.form?.position;
                          const depot = jobData?.depot || applicationData?.payload?.job?.depot || applicationData?.payload?.form?.depot;
                          if (!title && !depot) return null;
                          return (
                            <span>
                              Applied for: <span className="font-semibold">{title || 'Job'}</span>
                              {depot ? <span> — {depot}</span> : null}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="text-xs text-gray-500">
                        Applied: {new Date(applicationData.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">#{applicationData.id.slice(0, 8)}</div>
                    <div className="mt-2">
                      {String(applicationData.status || '').toLowerCase() === 'rejected' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                          REJECTED
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                          {(applicationData.status || 'submitted').toString().toUpperCase()}
                        </span>
                      )}
                    </div>
                    {(() => {
                      const statusLower = String(applicationData?.status || applicationData?.payload?.status || '').trim().toLowerCase();
                      const canRetract = statusLower !== 'hired' && statusLower !== 'rejected';
                      if (!canRetract) return null;
                      return (
                      <button 
                        type="button" 
                        className="text-sm text-blue-600 hover:underline mt-2 disabled:text-gray-400 disabled:cursor-not-allowed"
                        onClick={() => setShowRetractDialog(true)}
                        disabled={applicationRetracted || retracting}
                      >
                        {applicationRetracted ? "Application Retracted" : "Retract Application"}
                      </button>
                      );
                    })()}
                  </div>
                </div>

                {/* Application Details */}
                <div className="space-y-4">
                  {/* Applied Job Card */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 px-4 py-3 text-sm font-semibold border-b border-gray-200 flex items-center justify-between gap-3">
                      <span>Applied Job</span>
                      {applicationData?.job_id ? (
                        <Link
                          to="/applicantl/home"
                          state={{ jobId: applicationData.job_id }}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          View job posting
                        </Link>
                      ) : null}
                    </div>
                    <div className="p-4 text-sm text-gray-800">
                      {(() => {
                        const appliedJob = jobData || applicationData?.payload?.job || {};

                        const title = appliedJob?.title || applicationData?.payload?.form?.position || '';
                        const depot = appliedJob?.depot || applicationData?.payload?.form?.depot || '';
                        const description = appliedJob?.description || '';
                        const salaryRange = appliedJob?.salary_range || '₱15,000 - ₱25,000';
                        const posted = formatPostedDate(appliedJob);
                        const positionType = formatJobType(appliedJob?.job_type || appliedJob?.position_type);
                        const { responsibilities, keyRequirements } = splitJobDetails(appliedJob?.responsibilities);

                        const hasAny = !!title || !!depot || !!salaryRange || !!description || !!posted || !!positionType || responsibilities.length > 0 || keyRequirements.length > 0;
                        if (!hasAny) {
                          return <div className="text-gray-500">No job details saved for this application.</div>;
                        }

                        return (
                          <div className="space-y-4">
                            <div>
                              <div className="font-semibold text-gray-600 mb-1">Job Title</div>
                              <div className="text-gray-900 font-semibold">{title || <span className="text-gray-400 italic">None</span>}</div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                              <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2">
                                <div className="text-[11px] text-gray-500">Depot</div>
                                <div className="text-sm font-semibold text-gray-800">{depot || <span className="text-gray-400 italic">None</span>}</div>
                              </div>
                              <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2">
                                <div className="text-[11px] text-gray-500">Date Posted</div>
                                <div className="text-sm font-semibold text-gray-800">{posted || <span className="text-gray-400 italic">Unknown</span>}</div>
                              </div>
                              <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2">
                                <div className="text-[11px] text-gray-500">Position Type</div>
                                <div className="text-sm font-semibold text-gray-800">{positionType || <span className="text-gray-400 italic">Unknown</span>}</div>
                              </div>
                              <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2">
                                <div className="text-[11px] text-gray-500">Salary Range</div>
                                <div className="text-sm font-semibold text-gray-800">{salaryRange || <span className="text-gray-400 italic">None</span>}</div>
                              </div>
                            </div>

                            <div>
                              <div className="font-semibold text-gray-600 mb-1">Description</div>
                              {description ? (
                                <p className="text-gray-800 whitespace-pre-line">{description}</p>
                              ) : (
                                <p className="text-gray-400 italic">None</p>
                              )}
                            </div>

                            <div>
                              <div className="font-semibold text-gray-600 mb-2">Key Responsibilities</div>
                              {responsibilities.length > 0 ? (
                                <ul className="list-disc list-inside text-gray-800 space-y-1">
                                  {responsibilities.map((item, idx) => (
                                    <li key={idx}>{item}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-gray-400 italic">None</p>
                              )}
                            </div>

                            {keyRequirements.length > 0 ? (
                              <div>
                                <div className="font-semibold text-gray-600 mb-2">Basic Key Requirements</div>
                                <ul className="list-disc list-inside text-gray-800 space-y-1">
                                  {keyRequirements.map((item, idx) => (
                                    <li key={idx}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

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
                      <div className="col-span-1 md:col-span-2">
                        <span className="font-semibold text-gray-600">External Certificates:</span>{' '}
                        {(() => {
                          const certificates = applicationData.payload?.form?.certificates || applicationData.payload?.certificates || [];
                          if (!Array.isArray(certificates) || certificates.length === 0) {
                            return <span className="text-gray-400 italic">None</span>;
                          }
                          return (
                            <div className="mt-2 space-y-2">
                              {certificates.map((cert, idx) => {
                                const certUrl = certificateUrls[cert?.path] || null;
                                const fileSize = cert?.size 
                                  ? cert.size < 1024 * 1024 
                                    ? `${(cert.size / 1024).toFixed(1)} KB`
                                    : `${(cert.size / (1024 * 1024)).toFixed(1)} MB`
                                  : '';
                                return (
                                  <div key={idx} className="flex items-center gap-2 text-sm">
                                    <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    {certUrl ? (
                                      <a 
                                        href={certUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-700 hover:underline font-medium flex-1"
                                      >
                                        {cert.name || `Certificate ${idx + 1}`}
                                      </a>
                                    ) : (
                                      <span className="text-gray-800 flex-1">{cert.name || `Certificate ${idx + 1}`}</span>
                                    )}
                                    {fileSize && <span className="text-gray-500 text-xs">({fileSize})</span>}
                                  </div>
                                );
                              })}
                            </div>
                          );
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

                        if (!edu1) {
                          return <div className="text-gray-500 italic">None</div>;
                        }

                        return (
                          <div className="space-y-3">
                            <div>
                              <div><span className="font-semibold text-gray-600">Highest Educational Attainment:</span> <span className="text-gray-800">{applicationData.payload?.form?.edu1Level || 'Education 1'}</span></div>
                              <div><span className="font-semibold text-gray-600">Institution:</span> {applicationData.payload?.form?.edu1Institution ? <span className="text-gray-800">{applicationData.payload.form.edu1Institution}</span> : <span className="text-gray-400 italic">None</span>}</div>
                              <div><span className="font-semibold text-gray-600">Year Finished:</span> {applicationData.payload?.form?.edu1Year ? <span className="text-gray-800">{applicationData.payload.form.edu1Year}</span> : <span className="text-gray-400 italic">None</span>}</div>
                            </div>
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
                    const isDriverJob = jobTitle.includes('driver') || jobTitle.includes('delivery drivers') || jobTitle.includes('drivers');
                    if (jobTitle.includes('delivery crew') || isDriverJob) {
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
                              <div><span className="font-semibold text-gray-600">Role:</span> {(exp.role || exp.position) ? <span className="text-gray-800">{exp.role || exp.position}</span> : <span className="text-gray-400 italic">None</span>}</div>
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
                        const rawRefs = (() => {
                          const payload = applicationData?.payload;
                          const candidates = [
                            payload?.characterReferences,
                            payload?.character_references,
                            payload?.form?.characterReferences,
                            payload?.form?.character_references,
                            payload?.applicant?.characterReferences,
                            payload?.applicant?.character_references,
                          ];

                          for (const candidate of candidates) {
                            if (Array.isArray(candidate)) return candidate;
                          }
                          return [];
                        })();

                        const displayRefs = rawRefs.length > 0 ? rawRefs : [{}];

                        return (
                          <div className="space-y-3">
                            {displayRefs.map((ref, idx) => (
                              <div key={idx} className="border-b pb-3 last:border-b-0">
                                <div className="mb-1"><span className="font-semibold text-gray-600">Reference #{idx + 1}</span></div>
                                {(() => {
                                  const fullName = ref?.fullName ?? ref?.name ?? '';
                                  const relationship = ref?.relationship ?? ref?.relation ?? '';
                                  const jobTitle = ref?.jobTitle ?? ref?.title ?? ref?.position ?? '';
                                  const company = ref?.company ?? ref?.remarks ?? '';
                                  const phone = ref?.phone ?? ref?.contact ?? ref?.contactNumber ?? ref?.contact_number ?? '';
                                  const email = ref?.email ?? '';

                                  const renderValue = (value) =>
                                    value ? <span className="text-gray-800">{value}</span> : <span className="text-gray-400 italic">None</span>;

                                  return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                                      <div><span className="font-semibold text-gray-600">Full Name:</span> {renderValue(fullName)}</div>
                                      <div><span className="font-semibold text-gray-600">Relationship:</span> {renderValue(relationship)}</div>
                                      <div><span className="font-semibold text-gray-600">Job Title:</span> {renderValue(jobTitle)}</div>
                                      <div><span className="font-semibold text-gray-600">Company:</span> {renderValue(company)}</div>
                                      <div><span className="font-semibold text-gray-600">Phone:</span> {renderValue(phone)}</div>
                                      <div><span className="font-semibold text-gray-600">Email:</span> {renderValue(email)}</div>
                                    </div>
                                  );
                                })()}
                              </div>
                            ))}
                          </div>
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
              <div className="p-6 space-y-6">
                  {(() => {
                    const interviewStatus = applicationData?.interview_confirmed || payloadObj?.interview_confirmed || 'Idle';
                    const rescheduleRequest = payloadObj?.interview_reschedule_request || payloadObj?.interviewRescheduleRequest || null;
                    return (
                      <AssessmentSectionCard
                        schedule={interview}
                        interviewConfirmed={interviewStatus}
                        rescheduleRequest={rescheduleRequest}
                        onRequestReschedule={() => {
                          setRescheduleNote('');
                          setReschedulePreferredDate('');
                          setReschedulePreferredTimeFrom('');
                          setReschedulePreferredTimeTo('');
                          setShowRejectDialog(true);
                        }}
                      />
                    );
                  })()}

                  {(() => {
                    const interviewStatus = applicationData?.interview_confirmed || payloadObj?.interview_confirmed || 'Idle';
                    const statusLower = String(interviewStatus || '').toLowerCase();
                    const showButtons = statusLower === 'idle' && interview?.date && interview?.time && interview?.location;
                    return showButtons ? (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                          onClick={() => setShowConfirmDialog(true)}
                        >
                          Confirm Interview
                        </button>
                      </div>
                    ) : null;
                  })()}

                  {(() => {
                    const { notes, attachments } = getInterviewNotesFromApplication(applicationData);
                    const legacy = [];
                    if (applicationData?.interview_details_file) legacy.push({ path: applicationData.interview_details_file, label: 'Interview Details' });
                    if (applicationData?.assessment_results_file) legacy.push({ path: applicationData.assessment_results_file, label: 'Assessment Result' });
                    const files = [...(Array.isArray(attachments) ? attachments : []), ...legacy];

                    return (
                      <RemarksAndFilesCard
                        title="Assessment Remarks and Files"
                        remarks={notes}
                        emptyRemarksText="No uploaded remarks or files."
                        files={files}
                        getPublicUrl={getApplicationFilesPublicUrl}
                      />
                    );
                  })()}
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
                <div className="space-y-6">
                  {(() => {
                    const signing = getAgreementSigningFromApplication(applicationData);
                    const interviewStatus = applicationData?.interview_confirmed || payloadObj?.interview_confirmed || null;
                    const legacyRejected = String(interviewStatus || '').trim().toLowerCase() === 'rejected';
                    const rescheduleReqObj = payloadObj?.interview_reschedule_request || payloadObj?.interviewRescheduleRequest || null;
                    const rescheduleReqHandled = Boolean(rescheduleReqObj && (rescheduleReqObj.handled_at || rescheduleReqObj.handledAt));
                    const rescheduleReqActive = Boolean(
                      rescheduleReqObj &&
                      typeof rescheduleReqObj === 'object' &&
                      !rescheduleReqHandled &&
                      (rescheduleReqObj.requested_at || rescheduleReqObj.requestedAt || rescheduleReqObj.note)
                    );
                    const locked = legacyRejected || rescheduleReqActive;
                    return <SigningScheduleCard signing={signing} locked={locked} />;
                  })()}

                  {(() => {
                    const docs = getAgreementDocumentsFromApplication(applicationData);
                    return (
                      <UploadedDocumentsSection
                        title="Uploaded Agreements"
                        emptyText="No file uploaded yet"
                        documents={docs}
                        getPublicUrl={getApplicationFilesPublicUrl}
                        variant="list"
                      />
                    );
                  })()}
                </div>

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
                    const currentPayload = parsePayloadObject(applicationData.payload);
                    const updatedPayload = {
                      ...currentPayload,
                      interview_confirmed: 'Confirmed',
                      interview_confirmed_at: confirmedAt,
                    };

                    const { error: updateError } = await supabase
                      .from('applications')
                      .update({
                        interview_confirmed: 'Confirmed',
                        interview_confirmed_at: confirmedAt,
                        payload: updatedPayload,
                      })
                      .eq('id', applicationData.id);

                    if (updateError) {
                      console.error('Error confirming interview:', updateError);
                      alert('Failed to confirm interview. Please try again.');
                      return;
                    }

                    setApplicationData((prev) => ({
                      ...prev,
                      interview_confirmed: 'Confirmed',
                      interview_confirmed_at: confirmedAt,
                      payload: updatedPayload,
                    }));

                    try {
                      const p = parsePayloadObject(applicationData.payload);
                      const applicantName = p?.form?.firstName && p?.form?.lastName
                        ? `${p.form.firstName} ${p.form.lastName}`
                        : 'Applicant';
                      const position = p?.job?.title || 'Unknown Position';

                      await notifyHRAboutInterviewResponse({
                        applicationId: applicationData.id,
                        applicantName,
                        position,
                        responseType: 'confirmed',
                        interviewDate: applicationData.interview_date || null,
                        interviewTime: applicationData.interview_time || null,
                      });
                    } catch (notifyError) {
                      console.error('Error notifying HR about confirmation:', notifyError);
                    }

                    setShowConfirmDialog(false);
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
              <h3 className="text-lg font-semibold text-gray-800">Request for Reschedule</h3>
            </div>
            <div className="p-4 text-sm text-gray-700 space-y-3">
              <div>
                Provide a short reason and your preferred time window. HR will be notified and will set a new schedule.
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Note (required)</label>
                <textarea
                  rows={3}
                  value={rescheduleNote}
                  onChange={(e) => setRescheduleNote(e.target.value)}
                  placeholder="e.g., I have a prior commitment at the scheduled time."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Preferred date (optional)</label>
                  <input
                    type="date"
                    value={reschedulePreferredDate}
                    onChange={(e) => setReschedulePreferredDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Preferred time window (optional)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="time"
                      value={reschedulePreferredTimeFrom}
                      onChange={(e) => setReschedulePreferredTimeFrom(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      aria-label="Preferred time from"
                    />
                    <input
                      type="time"
                      value={reschedulePreferredTimeTo}
                      onChange={(e) => setReschedulePreferredTimeTo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      aria-label="Preferred time to"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button type="button" className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300" onClick={() => setShowRejectDialog(false)}>Cancel</button>
              <button
                type="button"
                className="px-4 py-2 rounded bg-orange-500 text-white hover:bg-orange-600"
                onClick={async () => {
                  if (!applicationData?.id) {
                    console.error('No application ID found');
                    return;
                  }

                  try {
                    const rejectedAt = new Date().toISOString();

                    const note = String(rescheduleNote || '').trim();
                    if (!note) {
                      alert('Please provide a note for the reschedule request.');
                      return;
                    }

                    const currentPayload = parsePayloadObject(applicationData.payload);
                    const existingReq = currentPayload?.interview_reschedule_request || currentPayload?.interviewRescheduleRequest || null;
                    const existingEver = Boolean(
                      existingReq &&
                      (typeof existingReq !== 'object' ||
                        existingReq.requested_at ||
                        existingReq.requestedAt ||
                        existingReq.note ||
                        existingReq.preferred_date ||
                        existingReq.preferredDate ||
                        existingReq.preferred_time_from ||
                        existingReq.preferredTimeFrom ||
                        existingReq.preferred_time_to ||
                        existingReq.preferredTimeTo ||
                        existingReq.handled_at ||
                        existingReq.handledAt)
                    );
                    if (existingEver) {
                      alert('You can only request an assessment reschedule once for this interview.');
                      return;
                    }

                    const req = {
                      requested_at: rejectedAt,
                      requestedAt: rejectedAt,
                      source: 'applicant',
                      note,
                      preferred_date: reschedulePreferredDate || null,
                      preferredDate: reschedulePreferredDate || null,
                      preferred_time_from: reschedulePreferredTimeFrom || null,
                      preferredTimeFrom: reschedulePreferredTimeFrom || null,
                      preferred_time_to: reschedulePreferredTimeTo || null,
                      preferredTimeTo: reschedulePreferredTimeTo || null,
                    };

                    const updatedPayload = {
                      ...currentPayload,
                      interview_reschedule_request: req,
                      interviewRescheduleRequest: req,
                    };
                    
                    // Update with new text-based status
                    const { error: updateError } = await supabase
                      .from('applications')
                      .update({
                        interview_confirmed: 'Rejected',
                        interview_confirmed_at: rejectedAt,
                        payload: updatedPayload,
                      })
                      .eq('id', applicationData.id);

                    if (updateError) {
                      console.error('Error requesting reschedule:', updateError);
                      return;
                    }

                    // Update local state
                    setApplicationData((prev) => ({
                      ...prev,
                      interview_confirmed: 'Rejected',
                      interview_confirmed_at: rejectedAt,
                      payload: updatedPayload,
                    }));

                    // Notify HR about reschedule request
                    try {
                      const p = parsePayloadObject(applicationData.payload);
                      const applicantName = p?.form?.firstName && p?.form?.lastName
                        ? `${p.form.firstName} ${p.form.lastName}`
                        : 'Applicant';
                      const position = p?.job?.title || 'Unknown Position';
                      const interviewDate = applicationData.interview_date || null;
                      const interviewTime = applicationData.interview_time || null;
                      
                      await notifyHRAboutInterviewResponse({
                        applicationId: applicationData.id,
                        applicantName,
                        position,
                        responseType: 'reschedule_requested',
                        interviewDate,
                        interviewTime,
                        responseNote: note,
                        preferredDate: reschedulePreferredDate || null,
                        preferredTimeFrom: reschedulePreferredTimeFrom || null,
                        preferredTimeTo: reschedulePreferredTimeTo || null,
                      });
                    } catch (notifyError) {
                      console.error('Error notifying HR about reschedule:', notifyError);
                      // Don't fail the reschedule request if notification fails
                    }

                    // Update UI state
                    setShowRejectDialog(false);
                    setStepStatus((s) => ({ ...s, Assessment: "waiting" }));
                    
                    // Show notification
                    setShowRejectionModal(true);
                  } catch (err) {
                    console.error('Error requesting reschedule:', err);
                  }
                }}
              >
                Request Reschedule
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
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50" onClick={() => setShowRejectionModal(false)}>
          <div className="bg-white rounded-md w-full max-w-md mx-4 overflow-hidden border" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-orange-600">
                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="text-lg font-semibold text-gray-800 mb-2">Reschedule Request Submitted</div>
              <div className="text-sm text-gray-600 mb-4">Your reschedule request has been submitted. HR has been notified and will reschedule your interview.</div>
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


