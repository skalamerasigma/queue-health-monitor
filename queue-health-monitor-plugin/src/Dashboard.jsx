import React, { useMemo, useState, useEffect, useRef } from "react";
import HistoricalView from "./HistoricalView";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import "./Dashboard.css";

// TSE Region mapping
const TSE_REGIONS = {
  'UK': ['Salman Filli', 'Erin Liu', 'Kabilan Thayaparan', 'J', 'Nathan Simpson'],
  'NY': ['Lyle Pierson Stachecki', 'Nick Clancey', 'Swapnil Deshpande', 'Ankita Dalvi', 'Grace Sanford', 'Erez Yagil', 'Julia Lusala', 'Priyanshi Singh', 'Betty Liu', 'Xyla Fang', 'Rashi Madnani', 'Nikhil Krishnappa', 'Ryan Jaipersaud', 'Krish Pawooskar', 'Siddhi Jadhav', 'Arley Schenker'],
  'SF': ['Sanyam Khurana', 'Hem Kamdar', 'Sagarika Sardesai', 'Nikita Bangale', 'Payton Steiner', 'Bhavana Prasad Kote', 'Grania M', 'Soheli Das', 'Hayden Greif-Neill', 'Roshini Padmanabha', 'Abhijeet Lal', 'Ratna Shivakumar', 'Sahibeer Singh']
};

// Helper function to get region for a TSE name
const getTSERegion = (tseName) => {
  for (const [region, names] of Object.entries(TSE_REGIONS)) {
    if (names.includes(tseName)) {
      return region;
    }
  }
  return 'Other'; // Fallback for any TSEs not in the list
};

// TSE Avatar mapping (first name to Cloudinary URL)
const TSE_AVATARS = {
  // New York
  'Nick': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765232392/2_fpxpja.svg',
  'Julia': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765232388/17_hxyc2t.svg',
  'Ankita': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765282918/Untitled_design_10_bsgeve.svg',
  'Nikhil': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765284907/Untitled_design_13_qeyxww.svg',
  'Erez': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765232390/10_ttgpck.svg',
  'Xyla': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765232391/7_qwfphq.svg',
  'Rashi': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765293772/Untitled_design_14_w3uv23.svg',
  'Ryan': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765232392/5_kw4h8x.svg',
  'Krish': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765232388/15_hwmz5x.svg',
  'Lyle': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765232388/14_vqo4ks.svg',
  'Betty': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765232391/8_efebpc.svg',
  'Arley': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765232390/9_vpzwjd.svg',
  'Priyanshi': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765232390/12_avm2xl.svg',
  'Siddhi': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765232392/6_f3d2qt.svg',
  'Swapnil': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765232390/11_xrb9qj.svg',
  // San Francisco
  'Sanyam': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765382789/Untitled_design_10_kzcja0.svg',
  'Hem': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765318686/Untitled_design_22_uydf2h.svg',
  'Sagarika': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765232530/Untitled_design_8_ikixmx.svg',
  'Nikita': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765284091/Untitled_design_11_mbsjbt.svg',
  'Payton': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765232385/22_pammoi.svg',
  'Bhavana': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765318568/Untitled_design_21_kuwvcw.svg',
  'Grania': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765232388/21_tjy6io.svg',
  'Soheli': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765318474/Untitled_design_20_zsho0q.svg',
  'Hayden': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765311038/Untitled_design_18_uze5nk.svg',
  'Roshini': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765311036/Untitled_design_19_ls5fat.svg',
  'Abhijeet': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765310522/Untitled_design_16_jffaql.svg',
  'Ratna': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765311039/Untitled_design_17_lchaky.svg',
  'Sahibeer': 'https://res.cloudinary.com/doznvxtja/image/upload/v1767268642/sahibeer_g0bk1n.svg',
  // London/UK
  'Nathan': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765232389/13_flxpry.svg',
  'J': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765232387/18_yqqjho.svg',
  'Kabilan': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765232387/16_hgphrw.svg',
  'Salman': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765232386/20_ukjqlc.svg',
  'Erin': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765232386/19_q54uo5.svg'
};

// Helper function to get avatar URL for a TSE name
const getTSEAvatar = (tseName) => {
  if (!tseName) return null;
  // Extract first name from full name
  const firstName = tseName.split(' ')[0];
  return TSE_AVATARS[firstName] || null;
};

// Holiday configuration with SVG URLs
const HOLIDAYS = {
  '01-01': 'https://res.cloudinary.com/doznvxtja/image/upload/v1767183389/new_years_gsfi9s.svg', // New Year's Day
  '06-19': 'https://res.cloudinary.com/doznvxtja/image/upload/v1767183557/juneteenth_wgccmi.svg', // Juneteenth
  '07-04': 'https://res.cloudinary.com/doznvxtja/image/upload/v1767183658/independence_day_xkqltc.svg', // Independence Day
  '12-25': 'https://res.cloudinary.com/doznvxtja/image/upload/v1767180781/xmas_hat_o0mk2w.svg', // Christmas Day
};

// Helper function to get the Nth weekday of a month
const getNthWeekday = (year, month, weekday, n) => {
  // weekday: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // n: 1 = first, 2 = second, etc.
  const firstDay = new Date(year, month, 1).getDay();
  let day = 1 + ((weekday - firstDay + 7) % 7);
  day += (n - 1) * 7;
  return day;
};

// Helper function to get the last weekday of a month
const getLastWeekday = (year, month, weekday) => {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const lastDayOfWeek = new Date(year, month, lastDay).getDay();
  let day = lastDay - ((lastDayOfWeek - weekday + 7) % 7);
  return day;
};

