# Queue Health Monitor: Purpose & Design

## Overview

The Queue Health Monitor is a real-time dashboard application designed to support the **Support Ops Accountability Framework**. It provides comprehensive visibility into queue health, individual TSE (Technical Support Engineer) performance, and team-wide compliance metrics to enable data-driven queue management and accountability.

---

## Purpose

### Core Mission

The Queue Health Monitor exists to solve a fundamental challenge: **shifting from reactive queue hygiene to proactive, measurable, and accountable queue management**. 

### The Problem It Solves

Before this tool, queue management relied on:
- Ad-hoc monitoring
- Manual checks
- Reactive responses to issues
- Lack of clear visibility into individual and team performance
- No historical trend analysis

### The Solution

The Queue Health Monitor provides:
- **Real-time visibility** into queue health across all TSEs
- **Automated alerting** when thresholds are exceeded
- **Historical trend analysis** to identify patterns and improvements
- **Standardized metrics** aligned with the Accountability Framework
- **Data-driven insights** for capacity planning and performance management

---

## Alignment with Accountability Framework

The application directly supports the **5-Step Accountability Framework**:

### Step 1: End-of-Day Accountability
- **Visualization**: Real-time compliance metrics and TSE-level breakdowns
- **Purpose**: Enable managers and TSEs to see current state against targets before end of shift
- **Targets Measured**:
  - Max Open Chats: 0 (Ideal), 5 (Soft Limit)
  - Max Actionable Snoozed: 5 (Soft Limit)
  - Max Snoozed (Awaiting Reply): No Hard Limit

### Step 2: Automated Queue Reporting
- **Visualization**: Alert dropdown with real-time notifications
- **Purpose**: Immediate visibility when thresholds are exceeded
- **Alert Thresholds**:
  - 6+ open chats → Alert triggered
  - 7+ actionable snoozed → Alert triggered

### Step 3: Standardized Categorization
- **Visualization**: Conversation filtering by snooze type tags
- **Purpose**: Enable filtering and analysis based on standardized tags
- **Tags Tracked**:
  - `snooze.waiting-on-tse` (Actionable Snoozed)
  - `snooze.waiting-on-customer-resolved` (Customer Wait - Resolved)
  - `snooze.waiting-on-customer-unresolved` (Customer Wait - Unresolved)

### Step 4: Proactive Reassignment
- **Implementation**: Handled within Intercom as part of an Intercom automated workflow
- **Visualization**: Historical trends and TSE capacity analysis in the dashboard
- **Purpose**: Dashboard provides visibility into patterns that may trigger reassignment, while actual automation occurs in Intercom

### Step 5: Intelligent Closure
- **Implementation**: Handled within Intercom as part of an Intercom automated workflow
- **Visualization**: Customer wait tracking and resolution metrics in the dashboard
- **Purpose**: Dashboard monitors conversations awaiting customer response, while automated closure rules are executed in Intercom workflows

---

## What the Application Measures

### High-Level Metrics

The application measures three primary categories of metrics:

1. **Real-Time Queue Health**
   - Open conversations per TSE
   - Snoozed conversations by type (waiting on TSE vs. waiting on customer)
   - Compliance status (compliant, warning, non-compliant)
   - Unassigned conversation metrics

2. **Historical Compliance Trends**
   - Daily compliance snapshots
   - Trend analysis (improving, worsening, stable)
   - Region-based comparisons
   - Per-TSE historical compliance rates

3. **Response Time Performance**
   - Percentage of conversations with 10+ minute first reply times
   - Response time trends over time
   - Comparison to historical averages

> **Note**: For detailed metric definitions and technical specifications, see [METRICS_DOCUMENTATION.md](./METRICS_DOCUMENTATION.md)

---

## Visualization Design Rationale

### Overview Dashboard

**Purpose**: Provide a high-level, real-time snapshot of queue health

**Key Visualizations**:

1. **KPI Cards (Clickable)**
   - **Why**: Immediate visibility into critical metrics
   - **Design**: Large, prominent numbers with clear labels
   - **Interactivity**: Clickable to drill down into filtered conversations
   - **Goal**: Enable quick assessment and rapid navigation to details

2. **Region Compliance Breakdown**
   - **Why**: Identify regional patterns and capacity differences
   - **Design**: Card showing percentage and count (e.g., "81% 13/16 TSEs")
   - **Goal**: Enable regional capacity planning and identify regions needing support

