import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
function UserProfile() {
  const [user, setUser] = useState(null);
  const [createdProjects, setCreatedProjects] = useState([]);
  const [editedProjects, setEditedProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("created");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    fullName: "",
    email: "",
    bio: "",
    location: "",
    skills: [],
    profileImage: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updateMessage, setUpdateMessage] = useState(null);
  const [newSkill, setNewSkill] = useState("");
  const fileInputRef = useRef(null);
  const { username } = useParams();
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user"));
  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  useEffect(() => {
    if (!currentUser) {
      navigate("/signin");
      return;
    }
    fetchUserData();
  }, [username, navigate]);
  const fetchUserData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const profileResponse = await fetch(
        `http://localhost:4000/userApi/user/${username || currentUser.username}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!profileResponse.ok) {
        throw new Error("Failed to fetch user data");
      }
      const userData = await profileResponse.json();
      setUser(userData.user);
      const createdProjectsResponse = await fetch(
        `http://localhost:4000/projectApi/projects/creator/${userData.user.username}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (createdProjectsResponse.ok) {
        const createdProjectsData = await createdProjectsResponse.json();
        setCreatedProjects(createdProjectsData.projects || []);
      }
      const editedProjectsResponse = await fetch(
        `http://localhost:4000/projectApi/projects/editor/${userData.user.email}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (editedProjectsResponse.ok) {
        const editedProjectsData = await editedProjectsResponse.json();
        setEditedProjects(editedProjectsData.projects || []);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setError("Failed to load user profile. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: value,
    });
  };
  const openEditModal = () => {
    setEditFormData({
      fullName: user.fullName || "",
      email: user.email || "",
      bio: user.bio || "",
      location: user.location || "",
      skills: user.skills || [],
      profileImage: user.profileImage || "",
    });
    setIsEditModalOpen(true);
  };
  const handleAddSkill = () => {
    if (newSkill.trim() && !editFormData.skills.includes(newSkill.trim())) {
      setEditFormData({
        ...editFormData,
        skills: [...editFormData.skills, newSkill.trim()],
      });
      setNewSkill("");
    }
  };
  const handleRemoveSkill = (skillToRemove) => {
    setEditFormData({
      ...editFormData,
      skills: editFormData.skills.filter((skill) => skill !== skillToRemove),
    });
  };
  const compressImage = (imageDataURL, maxWidth = 300) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = imageDataURL;
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
    });
  };
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressedImage = await compressImage(reader.result);

          setEditFormData({
            ...editFormData,
            profileImage: compressedImage,
          });
        } catch (error) {
          console.error("Error compressing image:", error);
          setUpdateMessage({
            type: "error",
            text: "Could not process the image. Please try a smaller image.",
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };
  const handleSubmitProfile = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setUpdateMessage(null);
    try {
      const token = localStorage.getItem("token");
      const dataToSubmit = { ...editFormData };
      const response = await fetch(
        `http://localhost:4000/userApi/user/${user.username}/update`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(dataToSubmit),
        },
      );
      const data = await response.json();
      if (response.ok) {
        setUpdateMessage({
          type: "success",
          text: "Profile updated successfully!",
        });
        const updatedUser = {
          ...user,
          ...editFormData,
        };
        setUser(updatedUser);
        if (currentUser.username === user.username) {
          const localStorageUser = {
            ...currentUser,
            fullName: editFormData.fullName,
            bio: editFormData.bio,
            location: editFormData.location,
            skills: editFormData.skills,
            profileImage: editFormData.profileImage,
          };
          try {
            localStorage.setItem("user", JSON.stringify(localStorageUser));
          } catch (storageError) {
            console.error("LocalStorage quota exceeded:", storageError);
            localStorageUser.profileImage = null;
            localStorageUser.hasProfileImage = true;
            localStorage.setItem("user", JSON.stringify(localStorageUser));
          }
        }
        setTimeout(() => {
          fetchUserData();
        }, 500);

        // Close the modal after a delay
        setTimeout(() => {
          setIsEditModalOpen(false);
          setUpdateMessage(null);
        }, 2000);
      } else {
        setUpdateMessage({
          type: "error",
          text: data.message || "Failed to update profile. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setUpdateMessage({
        type: "error",
        text: "An error occurred. Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const stats = {
    createdCount: createdProjects.length,
    editedCount: editedProjects.length,
    createdAssigned: createdProjects.filter(
      (p) => p.editorEmail && p.editorEmail.trim() !== "",
    ).length,
    createdCompleted: createdProjects.filter(
      (p) => p.status === "Completed" || p.status === "Closed",
    ).length,
    createdPending: createdProjects.filter(
      (p) =>
        p.editorEmail &&
        p.editorEmail.trim() !== "" &&
        p.status !== "Completed" &&
        p.status !== "Closed",
    ).length,
    editedCompleted: editedProjects.filter(
      (p) => p.status === "Completed" || p.status === "Closed",
    ).length,
    editedInProgress: editedProjects.filter(
      (p) =>
        p.status !== "Completed" &&
        p.status !== "Closed" &&
        (p.status === "In Progress" ||
          p.status.includes("Just started") ||
          p.status.includes("Good progress") ||
          p.status.includes("Almost there")),
    ).length,
    editedInReview: editedProjects.filter(
      (p) => p.status === "Completed" && !p.status.includes("Closed"),
    ).length,
    totalCompletedUnique: [...createdProjects, ...editedProjects]
      .filter((p) => p.status === "Completed" || p.status === "Closed")
      .filter(
        (project, index, self) =>
          index === self.findIndex((p) => p._id === project._id),
      ).length,
    daysAsMember: user?.createdAt
      ? Math.ceil(
          (new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24),
        )
      : 0,
  };

  const renderCreatedProjects = () => {
    if (createdProjects.length > 0) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {createdProjects.map((project) => (
            <div
              key={project._id}
              className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
            >
              <div className="h-36 bg-gray-200">
                {project.thumbnailUrl ? (
                  <img
                    src={project.thumbnailUrl}
                    alt={project.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
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
              <div className="p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  {project.title}
                </h3>
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                  {project.description}
                </p>
                <div className="flex justify-between items-center">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      project.status === "Assigned"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {project.status || "Unassigned"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {project.createdAt
                      ? formatDate(project.createdAt)
                      : "No date"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    } else {
      return (
        <div className="text-center py-10">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No projects created
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {currentUser.username === user.username
              ? "You haven't created any projects yet."
              : "This user hasn't created any projects yet."}
          </p>
          {currentUser.username === user.username &&
            user.userType === "contentCreator" && (
              <div className="mt-6">
                <button
                  onClick={() => navigate("/creator-projects")}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <svg
                    className="-ml-1 mr-2 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Create a Project
                </button>
              </div>
            )}
        </div>
      );
    }
  };

  const renderEditedProjects = () => {
    if (editedProjects.length > 0) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {editedProjects.map((project) => (
            <div
              key={project._id}
              className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
            >
              <div className="h-36 bg-gray-200">
                {project.thumbnailUrl ? (
                  <img
                    src={project.thumbnailUrl}
                    alt={project.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
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
              <div className="p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  {project.title}
                </h3>
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                  {project.description}
                </p>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs text-gray-500">Created by: </span>
                    <span className="text-xs font-medium text-gray-900">
                      {project.userCreated || "Unknown"}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {project.assignedAt
                      ? formatDate(project.assignedAt)
                      : "No date"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    } else {
      return (
        <div className="text-center py-10">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No projects edited
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {currentUser.username === user.username
              ? "You haven't edited any projects yet."
              : "This user hasn't edited any projects yet."}
          </p>
          {currentUser.username === user.username &&
            user.userType === "editor" && (
              <div className="mt-6">
                <button
                  onClick={() => navigate("/editor-discover")}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <svg
                    className="-ml-1 mr-2 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
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
                  Discover Projects
                </button>
              </div>
            )}
        </div>
      );
    }
  };
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            <p className="text-gray-500 text-lg">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }
  if (error || !user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow">
          <p className="font-medium">Error</p>
          <p>{error || "User not found"}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* User Profile Header */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 h-32 md:h-48"></div>
        <div className="px-6 py-4 md:px-8 md:py-6">
          <div className="flex flex-col md:flex-row md:items-end -mt-16">
            <div className="h-24 w-24 md:h-32 md:w-32 rounded-full border-4 border-white bg-gray-100 flex items-center justify-center overflow-hidden shadow-lg">
              {user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.fullName || user.username}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-4xl md:text-5xl font-bold text-purple-500">
                  {(user.fullName || user.username).charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="md:ml-6 mt-4 md:mt-0 flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {user.fullName || user.username}
              </h1>
              <p className="text-gray-500">@{user.username}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {user.userType || "User"}
                </span>
                {user.skills &&
                  user.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                    >
                      {skill}
                    </span>
                  ))}
              </div>
            </div>
            {currentUser && currentUser.username === user.username && (
              <div className="mt-4 md:mt-0">
                <button
                  onClick={openEditModal}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <svg
                    className="-ml-1 mr-2 h-5 w-5 text-gray-500"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  Edit Profile
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <div className="col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Personal Information
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Email</h3>
                <p className="mt-1 text-sm text-gray-900">{user.email}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Role</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {user.userType || "Not specified"}
                </p>
              </div>
              {user.location && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Location
                  </h3>
                  <p className="mt-1 text-sm text-gray-900">{user.location}</p>
                </div>
              )}
              {user.createdAt && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Joined</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDate(user.createdAt)}
                  </p>
                </div>
              )}
            </div>
            {user.bio && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  About
                </h3>
                <p className="text-sm text-gray-900">{user.bio}</p>
              </div>
            )}
          </div>
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Statistics
            </h2>
            {user.userType === "contentCreator" ? (
              // contentCreator Statistics
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.createdCount}
                  </p>
                  <p className="text-sm text-gray-500">Projects Created</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {stats.createdAssigned}
                  </p>
                  <p className="text-sm text-gray-500">Projects Assigned</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.createdCompleted}
                  </p>
                  <p className="text-sm text-gray-500">Projects Completed</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-amber-600">
                    {stats.createdPending}
                  </p>
                  <p className="text-sm text-gray-500">Projects Pending</p>
                </div>
              </div>
            ) : user.userType === "editor" ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-indigo-600">
                    {stats.editedCount}
                  </p>
                  <p className="text-sm text-gray-500">Projects Edited</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {stats.editedCompleted}
                  </p>
                  <p className="text-sm text-gray-500">Projects Completed</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.editedInProgress}
                  </p>
                  <p className="text-sm text-gray-500">In Progress</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.editedInReview}
                  </p>
                  <p className="text-sm text-gray-500">In Review</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.createdCount}
                  </p>
                  <p className="text-sm text-gray-500">Projects Created</p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-indigo-600">
                    {stats.editedCount}
                  </p>
                  <p className="text-sm text-gray-500">Projects Edited</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {stats.totalCompletedUnique}
                  </p>
                  <p className="text-sm text-gray-500">Projects Completed</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.daysAsMember}
                  </p>
                  <p className="text-sm text-gray-500">Days as Member</p>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="col-span-2">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {(() => {
              if (user.userType === "contentCreator") {
                return (
                  <>
                    <div className="border-b border-gray-200">
                      <div className="py-4 px-6 text-center font-medium text-purple-600 border-b-2 border-purple-500">
                        Projects Created
                      </div>
                    </div>
                    <div className="p-6">{renderCreatedProjects()}</div>
                  </>
                );
              } else if (user.userType === "editor") {
                return (
                  <>
                    <div className="border-b border-gray-200">
                      <div className="py-4 px-6 text-center font-medium text-purple-600 border-b-2 border-purple-500">
                        Projects Edited
                      </div>
                    </div>
                    <div className="p-6">{renderEditedProjects()}</div>
                  </>
                );
              } else {
                return (
                  <>
                    <div className="border-b border-gray-200">
                      <nav className="flex -mb-px">
                        <button
                          onClick={() => setActiveTab("created")}
                          className={`py-4 px-6 text-center border-b-2 font-medium text-sm flex-1 ${
                            activeTab === "created"
                              ? "border-purple-500 text-purple-600"
                              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          Projects Created
                        </button>
                        <button
                          onClick={() => setActiveTab("edited")}
                          className={`py-4 px-6 text-center border-b-2 font-medium text-sm flex-1 ${
                            activeTab === "edited"
                              ? "border-purple-500 text-purple-600"
                              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          Projects Edited
                        </button>
                      </nav>
                    </div>
                    <div className="p-6">
                      {activeTab === "created"
                        ? renderCreatedProjects()
                        : renderEditedProjects()}
                    </div>
                  </>
                );
              }
            })()}
          </div>
        </div>
      </div>
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Edit Profile
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg
                  className="h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmitProfile}>
              <div className="px-6 py-4 max-h-[calc(90vh-130px)] overflow-y-auto">
                {updateMessage && (
                  <div
                    className={`mb-4 p-3 rounded ${
                      updateMessage.type === "success"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {updateMessage.text}
                  </div>
                )}
                <div className="mb-6 flex flex-col items-center">
                  <div
                    className="h-24 w-24 rounded-full bg-gray-100 mb-2 overflow-hidden"
                    onClick={() => fileInputRef.current.click()}
                  >
                    {editFormData.profileImage ? (
                      <img
                        src={editFormData.profileImage}
                        alt={editFormData.fullName || user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-purple-100">
                        <span className="text-3xl font-bold text-purple-500">
                          {(editFormData.fullName || user.username)
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current.click()}
                    className="text-sm text-purple-600 hover:text-purple-700"
                  >
                    Change profile picture
                  </button>
                </div>
                <div className="mb-4">
                  <label
                    htmlFor="fullName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={editFormData.fullName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div className="mb-4">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={editFormData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    readOnly
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Email cannot be changed
                  </p>
                </div>
                <div className="mb-4">
                  <label
                    htmlFor="bio"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={editFormData.bio}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Tell others a bit about yourself..."
                  ></textarea>
                </div>
                <div className="mb-4">
                  <label
                    htmlFor="location"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Location
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={editFormData.location}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="City, Country"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Skills
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Add a skill"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSkill();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      className="px-4 py-2 bg-purple-600 text-white rounded-r-md hover:bg-purple-700 focus:outline-none"
                    >
                      Add
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {editFormData.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="ml-1 text-indigo-600 hover:text-indigo-800"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 mr-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    isSubmitting
                      ? "bg-purple-400 cursor-not-allowed"
                      : "bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                      Saving...
                    </span>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserProfile;
