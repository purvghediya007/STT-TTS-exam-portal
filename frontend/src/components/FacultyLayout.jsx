import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  BarChart3, 
  Settings, 
  User, 
  ChevronDown,
  RefreshCw,
  LogOut,
  FileText
} from 'lucide-react'

/**
 * FacultyLayout - Main layout component with header and sidebar for faculty
 * Provides navigation and user profile functionality
 */
export default function FacultyLayout({ children }) {

  const navigate = useNavigate()
    const location = useLocation()
  
    const [showUserDropdown, setShowUserDropdown] = useState(false)
    const dropdownRef = useRef(null)
    const [user, setUser] = useState({ username: 'Guest' })
    const [activeRoute, setActiveRoute] = useState('dashboard')
  
    // read user_data from localStorage
    useEffect(() => {
      try {
        const raw = localStorage.getItem('user_data')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed && parsed.username) setUser(parsed)
        }
      } catch (e) {
        // if parse fails, keep default
      }
    }, [])
  
    // Close dropdown when clicking outside
    useEffect(() => {
      function handleClickOutside(e) {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
          setShowUserDropdown(false)
        }
      }
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])
  
    // handleNavigation accepts either a full absolute path or a short route key
    function handleNavigation(routeOrPath) {
      if (!routeOrPath) return
      // If an absolute path is provided, navigate directly
      if (routeOrPath.startsWith('/')) {
        navigate(routeOrPath)
        // update activeRoute from path last segment
        const parts = routeOrPath.split('/').filter(Boolean)
        setActiveRoute(parts[1] || parts[0] || '')
        return
      }
  
      // Build a path relative to the current base (e.g. /student or /faculty)
      const base = location.pathname.split('/')[1] || ''
      const path = `/${base}/${routeOrPath}`
      setActiveRoute(routeOrPath)
      navigate(path)
    }
  
    function handleRefresh() {
      // re-read user data from storage
      try {
        const raw = localStorage.getItem('user_data')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed && parsed.username) setUser(parsed)
        }
      } catch (e) {}
    }
  
    function handleLogout() {
      // clear user-related storage and redirect to login
      try {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_data')
      } catch (e) {}
      navigate('/')
    }
  
    // route map for syncing URL -> route key (assumes StudentLayout is used under /student)
    const routeMap = {
      dashboard: '/faculty/dashboard',
      exams: '/faculty/exams',
      students: '/faculty/students',
      studebtsDetails: '/faculty/students/:studentId',
      analytics: '/faculty/analytics',
      profile: '/faculty/profile',
      login: '/',
    }
  
    // keep activeRoute in sync with URL
    useEffect(() => {
      const path = location.pathname
      const key = Object.keys(routeMap).find(k => routeMap[k] === path)
      if (key) setActiveRoute(key)
    }, [location.pathname])

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
            <span className="text-sm text-gray-500 px-2 py-1 bg-gray-100 rounded">Faculty</span>
          </div>

          {/* User Info and Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">{user.username}</span>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="text-sm font-semibold text-gray-900">{user.username}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{user.email}</div>
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
              className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-all duration-200 ${
                activeRoute === 'dashboard'
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-100 hover:bg-blue-800'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </button>

            {/* My Exams */}
            <button
              onClick={() => handleNavigation('exams')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-all duration-200 ${
                activeRoute === 'exams'
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-100 hover:bg-blue-800'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span className="font-medium">My Exams</span>
            </button>

            {/* Students */}
            <button
              onClick={() => handleNavigation('students')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-all duration-200 ${
                activeRoute === 'students'
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-100 hover:bg-blue-800'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="font-medium">Students</span>
            </button>

            {/* Analytics */}
            <button
              onClick={() => handleNavigation('analytics')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-all duration-200 ${
                activeRoute === 'analytics'
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-100 hover:bg-blue-800'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span className="font-medium">Analytics</span>
            </button>

            {/* Settings */}
            <button
              onClick={() => handleNavigation('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-all duration-200 ${
                activeRoute === 'settings'
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-100 hover:bg-blue-800'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium">Settings</span>
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