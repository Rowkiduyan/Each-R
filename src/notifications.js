// notifications.js - Notification utility functions
import { supabase } from './supabaseClient';

// Create notification
export async function createNotification({
  userId,
  applicationId,
  type,
  title,
  message,
  userType = 'profile' // 'employee', 'applicant', or 'profile' (HR/Admin/Agency)
}) {
  try {
    // Check if the user exists in the appropriate table
    let tableName, checkError, userCheck;
    
    switch (userType) {
      case 'employee':
        // For employee notifications, check employees table
        ({ data: userCheck, error: checkError } = await supabase
          .from('employees')
          .select('id')
          .eq('id', userId)
          .maybeSingle());
        tableName = 'employees';
        break;
        
      case 'applicant':
        // For applicant notifications, check applicants table
        ({ data: userCheck, error: checkError } = await supabase
          .from('applicants')
          .select('id')
          .eq('id', userId)
          .maybeSingle());
        tableName = 'applicants';
        break;
        
      default:
        // For HR/Admin/Agency notifications, check profiles table
        ({ data: userCheck, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle());
        tableName = 'profiles';
    }
    
    if (checkError) {
      console.error(`Error checking ${tableName}:`, checkError);
      return { success: false, error: checkError };
    }
    
    if (!userCheck) {
      console.warn(`User not found in ${tableName} for user ${userId}, skipping notification`);
      return { success: false, error: { message: `User not found in ${tableName}` } };
    }
    
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        application_id: applicationId,
        type,
        title,
        message,
        read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return { success: false, error };
    }

    console.log('Notification created successfully:', data);
    return { success: true, data };
  } catch (err) {
    console.error('Unexpected error creating notification:', err);
    return { success: false, error: err };
  }
}

// Get unread notifications count
export async function getUnreadNotificationsCount(userId) {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error('Unexpected error fetching unread count:', err);
    return 0;
  }
}

// Get all notifications for user
export async function getNotifications(userId, limit = 20) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        applications (
          id,
          payload
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Unexpected error fetching notifications:', err);
    return [];
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Unexpected error marking notification as read:', err);
    return false;
  }
}

// Mark all notifications as read for user
export async function markAllNotificationsAsRead(userId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Unexpected error marking all notifications as read:', err);
    return false;
  }
}

