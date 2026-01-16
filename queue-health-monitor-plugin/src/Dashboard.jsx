import React, { useMemo, useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import HistoricalView from "./HistoricalView";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';
import { formatDateTimeUTC, formatTimestampUTC, formatDateForChart } from "./utils/dateUtils";
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
  'SF': 'https://res.cloudinary.com/doznvxtja/image/upload/v1768314189/3_150_x_150_px_9_x6vkvp.svg',
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
  const { logout } = useAuth();
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
  const [isStreaksModalOpen, setIsStreaksModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [alertsDropdownOpen, setAlertsDropdownOpen] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [wasLoading, setWasLoading] = useState(false);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  const [loadingStartTime, setLoadingStartTime] = useState(null);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [selectedColors, setSelectedColors] = useState(new Set(['warning', 'exceeding', 'success', 'error'])); // All selected by default
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

      // Fetch historical snapshots
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
        const tags = Array.isArray(conv.tags) ? conv.tags : [];
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
      const tags = Array.isArray(conv.tags) ? conv.tags : [];
      
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
        // Determine severity based on how far above threshold
        // Medium (🟡): threshold to threshold + 2 (6-8)
        // High (🔴): threshold + 3 or more (9+)
        const severity = totalOpen >= THRESHOLDS.MAX_OPEN_ALERT + 3 ? "high" : "medium";
        alerts.push({
          type: "open_threshold",
          severity: severity,
          tseId: tse.id,
          tseName: tse.name,
          message: `${tse.name}: ${totalOpen} open chats (threshold: ${THRESHOLDS.MAX_OPEN_ALERT}+)`,
          count: totalOpen
        });
      }
      
      if (totalWaitingOnTSE >= THRESHOLDS.MAX_WAITING_ON_TSE_ALERT) {
        // Determine severity based on how far above threshold
        // Medium (🟡): threshold to threshold + 2 (7-9)
        // High (🔴): threshold + 3 or more (10+)
        const severity = totalWaitingOnTSE >= THRESHOLDS.MAX_WAITING_ON_TSE_ALERT + 3 ? "high" : "medium";
        alerts.push({
          type: "waiting_on_tse_threshold",
          severity: severity,
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
    
    // Calculate on-track metrics
    const totalTSEs = filteredByTSE.length;
    let onTrackBoth = 0;
    let onTrackOpen = 0; // TSEs meeting open requirement (regardless of snoozed)
    let onTrackSnoozed = 0; // TSEs meeting snoozed requirement (regardless of open)
    
    filteredByTSE.forEach(tse => {
      const meetsOpen = tse.open <= THRESHOLDS.MAX_OPEN_SOFT;
      const meetsWaitingOnTSE = tse.waitingOnTSE <= THRESHOLDS.MAX_WAITING_ON_TSE_SOFT;
      
      if (meetsOpen && meetsWaitingOnTSE) {
        onTrackBoth++;
      }
      
      // Count independently - these are not mutually exclusive
      if (meetsOpen) {
        onTrackOpen++;
      }
      if (meetsWaitingOnTSE) {
        onTrackSnoozed++;
      }
    });
    
    const onTrackOverall = totalTSEs > 0 ? Math.round((onTrackBoth / totalTSEs) * 100) : 0;
    const onTrackOpenOnlyPct = totalTSEs > 0 ? Math.round((onTrackOpen / totalTSEs) * 100) : 0;
    const onTrackSnoozedOnlyPct = totalTSEs > 0 ? Math.round((onTrackSnoozed / totalTSEs) * 100) : 0;
    
    // Debug logging
    console.log('On Track breakdown:', {
      totalTSEs,
      onTrackBoth,
      onTrackOpen,
      onTrackSnoozed,
      onTrackOverall: `${onTrackOverall}%`,
      onTrackOpenOnly: `${onTrackOpenOnlyPct}%`,
      onTrackSnoozedOnly: `${onTrackSnoozedOnlyPct}%`
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
      onTrackOverall,
      onTrackOpenOnly: onTrackOpenOnlyPct,
      onTrackSnoozedOnly: onTrackSnoozedOnlyPct
    };
    }, [conversations, teamMembers]);

  // Calculate performance streaks for each TSE
  const performanceStreaks = useMemo(() => {
    if (!historicalSnapshots || historicalSnapshots.length === 0) {
      return { streak3: [] };
    }

    const EXCLUDED_TSE_NAMES = ["Prerit Sachdeva"];
    
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
          onTrack: isOutstanding
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
        if (dateEntry.onTrack) {
          currentStreak++;
        } else {
          break; // Streak broken
        }
      }
      
      // Calculate total outstanding days in history
      totalOutstandingDays = tse.dates.filter(d => d.onTrack).length;
      
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
  // eslint-disable-next-line no-unused-vars
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
          const tags = Array.isArray(conv.tags) ? conv.tags : [];
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
          const tags = Array.isArray(conv.tags) ? conv.tags : [];
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
  // eslint-disable-next-line no-unused-vars
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

  // Loading phrases - professional descriptions of what's happening
  const loadingPhrases = [
    "Fetching conversation data from Intercom...",
    "Filtering to Resolution Team conversations...",
    "Processing team member assignments...",
    "Analyzing individual TSE conversation data...",
    "Calculating TSE queue status metrics...",
    "Computing regional on-track statistics...",
    "Analyzing historical on-track trends...",
    "Calculating performance correlations...",
    "Identifying outstanding performance streaks...",
    "Building dashboard visualizations...",
    "Compiling status insights..."
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
    const phraseDuration = 5000; // 5 seconds per phrase (60 seconds / 11 phrases ≈ 5.45 seconds, but using 5s for consistent timing)
    const fallbackStartTime = 60000; // 60 seconds total - when to start showing fallback phrases

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
  }, [loadingStartTime, loadingPhrases.length, fallbackPhrases.length]);

  // Update progress percentage continuously for smooth animation
  useEffect(() => {
    if (!loadingStartTime) {
      setProgressPercentage(0);
      return;
    }

    const updateProgress = () => {
    const elapsed = Date.now() - loadingStartTime;
    // eslint-disable-next-line no-unused-vars
    const totalPhrases = loadingPhrases.length;
    const totalRegularPhraseTime = 60000; // 60 seconds total for all regular phrases
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
        <div className="header-left">
          <h2>Support Ops: Queue Health Monitor</h2>
          <div className="button-group">
            <button
              className="logout-button"
              onClick={logout}
              aria-label="Logout"
              title="Sign out"
            >
              Sign Out
            </button>
            <button onClick={onRefresh} className="refresh-button">Refresh</button>
            {lastUpdated && (
              <span className="last-updated">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div className="header-actions">
          <div className="header-icon-group">
            <button
              className="help-icon-button"
              onClick={() => setIsHelpModalOpen(true)}
              aria-label="Help"
              title="Help"
            >
              <img 
                src="https://res.cloudinary.com/doznvxtja/image/upload/v1768513679/3_150_x_150_px_12_zhkdig.svg" 
                alt="Help" 
                className="help-icon"
              />
            </button>
            <button
              className="streaks-icon-button"
              onClick={() => setIsStreaksModalOpen(true)}
              aria-label="Outstanding Performance Streaks"
              title="Outstanding Performance Streaks"
              disabled={!performanceStreaks.streak3 || performanceStreaks.streak3.length === 0}
            >
              <img 
                src="https://res.cloudinary.com/doznvxtja/image/upload/v1768513305/3_150_x_150_px_11_a6potb.svg" 
                alt="Outstanding Performance Streaks" 
                className="streaks-icon"
              />
            </button>
            <AlertsDropdown 
              alerts={metrics.alerts || []}
              isOpen={alertsDropdownOpen}
              onToggle={() => setAlertsDropdownOpen(!alertsDropdownOpen)}
              onClose={() => setAlertsDropdownOpen(false)}
              onTSEClick={(tseId, tseName) => {
                setAlertsDropdownOpen(false);
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
          </div>
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
                // eslint-disable-next-line no-unused-vars
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
            setSelectedColors(new Set(['error'])); // Over Limit only
            setSelectedRegions(new Set(['UK', 'NY', 'SF', 'Other'])); // All regions
          }}
          onTSEClick={handleTSECardClick}
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
                    onClick={() => setSelectedColors(new Set(['warning', 'exceeding', 'success', 'error']))}
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
                  <span className="legend-label">Missing Snooze Tags (Total Snoozed &gt; Waiting On TSE + Waiting On Customer)</span>
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
              const totalWaitingOnCustomer = tse.waitingOnCustomer || 0;
              const totalSnoozed = tse.totalSnoozed || 0;
              
              // Outstanding: 0 open and 0 waiting on TSE
              if (totalOpen === 0 && totalWaitingOnTSE === 0) {
                return "exceeding";
              }
              // Over Limit - Needs Attention: either >5 open OR >5 waiting on TSE
              // Check this BEFORE warning to prioritize critical issues
              if (totalOpen > THRESHOLDS.MAX_OPEN_SOFT || totalWaitingOnTSE > THRESHOLDS.MAX_WAITING_ON_TSE_SOFT) {
                return "error";
              }
              // On Track: ≤5 open AND ≤5 waiting on TSE
              if (totalOpen <= THRESHOLDS.MAX_OPEN_SOFT && totalWaitingOnTSE <= THRESHOLDS.MAX_WAITING_ON_TSE_SOFT) {
                // Check for warning condition: Total Snoozed > Waiting On TSE + Waiting On Customer
                // This indicates snoozed conversations without proper tags
                if (totalSnoozed > (totalWaitingOnTSE + totalWaitingOnCustomer)) {
                  return "warning";
                }
                return "success";
              }
              // Fallback (shouldn't reach here, but just in case)
              return "error";
            };

            // Filter TSEs by selected colors, then sort by status
            const filteredAndSortedTSEs = [...tses]
              .filter(tse => selectedColors.has(getTSEStatus(tse)))
              .sort((a, b) => {
                const statusOrder = { "warning": 0, "exceeding": 1, "success": 2, "error": 3 };
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
                              {status === "warning" && (
                                <span 
                                  className="tse-status-icon tse-warning-exclamation"
                                  title={`Missing Snooze Tags - ${tse.totalSnoozed || 0} total snoozed, but only ${(tse.waitingOnTSE || 0) + (tse.waitingOnCustomer || 0)} have proper tags. Please tag snoozed conversations with one of: Waiting On TSE, Waiting On Customer - Resolved, or Waiting On Customer - Unresolved.`}
                                >
                                  ⚠
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

      {/* Outstanding Performance Streaks Modal */}
      {isStreaksModalOpen && performanceStreaks.streak3.length > 0 && (
        <div className="modal-overlay" onClick={() => setIsStreaksModalOpen(false)}>
          <div className="modal-content streaks-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="streaks-modal-header">
              <h2 className="streaks-modal-title">🔥 Outstanding Performance Streaks</h2>
              <button 
                className="modal-close-button" 
                onClick={() => setIsStreaksModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            
            <div className="streaks-modal-body">
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

              {/* Streaks Container */}
              <div className="streaks-container">
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
                            onClick={() => {
                              setIsStreaksModalOpen(false);
                              handleTSECardClick(fullTSE);
                            }}
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
          </div>
        </div>
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

  // eslint-disable-next-line no-unused-vars
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
  // eslint-disable-next-line no-unused-vars
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
  
  // Prepare on-track trend data (last 7 days)
  const onTrackTrendData = useMemo(() => {
    console.log('Overview: Processing on-track trend data, snapshots:', historicalSnapshots);
    if (!historicalSnapshots || historicalSnapshots.length === 0) {
      console.log('Overview: No historical snapshots available');
      return [];
    }
    
    const processed = historicalSnapshots
      .map(snapshot => {
        const tseData = snapshot.tse_data || snapshot.tseData || [];
        const totalTSEs = tseData.length;
        if (totalTSEs === 0) return null;

        let onTrackBoth = 0;
        tseData.forEach(tse => {
          const meetsOpen = (tse.open || 0) <= THRESHOLDS.MAX_OPEN_SOFT;
          // Support both old and new field names for backwards compatibility
          const totalWaitingOnTSE = tse.waitingOnTSE || tse.actionableSnoozed || 0;
          const meetsWaitingOnTSE = totalWaitingOnTSE <= THRESHOLDS.MAX_WAITING_ON_TSE_SOFT;
          if (meetsOpen && meetsWaitingOnTSE) onTrackBoth++;
        });

        const onTrack = totalTSEs > 0 ? Math.round((onTrackBoth / totalTSEs) * 100) : 0;
        
        return {
          date: snapshot.date,
          displayLabel: formatDateForChart(snapshot.date),
          onTrack
        };
      })
      .filter(item => item !== null)
      .sort((a, b) => a.date.localeCompare(b.date));
      // Don't limit to 7 days - we need more for week-over-week comparison
    
    console.log('Overview: Processed on-track trend data:', processed);
    return processed;
  }, [historicalSnapshots]);

  // Prepare response time trend data (5+ minute)
  const responseTimeTrendData = useMemo(() => {
    if (!responseTimeMetrics || responseTimeMetrics.length === 0) return [];
    
    return responseTimeMetrics
      .map(metric => {
        return {
          date: metric.date,
          displayLabel: formatDateForChart(metric.date),
          percentage5Plus: parseFloat(metric.percentage5PlusMin || 0),
          percentage: parseFloat(metric.percentage5PlusMin || 0) // Use 5+ min for backward compatibility
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
    
    const regionStats = { 'UK': { total: 0, onTrack: 0 }, 'NY': { total: 0, onTrack: 0 }, 'SF': { total: 0, onTrack: 0 } };
    
    tseData.forEach(tse => {
      const region = getTSERegion(tse.name);
      // Skip 'Other' region
      if (region === 'Other' || !regionStats[region]) return;
      
      const meetsOpen = (tse.open || 0) <= THRESHOLDS.MAX_OPEN_SOFT;
      // On-track uses: open conversations and snoozed conversations with tag snooze.waiting-on-tse
      // actionableSnoozed = snoozed conversations with tag snooze.waiting-on-tse
      // Support both old and new field names for backwards compatibility
      const totalWaitingOnTSE = tse.waitingOnTSE || tse.actionableSnoozed || 0;
      const meetsWaitingOnTSE = totalWaitingOnTSE <= THRESHOLDS.MAX_WAITING_ON_TSE_SOFT;
      
      regionStats[region].total++;
      if (meetsOpen && meetsWaitingOnTSE) regionStats[region].onTrack++;
    });
    
    return Object.entries(regionStats).map(([region, stats]) => ({
      region,
      onTrack: stats.total > 0 ? Math.round((stats.onTrack / stats.total) * 100) : 0,
      total: stats.total,
      onTrackCount: stats.onTrack
    })).filter(r => r.total > 0 && r.region !== 'Other');
  }, [historicalSnapshots]);

  // Calculate today vs yesterday comparison
  // eslint-disable-next-line no-unused-vars
  const todayVsYesterday = useMemo(() => {
    if (!onTrackTrendData || onTrackTrendData.length < 2) return null;
    
    const today = onTrackTrendData[onTrackTrendData.length - 1];
    const yesterday = onTrackTrendData[onTrackTrendData.length - 2];
    
    const onTrackChange = today.onTrack - yesterday.onTrack;
    
    // Get response time comparison
    let responseTimeChange = null;
    if (responseTimeTrendData && responseTimeTrendData.length >= 2) {
      const todayRT = responseTimeTrendData[responseTimeTrendData.length - 1];
      const yesterdayRT = responseTimeTrendData[responseTimeTrendData.length - 2];
      responseTimeChange = todayRT.percentage - yesterdayRT.percentage;
    }
    
    return {
      onTrack: {
        today: today.onTrack,
        yesterday: yesterday.onTrack,
        change: onTrackChange,
        direction: onTrackChange > 0 ? 'up' : onTrackChange < 0 ? 'down' : 'stable'
      },
      responseTime: responseTimeChange !== null ? {
        today: responseTimeTrendData[responseTimeTrendData.length - 1].percentage,
        yesterday: responseTimeTrendData[responseTimeTrendData.length - 2].percentage,
        change: responseTimeChange,
        direction: responseTimeChange < 0 ? 'up' : responseTimeChange > 0 ? 'down' : 'stable' // Lower is better
      } : null
    };
  }, [onTrackTrendData, responseTimeTrendData]);

  // Calculate week-over-week comparison (or most recent period comparison if less data available)
  const weekOverWeek = useMemo(() => {
    if (!onTrackTrendData || onTrackTrendData.length < 2) return null;
    
    // If we have at least 7 days, compare last 7 vs previous 7
    if (onTrackTrendData.length >= 7) {
      const thisWeek = onTrackTrendData.slice(-7);
      const lastWeek = onTrackTrendData.slice(-14, -7);
      
      if (lastWeek.length === 0) {
        // Not enough for full comparison, fall through to shorter comparison
      } else {
        const thisWeekAvg = thisWeek.reduce((sum, d) => sum + d.onTrack, 0) / thisWeek.length;
        const lastWeekAvg = lastWeek.reduce((sum, d) => sum + d.onTrack, 0) / lastWeek.length;
        const onTrackChange = thisWeekAvg - lastWeekAvg;
        
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
          onTrack: {
            thisWeek: Math.round(thisWeekAvg),
            lastWeek: Math.round(lastWeekAvg),
            change: Math.round(onTrackChange),
            direction: onTrackChange > 0 ? 'up' : onTrackChange < 0 ? 'down' : 'stable'
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
    if (onTrackTrendData.length >= 2) {
      const availableDays = Math.min(onTrackTrendData.length, 7);
      const recentPeriod = onTrackTrendData.slice(-availableDays);
      const previousPeriod = onTrackTrendData.slice(-availableDays * 2, -availableDays);
      
      if (previousPeriod.length === 0) return null;
      
      const recentAvg = recentPeriod.reduce((sum, d) => sum + d.onTrack, 0) / recentPeriod.length;
      const previousAvg = previousPeriod.reduce((sum, d) => sum + d.onTrack, 0) / previousPeriod.length;
      const onTrackChange = recentAvg - previousAvg;
      
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
        onTrack: {
          thisWeek: Math.round(recentAvg),
          lastWeek: Math.round(previousAvg),
          change: Math.round(onTrackChange),
          direction: onTrackChange > 0 ? 'up' : onTrackChange < 0 ? 'down' : 'stable'
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
  }, [onTrackTrendData, responseTimeTrendData]);

  // Calculate best/worst day in last 7 days
  const bestWorstDay = useMemo(() => {
    if (!onTrackTrendData || onTrackTrendData.length === 0) return null;
    
    const sorted = [...onTrackTrendData].sort((a, b) => b.onTrack - a.onTrack);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    
    return {
      best: {
        date: best.displayLabel,
        onTrack: best.onTrack
      },
      worst: {
        date: worst.displayLabel,
        onTrack: worst.onTrack
      }
    };
  }, [onTrackTrendData]);

  // Calculate volatility
  const volatility = useMemo(() => {
    if (!onTrackTrendData || onTrackTrendData.length < 2) return null;
    
    const values = onTrackTrendData.map(d => d.onTrack);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    const stdDev = Math.round(Math.sqrt(variance));
    
    return {
      value: stdDev,
      interpretation: stdDev < 5 ? 'stable' : stdDev < 10 ? 'moderate' : 'volatile'
    };
  }, [onTrackTrendData]);

  // Calculate moving averages for charts
  const onTrackTrendWithMovingAvg = useMemo(() => {
    if (!onTrackTrendData || onTrackTrendData.length === 0) return [];
    
    return onTrackTrendData.map((item, index) => {
      if (index < 2) {
        return { ...item, movingAvg: item.onTrack };
      }
      const window = onTrackTrendData.slice(Math.max(0, index - 2), index + 1);
      const avg = window.reduce((sum, d) => sum + d.onTrack, 0) / window.length;
      return { ...item, movingAvg: Math.round(avg) };
    });
  }, [onTrackTrendData]);

  const responseTimeTrendWithMovingAvg = useMemo(() => {
    if (!responseTimeTrendData || responseTimeTrendData.length === 0) return [];
    
    return responseTimeTrendData.map((item, index) => {
      if (index < 2) {
        return { 
          ...item, 
          movingAvg5Plus: item.percentage5Plus
        };
      }
      const window = responseTimeTrendData.slice(Math.max(0, index - 2), index + 1);
      const avg5Plus = window.reduce((sum, d) => sum + d.percentage5Plus, 0) / window.length;
      return { 
        ...item, 
        movingAvg5Plus: Math.round(avg5Plus * 10) / 10,
        movingAvg: Math.round(avg5Plus * 10) / 10 // Keep for backward compatibility
      };
    });
  }, [responseTimeTrendData]);

  // Calculate current response time percentages (most recent day)
  const currentResponseTimePct5Plus = useMemo(() => {
    if (responseTimeTrendData.length === 0) return 0;
    return Math.round(responseTimeTrendData[responseTimeTrendData.length - 1]?.percentage5Plus || 0);
  }, [responseTimeTrendData]);

  // Calculate average response time percentages (last 7 days)
  const avgResponseTimePct5Plus = useMemo(() => {
    if (responseTimeTrendData.length === 0) return 0;
    const sum = responseTimeTrendData.reduce((acc, item) => acc + (item.percentage5Plus || 0), 0);
    return Math.round((sum / responseTimeTrendData.length) * 10) / 10; // Round to 1 decimal
  }, [responseTimeTrendData]);

  // Calculate current on-track from historical data (to match Historical tab)
  const currentOnTrack = useMemo(() => {
    if (onTrackTrendData.length === 0) return 0;
    // Use the most recent snapshot's on-track value
    return onTrackTrendData[onTrackTrendData.length - 1]?.onTrack || 0;
  }, [onTrackTrendData]);

  // Calculate trend indicators
  const onTrackTrend = useMemo(() => {
    if (onTrackTrendData.length < 2) return { direction: 'stable', change: 0 };
    const first = onTrackTrendData[0].onTrack;
    const last = onTrackTrendData[onTrackTrendData.length - 1].onTrack;
    const change = last - first;
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      change: Math.abs(change)
    };
  }, [onTrackTrendData]);

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

  // Combine on-track and response time data for the trends chart
  const onTrackAndResponseTrendData = useMemo(() => {
    if (!onTrackTrendData.length || !responseTimeTrendData.length) return [];
    
    // Create a map of on-track data by date
    const onTrackByDate = {};
    onTrackTrendData.forEach(item => {
      onTrackByDate[item.date] = item.onTrack;
    });
    
    // Combine with response time data
    const combined = responseTimeTrendData
      .map(rtItem => {
        const onTrack = onTrackByDate[rtItem.date];
        if (onTrack === undefined) return null;
        
        return {
          date: rtItem.date,
          displayLabel: rtItem.displayLabel,
          onTrack: onTrack,
          slowResponsePct: rtItem.percentage5Plus || 0
        };
      })
      .filter(item => item !== null)
      .sort((a, b) => a.date.localeCompare(b.date));

    return combined.slice(-7);
  }, [onTrackTrendData, responseTimeTrendData]);

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
                <span className="insight-label">On Track</span>
                <div className="insight-comparison">
                  <span className="insight-value">{weekOverWeek.onTrack.thisWeek}%</span>
                  <span className="insight-arrow">→</span>
                  <span className={`insight-value ${weekOverWeek.onTrack.direction === 'up' ? 'positive' : weekOverWeek.onTrack.direction === 'down' ? 'negative' : ''}`}>
                    {weekOverWeek.onTrack.lastWeek}%
                  </span>
                  <span className={`insight-change ${weekOverWeek.onTrack.direction}`}>
                    {weekOverWeek.onTrack.change > 0 ? '+' : ''}{weekOverWeek.onTrack.change}%
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
            <h4 className="insight-title">On Track % - Last 7 Days</h4>
            <div className="insight-content">
              <div className="insight-metric">
                <span className="insight-label">Best Day</span>
                <div className="insight-single">
                  <span className="insight-date">{bestWorstDay.best.date}</span>
                  <span className="insight-value positive">{bestWorstDay.best.onTrack}%</span>
                </div>
              </div>
              <div className="insight-metric">
                <span className="insight-label">Worst Day</span>
                <div className="insight-single">
                  <span className="insight-date">{bestWorstDay.worst.date}</span>
                  <span className="insight-value negative">{bestWorstDay.worst.onTrack}%</span>
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
            <h4 className="insight-title">Region On Track</h4>
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
                      <span className={`insight-value ${region.onTrack >= 80 ? 'positive' : region.onTrack >= 60 ? 'warning' : 'negative'}`}>
                        {region.onTrack}%
                      </span>
                      <span className="insight-subtext">{region.onTrackCount}/{region.total} TSEs</span>
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
              <div className="kpi-label">Realtime On Track</div>
              <div className="kpi-content-with-viz">
                <div className="kpi-value">{metrics.onTrackOverall || 0}%</div>
                <div className="kpi-viz-container">
                  <svg className="kpi-circular-progress" viewBox="0 0 60 60" width="60" height="60">
                    <circle
                      className="kpi-progress-bg"
                      cx="30"
                      cy="30"
                      r="26"
                      fill="none"
                      stroke="#e0e0e0"
                      strokeWidth="4"
                    />
                    <circle
                      className="kpi-progress-fill"
                      cx="30"
                      cy="30"
                      r="26"
                      fill="none"
                      stroke="#35a1b4"
                      strokeWidth="4"
                      strokeDasharray={`${(metrics.onTrackOverall || 0) * 1.634} 163.4`}
                      strokeDashoffset="41"
                      strokeLinecap="round"
                      transform="rotate(-90 30 30)"
                    />
                  </svg>
                </div>
              </div>
              <div className="kpi-subtitle">Current snapshot</div>
            </div>

            <div className="kpi-card primary">
              <div className="kpi-label">Wait Rate</div>
              <div className="kpi-content-with-viz">
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 700 }}>{currentResponseTimePct5Plus}%</span>
                  <span style={{ fontSize: '14px', color: '#666' }}>5+ min</span>
                </div>
                {responseTimeTrendData.length >= 2 && (() => {
                  const dataPoints = responseTimeTrendData.slice(-7);
                  const maxValue = Math.max(...dataPoints.map(p => p.percentage), 1);
                  const minValue = Math.min(...dataPoints.map(p => p.percentage), 0);
                  const range = maxValue - minValue || 1;
                  const sparkWidth = 140;
                  const sparkHeight = 30;
                  
                  return (
                    <div className="kpi-sparkline-container">
                      <svg className="kpi-sparkline" viewBox={`0 0 ${sparkWidth} ${sparkHeight}`} width={sparkWidth} height={sparkHeight}>
                        {dataPoints.map((point, idx) => {
                          if (idx === 0) return null;
                          const prevPoint = dataPoints[idx - 1];
                          const x = (idx / Math.max(dataPoints.length - 1, 1)) * sparkWidth;
                          const y = sparkHeight - ((point.percentage - minValue) / range) * sparkHeight;
                          const prevX = ((idx - 1) / Math.max(dataPoints.length - 1, 1)) * sparkWidth;
                          const prevY = sparkHeight - ((prevPoint.percentage - minValue) / range) * sparkHeight;
                          return (
                            <line
                              key={idx}
                              x1={prevX}
                              y1={prevY}
                              x2={x}
                              y2={y}
                              stroke={responseTimeTrend.direction === 'down' ? '#4cec8c' : responseTimeTrend.direction === 'up' ? '#fd8789' : '#999'}
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          );
                        })}
                      </svg>
                    </div>
                  );
                })()}
              </div>
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
              <div className="kpi-content-with-viz">
                <div className="kpi-value">{metrics.totalOpen}</div>
                <div className="kpi-bar-indicator">
                  <div 
                    className="kpi-bar-fill" 
                    style={{ 
                      width: `${Math.min((metrics.totalOpen / 20) * 100, 100)}%`,
                      backgroundColor: metrics.totalOpen <= 5 ? '#4cec8c' : metrics.totalOpen <= 6 ? '#ffc107' : '#fd8789'
                    }}
                  />
                </div>
              </div>
              <div className="kpi-subtitle">Currently open</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-label">SNOOZED</div>
              {(() => {
                const waitingOnTSECount = metrics.waitingOnTSE.length;
                const waitingOnCustomerResolved = metrics.waitingOnCustomer ? metrics.waitingOnCustomer.filter(conv => {
                  const tags = Array.isArray(conv.tags) ? conv.tags : [];
                  return tags.some(t => 
                    (t.name && t.name.toLowerCase() === "snooze.waiting-on-customer-resolved") || 
                    (typeof t === "string" && t.toLowerCase() === "snooze.waiting-on-customer-resolved")
                  );
                }).length : 0;
                const waitingOnCustomerUnresolved = metrics.waitingOnCustomer ? metrics.waitingOnCustomer.filter(conv => {
                  const tags = Array.isArray(conv.tags) ? conv.tags : [];
                  return tags.some(t => 
                    (t.name && t.name.toLowerCase() === "snooze.waiting-on-customer-unresolved") || 
                    (typeof t === "string" && t.toLowerCase() === "snooze.waiting-on-customer-unresolved")
                  );
                }).length : 0;
                
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                    <div className="tse-metric-with-viz">
                      <div className="tse-metric">
                        <span className="metric-label">Waiting on TSE:</span>
                        <span className="metric-value">{waitingOnTSECount}</span>
                      </div>
                      <div className="kpi-mini-bar">
                        <div 
                          className="kpi-mini-bar-fill" 
                          style={{ 
                            width: `${Math.min((waitingOnTSECount / 10) * 100, 100)}%`,
                            backgroundColor: waitingOnTSECount <= 5 ? '#4cec8c' : waitingOnTSECount <= 7 ? '#ffc107' : '#fd8789'
                          }}
                        />
                      </div>
                    </div>
                    <div className="tse-metric-with-viz">
                      <div className="tse-metric">
                        <span className="metric-label">Waiting On Customer - Resolved:</span>
                        <span className="metric-value">{waitingOnCustomerResolved}</span>
                      </div>
                      <div className="kpi-mini-bar">
                        <div 
                          className="kpi-mini-bar-fill" 
                          style={{ 
                            width: `${Math.min((waitingOnCustomerResolved / 20) * 100, 100)}%`,
                            backgroundColor: '#35a1b4'
                          }}
                        />
                      </div>
                    </div>
                    <div className="tse-metric-with-viz">
                      <div className="tse-metric">
                        <span className="metric-label">Waiting On Customer - Unresolved:</span>
                        <span className="metric-value">{waitingOnCustomerUnresolved}</span>
                      </div>
                      <div className="kpi-mini-bar">
                        <div 
                          className="kpi-mini-bar-fill" 
                          style={{ 
                            width: `${Math.min((waitingOnCustomerUnresolved / 20) * 100, 100)}%`,
                            backgroundColor: '#9333ea'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Last 7 Days Averages Section */}
        <div className="kpi-section">
          <h3 className="kpi-section-title">Last 7 Days Averages</h3>
          <div className="kpi-section-cards">
            <div className="kpi-card primary">
              <div className="kpi-label">Team On Track</div>
              <div className="kpi-content-with-viz">
                <div className="kpi-value">{currentOnTrack}%</div>
                {onTrackTrendData.length >= 2 && (() => {
                  const dataPoints = onTrackTrendData.slice(-7);
                  const maxValue = Math.max(...dataPoints.map(p => p.onTrack), 1);
                  const minValue = Math.min(...dataPoints.map(p => p.onTrack), 0);
                  const range = maxValue - minValue || 1;
                  const sparkWidth = 440;
                  const sparkHeight = 30;
                  
                  return (
                    <div className="kpi-sparkline-container">
                      <svg className="kpi-sparkline" viewBox={`0 0 ${sparkWidth} ${sparkHeight}`} width={sparkWidth} height={sparkHeight}>
                        {dataPoints.map((point, idx) => {
                          if (idx === 0) return null;
                          const prevPoint = dataPoints[idx - 1];
                          const x = (idx / Math.max(dataPoints.length - 1, 1)) * sparkWidth;
                          const y = sparkHeight - ((point.onTrack - minValue) / range) * sparkHeight;
                          const prevX = ((idx - 1) / Math.max(dataPoints.length - 1, 1)) * sparkWidth;
                          const prevY = sparkHeight - ((prevPoint.onTrack - minValue) / range) * sparkHeight;
                          return (
                            <line
                              key={idx}
                              x1={prevX}
                              y1={prevY}
                              x2={x}
                              y2={y}
                              stroke={onTrackTrend.direction === 'up' ? '#4cec8c' : onTrackTrend.direction === 'down' ? '#fd8789' : '#999'}
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          );
                        })}
                      </svg>
                    </div>
                  );
                })()}
              </div>
              {onTrackTrendData.length >= 2 && (
                <div className={`kpi-trend ${onTrackTrend.direction}`}>
                  {onTrackTrend.direction === 'up' ? '↑' : onTrackTrend.direction === 'down' ? '↓' : '→'}
                  {onTrackTrend.change > 0 && ` ${onTrackTrend.change}%`}
                </div>
              )}
              <div className="kpi-subtitle">Last 7 days avg</div>
            </div>

            <div className="kpi-card primary">
              <div className="kpi-label">Wait Rate</div>
              <div className="kpi-content-with-viz">
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 700 }}>{avgResponseTimePct5Plus}%</span>
                  <span style={{ fontSize: '14px', color: '#666' }}>5+ min</span>
                </div>
                {responseTimeTrendData.length >= 2 && (() => {
                  const dataPoints = responseTimeTrendData.slice(-7);
                  const maxValue = Math.max(...dataPoints.map(p => p.percentage), 1);
                  const minValue = Math.min(...dataPoints.map(p => p.percentage), 0);
                  const range = maxValue - minValue || 1;
                  const sparkWidth = 440;
                  const sparkHeight = 30;
                  
                  return (
                    <div className="kpi-sparkline-container">
                      <svg className="kpi-sparkline" viewBox={`0 0 ${sparkWidth} ${sparkHeight}`} width={sparkWidth} height={sparkHeight}>
                        {dataPoints.map((point, idx) => {
                          if (idx === 0) return null;
                          const prevPoint = dataPoints[idx - 1];
                          const x = (idx / Math.max(dataPoints.length - 1, 1)) * sparkWidth;
                          const y = sparkHeight - ((point.percentage - minValue) / range) * sparkHeight;
                          const prevX = ((idx - 1) / Math.max(dataPoints.length - 1, 1)) * sparkWidth;
                          const prevY = sparkHeight - ((prevPoint.percentage - minValue) / range) * sparkHeight;
                          return (
                            <line
                              key={idx}
                              x1={prevX}
                              y1={prevY}
                              x2={x}
                              y2={y}
                              stroke="#35a1b4"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          );
                        })}
                      </svg>
                    </div>
                  );
                })()}
              </div>
              <div className="kpi-subtitle">Last 7 days avg</div>
            </div>

          </div>
        </div>
      </div>

      {/* Trend Charts */}
      <div className="overview-charts">
        <div className="trend-card">
          <div className="trend-header">
            <h4>On Track Trend</h4>
            <span className="trend-period">7 days</span>
          </div>
          {onTrackTrendWithMovingAvg.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={onTrackTrendWithMovingAvg} margin={{ top: 70, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="onTrackGradient" x1="0" y1="0" x2="0" y2="1">
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
                  label={{ value: 'On Track %', angle: -90, position: 'insideLeft', fill: '#666' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px'
                  }}
                  formatter={(value, name) => {
                    if (name === 'On Track %') return [`${value.toFixed(1)}%`, 'Daily On Track %'];
                    if (name === '3-Day Moving Avg') return [`${value.toFixed(1)}%`, '3-Day Moving Average'];
                    return [`${value.toFixed(1)}%`, name];
                  }}
                  labelFormatter={(value) => `Date: ${value}`}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="onTrack" 
                  stroke="#35a1b4" 
                  strokeWidth={2}
                  fill="url(#onTrackGradient)"
                  name="On Track %"
                  label={createHolidayLabel(onTrackTrendWithMovingAvg)}
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
              <p>No on-track data available</p>
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
                  <linearGradient id="responseGradient5Plus" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
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
                  label={{ value: 'Wait Rate %', angle: -90, position: 'insideLeft', fill: '#666' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px'
                  }}
                  formatter={(value, name) => {
                    if (name === '5+ Min Wait %') return [`${value.toFixed(1)}%`, 'Daily 5+ Min Wait %'];
                    if (name === '5+ Min Moving Avg') return [`${value.toFixed(1)}%`, '3-Day Moving Average'];
                    return [`${value.toFixed(1)}%`, name];
                  }}
                  labelFormatter={(value) => `Date: ${value}`}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="percentage5Plus" 
                  stroke="#fbbf24" 
                  strokeWidth={2}
                  fill="url(#responseGradient5Plus)"
                  name="5+ Min Wait %"
                  label={createHolidayLabel(responseTimeTrendWithMovingAvg, false, 'percentage5Plus')}
                />
                <Line 
                  type="monotone" 
                  dataKey="movingAvg5Plus" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="5+ Min Moving Avg"
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

        {/* On Track and Slow Response Trends Over Time */}
        {onTrackAndResponseTrendData.length > 0 && (
          <div className="trend-card">
            <div className="trend-header">
              <h4>On Track and Slow Response Trends Over Time</h4>
              <span className="trend-period">Last 7 days</span>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={onTrackAndResponseTrendData} margin={{ top: 30, right: 50, left: 50, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="displayLabel"
                  stroke="#666"
                  tick={{ fill: '#666', fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="#666"
                  tick={{ fill: '#666', fontSize: 11 }}
                  domain={[0, 100]}
                  label={{ value: 'On Track %', angle: -90, position: 'left', fill: '#666', offset: 10 }}
                  tickFormatter={(value) => value.toFixed(0)}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="#666"
                  tick={{ fill: '#666', fontSize: 11 }}
                  domain={[0, 'dataMax + 5']}
                  label={{ value: 'Slow Response Rate %', angle: 90, position: 'right', fill: '#666', offset: 10 }}
                  tickFormatter={(value) => value.toFixed(1)}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #35a1b4', borderRadius: '4px' }}
                  formatter={(value, name) => {
                    if (name === 'onTrack') return [`${value.toFixed(2)}%`, 'On Track'];
                    if (name === 'slowResponsePct') return [`${value.toFixed(2)}%`, 'Slow Response Rate'];
                    return [value, name];
                  }}
                  labelFormatter={(value) => {
                    // value is displayLabel like "1/13"
                    return value;
                  }}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="onTrack" 
                  stroke="#4cec8c" 
                  strokeWidth={3}
                  dot={{ fill: '#4cec8c', r: 4 }}
                  name="On Track %"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="slowResponsePct" 
                  stroke="#fd8789" 
                  strokeWidth={2}
                  dot={{ fill: '#fd8789', r: 3 }}
                  name="Slow Response Rate %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

    </div>
  );
}

// eslint-disable-next-line no-unused-vars
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
  const totalWaitingOnCustomerCount = waitingOnCustomer.length;
  const totalSnoozedCount = totalSnoozed.length;
  
  // Determine status - prioritize critical issues (error) over warnings
  let status;
  // Outstanding: 0 open and 0 waiting on TSE
  if (totalOpenCount === 0 && totalWaitingOnTSECount === 0) {
    status = "exceeding";
  }
  // Over Limit - Needs Attention: either >5 open OR >5 waiting on TSE
  // Check this BEFORE warning to prioritize critical issues
  else if (totalOpenCount > THRESHOLDS.MAX_OPEN_SOFT || totalWaitingOnTSECount > THRESHOLDS.MAX_WAITING_ON_TSE_SOFT) {
    status = "error";
  }
  // On Track: ≤5 open AND ≤5 waiting on TSE
  else if (totalOpenCount <= THRESHOLDS.MAX_OPEN_SOFT && totalWaitingOnTSECount <= THRESHOLDS.MAX_WAITING_ON_TSE_SOFT) {
    // Check for warning condition: Total Snoozed > Waiting On TSE + Waiting On Customer
    // This indicates snoozed conversations without proper tags
    if (totalSnoozedCount > (totalWaitingOnTSECount + totalWaitingOnCustomerCount)) {
      status = "warning";
    } else {
      status = "success";
    }
  }
  // Fallback (shouldn't reach here, but just in case)
  else {
    status = "error";
  }

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

  // Use shared date formatting utility
  const formatDate = formatDateTimeUTC;

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
                  {status === "warning" && (
                    <span 
                      className="tse-status-icon tse-warning-exclamation clickable-status-icon"
                      title={`Missing Snooze Tags - ${totalSnoozedCount} total snoozed, but only ${totalWaitingOnTSECount + totalWaitingOnCustomerCount} have proper tags. Please tag snoozed conversations with one of: Waiting On TSE, Waiting On Customer - Resolved, or Waiting On Customer - Unresolved.`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setClickedTooltip(clickedTooltip === 'status' ? null : 'status');
                      }}
                    >
                      ⚠
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
                            {status === "warning" ? "Missing Snooze Tags" : status === "exceeding" ? "Outstanding" : status === "success" ? "On Track" : "Over Limit - Needs Attention"}
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
                          {status === "warning" ? (
                            <>
                              <div className="tooltip-metric">
                                <strong>Total Snoozed:</strong> {totalSnoozedCount}
                              </div>
                              <div className="tooltip-metric">
                                <strong>Waiting On TSE:</strong> {totalWaitingOnTSECount}
                              </div>
                              <div className="tooltip-metric">
                                <strong>Waiting On Customer:</strong> {totalWaitingOnCustomerCount}
                              </div>
                              <div className="tooltip-metric">
                                <strong>Missing Tags:</strong> {totalSnoozedCount - (totalWaitingOnTSECount + totalWaitingOnCustomerCount)}
                              </div>
                              <div className="tooltip-note" style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fff9e6', borderRadius: '4px', fontSize: '12px', color: '#856404' }}>
                                Please tag all snoozed conversations with one of: Waiting On TSE, Waiting On Customer - Resolved, or Waiting On Customer - Unresolved.
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="tooltip-metric">
                                <strong>Open:</strong> {totalOpenCount} (target: ≤{THRESHOLDS.MAX_OPEN_SOFT})
                              </div>
                              <div className="tooltip-metric">
                                <strong>Waiting on TSE:</strong> {totalWaitingOnTSECount} (target: ≤{THRESHOLDS.MAX_WAITING_ON_TSE_SOFT})
                              </div>
                            </>
                          )}
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
            <div className={`modal-status-badge status-${status}`}>
              {status === "warning" && <span>⚠ Missing Snooze Tags</span>}
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
    
    // Get snoozed until timestamp
    const snoozedUntil = conv.snoozed_until || null;
    const snoozedUntilDate = snoozedUntil ? (typeof snoozedUntil === "number" ? new Date(snoozedUntil * 1000) : new Date(snoozedUntil)) : null;
    
    return {
      ...conv,
      id,
      authorEmail,
      state,
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
            <th style={{ width: columnWidths.tags, position: 'relative', minWidth: '50px' }}>
              Active Snooze Workflow
              <div 
                className="column-resizer"
                onMouseDown={(e) => handleMouseDown(e, 'tags')}
              />
            </th>
            <th style={{ width: columnWidths.email, position: 'relative', minWidth: '50px' }}>
              Email
              <div 
                className="column-resizer"
                onMouseDown={(e) => handleMouseDown(e, 'email')}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedConversations.map((conv) => {
            const id = conv.id;
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
            const isOpen = (conv.state || "open").toLowerCase() === "open" && conv.state !== "snoozed";
            
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
            
            const created = conv.created_at || conv.createdAt || conv.first_opened_at;
            const createdDateUTC = created ? formatTimestampUTC(created) : null;
            
            const updated = conv.updated_at || conv.last_contacted_at;
            const updatedDateUTC = updated ? formatTimestampUTC(updated) : null;
            
            const assigneeName = conv.admin_assignee?.name || 
                                (typeof conv.admin_assignee === "string" ? conv.admin_assignee : null) ||
                                "Unassigned";

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
                      Snoozed Until {formatTimestampUTC(conv.snoozedUntilDate)}
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
                <td className="tags-cell" style={{ width: columnWidths.tags, backgroundColor: workflowBackgroundColor }}>{displayTag}</td>
                <td style={{ width: columnWidths.email }}>{conv.authorEmail || "-"}</td>
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
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const modalBody = element.closest('.help-modal-body');
      if (modalBody) {
        const offset = 20;
        const elementPosition = element.getBoundingClientRect().top;
        const modalBodyPosition = modalBody.getBoundingClientRect().top;
        const offsetPosition = elementPosition + modalBody.scrollTop - modalBodyPosition - offset;
        
        modalBody.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }
  };

  const scrollToTop = () => {
    const modalBody = document.querySelector('.help-modal-body');
    if (modalBody) {
      modalBody.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content help-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header help-modal-header">
          <div className="help-header-content">
            <span className="help-header-icon">📚</span>
            <h2>User Guide</h2>
          </div>
          <button className="modal-close-button" onClick={onClose}>×</button>
        </div>
        <div className="modal-body help-modal-body">
          {/* Table of Contents */}
          <div className="help-toc">
            <h3 className="help-toc-title">📑 Table of Contents</h3>
            <div className="help-toc-links">
              {/* General Section */}
              <div className="help-toc-section">
                <div className="help-toc-section-title">General</div>
                <button onClick={() => scrollToSection('status-thresholds')} className="help-toc-link">📏 Status Thresholds</button>
                <button onClick={() => scrollToSection('alerts-system')} className="help-toc-link">🔔 Alerts System</button>
              </div>
              
              {/* Dashboard Section */}
              <div className="help-toc-section">
                <div className="help-toc-section-title">Dashboard</div>
                <button onClick={() => scrollToSection('overview-dashboard')} className="help-toc-link">📊 Overview Dashboard</button>
              </div>
              
              {/* TSE Queue Health Section */}
              <div className="help-toc-section">
                <div className="help-toc-section-title">TSE Queue Health</div>
                <button onClick={() => scrollToSection('tse-view')} className="help-toc-link">👥 TSE View</button>
                <button onClick={() => scrollToSection('tse-details-modal')} className="help-toc-link">🔍 TSE Details Modal</button>
              </div>
              
              {/* Intercom Data Section */}
              <div className="help-toc-section">
                <div className="help-toc-section-title">Intercom Data</div>
                <button onClick={() => scrollToSection('conversations-view')} className="help-toc-link">💬 Conversations</button>
              </div>
              
              {/* Analytics Section */}
              <div className="help-toc-section">
                <div className="help-toc-section-title">Analytics</div>
                <button onClick={() => scrollToSection('daily-on-track-trends')} className="help-toc-link">📊 Daily On Track Trends</button>
                <button onClick={() => scrollToSection('response-time-metrics')} className="help-toc-link">⏱️ Response Time Metrics</button>
                <button onClick={() => scrollToSection('impact')} className="help-toc-link">🔗 Impact</button>
              </div>
            </div>
          </div>

          {/* General Section */}
          <div className="help-section-divider">
            <h2 className="help-section-divider-title">General</h2>
          </div>

          {/* Status Thresholds Section */}
          <div id="status-thresholds" className="help-section">
            <div className="help-section-header">
              <span className="help-section-icon">📏</span>
              <h3>Status Thresholds</h3>
            </div>
            <p className="help-intro">Understanding how status is calculated and what each status means.</p>

            <div className="help-feature">
              <div className="help-feature-title">
                <span className="help-feature-icon">✅</span>
                <strong>On Track Calculation</strong>
              </div>
              <p><strong>Definition:</strong> A TSE is "on track" if they meet BOTH thresholds:</p>
              <ul>
                <li>Open conversations ≤ {THRESHOLDS.MAX_OPEN_SOFT}</li>
                <li>Waiting on TSE conversations ≤ {THRESHOLDS.MAX_WAITING_ON_TSE_SOFT}</li>
              </ul>
              <p><strong>Note:</strong> "Waiting on TSE" refers to conversations snoozed with tag "snooze.waiting-on-tse".</p>
            </div>

            <div className="help-feature">
              <div className="help-feature-title">
                <span className="help-feature-icon">⭐</span>
                <strong>Status Levels</strong>
              </div>
              <div className="help-status-grid">
                <div className="help-status-item">
                  <span className="help-status-badge status-exceeding">⭐️</span>
                  <div>
                    <strong>Outstanding</strong>
                    <p>0 open AND 0 waiting on TSE</p>
                    <p className="help-status-detail">Perfect performance - no active workload</p>
                  </div>
                </div>
                <div className="help-status-item">
                  <span className="help-status-badge status-success">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" fill="#4eec8d"/>
                      <path d="M9 12L11 14L15 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <div>
                    <strong>On Track</strong>
                    <p>≤{THRESHOLDS.MAX_OPEN_SOFT} open AND ≤{THRESHOLDS.MAX_WAITING_ON_TSE_SOFT} waiting</p>
                    <p className="help-status-detail">Within acceptable limits</p>
                  </div>
                </div>
                <div className="help-status-item">
                  <span className="help-status-badge status-error">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" fill="#fd8789"/>
                      <path d="M8 8L16 16M16 8L8 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <div>
                    <strong>Over Limit</strong>
                    <p>&gt;{THRESHOLDS.MAX_OPEN_SOFT} open OR &gt;{THRESHOLDS.MAX_WAITING_ON_TSE_SOFT} waiting</p>
                    <p className="help-status-detail">Needs attention - exceeds thresholds</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="help-feature">
              <div className="help-feature-title">
                <span className="help-feature-icon">🚨</span>
                <strong>Alert Thresholds</strong>
              </div>
              <p><strong>Open Chats Alert:</strong> Triggered at {THRESHOLDS.MAX_OPEN_ALERT}+ open conversations (soft limit: {THRESHOLDS.MAX_OPEN_SOFT})</p>
              <p><strong>Waiting On TSE Alert:</strong> Triggered at {THRESHOLDS.MAX_WAITING_ON_TSE_ALERT}+ waiting conversations (soft limit: {THRESHOLDS.MAX_WAITING_ON_TSE_SOFT})</p>
              <p><strong>Why Different:</strong> Soft limits indicate "On Track" status, alert limits trigger notifications for attention.</p>
            </div>
          </div>

          {/* Alerts Section */}
          <div id="alerts-system" className="help-section">
            <div className="help-section-header">
              <span className="help-section-icon">🔔</span>
              <h3>Alerts System</h3>
            </div>
            <p className="help-intro">Stay informed about TSEs exceeding status thresholds with real-time alerts.</p>

            <div className="help-feature">
              <div className="help-feature-title">
                <span className="help-feature-icon">🔔</span>
                <strong>Alert Dropdown</strong>
              </div>
              <p><strong>Access:</strong> Click the bell icon (🔔) in the header.</p>
              <p><strong>What:</strong> Shows count of active alerts. Badge displays total alert count.</p>
            </div>

            <div className="help-feature">
              <div className="help-feature-title">
                <span className="help-feature-icon">⚠️</span>
                <strong>Alert Types</strong>
              </div>
              <p><strong>Open Chat Alerts:</strong> Triggered when TSE has {THRESHOLDS.MAX_OPEN_ALERT}+ open conversations.</p>
              <p><strong>Waiting On TSE Alerts:</strong> Triggered when TSE has {THRESHOLDS.MAX_WAITING_ON_TSE_ALERT}+ conversations waiting on them.</p>
              <p><strong>Severity:</strong> High (🔴) or Medium (🟡) based on how far over threshold.</p>
            </div>
          </div>

          {/* Dashboard Section */}
          <div className="help-section-divider">
            <h2 className="help-section-divider-title">Dashboard</h2>
          </div>

          {/* Overview Dashboard Section */}
          <div id="overview-dashboard" className="help-section">
            <div className="help-section-header">
              <span className="help-section-icon">📊</span>
              <h3>Overview</h3>
            </div>
            <p className="help-intro">The Dashboard provides real-time metrics and insights at a glance. All cards are clickable and navigate to filtered views.</p>
            
            <div className="help-feature">
              <div className="help-feature-title">
                <span className="help-feature-icon">🎯</span>
                <strong>KPI Cards</strong>
              </div>
              <p><strong>What:</strong> Two sections of metric cards showing real-time and historical averages.</p>
              <p><strong>Today / Realtime Metrics Section:</strong></p>
              <ul>
                <li><strong>Realtime On Track</strong> (primary card) - Current snapshot on-track percentage</li>
                <li><strong>Wait Rate</strong> (primary card) - Most recent day's percentage for 5+ minute wait times with trend indicator (improving ↓, worsening ↑, stable →)</li>
                <li><strong>OPEN CHATS</strong> (clickable card) - Total active, non-snoozed conversations. Click to navigate to Conversations View filtered to open chats</li>
                <li><strong>SNOOZED</strong> (clickable card) - Combined card showing three rows:
                  <ul>
                    <li><strong>Waiting on TSE</strong> - Conversations snoozed with tag "snooze.waiting-on-tse"</li>
                    <li><strong>Waiting On Customer - Resolved</strong> - Resolved conversations with "snooze.waiting-on-customer-resolved" tag</li>
                    <li><strong>Waiting On Customer - Unresolved</strong> - Unresolved conversations with "snooze.waiting-on-customer-unresolved" tag</li>
                  </ul>
                  Click to navigate to Conversations View filtered to all snoozed conversations
                </li>
              </ul>
              <p><strong>Last 7 Days Averages Section:</strong></p>
              <ul>
                <li><strong>Team On Track</strong> (primary card) - Average on-track percentage over last 7 days with trend indicator</li>
                <li><strong>Wait Rate</strong> (primary card) - Average percentage of conversations with 5+ minute wait times over last 7 days</li>
              </ul>
              <p><strong>How:</strong> Real-time metrics calculated from current conversation data. Historical averages calculated from daily snapshots and response time metrics.</p>
              <p><strong>Why:</strong> Quick visibility into current state and recent trends. Clickable cards enable rapid navigation to detailed views.</p>
            </div>

            <div className="help-feature">
              <div className="help-feature-title">
                <span className="help-feature-icon">🌍</span>
                <strong>Region On Track</strong>
              </div>
              <p><strong>What:</strong> On-track percentages by region (UK, NY, SF) with region icons.</p>
              <p><strong>How:</strong> Calculated from the most recent historical snapshot. For each region:</p>
              <ul>
                <li>Counts TSEs meeting both thresholds: ≤{THRESHOLDS.MAX_OPEN_SOFT} open chats AND ≤{THRESHOLDS.MAX_WAITING_ON_TSE_SOFT} waiting on TSE</li>
                <li>On Track % = (On Track TSEs / Total TSEs) × 100</li>
                <li>Color-coded: Green (≥80%), Yellow (60-79%), Red (&lt;60%)</li>
              </ul>
              <p><strong>Why:</strong> Identifies regional performance patterns.</p>
            </div>

            <div className="help-feature">
              <div className="help-feature-title">
                <span className="help-feature-icon">🔔</span>
                <strong>Active Alerts Card</strong>
              </div>
              <p><strong>What:</strong> Summary of TSEs exceeding alert thresholds. Clickable card.</p>
              <p><strong>How:</strong> Counts alerts for:</p>
              <ul>
                <li>Open chats ({THRESHOLDS.MAX_OPEN_ALERT}+)</li>
                <li>Snoozed - Waiting On TSE ({THRESHOLDS.MAX_WAITING_ON_TSE_ALERT}+)</li>
              </ul>
              <p><strong>Why:</strong> Quick identification of TSEs needing immediate attention. Click to navigate to TSE View filtered to over-limit TSEs only.</p>
            </div>

            <div className="help-feature">
              <div className="help-feature-title">
                <span className="help-feature-icon">📈</span>
                <strong>On Track Trend Chart</strong>
              </div>
              <p><strong>What:</strong> Area chart showing on-track percentage over the last 7 days with 3-day moving average line.</p>
              <p><strong>Features:</strong></p>
              <ul>
                <li>Area chart with gradient fill (blue)</li>
                <li>Dashed green line showing 3-day moving average</li>
                <li>Holiday indicators (icons) mark holidays that may affect metrics</li>
                <li>Tooltips show exact on-track percentage for each day</li>
              </ul>
              <p><strong>How:</strong> Uses historical snapshots. Each data point represents daily on-track percentage calculated from all TSEs in that snapshot.</p>
              <p><strong>Why:</strong> Visualizes trends to identify improving or declining performance patterns. Moving average smooths out daily fluctuations.</p>
            </div>

            <div className="help-feature">
              <div className="help-feature-title">
                <span className="help-feature-icon">⏱️</span>
                <strong>Response Time Trend Chart</strong>
              </div>
              <p><strong>What:</strong> Area chart showing percentage of conversations with 5+ minute first response times over the last 7 days with 3-day moving average line.</p>
              <p><strong>Features:</strong></p>
              <ul>
                <li>Area chart with gradient fill (red/coral)</li>
                <li>Dashed orange line showing 3-day moving average</li>
                <li>Holiday indicators (icons) mark holidays that may affect metrics</li>
                <li>Tooltips show exact percentage for each day</li>
              </ul>
              <p><strong>How:</strong> Calculated from response time metrics captured daily at midnight UTC.</p>
              <p><strong>Why:</strong> Tracks customer experience quality trends. Lower percentages indicate faster response times. Moving average helps identify underlying trends.</p>
            </div>

            <div className="help-feature">
              <div className="help-feature-title">
                <span className="help-feature-icon">📊</span>
                <strong>On Track and Slow Response Trends Over Time Chart</strong>
              </div>
              <p><strong>What:</strong> Dual-axis line chart showing both on-track percentage (left axis, green line) and slow response rate percentage (right axis, red line) over all available historical data.</p>
              <p><strong>Features:</strong></p>
              <ul>
                <li>Green line with circular markers showing On Track % (left Y-axis)</li>
                <li>Red line with circular markers showing Slow Response Rate % (right Y-axis)</li>
                <li>Displays all available historical data (not limited to 7 days)</li>
                <li>Tooltips show exact values for both metrics on each day</li>
                <li>Holiday indicators (icons) mark holidays that may affect metrics</li>
              </ul>
              <p><strong>How:</strong> Combines on-track data from daily snapshots with response time metrics from the same dates. Shows the relationship between queue health (on-track status) and customer experience (response times).</p>
              <p><strong>Why:</strong> Visualizes the correlation between maintaining on-track status and response time performance. Helps identify if better queue management leads to faster customer responses.</p>
            </div>

            <div className="help-feature">
              <div className="help-feature-title">
                <span className="help-feature-icon">📐</span>
                <strong>Chart Layout</strong>
              </div>
              <p><strong>What:</strong> The three trend charts (On Track Trend, Response Time Trend, and On Track and Slow Response Trends Over Time) are displayed in equal-width columns on the same row.</p>
              <p><strong>Layout:</strong> Each chart takes up one-third of the page width, providing a balanced view of all trend metrics side-by-side.</p>
              <p><strong>Responsive:</strong> On smaller screens, charts automatically adjust to 2 columns or a single column layout for optimal viewing.</p>
            </div>
          </div>

          {/* TSE Queue Health Section */}
          <div className="help-section-divider">
            <h2 className="help-section-divider-title">TSE Queue Health</h2>
          </div>

          {/* TSE View Section */}
          <div id="tse-view" className="help-section">
            <div className="help-section-header">
              <span className="help-section-icon">👥</span>
              <h3>TSE View</h3>
            </div>
            <p className="help-intro">Monitor individual TSE performance with detailed metrics and filtering options.</p>

            <div className="help-feature">
              <div className="help-feature-title">
                <span className="help-feature-icon">⭐</span>
                <strong>TSE Status Indicators</strong>
              </div>
              <p><strong>Status Levels:</strong></p>
              <ul>
                <li>
                  <strong>
                    <span className="help-status-icon-inline status-exceeding">⭐️</span>
                    Outstanding
                  </strong> - 0 open chats AND 0 waiting on TSE. Purple badge with gold star icon.
                </li>
                <li>
                  <strong>
                    <span className="help-status-icon-inline status-success">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" fill="#4eec8d"/>
                        <path d="M9 12L11 14L15 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    On Track
                  </strong> - ≤{THRESHOLDS.MAX_OPEN_SOFT} open chats AND ≤{THRESHOLDS.MAX_WAITING_ON_TSE_SOFT} waiting on TSE. Green badge with checkmark.
                </li>
                <li>
                  <strong>
                    <span className="help-status-icon-inline status-error">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" fill="#fd8789"/>
                        <path d="M8 8L16 16M16 8L8 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    Over Limit - Needs Attention
                  </strong> - &gt;{THRESHOLDS.MAX_OPEN_SOFT} open chats OR &gt;{THRESHOLDS.MAX_WAITING_ON_TSE_SOFT} waiting on TSE. Red badge with X icon.
                </li>
              </ul>
              <p><strong>Tooltips:</strong> Hover or click status icons to see detailed counts and thresholds.</p>
            </div>

            <div className="help-feature">
              <div className="help-feature-title">
                <span className="help-feature-icon">🎴</span>
                <strong>TSE Cards</strong>
              </div>
              <p><strong>What:</strong> Individual cards for each TSE showing their current status and metrics.</p>
              <p><strong>Contains:</strong></p>
              <ul>
                <li>TSE name with status icon</li>
                <li>Avatar (if available)</li>
                <li>Away mode indicator (🌙) if enabled</li>
                <li>Open chats count</li>
                <li>Waiting on TSE count</li>
                <li>Waiting on Customer count</li>
                <li>Total snoozed count</li>
              </ul>
              <p><strong>Interaction:</strong> Click any TSE card to open detailed modal with conversation breakdown.</p>
            </div>

            <div className="help-feature">
              <div className="help-feature-title">
                <span className="help-feature-icon">🔍</span>
                <strong>Filters</strong>
              </div>
              <p><strong>Region Filters:</strong> Checkboxes to filter by 
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', margin: '0 4px' }}>
                  <img src={REGION_ICONS['UK']} alt="UK" style={{ width: '16px', height: '16px', verticalAlign: 'middle' }} />
                  UK
                </span>, 
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', margin: '0 4px' }}>
                  <img src={REGION_ICONS['NY']} alt="NY" style={{ width: '16px', height: '16px', verticalAlign: 'middle' }} />
                  NY
                </span>, 
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', margin: '0 4px' }}>
                  <img src={REGION_ICONS['SF']} alt="SF" style={{ width: '16px', height: '16px', verticalAlign: 'middle' }} />
                  SF
                </span>, or Other. Click region icons to select/deselect.</p>
              <p><strong>Status Filters:</strong> Color-coded buttons to filter by status (Outstanding, On Track, Over Limit).</p>
              <p><strong>How:</strong> Filters combine - selected regions AND selected statuses.</p>
            </div>

            <div className="help-feature">
              <div className="help-feature-title">
                <span className="help-feature-icon">🔥</span>
                <strong>Outstanding Performance Streaks</strong>
              </div>
              <p><strong>What:</strong> TSEs with 3+ consecutive days of Outstanding status (0 open, 0 waiting on TSE).</p>
              <p><strong>How:</strong> Analyzes historical snapshots to find consecutive Outstanding days. Streaks are calculated backwards from the most recent date. Tiebreakers: (1) Longer streaks, (2) Total outstanding days in history.</p>
              <p><strong>Why:</strong> Recognizes consistent excellence and motivates continued performance. Click any TSE avatar to view their details.</p>
              <p><strong>Filtering:</strong> Use region buttons (All Regions, UK, NY, SF) to filter by location.</p>
            </div>
          </div>

          {/* TSE Details Modal Section */}
          <div id="tse-details-modal" className="help-section">
            <div className="help-section-header">
              <span className="help-section-icon">🔍</span>
              <h3>TSE Details Modal</h3>
            </div>
            <p className="help-intro">Detailed breakdown of a specific TSE's conversations and performance metrics. Accessed by clicking on a TSE card in the TSE View.</p>

            <div className="help-feature">
              <div className="help-feature-title">
                <span className="help-feature-icon">📊</span>
                <strong>Header Information</strong>
              </div>
              <p><strong>Contains:</strong> TSE name, region, status badge with icon, away mode indicator (if enabled).</p>
              <p><strong>Status Tooltip:</strong> Click status icon to see detailed breakdown of open/waiting counts vs thresholds.</p>
            </div>

            <div className="help-feature">
              <div className="help-feature-title">
                <span className="help-feature-icon">💬</span>
                <strong>Conversation Breakdown</strong>
              </div>
              <p><strong>Sections:</strong></p>
              <ul>
                <li><strong>Open Conversations</strong> - Active, non-snoozed conversations</li>
                <li><strong>Waiting On TSE</strong> - Snoozed with "snooze.waiting-on-tse" tag</li>
                <li><strong>Waiting On Customer</strong> - Snoozed with "snooze.waiting-on-customer" tag</li>
                <li><strong>Total Snoozed</strong> - All snoozed conversations</li>
              </ul>
              <p><strong>Interaction:</strong> Click conversation IDs to open in Intercom.</p>
            </div>

            <div className="help-feature">
              <div className="help-feature-title">
                <span className="help-feature-icon">📈</span>
                <strong>Metrics Display</strong>
              </div>
              <p><strong>Shows:</strong> Counts for each conversation type with color-coded badges matching status levels.</p>
            </div>
          </div>

          {/* Intercom Data Section */}
          <div className="help-section-divider">
            <h2 className="help-section-divider-title">Intercom Data</h2>
          </div>

          {/* Conversations View Section */}
          <div id="conversations-view" className="help-section">
            <div className="help-section-header">
              <span className="help-section-icon">💬</span>
              <h3>Conversations</h3>
            </div>
            <p className="help-intro">Browse, search, and filter all conversations with advanced filtering options.</p>

            <div className="help-feature">
              <div className="help-feature-title">
                <span className="help-feature-icon">🔽</span>
                <strong>Snooze Type Filter</strong>
              </div>
              <p><strong>Options:</strong></p>
              <ul>
                <li><strong>All Conversations</strong> - Shows all open and snoozed conversations</li>
                <li><strong>All Snoozed</strong> - All snoozed conversations regardless of tag</li>
                <li><strong>Snoozed - Waiting On TSE</strong> - Conversations with "snooze.waiting-on-tse" tag</li>
                <li><strong>Snoozed - Waiting On Customer</strong> - All conversations with "snooze.waiting-on-customer" tag</li>
                <li><strong>Waiting On Customer - Resolved</strong> - Resolved conversations waiting on customer</li>
                <li><strong>Waiting On Customer - Unresolved</strong> - Unresolved conversations waiting on customer</li>
              </ul>
            </div>

            <div className="help-feature">
              <div className="help-feature-title">
                <span className="help-feature-icon">👤</span>
                <strong>TSE Filter</strong>
              </div>
              <p><strong>Options:</strong> All TSEs, Unassigned, or filter by specific TSE (grouped by region).</p>
              <p><strong>Why:</strong> Focus on conversations for specific team members or unassigned conversations.</p>
            </div>

            <div className="help-feature">
              <div className="help-feature-title">
                <span className="help-feature-icon">🔎</span>
                <strong>Search by ID</strong>
              </div>
              <p><strong>What:</strong> Text input to search for specific conversation IDs.</p>
              <p><strong>How:</strong> Filters conversations matching the entered ID.</p>
            </div>

            <div className="help-feature">
              <div className="help-feature-title">
                <span className="help-feature-icon">📋</span>
                <strong>Conversation Table</strong>
              </div>
              <p><strong>Columns:</strong> Conversation ID (clickable to Intercom), Assignee, State, Snooze tags, Last updated.</p>
              <p><strong>Interaction:</strong> Click conversation IDs to open in Intercom in a new tab.</p>
            </div>

            <div className="help-feature">
              <div className="help-feature-title">
                <span className="help-feature-icon">⚡</span>
                <strong>Quick Filter Buttons</strong>
              </div>
              <p><strong>Buttons:</strong> Show Unassigned, Show Snoozed, Show Open, Clear (resets all filters).</p>
            </div>
          </div>

          {/* Analytics Section */}
          <div className="help-section-divider">
            <h2 className="help-section-divider-title">TRENDS & INSIGHTS</h2>
          </div>

          {/* Historical View Section */}
          <div id="historical-view" className="help-section">
            <div className="help-section-header">
              <span className="help-section-icon">📈</span>
              <h3>ANALYTICS</h3>
            </div>
            <p className="help-intro">Analyze trends, patterns, and correlations over time with three specialized tabs.</p>

            <div id="daily-on-track-trends" className="help-feature">
              <div className="help-feature-title">
                <span className="help-feature-icon">📊</span>
                <strong>Daily On Track Trends Tab</strong>
              </div>
              <p><strong>What:</strong> Comprehensive analysis of on-track trends for selected TSEs over time with multiple visualizations and insights.</p>
              <p><strong>Features:</strong></p>
              <ul>
                <li><strong>Date Range Selector:</strong> Yesterday, Last 7 Weekdays, Last 30 Days, Last 90 Days, or Custom Range</li>
                <li><strong>TSE Filter:</strong> Select specific TSEs by region (UK, NY, SF, Other) with expandable checkboxes</li>
                <li><strong>Summary Cards:</strong> Three cards showing average Overall On Track, Open On Track, and Snoozed On Track percentages</li>
                <li><strong>On Track Chart:</strong> Multi-line graph showing three trends: Overall On Track (green), Open On Track (blue), and Snoozed On Track (orange) over time</li>
                <li><strong>Insights Section:</strong>
                  <ul>
                    <li><strong>Trend Analysis:</strong> Compares first half vs second half of selected period with trend indicator (improving/declining/stable) and volatility metric</li>
                    <li><strong>Best/Worst Days:</strong> Highlights the day with highest and lowest on-track, showing breakdown by Open and Snoozed on-track</li>
                  </ul>
                </li>
                <li><strong>Day-of-Week Analysis:</strong> Bar chart showing average on-track patterns by weekday (Monday through Friday)</li>
                <li><strong>Region Comparison:</strong> Bar chart comparing average on-track across regions (UK, NY, SF)</li>
                <li><strong>TSE Average On Track:</strong> Horizontal bar chart showing individual TSE average on-track over the selected period, sorted by performance</li>
                <li><strong>Detailed Table:</strong> Expandable rows showing daily on-track metrics (Overall, Open, Snoozed), TSE counts, open counts, and waiting on TSE counts. Sortable by date, TSE count, or any on-track metric</li>
                <li><strong>Holiday Indicators:</strong> Icons mark holidays on the chart that may affect metrics</li>
              </ul>
              <p><strong>How On Track is Calculated:</strong> For each day, counts TSEs meeting both thresholds (≤{THRESHOLDS.MAX_OPEN_SOFT} open AND ≤{THRESHOLDS.MAX_WAITING_ON_TSE_SOFT} waiting on TSE), then calculates percentage. Separate calculations for Overall (both thresholds), Open (open threshold only), and Snoozed (waiting on TSE threshold only) on-track.</p>
              <p><strong>Why:</strong> Identifies trends, patterns, and helps understand what drives on-track changes. The multiple visualizations provide different perspectives: time trends, day patterns, regional differences, and individual TSE performance.</p>
            </div>

            <div id="response-time-metrics" className="help-feature">
              <div className="help-feature-title">
                <span className="help-feature-icon">⏱️</span>
                <strong>Response Time Metrics Tab</strong>
              </div>
              <p><strong>What:</strong> Comprehensive analysis of first response times, focusing on conversations with 5+ minute wait times, including trends, patterns, and correlations.</p>
              <p><strong>Features:</strong></p>
              <ul>
                <li><strong>Date Range Selector:</strong> Yesterday, Last 7 Weekdays, Last 30 Days, Last 90 Days, or Custom Range</li>
                <li><strong>TSE Filter:</strong> Select specific TSEs by region (UK, NY, SF, Other) with expandable checkboxes</li>
                <li><strong>Data Collection Banner:</strong> Information banner explaining that data is automatically collected nightly after all shifts complete</li>
                <li><strong>Summary Cards:</strong> Three cards showing:
                  <ul>
                    <li><strong>Avg % Wait Time:</strong> Average percentage for 5+ minute wait times with trend indicator (improving/declining/stable) showing change from previous period</li>
                    <li><strong>Total Conversations:</strong> Sum of all conversations across selected date range</li>
                    <li><strong>Total Waits:</strong> Total count of conversations with 5+ minute wait times</li>
                  </ul>
                </li>
                <li><strong>Percentage Chart:</strong> Line chart showing daily percentage of conversations with 5+ minute wait times over time, with holiday indicators</li>
                <li><strong>Count Chart:</strong> Bar chart showing daily count of conversations with 5+ minute wait times, with holiday indicators</li>
                <li><strong>Insights Section:</strong>
                  <ul>
                    <li><strong>Trend Analysis:</strong> Compares first half vs second half of selected period with trend indicator (improving/declining/stable), volatility metric, and 7-day moving average</li>
                    <li><strong>Period Comparison:</strong> Compares Previous 7 Days vs Current 7 Days with all-time average and comparison to all-time performance</li>
                    <li><strong>Best/Worst Days:</strong> Highlights the day with lowest percentage (best) and highest percentage (worst), showing breakdown of slow count vs total conversations</li>
                  </ul>
                </li>
                <li><strong>Day-of-Week Analysis:</strong> Dual-axis bar chart showing both average percentage and average count of slow conversations by weekday (Monday through Friday)</li>
                <li><strong>Volume vs Performance Correlation:</strong> Scatter chart analyzing correlation between total conversation volume and response time performance, with correlation coefficient and interpretation (weak/moderate/strong, positive/negative)</li>
                <li><strong>Detailed Table:</strong> Sortable table with expandable rows showing:
                  <ul>
                    <li>Date, Total Conversations, 5+ Min Waits count, 5+ Min %</li>
                    <li>Expandable rows reveal individual conversation IDs with their wait times</li>
                    <li>Sortable by date, total conversations, count, or percentage</li>
                  </ul>
                </li>
                <li><strong>Holiday Indicators:</strong> Icons mark holidays on charts that may affect metrics</li>
              </ul>
              <p><strong>How:</strong> Metrics are automatically collected nightly after all shifts have completed, analyzing metrics from the most recently completed business day. Calculates percentage of conversations with first response time ≥5 minutes. Data collection happens via scheduled cron jobs.</p>
              <p><strong>Why:</strong> Tracks customer experience quality and identifies patterns. Lower percentages indicate faster response times and better service. The correlation analysis helps understand if volume impacts response time performance.</p>
            </div>

            <div id="impact" className="help-feature">
              <div className="help-feature-title">
                <span className="help-feature-icon">🔗</span>
                <strong>Impact Tab</strong>
              </div>
              <p><strong>What:</strong> Comprehensive correlation analysis between on-track status and slow first response times, showing how maintaining on-track status affects customer experience metrics.</p>
              <p><strong>Features:</strong></p>
              <ul>
                <li><strong>Date Range Selector:</strong> Yesterday, Last 7 Weekdays, Last 30 Days, Last 90 Days, or Custom Range (shared with other tabs)</li>
                <li><strong>Key Insights Section:</strong>
                  <ul>
                    <li><strong>Correlation Analysis Card:</strong> Displays correlation coefficient value, strength (Weak &lt;0.3, Moderate 0.3-0.7, Strong &gt;0.7), direction (Positive/Negative), and interpretation. Color-coded: green for desired (negative correlation), red for concerning (positive correlation)</li>
                    <li><strong>Overall Averages Card:</strong> Shows average on-track percentage, average slow response rate percentage, and total number of data points (days) in the analysis</li>
                  </ul>
                </li>
                <li><strong>Scatter Plot:</strong> Visual representation of on-track percentage vs slow response rate percentage. Each point represents one day's data, allowing visual identification of patterns and outliers</li>
                <li><strong>Performance by On Track Range:</strong> Three range cards showing statistics for different on-track levels:
                  <ul>
                    <li>Each card displays: on-track range label, number of days in range, average on-track, average slow response rate, total slow responses, and total conversations</li>
                    <li>Color-coded borders (green/yellow/red) indicate performance levels</li>
                  </ul>
                </li>
                <li><strong>Trend Over Time Chart:</strong> Dual-axis line chart showing both on-track percentage (left axis, green line) and slow response rate percentage (right axis, red line) over the selected time period. Helps visualize how both metrics change together over time</li>
              </ul>
              <p><strong>How:</strong> Combines on-track data from daily snapshots with response time metrics from the same dates. Calculates Pearson correlation coefficient to measure the linear relationship between on-track status and slow response rates. Groups data into on-track ranges for detailed analysis.</p>
              <p><strong>Why:</strong> Understands if maintaining on-track status helps or hurts response times. Negative correlation (higher on-track → lower slow responses) is the desired outcome, indicating that better queue management leads to faster customer responses. Positive correlation would be concerning as it suggests on-track efforts might be slowing down response times.</p>
            </div>
          </div>

          {/* Back to Top Button */}
          <button className="help-back-to-top" onClick={scrollToTop} aria-label="Back to top">
            ↑ Back to Top
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

