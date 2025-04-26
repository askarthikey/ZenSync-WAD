import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function EditorProjectsDisplay() {
  const location = useLocation();
  
  // State management
  const [, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [statsData, setStatsData] = useState({
    total: 0,
    inProgress: 0,
    completed: 0,
    closed: 0,
    overdue: 0,
    unstarted: 0
  });
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusUpdateMessage, setStatusUpdateMessage] = useState('');

  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoDescription, setVideoDescription] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmittingVideo, setIsSubmittingVideo] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [videoResponses, setVideoResponses] = useState([]);
  const [activeVideoResponse, setActiveVideoResponse] = useState(0);
  const [loadingResponses, setLoadingResponses] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Get user from localStorage on component mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        
        // If we have the user email, fetch their projects
        if (parsedUser.email) {
          fetchEditorProjects(parsedUser.email);
        } else {
          setError('User email not found in profile');
        }
      } else {
        // No user in localStorage, show login prompt or mock data
        console.log('No user found in localStorage');
      }
    } catch (error) {
      console.error('Error getting user from localStorage:', error);
      setError('Error loading user profile');
    }
  }, []);

  // Apply filters when activeFilter or searchQuery changes
  useEffect(() => {
    if (projects.length > 0) {
      applyFilters();
    }
  }, [projects, activeFilter, searchQuery]);

  // Add this useEffect to close the dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showStatusDropdown && !event.target.closest('.status-dropdown-container')) {
        setShowStatusDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStatusDropdown]);

  // Add this useEffect to handle URL parameters
  useEffect(() => {
    const handleUrlParameters = async () => {
      const params = new URLSearchParams(location.search);
      const projectId = params.get('id');
      const action = params.get('action');
      
      if (projectId && action === 'open' && projects.length > 0) {
        console.log("Looking for project with ID:", projectId);
        
        // Find the project by ID - try both string and ObjectId comparison
        const targetProject = projects.find(p => {
          const pId = typeof p._id === 'string' ? p._id : p._id?.toString();
          return pId === projectId;
        });
        
        if (targetProject) {
          console.log("Found project, opening modal:", targetProject.title);
          setSelectedProject(targetProject);
        } else {
          console.log("Project not found with ID:", projectId);
        }
      }
    };
    
    if (projects.length > 0) {
      handleUrlParameters();
    }
  }, [location, projects]);

  // Fetch projects assigned to this editor
  const fetchEditorProjects = async (editorEmail) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Use the existing endpoint from your API
      const response = await fetch(`http://localhost:4000/projectApi/editor-projects?email=${encodeURIComponent(editorEmail)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      
      const data = await response.json();
      
      // Process projects data to calculate days remaining, etc.
      const processedProjects = data.projects.map(project => {
        const deadline = new Date(project.deadline);
        const today = new Date();
        
        // Calculate days remaining
        const diffTime = deadline - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Check if project is overdue
        const isOverdue = diffDays < 0 && project.status !== 'Completed';
        
        // Extract completion percentage from status
        let completionPercentage = 0;
        if (project.status === 'Completed') {
          completionPercentage = 100;
        } else if (project.status.includes('%')) {
          const match = project.status.match(/(\d+)%/);
          if (match && match[1]) {
            completionPercentage = parseInt(match[1], 10);
          }
        }
        
        return {
          ...project,
          daysRemaining: diffDays,
          isOverdue,
          completionPercentage
        };
      });
      
      setProjects(processedProjects);
      setFilteredProjects(processedProjects);
      
      // Calculate stats for the dashboard
      const stats = {
        total: processedProjects.length,
        inProgress: processedProjects.filter(p => 
          p.status.includes('In Progress') || 
          p.status.includes('Just started - 25%') || 
          p.status.includes('Good progress - 45%') || 
          p.status.includes('Almost there - 75%')
        ).length,
        closed: processedProjects.filter(p => p.status === 'Closed').length,
        completed: processedProjects.filter(p => p.status === 'Completed').length,
        overdue: processedProjects.filter(p => p.isOverdue).length,
        unstarted: processedProjects.filter(p => p.status === 'Draft').length
      };
      
      setStatsData(stats);
      setIsLoading(false);
      
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError('Failed to load projects. Please try again later.');
      setIsLoading(false);
    }
  };

  // Apply filters based on activeFilter and searchQuery
  const applyFilters = () => {
    let filtered = [...projects];
    
    // Filter by status
    if (activeFilter === 'in-progress') {
      filtered = filtered.filter(project => project.status.includes('In Progress') || project.status.includes('Just started - 25%') || project.status.includes('Good progress - 45%') || project.status.includes('Almost there - 75%'));
    } else if (activeFilter === 'completed') {
      filtered = filtered.filter(project => project.status === 'Completed');
    } else if (activeFilter === 'closed') {
      filtered = filtered.filter(project => project.status === 'Closed');
    } else if (activeFilter === 'overdue') {
      filtered = filtered.filter(project => project.isOverdue);
    } else if (activeFilter === 'unassigned') {
      filtered = filtered.filter(project => project.status === 'Unassigned');
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(project => {
        const matchesTitle = project.title.toLowerCase().includes(query);
        const matchesDescription = project.description.toLowerCase().includes(query);
        const matchesTags = project.tags.some(tag => tag.toLowerCase().includes(query));
        const matchesCreator = 
          (project.creatorName ? project.creatorName.toLowerCase().includes(query) : false) || 
          (project.creatorEmail ? project.creatorEmail.toLowerCase().includes(query) : false);
        
        return matchesTitle || matchesDescription || matchesTags || matchesCreator;
      });
    }
    
    setFilteredProjects(filtered);
  };

  const applyFiltersToProjects = (projects, activeFilter, searchQuery) => {
    let filtered = [...projects];
    
    // Filter by status
    if (activeFilter === 'in-progress') {
      filtered = filtered.filter(project => project.status.includes('In Progress')|| project.status.includes('Just started - 25%') || project.status.includes('Good progress - 45%') || project.status.includes('Almost there - 75%'));
    } else if (activeFilter === 'completed') {
      filtered = filtered.filter(project => project.status === 'Completed');
    } else if (activeFilter === 'closed') {
      filtered = filtered.filter(project => project.status === 'Closed');
    }else if (activeFilter === 'overdue') {
      filtered = filtered.filter(project => project.isOverdue);
    } else if (activeFilter === 'unassigned') {
      filtered = filtered.filter(project => project.status === 'Unassigned');
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(project => {
        const matchesTitle = project.title.toLowerCase().includes(query);
        const matchesDescription = project.description.toLowerCase().includes(query);
        const matchesTags = project.tags.some(tag => tag.toLowerCase().includes(query));
        const matchesCreator = 
          (project.creatorName ? project.creatorName.toLowerCase().includes(query) : false) || 
          (project.creatorEmail ? project.creatorEmail.toLowerCase().includes(query) : false);
        
        return matchesTitle || matchesDescription || matchesTags || matchesCreator;
      });
    }
    
    return filtered;
  };

  const updateStatsData = (projects) => {
    const stats = {
      total: projects.length,
      inProgress: projects.filter(p => p.status.includes('In Progress') || p.status.includes('Just started - 25%') || p.status.includes('Good progress - 45%') || p.status.includes('Almost there - 75%')).length,
      closed: projects.filter(p => p.status === 'Closed').length,
      completed: projects.filter(p => p.status === 'Completed').length,
      overdue: projects.filter(p => p.isOverdue).length,
      unassigned: projects.filter(p => p.status === 'Unassigned').length
    };
    setStatsData(stats);
  };

  const showStatusUpdateSuccess = (newStatus) => {
    setStatusUpdateMessage(`Status updated to: ${newStatus}`);
    setTimeout(() => setStatusUpdateMessage(''), 3000);
  };

  // Format date to display in a readable format
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get status styling based on status
  const getStatusStyles = (status) => {
    if (status === 'Completed'|| status=== 'Closed') {
      return 'bg-green-100 text-green-800';
    } else if (status === 'Draft') {
      return 'bg-gray-100 text-gray-800';
    } else if (status.includes('Almost there')) {
      return 'bg-blue-100 text-blue-800';
    } else if (status.includes('Good progress')) {
      return 'bg-yellow-100 text-yellow-800';
    } else if (status.includes('Just started')) {
      return 'bg-red-100 text-red-800';
    } else if (status.includes('In Progress')) {
      return 'bg-blue-100 text-blue-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  // Get deadline styling
  const getDeadlineStyles = (daysRemaining, status) => {
    if (status === 'Completed' || status === 'Closed') {
      return 'text-green-600';
    } else if (daysRemaining < 10) {
      return 'text-red-600 font-medium';
    } else if (daysRemaining <= 30) {
      return 'text-orange-600 font-medium';
    }
    return 'text-gray-600';
  };

  // Handle project click to show details
  const handleProjectClick = (project) => {
    setSelectedProject(project);
    
    // Fetch video responses and reviews when opening a project
    if (project._id) {
      if (project.status === 'Completed' || project.status === 'Closed' || project.status.includes('In Progress')|| project.status.includes('Just started - 25%') || project.status.includes('Good progress - 45%') || project.status.includes('Almost there - 75%')) {
        fetchVideoResponses(project._id);
      } else {
        setVideoResponses([]);
      }
      if(project.status !== 'Draft' || project.status !== 'Unassigned')
        fetchProjectReviews(project._id);
    }
  };

  // Close project details modal
  const closeProjectDetails = () => {
    setSelectedProject(null);
  };

  // Improved handleUpdateStatus function
  const handleUpdateStatus = async (projectId, newStatus) => {
    try {
      // Prevent status updates for closed projects
      if (selectedProject.status === 'Closed') {
        alert('This project is closed and its status cannot be changed.');
        setShowStatusDropdown(false);
        return;
      }

      setIsUpdatingStatus(true);
      setShowStatusDropdown(false); // Close dropdown immediately
      
      const token = localStorage.getItem('token');
      
      // Extract completion percentage from status
      let completionPercentage = 0;
      if (newStatus === 'Completed' || newStatus === 'Closed') {
        completionPercentage = 100;
      } else if (newStatus.includes('Just started')) {
        completionPercentage = 25; // 0-29%
      } else if (newStatus.includes('Good progress')) {
        completionPercentage = 45; // 30-59%
      } else if (newStatus.includes('Almost there')) {
        completionPercentage = 75; // 60-99%
      } else if (newStatus.includes('%')) {
        // Fallback for any other percentage format
        const match = newStatus.match(/(\d+)%/);
        if (match && match[1]) {
          completionPercentage = parseInt(match[1], 10);
        }
      }
      
      const response = await fetch(`http://localhost:4000/projectApi/project/${projectId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          completionPercentage
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update project status');
      }
      
      const result = await response.json();
      console.log(result)
      
      // Update the selected project directly
      const updatedProject = {
        ...selectedProject,
        status: newStatus,
        completionPercentage: completionPercentage
      };
      setSelectedProject(updatedProject);
      
      // Also update the project in the projects array for consistent UI
      const updatedProjects = projects.map(project => 
        project._id === projectId 
          ? { 
              ...project, 
              status: newStatus, 
              completionPercentage: completionPercentage,
              isOverdue: project.daysRemaining < 0 && ( newStatus !== 'Completed' || newStatus !== 'Closed' )
            }
          : project
      );
      
      setProjects(updatedProjects);
      
      // Re-apply filters to update filteredProjects
      const filtered = applyFiltersToProjects(updatedProjects, activeFilter, searchQuery);
      setFilteredProjects(filtered);
      
      // Update stats
      updateStatsData(updatedProjects);
      
      // Show success message
      showStatusUpdateSuccess(newStatus);
      
    } catch (error) {
      console.error('Error updating project status:', error);
      alert('Failed to update project status. Please try again.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Open video modal and fetch existing responses if any
  const handleOpenVideoModal = async (projectId) => {
    setVideoModalOpen(true);
    resetVideoForm();
    
    // Fetch existing video responses
    await fetchVideoResponses(projectId);
  };

  // Reset video form state
  const resetVideoForm = () => {
    setVideoDescription('');
    setVideoFile(null);
    setVideoPreview(null);
    setUploadProgress(0);
    setVideoError(null);
  };

  // Handle video file selection
  const handleVideoFileChange = (e) => {
    const file = e.target.files[0];
    
    if (file) {
      // Validate file size (100MB max)
      if (file.size > 100 * 1024 * 1024) {
        setVideoError('Video file size must be less than 100MB');
        return;
      }
      
      // Validate file type
      const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv'];
      if (!validTypes.includes(file.type)) {
        setVideoError('Please select a valid video file (MP4, MOV, AVI, WMV)');
        return;
      }
      
      setVideoFile(file);
      setVideoError(null);
      
      // Create a preview URL
      const previewUrl = URL.createObjectURL(file);
      setVideoPreview(previewUrl);
    }
  };

  // Submit video response
  const handleSubmitVideo = async (e) => {
    e.preventDefault();
    
    if (!videoDescription) {
      setVideoError('Please provide a description');
      return;
    }
    
    if (!videoFile) {
      setVideoError('Please select a video file');
      return;
    }
    
    setIsSubmittingVideo(true);
    setVideoError(null);
    
    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }
      
      // Create form data
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('description', videoDescription);
      
      // Log token for debugging (first 10 chars)
      console.log('Using token:', token.substring(0, 10) + '...');
      
      // Use XMLHttpRequest with proper auth header
      const xhr = new XMLHttpRequest();
      
      // Setup progress monitoring
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
        }
      });
      
      // Promise wrapper for XHR
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error('Upload failed: ' + xhr.statusText));
          }
        };
        
        xhr.onerror = function() {
          reject(new Error('Network error during upload'));
        };
      });
      
      // Open and send the request with Authorization header
      xhr.open('POST', `http://localhost:4000/projectApi/add-video-response/${selectedProject._id}`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
      
      // Wait for the upload to complete
      const response = await uploadPromise;
      console.log(response)
      
      // Refresh video responses
      await fetchVideoResponses(selectedProject._id);
      
      // Success handling
      resetVideoForm();
      
    } catch (error) {
      console.error('Error uploading video:', error);
      setVideoError(error.message || 'Failed to upload video');
    } finally {
      setIsSubmittingVideo(false);
    }
  };

  // Fetch video responses for a project
  const fetchVideoResponses = async (projectId) => {
    setLoadingResponses(true);
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await fetch(`http://localhost:4000/projectApi/project-responses/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch video responses: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setVideoResponses(data.responses || []);
        setActiveVideoResponse(data.responses && data.responses.length > 0 ? 0 : -1);
      }
    } catch (err) {
      console.error('Error fetching video responses:', err);
      setVideoError('Failed to load existing video responses');
    } finally {
      setLoadingResponses(false);
    }
  };

  // Fetch project reviews/comments
  const fetchProjectReviews = async (projectId) => {
    setLoadingReviews(true);
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await fetch(`http://localhost:4000/projectApi/project-reviews/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch project reviews');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error('Error fetching project reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  // Return loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600"></div>
          <p className="mt-4 text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  // Return error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading projects</h3>
              <p className="text-sm text-red-700 mt-2">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {statusUpdateMessage && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg z-50 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{statusUpdateMessage}</span>
        </div>
      )}

      {/* Stats Dashboard */}
      <div className="bg-white rounded-lg shadow-lg mb-8 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-5">
          <div className="flex flex-col md:flex-row justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">My Assigned Projects</h1>
              <p className="mt-1 text-blue-100">Manage and track all projects assigned to you</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-gray-200">
          <div className="p-5 text-center">
            <div className="text-2xl font-bold text-gray-900">{statsData.total}</div>
            <div className="text-sm text-gray-500">Total Projects</div>
          </div>
          <div className="p-5 text-center">
            <div className="text-2xl font-bold text-blue-600">{statsData.inProgress}</div>
            <div className="text-sm text-gray-500">In Progress</div>
          </div>
          <div className="p-5 text-center">
            <div className="text-2xl font-bold text-green-600">{statsData.completed}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
          <div className="p-5 text-center">
            <div className="text-2xl font-bold text-green-700">{statsData.closed}</div>
            <div className="text-sm text-gray-500">Closed</div>
          </div>
          <div className="p-5 text-center">
            <div className="text-2xl font-bold text-red-600">{statsData.overdue}</div>
            <div className="text-sm text-gray-500">Overdue</div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-center">
        <div className="flex flex-wrap space-x-2 mb-4 sm:mb-0">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-2 rounded-md text-sm font-medium mb-2 sm:mb-0 ${
              activeFilter === 'all'
                ? 'bg-blue-100 text-blue-800'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter('in-progress')}
            className={`px-3 py-2 rounded-md text-sm font-medium mb-2 sm:mb-0 ${
              activeFilter === 'in-progress'
                ? 'bg-blue-100 text-blue-800'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setActiveFilter('completed')}
            className={`px-3 py-2 rounded-md text-sm font-medium mb-2 sm:mb-0 ${
              activeFilter === 'completed'
                ? 'bg-green-100 text-green-800'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setActiveFilter('closed')}
            className={`px-3 py-2 rounded-md text-sm font-medium mb-2 sm:mb-0 ${
              activeFilter === 'closed'
                ? 'bg-green-100 text-green-800'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Closed
          </button>
          <button
            onClick={() => setActiveFilter('overdue')}
            className={`px-3 py-2 rounded-md text-sm font-medium mb-2 sm:mb-0 ${
              activeFilter === 'overdue'
                ? 'bg-red-100 text-red-800'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Overdue
          </button>
        </div>
        
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      {/* Projects List */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredProjects.map(project => (
            <div 
              key={project._id} 
              className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow duration-300 cursor-pointer"
              onClick={() => handleProjectClick(project)}
            >
              <div className="relative h-48 bg-gray-200">
                {project.thumbnailUrl ? (
                  <img 
                    src={project.thumbnailUrl} 
                    alt={project.title} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                  <div className="flex justify-between items-center">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusStyles(project.status)}`}>
                      {project.status}
                    </span>
                  </div>
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-300">
                  <div 
                    className={`h-full ${
                      project.completionPercentage === 100 ? 'bg-green-500' : 
                      project.completionPercentage >= 60 ? 'bg-blue-500' : 
                      project.completionPercentage >= 30 ? 'bg-yellow-500' : 
                      'bg-red-500'
                    }`} 
                    style={{ width: `${project.completionPercentage}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{project.title}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{project.description}</p>
                
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <p className="text-gray-500">Creator:</p>
                    <p className="font-medium truncate">
                      {project.userCreated || (project.creatorEmail ? (project.creatorEmail.includes('@') ? project.creatorEmail.split('@')[0] : project.creatorEmail) : 'Unknown')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Deadline:</p>
                    <p className={`font-medium ${getDeadlineStyles(project.daysRemaining, project.status)}`}>
                      {formatDate(project.deadline)}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1 mt-2">
                  {project.tags && project.tags.slice(0, 3).map((tag, index) => (
                    <span 
                      key={index} 
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700"
                    >
                      {tag}
                    </span>
                  ))}
                  {project.tags && project.tags.length > 3 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-500">
                      +{project.tags.length - 3}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Created {formatDate(project.createdAt)}</span>
                  </div>
                  <div className={getDeadlineStyles(project.daysRemaining, project.status)}>
                    {project.status === 'Completed' ? (
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Completed
                      </span>
                    ) : project.status === 'Closed' ? (
                      <span className="flex items-center text-green-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Closed
                      </span>
                    ) : project.isOverdue ? (
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                        </svg>
                        {Math.abs(project.daysRemaining)} days overdue
                      </span>
                    ) : (
                      <span>
                        {project.daysRemaining === 0 ? 'Due today' : `${project.daysRemaining} days left`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 flex flex-col items-center justify-center text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No projects found</h3>
          <p className="text-gray-500 mb-6">
            {searchQuery || activeFilter !== 'all' ? 
              'Try adjusting your search or filters to find what you\'re looking for.' : 
              'You don\'t have any projects assigned to you yet.'}
          </p>
        </div>
      )}

      {/* Project Detail Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="relative">
              <div className="h-48 sm:h-64 bg-gray-200 relative">
                {selectedProject.thumbnailUrl ? (
                  <img 
                    src={selectedProject.thumbnailUrl} 
                    alt={selectedProject.title} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20 flex flex-col justify-end p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-1">{selectedProject.title}</h2>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {selectedProject.tags && selectedProject.tags.map((tag, index) => (
                          <span 
                            key={index} 
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-white/20 text-white"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-md text-sm font-medium ${getStatusStyles(selectedProject.status)}`}>
                      {selectedProject.status}
                    </span>
                  </div>
                </div>
                
                <button 
                  onClick={closeProjectDetails} 
                  className="absolute top-4 right-4 bg-black/30 hover:bg-black/50 text-white rounded-full p-2 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              
              <div className="h-2 bg-gray-200">
                <div 
                  className={`h-full ${
                    selectedProject.completionPercentage === 100 ? 'bg-green-500' : 
                    selectedProject.completionPercentage >= 60 ? 'bg-blue-500' : 
                    selectedProject.completionPercentage >= 30 ? 'bg-yellow-500' : 
                    'bg-red-500'
                  }`} 
                  style={{ width: `${selectedProject.completionPercentage}%` }}
                ></div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[50vh]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-700 mb-6">{selectedProject.description}</p>
                    
                    {selectedProject.videoUrl && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Video Preview</h3>
                        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                          <video 
                            src={selectedProject.videoUrl} 
                            className="w-full h-full object-contain" 
                            controls
                          ></video>
                        </div>
                      </div>
                    )}
                    
                    {/* Only show update status section if project is not closed */}
                    {selectedProject.status !== 'Closed' && selectedProject.status !== 'Completed' && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Update Status</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <button
                            onClick={() => handleUpdateStatus(selectedProject._id, 'Just started - 25%')}
                            className={`py-2 px-4 rounded-md text-sm font-medium ${
                              selectedProject.completionPercentage <= 29 ? 'bg-red-600 text-white' : 'bg-red-100 text-red-800 hover:bg-red-200'
                            }`}
                          >
                            Just started
                            <span className="block text-xs mt-1">0-29%</span>
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(selectedProject._id, 'Good progress - 45%')}
                            className={`py-2 px-4 rounded-md text-sm font-medium ${
                              selectedProject.completionPercentage >= 30 && selectedProject.completionPercentage <= 59 ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            }`}
                          >
                            Good progress
                            <span className="block text-xs mt-1">30-59%</span>
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(selectedProject._id, 'Almost there - 75%')}
                            className={`py-2 px-4 rounded-md text-sm font-medium ${
                              selectedProject.completionPercentage >= 60 && selectedProject.completionPercentage <= 99 ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            }`}
                          >
                            Almost there
                            <span className="block text-xs mt-1">60-99%</span>
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(selectedProject._id, 'Completed')}
                            className={`py-2 px-4 rounded-md text-sm font-medium ${
                              selectedProject.completionPercentage === 100 ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800 hover:bg-green-200'
                            }`}
                          >
                            Completed
                            <span className="block text-xs mt-1">100%</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Project Conversation Section - Similar to CreatorProjectDisplay */}
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Project Conversation</h3>
                      </div>
                      
                      {loadingReviews || loadingResponses ? (
                        <div className="flex items-center justify-center h-32">
                          <div className="text-center">
                            <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="text-gray-600">Loading conversation...</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {videoResponses.length === 0 && reviews.length === 0 ? (
                            <div className="bg-gray-50 p-4 rounded-md text-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              <p className="text-gray-600">No conversation yet.</p>
                            </div>
                          ) : (
                            [...videoResponses.map(response => ({
                              ...response,
                              type: 'editor-response',
                              timestamp: new Date(response.createdAt || Date.now() - (videoResponses.length - response.index) * 86400000)
                            })), 
                            ...reviews.map(review => ({
                              ...review,
                              type: 'creator-review',
                              timestamp: new Date(review.createdAt)
                            }))]
                            .sort((a, b) => a.timestamp - b.timestamp)
                            .map((item, idx) => (
                              <div 
                                key={`${item.type}-${idx}`} 
                                className={`p-4 rounded-lg ${
                                  item.type === 'editor-response' 
                                    ? 'bg-blue-50 border-l-4 border-blue-300' 
                                    : 'bg-purple-50 border-l-4 border-purple-300'
                                }`}
                              >
                                <div className="flex items-start mb-2">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    item.type === 'editor-response' ? 'bg-blue-200' : 'bg-purple-200'
                                  }`}>
                                    <span className="text-sm font-medium">
                                      {item.type === 'editor-response' ? 'E' : 'C'}
                                    </span>
                                  </div>
                                  <div className="ml-3">
                                    <span className="text-sm font-medium">
                                      {item.type === 'editor-response' 
                                        ? `Your Response #${item.index + 1}` 
                                        : 'Creator Comment'}
                                    </span>
                                    <span className="ml-2 text-xs text-gray-500">
                                      {item.timestamp.toLocaleDateString(undefined, {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                </div>
                                
                                {item.type === 'editor-response' && item.videoUrl && (
                                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-3">
                                    <video 
                                      src={`http://localhost:4000${item.videoUrl}`} 
                                      controls
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                )}
                                
                                <div className="prose max-w-none text-gray-700">
                                  <p>{item.type === 'editor-response' ? 
                                    (item.description || 'No description provided') : 
                                    (item.comment || 'No comment provided')}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Project details sidebar - keep as is */}
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-3">Project Details</h3>
                      <dl className="space-y-2">
                        <div className="grid grid-cols-3 gap-1">
                          <dt className="text-sm font-medium text-gray-500">Creator:</dt>
                          <dd className="text-sm text-gray-900 col-span-2 truncate">
                            {selectedProject.userCreated ? (
                              <span className="font-medium">
                                {selectedProject.userCreated}
                                {selectedProject.creatorEmail && (
                                  <a 
                                    href={`mailto:${selectedProject.creatorEmail}`} 
                                    className="ml-2 text-indigo-600 hover:text-indigo-800 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                  </a>
                                )}
                              </span>
                            ) : selectedProject.creatorEmail ? (
                              <a 
                                href={`mailto:${selectedProject.creatorEmail}`} 
                                className="text-indigo-600 hover:text-indigo-800 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {selectedProject.creatorName || selectedProject.creatorEmail.split('@')[0]}
                              </a>
                            ) : (
                              <span>Unknown Creator</span>
                            )}
                          </dd>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <dt className="text-sm font-medium text-gray-500">Status:</dt>
                          <dd className="text-sm text-gray-900 col-span-2">{selectedProject.status}</dd>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <dt className="text-sm font-medium text-gray-500">Created:</dt>
                          <dd className="text-sm text-gray-900 col-span-2">{formatDate(selectedProject.createdAt)}</dd>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <dt className="text-sm font-medium text-gray-500">Deadline:</dt>
                          <dd className={`text-sm col-span-2 ${getDeadlineStyles(selectedProject.daysRemaining, selectedProject.status)}`}>
                            {formatDate(selectedProject.deadline)}
                          </dd>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <dt className="text-sm font-medium text-gray-500">Time Left:</dt>
                          <dd className={`text-sm col-span-2 ${getDeadlineStyles(selectedProject.daysRemaining, selectedProject.status)}`}>
                            {selectedProject.status === 'Completed' ? (
                              <span className="flex items-center text-green-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Completed
                              </span>
                            ) : selectedProject.status === 'Closed' ? (
                              <span className="flex items-center text-green-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Closed
                              </span>
                            ) : selectedProject.isOverdue ? (
                              `${Math.abs(selectedProject.daysRemaining)} days overdue`
                            ) : (
                              selectedProject.daysRemaining === 0 ? 'Due today' : `${selectedProject.daysRemaining} days left`
                            )}
                          </dd>
                        </div>
                      </dl>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between mb-2">
                        <h3 className="font-medium text-gray-900">Completion</h3>
                        <span className="text-sm font-medium text-gray-700">{selectedProject.completionPercentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full ${
                            selectedProject.completionPercentage === 100 ? 'bg-green-500' : 
                            selectedProject.completionPercentage >= 60 ? 'bg-blue-500' : 
                            selectedProject.completionPercentage >= 30 ? 'bg-yellow-500' : 
                            'bg-red-500'
                          }`} 
                          style={{ width: `${selectedProject.completionPercentage}%` }}>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center text-sm">
                          <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                          <span className="text-gray-600">100%: Completed</span>
                        </div>
                        <div className="flex items-center text-sm mt-1">
                          <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                          <span className="text-gray-600">60-99%: Almost there</span>
                        </div>
                        <div className="flex items-center text-sm mt-1">
                          <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                          <span className="text-gray-600">30-59%: Good progress</span>
                        </div>
                        <div className="flex items-center text-sm mt-1">
                          <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                          <span className="text-gray-600">0-29%: Just started</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-wrap justify-between gap-3">
                {selectedProject.status === 'Closed' ? (
                  <div className="w-full flex justify-end">
                    <button
                      onClick={closeProjectDetails}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      {selectedProject.status !== 'Completed' && selectedProject.status !== 'Closed' && (
                        <div className="relative status-dropdown-container">
                          <button
                            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                            disabled={isUpdatingStatus}
                            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                              isUpdatingStatus 
                                ? 'bg-green-400 cursor-not-allowed' 
                                : 'bg-green-600 hover:bg-green-700'
                            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
                          >
                            {isUpdatingStatus ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Updating...
                              </>
                            ) : (
                              <>
                                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Update Status
                              </>
                            )}
                          </button>
                          
                          {showStatusDropdown && (
                            <div className="absolute bottom-full left-0 mb-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                              {/* Dropdown content remains unchanged */}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {selectedProject.status === 'Completed' && (
                        <button
                          onClick={() => handleOpenVideoModal(selectedProject._id)}
                          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                            <path stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 4h2a2 2 0 012 2v8a2 2 0 01-2 2h-2" />
                          </svg>
                          Add Video Response
                        </button>
                      )}
                    </div>
                    <div className="space-x-2">
                      <button
                        onClick={closeProjectDetails}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                      >
                        Close
                      </button>
                      
                      {selectedProject.creatorEmail && (
                        <button
                          onClick={() => {
                            const creatorEmail = selectedProject.creatorEmail;
                            const subject = `RE: ${selectedProject.title}`;
                            window.location.href = `mailto:${creatorEmail}?subject=${encodeURIComponent(subject)}`;
                          }}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                          </svg>
                          Contact Creator
                        </button>
                      )}
                      
                      {selectedProject.status === 'Completed' && (
                        <button
                          onClick={() => handleUpdateStatus(selectedProject._id, 'Closed')}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8.586 10l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Mark as Closed
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Response Modal */}
      {videoModalOpen && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Video Response for "{selectedProject.title}"
              </h3>
              <button 
                onClick={() => setVideoModalOpen(false)} 
                className="text-gray-400 hover:text-gray-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
              {/* Existing Video Responses */}
              {videoResponses.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Previous Responses</h4>
                  
                  {/* Video player */}
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-4">
                    {loadingResponses ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <svg className="animate-spin h-10 w-10 text-blue-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <p className="text-white">Loading video responses...</p>
                        </div>
                      </div>
                    ) : videoResponses[activeVideoResponse]?.videoUrl ? (
                      <video 
                        src={`http://localhost:4000${videoResponses[activeVideoResponse].videoUrl}`} 
                        controls
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center text-white">
                          <svg className="h-16 w-16 text-gray-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                          </svg>
                          <p>No video available for this response</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Video description */}
                  <div className="p-4 bg-gray-50 rounded-lg mb-4">
                    <h3 className="text-md font-medium text-gray-900 mb-2">
                      Response #{activeVideoResponse + 1}
                    </h3>
                    <div className="prose max-w-none">
                      <p className="text-gray-700">{videoResponses[activeVideoResponse]?.description || 'No description provided'}</p>
                    </div>
                  </div>
                  
                  {/* Video navigation (if multiple videos) */}
                  {videoResponses.length > 1 && (
                    <div className="flex flex-wrap items-center justify-between mb-6">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setActiveVideoResponse(prev => Math.max(0, prev - 1))}
                          disabled={activeVideoResponse === 0}
                          className="p-1 rounded-full hover:bg-gray-200 disabled:opacity-50"
                        >
                          <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <span className="text-sm text-gray-600">
                          {activeVideoResponse + 1} of {videoResponses.length}
                        </span>
                        <button
                          onClick={() => setActiveVideoResponse(prev => Math.min(videoResponses.length - 1, prev + 1))}
                          disabled={activeVideoResponse === videoResponses.length - 1}
                          className="p-1 rounded-full hover:bg-gray-200 disabled:opacity-50"
                        >
                          <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="flex flex-wrap mt-2 sm:mt-0">
                        {videoResponses.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setActiveVideoResponse(index)}
                            className={`w-8 h-8 mx-1 rounded-full flex items-center justify-center text-sm ${
                              index === activeVideoResponse
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {index + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="border-t border-gray-200 my-6 pt-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Add Another Response</h4>
                  </div>
                </div>
              )}
              
              {/* Error message */}
              {videoError && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{videoError}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Upload Form */}
              <form onSubmit={handleSubmitVideo}>
                <div className="mb-4">
                  <label htmlFor="videoDescription" className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="videoDescription"
                    value={videoDescription}
                    onChange={(e) => setVideoDescription(e.target.value)}
                    placeholder="Explain the changes you made to the project or provide additional context..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    disabled={isSubmittingVideo}
                  ></textarea>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="videoFile" className="block text-sm font-medium text-gray-700 mb-2">
                    Video File (MP4, MOV, AVI, WMV, max 100MB)
                  </label>
                  <input
                    type="file"
                    id="videoFile"
                    onChange={handleVideoFileChange}
                    accept="video/*"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={isSubmittingVideo}
                  />
                </div>
                
                {videoPreview && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                      <video src={videoPreview} controls className="w-full h-full"></video>
                    </div>
                  </div>
                )}
                
                {isSubmittingVideo && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Progress: {uploadProgress}%
                    </label>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  disabled={isSubmittingVideo || !videoFile || !videoDescription}
                >
                  {isSubmittingVideo ? 'Uploading...' : 'Upload Video Response'}
                </button>
              </form>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => setVideoModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditorProjectsDisplay;