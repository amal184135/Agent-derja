import React from 'react'
import './HomePage.css'
import { useNavigate } from 'react-router-dom'

function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="home-page">
      <div className="home-card">
        <div className="home-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="8" width="16" height="12" rx="3" stroke="white" strokeWidth="2" />
            <path d="M12 8V4" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="3" r="1.3" fill="white" />
            <circle cx="9" cy="14" r="1.4" fill="white" />
            <circle cx="15" cy="14" r="1.4" fill="white" />
            <path d="M2 12h2M20 12h2" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        <h1 className="home-title">Agent Derja</h1>
        <p className="home-subtitle-ar">مساعدك الذكي بالدارجة التونسية</p>
        <p className="home-subtitle-en">Your smart assistant in Tunisian dialect</p>

        <div className="home-feature">
          <div className="home-feature-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
                stroke="#E8590C"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="home-feature-text">
            <h3>Smart Chat</h3>
            <p>Natural conversations in Derja</p>
          </div>
        </div>

        <div className="home-feature">
          <div className="home-feature-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5l-8-3z"
                stroke="#E8590C"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="home-feature-text">
            <h3>Secure & Private</h3>
            <p>Your data is protected</p>
          </div>
        </div>

        <button className="home-btn-primary" onClick={() => navigate('/login')}>
          Log in
        </button>
        <button className="home-btn-secondary" onClick={() => navigate('/register')}>
          Sign up
        </button>
      </div>
    </div>
  )
}

export default HomePage