3. **Active Alerts Summary**
   - **Why**: Immediate visibility into threshold violations
   - **Design**: Card showing alert counts by type
   - **Interactivity**: Clickable to navigate to TSE View filtered to non-compliant TSEs
   - **Goal**: Prioritize attention on TSEs needing immediate support

4. **Compliance Trends (7-Day)**
   - **Why**: Identify improving or worsening trends before they become critical
   - **Design**: Line chart showing daily compliance percentages
   - **Goal**: Enable proactive management and trend identification

5. **Response Time Metrics**
   - **Why**: Measure customer experience and team responsiveness
   - **Design**: Percentage display with trend indicators
   - **Goal**: Track team's ability to respond quickly to customer inquiries

### TSE View

**Purpose**: Individual TSE performance monitoring and capacity assessment

**Key Visualizations**:

1. **TSE Cards (Color-Coded)**
   - **Why**: Quick visual identification of compliance status
   - **Design**: 
     - Green border + green arrow = Compliant
     - Yellow border + yellow arrow = Warning
     - Red border + red arrow = Non-Compliant
   - **Interactivity**: Clickable to view detailed conversation breakdown
   - **Goal**: Enable rapid scanning of team status and drill-down into individual TSE details

2. **Status Indicators**
   - **Why**: Replace text-based status badges with intuitive visual indicators
   - **Design**: Arrow icon (→) colored by compliance status
   - **Goal**: Improve visual clarity and reduce cognitive load

3. **Region Grouping**
   - **Why**: Organize TSEs by geographic region for regional management
   - **Design**: Collapsible region groups
   - **Goal**: Enable regional managers to focus on their team

4. **Filtering Options**
   - **Why**: Enable focused analysis on specific subsets
   - **Design**: Multi-select filters for region and compliance status
   - **Goal**: Support targeted interventions and capacity planning

### Conversations View

**Purpose**: Detailed conversation-level analysis and filtering

**Key Visualizations**:

1. **Conversation Table**
   - **Why**: Provide detailed view of individual conversations
   - **Design**: Sortable table with key conversation attributes
   - **Goal**: Enable investigation of specific conversations and patterns

2. **Filtering by Snooze Type**
   - **Why**: Align with standardized categorization (Step 3 of framework)
   - **Design**: Dropdown with hierarchical options
   - **Goal**: Enable analysis of conversations by standardized tags

3. **TSE Filtering**
   - **Why**: Focus on conversations for specific TSEs
   - **Design**: Dropdown with TSE names organized by region
   - **Goal**: Enable individual TSE queue analysis

### Historical View (Analytics)

**Purpose**: Long-term trend analysis and performance tracking

**Key Visualizations**:

1. **Daily Compliance Trends Chart**
   - **Why**: Identify long-term patterns and improvement trends
   - **Design**: Line chart with trend indicators (↑ improving, ↓ worsening, → stable)
   - **Goal**: Enable data-driven decisions about process improvements and capacity planning

2. **Region Comparison Chart**
   - **Why**: Compare performance across regions to identify best practices
   - **Design**: Bar chart showing average compliance by region
   - **Goal**: Enable cross-regional learning and capacity balancing

3. **Response Time Trends**
   - **Why**: Track customer experience metrics over time
   - **Design**: Line chart with moving averages and trend analysis
   - **Goal**: Monitor team responsiveness and identify degradation patterns

4. **TSE Selection Filter**
   - **Why**: Analyze specific TSEs or groups of TSEs
   - **Design**: Multi-select dropdown with all available TSEs
   - **Goal**: Enable individual performance reviews and capacity analysis

5. **Date Range Selection**
   - **Why**: Analyze specific time periods
   - **Design**: Date picker with preset ranges (Last 7 Days, Last 30 Days, etc.)
   - **Goal**: Enable flexible historical analysis

---

## Design Principles

### 1. Real-Time Visibility
- **Principle**: Show current state, not just historical data
- **Implementation**: Live data refresh with visual indicators
- **Goal**: Enable immediate action on current issues

### 2. Progressive Disclosure
- **Principle**: Start with high-level overview, allow drill-down
- **Implementation**: Clickable cards and modals for details
- **Goal**: Reduce cognitive load while maintaining access to details

