import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader, ChevronDown } from 'lucide-react'
import api from '../api/axiosInstance'
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

// Custom Dropdown Component
function CustomSelect({ label, value, onChange, options, placeholder, disabled }) {
  const [isOpen, setIsOpen] = useState(false)

  const displayValue = options.find(opt =>
    typeof opt === 'number' ? opt === value : opt === value
  ) || null

  return (
    <label className="input-field">
      <span>{label}</span>
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          style={{
            width: '100%',
            borderRadius: '18px',
            border: '1px solid var(--border)',
            padding: '0.95rem 1.1rem',
            fontSize: '1rem',
            color: displayValue ? 'var(--text)' : 'var(--text-muted)',
            backgroundColor: 'var(--surface-glow)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: disabled ? 0.6 : 1,
          }}
        >
          <span>{displayValue ? (typeof displayValue === 'number' ? `Semester ${displayValue}` : displayValue) : placeholder}</span>
          <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />
        </button>

        {isOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '8px',
            backgroundColor: 'white',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            maxHeight: '280px',
            overflowY: 'auto',
          }}>
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option)
                  setIsOpen(false)
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  textAlign: 'left',
                  border: 'none',
                  backgroundColor: displayValue === option ? 'rgb(219 234 254)' : 'white',
                  color: displayValue === option ? 'rgb(29 78 216)' : 'var(--text)',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  transition: 'background-color 0.15s',
                  fontWeight: displayValue === option ? 'bold' : 'normal',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'rgb(243 244 246)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = displayValue === option ? 'rgb(219 234 254)' : 'white'
                }}
              >
                {typeof option === 'number' ? `Semester ${option}` : option}
              </button>
            ))}
          </div>
        )}
      </div>
    </label>
  )
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

    // Validate student username and enrollment number are identical
    if (form.role === 'student' && form.username !== form.enrollmentNumber) {
      setMessage({ type: 'error', text: 'Username and Enrollment Number must be identical for students.' })
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

      const response = await api.post('/auth/register', requestBody)

      const data = response.data

      if (!response.status || response.status < 200 || response.status >= 300) {
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
      let errorMsg = 'An error occurred during registration. Please try again.'
      if (error.response) {
        if (error.response.status === 409) {
          errorMsg = 'This username or email is already registered. Please use a different one.'
        } else if (error.response.status === 400) {
          errorMsg = error.response.data?.message || 'Invalid details. Please verify all inputs.'
        } else {
          errorMsg = error.response.data?.message || `Server error (${error.response.status}). Please try again.`
        }
      } else if (error.request) {
        errorMsg = 'Cannot connect to the server. Please check your network connection.'
      } else {
        errorMsg = error.message || errorMsg
      }
      setMessage({
        type: 'error',
        text: errorMsg
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
            <CustomSelect
              label="Select Branch"
              value={form.branch}
              onChange={(value) => update('branch', value)}
              options={availableBranches}
              placeholder="-- Select Branch --"
              disabled={isLoading}
            />

            {/* Semester Selection */}
            <CustomSelect
              label="Select Semester"
              value={form.semester}
              onChange={(value) => update('semester', value)}
              options={availableSemesters}
              placeholder="-- Select Semester --"
              disabled={isLoading}
            />
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




