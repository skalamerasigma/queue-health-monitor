import React, { useMemo, useState, useEffect } from "react";
import { formatDateTimeUTC } from "./utils/dateUtils";
import "./MyQueue.css";

const THRESHOLDS = {
  MAX_OPEN_SOFT: 5,
  MAX_WAITING_ON_TSE_SOFT: 5, // Actionable Snoozed threshold
  MAX_OPEN_ALERT: 6,
  MAX_WAITING_ON_TSE_ALERT: 7,
  MAX_COMBINED: 10 // Combined threshold: open + actionable snoozed <= 10
};

const INTERCOM_BASE_URL = "https://app.intercom.com/a/inbox/gu1e0q0t/inbox/admin/9110812/conversation/";

function MyQueue({ conversations = [], teamMembers = [], currentUserEmail, loading, error, onRefresh, lastUpdated, historicalSnapshots = [] }) {
  const [filterTag, setFilterTag] = useState("all");
  const [searchId, setSearchId] = useState("");
  const [selectedTSEId, setSelectedTSEId] = useState("all");
  const [wasLoading, setWasLoading] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  const [loadingStartTime, setLoadingStartTime] = useState(null);
  const [progressPercentage, setProgressPercentage] = useState(0);

  // Loading phrases - tailored for TSE view
  const loadingPhrases = [
    "Fetching conversation data from Intercom...",
    "Loading team member information...",
    "Processing conversation assignments...",
    "Calculating queue metrics...",
    "Analyzing queue status...",
    "Preparing your queue view..."
  ];

  const fallbackPhrases = [
    "Almost there...",
    "Finishing up...",
    "Finalizing data..."
  ];

  // Track loading state changes to show completion animation and cycle through phrases
  useEffect(() => {
    if (loading && (!conversations || (Array.isArray(conversations) && conversations.length === 0))) {
      setWasLoading(true);
      setShowCompletion(false);
      setLoadingPhraseIndex(0);
      setLoadingStartTime(Date.now());
    } else if (wasLoading && conversations && conversations.length > 0) {
      // Loading just finished, show completion GIF
      setShowCompletion(true);
      const timer = setTimeout(() => {
        setShowCompletion(false);
        setWasLoading(false);
        setLoadingPhraseIndex(0);
        setLoadingStartTime(null);
      }, 3000); // Show completion GIF for 3 seconds
      return () => clearTimeout(timer);
    }
  }, [loading, conversations, wasLoading]);

  // Cycle through loading phrases
  useEffect(() => {
    if (!loadingStartTime) return;

    const elapsed = Date.now() - loadingStartTime;
    const totalPhrases = loadingPhrases.length;
    const phraseDuration = 5000; // 5 seconds per phrase
    const fallbackStartTime = 30000; // 30 seconds total - when to start showing fallback phrases

    let intervalId;
    
    if (elapsed < fallbackStartTime) {
      // Show regular phrases
      const currentIndex = Math.min(Math.floor(elapsed / phraseDuration), totalPhrases - 1);
      setLoadingPhraseIndex(currentIndex);
      
      // Set up interval to update phrase
      intervalId = setInterval(() => {
        const currentElapsed = Date.now() - loadingStartTime;
        const newIndex = Math.min(Math.floor(currentElapsed / phraseDuration), totalPhrases - 1);
        setLoadingPhraseIndex(newIndex);
      }, 1000); // Check every second
    } else {
      // Show fallback phrases (cycle through them)
      const fallbackElapsed = elapsed - fallbackStartTime;
      const fallbackIndex = Math.floor(fallbackElapsed / 2000) % fallbackPhrases.length; // Change every 2 seconds
      setLoadingPhraseIndex(totalPhrases + fallbackIndex);
      
      intervalId = setInterval(() => {
        const currentElapsed = Date.now() - loadingStartTime;
        if (currentElapsed >= fallbackStartTime) {
          const fallbackElapsed = currentElapsed - fallbackStartTime;
          const fallbackIndex = Math.floor(fallbackElapsed / 2000) % fallbackPhrases.length;
          setLoadingPhraseIndex(totalPhrases + fallbackIndex);
        }
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [loadingStartTime, loadingPhrases.length]);

  // Update progress percentage continuously for smooth animation
  useEffect(() => {
    if (!loadingStartTime) {
      setProgressPercentage(0);
      return;
    }

    const updateProgress = () => {
      const elapsed = Date.now() - loadingStartTime;
      const totalRegularPhraseTime = 30000; // 30 seconds total for all regular phrases
      const fallbackStartTime = totalRegularPhraseTime;
      
      let progress = 0;
      
      if (elapsed < totalRegularPhraseTime) {
        // Use exponential ease-out curve: fills quickly initially, slows near end
        const normalizedTime = elapsed / totalRegularPhraseTime;
        const easedProgress = 1 - Math.pow(1 - normalizedTime, 2.5);
        progress = Math.min(easedProgress * 92, 92);
      } else {
        // During fallback phrases: continue from 92% to 99% smoothly
        const fallbackElapsed = elapsed - fallbackStartTime;
        const fallbackDuration = 8000;
        const fallbackProgress = Math.min(fallbackElapsed / fallbackDuration, 1);
        const easedFallback = 1 - Math.pow(1 - fallbackProgress, 2);
        progress = 92 + (easedFallback * 7);
      }
      
      // If we're about to show completion, ensure progress is near 100%
      if (wasLoading && conversations && conversations.length > 0 && progress < 99) {
        progress = 99;
      }
      
      setProgressPercentage(Math.min(progress, 99));
    };

    // Update immediately
    updateProgress();
    
    // Update every 100ms for smooth animation
    const intervalId = setInterval(updateProgress, 100);
    
    return () => clearInterval(intervalId);
  }, [loadingStartTime, loadingPhrases.length, wasLoading, conversations]);

  // Get current loading phrase
  const getCurrentLoadingPhrase = () => {
    if (loadingPhraseIndex < loadingPhrases.length) {
      return loadingPhrases[loadingPhraseIndex];
    } else {
      const fallbackIndex = loadingPhraseIndex - loadingPhrases.length;
      return fallbackPhrases[fallbackIndex % fallbackPhrases.length];
    }
  };

  // Get list of TSEs for filter dropdown
  const availableTSEs = useMemo(() => {
    if (!teamMembers || teamMembers.length === 0) return [];
    
    // Filter out excluded TSEs
    const EXCLUDED_TSE_NAMES = [
      "Zen Junior", "Nathan Parrish", "Leticia Esparza",
      "Rob Woollen", "Brett Bedevian", "Viswa Jeyaraman", "Brandon Yee",
      "Holly Coxon", "Chetana Shinde", "Matt Morgenroth", "Grace Sanford",
      "Prerit Sachdeva", "svc-prd-tse-intercom SVC"
    ];
    
    return teamMembers
      .filter(member => !EXCLUDED_TSE_NAMES.includes(member.name))
      .map(member => ({
        id: member.id,
        name: member.name || member.email?.split("@")[0] || `TSE ${member.id}`,
        email: member.email
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teamMembers]);

  // Get selected TSE info
  const selectedTSE = useMemo(() => {
    if (selectedTSEId === "all" || !selectedTSEId) return null;
    return availableTSEs.find(tse => String(tse.id) === String(selectedTSEId)) || null;
  }, [selectedTSEId, availableTSEs]);

  // Calculate performance streak for selected TSE
  const performanceStreak = useMemo(() => {
    if (!selectedTSE || !historicalSnapshots || historicalSnapshots.length === 0) {
      return null;
    }

    // Sort snapshots by date (oldest first)
    const sortedSnapshots = [...historicalSnapshots]
      .map(snapshot => ({
        ...snapshot,
        tseData: snapshot.tse_data || snapshot.tseData || []
      }))
      .filter(snapshot => snapshot.tseData.length > 0)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (sortedSnapshots.length === 0) {
      return null;
    }

    // Find TSE's performance data across all dates
    const tsePerformanceDates = [];
    
    sortedSnapshots.forEach(snapshot => {
      const tseData = snapshot.tseData.find(tse => 
        String(tse.id) === String(selectedTSE.id) || tse.name === selectedTSE.name
      );
      
      if (tseData) {
        const totalOpen = (tseData.open || 0);
        // Actionable Snoozed = all snoozed EXCEPT customer-waiting tags
        // Use snoozedForOnTrack first (new format), then actionableSnoozed, then calculate
        let actionableSnoozed = tseData.snoozedForOnTrack;
        if (actionableSnoozed === undefined) {
          actionableSnoozed = tseData.actionableSnoozed;
        }
        if (actionableSnoozed === undefined) {
          const totalSnoozed = tseData.totalSnoozed || 0;
          const customerWaitSnoozed = tseData.customerWaitSnoozed || 0;
          actionableSnoozed = Math.max(0, totalSnoozed - customerWaitSnoozed);
        }
        actionableSnoozed = actionableSnoozed || 0;
        
        // Outstanding Performance: 0 open AND 0 actionable snoozed
        const isOutstanding = totalOpen === 0 && actionableSnoozed === 0;
        
        tsePerformanceDates.push({
          date: snapshot.date,
          onTrack: isOutstanding,
          open: totalOpen,
          actionableSnoozed
        });
      }
    });

    if (tsePerformanceDates.length === 0) {
      return null;
    }

    // Sort dates descending (most recent first)
    const sortedDates = [...tsePerformanceDates].sort((a, b) => b.date.localeCompare(a.date));
    
    // Calculate current streak (working backwards from most recent date)
    let currentStreak = 0;
    for (const dateEntry of sortedDates) {
      if (dateEntry.onTrack) {
        currentStreak++;
      } else {
        break; // Streak broken
      }
    }

    // Only return if streak is 3+ days
    if (currentStreak >= 3) {
      return {
        streak: currentStreak,
        totalOutstandingDays: tsePerformanceDates.filter(d => d.onTrack).length
      };
    }

    return null;
  }, [selectedTSE, historicalSnapshots]);

  // Filter conversations for selected TSE (or all if "all" selected)
  const myConversations = useMemo(() => {
    if (!conversations || conversations.length === 0) return [];
    
    if (selectedTSEId === "all" || !selectedTSEId) {
      return conversations;
    }
    
    return conversations.filter(conv => {
      const convTseId = conv.admin_assignee_id || 
                       (conv.admin_assignee && typeof conv.admin_assignee === "object" ? conv.admin_assignee.id : null);
      return String(convTseId) === String(selectedTSEId);
    });
  }, [conversations, selectedTSEId]);

  // Calculate metrics for selected TSE (or all if "all" selected)
  const metrics = useMemo(() => {
    if (!myConversations.length || selectedTSEId === "all") {
      return {
        open: 0,
        waitingOnTSE: 0,
        waitingOnCustomer: 0,
        totalSnoozed: 0,
        status: "on-track",
        isOnTrack: true,
        showAllMode: selectedTSEId === "all"
      };
    }

    let open = 0;
    let waitingOnTSE = 0;
    let waitingOnCustomer = 0;
    let totalSnoozed = 0;

    let actionableSnoozed = 0; // All snoozed EXCEPT customer-waiting tags
    
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
        if (hasWaitingOnCustomerTag) {
          waitingOnCustomer++;
        } else {
          // Actionable Snoozed = all snoozed EXCEPT customer-waiting tags
          // Includes: waiting-on-tse tagged, untagged snoozed, any other snoozed
          actionableSnoozed++;
        }
        // Keep waitingOnTSE for backward compatibility display
        if (hasWaitingOnTSETag) {
          waitingOnTSE++;
        }
      }
    });

    const meetsOpen = open <= THRESHOLDS.MAX_OPEN_SOFT;
    const meetsActionableSnoozed = actionableSnoozed <= THRESHOLDS.MAX_WAITING_ON_TSE_SOFT;
    const MAX_COMBINED_THRESHOLD = 10;
    const combinedTotal = open + actionableSnoozed;
    const isOnTrack = meetsOpen && meetsActionableSnoozed && combinedTotal <= MAX_COMBINED_THRESHOLD;
    
    let status = "on-track";
    if (open >= THRESHOLDS.MAX_OPEN_ALERT || actionableSnoozed >= THRESHOLDS.MAX_WAITING_ON_TSE_ALERT) {
      status = "over-limit";
    } else if (!isOnTrack) {
      status = "over-limit";
    }

    return {
      open,
      actionableSnoozed,
      waitingOnTSE, // Legacy field for display
      waitingOnCustomer,
      totalSnoozed,
      combinedTotal,
      status,
      isOnTrack,
      meetsOpen,
      meetsActionableSnoozed,
      meetsWaitingOnTSE: meetsActionableSnoozed, // Legacy field
      showAllMode: false
    };
  }, [myConversations, selectedTSEId]);

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

  // Show loading screen on initial load or during completion animation
  if ((loading && (!conversations || (Array.isArray(conversations) && conversations.length === 0))) || showCompletion) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <img 
            src={showCompletion 
              ? "https://res.cloudinary.com/doznvxtja/image/upload/v1767208870/loading_complete_n2gpbl.gif"
              : "https://res.cloudinary.com/doznvxtja/image/upload/v1767208765/loading_qoxx0x.gif"
            } 
            alt={showCompletion ? "Complete" : "Loading..."} 
            className="loading-gif"
          />
          <div className={`loading-text ${!showCompletion ? 'pulse' : ''}`}>
            {showCompletion ? "Loading complete!" : getCurrentLoadingPhrase()}
          </div>
          {!showCompletion && (
            <div className="loading-progress-bar">
              <div 
                className="loading-progress-bar-fill"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          )}
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
        {selectedTSE && (
          <div className="tse-info">
            <h2>{selectedTSE.name}</h2>
          </div>
        )}
      </div>

      {error && (
        <div className="my-queue-error">
          <p>Error: {error}</p>
        </div>
      )}

      {/* TSE Selector */}
      <div className="tse-selector-section">
        <div className="filter-group">
          <label htmlFor="tse-selector">Select TSE:</label>
          <select 
            id="tse-selector"
            value={selectedTSEId} 
            onChange={(e) => setSelectedTSEId(e.target.value)}
            className="filter-select tse-selector"
          >
            <option value="all">All TSEs</option>
            {availableTSEs.map(tse => (
              <option key={tse.id} value={tse.id}>
                {tse.name}
              </option>
            ))}
          </select>
        </div>
        {selectedTSEId === "all" && (
          <div className="info-banner">
            <p>💡 <strong>Tip:</strong> Select your name from the dropdown above to see your personal queue and status metrics.</p>
          </div>
        )}
      </div>

      {/* Performance Streak Widget - Only show if TSE is selected and has 3+ day streak */}
      {selectedTSEId !== "all" && selectedTSE && performanceStreak && (
        <div className="streak-widget">
          <div className="streak-widget-content">
            <div className="streak-icon">🔥</div>
            <div className="streak-info">
              <div className="streak-title">Outstanding Performance Streak!</div>
              <div className="streak-count">{performanceStreak.streak} Consecutive Days</div>
              <div className="streak-subtitle">⭐ Zero open chats and zero waiting on TSE</div>
            </div>
          </div>
        </div>
      )}

      {/* Status Card - Only show if TSE is selected */}
      {selectedTSEId !== "all" && selectedTSE && (
        <div className={`status-card ${metrics.status}`}>
          <div className="status-header">
            <h3>Queue Status</h3>
            <span className={`status-badge ${metrics.status}`}>
              {metrics.status === "on-track" ? "✓ On Track" : "⚠ Over Limit"}
            </span>
          </div>
          <p className="status-message">{getStatusMessage()}</p>
        </div>
      )}

      {/* Key Metrics - Only show if TSE is selected */}
      {selectedTSEId !== "all" && selectedTSE && (
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
      )}

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
          {selectedTSEId === "all" ? "All Conversations" : `${selectedTSE?.name}'s Conversations`} - 
          {filterTag === "all" ? " All Types" :
           filterTag === "open" ? " Open Chats" :
           filterTag === "waitingontse" ? " Waiting on TSE" :
           " Waiting on Customer"} 
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
                  {selectedTSEId === "all" && <th>TSE</th>}
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
                  
                  // Extract tag names
                  const tagNames = tags.map(t => typeof t === "string" ? t : t.name);
                  
                  // Define the three snooze tags we care about (in priority order)
                  const snoozeTags = [
                    "snooze.waiting-on-customer-resolved",
                    "snooze.waiting-on-customer-unresolved",
                    "snooze.waiting-on-tse"
                  ];
                  
                  // Mapping from tag names to display names
                  const tagDisplayMapping = {
                    "snooze.waiting-on-customer-resolved": "Waiting On Customer - Resolved",
                    "snooze.waiting-on-customer-unresolved": "Waiting On Customer - Unresolved",
                    "snooze.waiting-on-tse": "Waiting On TSE - Deep Dive"
                  };
                  
                  // Find the first tag that matches one of our three snooze tags (case-insensitive)
                  const activeWorkflowTag = tagNames.find(tagName => 
                    tagName && snoozeTags.some(snoozeTag => 
                      tagName.toLowerCase() === snoozeTag.toLowerCase()
                    )
                  );
                  
                  // Check if conversation state is "open" (not snoozed)
                  const isOpen = !isSnoozed && (conv.state || "open").toLowerCase() === "open";
                  
                  // Map the tag to its display name (case-insensitive lookup)
                  let displayTag = "No Active Snooze Workflows";
                  if (isOpen) {
                    // If state is "Open", show N/A
                    displayTag = "N/A";
                  } else if (activeWorkflowTag) {
                    const normalizedTag = activeWorkflowTag.toLowerCase();
                    displayTag = tagDisplayMapping[normalizedTag] || activeWorkflowTag;
                  }
                  
                  // Determine background color based on display tag
                  const getWorkflowBackgroundColor = (tag) => {
                    if (tag === "N/A") {
                      return "transparent"; // No background for N/A
                    } else if (tag === "Waiting On TSE - Deep Dive") {
                      return "#ffd0d0"; // Red background (darker)
                    } else if (tag === "Waiting On Customer - Unresolved") {
                      return "#fff0c0"; // Yellow background (darker)
                    } else if (tag === "Waiting On Customer - Resolved") {
                      return "#d0f0dc"; // Green background (darker)
                    }
                    return "transparent"; // No background for "No Active Snooze Workflows"
                  };
                  
                  const workflowBackgroundColor = getWorkflowBackgroundColor(displayTag);
                  
                  // Get TSE name for display
                  const convTseId = conv.admin_assignee_id || 
                                   (conv.admin_assignee && typeof conv.admin_assignee === "object" ? conv.admin_assignee.id : null);
                  const assigneeName = conv.admin_assignee?.name || 
                                      (typeof conv.admin_assignee === "string" ? conv.admin_assignee : null);
                  const tseName = assigneeName || 
                                 (convTseId ? availableTSEs.find(t => String(t.id) === String(convTseId))?.name : "Unassigned") ||
                                 "Unassigned";
                  
                  return (
                    <tr key={conv.id || conv.conversation_id}>
                      {selectedTSEId === "all" && (
                        <td className="tse-name-cell">{tseName}</td>
                      )}
                      <td className="conv-id">{conv.id || conv.conversation_id}</td>
                      <td>
                        <span className={`status-badge-small ${isSnoozed ? "snoozed" : "open"}`}>
                          {isSnoozed ? "Snoozed" : "Open"}
                        </span>
                      </td>
                      <td className="workflow-cell" style={{ backgroundColor: workflowBackgroundColor }}>
                        {displayTag}
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
