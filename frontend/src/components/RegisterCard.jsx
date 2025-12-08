import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logoImg from '../assets/vgec-logo.png'
import api from '../api/axiosInstance'

const initialState = {
  role: 'student',
  fullName: '',
  email: '',
  username: '',
  facultyId: '',
  password: '',
  confirmPassword: '',
}

export default function RegisterCard() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialState)
  const [message, setMessage] = useState(null)
  const [isLoading, setIsLoading] = useState(false);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }

    const newUser = {
      role: form.role,
      email: form.email,
      username : form.role === 'student' ? form.username : form.facultyId,
      password: form.password
    }

    try {
      setIsLoading(true);

      const response = await api.post("/auth/register", newUser, {
        headers: { "Content-Type": "application/json" }
      });

      setMessage({ type: 'success', text: 'Registration successful!' });
      navigate('/');
      setForm(initialState);

    } catch (error) {
        console.error('Registration error', error.response?.data?.message)
        setMessage({ type: 'error', text: error.response?.data?.message || 'Could not process registration. Please try again.' })
    } finally{
        setIsLoading(false);
    }
  }

  const isStudent = form.role === 'student'

  return (
    <div className="login-card">
      <img src={logoImg} className="college-logo" alt="Vishwakarma Government Engineering College logo" />

      <div className="role-toggle" role="tablist">
        {['student', 'teacher'].map((option) => (
          <button
            key={option}
            type="button"
            className={form.role === option ? 'active' : ''}
            onClick={() => update('role', option)}
            role="tab"
            aria-selected={form.role === option}
          >
            {option === 'student' ? 'Student' : 'Teacher'}
          </button>
        ))}
      </div>

      <header className="card-copy">
        <p className="eyebrow">Create an account</p>
        <h1>Sign up</h1>
      </header>

      <form className="login-form" onSubmit={handleSubmit}>
        
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
            <span>Username</span>
            <input
              type="text"
              placeholder="Your username"
              value={form.username}
              onChange={(e) => update('username', e.target.value)}
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
            placeholder="Your password"
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

        <button type="submit" className="primary" disabled={isLoading}>
          {isLoading ? (
            <span className="spinner"></span>
          ) : (
            "Create account"
          )}
        </button>

        <div className="form-footer">
          <button type="button" className="linkish" onClick={() => navigate('/')}>
            Back to login
          </button>
        </div>
      </form>
    </div>
  )
}
