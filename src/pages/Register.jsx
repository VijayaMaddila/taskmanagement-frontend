import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { register, getInviteInfo } from "../services/authService";
import "./Auth.css";

function Register() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("token");

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "DEVELOPER",
  });
  const [inviteInfo, setInviteInfo] = useState(null);   // data from invite token
  const [inviteError, setInviteError] = useState("");   // invalid/expired token message
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // If an invite token is present, fetch invite details and pre-fill the form
  useEffect(() => {
    if (!inviteToken) return;

    getInviteInfo(encodeURIComponent(inviteToken))
      .then(async (res) => {
        if (!res.ok) {
          const msg = await res.text().catch(() => "");
          setInviteError(msg || "This invite link is invalid or has expired.");
          return;
        }
        const data = await res.json();
        setInviteInfo(data);
        setFormData((prev) => ({
          ...prev,
          email: data.email ?? prev.email,
          role:  data.role  ?? prev.role,
        }));
      })
      .catch(() => {
        setInviteError("Could not load invite details. The link may be invalid.");
      });
  }, [inviteToken]);

  // Update form field and clear any previous error
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Pass the invite token as a query param so the backend creates the
      // team entry automatically during registration
      const response = await register(formData, inviteToken ? encodeURIComponent(inviteToken) : null);

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(errorMessage || "Registration failed");
      }

      navigate("/login");

    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Link to="/" className="auth-back-btn">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Home
      </Link>

      <div className="auth-card">
        <h2>Register</h2>

        {/* Invite context banner */}
        {inviteToken && !inviteError && inviteInfo && (
          <div className="invite-banner">
            You have been invited to join as <strong>{inviteInfo.role}</strong>
            {inviteInfo.projectName ? <> on <strong>{inviteInfo.projectName}</strong></> : ""}.
          </div>
        )}

        {inviteError && (
          <div className="error-message">{inviteError}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="johndoe"
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="john@example.com"
              autoComplete="email"
              // Lock the email when coming from an invite so it can't be changed
              readOnly={!!inviteInfo}
              style={inviteInfo ? { opacity: 0.7, cursor: "not-allowed" } : undefined}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
              minLength="6"
              autoComplete="new-password"
            />
          </div>

          {/* Only show role selector when not coming from an invite */}
          {!inviteInfo && (
            <div className="form-group">
              <label htmlFor="role">Role</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="DEVELOPER">Developer</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading || !!inviteError} className="submit-btn">
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <Link to="/login">Login here</Link>
        </p>

      </div>
    </div>
  );
}

export default Register;
