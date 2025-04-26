import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function CreatorAssign() {
  const [accessRequests, setAccessRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const navigate = useNavigate();

  // Check if user is logged in and is a creator
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    // Redirect if not logged in or not a creator
    if (!user || user.userType !== "contentCreator") {
      navigate("/signin");
      return;
    }

    fetchAccessRequests();
  }, [navigate]);

  // Format date for display
  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Format time ago for display
  const formatTimeAgo = (dateString) => {
    if (!dateString) return "Unknown date";

    try {
      const created = new Date(dateString);
      if (isNaN(created.getTime())) return "Invalid date";

      const now = new Date();
      const diffTime = now - created;
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffMinutes < 1) return "Just now";
      if (diffMinutes < 60)
        return `${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"} ago`;
      if (diffHours < 24)
        return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
      if (diffDays < 30)
        return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;

      return `on ${formatDate(dateString)}`;
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Unknown date";
    }
  };

  // Fetch access requests for this creator
  const fetchAccessRequests = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:4000/projectApi/access-requests/creator",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch access requests");
      }

      const data = await response.json();

      // Ensure we're handling the data structure correctly
      if (data.success && Array.isArray(data.accessRequests)) {
        // Filter for only pending requests to ensure we're showing the right state
        const pendingRequests = data.accessRequests.filter(
          (req) => req.status === "pending",
        );
        setAccessRequests(pendingRequests);
      } else {
        setAccessRequests([]);
      }
    } catch (error) {
      console.error("Error fetching access requests:", error);
      setError("Failed to load access requests. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  // Accept an editor's request
  const handleAcceptRequest = async (requestId) => {
    setProcessingId(requestId);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:4000/projectApi/access-requests/${requestId}/approve`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to approve request");
      }

      setStatusMessage({
        type: "success",
        text: "Editor has been assigned to the project successfully!",
      });

      // Update the local state to reflect the change
      setAccessRequests((prev) =>
        prev.map((req) =>
          req._id === requestId ? { ...req, status: "approved" } : req,
        ),
      );

      // After a brief delay, remove the approved request from the list
      setTimeout(() => {
        setAccessRequests((prev) =>
          prev.filter((req) => req._id !== requestId),
        );

        // Clear status message after some time
        setTimeout(() => {
          setStatusMessage(null);
        }, 3000);
      }, 1500);
    } catch (error) {
      console.error("Error approving request:", error);
      setStatusMessage({
        type: "error",
        text: error.message || "Failed to approve request. Please try again.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Reject an editor's request
  const handleRejectRequest = async (requestId) => {
    setProcessingId(requestId);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:4000/projectApi/access-requests/${requestId}/reject`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to reject request");
      }

      setStatusMessage({
        type: "success",
        text: "Editor request has been rejected.",
      });

      // Update the local state to reflect the change
      setAccessRequests((prev) =>
        prev.map((req) =>
          req._id === requestId ? { ...req, status: "rejected" } : req,
        ),
      );

      // After a brief delay, remove the rejected request from the list
      setTimeout(() => {
        setAccessRequests((prev) =>
          prev.filter((req) => req._id !== requestId),
        );

        // Clear status message after some time
        setTimeout(() => {
          setStatusMessage(null);
        }, 3000);
      }, 1500);
    } catch (error) {
      console.error("Error rejecting request:", error);
      setStatusMessage({
        type: "error",
        text: error.message || "Failed to reject request. Please try again.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  // // View editor profile or details
  // const handleViewEditorProfile = (editorEmail) => {
  //   // You could navigate to a profile page or show a modal with editor details
  //   console.log("View editor profile:", editorEmail);
  // };

  // Show project details modal
  const handleViewProjectDetails = (request) => {
    setSelectedRequest(request);
  };

  // Close project details modal
  const closeProjectDetails = () => {
    setSelectedRequest(null);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            <p className="text-gray-500 text-lg">Loading access requests...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Status messages */}
      {statusMessage && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-3 rounded shadow-lg z-50 flex items-center ${
            statusMessage.type === "success"
              ? "bg-green-100 border border-green-400 text-green-700"
              : "bg-red-100 border border-red-400 text-red-700"
          }`}
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            {statusMessage.type === "success" ? (
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            ) : (
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            )}
          </svg>
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Header section */}
      <div className="bg-white rounded-lg shadow-lg mb-8 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 px-6 py-5">
          <div className="flex flex-col md:flex-row justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Editor Requests</h1>
              <p className="mt-1 text-purple-100">
                Manage editor requests for your projects
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-gray-600">
            Review requests from editors who want to work on your projects.
            Approve requests to assign the project to the editor, or reject
            requests if you prefer to find another editor.
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow">
          <p className="font-medium">Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Access requests list */}
      {accessRequests.length > 0 ? (
        <div className="space-y-6 mb-12">
          {accessRequests.map((request) => (
            <div
              key={request._id}
              className={`bg-white rounded-lg shadow-md overflow-hidden border ${
                request.status === "pending"
                  ? "border-yellow-200"
                  : request.status === "approved"
                    ? "border-green-200"
                    : "border-gray-200"
              }`}
            >
              <div className="flex flex-col md:flex-row">
                {/* Add thumbnail preview */}
                <div className="w-full md:w-1/4 h-32 md:h-auto bg-gray-100">
                  {request.projectThumbnail ? (
                    <img
                      src={request.projectThumbnail}
                      alt={request.projectTitle}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="p-6 w-full md:w-3/4">
                  <div className="flex flex-col md:flex-row justify-between">
                    <div className="mb-4 md:mb-0">
                      <h2 className="text-xl font-semibold text-gray-900">
                        {request.projectTitle}
                      </h2>
                      <p className="text-sm text-gray-500 mb-2">
                        Request received {formatTimeAgo(request.createdAt)}
                      </p>

                      <div className="flex items-center mb-4">
                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-medium text-lg">
                          {request.editorName
                            ? request.editorName.charAt(0).toUpperCase()
                            : "E"}
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-gray-900">
                            {request.editorName ||
                              request.editorEmail.split("@")[0]}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {request.editorEmail}
                          </p>
                        </div>
                      </div>

                      {request.message && (
                        <div className="bg-gray-50 p-3 rounded-md text-gray-700 text-sm">
                          <p className="font-medium mb-1">
                            Message from editor:
                          </p>
                          <p>{request.message}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col space-y-1 sm:space-y-0 sm:flex-row sm:space-x-1">
                      <button
                        onClick={() => handleViewProjectDetails(request)}
                        className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 mr-2"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path
                            fillRule="evenodd"
                            d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        View Project
                      </button>

                      {/* <button
                        onClick={() =>
                          handleViewEditorProfile(request.editorEmail)
                        }
                        className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 mr-2"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z"
                            clipRule="evenodd"
                          />
                        </svg>
                        View Editor
                      </button> */}
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => handleRejectRequest(request._id)}
                    disabled={processingId === request._id}
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md ${
                      processingId === request._id
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    }`}
                  >
                    {processingId === request._id ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 mr-2"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Decline Request
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleAcceptRequest(request._id)}
                    disabled={processingId === request._id}
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md ${
                      processingId === request._id
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    }`}
                  >
                    {processingId === request._id ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 mr-2"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Assign Editor
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 flex flex-col items-center justify-center text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No pending requests
          </h3>
          <p className="text-gray-500 mb-6">
            You don't have any editor requests at the moment. When editors
            request access to your projects, they'll appear here.
          </p>
        </div>
      )}

      {/* Project details modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="relative">
              <div className="h-48 sm:h-64 bg-gray-200 relative">
                {selectedRequest.projectThumbnail ? (
                  <img
                    src={selectedRequest.projectThumbnail}
                    alt={selectedRequest.projectTitle}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-16 w-16 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20 flex flex-col justify-end p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-1">
                        {selectedRequest.projectTitle}
                      </h2>
                    </div>
                    <span className="px-3 py-1 rounded-md text-sm font-medium bg-yellow-100 text-yellow-800">
                      Pending Assignment
                    </span>
                  </div>
                </div>

                <button
                  onClick={closeProjectDetails}
                  className="absolute top-4 right-4 bg-black/30 hover:bg-black/50 text-white rounded-full p-2 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Editor Request
                  </h3>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-start mb-4">
                      <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-medium text-lg mr-3">
                        {selectedRequest.editorName
                          ? selectedRequest.editorName.charAt(0).toUpperCase()
                          : "E"}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {selectedRequest.editorName || "Unknown Editor"}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {selectedRequest.editorEmail}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Requested {formatTimeAgo(selectedRequest.createdAt)}
                        </p>
                      </div>
                    </div>

                    {selectedRequest.message && (
                      <div className="bg-white p-3 rounded-md border border-purple-100">
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Message:
                        </p>
                        <p className="text-gray-700">
                          {selectedRequest.message}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-wrap justify-end gap-3">
                <button
                  onClick={closeProjectDetails}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>

                <button
                  onClick={() => {
                    handleRejectRequest(selectedRequest._id);
                    closeProjectDetails();
                  }}
                  disabled={processingId === selectedRequest._id}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="-ml-1 mr-2 h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Decline Request
                </button>

                <button
                  onClick={() => {
                    handleAcceptRequest(selectedRequest._id);
                    closeProjectDetails();
                  }}
                  disabled={processingId === selectedRequest._id}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="-ml-1 mr-2 h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Assign Editor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreatorAssign;
