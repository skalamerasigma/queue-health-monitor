import React, { useMemo, useState, useEffect, useRef } from "react";
import HistoricalView from "./HistoricalView";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend, ScatterChart, Scatter, BarChart, Bar, Cell } from 'recharts';
import "./Dashboard.css";

// TSE Region mapping
const TSE_REGIONS = {
  'UK': ['Salman Filli', 'Erin Liu', 'Kabilan Thayaparan', 'J', 'Nathan Simpson', 'Somachi Ngoka'],
  'NY': ['Lyle Pierson Stachecki', 'Nick Clancey', 'Swapnil Deshpande', 'Ankita Dalvi', 'Grace Sanford', 'Erez Yagil', 'Julia Lusala', 'Betty Liu', 'Xyla Fang', 'Rashi Madnani', 'Nikhil Krishnappa', 'Ryan Jaipersaud', 'Krish Pawooskar', 'Siddhi Jadhav', 'Arley Schenker', 'Stephen Skalamera', 'David Zingher'],
  'SF': ['Sanyam Khurana', 'Hem Kamdar', 'Sagarika Sardesai', 'Nikita Bangale', 'Payton Steiner', 'Bhavana Prasad Kote', 'Grania M', 'Soheli Das', 'Hayden Greif-Neill', 'Roshini Padmanabha', 'Abhijeet Lal', 'Ratna Shivakumar', 'Sahibeer Singh', 'Vruddhi Kapre', 'Priyanshi Singh']
};

// Region icons (SVG URLs)
const REGION_ICONS = {
  'UK': 'https://res.cloudinary.com/doznvxtja/image/upload/v1768284230/3_150_x_150_px_4_kxkr26.svg',
  'NY': 'https://res.cloudinary.com/doznvxtja/image/upload/v1768284817/3_150_x_150_px_7_i1jnre.svg',
  'SF': 'https://res.cloudinary.com/doznvxtja/image/upload/v1768286199/3_150_x_150_px_8_ae1dl7.svg',
  'Other': null
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
  'Siddhi': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765232392/6_f3d2qt.svg',
  'Swapnil': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765232390/11_xrb9qj.svg',
  'Stephen': 'https://res.cloudinary.com/doznvxtja/image/upload/v1767811907/Untitled_design_15_cvscw6.svg',
  // San Francisco
  'Priyanshi': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765232390/12_avm2xl.svg',
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
  'Vruddhi': 'https://res.cloudinary.com/doznvxtja/image/upload/v1768229860/Untitled_design_26_sfcjzp.svg',
  'David': 'https://res.cloudinary.com/doznvxtja/image/upload/v1768229654/Untitled_design_24_yq1bfi.svg',
  // London/UK
  'Nathan': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765232389/13_flxpry.svg',
  'J': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765232387/18_yqqjho.svg',
  'Kabilan': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765232387/16_hgphrw.svg',
  'Salman': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765232386/20_ukjqlc.svg',
  'Erin': 'https://res.cloudinary.com/doznvxtja/image/upload/v1765232386/19_q54uo5.svg',
  'Somachi': 'https://res.cloudinary.com/doznvxtja/image/upload/v1767886159/Untitled_design_17_zhhc3u.svg'
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
        y={y - 60}
        width="30"
        height="30"
      />
    </g>
  );
};

// TSEs to exclude from the dashboard
const EXCLUDED_TSE_NAMES = [
  "Zen Junior",
  "Nathan Parrish",
  "Prerit Sachdeva",
  "Stephen Skalamera",
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
  MAX_WAITING_ON_TSE_SOFT: 5,
  MAX_WAITING_ON_TSE_ALERT: 7
};

