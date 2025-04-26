import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";

function Header() {
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // Authentication state
  const isAuthenticated = localStorage.getItem("token") !== null;
  const user = isAuthenticated
    ? JSON.parse(localStorage.getItem("user"))
    : null;
  const isCreator = user?.userType === "contentCreator";
  const isEditor = user?.userType === "editor";

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown when navigating
  useEffect(() => {
    setDropdownOpen(false);
  }, [location]);

  // Navigation links based on user type
  const getNavigationLinks = () => {
    const commonLinks = [{ path: "/home", label: "Home" }];

    const creatorLinks = [
      { path: "/creator-projects", label: "Create Project" },
      { path: "/creator-display", label: "Projects" },
      { path: "/creator-assign", label: "Assign Editors" },
    ];

    const editorLinks = [
      { path: "/editor-discover", label: "Discover" },
      { path: "/editor-projects", label: "Assigned Projects" },
    ];

    if (isCreator) {
      return [...commonLinks, ...creatorLinks];
    } else if (isEditor) {
      return [...commonLinks, ...editorLinks];
    }

    return commonLinks;
  };

  const handleLogout = () => {
    // Set a flag in session storage to prevent multiple redirects
    if (sessionStorage.getItem("isLoggingOut")) {
      return; // Prevent duplicate logout attempts
    }
    sessionStorage.setItem("isLoggingOut", "true");

    // Create notification
    const notification = document.createElement("div");
    notification.className =
      "fixed top-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-lg transition-opacity duration-500 z-50";
    notification.innerHTML = `
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm">Successfully logged out</p>
        </div>
      </div>
    `;
    document.body.appendChild(notification);

    // Clear auth data before navigating
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Use setTimeout to ensure auth data is cleared before navigation
    setTimeout(() => {
      // Use window.location for a full page refresh to clear any React Router state
      window.location.href = "/";

      // Remove the logout flag after navigation starts
      sessionStorage.removeItem("isLoggingOut");

      // Handle notification removal
      setTimeout(() => {
        if (document.body.contains(notification)) {
          notification.style.opacity = "0";
          setTimeout(() => {
            if (document.body.contains(notification)) {
              document.body.removeChild(notification);
            }
          }, 500);
        }
      }, 2000);
    }, 50);
  };

  const navigationLinks = getNavigationLinks();

  return (
    <header className="bg-white shadow-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link
              to={isAuthenticated ? "/home" : "/"}
              className="flex items-center space-x-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-blue-600"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              <span className="font-bold text-xl text-gray-900">ZenSync</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center space-x-1">
              <nav className="flex space-x-1">
                {navigationLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      location.pathname === link.path
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          )}

          {/* User Profile & Auth Buttons */}
          <div className="flex items-center">
            {isAuthenticated ? (
              <div className="relative ml-3">
                <div>
                  <button
                    ref={buttonRef}
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center max-w-xs bg-white rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <span className="sr-only">Open user menu</span>
                    <div className="bg-blue-100 text-blue-800 flex items-center justify-center h-8 w-8 rounded-full">
                      {user?.fullName.charAt(0).toUpperCase()}
                    </div>
                    <span className="ml-2 text-sm font-medium text-gray-700 hidden sm:block">
                      {user?.fullName.split(" ")[0]}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`ml-1 h-4 w-4 text-gray-500 transition-transform duration-200 ${dropdownOpen ? "transform rotate-180" : ""}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>

                {/* User Menu Dropdown */}
                {dropdownOpen && (
                  <div
                    ref={dropdownRef}
                    className="origin-top-right absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100"
                  >
                    <div className="px-4 py-3">
                      <p className="text-sm text-gray-900">Signed in as</p>
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {user?.email}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {isCreator
                          ? "Content Creator"
                          : isEditor
                            ? "Editor"
                            : "User"}
                      </p>
                    </div>

                    {/* Quick Navigation Links */}
                    <div className="py-1">
                      {isCreator && (
                        <>
                          <Link
                            to="/creator-projects"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 mr-3 text-gray-500"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                            </svg>
                            My Projects
                          </Link>
                          <Link
                            to="/creator-assign"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 mr-3 text-gray-500"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                            </svg>
                            Assign Editors
                          </Link>
                        </>
                      )}

                      {isEditor && (
                        <>
                          <Link
                            to="/editor-discover"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 mr-3 text-gray-500"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M9 9a2 2 0 114 0 2 2 0 01-4 0z" />
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a4 4 0 00-3.446 6.032l-2.261 2.26a1 1 0 101.414 1.415l2.261-2.261A4 4 0 1011 5z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Discover Projects
                          </Link>
                          <Link
                            to="/editor-projects"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 mr-3 text-gray-500"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z"
                                clipRule="evenodd"
                              />
                              <path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V7z" />
                            </svg>
                            My Assignments
                          </Link>
                        </>
                      )}

                      <Link
                        to="/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 mr-3 text-gray-500"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Your Profile
                      </Link>
                    </div>

                    {/* Sign Out */}
                    <div className="py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-red-600 group"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 mr-3 text-gray-500 group-hover:text-red-500"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M3 3a1 1 0 00-1 1v12a1 1 0 002 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex space-x-2">
                <Link
                  to="/signin"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isAuthenticated && (
        <div className="block md:hidden border-t border-gray-200">
          <div className="pt-2 pb-3 space-y-1">
            {navigationLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`block px-3 py-2 text-base font-medium ${
                  location.pathname === link.path
                    ? "bg-blue-50 text-blue-700 border-l-4 border-blue-500"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