// Function to check if a date matches any holiday and return the icon URL
const getHolidayIcon = (dateStr) => {
  if (!dateStr) return null;
  
  // Parse date - handle both "YYYY-MM-DD" and "MM/DD" formats
  let year, month, day;
  if (dateStr.includes('-')) {
    // Format: "YYYY-MM-DD"
    [year, month, day] = dateStr.split('-').map(Number);
  } else if (dateStr.includes('/')) {
    // Format: "MM/DD" - need to get year from current context
    // For display labels, we'll need to infer the year
    const parts = dateStr.split('/');
    month = parseInt(parts[0], 10);
    day = parseInt(parts[1], 10);
    // Try to get year from data if available, otherwise use current year
    year = new Date().getFullYear();
  } else {
    return null;
  }
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  
  const date = new Date(year, month - 1, day);
  const dateMonth = date.getMonth() + 1; // 1-12
  const dateDay = date.getDate();
  const dateYear = date.getFullYear();
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Check fixed date holidays
  const monthDayKey = `${String(dateMonth).padStart(2, '0')}-${String(dateDay).padStart(2, '0')}`;
  if (HOLIDAYS[monthDayKey]) {
    return HOLIDAYS[monthDayKey];
  }
  
  // Check variable holidays
  // MLK Day - 3rd Monday in January
  if (dateMonth === 1 && dayOfWeek === 1) {
    const mlkDay = getNthWeekday(dateYear, 0, 1, 3); // month is 0-indexed
    if (dateDay === mlkDay) {
      return 'https://res.cloudinary.com/doznvxtja/image/upload/v1767184247/mlk_n0k97m.svg';
    }
  }
  
  // Presidents' Day - 3rd Monday in February
  if (dateMonth === 2 && dayOfWeek === 1) {
    const presidentsDay = getNthWeekday(dateYear, 1, 1, 3);
    if (dateDay === presidentsDay) {
      return 'https://res.cloudinary.com/doznvxtja/image/upload/v1767184785/white_house_kjvx5t.svg';
    }
  }
  
  // Memorial Day - last Monday in May
  if (dateMonth === 5 && dayOfWeek === 1) {
    const memorialDay = getLastWeekday(dateYear, 4, 1); // month is 0-indexed
    if (dateDay === memorialDay) {
      return 'https://res.cloudinary.com/doznvxtja/image/upload/v1767182069/memorial_day_jg4tdh.svg';
    }
  }
  
  // Labor Day - 1st Monday in September
  if (dateMonth === 9 && dayOfWeek === 1) {
    const laborDay = getNthWeekday(dateYear, 8, 1, 1);
    if (dateDay === laborDay) {
      return 'https://res.cloudinary.com/doznvxtja/image/upload/v1767185195/labor_day_qppq3c.svg';
    }
  }
  
  // Thanksgiving - 4th Thursday in November
  if (dateMonth === 11 && dayOfWeek === 4) {
    const thanksgiving = getNthWeekday(dateYear, 10, 4, 4);
    if (dateDay === thanksgiving) {
      return 'https://res.cloudinary.com/doznvxtja/image/upload/v1767183818/thanksgiving_wsdwsa.svg';
    }
  }
  
  // Day after Thanksgiving - Friday after Thanksgiving
  if (dateMonth === 11 && dayOfWeek === 5) {
    const thanksgiving = getNthWeekday(dateYear, 10, 4, 4);
    if (dateDay === thanksgiving + 1) {
      return 'https://res.cloudinary.com/doznvxtja/image/upload/v1767184107/black_friday_sjz6g1.svg';
    }
  }
  
  return null;
};

// Custom label function to render holiday icons
const createHolidayLabel = (data, isBarChart = false) => (props) => {
  const { x, y, index, width } = props;
  if (index === undefined || !data || !data[index]) return null;
  
  const dataPoint = data[index];
  const dateStr = dataPoint.date || dataPoint.displayLabel;
  
  const iconUrl = getHolidayIcon(dateStr);
  if (!iconUrl) return null;
  
  // For bar charts, center the icon horizontally within the bar
  // For line/area charts, center on the data point
  const iconX = isBarChart && width ? (x + width / 2 - 15) : (x - 15);
  
  return (
    <g>
      <image
        href={iconUrl}
        x={iconX}
        y={y - 45}
        width="30"
        height="30"
      />
    </g>
  );
};

