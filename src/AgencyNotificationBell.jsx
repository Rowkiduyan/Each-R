// AgencyNotificationBell.jsx - Notification bell component for Agency to see hired employees and interview schedules
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { markNotificationAsRead } from './notifications';
import { useNavigate } from 'react-router-dom';

function AgencyNotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agencyProfileId, setAgencyProfileId] = useState(null);
  const [requirementsNotifications, setRequirementsNotifications] = useState([]);
  const [showDismissalModal, setShowDismissalModal] = useState(false);
  const [dismissalInfo, setDismissalInfo] = useState({ employeeName: '', resignationRequired: false });
  const navigate = useNavigate();

  useEffect(() => {
    let channel;

    const initializeNotifications = async () => {
      try {
        // Get current agency user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get agency profile ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        if (!profile) return;

        setAgencyProfileId(profile.id);
        await fetchNotifications(profile.id);
        await checkEndorsedEmployeesRequirements(profile.id);

        // Set up real-time subscription for hired employees
        channel = supabase
          .channel('agency-notifications')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'employees',
              filter: `endorsed_by_agency_id=eq.${profile.id}`
            },
            (payload) => {
              console.log('New employee hired:', payload);
              if (payload.new) {
                const newNotification = createHiredNotification(payload.new);
                if (newNotification) {
                  setNotifications(prev => [newNotification, ...prev.slice(0, 19)]);
                  setUnreadCount(prev => prev + 1);
                }
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${profile.id}`
            },
            (payload) => {
              console.log('New notification received:', payload);
              if (payload.new) {
                const newNotification = createNotificationFromData(payload.new);
                setNotifications(prev => [newNotification, ...prev.slice(0, 19)]);
                setUnreadCount(prev => prev + 1);
              }
            }
          )
          .subscribe();

      } catch (error) {
        console.error('Error initializing agency notifications:', error);
      }
    };

    const fetchNotifications = async (profileId) => {
      setLoading(true);
      try {
        console.log('🔔 Fetching notifications for agency profile ID:', profileId);
        
        // Fetch from both sources: hired employees and notifications table
        const [hiredResult, notificationsResult] = await Promise.all([
          // Fetch recently hired employees endorsed by this agency
          supabase
            .from('employees')
            .select('id, fname, lname, position, depot, hired_at')
            .eq('endorsed_by_agency_id', profileId)
            .order('hired_at', { ascending: false })
            .limit(10),
          
          // Fetch notifications from notifications table
          supabase
            .from('notifications')
            .select('*')
            .eq('user_id', profileId)
            .order('created_at', { ascending: false })
            .limit(20)
        ]);

        console.log('📬 Notifications fetch result:', {
          notificationsCount: notificationsResult.data?.length || 0,
          notifications: notificationsResult.data,
          error: notificationsResult.error
        });

        const hiredEmployees = hiredResult.data || [];
        const directNotifications = notificationsResult.data || [];

        if (hiredResult.error) {
          console.error('Error fetching hired employees:', hiredResult.error);
        }
        
        if (notificationsResult.error) {
          console.error('Error fetching notifications:', notificationsResult.error);
        }

        // Combine and sort all notifications
        const hiredNotifications = hiredEmployees.map(emp => createHiredNotification(emp));
        const otherNotifications = directNotifications.map(notif => createNotificationFromData(notif));
        
        const allNotifications = [...hiredNotifications, ...otherNotifications]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 20);
        
        setNotifications(allNotifications);
        
        // Count unread notifications (requirements notifications are always shown separately)
        const unreadCount = allNotifications.filter(n => !n.read).length;
        setUnreadCount(unreadCount);

      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    const checkEndorsedEmployeesRequirements = async (profileId) => {
      try {
        // Get all employees endorsed by this agency
        const { data: endorsedEmployees, error: empError } = await supabase
          .from('employees')
          .select('id, email, fname, lname, requirements, position')
          .eq('endorsed_by_agency_id', profileId);

        if (empError) {
          console.error('Error fetching endorsed employees:', empError);
          return;
        }

        if (!endorsedEmployees || endorsedEmployees.length === 0) {
          setRequirementsNotifications([]);
          return;
        }

        const requirementsNotifs = [];

        // Check requirements for each endorsed employee
        for (const employee of endorsedEmployees) {
          const requirements = employee.requirements || {};
          const position = employee.position || '';
          const missingCategories = [];
          const employeeName = `${employee.fname || ''} ${employee.lname || ''}`.trim() || 'Unknown Employee';

          // Government IDs - all must be validated
          const govIds = ['sss', 'tin', 'pagibig', 'philhealth'];
          const idNumbers = requirements.id_numbers || {};
          const allGovIdsValidated = govIds.every(id => 
            idNumbers[id]?.status === 'Validated'
          );
          if (!allGovIdsValidated) {
            missingCategories.push('Government IDs');
          }

          // Driver's License - only required for delivery/driver positions
          const deliveryPositions = ['Delivery Driver', 'Delivery Helper', 'Rider/Messenger'];
          const requiresLicense = deliveryPositions.includes(position);
          
          if (requiresLicense) {
            const license = requirements.license || {};
            if (Object.keys(license).length > 0 && license.status !== 'Validated') {
              missingCategories.push("Driver's License");
            }
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

          // HR Additional Documents - check hr_requests array for pending items
          const hrRequests = requirements.hr_requests || [];
          const hasPendingHRRequests = hrRequests.some(req => req.status === 'pending');
          if (hasPendingHRRequests) {
            missingCategories.push('HR Additional Documents');
          }

          // Create notification if there are missing categories
          if (missingCategories.length > 0) {
            requirementsNotifs.push({
              id: `requirements-${employee.id}`,
              title: `${employeeName} - Incomplete Requirements`,
              message: `${employeeName} is missing: ${missingCategories.join(', ')}`,
              type: 'requirements_reminder',
              read: false,
              created_at: new Date().toISOString(),
              isPersistent: true,
              employeeId: employee.id,
              employeeName: employeeName
            });
          }
        }

        setRequirementsNotifications(requirementsNotifs);
      } catch (error) {
        console.error('Error checking endorsed employees requirements:', error);
      }
    };

    initializeNotifications();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const createHiredNotification = (employee) => {
    const employeeName = `${employee.fname || ''} ${employee.lname || ''}`.trim() || 'Unknown Employee';
    const position = employee.position || 'Unknown Position';
    
    // Check if this hired notification has been read (stored in localStorage)
    const readHiredNotifications = JSON.parse(localStorage.getItem('readHiredNotifications') || '[]');
    const isRead = readHiredNotifications.includes(employee.id);
    
    return {
      id: employee.id,
      title: 'Employee Hired',
      message: `${employeeName} was hired for ${position}`,
      type: 'hired',
      read: isRead,
      created_at: employee.hired_at,
      employee: employee
    };
  };

  const createNotificationFromData = (notification) => {
    return {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      read: notification.read,
      created_at: notification.created_at,
      application_id: notification.application_id
    };
  };

  const handleNotificationClick = async (notification) => {
    // Navigate to requirements page with employee ID for requirements notifications
    if (notification.type === 'requirements_reminder') {
      setIsOpen(false);
      navigate('/agency/requirements', { state: { employeeId: notification.employeeId } });
      return;
    }
    
    // Navigate to separation page for resignation/separation rejected notifications, exit forms, and completion
    if (notification.type === 'resignation_rejected' || 
        notification.type === 'separation_rejected' ||
        notification.type === 'exit_forms_uploaded_agency' ||
        notification.type === 'separation_completed_agency') {
      setIsOpen(false);
      navigate('/agency/separation');
      
      // Mark as read in database
      if (!notification.read) {
        await markNotificationAsRead(notification.id);
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notification.id ? { ...notif, read: true } : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      return;
    }

    // Navigate to evaluation page for evaluation uploaded notifications
    if (notification.type === 'evaluation_uploaded_agency') {
      setIsOpen(false);
      navigate('/agency/evaluation');
      
      // Mark as read in database
      if (!notification.read) {
        await markNotificationAsRead(notification.id);
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notification.id ? { ...notif, read: true } : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      return;
    }

    // Navigate to separation page for dismissed evaluation notifications
    if (notification.type === 'evaluation_dismissed_agency') {
      setIsOpen(false);
      
      // Extract information and show modal
      const resignationRequired = notification.message.includes('required');
      const employeeName = notification.message.split(' has dismissed ')[1]?.split('.')[0] || 'Employee';
      
      setDismissalInfo({ employeeName, resignationRequired });
      setShowDismissalModal(true);
      
      // Mark as read in database
      if (!notification.read) {
        await markNotificationAsRead(notification.id);
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notification.id ? { ...notif, read: true } : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      return;
    }
    
    // Mark as read in database if it's from notifications table
    if (notification.type !== 'hired' && !notification.read) {
      await markNotificationAsRead(notification.id);
    }
    
    // Mark hired notification as read in localStorage
    if (notification.type === 'hired' && !notification.read) {
      const readHiredNotifications = JSON.parse(localStorage.getItem('readHiredNotifications') || '[]');
      if (!readHiredNotifications.includes(notification.id)) {
        readHiredNotifications.push(notification.id);
        localStorage.setItem('readHiredNotifications', JSON.stringify(readHiredNotifications));
      }
    }
    
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notification.id ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    
    // Navigate to endorsements page
    setIsOpen(false);
    navigate('/agency/endorsements');
  };

  const handleMarkAllAsRead = async () => {
    // Mark all notifications from notifications table as read (not hired notifications or requirements reminders)
    const notificationIds = notifications
      .filter(n => 
        n.type !== 'hired' && 
        n.type !== 'requirements_reminder' && 
        !n.read
      )
      .map(n => n.id);
    
    if (notificationIds.length > 0) {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .in('id', notificationIds);
        
        if (error) {
          console.error('Error marking notifications as read:', error);
          return; // Don't update local state if database update failed
        }
      } catch (err) {
        console.error('Error updating notifications:', err);
        return; // Don't update local state if database update failed
      }
    }
    
    // Mark all hired notifications as read in localStorage
    const hiredNotificationIds = notifications
      .filter(n => n.type === 'hired')
      .map(n => n.id);
    
    if (hiredNotificationIds.length > 0) {
      const readHiredNotifications = JSON.parse(localStorage.getItem('readHiredNotifications') || '[]');
      const updatedReadHired = [...new Set([...readHiredNotifications, ...hiredNotificationIds])];
      localStorage.setItem('readHiredNotifications', JSON.stringify(updatedReadHired));
    }
    
    // Update local state
    setUnreadCount(0);
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
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

  return (
    <>
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
        {(unreadCount + requirementsNotifications.length) > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-[#800000] rounded-full min-w-[20px] h-5">
            {(unreadCount + requirementsNotifications.length) > 99 ? '99+' : (unreadCount + requirementsNotifications.length)}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Recent Hires</h3>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="text-sm text-[#800000] hover:underline"
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
            ) : (notifications.length === 0 && requirementsNotifications.length === 0) ? (
              <div className="p-4 text-center text-gray-500">No recent hires</div>
            ) : (
              <>
                {/* Requirements notifications - always show at top */}
                {requirementsNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-4 border-b bg-orange-50 hover:bg-orange-100 cursor-pointer transition-colors border-l-4 border-l-orange-500"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </h4>
                          <span className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">{notification.message}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-orange-600 font-medium">
                            Incomplete Requirements
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Regular notifications */}
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors ${
                      (notification.type === 'resignation_rejected' || notification.type === 'separation_rejected')
                        ? 'bg-red-50 hover:bg-red-100 border-l-4 border-l-red-500' 
                        : !notification.read ? 'bg-red-50' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {(notification.type === 'resignation_rejected' || notification.type === 'separation_rejected') && (
                            <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                          <h4 className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-[#800000] rounded-full flex-shrink-0"></span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          {(notification.type === 'resignation_rejected' || notification.type === 'separation_rejected') && (
                            <span className="text-xs text-red-600 font-medium">
                              Action Required
                            </span>
                          )}
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
                className="text-sm text-[#800000] hover:underline"
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

      {/* Employee Dismissal Modal */}
      {showDismissalModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-200">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-red-600 to-red-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-500/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Employee Dismissed</h3>
                  <p className="text-sm text-red-100 mt-0.5">Action required for separation process</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-medium mb-2">
                  <span className="font-semibold">{dismissalInfo.employeeName}</span> has been dismissed by HR.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      dismissalInfo.resignationRequired ? 'bg-red-500' : 'bg-gray-400'
                    }`}></div>
                    <span className="text-sm text-gray-700">
                      Resignation letter: <span className="font-medium">
                        {dismissalInfo.resignationRequired ? 'Required' : 'Not required'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-600">
                You will be redirected to the separation page to manage the dismissal process for this employee.
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDismissalModal(false)}
                className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDismissalModal(false);
                  navigate('/agency/separation');
                }}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Go to Separation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </>
  );
}

export default AgencyNotificationBell;
