import { useState, useEffect } from 'react'
import { KeyRound, UserPlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import logoImg from '../assets/vgec-logo.png'

const roleConfig = {
  student: {
    title: 'VGEC Exam Control',
    description:
      'Use your official enrollment number and password to access the exam dashboard.',
    primaryFieldLabel: 'Enrollment Number',
    primaryPlaceholder: 'e.g. 20XX123456',
  },
  faculty: {
    title: 'Faculty Control Desk',
    description:
      'Sign in with your faculty email or username to manage assessments and monitor live sessions.',
    primaryFieldLabel: 'Email / Username',
    primaryPlaceholder: 'e.g. prof.patel@vgec.ac.in',
  },
}

function LoginCard() {
  const navigate = useNavigate()
  const [role, setRole] = useState('student')
  const [credentials, setCredentials] = useState({
    enrollment: '',
    studentPassword: '',
    facultyId: '',
    facultyPassword: '',
  })

  // Check if user is already logged in and redirect accordingly
  useEffect(() => {
    const authToken = localStorage.getItem('auth_token')
    const userDataStr = localStorage.getItem('user_data')
    
    if (authToken && userDataStr) {
      try {
        const userData = JSON.parse(userDataStr)
        // Redirect to appropriate dashboard
        if (userData.role === 'faculty') {
          navigate('/faculty/dashboard', { replace: true })
        } else {
          navigate('/student/dashboard', { replace: true })
        }
      } catch {
        // If there's an error parsing, clear invalid data
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_data')
      }
    }
  }, [navigate])

  const updateField = (field, value) => {
    setCredentials((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    
    // TODO: Add actual authentication logic here
    // For now, we'll do basic validation and redirect based on role
    
    try {
      // Store user role and credentials in localStorage for session management
      const userData = {
        role: role,
        ...(role === 'student' 
          ? { enrollment: credentials.enrollment }
          : { facultyId: credentials.facultyId }
        ),
        loginTime: new Date().toISOString()
      }
      
      localStorage.setItem('user_data', JSON.stringify(userData))
      localStorage.setItem('auth_token', 'mock_token_' + Date.now()) // Mock token
      
      // Redirect based on role
      if (role === 'faculty') {
        navigate('/faculty/dashboard')
      } else {
        navigate('/student/dashboard')
      }
    } catch (error) {
      console.error('Login error:', error)
      // You can add error handling UI here
      alert('Login failed. Please try again.')
    }
  }

  const { title, description, primaryFieldLabel, primaryPlaceholder } =
    roleConfig[role]

  const primaryValue =
    role === 'student' ? credentials.enrollment : credentials.facultyId
  const passwordValue =
    role === 'student' ? credentials.studentPassword : credentials.facultyPassword

  return (
    <div className="login-card">
      <img
        src={logoImg}
        className="college-logo"
        alt="Vishwakarma Government Engineering College logo"
      />

      <div className="role-toggle" role="tablist">
        {['student', 'faculty'].map((option) => (
          <button
            key={option}
            type="button"
            className={role === option ? 'active' : ''}
            onClick={() => setRole(option)}
            role="tab"
            aria-selected={role === option}
          >
            {option === 'student' ? 'Student' : 'Faculty'}
          </button>
        ))}
      </div>

      <header className="card-copy">
        <p className="eyebrow">Vishwakarma Govt. Engineering College</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>

      <form className="login-form" onSubmit={handleSubmit}>
        <label className="input-field">
          <span>{primaryFieldLabel}</span>
          <input
            type="text"
            inputMode={role === 'student' ? 'numeric' : 'text'}
            placeholder={primaryPlaceholder}
            value={primaryValue}
            onChange={(event) =>
              updateField(
                role === 'student' ? 'enrollment' : 'facultyId',
                event.target.value
              )
            }
            required
          />
        </label>

        <label className="input-field">
          <span>Password</span>
          <input
            type="password"
            placeholder="Enter password"
            value={passwordValue}
            onChange={(event) =>
              updateField(
                role === 'student' ? 'studentPassword' : 'facultyPassword',
                event.target.value
              )
            }
            required
          />
        </label>

        <button type="submit" className="primary">
          Login
        </button>

        <div className="form-footer">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button type="button" className="linkish" onClick={() => navigate('/forgot-password')}>
              <KeyRound style={{ width: 16, height: 16, marginRight: 6 }} />
              Forgot password?
            </button>
            <button type="button" className="linkish" onClick={() => navigate('/signup')}>
              <UserPlus style={{ width: 16, height: 16, marginRight: 6 }} />
              New user? Sign up
            </button>
          </div>
          <span>
            Need help? {role === 'student' ? 'student.support' : 'faculty.support'}
            @vgec.ac.in
          </span>
        </div>
      </form>
    </div>
  )
}

export default LoginCard
