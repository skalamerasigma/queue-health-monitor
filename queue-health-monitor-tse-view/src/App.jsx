import React, { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import LoginPage from "./LoginPage";
import MyQueue from "./MyQueue";
import "./App.css";

// Sigma plugin API integration
// Get current user email from Sigma plugin props
// In Sigma, this will be passed as a prop: currentUserEmail
// The plugin definition in Sigma should have an argument bound to CurrentUserEmail() system function
function getCurrentUserEmail(props) {
  // Method 1: Get from Sigma plugin props (when embedded in Sigma)
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

function AppContent(props) {
  const { isAuthenticated, loading: authLoading, login } = useAuth();
  const [data, setData] = useState({ conversations: [], teamMembers: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [currentUserEmail, setCurrentUserEmail] = useState(null);
  const [historicalSnapshots, setHistoricalSnapshots] = useState([]);

  // Get current user email on mount
  useEffect(() => {
    const email = getCurrentUserEmail(props);
    setCurrentUserEmail(email);
    console.log('App: Current user email:', email);
  }, [props]);

  async function fetchData(showLoading = true, skipClosed = false) {
    if (showLoading) {
      setLoading(true);
    }
    setError("");

    try {
      // Since this is a separate deployment, always call the main Queue Health Monitor API
      // The API is hosted on the main project domain
      const apiBaseUrl = process.env.REACT_APP_API_URL || 
                     'https://queue-health-monitor.vercel.app/api/intercom/conversations/open-team-5480079';
      
      // Add query parameter to skip closed conversations if requested
      const apiUrl = skipClosed 
        ? `${apiBaseUrl}?skipClosed=true`
        : apiBaseUrl;
      
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

  // Fetch closed conversations separately in the background
  async function fetchClosedConversations() {
    try {
      const apiBaseUrl = process.env.REACT_APP_API_URL || 
                     'https://queue-health-monitor.vercel.app/api/intercom/conversations/open-team-5480079';
      
      const apiUrl = `${apiBaseUrl}?closedOnly=true`;
      
      console.log('App: Fetching closed conversations from:', apiUrl);
      const res = await fetch(apiUrl);

      if (!res.ok) {
        const text = await res.text();
        console.warn('App: Error fetching closed conversations:', text || `HTTP ${res.status}`);
        return;
      }

      const response = await res.json();
      const closedConversations = Array.isArray(response) ? response : (response.conversations || []);
      
      console.log('App: Received', closedConversations.length, 'closed conversations');
      
      // Merge closed conversations into existing data
      setData(prevData => {
        const existingConversations = Array.isArray(prevData) ? prevData : (prevData.conversations || []);
        const existingTeamMembers = prevData.teamMembers || [];
        
        // Create a map of existing conversation IDs to avoid duplicates
        const existingIds = new Set(existingConversations.map(c => c.id || c.conversation_id));
        
        // Filter out any closed conversations that are already in the list
        const newClosedConversations = closedConversations.filter(c => {
          const id = c.id || c.conversation_id;
          return !existingIds.has(id);
        });
        
        // Combine existing conversations with new closed conversations
        const allConversations = [...existingConversations, ...newClosedConversations];
        
        console.log('App: Merged closed conversations. Total conversations:', allConversations.length);
        
        return {
          conversations: allConversations,
          teamMembers: existingTeamMembers
        };
      });
    } catch (e) {
      console.warn('App: Error fetching closed conversations:', e.message);
      // Silently fail - closed conversations are loaded in background
    }
  }

  useEffect(() => {
    async function fetchHistoricalSnapshots() {
      try {
        // Get last 7 weekdays for streak calculation
        const getLast7Weekdays = () => {
          const dates = [];
          const today = new Date();
          let daysBack = 0;
          let weekdaysFound = 0;
          
          while (weekdaysFound < 7 && daysBack < 14) {
            const date = new Date(today);
            date.setDate(date.getDate() - daysBack);
            const dayOfWeek = date.getDay();
            
            // Monday = 1, Friday = 5
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
              dates.push(date.toISOString().split('T')[0]);
              weekdaysFound++;
            }
            daysBack++;
          }
          
          return dates.sort();
        };
        
        const weekdays = getLast7Weekdays();
        const startDateStr = weekdays.length > 0 ? weekdays[0] : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const endDateStr = weekdays.length > 0 ? weekdays[weekdays.length - 1] : new Date().toISOString().slice(0, 10);

        const snapshotParams = new URLSearchParams();
        snapshotParams.append('startDate', startDateStr);
        snapshotParams.append('endDate', endDateStr);
        
        const apiBaseUrl = process.env.REACT_APP_API_URL || 'https://queue-health-monitor.vercel.app';
        const snapshotUrl = `${apiBaseUrl}/api/snapshots/get?${snapshotParams}`;
        
        const snapshotRes = await fetch(snapshotUrl);
        if (snapshotRes.ok) {
          const snapshotData = await snapshotRes.json();
          setHistoricalSnapshots(snapshotData.snapshots || []);
        }
      } catch (error) {
        console.error('Error fetching historical snapshots:', error);
        // Silently fail - historical data is optional
        setHistoricalSnapshots([]);
      }
    }

    // Initial load: fetch open/snoozed conversations (skip closed)
    fetchData(true, true); // Initial load with loading state, skip closed conversations
    fetchHistoricalSnapshots(); // Fetch historical data for streaks
    
    // After initial load, fetch closed conversations in the background
    // Use setTimeout to ensure the page has rendered first
    const closedTimeout = setTimeout(() => {
      fetchClosedConversations();
    }, 100); // Small delay to ensure initial render completes
    
    // Set up auto-refresh every 2 minutes (120000 ms)
    const interval = setInterval(() => {
      fetchData(false, false); // Background refresh without loading state, include closed conversations
      fetchHistoricalSnapshots(); // Refresh historical data too
    }, 120000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(closedTimeout);
    };
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

  return (
    <MyQueue
      conversations={data.conversations || data}
      teamMembers={data.teamMembers || []}
      currentUserEmail={currentUserEmail}
      loading={loading}
      error={error}
      onRefresh={async () => {
        await fetchData(true, false); // Manual refresh includes closed conversations
        // Fetch historical snapshots on refresh
        try {
          const getLast7Weekdays = () => {
            const dates = [];
            const today = new Date();
            let daysBack = 0;
            let weekdaysFound = 0;
            
            while (weekdaysFound < 7 && daysBack < 14) {
              const date = new Date(today);
              date.setDate(date.getDate() - daysBack);
              const dayOfWeek = date.getDay();
              
              if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                dates.push(date.toISOString().split('T')[0]);
                weekdaysFound++;
              }
              daysBack++;
            }
            
            return dates.sort();
          };
          
          const weekdays = getLast7Weekdays();
          const startDateStr = weekdays.length > 0 ? weekdays[0] : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
          const endDateStr = weekdays.length > 0 ? weekdays[weekdays.length - 1] : new Date().toISOString().slice(0, 10);

          const snapshotParams = new URLSearchParams();
          snapshotParams.append('startDate', startDateStr);
          snapshotParams.append('endDate', endDateStr);
          
          const apiBaseUrl = process.env.REACT_APP_API_URL || 'https://queue-health-monitor.vercel.app';
          const snapshotUrl = `${apiBaseUrl}/api/snapshots/get?${snapshotParams}`;
          
          const snapshotRes = await fetch(snapshotUrl);
          if (snapshotRes.ok) {
            const snapshotData = await snapshotRes.json();
            setHistoricalSnapshots(snapshotData.snapshots || []);
          }
        } catch (error) {
          console.error('Error fetching historical snapshots:', error);
        }
      }}
      lastUpdated={lastUpdated}
      historicalSnapshots={historicalSnapshots}
    />
  );
}

function App(props) {
  return (
    <AuthProvider>
      <AppContent {...props} />
    </AuthProvider>
  );
}

export default App;
