import { useState } from "react";
import './Login.css';
import { useNavigate, Link } from "react-router-dom";
import { login } from "../services/api";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const data = await login(username, password);
      loginUser(data.access_token, username);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const EyeIcon = ({ open }: { open: boolean }) =>
    open ? (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"
          stroke="#8a8a8a"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="3" stroke="#8a8a8a" strokeWidth="1.8" />
      </svg>
    ) : (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M9.5 5.4A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a13.6 13.6 0 0 1-3.1 3.9M6.6 6.6C4.3 8.1 2 12 2 12s3.5 7 10 7c1.3 0 2.5-.2 3.6-.6"
          stroke="#8a8a8a"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="8" width="16" height="12" rx="3" stroke="white" strokeWidth="2" />
            <path d="M12 8V4" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="3" r="1.3" fill="white" />
            <circle cx="9" cy="14" r="1.4" fill="white" />
            <circle cx="15" cy="14" r="1.4" fill="white" />
            <path d="M2 12h2M20 12h2" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        <h2 className="login-title">Welcome back</h2>
        <p className="login-subtitle">Log in to continue to Agent Derja</p>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <p className="login-error">{error}</p>}

          <label className="login-label" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            className="login-input"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <label className="login-label" htmlFor="password">
            Password
          </label>
          <div className="login-input-wrapper">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="login-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="login-eye-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>

          <button type="submit" className="login-btn-primary">
            Log in
          </button>
        </form>

        <p className="login-footer">
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </div>
    </div>
  );
}