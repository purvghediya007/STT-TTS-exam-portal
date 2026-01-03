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
  LogOut,
  Menu, // For mobile structure
  X     // For mobile structure
} from 'lucide-react'
import { useExams } from '../hooks/useExams'

export default function StudentLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false) // Handle mobile structure
  const [studentName, setStudentName] = useState('Student')
  const [enrollment, setEnrollment] = useState('N/A')
  const dropdownRef = useRef(null)

  const { refreshExams } = useExams({ initialStatus: 'all' })

  // --- LOGIC: REMAINS EXACTLY THE SAME ---
  useEffect(() => {
    const userDataStr = localStorage.getItem('user_data')
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr)
        if (userData.enrollmentNumber) {
          setEnrollment(userData.enrollmentNumber)
        } else if (userData.username) {
          setEnrollment(userData.username)
        }
        if (userData.username) {
          setStudentName(userData.username)
        }
      } catch (e) {
        console.error('Failed to parse user data:', e)
      }
    }
  }, [])

  const user = { name: studentName, enrollment: enrollment, avatarUrl: null }

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

  const getActiveRoute = () => {
    const path = location.pathname
    if (path.includes('/dashboard') || path === '/student' || path === '/student/') return 'dashboard'
    if (path.includes('/upcoming')) return 'upcoming'
    if (path.includes('/available')) return 'available'
    if (path.includes('/history')) return 'history'
    if (path.includes('/guidelines')) return 'guidelines'
    return 'dashboard'
  }

  // Check if we're on exam taking page
  const isExamPage = location.pathname.includes('/exams/') && location.pathname.includes('/take')

  const activeRoute = getActiveRoute()

  const handleNavigation = (route) => {
    navigate(`/student/${route}`)
    setShowUserDropdown(false)
    setIsMobileMenuOpen(false) // Close mobile menu when navigating
  }

  const handleRefresh = () => {
    setShowUserDropdown(false)
    refreshExams()
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_data')
    navigate('/')
  }
  // --- END OF LOGIC ---

  // Component for Nav Links to avoid repetition
  const NavLink = ({ route, icon: Icon, label }) => (
    <button
      onClick={() => handleNavigation(route)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-all duration-200 ${
        activeRoute === route ? 'bg-blue-700 text-white' : 'text-blue-100 hover:bg-blue-800'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </button>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Header - Hidden on exam pages */}
      <header className={`w-full bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50 ${isExamPage ? 'hidden' : ''}`}>
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4">
          
          {/* Left Side: Mobile Menu + Logo */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 lg:hidden text-gray-600 hover:bg-gray-100 rounded"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-800 rounded flex items-center justify-center text-white font-bold text-lg md:text-xl">
                E
              </div>
              <span className="text-lg md:text-xl font-semibold text-gray-900">Examecho</span>
            </div>
          </div>

          {/* Right Side: User Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 px-2 md:px-3 py-2 rounded hover:bg-gray-50 transition-colors"
            >
              <div className="w-7 h-7 md:w-8 md:h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
              </div>
              <span className="text-xs md:text-sm font-medium text-gray-700 hidden sm:inline-block">
                {user.enrollment}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-52 md:w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="text-sm font-semibold text-gray-900 truncate">{user.name}</div>
                  <div className="text-[10px] md:text-xs text-gray-500 mt-0.5 truncate">Enrollment: {user.enrollment}</div>
                </div>
                <button onClick={() => { setShowUserDropdown(false); handleNavigation('dashboard') }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <User className="w-4 h-4" /> Profile
                </button>
                <button onClick={handleRefresh} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Refresh Data
                </button>
                <div className="border-t border-gray-100 my-1"></div>
                <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Sidebar Navigation - Hidden on exam pages */}
        {/* - Hidden on mobile by default, uses absolute positioning when menu is toggled */}
        {/* - Visible and static on desktop (lg: breakpoint) */}
        {/* - Completely hidden when on exam taking page */}
        <aside className={`
          ${isExamPage ? 'hidden' : ''}
          ${isMobileMenuOpen && !isExamPage ? 'translate-x-0' : '-translate-x-full'} 
          lg:translate-x-0 lg:static fixed inset-y-0 left-0 z-40
          w-64 bg-blue-900 transition-transform duration-300 ease-in-out shadow-xl lg:shadow-none
          flex flex-col
        `}>
          <nav className="p-4 space-y-1 flex-1 overflow-y-auto pt-20 lg:pt-4">
            <NavLink route="dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavLink route="upcoming" icon={Calendar} label="Upcoming Quiz" />
            <NavLink route="available" icon={CheckSquare} label="Available Quiz" />
            <NavLink route="history" icon={Clock} label="History" />
            <NavLink route="guidelines" icon={HelpCircle} label="Guidelines" />
          </nav>
        </aside>

        {/* Overlay for mobile when sidebar is open */}
        {isMobileMenuOpen && !isExamPage && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Content Area - Full width on exam pages */}
        <main className={`flex-1 ${isExamPage ? 'bg-gray-100 p-0' : 'bg-gray-50 p-4 md:p-8'} min-w-0`}>
          {isExamPage ? (
            children
          ) : (
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}