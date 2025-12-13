import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axiosInstance";
import logoImg from "../assets/vgec-logo.png";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("checking");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Verify token
  useEffect(() => {
    async function verify() {
      try {
        const res = await api.get(`/auth/verify-reset-token/${token}`);
        if (res.data.valid) setStatus("valid");
        else setStatus("invalid");
      } catch (err) {
        setStatus("invalid");
      }
    }
    verify();
  }, [token]);

  // Submit new password
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post("/auth/reset-password", { token, password });

      setMsg(res.data.message);

      if (res.status === 200) {
        setTimeout(() => navigate("/"), 1500);
      }
    } catch (err) {
      setMsg("Failed to reset password. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-shell">
      <div className="gradient-beam beam-1"></div>
      <div className="gradient-beam beam-2"></div>

      <div className="login-card">
        <img src={logoImg} className="college-logo" alt="VGEC Logo" />

        <header className="card-copy">
          <h1>Password Reset</h1>
          <p>Enter a new password for your account.</p>
        </header>

        {status === "checking" && (
          <p style={{ textAlign: "center", marginTop: "1rem" }}>
            Verifying reset link…
          </p>
        )}

        {status === "invalid" && (
          <p style={{ textAlign: "center", color: "red", marginTop: "1rem" }}>
            Invalid or expired token.  
            <br />
            <button
              className="linkish"
              onClick={() => navigate("/forgot-password")}
            >
              Request a new reset link
            </button>
          </p>
        )}

        {status === "valid" && (
          <form className="login-form" onSubmit={handleSubmit}>
            <label className="input-field">
              <span>New Password</span>
              <input
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            {msg && (
              <div
                className={`notice ${
                  msg.toLowerCase().includes("success") ? "success" : "error"
                }`}
              >
                {msg}
              </div>
            )}

            <button className="primary" disabled={loading}>
              {loading ? "Updating…" : "Update Password"}
            </button>

            <div className="form-footer">
              <button
                type="button"
                className="linkish"
                onClick={() => navigate("/")}
              >
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
