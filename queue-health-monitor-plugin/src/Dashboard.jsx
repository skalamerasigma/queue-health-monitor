import React, { useMemo, useState, useEffect } from "react";
import HistoricalView from "./HistoricalView";
import "./Dashboard.css";

// TSEs to exclude from the dashboard
const EXCLUDED_TSE_NAMES = [
  "Stephen Skalamera",
  "Zen Junior",
  "Nathan Parrish",
  "Leticia Esparza",
  "Rob Woollen",
  "Brett Bedevian",
  "Viswa Jeyaraman",
  "Brandon Yee",
  "Holly Coxon",
  "Chetana Shinde",
  "Matt Morgenroth",
  "Grace Sanford",
  "svc-prd-tse-intercom SVC"
];

// Thresholds from Accountability Framework
const THRESHOLDS = {
  MAX_OPEN_IDEAL: 0,
  MAX_OPEN_SOFT: 5,
  MAX_OPEN_ALERT: 6,
  MAX_ACTIONABLE_SNOOZED_SOFT: 5,
  MAX_ACTIONABLE_SNOOZED_ALERT: 7,
  REASSIGNMENT_HOURS: 48,
  CLOSURE_CHECKIN_HOURS: 24,
  CLOSURE_WARNING_DAYS: 3
};

function Dashboard({ conversations, teamMembers = [], loading, error, onRefresh, lastUpdated }) {
  const [activeView, setActiveView] = useState("overview");
  const [filterTag, setFilterTag] = useState("all");
  const [filterTSE, setFilterTSE] = useState("all");

  const handleSaveSnapshot = async () => {
    try {
      // Calculate current TSE metrics
      const EXCLUDED_TSE_NAMES = [
        "Stephen Skalamera", "Zen Junior", "Nathan Parrish", "Leticia Esparza",
        "Rob Woollen", "Brett Bedevian", "Viswa Jeyaraman", "Brandon Yee",
        "Holly Coxon", "Chetana Shinde", "Matt Morgenroth", "Grace Sanford",
        "svc-prd-tse-intercom SVC"
      ];

      const byTSE = {};
      teamMembers.forEach(admin => {
        const tseId = admin.id;
        if (tseId && !EXCLUDED_TSE_NAMES.includes(admin.name)) {
          byTSE[tseId] = {
            id: tseId,
            name: admin.name || admin.email?.split("@")[0] || `TSE ${tseId}`,
            open: 0,
            actionableSnoozed: 0,
            investigationSnoozed: 0,
            customerWaitSnoozed: 0,
            totalSnoozed: 0
          };
        }
      });

      conversations.forEach((conv) => {
        const hasAssigneeId = conv.admin_assignee_id && conv.admin_assignee_id !== null;
        const hasAssigneeObject = conv.admin_assignee && 
                                  (typeof conv.admin_assignee === "object" ? (conv.admin_assignee.id || conv.admin_assignee.name) : true);
        const isUnassigned = !hasAssigneeId && !hasAssigneeObject;
        
        if (isUnassigned) return;

        const tseId = conv.admin_assignee_id || 
                      (conv.admin_assignee && typeof conv.admin_assignee === "object" ? conv.admin_assignee.id : null);
        
        if (!tseId || !byTSE[tseId]) return;

        const assigneeName = conv.admin_assignee?.name || 
                            (typeof conv.admin_assignee === "string" ? conv.admin_assignee : null);
        if (assigneeName && EXCLUDED_TSE_NAMES.includes(assigneeName)) return;

        const isSnoozed = conv.state === "snoozed" || conv.snoozed_until;
        const tags = conv.tags || [];
        const hasInvestigationTag = tags.some(t => 
          t.name === "#Snooze.Investigation" || 
          (typeof t === "string" && t.includes("Investigation"))
        );
        const hasCustomerWaitTag = tags.some(t => 
          t.name === "#Snooze.CustomerWait" || 
          (typeof t === "string" && t.includes("CustomerWait"))
        );

        if (isSnoozed) {
          byTSE[tseId].totalSnoozed = (byTSE[tseId].totalSnoozed || 0) + 1;
          if (hasInvestigationTag) {
            byTSE[tseId].investigationSnoozed++;
          } else if (hasCustomerWaitTag) {
            byTSE[tseId].customerWaitSnoozed++;
          } else {
            byTSE[tseId].actionableSnoozed++;
          }
        }

        if (conv.state === "open" && !isSnoozed) {
          byTSE[tseId].open++;
        }
      });

      const snapshot = {
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        tseData: Object.values(byTSE).map(tse => ({
          id: tse.id,
          name: tse.name,
          open: tse.open,
          actionableSnoozed: tse.actionableSnoozed,
          investigationSnoozed: tse.investigationSnoozed,
          customerWaitSnoozed: tse.customerWaitSnoozed,
          totalSnoozed: tse.totalSnoozed || 0
        }))
      };

      const apiPath = process.env.NODE_ENV === 'production' 
        ? '/api/snapshots/save'
        : 'http://localhost:3000/api/snapshots/save';
      
      const url = process.env.NODE_ENV === 'production'
        ? `${window.location.origin}/api/snapshots/save`
        : apiPath;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot)
      });

      if (res.ok) {
        alert('Snapshot saved successfully!');
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Snapshot save error:', errorData);
        throw new Error(errorData.error || errorData.detail || `Failed to save snapshot: ${res.status}`);
      }
    } catch (error) {
      console.error('Error saving snapshot:', error);
      alert('Failed to save snapshot: ' + error.message);
    }
  };

  // Process conversations to extract metrics
  const metrics = useMemo(() => {
    // Create a map of all team members first
    const allTSEsMap = {};
    
    // Add all team members to the map (even if they have 0 conversations)
    teamMembers.forEach(admin => {
      const tseId = admin.id;
      if (tseId && !EXCLUDED_TSE_NAMES.includes(admin.name)) {
        allTSEsMap[tseId] = {
          id: tseId,
          name: admin.name || admin.email?.split("@")[0] || `TSE ${tseId}`,
          open: 0,
          totalSnoozed: 0,
          actionableSnoozed: 0,
          investigationSnoozed: 0,
          customerWaitSnoozed: 0
        };
      }
    });
    
    // Track unassigned conversations separately
    const unassignedConversations = {
      total: 0,
      waitTimes: []
    };
    
    if (!conversations || conversations.length === 0) {
      return {
        totalOpen: 0,
        totalSnoozed: 0,
        byTSE: Object.values(allTSEsMap), // Return all team members even with 0 conversations
        unassignedConversations: { total: 0, waitTimes: [], medianWaitTime: 0 },
        actionableSnoozed: [],
        investigationSnoozed: [],
        customerWaitSnoozed: [],
        reassignmentCandidates: [],
        closureCandidates: [],
        alerts: []
      };
    }

    const byTSE = { ...allTSEsMap }; // Start with all team members
    const actionableSnoozed = [];
    const investigationSnoozed = [];
    const customerWaitSnoozed = [];
    const reassignmentCandidates = [];
    const closureCandidates = [];
    const alerts = [];

    const now = Date.now() / 1000; // Unix timestamp in seconds

    conversations.forEach((conv) => {
      // Check if conversation is unassigned - more robust check
      // Check multiple possible ways Intercom might represent unassigned
      const hasAssigneeId = conv.admin_assignee_id && 
                            conv.admin_assignee_id !== null && 
                            conv.admin_assignee_id !== undefined &&
                            conv.admin_assignee_id !== "";
      const hasAssigneeObject = conv.admin_assignee && 
                                (typeof conv.admin_assignee === "object" ? (conv.admin_assignee.id || conv.admin_assignee.name) : true);
      const isUnassigned = !hasAssigneeId && !hasAssigneeObject;
      
      // Debug: log first few conversations to understand structure
      if (conversations.indexOf(conv) < 3) {
        console.log('Sample conversation:', {
          id: conv.id,
          admin_assignee_id: conv.admin_assignee_id,
          admin_assignee: conv.admin_assignee,
          state: conv.state,
          snoozed_until: conv.snoozed_until,
          isUnassigned
        });
      }
      
      // Skip excluded TSEs
      const assigneeName = conv.admin_assignee?.name || 
                          (typeof conv.admin_assignee === "string" ? conv.admin_assignee : null);
      if (assigneeName && EXCLUDED_TSE_NAMES.includes(assigneeName)) {
        return; // Skip this conversation
      }
      
      // Handle unassigned conversations separately
      if (isUnassigned) {
        unassignedConversations.total++;
        
        // Track wait times for median calculation
        const createdAt = conv.created_at || conv.createdAt || conv.first_opened_at;
        if (createdAt) {
          const createdTimestamp = typeof createdAt === "number" ? createdAt : new Date(createdAt).getTime() / 1000;
          const waitTimeHours = (now - createdTimestamp) / 3600;
          if (!unassignedConversations.waitTimes) {
            unassignedConversations.waitTimes = [];
          }
          unassignedConversations.waitTimes.push(waitTimeHours);
        }
        
        return; // Don't process unassigned conversations as TSEs
      }
      
      // Get TSE ID for assigned conversations
      const tseId = conv.admin_assignee_id || 
                    (conv.admin_assignee && typeof conv.admin_assignee === "object" ? conv.admin_assignee.id : null);
      
      if (!tseId) {
        // Shouldn't happen if isUnassigned check worked, but fallback
        return;
      }
      
      if (!byTSE[tseId]) {
        // Try to get name from admin_assignee object, or use ID as fallback
        let tseName = "Unassigned";
        if (tseId !== "unassigned") {
          if (conv.admin_assignee) {
            // admin_assignee can be an object with name/email, or just a string
            if (typeof conv.admin_assignee === "string") {
              tseName = conv.admin_assignee;
            } else if (conv.admin_assignee.name) {
              tseName = conv.admin_assignee.name;
            } else if (conv.admin_assignee.email) {
              tseName = conv.admin_assignee.email.split("@")[0]; // Use email username
            } else {
              tseName = `TSE ${tseId}`;
            }
          } else {
            // Has ID but no admin_assignee object - use ID
            tseName = `TSE ${tseId}`;
          }
        }
        
        byTSE[tseId] = {
          id: tseId,
          name: tseName,
          open: 0,
          totalSnoozed: 0,
          actionableSnoozed: 0,
          investigationSnoozed: 0,
          customerWaitSnoozed: 0
        };
      } else {
        // Update name if we find a better one (if current is "Unassigned" or "TSE X")
        if (conv.admin_assignee) {
          let newName = null;
          if (typeof conv.admin_assignee === "string") {
            newName = conv.admin_assignee;
          } else if (conv.admin_assignee.name) {
            newName = conv.admin_assignee.name;
          } else if (conv.admin_assignee.email) {
            newName = conv.admin_assignee.email.split("@")[0];
          }
          
          // Always update if we have a real name and current is placeholder
          if (newName && (byTSE[tseId].name === "Unassigned" || byTSE[tseId].name.startsWith("TSE "))) {
            byTSE[tseId].name = newName;
          }
        }
      }

      // Check if snoozed - check multiple possible indicators
      // Intercom may use different field names, so check all possibilities
      const isSnoozed = conv.state === "snoozed" || 
                       conv.state === "Snoozed" ||
                       conv.snoozed_until || 
                       (conv.statistics && conv.statistics.state === "snoozed") ||
                       (conv.source && conv.source.type === "snoozed") ||
                       (conv.conversation_parts && conv.conversation_parts.some(part => part.state === "snoozed"));
      const tags = conv.tags || [];
      const hasInvestigationTag = tags.some(t => 
        t.name === "#Snooze.Investigation" || 
        (typeof t === "string" && t.includes("Investigation"))
      );
      const hasCustomerWaitTag = tags.some(t => 
        t.name === "#Snooze.CustomerWait" || 
        (typeof t === "string" && t.includes("CustomerWait"))
      );

      // Count all snoozed conversations
      if (isSnoozed) {
        byTSE[tseId].totalSnoozed++;
      }

      if (conv.state === "open" && !isSnoozed) {
        byTSE[tseId].open++;
      }

      if (isSnoozed) {
        if (hasInvestigationTag) {
          byTSE[tseId].investigationSnoozed++;
          investigationSnoozed.push(conv);
          
          // Check for reassignment candidates (48+ hours)
          const snoozedAt = conv.snoozed_until || conv.updated_at;
          if (snoozedAt) {
            const snoozedTimestamp = typeof snoozedAt === "number" ? snoozedAt : new Date(snoozedAt).getTime() / 1000;
            const hoursSnoozed = (now - snoozedTimestamp) / 3600;
            if (hoursSnoozed >= THRESHOLDS.REASSIGNMENT_HOURS) {
              reassignmentCandidates.push({
                ...conv,
                hoursSnoozed: Math.round(hoursSnoozed)
              });
            }
          }
        } else if (hasCustomerWaitTag) {
          byTSE[tseId].customerWaitSnoozed++;
          customerWaitSnoozed.push(conv);
          
          // Check for closure candidates
          const lastContacted = conv.last_contacted_at || conv.updated_at;
          if (lastContacted) {
            const contactedTimestamp = typeof lastContacted === "number" ? lastContacted : new Date(lastContacted).getTime() / 1000;
            const hoursSinceContact = (now - contactedTimestamp) / 3600;
            const daysSinceContact = hoursSinceContact / 24;
            
            // 24 hours after check-in OR Day 3 after warning
            if (hoursSinceContact >= THRESHOLDS.CLOSURE_CHECKIN_HOURS || daysSinceContact >= THRESHOLDS.CLOSURE_WARNING_DAYS) {
              closureCandidates.push({
                ...conv,
                hoursSinceContact: Math.round(hoursSinceContact),
                daysSinceContact: Math.round(daysSinceContact * 10) / 10
              });
            }
          }
        } else {
          // Snoozed but not tagged - count as actionable if not awaiting reply
          byTSE[tseId].actionableSnoozed++;
          actionableSnoozed.push(conv);
        }
      }

    });
    
    // Generate alerts AFTER processing all conversations (to avoid duplicates)
    Object.values(byTSE).forEach(tse => {
      // Skip excluded TSEs
      if (EXCLUDED_TSE_NAMES.includes(tse.name) || 
          tse.name === "Unassigned" || 
          tse.name.toLowerCase().includes("unassigned")) {
        return;
      }
      
      const totalOpen = tse.open;
      const totalActionableSnoozed = tse.actionableSnoozed + tse.investigationSnoozed;
      
      if (totalOpen >= THRESHOLDS.MAX_OPEN_ALERT) {
        alerts.push({
          type: "open_threshold",
          severity: "high",
          tseId: tse.id,
          tseName: tse.name,
          message: `${tse.name}: ${totalOpen} open chats (threshold: ${THRESHOLDS.MAX_OPEN_ALERT}+)`,
          count: totalOpen
        });
      }
      
      if (totalActionableSnoozed >= THRESHOLDS.MAX_ACTIONABLE_SNOOZED_ALERT) {
        alerts.push({
          type: "actionable_snoozed_threshold",
          severity: "high",
          tseId: tse.id,
          tseName: tse.name,
          message: `${tse.name}: ${totalActionableSnoozed} actionable snoozed (threshold: ${THRESHOLDS.MAX_ACTIONABLE_SNOOZED_ALERT}+)`,
          count: totalActionableSnoozed
        });
      }
    });

    // Filter out excluded TSEs and "Unassigned"
    const filteredByTSE = Object.values(byTSE).filter(tse => 
      !EXCLUDED_TSE_NAMES.includes(tse.name) && 
      tse.name !== "Unassigned" && 
      !tse.name.toLowerCase().includes("unassigned")
    );
    
    // Calculate median wait time for unassigned conversations
    let medianWaitTime = 0;
    if (unassignedConversations.waitTimes && unassignedConversations.waitTimes.length > 0) {
      const sorted = [...unassignedConversations.waitTimes].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      medianWaitTime = sorted.length % 2 === 0 
        ? (sorted[mid - 1] + sorted[mid]) / 2 
        : sorted[mid];
    }
    unassignedConversations.medianWaitTime = Math.round(medianWaitTime * 10) / 10; // Round to 1 decimal
    
    // Debug: Log TSE counts
    console.log(`Total TSEs found: ${Object.keys(byTSE).length}, After filtering: ${filteredByTSE.length}`);
    console.log('TSE names:', filteredByTSE.map(t => t.name).sort());
    console.log('Unassigned conversations:', unassignedConversations);
    
    // Filter alerts to exclude excluded TSEs
    const filteredAlerts = alerts.filter(alert => 
      !EXCLUDED_TSE_NAMES.includes(alert.tseName)
    );

    // Calculate total snoozed more robustly
    const totalSnoozedCount = conversations.filter(c => {
      const isSnoozed = c.state === "snoozed" || 
                       c.snoozed_until || 
                       (c.statistics && c.statistics.state === "snoozed") ||
                       (c.source && c.source.type === "snoozed");
      return isSnoozed;
    }).length;
    
    // Calculate compliance metrics
    const totalTSEs = filteredByTSE.length;
    let compliantBoth = 0;
    let compliantOpen = 0; // TSEs meeting open requirement (regardless of snoozed)
    let compliantSnoozed = 0; // TSEs meeting snoozed requirement (regardless of open)
    
    filteredByTSE.forEach(tse => {
      const meetsOpen = tse.open <= THRESHOLDS.MAX_OPEN_SOFT;
      const totalActionableSnoozed = tse.actionableSnoozed + tse.investigationSnoozed;
      const meetsSnoozed = totalActionableSnoozed <= THRESHOLDS.MAX_ACTIONABLE_SNOOZED_SOFT;
      
      if (meetsOpen && meetsSnoozed) {
        compliantBoth++;
      }
      
      // Count independently - these are not mutually exclusive
      if (meetsOpen) {
        compliantOpen++;
      }
      if (meetsSnoozed) {
        compliantSnoozed++;
      }
    });
    
    const complianceOverall = totalTSEs > 0 ? Math.round((compliantBoth / totalTSEs) * 100) : 0;
    const complianceOpenOnlyPct = totalTSEs > 0 ? Math.round((compliantOpen / totalTSEs) * 100) : 0;
    const complianceSnoozedOnlyPct = totalTSEs > 0 ? Math.round((compliantSnoozed / totalTSEs) * 100) : 0;
    
    // Debug logging
    console.log('Compliance breakdown:', {
      totalTSEs,
      compliantBoth,
      compliantOpen,
      compliantSnoozed,
      complianceOverall: `${complianceOverall}%`,
      complianceOpenOnly: `${complianceOpenOnlyPct}%`,
      complianceSnoozedOnly: `${complianceSnoozedOnlyPct}%`
    });
    
    return {
      totalOpen: conversations.filter(c => {
        const isSnoozed = c.state === "snoozed" || c.snoozed_until;
        return c.state === "open" && !isSnoozed;
      }).length,
      totalSnoozed: totalSnoozedCount,
      byTSE: Array.isArray(filteredByTSE) ? filteredByTSE : [],
      unassignedConversations,
      actionableSnoozed: Array.isArray(actionableSnoozed) ? actionableSnoozed : [],
      investigationSnoozed: Array.isArray(investigationSnoozed) ? investigationSnoozed : [],
      customerWaitSnoozed: Array.isArray(customerWaitSnoozed) ? customerWaitSnoozed : [],
      reassignmentCandidates: Array.isArray(reassignmentCandidates) ? reassignmentCandidates : [],
      closureCandidates: Array.isArray(closureCandidates) ? closureCandidates : [],
      alerts: Array.isArray(filteredAlerts) ? filteredAlerts : [],
      complianceOverall,
      complianceOpenOnly: complianceOpenOnlyPct,
      complianceSnoozedOnly: complianceSnoozedOnlyPct
    };
    }, [conversations, teamMembers]);

  // Filter conversations based on selected tag and TSE, excluding conversations from excluded TSEs
  const filteredConversations = useMemo(() => {
    if (!conversations) return [];
    
    const filterByTag = () => {
      if (filterTag === "all") return conversations;
      if (filterTag === "snoozed") {
        return conversations.filter(conv => {
          const isSnoozed = conv.state === "snoozed" || 
                           conv.state === "Snoozed" ||
                           conv.snoozed_until || 
                           (conv.statistics && conv.statistics.state === "snoozed");
          return isSnoozed;
        });
      }
      if (filterTag === "investigation") return metrics.investigationSnoozed || [];
      if (filterTag === "customerwait") return metrics.customerWaitSnoozed || [];
      if (filterTag === "actionable") return metrics.actionableSnoozed || [];
      if (filterTag === "reassignment") return metrics.reassignmentCandidates || [];
      if (filterTag === "closure") return metrics.closureCandidates || [];
      return conversations;
    };
    
    let tagFiltered = filterByTag();
    
    // Filter out conversations assigned to excluded TSEs
    tagFiltered = tagFiltered.filter(conv => {
      const assigneeName = conv.admin_assignee?.name || 
                          (typeof conv.admin_assignee === "string" ? conv.admin_assignee : null);
      return !assigneeName || !EXCLUDED_TSE_NAMES.includes(assigneeName);
    });
    
    // Filter by TSE if selected
    if (filterTSE !== "all") {
      if (filterTSE === "unassigned") {
        tagFiltered = tagFiltered.filter(conv => {
          const hasAssigneeId = conv.admin_assignee_id && conv.admin_assignee_id !== null;
          const hasAssigneeObject = conv.admin_assignee && 
                                    (typeof conv.admin_assignee === "object" ? (conv.admin_assignee.id || conv.admin_assignee.name) : true);
          return !hasAssigneeId && !hasAssigneeObject;
        });
      } else {
        tagFiltered = tagFiltered.filter(conv => {
          const tseId = conv.admin_assignee_id || 
                       (conv.admin_assignee && typeof conv.admin_assignee === "object" ? conv.admin_assignee.id : null);
          // Convert both to strings for comparison since filterTSE comes from dropdown as string
          return String(tseId) === String(filterTSE);
        });
      }
    }
    
    return tagFiltered;
  }, [conversations, filterTag, filterTSE, metrics]);
  
  // Get list of TSEs for filter dropdown
  const tseList = useMemo(() => {
    return (metrics.byTSE || []).map(tse => ({ id: tse.id, name: tse.name }));
  }, [metrics.byTSE]);

  // Only show loading screen on initial load, not on auto-refresh
  if (loading && !conversations || (Array.isArray(conversations) && conversations.length === 0)) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading queue health data…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error">Error loading data: {error}</div>
        <button onClick={onRefresh} className="refresh-button">Retry</button>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {loading && conversations && conversations.length > 0 && (
        <div className="refreshing-indicator">
          <span>🔄 Refreshing data...</span>
        </div>
      )}
      <div className="dashboard-header">
        <h2>Support Ops: Queue Health Dashboard</h2>
        <div className="header-actions">
          <div className="view-tabs">
            <button 
              className={activeView === "overview" ? "active" : ""}
              onClick={() => setActiveView("overview")}
            >
              Overview
            </button>
            <button 
              className={activeView === "tse" ? "active" : ""}
              onClick={() => setActiveView("tse")}
            >
              TSE View
            </button>
            <button 
              className={activeView === "conversations" ? "active" : ""}
              onClick={() => setActiveView("conversations")}
            >
              Conversations
            </button>
            <button 
              className={activeView === "historical" ? "active" : ""}
              onClick={() => setActiveView("historical")}
            >
              Historical
            </button>
          </div>
          <div className="refresh-section">
            {lastUpdated && (
              <span className="last-updated">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button onClick={onRefresh} className="refresh-button">Refresh</button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      {activeView === "conversations" && (
        <div className="filter-bar">
          <div className="filter-group">
            <label>Filter by Tag:</label>
            <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)} className="filter-select">
              <option value="all">All Conversations</option>
              <option value="snoozed">Snoozed</option>
              <option value="investigation">#Snooze.Investigation</option>
              <option value="customerwait">#Snooze.CustomerWait</option>
              <option value="actionable">Actionable Snoozed</option>
              <option value="reassignment">Reassignment Candidates (48+ hrs)</option>
              <option value="closure">Closure Candidates</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Filter by TSE:</label>
            <select value={filterTSE} onChange={(e) => setFilterTSE(e.target.value)} className="filter-select">
              <option value="all">All TSEs</option>
              <option value="unassigned">Unassigned</option>
              {tseList.map(tse => (
                <option key={tse.id} value={tse.id}>{tse.name}</option>
              ))}
            </select>
          </div>
          <div className="filter-buttons">
            <button 
              onClick={() => {
                setFilterTSE("unassigned");
                setFilterTag("all");
              }} 
              className="filter-button"
            >
              Show Unassigned
            </button>
            <button 
              onClick={() => {
                setFilterTag("snoozed");
                setFilterTSE("all");
              }} 
              className="filter-button"
            >
              Show Snoozed
            </button>
          </div>
        </div>
      )}

      {/* Alerts Section - Show only in overview */}
      {activeView === "overview" && metrics.alerts && metrics.alerts.length > 0 && (
        <div className="alerts-section">
          <h3 className="section-title">⚠️ Active Alerts</h3>
          <div className="alerts-grid">
            {metrics.alerts.map((alert, idx) => (
              <div key={idx} className={`alert-card alert-${alert.severity}`}>
                <div className="alert-icon">⚠️</div>
                <div className="alert-content">
                  <div className="alert-message">{alert.message}</div>
                  <div className="alert-count">Count: {alert.count}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overview Metrics - Show only in overview */}
      {activeView === "overview" && (
      <div className="metrics-section">
        <h3 className="section-title">Overview Metrics</h3>
        <div className="metrics-grid">
          <MetricCard
            title="Total Open Chats"
            value={metrics.totalOpen}
            target={THRESHOLDS.MAX_OPEN_IDEAL}
            status={metrics.totalOpen === 0 ? "success" : metrics.totalOpen <= THRESHOLDS.MAX_OPEN_SOFT ? "warning" : "error"}
          />
          <MetricCard
            title="Total Snoozed"
            value={metrics.totalSnoozed}
            status="info"
          />
          <MetricCard
            title="Actionable Snoozed"
            value={metrics.actionableSnoozed.length}
            target={THRESHOLDS.MAX_ACTIONABLE_SNOOZED_SOFT}
            status={metrics.actionableSnoozed.length <= THRESHOLDS.MAX_ACTIONABLE_SNOOZED_SOFT ? "success" : "warning"}
          />
          <MetricCard
            title="Reassignment Candidates"
            value={metrics.reassignmentCandidates.length}
            status={metrics.reassignmentCandidates.length > 0 ? "error" : "success"}
          />
          <MetricCard
            title="Closure Candidates"
            value={metrics.closureCandidates.length}
            status={metrics.closureCandidates.length > 0 ? "warning" : "success"}
          />
        </div>
        <h3 className="section-title" style={{ marginTop: "24px" }}>Team Compliance</h3>
        <div className="metrics-grid">
          <MetricCard
            title="Overall Compliance"
            value={`${metrics.complianceOverall || 0}%`}
            status={metrics.complianceOverall >= 80 ? "success" : metrics.complianceOverall >= 60 ? "warning" : "error"}
          />
          <MetricCard
            title="Open Compliance Only"
            value={`${metrics.complianceOpenOnly || 0}%`}
            status={metrics.complianceOpenOnly >= 10 ? "warning" : "info"}
          />
          <MetricCard
            title="Snoozed Compliance Only"
            value={`${metrics.complianceSnoozedOnly || 0}%`}
            status={metrics.complianceSnoozedOnly >= 10 ? "warning" : "info"}
          />
        </div>
      </div>
      )}

      {/* Unassigned Conversations Card - Show only in overview */}
      {activeView === "overview" && metrics.unassignedConversations && metrics.unassignedConversations.total > 0 && (
        <div className="unassigned-section">
          <h3 className="section-title">⚠️ Unassigned Conversations</h3>
          <div className="unassigned-card">
            <div className="unassigned-metrics">
              <div className="unassigned-metric">
                <span className="metric-label">Count:</span>
                <span className="metric-value">{metrics.unassignedConversations.total}</span>
              </div>
              <div className="unassigned-metric">
                <span className="metric-label">Median Wait Time:</span>
                <span className="metric-value">{metrics.unassignedConversations.medianWaitTime || 0}h</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TSE-Level Breakdown - Show only in TSE view */}
      {activeView === "tse" && (
        <div className="tse-section">
          <h3 className="section-title">TSE Queue Health</h3>
        <div className="tse-grid">
          {(metrics.byTSE || []).map((tse) => {
            const totalOpen = tse.open;
            const totalActionableSnoozed = tse.actionableSnoozed + tse.investigationSnoozed;
            const status = totalOpen === 0 && totalActionableSnoozed <= THRESHOLDS.MAX_ACTIONABLE_SNOOZED_SOFT
              ? "success"
              : totalOpen <= THRESHOLDS.MAX_OPEN_SOFT && totalActionableSnoozed <= THRESHOLDS.MAX_ACTIONABLE_SNOOZED_SOFT
              ? "warning"
              : "error";

            return (
              <div key={tse.id} className={`tse-card tse-${status}`}>
                <div className="tse-header">
                  <h4>{tse.name}</h4>
                  <span className={`status-badge status-${status}`}>
                    {status === "success" ? "✓" : status === "warning" ? "⚠" : "✗"}
                  </span>
                </div>
                <div className="tse-metrics">
                  <div className="tse-metric">
                    <span className="metric-label">Open:</span>
                    <span className={`metric-value ${totalOpen > THRESHOLDS.MAX_OPEN_SOFT ? "metric-error" : ""}`}>
                      {totalOpen}
                    </span>
                    <span className="metric-target">(target: {THRESHOLDS.MAX_OPEN_IDEAL})</span>
                  </div>
                  <div className="tse-metric">
                    <span className="metric-label">Actionable Snoozed:</span>
                    <span className={`metric-value ${totalActionableSnoozed > THRESHOLDS.MAX_ACTIONABLE_SNOOZED_SOFT ? "metric-error" : ""}`}>
                      {totalActionableSnoozed}
                    </span>
                    <span className="metric-target">(limit: {THRESHOLDS.MAX_ACTIONABLE_SNOOZED_SOFT})</span>
                  </div>
                  <div className="tse-metric">
                    <span className="metric-label">#Investigation:</span>
                    <span className="metric-value">{tse.investigationSnoozed}</span>
                  </div>
                  <div className="tse-metric">
                    <span className="metric-label">#CustomerWait:</span>
                    <span className="metric-value">{tse.customerWaitSnoozed}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      )}

      {activeView === "conversations" && (
        <div className="conversations-view">
          <h3 className="section-title">
            {filterTag === "all" && "All Conversations"}
            {filterTag === "snoozed" && "Snoozed Conversations"}
            {filterTag === "investigation" && "#Snooze.Investigation Conversations"}
            {filterTag === "customerwait" && "#Snooze.CustomerWait Conversations"}
            {filterTag === "actionable" && "Actionable Snoozed Conversations"}
            {filterTag === "reassignment" && "Reassignment Candidates (48+ hours)"}
            {filterTag === "closure" && "Closure Candidates"}
            <span className="count-badge">({filteredConversations.length})</span>
          </h3>
          <ConversationTable 
            conversations={filteredConversations} 
            showTimeInfo={filterTag === "reassignment" || filterTag === "closure"}
          />
        </div>
      )}

      {/* Reassignment Candidates - Only show in overview */}
      {activeView === "overview" && metrics.reassignmentCandidates && metrics.reassignmentCandidates.length > 0 && (
        <div className="candidates-section">
          <h3 className="section-title">🔄 Proactive Reassignment Candidates (48+ hours)</h3>
          <ConversationTable conversations={metrics.reassignmentCandidates} />
        </div>
      )}

      {/* Closure Candidates - Only show in overview */}
      {activeView === "overview" && metrics.closureCandidates && metrics.closureCandidates.length > 0 && (
        <div className="candidates-section">
          <h3 className="section-title">✅ Intelligent Closure Candidates</h3>
          <ConversationTable conversations={metrics.closureCandidates} showTimeInfo />
        </div>
      )}

      {/* Historical View */}
      {activeView === "historical" && (
        <HistoricalView onSaveSnapshot={handleSaveSnapshot} />
      )}
    </div>
  );
}

function MetricCard({ title, value, target, status = "info" }) {
  return (
    <div className={`metric-card metric-${status}`}>
      <div className="metric-title">{title}</div>
      <div className="metric-value-large">{value}</div>
      {target !== undefined && (
        <div className="metric-target">Target: {target}</div>
      )}
    </div>
  );
}

function ConversationTable({ conversations, showTimeInfo = false }) {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [columnWidths, setColumnWidths] = useState({
    id: 150,
    created: 180,
    updated: 180,
    assigned: 150,
    author: 200,
    state: 100,
    medianReply: 150,
    snoozedUntil: 180,
    tags: 200
  });
  const [isResizing, setIsResizing] = useState(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, width: 0 });

  const handleMouseDown = (e, column) => {
    e.preventDefault();
    e.stopPropagation();
    setResizeStart({
      x: e.clientX,
      width: columnWidths[column]
    });
    setIsResizing(column);
  };

  const handleMouseUp = () => {
    setIsResizing(null);
  };

  useEffect(() => {
    if (isResizing) {
      const handleMouseMoveGlobal = (e) => {
        const deltaX = e.clientX - resizeStart.x;
        const newWidth = Math.max(50, resizeStart.width + deltaX);
        setColumnWidths(prev => ({
          ...prev,
          [isResizing]: newWidth
        }));
      };
      
      document.addEventListener('mousemove', handleMouseMoveGlobal);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMoveGlobal);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, resizeStart]);

  if (!conversations || !Array.isArray(conversations) || conversations.length === 0) {
    return (
      <div className="table-container">
        <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
          No conversations found
        </div>
      </div>
    );
  }

  const INTERCOM_BASE_URL = "https://app.intercom.com/a/inbox/gu1e0q0t/inbox/admin/9110812/conversation/";

  // Prepare data with timestamps for sorting and additional fields
  const conversationsWithTimestamps = conversations.map((conv) => {
    const id = conv.id || conv.cid || conv.conversation_id;
    const created = conv.created_at || conv.createdAt || conv.first_opened_at;
    const updated = conv.updated_at || conv.last_contacted_at;
    
    // Extract author email
    const authorEmail = conv.source?.author?.email || 
                       conv.source?.email || 
                       conv.author?.email ||
                       conv.conversation_message?.author?.email ||
                       "-";
    
    // Get state
    const state = conv.state || "open";
    
    // Calculate median time to reply (in seconds)
    // This is typically the time between conversation creation and first admin reply
    let medianReplySeconds = null;
    if (conv.statistics?.first_contact_reply_at) {
      const firstReply = typeof conv.statistics.first_contact_reply_at === "number" 
        ? conv.statistics.first_contact_reply_at 
        : new Date(conv.statistics.first_contact_reply_at).getTime() / 1000;
      const createdTimestamp = created ? (typeof created === "number" ? created : new Date(created).getTime() / 1000) : null;
      if (createdTimestamp && firstReply > createdTimestamp) {
        medianReplySeconds = Math.round(firstReply - createdTimestamp);
      }
    } else if (conv.statistics?.time_to_first_admin_reply) {
      medianReplySeconds = conv.statistics.time_to_first_admin_reply;
    }
    
    // Get snoozed until timestamp
    const snoozedUntil = conv.snoozed_until || null;
    const snoozedUntilDate = snoozedUntil ? (typeof snoozedUntil === "number" ? new Date(snoozedUntil * 1000) : new Date(snoozedUntil)) : null;
    
    return {
      ...conv,
      id,
      authorEmail,
      state,
      medianReplySeconds,
      snoozedUntilDate,
      createdTimestamp: created ? (typeof created === "number" ? created : new Date(created).getTime()) : 0,
      updatedTimestamp: updated ? (typeof updated === "number" ? updated * 1000 : new Date(updated).getTime()) : 0,
    };
  });

  // Sort conversations
  const sortedConversations = [...conversationsWithTimestamps].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let aVal, bVal;
    if (sortColumn === 'created') {
      aVal = a.createdTimestamp;
      bVal = b.createdTimestamp;
    } else if (sortColumn === 'updated') {
      aVal = a.updatedTimestamp;
      bVal = b.updatedTimestamp;
    } else {
      return 0;
    }
    
    if (aVal === bVal) return 0;
    const comparison = aVal > bVal ? 1 : -1;
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  return (
    <div className="table-container">
      <table className="conversations-table">
        <thead>
          <tr>
            <th style={{ width: columnWidths.id, position: 'relative' }}>
              ID
              <div 
                className="column-resizer"
                onMouseDown={(e) => handleMouseDown(e, 'id')}
              />
            </th>
            <th 
              style={{ width: columnWidths.created, position: 'relative', cursor: 'pointer', minWidth: '50px' }}
              onClick={() => handleSort('created')}
              className="sortable-header"
            >
              Created At
              {sortColumn === 'created' && (
                <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
              )}
              <div 
                className="column-resizer"
                onMouseDown={(e) => handleMouseDown(e, 'created')}
              />
            </th>
            <th 
              style={{ width: columnWidths.updated, position: 'relative', cursor: 'pointer', minWidth: '50px' }}
              onClick={() => handleSort('updated')}
              className="sortable-header"
            >
              Last Updated
              {sortColumn === 'updated' && (
                <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
              )}
              <div 
                className="column-resizer"
                onMouseDown={(e) => handleMouseDown(e, 'updated')}
              />
            </th>
            <th style={{ width: columnWidths.assigned, position: 'relative', minWidth: '50px' }}>
              Assigned To
              <div 
                className="column-resizer"
                onMouseDown={(e) => handleMouseDown(e, 'assigned')}
              />
            </th>
            <th style={{ width: columnWidths.state, position: 'relative', minWidth: '50px' }}>
              State
              <div 
                className="column-resizer"
                onMouseDown={(e) => handleMouseDown(e, 'state')}
              />
            </th>
            <th style={{ width: columnWidths.snoozedUntil, position: 'relative', minWidth: '50px' }}>
              Snoozed Until
              <div 
                className="column-resizer"
                onMouseDown={(e) => handleMouseDown(e, 'snoozedUntil')}
              />
            </th>
            <th style={{ width: columnWidths.medianReply, position: 'relative', minWidth: '50px' }}>
              Median Time to Reply (s)
              <div 
                className="column-resizer"
                onMouseDown={(e) => handleMouseDown(e, 'medianReply')}
              />
            </th>
            <th style={{ width: columnWidths.email, position: 'relative', minWidth: '50px' }}>
              Email
              <div 
                className="column-resizer"
                onMouseDown={(e) => handleMouseDown(e, 'email')}
              />
            </th>
            <th style={{ width: columnWidths.tags, position: 'relative', minWidth: '50px' }}>
              Tags
              <div 
                className="column-resizer"
                onMouseDown={(e) => handleMouseDown(e, 'tags')}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedConversations.map((conv) => {
            const id = conv.id;
            const tags = conv.tags || [];
            const tagNames = tags.map(t => typeof t === "string" ? t : t.name).join(", ");
            
            const created = conv.created_at || conv.createdAt || conv.first_opened_at;
            const createdDate = created ? new Date(typeof created === "number" ? created * 1000 : created) : null;
            
            const updated = conv.updated_at || conv.last_contacted_at;
            const updatedDate = updated ? new Date(typeof updated === "number" ? updated * 1000 : updated) : null;
            
            const assigneeName = conv.admin_assignee?.name || 
                                (typeof conv.admin_assignee === "string" ? conv.admin_assignee : null) ||
                                "Unassigned";

            // Format median reply time
            const formatMedianReply = (seconds) => {
              if (seconds === null || seconds === undefined) return "-";
              if (seconds < 60) return `${seconds}s`;
              if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
              return `${Math.round(seconds / 3600)}h`;
            };

            // Format median reply display - only show formatted version if different from raw seconds
            const formatMedianReplyDisplay = (seconds) => {
              if (seconds === null || seconds === undefined) return "-";
              const formatted = formatMedianReply(seconds);
              // If formatted is same as raw (e.g., "1s"), just show formatted
              if (formatted === `${seconds}s`) {
                return formatted;
              }
              // Otherwise show both: "3600s (1h)"
              return `${seconds}s (${formatted})`;
            };

            return (
              <tr key={id}>
                <td className="id-cell" style={{ width: columnWidths.id }}>
                  <a 
                    href={`${INTERCOM_BASE_URL}${id}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="id-link"
                  >
                    {id}
                  </a>
                </td>
                <td className="date-cell" style={{ width: columnWidths.created }}>
                  {createdDate ? createdDate.toLocaleString() : "-"}
                </td>
                <td className="date-cell" style={{ width: columnWidths.updated }}>
                  {updatedDate ? updatedDate.toLocaleString() : "-"}
                </td>
                <td style={{ width: columnWidths.assigned }}>{assigneeName}</td>
                <td style={{ width: columnWidths.state }}>
                  <span style={{ 
                    textTransform: 'capitalize',
                    fontWeight: conv.state === 'snoozed' ? 600 : 400,
                    color: conv.state === 'snoozed' ? '#ff9a74' : '#292929'
                  }}>
                    {conv.state || "open"}
                  </span>
                </td>
                <td className="date-cell" style={{ width: columnWidths.snoozedUntil }}>
                  {conv.snoozedUntilDate ? conv.snoozedUntilDate.toLocaleString() : "-"}
                </td>
                <td style={{ width: columnWidths.medianReply }}>
                  {formatMedianReplyDisplay(conv.medianReplySeconds)}
                </td>
                <td style={{ width: columnWidths.email }}>{conv.authorEmail || "-"}</td>
                <td className="tags-cell" style={{ width: columnWidths.tags }}>{tagNames || "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default Dashboard;

