import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import logoImg from '../assets/vgec-logo.png'
import api from '../api/axiosinstance'

const roleConfig = {
  student: {
    title: 'VGEC Exam Control',
    description:
      'Use your official enrollment number and password to access the exam dashboard.',
    primaryFieldLabel: 'Username',
    primaryPlaceholder: 'Your username',
  },
  faculty: {
    title: 'Faculty Control Desk',
    description:
      'Sign in with your faculty email or username to manage assessments and monitor live sessions.',
    primaryFieldLabel: 'Username',
    primaryPlaceholder: 'Your username',
  },
}

const LoginCard = () => {
  const navigate = useNavigate()

  const [role, setRole] = useState('student')

  // form fields
  const [enrollment, setEnrollment] = useState('')
  const [facultyId, setFacultyId] = useState('')
  const [password, setPassword] = useState('')

  // captcha
  const [captchaSvg, setCaptchaSvg] = useState('')
  const [captchaId, setCaptchaId] = useState(null)
  const [captchaValue, setCaptchaValue] = useState('')

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const cfg = roleConfig[role]

  const title = cfg.title
  const description = cfg.description
  const primaryFieldLabel = cfg.primaryFieldLabel
  const primaryPlaceholder = cfg.primaryPlaceholder

  // load captcha from API
  async function loadCaptcha() {
    try {
      console.log('Loading captcha...')
      const res = await api.get('/auth/captcha')
      const { captchaId: id, svg } = res.data
      setCaptchaId(id)
      setCaptchaSvg(svg)
      // clear previously entered value
      setCaptchaValue('')
      console.log('Captcha loaded : ', id)
    } catch (err) {
      console.error('Failed to load captcha', err)
      setMessage({ type: 'error', text: 'Failed to load captcha. Try again.' })
    }
  }

  useEffect(() => {
    // If a token and user data are already in localStorage, use them and redirect.
    const existingToken = localStorage.getItem('auth_token')
    const existingUser = localStorage.getItem('user_data')

    if (existingToken && existingUser) {
      try {
        const parsed = JSON.parse(existingUser)
        // set axios default header so other requests use the token
        api.defaults.headers.common['Authorization'] = `Bearer ${existingToken}`

        const storedRole = (parsed.role || '').toLowerCase()
        if (storedRole === 'student') {
          navigate('/student/dashboard')
          return
        }
        // any non-student roles go to faculty area
        navigate('/faculty/dashboard')
        return
      } catch (err) {
        console.warn('Unable to parse stored user_data, will load captcha', err)
        // fall through to reload captcha
      }
    }

    // No valid token/user found, load captcha for login
    loadCaptcha()
  }, [])

  // updateField helper
  function updateField(key, value) {
    if (key === 'enrollment') setEnrollment(value)
    if (key === 'facultyId') setFacultyId(value)
    if (key === 'password') setPassword(value)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage(null)

    // basic validation
    if (!captchaId) {
      setMessage({ type: 'error', text: 'Captcha not loaded. Please reload.' })
      return
    }

    const username = role === 'student' ? enrollment.trim() : facultyId.trim()
    if (!username || !password) {
      setMessage({ type: 'error', text: 'Please fill all required fields.' })
      return
    }

    setLoading(true)
    try {
      const payload = {
        username,
        password,
        captchaId,
        captchaValue: captchaValue.trim(),
      }

      const res = await api.post('/auth/login', payload)

      const { token, user } = res.data

      // store token and user in localStorage
      localStorage.setItem('auth_token', token)
      localStorage.setItem('user_data', JSON.stringify(user))

      // set default axios header for subsequent requests
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`

      setMessage({ type: 'success', text: 'Login successful — redirecting…' })

      // Redirect based on role returned from server
      const serverRole = (user && user.role) ? user.role.toLowerCase() : role
      if (serverRole === 'student') {
        navigate('/student/dashboard')
      } else if(serverRole === 'teacher' || serverRole === 'admin') {
        // treat faculty/teacher/admin as faculty area
        navigate('/faculty/dashboard')
      }else{
        setMessage({ type: 'error', text: 'Unknown user role. Contact support.' })  
      }
    } catch (err) {
      console.error('Login failed', err)
      // show server message if available
      const text = err?.response?.data?.message || 'Login failed. Check your credentials.'
      setMessage({ type: 'error', text })
      // reload captcha on failure
      loadCaptcha()
    } finally {
      setLoading(false)
    }
  }

  // helper values for inputs
  const primaryValue = role === 'student' ? enrollment : facultyId
  const passwordValue = password

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
            onChange={(e) =>
              updateField(role === 'student' ? 'enrollment' : 'facultyId', e.target.value)
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
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <div className="captcha-box">
          <div
            className="captcha-img"
            dangerouslySetInnerHTML={{ __html: captchaSvg }}
          />
          <button type="button" className="linkish" onClick={loadCaptcha}>
            Reload Captcha
          </button>
        </div>

        <label className="input-field">
          <span>Enter Captcha</span>
          <input
            type="text"
            value={captchaValue}
            onChange={(e) => setCaptchaValue(e.target.value)}
            required
          />
        </label>

        {message && <div className={`notice ${message.type}`}>{message.text}</div>}

        <button type="submit" className="primary" disabled={loading}>
          {loading ? 'Logging in…' : 'Login'}
        </button>

        <div className="form-footer">
          <button
            type="button"
            className="linkish"
            onClick={() => navigate('/forgot-password')}
          >
            Forgot password?
          </button>
          <button type="button" className="linkish" onClick={() => navigate('/signup')}>
            New user? Sign up
          </button>
          <span>
            Need help? {role === 'student' ? 'student.support' : 'faculty.support'}@vgec.ac.in
          </span>
        </div>
      </form>
    </div>
  )
}

export default LoginCard