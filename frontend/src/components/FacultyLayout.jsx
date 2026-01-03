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
  Menu, // Added for mobile
  X     // Added for mobile
} from 'lucide-react'

export default function FacultyLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false) // State for mobile sidebar
  const [facultyName, setFacultyName] = useState('Faculty Name')
  const [facultyEmail, setFacultyEmail] = useState('faculty@example.com')
  const dropdownRef = useRef(null)

  useEffect(() => {
    const userDataStr = localStorage.getItem('user_data')
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr)
        if (userData.username) setFacultyName(userData.username)
        if (userData.email) setFacultyEmail(userData.email)
      } catch (e) {
        console.error('Failed to parse user data:', e)
      }
    }
  }, [])

  const user = {
    name: facultyName,
    email: facultyEmail,
    department: 'Computer Science',
    avatarUrl: null
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false)
      }
    }
    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showUserDropdown])

  const getActiveRoute = () => {
    const path = location.pathname
    if (path.includes('/dashboard') || path === '/faculty' || path === '/faculty/') return 'dashboard'
    if (path.includes('/exams')) return 'exams'
    if (path.includes('/students')) return 'students'
    if (path.includes('/analytics')) return 'analytics'
    if (path.includes('/settings')) return 'settings'
    return 'dashboard'
  }

  const activeRoute = getActiveRoute()

  const handleNavigation = (route) => {
    navigate(`/faculty/${route}`)
    setShowUserDropdown(false)
    setIsMobileMenuOpen(false) // Close sidebar on mobile after navigation
  }

  const handleRefresh = () => {
    setShowUserDropdown(false)
    window.location.reload()
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_data')
    navigate('/')
  }

  // Shared Navigation Links Component to avoid repetition
  const NavLinks = () => (
    <>
      <button onClick={() => handleNavigation('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-all duration-200 ${activeRoute === 'dashboard' ? 'bg-blue-700 text-white' : 'text-blue-100 hover:bg-blue-800'}`}>
        <LayoutDashboard className="w-5 h-5" />
        <span className="font-medium">Dashboard</span>
      </button>
      <button onClick={() => handleNavigation('exams')} className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-all duration-200 ${activeRoute === 'exams' ? 'bg-blue-700 text-white' : 'text-blue-100 hover:bg-blue-800'}`}>
        <BookOpen className="w-5 h-5" />
        <span className="font-medium">My Exams</span>
      </button>
      <button onClick={() => handleNavigation('students')} className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-all duration-200 ${activeRoute === 'students' ? 'bg-blue-700 text-white' : 'text-blue-100 hover:bg-blue-800'}`}>
        <Users className="w-5 h-5" />
        <span className="font-medium">Students</span>
      </button>
      <button onClick={() => handleNavigation('analytics')} className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-all duration-200 ${activeRoute === 'analytics' ? 'bg-blue-700 text-white' : 'text-blue-100 hover:bg-blue-800'}`}>
        <BarChart3 className="w-5 h-5" />
        <span className="font-medium">Analytics</span>
      </button>
      <button onClick={() => handleNavigation('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-all duration-200 ${activeRoute === 'settings' ? 'bg-blue-700 text-white' : 'text-blue-100 hover:bg-blue-800'}`}>
        <Settings className="w-5 h-5" />
        <span className="font-medium">Settings</span>
      </button>
    </>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Header */}
      <header className="w-full bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 -ml-2 lg:hidden text-gray-600 hover:bg-gray-100 rounded-md"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-800 rounded flex items-center justify-center text-white font-bold text-lg md:text-xl">
              E
            </div>
            <span className="text-lg md:text-xl font-semibold text-gray-900 hidden sm:block">Examecho</span>
            <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded">Faculty</span>
          </div>

          {/* User Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 px-2 md:px-3 py-2 rounded hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700 hidden md:block">{user.name}</span>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="text-sm font-semibold text-gray-900 truncate">{user.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">{user.email}</div>
                </div>
                <button onClick={() => handleNavigation('dashboard')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"><User className="w-4 h-4" /> Profile</button>
                <button onClick={handleRefresh} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Refresh Data</button>
                <div className="border-t border-gray-100 my-1"></div>
                <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><LogOut className="w-4 h-4" /> Logout</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Sidebar for Desktop */}
        <aside className="hidden lg:block w-64 bg-blue-900 min-h-[calc(100vh-73px)] sticky top-[73px]">
          <nav className="p-4 space-y-1">
            <NavLinks />
          </nav>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}

        {/* Mobile Sidebar Drawer */}
        <aside className={`fixed inset-y-0 left-0 w-64 bg-blue-900 z-50 transform transition-transform duration-300 lg:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 bg-white text-blue-900 rounded flex items-center justify-center font-bold">E</div>
              <span className="text-white font-bold text-xl">Examecho</span>
            </div>
            <nav className="space-y-1">
              <NavLinks />
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 w-full p-4 md:p-8 overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}