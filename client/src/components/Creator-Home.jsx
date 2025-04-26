import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function CreatorHome() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 0,
    inProgressProjects: 0,
    closedProjects:0,
    completedProjects: 0,
    inReviewProjects: 0
  });
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [error, setError] = useState(null);
  const [tips, ] = useState([
    "Use active voice whenever possible. It makes your writing clearer, stronger, and more engaging for readers.",
    "Break up long paragraphs. Shorter paragraphs improve readability and keep readers engaged.",
    "Read your content out loud. This helps identify awkward phrasing and improves flow.",
    "Use specific examples to illustrate your points. Concrete details are more memorable than abstractions.",
    "Edit ruthlessly. Cut any words, sentences, or paragraphs that don't add value.",
    "Focus on one main idea per paragraph to maintain clarity and structure."
  ]);
  
  useEffect(() => {
    // Get user details from local storage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        if (parsedUser.email) {
          fetchCreatorData(parsedUser.email);
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
  
  const fetchCreatorData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get authentication token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Get username from localStorage to avoid dependency on state
      const userData = JSON.parse(localStorage.getItem('user'));
      const username = userData?.username;
      
      if (!username) {
        throw new Error('Username not found');
      }
      
      // Use username from local storage, not from state
      const projectsResponse = await fetch(`http://localhost:4000/projectApi/projects/creator/${username}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!projectsResponse.ok) {
        throw new Error(`Failed to fetch projects: ${projectsResponse.status}`);
      }
      
      const projectsData = await projectsResponse.json();
      const fetchedProjects = projectsData.projects || [];
      
      // Process and categorize projects
      const completedProjects = fetchedProjects.filter(p => p.status === 'Completed');
      const closedProjects = fetchedProjects.filter(p => p.status === 'Closed');
      const inProgressProjects = fetchedProjects.filter(p => 
        p.status === 'In Progress' || 
        p.status === 'Almost there' || 
        p.status === 'Good progress' || 
        p.status === 'Just started'
      );
      const inReviewProjects = fetchedProjects.filter(p => p.status === 'In Review');
      
      // Set project statistics
      setStats({
        totalProjects: fetchedProjects.length,
        inProgressProjects: inProgressProjects.length,
        closedProjects: closedProjects.length,
        completedProjects: completedProjects.length,
        inReviewProjects: inReviewProjects.length
      });
      
      // Format projects for display
      const formattedProjects = fetchedProjects.slice(0, 5).map(project => ({
        id: project._id,
        title: project.title,
        status: project.status || 'Draft',
        dueDate: project.deadline,
        editor: project.editorName || project.editorEmail || 'Not assigned', // Handle empty editor email
        progress: calculateProgress(project)
      }));
      
      setProjects(formattedProjects);
      
      // Calculate upcoming deadlines
      const upcomingProjects = fetchedProjects
        .filter(p => 
          p.status !== 'Completed' && 
          p.status !== 'Closed' && 
          p.deadline && 
          new Date(p.deadline) >= new Date()
        )
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 3);
        
      const formattedDeadlines = upcomingProjects.map(project => ({
        id: project._id,
        title: project.title,
        deadline: project.deadline,
        daysRemaining: getDaysRemaining(project.deadline)
      }));
      
      setUpcomingDeadlines(formattedDeadlines);
      
    } catch (error) {
      console.error('Error fetching creator data:', error);
      setError(error.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to calculate project progress
  const calculateProgress = (project) => {
    if (project.status === 'Completed') return 100;
    if (project.completionPercentage) return project.completionPercentage;
    
    // Estimate based on status
    switch (project.status) {
      case 'In Review': return 90;
      case 'Almost there': return 75;
      case 'Good progress': return 50;
      case 'Just started': return 25;
      case 'In Progress': return 40;
      default: return 10;
    }
  };
  
  // Calculate days remaining until deadline
  const getDaysRemaining = (deadline) => {
    if (!deadline) return null;
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const timeDiff = deadlineDate - today;
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  };
  
  // Format date as a string
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Get deadline text
  const getDeadlineText = (daysRemaining) => {
    if (daysRemaining === 0) return 'Today';
    if (daysRemaining === 1) return 'Tomorrow';
    return `In ${daysRemaining} days`;
  };
  
  // Random writing tip
  const getRandomTip = () => {
    const randomIndex = Math.floor(Math.random() * tips.length);
    return tips[randomIndex];
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
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
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
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
      {/* Creator Dashboard Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-lg shadow-lg mb-8">
        <div className="px-6 py-8 sm:px-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-4 md:mb-0">
              <h1 className="text-3xl font-bold text-white">
                Content Creator Dashboard
              </h1>
              <p className="mt-1 text-purple-100">
                Welcome back, {user?.fullName || user?.username}
              </p>
            </div>
            <div className="flex space-x-3">
              <Link to="/creator-projects" className="bg-white text-indigo-700 px-4 py-2 rounded-md shadow hover:bg-blue-50 transition-colors flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                New Content
              </Link>
              <Link to="/creator-display" className="bg-purple-800 text-white px-4 py-2 rounded-md shadow hover:bg-purple-900 transition-colors flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                </svg>
                My Projects
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Project Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-purple-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase">Total Projects</p>
              <p className="text-gray-800 text-2xl font-bold">{stats.totalProjects}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase">In Progress</p>
              <p className="text-gray-800 text-2xl font-bold">{stats.totalProjects-stats.completedProjects-stats.closedProjects}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-yellow-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase">Closed</p>
              <p className="text-gray-800 text-2xl font-bold">{stats.closedProjects}</p>
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
              <p className="text-gray-500 text-sm font-medium uppercase">Completed</p>
              <p className="text-gray-800 text-2xl font-bold">{stats.completedProjects}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Project Status */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-5 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">My Projects</h2>
                <Link to="/creator-display" className="text-sm font-medium text-purple-600 hover:text-purple-500">
                  View all projects
                </Link>
              </div>
            </div>
            <div className="overflow-hidden">
              {projects.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Editor</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {projects.map((project) => (
                      <tr key={project.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{project.title}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                            ${project.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                              project.status === 'In Review' ? 'bg-yellow-100 text-yellow-800' : 
                              project.status === 'In Progress' || 
                              project.status === 'Almost there' || 
                              project.status === 'Good progress' || 
                              project.status === 'Just started' ? 'bg-blue-100 text-blue-800' : 
                              'bg-gray-100 text-gray-800'}`}>
                            {project.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {project.status === 'Completed' ? (
                            <span className="text-green-600 font-medium">Completed</span>
                          ) : project.status === 'Closed' ? (
                            <span className="text-blue-600 font-medium">Closed</span>
                          ) : (
                            project.dueDate ? formatDate(project.dueDate) : 'No deadline'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {project.editor}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className={`h-2.5 rounded-full ${
                                project.progress >= 100 ? 'bg-green-600' :
                                project.progress >= 60 ? 'bg-blue-600' :
                                project.progress >= 30 ? 'bg-yellow-600' : 'bg-red-600'
                              }`}
                              style={{ width: `${project.progress}%` }}>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{project.progress}% complete</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No projects yet</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating a new project.</p>
                  <div className="mt-6">
                    <Link to="/creator-projects" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700">
                      <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Create new project
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Project Timeline */}
          <div className="bg-white rounded-lg shadow mt-8">
            <div className="px-6 py-5 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Project Timeline</h2>
              </div>
            </div>
            <div className="p-6">
              {projects.length > 0 ? (
                <div className="space-y-6">
                  {/* Projects grouped by status */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Current Month</h3>
                    <div className="relative">
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200 ml-3"></div>
                      <ul className="space-y-4">
                        {projects.map(project => (
                          <li key={project.id} className="relative pl-10">
                            <div className="flex items-center mb-1">
                              <div className={`absolute left-0 w-7 h-7 rounded-full flex items-center justify-center
                                ${project.status === 'Completed' ? 'bg-green-100 text-green-600' : 
                                  project.status === 'In Review' ? 'bg-yellow-100 text-yellow-600' : 
                                  project.status.includes('Progress') ? 'bg-blue-100 text-blue-600' :
                                  'bg-gray-100 text-gray-600'}`}>
                                {project.status === 'Completed' ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                ) : project.status === 'In Review' ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <h4 className="text-base font-medium text-gray-900">{project.title}</h4>
                              <div className="ml-auto flex items-center">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium
                                  ${project.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                                    project.status === 'In Review' ? 'bg-yellow-100 text-yellow-800' : 
                                    project.status.includes('Progress') ? 'bg-blue-100 text-blue-800' : 
                                    'bg-gray-100 text-gray-800'}`}>
                                  {project.status}
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between text-sm text-gray-500">
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                                {project.editor}
                              </div>
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                </svg>
                                {project.dueDate ? formatDate(project.dueDate) : 'No deadline'}
                              </div>
                            </div>
                            <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${
                                project.progress >= 100 ? 'bg-green-500' :
                                project.progress >= 60 ? 'bg-blue-500' :
                                project.progress >= 30 ? 'bg-yellow-500' : 'bg-red-500'
                              }`} style={{ width: `${project.progress}%` }}></div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {/* </div> */}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500">No projects to display in timeline.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side - Recent Reviews and Calendar */}
        <div>
          {/* Your Editors */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Your Editors</h2>
            </div>
            <div className="px-6 py-5">
              {projects.some(p => p.editor && p.editor !== 'Not assigned' && p.editor !== '' && p.editor !== 'Unknown Editor') ? (
                <div className="space-y-4">
                  {/* Extract unique editors with improved filtering */}
                  {Array.from(
                    new Set(
                      projects
                        .filter(p => p.editor && p.editor !== 'Not assigned' && p.editor !== '' && p.editor !== 'Unknown Editor')
                        .map(p => p.editor)
                    )
                  ).map((editorName, index) => {
                    // Get all projects for this editor
                    const editorProjects = projects.filter(p => p.editor === editorName);
                    const completedCount = editorProjects.filter(p => p.status === 'Completed' || p.status === "Closed").length;
                    const inProgressCount = editorProjects.filter(p => p.status !== 'Completed' && p.status !== 'Closed').length;
                    const progressPercent = editorProjects.length > 0 
                      ? Math.round((completedCount / editorProjects.length) * 100) 
                      : 0;
                    
                    return (
                      <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-medium text-lg mr-3">
                          {editorName && editorName.charAt(0) ? editorName.charAt(0).toUpperCase() : 'E'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{editorName}</p>
                          <div className="flex items-center text-xs text-gray-500">
                            <span>{editorProjects.length} project{editorProjects.length !== 1 ? 's' : ''}</span>
                            <span className="mx-1">•</span>
                            <span>{completedCount} completed</span>
                            {inProgressCount > 0 && (
                              <>
                                <span className="mx-1">•</span>
                                <span>{inProgressCount} in progress</span>
                              </>
                            )}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5">
                            <div 
                              className={`h-1.5 rounded-full ${
                                progressPercent === 100 ? 'bg-green-500' : 'bg-indigo-500'
                              }`}
                              style={{ width: `${progressPercent}%` }}>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="mt-4">
                    <Link to="/creator-projects" className="text-sm text-purple-600 hover:text-purple-500 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Assign a new project
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No editors assigned</h3>
                  <p className="mt-1 text-sm text-gray-500">Assign editors to your projects to see them here.</p>
                  <div className="mt-4">
                    <Link to="/creator-projects" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700">
                      <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Create a new project
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Upcoming Deadlines */}
          <div className="bg-white rounded-lg shadow mt-8">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Upcoming Deadlines</h2>
            </div>
            <div className="px-6 py-5">
              {upcomingDeadlines.length > 0 ? (
                <div className="flow-root">
                  <ul className="divide-y divide-gray-200">
                    {upcomingDeadlines.map(project => (
                      <li key={project.id} className="py-3">
                        <div className="flex justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{project.title}</p>
                          </div>
                          <p className={`text-sm font-medium ${
                            project.daysRemaining === 0 ? 'text-red-600' : 
                            project.daysRemaining <= 2 ? 'text-red-600' :
                            project.daysRemaining <= 5 ? 'text-orange-600' :
                            'text-gray-600'
                          }`}>
                            {getDeadlineText(project.daysRemaining)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">No upcoming deadlines.</p>
                </div>
              )}
            </div>
            {upcomingDeadlines.length > 0 && (
              <div className="px-6 py-3 bg-gray-50 rounded-b-lg">
                <Link to="/creator-display" className="text-sm font-medium text-purple-600 hover:text-purple-500 flex justify-center">
                  View all deadlines
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
          
          {/* Writing Tips */}
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow mt-8 text-white p-6">
            <h3 className="font-medium text-lg mb-3">Writing Tip of the Day</h3>
            <p className="text-purple-100 mb-4">
              "{getRandomTip()}"
            </p>
            <a href="https://www.grammarly.com/blog/category/writing-tips/" target="_blank" rel="noopener noreferrer" className="text-sm text-white hover:text-purple-200 flex items-center mt-2">
              More writing tips
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreatorHome;