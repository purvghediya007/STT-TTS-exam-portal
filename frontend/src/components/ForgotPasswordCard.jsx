import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logoImg from '../assets/vgec-logo.png'

export default function ForgotPasswordCard() {
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [message, setMessage] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!identifier.trim()) {
      setMessage({ type: 'error', text: 'Please enter your email, enrollment, or faculty username.' })
      return
    }

    // Mock email send
    setMessage({
      type: 'success',
      text: 'If an account exists, a reset link has been sent to your email.',
    })

    setTimeout(() => navigate('/'), 1200)
  }

  return (
    <div className="login-card">
      <img src={logoImg} className="college-logo" alt="Vishwakarma Government Engineering College logo" />

      <header className="card-copy">
        <p className="eyebrow">Reset your password</p>
        <h1>Forgot password</h1>
        <p>Enter your email, student enrollment, or faculty username to receive a reset link.</p>
      </header>

      <form className="login-form" onSubmit={handleSubmit}>
        <label className="input-field">
          <span>Email / Enrollment / Faculty Username</span>
          <input
            type="text"
            placeholder="you@example.com or 20XX123456"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
        </label>

        {message && (
          <div className={`notice ${message.type}`}>
            {message.text}
          </div>
        )}

        <button type="submit" className="primary">Send reset link</button>

        <div className="form-footer">
          <button type="button" className="linkish" onClick={() => navigate('/')}>
            Back to login
          </button>
          <button type="button" className="linkish" onClick={() => navigate('/signup')}>
            Need an account? Sign up
          </button>
        </div>
      </form>
    </div>
  )
}








