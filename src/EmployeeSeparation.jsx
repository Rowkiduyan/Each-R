import { useState, useEffect } from "react";
import { useEmployeeUser } from "./layouts/EmployeeLayout";
import { supabase } from "./supabaseClient";
import { notifyHRAboutSeparationSubmission } from "./notifications";

function EmployeeSeparation() {
  const { userId, userEmail, employeeData } = useEmployeeUser();
  
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingClearance, setUploadingClearance] = useState(false);
  const [uploadingInterview, setUploadingInterview] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Separation record from database
  const [separationRecord, setSeparationRecord] = useState(null);
  
  // Resignation Type Selection - default to 'resignation'
  const [resignationType, setResignationType] = useState('resignation'); // 'resignation' or 'immediate'
  
  // Stage 1: Resignation Letter
  const [resignationFile, setResignationFile] = useState(null);
  const [resignationStatus, setResignationStatus] = useState("none"); // none, submitted, validated
  const [uploadedFileName, setUploadedFileName] = useState(null); // Store original filename
  const [fileInputKey, setFileInputKey] = useState(Date.now()); // Key to control file input
  
  // Stage 2: Clearance & Exit Interview (unlocked when resignation is validated)
  const [exitClearanceFile, setExitClearanceFile] = useState(null);
  const [exitInterviewFile, setExitInterviewFile] = useState(null);
  const [exitClearanceStatus, setExitClearanceStatus] = useState("none");
  const [exitInterviewStatus, setExitInterviewStatus] = useState("none");
  
  // Global templates
  const [templates, setTemplates] = useState(null);
  
  // Stage 3: Final Review
  const [clearanceReviewStatus, setClearanceReviewStatus] = useState("Pending Validation");
  const [interviewReviewStatus, setInterviewReviewStatus] = useState("Pending Validation");
  const [finalDocs, setFinalDocs] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);

  // Confirmation modals
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showExitClearanceConfirm, setShowExitClearanceConfirm] = useState(false);
  const [showExitInterviewConfirm, setShowExitInterviewConfirm] = useState(false);
  const [showTerminationModal, setShowTerminationModal] = useState(false);

  // Termination data
  const [isTerminated, setIsTerminated] = useState(false);
  const [accountExpiresAt, setAccountExpiresAt] = useState(null);
  const [terminationDocUrl, setTerminationDocUrl] = useState(null);
  const [terminationDocFilename, setTerminationDocFilename] = useState(null);

  // Fetch separation record on component mount
  useEffect(() => {
    if (employeeData?.id) {
      fetchSeparationRecord();
      fetchTemplates();
    }
  }, [employeeData]);

  // Save and restore scroll position
  useEffect(() => {
    // Save scroll position as user scrolls
    const handleScroll = () => {
      sessionStorage.setItem('employeeSeparationScrollPosition', window.scrollY.toString());
    };
    window.addEventListener('scroll', handleScroll);

    // Save scroll position before page unload
    const handleBeforeUnload = () => {
      sessionStorage.setItem('employeeSeparationScrollPosition', window.scrollY.toString());
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Restore scroll position after content is loaded
  useEffect(() => {
    if (!loading) {
      const savedScrollPosition = sessionStorage.getItem('employeeSeparationScrollPosition');
      if (savedScrollPosition) {
        // Restore scroll position immediately
        window.scrollTo(0, parseInt(savedScrollPosition, 10));
      }
    }
  }, [loading]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('separation_form_templates')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching templates:', error);
        return;
      }
      
      setTemplates(data);
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  };

  const fetchSeparationRecord = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const employeeId = employeeData?.id;
      console.log('Fetching separation record for employeeId:', employeeId);
      
      if (!employeeId) {
        console.log('No employee ID available');
        setLoading(false);
        return;
      }
      
      const { data, error: fetchError } = await supabase
        .from('employee_separations')
        .select('*')
        .eq('employee_id', employeeId)
        .maybeSingle(); // Changed from .single() to .maybeSingle()

      console.log('Fetch result:', { data, error: fetchError });

      if (fetchError) {
        console.error('Fetch error details:', {
          message: fetchError.message,
          details: fetchError.details,
          hint: fetchError.hint,
          code: fetchError.code
        });
        throw fetchError;
      }

      if (data) {
        setSeparationRecord(data);
        // Set resignation type from database or keep default
        if (data.type) {
          setResignationType(data.type);
        }
        setResignationStatus(data.resignation_status || 'none');
        setExitClearanceStatus(data.signed_exit_clearance_status || 'none');
        setExitInterviewStatus(data.signed_exit_interview_status || 'none');
        setFinalDocs(Array.isArray(data.additional_files_urls) ? data.additional_files_urls.map(f => f.name || f) : []);
        setIsCompleted(data.status === 'completed');
        setIsTerminated(data.is_terminated || false);
        setAccountExpiresAt(data.account_expires_at);
        setTerminationDocUrl(data.termination_doc_url);
        setTerminationDocFilename(data.termination_doc_filename);
        
        // Use the stored original filename
        if (data.resignation_original_filename) {
          setUploadedFileName(data.resignation_original_filename);
        }
      } else {
        console.log('No separation record found for user');
      }
    } catch (err) {
      console.error('Error fetching separation record:', err);
      setError(`Failed to load separation data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResignationSubmit = async () => {
    // Prevent double submission
    if (uploading) return;
    
    const employeeId = employeeData?.id || userId;
    console.log('Employee Data:', employeeData);
    console.log('Employee ID for submission:', employeeId);
    console.log('User ID (auth):', userId);
    
    if (!resignationFile) {
      setError('Please select a resignation letter file.');
      return;
    }
    
    if (!employeeId) {
      setError('Unable to submit: Employee information not found. Please contact HR.');
      return;
    }
    
    // Verify employee exists in employees table
    const { data: employeeCheck, error: checkError } = await supabase
      .from('employees')
      .select('id')
      .eq('id', employeeId)
      .maybeSingle();
    
    if (checkError) {
      console.error('Error checking employee:', checkError);
      setError('Unable to verify employee record. Please try again.');
      return;
    }
    
    if (!employeeCheck) {
      console.error('Employee not found in employees table with ID:', employeeId);
      setError('Employee record not found. Please contact HR to ensure your employee account is set up correctly.');
      return;
    }
    
    setShowUpdateConfirm(false); // Close update modal
    setShowSubmitConfirm(false); // Close submit modal
    
    try {
      setUploading(true);
      setError(null);
      setSuccess(null);
      
      // If updating, delete the old file first
      if (separationRecord?.resignation_letter_url) {
        const { error: deleteError } = await supabase.storage
          .from('separation-documents')
          .remove([separationRecord.resignation_letter_url]);
        
        if (deleteError) {
          console.warn('Failed to delete old file:', deleteError);
          // Continue anyway - not critical
        }
      }
      
      // 1. Upload file to storage
      const fileExt = resignationFile.name.split('.').pop();
      const fileName = `${employeeData?.authUserId || userId}/resignation_letter_${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('separation-documents')
        .upload(fileName, resignationFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // 2. Get public URL (or use path for private bucket)
      const filePath = uploadData.path;

      // 3. Create or update database record
      // Always use upsert to handle cases where record might exist
      const { error: upsertError } = await supabase
        .from('employee_separations')
        .upsert({
          employee_id: employeeId,
          type: resignationType,
          resignation_letter_url: filePath,
          resignation_status: 'submitted',
          resignation_submitted_at: new Date().toISOString(),
          status: 'pending',
          resignation_original_filename: resignationFile.name
        }, {
          onConflict: 'employee_id' // Use employee_id as the conflict target
        });

      if (upsertError) throw upsertError;

      // Notify HR about resignation submission
      const employeeName = employeeData?.fname && employeeData?.lname 
        ? `${employeeData.fname} ${employeeData.lname}`
        : userEmail;
      await notifyHRAboutSeparationSubmission({
        employeeName,
        submissionType: 'resignation'
      });

      // 4. Update UI
      setResignationStatus('submitted');
      setSuccess('Resignation letter submitted successfully! Awaiting HR review.');
      setUploadedFileName(resignationFile.name); // Store the original filename
      // Keep resignationFile in state so the input shows the file
      
      // Refresh data
      await fetchSeparationRecord();
      
    } catch (err) {
      console.error('Error submitting resignation:', err);
      setError(`Failed to submit resignation letter: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const isStage2Unlocked = resignationStatus === "validated";
  const isStage3Active = exitClearanceStatus === "submitted" && exitInterviewStatus === "submitted";

  const handleExitClearanceSubmit = async () => {
    // Prevent double submission
    if (uploadingClearance) return;
    
    const employeeId = employeeData?.id;
    if (!exitClearanceFile || !employeeId) return;
    
    setShowExitClearanceConfirm(false);
    
    try {
      setUploadingClearance(true);
      setError(null);
      
      // Delete old file if updating
      if (separationRecord?.signed_exit_clearance_url) {
        await supabase.storage
          .from('separation-documents')
          .remove([separationRecord.signed_exit_clearance_url]);
      }
      
      // Upload new file
      const fileExt = exitClearanceFile.name.split('.').pop();
      const fileName = `${employeeData?.authUserId || userId}/signed_exit_clearance_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('separation-documents')
        .upload(fileName, exitClearanceFile, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) throw uploadError;
      
      // Update database
      const { error: updateError } = await supabase
        .from('employee_separations')
        .update({
          signed_exit_clearance_url: fileName,
          signed_exit_clearance_filename: exitClearanceFile.name,
          signed_exit_clearance_status: 'submitted',
          signed_exit_clearance_submitted_at: new Date().toISOString()
        })
        .eq('employee_id', employeeId);
      
      if (updateError) throw updateError;
      
      // Notify HR about clearance form submission
      const employeeName = employeeData?.fname && employeeData?.lname 
        ? `${employeeData.fname} ${employeeData.lname}`
        : userEmail;
      await notifyHRAboutSeparationSubmission({
        employeeName,
        submissionType: 'clearance'
      });

      setExitClearanceStatus("submitted");
      setSuccess('Exit clearance form submitted successfully!');
      
      // Save scroll position before refresh
      const scrollPosition = window.scrollY;
      await fetchSeparationRecord();
      // Restore scroll position after refresh
      setTimeout(() => window.scrollTo(0, scrollPosition), 0);
      
    } catch (err) {
      console.error('Error submitting exit clearance:', err);
      setError(`Failed to submit exit clearance: ${err.message}`);
    } finally {
      setUploadingClearance(false);
    }
  };

  const handleExitInterviewSubmit = async () => {
    // Prevent double submission
    if (uploadingInterview) return;
    
    const employeeId = employeeData?.id;
    if (!exitInterviewFile || !employeeId) return;
    
    setShowExitInterviewConfirm(false);
    
    try {
      setUploadingInterview(true);
      setError(null);
      
      // Delete old file if updating
      if (separationRecord?.signed_exit_interview_url) {
        await supabase.storage
          .from('separation-documents')
          .remove([separationRecord.signed_exit_interview_url]);
      }
      
      // Upload new file
      const fileExt = exitInterviewFile.name.split('.').pop();
      const fileName = `${employeeData?.authUserId || userId}/signed_exit_interview_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('separation-documents')
        .upload(fileName, exitInterviewFile, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) throw uploadError;
      
      // Update database
      const { error: updateError } = await supabase
        .from('employee_separations')
        .update({
          signed_exit_interview_url: fileName,
          signed_exit_interview_filename: exitInterviewFile.name,
          signed_exit_interview_status: 'submitted',
          signed_exit_interview_submitted_at: new Date().toISOString()
        })
        .eq('employee_id', employeeId);
      
      if (updateError) throw updateError;
      
      // Notify HR about interview form submission
      const employeeName = employeeData?.fname && employeeData?.lname 
        ? `${employeeData.fname} ${employeeData.lname}`
        : userEmail;
      await notifyHRAboutSeparationSubmission({
        employeeName,
        submissionType: 'interview'
      });

      setExitInterviewStatus("submitted");
      setSuccess('Exit interview form submitted successfully!');
      
      // Save scroll position before refresh
      const scrollPosition = window.scrollY;
      await fetchSeparationRecord();
      // Restore scroll position after refresh
      setTimeout(() => window.scrollTo(0, scrollPosition), 0);
      
    } catch (err) {
      console.error('Error submitting exit interview:', err);
      setError(`Failed to submit exit interview: ${err.message}`);
    } finally {
      setUploadingInterview(false);
    }
  };

  // Determine current stage for progress bar
  const getCurrentStage = () => {
    if (isCompleted) return 3;
    if (resignationStatus === "validated" && isStage3Active) return 3;
    if (resignationStatus === "validated") return 2;
    return 1;
  };

  const currentStage = getCurrentStage();

  if (loading) {
    return (
      <div className="w-full py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading separation process...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Separation Process</h1>

      {/* Termination Notice */}
      {isTerminated && accountExpiresAt && (
        <div className="mb-6 bg-red-50 border-2 border-red-500 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-red-700 mb-2">Account Termination Notice</h2>
              <p className="text-red-600 mb-4">
                Your account has been terminated. You will have access to this account until{' '}
                <span className="font-semibold">{new Date(accountExpiresAt).toLocaleString()}</span>.
              </p>
              <p className="text-sm text-red-600 mb-4">
                After this time, your account will be automatically closed and you will no longer be able to log in.
              </p>
              {terminationDocUrl && (
                <button
                  onClick={() => setShowTerminationModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  View Termination Details
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Resignation Type Badge - Show after submission */}
      {resignationStatus !== 'none' && (
        <div className="mb-4 flex items-center gap-2">
          <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${
            resignationType === 'immediate' 
              ? 'bg-orange-100 text-orange-800 border border-orange-300' 
              : 'bg-blue-100 text-blue-800 border border-blue-300'
          }`}>
            {resignationType === 'immediate' ? '⚡ Immediate Resignation' : '📄 Regular Resignation'}
          </span>
        </div>
      )}

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
              {resignationStatus === "validated" ? '✓' : '1'}
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
        </div>
      </div>

      {/* Stage 1: Resignation Submission */}
      {resignationStatus !== 'validated' && (
        <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Stage 1: Resignation Submission</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              resignationStatus === "validated" ? 'bg-green-100 text-green-800' :
              resignationStatus === "submitted" ? 'bg-orange-100 text-orange-800' :
              'bg-gray-100 text-gray-600'
            }`}>
              {resignationStatus === "validated" ? "Validated" : resignationStatus === "submitted" ? "Pending HR Review" : "Not Submitted"}
            </span>
          </div>
          <p className="text-gray-600 mb-4">
            {resignationStatus === 'none' 
              ? 'Upload your resignation letter to begin the separation process.' 
              : 'You can update or delete your resignation letter while it is pending HR review.'}
          </p>
          
          <div className="space-y-4">
            {/* Resignation Type Selector - Only show when status is 'none' */}
            {resignationStatus === 'none' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resignation Type
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    resignationType === 'resignation'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                  }`}>
                    <input
                      type="radio"
                      name="resignationType"
                      value="resignation"
                      checked={resignationType === 'resignation'}
                      onChange={(e) => setResignationType(e.target.value)}
                      className="mt-1 mr-3 h-4 w-4 text-blue-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="font-semibold text-gray-800">Regular Resignation</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Submit with standard notice period</p>
                    </div>
                  </label>
                  
                  <label className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    resignationType === 'immediate'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-300 hover:border-orange-300 hover:bg-orange-50'
                  }`}>
                    <input
                      type="radio"
                      name="resignationType"
                      value="immediate"
                      checked={resignationType === 'immediate'}
                      onChange={(e) => setResignationType(e.target.value)}
                      className="mt-1 mr-3 h-4 w-4 text-orange-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-semibold text-gray-800">Immediate Resignation</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Resign immediately without notice</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resignation Letter
            </label>
            <input
              key={fileInputKey}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setResignationFile(e.target.files[0])}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              disabled={resignationStatus === "validated" || uploading}
            />
            {resignationFile && (
              <p className="mt-2 text-sm text-blue-600">📎 {resignationFile.name}</p>
            )}
            {uploadedFileName && resignationStatus !== 'none' && !resignationFile && (
              <p className="mt-2 text-sm text-green-600">✓ Currently uploaded: {uploadedFileName}</p>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (resignationStatus === 'submitted' && resignationFile) {
                  setShowUpdateConfirm(true);
                } else if (resignationStatus === 'none' && resignationFile) {
                  setShowSubmitConfirm(true);
                } else {
                  handleResignationSubmit();
                }
              }}
              disabled={!resignationFile || resignationStatus === "validated" || uploading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? 'Submitting...' : resignationStatus === 'submitted' && resignationFile ? 'Update' : 'Submit'}
            </button>
            {resignationFile && resignationStatus !== "validated" && !uploading && (
              <button
                onClick={() => {
                  setResignationFile(null);
                  setFileInputKey(Date.now()); // Reset file input
                }}
                className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Clear Selection
              </button>
            )}
            {uploadedFileName && resignationStatus === 'submitted' && (
              <button
                onClick={() => setShowRemoveConfirm(true)}
                className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                Delete Uploaded File
              </button>
            )}
          </div>
          </div>
        </div>
      )}

      {/* Stage 1: After Validation - Show confirmation */}
      {resignationStatus === 'validated' && (
        <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Stage 1: Resignation Submission</h2>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ✓ Validated
            </span>
          </div>
          <p className="text-gray-600 mb-4">Your resignation letter has been validated by HR.</p>
          
          <div className="space-y-4">
            {uploadedFileName && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-gray-700 mb-1">Submitted File:</p>
                <p className="text-sm text-green-600">✓ {uploadedFileName}</p>
              </div>
            )}
          </div>
        </div>
      )}

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
            {/* HR Upload Notification */}
            {(separationRecord?.exit_clearance_form_url || separationRecord?.exit_interview_form_url) && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-blue-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-semibold text-blue-800 mb-1">New Forms Available!</h4>
                    <p className="text-sm text-blue-700">
                      HR has uploaded exit forms for you. Please download them, complete them, and upload the signed versions below.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Exit Clearance Form */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-800 mb-3">Exit Clearance Form</h3>
              <div className="space-y-3">
                {separationRecord?.exit_clearance_form_url ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-green-800">Form uploaded by HR - Ready to download</span>
                    </div>
                  </div>
                ) : null}
                {separationRecord?.exit_clearance_form_url ? (
                  <button
                    onClick={async () => {
                      try {
                        const { data, error } = await supabase.storage
                          .from('separation-documents')
                          .download(separationRecord.exit_clearance_form_url);
                        
                        if (error) throw error;
                        
                        const url = URL.createObjectURL(data);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = separationRecord.exit_clearance_form_filename || 'exit_clearance_form.pdf';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      } catch (err) {
                        console.error('Error downloading form:', err);
                        alert('Failed to download form');
                      }
                    }}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Form
                  </button>
                ) : templates?.exit_clearance_form_url ? (
                  <button
                    onClick={async () => {
                      try {
                        const { data, error } = await supabase.storage
                          .from('separation-documents')
                          .download(templates.exit_clearance_form_url);
                        
                        if (error) throw error;
                        
                        const url = URL.createObjectURL(data);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = templates.exit_clearance_form_filename || 'exit_clearance_form.pdf';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      } catch (err) {
                        console.error('Error downloading form:', err);
                        alert('Failed to download form');
                      }
                    }}
                    className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Form
                  </button>
                ) : (
                  <p className="text-sm text-gray-500">No form template available yet. Please contact HR.</p>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Signed Exit Clearance Form
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setExitClearanceFile(e.target.files[0])}
                    disabled={exitClearanceStatus === "submitted" && exitClearanceStatus !== "resubmission_required"}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                  />
                  {exitClearanceFile && (
                    <p className="mt-2 text-sm text-gray-600">Selected: {exitClearanceFile.name}</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowExitClearanceConfirm(true)}
                    disabled={!exitClearanceFile || uploadingClearance}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    {uploadingClearance ? 'Uploading...' : separationRecord?.signed_exit_clearance_url ? 'Update' : 'Submit'}
                  </button>
                  {exitClearanceFile && !uploadingClearance && (
                    <button
                      onClick={() => {
                        setExitClearanceFile(null);
                      }}
                      className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {exitClearanceStatus === "submitted" && (
                  <p className="text-sm text-orange-600 font-medium">✓ Submitted - Awaiting HR Review</p>
                )}
                {exitClearanceStatus === "validated" && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800 font-medium">✓ Validated by HR</p>
                    <p className="text-xs text-green-700 mt-1">Your exit clearance form has been approved.</p>
                  </div>
                )}
                {exitClearanceStatus === "resubmission_required" && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800 font-medium">⚠ Re-submission Required</p>
                    <p className="text-xs text-red-700 mt-1">HR has requested you to re-submit this form. Please review and upload a corrected version.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Exit Interview Form */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-800 mb-3">Exit Interview Form</h3>
              <div className="space-y-3">
                {separationRecord?.exit_interview_form_url ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-green-800">Form uploaded by HR - Ready to download</span>
                    </div>
                  </div>
                ) : null}
                {separationRecord?.exit_interview_form_url ? (
                  <button
                    onClick={async () => {
                      try {
                        const { data, error } = await supabase.storage
                          .from('separation-documents')
                          .download(separationRecord.exit_interview_form_url);
                        
                        if (error) throw error;
                        
                        const url = URL.createObjectURL(data);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = separationRecord.exit_interview_form_filename || 'exit_interview_form.pdf';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      } catch (err) {
                        console.error('Error downloading form:', err);
                        alert('Failed to download form');
                      }
                    }}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Form
                  </button>
                ) : templates?.exit_interview_form_url ? (
                  <button
                    onClick={async () => {
                      try {
                        const { data, error } = await supabase.storage
                          .from('separation-documents')
                          .download(templates.exit_interview_form_url);
                        
                        if (error) throw error;
                        
                        const url = URL.createObjectURL(data);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = templates.exit_interview_form_filename || 'exit_interview_form.pdf';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      } catch (err) {
                        console.error('Error downloading form:', err);
                        alert('Failed to download form');
                      }
                    }}
                    className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Form
                  </button>
                ) : (
                  <p className="text-sm text-gray-500">No form template available yet. Please contact HR.</p>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Signed Exit Interview Form
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setExitInterviewFile(e.target.files[0])}
                    disabled={exitInterviewStatus === "submitted" && exitInterviewStatus !== "resubmission_required"}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                  />
                  {exitInterviewFile && (
                    <p className="mt-2 text-sm text-gray-600">Selected: {exitInterviewFile.name}</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowExitInterviewConfirm(true)}
                    disabled={!exitInterviewFile || uploadingInterview}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    {uploadingInterview ? 'Uploading...' : separationRecord?.signed_exit_interview_url ? 'Update' : 'Submit'}
                  </button>
                  {exitInterviewFile && !uploadingInterview && (
                    <button
                      onClick={() => {
                        setExitInterviewFile(null);
                      }}
                      className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {exitInterviewStatus === "submitted" && (
                  <p className="text-sm text-orange-600 font-medium">✓ Submitted - Awaiting HR Review</p>
                )}
                {exitInterviewStatus === "validated" && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800 font-medium">✓ Validated by HR</p>
                    <p className="text-xs text-green-700 mt-1">Your exit interview form has been approved.</p>
                  </div>
                )}
                {exitInterviewStatus === "resubmission_required" && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800 font-medium">⚠ Re-submission Required</p>
                    <p className="text-xs text-red-700 mt-1">HR has requested you to re-submit this form. Please review and upload a corrected version.</p>
                  </div>
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
      {(isStage3Active || isCompleted) && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Stage 3: Final Review</h2>
          </div>
          <p className="text-gray-600 mb-6">HR is reviewing your documents. Please wait for possible additional files.</p>

          <div className="space-y-4">
            {/* Final HR Documents */}
            {finalDocs.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-3">Final HR Documents</h3>
                <div className="space-y-2">
                  {Array.isArray(separationRecord?.additional_files_urls) && separationRecord.additional_files_urls.map((fileData, index) => {
                    // Parse if it's a JSON string
                    let parsedData = fileData;
                    if (typeof fileData === 'string' && fileData.startsWith('{')) {
                      try {
                        parsedData = JSON.parse(fileData);
                      } catch (e) {
                        parsedData = fileData;
                      }
                    }
                    
                    // Handle both object format {url, name} and legacy string format
                    const fileName = typeof parsedData === 'object' ? parsedData.name : `Document ${index + 1}`;
                    const filePath = typeof parsedData === 'object' ? parsedData.url : parsedData;
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <p className="text-sm text-gray-700">{fileName}</p>
                        <button
                          onClick={async () => {
                            try {
                              const { data, error } = await supabase.storage
                                .from('separation-documents')
                                .download(filePath);
                              
                              if (error) throw error;
                              
                              const url = URL.createObjectURL(data);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = fileName;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            } catch (err) {
                              console.error('Error downloading document:', err);
                              alert('Failed to download document');
                            }
                          }}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                        >
                          Download
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Completion Status */}
            {isCompleted && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-green-800">Separation Process Completed</p>
                    <p className="text-xs text-green-700 mt-1">Your separation has been finalized by HR. Thank you for your service.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-black max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Submit Resignation Letter?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to submit your resignation letter? This will begin your separation process.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                disabled={uploading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleResignationSubmit}
                disabled={uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Confirmation Modal */}
      {showUpdateConfirm && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-black max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Update Resignation Letter?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to replace your current resignation letter with the new file?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowUpdateConfirm(false)}
                disabled={uploading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleResignationSubmit}
                disabled={uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Confirmation Modal */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-black max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Delete Resignation Letter?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete your submitted resignation letter? This will reset your separation process.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRemoveConfirm(false)}
                disabled={uploading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (uploading) return;
                  
                  try {
                    setUploading(true);
                    setError(null);
                    
                    if (separationRecord?.resignation_letter_url) {
                      const { error: deleteError } = await supabase.storage
                        .from('separation-documents')
                        .remove([separationRecord.resignation_letter_url]);
                      
                      if (deleteError) {
                        console.error('Failed to delete file from storage:', deleteError);
                        throw new Error('Failed to delete file from storage');
                      }
                    }
                    
                    if (separationRecord?.id) {
                      const { error: dbError } = await supabase
                        .from('employee_separations')
                        .delete()
                        .eq('id', separationRecord.id);
                      
                      if (dbError) {
                        console.error('Failed to delete database record:', dbError);
                        throw new Error('Failed to delete separation record');
                      }
                    }
                    
                    setResignationFile(null);
                    setSeparationRecord(null);
                    setResignationStatus('none');
                    setUploadedFileName(null);
                    setFileInputKey(Date.now());
                    setShowRemoveConfirm(false);
                    setSuccess('Resignation letter deleted successfully.');
                    
                  } catch (err) {
                    console.error('Error removing resignation:', err);
                    setError(`Failed to remove resignation letter: ${err.message}`);
                    setShowRemoveConfirm(false);
                  } finally {
                    setUploading(false);
                  }
                }}
                disabled={uploading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Clearance Confirmation Modal */}
      {showExitClearanceConfirm && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-black max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {separationRecord?.signed_exit_clearance_url ? 'Update Exit Clearance Form?' : 'Submit Exit Clearance Form?'}
            </h3>
            <p className="text-gray-600 mb-6">
              {separationRecord?.signed_exit_clearance_url 
                ? 'Are you sure you want to replace your current exit clearance form with the new file?'
                : 'Are you sure you want to submit your signed exit clearance form?'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowExitClearanceConfirm(false)}
                disabled={uploadingClearance}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExitClearanceSubmit}
                disabled={uploadingClearance}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploadingClearance ? (separationRecord?.signed_exit_clearance_url ? 'Updating...' : 'Uploading...') : separationRecord?.signed_exit_clearance_url ? 'Update' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Interview Confirmation Modal */}
      {showExitInterviewConfirm && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-black max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {separationRecord?.signed_exit_interview_url ? 'Update Exit Interview Form?' : 'Submit Exit Interview Form?'}
            </h3>
            <p className="text-gray-600 mb-6">
              {separationRecord?.signed_exit_interview_url 
                ? 'Are you sure you want to replace your current exit interview form with the new file?'
                : 'Are you sure you want to submit your signed exit interview form?'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowExitInterviewConfirm(false)}
                disabled={uploadingInterview}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExitInterviewSubmit}
                disabled={uploadingInterview}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploadingInterview ? (separationRecord?.signed_exit_interview_url ? 'Updating...' : 'Uploading...') : separationRecord?.signed_exit_interview_url ? 'Update' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Termination Details Modal */}
      {showTerminationModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-black max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-red-600 mb-4">Termination Details</h3>
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Termination Document:</p>
                <p className="font-medium text-gray-800">{terminationDocFilename || 'Termination Document'}</p>
              </div>
              <button
                onClick={async () => {
                  try {
                    const { data, error } = await supabase.storage
                      .from('separation-documents')
                      .download(terminationDocUrl);
                    
                    if (error) throw error;
                    
                    const url = URL.createObjectURL(data);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = terminationDocFilename || 'termination_document.pdf';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  } catch (err) {
                    console.error('Error downloading document:', err);
                    alert('Failed to download document');
                  }
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Download Document
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowTerminationModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeSeparation;
