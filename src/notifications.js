// notifications.js - Notification utility functions
import { supabase } from './supabaseClient';

// Create notification
export async function createNotification({
  userId,
  applicationId,
  type,
  title,
  message
}) {
  try {
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

  return await createNotification({
    userId,
    applicationId,
    type: 'interview_scheduled',
    title: 'Interview Scheduled',
    message: `Your interview has been scheduled for ${formattedDate} at ${interviewTime} in ${interviewLocation}. Please confirm your availability.`
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

  return await createNotification({
    userId,
    applicationId,
    type: 'interview_rescheduled',
    title: 'Interview Rescheduled',
    message: `Your interview has been rescheduled to ${formattedDate} at ${interviewTime} in ${interviewLocation}. Please check your application and confirm your availability.`
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
    message: message || `Your application status has been updated to: ${status}`
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
    // Get all HR users
    const { data: hrUsers, error: hrError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('role', 'HR');

    if (hrError) {
      console.error('Error fetching HR users:', hrError);
      return { success: false, error: hrError };
    }

    if (!hrUsers || hrUsers.length === 0) {
      console.log('No HR users found');
      return { success: true, message: 'No HR users to notify' };
    }

    // Format the message
    const formattedDate = new Date(interviewDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const title = `Interview ${responseType === 'confirmed' ? 'Confirmed' : 'Rejected'}`;
    const message = `${applicantName} has ${responseType} the interview for ${position} position scheduled on ${formattedDate} at ${interviewTime}.`;

    // Create notifications for all HR users
    const notifications = await Promise.all(
      hrUsers.map(hrUser =>
        createNotification({
          userId: hrUser.user_id,
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
    message: 'Your resignation letter has been validated by HR. Stage 2 is now unlocked. Please download and complete the exit forms.'
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
    message: 'HR has uploaded exit clearance and interview forms for you. Please download, complete, and upload the signed versions.'
  });
}

// Helper function to create form validated notification
export async function createFormValidatedNotification({
  employeeUserId,
  formType // 'clearance' or 'interview'
}) {
  const formName = formType === 'clearance' ? 'Exit Clearance Form' : 'Exit Interview Form';
  
  return await createNotification({
    userId: employeeUserId,
    applicationId: null,
    type: `${formType}_validated`,
    title: `${formName} Validated`,
    message: `Your ${formName} has been validated by HR.`
  });
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
    message: `HR has requested you to re-submit your ${formName}. Please review and upload a corrected version.`
  });
}

// Helper function to notify HR about employee separation submissions
export async function notifyHRAboutSeparationSubmission({
  employeeName,
  submissionType // 'resignation', 'clearance', 'interview'
}) {
  try {
    // Fetch all HR users
    const { data: hrUsers, error: hrError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('role', 'hr');

    if (hrError) {
      console.error('Error fetching HR users:', hrError);
      return { success: false, error: hrError };
    }

    if (!hrUsers || hrUsers.length === 0) {
      console.warn('No HR users found to notify');
      return { success: false, error: 'No HR users found' };
    }

    const titleMap = {
      'resignation': 'New Resignation Letter Submitted',
      'clearance': 'Exit Clearance Form Submitted',
      'interview': 'Exit Interview Form Submitted'
    };

    const messageMap = {
      'resignation': `${employeeName} has submitted a resignation letter for review.`,
      'clearance': `${employeeName} has submitted their signed Exit Clearance Form for validation.`,
      'interview': `${employeeName} has submitted their signed Exit Interview Form for validation.`
    };

    // Create notifications for all HR users
    const notifications = await Promise.all(
      hrUsers.map(async (hr) => {
        try {
          const result = await createNotification({
            userId: hr.id,
            applicationId: null,
            type: `separation_${submissionType}_submitted`,
            title: titleMap[submissionType],
            message: messageMap[submissionType]
          });
          return { ...result, hrId: hr.id };
        } catch (err) {
          console.error(`Failed to notify HR user ${hr.id}:`, err);
          return { success: false, error: err, hrId: hr.id };
        }
      })
    );

    const successful = notifications.filter(n => n.success).length;
    const failed = notifications.filter(n => !n.success).length;

    console.log(`Notified ${successful} HR users about ${submissionType} submission, ${failed} failed`);
    return { 
      success: true, 
      notified: successful, 
      failed,
      details: notifications 
    };

  } catch (err) {
    console.error('Unexpected error notifying HR about separation submission:', err);
    return { success: false, error: err };
  }
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
    message: 'Your separation process has been finalized by HR. Thank you for your service.'
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
    message: `Your account has been terminated. You will have access to your account until ${formattedDate}. After this time, your account will be automatically closed.`
  });
}