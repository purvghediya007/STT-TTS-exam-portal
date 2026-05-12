import { useState, useEffect } from 'react'
import { KeyRound, UserPlus, Loader } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import logoImg from '../assets/vgec-logo.png'

const formConfig = {
  title: 'VGEC Exam Portal Login',
  description:
    'Login with your username, enrollment number, or email and password to access your dashboard.',
  primaryFieldLabel: 'Username / Enrollment Number / Email',
  primaryPlaceholder: 'e.g. student123, 20XX123456, or prof.patel@vgec.ac.in',
}

function LoginCard() {
  const navigate = useNavigate()
  const { login: authLogin } = useAuth()
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
      } catch {
        // If there's an error parsing, clear invalid data
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_data')
      }
    }
  }, [navigate])

  // Fetch captcha when component mounts
  useEffect(() => {
    fetchCaptcha()
  }, [])

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
      })

      // Use AuthContext.login() instead of direct fetch
      const result = await authLogin(username, password, captchaId, captchaText)

      if (!result.success) {
        let errorMsg = result.error || 'Login failed'

        if (result.error === 'Login failed') {
          errorMsg = 'Invalid username, password, or captcha'
        }

        setError(errorMsg)
        fetchCaptcha() // Refresh captcha on error
        return
      }

      console.log('✅ Login successful, AuthContext updated with user:', result.user)

      // Redirect based on role
      if (result.user.role === 'teacher') {
        navigate('/faculty/dashboard')
      } else {
        navigate('/student/dashboard')
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
    formConfig

  return (
    <div className="login-card">
      <img
        src={logoImg}
        className="college-logo"
        alt="Vishwakarma Government Engineering College logo"
      />

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

        {error && (
          <div className="text-red-700 bg-red-50 rounded-md px-3 py-2 mb-3 text-sm border border-red-200">
            {error}
          </div>
        )}

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
            Need help? support@vgec.ac.in
            @vgec.ac.in
          </span>
        </div>
      </form>
    </div>
  )
}

export default LoginCard
