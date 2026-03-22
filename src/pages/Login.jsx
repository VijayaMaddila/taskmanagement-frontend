import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Auth.css";

// Decode a JWT token and return the payload object
function decodeJwt(token) {
  try {
    const base64Payload = token.split(".")[1];
    const standardBase64 = base64Payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(standardBase64));
  } catch (error) {
    return {};
  }
}

// Extract the role from the JWT payload (handles different field names)
function extractRole(payload) {
  if (payload.role) {
    return payload.role.replace(/^ROLE_/, "");
  }
  if (Array.isArray(payload.roles) && payload.roles[0]) {
    return payload.roles[0].replace(/^ROLE_/, "");
  }
  if (Array.isArray(payload.authorities) && payload.authorities[0]) {
    const rawRole = payload.authorities[0].authority || payload.authorities[0];
    return rawRole.replace(/^ROLE_/, "");
  }
  return "DEVELOPER";
}

function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
      const response = await fetch("http://localhost:8080/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const responseText = await response.text();

      let responseData = {};
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        responseData = {};
      }

      if (!response.ok) {
        const errorMessage =
          responseData.message ||
          responseData.error ||
          responseText ||
          "Invalid credentials";
        throw new Error(errorMessage);
      }

      // Get the token from the response (different backends use different field names)
      const token =
        responseData.token ||
        responseData.accessToken ||
        responseData.jwt ||
        "";

      if (!token) {
        throw new Error("No token received from server");
      }

      // Save the token and build the user object
      localStorage.setItem("token", token);
      const jwtPayload = decodeJwt(token);
      const userRole = extractRole(jwtPayload);

      const user = {
        id:
          responseData.id ||
          responseData.userId ||
          jwtPayload.id ||
          jwtPayload.userId ||
          null,
        name:
          responseData.name ||
          responseData.username ||
          jwtPayload.name ||
          jwtPayload.sub ||
          "User",
        email:
          responseData.email ||
          jwtPayload.email ||
          jwtPayload.sub ||
          formData.email,
        role: responseData.role || userRole,
      };

      localStorage.setItem("user", JSON.stringify(user));

      // Redirect admins to the dashboard, everyone else to the board
      const isAdmin = user.role?.toUpperCase() === "ADMIN";
      const redirectPath = isAdmin ? "/dashboard" : "/board";
      navigate(redirectPath);

    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="8" fill="url(#lg)" />
            <path
              d="M7 14L12 19L21 9"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="28" y2="28">
                <stop stopColor="#6366f1" />
                <stop offset="1" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
          <span>TaskFlow</span>
        </div>

        <h2>Welcome back</h2>
        <p className="auth-subtitle">Sign in to your account</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="you@example.com"
              autoComplete="email"
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
              autoComplete="current-password"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="auth-link">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>

        <div className="back-home">
          <Link to="/" className="back-home-btn">← Back to Home</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
