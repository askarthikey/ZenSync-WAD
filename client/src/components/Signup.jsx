import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
function Signup() {
  const [formData, setFormData] = useState({
    username: "",
    fullName: "",
    email: "",
    userType: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };
  const validate = () => {
    const newErrors = {};
    if (!formData.username) newErrors.username = "Username is required";
    if (!formData.fullName) newErrors.fullName = "Full name is required";
    if (!formData.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Email address is invalid";
    if (!formData.userType) newErrors.userType = "User type is required";
    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";
    return newErrors;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length === 0) {
      try {
        setIsLoading(true);
        setMessage(null);
        const userData = {
          username: formData.username,
          fullName: formData.fullName,
          email: formData.email,
          userType: formData.userType,
          password: formData.password,
        };
        const response = await fetch("http://localhost:4000/userApi/user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userData),
        });
        const data = await response.json();
        if (data.message === "User created successfully!") {
          setMessage({
            type: "success",
            text: "Registration successful! Redirecting to login...",
          });
          setFormData({
            username: "",
            fullName: "",
            email: "",
            userType: "",
            password: "",
            confirmPassword: "",
          });
          setTimeout(() => {
            navigate("/signin");
          }, 1000);
        } else {
          setMessage({
            type: "error",
            text: data.message || "Registration failed. Please try again.",
          });
        }
      } catch (error) {
        setMessage({
          type: "error",
          text: "An error occurred. Please try again later.",
        });
        console.error("Signup error:", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      setErrors(newErrors);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-1">
          Create an Account
        </h2>
        <p className="text-center text-gray-500 mb-8">
          Join our platform today
        </p>
        {message && (
          <div
            className={`p-3 rounded-md mb-4 ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
          >
            {message.text}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Username*
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.username ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.username && (
              <p className="mt-1 text-xs text-red-600">{errors.username}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Full Name*
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.fullName ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.fullName && (
              <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email Address*
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.email ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User Type*
            </label>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  id="contentCreator"
                  name="userType"
                  type="radio"
                  value="contentCreator"
                  checked={formData.userType === "contentCreator"}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <label
                  htmlFor="contentCreator"
                  className="ml-2 block text-sm text-gray-700"
                >
                  Content Creator
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="editor"
                  name="userType"
                  type="radio"
                  value="editor"
                  checked={formData.userType === "editor"}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <label
                  htmlFor="editor"
                  className="ml-2 block text-sm text-gray-700"
                >
                  Editor
                </label>
              </div>
            </div>
            {errors.userType && (
              <p className="mt-1 text-xs text-red-600">{errors.userType}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password*
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.password ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Confirm Password*
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.confirmPassword ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600">
                {errors.confirmPassword}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              isLoading
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200`}
          >
            {isLoading ? "Signing Up..." : "Sign Up"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link
            to="/signin"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