function Dashboard({ conversations, teamMembers = [], loading, error, onRefresh, lastUpdated }) {
  const [activeView, setActiveView] = useState("overview");
  const [filterTag, setFilterTag] = useState("all");
  const [filterTSE, setFilterTSE] = useState("all");
  const [searchId, setSearchId] = useState("");
  const [historicalSnapshots, setHistoricalSnapshots] = useState([]);
  const [responseTimeMetrics, setResponseTimeMetrics] = useState([]);
  const [loadingHistorical, setLoadingHistorical] = useState(false);
  const [selectedTSE, setSelectedTSE] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [streaksRegionFilter, setStreaksRegionFilter] = useState('all');
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [alertsDropdownOpen, setAlertsDropdownOpen] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [wasLoading, setWasLoading] = useState(false);
  const [selectedColors, setSelectedColors] = useState(new Set(['exceeding', 'success', 'error'])); // All selected by default
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
        "Zen Junior", "Nathan Parrish", "Leticia Esparza",
        "Rob Woollen", "Brett Bedevian", "Viswa Jeyaraman", "Brandon Yee",
        "Holly Coxon", "Chetana Shinde", "Matt Morgenroth", "Grace Sanford",
        "Prerit Sachdeva", "Stephen Skalamera", "svc-prd-tse-intercom SVC"
      ];

      const byTSE = {};
      teamMembers.forEach(admin => {
        const tseId = admin.id;
        if (tseId && !EXCLUDED_TSE_NAMES.includes(admin.name)) {
          byTSE[tseId] = {
            id: tseId,
            name: admin.name || admin.email?.split("@")[0] || `TSE ${tseId}`,
            open: 0,
            waitingOnTSE: 0,
            waitingOnCustomer: 0,
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
        const hasWaitingOnTSETag = tags.some(t => 
          (t.name && t.name.toLowerCase() === "snooze.waiting-on-tse") || 
          (typeof t === "string" && t.toLowerCase() === "snooze.waiting-on-tse")
        );
        const hasWaitingOnCustomerTag = tags.some(t => 
          (t.name && (t.name.toLowerCase() === "snooze.waiting-on-customer-resolved" || t.name.toLowerCase() === "snooze.waiting-on-customer-unresolved")) || 
          (typeof t === "string" && (t.toLowerCase() === "snooze.waiting-on-customer-resolved" || t.toLowerCase() === "snooze.waiting-on-customer-unresolved"))
        );

        if (isSnoozed) {
          byTSE[tseId].totalSnoozed = (byTSE[tseId].totalSnoozed || 0) + 1;
          if (hasWaitingOnTSETag) {
            byTSE[tseId].waitingOnTSE++;
          } else if (hasWaitingOnCustomerTag) {
            byTSE[tseId].waitingOnCustomer++;
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
          waitingOnTSE: tse.waitingOnTSE,
          waitingOnCustomer: tse.waitingOnCustomer,
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
    
    // DEBUG: Log all team members received from API
    console.log('=== TSE DEBUG START ===');
    console.log(`Total team members received: ${teamMembers.length}`);
    console.log('All team members:', teamMembers.map(m => ({ id: m.id, name: m.name, email: m.email })));
    
    // Check specifically for Stephen Skalamera
    const stephenInTeam = teamMembers.find(m => m.name?.toLowerCase().includes('stephen'));
    console.log('Stephen in team members?', stephenInTeam ? stephenInTeam : 'NOT FOUND');
    
    // Add all team members to the map (even if they have 0 conversations)
    teamMembers.forEach(admin => {
      const tseId = admin.id;
      const isExcluded = EXCLUDED_TSE_NAMES.includes(admin.name);
      console.log(`Processing: ${admin.name} (ID: ${tseId}) - Excluded: ${isExcluded}`);
      
      if (tseId && !isExcluded) {
        allTSEsMap[tseId] = {
          id: tseId,
          name: admin.name || admin.email?.split("@")[0] || `TSE ${tseId}`,
          open: 0,
          totalSnoozed: 0,
          waitingOnTSE: 0,
          waitingOnCustomer: 0,
          awayModeEnabled: admin.away_mode_enabled || false
        };
      }
    });
    
    console.log(`TSEs after filtering: ${Object.keys(allTSEsMap).length}`);
    console.log('Filtered TSEs:', Object.values(allTSEsMap).map(t => ({ name: t.name, away: t.awayModeEnabled })));
    console.log('=== TSE DEBUG END ===');
    
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
        waitingOnTSE: [],
        waitingOnCustomer: [],
        alerts: []
      };
    }

    const byTSE = { ...allTSEsMap }; // Start with all team members
    const waitingOnTSEConvs = [];
    const waitingOnCustomerConvs = [];
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
        
        // Look up away status from teamMembers if available
        const teamMember = teamMembers.find(m => String(m.id) === String(tseId));
        byTSE[tseId] = {
          id: tseId,
          name: tseName,
          open: 0,
          totalSnoozed: 0,
          waitingOnTSE: 0,
          waitingOnCustomer: 0,
          awayModeEnabled: teamMember?.away_mode_enabled || false
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
      
      // New tag detection: snooze.waiting-on-tse
      const hasWaitingOnTSETag = tags.some(t => 
        (t.name && t.name.toLowerCase() === "snooze.waiting-on-tse") || 
        (typeof t === "string" && t.toLowerCase() === "snooze.waiting-on-tse")
      );
      // New tag detection: snooze.waiting-on-customer-resolved OR snooze.waiting-on-customer-unresolved
      const hasWaitingOnCustomerTag = tags.some(t => 
        (t.name && (t.name.toLowerCase() === "snooze.waiting-on-customer-resolved" || t.name.toLowerCase() === "snooze.waiting-on-customer-unresolved")) || 
        (typeof t === "string" && (t.toLowerCase() === "snooze.waiting-on-customer-resolved" || t.toLowerCase() === "snooze.waiting-on-customer-unresolved"))
      );

      // Count all snoozed conversations
      if (isSnoozed) {
        byTSE[tseId].totalSnoozed++;
      }

      if (conv.state === "open" && !isSnoozed) {
        byTSE[tseId].open++;
      }

      if (isSnoozed) {
        if (hasWaitingOnTSETag) {
          byTSE[tseId].waitingOnTSE++;
          waitingOnTSEConvs.push(conv);
        } else if (hasWaitingOnCustomerTag) {
          byTSE[tseId].waitingOnCustomer++;
          waitingOnCustomerConvs.push(conv);
        }
        // Note: Snoozed conversations without specific tags are only counted in totalSnoozed
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
      const totalWaitingOnTSE = tse.waitingOnTSE;
      
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
      
      if (totalWaitingOnTSE >= THRESHOLDS.MAX_WAITING_ON_TSE_ALERT) {
        alerts.push({
          type: "waiting_on_tse_threshold",
          severity: "high",
          tseId: tse.id,
          tseName: tse.name,
          message: `${tse.name}: ${totalWaitingOnTSE} waiting on TSE (threshold: ${THRESHOLDS.MAX_WAITING_ON_TSE_ALERT}+)`,
          count: totalWaitingOnTSE
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
      const meetsWaitingOnTSE = tse.waitingOnTSE <= THRESHOLDS.MAX_WAITING_ON_TSE_SOFT;
      
      if (meetsOpen && meetsWaitingOnTSE) {
        compliantBoth++;
      }
      
      // Count independently - these are not mutually exclusive
      if (meetsOpen) {
        compliantOpen++;
      }
      if (meetsWaitingOnTSE) {
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
      waitingOnTSE: Array.isArray(waitingOnTSEConvs) ? waitingOnTSEConvs : [],
      waitingOnCustomer: Array.isArray(waitingOnCustomerConvs) ? waitingOnCustomerConvs : [],
      alerts: Array.isArray(filteredAlerts) ? filteredAlerts : [],
      complianceOverall,
      complianceOpenOnly: complianceOpenOnlyPct,
      complianceSnoozedOnly: complianceSnoozedOnlyPct
    };
    }, [conversations, teamMembers]);

  // Calculate performance streaks for each TSE
  const performanceStreaks = useMemo(() => {
    if (!historicalSnapshots || historicalSnapshots.length === 0) {
      return { streak3: [] };
    }

    const EXCLUDED_TSE_NAMES = ["Prerit Sachdeva", "Stephen Skalamera"];
    
    // Sort snapshots by date (oldest first)
    const sortedSnapshots = [...historicalSnapshots]
      .map(snapshot => ({
        ...snapshot,
        tseData: snapshot.tse_data || snapshot.tseData || []
      }))
      .filter(snapshot => snapshot.tseData.length > 0)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (sortedSnapshots.length === 0) {
      return { streak3: [] };
    }

    // Track performance status for each TSE by date
    const tsePerformanceByDate = {};
    
    sortedSnapshots.forEach(snapshot => {
      snapshot.tseData.forEach(tse => {
        if (EXCLUDED_TSE_NAMES.includes(tse.name)) return;
        
        const tseId = String(tse.id);
        if (!tsePerformanceByDate[tseId]) {
          tsePerformanceByDate[tseId] = {
            id: tseId,
            name: tse.name,
            dates: []
          };
        }
        
        const totalOpen = (tse.open || 0);
        const totalWaitingOnTSE = tse.waitingOnTSE || tse.actionableSnoozed || 0;
        // Outstanding Performance: 0 open AND 0 waiting on TSE
        const isOutstanding = totalOpen === 0 && totalWaitingOnTSE === 0;
        
        tsePerformanceByDate[tseId].dates.push({
          date: snapshot.date,
          compliant: isOutstanding
        });
      });
    });

    // Calculate current streak and total outstanding days for each TSE
    const streaks = Object.values(tsePerformanceByDate).map(tse => {
      const dates = [...tse.dates].sort((a, b) => b.date.localeCompare(a.date)); // Most recent first
      
      let currentStreak = 0;
      let totalOutstandingDays = 0;
      
      // Calculate current streak (working backwards from most recent date)
      for (const dateEntry of dates) {
        if (dateEntry.compliant) {
          currentStreak++;
        } else {
          break; // Streak broken
        }
      }
      
      // Calculate total outstanding days in history
      totalOutstandingDays = tse.dates.filter(d => d.compliant).length;
      
      return {
        id: tse.id,
        name: tse.name,
        streak: currentStreak,
        totalOutstandingDays: totalOutstandingDays
      };
    });

    // Group by streak thresholds - only show 3+ days
    const streak3 = streaks.filter(s => s.streak >= 3);

    // Sort by streak length (highest first), then by total outstanding days (higher is better)
    const sortStreaks = (arr) => arr.sort((a, b) => {
      if (b.streak !== a.streak) return b.streak - a.streak;
      if (b.totalOutstandingDays !== a.totalOutstandingDays) return b.totalOutstandingDays - a.totalOutstandingDays;
      return 0; // Leave remaining ties as-is
    });

    return {
      streak3: sortStreaks(streak3)
    };
  }, [historicalSnapshots]);

  // Filter streaks by region
  const filteredPerformanceStreaks = useMemo(() => {
    if (streaksRegionFilter === 'all') {
      return performanceStreaks;
    }

    const filterByRegion = (streaks) => {
      return streaks.filter(tse => {
        const region = getTSERegion(tse.name);
        return region === streaksRegionFilter;
      });
    };

    return {
      streak3: filterByRegion(performanceStreaks.streak3)
    };
  }, [performanceStreaks, streaksRegionFilter]);

  // Helper function to get medal for a streak tier based on unique streak values
  const getMedalForStreak = (streaks, currentStreak) => {
    if (!streaks || streaks.length === 0) return null;
    
    // Get unique streak values, sorted descending
    const uniqueStreaks = [...new Set(streaks.map(s => s.streak))].sort((a, b) => b - a);
    
    // If all TSEs have the same streak, don't show any medals
    if (uniqueStreaks.length === 1) return null;
    
    // Find the rank of the current streak
    const rank = uniqueStreaks.indexOf(currentStreak);
    
    if (rank === 0) return '🥇'; // Highest streak
    if (rank === 1) return '🥈'; // Second highest
    if (rank === 2) return '🥉'; // Third highest
    return null; // No medal for 4th place and below
  };

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
      if (filterTag === "waitingontse") return metrics.waitingOnTSE || [];
      if (filterTag === "waitingoncustomer") return metrics.waitingOnCustomer || [];
      if (filterTag === "waitingoncustomer-resolved") {
        return conversations.filter(conv => {
          const isSnoozed = conv.state === "snoozed" || conv.snoozed_until;
          if (!isSnoozed) return false;
          const tags = conv.tags || [];
          return tags.some(t => 
            (t.name && t.name.toLowerCase() === "snooze.waiting-on-customer-resolved") || 
            (typeof t === "string" && t.toLowerCase() === "snooze.waiting-on-customer-resolved")
          );
        });
      }
      if (filterTag === "waitingoncustomer-unresolved") {
        return conversations.filter(conv => {
          const isSnoozed = conv.state === "snoozed" || conv.snoozed_until;
          if (!isSnoozed) return false;
          const tags = conv.tags || [];
          return tags.some(t => 
            (t.name && t.name.toLowerCase() === "snooze.waiting-on-customer-unresolved") || 
            (typeof t === "string" && t.toLowerCase() === "snooze.waiting-on-customer-unresolved")
          );
        });
      }
      return conversations;
    };
    
    let tagFiltered = filterByTag();
    
    // Filter out conversations assigned to excluded TSEs
    tagFiltered = tagFiltered.filter(conv => {
      const assigneeName = conv.admin_assignee?.name || 
                          (typeof conv.admin_assignee === "string" ? conv.admin_assignee : null);
      return !assigneeName || !EXCLUDED_TSE_NAMES.includes(assigneeName);
    });
    
    // Filter by TSE if selected (apply regardless of filterTag)
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

  // Get conversations for a specific TSE by category
  const getTSEConversations = (tseId) => {
    if (!conversations || !tseId) return { open: [], waitingOnTSE: [], waitingOnCustomer: [], totalSnoozed: [] };
    
    const open = [];
    const waitingOnTSE = [];
    const waitingOnCustomer = [];
    const totalSnoozed = [];
    
    conversations.forEach((conv) => {
      const convTseId = conv.admin_assignee_id || 
                        (conv.admin_assignee && typeof conv.admin_assignee === "object" ? conv.admin_assignee.id : null);
      
      if (String(convTseId) !== String(tseId)) return;
      
      const assigneeName = conv.admin_assignee?.name || 
                          (typeof conv.admin_assignee === "string" ? conv.admin_assignee : null);
      if (assigneeName && EXCLUDED_TSE_NAMES.includes(assigneeName)) return;
      
      const isSnoozed = conv.state === "snoozed" || 
                       conv.state === "Snoozed" ||
                       conv.snoozed_until || 
                       (conv.statistics && conv.statistics.state === "snoozed");
      const tags = conv.tags || [];
      const hasWaitingOnTSETag = tags.some(t => 
        (t.name && t.name.toLowerCase() === "snooze.waiting-on-tse") || 
        (typeof t === "string" && t.toLowerCase() === "snooze.waiting-on-tse")
      );
      const hasWaitingOnCustomerTag = tags.some(t => 
        (t.name && (t.name.toLowerCase() === "snooze.waiting-on-customer-resolved" || t.name.toLowerCase() === "snooze.waiting-on-customer-unresolved")) || 
        (typeof t === "string" && (t.toLowerCase() === "snooze.waiting-on-customer-resolved" || t.toLowerCase() === "snooze.waiting-on-customer-unresolved"))
      );
      
      if (conv.state === "open" && !isSnoozed) {
        open.push(conv);
      } else if (isSnoozed) {
        totalSnoozed.push(conv);
        if (hasWaitingOnTSETag) {
          waitingOnTSE.push(conv);
        } else if (hasWaitingOnCustomerTag) {
          waitingOnCustomer.push(conv);
        }
      }
    });
    
    return { open, waitingOnTSE, waitingOnCustomer, totalSnoozed };
  };

  // Handle TSE card click
  const handleTSECardClick = (tse) => {
    setSelectedTSE(tse);
    setIsModalOpen(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTSE(null);
  };

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
          <button
            className="help-icon-button"
            onClick={() => setIsHelpModalOpen(true)}
            aria-label="Help"
            title="Help"
          >
            <img 
              src="https://res.cloudinary.com/doznvxtja/image/upload/v1767909444/Untitled_design_19_wav3tj.svg" 
              alt="Help" 
              className="help-icon"
            />
          </button>
          <AlertsDropdown 
            alerts={metrics.alerts || []}
            isOpen={alertsDropdownOpen}
            onToggle={() => setAlertsDropdownOpen(!alertsDropdownOpen)}
            onClose={() => setAlertsDropdownOpen(false)}
            onTSEClick={(tseId, tseName) => {
              // Find TSE object from metrics
              const tse = (metrics.byTSE || []).find(t => 
                String(t.id) === String(tseId) || t.name === tseName
              );
              if (tse) {
                handleTSECardClick(tse);
                setAlertsDropdownOpen(false); // Close dropdown when opening modal
              }
            }}
            onViewAll={() => {
              setActiveView("tse");
              setSelectedColors(new Set(['error'])); // Over Limit - Needs Attention only
              setSelectedRegions(new Set(['UK', 'NY', 'SF', 'Other'])); // All regions
              setAlertsDropdownOpen(false); // Close dropdown
            }}
            onViewChats={(tseId, alertType) => {
              setActiveView("conversations");
              if (alertType === "open") {
                setFilterTag("open");
              } else if (alertType === "snoozed") {
                setFilterTag("waitingontse");
              }
              setFilterTSE(String(tseId));
              setAlertsDropdownOpen(false); // Close dropdown
            }}
          />
          <div className="view-tabs">
            <button 
              type="button"
              className={activeView === "overview" ? "active" : ""}
              onClick={() => setActiveView("overview")}
            >
              Overview
            </button>
            <button 
              type="button"
              className={activeView === "tse" ? "active" : ""}
              onClick={() => setActiveView("tse")}
            >
              TSE View
            </button>
            <button 
              type="button"
              className={activeView === "conversations" ? "active" : ""}
              onClick={() => setActiveView("conversations")}
            >
              Conversations
            </button>
            <button 
              type="button"
              className={activeView === "historical" ? "active" : ""}
              onClick={() => setActiveView("historical")}
            >
              Analytics
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
            <label>FILTER BY SNOOZE TYPE</label>
            <select value={filterTag} onChange={(e) => {
              const newFilterTag = e.target.value;
              setFilterTag(newFilterTag);
              // Clear search when changing filter tag
              setSearchId("");
            }} className="filter-select">
              <option value="all">All Conversations</option>
              <option value="snoozed">All Snoozed</option>
              <option value="waitingontse">Snoozed - Waiting On TSE</option>
              <option value="waitingoncustomer">Snoozed - Waiting On Customer</option>
              <option value="waitingoncustomer-resolved">  └ Resolved</option>
              <option value="waitingoncustomer-unresolved">  └ Unresolved</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Filter by TSE:</label>
            <select value={filterTSE} onChange={(e) => {
              setFilterTSE(e.target.value);
              // Clear search when changing TSE filter
              setSearchId("");
            }} className="filter-select">
              <option value="all">All TSEs</option>
              <option value="unassigned">Unassigned</option>
              {['UK', 'NY', 'SF', 'Other'].map(region => {
                const regionTSEs = tseByRegion[region] || [];
                if (regionTSEs.length === 0) return null;
                
                const regionLabels = {
                  'UK': 'UK',
                  'NY': 'New York',
                  'SF': 'San Francisco',
                  'Other': 'Other'
                };
                const regionIconUrls = {
                  'UK': REGION_ICONS['UK'],
                  'NY': REGION_ICONS['NY'],
                  'SF': REGION_ICONS['SF'],
                  'Other': null
                };
                
                return (
                  <optgroup key={region} label={regionLabels[region]}>
                    {regionTSEs.map(tse => (
                      <option key={tse.id} value={tse.id}>{tse.name}</option>
                    ))}
                  </optgroup>
                );
              })}
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
          onNavigateToConversations={(filterTag) => {
            setActiveView("conversations");
            setFilterTag(filterTag);
          }}
          onNavigateToTSEView={() => {
            setActiveView("tse");
            setSelectedColors(new Set(['error'])); // Non-Compliant only
            setSelectedRegions(new Set(['UK', 'NY', 'SF', 'Other'])); // All regions
          }}
          onTSEClick={handleTSECardClick}
        />
      )}

      {/* TSE-Level Breakdown - Show only in TSE view */}
      {activeView === "tse" && (
        <div className="tse-section">
          {/* Performance Streaks Section */}
          {performanceStreaks.streak3.length > 0 && (
            <div className="performance-streaks-section">
              <div className="streaks-header">
                <h2 className="streaks-title">🔥 Outstanding Performance Streaks</h2>
                
                {/* Region Filter Buttons */}
                <div className="streaks-region-filters">
                  <button
                    type="button"
                    className={`streaks-filter-btn ${streaksRegionFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setStreaksRegionFilter('all')}
                  >
                    All Regions
                  </button>
                  <button
                    type="button"
                    className={`streaks-filter-btn ${streaksRegionFilter === 'UK' ? 'active' : ''}`}
                    onClick={() => setStreaksRegionFilter('UK')}
                  >
                    <img src={REGION_ICONS['UK']} alt="UK" className="streaks-region-icon" />
                    UK
                  </button>
                  <button
                    type="button"
                    className={`streaks-filter-btn ${streaksRegionFilter === 'NY' ? 'active' : ''}`}
                    onClick={() => setStreaksRegionFilter('NY')}
                  >
                    <img src={REGION_ICONS['NY']} alt="NY" className="streaks-region-icon" />
                    NY
                  </button>
                  <button
                    type="button"
                    className={`streaks-filter-btn ${streaksRegionFilter === 'SF' ? 'active' : ''}`}
                    onClick={() => setStreaksRegionFilter('SF')}
                  >
                    <img src={REGION_ICONS['SF']} alt="SF" className="streaks-region-icon" />
                    SF
                  </button>
                </div>
              </div>
              
              <div className="streaks-container">
                {/* 3+ Day Streaks */}
                {filteredPerformanceStreaks.streak3.length > 0 && (
                  <div className="streak-tier streak-tier-bronze">
                    <div className="streak-tier-header">
                      <span className="streak-tier-icon">💪</span>
                      <div className="streak-tier-info">
                        <h3 className="streak-tier-title">Building Momentum</h3>
                        <p className="streak-tier-subtitle">⭐ 3+ Consecutive Outstanding Days</p>
                      </div>
                    </div>
                    <div className="streak-avatars">
                      {filteredPerformanceStreaks.streak3.map((streakTSE) => {
                        const avatarUrl = getTSEAvatar(streakTSE.name);
                        // Find the full TSE object from metrics
                        const fullTSE = (metrics.byTSE || []).find(t => 
                          String(t.id) === String(streakTSE.id) || t.name === streakTSE.name
                        ) || streakTSE; // Fallback to streakTSE if not found in metrics
                        
                        return (
                          <div 
                            key={streakTSE.id} 
                            className="streak-avatar-item streak-avatar-clickable" 
                            title={`${streakTSE.name} - ${streakTSE.streak} days`}
                            onClick={() => handleTSECardClick(fullTSE)}
                          >
                            {avatarUrl ? (
                              <img 
                                src={avatarUrl} 
                                alt={streakTSE.name}
                                className="streak-avatar streak-avatar-bronze"
                              />
                            ) : (
                              <div className="streak-avatar streak-avatar-bronze streak-avatar-placeholder">
                                {streakTSE.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                            )}
                            <div className="streak-badge streak-badge-bronze">{streakTSE.streak}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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
                    onClick={() => setSelectedColors(new Set(['exceeding', 'success', 'error']))}
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
                  className={`legend-item legend-clickable ${selectedColors.has('exceeding') ? 'legend-selected' : ''}`}
                  onClick={() => {
                    const newColors = new Set(selectedColors);
                    if (newColors.has('exceeding')) {
                      newColors.delete('exceeding');
                    } else {
                      newColors.add('exceeding');
                    }
                    setSelectedColors(newColors);
                  }}
                >
                  <div className="legend-color legend-exceeding">
                    {selectedColors.has('exceeding') && <span className="legend-checkmark">✓</span>}
                  </div>
                  <span className="legend-label">Outstanding (0 open, 0 waiting on TSE)</span>
                </div>
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
                  <span className="legend-label">On Track (≤{THRESHOLDS.MAX_OPEN_SOFT} open, ≤{THRESHOLDS.MAX_WAITING_ON_TSE_SOFT} waiting on TSE)</span>
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
                  <span className="legend-label">Over Limit - Needs Attention</span>
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
                    'UK': { text: 'UK' },
                    'NY': { text: 'New York' },
                    'SF': { text: 'San Francisco' },
                    'Other': { text: 'Other' }
                  };
                  const label = regionLabels[region];
                  const iconUrl = REGION_ICONS[region];
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
                      {iconUrl && (
                        <img 
                          src={iconUrl} 
                          alt={region} 
                          className="region-filter-icon"
                        />
                      )}
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
              'UK': 'UK',
              'NY': 'New York',
              'SF': 'San Francisco',
              'Other': 'Other'
            };

            // Helper function to get status for a TSE
            const getTSEStatus = (tse) => {
              const totalOpen = tse.open;
              const totalWaitingOnTSE = tse.waitingOnTSE || 0;
              // Outstanding: 0 open and 0 waiting on TSE
              if (totalOpen === 0 && totalWaitingOnTSE === 0) {
                return "exceeding";
              }
              // On Track: ≤5 open AND ≤5 waiting on TSE
              if (totalOpen <= THRESHOLDS.MAX_OPEN_SOFT && totalWaitingOnTSE <= THRESHOLDS.MAX_WAITING_ON_TSE_SOFT) {
                return "success";
              }
              // Over Limit - Needs Attention: either >5 open OR >5 waiting on TSE
              return "error";
            };

            // Filter TSEs by selected colors, then sort by status
            const filteredAndSortedTSEs = [...tses]
              .filter(tse => selectedColors.has(getTSEStatus(tse)))
              .sort((a, b) => {
                const statusOrder = { "exceeding": 0, "success": 1, "error": 2 };
                return statusOrder[getTSEStatus(a)] - statusOrder[getTSEStatus(b)];
              });

            // Don't render region group if no TSEs match the filter
            if (filteredAndSortedTSEs.length === 0) return null;

            const regionText = regionLabels[region];
            const iconUrl = REGION_ICONS[region];

            return (
              <div key={region} className="tse-region-group">
                <h4 className="tse-region-title">
                  <span className="region-title-text">{regionText}</span>
                  {iconUrl && (
                    <img 
                      src={iconUrl} 
                      alt={region} 
                      className="region-title-icon"
                    />
                  )}
                </h4>
                <div className="tse-grid">
                  {filteredAndSortedTSEs.map((tse) => {
                    const totalOpen = tse.open;
                    const totalWaitingOnTSE = tse.waitingOnTSE || 0;
                    const totalWaitingOnCustomer = tse.waitingOnCustomer || 0;
                    const totalSnoozed = tse.totalSnoozed || 0;
                    const status = getTSEStatus(tse);

                    const avatarUrl = getTSEAvatar(tse.name);

                    return (
                      <div 
                        key={tse.id} 
                        className={`tse-card tse-${status} tse-card-clickable`}
                        onClick={() => handleTSECardClick(tse)}
                      >
                        <div className={`tse-card-click-icon status-${status}`}>→</div>
                        <div className="tse-header">
                          <div className="tse-header-left">
                            <div className="tse-avatar-container">
                              {avatarUrl && (
                                <img 
                                  src={avatarUrl} 
                                  alt={tse.name}
                                  className="tse-avatar"
                                />
                              )}
                              {tse.awayModeEnabled ? (
                                <span className="avatar-away-indicator" title="Away mode enabled">
                                  🌙
                                </span>
                              ) : (
                                <span className="avatar-available-indicator" title="Available">
                                </span>
                              )}
                            </div>
                            <h4>
                              {tse.name}
                              {status === "exceeding" && (
                                <span 
                                  className="tse-status-icon tse-exceeding-star"
                                  title={`Outstanding - ${tse.open || 0} open, ${tse.waitingOnTSE || 0} waiting on TSE`}
                                >
                                  ⭐
                                </span>
                              )}
                              {status === "success" && (
                                <span 
                                  className="tse-status-icon tse-success-checkmark"
                                  title={`On Track - ${tse.open || 0} open, ${tse.waitingOnTSE || 0} waiting on TSE (target: ≤${THRESHOLDS.MAX_OPEN_SOFT} open, ≤${THRESHOLDS.MAX_WAITING_ON_TSE_SOFT} waiting)`}
                                >
                                  ✓
                                </span>
                              )}
                              {status === "error" && (
                                <span 
                                  className="tse-status-icon tse-error-x"
                                  title={`Over Limit - Needs Attention - ${tse.open || 0} open, ${tse.waitingOnTSE || 0} waiting on TSE (target: ≤${THRESHOLDS.MAX_OPEN_SOFT} open, ≤${THRESHOLDS.MAX_WAITING_ON_TSE_SOFT} waiting)`}
                                >
                                  ✗
                                </span>
                              )}
                            </h4>
                          </div>
                        </div>
                        <div className="tse-metrics">
                          <div className="tse-metric">
                            <span className="metric-label">Open:</span>
                            <span className={`metric-value ${totalOpen > THRESHOLDS.MAX_OPEN_SOFT ? "metric-error" : ""}`}>
                              {totalOpen}
                            </span>
                          </div>
                          <div className="tse-metric">
                            <span className="metric-label">Waiting On TSE:</span>
                            <span className={`metric-value ${totalWaitingOnTSE > THRESHOLDS.MAX_WAITING_ON_TSE_SOFT ? "metric-error" : ""}`}>
                              {totalWaitingOnTSE}
                            </span>
                          </div>
                          <div className="tse-metric">
                            <span className="metric-label">Waiting On Customer:</span>
                            <span className="metric-value">{totalWaitingOnCustomer}</span>
                          </div>
                          <div className="tse-metric">
                            <span className="metric-label">Total Snoozed:</span>
                            <span className="metric-value">{totalSnoozed}</span>
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
            {filterTag === "all" && filterTSE !== "unassigned" && "All Open & Snoozed Conversations"}
            {filterTag === "snoozed" && "Total Snoozed Conversations"}
            {filterTag === "waitingontse" && "Snoozed - Waiting On TSE"}
            {filterTag === "waitingoncustomer" && "Snoozed - Waiting On Customer"}
            {filterTag === "waitingoncustomer-resolved" && "Waiting On Customer - Resolved"}
            {filterTag === "waitingoncustomer-unresolved" && "Waiting On Customer - Unresolved"}
            <span className="count-badge">({filteredConversations.length})</span>
          </h3>
          <ConversationTable 
            conversations={filteredConversations} 
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


      {/* TSE Details Modal */}
      {isModalOpen && selectedTSE && (
        <TSEDetailsModal
          tse={selectedTSE}
          conversations={getTSEConversations(selectedTSE.id)}
          onClose={handleCloseModal}
        />
      )}

      {/* Help Modal */}
      {isHelpModalOpen && (
        <HelpModal onClose={() => setIsHelpModalOpen(false)} />
      )}
    </div>
  );
}

// Alerts Dropdown Component
function AlertsDropdown({ alerts, isOpen, onToggle, onClose, onTSEClick, onViewAll, onViewChats }) {
  const [expandedRegions, setExpandedRegions] = useState(new Set()); // All collapsed by default
  const [expandedTSEs, setExpandedTSEs] = useState(new Set());
  const [expandedAlertTypes, setExpandedAlertTypes] = useState(new Set());
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
      } else if (alert.type === "waiting_on_tse_threshold") {
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

  // Get TSEs from expanded regions only
  const expandedRegionTSEs = useMemo(() => {
    return ['UK', 'NY', 'SF', 'Other']
      .filter(region => expandedRegions.has(region))
      .flatMap(region => alertsByRegion[region] || []);
  }, [expandedRegions, alertsByRegion]);
  
  // Create a Set of TSE keys from expanded regions for quick lookup
  const visibleTSEKeys = useMemo(() => {
    return new Set(expandedRegionTSEs.map(tse => `${tse.tseId}-${tse.tseName}`));
  }, [expandedRegionTSEs]);

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
            <div className="alerts-dropdown-header-actions">
              {onViewAll && (
                <button 
                  className="alerts-view-all-button" 
                  onClick={onViewAll}
                >
                  View All
                </button>
              )}
              <button className="alerts-close-button" onClick={onClose}>×</button>
            </div>
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
                    'UK': 'UK',
                    'NY': 'New York',
                    'SF': 'San Francisco',
                    'Other': 'Other'
                  };
                  const iconUrl = REGION_ICONS[region];

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
                        {iconUrl && (
                          <img 
                            src={iconUrl} 
                            alt={region} 
                            className="region-alert-icon"
                          />
                        )}
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
                                              <div 
                                                key={idx} 
                                                className="alert-item alert-item-clickable"
                                                onClick={() => onTSEClick && onTSEClick(tseGroup.tseId, tseGroup.tseName)}
                                                style={{ cursor: onTSEClick ? 'pointer' : 'default' }}
                                              >
                                                <span className="alert-severity">
                                                  {alert.severity === "high" ? "🔴" : "🟡"}
                                                </span>
                                                <span className="alert-message">{alert.message}</span>
                                                {onViewChats && (
                                                  <button
                                                    className="alert-view-chats-button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      onViewChats(tseGroup.tseId, "open");
                                                    }}
                                                  >
                                                    View Chats
                                                  </button>
                                                )}
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
                                              <div 
                                                key={idx} 
                                                className="alert-item alert-item-clickable"
                                                onClick={() => onTSEClick && onTSEClick(tseGroup.tseId, tseGroup.tseName)}
                                                style={{ cursor: onTSEClick ? 'pointer' : 'default' }}
                                              >
                                                <span className="alert-severity">
                                                  {alert.severity === "high" ? "🔴" : "🟡"}
                                                </span>
                                                <span className="alert-message">{alert.message}</span>
                                                {onViewChats && (
                                                  <button
                                                    className="alert-view-chats-button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      onViewChats(tseGroup.tseId, "snoozed");
                                                    }}
                                                  >
                                                    View Chats
                                                  </button>
                                                )}
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Modern Overview Dashboard Component
function OverviewDashboard({ metrics, historicalSnapshots, responseTimeMetrics, loadingHistorical, onNavigateToConversations, onNavigateToTSEView, onTSEClick }) {
  
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
          // Support both old and new field names for backwards compatibility
          const totalWaitingOnTSE = tse.waitingOnTSE || tse.actionableSnoozed || 0;
          const meetsWaitingOnTSE = totalWaitingOnTSE <= THRESHOLDS.MAX_WAITING_ON_TSE_SOFT;
          if (meetsOpen && meetsWaitingOnTSE) compliantBoth++;
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
      .sort((a, b) => a.date.localeCompare(b.date));
      // Don't limit to 7 days - we need more for week-over-week comparison
    
    console.log('Overview: Processed compliance trend data:', processed);
    return processed;
  }, [historicalSnapshots]);

  // Prepare response time trend data
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
      .sort((a, b) => a.date.localeCompare(b.date));
      // Don't limit - we need all data for week-over-week comparison
  }, [responseTimeMetrics]);

  // Calculate region breakdown
  const regionBreakdown = useMemo(() => {
    if (!historicalSnapshots || historicalSnapshots.length === 0) return null;
    
    const latestSnapshot = historicalSnapshots[historicalSnapshots.length - 1];
    const tseData = latestSnapshot.tse_data || latestSnapshot.tseData || [];
    
    const regionStats = { 'UK': { total: 0, compliant: 0 }, 'NY': { total: 0, compliant: 0 }, 'SF': { total: 0, compliant: 0 } };
    
    tseData.forEach(tse => {
      const region = getTSERegion(tse.name);
      // Skip 'Other' region
      if (region === 'Other' || !regionStats[region]) return;
      
      const meetsOpen = (tse.open || 0) <= THRESHOLDS.MAX_OPEN_SOFT;
      // Compliance uses: open conversations and snoozed conversations with tag snooze.waiting-on-tse
      // actionableSnoozed = snoozed conversations with tag snooze.waiting-on-tse
      // Support both old and new field names for backwards compatibility
      const totalWaitingOnTSE = tse.waitingOnTSE || tse.actionableSnoozed || 0;
      const meetsWaitingOnTSE = totalWaitingOnTSE <= THRESHOLDS.MAX_WAITING_ON_TSE_SOFT;
      
      regionStats[region].total++;
      if (meetsOpen && meetsWaitingOnTSE) regionStats[region].compliant++;
    });
    
    return Object.entries(regionStats).map(([region, stats]) => ({
      region,
      compliance: stats.total > 0 ? Math.round((stats.compliant / stats.total) * 100) : 0,
      total: stats.total,
      compliant: stats.compliant
    })).filter(r => r.total > 0 && r.region !== 'Other');
  }, [historicalSnapshots]);

  // Calculate today vs yesterday comparison
  const todayVsYesterday = useMemo(() => {
    if (!complianceTrendData || complianceTrendData.length < 2) return null;
    
    const today = complianceTrendData[complianceTrendData.length - 1];
    const yesterday = complianceTrendData[complianceTrendData.length - 2];
    
    const complianceChange = today.compliance - yesterday.compliance;
    
    // Get response time comparison
    let responseTimeChange = null;
    if (responseTimeTrendData && responseTimeTrendData.length >= 2) {
      const todayRT = responseTimeTrendData[responseTimeTrendData.length - 1];
      const yesterdayRT = responseTimeTrendData[responseTimeTrendData.length - 2];
      responseTimeChange = todayRT.percentage - yesterdayRT.percentage;
    }
    
    return {
      compliance: {
        today: today.compliance,
        yesterday: yesterday.compliance,
        change: complianceChange,
        direction: complianceChange > 0 ? 'up' : complianceChange < 0 ? 'down' : 'stable'
      },
      responseTime: responseTimeChange !== null ? {
        today: responseTimeTrendData[responseTimeTrendData.length - 1].percentage,
        yesterday: responseTimeTrendData[responseTimeTrendData.length - 2].percentage,
        change: responseTimeChange,
        direction: responseTimeChange < 0 ? 'up' : responseTimeChange > 0 ? 'down' : 'stable' // Lower is better
      } : null
    };
  }, [complianceTrendData, responseTimeTrendData]);

  // Calculate week-over-week comparison (or most recent period comparison if less data available)
  const weekOverWeek = useMemo(() => {
    if (!complianceTrendData || complianceTrendData.length < 2) return null;
    
    // If we have at least 7 days, compare last 7 vs previous 7
    if (complianceTrendData.length >= 7) {
      const thisWeek = complianceTrendData.slice(-7);
      const lastWeek = complianceTrendData.slice(-14, -7);
      
      if (lastWeek.length === 0) {
        // Not enough for full comparison, fall through to shorter comparison
      } else {
        const thisWeekAvg = thisWeek.reduce((sum, d) => sum + d.compliance, 0) / thisWeek.length;
        const lastWeekAvg = lastWeek.reduce((sum, d) => sum + d.compliance, 0) / lastWeek.length;
        const complianceChange = thisWeekAvg - lastWeekAvg;
        
        // Response time week-over-week
        let responseTimeChange = null;
        let thisWeekAvgRT = null;
        let lastWeekAvgRT = null;
        if (responseTimeTrendData && responseTimeTrendData.length >= 14) {
          const thisWeekRT = responseTimeTrendData.slice(-7);
          const lastWeekRT = responseTimeTrendData.slice(-14, -7);
          thisWeekAvgRT = thisWeekRT.reduce((sum, d) => sum + d.percentage, 0) / thisWeekRT.length;
          lastWeekAvgRT = lastWeekRT.reduce((sum, d) => sum + d.percentage, 0) / lastWeekRT.length;
          responseTimeChange = thisWeekAvgRT - lastWeekAvgRT;
        }
        
        return {
          label: 'Last 7 Days vs Previous 7 Days',
          compliance: {
            thisWeek: Math.round(thisWeekAvg),
            lastWeek: Math.round(lastWeekAvg),
            change: Math.round(complianceChange),
            direction: complianceChange > 0 ? 'up' : complianceChange < 0 ? 'down' : 'stable'
          },
          responseTime: responseTimeChange !== null && thisWeekAvgRT !== null && lastWeekAvgRT !== null ? {
            thisWeek: Math.round(thisWeekAvgRT * 10) / 10,
            lastWeek: Math.round(lastWeekAvgRT * 10) / 10,
            change: Math.round(responseTimeChange * 10) / 10,
            direction: responseTimeChange < 0 ? 'up' : responseTimeChange > 0 ? 'down' : 'stable'
          } : null
        };
      }
    }
    
    // Fallback: Compare most recent period vs previous period (at least 2 days needed)
    if (complianceTrendData.length >= 2) {
      const availableDays = Math.min(complianceTrendData.length, 7);
      const recentPeriod = complianceTrendData.slice(-availableDays);
      const previousPeriod = complianceTrendData.slice(-availableDays * 2, -availableDays);
      
      if (previousPeriod.length === 0) return null;
      
      const recentAvg = recentPeriod.reduce((sum, d) => sum + d.compliance, 0) / recentPeriod.length;
      const previousAvg = previousPeriod.reduce((sum, d) => sum + d.compliance, 0) / previousPeriod.length;
      const complianceChange = recentAvg - previousAvg;
      
      // Response time comparison
      let responseTimeChange = null;
      let recentAvgRT = null;
      let previousAvgRT = null;
      if (responseTimeTrendData && responseTimeTrendData.length >= availableDays * 2) {
        const recentRT = responseTimeTrendData.slice(-availableDays);
        const previousRT = responseTimeTrendData.slice(-availableDays * 2, -availableDays);
        recentAvgRT = recentRT.reduce((sum, d) => sum + d.percentage, 0) / recentRT.length;
        previousAvgRT = previousRT.reduce((sum, d) => sum + d.percentage, 0) / previousRT.length;
        responseTimeChange = recentAvgRT - previousAvgRT;
      }
      
      return {
        label: `Last ${availableDays} Days vs Previous ${availableDays} Days`,
        compliance: {
          thisWeek: Math.round(recentAvg),
          lastWeek: Math.round(previousAvg),
          change: Math.round(complianceChange),
          direction: complianceChange > 0 ? 'up' : complianceChange < 0 ? 'down' : 'stable'
        },
        responseTime: responseTimeChange !== null && recentAvgRT !== null && previousAvgRT !== null ? {
          thisWeek: Math.round(recentAvgRT * 10) / 10,
          lastWeek: Math.round(previousAvgRT * 10) / 10,
          change: Math.round(responseTimeChange * 10) / 10,
          direction: responseTimeChange < 0 ? 'up' : responseTimeChange > 0 ? 'down' : 'stable'
        } : null
      };
    }
    
    return null;
  }, [complianceTrendData, responseTimeTrendData]);

  // Calculate best/worst day in last 7 days
  const bestWorstDay = useMemo(() => {
    if (!complianceTrendData || complianceTrendData.length === 0) return null;
    
    const sorted = [...complianceTrendData].sort((a, b) => b.compliance - a.compliance);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    
    return {
      best: {
        date: best.displayLabel,
        compliance: best.compliance
      },
      worst: {
        date: worst.displayLabel,
        compliance: worst.compliance
      }
    };
  }, [complianceTrendData]);

  // Calculate volatility
  const volatility = useMemo(() => {
    if (!complianceTrendData || complianceTrendData.length < 2) return null;
    
    const values = complianceTrendData.map(d => d.compliance);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    const stdDev = Math.round(Math.sqrt(variance));
    
    return {
      value: stdDev,
      interpretation: stdDev < 5 ? 'stable' : stdDev < 10 ? 'moderate' : 'volatile'
    };
  }, [complianceTrendData]);

  // Calculate moving averages for charts
  const complianceTrendWithMovingAvg = useMemo(() => {
    if (!complianceTrendData || complianceTrendData.length === 0) return [];
    
    return complianceTrendData.map((item, index) => {
      if (index < 2) {
        return { ...item, movingAvg: item.compliance };
      }
      const window = complianceTrendData.slice(Math.max(0, index - 2), index + 1);
      const avg = window.reduce((sum, d) => sum + d.compliance, 0) / window.length;
      return { ...item, movingAvg: Math.round(avg) };
    });
  }, [complianceTrendData]);

  const responseTimeTrendWithMovingAvg = useMemo(() => {
    if (!responseTimeTrendData || responseTimeTrendData.length === 0) return [];
    
    return responseTimeTrendData.map((item, index) => {
      if (index < 2) {
        return { ...item, movingAvg: item.percentage };
      }
      const window = responseTimeTrendData.slice(Math.max(0, index - 2), index + 1);
      const avg = window.reduce((sum, d) => sum + d.percentage, 0) / window.length;
      return { ...item, movingAvg: Math.round(avg * 10) / 10 };
    });
  }, [responseTimeTrendData]);

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
      {/* Quick Insights Section */}
      <div className="overview-insights">
        {/* Last 7 Days vs Previous 7 Days */}
        {weekOverWeek && (
          <div className="insight-card">
            <h4 className="insight-title">{weekOverWeek.label}</h4>
            <div className="insight-content">
              <div className="insight-metric">
                <span className="insight-label">Compliance</span>
                <div className="insight-comparison">
                  <span className="insight-value">{weekOverWeek.compliance.thisWeek}%</span>
                  <span className="insight-arrow">→</span>
                  <span className={`insight-value ${weekOverWeek.compliance.direction === 'up' ? 'positive' : weekOverWeek.compliance.direction === 'down' ? 'negative' : ''}`}>
                    {weekOverWeek.compliance.lastWeek}%
                  </span>
                  <span className={`insight-change ${weekOverWeek.compliance.direction}`}>
                    {weekOverWeek.compliance.change > 0 ? '+' : ''}{weekOverWeek.compliance.change}%
                  </span>
                </div>
              </div>
              {weekOverWeek.responseTime && (
                <div className="insight-metric">
                  <span className="insight-label">Response Time</span>
                  <div className="insight-comparison">
                    <span className="insight-value">{weekOverWeek.responseTime.thisWeek.toFixed(1)}%</span>
                    <span className="insight-arrow">→</span>
                    <span className={`insight-value ${weekOverWeek.responseTime.direction === 'up' ? 'positive' : weekOverWeek.responseTime.direction === 'down' ? 'negative' : ''}`}>
                      {weekOverWeek.responseTime.lastWeek.toFixed(1)}%
                    </span>
                    <span className={`insight-change ${weekOverWeek.responseTime.direction}`}>
                      {weekOverWeek.responseTime.change > 0 ? '+' : ''}{weekOverWeek.responseTime.change.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}


        {/* Best/Worst Day */}
        {bestWorstDay && (
          <div className="insight-card">
            <h4 className="insight-title">Last 7 Days</h4>
            <div className="insight-content">
              <div className="insight-metric">
                <span className="insight-label">Best Day</span>
                <div className="insight-single">
                  <span className="insight-date">{bestWorstDay.best.date}</span>
                  <span className="insight-value positive">{bestWorstDay.best.compliance}%</span>
                </div>
              </div>
              <div className="insight-metric">
                <span className="insight-label">Worst Day</span>
                <div className="insight-single">
                  <span className="insight-date">{bestWorstDay.worst.date}</span>
                  <span className="insight-value negative">{bestWorstDay.worst.compliance}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Volatility */}
        {volatility && (
          <div className="insight-card">
            <h4 className="insight-title">Volatility</h4>
            <div className="insight-content">
              <div className="insight-metric">
                <span className="insight-label">Stability</span>
                <div className="insight-single">
                  <span className={`insight-value ${volatility.interpretation === 'stable' ? 'positive' : volatility.interpretation === 'moderate' ? 'warning' : 'negative'}`}>
                    {volatility.interpretation === 'stable' ? 'Stable' : volatility.interpretation === 'moderate' ? 'Moderate' : 'Volatile'}
                  </span>
                  <span className="insight-subtext">±{volatility.value}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alerts Summary */}
        {metrics.alerts && metrics.alerts.length > 0 && (() => {
          const openChatsAlerts = metrics.alerts.filter(alert => alert.type === "open_threshold").length;
          const waitingOnTSEAlerts = metrics.alerts.filter(alert => alert.type === "waiting_on_tse_threshold").length;
          
          return (
            <div 
              className={`insight-card alert-summary ${onNavigateToTSEView ? 'alert-summary-clickable' : ''}`}
              onClick={onNavigateToTSEView || undefined}
              style={{ cursor: onNavigateToTSEView ? 'pointer' : 'default' }}
            >
              {onNavigateToTSEView && <div className="alert-summary-click-icon">→</div>}
              <h4 className="insight-title">Active Alerts</h4>
              <div className="insight-content">
                <div className="insight-metric">
                  <span className="insight-label">Open Chats ({THRESHOLDS.MAX_OPEN_ALERT}+)</span>
                  <div className="insight-single">
                    <span className="insight-value negative">{openChatsAlerts}</span>
                  </div>
                </div>
                <div className="insight-metric">
                  <span className="insight-label">Snoozed - Waiting On TSE ({THRESHOLDS.MAX_WAITING_ON_TSE_ALERT}+)</span>
                  <div className="insight-single">
                    <span className="insight-value negative">{waitingOnTSEAlerts}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Region Breakdown */}
        {regionBreakdown && regionBreakdown.length > 0 && (
          <div className="insight-card region-breakdown">
            <h4 className="insight-title">Region Compliance</h4>
            <div className="insight-content">
              {regionBreakdown.map(region => {
                const iconUrl = REGION_ICONS[region.region];
                return (
                  <div key={region.region} className="insight-metric">
                    <span className="insight-label">
                      {region.region}
                      {iconUrl && (
                        <img 
                          src={iconUrl} 
                          alt={region.region} 
                          className="region-breakdown-icon"
                        />
                      )}
                    </span>
                    <div className="insight-single">
                      <span className={`insight-value ${region.compliance >= 80 ? 'positive' : region.compliance >= 60 ? 'warning' : 'negative'}`}>
                        {region.compliance}%
                      </span>
                      <span className="insight-subtext">{region.compliant}/{region.total} TSEs</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

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

            <div 
              className="kpi-card kpi-card-clickable"
              onClick={() => onNavigateToConversations && onNavigateToConversations("open")}
              style={{ cursor: onNavigateToConversations ? 'pointer' : 'default' }}
            >
              <div className="kpi-card-click-icon">→</div>
              <div className="kpi-label">OPEN CHATS</div>
              <div className="kpi-value">{metrics.totalOpen}</div>
              <div className="kpi-subtitle">Currently open</div>
            </div>

            <div 
              className="kpi-card kpi-card-clickable"
              onClick={() => onNavigateToConversations && onNavigateToConversations("waitingontse")}
              style={{ cursor: onNavigateToConversations ? 'pointer' : 'default' }}
            >
              <div className="kpi-card-click-icon">→</div>
              <div className="kpi-label">WAITING ON TSE</div>
              <div className="kpi-value">{metrics.waitingOnTSE.length}</div>
              <div className="kpi-subtitle">Requires attention</div>
            </div>

            <div 
              className="kpi-card kpi-card-clickable"
              onClick={() => onNavigateToConversations && onNavigateToConversations("waitingoncustomer")}
              style={{ cursor: onNavigateToConversations ? 'pointer' : 'default' }}
            >
              <div className="kpi-card-click-icon">→</div>
              <div className="kpi-label">WAITING ON CUSTOMER</div>
              <div className="kpi-value">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 'normal' }}>Resolved: </span>
                    <span style={{ fontSize: '24px', fontWeight: 'bold' }}>
                      {metrics.waitingOnCustomer ? metrics.waitingOnCustomer.filter(conv => {
                        const tags = conv.tags || [];
                        return tags.some(t => 
                          (t.name && t.name.toLowerCase() === "snooze.waiting-on-customer-resolved") || 
                          (typeof t === "string" && t.toLowerCase() === "snooze.waiting-on-customer-resolved")
                        );
                      }).length : 0}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 'normal' }}>Unresolved: </span>
                    <span style={{ fontSize: '24px', fontWeight: 'bold' }}>
                      {metrics.waitingOnCustomer ? metrics.waitingOnCustomer.filter(conv => {
                        const tags = conv.tags || [];
                        return tags.some(t => 
                          (t.name && t.name.toLowerCase() === "snooze.waiting-on-customer-unresolved") || 
                          (typeof t === "string" && t.toLowerCase() === "snooze.waiting-on-customer-unresolved")
                        );
                      }).length : 0}
                    </span>
                  </div>
                </div>
              </div>
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
          {complianceTrendWithMovingAvg.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={complianceTrendWithMovingAvg} margin={{ top: 70, right: 10, left: 0, bottom: 5 }}>
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
                  label={createHolidayLabel(complianceTrendWithMovingAvg)}
                />
                <Line 
                  type="monotone" 
                  dataKey="movingAvg" 
                  stroke="#4cec8c" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="3-Day Moving Avg"
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
          {responseTimeTrendWithMovingAvg.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={responseTimeTrendWithMovingAvg} margin={{ top: 70, right: 10, left: 0, bottom: 5 }}>
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
                  label={createHolidayLabel(responseTimeTrendWithMovingAvg)}
                />
                <Line 
                  type="monotone" 
                  dataKey="movingAvg" 
                  stroke="#ff9a74" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="3-Day Moving Avg"
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

// TSE Details Modal Component
function TSEDetailsModal({ tse, conversations, onClose }) {
  const [clickedTooltip, setClickedTooltip] = useState(null);
  const { open, waitingOnTSE, waitingOnCustomer, totalSnoozed } = conversations;
  const avatarUrl = getTSEAvatar(tse.name);
  const region = getTSERegion(tse.name);
  const regionLabels = {
    'UK': { text: 'UK' },
    'NY': { text: 'New York' },
    'SF': { text: 'San Francisco' },
    'Other': { text: 'Other' }
  };
  const regionLabel = regionLabels[region] || regionLabels['Other'];
  const regionIconUrl = REGION_ICONS[region];
  const INTERCOM_BASE_URL = "https://app.intercom.com/a/inbox/gu1e0q0t/inbox/admin/9110812/conversation/";
  
  // Calculate status for the modal
  const totalOpenCount = open.length;
  const totalWaitingOnTSECount = waitingOnTSE.length;
  const status = totalOpenCount === 0 && totalWaitingOnTSECount === 0
    ? "exceeding"
    : totalOpenCount <= THRESHOLDS.MAX_OPEN_SOFT && totalWaitingOnTSECount <= THRESHOLDS.MAX_WAITING_ON_TSE_SOFT
    ? "success"
    : "error";

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (clickedTooltip && !event.target.closest('.tooltip-popup') && !event.target.closest('.clickable-status-icon')) {
        setClickedTooltip(null);
      }
    };

    if (clickedTooltip) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [clickedTooltip]);

  const formatDate = (timestamp) => {
    if (!timestamp) return "-";
    const date = typeof timestamp === "number" ? new Date(timestamp * 1000) : new Date(timestamp);
    return date.toLocaleString('en-US', { 
      timeZone: 'UTC', 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }) + ' UTC';
  };

  const getAuthorEmail = (conv) => {
    return conv.source?.author?.email || 
           conv.source?.email || 
           conv.author?.email ||
           conv.conversation_message?.author?.email ||
           "-";
  };

  const renderConversationList = (convs, category) => {
    if (!convs || convs.length === 0) {
      return <div className="modal-empty-state">No conversations</div>;
    }

    return (
      <div className="modal-conversation-list">
        {convs.map((conv, idx) => {
          const convId = conv.id || conv.cid || conv.conversation_id;
          const authorEmail = getAuthorEmail(conv);
          const created = formatDate(conv.created_at || conv.createdAt || conv.first_opened_at);
          
          return (
            <div key={convId || idx} className="modal-conversation-item">
              <img 
                src="https://res.cloudinary.com/doznvxtja/image/upload/v1767370490/Untitled_design_14_wkkhe3.svg"
                alt="Intercom"
                className="modal-conv-icon"
              />
              <div className="modal-conv-content">
                <div className="modal-conv-header">
                  <a 
                    href={`${INTERCOM_BASE_URL}${convId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="modal-conv-id-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {convId}
                  </a>
                  <span className="modal-conv-date">{created}</span>
                </div>
                <div className="modal-conv-email">{authorEmail}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-avatar-container">
              {avatarUrl && (
                <img 
                  src={avatarUrl} 
                  alt={tse.name}
                  className="modal-avatar"
                />
              )}
              {tse.awayModeEnabled ? (
                <span className="modal-avatar-away-indicator" title="Away mode enabled">
                  🌙
                </span>
              ) : (
                <span className="modal-avatar-available-indicator" title="Available">
                </span>
              )}
            </div>
            <div className="modal-header-info">
              <h2 className="modal-title">
                {tse.name}
                <span style={{ position: 'relative', display: 'inline-block' }}>
                  {status === "exceeding" && (
                    <span 
                      className="tse-status-icon tse-exceeding-star clickable-status-icon"
                      title={`Outstanding - ${totalOpenCount} open, ${totalWaitingOnTSECount} waiting on TSE`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setClickedTooltip(clickedTooltip === 'status' ? null : 'status');
                      }}
                    >
                      ⭐
                    </span>
                  )}
                  {status === "success" && (
                    <span 
                      className="tse-status-icon tse-success-checkmark clickable-status-icon"
                      title={`On Track - ${totalOpenCount} open, ${totalWaitingOnTSECount} waiting on TSE (target: ≤${THRESHOLDS.MAX_OPEN_SOFT} open, ≤${THRESHOLDS.MAX_WAITING_ON_TSE_SOFT} waiting)`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setClickedTooltip(clickedTooltip === 'status' ? null : 'status');
                      }}
                    >
                      ✓
                    </span>
                  )}
                  {status === "error" && (
                    <span 
                      className="tse-status-icon tse-error-x clickable-status-icon"
                      title={`Over Limit - Needs Attention - ${totalOpenCount} open, ${totalWaitingOnTSECount} waiting on TSE (target: ≤${THRESHOLDS.MAX_OPEN_SOFT} open, ≤${THRESHOLDS.MAX_WAITING_ON_TSE_SOFT} waiting)`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setClickedTooltip(clickedTooltip === 'status' ? null : 'status');
                      }}
                    >
                      ✗
                    </span>
                  )}
                  {clickedTooltip === 'status' && (
                    <div className="tooltip-popup">
                      <div className="tooltip-content">
                        <div className="tooltip-header">
                          <span className="tooltip-title">
                            {status === "exceeding" ? "Outstanding" : status === "success" ? "On Track" : "Over Limit - Needs Attention"}
                          </span>
                          <button 
                            className="tooltip-close"
                            onClick={(e) => {
                              e.stopPropagation();
                              setClickedTooltip(null);
                            }}
                          >
                            ×
                          </button>
                        </div>
                        <div className="tooltip-body">
                          <div className="tooltip-metric">
                            <strong>Open:</strong> {totalOpenCount} (target: ≤{THRESHOLDS.MAX_OPEN_SOFT})
                          </div>
                          <div className="tooltip-metric">
                            <strong>Waiting on TSE:</strong> {totalWaitingOnTSECount} (target: ≤{THRESHOLDS.MAX_WAITING_ON_TSE_SOFT})
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </span>
              </h2>
              <div className="modal-region">
                {regionIconUrl && (
                  <img 
                    src={regionIconUrl} 
                    alt={region} 
                    className="modal-region-icon"
                  />
                )}
                <span className="modal-region-text">{regionLabel.text}</span>
              </div>
            </div>
          </div>
          <div className="modal-header-right">
            <div className={`modal-compliance-badge status-${status}`}>
              {status === "exceeding" && <span>⭐ Outstanding</span>}
              {status === "success" && <span>✓ On Track</span>}
              {status === "error" && <span>✗ Over Limit - Needs Attention</span>}
            </div>
            <button className="modal-close-button" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        <div className="modal-body">
          {/* Open Conversations */}
          <div className="modal-section">
            <h3 className="modal-section-title">
              Open Conversations
              <span className="modal-section-count">({open.length})</span>
            </h3>
            {renderConversationList(open, 'open')}
          </div>

          {/* Snoozed - Waiting On TSE */}
          <div className="modal-section">
            <h3 className="modal-section-title">
              Snoozed - Waiting On TSE
              <span className="modal-section-count">({waitingOnTSE.length})</span>
            </h3>
            {renderConversationList(waitingOnTSE, 'waitingOnTSE')}
          </div>

          {/* Snoozed - Waiting On Customer */}
          <div className="modal-section">
            <h3 className="modal-section-title">
              Snoozed - Waiting On Customer
              <span className="modal-section-count">({waitingOnCustomer.length})</span>
            </h3>
            {renderConversationList(waitingOnCustomer, 'waitingOnCustomer')}
          </div>

          {/* Total Snoozed */}
          <div className="modal-section">
            <h3 className="modal-section-title">
              Total Snoozed
              <span className="modal-section-count">({totalSnoozed.length})</span>
            </h3>
            {renderConversationList(totalSnoozed, 'totalSnoozed')}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConversationTable({ conversations }) {
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

// Help Modal Component
function HelpModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content help-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Help & Documentation</h2>
          <button className="modal-close-button" onClick={onClose}>×</button>
        </div>
        <div className="modal-body help-modal-body">
          <div className="help-section">
            <h3>Overview Dashboard</h3>
            <p>The Overview Dashboard provides real-time metrics and insights:</p>
            <ul>
              <li><strong>KPI Cards:</strong> Click on "OPEN CHATS", "WAITING ON TSE", or "WAITING ON CUSTOMER" cards to navigate to filtered conversations.</li>
              <li><strong>Region Compliance:</strong> View compliance percentages by region (UK, NY, SF).</li>
              <li><strong>Active Alerts:</strong> Click the alert summary card to view all TSEs over limit.</li>
              <li><strong>Compliance Trends:</strong> See 7-day compliance trends and response time metrics.</li>
            </ul>
          </div>

          <div className="help-section">
            <h3>TSE View</h3>
            <p>Monitor individual TSE performance:</p>
            <ul>
              <li><strong>TSE Cards:</strong> Click any TSE card to view detailed conversation breakdowns.</li>
              <li><strong>Status Indicators:</strong> Gold star (⭐) = Outstanding, Green checkmark (✓) = On Track, Red X (✗) = Over Limit - Needs Attention.</li>
              <li><strong>Filters:</strong> Filter by region, compliance status, or specific TSEs.</li>
            </ul>
          </div>

          <div className="help-section">
            <h3>Conversations View</h3>
            <p>Browse and filter conversations:</p>
            <ul>
              <li><strong>Filter by Snooze Type:</strong> Filter by "All Conversations", "All Snoozed", "Waiting On TSE", or "Waiting On Customer".</li>
              <li><strong>Filter by TSE:</strong> View conversations assigned to specific TSEs or unassigned conversations.</li>
              <li><strong>Search:</strong> Search for conversations by ID.</li>
            </ul>
          </div>

          <div className="help-section">
            <h3>Historical View</h3>
            <p>Analyze trends over time:</p>
            <ul>
              <li><strong>Daily Compliance Trends:</strong> View compliance trends for selected TSEs over time.</li>
              <li><strong>Region Comparison:</strong> Compare average compliance across regions.</li>
              <li><strong>Response Time Analysis:</strong> Track response time metrics and identify slow response patterns.</li>
              <li><strong>Date Range:</strong> Select custom date ranges to analyze historical data.</li>
            </ul>
          </div>

          <div className="help-section">
            <h3>Alerts</h3>
            <p>Stay informed about TSEs over limit:</p>
            <ul>
              <li><strong>Alert Dropdown:</strong> Click the bell icon to view active alerts.</li>
              <li><strong>Alert Items:</strong> Click on any alert to view TSE details, or click "View Chats" to see filtered conversations.</li>
              <li><strong>View All:</strong> Navigate to TSE View filtered to show all TSEs over limit.</li>
            </ul>
          </div>

          <div className="help-section">
            <h3>Compliance Thresholds</h3>
            <p>Compliance is calculated based on:</p>
            <ul>
              <li><strong>Open Chats:</strong> TSEs with 6+ open chats trigger alerts.</li>
              <li><strong>Waiting On TSE:</strong> TSEs with 7+ conversations waiting on them trigger alerts.</li>
              <li><strong>Status:</strong> Outstanding (purple with gold star), On Track (green), or Over Limit - Needs Attention (red) based on these thresholds.</li>
            </ul>
          </div>

          <div className="help-section">
            <h3>Tips</h3>
            <ul>
              <li>Use the arrow icons (→) on cards to identify clickable elements.</li>
              <li>Hover over TSE cards to see hover effects indicating interactivity.</li>
              <li>Click on any TSE card to view detailed conversation breakdowns.</li>
              <li>Use filters to narrow down conversations by type, TSE, or region.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

