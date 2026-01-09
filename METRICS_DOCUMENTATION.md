# Metrics Tracked Across Queue Health Monitor

## Overview
This document lists all metrics tracked across the Queue Health Monitor codebase, organized by category and location.

---

## 1. Real-Time Conversation Metrics (Dashboard.jsx)

### Overall Metrics
- **`totalOpen`**: Total count of open conversations (state="open" and not snoozed)
- **`totalSnoozed`**: Total count of snoozed conversations (any snoozed state)
- **`unassignedConversations.total`**: Count of conversations without an assigned TSE
- **`unassignedConversations.medianWaitTime`**: Median wait time (in hours) for unassigned conversations

### Per-TSE Metrics (`byTSE` array)
Each TSE object contains:
- **`id`**: TSE ID
- **`name`**: TSE name
- **`open`**: Number of open conversations assigned to this TSE
- **`totalSnoozed`**: Total number of snoozed conversations assigned to this TSE
- **`waitingOnTSE`**: Number of snoozed conversations with tag `snooze.waiting-on-tse`
- **`waitingOnCustomer`**: Number of snoozed conversations with tags `snooze.waiting-on-customer-resolved` or `snooze.waiting-on-customer-unresolved`
- **`awayModeEnabled`**: Boolean indicating if TSE has away mode enabled

### Conversation Lists
- **`waitingOnTSE`**: Array of conversation objects with tag `snooze.waiting-on-tse`
- **`waitingOnCustomer`**: Array of conversation objects with waiting-on-customer tags
  - Filtered into:
    - **Resolved**: Conversations with tag `snooze.waiting-on-customer-resolved`
    - **Unresolved**: Conversations with tag `snooze.waiting-on-customer-unresolved`

### Compliance Metrics
- **`complianceOverall`**: Percentage of TSEs meeting both open and waiting-on-TSE thresholds
- **`complianceOpenOnly`**: Percentage of TSEs meeting open conversation threshold (≤5)
- **`complianceSnoozedOnly`**: Percentage of TSEs meeting waiting-on-TSE threshold (≤5)

### Alerts
- **`alerts`**: Array of alert objects
  - **Type**: `open_threshold` or `waiting_on_tse_threshold`
  - **Severity**: `high` (for alerts)
  - **Count**: Number of open chats or waiting-on-TSE conversations
  - **Thresholds**:
    - Open chats: 6+ (MAX_OPEN_ALERT)
    - Waiting on TSE: 7+ (MAX_WAITING_ON_TSE_ALERT)

---

## 2. Historical Snapshot Metrics (snapshot.js & HistoricalView.jsx)

### Snapshot Data Structure (`tseData` array)
Each snapshot contains TSE data for a specific date:
- **`id`**: TSE ID
- **`name`**: TSE name
- **`open`**: Number of open conversations
- **`actionableSnoozed`**: Number of snoozed conversations with tag `snooze.waiting-on-tse`
- **`customerWaitSnoozed`**: Number of snoozed conversations with waiting-on-customer tags
- **`totalSnoozed`**: Total number of snoozed conversations

### Compliance Trend Metrics
- **`compliance`**: Daily compliance percentage (TSEs meeting both thresholds)
- **`compliantBoth`**: Count of TSEs meeting both open and waiting-on-TSE thresholds
- **`totalTSEs`**: Total number of TSEs in snapshot

### Compliance Analysis Metrics
- **`firstHalfAvg`**: Average compliance for first half of date range
- **`secondHalfAvg`**: Average compliance for second half of date range
- **`change`**: Change in compliance between halves
- **`trend`**: `improving`, `worsening`, or `stable` (based on ±2% threshold)
- **`volatility`**: Standard deviation of compliance values
- **`currentAvg`**: Current average compliance

### Per-TSE Historical Compliance (`tseAverageCompliance`)
- **`daysCounted`**: Number of days TSE appears in snapshots
- **`openCompliantDays`**: Days meeting open threshold
- **`snoozedCompliantDays`**: Days meeting waiting-on-TSE threshold
- **`overallCompliantDays`**: Days meeting both thresholds
- **`openCompliance`**: Percentage of days meeting open threshold
- **`snoozedCompliance`**: Percentage of days meeting waiting-on-TSE threshold
- **`overallCompliance`**: Percentage of days meeting both thresholds

### Region Comparison Metrics
- **`average`**: Average compliance percentage per region across date range
- **`count`**: Number of data points (days) for region

