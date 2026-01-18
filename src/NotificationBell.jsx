// NotificationBell.jsx - Notification bell component for navbar
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  getNotifications, 
  getUnreadNotificationsCount, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  createNotification 
} from './notifications';

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isEmployee, setIsEmployee] = useState(false);
  const [requirementsNotification, setRequirementsNotification] = useState(null);

  useEffect(() => {
    let channel;

    const initializeNotifications = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check if user is an employee and get their employee ID
        let notificationUserId = user.id; // Default to auth ID
        let employee = null;
        let empByEmail = null;
        
        // Try to get employee ID from employees table
        const { data: empData1, error: empError } = await supabase
          .from('employees')
          .select('id, email')
          .eq('id', user.id)
          .maybeSingle();
        
        employee = empData1;
        
        // If not found by auth id, try by email
        if (!employee && !empError) {
          const { data: empData2 } = await supabase
            .from('employees')
            .select('id, email')
            .eq('email', user.email)
            .maybeSingle();
          
          empByEmail = empData2;
          
          if (empByEmail) {
            notificationUserId = empByEmail.id;
          }
        } else if (employee) {
          notificationUserId = employee.id;
        }

        setUserId(notificationUserId);
        setIsEmployee(!!employee || !!empByEmail);
        await fetchNotifications(notificationUserId);
        await fetchUnreadCount(notificationUserId);
        
        // Check requirements for employees - use employee email from table
        if (employee || empByEmail) {
          const employeeData = employee || empByEmail;
          
          if (employeeData?.email) {
            console.log('Checking requirements for employee:', employeeData.email);
            await checkEmployeeRequirements(employeeData.email);
            await checkEvaluationDueDate(notificationUserId);
          }
        }

        // Set up real-time subscription for notifications
        channel = supabase
          .channel(`notifications-${notificationUserId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${notificationUserId}`
            },
            (payload) => {
              console.log('New notification received:', payload);
              if (payload.new) {
                setNotifications(prev => [payload.new, ...prev]);
                setUnreadCount(prev => prev + 1);
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${notificationUserId}`
            },
            (payload) => {
              console.log('Notification updated:', payload);
              if (payload.new) {
                setNotifications(prev => 
                  prev.map(notif => 
                    notif.id === payload.new.id ? payload.new : notif
                  )
                );
                // Recalculate unread count
                fetchUnreadCount(notificationUserId);
              }
            }
          )
          .subscribe();

      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };

    const fetchNotifications = async (userId) => {
      setLoading(true);
      try {
        const notifs = await getNotifications(userId);
        setNotifications(notifs);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchUnreadCount = async (userId) => {
      try {
        const count = await getUnreadNotificationsCount(userId);
        setUnreadCount(count);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    const checkEmployeeRequirements = async (employeeEmail) => {
      try {
        console.log('Checking requirements for:', employeeEmail);
        
        // Query the employees table for the requirements JSONB column
        const { data: employee, error } = await supabase
          .from('employees')
          .select('requirements')
          .eq('email', employeeEmail)
          .maybeSingle();

        if (error) {
          console.error('Error fetching requirements:', error);
          return;
        }

        console.log('Requirements data:', employee?.requirements);

        const requirements = employee?.requirements || {};

        // Check for missing or unvalidated requirements
        const missingCategories = [];

        // Government IDs - all must be validated
        const govIds = ['sss', 'tin', 'pagibig', 'philhealth'];
        const idNumbers = requirements.id_numbers || {};
        const allGovIdsValidated = govIds.every(id => 
          idNumbers[id]?.status === 'Validated'
        );
        if (!allGovIdsValidated) {
          missingCategories.push('Government IDs');
        }

        // Driver's License - check if required and validated
        const license = requirements.license || {};
        const hasLicense = license.status === 'Validated' || Object.keys(license).length === 0;
        // Only add to missing if license object exists but not validated
        if (Object.keys(license).length > 0 && license.status !== 'Validated') {
          missingCategories.push("Driver's License");
        }

        // Medical Examination - all must be validated
        const medicalExams = requirements.medicalExams || {};
        const medicalTests = ['xray', 'stool', 'urine', 'hepa', 'cbc', 'drug_test'];
        const allMedicalValidated = medicalTests.every(test =>
          medicalExams[test]?.status === 'Validated' || medicalExams[test]?.status === 'approved'
        );
        if (!allMedicalValidated) {
          missingCategories.push('Medical Examination');
        }

        // Personal Documents - all must be validated
        const personalDocs = requirements.personalDocuments || {};
        const personalDocTypes = ['photo_2x2', 'psa_birth_certificate', 'residence_sketch'];
        const allPersonalDocsValidated = personalDocTypes.every(doc =>
          personalDocs[doc]?.status === 'Validated' || personalDocs[doc]?.status === 'approved'
        );
        if (!allPersonalDocsValidated) {
          missingCategories.push('Personal Documents');
        }

        // Clearances - all must be validated
        const clearances = requirements.clearances || {};
        const clearanceTypes = ['nbi', 'police', 'barangay'];
        const allClearancesValidated = clearanceTypes.every(clearance =>
          clearances[clearance]?.status === 'Validated' || clearances[clearance]?.status === 'approved'
        );
        if (!allClearancesValidated) {
          missingCategories.push('Clearances');
        }

        // Educational Documents - all must be validated
        const eduDocs = requirements.educationalDocuments || {};
        const eduDocTypes = ['diploma', 'transcript_of_records'];
        const allEduDocsValidated = eduDocTypes.every(doc =>
          eduDocs[doc]?.status === 'Validated' || eduDocs[doc]?.status === 'approved'
        );
        if (!allEduDocsValidated) {
          missingCategories.push('Educational Documents');
        }

        // HR Additional Documents - check hr_requests array for pending items
        const hrRequests = requirements.hr_requests || [];
        const hasPendingHRRequests = hrRequests.some(req => req.status === 'pending');
        if (hasPendingHRRequests) {
          missingCategories.push('HR Additional Documents');
        }

        console.log('Missing categories:', missingCategories);

        // Create persistent notification if there are missing categories
        if (missingCategories.length > 0) {
          const notification = {
            id: 'requirements-reminder',
            title: 'Incomplete Requirements',
            message: `Please complete and submit: ${missingCategories.join(', ')}. Visit the Requirements page to upload.`,
            type: 'requirements_reminder',
            read: false,
            created_at: new Date().toISOString(),
            isPersistent: true
          };
          console.log('Setting requirements notification:', notification);
          setRequirementsNotification(notification);
        } else {
          console.log('All requirements validated');
          setRequirementsNotification(null);
        }
      } catch (error) {
        console.error('Error checking requirements:', error);
      }
    };

    const checkEvaluationDueDate = async (employeeId) => {
      try {
        console.log('Checking evaluation due date for employee:', employeeId);
        
        // Get the most recent evaluation with next_due date
        const { data: evaluations, error } = await supabase
          .from('evaluations')
          .select('next_due, date_evaluated')
          .eq('employee_id', employeeId)
          .order('date_evaluated', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error fetching evaluation:', error);
          return;
        }

        if (!evaluations || evaluations.length === 0 || !evaluations[0].next_due) {
          console.log('No evaluation with next_due date found');
          return;
        }

        const nextDue = new Date(evaluations[0].next_due);
        nextDue.setHours(0, 0, 0, 0);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const diffTime = nextDue - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        console.log('Next due date:', nextDue, 'Days until due:', diffDays);

        // Check if notification already exists for today
        const notificationKey = `eval_due_${employeeId}_${today.toISOString().split('T')[0]}`;
        const existingNotification = localStorage.getItem(notificationKey);

        // Only create notification if due today or in 3 days, and not already notified today
        if ((diffDays === 0 || diffDays === 3) && !existingNotification) {
          const message = diffDays === 0 
            ? 'Your evaluation is due today! Please contact HR.' 
            : 'Your evaluation is due in 3 days. Please prepare accordingly.';
          
          await createNotification({
            userId: employeeId,
            type: 'evaluation_reminder',
            title: diffDays === 0 ? 'Evaluation Due Today' : 'Evaluation Due Soon',
            message: message,
            userType: 'employee'
          });

          // Mark that we've sent notification for today
          localStorage.setItem(notificationKey, 'true');
          
          // Refresh notifications to show the new one
          await fetchNotifications(employeeId);
          await fetchUnreadCount(employeeId);
        }
      } catch (error) {
        console.error('Error checking evaluation due date:', error);
      }
    };

    initializeNotifications();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userId) return;
    
    // Use the utility function to mark all as read
    const success = await markAllNotificationsAsRead(userId);
    
    if (success) {
      // Update local state
      setUnreadCount(0);
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
    } else {
      console.error('Failed to mark all notifications as read');
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
  };

  // Calculate total unread count including requirements notification
  const totalUnreadCount = unreadCount + (requirementsNotification ? 1 : 0);

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        type="button"
        className="relative p-2 rounded-full text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="currentColor" 
          className="w-6 h-6"
        >
          <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.243.75.75 0 01-.298-1.206A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 104.496 0 25.057 25.057 0 01-4.496 0z" clipRule="evenodd" />
        </svg>
        
        {/* Unread count badge */}
        {totalUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-[20px] h-5">
            {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              {totalUnreadCount > 0 && (
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:underline"
                  onClick={handleMarkAllAsRead}
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : (notifications.length === 0 && !requirementsNotification) ? (
              <div className="p-4 text-center text-gray-500">No notifications yet</div>
            ) : (
              <>
                {/* Requirements notification (persistent for employees) */}
                {requirementsNotification && (
                  <div
                    key={requirementsNotification.id}
                    className="p-4 border-b bg-orange-50 sticky top-0 z-10"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-orange-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <h4 className="text-sm font-semibold text-orange-900">
                            {requirementsNotification.title}
                          </h4>
                        </div>
                        <p className="text-sm text-orange-800 mt-1">{requirementsNotification.message}</p>
                        <div className="flex items-center justify-between mt-2">
                          <a 
                            href="/employee/requirements" 
                            className="text-xs text-orange-600 hover:text-orange-800 font-medium hover:underline"
                            onClick={() => setIsOpen(false)}
                          >
                            Go to Requirements →
                          </a>
                          <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-800 font-medium">
                            Action Required
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Regular notifications */}
                {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">
                          {formatTimeAgo(notification.created_at)}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          notification.type === 'interview_scheduled' || notification.type === 'interview_rescheduled' 
                            ? 'bg-blue-100 text-blue-800' 
                            : notification.type === 'status_update'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {notification.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              </>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 text-center border-t">
              <button
                type="button"
                className="text-sm text-blue-600 hover:underline"
                onClick={() => setIsOpen(false)}
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

export default NotificationBell;