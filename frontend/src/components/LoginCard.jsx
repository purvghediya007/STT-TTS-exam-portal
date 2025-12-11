import { useState, useEffect } from 'react'
import { KeyRound, UserPlus, Loader } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import logoImg from '../assets/vgec-logo.png'
import api from '../api/axiosinstance'

const roleConfig = {
  student: {
    title: 'VGEC Exam Control',
    description:
      'Login with your username OR enrollment number and password to access the exam dashboard.',
    primaryFieldLabel: 'Username / Enrollment Number',
    primaryPlaceholder: 'e.g. student123 or 20XX123456',
    apiRole: 'student',
  },
  faculty: {
    title: 'Faculty Control Desk',
    description:
      'Sign in with your faculty username or email and password to manage assessments and monitor live sessions.',
    primaryFieldLabel: 'Username / Email',
    primaryPlaceholder: 'e.g. prof.patel or prof.patel@vgec.ac.in',
    apiRole: 'teacher',
  },
}

const LoginCard = () => {
  const navigate = useNavigate()

  const [role, setRole] = useState('student')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [captchaId, setCaptchaId] = useState('')
  const [captchaText, setCaptchaText] = useState('')
  const [captchaSvg, setCaptchaSvg] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Check if user is already logged in and redirect accordingly
  useEffect(() => {
    const authToken = localStorage.getItem('auth_token')
    const userDataStr = localStorage.getItem('user_data')

    if (authToken && userDataStr) {
      try {
        const userData = JSON.parse(userDataStr)
        // Redirect to appropriate dashboard
        if (userData.role === 'teacher') {
          navigate('/faculty/dashboard', { replace: true })
        } else {
          navigate('/student/dashboard', { replace: true })
        }
        // any non-student roles go to faculty area
        navigate('/faculty/dashboard')
        return
      } catch (err) {
        console.warn('Unable to parse stored user_data, will load captcha', err)
        // fall through to reload captcha
      }
    }

  // Fetch captcha when component mounts or role changes
  useEffect(() => {
    fetchCaptcha()
  }, [role])

  const fetchCaptcha = async () => {
    try {
      const response = await fetch('/api/auth/captcha')
      const data = await response.json()
      setCaptchaId(data.captchaId)
      setCaptchaSvg(data.svg)
      // Clear the captcha text input - user must enter it manually
      setCaptchaText('')
      // Log captcha text for development only (not autofill)
      if (data.captchaText) {
        console.log('%c🔐 DEV MODE - Captcha text:', 'color: red; font-size: 14px; font-weight: bold;', data.captchaText)
        console.log('%c💡 For testing: Copy the text above and paste it in the captcha field', 'color: blue; font-size: 12px;')
      }
    } catch (error) {
      console.error('Failed to fetch captcha:', error)
      setError('Failed to load captcha. Please refresh.')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (!username || !password || !captchaText) {
        setError('Please fill in all fields including captcha')
        setIsLoading(false)
        return
      }

      console.log('Login attempt:', {
        username,
        captchaId: captchaId.substring(0, 8) + '...',
        captchaValue: captchaText
      })

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          captchaId,
          captchaValue: captchaText,
        }),
      })

      const data = await response.json()
      console.log('Login response:', { status: response.status, data })

      if (!response.ok) {
        // Provide more specific error messages
        let errorMsg = data.message || 'Login failed'

        if (response.status === 401) {
          errorMsg = 'Invalid username, password, or captcha'
        } else if (response.status === 400) {
          errorMsg = data.message || 'Please fill in all fields'
        }

        setError(errorMsg)
        fetchCaptcha() // Refresh captcha on error
        setIsLoading(false)
        return
      }

      // Store auth token and user data
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('user_data', JSON.stringify({
        id: data.user.id,
        email: data.user.email,
        username: data.user.username,
        role: data.user.role,
        enrollmentNumber: data.user.enrollmentNumber,
        loginTime: new Date().toISOString()
      }))

      // Redirect based on role
      if (data.user.role === 'teacher') {
        navigate('/faculty/dashboard')
      } else {
        navigate('/student/dashboard')
      } else if(serverRole === 'teacher' || serverRole === 'admin') {
        // treat faculty/teacher/admin as faculty area
        navigate('/faculty/dashboard')
      }else{
        setMessage({ type: 'error', text: 'Unknown user role. Contact support.' })  
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('An error occurred. Please try again.')
      fetchCaptcha()
    } finally {
      setIsLoading(false)
    }
  }

  const { title, description, primaryFieldLabel, primaryPlaceholder } =
    roleConfig[role]

  return (
    <div className="login-card">
      <img src={logoImg} className="college-logo" alt="VGEC logo" />

      <div className="role-toggle" role="tablist">
        {['student', 'faculty'].map((option) => (
          <button
            key={option}
            type="button"
            className={role === option ? 'active' : ''}
            onClick={() => setRole(option)}
            role="tab"
            aria-selected={role === option}
            disabled={isLoading}
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
        {role === 'student' && (
          <div style={{
            padding: '8px 12px',
            backgroundColor: '#f0f7ff',
            borderLeft: '3px solid #0066cc',
            borderRadius: '4px',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#333'
          }}>
            💡 <strong>Forgot your username?</strong> Use the enrollment number you registered with. If that doesn't work, you may need to re-register.
          </div>
        )}

        {error && (
          <div style={{ padding: '10px 12px', backgroundColor: '#fee', color: '#c00', borderRadius: '4px', marginBottom: '12px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <label className="input-field">
          <span>{primaryFieldLabel}</span>
          <input
            type="text"
            placeholder={primaryPlaceholder}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
            required
          />
        </label>

        <label className="input-field">
          <span>Password</span>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
          />
        </label>

        <label className="input-field">
          <span>Captcha - Enter the text shown below</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
            <div dangerouslySetInnerHTML={{ __html: captchaSvg }} style={{ flex: 1, border: '1px solid #ccc', padding: '4px', borderRadius: '4px' }} />
            <button
              type="button"
              onClick={() => fetchCaptcha()}
              disabled={isLoading}
              style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              🔄 Refresh
            </button>
          </div>
          <input
            type="text"
            placeholder="Type the characters you see above"
            value={captchaText}
            onChange={(e) => setCaptchaText(e.target.value)}
            disabled={isLoading}
            autoComplete="off"
            required
            style={{ fontFamily: 'monospace' }}
          />
        </label>

        <button type="submit" className="primary" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader style={{ width: 16, height: 16, marginRight: 6, animation: 'spin 1s linear infinite' }} />
              Logging in...
            </>
          ) : (
            'Login'
          )}
        </button>

        <div className="form-footer">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button type="button" className="linkish" onClick={() => navigate('/forgot-password')} disabled={isLoading}>
              <KeyRound style={{ width: 16, height: 16, marginRight: 6 }} />
              Forgot password?
            </button>
            <button type="button" className="linkish" onClick={() => navigate('/signup')} disabled={isLoading}>
              <UserPlus style={{ width: 16, height: 16, marginRight: 6 }} />
              New user? Sign up
            </button>
          </div>
          <span>
            Need help? {role === 'student' ? 'student.support' : 'faculty.support'}@vgec.ac.in
          </span>
        </div>
      </form>
    </div>
  )
}

export default LoginCard
