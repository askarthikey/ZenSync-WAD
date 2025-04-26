import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function EditorHome() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    assignedProjects: 0,
    reviewedProjects: 0,
    pendingReviews: 0,
    completedProjects: 0
  });
  const [recentAssignments, setRecentAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [creatorFeedback, setCreatorFeedback] = useState([]);
  const [editorRatings, setEditorRatings] = useState({
    averageRating: 0,
    totalRatings: 0
  });

  useEffect(() => {
    // Get user details from local storage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        if (parsedUser.email) {
          // Fetch all data needed for the dashboard
          fetchEditorData(parsedUser.email);
        } else {
          setError('User email not found in profile');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error parsing user data:', err);
        setError('Error loading user profile');
        setIsLoading(false);
      }
    } else {
      // Redirect to login if no user data found
      navigate('/signin');
    }
  }, [navigate]);

  // Fetch all editor data
  const fetchEditorData = async (editorEmail) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get authentication token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Fetch assigned projects
      const projectsResponse = await fetch(`http://localhost:4000/projectApi/editor-projects?email=${encodeURIComponent(editorEmail)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!projectsResponse.ok) {
        throw new Error(`Failed to fetch projects: ${projectsResponse.status}`);
      }

      const projectsData = await projectsResponse.json();
      const projects = projectsData.projects || [];
      // Fetch creator feedback from the reviewCollection
      const feedbackResponse = await fetch(`http://localhost:4000/projectApi/creator-feedback-for-editor?email=${encodeURIComponent(editorEmail)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      let creatorFeedbackData = [];
      if (feedbackResponse.ok) {
        const feedbackData = await feedbackResponse.json();
        creatorFeedbackData = feedbackData.reviews || [];
        console.log("Creator feedback data:", creatorFeedbackData);
      } else {
        console.error("Failed to fetch creator feedback:", feedbackResponse.status);
      }

      // Process creator feedback with project information
      const processedCreatorFeedback = creatorFeedbackData
        .filter(feedback => feedback && feedback._id) // Filter out any undefined or missing ID items
        .map(feedback => {
          // For MongoDB ObjectId comparison, convert to string if needed
          const projectId = typeof feedback.projectId === 'string' ? feedback.projectId : feedback.projectId?.toString();
          
          // Find matching project for additional details
          const relatedProject = projects.find(p => {
            const pId = typeof p._id === 'string' ? p._id : p._id?.toString();
            return pId === projectId;
          });
          
          return {
            id: feedback._id,
            projectId: projectId, // Store this as string to ensure proper navigation
            title: relatedProject?.title || "Unknown Project",
            creator: feedback.creatorUsername || "Project Creator",
            reviewedOn: feedback.createdAt || new Date().toISOString(),
            comment: feedback.comment || "",
            status: relatedProject?.status || "In Progress",
            rating: feedback.rating || 0
          };
        });

      // Additional validation before setting state
      const validFeedback = processedCreatorFeedback.filter(item => 
        item && item.id && item.projectId && item.title
      );

      console.log("Processed creator feedback:", validFeedback);

      // Sort by date (newest to oldest)
      validFeedback.sort((a, b) => new Date(b.reviewedOn) - new Date(a.reviewedOn));

      // Update the state with the first 5 valid items
      setCreatorFeedback(validFeedback.slice(0, 5));

      // Calculate statistics
      const closedProjects = projects.filter(p => p.status === 'Closed');
      const pendingReviewProjects = projects.filter(p => p.status === 'In Progress' || p.status === 'Completed' || p.feedback);
      const inProgressProjects = projects.filter(p => 
        p.status === 'In Progress' || 
        p.status.includes('Just started') || 
        p.status.includes('Good progress') || 
        p.status.includes('Almost there')
      );

      // Set statistics
      setStats({
        assignedProjects: projects.length,
        reviewedProjects: closedProjects.length,
        pendingReviews: pendingReviewProjects.length,
        inProgress: inProgressProjects.length
      });

      // Set recent assignments (most recently assigned first)
      const sortedByAssignedDate = [...projects].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      ).slice(0, 3);
      
      setRecentAssignments(sortedByAssignedDate.map(project => ({
        id: project._id,
        title: project.title,
        creator: project.userCreated || 'Unknown Creator',
        assignedDate: project.createdAt,
        deadline: project.deadline,
        status: project.status, // Add status property
        priority: getDaysRemaining(project.deadline) <= 10 ? 'High' : 
                 getDaysRemaining(project.deadline) <= 30 ? 'Medium' : 'Low'
      })));

      // Calculate upcoming deadlines
      const upcomingProjects = [...projects]
        .filter(p => (p.status !== 'Completed' && p.status !== 'Closed') && getDaysRemaining(p.deadline) >= 0)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 3);
      
      setUpcomingDeadlines(upcomingProjects.map(project => ({
        id: project._id,
        title: project.title,
        deadline: project.deadline,
        priority: getDaysRemaining(project.deadline) <= 10 ? 'High' : 
                 getDaysRemaining(project.deadline) <= 30 ? 'Medium' : 'Low',
        daysRemaining: getDaysRemaining(project.deadline)
      })));

      // Fetch editor ratings from usersCollection
      const userRatingsResponse = await fetch(`http://localhost:4000/userApi/editor-ratings?email=${encodeURIComponent(editorEmail)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (userRatingsResponse.ok) {
        const userData = await userRatingsResponse.json();
        
        // Extract rating data from response
        setEditorRatings({
          averageRating: userData.averageRating || 0,
          totalRatings: userData.totalRatings || 0
        });
        
        console.log("Editor ratings data:", userData);
      } else {
        console.error("Failed to fetch editor ratings:", userRatingsResponse.status);
        // Fallback to project-based ratings if user ratings fail
      }

    } catch (error) {
      console.error('Error fetching editor data:', error);
      setError(error.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to calculate days remaining until deadline
  const getDaysRemaining = (deadline) => {
    if (!deadline) return 0;
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const timeDiff = deadlineDate - today;
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  };

  // Format date in a readable format
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
              <p className="mt-2 text-sm text-red-700">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 text-sm font-medium text-red-800 hover:text-red-600"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* Editor Dashboard Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg shadow-lg mb-8">
        <div className="px-6 py-8 sm:px-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-4 md:mb-0">
              <h1 className="text-3xl font-bold text-white">
                Editor Dashboard
              </h1>
              <p className="mt-1 text-blue-100">
                Welcome back, {user?.fullName || user?.username}
              </p>
            </div>
            <div className="flex space-x-3">
              <Link to="/editor-projects" className="bg-white text-indigo-700 px-4 py-2 rounded-md shadow hover:bg-blue-50 transition-colors flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                My Projects
              </Link>
              <Link to="/editor-discover" className="bg-blue-800 text-white px-4 py-2 rounded-md shadow hover:bg-blue-900 transition-colors flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Discover Projects
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase">Assigned Projects</p>
              <p className="text-gray-800 text-2xl font-bold">{stats.assignedProjects}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-green-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase">Reviewed Projects</p>
              <p className="text-gray-800 text-2xl font-bold">{stats.reviewedProjects}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-yellow-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase">Pending Reviews</p>
              <p className="text-gray-800 text-2xl font-bold">{stats.pendingReviews}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase">In Progress</p>
              <p className="text-gray-800 text-2xl font-bold">{stats.inProgress}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recently Assigned Projects */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-5 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Recently Assigned Projects</h2>
                <Link to="/editor-projects" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                  View all
                </Link>
              </div>
            </div>
            <div className="px-6 py-5">
              {recentAssignments.length > 0 ? (
                <div className="flow-root">
                  <ul className="divide-y divide-gray-200">
                    {recentAssignments.map(project => (
                      <li key={project.id} className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 rounded-md bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                                {project.title.charAt(0)}
                              </div>
                            </div>
                            <div className="ml-4">
                              <h3 className="text-base font-medium text-gray-800">{project.title}</h3>
                              <p className="text-sm text-gray-500">By {project.creator}</p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <div className="text-right mr-4">
                              <p className="text-sm text-gray-500">Due</p>
                              <p className="text-sm font-medium text-gray-900">{formatDate(project.deadline)}</p>
                            </div>
                            {project.status === 'Completed' || project.status === 'Closed' ? (
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium 
                                ${project.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                                'bg-blue-100 text-blue-800'}`}>
                                {project.status}
                              </span>
                            ) : (
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium 
                                ${project.priority === 'High' ? 'bg-red-100 text-red-800' : 
                                project.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-green-100 text-green-800'}`}>
                                {project.priority}
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-center py-6">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No recent assignments</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by checking out available projects.</p>
                  <div className="mt-6">
                    <Link to="/editor-projects" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                      <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                      Assigned Projects
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Creator Feedback on Your Work */}
          <div className="bg-white rounded-lg shadow-md mt-8 overflow-hidden transform transition-all duration-300 hover:shadow-lg">
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-inner mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Creator Feedback on Your Work</h2>
                    <p className="text-xs text-gray-500 mt-0.5">See what content creators think about your edits</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-5 bg-gradient-to-b from-white to-gray-50">
              {creatorFeedback.length > 0 ? (
                <div className="flow-root">
                  <div className="relative">
                    {/* Enhanced timeline line with animation */}
                    <div className="absolute left-8 top-0 h-full w-0.5 bg-gradient-to-b from-purple-100 via-purple-300 to-purple-100">
                      <div className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-b from-purple-400 to-purple-100 animate-pulse opacity-50"></div>
                    </div>
                    
                    <ul className="relative space-y-8">
                      {creatorFeedback
                        .filter(feedback => feedback && feedback.id)
                        .map((feedback) => {
                          const commentWords = feedback.comment?.split(' ').length || 0;
                          // Determine the status style
                          const statusStyles = {
                            'Closed': 'bg-green-100 text-green-800 border-green-200',
                            'In Review': 'bg-yellow-100 text-yellow-800 border-yellow-200',
                            'In Progress': 'bg-blue-100 text-blue-800 border-blue-200',
                            'default': 'bg-purple-100 text-purple-800 border-purple-200'
                          };
                          const statusStyle = statusStyles[feedback.status] || statusStyles.default;
                          
                          return (
                            <li 
                              key={feedback.id} 
                              className="relative ml-10" // Removed animation classes
                            >
                              {/* Enhanced interactive Timeline dot */}
                              <div 
                                className="absolute -left-14 w-9 h-9 rounded-full flex items-center justify-center 
                                  transition-all duration-300 hover:scale-110 cursor-pointer shadow
                                  bg-gradient-to-br from-purple-500 to-indigo-600 text-white"
                                title="Creator Feedback"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                                </svg>
                              </div>
                              
                              {/* Enhanced feedback card with hover effect and time badge */}
                              <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 relative group">
                                {/* Time badge with tooltip */}
                                <div 
                                  className="absolute -top-3 right-3 px-3 py-1 rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 
                                    text-xs font-medium text-purple-800 shadow-sm hover:shadow transition-all duration-200 hover:scale-105"
                                  title={`Received on ${formatDate(feedback.reviewedOn)}`}
                                >
                                  {new Date(feedback.reviewedOn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                                
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="text-base font-bold text-gray-900 truncate max-w-[70%] group-hover:text-purple-700 transition-colors">
                                    {feedback.title || "Untitled Project"}
                                  </h3>
                                  <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
                                    {formatDate(feedback.reviewedOn)}
                                  </span>
                                </div>
                                
                                {/* Creator info with avatar */}
                                <div className="flex items-center mt-1 mb-3">
                                  <div className="h-6 w-6 rounded-full bg-gradient-to-r from-purple-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                                    {feedback.creator && feedback.creator.charAt(0).toUpperCase() || "C"}
                                  </div>
                                  <p className="text-sm text-gray-600 ml-2">From <span className="font-semibold">{feedback.creator || "Creator"}</span></p>
                                </div>
                                
                                {/* Comment with enhanced visual decoration */}
                                <div className="mt-3">
                                  <div className="flex flex-wrap gap-1.5 items-center mb-2">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle}`}>
                                      {feedback.status === 'Closed' ? 'Approved' : feedback.status || 'In Progress'}
                                    </span>
                                    
                                    <div className="flex items-center text-purple-500 ml-1">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
                                      </svg>
                                      <span className="text-xs font-medium ml-1 text-gray-500">
                                        {commentWords} {commentWords === 1 ? 'word' : 'words'}
                                      </span>
                                    </div>
                                    
                                    {/* Rating display with stars if available */}
                                    {feedback.rating > 0 && (
                                      <div className="flex items-center ml-1 bg-amber-50 px-2 py-0.5 rounded-full">
                                        <svg className="h-3.5 w-3.5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                        <span className="text-xs font-medium text-amber-700 ml-1">{feedback.rating.toFixed(1)}</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Comment box with enhanced styling */}
                                  <div className="p-3 rounded-md text-sm text-gray-700 border-l-2 transition-colors
                                    bg-gradient-to-r from-purple-50 to-indigo-50 border-l-purple-400 group-hover:border-l-purple-600">
                                    <p className="line-clamp-3 italic">"{feedback.comment || 'No comment provided.'}"</p>
                                  </div>
                                </div>
                                
                                {/* Improved action button */}
                                <div className="mt-4 flex items-center justify-end">
                                  <Link 
                                    to={`/editor-projects?id=${String(feedback.projectId)}&action=open`} 
                                    className="inline-flex items-center px-3.5 py-2 border border-transparent
                                      bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-medium rounded-md
                                      shadow-sm hover:from-purple-700 hover:to-indigo-700 hover:shadow transition-all duration-200">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                    </svg>
                                    View Project
                                  </Link>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 px-4">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full 
                    flex items-center justify-center mb-4 shadow-inner">
                    <svg className="h-10 w-10 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">No feedback yet</h3>
                  <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
                    When content creators review your edited work, their feedback will appear here to help you improve.
                  </p>
                  <div className="mt-6">
                    <Link to="/editor-projects" 
                      className="inline-flex items-center px-5 py-2.5 border border-transparent rounded-md shadow-sm 
                        text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600
                        hover:from-purple-700 hover:to-indigo-700 transition-all duration-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      View My Projects
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side - Performance and Schedule */}
        <div>
          {/* Performance / Ratings */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Editing Performance</h2>
            </div>
            <div className="p-6">
              <div className="text-center">
                <div className="text-5xl font-bold text-gray-800">
                  {editorRatings.averageRating > 0 
                    ? editorRatings.averageRating.toFixed(1)
                    : "0.0"}
                </div>
                <div className="text-sm text-gray-500 mt-1">Average Rating</div>
                <div className="flex items-center justify-center mt-3 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg 
                      key={star}
                      className={`h-6 w-6 ${star <= Math.round(editorRatings.averageRating) ? 'text-yellow-400' : 'text-gray-300'}`}
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                
                {/* Rating count card */}
                <div className="mt-4 py-4 px-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 shadow-sm">
                  <div className="flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <div className="text-left">
                      <p className="text-xl font-bold text-gray-900">
                        <span className="text-blue-600">{editorRatings.totalRatings}</span> <span className="text-sm font-normal text-gray-600">Rating{editorRatings.totalRatings !== 1 ? 's' : ''} received</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Based on creator feedback</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Upcoming Schedule */}
          <div className="bg-white rounded-lg shadow mt-8">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Upcoming Deadlines</h2>
            </div>
            <div className="px-6 py-5">
              {upcomingDeadlines.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {upcomingDeadlines.map(project => (
                    <li key={project.id} className="py-3">
                      <div className="flex justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{project.title}</p>
                          <p className="text-xs text-gray-500">{project.priority} Priority</p>
                        </div>
                        <p className={`text-sm font-medium ${
                          project.daysRemaining === 0 ? 'text-red-600' : 
                          project.daysRemaining <= 3 ? 'text-orange-600' :
                          'text-gray-600'
                        }`}>
                          {project.daysRemaining === 0 ? 'Due Today' : 
                           `In ${project.daysRemaining} days`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">No upcoming deadlines.</p>
                </div>
              )}
            </div>
            {upcomingDeadlines.length > 0 && (
              <div className="px-6 py-3 bg-gray-50 rounded-b-lg">
                <Link to="/editor-projects" className="text-sm font-medium text-blue-600 hover:text-blue-500 flex justify-center">
                  View full schedule
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l-4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditorHome;
