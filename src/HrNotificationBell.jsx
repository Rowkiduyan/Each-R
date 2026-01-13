// HrNotificationBell.jsx - Notification bell component for HR to see new applicants and interview responses
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from './notifications';
import { getStoredJson } from './authStorage';

function HrNotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentHrUser, setCurrentHrUser] = useState(null);

  useEffect(() => {
    let channel;

    const initializeNotifications = async () => {
      try {
        // Get current HR user ID from localStorage
        const hrUser = getStoredJson("loggedInHR");
        if (!hrUser) return;

        setCurrentHrUser(hrUser);
        const currentUserId = hrUser.id;
        
        await fetchNotifications(currentUserId, hrUser);

        // Set up real-time subscription for new applications
        channel = supabase
          .channel('hr-notifications')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'applications'
            },
            (payload) => {
              console.log('New application received:', payload);
              if (payload.new) {
                const newNotification = createApplicationNotification(payload.new, hrUser);
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
              table: 'notifications'
            },
            (payload) => {
              console.log('New notification received:', payload);
              if (payload.new && payload.new.user_id === currentUserId) {
                const newNotification = createNotificationFromData(payload.new);
                setNotifications(prev => [newNotification, ...prev.slice(0, 19)]);
                setUnreadCount(prev => prev + 1);
              }
            }
          )
          .subscribe();

      } catch (error) {
        console.error('Error initializing HR notifications:', error);
      }
    };

    const fetchNotifications = async (userId, hrUser) => {
      setLoading(true);
      try {
        // Fetch both application notifications and direct notifications
        const [applicationNotifications, directNotifications] = await Promise.all([
          fetchApplicationNotifications(hrUser),
          getNotifications(userId, 10)
        ]);

        // Combine and sort notifications
        const allNotifications = [...applicationNotifications, ...directNotifications]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 20);

        setNotifications(allNotifications);
        setUnreadCount(allNotifications.filter(n => !n.read).length);

      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchApplicationNotifications = async (hrUser) => {
      try {
        // Fetch recent applications with job_posts to filter by depot
        const { data: applications, error } = await supabase
          .from('applications')
          .select(`
            id,
            created_at,
            payload,
            user_id,
            job_posts:job_posts(depot)
          `)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) {
          console.error('Error fetching applications:', error);
          return [];
        }

        // Filter by depot if HRC user
        let filtered = applications;
        if (hrUser?.role?.toUpperCase() === 'HRC' && hrUser?.depot) {
          filtered = applications.filter(app => {
            const depot = app.job_posts?.depot;
            return depot === hrUser.depot;
          });
        }

        return filtered.map(app => createApplicationNotification(app, hrUser)).filter(Boolean);
      } catch (error) {
        console.error('Error fetching application notifications:', error);
        return [];
      }
    };

    initializeNotifications();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const createApplicationNotification = (application, hrUser) => {
    let applicantName = 'Unknown Applicant';
    let position = 'Unknown Position';
    let depot = null;
    
    try {
      if (application.payload) {
        const payload = typeof application.payload === 'string' 
          ? JSON.parse(application.payload) 
          : application.payload;
        
        const form = payload.form || {};
        applicantName = `${form.firstName || ''} ${form.lastName || ''}`.trim() || 'Unknown Applicant';
        
        const job = payload.job || {};
        position = job.title || 'Unknown Position';
        depot = job.depot || application.job_posts?.depot;
      }
    } catch (error) {
      console.error('Error parsing application payload:', error);
    }

    // Filter by depot for HRC users
    if (hrUser?.role?.toUpperCase() === 'HRC' && hrUser?.depot && depot !== hrUser.depot) {
      return null;
    }

    return {
      id: application.id,
      title: 'New Application Received',
      message: `${applicantName} applied for ${position}`,
      type: 'application',
      read: false,
      created_at: application.created_at,
      source: 'application'
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
      source: 'notification'
    };
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read when clicked
    if (notification.source === 'notification' && !notification.read) {
      await markNotificationAsRead(notification.id);
    }
    
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notification.id ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    
    // You could also navigate to the specific application here
    // navigate(`/hr/applications/${notification.id}`);
  };

  const handleMarkAllAsRead = async () => {
    // Get current HR user ID
    const hrUser = getStoredJson("loggedInHR");
    if (hrUser) await markAllNotificationsAsRead(hrUser.id);
    
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
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-[20px] h-5">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">New Applications</h3>
              {unreadCount > 0 && (
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
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No new applications</div>
            ) : (
              notifications.map((notification) => (
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
                          notification.type === 'interview_confirmed' ? 'bg-green-100 text-green-800' :
                          notification.type === 'interview_rejected' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {notification.type === 'interview_confirmed' ? 'Interview Confirmed' :
                           notification.type === 'interview_rejected' ? 'Interview Rejected' :
                           'New Application'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
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

export default HrNotificationBell;