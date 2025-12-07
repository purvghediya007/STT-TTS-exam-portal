import { Navigate, useLocation } from 'react-router-dom'

/**
 * ProtectedRoute - Component to protect routes based on user role
 * @param {Object} props
 * @param {React.ReactNode} props.children - The component to render if authorized
 * @param {string} props.requiredRole - 'student' or 'faculty'
 */
export default function ProtectedRoute({ children, requiredRole }) {
  const location = useLocation()
  
  // Get user data from localStorage
  const userDataStr = localStorage.getItem('user_data')
  const authToken = localStorage.getItem('auth_token')
  
  // Check if user is authenticated
  if (!authToken || !userDataStr) {
    // Redirect to login with return path
    return <Navigate to="/" state={{ from: location }} replace />
  }
  
  // Parse user data outside try/catch to avoid JSX in catch
  let userData
  try {
    userData = JSON.parse(userDataStr)
  } catch (error) {
    console.error('Error parsing user data:', error)
    // If there's an error parsing, redirect to login
    return <Navigate to="/" replace />
  }
  
  // Check if user has the required role
  if (userData.role !== requiredRole) {
    // Redirect to appropriate dashboard based on their actual role
    if (userData.role === 'faculty') {
      return <Navigate to="/faculty/dashboard" replace />
    } else {
      return <Navigate to="/student/dashboard" replace />
    }
  }
  
  // User is authorized, render the protected component
  return children
}
