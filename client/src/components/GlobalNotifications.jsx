import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';

function GlobalNotifications() {
  const navigate = useNavigate();
  const { getVisibleNotifications, dismissNotification, showNotificationPanel } = useNotifications();
  
  // Get only non-dismissed notifications
  const visibleNotifications = getVisibleNotifications();
  
  // Don't render anything if no notifications or panel is hidden
  if (!showNotificationPanel || visibleNotifications.length === 0) {
    return null;
  }
  
  return (
    <div className="fixed top-4 right-4 max-w-sm z-50">
      {visibleNotifications.map((notification) => (
        <div 
          key={notification._id} 
          className="bg-green-50 border-l-4 border-green-400 p-4 mb-3 shadow-md rounded-md"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-green-800">
                Access Granted!
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>You've been approved to edit "{notification.projectTitle}".</p>
              </div>
              <div className="mt-3">
                <button
                  onClick={() => {
                    navigate('/editor-dashboard');
                  }}
                  className="text-sm font-medium text-green-700 hover:text-green-600"
                >
                  View in dashboard →
                </button>
              </div>
            </div>
            <button 
              onClick={() => dismissNotification(notification._id)}
              className="ml-4 text-gray-400 hover:text-gray-500"
              aria-label="Dismiss notification"
            >
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default GlobalNotifications;