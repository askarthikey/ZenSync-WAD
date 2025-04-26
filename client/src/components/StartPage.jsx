import React from "react";
import { Link } from "react-router-dom";
function StartPage() {
  return (
    <div className="min-h-[calc(100vh-64px)]">
      <section className="bg-gradient-to-b from-blue-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 items-center">
            <div>
              <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
                Write and Deliver Creatively
              </h1>
              <p className="mt-6 text-xl text-gray-500">
                Streamline your content creation process with our platform
                designed for both content creators and editors.
              </p>
              <div className="mt-8 flex space-x-4">
                <Link
                  to="/signup"
                  className="px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
                >
                  Get Started
                </Link>
                <Link
                  to="/signin"
                  className="px-8 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
                >
                  Sign In
                </Link>
              </div>
            </div>
            <div className="mt-12 lg:mt-0">
              <div className="pl-4 sm:pl-6 lg:pl-0">
                <img
                  className="w-full rounded-lg shadow-xl ring-1 ring-black ring-opacity-5"
                  src="https://images.unsplash.com/photo-1516383740770-fbcc5ccbece0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1374&q=80"
                  alt="Content creation illustration"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Features Designed for You
            </h2>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
              Everything you need to create, edit, and deliver content
              seamlessly.
            </p>
          </div>
          <div className="mt-12 grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="w-12 h-12 rounded-md bg-blue-500 text-white flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                Content Creation
              </h3>
              <p className="mt-2 text-gray-600">
                Intuitive tools for content creators to write, format, and
                organize their work.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="w-12 h-12 rounded-md bg-blue-500 text-white flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                Editing Workflow
              </h3>
              <p className="mt-2 text-gray-600">
                Streamlined editing process with comments, suggestions, and
                version control.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="w-12 h-12 rounded-md bg-blue-500 text-white flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                Publishing Calendar
              </h3>
              <p className="mt-2 text-gray-600">
                Plan and schedule your content with our integrated publishing
                calendar.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="bg-blue-700">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            <span className="block">Ready to dive in?</span>
            <span className="block text-blue-200">
              Start your free trial today.
            </span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <Link
                to="/signup"
                className="px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50"
              >
                Get started
              </Link>
            </div>
            <div className="ml-3 inline-flex rounded-md shadow">
              <Link
                to="/signin"
                className="px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-800 hover:bg-blue-900"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>
      <footer className="bg-gray-800">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-400">
            &copy; 2025 ZenSync. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default StartPage;
