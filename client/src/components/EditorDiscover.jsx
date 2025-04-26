import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';

function EditorDiscover() {
  const navigate = useNavigate();
  
  // State management
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [accessMessage, setAccessMessage] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [pendingRequests, setPendingRequests] = useState([]);
  const { notifications, addNotifications } = useNotifications();

  // Categories for filtering
  const categories = [
    'all', 
    'technology', 
    'marketing',
    'music',
    'educational', 
    'promotional',
    'social',
    'kids',
  ];

  // Get user from localStorage on component mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      }
      
      fetchUnassignedProjects();
      fetchEditorRequests();
    } catch (error) {
      console.error('Error getting user from localStorage:', error);
      setError('Error loading user profile');
    }
  }, []);

  // Add this useEffect for polling
  useEffect(() => {
    // Check for updates every 30 seconds
    const intervalId = setInterval(() => {
      if (user && user.email) {
        fetchEditorRequests();
      }
    }, 30000);

    // Clean up on component unmount
    return () => clearInterval(intervalId);
  }, [user]);

  // Apply filters when categoryFilter or searchQuery changes
  useEffect(() => {
    if (projects.length > 0) {
      applyFilters();
    }
  }, [projects, categoryFilter, searchQuery]);

  // Fetch all unassigned projects
  const fetchUnassignedProjects = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await fetch('http://localhost:4000/projectApi/unassigned-projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch projects: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.projects || !Array.isArray(data.projects)) {
        throw new Error('Invalid data format received from server');
      }
      
      // Calculate days since created for each project
      const processedProjects = data.projects.map(project => {
        const created = new Date(project.createdAt);
        const today = new Date();
        
        // Calculate days since creation
        const diffTime = today - created;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return {
          ...project,
          daysSinceCreation: diffDays
        };
      });
      
      setProjects(processedProjects);
      setFilteredProjects(processedProjects);
      
    } catch (error) {
      console.error('Error fetching unassigned projects:', error);
      setError(error.message || 'Failed to load unassigned projects. Please try again later.');
      
      // Don't load mock data, just set projects to empty array
      setProjects([]);
      setFilteredProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Update your fetchEditorRequests function
  const fetchEditorRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      try {
        const response = await fetch('http://localhost:4000/projectApi/access-requests/editor', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          console.warn('Editor requests endpoint not available yet');
          return; 
        }
        
        const data = await response.json();
        
        if (data.success && Array.isArray(data.accessRequests)) {
          // Store pending requests
          const pending = data.accessRequests.filter(req => req.status === 'pending');
          setPendingRequests(pending);
          
          // Get approved requests and add to notifications context
          const approvedRequests = data.accessRequests.filter(req => 
            req.status === 'approved'
          );
          
          if (approvedRequests.length > 0) {
            addNotifications(approvedRequests);
          }
        }
      } catch (error) {
        console.warn('Error fetching editor requests:', error.message);
      }
    } catch (error) {
      console.error('Error in authentication:', error);
    }
  };

  // Update the isProjectRequested function
  const isProjectRequested = (projectId) => {
    if (!pendingRequests || pendingRequests.length === 0 || !projectId) {
      return false;
    }
    return pendingRequests.some(req => req.projectId === projectId);
  };

  // Apply filters based on categoryFilter and searchQuery
  const applyFilters = () => {
    let filtered = [...projects];
    
    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(project => 
        project.tags && project.tags.some(tag => 
          tag.toLowerCase().includes(categoryFilter.toLowerCase())
        )
      );
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(project => {
        const matchesTitle = project.title.toLowerCase().includes(query);
        const matchesDescription = project.description.toLowerCase().includes(query);
        const matchesTags = project.tags && project.tags.some(tag => tag.toLowerCase().includes(query));
        const matchesCreator = 
          (project.creatorName ? project.creatorName.toLowerCase().includes(query) : false) || 
          (project.creatorEmail ? project.creatorEmail.toLowerCase().includes(query) : false);
        
        return matchesTitle || matchesDescription || matchesTags || matchesCreator;
      });
    }
    
    setFilteredProjects(filtered);
  };

  // Format date to display in a readable format
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Update the formatTimeAgo function for more accurate display
  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Unknown date';
    
    try {
      const created = new Date(dateString);
      if (isNaN(created.getTime())) return 'Invalid date';
      
      const now = new Date();
      const diffTime = now - created;
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // Show appropriate time unit based on how long ago it was posted
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
      if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
      if (diffDays < 30) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
      
      // For older posts, show the actual date
      return `on ${formatDate(dateString)}`;
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Unknown date';
    }
  };

  // Handle project click to show details
  const handleProjectClick = (project) => {
    setSelectedProject(project);
  };

  // Close project details modal
  const closeProjectDetails = () => {
    setSelectedProject(null);
  };

  // Modify the existing handleRequestAccess function
  const handleRequestAccess = async (projectId) => {
    // Keep existing validation code
    if (!user || !user.email) {
      setAccessMessage({
        type: 'error',
        text: 'You must be logged in to request access'
      });
      return;
    }
    
    setRequestingAccess(true);
    
    try {
      // Keep existing request code
      const token = localStorage.getItem('token');
      const requestMessage = document.getElementById('accessRequestMessage')?.value || 'I would like to edit this project.';
      
      const requestPayload = {
        editorEmail: user.email,
        editorName: user.name || user.email.split('@')[0],
        message: requestMessage,
        projectId: selectedProject._id,
        projectTitle: selectedProject.title,
        projectThumbnail: selectedProject.thumbnailUrl || '',
        creatorUsername: selectedProject.userCreated || ''
      };
      
      console.log('Sending request payload:', requestPayload);
      
      const response = await fetch(`http://localhost:4000/projectApi/project/${projectId}/request-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestPayload)
      });
      
      // Get the response text for debugging
      const responseText = await response.text();
      
      if (!response.ok) {
        console.error('Server response:', responseText);
        throw new Error(`Failed to request access: ${response.status} ${response.statusText}`);
      }
      
      // Parse the JSON response (if it's valid JSON)
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Invalid JSON response:', responseText);
        throw new Error('Invalid response from server', e);
      }
      
      // Add the new request to pendingRequests state
      const newRequest = {
        _id: data.requestId || `temp-${Date.now()}`,
        projectId: selectedProject._id,
        projectTitle: selectedProject.title,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      setPendingRequests(prev => [...prev, newRequest]);
      
      setAccessMessage({
        type: 'success',
        text: 'Access request sent successfully! The creator will be notified.'
      });
      
      // Close modal after success
      setTimeout(() => {
        setSelectedProject(null);
        setAccessMessage(null);
      }, 3000);
      
    } catch (error) {
      console.error('Error requesting project access:', error);
      setAccessMessage({
        type: 'error',
        text: `Failed to request access: ${error.message}`
      });
    } finally {
      setRequestingAccess(false);
    }
  };

  // Return loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600"></div>
          <p className="mt-4 text-gray-600">Discovering available projects...</p>
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
      {accessMessage && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded shadow-lg z-50 flex items-center ${
          accessMessage.type === 'success' 
            ? 'bg-green-100 border border-green-400 text-green-700' 
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            {accessMessage.type === 'success' ? (
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            ) : (
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            )}
          </svg>
          <span>{accessMessage.text}</span>
        </div>
      )}

      {notifications.length > 0 ? (
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-gray-700">Recently Approved Projects:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {notifications.slice(0, 2).map(notification => (
              <div 
                key={notification._id}
                className="px-3 py-2 bg-green-50 border border-green-100 rounded-md flex items-center"
              >
                {notification.projectThumbnail && (
                  <img 
                    src={notification.projectThumbnail} 
                    alt="" 
                    className="w-6 h-6 rounded object-cover mr-2"
                  />
                )}
                <span className="text-sm text-green-800 font-medium truncate max-w-xs">
                  {notification.projectTitle}
                </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/editor-projects');
                  }}
                  className="ml-2 text-green-700 hover:text-green-900"
                  aria-label="View in dashboard"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
            {notifications.length > 2 && (
              <button
                onClick={() => navigate('/editor-projects')}
                className="px-3 py-2 text-sm font-medium text-purple-700 hover:text-purple-900"
              >
                +{notifications.length - 2} more
              </button>
            )}
          </div>
        </div>
      ) : null}

      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg mb-8 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 px-6 py-5">
          <div className="flex flex-col md:flex-row justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Discover Projects</h1>
              <p className="mt-1 text-purple-100">Find new projects to edit and collaborate on</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <p className="text-gray-600">
            Browse through unassigned projects from content creators. Request access to projects you'd like to edit. 
            Once approved by the creator, the project will appear in your "My Assigned Projects" section.
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-center">
        <div className="flex flex-col w-full sm:w-auto mb-4 sm:mb-0">
          <div className="flex flex-wrap space-x-2">
            <span className="px-3 py-2 text-sm font-medium text-gray-500">Categories:</span>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category)}
                className={`px-3 py-2 rounded-md text-sm font-medium mb-2 sm:mb-0 ${
                  categoryFilter === category
                    ? 'bg-purple-100 text-purple-800'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
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
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                      isProjectRequested(project._id)
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {isProjectRequested(project._id) ? 'Request Sent' : 'Unassigned'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{project.title}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{project.description}</p>
                
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <p className="text-gray-500">Creator:</p>
                    <p className="font-medium truncate">
                      {project.userCreated || project.creatorName || (project.creatorEmail ? project.creatorEmail.split('@')[0] : 'Unknown')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Deadline:</p>
                    <p className="font-medium text-gray-900">
                      {formatDate(project.deadline)}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1 mt-2">
                  {project.tags && project.tags.slice(0, 3).map((tag, index) => (
                    <span 
                      key={index} 
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700"
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
                    <span>Posted {formatTimeAgo(project.createdAt)}</span>
                  </div>
                  <div className="text-purple-600 font-medium flex items-center">
                    <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    View Details
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
          <h3 className="text-lg font-medium text-gray-900 mb-1">No projects available</h3>
          <p className="text-gray-500 mb-6">
            {searchQuery || categoryFilter !== 'all' ? 
              'Try adjusting your search or filters to find what you\'re looking for.' : 
              'There are no unassigned projects available at the moment. Check back soon or contact a content creator to create new projects.'}
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
                    <span className="px-3 py-1 rounded-md text-sm font-medium bg-purple-100 text-purple-800">
                      Unassigned
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
              
              <div className="p-6 overflow-y-auto max-h-[50vh]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-700 mb-6">{selectedProject.description}</p>
                    
                    {selectedProject.requirements && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Requirements</h3>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-gray-700">{selectedProject.requirements}</p>
                        </div>
                      </div>
                    )}
                    
                    {selectedProject.videoUrl && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Preview Media</h3>
                        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                          <video 
                            src={selectedProject.videoUrl} 
                            className="w-full h-full object-contain" 
                            controls
                          ></video>
                        </div>
                      </div>
                    )}
                    
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Request Access</h3>
                      <p className="text-gray-600 mb-4">
                        Interested in editing this project? Send a message to the creator to request access.
                        Once approved, you'll be able to start editing.
                      </p>
                      
                      {isProjectRequested(selectedProject._id) ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 flex items-center">
                          <svg className="h-5 w-5 text-blue-600 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <p className="font-medium text-blue-800">Request Already Sent</p>
                            <p className="text-sm text-blue-700 mt-1">Your request is pending approval from the creator. You'll be notified when they respond.</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <textarea
                            id="accessRequestMessage"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                            rows={3}
                            placeholder="Introduce yourself and explain why you'd be a good fit for this project..."
                            disabled={requestingAccess}
                          ></textarea>
                          
                          <button
                            onClick={() => handleRequestAccess(selectedProject._id)}
                            disabled={requestingAccess}
                            className={`mt-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                              requestingAccess 
                                ? 'bg-purple-400 cursor-not-allowed' 
                                : 'bg-purple-600 hover:bg-purple-700'
                            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500`}
                          >
                            {requestingAccess ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Sending Request...
                              </>
                            ) : (
                              'Request to Edit This Project'
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-3">Project Details</h3>
                      <dl className="space-y-2">
                        <div className="grid grid-cols-3 gap-1">
                          <dt className="text-sm font-medium text-gray-500">Creator:</dt>
                          <dd className="text-sm text-gray-900 col-span-2 truncate">
                            {selectedProject.userCreated ? (
                              <span>{selectedProject.userCreated}</span>
                            ) : selectedProject.creatorEmail ? (
                              <span>
                                {selectedProject.creatorName || selectedProject.creatorEmail}
                              </span>
                            ) : (
                              <span>Unknown Creator</span>
                            )}
                          </dd>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <dt className="text-sm font-medium text-gray-500">Status:</dt>
                          <dd className="text-sm text-gray-900 col-span-2">Unassigned</dd>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <dt className="text-sm font-medium text-gray-500">Posted:</dt>
                          <dd className="text-sm text-gray-900 col-span-2">{formatDate(selectedProject.createdAt)}</dd>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <dt className="text-sm font-medium text-gray-500">Deadline:</dt>
                          <dd className="text-sm text-gray-900 col-span-2">
                            {formatDate(selectedProject.deadline)}
                          </dd>
                        </div>
                      </dl>
                    </div>
                    
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <h3 className="font-medium text-yellow-800 mb-2">How It Works</h3>
                      <ul className="space-y-2 text-sm text-yellow-700">
                        <li className="flex items-start">
                          <svg className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                          </svg>
                          <span>Request access to this project</span>
                        </li>
                        <li className="flex items-start">
                          <svg className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                          </svg>
                          <span>Creator reviews your profile</span>
                        </li>
                        <li className="flex items-start">
                          <svg className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 01-1.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>If approved, you can start editing!</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-wrap justify-end gap-3">
                <button
                  onClick={closeProjectDetails}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Close
                </button>
                
                {!isProjectRequested(selectedProject._id) ? (
                  <button
                    onClick={() => handleRequestAccess(selectedProject._id)}
                    disabled={requestingAccess}
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                      requestingAccess 
                        ? 'bg-purple-400 cursor-not-allowed' 
                        : 'bg-purple-600 hover:bg-purple-700'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500`}
                  >
                    {requestingAccess ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending Request...
                      </>
                    ) : (
                      <>
                        <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                        </svg>
                        Request Access
                      </>
                    )}
                  </button>
                ) : (
                  <div className="inline-flex items-center px-4 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-50">
                    <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    Request Pending
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditorDiscover;