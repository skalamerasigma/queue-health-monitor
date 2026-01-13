import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter, Cell } from 'recharts';
import './HistoricalView.css';

// TSE Region mapping
const TSE_REGIONS = {
  'UK': ['Salman Filli', 'Erin Liu', 'Kabilan Thayaparan', 'J', 'Nathan Simpson', 'Somachi Ngoka'],
  'NY': ['Lyle Pierson Stachecki', 'Nick Clancey', 'Swapnil Deshpande', 'Ankita Dalvi', 'Grace Sanford', 'Erez Yagil', 'Julia Lusala', 'Betty Liu', 'Xyla Fang', 'Rashi Madnani', 'Nikhil Krishnappa', 'Ryan Jaipersaud', 'Krish Pawooskar', 'Siddhi Jadhav', 'Arley Schenker', 'Stephen Skalamera'],
  'SF': ['Sanyam Khurana', 'Hem Kamdar', 'Sagarika Sardesai', 'Nikita Bangale', 'Payton Steiner', 'Bhavana Prasad Kote', 'Grania M', 'Soheli Das', 'Hayden Greif-Neill', 'Roshini Padmanabha', 'Abhijeet Lal', 'Ratna Shivakumar', 'Sahibeer Singh', 'Vruddhi Kapre', 'Priyanshi Singh']
};

