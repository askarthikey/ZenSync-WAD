import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function CreatorProjectDisplay() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [statsData, setStatsData] = useState({
    total: 0,
    draft: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0
  });
  const [editFormData, setEditFormData] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewData, setReviewData] = useState({
    projectId: null,
    comment: ''
  });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [closingProject, setClosingProject] = useState(false);
  const [, setCloseError] = useState(null);
  const [videoResponses, setVideoResponses] = useState([]);
  const [, setActiveVideoResponse] = useState(0);
  const [loadingResponses, setLoadingResponses] = useState(false);

  // Add these state variables in your CreatorProjectDisplay function
  const [reviews, setReviews] = useState([]);

  // Keep the existing rating variables, but rename for clarity
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingData, setRatingData] = useState({
    rating: 5,
    comments: '',
    projectId: null,
    editorEmail: null
  });
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState(null);

  // Add these state variables
  const [editCommentModalOpen, setEditCommentModalOpen] = useState(false);
  const [editCommentData, setEditCommentData] = useState({
    reviewId: null,
    comment: '' // Ensure comment is initialized with empty string
  });
  const [editingComment, setEditingComment] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [deletingComment, setDeletingComment] = useState(false);

  // Add this function with your other functions
  const fetchVideoResponses = async (projectId) => {
    setLoadingResponses(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:4000/projectApi/project-responses/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch video responses');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setVideoResponses(data.responses || []);
        setActiveVideoResponse(data.responses && data.responses.length > 0 ? 0 : -1);
      } else {
        setVideoResponses([]);
      }
    } catch (err) {
      console.error('Error fetching video responses:', err);
      setVideoResponses([]);
    } finally {
      setLoadingResponses(false);
    }
  };

  // Add this function to fetch project reviews
  const fetchProjectReviews = async (projectId) => {
    try {
      const token = localStorage.getItem('token');
      
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
      } else {
        setReviews([]);
      }
    } catch (err) {
      console.error('Error fetching project reviews:', err);
      setReviews([]);
    }
  };

  // Function to handle opening the edit comment modal
  const handleOpenEditComment = (review) => {
    if (!review) return; // Guard clause if review is undefined
    
    setEditCommentData({
      reviewId: review._id || null,
      comment: review.comment || '' // Provide a fallback when comment is undefined
    });
    setEditCommentModalOpen(true);
  };

  // Function to handle updating a comment
  const handleUpdateComment = async (e) => {
    e.preventDefault();
    if (editingComment) return;
    
    setEditingComment(true);
    setReviewError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:4000/projectApi/update-review/${editCommentData.reviewId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          comment: editCommentData?.comment || '' // Added fallback
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to update comment");
      }
      
      // Close the edit modal
      setEditCommentModalOpen(false);
      
      // Reset the form
      setEditCommentData({
        reviewId: null,
        comment: ''
      });
      
      // Refresh reviews for this project
      fetchProjectReviews(selectedProject._id);
      
    } catch (error) {
      console.error("Error updating comment:", error);
      setReviewError(error.message || "An error occurred while updating your comment");
    } finally {
      setEditingComment(false);
    }
  };

  // Function to open delete confirmation
  const handleConfirmDelete = (reviewId) => {
    setCommentToDelete(reviewId);
    setDeleteConfirmOpen(true);
  };

  // Function to delete a comment
  const handleDeleteComment = async () => {
    if (deletingComment || !commentToDelete) return;
    
    setDeletingComment(true);
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:4000/projectApi/delete-review/${commentToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete comment");
      }
      
      // Close the confirmation dialog
      setDeleteConfirmOpen(false);
      setCommentToDelete(null);
      
      // Refresh reviews for this project
      fetchProjectReviews(selectedProject._id);
      
    } catch (error) {
      console.error("Error deleting comment:", error);
      // Could add error handling UI here
    } finally {
      setDeletingComment(false);
    }
  };

  // Handle input changes in edit form
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: value
    });
  };

  // Handle form submission for project update
  const handleUpdateProject = async (e) => {
    e.preventDefault();
    
    setUpdateLoading(true);
    setUpdateError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      // Process tags from comma-separated string to array
      const tagsArray = editFormData.tags.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      
      // Prepare data for API
      const updatedData = {
        ...editFormData,
        tags: tagsArray
      };
      
      // Get the project ID
      const projectId = selectedProject ? selectedProject._id : projects.find(p => p.title === editFormData.title)?._id;
      
      if (!projectId) {
        throw new Error("Could not determine project ID");
      }
      
      const response = await fetch(`http://localhost:4000/projectApi/project/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedData)
      });
      
      if (!response.ok) {
        throw new Error("Failed to update project");
      }
      
      // Close the edit modal
      setEditModalOpen(false);
      
      // Refresh projects list
      if (user) {
        fetchProjects(user.username);
      }
      
    } catch (error) {
      console.error("Error updating project:", error);
      setUpdateError(error.message || "An error occurred while updating the project");
    } finally {
      setUpdateLoading(false);
    }
  };

  // Function to open the review modal
  const handleOpenReviewModal = () => {
    setReviewData({
      projectId: selectedProject._id,
      comment: ''
    });
    setReviewModalOpen(true);
  };

  // Rename the existing handleSubmitReview to handleSubmitRating
  const handleSubmitRating = async (e) => {
    e.preventDefault();
    if (ratingSubmitting) return;
    
    setRatingSubmitting(true);
    setRatingError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:4000/reviewApi/submit-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId: ratingData.projectId,
          editorEmail: ratingData.editorEmail,
          rating: ratingData.rating,
          comments: ratingData.comments,
          creatorUsername: user.username,
          closeProject: false // Don't close the project automatically
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to submit rating");
      }
      
      // Close the rating modal but keep project details open
      setRatingModalOpen(false);
      
      // Mark the project as rated in the UI
      if (selectedProject && selectedProject._id === ratingData.projectId) {
        setSelectedProject({
          ...selectedProject,
          hasRated: true
        });
      }
      
      // Refresh projects data with a slight delay
      setTimeout(() => {
        if (user) {
          fetchProjects(user.username);
        }
      }, 300);
      
    } catch (error) {
      console.error("Error submitting rating:", error);
      setRatingError(error.message || "An error occurred while submitting your rating");
    } finally {
      setRatingSubmitting(false);
    }
  };

  // Function to submit a review comment
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (submittingReview) return;
    
    setSubmittingReview(true);
    setReviewError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:4000/projectApi/add-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId: reviewData.projectId,
          comment: reviewData.comment,
          creatorUsername: user.username
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to submit comment");
      }
      
      // Close the review modal
      setReviewModalOpen(false);
      
      // Reset the form
      setReviewData({
        projectId: null,
        comment: ''
      });
      
      // Refresh reviews for this project
      fetchProjectReviews(selectedProject._id);
      
    } catch (error) {
      console.error("Error submitting comment:", error);
      setReviewError(error.message || "An error occurred while submitting your comment");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Function to open the rating modal
  const handleOpenRatingModal = (projectId, editorEmail) => {
    setRatingData({
      rating: 5,
      comments: '',
      projectId: projectId,
      editorEmail: editorEmail
    });
    setRatingModalOpen(true);
  };

  // Handle closing a project without rating
  const handleCloseProject = async (projectId) => {
    if (closingProject) return;

    setClosingProject(true);

    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`http://localhost:4000/projectApi/close-project/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to close project");
      }

      // Update the selectedProject status to 'Closed' and mark as closed in the projects list
      setSelectedProject(prev =>
        prev && prev._id === projectId
          ? { ...prev, status: 'Closed' }
          : prev
      );
      setProjects(prev =>
        prev.map(p =>
          p._id === projectId ? { ...p, status: 'Closed' } : p
        )
      );

    } catch (error) {
      console.error("Error closing project:", error);
      setCloseError(error.message || "An error occurred while closing the project");
    } finally {
      setClosingProject(false);
    }
  };

  // Load user data and fetch projects
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      fetchProjects(parsedUser.username);
    } else {
      navigate('/signin');
    }
  }, [navigate]);

  // Fetch projects from API
  const fetchProjects = async (username) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/projectApi/user-projects?username=${username}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();
      
      // Process projects data
      const processedProjects = data.projects.map(async project => {
        // Calculate days remaining until deadline
        const deadlineDate = new Date(project.deadline);
        const currentDate = new Date();
        const timeDiff = deadlineDate - currentDate;
        const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        
        // Calculate if project is overdue
        const isOverdue = daysRemaining < 0 && project.status !== 'Completed';
        
        // Extract completion percentage from status if available
        let completionPercentage = 0;
        if (project.status.includes('%')) {
          // Extract percentage from status string (e.g. "In Progress - 65%")
          const percentageMatch = project.status.match(/(\d+)%/);
          if (percentageMatch && percentageMatch[1]) {
            completionPercentage = parseInt(percentageMatch[1], 10);
          }
        } else if (project.status === 'Completed' || project.status === 'Closed') {
          completionPercentage = 100;
        } else if (project.status === 'Draft') {
          completionPercentage = 0;
        }

        // Determine project priority based on deadline and status
        let priority = 'medium';
        if (isOverdue) {
          priority = 'high';
        } else if (daysRemaining <= 10 && project.status !== 'Completed') {
          priority = 'high';
        } else if (daysRemaining <= 30 && project.status !== 'Completed') {
          priority = 'medium';
        } else {
          priority = 'low';
        }
        
        // Get editor name from email if name is not available
        const editorName = project.editorName || (project.editorEmail ? project.editorEmail.split('@')[0] : 'Not assigned');

        // Get editor rating if available
        if (project.editorEmail) {
          try {
            const editorDataResponse = await fetch(`http://localhost:4000/userApi/user-by-email?email=${encodeURIComponent(project.editorEmail)}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (editorDataResponse.ok) {
              const editorData = await editorDataResponse.json();
              if (editorData.user) {
                project.editorRating = editorData.user.rating;
                project.editorTotalReviews = editorData.user.totalReviews;
              }
            }
          } catch (err) {
            console.error('Error fetching editor data:', err);
          }
        }

        // Check if the project has been rated
        try {
          if ((project.status === 'Completed' || project.status === 'Closed') && username) {
            const reviewResponse = await fetch(`http://localhost:4000/reviewApi/check-review?projectId=${project._id}&creatorUsername=${username}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (reviewResponse.ok) {
              const reviewData = await reviewResponse.json();
              project.hasRated = reviewData.hasReview;
            }
          }
        } catch (err) {
          console.error('Error checking review status:', err);
          project.hasRated = false;
        }

        return {
          ...project,
          daysRemaining,
          isOverdue,
          completionPercentage,
          priority,
          editorName
        };
      });

      const resolvedProjects = await Promise.all(processedProjects);

      // Sort projects by priority (high to low) and then by deadline (closest first)
      resolvedProjects.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.daysRemaining - b.daysRemaining;
      });

      setProjects(resolvedProjects);
      
      // Calculate stats
      const stats = {
        total: resolvedProjects.length,
        draft: resolvedProjects.filter(p => p.status === 'Draft').length,
        inProgress: resolvedProjects.filter(p => 
          p.status.includes('In Progress') || 
          p.status.includes('Just started') ||
          p.status.includes('Good progress') ||
          p.status.includes('Almost there')
        ).length,
        completed: resolvedProjects.filter(p => p.status === 'Completed').length,
        closed: resolvedProjects.filter(p => p.status === 'Closed').length,
        overdue: resolvedProjects.filter(p => p.isOverdue && p.status !== 'Completed' && p.status !== 'Closed').length,
        unassigned: resolvedProjects.filter(p => !p.editorEmail && p.status === 'Draft').length
      };

      setStatsData(stats);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError('Failed to load projects. Please try again later.');
      setIsLoading(false);
    }
  };

  // Filter projects based on active filter and search query
  const filteredProjects = projects.filter(project => {
    // Filter by status
    if (activeFilter === 'draft' && project.status !== 'Draft') return false;
    if (activeFilter === 'in-progress' && !project.status.includes('In Progress')) return false;
    if (activeFilter === 'completed' && project.status !== 'Completed') return false;
    if (activeFilter === 'closed' && project.status !== 'Closed') return false;
    if (activeFilter === 'overdue' && !project.isOverdue) return false;
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = project.title.toLowerCase().includes(query);
      const matchesDescription = project.description.toLowerCase().includes(query);
      const matchesTags = project.tags.some(tag => tag.toLowerCase().includes(query));
      const matchesEditor = project.editorName?.toLowerCase().includes(query) || 
                            project.editorEmail?.toLowerCase().includes(query);
      
      return matchesTitle || matchesDescription || matchesTags || matchesEditor;
    }
    
    return true;
  });

  // Format date to readable string
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get status badge styling based on status
  const getStatusStyles = (status) => {
    if (status === 'Draft') {
      return 'bg-gray-100 text-gray-800';
    } else if (status.includes('In Progress')) {
      return 'bg-blue-100 text-blue-700';
    } else if (status === 'Completed') {
      return 'bg-green-100 text-green-800';
    } else if (status === "Closed"){
      return 'bg-cyan-100 text-black-100'
    }
    return 'bg-gray-100 text-gray-800';
  };

  // Get priority badge styling
  const getPriorityStyles = (priority) => {
    if (priority === 'high') {
      return 'text-red-600';
    } else if (priority === 'medium') {
      return 'text-orange-500';
    }
    return 'text-green-600';
  };

  // Get deadline styling
  const getDeadlineStyles = (daysRemaining, status) => {
    if (status === 'Completed') {
      return 'text-green-600';
    } else if (daysRemaining < 0) {
      return 'text-red-600 font-medium';
    } else if (daysRemaining <= 3) {
      return 'text-orange-600 font-medium';
    }
    return 'text-gray-600';
  };

  // Handle project click to show details
  const handleProjectClick = (project) => {
    setSelectedProject(project);
    
    // Fetch video responses and reviews when opening a project
    if (project._id) {
      if (project.status === 'Completed' || project.status === 'Closed' || project.status.includes('In Progress')) {
        fetchVideoResponses(project._id);
      } else {
        setVideoResponses([]);
      }
      if(project.status !== 'Draft' || project.status !== 'Unassigned')
        fetchProjectReviews(project._id);
    }
  };

  // Handle project edit
  const handleEditProject = (projectId) => {
    // Find the project to edit
    const projectToEdit = projects.find(p => p._id === projectId);
    
    if (!projectToEdit) {
      console.error('Project not found:', projectId);
      return;
    }
    
    // Set up the form data with current project values
    setEditFormData({
      _id: projectToEdit._id,
      title: projectToEdit.title,
      description: projectToEdit.description,
      status: projectToEdit.status,
      editorEmail: projectToEdit.editorEmail || '',
      deadline: new Date(projectToEdit.deadline).toISOString().split('T')[0],
      tags: projectToEdit.tags.join(', '),
      completionPercentage: projectToEdit.completionPercentage
    });
    
    // Open the edit modal
    setEditModalOpen(true);
  };

  // Handle contacting editor via email
  const handleContactEditor = (editorEmail, projectTitle) => {
    // Check if editor email is available
    if (!editorEmail) {
      alert('No editor assigned to this project yet.');
      return;
    }
    
    // Create email subject and body
    const subject = encodeURIComponent(`Regarding Project: ${projectTitle}`);
    const body = encodeURIComponent(`Hello,\n\nI'm contacting you regarding the project "${projectTitle}" that you're editing.\n\nBest regards,\n${user?.fullName || user?.username}`);
    
    // Open email client
    window.location.href = `mailto:${editorEmail}?subject=${subject}&body=${body}`;
  };

  // Create a new project
  const handleCreateProject = () => {
    navigate('/creator-projects');
  };

  // Close project details modal
  const closeProjectDetails = () => {
    setSelectedProject(null);
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600"></div>
          <p className="mt-4 text-gray-600">Loading your projects...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 p-4 rounded-md mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading projects</h3>
              <p className="text-sm text-red-700 mt-2">{error}</p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => fetchProjects(user.username)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with stats */}
      <div className="bg-white rounded-lg shadow-lg mb-8 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 px-6 py-5">
          <div className="flex flex-col md:flex-row justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">My Projects</h1>
              <p className="mt-1 text-purple-100">Manage and track all your content projects</p>
            </div>
            <button
              onClick={handleCreateProject}
              className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-purple-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-purple-600 focus:ring-white"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              New Project
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-6 divide-x divide-gray-200">
          <div className="p-5 text-center">
            <div className="text-2xl font-bold text-gray-900">{statsData.total}</div>
            <div className="text-sm text-gray-500">Total Projects</div>
          </div>
          <div className="p-5 text-center">
            <div className="text-2xl font-bold text-gray-900">{statsData.total- statsData.closed - statsData.completed - statsData.inProgress - statsData.overdue - statsData.draft}</div>
            <div className="text-sm text-gray-500">Unassigned</div>
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
            <div className="text-2xl font-bold text-gray-600">{statsData.closed}</div>
            <div className="text-sm text-gray-500">Closed</div>
          </div>
          <div className="p-5 text-center">
            <div className="text-2xl font-bold text-red-600">{statsData.overdue}</div>
            <div className="text-sm text-gray-500">Overdue</div>
          </div>
        </div>
      </div>

      {/* Search and filters */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-center">
        <div className="flex flex-wrap space-x-2 mb-4 sm:mb-0">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-2 rounded-md text-sm font-medium mb-2 sm:mb-0 ${
              activeFilter === 'all'
                ? 'bg-purple-100 text-purple-800'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter('draft')}
            className={`px-3 py-2 rounded-md text-sm font-medium mb-2 sm:mb-0 ${
              activeFilter === 'draft'
                ? 'bg-gray-100 text-gray-800'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Draft
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
              activeFilter === 'in-progress'
                ? 'bg-blue-100 text-blue-800'
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
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      {/* Project Grid */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredProjects.map(project => (
            <div 
              key={project._id} 
              className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow duration-300 cursor-pointer"
              onClick={() => handleProjectClick(project)}
            >
              {/* Thumbnail with status overlay */}
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
                    <span className={`text-xs ${getPriorityStyles(project.priority)} font-medium`}>
                      {project.priority === 'high' ? 'High Priority' : 
                       project.priority === 'medium' ? 'Medium Priority' : 'Low Priority'}
                    </span>
                  </div>
                </div>
                
                {/* Progress bar overlay at the bottom of the thumbnail */}
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
              
              {/* Content */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{project.title}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{project.description}</p>
                
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <p className="text-gray-500">Editor:</p>
                    <p className="font-medium truncate">
                      {project.editorName || (project.editorEmail ? project.editorEmail.split('@')[0] : 'Not assigned')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Deadline:</p>
                    <p className={`font-medium ${getDeadlineStyles(project.daysRemaining, project.status)}`}>
                      {formatDate(project.deadline)}
                    </p>
                  </div>
                </div>
                
                {/* Tags */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {project.tags.slice(0, 3).map((tag, index) => (
                    <span 
                      key={index} 
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700"
                    >
                      {tag}
                    </span>
                  ))}
                  {project.tags.length > 3 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-500">
                      +{project.tags.length - 3}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Footer with time and progress indication */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Created {formatDate(project.createdAt)}</span>
                  </div>
                  <div className={getDeadlineStyles(project.daysRemaining, project.status)}>
                    {project.status === 'Completed' || project.status==='Closed' ? (
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="green">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Completed
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
              'Get started by creating your first project.'}
          </p>
          <button
            onClick={handleCreateProject}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create New Project
          </button>
        </div>
      )}

      {/* Project Details Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="relative">
              {/* Modal header with thumbnail as background */}
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
                        {selectedProject.tags.map((tag, index) => (
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
                
                {/* Close button */}
                <button 
                  onClick={closeProjectDetails} 
                  className="absolute top-4 right-4 bg-black/30 hover:bg-black/50 text-white rounded-full p-2 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              
              {/* Progress bar */}
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
              
              {/* Modal body */}
              <div className="p-6 overflow-y-auto max-h-[50vh]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left column - Project details */}
                  <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-700 mb-6">{selectedProject.description}</p>
                    
                    {/* Video preview if available */}
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
                    
                    {/* Feedback section if available */}
                    {selectedProject.feedback && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Editor Feedback</h3>
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
                          <p className="text-yellow-700">{selectedProject.feedback}</p>
                        </div>
                      </div>
                    )}

                    {/* Conversation between editor and creator */}
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Project Conversation</h3>
                        {selectedProject.status !== 'Closed' && (
                          <button
                            onClick={handleOpenReviewModal}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                          >
                            <svg className="-ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
                            </svg>
                            Add Comment
                          </button>
                        )}
                      </div>
                      
                      {loadingResponses ? (
                        <div className="flex items-center justify-center h-32">
                          <div className="text-center">
                            <svg className="animate-spin h-8 w-8 text-purple-500 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                              <p className="text-gray-600">No conversation yet. Add a comment to get started!</p>
                            </div>
                          ) : (
                            // Merge and sort video responses and reviews by timestamp
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
                                        ? `Editor Response #${item.index + 1}` 
                                        : 'Your Comment'}
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
                                  
                                  {/* Add the edit/delete buttons here */}
                                  {item.type === 'creator-review' && selectedProject.status !== 'Closed' && (
                                    <div className="flex justify-end mt-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenEditComment(item);
                                        }}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 mr-3"
                                      >
                                        <span className="flex items-center">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                          </svg>
                                          Edit
                                        </span>
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleConfirmDelete(item._id);
                                        }}
                                        className="text-xs text-red-600 hover:text-red-800"
                                      >
                                        <span className="flex items-center">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                          </svg>
                                          Delete
                                        </span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Right column - Project metadata */}
                  <div className="space-y-6">
                    {/* Project Stats */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-3">Project Details</h3>
                      <dl className="space-y-2">
                        <div className="grid grid-cols-3 gap-1">
                          <dt className="text-sm font-medium text-gray-500">Editor:</dt>
                          <dd className="text-sm text-gray-900 col-span-2 truncate">
                            <div className="flex items-center">
                              <a 
                                href={`mailto:${selectedProject.editorEmail}`} 
                                className="text-indigo-600 hover:text-indigo-800 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {selectedProject.editorName || selectedProject.editorEmail}
                              </a>
                              
                              {selectedProject.editorRating && (
                                <span className="ml-2 flex items-center">
                                  <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full flex items-center">
                                    <svg className="w-3 h-3 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                                    </svg>
                                    {selectedProject.editorRating} 
                                    {selectedProject.editorTotalReviews && (
                                      <span className="text-gray-600 ml-1">({selectedProject.editorTotalReviews})</span>
                                    )}
                                  </span>
                                </span>
                              )}
                            </div>
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
                    
                    {/* Completion progress */}
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
              
              {/* Modal footer with actions */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-wrap justify-between gap-3">
                {selectedProject.status === 'Closed' ? (
                  // Only show the Close button for closed projects
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditProject(selectedProject._id);
                        }}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                      >
                        <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        Edit Project
                      </button>
                    </div>
                    <div className="space-x-2">
                      <button
                        onClick={closeProjectDetails}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                      >
                        Close
                      </button>
                      {selectedProject.editorEmail && selectedProject.status !== 'Completed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleContactEditor(selectedProject.editorEmail, selectedProject.title);
                          }}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                        >
                          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                          </svg>
                          Contact Editor
                        </button>
                      )}
                      {selectedProject.status === 'Completed' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenRatingModal(selectedProject._id, selectedProject.editorEmail);
                            }}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 mr-2"
                            disabled={closingProject}
                          >
                            <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            Rate Editor
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenReviewModal();
                            }}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-2"
                            disabled={closingProject}
                          >
                            <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
                            </svg>
                            Add Comment
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCloseProject(selectedProject._id);
                            }}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            disabled={closingProject}
                          >
                            <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {closingProject ? "Closing..." : "Close Project"}
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editModalOpen && editFormData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Edit Project</h3>
              <button 
                onClick={() => setEditModalOpen(false)} 
                className="text-gray-400 hover:text-gray-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {updateError && (
              <div className="mx-6 mt-4 bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{updateError}</p>
                  </div>
                </div>
              </div>
            )}
            
            <form onSubmit={handleUpdateProject} className="p-6 overflow-y-auto max-h-[calc(90vh-10rem)]">
              <div className="space-y-6">
                {/* Project title */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Project Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={editFormData.title}
                    onChange={handleEditInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    required
                  />
                </div>
                
                {/* Project description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    value={editFormData.description}
                    onChange={handleEditInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                
                {/* Project status */}
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={editFormData.status}
                    onChange={handleEditInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="Draft">Draft</option>
                    <option value="In Progress - 25%">In Progress - 25%</option>
                    <option value="In Progress - 50%">In Progress - 50%</option>
                    <option value="In Progress - 75%">In Progress - 75%</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                
                {/* Editor email */}
                <div>
                  <label htmlFor="editorEmail" className="block text-sm font-medium text-gray-700">
                    Assigned To (Email)
                  </label>
                  <input
                    type="email"
                    id="editorEmail"
                    name="editorEmail"
                    value={editFormData.editorEmail}
                    onChange={handleEditInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                
                {/* Deadline */}
                <div>
                  <label htmlFor="deadline" className="block text-sm font-medium text-gray-700">
                    Deadline
                  </label>
                  <input
                    type="date"
                    id="deadline"
                    name="deadline"
                    value={editFormData.deadline}
                    onChange={handleEditInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    required
                  />
                </div>
                
                {/* Tags */}
                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    id="tags"
                    name="tags"
                    value={editFormData.tags}
                    onChange={handleEditInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>
            </form>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 mr-3"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateProject}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                disabled={updateLoading}
              >
                {updateLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Add Comment</h3>
              <button 
                onClick={() => setReviewModalOpen(false)} 
                className="text-gray-400 hover:text-gray-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {reviewError && (
              <div className="mx-6 mt-4 bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{reviewError}</p>
                  </div>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmitReview} className="p-6 overflow-y-auto max-h-[calc(90vh-10rem)]">
              <div className="space-y-6">
                <div>
                  <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
                    Your Comment
                  </label>
                  <textarea
                    id="comment"
                    name="comment"
                    rows={6}
                    value={reviewData.comment}
                    onChange={(e) => setReviewData({...reviewData, comment: e.target.value})}
                    placeholder="Add your thoughts, questions or feedback for the editor..."
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Your comment will be visible to the editor and will help with the collaboration process.
                  </p>
                </div>
              </div>
            </form>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 mr-3"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitReview}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                disabled={submittingReview || !reviewData.comment.trim()}
              >
                {submittingReview ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : "Submit Comment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Comment Modal */}
      {editCommentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Edit Comment</h3>
              <button 
                onClick={() => setEditCommentModalOpen(false)} 
                className="text-gray-400 hover:text-gray-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {reviewError && (
              <div className="mx-6 mt-4 bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{reviewError}</p>
                  </div>
                </div>
              </div>
            )}
            
            <form onSubmit={handleUpdateComment} className="p-6 overflow-y-auto max-h-[calc(90vh-10rem)]">
              <div className="space-y-6">
                <div>
                  <label htmlFor="edit-comment" className="block text-sm font-medium text-gray-700">
                    Your Comment
                  </label>
                  <textarea
                    id="edit-comment"
                    name="edit-comment"
                    rows={6}
                    value={editCommentData?.comment || ''}
                    onChange={(e) => setEditCommentData({
                      ...editCommentData,
                      comment: e.target.value || ''
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    required
                  />
                </div>
              </div>
            </form>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => setEditCommentModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 mr-3"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateComment}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                disabled={editingComment || !editCommentData.comment.trim()}
              >
                {editingComment ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : "Update Comment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Delete Comment</h3>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete this comment? This action cannot be undone.
              </p>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setCommentToDelete(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 mr-3"
                disabled={deletingComment}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteComment}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                disabled={deletingComment}
              >
                {deletingComment ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {ratingModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Rate Editor</h3>
              <button 
                onClick={() => setRatingModalOpen(false)} 
                className="text-gray-400 hover:text-gray-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmitRating} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Rating</label>
                <div className="flex items-center space-x-1">
                  {[1,2,3,4,5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingData({ ...ratingData, rating: star })}
                      className="focus:outline-none"
                      aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                    >
                      <svg
                        className={`w-8 h-8 ${star <= ratingData.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-700">{ratingData.rating} Star{ratingData.rating > 1 ? 's' : ''}</span>
                </div>
              </div>
              {ratingError && (
                <div className="mb-2 text-red-600 text-sm">{ratingError}</div>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setRatingModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 mr-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
                  disabled={ratingSubmitting}
                >
                  {ratingSubmitting ? "Submitting..." : "Submit Rating"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreatorProjectDisplay;