import React, { useMemo, useState, useRef, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useTheme } from "./ThemeContext";
import { formatDateTimeUTC } from "./utils/dateUtils";
import "./MyQueue.css";

const THRESHOLDS = {
  MAX_OPEN_SOFT: 5,
  MAX_WAITING_ON_TSE_SOFT: 5,
  MAX_OPEN_ALERT: 6,
  MAX_WAITING_ON_TSE_ALERT: 7
};

const INTERCOM_BASE_URL = "https://app.intercom.com/a/inbox/gu1e0q0t/inbox/admin/9110812/conversation/";

function MyQueue({ conversations = [], teamMembers = [], currentUserEmail, loading, error, onRefresh, lastUpdated, historicalSnapshots = [], responseTimeMetrics = [] }) {
  const { logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [filterTags, setFilterTags] = useState(["all"]);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef(null);
  const [searchId, setSearchId] = useState("");

  // Find current user's TSE info from teamMembers
  const currentTSE = useMemo(() => {
    if (!currentUserEmail || !teamMembers.length) return null;
    
    // Try to match by email (case-insensitive)
    const matched = teamMembers.find(member => 
      member.email && member.email.toLowerCase() === currentUserEmail.toLowerCase()
    );
    
    return matched || null;
  }, [currentUserEmail, teamMembers]);

  // Filter conversations for current user only
  const myConversations = useMemo(() => {
    console.log(`[MyQueue] Filtering conversations for current user. Total conversations: ${conversations?.length || 0}`);
    console.log(`[MyQueue] Current TSE:`, currentTSE);
    
    if (!conversations || !currentTSE) {
      console.log(`[MyQueue] Missing conversations or currentTSE. conversations: ${!!conversations}, currentTSE: ${!!currentTSE}`);
      return [];
    }
    
    const tseId = currentTSE.id;
    if (!tseId) {
      console.log(`[MyQueue] No TSE ID found in currentTSE:`, currentTSE);
      return [];
    }
    
    console.log(`[MyQueue] Looking for conversations assigned to TSE ID: ${tseId}`);
    
    // Debug: Log sample conversations to see their structure
    const sampleConvs = conversations.slice(0, 5);
    console.log(`[MyQueue] Sample conversations (first 5):`, sampleConvs.map(conv => ({
      id: conv.id || conv.conversation_id,
      state: conv.state,
      admin_assignee_id: conv.admin_assignee_id,
      admin_assignee: conv.admin_assignee,
      closed_at: conv.closed_at || conv.closedAt
    })));
    
    // Debug: Check ALL conversations for closed state (case-insensitive)
    const allClosed = conversations.filter(conv => {
      const state = (conv.state || "").toLowerCase();
      return state === "closed";
    });
    console.log(`[MyQueue] Found ${allClosed.length} conversations with state="closed" (case-insensitive check)`);
    if (allClosed.length > 0) {
      console.log(`[MyQueue] Closed conversation IDs:`, allClosed.map(conv => ({
        id: conv.id || conv.conversation_id,
        state: conv.state,
        admin_assignee_id: conv.admin_assignee_id,
        closed_at: conv.closed_at || conv.closedAt
      })));
    }
    
    // Debug: Count conversations by state
    const stateCounts = conversations.reduce((acc, conv) => {
      const state = (conv.state || "").toLowerCase();
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {});
    console.log(`[MyQueue] Conversation states in all conversations:`, stateCounts);
    
    // Debug: Check closed conversations specifically
    const closedConvs = conversations.filter(conv => (conv.state || "").toLowerCase() === "closed");
    console.log(`[MyQueue] Found ${closedConvs.length} closed conversations total`);
    if (closedConvs.length > 0) {
      console.log(`[MyQueue] Closed conversation assignment details:`, closedConvs.slice(0, 3).map(conv => ({
        id: conv.id || conv.conversation_id,
        admin_assignee_id: conv.admin_assignee_id,
        admin_assignee: conv.admin_assignee,
        admin_assignee_type: typeof conv.admin_assignee,
        closed_at: conv.closed_at || conv.closedAt
      })));
    }
    
    const filtered = conversations.filter(conv => {
      const convTseId = conv.admin_assignee_id || 
                       (conv.admin_assignee && typeof conv.admin_assignee === "object" ? conv.admin_assignee.id : null);
      const matches = String(convTseId) === String(tseId);
      
      // Debug closed conversations that don't match
      if ((conv.state || "").toLowerCase() === "closed" && !matches) {
        console.log(`[MyQueue] Closed conversation ${conv.id || conv.conversation_id} doesn't match:`, {
          convTseId,
          tseId,
          admin_assignee_id: conv.admin_assignee_id,
          admin_assignee: conv.admin_assignee
        });
      }
      
      return matches;
    });
    
    console.log(`[MyQueue] Filtered to ${filtered.length} conversations for TSE ${tseId}`);
    const filteredStateCounts = filtered.reduce((acc, conv) => {
      const state = (conv.state || "").toLowerCase();
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {});
    console.log(`[MyQueue] Filtered conversation states:`, filteredStateCounts);
    
    return filtered;
  }, [conversations, currentTSE]);

  // Calculate metrics for current user
  const metrics = useMemo(() => {
    if (!myConversations.length) {
      return {
        open: 0,
        waitingOnTSE: 0,
        waitingOnCustomerResolved: 0,
        waitingOnCustomerUnresolved: 0,
        totalSnoozed: 0,
        answeredToday: 0,
        closedToday: 0,
        status: "on-track",
        isOnTrack: true
      };
    }

    let open = 0;
    let waitingOnTSE = 0;
    let waitingOnCustomerResolved = 0;
    let waitingOnCustomerUnresolved = 0;
    let totalSnoozed = 0;
    let answeredToday = 0;
    let closedToday = 0;

    // Calculate today's start and end in seconds (UTC)
    const now = Date.now();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);
    const todayStartSeconds = Math.floor(todayStart.getTime() / 1000);
    const todayEndSeconds = Math.floor(todayEnd.getTime() / 1000);

    myConversations.forEach(conv => {
      const isSnoozed = conv.state === "snoozed" || conv.snoozed_until;
      const tags = Array.isArray(conv.tags) ? conv.tags : [];
      
      const hasWaitingOnTSETag = tags.some(t => 
        (t.name && t.name.toLowerCase() === "snooze.waiting-on-tse") || 
        (typeof t === "string" && t.toLowerCase() === "snooze.waiting-on-tse")
      );
      
      const hasWaitingOnCustomerResolvedTag = tags.some(t => 
        (t.name && t.name.toLowerCase() === "snooze.waiting-on-customer-resolved") || 
        (typeof t === "string" && t.toLowerCase() === "snooze.waiting-on-customer-resolved")
      );
      
      const hasWaitingOnCustomerUnresolvedTag = tags.some(t => 
        (t.name && t.name.toLowerCase() === "snooze.waiting-on-customer-unresolved") || 
        (typeof t === "string" && t.toLowerCase() === "snooze.waiting-on-customer-unresolved")
      );

      // Check if conversation was answered today
      const firstAdminReplyAt = conv.statistics?.first_admin_reply_at;
      if (firstAdminReplyAt && firstAdminReplyAt >= todayStartSeconds && firstAdminReplyAt < todayEndSeconds) {
        answeredToday++;
      }

      // Check if conversation has auto-closed tag and was closed today
      const hasAutoClosedTag = tags.some(t => 
        (t.name && t.name.toLowerCase() === "snooze.auto-closed") || 
        (typeof t === "string" && t.toLowerCase() === "snooze.auto-closed")
      );
      if (hasAutoClosedTag) {
        const closedAt = conv.closed_at || conv.closedAt;
        if (closedAt) {
          const closedAtSeconds = typeof closedAt === "number" 
            ? (closedAt > 1e12 ? Math.floor(closedAt / 1000) : closedAt)
            : Math.floor(new Date(closedAt).getTime() / 1000);
          if (closedAtSeconds >= todayStartSeconds && closedAtSeconds < todayEndSeconds) {
            closedToday++;
          }
        }
      }

      if (conv.state === "open" && !isSnoozed) {
        open++;
      } else if (isSnoozed) {
        totalSnoozed++;
        if (hasWaitingOnTSETag) {
          waitingOnTSE++;
        } else if (hasWaitingOnCustomerResolvedTag) {
          waitingOnCustomerResolved++;
        } else if (hasWaitingOnCustomerUnresolvedTag) {
          waitingOnCustomerUnresolved++;
        }
      }
    });

    const meetsOpen = open <= THRESHOLDS.MAX_OPEN_SOFT;
    const meetsWaitingOnTSE = waitingOnTSE <= THRESHOLDS.MAX_WAITING_ON_TSE_SOFT;
    const isOnTrack = meetsOpen && meetsWaitingOnTSE;
    
    let status = "on-track";
    if (open >= THRESHOLDS.MAX_OPEN_ALERT || waitingOnTSE >= THRESHOLDS.MAX_WAITING_ON_TSE_ALERT) {
      status = "over-limit";
    } else if (!isOnTrack) {
      status = "over-limit";
    }

    return {
      open,
      waitingOnTSE,
      waitingOnCustomerResolved,
      waitingOnCustomerUnresolved,
      totalSnoozed,
      answeredToday,
      closedToday,
      status,
      isOnTrack,
      meetsOpen,
      meetsWaitingOnTSE
    };
  }, [myConversations]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setFilterDropdownOpen(false);
      }
    };

    if (filterDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [filterDropdownOpen]);

  // Filter options configuration
  const filterOptions = [
    { value: "all", label: "All Conversations" },
    { value: "open", label: "Open Chats" },
    { value: "closed", label: "Closed" },
    { value: "waitingontse", label: "Waiting on TSE" },
    { value: "waitingoncustomer", label: "Waiting on Customer" },
    { value: "waitingoncustomer-resolved", label: "  └ Waiting on Customer - Resolved" },
    { value: "waitingoncustomer-unresolved", label: "  └ Waiting on Customer - Unresolved" }
  ];

  const handleFilterToggle = (value) => {
    if (value === "all") {
      // If "all" is clicked, toggle it and clear others
      setFilterTags(filterTags.includes("all") ? [] : ["all"]);
    } else {
      // Remove "all" if any specific filter is selected
      let newFilters = filterTags.filter(tag => tag !== "all");
      
      if (newFilters.includes(value)) {
        // Remove the filter
        newFilters = newFilters.filter(tag => tag !== value);
      } else {
        // Add the filter
        newFilters.push(value);
      }
      
      // If no filters selected, default to "all"
      setFilterTags(newFilters.length === 0 ? ["all"] : newFilters);
    }
  };

  // Filter conversations by tag
  const filteredConversations = useMemo(() => {
    // Calculate today's start and end in seconds (UTC) for closed filter
    const now = Date.now();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);
    const todayStartSeconds = Math.floor(todayStart.getTime() / 1000);
    const todayEndSeconds = Math.floor(todayEnd.getTime() / 1000);

    // Debug: Log conversation states
    console.log(`[MyQueue] Filtering conversations. Total: ${myConversations.length}`);
    const stateBreakdown = myConversations.reduce((acc, conv) => {
      const state = (conv.state || "").toLowerCase();
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {});
    console.log(`[MyQueue] Conversation states:`, stateBreakdown);
    
    // Debug: Log closed conversations details
    const closedConvs = myConversations.filter(conv => (conv.state || "").toLowerCase() === "closed");
    if (closedConvs.length > 0) {
      console.log(`[MyQueue] Found ${closedConvs.length} closed conversations:`);
      closedConvs.forEach(conv => {
        const closedAt = conv.closed_at || conv.closedAt;
        const closedAtSeconds = closedAt ? (typeof closedAt === "number" 
          ? (closedAt > 1e12 ? Math.floor(closedAt / 1000) : closedAt)
          : Math.floor(new Date(closedAt).getTime() / 1000)) : null;
        const tags = Array.isArray(conv.tags) ? conv.tags : [];
        const tagNames = tags.map(t => typeof t === "string" ? t : t.name).filter(Boolean);
        console.log(`[MyQueue]   - ID: ${conv.id || conv.conversation_id}, closed_at: ${closedAt} (${closedAtSeconds}), tags: [${tagNames.join(", ")}]`);
      });
    }
    console.log(`[MyQueue] Filter tags:`, filterTags);
    console.log(`[MyQueue] Today range: ${todayStartSeconds} to ${todayEndSeconds} (UTC)`);

    let filtered = myConversations;

    // If "all" is selected or no filters, include all conversations (open, snoozed, and closed today)
    if (filterTags.includes("all") || filterTags.length === 0) {
      // Include all conversations including closed ones from today
      filtered = filtered.filter(conv => {
        const state = (conv.state || "").toLowerCase();
        if (state === "closed") {
          // Only include closed conversations from today
          const closedAt = conv.closed_at || conv.closedAt;
          if (closedAt) {
            const closedAtSeconds = typeof closedAt === "number" 
              ? (closedAt > 1e12 ? Math.floor(closedAt / 1000) : closedAt)
              : Math.floor(new Date(closedAt).getTime() / 1000);
            return closedAtSeconds >= todayStartSeconds && closedAtSeconds < todayEndSeconds;
          }
          return false;
        }
        return true; // Include all non-closed conversations
      });
    } else {
      // Apply filters - conversation must match at least one selected filter
      filtered = filtered.filter(conv => {
        return filterTags.some(filterTag => {
          if (filterTag === "open") {
            const isSnoozed = conv.state === "snoozed" || conv.snoozed_until;
            return conv.state === "open" && !isSnoozed;
          } else if (filterTag === "closed") {
            const state = (conv.state || "").toLowerCase();
            if (state !== "closed") {
              console.log(`[MyQueue] Filtering out conversation ${conv.id || conv.conversation_id}: state is "${state}", not "closed"`);
              return false;
            }
            // Only include closed conversations from today
            const closedAt = conv.closed_at || conv.closedAt;
            if (!closedAt) {
              console.log(`[MyQueue] Filtering out closed conversation ${conv.id || conv.conversation_id}: no closed_at field`);
              return false;
            }
            const closedAtSeconds = typeof closedAt === "number" 
              ? (closedAt > 1e12 ? Math.floor(closedAt / 1000) : closedAt)
              : Math.floor(new Date(closedAt).getTime() / 1000);
            const isInToday = closedAtSeconds >= todayStartSeconds && closedAtSeconds < todayEndSeconds;
            if (!isInToday) {
              console.log(`[MyQueue] Filtering out closed conversation ${conv.id || conv.conversation_id}: closed_at ${closedAtSeconds} not in today's range (${todayStartSeconds} to ${todayEndSeconds})`);
            } else {
              console.log(`[MyQueue] Including closed conversation ${conv.id || conv.conversation_id}: closed_at ${closedAtSeconds} is in today's range`);
            }
            return isInToday;
          } else if (filterTag === "waitingontse") {
            const isSnoozed = conv.state === "snoozed" || conv.snoozed_until;
            if (!isSnoozed) return false;
            const tags = Array.isArray(conv.tags) ? conv.tags : [];
            return tags.some(t => 
              (t.name && t.name.toLowerCase() === "snooze.waiting-on-tse") || 
              (typeof t === "string" && t.toLowerCase() === "snooze.waiting-on-tse")
            );
          } else if (filterTag === "waitingoncustomer") {
            const isSnoozed = conv.state === "snoozed" || conv.snoozed_until;
            if (!isSnoozed) return false;
            const tags = Array.isArray(conv.tags) ? conv.tags : [];
            return tags.some(t => 
              (t.name && (t.name.toLowerCase() === "snooze.waiting-on-customer-resolved" || t.name.toLowerCase() === "snooze.waiting-on-customer-unresolved")) || 
              (typeof t === "string" && (t.toLowerCase() === "snooze.waiting-on-customer-resolved" || t.toLowerCase() === "snooze.waiting-on-customer-unresolved"))
            );
          } else if (filterTag === "waitingoncustomer-resolved") {
            const isSnoozed = conv.state === "snoozed" || conv.snoozed_until;
            if (!isSnoozed) return false;
            const tags = Array.isArray(conv.tags) ? conv.tags : [];
            return tags.some(t => 
              (t.name && t.name.toLowerCase() === "snooze.waiting-on-customer-resolved") || 
              (typeof t === "string" && t.toLowerCase() === "snooze.waiting-on-customer-resolved")
            );
          } else if (filterTag === "waitingoncustomer-unresolved") {
            const isSnoozed = conv.state === "snoozed" || conv.snoozed_until;
            if (!isSnoozed) return false;
            const tags = Array.isArray(conv.tags) ? conv.tags : [];
            return tags.some(t => 
              (t.name && t.name.toLowerCase() === "snooze.waiting-on-customer-unresolved") || 
              (typeof t === "string" && t.toLowerCase() === "snooze.waiting-on-customer-unresolved")
            );
          }
          return false;
        });
      });
    }

    // Filter by search ID
    if (searchId.trim()) {
      const searchTerm = searchId.trim().toLowerCase();
      filtered = filtered.filter(conv => {
        const convId = conv.id || conv.conversation_id || "";
        return String(convId).toLowerCase().includes(searchTerm);
      });
    }

    console.log(`[MyQueue] Final filtered count: ${filtered.length} conversations`);
    if (filterTags.includes("closed")) {
      const closedFiltered = filtered.filter(conv => (conv.state || "").toLowerCase() === "closed");
      console.log(`[MyQueue] Closed conversations after filtering: ${closedFiltered.length}`);
      if (closedFiltered.length > 0) {
        closedFiltered.forEach(conv => {
          const closedAt = conv.closed_at || conv.closedAt;
          const closedAtSeconds = closedAt ? (typeof closedAt === "number" 
            ? (closedAt > 1e12 ? Math.floor(closedAt / 1000) : closedAt)
            : Math.floor(new Date(closedAt).getTime() / 1000)) : null;
          console.log(`[MyQueue]   - Included closed: ID ${conv.id || conv.conversation_id}, closed_at: ${closedAtSeconds}`);
        });
      }
    }

    return filtered;
  }, [myConversations, filterTags, searchId]);

  // Use shared date formatting utility
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    return formatDateTimeUTC(timestamp);
  };

  // Calculate TSE historical metrics and insights (similar to TSE Details Modal)
  const tseMetrics = useMemo(() => {
    if (!currentTSE || !historicalSnapshots || historicalSnapshots.length === 0) {
      return { insights: [] };
    }

    const tseId = String(currentTSE.id);
    const tseName = currentTSE.name;
    
    // Filter snapshots that contain this TSE
    const tseHistory = historicalSnapshots
      .map(snapshot => {
        const tseData = snapshot.tse_data || snapshot.tseData || [];
        const tseEntry = tseData.find(t => String(t.id) === tseId || t.name === tseName);
        if (!tseEntry) return null;

        const open = tseEntry.open || 0;
        const waitingOnTSE = tseEntry.waitingOnTSE || tseEntry.actionableSnoozed || 0;
        const meetsOpen = open <= THRESHOLDS.MAX_OPEN_SOFT;
        const meetsWaitingOnTSE = waitingOnTSE <= THRESHOLDS.MAX_WAITING_ON_TSE_SOFT;
        const isOnTrack = meetsOpen && meetsWaitingOnTSE;

        return {
          date: snapshot.date,
          open,
          waitingOnTSE,
          totalSnoozed: tseEntry.snoozed || tseEntry.totalSnoozed || 0,
          isOnTrack,
          meetsOpen,
          meetsWaitingOnTSE
        };
      })
      .filter(item => item !== null)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (tseHistory.length === 0) {
      return { insights: [] };
    }

    // Calculate averages
    const avgOpen = tseHistory.reduce((sum, d) => sum + d.open, 0) / tseHistory.length;
    const avgWaitingOnTSE = tseHistory.reduce((sum, d) => sum + d.waitingOnTSE, 0) / tseHistory.length;
    const onTrackDays = tseHistory.filter(d => d.isOnTrack).length;
    const onTrackPercentage = (onTrackDays / tseHistory.length) * 100;

    // Calculate trends (last 7 days vs previous 7 days, or last half vs first half)
    let trend;
    if (tseHistory.length >= 14) {
      const last7 = tseHistory.slice(-7);
      const previous7 = tseHistory.slice(-14, -7);
      const last7OnTrack = last7.filter(d => d.isOnTrack).length / 7;
      const previous7OnTrack = previous7.filter(d => d.isOnTrack).length / 7;
      const change = (last7OnTrack - previous7OnTrack) * 100;
      trend = {
        period: 'Last 7 days vs previous 7 days',
        change: change,
        direction: change > 2 ? 'improving' : change < -2 ? 'worsening' : 'stable'
      };
    } else if (tseHistory.length >= 2) {
      const lastHalf = tseHistory.slice(Math.floor(tseHistory.length / 2));
      const firstHalf = tseHistory.slice(0, Math.floor(tseHistory.length / 2));
      const lastHalfOnTrack = lastHalf.filter(d => d.isOnTrack).length / lastHalf.length;
      const firstHalfOnTrack = firstHalf.filter(d => d.isOnTrack).length / firstHalf.length;
      const change = (lastHalfOnTrack - firstHalfOnTrack) * 100;
      trend = {
        period: 'Recent vs earlier period',
        change: change,
        direction: change > 2 ? 'improving' : change < -2 ? 'worsening' : 'stable'
      };
    } else {
      trend = {
        period: 'Insufficient data',
        change: 0,
        direction: 'stable'
      };
    }

    // Generate key insights
    const insights = [];
    
    if (onTrackPercentage >= 80) {
      insights.push({
        type: 'positive',
        text: `Excellent performance: ${onTrackPercentage.toFixed(0)}% on-track over ${tseHistory.length} days`
      });
    } else if (onTrackPercentage < 60) {
      insights.push({
        type: 'warning',
        text: `Only ${onTrackPercentage.toFixed(0)}% on-track over ${tseHistory.length} days`
      });
    }

    if (avgOpen > THRESHOLDS.MAX_OPEN_SOFT) {
      insights.push({
        type: 'warning',
        text: `Average open chats (${avgOpen.toFixed(1)}) exceeds target (≤${THRESHOLDS.MAX_OPEN_SOFT})`
      });
    }

    if (avgWaitingOnTSE > THRESHOLDS.MAX_WAITING_ON_TSE_SOFT) {
      insights.push({
        type: 'warning',
        text: `Average waiting on TSE (${avgWaitingOnTSE.toFixed(1)}) exceeds target (≤${THRESHOLDS.MAX_WAITING_ON_TSE_SOFT})`
      });
    }

    if (trend.direction === 'improving') {
      insights.push({
        type: 'positive',
        text: `Performance improving: ${trend.change > 0 ? '+' : ''}${trend.change.toFixed(1)}% on-track ${trend.period}`
      });
    } else if (trend.direction === 'worsening') {
      insights.push({
        type: 'warning',
        text: `${trend.change.toFixed(1)}% on-track ${trend.period}`
      });
    }

    return { insights };
  }, [currentTSE, historicalSnapshots]);

  // Show loading state while team members are being fetched
  if (loading && teamMembers.length === 0) {
    return (
      <div className="my-queue-container">
        <div className="my-queue-header">
          <h1>My Queue</h1>
        </div>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p>Loading your queue data...</p>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
            Fetching team members and conversations...
          </p>
        </div>
      </div>
    );
  }

  if (!currentTSE) {
    // Debug info: show what we have
    const availableEmails = teamMembers.length > 0 
      ? teamMembers.map(m => m.email).filter(Boolean).slice(0, 10) // Show first 10 emails
      : [];
    
    return (
      <div className="my-queue-container">
        <div className="my-queue-header">
          <h1>My Queue</h1>
        </div>
        <div className="my-queue-error">
          <p>Unable to identify your account. Please ensure your email matches your Intercom account.</p>
          <div className="debug-info" style={{ marginTop: '12px', fontSize: '12px', color: '#666' }}>
            <p><strong>Current User Email:</strong> {currentUserEmail || "Not provided"}</p>
            {teamMembers.length === 0 && (
              <p><strong>Team Members:</strong> No team members loaded</p>
            )}
            {teamMembers.length > 0 && (
              <>
                <p><strong>Team Members Found:</strong> {teamMembers.length}</p>
                {availableEmails.length > 0 && (
                  <details style={{ marginTop: '8px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Available Emails (click to expand)</summary>
                    <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                      {availableEmails.map((email, idx) => (
                        <li key={idx} style={{ fontFamily: 'monospace', fontSize: '11px' }}>{email}</li>
                      ))}
                      {teamMembers.length > 10 && <li>... and {teamMembers.length - 10} more</li>}
                    </ul>
                  </details>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-queue-container">
      <div className="my-queue-header">
        <div className="header-content">
          <h1>My Queue</h1>
          <div className="header-actions">
            <button
              className="dark-mode-toggle-button"
              onClick={toggleDarkMode}
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              <img 
                src={isDarkMode 
                  ? "https://res.cloudinary.com/doznvxtja/image/upload/v1768686539/3_150_x_150_px_14_acgkkq.svg"
                  : "https://res.cloudinary.com/doznvxtja/image/upload/v1768686539/3_150_x_150_px_15_ytqu5j.svg"
                }
                alt={isDarkMode ? "Light mode" : "Dark mode"} 
                className="dark-mode-icon"
              />
            </button>
            <button onClick={logout} className="logout-btn">
              Sign Out
            </button>
            <button onClick={onRefresh} className="refresh-btn" disabled={loading}>
              {loading ? "Refreshing..." : "🔄 Refresh"}
            </button>
            {lastUpdated && (
              <span className="last-updated">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div className="tse-info">
          <h2>{currentTSE.name}</h2>
        </div>
      </div>

      {error && (
        <div className="my-queue-error">
          <p>Error: {error}</p>
        </div>
      )}

      {/* Key Insights */}
      {tseMetrics.insights.length > 0 && (
        <div className="key-insights-section" style={{
          marginBottom: '25px',
          padding: '16px',
          backgroundColor: isDarkMode ? '#1a1a1a' : '#f5f5f5',
          borderRadius: '8px',
          border: `1px solid ${isDarkMode ? '#333' : '#e0e0e0'}`
        }}>
          <h3 style={{
            margin: '0 0 12px 0',
            fontSize: '16px',
            fontWeight: 600,
            color: isDarkMode ? '#ffffff' : '#292929'
          }}>
            Key Insights
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tseMetrics.insights.map((insight, idx) => (
              <div 
                key={idx}
                style={{
                  backgroundColor: insight.type === 'positive' 
                    ? (isDarkMode ? '#1a3a2a' : '#d4edda')
                    : (isDarkMode ? '#3a2a1a' : '#fff3cd'),
                  color: insight.type === 'positive'
                    ? (isDarkMode ? '#4cec8c' : '#155724')
                    : (isDarkMode ? '#ffc107' : '#856404'),
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              >
                {insight.type === 'positive' ? '✓' : '⚠'} {insight.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className={`metric-card metric-card-status ${metrics.status === "on-track" ? "status-on-track" : "status-over-limit"}`}>
          <div className="metric-label">On Track Status</div>
          <div className="metric-value" style={{ fontSize: '24px', fontWeight: 600 }}>
            {metrics.status === "on-track" ? "✓ On Track" : "⚠ Over Limit"}
          </div>
          <div className="metric-target">
            {metrics.isOnTrack ? "Meeting all targets" : "Exceeding limits"}
          </div>
        </div>

        <div className={`metric-card metric-card-open ${metrics.open > THRESHOLDS.MAX_OPEN_SOFT ? "over-limit" : ""}`}>
          <div className="metric-label">Open Chats</div>
          <div className="metric-value">{metrics.open}</div>
          <div className="metric-target">Target: ≤{THRESHOLDS.MAX_OPEN_SOFT}</div>
          {metrics.open > THRESHOLDS.MAX_OPEN_SOFT && (
            <div className="metric-alert">⚠ Over limit</div>
          )}
        </div>

        <div className={`metric-card metric-card-waiting-tse ${metrics.waitingOnTSE > THRESHOLDS.MAX_WAITING_ON_TSE_SOFT ? "over-limit" : ""}`}>
          <div className="metric-label">Waiting on TSE</div>
          <div className="metric-value">{metrics.waitingOnTSE}</div>
          <div className="metric-target">Target: ≤{THRESHOLDS.MAX_WAITING_ON_TSE_SOFT}</div>
          {metrics.waitingOnTSE > THRESHOLDS.MAX_WAITING_ON_TSE_SOFT && (
            <div className="metric-alert">⚠ Over limit</div>
          )}
        </div>

        <div className="metric-card metric-card-waiting-resolved">
          <div className="metric-label">Waiting on Customer - Resolved</div>
          <div className="metric-value">{metrics.waitingOnCustomerResolved}</div>
          <div className="metric-target">No limit</div>
        </div>

        <div className="metric-card metric-card-waiting-unresolved">
          <div className="metric-label">Waiting on Customer - Unresolved</div>
          <div className="metric-value">{metrics.waitingOnCustomerUnresolved}</div>
          <div className="metric-target">No limit</div>
        </div>

        <div className="metric-card metric-card-snoozed">
          <div className="metric-label">Total Snoozed</div>
          <div className="metric-value">{metrics.totalSnoozed}</div>
        </div>

        <div className="metric-card metric-card-taken">
          <div className="metric-label">Chats Taken Today</div>
          <div className="metric-value">{metrics.answeredToday}</div>
          <div className="metric-target">New chats answered</div>
        </div>

        <div className="metric-card metric-card-auto-closed">
          <div className="metric-label">Auto-Closed Today</div>
          <div className="metric-value">{metrics.closedToday}</div>
          <div className="metric-target">Auto-closed conversations</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label htmlFor="tag-filter">Filter by Type:</label>
          <div className="filter-dropdown-container" ref={filterDropdownRef}>
            <button
              type="button"
              id="tag-filter"
              onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
              className="filter-select filter-dropdown-button"
            >
              {filterTags.includes("all") || filterTags.length === 0
                ? "All Conversations"
                : filterTags.length === 1
                ? filterOptions.find(opt => opt.value === filterTags[0])?.label || "Select filters"
                : `${filterTags.length} filters selected`}
              <span className="filter-dropdown-arrow">{filterDropdownOpen ? "▲" : "▼"}</span>
            </button>
            {filterDropdownOpen && (
              <div className="filter-dropdown-menu">
                {filterOptions.map(option => (
                  <label key={option.value} className="filter-checkbox-label">
                    <input
                      type="checkbox"
                      checked={filterTags.includes(option.value)}
                      onChange={() => handleFilterToggle(option.value)}
                      className="filter-checkbox"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="filter-group">
          <label htmlFor="search-id">Search by ID:</label>
          <input
            id="search-id"
            type="text"
            placeholder="Enter conversation ID..."
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="conversations-section">
        <h3>
          {filterTags.includes("all") || filterTags.length === 0
            ? "All Conversations"
            : filterTags.length === 1
            ? (filterTags[0] === "closed" ? "Closed" : filterOptions.find(opt => opt.value === filterTags[0])?.label.replace("  └ ", "") || "All Conversations")
            : `${filterTags.length} Filters Selected`} 
          ({filteredConversations.length})
        </h3>

        {filteredConversations.length === 0 ? (
          <div className="no-conversations">
            <p>No conversations found matching your filters.</p>
          </div>
        ) : (
          <div className="conversations-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Active Snooze Workflow</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredConversations.map(conv => {
                  const isSnoozed = conv.state === "snoozed" || conv.snoozed_until;
                  const tags = Array.isArray(conv.tags) ? conv.tags : [];
                  const tagNames = tags.map(t => typeof t === "string" ? t : t.name).filter(Boolean);
                  
                  // Mapping from tag names to display names (handles both with and without "snooze." prefix)
                  const workflowMapping = {
                    "waiting-on-customer-unresolved": "Waiting On Customer - Unresolved",
                    "waiting-on-customer-resolved": "Waiting On Customer - Resolved",
                    "waiting-on-tse": "Waiting On TSE - Deep Dive",
                    "snooze.waiting-on-customer-unresolved": "Waiting On Customer - Unresolved",
                    "snooze.waiting-on-customer-resolved": "Waiting On Customer - Resolved",
                    "snooze.waiting-on-tse": "Waiting On TSE - Deep Dive"
                  };
                  
                  // Find the first matching workflow tag
                  const activeWorkflowTag = tagNames.find(tagName => {
                    if (!tagName) return false;
                    const normalizedTag = tagName.toLowerCase();
                    // Check exact match
                    if (workflowMapping[normalizedTag]) return true;
                    // Check if it ends with the workflow pattern (handles variations)
                    return normalizedTag.includes("waiting-on-customer-unresolved") ||
                           normalizedTag.includes("waiting-on-customer-resolved") ||
                           normalizedTag.includes("waiting-on-tse");
                  });
                  
                  // Get display value
                  let displayWorkflow = "";
                  if (activeWorkflowTag) {
                    const normalizedTag = activeWorkflowTag.toLowerCase();
                    // Try exact match first
                    if (workflowMapping[normalizedTag]) {
                      displayWorkflow = workflowMapping[normalizedTag];
                    } else if (normalizedTag.includes("waiting-on-customer-unresolved")) {
                      displayWorkflow = "Waiting On Customer - Unresolved";
                    } else if (normalizedTag.includes("waiting-on-customer-resolved")) {
                      displayWorkflow = "Waiting On Customer - Resolved";
                    } else if (normalizedTag.includes("waiting-on-tse")) {
                      displayWorkflow = "Waiting On TSE - Deep Dive";
                    }
                  }
                  
                  const isClosed = (conv.state || "").toLowerCase() === "closed";
                  
                  return (
                    <tr key={conv.id || conv.conversation_id}>
                      <td className="conv-id">{conv.id || conv.conversation_id}</td>
                      <td>
                        <span className={`status-badge-small ${isClosed ? "closed" : isSnoozed ? "snoozed" : "open"}`}>
                          {isClosed ? "Closed" : isSnoozed ? "Snoozed" : "Open"}
                        </span>
                      </td>
                      <td>{displayWorkflow}</td>
                      <td>{formatDate(conv.created_at || conv.createdAt)}</td>
                      <td>
                        <a 
                          href={`${INTERCOM_BASE_URL}${conv.id || conv.conversation_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="intercom-link"
                        >
                          Open in Intercom →
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

export default MyQueue;
