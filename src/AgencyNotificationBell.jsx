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
        
        // Count unread notifications
        const unreadCount = allNotifications.filter(n => !n.read).length;
        setUnreadCount(unreadCount);

      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
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
    // Mark all notifications from notifications table as read (not hired notifications)
    const notificationIds = notifications
      .filter(n => n.type !== 'hired' && !n.read)
      .map(n => n.id);
    
    if (notificationIds.length > 0) {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .in('id', notificationIds);
        
        if (error) {
          console.error('Error marking notifications as read:', error);
        }
      } catch (err) {
        console.error('Error updating notifications:', err);
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
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-[#800000] rounded-full min-w-[20px] h-5">
            {unreadCount > 99 ? '99+' : unreadCount}
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
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No recent hires</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.read ? 'bg-red-50' : ''
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
                          <span className="w-2 h-2 bg-[#800000] rounded-full flex-shrink-0"></span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">
                          {formatTimeAgo(notification.created_at)}
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
    </div>
  );
}

export default AgencyNotificationBell;
