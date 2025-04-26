import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
} from "react-router-dom";
import Header from "./components/Header";
import StartPage from "./components/StartPage";
import Signup from "./components/Signup";
import Signin from "./components/Signin";
import CreatorHome from "./components/Creator-Home";
import CreatorProjects from "./components/CreatorProjects";
import CreatorProjectDisplay from "./components/CreatorProjectDisplay";
import CreatorAssign from "./components/CreatorAssign";
import EditorHome from "./components/Editor-Home";
import EditorProjectsDisplay from "./components/EditorProjectsDisplay";
import EditorDiscover from "./components/EditorDiscover";
import UserProfile from "./components/UserProfile";
import RootLayout from "./components/RootLayout";
import { NotificationProvider } from "./context/NotificationContext";
const isAuthenticated = () => {
  return localStorage.getItem("token") !== null;
};
const getUserType = () => {
  if (!isAuthenticated()) return null;
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    return user?.userType;
  } catch (error) {
    console.error("Error parsing user data:", error);
    return null;
  }
};
const HomeRouter = () => {
  const userType = getUserType();
  if (userType === "contentCreator") {
    return <CreatorHome />;
  } else if (userType === "editor") {
    return <EditorHome />;
  }
  return <CreatorHome />;
};

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  const [isChecking, setIsChecking] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 10);
    return () => clearTimeout(timer);
  }, []);
  if (isChecking) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }
  if (token) {
    return children;
  }
  return <Navigate to="/signin" replace />;
};
const Dashboard = () => (
  <div className="max-w-7xl mx-auto py-16 px-4">
    <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
    <p className="mt-4 text-gray-600">
      Welcome, {JSON.parse(localStorage.getItem("user")).fullName}!
    </p>
    <div className="mt-6 p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold text-gray-700">Your Profile</h2>
      <div className="mt-4 space-y-2">
        <p>
          <span className="font-medium">Username:</span>{" "}
          {JSON.parse(localStorage.getItem("user")).username}
        </p>
        <p>
          <span className="font-medium">Email:</span>{" "}
          {JSON.parse(localStorage.getItem("user")).email}
        </p>
        <p>
          <span className="font-medium">User Type:</span>{" "}
          {JSON.parse(localStorage.getItem("user")).userType}
        </p>
      </div>
    </div>
  </div>
);
const NotFound = () => (
  <div className="flex flex-col items-center justify-center min-h-[70vh]">
    <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
    <p className="text-xl text-gray-600 mb-6">Page not found</p>
    <Link
      to="/"
      className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
    >
      Go Home
    </Link>
  </div>
);
function App() {
  return (
    <NotificationProvider>
      <Router>
        <RootLayout>
          <Header />
          <Routes>
            <Route
              path="/"
              element={
                isAuthenticated() ? <Navigate to="/home" /> : <StartPage />
              }
            />
            <Route
              path="/signup"
              element={
                !isAuthenticated() ? <Signup /> : <Navigate to="/home" />
              }
            />
            <Route
              path="/signin"
              element={
                !isAuthenticated() ? <Signin /> : <Navigate to="/home" />
              }
            />
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <HomeRouter />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/profile" element={<UserProfile />} />
            <Route
              path="/creator-projects"
              element={
                <ProtectedRoute>
                  <CreatorProjects />
                </ProtectedRoute>
              }
            />
            <Route
              path="/creator-display"
              element={
                <ProtectedRoute>
                  <CreatorProjectDisplay />
                </ProtectedRoute>
              }
            />
            <Route
              path="/creator-assign"
              element={
                <ProtectedRoute>
                  <CreatorAssign />
                </ProtectedRoute>
              }
            />
            <Route
              path="/editor-projects"
              element={
                <ProtectedRoute>
                  <EditorProjectsDisplay />
                </ProtectedRoute>
              }
            />
            <Route
              path="/editor-discover"
              element={
                <ProtectedRoute>
                  <EditorDiscover />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </RootLayout>
      </Router>
    </NotificationProvider>
  );
}

export default App;
