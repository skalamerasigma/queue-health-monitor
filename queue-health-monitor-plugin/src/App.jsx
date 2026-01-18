import React, { useEffect, useState } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import { ThemeProvider } from "./ThemeContext";
import LoginPage from "./LoginPage";
import Dashboard from "./Dashboard";
import MyQueue from "./MyQueue";
import "./App.css";

// Backend URL configuration for Sigma plugin deployment
// In production (Vercel), use the full Vercel URL so API calls work from Sigma's iframe
// In development, use localhost backend
// For Sigma plugins: The plugin URL will be something like https://your-app.vercel.app
// The API endpoint will be at the same domain: https://your-app.vercel.app/api/intercom/...
// eslint-disable-next-line no-unused-vars
const getBackendUrl = () => {
  // If explicitly set via env var, use that
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  
  // In production, use current origin (Vercel domain) for same-origin API calls
  // This ensures the API works when the plugin is loaded in Sigma's iframe
  if (process.env.NODE_ENV === 'production') {
    return window.location.origin;
  }
  
  // Development: use localhost backend
  return 'http://localhost:3000';
};

// const BACKEND_URL = getBackendUrl(); // Reserved for future use

// Sigma plugin API integration
// Get current user email from Sigma plugin props
// In Sigma, this will be passed as a prop: currentUserEmail
// The plugin definition in Sigma should have an argument bound to CurrentUserEmail() system function
function getCurrentUserEmail(props) {
  // Method 1: Get from Sigma plugin props (when embedded in Sigma)
  // Sigma passes props via window.sigma.getProps() or directly as component props
  if (props && props.currentUserEmail) {
    return props.currentUserEmail;
  }
  
  // Method 2: Try window.sigma API (Sigma plugin SDK)
  if (window.sigma && typeof window.sigma.getProps === 'function') {
    try {
      const sigmaProps = window.sigma.getProps();
      if (sigmaProps && sigmaProps.currentUserEmail) {
        return sigmaProps.currentUserEmail;
      }
    } catch (e) {
      console.warn('Could not get props from Sigma API:', e);
    }
  }
  
  // Method 3: Try to get from URL params (for testing/debugging)
  const urlParams = new URLSearchParams(window.location.search);
  const emailFromUrl = urlParams.get('currentUserEmail');
  if (emailFromUrl) {
    return emailFromUrl;
  }
  
  // Method 4: Try to get from localStorage (for development)
  const emailFromStorage = localStorage.getItem('currentUserEmail');
  if (emailFromStorage) {
    return emailFromStorage;
  }
  
  return null;
}

function AppContent({ currentUserEmail: propsCurrentUserEmail }) {
  const location = useLocation();
  const { isAuthenticated, loading: authLoading, login } = useAuth();
  const [data, setData] = useState({ conversations: [], teamMembers: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [currentUserEmail, setCurrentUserEmail] = useState(null);

  async function fetchData(showLoading = true) {
    if (showLoading) {
    setLoading(true);
    }
    setError("");

    try {
      // In development, use production API URL since local dev server doesn't have API routes
      // In production, use /api route
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? `${window.location.origin}/api/intercom/conversations/open-team-5480079`
        : 'https://queue-health-monitor.vercel.app/api/intercom/conversations/open-team-5480079';
      
      console.log('App: Fetching conversations from:', apiUrl);
      const res = await fetch(apiUrl);
      console.log('App: Response status:', res.status, res.ok);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const response = await res.json();
      console.log('App: Received response:', { 
        isArray: Array.isArray(response),
        conversationsCount: Array.isArray(response) ? response.length : (response.conversations?.length || 0),
        teamMembersCount: response.teamMembers?.length || 0
      });
      // Handle both old format (array) and new format (object with conversations and teamMembers)
      const conversations = Array.isArray(response) ? response : (response.conversations || []);
      const teamMembers = response.teamMembers || [];
      console.log('App: Setting data with', conversations.length, 'conversations and', teamMembers.length, 'team members');
      setData({ conversations, teamMembers });
      setLastUpdated(new Date());
    } catch (e) {
      console.error('App: Error fetching data:', e);
      setError(e.message);
    } finally {
      if (showLoading) {
      setLoading(false);
      }
    }
  }

  // Get current user email on mount and when location/props change
  useEffect(() => {
    const email = getCurrentUserEmail({ currentUserEmail: propsCurrentUserEmail });
    setCurrentUserEmail(email);
    console.log('App: Current user email:', email);
  }, [location, propsCurrentUserEmail]);

  useEffect(() => {
    fetchData(true); // Initial load with loading state
    
    // Set up auto-refresh every 2 minutes (120000 ms)
    const interval = setInterval(() => {
      fetchData(false); // Background refresh without loading state
    }, 120000);
    
    return () => clearInterval(interval);
  }, []);

  // Show login page if not authenticated
  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={login} />;
  }

  // Determine which component to render based on route
  const commonProps = {
    conversations: data.conversations || data,
    teamMembers: data.teamMembers || [],
    loading,
    error,
    onRefresh: () => fetchData(true),
    lastUpdated
  };

  if (location.pathname === '/myqueue') {
    return (
      <MyQueue
        {...commonProps}
        currentUserEmail={currentUserEmail}
      />
    );
  }

  return (
    <Dashboard {...commonProps} />
  );
}

function App(props) {
  // Extract currentUserEmail from props (passed by Sigma plugin)
  const currentUserEmail = props?.currentUserEmail || null;
  
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppContent currentUserEmail={currentUserEmail} />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

