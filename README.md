# Queue Health Monitor - Sigma Computing Plugin

A comprehensive Sigma Computing custom plugin for monitoring Intercom queue health, displaying TSE (Technical Support Engineer) queue metrics, compliance status, and conversation details.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Deployment Architecture](#deployment-architecture)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Features](#features)
- [Troubleshooting](#troubleshooting)

## Overview

This project consists of three main components:

1. **Frontend Plugin** (`queue-health-monitor-plugin/`) - React app that displays queue health metrics
2. **Production API** (`api/`) - Vercel serverless functions for production deployment
3. **Local Backend** (`intercom-backend/`) - Express server for local development only

The plugin displays:
- TSE queue health cards with compliance status (Compliant/Warning/Non-Compliant)
- Open conversations, snoozed conversations, and waiting metrics per TSE
- Historical compliance and response time data
- Detailed conversation views with filtering and search

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Production (Vercel)                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────┐    ┌──────────────────────┐  │
│  │   React Frontend     │───▶│  Serverless API      │  │
│  │  (Static Build)      │    │  (/api/*)            │  │
│  │                      │    │                      │  │
│  │  queue-health-       │    │  - Conversations     │  │
│  │  monitor-plugin/     │    │  - Team Members      │  │
│  │  (build/)            │    │  - Snapshots         │  │
│  └──────────────────────┘    │  - Metrics           │  │
│                               └──────────────────────┘  │
│                                        │                 │
│                                        ▼                 │
│                               ┌──────────────────────┐  │
│                               │   Intercom API       │  │
│                               │   (External)          │  │
│                               └──────────────────────┘  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Local Development                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────┐    ┌──────────────────────┐  │
│  │   React Dev Server   │───▶│  Express Backend     │  │
│  │  (localhost:3000)    │    │  (localhost:5000)     │  │
│  │                      │    │                      │  │
│  │  queue-health-       │    │  intercom-backend/   │  │
│  │  monitor-plugin/     │    │  (Local Only)        │  │
│  └──────────────────────┘    └──────────────────────┘  │
│                                        │                 │
│                                        ▼                 │
│                               ┌──────────────────────┐  │
│                               │   Intercom API       │  │
│                               │   (External)          │  │
│                               └──────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Project Structure

```
queue-health-monitor/
├── api/                                    # Production API (Vercel Serverless Functions)
│   ├── intercom/
│   │   └── conversations/
│   │       └── open-team-5480079.js       # Main API endpoint (production)
│   ├── cron/
│   │   ├── snapshot.js                    # Scheduled snapshot creation
│   │   └── response-time-hourly.js        # Hourly response time metrics
│   ├── snapshots/
│   │   ├── get.js                          # Get historical snapshots
│   │   └── save.js                         # Save snapshot data
│   └── response-time-metrics/
│       ├── get.js                          # Get response time metrics
│       └── save.js                         # Save response time metrics
│
├── queue-health-monitor-plugin/            # Frontend React App (Deployed)
│   ├── src/
│   │   ├── App.jsx                         # Main app component
│   │   ├── Dashboard.jsx                   # Main dashboard with TSE cards
│   │   ├── HistoricalView.jsx              # Historical data views
│   │   └── ...
│   ├── public/                             # Static assets
│   ├── build/                              # Production build (generated)
│   └── package.json
│
├── intercom-backend/                       # Local Development Backend (NOT Deployed)
│   ├── src/
│   │   └── index.js                        # Express server for local dev
│   ├── package.json
│   └── README.md                           # Local backend documentation
│
├── vercel.json                             # Vercel deployment configuration
└── README.md                               # This file
```

## Deployment Architecture

### What Gets Deployed to Vercel

When you deploy to Vercel, **only these parts are deployed**:

1. **Frontend** (`queue-health-monitor-plugin/`)
   - Built React app from `queue-health-monitor-plugin/build/`
   - Served as static files
   - Configured in `vercel.json`:
     ```json
     {
       "buildCommand": "cd queue-health-monitor-plugin && npm install && npm run build",
       "outputDirectory": "queue-health-monitor-plugin/build"
     }
     ```

2. **API Functions** (`api/`)
   - Serverless functions automatically deployed
   - Accessible at `/api/*` paths
   - Examples:
     - `/api/intercom/conversations/open-team-5480079`
     - `/api/snapshots/get`
     - `/api/cron/snapshot`

### What Does NOT Get Deployed

- **`intercom-backend/`** - This is **local development only**
  - Express server for running locally
  - Not included in Vercel deployment
  - Use `api/` serverless functions in production instead

### Key Differences

| Component | Local Development | Production |
|-----------|------------------|------------|
| Frontend | `npm start` (dev server) | Static build from `build/` |
| Backend | Express server (`intercom-backend/`) | Serverless functions (`api/`) |
| Port | Frontend: 3000, Backend: 5000 | Single domain (Vercel) |
| API URL | `http://localhost:5000/intercom/...` | `/api/intercom/...` |

## Local Development

### Prerequisites

- Node.js (v14+)
- npm or yarn
- Intercom access token (see [Getting an Intercom Token](#getting-an-intercom-token))

### Option 1: Use Production API (Recommended for Quick Start)

The frontend is configured to use the production Vercel API by default in development:

```bash
cd queue-health-monitor-plugin
npm install
npm start
```

The app will run on `http://localhost:3000` and connect to the production API at `https://queue-health-monitor.vercel.app/api/intercom/conversations/open-team-5480079`.

### Option 2: Full Local Stack

#### Step 1: Set Up Local Backend

```bash
cd intercom-backend
npm install

# Create .env file
cp .env.example .env  # If .env.example exists, or create manually

# Edit .env and add:
INTERCOM_TOKEN=your_intercom_token_here
ALLOWED_ORIGIN=http://localhost:3000
```

#### Step 2: Start Local Backend

```bash
# Backend runs on port 5000
PORT=5000 node src/index.js
# Or use npm start (configured in package.json)
npm start
```

The backend will be available at `http://localhost:5000`.

#### Step 3: Configure Frontend to Use Local Backend

Edit `queue-health-monitor-plugin/src/App.jsx`:

```javascript
// Change line 45 from:
: 'https://queue-health-monitor.vercel.app/api/intercom/conversations/open-team-5480079';

// To:
: 'http://localhost:5000/intercom/conversations/open-team-5480079';
```

#### Step 4: Start Frontend

```bash
cd queue-health-monitor-plugin
npm install
npm start
```

The frontend will run on `http://localhost:3000` and connect to your local backend.

### Development Workflow

1. **Frontend changes**: Edit files in `queue-health-monitor-plugin/src/`
   - React dev server auto-reloads on changes
   - Hot module replacement enabled

2. **Backend changes**: Edit files in `intercom-backend/src/` or `api/`
   - For local: Restart Express server
   - For production: Changes deploy automatically on push to main

3. **Testing**: 
   - Test locally with local backend
   - Test against production API
   - Use browser DevTools to inspect API calls

## Production Deployment

### Deploying to Vercel

#### Method 1: Vercel CLI (Recommended)

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (from project root)
vercel

# For production deployment
vercel --prod
```

#### Method 2: GitHub Integration

1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Vercel automatically deploys on push to `main` branch

### Environment Variables

Set these in Vercel Dashboard → Project Settings → Environment Variables:

**Required:**
- `INTERCOM_TOKEN` - Your Intercom API access token

**Optional:**
- `ALLOWED_ORIGIN` - CORS allowed origin (defaults to `https://app.sigmacomputing.com`)
- `CRON_SECRET` - Secret for securing cron endpoints (optional)

### Vercel Configuration

The `vercel.json` file configures:

- **Build**: Builds React app from `queue-health-monitor-plugin/`
- **Output**: Serves static files from `queue-health-monitor-plugin/build/`
- **API Routes**: Automatically deploys all files in `api/` as serverless functions
- **Rewrites**: Routes all non-API requests to `index.html` (SPA routing)
- **Cron Jobs**: Scheduled tasks for snapshots and metrics

### Post-Deployment

1. **Register Plugin in Sigma Computing**:
   - Go to Sigma → Administration → Plugins → Custom Plugins
   - Add new plugin
   - URL: `https://your-app.vercel.app`
   - Save

2. **Verify Deployment**:
   - Visit `https://your-app.vercel.app`
   - Check API: `https://your-app.vercel.app/api/intercom/conversations/open-team-5480079`
   - Verify CORS headers allow Sigma domain

## Environment Variables

### Production (Vercel)

Set in Vercel Dashboard → Project Settings → Environment Variables:

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `INTERCOM_TOKEN` | Yes | Intercom API access token | - |
| `ALLOWED_ORIGIN` | No | CORS allowed origin | `https://app.sigmacomputing.com` |
| `CRON_SECRET` | No | Secret for cron job authentication | - |

### Local Development

Create `.env` file in `intercom-backend/`:

```env
INTERCOM_TOKEN=your_token_here
ALLOWED_ORIGIN=http://localhost:3000
PORT=5000
```

## API Endpoints

### Production Endpoints (Vercel)

All endpoints are prefixed with `/api/`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/intercom/conversations/open-team-5480079` | GET | Get open and snoozed conversations + team members |
| `/api/snapshots/get` | GET | Get historical compliance snapshots |
| `/api/snapshots/save` | POST | Save a compliance snapshot |
| `/api/response-time-metrics/get` | GET | Get historical response time metrics |
| `/api/response-time-metrics/save` | POST | Save response time metrics |
| `/api/cron/snapshot` | GET | Cron job: Create daily snapshot (requires CRON_SECRET) |
| `/api/cron/response-time-hourly` | GET | Cron job: Calculate hourly response times (requires CRON_SECRET) |

### Local Development Endpoints

When running `intercom-backend/` locally:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/intercom/conversations/open-team-5480079` | GET | Get conversations (no team members in local version) |

**Note**: The local backend is simpler and doesn't include team member fetching. Use production API for full functionality.

## Features

### Dashboard Features

- **TSE Queue Health Cards**
  - Color-coded status (Green/Yellow/Red)
  - Metrics: Open, Waiting On TSE, Waiting On Customer, Total Snoozed
  - Click to view detailed conversation list
  - Filter by status and region

- **Compliance Metrics**
  - Overall compliance percentage
  - Individual TSE compliance tracking
  - Threshold-based status determination

- **Historical Views**
  - Compliance trends over time
  - Response time metrics
  - Date range filtering

- **Conversation Details**
  - Filter by status and TSE
  - Search functionality
  - Direct links to Intercom conversations

### Thresholds

The dashboard uses these thresholds (defined in `Dashboard.jsx`):

| Metric | Soft Threshold | Alert Threshold |
|--------|---------------|-----------------|
| Open Conversations | ≤5 | ≥6 |
| Waiting On TSE | ≤5 | ≥7 |
| Total Snoozed | ≤10 | ≥15 |

**Status Logic:**
- **Success (Green)**: Open = 0, Waiting On TSE ≤ 5, Total Snoozed ≤ 10
- **Warning (Yellow)**: All metrics within soft thresholds
- **Error (Red)**: Any metric exceeds soft threshold

## Getting an Intercom Token

1. Log in to your Intercom workspace
2. Go to **Settings** → **Developer** → **Developer Hub**
3. Create a new **App** or use an existing one
4. Go to **Authentication** → **Access Tokens**
5. Create a new access token with scopes:
   - `conversations.read` (required)
   - `conversations.list` (required)
   - `teams.read` (for team member fetching)
   - `admins.read` (for team member details)
6. Copy the token (format: `dG9rOmMxMGFjNzBlXzVjNThfNGM0Zl9iNGZhXzUxZjU3OGQ4YjJhMzoxOjA`)

**Important Notes:**
- Don't add "Bearer" prefix in environment variables (code handles this)
- Tokens are long-lived but can be revoked
- Keep tokens secure - never commit to git

## Troubleshooting

### Frontend Issues

**"Cannot GET /" Error**
- Ensure `src/` folder is at root of `queue-health-monitor-plugin/`, not in `public/`
- Restart React dev server

**CORS Errors**
- Check `ALLOWED_ORIGIN` environment variable
- Verify backend CORS configuration allows your origin
- In development, ensure backend allows `http://localhost:3000`

**No TSE Names/Avatars Showing**
- Verify backend is returning `teamMembers` array
- Check browser console for API errors
- Ensure team member fetching is implemented (production API has this)

### Backend Issues

**401 Unauthorized**
- Verify `INTERCOM_TOKEN` is set correctly
- Check token hasn't expired or been revoked
- Ensure token has required scopes

**No Conversations Returned**
- Check team ID is correct (currently hardcoded to `5480079`)
- Verify conversations exist for that team
- Check Intercom API version compatibility

**Port Already in Use**
- Change `PORT` environment variable
- Kill existing process: `lsof -ti:5000 | xargs kill -9`

### Deployment Issues

**Build Fails**
- Check Node.js version compatibility
- Verify all dependencies install correctly
- Check `vercel.json` build command

**API Routes Not Working**
- Ensure files in `api/` follow Vercel serverless function format
- Check function exports default handler
- Verify environment variables are set in Vercel

**Cron Jobs Not Running**
- Verify cron schedule in `vercel.json`
- Check `CRON_SECRET` if configured
- Review Vercel function logs

### Common Solutions

1. **Clear cache and restart**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check environment variables**:
   ```bash
   # Local
   cat intercom-backend/.env
   
   # Vercel
   vercel env ls
   ```

3. **View logs**:
   ```bash
   # Local backend
   # Check terminal output
   
   # Vercel
   vercel logs
   ```

## Additional Resources

- [Intercom API Documentation](https://developers.intercom.com/intercom-api-reference/reference)
- [Vercel Documentation](https://vercel.com/docs)
- [Sigma Computing Plugin Documentation](https://help.sigmacomputing.com/hc/en-us/articles/360040267214-Custom-Plugins)
- [React Documentation](https://react.dev/)

## Project Status

- ✅ Production deployment on Vercel
- ✅ Local development setup
- ✅ Team member fetching
- ✅ Historical data tracking
- ✅ Compliance metrics
- ✅ Cron jobs for automated snapshots

## Support

For issues or questions:
1. Check this README and troubleshooting section
2. Review code comments in relevant files
3. Check Vercel deployment logs
4. Verify Intercom API token and permissions

---

**Last Updated**: January 2025
