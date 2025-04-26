import React, { createContext, useState, useEffect, useContext } from "react";
const NotificationContext = createContext();
export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [dismissedNotifications, setDismissedNotifications] = useState([]);
  const [showNotificationPanel, setShowNotificationPanel] = useState(true);
  useEffect(() => {
    try {
      const storedNotifications = localStorage.getItem("approvedProjects");
      const storedDismissed = localStorage.getItem("dismissedNotifications");
      if (storedNotifications) {
        setNotifications(JSON.parse(storedNotifications));
      }
      if (storedDismissed) {
        setDismissedNotifications(JSON.parse(storedDismissed));
      }
    } catch (error) {
      console.error("Error loading notifications from storage:", error);
    }
    fetchNotifications();
  }, []);
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const response = await fetch(
        "http://localhost:4000/projectApi/access-requests/editor",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!response.ok) return;
      const data = await response.json();
      if (data.success && Array.isArray(data.accessRequests)) {
        const approvedRequests = data.accessRequests.filter(
          (req) => req.status === "approved",
        );
        if (approvedRequests.length > 0) {
          // Add these to our notifications
          addNotifications(approvedRequests);
        }
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };
  const addNotifications = (newNotifications) => {
    if (!Array.isArray(newNotifications) || newNotifications.length === 0)
      return;
    setNotifications((prevNotifications) => {
      const existingIds = new Set(prevNotifications.map((n) => n._id));
      const mergedNotifications = [
        ...prevNotifications,
        ...newNotifications.filter((n) => !existingIds.has(n._id)),
      ];
      localStorage.setItem(
        "approvedProjects",
        JSON.stringify(mergedNotifications),
      );
      return mergedNotifications;
    });
  };
  const dismissNotification = (notificationId) => {
    setDismissedNotifications((prevDismissed) => {
      const updatedDismissed = [...prevDismissed, notificationId];
      localStorage.setItem(
        "dismissedNotifications",
        JSON.stringify(updatedDismissed),
      );
      return updatedDismissed;
    });
  };
  const getVisibleNotifications = () => {
    return notifications.filter(
      (notification) => !dismissedNotifications.includes(notification._id),
    );
  };
  return (
    <NotificationContext.Provider
      value={{
        notifications,
        dismissedNotifications,
        showNotificationPanel,
        addNotifications,
        dismissNotification,
        getVisibleNotifications,
        setShowNotificationPanel,
        fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
