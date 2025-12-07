import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logoImg from '../assets/vgec-logo.png'

const initialState = {
  role: 'student',
  fullName: '',
  email: '',
  enrollment: '',
  facultyId: '',
  password: '',
  confirmPassword: '',
}

export default function RegisterCard() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialState)
  const [message, setMessage] = useState(null)

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }

    const newUser = {
      role: form.role,
      fullName: form.fullName,
      email: form.email,
      enrollment: form.role === 'student' ? form.enrollment : undefined,
      facultyId: form.role === 'faculty' ? form.facultyId : undefined,
      password: form.password,
      createdAt: new Date().toISOString(),
    }

    try {
      const users = JSON.parse(localStorage.getItem('registered_users') || '[]')
      users.push(newUser)
      localStorage.setItem('registered_users', JSON.stringify(users))
      setMessage({ type: 'success', text: 'Registration saved. You can now log in.' })
      setTimeout(() => navigate('/'), 800)
    } catch (error) {
      console.error('Registration error', error)
      setMessage({ type: 'error', text: 'Could not save registration. Please try again.' })
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
          >
            {option === 'student' ? 'Student' : 'Faculty'}
          </button>
        ))}
      </div>

      <header className="card-copy">
        <p className="eyebrow">Create an account</p>
        <h1>Sign up</h1>
        <p>Register with your {isStudent ? 'enrollment and email' : 'faculty ID and email'}.</p>
      </header>

      <form className="login-form" onSubmit={handleSubmit}>
        <label className="input-field">
          <span>Full Name</span>
          <input
            type="text"
            placeholder="Your full name"
            value={form.fullName}
            onChange={(e) => update('fullName', e.target.value)}
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
            required
          />
        </label>

        {isStudent ? (
          <label className="input-field">
            <span>Enrollment Number</span>
            <input
              type="text"
              placeholder="e.g. 20XX123456"
              value={form.enrollment}
              onChange={(e) => update('enrollment', e.target.value)}
              required
            />
          </label>
        ) : (
          <label className="input-field">
            <span>Faculty ID / Username</span>
            <input
              type="text"
              placeholder="e.g. prof.patel@vgec.ac.in"
              value={form.facultyId}
              onChange={(e) => update('facultyId', e.target.value)}
              required
            />
          </label>
        )}

        <label className="input-field">
          <span>Password</span>
          <input
            type="password"
            placeholder="Create password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
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
            required
          />
        </label>

        {message && (
          <div className={`notice ${message.type}`}>
            {message.text}
          </div>
        )}

        <button type="submit" className="primary">Create account</button>

        <div className="form-footer">
          <button type="button" className="linkish" onClick={() => navigate('/')}>
            Back to login
          </button>
        </div>
      </form>
    </div>
  )
}








