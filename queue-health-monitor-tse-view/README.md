# TSE Queue Monitor - Individual View

A standalone React app for individual TSEs to monitor their own Intercom queue and stay on track.

## Overview

This is a focused, simplified view of the Queue Health Monitor, designed specifically for individual TSEs to:
- Monitor their own queue status
- Track on-track metrics
- Filter and search their conversations
- Stay on top of on-track targets

## Features

- **Personalized View**: Shows only the current user's conversations
- **On Track Tracking**: Real-time status indicators (On Track/Warning/Alert)
- **Key Metrics**: Open chats, Waiting on TSE, Waiting on Customer
- **Conversation Filtering**: Filter by type and search by ID
- **Direct Links**: Quick access to Intercom conversations

## Setup

### Installation

```bash
npm install
```

### Development

```bash
npm start
```

The app will run on `http://localhost:3000`

### Testing Locally

1. **Using URL Parameter**:
   ```
   http://localhost:3000?currentUserEmail=your.email@example.com
   ```

2. **Using localStorage** (in browser console):
   ```javascript
   localStorage.setItem('currentUserEmail', 'your.email@example.com');
   window.location.reload();
   ```

## Deployment

### Vercel (Separate Project)

This app is deployed as a **separate Vercel project** with its own domain.

**Important**: When creating the Vercel project:
- Set **Root Directory** to: `queue-health-monitor-tse-view`
- Vercel will auto-detect Create React App
- The app will get its own domain (e.g., `queue-health-monitor-tse-view.vercel.app`)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy

1. Create new Vercel project
2. Set root directory to `queue-health-monitor-tse-view`
3. Deploy

The `vercel.json` file handles:
- Build configuration
- Output directory
- SPA routing rewrites

### Sigma Plugin Integration

1. **Add Plugin Argument**:
   - Argument name: `currentUserEmail`
   - Type: String
   - Bind to: `CurrentUserEmail()` system function

2. **Set Plugin URL**:
   - Production: `https://your-app.vercel.app`
   - The app will automatically filter to the current user

## Architecture

- **Single Page App**: No routing, just the MyQueue component
- **API Integration**: Fetches from Queue Health Monitor API
- **User Identification**: Multiple fallback methods for getting user email
- **Client-Side Filtering**: Filters conversations after fetching

## File Structure

```
queue-health-monitor-tse-view/
├── src/
│   ├── App.jsx          # Main app component (data fetching)
│   ├── MyQueue.jsx      # MyQueue component (UI)
│   ├── MyQueue.css      # Styles
│   ├── index.jsx        # Entry point
│   └── index.css        # Global styles
├── public/
│   └── index.html       # HTML template
├── package.json         # Dependencies
├── vercel.json          # Deployment config
└── README.md            # This file
```

## API Dependencies

This app depends on the Queue Health Monitor API:
- Endpoint: `/api/intercom/conversations/open-team-5480079`
- Returns: Conversations and team members data

## User Identification

The app identifies users through (in order):
1. Sigma plugin props (`currentUserEmail`)
2. Sigma API (`window.sigma.getProps()`)
3. URL parameter (`?currentUserEmail=...`)
4. localStorage (`currentUserEmail` key)

## Notes

- This is a separate deployment from the main Queue Health Monitor dashboard
- Shares the same API endpoints
- Designed to be embedded in Sigma Computing as a plugin
- Lightweight and focused on individual TSE needs
