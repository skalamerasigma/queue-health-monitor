import React, { useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { formatDateTimeUTC } from "./utils/dateUtils";
import "./MyQueue.css";

const THRESHOLDS = {
  MAX_OPEN_SOFT: 5,
  MAX_WAITING_ON_TSE_SOFT: 5,
  MAX_OPEN_ALERT: 6,
  MAX_WAITING_ON_TSE_ALERT: 7
};

const INTERCOM_BASE_URL = "https://app.intercom.com/a/inbox/gu1e0q0t/inbox/admin/9110812/conversation/";

function MyQueue({ conversations = [], teamMembers = [], currentUserEmail, loading, error, onRefresh, lastUpdated }) {
  const { logout } = useAuth();
  const [filterTag, setFilterTag] = useState("all");
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
    if (!conversations || !currentTSE) return [];
    
    const tseId = currentTSE.id;
    if (!tseId) return [];
    
    return conversations.filter(conv => {
      const convTseId = conv.admin_assignee_id || 
                       (conv.admin_assignee && typeof conv.admin_assignee === "object" ? conv.admin_assignee.id : null);
      return String(convTseId) === String(tseId);
    });
  }, [conversations, currentTSE]);

  // Calculate metrics for current user
  const metrics = useMemo(() => {
    if (!myConversations.length) {
      return {
        open: 0,
        waitingOnTSE: 0,
        waitingOnCustomer: 0,
        totalSnoozed: 0,
        status: "on-track",
        isOnTrack: true
      };
    }

    let open = 0;
    let waitingOnTSE = 0;
    let waitingOnCustomer = 0;
    let totalSnoozed = 0;

    myConversations.forEach(conv => {
      const isSnoozed = conv.state === "snoozed" || conv.snoozed_until;
      const tags = Array.isArray(conv.tags) ? conv.tags : [];
      
      const hasWaitingOnTSETag = tags.some(t => 
        (t.name && t.name.toLowerCase() === "snooze.waiting-on-tse") || 
        (typeof t === "string" && t.toLowerCase() === "snooze.waiting-on-tse")
      );
      
      const hasWaitingOnCustomerTag = tags.some(t => 
        (t.name && (t.name.toLowerCase() === "snooze.waiting-on-customer-resolved" || t.name.toLowerCase() === "snooze.waiting-on-customer-unresolved")) || 
        (typeof t === "string" && (t.toLowerCase() === "snooze.waiting-on-customer-resolved" || t.toLowerCase() === "snooze.waiting-on-customer-unresolved"))
      );

      if (conv.state === "open" && !isSnoozed) {
        open++;
      } else if (isSnoozed) {
        totalSnoozed++;
        if (hasWaitingOnTSETag) {
          waitingOnTSE++;
        } else if (hasWaitingOnCustomerTag) {
          waitingOnCustomer++;
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
      waitingOnCustomer,
      totalSnoozed,
      status,
      isOnTrack,
      meetsOpen,
      meetsWaitingOnTSE
    };
  }, [myConversations]);

  // Filter conversations by tag
  const filteredConversations = useMemo(() => {
    let filtered = myConversations;

    // Filter by tag
    if (filterTag === "open") {
      filtered = filtered.filter(conv => {
        const isSnoozed = conv.state === "snoozed" || conv.snoozed_until;
        return conv.state === "open" && !isSnoozed;
      });
    } else if (filterTag === "waitingontse") {
      filtered = filtered.filter(conv => {
        const isSnoozed = conv.state === "snoozed" || conv.snoozed_until;
        if (!isSnoozed) return false;
        const tags = Array.isArray(conv.tags) ? conv.tags : [];
        return tags.some(t => 
          (t.name && t.name.toLowerCase() === "snooze.waiting-on-tse") || 
          (typeof t === "string" && t.toLowerCase() === "snooze.waiting-on-tse")
        );
      });
    } else if (filterTag === "waitingoncustomer") {
      filtered = filtered.filter(conv => {
        const isSnoozed = conv.state === "snoozed" || conv.snoozed_until;
        if (!isSnoozed) return false;
        const tags = Array.isArray(conv.tags) ? conv.tags : [];
        return tags.some(t => 
          (t.name && (t.name.toLowerCase() === "snooze.waiting-on-customer-resolved" || t.name.toLowerCase() === "snooze.waiting-on-customer-unresolved")) || 
          (typeof t === "string" && (t.toLowerCase() === "snooze.waiting-on-customer-resolved" || t.toLowerCase() === "snooze.waiting-on-customer-unresolved"))
        );
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

    return filtered;
  }, [myConversations, filterTag, searchId]);

  // Get status message
  const getStatusMessage = () => {
    if (metrics.isOnTrack) {
      return "You're on track! 🎉";
    }
    
    const issues = [];
    if (!metrics.meetsOpen) {
      issues.push(`${metrics.open} open chats (target: ≤${THRESHOLDS.MAX_OPEN_SOFT})`);
    }
    if (!metrics.meetsWaitingOnTSE) {
      issues.push(`${metrics.waitingOnTSE} waiting on TSE (target: ≤${THRESHOLDS.MAX_WAITING_ON_TSE_SOFT})`);
    }
    
    return `Over limit: ${issues.join(", ")}`;
  };

  // Use shared date formatting utility
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    return formatDateTimeUTC(timestamp);
  };

  if (!currentTSE) {
    return (
      <div className="my-queue-container">
        <div className="my-queue-header">
          <h1>My Queue</h1>
        </div>
        <div className="my-queue-error">
          <p>Unable to identify your account. Please ensure your email matches your Intercom account.</p>
          <p className="debug-info">Current User Email: {currentUserEmail || "Not provided"}</p>
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
            <div className="button-stack">
              <button onClick={logout} className="logout-btn">
                Sign Out
              </button>
              <button onClick={onRefresh} className="refresh-btn" disabled={loading}>
                {loading ? "Refreshing..." : "🔄 Refresh"}
              </button>
            </div>
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

      {/* Status Card */}
      <div className={`status-card ${metrics.status}`}>
        <div className="status-header">
          <h3>Queue Status</h3>
          <span className={`status-badge ${metrics.status}`}>
            {metrics.status === "on-track" ? "✓ On Track" : "⚠ Over Limit"}
          </span>
        </div>
        <p className="status-message">{getStatusMessage()}</p>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className={`metric-card ${metrics.open > THRESHOLDS.MAX_OPEN_SOFT ? "over-limit" : ""}`}>
          <div className="metric-label">Open Chats</div>
          <div className="metric-value">{metrics.open}</div>
          <div className="metric-target">Target: ≤{THRESHOLDS.MAX_OPEN_SOFT}</div>
          {metrics.open > THRESHOLDS.MAX_OPEN_SOFT && (
            <div className="metric-alert">⚠ Over limit</div>
          )}
        </div>

        <div className={`metric-card ${metrics.waitingOnTSE > THRESHOLDS.MAX_WAITING_ON_TSE_SOFT ? "over-limit" : ""}`}>
          <div className="metric-label">Waiting on TSE</div>
          <div className="metric-value">{metrics.waitingOnTSE}</div>
          <div className="metric-target">Target: ≤{THRESHOLDS.MAX_WAITING_ON_TSE_SOFT}</div>
          {metrics.waitingOnTSE > THRESHOLDS.MAX_WAITING_ON_TSE_SOFT && (
            <div className="metric-alert">⚠ Over limit</div>
          )}
        </div>

        <div className="metric-card">
          <div className="metric-label">Waiting on Customer</div>
          <div className="metric-value">{metrics.waitingOnCustomer}</div>
          <div className="metric-target">No limit</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Total Snoozed</div>
          <div className="metric-value">{metrics.totalSnoozed}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label htmlFor="tag-filter">Filter by Type:</label>
          <select 
            id="tag-filter"
            value={filterTag} 
            onChange={(e) => setFilterTag(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Conversations</option>
            <option value="open">Open Chats</option>
            <option value="waitingontse">Waiting on TSE</option>
            <option value="waitingoncustomer">Waiting on Customer</option>
          </select>
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
          {filterTag === "all" ? "All Conversations" :
           filterTag === "open" ? "Open Chats" :
           filterTag === "waitingontse" ? "Waiting on TSE" :
           "Waiting on Customer"} 
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
                  <th>Tags</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredConversations.map(conv => {
                  const isSnoozed = conv.state === "snoozed" || conv.snoozed_until;
                  const tags = Array.isArray(conv.tags) ? conv.tags : [];
                  const tagNames = tags.map(t => typeof t === "string" ? t : t.name).filter(Boolean);
                  
                  return (
                    <tr key={conv.id || conv.conversation_id}>
                      <td className="conv-id">{conv.id || conv.conversation_id}</td>
                      <td>
                        <span className={`status-badge-small ${isSnoozed ? "snoozed" : "open"}`}>
                          {isSnoozed ? "Snoozed" : "Open"}
                        </span>
                      </td>
                      <td>
                        <div className="tags-list">
                          {tagNames.length > 0 ? (
                            tagNames.map((tag, idx) => (
                              <span key={idx} className="tag-badge">
                                {tag.replace("snooze.", "")}
                              </span>
                            ))
                          ) : (
                            <span className="no-tags">No tags</span>
                          )}
                        </div>
                      </td>
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

      {/* Quick Tips */}
      <div className="tips-section">
        <h3>Quick Tips</h3>
        <ul>
          <li>Keep open chats ≤{THRESHOLDS.MAX_OPEN_SOFT} to stay on track</li>
          <li>Keep "Waiting on TSE" snoozed chats ≤{THRESHOLDS.MAX_WAITING_ON_TSE_SOFT}</li>
          <li>Use the snooze workflows to properly categorize conversations</li>
          <li>Refresh regularly to see the latest queue status</li>
        </ul>
      </div>
    </div>
  );
}

export default MyQueue;