// Helper function to create interview scheduled notification
export async function createInterviewScheduledNotification({
  userId,
  applicationId,
  interviewDate,
  interviewTime,
  interviewLocation
}) {
  const formattedDate = new Date(interviewDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Format time to 12-hour format
  let formattedTime = interviewTime;
  if (interviewTime) {
    try {
      const [hours, minutes] = interviewTime.split(':');
      const hour = parseInt(hours, 10);
      const minute = (minutes || '00').padStart(2, '0');
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      formattedTime = `${displayHour}:${minute} ${period}`;
    } catch (e) {
      formattedTime = interviewTime;
    }
  }

  return await createNotification({
    userId,
    applicationId,
    type: 'interview_scheduled',
    title: 'Interview Scheduled',
    message: `Your interview has been scheduled for ${formattedDate} at ${formattedTime} in ${interviewLocation}. Please confirm your availability.`,
    userType: 'applicant'
  });
}

// Helper function to create interview rescheduled notification
export async function createInterviewRescheduledNotification({
  userId,
  applicationId,
  interviewDate,
  interviewTime,
  interviewLocation
}) {
  const formattedDate = new Date(interviewDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Format time to 12-hour format
  let formattedTime = interviewTime;
  if (interviewTime) {
    try {
      const [hours, minutes] = interviewTime.split(':');
      const hour = parseInt(hours, 10);
      const minute = (minutes || '00').padStart(2, '0');
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      formattedTime = `${displayHour}:${minute} ${period}`;
    } catch (e) {
      formattedTime = interviewTime;
    }
  }

  return await createNotification({
    userId,
    applicationId,
    type: 'interview_rescheduled',
    title: 'Interview Rescheduled',
    message: `Your interview has been rescheduled to ${formattedDate} at ${formattedTime} in ${interviewLocation}. Please check your application and confirm your availability.`,
    userType: 'applicant'
  });
}

// Helper function to create status update notification
export async function createStatusUpdateNotification({
  userId,
  applicationId,
  status,
  message
}) {
  let title = 'Application Status Update';
  
  switch (status) {
    case 'hired':
      title = 'Congratulations! You\'ve been hired';
      break;
    case 'rejected':
      title = 'Application Update';
      break;
    case 'requirements':
      title = 'Requirements Needed';
      break;
    default:
      title = 'Application Status Update';
  }

  return await createNotification({
    userId,
    applicationId,
    type: 'status_update',
    title,
    message: message || `Your application status has been updated to: ${status}`,
    userType: 'applicant'
  });
}

// Helper function to notify HR about interview responses
export async function notifyHRAboutInterviewResponse({
  applicationId,
  applicantName,
  position,
  responseType, // 'confirmed' or 'rejected'
  interviewDate,
  interviewTime
}) {
  try {
    // Get all HR users (including Admin)
    const { data: hrUsers, error: hrError } = await supabase
      .from('profiles')
      .select('id')
      .or('role.eq.HR,role.eq.Admin');

    if (hrError) {
      console.error('Error fetching HR users:', hrError);
      return { success: false, error: hrError };
    }

    if (!hrUsers || hrUsers.length === 0) {
      console.log('No HR users found');
      return { success: true, message: 'No HR users to notify' };
    }

    // Format the message
    const formattedDate = interviewDate ? new Date(interviewDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 'scheduled date';

    // Format time to 12-hour format
    let formattedTime = interviewTime;
    if (interviewTime) {
      try {
        const [hours, minutes] = interviewTime.split(':');
        const hour = parseInt(hours, 10);
        const minute = (minutes || '00').padStart(2, '0');
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        formattedTime = `${displayHour}:${minute} ${period}`;
      } catch (e) {
        formattedTime = interviewTime;
      }
    }

    let title, message;
    if (responseType === 'reschedule_requested') {
      title = 'Interview Reschedule Requested';
      message = `${applicantName} has requested to reschedule the interview for ${position} position${interviewDate ? ` scheduled on ${formattedDate}${formattedTime ? ` at ${formattedTime}` : ''}` : ''}.`;
    } else {
      title = `Interview ${responseType === 'confirmed' ? 'Confirmed' : 'Rejected'}`;
      message = `${applicantName} has ${responseType} the interview for ${position} position${interviewDate ? ` scheduled on ${formattedDate}${formattedTime ? ` at ${formattedTime}` : ''}` : ''}.`;
    }

    // Create notifications for all HR users
    const notifications = await Promise.all(
      hrUsers.map(hrUser =>
        createNotification({
          userId: hrUser.id,
          applicationId,
          type: `interview_${responseType}`,
          title,
          message
        })
      )
    );

    const successful = notifications.filter(n => n.success).length;
    const failed = notifications.filter(n => !n.success).length;

    console.log(`Notified ${successful} HR users, ${failed} failed`);
    return { 
      success: true, 
      notified: successful, 
      failed,
      details: notifications 
    };

  } catch (err) {
    console.error('Unexpected error notifying HR:', err);
    return { success: false, error: err };
  }
}

// Helper function to create resignation validated notification
export async function createResignationValidatedNotification({
  employeeUserId
}) {
  return await createNotification({
    userId: employeeUserId,
    applicationId: null,
    type: 'resignation_validated',
    title: 'Resignation Letter Validated',
    message: 'Your resignation letter has been validated by HR. Stage 2 is now unlocked. Please download and complete the exit forms.',
    userType: 'employee'
  });
}

// Helper function to create exit forms uploaded notification
export async function createExitFormsUploadedNotification({
  employeeUserId
}) {
  return await createNotification({
    userId: employeeUserId,
    applicationId: null,
    type: 'exit_forms_uploaded',
    title: 'Exit Forms Available',
    message: 'HR has uploaded exit clearance and interview forms for you. Please download, complete, and upload the signed versions.',
    userType: 'employee'
  });
}

// Helper function to create form validated notification
export async function createFormValidatedNotification({
  employeeUserId,
  formType // 'clearance' or 'interview'
}) {
  const formName = formType === 'clearance' ? 'Exit Clearance Form' : 'Exit Interview Form';
  const unlockMessage = formType === 'clearance' ? ' Stage 3 is now unlocked.' : ' Your separation process is moving forward.';
  
  return await createNotification({
    userId: employeeUserId,
    applicationId: null,
    type: `${formType}_validated`,
    title: `${formName} Validated`,
    message: `Your ${formName} has been validated by HR.${unlockMessage}`,
    userType: 'employee'
  });
}

// Notify all HR users about separation submissions (resignation/clearance/interview)
export async function notifyHRAboutSeparationSubmission({
  employeeName,
  submissionType // 'resignation' | 'clearance' | 'interview'
}) {
  try {
    const { data: hrUsers, error: hrError } = await supabase
      .from('profiles')
      .select('id')
      .or('role.eq.HR,role.eq.Admin');

    if (hrError) {
      console.error('Error fetching HR users:', hrError);
      return { success: false, error: hrError };
    }

    if (!hrUsers || hrUsers.length === 0) {
      return { success: true, message: 'No HR users to notify' };
    }

    let title, message;
    if (submissionType === 'resignation') {
      title = 'Resignation Letter Submitted';
      message = `${employeeName} has submitted a resignation letter. Please review and validate.`;
    } else if (submissionType === 'clearance') {
      title = 'Exit Clearance Submitted';
      message = `${employeeName} has submitted the signed exit clearance form.`;
    } else {
      title = 'Exit Interview Submitted';
      message = `${employeeName} has submitted the signed exit interview form.`;
    }

    const notifications = await Promise.all(
      hrUsers.map(hrUser =>
        createNotification({
          userId: hrUser.id,
          applicationId: null,
          type: `separation_${submissionType}_submitted`,
          title,
          message,
          userType: 'profile'
        })
      )
    );

    const successful = notifications.filter(n => n.success).length;
    const failed = notifications.filter(n => !n.success).length;

    console.log(`Separation submission: notified ${successful} HR users, ${failed} failed`);
    return { success: true, notified: successful, failed };
  } catch (err) {
    console.error('Unexpected error notifying HR about separation submission:', err);
    return { success: false, error: err };
  }
}

// Helper function to create form resubmission required notification
export async function createFormResubmissionNotification({
  employeeUserId,
  formType // 'clearance' or 'interview'
}) {
  const formName = formType === 'clearance' ? 'Exit Clearance Form' : 'Exit Interview Form';
  
  return await createNotification({
    userId: employeeUserId,
    applicationId: null,
    type: `${formType}_resubmission`,
    title: `${formName} - Re-submission Required`,
    message: `HR has requested you to re-submit your ${formName}. Please review and upload a corrected version.`,
    userType: 'employee'
  });
}

// Helper function to notify employee about separation completion
export async function createSeparationCompletedNotification({
  employeeUserId
}) {
  return await createNotification({
    userId: employeeUserId,
    applicationId: null,
    type: 'separation_completed',
    title: 'Separation Process Completed',
    message: 'Your separation process has been finalized by HR. Thank you for your service.',
    userType: 'employee'
  });
}

// Helper function to notify employee about account termination
export async function createAccountTerminationNotification({
  employeeUserId,
  expiryDate
}) {
  const formattedDate = new Date(expiryDate).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return await createNotification({
    userId: employeeUserId,
    applicationId: null,
    type: 'account_termination',
    title: 'Account Termination Notice',
    message: `Your account has been terminated. You will have access to your account until ${formattedDate}. After this time, your account will be automatically closed.`,
    userType: 'employee'
  });
}

// Helper function to notify HR when an applicant retracts their application
export async function notifyHRAboutApplicationRetraction({
  applicationId,
  applicantName,
  position,
  depot
}) {
  try {
    // Get all HR users
    const { data: hrUsers, error: hrError } = await supabase
      .from('profiles')
      .select('id')
      .or('role.eq.HR,role.eq.Admin');

    if (hrError) {
      console.error('Error fetching HR users:', hrError);
      return { success: false, error: hrError };
    }

    if (!hrUsers || hrUsers.length === 0) {
      console.log('No HR users found');
      return { success: true, message: 'No HR users to notify' };
    }

    const title = 'Application Retracted';
    const message = `${applicantName} has retracted their application for ${position}${depot ? ` (${depot})` : ''}.`;

    // Create notifications for all HR users
    const notifications = await Promise.all(
      hrUsers.map(hrUser =>
        createNotification({
          userId: hrUser.id,
          applicationId: null, // Application is deleted, so no application_id
          type: 'application_retracted',
          title,
          message
        })
      )
    );

    const successful = notifications.filter(n => n.success).length;
    const failed = notifications.filter(n => !n.success).length;

    console.log(`Notified ${successful} HR users about application retraction, ${failed} failed`);
    return { 
      success: true, 
      notified: successful, 
      failed,
      details: notifications 
    };

  } catch (err) {
    console.error('Unexpected error notifying HR about application retraction:', err);
    return { success: false, error: err };
  }
}

// Helper function to notify HR about agreement signing responses
export async function notifyHRAboutAgreementSigningResponse({
  applicationId,
  applicantName,
  position,
  responseType, // 'confirmed' or 'rejected'
  signingDate,
  signingTime
}) {
  try {
    // Get all HR users (including Admin)
    const { data: hrUsers, error: hrError } = await supabase
      .from('profiles')
      .select('id')
      .or('role.eq.HR,role.eq.Admin');

    if (hrError) {
      console.error('Error fetching HR users:', hrError);
      return { success: false, error: hrError };
    }

    if (!hrUsers || hrUsers.length === 0) {
      console.log('No HR users found');
      return { success: true, message: 'No HR users to notify' };
    }

    const formattedDate = signingDate
      ? new Date(signingDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : 'scheduled date';

    const title = `Agreement Signing ${responseType === 'confirmed' ? 'Confirmed' : 'Reschedule Requested'}`;
    const message = `${applicantName} has ${responseType === 'confirmed' ? 'confirmed' : 'requested a reschedule for'} the agreement signing for ${position} position${signingDate ? ` scheduled on ${formattedDate}${signingTime ? ` at ${signingTime}` : ''}` : ''}.`;

    const notifications = await Promise.all(
      hrUsers.map((hrUser) =>
        createNotification({
          userId: hrUser.id,
          applicationId,
          type: `agreement_signing_${responseType}`,
          title,
          message
        })
      )
    );

    const successful = notifications.filter((n) => n.success).length;
    const failed = notifications.filter((n) => !n.success).length;

    console.log(`Notified ${successful} HR users, ${failed} failed`);
    return {
      success: true,
      notified: successful,
      failed,
      details: notifications
    };
  } catch (err) {
    console.error('Unexpected error notifying HR:', err);
    return { success: false, error: err };
  }
}