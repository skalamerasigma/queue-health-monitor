import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import './HistoricalView.css';

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
    const parts = dateStr.split('/');
    month = parseInt(parts[0], 10);
    day = parseInt(parts[1], 10);
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
// Only renders on the first line (dataKey='overallCompliance') to avoid duplicates for multi-line charts
// For single-line charts, renders on that line
// Positions icon above the highest data point across all series
const createHolidayLabel = (data, isBarChart = false, dataKey = null) => (props) => {
  const { x, y, index, width } = props;
  if (index === undefined || !data || !data[index]) return null;
  
  // For multi-line charts (compliance trends), only render on overallCompliance line
  // For single-line charts (response time), render on that line
  if (dataKey && dataKey !== 'overallCompliance' && dataKey !== 'percentage10PlusMin' && dataKey !== 'count10PlusMin') return null;
  
  const dataPoint = data[index];
  const dateStr = dataPoint.date || dataPoint.displayLabel;
  
  const iconUrl = getHolidayIcon(dateStr);
  if (!iconUrl) return null;
  
  // For multi-line charts, find the highest value across all data series
  // For single-line charts, use the current line's value
  let maxValue;
  let finalY;
  
  if (dataPoint.overallCompliance !== undefined) {
    // Multi-line chart (compliance trends)
    maxValue = Math.max(
      dataPoint.overallCompliance || 0,
      dataPoint.openCompliance || 0,
      dataPoint.snoozedCompliance || 0
    );
    
    // Calculate the y position for the highest value
    // Chart height is 400px, margin top is 70px, so usable height is ~330px
    const chartUsableHeight = 330;
    const marginTop = 70;
    const maxValueY = marginTop + (chartUsableHeight - (maxValue / 100) * chartUsableHeight);
    finalY = maxValueY > 0 && maxValueY < 450 ? maxValueY : y;
  } else {
    // Single-line chart (response time)
    finalY = y;
  }
  
  // For bar charts, center the icon horizontally within the bar
  // For line/area charts, center on the data point
  const iconX = isBarChart && width ? (x + width / 2 - 15) : (x - 15);
  
  return (
    <g>
      <image
        href={iconUrl}
        x={iconX}
        y={finalY - 60}
        width="30"
        height="30"
      />
    </g>
  );
};

const THRESHOLDS = {
  MAX_OPEN_SOFT: 5,
  MAX_ACTIONABLE_SNOOZED_SOFT: 5
};

