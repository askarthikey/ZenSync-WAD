import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function CreatorProjects() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const editProjectId = params.get('edit');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [editors, setEditors] = useState([]);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [thumbnailUploadProgress, setThumbnailUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    video: null,
    videoUrl: '',
    description: '',
    tags: '',
    editorEmail: '',
    thumbnail: null,
    thumbnailUrl: '',
    deadline: ''
  });

  const [errors, setErrors] = useState({});

  // Load user data from localStorage
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      // Redirect if not logged in
      navigate('/signin');
    }

    // Fetch available editors
    const fetchEditors = async () => {
      try {
        const response = await fetch('http://localhost:4000/userApi/editors', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setEditors(data.editors || []);
        } else {
          // If API call fails, use mock data
          setEditors([
            { id: 1, name: 'Lisa Wong', email: 'lisa.wong@example.com' },
            { id: 2, name: 'James Miller', email: 'james.miller@example.com' },
            { id: 3, name: 'Sarah Johnson', email: 'sarah.johnson@example.com' }
          ]);
        }
      } catch (error) {
        console.error("Error fetching editors:", error);
        // Fall back to mock data
        setEditors([
          { id: 1, name: 'Lisa Wong', email: 'lisa.wong@example.com' },
          { id: 2, name: 'James Miller', email: 'james.miller@example.com' },
          { id: 3, name: 'Sarah Johnson', email: 'sarah.johnson@example.com' }
        ]);
      }
    };
    
    fetchEditors();
  }, [navigate]);

  useEffect(() => {
    // If editProjectId exists, fetch that project data
    if (editProjectId) {
      fetchProjectForEditing(editProjectId);
    }
  }, [editProjectId]);
  
  const fetchProjectForEditing = async (projectId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/projectApi/project/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Populate form with project data
        setFormData({
          title: data.project.title,
          description: data.project.description,
          tags: data.project.tags.join(', '),
          editorEmail: data.project.editorEmail,
          deadline: new Date(data.project.deadline).toISOString().split('T')[0],
          // ...other fields
        });
      }
    } catch (error) {
      console.error('Error fetching project for editing:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load project for editing.'
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error when field is modified
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Only allow video files
      if (!file.type.match('video.*')) {
        setErrors({
          ...errors,
          video: 'Please select a valid video file'
        });
        return;
      }

      // Check file size (limit to 100MB for example)
      if (file.size > 100 * 1024 * 1024) {
        setErrors({
          ...errors,
          video: 'Video size should be less than 100MB'
        });
        return;
      }

      setFormData({
        ...formData,
        video: file,
        videoUrl: URL.createObjectURL(file)
      });
      // Clear error if it exists
      if (errors.video) {
        setErrors({
          ...errors,
          video: null
        });
      }
    }
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Only allow image files
      if (!file.type.match('image.*')) {
        setErrors({
          ...errors,
          thumbnail: 'Please select a valid image file'
        });
        return;
      }

      // Check file size (limit to 5MB for example)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({
          ...errors,
          thumbnail: 'Image size should be less than 5MB'
        });
        return;
      }

      setFormData({
        ...formData,
        thumbnail: file,
        thumbnailUrl: URL.createObjectURL(file)
      });
      // Clear error if it exists
      if (errors.thumbnail) {
        setErrors({
          ...errors,
          thumbnail: null
        });
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const today = new Date().toISOString().split('T')[0];

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.video) newErrors.video = 'Video is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.tags.trim()) newErrors.tags = 'At least one tag is required';
    if (!formData.thumbnail) newErrors.thumbnail = 'Thumbnail is required';
    if (!formData.deadline) {
      newErrors.deadline = 'Deadline is required';
    } else if (formData.deadline < today) {
      newErrors.deadline = 'Deadline cannot be in the past';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate the form
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsLoading(true);
      setMessage(null);

      // Create a FormData object to send files and data together
      const projectFormData = new FormData();
      
      // Add files to FormData
      projectFormData.append('video', formData.video);
      projectFormData.append('thumbnail', formData.thumbnail);
      
      // Add other form fields
      projectFormData.append('title', formData.title);
      projectFormData.append('description', formData.description);
      projectFormData.append('tags', formData.tags);
      projectFormData.append('deadline', formData.deadline);
      projectFormData.append('userCreated', user.username);
      projectFormData.append('createdAt', new Date().toISOString());

      // Add editorEmail and status conditionally
      if (formData.editorEmail.trim()) {
        projectFormData.append('editorEmail', formData.editorEmail);
        projectFormData.append('status', 'Draft'); // If assigned to an editor directly
      } else {
        projectFormData.append('status', 'Unassigned'); // Changed from 'Draft'
      }

      // Create custom XMLHttpRequest to track upload progress
      const xhr = new XMLHttpRequest();
      
      // Setup progress event
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          // Update both progress bars with same value for simplicity
          setVideoUploadProgress(percentComplete);
          setThumbnailUploadProgress(percentComplete);
        }
      };
      
      xhr.onload = function() {
        try {
          const response = xhr.responseText ? JSON.parse(xhr.responseText) : {};
          
          if (xhr.status === 201) {
            // Success
            console.log("Upload successful:", response);
            
            setMessage({
              type: 'success',
              text: 'Project created successfully!'
            });
            
            // Reset form
            setFormData({
              title: '',
              video: null,
              videoUrl: '',
              description: '',
              tags: '',
              editorEmail: '',
              thumbnail: null,
              thumbnailUrl: '',
              deadline: ''
            });
            
            // Reset progress bars
            setVideoUploadProgress(0);
            setThumbnailUploadProgress(0);
            
            // Reset file inputs
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
            
            // Redirect to projects list after a delay
            setTimeout(() => {
              navigate('/home');
            }, 2000);
          } else {
            // Error
            console.error("Upload failed with status:", xhr.status);
            console.error("Response:", response);
            
            if (xhr.status === 401) {
              setMessage({
                type: 'error',
                text: 'Authentication failed. Please login again.'
              });
              
              // Get a new token or redirect to login
              setTimeout(() => {
                navigate('/signin');
              }, 3000);
            } else {
              setMessage({
                type: 'error',
                text: response.message || `Failed with status: ${xhr.status}`
              });
            }
          }
        } catch (error) {
          console.error("Error parsing response:", error);
          setMessage({
            type: 'error',
            text: 'Error processing server response'
          });
        }
        setIsLoading(false);
      };
      
      xhr.onerror = function(e) {
        console.error("XHR error:", e);
        setMessage({
          type: 'error',
          text: 'Network error occurred during upload'
        });
        setIsLoading(false);
      };
      
      // First, open the connection
      xhr.open('POST', 'http://localhost:4000/projectApi/project');
      
      // Get the token - need to get a fresh copy in case it was updated
      const token = localStorage.getItem('token');
      
      if (!token) {
        setMessage({
          type: 'error',
          text: 'Authentication token not found. Please login again.'
        });
        setIsLoading(false);
        return;
      }
      
      // Debug token
      console.log("Using token:", token);
      
      // Set headers after opening the connection
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(projectFormData);

    } catch (error) {
      console.error('Error creating project:', error);
      setMessage({
        type: 'error',
        text: 'An error occurred. Please try again.'
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 px-6 py-4">
          <h1 className="text-2xl font-bold text-white">Create New Project</h1>
          <p className="text-purple-100 mt-1">Fill in the details to create a new content project</p>
        </div>
        
        {message && (
          <div className={`p-4 ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message.text}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Project Title*
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={`mt-1 block w-full border ${errors.title ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                placeholder="Enter a descriptive title"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>
            
            {/* Video Upload */}
            <div>
              <label htmlFor="video" className="block text-sm font-medium text-gray-700">
                Upload Video*
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  {formData.videoUrl ? (
                    <div>
                      <video 
                        src={formData.videoUrl} 
                        className="mx-auto h-48 w-auto" 
                        controls
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            video: null,
                            videoUrl: ''
                          });
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="mt-2 inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                        aria-hidden="true"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="video-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                        >
                          <span>Upload a video</span>
                          <input
                            id="video-upload"
                            name="video-upload"
                            type="file"
                            className="sr-only"
                            accept="video/*"
                            ref={fileInputRef}
                            onChange={handleVideoChange}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">MP4, WebM, OGG up to 100MB</p>
                    </>
                  )}
                </div>
              </div>
              {errors.video && (
                <p className="mt-1 text-sm text-red-600">{errors.video}</p>
              )}
              {videoUploadProgress > 0 && videoUploadProgress < 100 && (
                <div className="mt-2">
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-purple-200">
                    <div 
                      style={{ width: `${videoUploadProgress}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-500"
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Uploading: {videoUploadProgress}%
                  </p>
                </div>
              )}
            </div>
            
            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description*
              </label>
              <div className="mt-1">
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  className={`shadow-sm block w-full focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border ${errors.description ? 'border-red-300' : 'border-gray-300'} rounded-md`}
                  placeholder="Provide a detailed description of your project"
                />
              </div>
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>
            
            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                Tags* (comma separated)
              </label>
              <input
                type="text"
                name="tags"
                id="tags"
                value={formData.tags}
                onChange={handleChange}
                className={`mt-1 block w-full border ${errors.tags ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                placeholder="e.g. marketing, tutorial, product-demo"
              />
              {errors.tags && (
                <p className="mt-1 text-sm text-red-600">{errors.tags}</p>
              )}
            </div>
            
            {/* Editor Email */}
            <div>
              <label htmlFor="editorEmail" className="block text-sm font-medium text-gray-700">
                Assign Editor (Optional)
              </label>
              <select
                id="editorEmail"
                name="editorEmail"
                value={formData.editorEmail}
                onChange={handleChange}
                className={`mt-1 block w-full py-2 px-3 border ${errors.editorEmail ? 'border-red-300' : 'border-gray-300'} bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
              >
                <option value="">Select an editor (optional)</option>
                {editors.map((editor, index) => (
                  <option key={editor.id || index} value={editor.email}>
                    {editor.name} ({editor.email})
                  </option>
                ))}
              </select>
              {errors.editorEmail && (
                <p className="mt-1 text-sm text-red-600">{errors.editorEmail}</p>
              )}
            </div>
            
            {/* Thumbnail */}
            <div>
              <label htmlFor="thumbnail" className="block text-sm font-medium text-gray-700">
                Thumbnail Image*
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  {formData.thumbnailUrl ? (
                    <div>
                      <img 
                        src={formData.thumbnailUrl} 
                        alt="Thumbnail preview" 
                        className="mx-auto h-32 w-auto object-cover" 
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            thumbnail: null,
                            thumbnailUrl: ''
                          });
                          if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
                        }}
                        className="mt-2 inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                        aria-hidden="true"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="thumbnail-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                        >
                          <span>Upload a thumbnail</span>
                          <input
                            id="thumbnail-upload"
                            name="thumbnail-upload"
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            ref={thumbnailInputRef}
                            onChange={handleThumbnailChange}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                    </>
                  )}
                </div>
              </div>
              {errors.thumbnail && (
                <p className="mt-1 text-sm text-red-600">{errors.thumbnail}</p>
              )}
              {thumbnailUploadProgress > 0 && thumbnailUploadProgress < 100 && (
                <div className="mt-2">
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-purple-200">
                    <div 
                      style={{ width: `${thumbnailUploadProgress}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-500"
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Uploading: {thumbnailUploadProgress}%
                  </p>
                </div>
              )}
            </div>
            
            {/* Deadline */}
            <div>
              <label htmlFor="deadline" className="block text-sm font-medium text-gray-700">
                Deadline*
              </label>
              <input
                type="date"
                name="deadline"
                id="deadline"
                value={formData.deadline}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className={`mt-1 block w-full border ${errors.deadline ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
              />
              {errors.deadline && (
                <p className="mt-1 text-sm text-red-600">{errors.deadline}</p>
              )}
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                isLoading ? 'bg-purple-400' : 'bg-purple-600 hover:bg-purple-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Project...
                </>
              ) : (
                'Create Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreatorProjects;
