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
  branch: '',
  semester: null,
}
const availableBranches = [
  'IT',
  'CE',
  'COE',
  'CSE (DS)',
  'ECE',
  'EIE',
  'EE',
  'ICT',
  'AM',
  'CHE',
  'IC',
  'ME',
  'PE',
  'SH'
];

const availableSemesters = [1, 2, 3, 4, 5, 6, 7, 8]

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

      // Add enrollmentNumber, branch, and semester for students
      if (form.role === 'student') {
        if (form.enrollmentNumber) {
          requestBody.enrollmentNumber = form.enrollmentNumber
        }
        if (form.branch) {
          requestBody.branch = form.branch
        }
        if (form.semester) {
          requestBody.semester = form.semester
        }
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
        <p>Register with your {isStudent ? 'email, enrollment number, branch, and semester' : 'email and faculty ID'}.</p>
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
          <>
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

            {/* Branch Selection */}
            <label className="input-field">
              <span>Select Branch</span>
              <select
                value={form.branch}
                onChange={(e) => update('branch', e.target.value)}
                disabled={isLoading}
                required
                className="input"
                style={{
                  borderRadius: '18px',
                  border: '1px solid var(--border)',
                  padding: '0.95rem 1.1rem',
                  fontSize: '1rem',
                  color: 'var(--text)',
                  backgroundColor: 'var(--surface-glow)',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%232563eb' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/csvg%3e")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.95rem center',
                  backgroundSize: '20px',
                  paddingRight: '2.5rem',
                }}
              >
                <option value="" disabled>-- Select Branch --</option>
                {availableBranches.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </label>

            {/* Semester Selection */}
            <label className="input-field">
              <span>Select Semester</span>
              <select
                value={form.semester || ''}
                onChange={(e) => update('semester', e.target.value ? Number(e.target.value) : null)}
                disabled={isLoading}
                required
                className="input"
                style={{
                  borderRadius: '18px',
                  border: '1px solid var(--border)',
                  padding: '0.95rem 1.1rem',
                  fontSize: '1rem',
                  color: 'var(--text)',
                  backgroundColor: 'var(--surface-glow)',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237c3aed' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/csvg%3e")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.95rem center',
                  backgroundSize: '20px',
                  paddingRight: '2.5rem',
                }}
              >
                <option value="" disabled>-- Select Semester --</option>
                {availableSemesters.map((semester) => (
                  <option key={semester} value={semester}>
                    Semester {semester}
                  </option>
                ))}
              </select>
            </label>
          </>
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