function HistoricalView({ onSaveSnapshot, refreshTrigger }) {
  const [snapshots, setSnapshots] = useState([]);
  const [responseTimeMetrics, setResponseTimeMetrics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [selectedTSEs, setSelectedTSEs] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateRange, setDateRange] = useState('7days');
  const [availableTSEs, setAvailableTSEs] = useState([]);
  const [activeTab, setActiveTab] = useState('compliance'); // 'compliance' or 'response-time'
  const [expandedDates, setExpandedDates] = useState(new Set());
  const [expandedResponseTimeDates, setExpandedResponseTimeDates] = useState(new Set());
  const [complianceSortConfig, setComplianceSortConfig] = useState({ key: null, direction: 'asc' });
  const [responseTimeSortConfig, setResponseTimeSortConfig] = useState({ key: null, direction: 'asc' });
  const [expandedRegions, setExpandedRegions] = useState(new Set()); // All collapsed by default
  const [hasManuallyCleared, setHasManuallyCleared] = useState(false); // Track if user manually cleared selection

  // Calculate default date range (last 7 weekdays)
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

  useEffect(() => {
    const defaultDates = getLast7Weekdays();
    if (defaultDates.length > 0) {
      setStartDate(defaultDates[0]);
      setEndDate(defaultDates[defaultDates.length - 1]);
    }
  }, []);

  useEffect(() => {
    fetchSnapshots();
  }, [startDate, endDate]); // Removed selectedTSEs - we always fetch all snapshots

  useEffect(() => {
    fetchResponseTimeMetrics();
  }, [startDate, endDate]);

  // Refresh data when refreshTrigger changes (for auto-refresh)
  // This ensures all data refreshes when conversations are auto-refreshed
  useEffect(() => {
    // Only refresh if refreshTrigger exists (not on initial mount)
    // This will refresh both snapshots and response time metrics
    if (refreshTrigger) {
      console.log('HistoricalView: Auto-refresh triggered, refreshing snapshots and response time metrics');
      fetchSnapshots();
      fetchResponseTimeMetrics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  useEffect(() => {
    // Extract unique TSEs from snapshots, excluding Prerit Sachdeva
    const EXCLUDED_TSE_NAMES = ["Prerit Sachdeva"];
    const tseSet = new Set();
    snapshots.forEach(snapshot => {
      snapshot.tseData?.forEach(tse => {
        // Skip excluded TSEs
        if (!EXCLUDED_TSE_NAMES.includes(tse.name)) {
          tseSet.add(JSON.stringify({ id: tse.id, name: tse.name }));
        }
      });
    });
    const newAvailableTSEs = Array.from(tseSet).map(s => JSON.parse(s));
    setAvailableTSEs(newAvailableTSEs);
  }, [snapshots]);

  // Select all TSEs by default when they first become available (only if not manually cleared)
  // Use a ref to track if we've already done the initial selection
  const hasInitialSelectionRef = useRef(false);
  const hasManuallyClearedRef = useRef(false);
  
  // Keep ref in sync with state
  useEffect(() => {
    hasManuallyClearedRef.current = hasManuallyCleared;
  }, [hasManuallyCleared]);
  
  useEffect(() => {
    // Only auto-select if:
    // 1. We have TSEs available
    // 2. We haven't done the initial selection yet
    // 3. selectedTSEs is empty (user hasn't selected anything)
    // 4. User hasn't manually cleared the selection (check ref for immediate value)
    if (
      availableTSEs.length > 0 && 
      !hasInitialSelectionRef.current && 
      selectedTSEs.length === 0 &&
      !hasManuallyClearedRef.current
    ) {
      setSelectedTSEs(availableTSEs.map(tse => String(tse.id)));
      hasInitialSelectionRef.current = true;
    }
  }, [availableTSEs.length, selectedTSEs.length]);

  // Group TSEs by region
  const tseByRegion = useMemo(() => {
    const grouped = { 'UK': [], 'NY': [], 'SF': [], 'Other': [] };
    availableTSEs.forEach(tse => {
      const region = getTSERegion(tse.name);
      grouped[region].push(tse);
    });
    // Sort TSEs within each region
    Object.keys(grouped).forEach(region => {
      grouped[region].sort((a, b) => a.name.localeCompare(b.name));
    });
    return grouped;
  }, [availableTSEs]);

  const toggleRegion = (region) => {
    const newExpanded = new Set(expandedRegions);
    if (newExpanded.has(region)) {
      newExpanded.delete(region);
    } else {
      newExpanded.add(region);
    }
    setExpandedRegions(newExpanded);
  };

  const fetchSnapshots = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      // Removed selectedTSEs filtering - we always fetch all snapshots
      // The filtering happens in the useMemo hooks for chart calculations

      // In development, use production API URL since local dev server doesn't have API routes
      const url = process.env.NODE_ENV === 'production'
        ? `${window.location.origin}/api/snapshots/get?${params}`
        : `https://queue-health-monitor.vercel.app/api/snapshots/get?${params}`;

      console.log('HistoricalView: Fetching snapshots from:', url);
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        console.log('HistoricalView: Received snapshots:', data.snapshots?.length || 0);
        setSnapshots(data.snapshots || []);
      } else {
        const errorText = await res.text();
        console.error('Error fetching snapshots:', res.status, errorText);
      }
    } catch (error) {
      console.error('Error fetching snapshots:', error);
      // Silently fail in development - historical data is optional
      setSnapshots([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchResponseTimeMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const params = new URLSearchParams();
      if (startDate) {
        params.append('startDate', startDate);
      }
      if (endDate) {
        params.append('endDate', endDate);
      }

      // In development, use production API URL since local dev server doesn't have API routes
      const url = process.env.NODE_ENV === 'production'
        ? `${window.location.origin}/api/response-time-metrics/get?${params}`
        : `https://queue-health-monitor.vercel.app/api/response-time-metrics/get?${params}`;

      console.log('HistoricalView: Fetching response time metrics from:', url);
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        console.log('HistoricalView: Received response time metrics:', data.metrics?.length || 0);
        setResponseTimeMetrics(data.metrics || []);
      } else {
        const errorText = await res.text();
        console.error('Failed to fetch metrics:', res.status, errorText);
      }
    } catch (error) {
      console.error('Error fetching response time metrics:', error);
      // Silently fail in development - historical data is optional
      setResponseTimeMetrics([]);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    const today = new Date();
    let start, end;
    
    switch (range) {
      case '7days':
        const dates = getLast7Weekdays();
        start = dates[0];
        end = dates[dates.length - 1];
        break;
      case '30days':
        end = today.toISOString().split('T')[0];
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        start = thirtyDaysAgo.toISOString().split('T')[0];
        break;
      case '90days':
        end = today.toISOString().split('T')[0];
        const ninetyDaysAgo = new Date(today);
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        start = ninetyDaysAgo.toISOString().split('T')[0];
        break;
      default:
        return;
    }
    
    setStartDate(start);
    setEndDate(end);
  };

  // Calculate compliance metrics for chart
  const chartData = useMemo(() => {
    if (!snapshots.length) return [];

    const dataByDate = {};
    
    snapshots.forEach(snapshot => {
      const date = snapshot.date;
      if (!dataByDate[date]) {
        dataByDate[date] = {
          date,
          totalTSEs: 0,
          compliantOpen: 0,
          compliantSnoozed: 0,
          compliantBoth: 0
        };
      }

      const EXCLUDED_TSE_NAMES = ["Prerit Sachdeva"];
      let tseData = selectedTSEs.length > 0
        ? snapshot.tseData.filter(tse => selectedTSEs.includes(String(tse.id)))
        : snapshot.tseData;
      
      // Filter out excluded TSEs
      tseData = tseData.filter(tse => !EXCLUDED_TSE_NAMES.includes(tse.name));

      tseData.forEach(tse => {
        dataByDate[date].totalTSEs++;
        const meetsOpen = tse.open <= THRESHOLDS.MAX_OPEN_SOFT;
        const totalActionableSnoozed = tse.actionableSnoozed + tse.investigationSnoozed;
        const meetsSnoozed = totalActionableSnoozed <= THRESHOLDS.MAX_ACTIONABLE_SNOOZED_SOFT;
        
        if (meetsOpen) dataByDate[date].compliantOpen++;
        if (meetsSnoozed) dataByDate[date].compliantSnoozed++;
        if (meetsOpen && meetsSnoozed) dataByDate[date].compliantBoth++;
      });
    });

    return Object.values(dataByDate)
      .map(d => ({
        ...d,
        openCompliance: d.totalTSEs > 0 ? Math.round((d.compliantOpen / d.totalTSEs) * 100) : 0,
        snoozedCompliance: d.totalTSEs > 0 ? Math.round((d.compliantSnoozed / d.totalTSEs) * 100) : 0,
        overallCompliance: d.totalTSEs > 0 ? Math.round((d.compliantBoth / d.totalTSEs) * 100) : 0
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [snapshots, selectedTSEs]);

  // Calculate average compliance per TSE across selected date range
  const tseAverageCompliance = useMemo(() => {
    if (!snapshots.length) return [];

    const EXCLUDED_TSE_NAMES = ["Prerit Sachdeva"];
    const tseStats = {};
    
    snapshots.forEach(snapshot => {
      let tseData = selectedTSEs.length > 0
        ? snapshot.tseData.filter(tse => selectedTSEs.includes(String(tse.id)))
        : snapshot.tseData;
      
      // Filter out excluded TSEs
      tseData = tseData.filter(tse => !EXCLUDED_TSE_NAMES.includes(tse.name));

      tseData.forEach(tse => {
        if (!tseStats[tse.id]) {
          tseStats[tse.id] = {
            id: tse.id,
            name: tse.name,
            daysCounted: 0,
            openCompliantDays: 0,
            snoozedCompliantDays: 0,
            overallCompliantDays: 0
          };
        }

        const meetsOpen = tse.open <= THRESHOLDS.MAX_OPEN_SOFT;
        const totalActionableSnoozed = tse.actionableSnoozed + tse.investigationSnoozed;
        const meetsSnoozed = totalActionableSnoozed <= THRESHOLDS.MAX_ACTIONABLE_SNOOZED_SOFT;
        const meetsBoth = meetsOpen && meetsSnoozed;

        tseStats[tse.id].daysCounted++;
        if (meetsOpen) tseStats[tse.id].openCompliantDays++;
        if (meetsSnoozed) tseStats[tse.id].snoozedCompliantDays++;
        if (meetsBoth) tseStats[tse.id].overallCompliantDays++;
      });
    });

    return Object.values(tseStats)
      .map(tse => ({
        name: tse.name,
        openCompliance: tse.daysCounted > 0 
          ? Math.round((tse.openCompliantDays / tse.daysCounted) * 100) 
          : 0,
        snoozedCompliance: tse.daysCounted > 0 
          ? Math.round((tse.snoozedCompliantDays / tse.daysCounted) * 100) 
          : 0,
        overallCompliance: tse.daysCounted > 0 
          ? Math.round((tse.overallCompliantDays / tse.daysCounted) * 100) 
          : 0
      }))
      .sort((a, b) => b.overallCompliance - a.overallCompliance); // Sort by overall compliance descending
  }, [snapshots, selectedTSEs]);

  // Prepare table data grouped by date
  const groupedTableData = useMemo(() => {
    if (!snapshots.length) return [];

    const EXCLUDED_TSE_NAMES = ["Prerit Sachdeva"];
    const groupedByDate = {};
    
    snapshots.forEach(snapshot => {
      let tseData = selectedTSEs.length > 0
        ? snapshot.tseData.filter(tse => selectedTSEs.includes(String(tse.id)))
        : snapshot.tseData;
      
      // Filter out excluded TSEs
      tseData = tseData.filter(tse => !EXCLUDED_TSE_NAMES.includes(tse.name));

      if (!groupedByDate[snapshot.date]) {
        groupedByDate[snapshot.date] = {
          date: snapshot.date,
          tses: [],
          totalTSEs: 0,
          compliantOpen: 0,
          compliantSnoozed: 0,
          compliantBoth: 0
        };
      }

      tseData.forEach(tse => {
        const meetsOpen = tse.open <= THRESHOLDS.MAX_OPEN_SOFT;
        const totalActionableSnoozed = tse.actionableSnoozed + tse.investigationSnoozed;
        const meetsSnoozed = totalActionableSnoozed <= THRESHOLDS.MAX_ACTIONABLE_SNOOZED_SOFT;
        
        groupedByDate[snapshot.date].tses.push({
          tseName: tse.name,
          open: tse.open,
          actionableSnoozed: tse.actionableSnoozed,
          investigationSnoozed: tse.investigationSnoozed,
          customerWaitSnoozed: tse.customerWaitSnoozed,
          totalSnoozed: tse.totalSnoozed || 0,
          openCompliant: meetsOpen,
          snoozedCompliant: meetsSnoozed,
          overallCompliant: meetsOpen && meetsSnoozed
        });

        groupedByDate[snapshot.date].totalTSEs++;
        if (meetsOpen) groupedByDate[snapshot.date].compliantOpen++;
        if (meetsSnoozed) groupedByDate[snapshot.date].compliantSnoozed++;
        if (meetsOpen && meetsSnoozed) groupedByDate[snapshot.date].compliantBoth++;
      });

      // Sort TSEs within each date
      groupedByDate[snapshot.date].tses.sort((a, b) => a.tseName.localeCompare(b.tseName));
    });

    // Convert to array
    let sorted = Object.values(groupedByDate);
    
    // Apply sorting
    if (complianceSortConfig.key) {
      sorted = [...sorted].sort((a, b) => {
        let aVal, bVal;
        
        switch (complianceSortConfig.key) {
          case 'date':
            aVal = new Date(a.date);
            bVal = new Date(b.date);
            break;
          case 'tse':
            aVal = a.totalTSEs;
            bVal = b.totalTSEs;
            break;
          case 'openCompliance':
            aVal = a.totalTSEs > 0 ? Math.round((a.compliantOpen / a.totalTSEs) * 100) : 0;
            bVal = b.totalTSEs > 0 ? Math.round((b.compliantOpen / b.totalTSEs) * 100) : 0;
            break;
          case 'snoozedCompliance':
            aVal = a.totalTSEs > 0 ? Math.round((a.compliantSnoozed / a.totalTSEs) * 100) : 0;
            bVal = b.totalTSEs > 0 ? Math.round((b.compliantSnoozed / b.totalTSEs) * 100) : 0;
            break;
          case 'overallCompliance':
            aVal = a.totalTSEs > 0 ? Math.round((a.compliantBoth / a.totalTSEs) * 100) : 0;
            bVal = b.totalTSEs > 0 ? Math.round((b.compliantBoth / b.totalTSEs) * 100) : 0;
            break;
          default:
            return 0;
        }
        
        if (aVal < bVal) return complianceSortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return complianceSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      // Default: sort by date (newest first)
      sorted = sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    
    return sorted;
  }, [snapshots, selectedTSEs, complianceSortConfig]);

  const toggleDate = (date) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  const toggleResponseTimeDate = (date) => {
    const newExpanded = new Set(expandedResponseTimeDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedResponseTimeDates(newExpanded);
  };

  const handleComplianceSort = (key) => {
    setComplianceSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleResponseTimeSort = (key) => {
    setResponseTimeSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleTSEChange = (tseId, checked) => {
    const tseIdString = String(tseId);
    // Update both state and ref immediately to prevent race conditions
    setHasManuallyCleared(true);
    hasManuallyClearedRef.current = true;
    
    setSelectedTSEs(prev => {
      if (checked) {
        // Add TSE if not already in the list
        if (prev.includes(tseIdString)) {
          return prev; // Already selected, don't change
        }
        return [...prev, tseIdString];
      } else {
        // Remove TSE from the list
        return prev.filter(id => id !== tseIdString);
      }
    });
  };

  const selectAllTSEs = () => {
    setSelectedTSEs(availableTSEs.map(tse => String(tse.id)));
    setHasManuallyCleared(false); // Reset flag when selecting all
  };

  const clearTSEs = () => {
    setSelectedTSEs([]);
    setHasManuallyCleared(true);
    hasManuallyClearedRef.current = true;
  };

  const selectRegionTSEs = (region) => {
    const regionTSEs = tseByRegion[region] || [];
    const regionTSEIds = regionTSEs.map(tse => String(tse.id));
    
    setHasManuallyCleared(true);
    hasManuallyClearedRef.current = true;
    
    setSelectedTSEs(prev => {
      // Add all region TSEs that aren't already selected
      const newSelection = [...prev];
      regionTSEIds.forEach(id => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      return newSelection;
    });
  };

  // Prepare response time chart data
  const responseTimeChartData = useMemo(() => {
    if (!responseTimeMetrics || responseTimeMetrics.length === 0) {
      return [];
    }
    
    return responseTimeMetrics
      .filter(metric => metric.date) // Only include metrics with a date
      .map(metric => {
        try {
          // date format: YYYY-MM-DD (e.g., "2025-12-29")
          const [year, month, day] = metric.date.split('-').map(Number);
          
          if (isNaN(year) || isNaN(month) || isNaN(day)) {
            console.warn('Invalid date format:', metric.date);
            return null;
          }
          
          // Create a local date to avoid timezone issues
          const localDate = new Date(year, month - 1, day);
          const displayMonth = localDate.getMonth() + 1;
          const displayDay = localDate.getDate();
          
          return {
            date: metric.date,
            timestamp: metric.timestamp,
            displayLabel: `${displayMonth}/${displayDay}`,
            count10PlusMin: metric.count10PlusMin || 0,
            totalConversations: metric.totalConversations || 0,
            percentage10PlusMin: metric.percentage10PlusMin || 0,
            conversationIds10PlusMin: metric.conversationIds10PlusMin || []
          };
        } catch (error) {
          console.error('Error processing metric:', metric, error);
          return null;
        }
      })
      .filter(item => item !== null) // Remove any null entries
      .sort((a, b) => {
        // Apply sorting if configured
        if (responseTimeSortConfig.key) {
          let aVal, bVal;
          
          switch (responseTimeSortConfig.key) {
            case 'date':
              aVal = new Date(a.date);
              bVal = new Date(b.date);
              break;
            case 'totalConversations':
              aVal = a.totalConversations;
              bVal = b.totalConversations;
              break;
            case 'count10PlusMin':
              aVal = a.count10PlusMin;
              bVal = b.count10PlusMin;
              break;
            case 'percentage':
              aVal = a.percentage10PlusMin;
              bVal = b.percentage10PlusMin;
              break;
            default:
              return 0;
          }
          
          if (aVal < bVal) return responseTimeSortConfig.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return responseTimeSortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }
        
        // Default: sort by timestamp (oldest first)
        return new Date(a.timestamp) - new Date(b.timestamp);
      });
  }, [responseTimeMetrics, responseTimeSortConfig]);

  // Calculate response time summary metrics
  const responseTimeSummary = useMemo(() => {
    if (responseTimeMetrics.length === 0) {
      return { avgPercentage: 0, totalCount: 0, trend: 'no-data', change: 0 };
    }
    
    // Sort metrics by date to ensure chronological order
    const sortedMetrics = [...responseTimeMetrics].sort((a, b) => {
      return new Date(a.date) - new Date(b.date);
    });
    
    const avgPercentage = Math.round(
      sortedMetrics.reduce((sum, m) => sum + (m.percentage10PlusMin || 0), 0) / sortedMetrics.length
    );
    
    const totalCount = sortedMetrics.reduce((sum, m) => sum + (m.count10PlusMin || 0), 0);
    
    // Calculate trend (comparing last 7 days vs previous 7 days)
    // If we have 14+ data points, compare last 7 vs previous 7
    // Otherwise, compare last half vs first half
    let previousPeriodAvg = 0;
    let lastPeriodAvg = 0;
    
    if (sortedMetrics.length >= 14) {
      // Last 7 days vs previous 7 days
      const last7Days = sortedMetrics.slice(-7);
      const previous7Days = sortedMetrics.slice(-14, -7);
      
      previousPeriodAvg = previous7Days.length > 0 
        ? previous7Days.reduce((sum, m) => sum + (m.percentage10PlusMin || 0), 0) / previous7Days.length 
        : 0;
      lastPeriodAvg = last7Days.length > 0 
        ? last7Days.reduce((sum, m) => sum + (m.percentage10PlusMin || 0), 0) / last7Days.length 
        : 0;
    } else if (sortedMetrics.length >= 2) {
      // Fallback: compare last half vs first half
      const midPoint = Math.floor(sortedMetrics.length / 2);
      const firstHalf = sortedMetrics.slice(0, midPoint);
      const secondHalf = sortedMetrics.slice(midPoint);
      
      previousPeriodAvg = firstHalf.length > 0 
        ? firstHalf.reduce((sum, m) => sum + (m.percentage10PlusMin || 0), 0) / firstHalf.length 
        : 0;
      lastPeriodAvg = secondHalf.length > 0 
        ? secondHalf.reduce((sum, m) => sum + (m.percentage10PlusMin || 0), 0) / secondHalf.length 
        : 0;
    }
    
    const trend = lastPeriodAvg < previousPeriodAvg ? 'improving' : lastPeriodAvg > previousPeriodAvg ? 'worsening' : 'stable';
    const change = Math.round(previousPeriodAvg - lastPeriodAvg); // Positive change means improvement (reduction)
    
    return { avgPercentage, totalCount, trend, change };
  }, [responseTimeMetrics]);

  return (
    <div className="historical-view">
      <div className="historical-header">
        <h2>Historical Analytics</h2>
        <div className="header-buttons">
          {activeTab === 'response-time' && (
            <button 
              onClick={async () => {
                try {
                  // In development, use production API URL since local dev server doesn't have API routes
                  const url = process.env.NODE_ENV === 'production'
                    ? `${window.location.origin}/api/cron/response-time-hourly`
                    : 'https://queue-health-monitor.vercel.app/api/cron/response-time-hourly';

                  const res = await fetch(url);
                  if (res.ok) {
                    const result = await res.json().catch(() => ({}));
                    console.log('Capture response:', result);
                    alert('Response time metric captured successfully!');
                    // Wait a moment for the database to be ready, then refresh
                    setTimeout(() => {
                      fetchResponseTimeMetrics();
                    }, 500);
                  } else {
                    let errorData;
                    try {
                      errorData = await res.json();
                    } catch (e) {
                      errorData = { error: `HTTP ${res.status}: ${res.statusText}` };
                    }
                    console.error('Capture failed:', errorData);
                    throw new Error(errorData.error || `HTTP ${res.status}: Failed to capture metric`);
                  }
                } catch (error) {
                  console.error('Error capturing response time metric:', error);
                  const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
                  alert('Failed to capture metric: ' + errorMessage);
                }
              }} 
              className="save-snapshot-button"
            >
              📊 Capture Current Metric
            </button>
          )}
          {onSaveSnapshot && activeTab === 'compliance' && (
            <button onClick={onSaveSnapshot} className="save-snapshot-button">
              📸 Save Current Snapshot
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="historical-tabs">
        <button 
          className={activeTab === 'compliance' ? 'active' : ''}
          onClick={() => setActiveTab('compliance')}
        >
          Daily Compliance Trends
        </button>
        <button 
          className={activeTab === 'response-time' ? 'active' : ''}
          onClick={() => setActiveTab('response-time')}
        >
          Response Time Metrics
        </button>
      </div>

      <div className="historical-filters">
        <div className="filter-group">
          <label>Date Range:</label>
          <select value={dateRange} onChange={(e) => handleDateRangeChange(e.target.value)} className="filter-select">
            <option value="7days">Last 7 Weekdays</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {dateRange === 'custom' && (
          <>
            <div className="filter-group">
              <label>Start Date:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="date-input"
              />
            </div>
            <div className="filter-group">
              <label>End Date:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="date-input"
              />
            </div>
          </>
        )}

        {activeTab === 'compliance' && (
          <div className="filter-group tse-selector">
            <label>Filter by TSE:</label>
            <div className="tse-checkboxes">
              <button onClick={selectAllTSEs} className="select-all-button">Select All</button>
              <button onClick={clearTSEs} className="clear-button">Unselect All</button>
              <div className="tse-checkbox-list">
                {['UK', 'NY', 'SF', 'Other'].map(region => {
                  const regionTSEs = tseByRegion[region] || [];
                  if (regionTSEs.length === 0) return null;

                  const isRegionExpanded = expandedRegions.has(region);
                  const regionLabels = {
                    'UK': 'UK 🇬🇧',
                    'NY': 'New York 🗽',
                    'SF': 'San Francisco 🌉',
                    'Other': 'Other'
                  };

                  const allRegionTSEsSelected = regionTSEs.every(tse => selectedTSEs.includes(String(tse.id)));
                  
                  return (
                    <div key={region} className="tse-region-filter-group">
                      <div 
                        className="tse-region-filter-header"
                        onClick={() => toggleRegion(region)}
                      >
                        <span className="region-expand-icon">{isRegionExpanded ? '▼' : '▶'}</span>
                        <span className="region-filter-name">{regionLabels[region]}</span>
                        <span className="region-filter-count">({regionTSEs.length})</span>
                        <button
                          className="region-select-all-button"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent region toggle
                            selectRegionTSEs(region);
                          }}
                          title={allRegionTSEsSelected ? "All TSEs in this region are selected" : "Select all TSEs in this region"}
                        >
                          {allRegionTSEsSelected ? '✓ All' : 'Select All'}
                        </button>
                      </div>
                      {isRegionExpanded && (
                        <div className="tse-region-checkbox-list">
                          {regionTSEs.map(tse => (
                            <label key={tse.id} className="tse-checkbox-label">
                              <input
                                type="checkbox"
                                checked={selectedTSEs.includes(String(tse.id))}
                                onChange={(e) => handleTSEChange(tse.id, e.target.checked)}
                              />
                              <span>{tse.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Compliance Trends Tab */}
      {activeTab === 'compliance' && (
        <>
          {loading && (
            <div className="loading-state">Loading historical data...</div>
          )}

          {!loading && chartData.length > 0 && (
        <>
          <div className="chart-container">
            <h3 className="chart-title">Team Daily Compliance Percentage Trends</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData} margin={{ top: 70, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#292929"
                  tick={{ fill: '#292929', fontSize: 12 }}
                  tickFormatter={(value) => {
                    // Parse date string as local date to avoid timezone issues
                    const [year, month, day] = value.split('-').map(Number);
                    const date = new Date(year, month - 1, day);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis 
                  stroke="#292929"
                  tick={{ fill: '#292929', fontSize: 12 }}
                  domain={[0, 100]}
                  label={{ value: 'Compliance %', angle: -90, position: 'insideLeft', fill: '#292929' }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #35a1b4', borderRadius: '4px' }}
                  labelFormatter={(value) => {
                    // Parse date string as local date to avoid timezone issues
                    const [year, month, day] = value.split('-').map(Number);
                    const date = new Date(year, month - 1, day);
                    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="overallCompliance" 
                  stroke="#4cec8c" 
                  strokeWidth={3}
                  dot={{ fill: '#4cec8c', r: 4 }}
                  name="Overall Compliance"
                  label={createHolidayLabel(chartData, false, 'overallCompliance')}
                />
                <Line 
                  type="monotone" 
                  dataKey="openCompliance" 
                  stroke="#35a1b4" 
                  strokeWidth={2}
                  dot={{ fill: '#35a1b4', r: 3 }}
                  name="Open Compliance"
                />
                <Line 
                  type="monotone" 
                  dataKey="snoozedCompliance" 
                  stroke="#ff9a74" 
                  strokeWidth={2}
                  dot={{ fill: '#ff9a74', r: 3 }}
                  name="Snoozed Compliance"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* TSE Average Compliance Chart */}
          {tseAverageCompliance.length > 0 && (
            <div className="chart-container">
              <h3 className="chart-title">TSE Average Compliance</h3>
              <p className="chart-subtitle">Average compliance percentage over selected date range</p>
              <ResponsiveContainer width="100%" height={Math.min(800, Math.max(400, tseAverageCompliance.length * 35))}>
                <BarChart 
                  data={tseAverageCompliance} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis 
                    type="number"
                    domain={[0, 100]}
                    stroke="#292929"
                    tick={{ fill: '#292929', fontSize: 11 }}
                    label={{ value: 'Compliance %', position: 'insideBottom', offset: -5, fill: '#292929' }}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name"
                    stroke="#292929"
                    tick={{ fill: '#292929', fontSize: 11 }}
                    width={150}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #35a1b4', 
                      borderRadius: '4px',
                      padding: '8px 12px'
                    }}
                    formatter={(value, name) => [`${value}%`, name]}
                    labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '10px' }}
                    iconType="rect"
                  />
                  <Bar 
                    dataKey="overallCompliance" 
                    fill="#4cec8c" 
                    name="Overall Compliance"
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar 
                    dataKey="openCompliance" 
                    fill="#35a1b4" 
                    name="Open Compliance"
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar 
                    dataKey="snoozedCompliance" 
                    fill="#ff9a74" 
                    name="Snoozed Compliance"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="historical-summary">
            <div className="summary-card">
              <h4>Overall Compliance</h4>
              <div className="summary-value-large">
                {Math.round(chartData.reduce((sum, d) => sum + d.overallCompliance, 0) / chartData.length)}%
              </div>
            </div>
            <div className="summary-card">
              <h4>Open Compliance</h4>
              <div className="summary-value-large">
                {Math.round(chartData.reduce((sum, d) => sum + d.openCompliance, 0) / chartData.length)}%
              </div>
            </div>
            <div className="summary-card">
              <h4>Snoozed Compliance</h4>
              <div className="summary-value-large">
                {Math.round(chartData.reduce((sum, d) => sum + d.snoozedCompliance, 0) / chartData.length)}%
              </div>
            </div>
          </div>

          <div className="historical-table-section">
            <h3 className="section-title">Historical Data</h3>
            <div className="table-container">
              <table className="historical-table grouped-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}></th>
                    <th 
                      className="sortable-header" 
                      onClick={() => handleComplianceSort('date')}
                    >
                      Date
                      {complianceSortConfig.key === 'date' && (
                        <span className="sort-indicator">
                          {complianceSortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                        </span>
                      )}
                    </th>
                    <th 
                      className="sortable-header" 
                      onClick={() => handleComplianceSort('tse')}
                    >
                      TSEs
                      {complianceSortConfig.key === 'tse' && (
                        <span className="sort-indicator">
                          {complianceSortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                        </span>
                      )}
                    </th>
                    <th 
                      className="sortable-header" 
                      onClick={() => handleComplianceSort('openCompliance')}
                    >
                      Open Compliance
                      {complianceSortConfig.key === 'openCompliance' && (
                        <span className="sort-indicator">
                          {complianceSortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                        </span>
                      )}
                    </th>
                    <th 
                      className="sortable-header" 
                      onClick={() => handleComplianceSort('snoozedCompliance')}
                    >
                      Snoozed Compliance
                      {complianceSortConfig.key === 'snoozedCompliance' && (
                        <span className="sort-indicator">
                          {complianceSortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                        </span>
                      )}
                    </th>
                    <th 
                      className="sortable-header" 
                      onClick={() => handleComplianceSort('overallCompliance')}
                    >
                      Overall Compliance
                      {complianceSortConfig.key === 'overallCompliance' && (
                        <span className="sort-indicator">
                          {complianceSortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                        </span>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupedTableData.map((dateGroup) => {
                    // Parse date string as local date to avoid timezone issues
                    const [year, month, day] = dateGroup.date.split('-').map(Number);
                    const displayDate = new Date(year, month - 1, day);
                    const isExpanded = expandedDates.has(dateGroup.date);
                    const openCompliancePct = dateGroup.totalTSEs > 0 
                      ? Math.round((dateGroup.compliantOpen / dateGroup.totalTSEs) * 100) 
                      : 0;
                    const snoozedCompliancePct = dateGroup.totalTSEs > 0 
                      ? Math.round((dateGroup.compliantSnoozed / dateGroup.totalTSEs) * 100) 
                      : 0;
                    const overallCompliancePct = dateGroup.totalTSEs > 0 
                      ? Math.round((dateGroup.compliantBoth / dateGroup.totalTSEs) * 100) 
                      : 0;

                    return (
                      <React.Fragment key={dateGroup.date}>
                        <tr 
                          className="date-group-header"
                          onClick={() => toggleDate(dateGroup.date)}
                        >
                          <td className="expand-icon">
                            {isExpanded ? '▼' : '▶'}
                          </td>
                          <td className="date-cell">
                            <strong>{displayDate.toLocaleDateString()}</strong>
                          </td>
                          <td>{dateGroup.totalTSEs}</td>
                          <td>
                            <span className={`compliance-percentage ${openCompliancePct === 100 ? 'compliant' : ''}`}>
                              {openCompliancePct}%
                            </span>
                          </td>
                          <td>
                            <span className={`compliance-percentage ${snoozedCompliancePct === 100 ? 'compliant' : ''}`}>
                              {snoozedCompliancePct}%
                            </span>
                          </td>
                          <td>
                            <span className={`compliance-percentage ${overallCompliancePct === 100 ? 'compliant' : ''}`}>
                              {overallCompliancePct}%
                            </span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <>
                            <tr className="tse-header-row">
                              <td colSpan="6">
                                <table className="nested-tse-table">
                                  <thead>
                                    <tr>
                                      <th>TSE</th>
                                      <th>Open</th>
                                      <th>Actionable Snoozed</th>
                                      <th>#Investigation</th>
                                      <th>#CustomerWait</th>
                                      <th>Total Snoozed</th>
                                      <th>Open Compliant</th>
                                      <th>Snoozed Compliant</th>
                                      <th>Overall Compliant</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {dateGroup.tses.map((tse, idx) => (
                                      <tr key={`${dateGroup.date}-${tse.tseName}-${idx}`}>
                                        <td>{tse.tseName}</td>
                                        <td>{tse.open}</td>
                                        <td>{tse.actionableSnoozed}</td>
                                        <td>{tse.investigationSnoozed}</td>
                                        <td>{tse.customerWaitSnoozed}</td>
                                        <td>{tse.totalSnoozed}</td>
                                        <td>
                                          <span className={tse.openCompliant ? "compliant-badge compliant" : "compliant-badge non-compliant"}>
                                            {tse.openCompliant ? "✓" : "✗"}
                                          </span>
                                        </td>
                                        <td>
                                          <span className={tse.snoozedCompliant ? "compliant-badge compliant" : "compliant-badge non-compliant"}>
                                            {tse.snoozedCompliant ? "✓" : "✗"}
                                          </span>
                                        </td>
                                        <td>
                                          <span className={tse.overallCompliant ? "compliant-badge compliant" : "compliant-badge non-compliant"}>
                                            {tse.overallCompliant ? "✓" : "✗"}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

          {!loading && chartData.length === 0 && (
            <div className="no-data">
              <p>No historical data available for the selected date range.</p>
              <p>Snapshots are automatically taken at 10pm ET on weekdays.</p>
            </div>
          )}
        </>
      )}

      {/* Response Time Metrics Tab */}
      {activeTab === 'response-time' && (
        <>
          {loadingMetrics && (
            <div className="loading-state">Loading response time metrics...</div>
          )}

          {!loadingMetrics && responseTimeChartData.length > 0 && (
            <>
              {/* Summary Cards */}
              <div className="response-time-summary">
                <div className="summary-card">
                  <h4>Avg % 10+ Min Wait Time</h4>
                  <div className="summary-value-large">
                    {responseTimeSummary.avgPercentage}%
                  </div>
                  {responseTimeSummary.trend !== 'no-data' && (
                    <div className={`trend-indicator ${responseTimeSummary.trend}`}>
                      {responseTimeSummary.trend === 'improving' && '↓'}
                      {responseTimeSummary.trend === 'worsening' && '↑'}
                      {responseTimeSummary.trend === 'stable' && '→'}
                      {' '}
                      {Math.abs(responseTimeSummary.change)}% {responseTimeSummary.trend === 'improving' ? 'improvement' : responseTimeSummary.trend === 'worsening' ? 'increase' : 'no change'}
                    </div>
                  )}
                </div>
                <div className="summary-card">
                  <h4>Total Conversations</h4>
                  <div className="summary-value-large">
                    {responseTimeMetrics.reduce((sum, m) => sum + (m.totalConversations || 0), 0)}
                  </div>
                  <div className="summary-subtext">
                    Across all data points
                  </div>
                </div>
                <div className="summary-card">
                  <h4>Total 10+ Min Waits</h4>
                  <div className="summary-value-large">
                    {responseTimeSummary.totalCount}
                  </div>
                  <div className="summary-subtext">
                    Conversations with 10+ min wait time
                  </div>
                </div>
              </div>

              {/* Percentage Chart */}
              <div className="chart-container">
                <h3 className="chart-title">Percentage of Conversations with 10+ Minute Wait Time</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={responseTimeChartData} margin={{ top: 70, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis 
                      dataKey="displayLabel" 
                      stroke="#292929"
                      tick={{ fill: '#292929', fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      stroke="#292929"
                      tick={{ fill: '#292929', fontSize: 12 }}
                      domain={[0, 100]}
                      label={{ value: 'Percentage %', angle: -90, position: 'insideLeft', fill: '#292929' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #35a1b4', borderRadius: '4px' }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="percentage10PlusMin" 
                      stroke="#35a1b4" 
                      strokeWidth={2}
                      name="10+ Min Wait %"
                      dot={{ r: 4 }}
                      label={createHolidayLabel(responseTimeChartData, false, 'percentage10PlusMin')}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Count Chart */}
              <div className="chart-container">
                <h3 className="chart-title">Count of Conversations with 10+ Minute Wait Time</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={responseTimeChartData} margin={{ top: 70, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis 
                      dataKey="displayLabel" 
                      stroke="#292929"
                      tick={{ fill: '#292929', fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      stroke="#292929"
                      tick={{ fill: '#292929', fontSize: 12 }}
                      label={{ value: 'Count', angle: -90, position: 'insideLeft', fill: '#292929' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #35a1b4', borderRadius: '4px' }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="count10PlusMin" 
                      fill="#35a1b4"
                      name="10+ Min Waits"
                      label={createHolidayLabel(responseTimeChartData, true, 'count10PlusMin')}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Detailed Table */}
              <div className="historical-table-section">
                <h3 className="section-title">Response Time Metrics</h3>
                <div className="table-container">
                  <table className="historical-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}></th>
                        <th 
                          className="sortable-header" 
                          onClick={() => handleResponseTimeSort('date')}
                        >
                          Date
                          {responseTimeSortConfig.key === 'date' && (
                            <span className="sort-indicator">
                              {responseTimeSortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                            </span>
                          )}
                        </th>
                        <th 
                          className="sortable-header" 
                          onClick={() => handleResponseTimeSort('totalConversations')}
                        >
                          Total Conversations
                          {responseTimeSortConfig.key === 'totalConversations' && (
                            <span className="sort-indicator">
                              {responseTimeSortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                            </span>
                          )}
                        </th>
                        <th 
                          className="sortable-header" 
                          onClick={() => handleResponseTimeSort('count10PlusMin')}
                        >
                          10+ Min Waits
                          {responseTimeSortConfig.key === 'count10PlusMin' && (
                            <span className="sort-indicator">
                              {responseTimeSortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                            </span>
                          )}
                        </th>
                        <th 
                          className="sortable-header" 
                          onClick={() => handleResponseTimeSort('percentage')}
                        >
                          Percentage
                          {responseTimeSortConfig.key === 'percentage' && (
                            <span className="sort-indicator">
                              {responseTimeSortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                            </span>
                          )}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {responseTimeChartData.map((row, idx) => {
                        const isExpanded = expandedResponseTimeDates.has(row.date);
                        const [year, month, day] = row.date.split('-').map(Number);
                        const displayDate = new Date(year, month - 1, day);
                        
                        return (
                          <React.Fragment key={`${row.date}-${idx}`}>
                            <tr 
                              className="date-group-header"
                              onClick={() => toggleResponseTimeDate(row.date)}
                              style={{ cursor: 'pointer' }}
                            >
                              <td className="expand-icon">
                                {row.count10PlusMin > 0 ? (isExpanded ? '▼' : '▶') : ''}
                              </td>
                              <td className="date-cell">
                                <strong>{displayDate.toLocaleDateString()}</strong>
                              </td>
                              <td>{row.totalConversations}</td>
                              <td>{row.count10PlusMin}</td>
                              <td>
                                <span className={row.percentage10PlusMin > 0 ? "percentage-badge high" : "percentage-badge good"}>
                                  {row.percentage10PlusMin.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="conversations-row">
                                <td colSpan="5">
                                  <div className="conversations-list">
                                    {row.conversationIds10PlusMin && row.conversationIds10PlusMin.length > 0 && (
                                      <div>
                                        <h4>Conversations with 10+ Minute Wait Time:</h4>
                                        <ul>
                                          {row.conversationIds10PlusMin.map((convData, idx) => {
                                            const convId = typeof convData === 'string' ? convData : convData.id;
                                            const waitTimeMinutes = typeof convData === 'object' && convData.waitTimeMinutes 
                                              ? convData.waitTimeMinutes 
                                              : null;
                                            
                                            return (
                                              <li key={`${convId || idx}`}>
                                                <a 
                                                  href={`https://app.intercom.com/a/inbox/gu1e0q0t/inbox/admin/9110812/conversation/${convId}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="conversation-link"
                                                >
                                                  {convId}
                                                  {waitTimeMinutes !== null && (
                                                    <span className="wait-time-badge"> ({waitTimeMinutes.toFixed(1)} min)</span>
                                                  )}
                                                </a>
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

              {!loadingMetrics && responseTimeChartData.length === 0 && (
                <div className="no-data">
                  <p>No response time metrics available for the selected date range.</p>
                  <p>Metrics are automatically captured daily at midnight UTC. You can also manually capture a snapshot for today using the button above (will overwrite today's entry if it exists).</p>
                </div>
              )}
        </>
      )}
    </div>
  );
}

export default HistoricalView;

