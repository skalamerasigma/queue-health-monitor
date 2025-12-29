import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import './HistoricalView.css';

const THRESHOLDS = {
  MAX_OPEN_SOFT: 5,
  MAX_ACTIONABLE_SNOOZED_SOFT: 5
};

function HistoricalView({ onSaveSnapshot }) {
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
  }, [startDate, endDate, selectedTSEs]);

  useEffect(() => {
    fetchResponseTimeMetrics();
  }, [startDate, endDate]);

  useEffect(() => {
    // Extract unique TSEs from snapshots
    const tseSet = new Set();
    snapshots.forEach(snapshot => {
      snapshot.tseData?.forEach(tse => {
        tseSet.add(JSON.stringify({ id: tse.id, name: tse.name }));
      });
    });
    setAvailableTSEs(Array.from(tseSet).map(s => JSON.parse(s)));
  }, [snapshots]);

  const fetchSnapshots = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedTSEs.length > 0) {
        selectedTSEs.forEach(id => params.append('tseIds', id));
      }

      const apiPath = process.env.NODE_ENV === 'production' 
        ? '/api/snapshots/get'
        : 'http://localhost:3000/api/snapshots/get';
      
      const url = process.env.NODE_ENV === 'production'
        ? `${window.location.origin}/api/snapshots/get?${params}`
        : `${apiPath}?${params}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data.snapshots || []);
      }
    } catch (error) {
      console.error('Error fetching snapshots:', error);
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

      const apiPath = process.env.NODE_ENV === 'production' 
        ? '/api/response-time-metrics/get'
        : 'http://localhost:3000/api/response-time-metrics/get';
      
      const url = process.env.NODE_ENV === 'production'
        ? `${window.location.origin}/api/response-time-metrics/get?${params}`
        : `${apiPath}?${params}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setResponseTimeMetrics(data.metrics || []);
      }
    } catch (error) {
      console.error('Error fetching response time metrics:', error);
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

      const tseData = selectedTSEs.length > 0
        ? snapshot.tseData.filter(tse => selectedTSEs.includes(String(tse.id)))
        : snapshot.tseData;

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

  // Prepare table data
  const tableData = useMemo(() => {
    if (!snapshots.length) return [];

    const rows = [];
    snapshots.forEach(snapshot => {
      const tseData = selectedTSEs.length > 0
        ? snapshot.tseData.filter(tse => selectedTSEs.includes(String(tse.id)))
        : snapshot.tseData;

      tseData.forEach(tse => {
        const meetsOpen = tse.open <= THRESHOLDS.MAX_OPEN_SOFT;
        const totalActionableSnoozed = tse.actionableSnoozed + tse.investigationSnoozed;
        const meetsSnoozed = totalActionableSnoozed <= THRESHOLDS.MAX_ACTIONABLE_SNOOZED_SOFT;
        
        rows.push({
          date: snapshot.date,
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
      });
    });

    return rows.sort((a, b) => {
      if (a.date !== b.date) return new Date(b.date) - new Date(a.date);
      return a.tseName.localeCompare(b.tseName);
    });
  }, [snapshots, selectedTSEs]);

  const handleTSEChange = (tseId, checked) => {
    if (checked) {
      setSelectedTSEs([...selectedTSEs, String(tseId)]);
    } else {
      setSelectedTSEs(selectedTSEs.filter(id => id !== String(tseId)));
    }
  };

  const selectAllTSEs = () => {
    setSelectedTSEs(availableTSEs.map(tse => String(tse.id)));
  };

  const clearTSEs = () => {
    setSelectedTSEs([]);
  };

  // Prepare response time chart data
  const responseTimeChartData = useMemo(() => {
    return responseTimeMetrics.map(metric => {
      // date format: YYYY-MM-DD (e.g., "2025-12-29")
      const [year, month, day] = metric.date.split('-').map(Number);
      
      // Create a local date to avoid timezone issues
      const localDate = new Date(year, month - 1, day);
      const displayMonth = localDate.getMonth() + 1;
      const displayDay = localDate.getDate();
      
      return {
        date: metric.date,
        timestamp: metric.timestamp,
        displayLabel: `${displayMonth}/${displayDay}`,
        count10PlusMin: metric.count10PlusMin,
        totalConversations: metric.totalConversations,
        percentage10PlusMin: metric.percentage10PlusMin
      };
    }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [responseTimeMetrics]);

  // Calculate response time summary metrics
  const responseTimeSummary = useMemo(() => {
    if (responseTimeMetrics.length === 0) {
      return { avgPercentage: 0, totalCount: 0, trend: 'no-data' };
    }
    
    const avgPercentage = Math.round(
      responseTimeMetrics.reduce((sum, m) => sum + m.percentage10PlusMin, 0) / responseTimeMetrics.length
    );
    
    const totalCount = responseTimeMetrics.reduce((sum, m) => sum + m.count10PlusMin, 0);
    
    // Calculate trend (comparing first half vs second half)
    const midPoint = Math.floor(responseTimeMetrics.length / 2);
    const firstHalf = responseTimeMetrics.slice(0, midPoint);
    const secondHalf = responseTimeMetrics.slice(midPoint);
    
    const firstHalfAvg = firstHalf.length > 0 
      ? firstHalf.reduce((sum, m) => sum + m.percentage10PlusMin, 0) / firstHalf.length 
      : 0;
    const secondHalfAvg = secondHalf.length > 0 
      ? secondHalf.reduce((sum, m) => sum + m.percentage10PlusMin, 0) / secondHalf.length 
      : 0;
    
    const trend = secondHalfAvg < firstHalfAvg ? 'improving' : secondHalfAvg > firstHalfAvg ? 'worsening' : 'stable';
    
    return { avgPercentage, totalCount, trend, change: Math.round(secondHalfAvg - firstHalfAvg) };
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
                  const apiPath = process.env.NODE_ENV === 'production' 
                    ? '/api/cron/response-time-hourly'
                    : 'http://localhost:3000/api/cron/response-time-hourly';
                  
                  const url = process.env.NODE_ENV === 'production'
                    ? `${window.location.origin}/api/cron/response-time-hourly`
                    : apiPath;

                  const res = await fetch(url);
                  if (res.ok) {
                    alert('Response time metric captured successfully!');
                    fetchResponseTimeMetrics();
                  } else {
                    throw new Error('Failed to capture metric');
                  }
                } catch (error) {
                  console.error('Error capturing response time metric:', error);
                  alert('Failed to capture metric: ' + error.message);
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
          Compliance Trends
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
              <button onClick={clearTSEs} className="clear-button">Clear</button>
              <div className="tse-checkbox-list">
                {availableTSEs.map(tse => (
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
            <h3 className="chart-title">Compliance Trends</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
              <table className="historical-table">
                <thead>
                  <tr>
                    <th>Date</th>
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
                  {tableData.map((row, idx) => {
                    // Parse date string as local date to avoid timezone issues
                    const [year, month, day] = row.date.split('-').map(Number);
                    const displayDate = new Date(year, month - 1, day);
                    return (
                    <tr key={`${row.date}-${row.tseName}-${idx}`}>
                      <td>{displayDate.toLocaleDateString()}</td>
                      <td>{row.tseName}</td>
                      <td>{row.open}</td>
                      <td>{row.actionableSnoozed}</td>
                      <td>{row.investigationSnoozed}</td>
                      <td>{row.customerWaitSnoozed}</td>
                      <td>{row.totalSnoozed}</td>
                      <td>
                        <span className={row.openCompliant ? "compliant-badge compliant" : "compliant-badge non-compliant"}>
                          {row.openCompliant ? "✓" : "✗"}
                        </span>
                      </td>
                      <td>
                        <span className={row.snoozedCompliant ? "compliant-badge compliant" : "compliant-badge non-compliant"}>
                          {row.snoozedCompliant ? "✓" : "✗"}
                        </span>
                      </td>
                      <td>
                        <span className={row.overallCompliant ? "compliant-badge compliant" : "compliant-badge non-compliant"}>
                          {row.overallCompliant ? "✓" : "✗"}
                        </span>
                      </td>
                    </tr>
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
                  <h4>Average % with 10+ Min Wait</h4>
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
                    {responseTimeMetrics.reduce((sum, m) => sum + m.totalConversations, 0)}
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
                    Conversations that waited 10+ min
                  </div>
                </div>
              </div>

              {/* Percentage Chart */}
              <div className="chart-container">
                <h3 className="chart-title">Percentage of Conversations with 10+ Minute Wait Time</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={responseTimeChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                      formatter={(value) => [`${value}%`, '10+ Min Wait %']}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="percentage10PlusMin" 
                      stroke="#fd8789" 
                      strokeWidth={3}
                      dot={{ fill: '#fd8789', r: 4 }}
                      name="10+ Min Wait %"
                    />
                    {/* Reference line at 0% (goal) */}
                    <Line 
                      type="monotone" 
                      dataKey={() => 0} 
                      stroke="#4cec8c" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Goal (0%)"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Count Chart */}
              <div className="chart-container">
                <h3 className="chart-title">Count of Conversations with 10+ Minute Wait Time</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={responseTimeChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                      fill="#fd8789"
                      name="10+ Min Wait Count"
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
                        <th>Date</th>
                        <th>Total Conversations</th>
                        <th>10+ Min Waits</th>
                        <th>Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {responseTimeChartData.map((row, idx) => (
                        <tr key={`${row.date}-${idx}`}>
                          <td>{row.displayLabel}</td>
                          <td>{row.totalConversations}</td>
                          <td>{row.count10PlusMin}</td>
                          <td>
                            <span className={row.percentage10PlusMin > 0 ? "percentage-badge high" : "percentage-badge good"}>
                              {row.percentage10PlusMin.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
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

