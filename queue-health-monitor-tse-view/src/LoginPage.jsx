import React, { useState } from 'react';
import './LoginPage.css';

function LoginPage({ onLogin }) {
  const [isHovered, setIsHovered] = useState(false);
  
  const defaultIcon = 'https://res.cloudinary.com/doznvxtja/image/upload/v1768508628/Sign_in_with_Intercom_2_ebtg4q.svg';
  const hoverIcon = 'https://res.cloudinary.com/doznvxtja/image/upload/v1768509801/Sign_in_with_Intercom_6_sagtwp.svg';

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <h1>Queue Health Monitor</h1>
          <p className="login-description">
            Please authenticate with your Intercom credentials to access your queue.
          </p>
          <button 
            className="login-button" 
            onClick={onLogin}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            Sign in with Intercom{' '}
            <img 
              src={isHovered ? hoverIcon : defaultIcon}
              alt="Intercom logo" 
              className="login-button-icon"
            />
          </button>
          <p className="login-help">
            You'll be redirected to Intercom to sign in securely.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