### Date-Grouped Metrics (`groupedTableData`)
Per date:
- **`totalTSEs`**: Total TSEs on that date
- **`compliantOpen`**: Count of TSEs meeting open threshold
- **`compliantSnoozed`**: Count of TSEs meeting waiting-on-TSE threshold
- **`compliantBoth`**: Count of TSEs meeting both thresholds
- **`openCompliance`**: Percentage meeting open threshold
- **`snoozedCompliance`**: Percentage meeting waiting-on-TSE threshold
- **`overallCompliance`**: Percentage meeting both thresholds
- **`tses`**: Array of TSE data for that date

---

## 3. Response Time Metrics (response-time-metrics API)

### Daily Response Time Metrics
- **`timestamp`**: When metric was captured
- **`date`**: Date (YYYY-MM-DD format)
- **`count10PlusMin`**: Count of conversations with 10+ minute response time
- **`totalConversations`**: Total conversations analyzed
- **`percentage10PlusMin`**: Percentage of conversations with 10+ minute response time

### Response Time Trend Analysis
- **`firstHalfAvg`**: Average percentage for first half of date range
- **`secondHalfAvg`**: Average percentage for second half of date range
- **`change`**: Change in percentage between halves
- **`trend`**: `improving` (lower is better), `worsening`, or `stable`
- **`volatility`**: Standard deviation of response time percentages
- **`movingAvg`**: 7-day moving average

### Response Time Comparison
- **`currentPeriodAvg`**: Average for current 7-day period
- **`previousPeriodAvg`**: Average for previous 7-day period
- **`change`**: Difference between periods
- **`changePercent`**: Percentage change
- **`vsAllTime`**: Comparison to all-time average

---

## 4. Region-Based Metrics

### Overview Dashboard Region Breakdown
- **`region`**: UK, NY, SF, or Other
- **`total`**: Total TSEs in region
- **`compliant`**: Count of compliant TSEs in region
- **`compliance`**: Percentage of compliant TSEs in region

### Historical Region Comparison
- **`region`**: UK, NY, SF, or Other
- **`average`**: Average compliance percentage across date range
- **`count`**: Number of data points (days)

---

## 5. Thresholds Used for Compliance

### Open Conversations
- **MAX_OPEN_IDEAL**: 0
- **MAX_OPEN_SOFT**: 5 (compliance threshold)
- **MAX_OPEN_ALERT**: 6 (alert threshold)

### Waiting On TSE (Snoozed with tag `snooze.waiting-on-tse`)
- **MAX_WAITING_ON_TSE_SOFT**: 5 (compliance threshold)
- **MAX_WAITING_ON_TSE_ALERT**: 7 (alert threshold)


---

## 6. Time-Based Metrics

### Wait Times
- **`waitTimeHours`**: Hours since conversation was created (for unassigned)

### Date Ranges
- **`date`**: Date in YYYY-MM-DD format
- **`displayLabel`**: Formatted date (MM/DD)
- **`timestamp`**: ISO timestamp when metric was captured

---

## 7. Statistical Metrics

### Averages
- **Daily averages**: Per-day compliance percentages
- **Period averages**: First half vs second half comparisons
- **Moving averages**: 7-day rolling averages
- **Region averages**: Average compliance per region

### Volatility
- **Standard deviation**: Calculated for compliance trends
- **Variance**: Used to calculate volatility

### Medians
- **`medianWaitTime`**: Median wait time for unassigned conversations (in hours)

### Correlations
- **Compliance vs Response Time**: Correlation coefficient between compliance and response time metrics

---

## 8. Alert Metrics

### Alert Types
1. **Open Chat Alerts**
   - Triggered when TSE has 6+ open conversations
   - Includes: TSE name, count, severity

2. **Waiting On TSE Alerts**
   - Triggered when TSE has 7+ conversations with tag `snooze.waiting-on-tse`
   - Includes: TSE name, count, severity

### Alert Properties
- **`type`**: `open_threshold` or `waiting_on_tse_threshold`
- **`severity`**: `high` (for alerts)
- **`tseId`**: TSE ID
- **`tseName`**: TSE name
- **`message`**: Human-readable alert message
- **`count`**: Number of conversations triggering alert

---

## 9. Filtering & Selection Metrics

