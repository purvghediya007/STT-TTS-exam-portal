import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logoImg from "../assets/vgec-logo.png";
import api from "../api/axiosInstance";

export default function ForgotPasswordCard() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setMessage({ type: "error", text: "Enter email/enrollment/username." });
      return;
    }

    setLoading(true);
    try{
      const res = await api.post("auth/forgot-password", {identifier}, {
        headers: { "Content-Type": "application/json" }
      });
      
      setMessage({ type: "success", text: "Mail sent. Please check your mailbox." });
      setLoading(false); 
    } catch(e){
      setLoading(false);
      console.error("Error during forgot password request:", e);
      setMessage({ type: "error", text: "Something went wrong. Please try again." });
      return;
    }

    setTimeout(() => navigate("/"), 5000);
  };

  return (
    <div className="login-card">
      <img src={logoImg} className="college-logo" alt="VGEC Logo" />

      <header className="card-copy">
        <p className="eyebrow">Reset your password</p>
        <h1>Forgot password</h1>
        <p>Enter your email, enrollment, or faculty username.</p>
      </header>

      <form className="login-form" onSubmit={handleSubmit}>
        <label className="input-field">
          <span>Email / Enrollment / Faculty Username</span>
          <input
            type="text"
            placeholder="you@example.com or 20XX123456"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </label>

        {message && <div className={`notice ${message.type}`}>{message.text}</div>}

        <button type="submit" className="primary" disabled={loading}>
          {loading ? "Sending..." : "Send reset link"}
        </button>

        <div className="form-footer">
          <button type="button" className="linkish" onClick={() => navigate("/")}>
            Back to login
          </button>
          <button type="button" className="linkish" onClick={() => navigate("/signup")}>
            Need an account? Sign up
          </button>
        </div>
      </form>
    </div>
  );
}
