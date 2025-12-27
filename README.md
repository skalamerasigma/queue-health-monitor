# Queue Health Monitor - Sigma Computing Plugin

A **Sigma Computing custom plugin** for monitoring Intercom queue health, consisting of:
- **Frontend**: React app (`queue-health-monitor-plugin`) - Sigma plugin
- **Backend**: Serverless API (`api/intercom/conversations/`) - Handles Intercom API calls

## Sigma Plugin Overview

This is a custom plugin for [Sigma Computing](https://sigmacomputing.com) that displays open Intercom conversations in a Sigma dashboard. The plugin:
- Fetches data from Intercom API via a secure backend
- Displays conversations in a table format
- Can be embedded in Sigma dashboards

## Deployment to Vercel (Recommended)

This project is configured to deploy both frontend and backend together on Vercel, which is perfect for Sigma plugins.

### Vercel Configuration

When deploying to Vercel, use these settings:

1. **Framework Preset**: `Create React App` (or `Other` if not available)
2. **Root Directory**: Leave as `./` (root of the repository)
3. **Build Command**: Will auto-detect from `vercel.json`
4. **Output Directory**: Will auto-detect from `vercel.json`
5. **Install Command**: `npm install` (or leave as default)

### Environment Variables

Set these in Vercel's project settings:

- `INTERCOM_TOKEN`: Your Intercom access token (required)
  - Get this from Intercom Settings → Developer → Access Tokens
  - Required scopes: `conversations.read`, `conversations.list`
- `ALLOWED_ORIGIN`: CORS allowed origin (optional, defaults to `https://app.sigmacomputing.com`)
  - Set to your specific Sigma domain if needed
  - Example: `https://app.sigmacomputing.com`

### Register Plugin in Sigma

After deploying to Vercel:

1. Copy your Vercel deployment URL (e.g., `https://queue-health-monitor.vercel.app`)
2. In Sigma Computing:
   - Go to **Administration** → **Plugins** → **Custom Plugins**
   - Click **Add Plugin**
   - Enter:
     - **Name**: Queue Health Monitor (or your preferred name)
     - **URL**: Your Vercel deployment URL (e.g., `https://queue-health-monitor.vercel.app`)
   - Click **Save**
3. The plugin will now be available to add to your dashboards

### Project Structure

```
queue-health-monitor/
├── api/                          # Serverless API functions
│   └── intercom/
│       └── conversations/
│           └── open-team-5480079.js
├── queue-health-monitor-plugin/  # React frontend
│   ├── src/
│   ├── public/
│   └── package.json
├── intercom-backend/             # Original Express backend (for local dev)
│   └── src/
│       └── index.js
└── vercel.json                   # Vercel configuration
```

### Local Development

#### Frontend Only (using deployed backend)
```bash
cd queue-health-monitor-plugin
npm install
npm start
```

#### Full Stack (local backend)
1. Start the Express backend:
```bash
cd intercom-backend
npm install
cp .env.example .env
# Edit .env with your INTERCOM_TOKEN
npm start
```

2. Start the React frontend:
```bash
cd queue-health-monitor-plugin
REACT_APP_BACKEND_URL=http://localhost:3000 npm start
```

### API Endpoints

- **Production (Vercel)**: `https://your-app.vercel.app/api/intercom/conversations/open-team-5480079`
- **Local Development**: `http://localhost:3000/intercom/conversations/open-team-5480079`

### How It Works with Sigma

1. **Plugin Loading**: Sigma loads your plugin in an iframe from your Vercel URL
2. **API Calls**: The plugin makes API calls to `/api/intercom/conversations/open-team-5480079` on the same Vercel domain
3. **CORS**: The API endpoint allows requests from Sigma's domain (`https://app.sigmacomputing.com`)
4. **Data Flow**: 
   - Plugin → Vercel API endpoint → Intercom API → Back to plugin → Display in Sigma dashboard

### How It Works

1. The React app calls the API endpoint to fetch Intercom conversations
2. The serverless function handles Intercom API authentication and pagination
3. All conversations are automatically paginated and returned as a single response
4. The frontend displays the results in a table