// TSEs to exclude from the dashboard
const EXCLUDED_TSE_NAMES = [
  "Stephen Skalamera",
  "Zen Junior",
  "Nathan Parrish",
  "Prerit Sachdeva",
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
  const [searchId, setSearchId] = useState("");
  const [historicalSnapshots, setHistoricalSnapshots] = useState([]);
  const [responseTimeMetrics, setResponseTimeMetrics] = useState([]);
  const [loadingHistorical, setLoadingHistorical] = useState(false);
  const [alertsDropdownOpen, setAlertsDropdownOpen] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [wasLoading, setWasLoading] = useState(false);
  const [selectedColors, setSelectedColors] = useState(new Set(['success', 'warning', 'error'])); // All selected by default
  const [selectedRegions, setSelectedRegions] = useState(new Set(['UK', 'NY', 'SF', 'Other'])); // All selected by default

  // Fetch historical data for Overview tab
  useEffect(() => {
    if (activeView === "overview") {
      fetchOverviewHistoricalData();
    }
  }, [activeView]);

  // Refresh historical data when conversations are refreshed (for auto-refresh)
  // This ensures Overview tab data refreshes automatically
  useEffect(() => {
    if (activeView === "overview" && lastUpdated) {
      // Refresh historical data when conversations are auto-refreshed
      // Only refresh if we're on overview tab
      console.log('Dashboard: Auto-refresh triggered for Overview tab');
      fetchOverviewHistoricalData();
    }
  }, [lastUpdated, activeView]);

  const fetchOverviewHistoricalData = async () => {
    setLoadingHistorical(true);
    try {
      // Get last 7 weekdays (same logic as Historical tab)
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

      console.log('Overview: Fetching snapshots for date range:', { startDateStr, endDateStr, weekdays });

      // Fetch compliance snapshots
      const snapshotParams = new URLSearchParams();
      snapshotParams.append('startDate', startDateStr);
      snapshotParams.append('endDate', endDateStr);
      
      // In development, use production API URL since local dev server doesn't have API routes
      const snapshotUrl = process.env.NODE_ENV === 'production'
        ? `${window.location.origin}/api/snapshots/get?${snapshotParams}`
        : `https://queue-health-monitor.vercel.app/api/snapshots/get?${snapshotParams}`;
      
      console.log('Overview: Fetching from URL:', snapshotUrl);
      try {
        const snapshotRes = await fetch(snapshotUrl);
        if (snapshotRes.ok) {
          const snapshotData = await snapshotRes.json();
          console.log('Overview: Received snapshot data:', { 
            snapshotsCount: snapshotData.snapshots?.length || 0,
            snapshots: snapshotData.snapshots 
          });
          setHistoricalSnapshots(snapshotData.snapshots || []);
        } else {
          const errorText = await snapshotRes.text();
          console.error('Overview: Failed to fetch snapshots:', snapshotRes.status, errorText);
        }
      } catch (error) {
        console.error('Overview: Error fetching snapshots:', error);
        // Silently fail in development - historical data is optional
      }

      // Fetch response time metrics
      const metricParams = new URLSearchParams();
      metricParams.append('startDate', startDateStr);
      metricParams.append('endDate', endDateStr);
      
      // In development, use production API URL since local dev server doesn't have API routes
      const metricUrl = process.env.NODE_ENV === 'production'
        ? `${window.location.origin}/api/response-time-metrics/get?${metricParams}`
        : `https://queue-health-monitor.vercel.app/api/response-time-metrics/get?${metricParams}`;
      
      try {
        const metricRes = await fetch(metricUrl);
        if (metricRes.ok) {
          const metricData = await metricRes.json();
          setResponseTimeMetrics(metricData.metrics || []);
        }
      } catch (error) {
        console.error('Overview: Error fetching response time metrics:', error);
        // Silently fail in development - historical data is optional
      }
    } catch (error) {
      console.error('Error fetching overview historical data:', error);
      // In development, this is expected since API routes aren't available locally
      // Set empty arrays so the UI doesn't break
      setHistoricalSnapshots([]);
      setResponseTimeMetrics([]);
    } finally {
      setLoadingHistorical(false);
    }
  };

  const handleSaveSnapshot = async () => {
    try {
      // Calculate current TSE metrics
      const EXCLUDED_TSE_NAMES = [
        "Stephen Skalamera", "Zen Junior", "Nathan Parrish", "Leticia Esparza",
        "Rob Woollen", "Brett Bedevian", "Viswa Jeyaraman", "Brandon Yee",
        "Holly Coxon", "Chetana Shinde", "Matt Morgenroth", "Grace Sanford",
        "Prerit Sachdeva", "svc-prd-tse-intercom SVC"
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
        // Exclude conversations from excluded TSEs (to match filtered table behavior)
        const assigneeName = c.admin_assignee?.name || 
                            (typeof c.admin_assignee === "string" ? c.admin_assignee : null);
        if (assigneeName && EXCLUDED_TSE_NAMES.includes(assigneeName)) {
          return false;
        }
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
      if (filterTag === "open") {
        return conversations.filter(conv => {
          const isSnoozed = conv.state === "snoozed" || 
                           conv.state === "Snoozed" ||
                           conv.snoozed_until || 
                           (conv.statistics && conv.statistics.state === "snoozed");
          return conv.state === "open" && !isSnoozed;
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
    
    // Filter by ID search if provided
    if (searchId.trim()) {
      const searchTerm = searchId.trim().toLowerCase();
      tagFiltered = tagFiltered.filter(conv => {
        const convId = String(conv.id || "").toLowerCase();
        return convId.includes(searchTerm);
      });
    }
    
    return tagFiltered;
  }, [conversations, filterTag, filterTSE, metrics, searchId]);
  
  // Get list of TSEs for filter dropdown
  const tseList = useMemo(() => {
    return (metrics.byTSE || []).map(tse => ({ id: tse.id, name: tse.name }));
  }, [metrics.byTSE]);

  // Group TSEs by region (memoized at component level - must be before early returns)
  const tseByRegion = useMemo(() => {
    const grouped = { 'UK': [], 'NY': [], 'SF': [], 'Other': [] };
    (metrics.byTSE || []).forEach(tse => {
      const region = getTSERegion(tse.name);
      grouped[region].push(tse);
    });
    return grouped;
  }, [metrics.byTSE]);

  // Track loading state changes to show completion animation
  useEffect(() => {
    if (loading) {
      setWasLoading(true);
      setShowCompletion(false);
    } else if (wasLoading && conversations && conversations.length > 0) {
      // Loading just finished, show completion GIF
      setShowCompletion(true);
      const timer = setTimeout(() => {
        setShowCompletion(false);
        setWasLoading(false);
      }, 3000); // Show completion GIF for 3 seconds
      return () => clearTimeout(timer);
    }
  }, [loading, conversations, wasLoading]);

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
            {showCompletion ? "Loading complete!" : "Loading queue health data…"}
          </div>
        </div>
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

  // Show error if no conversations after loading completes
  if (!loading && (!conversations || (Array.isArray(conversations) && conversations.length === 0))) {
    return (
      <div className="dashboard-container">
        <div className="error">No conversation data available. Please check the API connection.</div>
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
          <AlertsDropdown 
            alerts={metrics.alerts || []}
            isOpen={alertsDropdownOpen}
            onToggle={() => setAlertsDropdownOpen(!alertsDropdownOpen)}
            onClose={() => setAlertsDropdownOpen(false)}
          />
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
          <div className="filter-group">
            <label>Search by ID:</label>
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Enter conversation ID..."
              className="filter-input"
            />
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
            <button 
              onClick={() => {
                setFilterTag("open");
                setFilterTSE("all");
              }} 
              className="filter-button"
            >
              Show Open
            </button>
            <button 
              onClick={() => {
                setFilterTag("all");
                setFilterTSE("all");
                setSearchId("");
              }} 
              className="filter-button clear-button"
            >
              Clear
            </button>
          </div>
        </div>
      )}


      {/* Modern Overview - Show only in overview */}
      {activeView === "overview" && (
        <OverviewDashboard 
          metrics={metrics}
          historicalSnapshots={historicalSnapshots}
          responseTimeMetrics={responseTimeMetrics}
          loadingHistorical={loadingHistorical}
        />
      )}

      {/* TSE-Level Breakdown - Show only in TSE view */}
      {activeView === "tse" && (
        <div className="tse-section">
          <h3 className="section-title">TSE Queue Health</h3>
          
          {/* Filters Container */}
          <div className="tse-filters-container">
            <h4 className="filters-title">Filters</h4>
            
            {/* Color Filters */}
            <div className="tse-color-filters-section">
              <div className="filter-section-header">
                <span className="filter-section-label">Status:</span>
                <div className="filter-buttons">
                  <button 
                    className="filter-button"
                    onClick={() => setSelectedColors(new Set(['success', 'warning', 'error']))}
                  >
                    Select All
                  </button>
                  <button 
                    className="filter-button"
                    onClick={() => setSelectedColors(new Set())}
                  >
                    Unselect All
                  </button>
                </div>
              </div>
              <div className="tse-color-filters">
                <div 
                  className={`legend-item legend-clickable ${selectedColors.has('success') ? 'legend-selected' : ''}`}
                  onClick={() => {
                    const newColors = new Set(selectedColors);
                    if (newColors.has('success')) {
                      newColors.delete('success');
                    } else {
                      newColors.add('success');
                    }
                    setSelectedColors(newColors);
                  }}
                >
                  <div className="legend-color legend-success">
                    {selectedColors.has('success') && <span className="legend-checkmark">✓</span>}
                  </div>
                  <span className="legend-label">Healthy (0 open, ≤{THRESHOLDS.MAX_ACTIONABLE_SNOOZED_SOFT} actionable snoozed)</span>
                </div>
                <div 
                  className={`legend-item legend-clickable ${selectedColors.has('warning') ? 'legend-selected' : ''}`}
                  onClick={() => {
                    const newColors = new Set(selectedColors);
                    if (newColors.has('warning')) {
                      newColors.delete('warning');
                    } else {
                      newColors.add('warning');
                    }
                    setSelectedColors(newColors);
                  }}
                >
                  <div className="legend-color legend-warning">
                    {selectedColors.has('warning') && <span className="legend-checkmark">✓</span>}
                  </div>
                  <span className="legend-label">Warning (≤{THRESHOLDS.MAX_OPEN_SOFT} open, ≤{THRESHOLDS.MAX_ACTIONABLE_SNOOZED_SOFT} actionable snoozed)</span>
                </div>
                <div 
                  className={`legend-item legend-clickable ${selectedColors.has('error') ? 'legend-selected' : ''}`}
                  onClick={() => {
                    const newColors = new Set(selectedColors);
                    if (newColors.has('error')) {
                      newColors.delete('error');
                    } else {
                      newColors.add('error');
                    }
                    setSelectedColors(newColors);
                  }}
                >
                  <div className="legend-color legend-error">
                    {selectedColors.has('error') && <span className="legend-checkmark">✓</span>}
                  </div>
                  <span className="legend-label">Alert ({'>'}{THRESHOLDS.MAX_OPEN_SOFT} open or {'>'}{THRESHOLDS.MAX_ACTIONABLE_SNOOZED_SOFT} actionable snoozed)</span>
                </div>
              </div>
            </div>

            {/* Region Filter */}
            <div className="tse-region-filter-section">
              <div className="filter-section-header">
                <span className="filter-section-label">Region:</span>
                <div className="filter-buttons">
                  <button 
                    className="filter-button"
                    onClick={() => setSelectedRegions(new Set(['UK', 'NY', 'SF', 'Other']))}
                  >
                    Select All
                  </button>
                  <button 
                    className="filter-button"
                    onClick={() => setSelectedRegions(new Set())}
                  >
                    Unselect All
                  </button>
                </div>
              </div>
              <div className="tse-region-filter">
                {['UK', 'NY', 'SF', 'Other'].map(region => {
                  const regionLabels = {
                    'UK': { text: 'UK', emoji: '🇬🇧' },
                    'NY': { text: 'New York', emoji: '🗽' },
                    'SF': { text: 'San Francisco', emoji: '🌉' },
                    'Other': { text: 'Other', emoji: '' }
                  };
                  const label = regionLabels[region];
                  return (
                    <label key={region} className="region-filter-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedRegions.has(region)}
                        onChange={(e) => {
                          const newRegions = new Set(selectedRegions);
                          if (e.target.checked) {
                            newRegions.add(region);
                          } else {
                            newRegions.delete(region);
                          }
                          setSelectedRegions(newRegions);
                        }}
                      />
                      <span className="region-filter-text">{label.text}</span>
                      {label.emoji && <span className="region-filter-emoji">{label.emoji}</span>}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {['UK', 'NY', 'SF', 'Other'].map(region => {
            // Skip if region is not selected
            if (!selectedRegions.has(region)) return null;
            
            const tses = tseByRegion[region];
            if (tses.length === 0) return null;

            const regionLabels = {
              'UK': 'UK 🇬🇧',
              'NY': 'New York 🗽',
              'SF': 'San Francisco 🌉',
              'Other': 'Other'
            };

            // Helper function to get status for a TSE
            const getTSEStatus = (tse) => {
              const totalOpen = tse.open;
              const totalActionableSnoozed = tse.actionableSnoozed + tse.investigationSnoozed;
              return totalOpen === 0 && totalActionableSnoozed <= THRESHOLDS.MAX_ACTIONABLE_SNOOZED_SOFT
                ? "success"
                : totalOpen <= THRESHOLDS.MAX_OPEN_SOFT && totalActionableSnoozed <= THRESHOLDS.MAX_ACTIONABLE_SNOOZED_SOFT
                ? "warning"
                : "error";
            };

            // Filter TSEs by selected colors, then sort by status
            const filteredAndSortedTSEs = [...tses]
              .filter(tse => selectedColors.has(getTSEStatus(tse)))
              .sort((a, b) => {
                const statusOrder = { "success": 0, "warning": 1, "error": 2 };
                return statusOrder[getTSEStatus(a)] - statusOrder[getTSEStatus(b)];
              });

            // Don't render region group if no TSEs match the filter
            if (filteredAndSortedTSEs.length === 0) return null;

            // Split region label into text and emoji for styling
            const regionLabelParts = regionLabels[region].split(' ');
            const regionText = regionLabelParts.slice(0, -1).join(' ');
            const regionEmoji = regionLabelParts[regionLabelParts.length - 1];

            return (
              <div key={region} className="tse-region-group">
                <h4 className="tse-region-title">
                  <span className="region-title-text">{regionText}</span>
                  {regionEmoji && <span className="region-title-emoji"> {regionEmoji}</span>}
                </h4>
                <div className="tse-grid">
                  {filteredAndSortedTSEs.map((tse) => {
                    const totalOpen = tse.open;
                    const totalActionableSnoozed = tse.actionableSnoozed + tse.investigationSnoozed;
                    const status = getTSEStatus(tse);

                    const avatarUrl = getTSEAvatar(tse.name);

                    return (
                      <div key={tse.id} className={`tse-card tse-${status}`}>
                        <div className="tse-header">
                          <div className="tse-header-left">
                            {avatarUrl && (
                              <img 
                                src={avatarUrl} 
                                alt={tse.name}
                                className="tse-avatar"
                              />
                            )}
                            <h4>{tse.name}</h4>
                          </div>
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
                          </div>
                          <div className="tse-metric">
                            <span className="metric-label">Actionable Snoozed:</span>
                            <span className={`metric-value ${totalActionableSnoozed > THRESHOLDS.MAX_ACTIONABLE_SNOOZED_SOFT ? "metric-error" : ""}`}>
                              {totalActionableSnoozed}
                            </span>
                          </div>
                          <div className="tse-metric">
                            <span className="metric-label">Waiting on Customer:</span>
                            <span className="metric-value">{tse.customerWaitSnoozed || 0}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeView === "conversations" && (
        <div className="conversations-view">
          <h3 className="section-title">
            {filterTSE === "unassigned" && "Unassigned Conversations"}
            {filterTag === "open" && filterTSE !== "unassigned" && "Open Conversations"}
            {filterTag === "all" && filterTSE !== "unassigned" && "All Conversations"}
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


      {/* Historical View */}
      {activeView === "historical" && (
        <HistoricalView 
          onSaveSnapshot={handleSaveSnapshot} 
          refreshTrigger={lastUpdated}
        />
      )}
    </div>
  );
}

// Alerts Dropdown Component
function AlertsDropdown({ alerts, isOpen, onToggle, onClose }) {
  const [expandedRegions, setExpandedRegions] = useState(new Set(['UK', 'NY', 'SF', 'Other'])); // All expanded by default
  const [expandedTSEs, setExpandedTSEs] = useState(new Set());
  const [expandedAlertTypes, setExpandedAlertTypes] = useState(new Set());
  const [showAllTSEs, setShowAllTSEs] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Group alerts by region, then by TSE
  const alertsByRegion = useMemo(() => {
    const regionGroups = {
      'UK': [],
      'NY': [],
      'SF': [],
      'Other': []
    };

    // First group by TSE
    const tseGroups = {};
    (alerts || []).forEach(alert => {
      const tseKey = alert.tseId || alert.tseName;
      if (!tseGroups[tseKey]) {
        tseGroups[tseKey] = {
          tseId: alert.tseId,
          tseName: alert.tseName,
          openAlerts: [],
          snoozedAlerts: []
        };
      }
      
      if (alert.type === "open_threshold") {
        tseGroups[tseKey].openAlerts.push(alert);
      } else if (alert.type === "actionable_snoozed_threshold") {
        tseGroups[tseKey].snoozedAlerts.push(alert);
      }
    });

    // Then group TSEs by region
    Object.values(tseGroups).forEach(tseGroup => {
      const region = getTSERegion(tseGroup.tseName);
      if (regionGroups[region]) {
        regionGroups[region].push(tseGroup);
      } else {
        regionGroups['Other'].push(tseGroup);
      }
    });

    // Sort TSEs within each region
    Object.keys(regionGroups).forEach(region => {
      regionGroups[region].sort((a, b) => a.tseName.localeCompare(b.tseName));
    });

    return regionGroups;
  }, [alerts]);

  const allTSEs = useMemo(() => {
    return Object.values(alertsByRegion).flat();
  }, [alertsByRegion]);

  const visibleTSEs = showAllTSEs ? allTSEs : allTSEs.slice(0, 5);
  const remainingCount = allTSEs.length - 5;

  const toggleRegion = (region) => {
    const newExpanded = new Set(expandedRegions);
    if (newExpanded.has(region)) {
      newExpanded.delete(region);
    } else {
      newExpanded.add(region);
    }
    setExpandedRegions(newExpanded);
  };

  const toggleTSE = (tseKey) => {
    const newExpanded = new Set(expandedTSEs);
    if (newExpanded.has(tseKey)) {
      newExpanded.delete(tseKey);
    } else {
      newExpanded.add(tseKey);
    }
    setExpandedTSEs(newExpanded);
  };

  const toggleAlertType = (key) => {
    const newExpanded = new Set(expandedAlertTypes);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedAlertTypes(newExpanded);
  };

  const alertCount = alerts?.length || 0;

  return (
    <div className="alerts-dropdown-container" ref={dropdownRef}>
      <button 
        className="alerts-icon-button"
        onClick={onToggle}
        aria-label="Alerts"
      >
        {alertCount > 0 ? (
          <img 
            src="https://res.cloudinary.com/doznvxtja/image/upload/v1767012829/3_150_x_150_px_b2yyf9.svg" 
            alt="Alerts" 
            className="alerts-icon alerts-icon-with-badge"
          />
        ) : (
          <img 
            src="https://res.cloudinary.com/doznvxtja/image/upload/v1767012190/2_nkazbo.svg" 
            alt="No alerts" 
            className="alerts-icon"
          />
        )}
      </button>
      
      {isOpen && (
        <div className="alerts-dropdown">
          <div className="alerts-dropdown-header">
            <h3>Active Alerts</h3>
            <button className="alerts-close-button" onClick={onClose}>×</button>
          </div>
          <div className="alerts-dropdown-content">
            {alertCount === 0 ? (
              <div className="alerts-empty">
                <p>No active alerts</p>
              </div>
            ) : (
              <>
                {['UK', 'NY', 'SF', 'Other'].map(region => {
                  const regionTSEs = alertsByRegion[region] || [];
                  if (regionTSEs.length === 0) return null;

                  const isRegionExpanded = expandedRegions.has(region);
                  const regionLabels = {
                    'UK': 'UK 🇬🇧',
                    'NY': 'New York 🗽',
                    'SF': 'San Francisco 🌉',
                    'Other': 'Other'
                  };

                  // Calculate total alerts for this region
                  const regionAlertCount = regionTSEs.reduce((sum, tse) => 
                    sum + tse.openAlerts.length + tse.snoozedAlerts.length, 0
                  );

                  return (
                    <div key={region} className="region-alert-group">
                      <div 
                        className="region-alert-header" 
                        onClick={() => toggleRegion(region)}
                      >
                        <span className="region-expand-icon">{isRegionExpanded ? '▼' : '▶'}</span>
                        <span className="region-name">{regionLabels[region]}</span>
                        <span className="region-alert-count">({regionAlertCount})</span>
                      </div>
                      
                      {isRegionExpanded && (
                        <div className="region-tse-list">
                          {regionTSEs.map((tseGroup) => {
                            const tseKey = `${tseGroup.tseId}-${tseGroup.tseName}`;
                            const isTSEExpanded = expandedTSEs.has(tseKey);
                            const hasOpenAlerts = tseGroup.openAlerts.length > 0;
                            const hasSnoozedAlerts = tseGroup.snoozedAlerts.length > 0;

                            return (
                              <div key={tseKey} className="tse-alert-group">
                                <div 
                                  className="tse-alert-header" 
                                  onClick={() => toggleTSE(tseKey)}
                                >
                                  <span className="tse-expand-icon">{isTSEExpanded ? '▼' : '▶'}</span>
                                  <span className="tse-name">{tseGroup.tseName}</span>
                                  <span className="tse-alert-count">
                                    ({tseGroup.openAlerts.length + tseGroup.snoozedAlerts.length})
                                  </span>
                                </div>
                                
                                {isTSEExpanded && (
                                  <div className="tse-alert-types">
                                    {hasOpenAlerts && (
                                      <div className="alert-type-group">
                                        <div 
                                          className="alert-type-header"
                                          onClick={() => toggleAlertType(`${tseKey}-open`)}
                                        >
                                          <span className="alert-type-expand-icon">
                                            {expandedAlertTypes.has(`${tseKey}-open`) ? '▼' : '▶'}
                                          </span>
                                          <span className="alert-type-label">Open Chat Alerts</span>
                                          <span className="alert-type-count">({tseGroup.openAlerts.length})</span>
                                        </div>
                                        {expandedAlertTypes.has(`${tseKey}-open`) && (
                                          <div className="alert-type-items">
                                            {tseGroup.openAlerts.map((alert, idx) => (
                                              <div key={idx} className="alert-item">
                                                <span className="alert-severity">
                                                  {alert.severity === "high" ? "🔴" : "🟡"}
                                                </span>
                                                <span className="alert-message">{alert.message}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    
                                    {hasSnoozedAlerts && (
                                      <div className="alert-type-group">
                                        <div 
                                          className="alert-type-header"
                                          onClick={() => toggleAlertType(`${tseKey}-snoozed`)}
                                        >
                                          <span className="alert-type-expand-icon">
                                            {expandedAlertTypes.has(`${tseKey}-snoozed`) ? '▼' : '▶'}
                                          </span>
                                          <span className="alert-type-label">Snoozed Alerts</span>
                                          <span className="alert-type-count">({tseGroup.snoozedAlerts.length})</span>
                                        </div>
                                        {expandedAlertTypes.has(`${tseKey}-snoozed`) && (
                                          <div className="alert-type-items">
                                            {tseGroup.snoozedAlerts.map((alert, idx) => (
                                              <div key={idx} className="alert-item">
                                                <span className="alert-severity">
                                                  {alert.severity === "high" ? "🔴" : "🟡"}
                                                </span>
                                                <span className="alert-message">{alert.message}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {!showAllTSEs && remainingCount > 0 && (
                  <div 
                    className="show-more-tse" 
                    onClick={() => setShowAllTSEs(true)}
                  >
                    Show {remainingCount} more TSE{remainingCount !== 1 ? 's' : ''} ▼
                  </div>
                )}
                
                {showAllTSEs && allTSEs.length > 5 && (
                  <div 
                    className="show-less-tse" 
                    onClick={() => setShowAllTSEs(false)}
                  >
                    Show less ▲
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Modern Overview Dashboard Component
function OverviewDashboard({ metrics, historicalSnapshots, responseTimeMetrics, loadingHistorical }) {
  // Prepare compliance trend data (last 7 days)
  const complianceTrendData = useMemo(() => {
    console.log('Overview: Processing compliance trend data, snapshots:', historicalSnapshots);
    if (!historicalSnapshots || historicalSnapshots.length === 0) {
      console.log('Overview: No historical snapshots available');
      return [];
    }
    
    const processed = historicalSnapshots
      .map(snapshot => {
        const tseData = snapshot.tse_data || snapshot.tseData || [];
        const totalTSEs = tseData.length;
        if (totalTSEs === 0) return null;

        let compliantBoth = 0;
        tseData.forEach(tse => {
          const meetsOpen = (tse.open || 0) <= THRESHOLDS.MAX_OPEN_SOFT;
          const totalActionableSnoozed = (tse.actionableSnoozed || 0) + (tse.investigationSnoozed || 0);
          const meetsSnoozed = totalActionableSnoozed <= THRESHOLDS.MAX_ACTIONABLE_SNOOZED_SOFT;
          if (meetsOpen && meetsSnoozed) compliantBoth++;
        });

        const compliance = totalTSEs > 0 ? Math.round((compliantBoth / totalTSEs) * 100) : 0;
        
        // Parse date avoiding timezone issues
        const [year, month, day] = snapshot.date.split('-').map(Number);
        const localDate = new Date(year, month - 1, day);
        const displayMonth = localDate.getMonth() + 1;
        const displayDay = localDate.getDate();
        
        return {
          date: snapshot.date,
          displayLabel: `${displayMonth}/${displayDay}`,
          compliance
        };
      })
      .filter(item => item !== null)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7); // Last 7 days
    
    console.log('Overview: Processed compliance trend data:', processed);
    return processed;
  }, [historicalSnapshots]);

  // Prepare response time trend data (last 7 days)
  const responseTimeTrendData = useMemo(() => {
    if (!responseTimeMetrics || responseTimeMetrics.length === 0) return [];
    
    return responseTimeMetrics
      .map(metric => {
        const [year, month, day] = metric.date.split('-').map(Number);
        const localDate = new Date(year, month - 1, day);
        const displayMonth = localDate.getMonth() + 1;
        const displayDay = localDate.getDate();
        
        return {
          date: metric.date,
          displayLabel: `${displayMonth}/${displayDay}`,
          percentage: parseFloat(metric.percentage10PlusMin || 0)
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7); // Last 7 days
  }, [responseTimeMetrics]);

  // Calculate current response time percentage (most recent day)
  const currentResponseTimePct = useMemo(() => {
    if (responseTimeTrendData.length === 0) return 0;
    return Math.round(responseTimeTrendData[responseTimeTrendData.length - 1]?.percentage || 0);
  }, [responseTimeTrendData]);

  // Calculate average response time percentage (last 7 days)
  const avgResponseTimePct = useMemo(() => {
    if (responseTimeTrendData.length === 0) return 0;
    const sum = responseTimeTrendData.reduce((acc, item) => acc + (item.percentage || 0), 0);
    return Math.round((sum / responseTimeTrendData.length) * 10) / 10; // Round to 1 decimal
  }, [responseTimeTrendData]);

  // Calculate current compliance from historical data (to match Historical tab)
  const currentCompliance = useMemo(() => {
    if (complianceTrendData.length === 0) return 0;
    // Use the most recent snapshot's compliance value
    return complianceTrendData[complianceTrendData.length - 1]?.compliance || 0;
  }, [complianceTrendData]);

  // Calculate trend indicators
  const complianceTrend = useMemo(() => {
    if (complianceTrendData.length < 2) return { direction: 'stable', change: 0 };
    const first = complianceTrendData[0].compliance;
    const last = complianceTrendData[complianceTrendData.length - 1].compliance;
    const change = last - first;
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      change: Math.abs(change)
    };
  }, [complianceTrendData]);

  const responseTimeTrend = useMemo(() => {
    if (responseTimeTrendData.length < 2) return { direction: 'stable', change: 0 };
    const first = responseTimeTrendData[0].percentage;
    const last = responseTimeTrendData[responseTimeTrendData.length - 1].percentage;
    const change = last - first;
    return {
      direction: change < 0 ? 'up' : change > 0 ? 'down' : 'stable', // Lower is better for response time
      change: Math.abs(change)
    };
  }, [responseTimeTrendData]);

  return (
    <div className="modern-overview">
      {/* Key KPIs - Organized by Realtime vs Historical */}
      <div className="overview-kpis">
        {/* Realtime Metrics Section */}
        <div className="kpi-section">
          <h3 className="kpi-section-title">Today / Realtime Metrics</h3>
          <div className="kpi-section-cards">
            <div className="kpi-card primary">
              <div className="kpi-label">Realtime Compliance</div>
              <div className="kpi-value">{metrics.complianceOverall || 0}%</div>
              <div className="kpi-subtitle">Current snapshot</div>
            </div>

            <div className="kpi-card primary">
              <div className="kpi-label">10+ Min Wait Rate</div>
              <div className="kpi-value">{currentResponseTimePct}%</div>
              {responseTimeTrendData.length >= 2 && (
                <div className={`kpi-trend ${responseTimeTrend.direction}`}>
                  {responseTimeTrend.direction === 'up' ? '↓' : responseTimeTrend.direction === 'down' ? '↑' : '→'}
                  {responseTimeTrend.change > 0 && ` ${responseTimeTrend.change.toFixed(1)}%`}
                </div>
              )}
              <div className="kpi-subtitle">Most recent day</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-label">Open Chats</div>
              <div className="kpi-value">{metrics.totalOpen}</div>
              <div className="kpi-subtitle">Currently open</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-label">Actionable Snoozed</div>
              <div className="kpi-value">{metrics.actionableSnoozed.length}</div>
              <div className="kpi-subtitle">Requires attention</div>
            </div>
          </div>
        </div>

        {/* Last 7 Days Averages Section */}
        <div className="kpi-section">
          <h3 className="kpi-section-title">Last 7 Days Averages</h3>
          <div className="kpi-section-cards">
            <div className="kpi-card primary">
              <div className="kpi-label">Team Compliance</div>
              <div className="kpi-value">{currentCompliance}%</div>
              {complianceTrendData.length >= 2 && (
                <div className={`kpi-trend ${complianceTrend.direction}`}>
                  {complianceTrend.direction === 'up' ? '↑' : complianceTrend.direction === 'down' ? '↓' : '→'}
                  {complianceTrend.change > 0 && ` ${complianceTrend.change}%`}
                </div>
              )}
              <div className="kpi-subtitle">Last 7 days avg</div>
            </div>

            <div className="kpi-card primary">
              <div className="kpi-label">10+ Min Wait Rate</div>
              <div className="kpi-value">{avgResponseTimePct}%</div>
              <div className="kpi-subtitle">Last 7 days avg</div>
            </div>
          </div>
        </div>
      </div>

      {/* Trend Charts */}
      <div className="overview-charts">
        <div className="trend-card">
          <div className="trend-header">
            <h4>Compliance Trend</h4>
            <span className="trend-period">7 days</span>
          </div>
          {complianceTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={complianceTrendData} margin={{ top: 50, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="complianceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#35a1b4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#35a1b4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="displayLabel" 
                  stroke="#666"
                  tick={{ fill: '#666', fontSize: 11 }}
                />
                <YAxis 
                  stroke="#666"
                  tick={{ fill: '#666', fontSize: 11 }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px'
                  }}
                  formatter={(value) => [`${value}%`, 'Compliance']}
                />
                <Area 
                  type="monotone" 
                  dataKey="compliance" 
                  stroke="#35a1b4" 
                  strokeWidth={2}
                  fill="url(#complianceGradient)"
                  label={createHolidayLabel(complianceTrendData)}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-placeholder">
              <p>No compliance data available</p>
              <span>Snapshots are captured daily at 10pm ET</span>
            </div>
          )}
        </div>

        <div className="trend-card">
          <div className="trend-header">
            <h4>Response Time Trend</h4>
            <span className="trend-period">7 days</span>
          </div>
          {responseTimeTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={responseTimeTrendData} margin={{ top: 50, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="responseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fd8789" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#fd8789" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="displayLabel" 
                  stroke="#666"
                  tick={{ fill: '#666', fontSize: 11 }}
                />
                <YAxis 
                  stroke="#666"
                  tick={{ fill: '#666', fontSize: 11 }}
                  domain={[0, 'auto']}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px'
                  }}
                  formatter={(value) => [`${value.toFixed(1)}%`, '10+ Min Wait']}
                />
                <Area 
                  type="monotone" 
                  dataKey="percentage" 
                  stroke="#fd8789" 
                  strokeWidth={2}
                  fill="url(#responseGradient)"
                  label={createHolidayLabel(responseTimeTrendData)}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-placeholder">
              <p>No response time data available</p>
              <span>Metrics are captured daily at midnight UTC</span>
            </div>
          )}
        </div>
      </div>

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
    state: 250,
    medianReply: 150,
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
    } else if (sortColumn === 'assigned') {
      const aAssignee = a.admin_assignee?.name || 
                       (typeof a.admin_assignee === "string" ? a.admin_assignee : null) ||
                       "Unassigned";
      const bAssignee = b.admin_assignee?.name || 
                       (typeof b.admin_assignee === "string" ? b.admin_assignee : null) ||
                       "Unassigned";
      aVal = aAssignee.toLowerCase();
      bVal = bAssignee.toLowerCase();
    } else if (sortColumn === 'state') {
      aVal = (a.state || "open").toLowerCase();
      bVal = (b.state || "open").toLowerCase();
    } else if (sortColumn === 'medianReply') {
      aVal = a.medianReplySeconds !== null && a.medianReplySeconds !== undefined ? a.medianReplySeconds : -1;
      bVal = b.medianReplySeconds !== null && b.medianReplySeconds !== undefined ? b.medianReplySeconds : -1;
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
              Created At (UTC)
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
              Last Updated (UTC)
              {sortColumn === 'updated' && (
                <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
              )}
              <div 
                className="column-resizer"
                onMouseDown={(e) => handleMouseDown(e, 'updated')}
              />
            </th>
            <th 
              style={{ width: columnWidths.assigned, position: 'relative', minWidth: '50px', cursor: 'pointer' }}
              onClick={() => handleSort('assigned')}
              className="sortable-header"
            >
              Assigned To
              {sortColumn === 'assigned' && (
                <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
              )}
              <div 
                className="column-resizer"
                onMouseDown={(e) => handleMouseDown(e, 'assigned')}
              />
            </th>
            <th 
              style={{ width: columnWidths.state, position: 'relative', minWidth: '50px', cursor: 'pointer' }}
              onClick={() => handleSort('state')}
              className="sortable-header"
            >
              State
              {sortColumn === 'state' && (
                <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
              )}
              <div 
                className="column-resizer"
                onMouseDown={(e) => handleMouseDown(e, 'state')}
              />
            </th>
            <th 
              style={{ width: columnWidths.medianReply, position: 'relative', minWidth: '50px', cursor: 'pointer' }}
              onClick={() => handleSort('medianReply')}
              className="sortable-header"
            >
              Median Time to Reply (s)
              {sortColumn === 'medianReply' && (
                <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
              )}
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
            const createdDateUTC = createdDate ? createdDate.toLocaleString('en-US', { 
              timeZone: 'UTC', 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit', 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit',
              hour12: false 
            }) + ' UTC' : null;
            
            const updated = conv.updated_at || conv.last_contacted_at;
            const updatedDate = updated ? new Date(typeof updated === "number" ? updated * 1000 : updated) : null;
            const updatedDateUTC = updatedDate ? updatedDate.toLocaleString('en-US', { 
              timeZone: 'UTC', 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit', 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit',
              hour12: false 
            }) + ' UTC' : null;
            
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
                  {createdDateUTC || "-"}
                </td>
                <td className="date-cell" style={{ width: columnWidths.updated }}>
                  {updatedDateUTC || "-"}
                </td>
                <td style={{ width: columnWidths.assigned }}>{assigneeName}</td>
                <td style={{ width: columnWidths.state }}>
                  {conv.state === 'snoozed' && conv.snoozedUntilDate ? (
                    <span style={{ 
                      textTransform: 'capitalize',
                      fontWeight: 600,
                      color: '#ff9a74'
                    }}>
                      Snoozed Until {conv.snoozedUntilDate.toLocaleString()}
                    </span>
                  ) : (
                    <span style={{ 
                      textTransform: 'capitalize',
                      fontWeight: 400,
                      color: '#292929'
                    }}>
                      {conv.state || "open"}
                    </span>
                  )}
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