// Region icons (SVG URLs)
const REGION_ICONS = {
  'UK': 'https://res.cloudinary.com/doznvxtja/image/upload/v1768284324/3_150_x_150_px_5_yrnw4o.svg',
  'NY': 'https://res.cloudinary.com/doznvxtja/image/upload/v1768284324/3_150_x_150_px_5_yrnw4o.svg',
  'SF': 'https://res.cloudinary.com/doznvxtja/image/upload/v1768283947/3_150_x_150_px_1_hmomvc.svg',
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
  const [clickedTooltip, setClickedTooltip] = useState(null); // { date, tseName } or null
  const [loading, setLoading] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [selectedTSEs, setSelectedTSEs] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateRange, setDateRange] = useState('7days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [availableTSEs, setAvailableTSEs] = useState([]);
  const [activeTab, setActiveTab] = useState('compliance'); // 'compliance', 'response-time', or 'results'
  const [resultsData, setResultsData] = useState(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [resultsDateRange, setResultsDateRange] = useState('30'); // days: 7, 14, 30, 60, 90
  const [expandedDates, setExpandedDates] = useState(new Set());
  const [expandedResponseTimeDates, setExpandedResponseTimeDates] = useState(new Set());
  const [complianceSortConfig, setComplianceSortConfig] = useState({ key: null, direction: 'asc' });
  const [responseTimeSortConfig, setResponseTimeSortConfig] = useState({ key: null, direction: 'asc' });
  const [expandedRegions, setExpandedRegions] = useState(new Set()); // All collapsed by default
  const [hasManuallyCleared, setHasManuallyCleared] = useState(false); // Track if user manually cleared selection

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (clickedTooltip && !event.target.closest('.tooltip-popup') && !event.target.closest('.clickable-badge')) {
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
    // Auto-fetch when dates change, but only if not in custom mode
    // (custom mode requires clicking Apply button)
    if (dateRange !== 'custom' && startDate && endDate) {
      fetchSnapshots();
    }
  }, [startDate, endDate, dateRange]); // Removed selectedTSEs - we always fetch all snapshots

  useEffect(() => {
    // Auto-fetch when dates change, but only if not in custom mode
    // (custom mode requires clicking Apply button)
    if (dateRange !== 'custom' && startDate && endDate) {
      fetchResponseTimeMetrics();
    }
  }, [startDate, endDate, dateRange]);

  // Fetch results data when results tab is active or when date range changes
  useEffect(() => {
    if (activeTab === 'results') {
      // Clear old data first
      setResultsData(null);
      fetchResultsData();
    }
  }, [activeTab, resultsDateRange, startDate, endDate, dateRange]);

  // Fetch results data (compliance vs slow first response)
  const fetchResultsData = async () => {
    setLoadingResults(true);
    setResultsData(null); // Clear old data immediately
    
    try {
      let startDateStr, endDateStr;
      
      // If custom date range is selected and dates are set, use those
      if (dateRange === 'custom' && startDate && endDate) {
        startDateStr = startDate;
        endDateStr = endDate;
      } else {
        // Otherwise use the resultsDateRange dropdown (7, 14, 30, 60, 90 days)
        const getLastNDays = (days) => {
          const dates = [];
          const today = new Date();
          let daysBack = 0;
          let weekdaysFound = 0;
          const targetDays = parseInt(days);
          
          while (weekdaysFound < targetDays && daysBack < targetDays * 2) {
            const date = new Date(today);
            date.setDate(date.getDate() - daysBack);
            const dayOfWeek = date.getDay();
            
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Monday-Friday
              dates.push(date.toISOString().slice(0, 10));
              weekdaysFound++;
            }
            daysBack++;
          }
          return dates.reverse();
        };

        const weekdays = getLastNDays(resultsDateRange);
        startDateStr = weekdays.length > 0 ? weekdays[0] : new Date(Date.now() - parseInt(resultsDateRange) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        endDateStr = weekdays.length > 0 ? weekdays[weekdays.length - 1] : new Date().toISOString().slice(0, 10);
      }

      // Fetch snapshots and response time metrics
      const snapshotParams = new URLSearchParams();
      snapshotParams.append('startDate', startDateStr);
      snapshotParams.append('endDate', endDateStr);
      
      const snapshotUrl = process.env.NODE_ENV === 'production'
        ? `${window.location.origin}/api/snapshots/get?${snapshotParams}`
        : `https://queue-health-monitor.vercel.app/api/snapshots/get?${snapshotParams}`;
      
      const metricParams = new URLSearchParams();
      metricParams.append('startDate', startDateStr);
      metricParams.append('endDate', endDateStr);
      
      const metricUrl = process.env.NODE_ENV === 'production'
        ? `${window.location.origin}/api/response-time-metrics/get?${metricParams}`
        : `https://queue-health-monitor.vercel.app/api/response-time-metrics/get?${metricParams}`;

      const [snapshotRes, metricRes] = await Promise.all([
        fetch(snapshotUrl).catch(() => ({ ok: false })),
        fetch(metricUrl).catch(() => ({ ok: false }))
      ]);

      const snapshots = snapshotRes.ok ? (await snapshotRes.json()).snapshots || [] : [];
      const metrics = metricRes.ok ? (await metricRes.json()).metrics || [] : [];

      // Process data to correlate compliance with slow first response
      const correlationData = processComplianceResponseTimeCorrelation(snapshots, metrics);
      
      // Only set data if we actually got valid correlation data
      // If correlationData is null (no data or insufficient data), resultsData stays null
      setResultsData(correlationData);
    } catch (error) {
      console.error('Error fetching results data:', error);
      setResultsData(null);
    } finally {
      setLoadingResults(false);
    }
  };

  // Process compliance vs response time correlation
  const processComplianceResponseTimeCorrelation = (snapshots, responseTimeMetrics) => {
    if (!snapshots.length || !responseTimeMetrics.length) return null;

    const EXCLUDED_TSE_NAMES = ["Prerit Sachdeva", "Stephen Skalamera"];
    const COMPLIANCE_THRESHOLDS = {
      MAX_OPEN_SOFT: 5,
      MAX_WAITING_ON_TSE_SOFT: 5
    };

    // Create a map of date -> compliance data
    const complianceByDate = {};
    snapshots.forEach(snapshot => {
      const tseData = snapshot.tseData.filter(tse => !EXCLUDED_TSE_NAMES.includes(tse.name));
      if (tseData.length === 0) return;

      let compliantCount = 0;
      let totalCount = 0;

      tseData.forEach(tse => {
        totalCount++;
        const meetsOpen = tse.open <= COMPLIANCE_THRESHOLDS.MAX_OPEN_SOFT;
        // Compliance uses: open conversations and snoozed conversations with tag snooze.waiting-on-tse
        // actionableSnoozed = snoozed conversations with tag snooze.waiting-on-tse
        const totalWaitingOnTSE = tse.actionableSnoozed || 0;
        const meetsSnoozed = totalWaitingOnTSE <= COMPLIANCE_THRESHOLDS.MAX_WAITING_ON_TSE_SOFT;
        
        if (meetsOpen && meetsSnoozed) {
          compliantCount++;
        }
      });

      const compliancePct = totalCount > 0 ? Math.round((compliantCount / totalCount) * 100) : 0;
      complianceByDate[snapshot.date] = {
        date: snapshot.date,
        compliance: compliancePct,
        compliantCount,
        totalCount
      };
    });

    // Combine with response time metrics
    const combinedData = responseTimeMetrics
      .map(metric => {
        const compliance = complianceByDate[metric.date];
        if (!compliance) return null;

        return {
          date: metric.date,
          compliance: compliance.compliance,
          slowResponsePct: metric.percentage10PlusMin || 0,
          slowResponseCount: metric.count10PlusMin || 0,
          totalConversations: metric.totalConversations || 0
        };
      })
      .filter(d => d !== null)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (combinedData.length === 0) return null;

    // Calculate correlation coefficient
    const avgCompliance = combinedData.reduce((sum, d) => sum + d.compliance, 0) / combinedData.length;
    const avgSlowResponse = combinedData.reduce((sum, d) => sum + d.slowResponsePct, 0) / combinedData.length;

    let numerator = 0;
    let sumSqCompliance = 0;
    let sumSqSlowResponse = 0;

    combinedData.forEach(d => {
      const complianceDiff = d.compliance - avgCompliance;
      const slowResponseDiff = d.slowResponsePct - avgSlowResponse;
      numerator += complianceDiff * slowResponseDiff;
      sumSqCompliance += complianceDiff * complianceDiff;
      sumSqSlowResponse += slowResponseDiff * slowResponseDiff;
    });

    const correlation = sumSqCompliance > 0 && sumSqSlowResponse > 0
      ? numerator / Math.sqrt(sumSqCompliance * sumSqSlowResponse)
      : 0;

    // Group by compliance ranges
    const complianceRanges = {
      'High (80-100%)': { min: 80, max: 100, data: [] },
      'Medium (60-79%)': { min: 60, max: 79, data: [] },
      'Low (0-59%)': { min: 0, max: 59, data: [] }
    };

    combinedData.forEach(d => {
      if (d.compliance >= 80) {
        complianceRanges['High (80-100%)'].data.push(d);
      } else if (d.compliance >= 60) {
        complianceRanges['Medium (60-79%)'].data.push(d);
      } else {
        complianceRanges['Low (0-59%)'].data.push(d);
      }
    });

    const rangeStats = Object.entries(complianceRanges).map(([range, { data }]) => {
      if (data.length === 0) return null;
      const avgSlowResponse = data.reduce((sum, d) => sum + d.slowResponsePct, 0) / data.length;
      const totalSlowResponses = data.reduce((sum, d) => sum + d.slowResponseCount, 0);
      const totalConversations = data.reduce((sum, d) => sum + d.totalConversations, 0);
      
      return {
        range,
        count: data.length,
        avgCompliance: data.reduce((sum, d) => sum + d.compliance, 0) / data.length,
        avgSlowResponsePct: Math.round(avgSlowResponse * 100) / 100,
        totalSlowResponses,
        totalConversations,
        slowResponseRate: totalConversations > 0 ? Math.round((totalSlowResponses / totalConversations) * 100 * 100) / 100 : 0
      };
    }).filter(s => s !== null);

    return {
      correlation: Math.round(correlation * 1000) / 1000,
      correlationStrength: Math.abs(correlation) < 0.3 ? 'weak' : Math.abs(correlation) < 0.7 ? 'moderate' : 'strong',
      correlationDirection: correlation < 0 ? 'negative' : 'positive',
      dataPoints: combinedData,
      rangeStats,
      avgCompliance: Math.round(avgCompliance * 100) / 100,
      avgSlowResponse: Math.round(avgSlowResponse * 100) / 100
    };
  };

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
    const EXCLUDED_TSE_NAMES = ["Prerit Sachdeva", "Stephen Skalamera"];
    const tseMap = new Map(); // Use Map to track by name for deduplication
    snapshots.forEach(snapshot => {
      snapshot.tseData?.forEach(tse => {
        // Skip excluded TSEs
        if (!EXCLUDED_TSE_NAMES.includes(tse.name)) {
          // Use name as key to handle cases where ID might differ but name is same
          if (!tseMap.has(tse.name)) {
            tseMap.set(tse.name, { id: tse.id, name: tse.name });
          }
        }
      });
    });
    
    // Also ensure all TSEs from TSE_REGIONS are included, even if not in snapshots
    Object.values(TSE_REGIONS).flat().forEach(tseName => {
      if (!EXCLUDED_TSE_NAMES.includes(tseName) && !tseMap.has(tseName)) {
        // Create a placeholder entry with name as ID if no snapshot data exists
        tseMap.set(tseName, { id: tseName.toLowerCase().replace(/\s+/g, '-'), name: tseName });
      }
    });
    
    const newAvailableTSEs = Array.from(tseMap.values());
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
    // Always select all TSEs by default when they become available
    // Only skip if user has manually cleared the selection
    if (
      availableTSEs.length > 0 && 
      !hasManuallyClearedRef.current
    ) {
      const allTSEIds = availableTSEs.map(tse => String(tse.id));
      // Only update if the selection doesn't match all available TSEs
      const currentIdsSet = new Set(selectedTSEs);
      const allIdsSet = new Set(allTSEIds);
      const isSelectionComplete = allTSEIds.length === selectedTSEs.length && 
                                  allTSEIds.every(id => currentIdsSet.has(id));
      
      if (!isSelectionComplete) {
        setSelectedTSEs(allTSEIds);
        hasInitialSelectionRef.current = true;
      }
    }
  }, [availableTSEs]);

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
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        // If yesterday was a weekend, go back to Friday
        const yesterdayDay = yesterday.getDay();
        if (yesterdayDay === 0) { // Sunday
          yesterday.setDate(yesterday.getDate() - 2); // Go to Friday
        } else if (yesterdayDay === 6) { // Saturday
          yesterday.setDate(yesterday.getDate() - 1); // Go to Friday
        }
        start = yesterday.toISOString().split('T')[0];
        end = yesterday.toISOString().split('T')[0];
        setStartDate(start);
        setEndDate(end);
        break;
      case '7days':
        const dates = getLast7Weekdays();
        start = dates[0];
        end = dates[dates.length - 1];
        setStartDate(start);
        setEndDate(end);
        break;
      case '30days':
        end = today.toISOString().split('T')[0];
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        start = thirtyDaysAgo.toISOString().split('T')[0];
        setStartDate(start);
        setEndDate(end);
        break;
      case '90days':
        end = today.toISOString().split('T')[0];
        const ninetyDaysAgo = new Date(today);
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        start = ninetyDaysAgo.toISOString().split('T')[0];
        setStartDate(start);
        setEndDate(end);
        break;
      case 'custom':
        // Initialize custom dates with current start/end dates if they exist
        if (startDate && endDate) {
          setCustomStartDate(startDate);
          setCustomEndDate(endDate);
        } else {
          // Default to last 7 weekdays
          const defaultDates = getLast7Weekdays();
          if (defaultDates.length > 0) {
            setCustomStartDate(defaultDates[0]);
            setCustomEndDate(defaultDates[defaultDates.length - 1]);
          }
        }
        break;
      default:
        return;
    }
  };

  const handleApplyCustomDateRange = () => {
    if (!customStartDate || !customEndDate) {
      alert('Please select both start and end dates');
      return;
    }
    
    if (new Date(customStartDate) > new Date(customEndDate)) {
      alert('Start date must be before end date');
      return;
    }
    
    setStartDate(customStartDate);
    setEndDate(customEndDate);
    fetchSnapshots();
    fetchResponseTimeMetrics();
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

      const EXCLUDED_TSE_NAMES = ["Prerit Sachdeva", "Stephen Skalamera"];
      let tseData = selectedTSEs.length > 0
        ? snapshot.tseData.filter(tse => selectedTSEs.includes(String(tse.id)))
        : snapshot.tseData;
      
      // Filter out excluded TSEs
      tseData = tseData.filter(tse => !EXCLUDED_TSE_NAMES.includes(tse.name));

      tseData.forEach(tse => {
        dataByDate[date].totalTSEs++;
        const meetsOpen = tse.open <= THRESHOLDS.MAX_OPEN_SOFT;
        // Compliance uses: open conversations and snoozed conversations with tag snooze.waiting-on-tse
        // actionableSnoozed = snoozed conversations with tag snooze.waiting-on-tse
        const totalWaitingOnTSE = tse.actionableSnoozed || 0;
        const meetsSnoozed = totalWaitingOnTSE <= THRESHOLDS.MAX_ACTIONABLE_SNOOZED_SOFT;
        
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

  // Day-of-week analysis
  const dayOfWeekAnalysis = useMemo(() => {
    if (!chartData.length) return null;
    
    const dayStats = {
      'Monday': { count: 0, overall: 0, open: 0, snoozed: 0 },
      'Tuesday': { count: 0, overall: 0, open: 0, snoozed: 0 },
      'Wednesday': { count: 0, overall: 0, open: 0, snoozed: 0 },
      'Thursday': { count: 0, overall: 0, open: 0, snoozed: 0 },
      'Friday': { count: 0, overall: 0, open: 0, snoozed: 0 }
    };
    
    chartData.forEach(d => {
      const [year, month, day] = d.date.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      
      if (dayStats[dayName]) {
        dayStats[dayName].count++;
        dayStats[dayName].overall += d.overallCompliance;
        dayStats[dayName].open += d.openCompliance;
        dayStats[dayName].snoozed += d.snoozedCompliance;
      }
    });
    
    return Object.entries(dayStats).map(([day, stats]) => ({
      day: day.substring(0, 3), // Mon, Tue, etc.
      fullDay: day,
      overallCompliance: stats.count > 0 ? Math.round(stats.overall / stats.count) : 0,
      openCompliance: stats.count > 0 ? Math.round(stats.open / stats.count) : 0,
      snoozedCompliance: stats.count > 0 ? Math.round(stats.snoozed / stats.count) : 0,
      count: stats.count
    })).filter(d => d.count > 0);
  }, [chartData]);

  // Best/worst days analysis
  const bestWorstDays = useMemo(() => {
    if (!chartData.length) return null;
    
    const sorted = [...chartData].sort((a, b) => b.overallCompliance - a.overallCompliance);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    
    const [bestYear, bestMonth, bestDay] = best.date.split('-').map(Number);
    const [worstYear, worstMonth, worstDay] = worst.date.split('-').map(Number);
    const bestDate = new Date(bestYear, bestMonth - 1, bestDay);
    const worstDate = new Date(worstYear, worstMonth - 1, worstDay);
    
    return {
      best: {
        date: best.date,
        displayDate: `${bestDate.getMonth() + 1}/${bestDate.getDate()}`,
        overall: best.overallCompliance,
        open: best.openCompliance,
        snoozed: best.snoozedCompliance
      },
      worst: {
        date: worst.date,
        displayDate: `${worstDate.getMonth() + 1}/${worstDate.getDate()}`,
        overall: worst.overallCompliance,
        open: worst.openCompliance,
        snoozed: worst.snoozedCompliance
      }
    };
  }, [chartData]);

  // Region comparison
  const regionComparison = useMemo(() => {
    if (!snapshots.length || !selectedTSEs.length) return null;
    
    const regionStats = { 'UK': [], 'NY': [], 'SF': [], 'Other': [] };
    
    snapshots.forEach(snapshot => {
      const EXCLUDED_TSE_NAMES = ["Prerit Sachdeva", "Stephen Skalamera"];
      let tseData = snapshot.tseData.filter(tse => selectedTSEs.includes(String(tse.id)));
      tseData = tseData.filter(tse => !EXCLUDED_TSE_NAMES.includes(tse.name));
      
      const regionCompliance = { 'UK': { total: 0, compliant: 0 }, 'NY': { total: 0, compliant: 0 }, 'SF': { total: 0, compliant: 0 }, 'Other': { total: 0, compliant: 0 } };
      
      tseData.forEach(tse => {
        const region = getTSERegion(tse.name);
        const meetsOpen = tse.open <= THRESHOLDS.MAX_OPEN_SOFT;
        // Compliance uses: open conversations and snoozed conversations with tag snooze.waiting-on-tse
        // actionableSnoozed = snoozed conversations with tag snooze.waiting-on-tse
        const totalWaitingOnTSE = tse.actionableSnoozed || 0;
        const meetsSnoozed = totalWaitingOnTSE <= THRESHOLDS.MAX_ACTIONABLE_SNOOZED_SOFT;
        
        regionCompliance[region].total++;
        if (meetsOpen && meetsSnoozed) regionCompliance[region].compliant++;
      });
      
      Object.keys(regionCompliance).forEach(region => {
        if (regionCompliance[region].total > 0) {
          const compliance = Math.round((regionCompliance[region].compliant / regionCompliance[region].total) * 100);
          regionStats[region].push(compliance);
        }
      });
    });
    
    return Object.entries(regionStats).map(([region, values]) => {
      if (values.length === 0) return null;
      const avg = Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
      return { region, average: avg, count: values.length };
    }).filter(r => r !== null && r.region !== 'Other');
  }, [snapshots, selectedTSEs]);

  // Trend analysis with moving averages
  const trendAnalysis = useMemo(() => {
    if (!chartData.length || chartData.length < 2) return null;
    
    const firstHalf = chartData.slice(0, Math.ceil(chartData.length / 2));
    const secondHalf = chartData.slice(Math.ceil(chartData.length / 2));
    
    const firstAvg = Math.round((firstHalf.reduce((sum, d) => sum + d.overallCompliance, 0) / firstHalf.length) * 100) / 100;
    const secondAvg = Math.round((secondHalf.reduce((sum, d) => sum + d.overallCompliance, 0) / secondHalf.length) * 100) / 100;
    const change = Math.round((secondAvg - firstAvg) * 100) / 100;
    
    // Calculate volatility (standard deviation)
    const avg = chartData.reduce((sum, d) => sum + d.overallCompliance, 0) / chartData.length;
    const variance = chartData.reduce((sum, d) => sum + Math.pow(d.overallCompliance - avg, 2), 0) / chartData.length;
    const volatility = Math.round(Math.sqrt(variance) * 100) / 100;
    
    return {
      firstHalfAvg: firstAvg,
      secondHalfAvg: secondAvg,
      change,
      trend: change > 2 ? 'improving' : change < -2 ? 'worsening' : 'stable',
      volatility,
      currentAvg: Math.round(avg * 100) / 100
    };
  }, [chartData]);

  // Calculate average compliance per TSE across selected date range
  const tseAverageCompliance = useMemo(() => {
    if (!snapshots.length) return [];

    const EXCLUDED_TSE_NAMES = ["Prerit Sachdeva", "Stephen Skalamera"];
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
        // Compliance uses: open conversations and snoozed conversations with tag snooze.waiting-on-tse
        // actionableSnoozed = snoozed conversations with tag snooze.waiting-on-tse
        const totalWaitingOnTSE = tse.actionableSnoozed || 0;
        const meetsSnoozed = totalWaitingOnTSE <= THRESHOLDS.MAX_ACTIONABLE_SNOOZED_SOFT;
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

    const EXCLUDED_TSE_NAMES = ["Prerit Sachdeva", "Stephen Skalamera"];
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
        // Compliance uses: open conversations and snoozed conversations with tag snooze.waiting-on-tse
        // actionableSnoozed = snoozed conversations with tag snooze.waiting-on-tse
        const totalWaitingOnTSE = tse.actionableSnoozed || 0;
        const meetsSnoozed = totalWaitingOnTSE <= THRESHOLDS.MAX_ACTIONABLE_SNOOZED_SOFT;
        const exceedsTargets = tse.open === 0 && totalWaitingOnTSE === 0;
        const overallCompliant = meetsOpen && meetsSnoozed;
        
        groupedByDate[snapshot.date].tses.push({
          tseName: tse.name,
          open: tse.open,
          actionableSnoozed: tse.actionableSnoozed,
          customerWaitSnoozed: tse.customerWaitSnoozed,
          totalSnoozed: tse.totalSnoozed || 0,
          openCompliant: meetsOpen,
          snoozedCompliant: meetsSnoozed,
          overallCompliant: overallCompliant,
          exceedsTargets: exceedsTargets
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

  const unselectRegionTSEs = (region) => {
    const regionTSEs = tseByRegion[region] || [];
    const regionTSEIds = regionTSEs.map(tse => String(tse.id));
    
    setHasManuallyCleared(true);
    hasManuallyClearedRef.current = true;
    
    setSelectedTSEs(prev => {
      // Remove all region TSEs from selection
      return prev.filter(id => !regionTSEIds.includes(id));
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

  // Day-of-week analysis for response time
  const responseTimeDayOfWeek = useMemo(() => {
    if (!responseTimeChartData.length) return null;
    
    const dayStats = {
      'Monday': { count: 0, percentage: 0, totalConversations: 0, slowConversations: 0 },
      'Tuesday': { count: 0, percentage: 0, totalConversations: 0, slowConversations: 0 },
      'Wednesday': { count: 0, percentage: 0, totalConversations: 0, slowConversations: 0 },
      'Thursday': { count: 0, percentage: 0, totalConversations: 0, slowConversations: 0 },
      'Friday': { count: 0, percentage: 0, totalConversations: 0, slowConversations: 0 }
    };
    
    responseTimeChartData.forEach(d => {
      const [year, month, day] = d.date.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      
      if (dayStats[dayName]) {
        dayStats[dayName].count++;
        dayStats[dayName].percentage += d.percentage10PlusMin;
        dayStats[dayName].totalConversations += d.totalConversations;
        dayStats[dayName].slowConversations += d.count10PlusMin;
      }
    });
    
    return Object.entries(dayStats).map(([day, stats]) => ({
      day: day.substring(0, 3),
      fullDay: day,
      avgPercentage: stats.count > 0 ? Math.round((stats.percentage / stats.count) * 100) / 100 : 0,
      avgTotalConversations: stats.count > 0 ? Math.round(stats.totalConversations / stats.count) : 0,
      avgSlowConversations: stats.count > 0 ? Math.round(stats.slowConversations / stats.count) : 0,
      count: stats.count
    })).filter(d => d.count > 0);
  }, [responseTimeChartData]);

  // Best/worst days for response time
  const responseTimeBestWorst = useMemo(() => {
    if (!responseTimeChartData.length) return null;
    
    const sortedByPercentage = [...responseTimeChartData].sort((a, b) => b.percentage10PlusMin - a.percentage10PlusMin);
    const sortedByCount = [...responseTimeChartData].sort((a, b) => b.count10PlusMin - a.count10PlusMin);
    
    const worstPercentage = sortedByPercentage[0];
    const bestPercentage = sortedByPercentage[sortedByPercentage.length - 1];
    const worstCount = sortedByCount[0];
    const bestCount = sortedByCount[sortedByCount.length - 1];
    
    const formatDate = (dateStr) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    };
    
    return {
      worstPercentage: {
        date: worstPercentage.date,
        displayDate: formatDate(worstPercentage.date),
        percentage: worstPercentage.percentage10PlusMin,
        count: worstPercentage.count10PlusMin,
        total: worstPercentage.totalConversations
      },
      bestPercentage: {
        date: bestPercentage.date,
        displayDate: formatDate(bestPercentage.date),
        percentage: bestPercentage.percentage10PlusMin,
        count: bestPercentage.count10PlusMin,
        total: bestPercentage.totalConversations
      },
      worstCount: {
        date: worstCount.date,
        displayDate: formatDate(worstCount.date),
        percentage: worstCount.percentage10PlusMin,
        count: worstCount.count10PlusMin,
        total: worstCount.totalConversations
      },
      bestCount: {
        date: bestCount.date,
        displayDate: formatDate(bestCount.date),
        percentage: bestCount.percentage10PlusMin,
        count: bestCount.count10PlusMin,
        total: bestCount.totalConversations
      }
    };
  }, [responseTimeChartData]);

  // Volume vs performance correlation
  const volumePerformanceData = useMemo(() => {
    if (!responseTimeChartData.length) return null;
    
    return responseTimeChartData.map(d => ({
      totalConversations: d.totalConversations,
      percentage: d.percentage10PlusMin,
      date: d.displayLabel
    }));
  }, [responseTimeChartData]);

  // Calculate correlation coefficient
  const volumeCorrelation = useMemo(() => {
    if (!volumePerformanceData || volumePerformanceData.length < 2) return null;
    
    const n = volumePerformanceData.length;
    const sumX = volumePerformanceData.reduce((sum, d) => sum + d.totalConversations, 0);
    const sumY = volumePerformanceData.reduce((sum, d) => sum + d.percentage, 0);
    const sumXY = volumePerformanceData.reduce((sum, d) => sum + d.totalConversations * d.percentage, 0);
    const sumX2 = volumePerformanceData.reduce((sum, d) => sum + d.totalConversations * d.totalConversations, 0);
    const sumY2 = volumePerformanceData.reduce((sum, d) => sum + d.percentage * d.percentage, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    const correlation = denominator !== 0 ? numerator / denominator : 0;
    
    return {
      correlation: Math.round(correlation * 100) / 100,
      interpretation: Math.abs(correlation) < 0.3 ? 'weak' : Math.abs(correlation) < 0.7 ? 'moderate' : 'strong',
      direction: correlation > 0 ? 'positive' : 'negative'
    };
  }, [volumePerformanceData]);

  // Trend analysis with moving averages
  const responseTimeTrendAnalysis = useMemo(() => {
    if (!responseTimeChartData.length || responseTimeChartData.length < 2) return null;
    
    const sorted = [...responseTimeChartData].sort((a, b) => new Date(a.date) - new Date(b.date));
    const firstHalf = sorted.slice(0, Math.ceil(sorted.length / 2));
    const secondHalf = sorted.slice(Math.ceil(sorted.length / 2));
    
    const firstAvg = Math.round((firstHalf.reduce((sum, d) => sum + d.percentage10PlusMin, 0) / firstHalf.length) * 100) / 100;
    const secondAvg = Math.round((secondHalf.reduce((sum, d) => sum + d.percentage10PlusMin, 0) / secondHalf.length) * 100) / 100;
    const change = Math.round((secondAvg - firstAvg) * 100) / 100;
    
    // Calculate volatility (standard deviation)
    const avg = sorted.reduce((sum, d) => sum + d.percentage10PlusMin, 0) / sorted.length;
    const variance = sorted.reduce((sum, d) => sum + Math.pow(d.percentage10PlusMin - avg, 2), 0) / sorted.length;
    const volatility = Math.round(Math.sqrt(variance) * 100) / 100;
    
    // Calculate moving average (7-day if enough data)
    const movingAvg = sorted.length >= 7 ? sorted.slice(-7).reduce((sum, d) => sum + d.percentage10PlusMin, 0) / 7 : avg;
    
    return {
      firstHalfAvg: firstAvg,
      secondHalfAvg: secondAvg,
      change,
      trend: change < -1 ? 'improving' : change > 1 ? 'worsening' : 'stable',
      volatility,
      currentAvg: Math.round(avg * 100) / 100,
      movingAvg: Math.round(movingAvg * 100) / 100
    };
  }, [responseTimeChartData]);

  // Peak detection (outlier days)
  const responseTimePeaks = useMemo(() => {
    if (!responseTimeChartData.length) return null;
    
    const percentages = responseTimeChartData.map(d => d.percentage10PlusMin);
    const avg = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
    const variance = percentages.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / percentages.length;
    const stdDev = Math.sqrt(variance);
    
    const threshold = avg + (2 * stdDev); // 2 standard deviations
    
    const outliers = responseTimeChartData
      .filter(d => d.percentage10PlusMin >= threshold)
      .map(d => {
        const [year, month, day] = d.date.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return {
          date: d.date,
          displayDate: `${date.getMonth() + 1}/${date.getDate()}`,
          percentage: Math.round(d.percentage10PlusMin * 100) / 100,
          count: d.count10PlusMin,
          total: d.totalConversations,
          deviation: Math.round((d.percentage10PlusMin - avg) / stdDev * 100) / 100
        };
      })
      .sort((a, b) => b.percentage - a.percentage);
    
    return {
      outliers,
      threshold: Math.round(threshold * 100) / 100,
      average: Math.round(avg * 100) / 100
    };
  }, [responseTimeChartData]);

  // Comparison metrics (current vs previous period)
  const responseTimeComparison = useMemo(() => {
    if (!responseTimeChartData.length || responseTimeChartData.length < 2) return null;
    
    const sorted = [...responseTimeChartData].sort((a, b) => new Date(a.date) - new Date(b.date));
    const currentPeriod = sorted.slice(-7); // Last 7 days
    const previousPeriod = sorted.slice(-14, -7); // Previous 7 days before that
    
    if (previousPeriod.length === 0) return null;
    
    const currentAvg = currentPeriod.reduce((sum, d) => sum + d.percentage10PlusMin, 0) / currentPeriod.length;
    const previousAvg = previousPeriod.reduce((sum, d) => sum + d.percentage10PlusMin, 0) / previousPeriod.length;
    const change = currentAvg - previousAvg;
    
    const allTimeAvg = sorted.reduce((sum, d) => sum + d.percentage10PlusMin, 0) / sorted.length;
    
    return {
      currentPeriodAvg: Math.round(currentAvg * 100) / 100,
      previousPeriodAvg: Math.round(previousAvg * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round((change / previousAvg) * 100 * 100) / 100,
      allTimeAvg: Math.round(allTimeAvg * 100) / 100,
      vsAllTime: Math.round((currentAvg - allTimeAvg) * 100) / 100
    };
  }, [responseTimeChartData]);

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
        <h2>Analytics</h2>
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
        <button 
          className={activeTab === 'results' ? 'active' : ''}
          onClick={() => setActiveTab('results')}
        >
          Impact
        </button>
      </div>

      <div className="historical-filters">
        <div className="filter-group">
          <label>Date Range:</label>
          <select value={dateRange} onChange={(e) => handleDateRangeChange(e.target.value)} className="filter-select">
            <option value="yesterday">Yesterday</option>
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
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="date-input"
                max={customEndDate || undefined}
              />
            </div>
            <div className="filter-group">
              <label>End Date:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="date-input"
                min={customStartDate || undefined}
              />
            </div>
            <div className="filter-group">
              <button 
                onClick={handleApplyCustomDateRange}
                className="apply-date-button"
                disabled={!customStartDate || !customEndDate}
              >
                Apply Date Range
              </button>
            </div>
          </>
        )}

        {(activeTab === 'compliance' || activeTab === 'response-time') && (
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
                    'UK': 'UK',
                    'NY': 'New York',
                    'SF': 'San Francisco',
                    'Other': 'Other'
                  };
                  const iconUrl = REGION_ICONS[region];

                  const allRegionTSEsSelected = regionTSEs.every(tse => selectedTSEs.includes(String(tse.id)));
                  const anyRegionTSEsSelected = regionTSEs.some(tse => selectedTSEs.includes(String(tse.id)));
                  
                  return (
                    <div key={region} className="tse-region-filter-group">
                      <div 
                        className="tse-region-filter-header"
                        onClick={() => toggleRegion(region)}
                      >
                        <span className="region-expand-icon">{isRegionExpanded ? '▼' : '▶'}</span>
                        <span className="region-filter-name">{regionLabels[region]}</span>
                        {iconUrl && (
                          <img 
                            src={iconUrl} 
                            alt={region} 
                            className="region-filter-icon"
                          />
                        )}
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
                        {anyRegionTSEsSelected && (
                          <button
                            className="region-unselect-all-button"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent region toggle
                              unselectRegionTSEs(region);
                            }}
                            title="Unselect all TSEs in this region"
                          >
                            Unselect All
                          </button>
                        )}
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
          {/* Average Compliance Summary */}
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

          {/* Insights Section */}
          <div className="insights-section">
            {/* Trend Analysis & Best/Worst Days */}
            {trendAnalysis && bestWorstDays && (
              <div className="insights-row">
                <div className="summary-card trend-card">
                  <h4>Trend Analysis</h4>
                  <div className="trend-content">
                    <div className="trend-comparison">
                      <div className="trend-period">
                        <span className="trend-label">First Half</span>
                        <span className="trend-value">{trendAnalysis.firstHalfAvg}%</span>
                      </div>
                      <div className="trend-arrow">→</div>
                      <div className="trend-period">
                        <span className="trend-label">Second Half</span>
                        <span className="trend-value">{trendAnalysis.secondHalfAvg}%</span>
                      </div>
                    </div>
                    <div className={`trend-indicator ${trendAnalysis.trend}`}>
                      {trendAnalysis.trend === 'improving' && '↑'}
                      {trendAnalysis.trend === 'worsening' && '↓'}
                      {trendAnalysis.trend === 'stable' && '→'}
                      {Math.abs(trendAnalysis.change)}% {trendAnalysis.trend === 'improving' ? 'improvement' : trendAnalysis.trend === 'worsening' ? 'decline' : 'stable'}
                    </div>
                    <div className="volatility-metric">
                      <span className="volatility-label">Volatility</span>
                      <span className="volatility-value">±{trendAnalysis.volatility}%</span>
                    </div>
                  </div>
                </div>
                <div className="summary-card best-worst-card">
                  <h4>Best Day</h4>
                  <div className="best-worst-content">
                    <div className="best-worst-date">{bestWorstDays.best.displayDate}</div>
                    <div className="best-worst-value">{bestWorstDays.best.overall}%</div>
                    <div className="best-worst-breakdown">
                      Open: {bestWorstDays.best.open}% | Snoozed: {bestWorstDays.best.snoozed}%
                    </div>
                  </div>
                </div>
                <div className="summary-card best-worst-card worst">
                  <h4>Worst Day</h4>
                  <div className="best-worst-content">
                    <div className="best-worst-date">{bestWorstDays.worst.displayDate}</div>
                    <div className="best-worst-value">{bestWorstDays.worst.overall}%</div>
                    <div className="best-worst-breakdown">
                      Open: {bestWorstDays.worst.open}% | Snoozed: {bestWorstDays.worst.snoozed}%
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Day-of-Week Analysis */}
            {dayOfWeekAnalysis && dayOfWeekAnalysis.length > 0 && (
              <div className="chart-container">
                <h3 className="chart-title">Day-of-Week Compliance Patterns</h3>
                <p className="chart-subtitle">Average compliance by weekday</p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dayOfWeekAnalysis} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis 
                      dataKey="day" 
                      stroke="#292929"
                      tick={{ fill: '#292929', fontSize: 12 }}
                    />
                    <YAxis 
                      stroke="#292929"
                      tick={{ fill: '#292929', fontSize: 12 }}
                      domain={[0, 100]}
                      label={{ value: 'Compliance %', angle: -90, position: 'insideLeft', fill: '#292929' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #35a1b4', borderRadius: '4px' }}
                      formatter={(value) => [`${value}%`, '']}
                    />
                    <Legend />
                    <Bar dataKey="overallCompliance" fill="#4cec8c" name="Overall Compliance" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="openCompliance" fill="#35a1b4" name="Open Compliance" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="snoozedCompliance" fill="#ff9a74" name="Snoozed Compliance" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Region Comparison */}
            {regionComparison && regionComparison.length > 0 && (
              <div className="chart-container">
                <h3 className="chart-title">Region Comparison</h3>
                <p className="chart-subtitle">Average compliance by region</p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={regionComparison} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis 
                      dataKey="region" 
                      stroke="#292929"
                      tick={{ fill: '#292929', fontSize: 12 }}
                    />
                    <YAxis 
                      stroke="#292929"
                      tick={{ fill: '#292929', fontSize: 12 }}
                      domain={[0, 100]}
                      label={{ value: 'Compliance %', angle: -90, position: 'insideLeft', fill: '#292929' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #35a1b4', borderRadius: '4px' }}
                      formatter={(value) => [`${value}%`, '']}
                    />
                    <Bar dataKey="average" radius={[4, 4, 0, 0]}>
                      {regionComparison.map((entry, index) => {
                        const regionColors = {
                          'UK': '#4cec8c',
                          'NY': '#35a1b4',
                          'SF': '#ff9a74'
                        };
                        return <Cell key={`cell-${index}`} fill={regionColors[entry.region] || '#35a1b4'} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
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
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const tseName = payload[0].payload?.name || '';
                        return (
                          <div style={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #35a1b4', 
                            borderRadius: '4px',
                            padding: '8px 12px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}>
                            <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '13px', color: '#292929' }}>
                              {tseName}
                            </div>
                            {payload.map((entry, index) => (
                              <div key={index} style={{ color: entry.color, marginBottom: '4px', fontSize: '12px' }}>
                                {entry.name}: {entry.value}%
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
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

          <div className="historical-table-section">
            <h3 className="section-title">Historical Compliance Data</h3>
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
                                      <th>Snoozed - Waiting On TSE</th>
                                      <th>Snoozed - Waiting On Customer</th>
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
                                          {(() => {
                                            const tooltipKey = `${dateGroup.date}-${tse.tseName}`;
                                            const isClicked = clickedTooltip === tooltipKey;
                                            const tooltipText = tse.exceedsTargets
                                              ? `Outstanding - Open: ${tse.open} (target: ≤${THRESHOLDS.MAX_OPEN_SOFT}), Waiting on TSE: ${tse.actionableSnoozed || 0} (target: ≤${THRESHOLDS.MAX_ACTIONABLE_SNOOZED_SOFT})`
                                              : tse.overallCompliant
                                              ? `On Track - Open: ${tse.open} (target: ≤${THRESHOLDS.MAX_OPEN_SOFT}), Waiting on TSE: ${tse.actionableSnoozed || 0} (target: ≤${THRESHOLDS.MAX_ACTIONABLE_SNOOZED_SOFT})`
                                              : `Over Limit - Needs Attention - Open: ${tse.open} (target: ≤${THRESHOLDS.MAX_OPEN_SOFT}), Waiting on TSE: ${tse.actionableSnoozed || 0} (target: ≤${THRESHOLDS.MAX_ACTIONABLE_SNOOZED_SOFT})`;
                                            
                                            return (
                                              <div style={{ position: 'relative', display: 'inline-block' }}>
                                                {tse.exceedsTargets ? (
                                                  <span 
                                                    className="compliant-badge exceeds-targets clickable-badge" 
                                                    title={tooltipText}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setClickedTooltip(isClicked ? null : tooltipKey);
                                                    }}
                                                  >
                                                    ⭐
                                                  </span>
                                                ) : (
                                                  <span 
                                                    className={`compliant-badge ${tse.overallCompliant ? 'compliant' : 'non-compliant'} clickable-badge`}
                                                    title={tooltipText}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setClickedTooltip(isClicked ? null : tooltipKey);
                                                    }}
                                                  >
                                                    {tse.overallCompliant ? "✓" : "✗"}
                                                  </span>
                                                )}
                                                {isClicked && (
                                                  <div className="tooltip-popup">
                                                    <div className="tooltip-content">
                                                      <div className="tooltip-header">
                                                        <span className="tooltip-title">{tse.exceedsTargets ? 'Outstanding' : tse.overallCompliant ? 'On Track' : 'Over Limit - Needs Attention'}</span>
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
                                                          <strong>Open:</strong> {tse.open} (target: ≤{THRESHOLDS.MAX_OPEN_SOFT})
                                                        </div>
                                                        <div className="tooltip-metric">
                                                          <strong>Waiting on TSE:</strong> {tse.actionableSnoozed || 0} (target: ≤{THRESHOLDS.MAX_ACTIONABLE_SNOOZED_SOFT})
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })()}
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

              {/* Response Time Insights Section */}
              <div className="insights-section">
                {/* Trend Analysis & Best/Worst Days */}
                {responseTimeTrendAnalysis && responseTimeBestWorst && (
                  <div className="insights-row">
                    <div className="summary-card trend-card">
                      <h4>Trend Analysis</h4>
                      <div className="trend-content">
                        <div className="trend-comparison">
                          <div className="trend-period">
                            <span className="trend-label">First Half</span>
                            <span className="trend-value">{responseTimeTrendAnalysis.firstHalfAvg}%</span>
                          </div>
                          <div className="trend-arrow">→</div>
                          <div className="trend-period">
                            <span className="trend-label">Second Half</span>
                            <span className="trend-value">{responseTimeTrendAnalysis.secondHalfAvg}%</span>
                          </div>
                        </div>
                        <div className={`trend-indicator ${responseTimeTrendAnalysis.trend}`}>
                          {responseTimeTrendAnalysis.trend === 'improving' && '↓'}
                          {responseTimeTrendAnalysis.trend === 'worsening' && '↑'}
                          {responseTimeTrendAnalysis.trend === 'stable' && '→'}
                          {Math.abs(responseTimeTrendAnalysis.change)}% {responseTimeTrendAnalysis.trend === 'improving' ? 'improvement' : responseTimeTrendAnalysis.trend === 'worsening' ? 'increase' : 'stable'}
                        </div>
                        <div className="volatility-metric">
                          <span className="volatility-label">Volatility</span>
                          <span className="volatility-value">±{responseTimeTrendAnalysis.volatility}%</span>
                        </div>
                        <div className="volatility-metric">
                          <span className="volatility-label">7-Day Moving Avg</span>
                          <span className="volatility-value">{responseTimeTrendAnalysis.movingAvg}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="summary-card best-worst-card">
                      <h4>Best Day (Lowest %)</h4>
                      <div className="best-worst-content">
                        <div className="best-worst-date">{responseTimeBestWorst.bestPercentage.displayDate}</div>
                        <div className="best-worst-value">{responseTimeBestWorst.bestPercentage.percentage}%</div>
                        <div className="best-worst-breakdown">
                          {responseTimeBestWorst.bestPercentage.count} slow / {responseTimeBestWorst.bestPercentage.total} total
                        </div>
                      </div>
                    </div>
                    <div className="summary-card best-worst-card worst">
                      <h4>Worst Day (Highest %)</h4>
                      <div className="best-worst-content">
                        <div className="best-worst-date">{responseTimeBestWorst.worstPercentage.displayDate}</div>
                        <div className="best-worst-value">{responseTimeBestWorst.worstPercentage.percentage}%</div>
                        <div className="best-worst-breakdown">
                          {responseTimeBestWorst.worstPercentage.count} slow / {responseTimeBestWorst.worstPercentage.total} total
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Comparison Metrics */}
                {responseTimeComparison && (
                  <div className="insights-row">
                    <div className="summary-card trend-card">
                      <h4>Period Comparison</h4>
                      <div className="trend-content">
                        <div className="trend-comparison">
                          <div className="trend-period">
                            <span className="trend-label">Previous 7 Days</span>
                            <span className="trend-value">{responseTimeComparison.previousPeriodAvg}%</span>
                          </div>
                          <div className="trend-arrow">→</div>
                          <div className="trend-period">
                            <span className="trend-label">Current 7 Days</span>
                            <span className="trend-value">{responseTimeComparison.currentPeriodAvg}%</span>
                          </div>
                        </div>
                        <div className={`trend-indicator ${responseTimeComparison.change < 0 ? 'improving' : responseTimeComparison.change > 0 ? 'worsening' : 'stable'}`}>
                          {responseTimeComparison.change < 0 && '↓'}
                          {responseTimeComparison.change > 0 && '↑'}
                          {responseTimeComparison.change === 0 && '→'}
                          {Math.abs(responseTimeComparison.change)}% ({Math.abs(responseTimeComparison.changePercent)}%)
                        </div>
                        <div className="volatility-metric">
                          <span className="volatility-label">All-Time Average</span>
                          <span className="volatility-value">{responseTimeComparison.allTimeAvg}%</span>
                        </div>
                        <div className="volatility-metric">
                          <span className="volatility-label">vs All-Time</span>
                          <span className={`volatility-value ${responseTimeComparison.vsAllTime < 0 ? 'improving' : responseTimeComparison.vsAllTime > 0 ? 'worsening' : 'stable'}`}>
                            {responseTimeComparison.vsAllTime > 0 ? '+' : ''}{responseTimeComparison.vsAllTime}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Day-of-Week Analysis */}
                {responseTimeDayOfWeek && responseTimeDayOfWeek.length > 0 && (
                  <div className="chart-container">
                    <h3 className="chart-title">Day-of-Week Response Time Patterns</h3>
                    <p className="chart-subtitle">10+ Min Wait Times: Average Count and Percentage of Total Chats by day of week</p>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={responseTimeDayOfWeek} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis 
                          dataKey="day" 
                          stroke="#292929"
                          tick={{ fill: '#292929', fontSize: 12 }}
                        />
                        <YAxis 
                          yAxisId="left"
                          stroke="#292929"
                          tick={{ fill: '#292929', fontSize: 12 }}
                          label={{ value: 'Percentage %', angle: -90, position: 'insideLeft', fill: '#292929' }}
                        />
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          stroke="#292929"
                          tick={{ fill: '#292929', fontSize: 12 }}
                          label={{ value: 'Count', angle: 90, position: 'insideRight', fill: '#292929' }}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'white', border: '1px solid #35a1b4', borderRadius: '4px' }}
                          formatter={(value, name) => {
                            if (name === 'avgPercentage') return [`${value}%`, 'Avg Percentage'];
                            if (name === 'avgSlowConversations') return [value, 'Avg Slow First Response Chat Count (10+ min)'];
                            return [value, name];
                          }}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="avgPercentage" fill="#35a1b4" name="Avg Percentage" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="right" dataKey="avgSlowConversations" fill="#ff9a74" name="Avg Slow First Response Chat Count (10+ min)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Volume vs Performance Correlation */}
                {volumePerformanceData && volumeCorrelation && (
                  <div className="chart-container">
                    <h3 className="chart-title">Volume vs Performance Correlation</h3>
                    <p className="chart-subtitle">
                      {volumeCorrelation.interpretation === 'weak' ? 'Weak' : volumeCorrelation.interpretation === 'moderate' ? 'Moderate' : 'Strong'} 
                      {' '}{volumeCorrelation.direction} correlation ({volumeCorrelation.correlation})
                      {volumeCorrelation.direction === 'positive' ? ' - Higher volume correlates with worse performance' : ' - Higher volume correlates with better performance'}
                    </p>
                    <ResponsiveContainer width="100%" height={400}>
                      <ScatterChart data={volumePerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis 
                          type="number"
                          dataKey="totalConversations"
                          name="Total Conversations"
                          stroke="#292929"
                          tick={{ fill: '#292929', fontSize: 12 }}
                          label={{ value: 'Total Conversations', position: 'insideBottom', offset: -5, fill: '#292929' }}
                        />
                        <YAxis 
                          type="number"
                          dataKey="percentage"
                          name="Percentage 10+ Min"
                          stroke="#292929"
                          tick={{ fill: '#292929', fontSize: 12 }}
                          label={{ value: 'Percentage 10+ Min', angle: -90, position: 'insideLeft', fill: '#292929' }}
                        />
                        <Tooltip 
                          cursor={{ strokeDasharray: '3 3' }}
                          contentStyle={{ backgroundColor: 'white', border: '1px solid #35a1b4', borderRadius: '4px' }}
                          formatter={(value, name) => {
                            if (name === 'percentage') return [`${value}%`, 'Percentage'];
                            return [value, name];
                          }}
                        />
                        <Scatter name="Data Points" data={volumePerformanceData} fill="#35a1b4">
                          {volumePerformanceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill="#35a1b4" />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                )}

              </div>

              {/* Detailed Table */}
              <div className="historical-table-section">
                <h3 className="section-title">Historical Response Time Metrics</h3>
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

      {/* Results Tab */}
      {activeTab === 'results' && (
        <ResultsView 
          data={resultsData}
          loading={loadingResults}
          dateRange={dateRange === 'custom' ? 'custom' : resultsDateRange}
          customStartDate={startDate}
          customEndDate={endDate}
        />
      )}
    </div>
  );
}

// Results View Component
function ResultsView({ data, loading, dateRange, customStartDate, customEndDate }) {
  if (loading) {
    return (
      <div className="results-view">
        <div className="loading-state">Loading compliance correlation data...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="results-view">
        <div className="no-data">
          <p>No data available for analysis.</p>
          <p className="no-data-subtext">Historical data is required to analyze compliance impact on response times.</p>
        </div>
      </div>
    );
  }

  // For this analysis, negative correlation is GOOD (higher compliance → lower slow response)
  // Positive correlation is BAD (higher compliance → higher slow response)
  const isGoodCorrelation = data.correlationDirection === 'negative';
  const correlationColor = isGoodCorrelation ? '#4cec8c' : '#fd8789';
  const correlationLabel = isGoodCorrelation
    ? 'Higher compliance correlates with lower slow response rates (desired outcome)' 
    : 'Higher compliance correlates with higher slow response rates (concerning)';

  return (
    <div className="results-view">
      <div className="results-header">
        <h2 className="results-title">Compliance Impact on Slow First Response Times</h2>
        <p className="results-subtitle">
          Analyzing how TSE compliance affects 10+ minute first response conversation rates
        </p>
      </div>


      {/* Key Insights */}
      <div className="results-insights">
        <div className="insight-card results-correlation">
          <div className="insight-header">
            <h3>Correlation Analysis</h3>
          </div>
          <div className="correlation-content">
            <div className="correlation-value" style={{ color: correlationColor }}>
              {data.correlation > 0 ? '+' : ''}{data.correlation.toFixed(2)}
            </div>
            <div className="correlation-label">
              {data.correlationStrength.charAt(0).toUpperCase() + data.correlationStrength.slice(1)} {data.correlationDirection} correlation
              {isGoodCorrelation ? ' (desired)' : ' (concerning)'}
            </div>
            <div className="correlation-description">
              {correlationLabel}
            </div>
          </div>
        </div>

        <div className="insight-card results-summary">
          <div className="insight-header">
            <h3>Overall Averages</h3>
          </div>
          <div className="summary-content">
            <div className="summary-item">
              <span className="summary-label">Average Compliance</span>
              <span className="summary-value">{data.avgCompliance.toFixed(2)}%</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Average Slow Response Rate</span>
              <span className="summary-value">{data.avgSlowResponse.toFixed(2)}%</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Data Points</span>
              <span className="summary-value">{data.dataPoints.length} days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scatter Plot: Compliance vs Slow Response */}
      <div className="results-chart-container">
        <h3 className="chart-title">Compliance vs Slow First Response Rate</h3>
        <p className="chart-subtitle">Each point represents one day's compliance percentage and slow response rate</p>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart data={data.dataPoints} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis 
              type="number"
              dataKey="compliance"
              name="Compliance %"
              domain={[0, 100]}
              stroke="#292929"
              tick={{ fill: '#292929', fontSize: 12 }}
              label={{ value: 'Compliance %', position: 'insideBottom', offset: -5, fill: '#292929' }}
              tickFormatter={(value) => value.toFixed(2)}
            />
            <YAxis 
              type="number"
              dataKey="slowResponsePct"
              name="Slow Response %"
              domain={[0, 'dataMax + 5']}
              stroke="#292929"
              tick={{ fill: '#292929', fontSize: 12 }}
              label={{ value: 'Slow First Response Rate (%)', angle: -90, position: 'insideLeft', fill: '#292929' }}
              tickFormatter={(value) => value.toFixed(2)}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: 'white', border: '1px solid #35a1b4', borderRadius: '4px' }}
              formatter={(value, name) => {
                if (name === 'compliance') return [`${value.toFixed(2)}%`, 'Compliance'];
                if (name === 'slowResponsePct') return [`${value.toFixed(2)}%`, 'Slow Response Rate'];
                return [value, name];
              }}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Scatter 
              name="Compliance vs Slow Response" 
              data={data.dataPoints} 
              fill="#35a1b4"
            >
              {data.dataPoints.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="#35a1b4" opacity={0.6} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Compliance Range Analysis */}
      <div className="results-range-analysis">
        <h3 className="section-title">Performance by Compliance Range</h3>
        <div className="range-stats-grid">
          {data.rangeStats.map((range, index) => {
            const colors = ['#4cec8c', '#fbbf24', '#fd8789'];
            return (
              <div key={index} className="range-stat-card">
                <div className="range-stat-header" style={{ borderLeftColor: colors[index] }}>
                  <h4>{range.range}</h4>
                  <span className="range-count">{range.count} days</span>
                </div>
                <div className="range-stat-content">
                  <div className="range-stat-item">
                    <span className="range-stat-label">Avg Compliance</span>
                    <span className="range-stat-value">{range.avgCompliance.toFixed(2)}%</span>
                  </div>
                  <div className="range-stat-item">
                    <span className="range-stat-label">Avg Slow Response Rate</span>
                    <span className="range-stat-value">{range.avgSlowResponsePct.toFixed(2)}%</span>
                  </div>
                  <div className="range-stat-item">
                    <span className="range-stat-label">Total Slow Responses</span>
                    <span className="range-stat-value">{range.totalSlowResponses}</span>
                  </div>
                  <div className="range-stat-item">
                    <span className="range-stat-label">Total Conversations</span>
                    <span className="range-stat-value">{range.totalConversations}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trend Over Time */}
      <div className="results-chart-container">
        <h3 className="chart-title">Compliance and Slow Response Trends Over Time</h3>
        <p className="chart-subtitle">Dual-axis chart showing both metrics over the analysis period</p>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data.dataPoints} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis 
              dataKey="date"
              stroke="#292929"
              tick={{ fill: '#292929', fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={80}
              tickFormatter={(value) => {
                const [year, month, day] = value.split('-').map(Number);
                return `${month}/${day}`;
              }}
            />
            <YAxis 
              yAxisId="left"
              stroke="#292929"
              tick={{ fill: '#292929', fontSize: 12 }}
              domain={[0, 100]}
              label={{ value: 'Compliance %', angle: -90, position: 'insideLeft', fill: '#292929' }}
              tickFormatter={(value) => value.toFixed(2)}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="#292929"
              tick={{ fill: '#292929', fontSize: 12 }}
              domain={[0, 'dataMax + 5']}
              label={{ value: 'Slow Response Rate %', angle: 90, position: 'insideRight', fill: '#292929' }}
              tickFormatter={(value) => value.toFixed(2)}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: 'white', border: '1px solid #35a1b4', borderRadius: '4px' }}
              formatter={(value, name) => {
                if (name === 'compliance') return [`${value.toFixed(2)}%`, 'Compliance'];
                if (name === 'slowResponsePct') return [`${value.toFixed(2)}%`, 'Slow Response Rate'];
                return [value, name];
              }}
              labelFormatter={(value) => {
                const [year, month, day] = value.split('-').map(Number);
                return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              }}
            />
            <Legend />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="compliance" 
              stroke="#4cec8c" 
              strokeWidth={3}
              dot={{ fill: '#4cec8c', r: 4 }}
              name="Compliance %"
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
    </div>
  );
}

export default HistoricalView;

