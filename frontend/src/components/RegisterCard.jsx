import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader } from 'lucide-react'
import logoImg from '../assets/vgec-logo.png'

const initialState = {
  role: 'student',
  username: '',
  email: '',
  enrollmentNumber: '',
  password: '',
  confirmPassword: '',
}

export default function RegisterCard() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialState)
  const [message, setMessage] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)

    // Validate passwords match
    if (form.password !== form.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }

    // Validate password length
    if (form.password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' })
      return
    }

    setIsLoading(true)

    try {
      // Map frontend role to backend role
      const apiRole = form.role === 'student' ? 'Student' : 'Teacher'

      const requestBody = {
        role: apiRole,
        username: form.username,
        email: form.email,
        password: form.password,
      }

      // Add enrollmentNumber for students
      if (form.role === 'student' && form.enrollmentNumber) {
        requestBody.enrollmentNumber = form.enrollmentNumber
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage({
          type: 'error',
          text: data.message || 'Registration failed. Please try again.'
        })
        setIsLoading(false)
        return
      }

      // Success
      setMessage({
        type: 'success',
        text: 'Registration successful! Redirecting to login...'
      })

      // Redirect to login after 1.5 seconds
      setTimeout(() => {
        navigate('/')
      }, 1500)
    } catch (error) {
      console.error('Registration error:', error)
      setMessage({
        type: 'error',
        text: 'An error occurred. Please try again.'
      })
      setIsLoading(false)
    }
  }

  const isStudent = form.role === 'student'

  return (
    <div className="login-card">
      <img src={logoImg} className="college-logo" alt="Vishwakarma Government Engineering College logo" />

      <div className="role-toggle" role="tablist">
        {['student', 'faculty'].map((option) => (
          <button
            key={option}
            type="button"
            className={form.role === option ? 'active' : ''}
            onClick={() => update('role', option)}
            role="tab"
            aria-selected={form.role === option}
            disabled={isLoading}
          >
            {option === 'student' ? 'Student' : 'Faculty'}
          </button>
        ))}
      </div>

      <header className="card-copy">
        <p className="eyebrow">Create an account</p>
        <h1>Sign up</h1>
        <p>Register with your {isStudent ? 'email and enrollment number' : 'email and faculty ID'}.</p>
      </header>

      <form className="login-form" onSubmit={handleSubmit}>
        {message && (
          <div style={{
            padding: '10px 12px',
            backgroundColor: message.type === 'success' ? '#efe' : '#fee',
            color: message.type === 'success' ? '#060' : '#c00',
            borderRadius: '4px',
            marginBottom: '12px',
            fontSize: '14px'
          }}>
            {message.text}
          </div>
        )}

        <label className="input-field">
          <span>Username</span>
          <input
            type="text"
            placeholder="Choose a username"
            value={form.username}
            onChange={(e) => update('username', e.target.value)}
            disabled={isLoading}
            required
          />
        </label>

        <label className="input-field">
          <span>Email</span>
          <input
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            disabled={isLoading}
            required
          />
        </label>

        {isStudent && (
          <label className="input-field">
            <span>Enrollment Number</span>
            <input
              type="text"
              placeholder="e.g. 20XX123456"
              value={form.enrollmentNumber}
              onChange={(e) => update('enrollmentNumber', e.target.value)}
              disabled={isLoading}
            />
          </label>
        )}

        <label className="input-field">
          <span>Password</span>
          <input
            type="password"
            placeholder="Create password (min 6 characters)"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            disabled={isLoading}
            required
          />
        </label>

        <label className="input-field">
          <span>Confirm Password</span>
          <input
            type="password"
            placeholder="Repeat password"
            value={form.confirmPassword}
            onChange={(e) => update('confirmPassword', e.target.value)}
            disabled={isLoading}
            required
          />
        </label>

        <button type="submit" className="primary" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader style={{ width: 16, height: 16, marginRight: 6, animation: 'spin 1s linear infinite' }} />
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </button>

        <div className="form-footer">
          <button
            type="button"
            className="linkish"
            onClick={() => navigate('/')}
            disabled={isLoading}
          >
            Back to login
          </button>
        </div>
      </form>
    </div>
  )
}




