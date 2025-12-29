import React, { useEffect, useState } from "react";
import Dashboard from "./Dashboard";
import "./App.css";

// Backend URL configuration for Sigma plugin deployment
// In production (Vercel), use the full Vercel URL so API calls work from Sigma's iframe
// In development, use localhost backend
// For Sigma plugins: The plugin URL will be something like https://your-app.vercel.app
// The API endpoint will be at the same domain: https://your-app.vercel.app/api/intercom/...
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

const BACKEND_URL = getBackendUrl();

function App() {
  const [data, setData] = useState({ conversations: [], teamMembers: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  async function fetchData(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    }
    setError("");

    try {
      // In production, use /api route; in development, use full backend URL
      const apiPath = process.env.NODE_ENV === 'production' 
        ? '/api/intercom/conversations/open-team-5480079'
        : '/intercom/conversations/open-team-5480079';
      const res = await fetch(
        `${BACKEND_URL}${apiPath}`
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const response = await res.json();
      // Handle both old format (array) and new format (object with conversations and teamMembers)
      const conversations = Array.isArray(response) ? response : (response.conversations || []);
      const teamMembers = response.teamMembers || [];
      setData({ conversations, teamMembers });
      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    fetchData(true); // Initial load with loading state
    
    // Set up auto-refresh every 2 minutes (120000 ms)
    const interval = setInterval(() => {
      fetchData(false); // Background refresh without loading state
    }, 120000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <Dashboard
      conversations={data.conversations || data}
      teamMembers={data.teamMembers || []}
      loading={loading}
      error={error}
      onRefresh={() => fetchData(true)}
      lastUpdated={lastUpdated}
    />
  );
}

export default App;