### TSE Filtering
- **`selectedTSEs`**: Array of selected TSE IDs for filtering
- **`availableTSEs`**: Array of all available TSEs from snapshots
- **`expandedRegions`**: Set of expanded region filters
- **`selectedColors`**: Set of selected status colors (success/warning/error)
- **`selectedRegions`**: Set of selected regions (UK/NY/SF/Other)

### Conversation Filtering
- **`filterTag`**: Filter by conversation type (all/open/snoozed/waitingontse/waitingoncustomer)
- **`filterTSE`**: Filter by specific TSE or "all"
- **`searchId`**: Search by conversation ID

---

## 10. Data Storage Locations

### Database Tables
1. **`tse_snapshots`**
   - Stores daily snapshots of TSE metrics
   - Fields: date, timestamp, tse_data (JSONB)

2. **`response_time_metrics`**
   - Stores daily response time metrics
   - Fields: date, timestamp, count_10_plus_min, total_conversations, percentage_10_plus_min

### In-Memory State
- Real-time metrics calculated from live conversation data
- Historical metrics loaded from database snapshots
- Response time metrics loaded from database

---

## Summary

**Total Metric Categories**: 10
**Total Individual Metrics**: 50+

**Key Compliance Metrics**:
- Open conversations per TSE
- Snoozed conversations with tag `snooze.waiting-on-tse` per TSE
- Overall compliance percentage
- Region-based compliance

**Key Performance Metrics**:
- Response time (10+ minute percentage)
- Trend analysis (improving/worsening/stable)
- Volatility (consistency measure)

**Key Action Metrics**:
- Alerts (threshold violations)

---

## 11. Cron Jobs & Database Updates

### Overview
Two scheduled cron jobs run daily to capture and store historical metrics in the database. Both jobs run on weekdays (Tuesday-Saturday) to capture business day metrics.

---

### 1. Snapshot Cron Job (`/api/cron/snapshot`)

#### Schedule
- **Cron Expression**: `0 3 * * 2-6`
- **Time**: 3:00 AM UTC (Tuesday-Saturday)
- **Frequency**: Daily (weekdays only)
- **Timezone**: UTC

#### Data Source
Pulls data from **Intercom API**:
- **Team ID**: `5480079` (Support Ops team)
- **Conversations**: All conversations with state `"open"` or `"snoozed"` assigned to the team
- **Team Members**: All admins in team `5480079`

#### Filters Applied

**Excluded TSEs** (not included in snapshots):
- Zen Junior
- Nathan Parrish
- Leticia Esparza
- Rob Woollen
- Brett Bedevian
- Viswa Jeyaraman
- Brandon Yee
- Holly Coxon
- Chetana Shinde
- Matt Morgenroth
- Grace Sanford
- svc-prd-tse-intercom SVC

**Conversation Filters**:
- Only includes conversations assigned to a TSE (excludes unassigned)
- Excludes conversations assigned to excluded TSEs
- Only processes conversations with state `"open"` or `"snoozed"`

#### Data Captured Per TSE
For each TSE in the team (excluding excluded TSEs):
- **`id`**: TSE ID
- **`name`**: TSE name
- **`open`**: Count of open conversations (state="open" and not snoozed)
- **`actionableSnoozed`**: Count of snoozed conversations with tag `snooze.waiting-on-tse`
- **`customerWaitSnoozed`**: Count of snoozed conversations with tags `snooze.waiting-on-customer-resolved` or `snooze.waiting-on-customer-unresolved`
- **`totalSnoozed`**: Total count of all snoozed conversations

#### Date Handling
- **Snapshot Date**: Previous UTC day (yesterday in UTC)
- **Timestamp**: Current UTC time when snapshot is captured
- **Format**: Date stored as `YYYY-MM-DD` string
- **Storage**: Uses `ON CONFLICT (date) DO UPDATE` to overwrite if snapshot for that date already exists

#### Database Storage
- **Table**: `tse_snapshots`
- **Schema**:
  - `id`: SERIAL PRIMARY KEY
  - `date`: VARCHAR(10) NOT NULL (YYYY-MM-DD format)
  - `timestamp`: TIMESTAMP NOT NULL (when snapshot was captured)
  - `tse_data`: JSONB NOT NULL (array of TSE objects with metrics)
  - `created_at`: TIMESTAMP DEFAULT NOW()
  - **Unique Constraint**: `date` (one snapshot per day)

#### API Details
- **Pagination**: Fetches conversations in batches of 150 per page
- **Max Pages**: 50 pages (up to 7,500 conversations)
- **Enrichment**: Fetches full conversation details in batches of 10 to get tags and admin assignee info
- **Rate Limiting**: 100ms delay between batches

