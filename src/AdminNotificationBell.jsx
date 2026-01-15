// AdminNotificationBell.jsx - Notification bell component for Admin
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from './notifications';
import { getStoredJson } from './authStorage';

function AdminNotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentAdminUser, setCurrentAdminUser] = useState(null);

  useEffect(() => {
    let channel;

    const initializeNotifications = async () => {
      try {
        // Get current Admin user ID from localStorage
        const adminUser = getStoredJson("loggedInHR");
        if (!adminUser) return;

        setCurrentAdminUser(adminUser);
        const currentUserId = adminUser.id;
        
        await fetchNotifications(currentUserId);

        // Set up real-time subscription for notifications
        channel = supabase
          .channel('admin-notifications')
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
        console.error('Error initializing Admin notifications:', error);
      }
    };

    const fetchNotifications = async (userId) => {
      setLoading(true);
      try {
        const directNotifications = await getNotifications(userId, 20);
        
        setNotifications(directNotifications);
        setUnreadCount(directNotifications.filter(n => !n.read).length);

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
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
    }
    
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notification.id ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = async () => {
    // Get current Admin user ID
    const adminUser = getStoredJson("loggedInHR");
    if (!adminUser) return;

    // Mark all unread notifications in the database
    const notificationIds = notifications
      .filter(n => !n.read)
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
              <h3 className="font-semibold text-gray-900">Notifications</h3>
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
              <div className="p-4 text-center text-gray-500">No notifications</div>
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
                          notification.type === 'success' ? 'bg-green-100 text-green-800' :
                          notification.type === 'error' ? 'bg-red-100 text-red-800' :
                          notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {notification.type || 'info'}
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

export default AdminNotificationBell;