### 3. Visual Hierarchy
- **Principle**: Most important information is most prominent
- **Implementation**: Large KPI cards, color-coded status indicators
- **Goal**: Enable rapid assessment of critical metrics

### 4. Actionable Insights
- **Principle**: Every visualization should enable action
- **Implementation**: Clickable elements that navigate to filtered views
- **Goal**: Reduce friction between insight and action

### 5. Consistency with Framework
- **Principle**: Align visualizations with Accountability Framework targets
- **Implementation**: Thresholds match framework specifications
- **Goal**: Ensure tool supports framework goals

---

## Goals & Success Metrics

### Primary Goals

1. **Enable Accountability**
   - Provide clear, measurable metrics aligned with framework targets
   - Enable managers to hold TSEs accountable to standards
   - Enable TSEs to self-monitor and self-correct

2. **Improve Queue Health**
   - Reduce average open conversations per TSE
   - Reduce actionable snoozed conversations
   - Improve overall compliance rates

3. **Enable Proactive Management**
   - Identify issues before they become critical
   - Enable capacity planning based on trends
   - Support data-driven resource allocation

4. **Standardize Processes**
   - Reinforce use of standardized tags
   - Enable analysis based on standardized categories
   - Support framework adoption

### Success Indicators

- **Compliance Rate**: Increase in percentage of TSEs meeting both thresholds
- **Alert Frequency**: Decrease in number of threshold violations
- **Response Time**: Improvement in percentage of conversations with <10 minute response
- **Trend Direction**: Overall trend moving toward "improving" status

---

## User Workflows

### Manager Workflow

1. **Morning Check-In**
   - Open Overview Dashboard
   - Review Active Alerts summary
   - Check Region Compliance breakdown
   - Identify TSEs needing support

2. **Investigation**
   - Click alert summary card → Navigate to TSE View (filtered to non-compliant)
   - Click individual TSE card → View detailed conversation breakdown
   - Click "View Chats" on alerts → See filtered conversations

3. **Trend Analysis**
   - Navigate to Historical View
   - Review compliance trends
   - Compare regions
   - Identify patterns requiring intervention

### TSE Workflow

1. **Self-Monitoring**
   - View own TSE card in TSE View
   - Check compliance status (green/yellow/red)
   - Review conversation breakdown

2. **Queue Management**
   - Navigate to Conversations View
   - Filter to own conversations
   - Filter by snooze type to prioritize actions
   - Use filters to identify conversations needing attention

### Support Operations Workflow

1. **Capacity Planning**
   - Review Historical View trends
   - Compare region performance
   - Identify capacity constraints
   - Plan resource allocation

2. **Process Improvement**
   - Analyze response time trends
   - Review compliance correlation with response times
   - Identify process bottlenecks
   - Measure impact of framework changes

---

## Technical Architecture

### Data Flow

1. **Real-Time Data**
   - Fetched from Intercom API on page load
   - Refreshed periodically or on-demand
   - Calculated metrics in real-time

2. **Historical Data**
   - Captured daily via cron jobs (3:00 AM UTC)
   - Stored in PostgreSQL database
   - Loaded on-demand for Historical View

3. **Alert Generation**
   - Calculated from real-time metrics
   - Triggered when thresholds exceeded
   - Displayed in alerts dropdown

### Data Sources

- **Intercom API**: Conversation data, TSE assignments, tags
- **PostgreSQL Database**: Historical snapshots, response time metrics
- **Cron Jobs**: Daily data collection and storage

---

## Future Enhancements

### Planned Features

1. **Slack Integration**
   - Automated Slack alerts (Step 2)
   - Direct DM notifications to TSEs
   - Manager channel alerts

4. **Advanced Analytics**
   - Predictive capacity modeling
   - Anomaly detection
   - Custom report generation

---

## Conclusion

The Queue Health Monitor is more than a dashboard—it's a **data-driven accountability system** that transforms queue management from reactive to proactive. By providing real-time visibility, historical trend analysis, and actionable insights, it enables the Support Ops team to achieve the goals outlined in the Accountability Framework:

- **Measurable accountability** through clear metrics
- **Proactive management** through trend identification
- **Standardized processes** through tag-based categorization
- **Continuous improvement** through historical analysis

The application's design prioritizes **usability**, **actionability**, and **alignment with framework goals** to ensure it serves as an effective tool for both individual TSEs and management teams.
