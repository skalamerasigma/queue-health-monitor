# MyQueue Implementation Summary

## Overview

A new `/myqueue` page has been added to the Queue Health Monitor app, providing a focused view for individual TSEs to monitor their own queue and stay on track.

## What Was Added

### 1. New Components

- **`MyQueue.jsx`** - Main component for individual TSE view
- **`MyQueue.css`** - Styling for the MyQueue page

### 2. Updated Components

- **`App.jsx`** - Added React Router and Sigma plugin integration
  - Routes: `/` (Dashboard) and `/myqueue` (MyQueue)
  - Sigma plugin API integration for `currentUserEmail` prop

### 3. Dependencies

- **`react-router-dom`** - Added for client-side routing

## Features

### MyQueue Page Features

1. **On Track Status Card**
   - Visual indicator (On Track/Warning/Alert)
   - Clear message about on-track status
   - Color-coded based on thresholds

2. **Key Metrics Display**
   - Open Chats (with target: ≤5)
   - Waiting on TSE (with target: ≤5)
   - Waiting on Customer (no limit)
   - Total Snoozed
   - Visual alerts when over limits

3. **Conversation Filtering**
   - Filter by type: All, Open, Waiting on TSE, Waiting on Customer
   - Search by conversation ID
   - Shows filtered count

4. **Conversations Table**
   - Conversation ID
   - Status (Open/Snoozed)
   - Tags (simplified display)
   - Created date/time
   - Direct link to Intercom

5. **Quick Tips Section**
   - Reminders about on-track targets
   - Best practices for queue management

### User Identification

The page identifies the current user through multiple methods (in order):

1. **Sigma Plugin Props** - `currentUserEmail` prop from Sigma
2. **Sigma API** - `window.sigma.getProps()` if available
3. **URL Parameter** - `?currentUserEmail=...` for testing
4. **localStorage** - `currentUserEmail` key for development

### Data Filtering

- Filters conversations to show only those assigned to the current user
- Matches user by email (case-insensitive) to find TSE ID
- Calculates metrics based on filtered conversations only

## On Track Logic

### Thresholds

- **Open Chats**: ≤5 (soft limit), 6+ (alert)
- **Waiting on TSE**: ≤5 (soft limit), 7+ (alert)

### Status Calculation

- **On Track**: Both thresholds met
- **Warning**: One or both thresholds exceeded but below alert level
- **Alert**: One or both thresholds at alert level

## Usage

### In Sigma Computing

1. **Configure Plugin Argument**:
   - Add argument: `currentUserEmail`
   - Bind to: `CurrentUserEmail()` system function

2. **Set Plugin URL**:
   - For TSE view: `https://queue-health-monitor.vercel.app/myqueue`
   - For manager view: `https://queue-health-monitor.vercel.app/`

### Direct Access (Testing)

```
https://queue-health-monitor.vercel.app/myqueue?currentUserEmail=your.email@example.com
```

### Development

```javascript
// In browser console
localStorage.setItem('currentUserEmail', 'your.email@example.com');
window.location.href = '/myqueue';
```

## File Structure

```
queue-health-monitor-plugin/
├── src/
│   ├── App.jsx              # Updated: Added routing & Sigma integration
│   ├── MyQueue.jsx          # New: Individual TSE view
│   ├── MyQueue.css          # New: MyQueue styling
│   ├── Dashboard.jsx         # Unchanged: Manager dashboard
│   └── ...
├── SIGMA_PLUGIN_SETUP.md    # New: Setup guide for Sigma
└── package.json              # Updated: Added react-router-dom
```

## Key Differences from Dashboard

| Feature | Dashboard | MyQueue |
|---------|-----------|---------|
| **Audience** | Managers | Individual TSEs |
| **Data Scope** | All TSEs | Current user only |
| **Metrics** | Team-wide, regional | Personal only |
| **Visualizations** | Charts, trends, comparisons | Simple metrics cards |
| **Complexity** | High (many features) | Low (focused) |
| **On Track View** | Per-TSE cards | Single status card |

## Testing Checklist

- [ ] User identification works (email matching)
- [ ] Conversations filter correctly to current user
- [ ] Metrics calculate correctly
- [ ] On-track status shows correctly
- [ ] Filters work (by tag, search)
- [ ] Links to Intercom work
- [ ] Responsive design works on mobile
- [ ] Error handling for missing user
- [ ] Refresh functionality works

## Next Steps

1. **Deploy** to Vercel
2. **Configure** in Sigma Computing with `currentUserEmail` argument
3. **Test** with real user emails
4. **Gather feedback** from TSEs
5. **Iterate** based on usage patterns

## Notes

- The page gracefully handles cases where user email doesn't match any team member
- All filtering happens client-side after fetching all conversations
- The page auto-refreshes every 2 minutes (same as Dashboard)
- Routing uses React Router with BrowserRouter (works with Vercel rewrites)
