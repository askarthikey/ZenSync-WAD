import React from "react";
import GlobalNotifications from "./GlobalNotifications";
function RootLayout({ children }) {
  return (
    <>
      <GlobalNotifications />
      {children}
    </>
  );
}
export default RootLayout;