---

### 2. Response Time Metrics Cron Job (`/api/cron/response-time-hourly`)

#### Schedule
- **Cron Expression**: `30 3 * * 2-6`
- **Time**: 3:30 AM UTC (Tuesday-Saturday)
- **Frequency**: Daily (weekdays only)
- **Timezone**: UTC

#### Data Source
Pulls data from **Intercom API**:
- **Team ID**: `5480079` (Support Ops team)
- **Conversations**: Conversations created during business hours (2 AM - 6 PM PT) on the previous UTC day

#### Filters Applied

**Date Range Filter**:
- **Start Time**: 2:00 AM PT (Pacific Time) on previous UTC day
- **End Time**: 6:00 PM PT (Pacific Time) on previous UTC day
- **Conversion**: PT times converted to UTC timestamps for API query
- **Field**: `created_at` (Unix timestamp in seconds)

**Conversation Filters**:
- Only includes conversations assigned to team `5480079`
- Only includes conversations created within the date range (2 AM - 6 PM PT)
- Client-side verification: Double-checks `created_at` timestamp matches date range

#### Metrics Calculated

**Response Time Calculation**:
- Uses `statistics.time_to_admin_reply` if available (in seconds)
- Otherwise calculates: `statistics.first_admin_reply_at - created_at`
- Only counts conversations that have received an admin reply

**Metrics Captured**:
- **`count10PlusMin`**: Count of conversations with 10+ minute response time
- **`totalConversations`**: Total conversations created in the time window
- **`totalWithResponse`**: Total conversations that received an admin reply
- **`percentage10PlusMin`**: Percentage of replied conversations with 10+ minute wait
- **`conversationIds10PlusMin`**: Array of conversation IDs with 10+ minute wait times (includes wait time in seconds and minutes)

#### Date Handling
- **Metric Date**: Previous UTC day (yesterday in UTC)
- **Timestamp**: Current UTC time when metric is captured
- **Format**: Date stored as `YYYY-MM-DD` string
- **Storage**: Uses `ON CONFLICT (date) DO UPDATE` to overwrite if metric for that date already exists

#### Database Storage
- **Table**: `response_time_metrics`
- **Schema**:
  - `id`: SERIAL PRIMARY KEY
  - `timestamp`: TIMESTAMP NOT NULL (when metric was captured)
  - `date`: VARCHAR(10) NOT NULL (YYYY-MM-DD format)
  - `count_10_plus_min`: INTEGER NOT NULL
  - `total_conversations`: INTEGER NOT NULL
  - `percentage_10_plus_min`: DECIMAL(5,2) NOT NULL
  - `conversation_ids_10_plus_min`: JSONB (array of conversation IDs with wait times)
  - `created_at`: TIMESTAMP DEFAULT NOW()
  - **Unique Constraint**: `date` (one metric per day)

#### API Details
- **Pagination**: Fetches conversations in batches of 150 per page
- **Max Pages**: 10 pages (up to 1,500 conversations)
- **Optimization**: Only fetches full conversation details if `statistics` field is missing
- **Early Exit**: Stops pagination early if no conversations match the date range
- **Rate Limiting**: 50ms delay between batches

---

### Cron Job Security

Both cron jobs:
- **Authentication**: Verify `Authorization: Bearer <CRON_SECRET>` header (if `CRON_SECRET` env var is set)
- **Manual Triggers**: Can be triggered manually from frontend (no auth required for manual calls)
- **Error Handling**: Log errors and return appropriate HTTP status codes

---

### Data Consistency

**Snapshot Job**:
- Captures current state of all conversations at time of execution
- Overwrites existing snapshot for the same date if re-run
- One snapshot per UTC day

**Response Time Job**:
- Calculates metrics for conversations created during business hours (2 AM - 6 PM PT)
- Overwrites existing metric for the same date if re-run
- One metric per UTC day

---

### Notes

- Both jobs run on **weekdays only** (Tuesday-Saturday) to capture business day metrics
- Snapshot job runs at **3:00 AM UTC** (captures end-of-day state from previous day)
- Response time job runs at **3:30 AM UTC** (30 minutes after snapshot to avoid conflicts)
- Both jobs store data with the **previous UTC day's date** (yesterday)
- If a job fails or is re-run, it will overwrite the existing data for that date
