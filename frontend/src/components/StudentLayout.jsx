import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Calendar,
  Clock,
  HelpCircle,
  User,
  ChevronDown,
  CheckSquare,
  FileText,
  RefreshCw,
  LogOut
} from 'lucide-react'
import { useExams } from '../hooks/useExams'

/**
 * StudentLayout - Main layout component with header and sidebar
 * Provides navigation and user profile functionality
 */
export default function StudentLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [studentName, setStudentName] = useState('Student')
  const [enrollment, setEnrollment] = useState('N/A')
  const dropdownRef = useRef(null)

  const { refreshExams } = useExams({ initialStatus: 'all' })

  // Get user data from localStorage
  useEffect(() => {
    const userDataStr = localStorage.getItem('user_data')
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr)
        // Set enrollment from userData (priority: enrollmentNumber > username)
        if (userData.enrollmentNumber) {
          setEnrollment(userData.enrollmentNumber)
        } else if (userData.username) {
          setEnrollment(userData.username)
        }
        // Set student name from userData (use username)
        if (userData.username) {
          setStudentName(userData.username)
        }
      } catch (e) {
        console.error('Failed to parse user data:', e)
      }
    }
  }, [])

  // Create user object with dynamic data
  const user = {
    name: studentName,
    enrollment: enrollment,
    avatarUrl: null
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false)
      }
    }

    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserDropdown])

  // Determine active route
  const getActiveRoute = () => {
    const path = location.pathname
    if (path.includes('/dashboard') || path === '/student' || path === '/student/') {
      return 'dashboard'
    }
    if (path.includes('/upcoming')) {
      return 'upcoming'
    }
    if (path.includes('/available')) {
      return 'available'
    }
    if (path.includes('/history')) {
      return 'history'
    }
    if (path.includes('/guidelines')) {
      return 'guidelines'
    }
    return 'dashboard'
  }

  const activeRoute = getActiveRoute()

  const handleNavigation = (route) => {
    navigate(`/student/${route}`)
    setShowUserDropdown(false)
  }

  const handleRefresh = () => {
    setShowUserDropdown(false)
    refreshExams()
  }

  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_data')
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <header className="w-full bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center text-white font-bold text-xl">
              E
            </div>
            <span className="text-xl font-semibold text-gray-900">Examecho</span>
          </div>

          {/* User Info and Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">{user.enrollment}</span>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Enrollment: {user.enrollment}</div>
                </div>
                <button
                  onClick={() => { setShowUserDropdown(false); handleNavigation('dashboard') }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button
                  onClick={handleRefresh}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Data
                </button>
                <div className="border-t border-gray-100 my-1"></div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Left Navigation Sidebar */}
        <aside className="w-64 bg-blue-900 min-h-[calc(100vh-73px)] sticky top-[73px]">
          <nav className="p-4 space-y-1">
            {/* Dashboard */}
            <button
              onClick={() => handleNavigation('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-all duration-200 ${activeRoute === 'dashboard'
                ? 'bg-blue-700 text-white'
                : 'text-blue-100 hover:bg-blue-800'
                }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </button>

            {/* Upcoming Quiz */}
            <button
              onClick={() => handleNavigation('upcoming')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-all duration-200 ${activeRoute === 'upcoming'
                ? 'bg-blue-700 text-white'
                : 'text-blue-100 hover:bg-blue-800'
                }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="font-medium">Upcoming Quiz</span>
            </button>

            {/* Available Quiz */}
            <button
              onClick={() => handleNavigation('available')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-all duration-200 ${activeRoute === 'available'
                ? 'bg-blue-700 text-white'
                : 'text-blue-100 hover:bg-blue-800'
                }`}
            >
              <CheckSquare className="w-5 h-5" />
              <span className="font-medium">Available Quiz</span>
            </button>

            {/* History */}
            <button
              onClick={() => handleNavigation('history')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-all duration-200 ${activeRoute === 'history'
                ? 'bg-blue-700 text-white'
                : 'text-blue-100 hover:bg-blue-800'
                }`}
            >
              <Clock className="w-5 h-5" />
              <span className="font-medium">History</span>
            </button>

            {/* Guidelines */}
            <button
              onClick={() => handleNavigation('guidelines')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-all duration-200 ${activeRoute === 'guidelines'
                ? 'bg-blue-700 text-white'
                : 'text-blue-100 hover:bg-blue-800'
                }`}
            >
              <HelpCircle className="w-5 h-5" />
              <span className="font-medium">Guidelines</span>
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 bg-gray-50 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

