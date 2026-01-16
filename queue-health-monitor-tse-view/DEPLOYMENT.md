# Deployment Guide - TSE Queue Monitor

This app is deployed as a **separate Vercel project** with its own domain.

## Separate Vercel Project Setup

### Step 1: Create New Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your repository (same repo as main project)

### Step 2: Configure Project Settings

**Root Directory**: `queue-health-monitor-tse-view`

**Build Settings**:
- **Framework Preset**: Create React App
- **Build Command**: `npm install && npm run build`
- **Output Directory**: `build`
- **Install Command**: `npm install`

**Environment Variables** (if needed):
- `REACT_APP_API_URL` - Optional: Override API URL (defaults to main project)

### Step 3: Deploy

Vercel will automatically:
- Detect the `package.json` in the root directory
- Run the build command
- Deploy the `build` folder
- Assign a domain (e.g., `queue-health-monitor-tse-view.vercel.app`)

### Step 4: Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain (e.g., `myqueue.yourcompany.com`)
3. Follow DNS configuration instructions

## API Configuration

This app calls the API from the **main Queue Health Monitor project**:
- **API Domain**: `https://queue-health-monitor.vercel.app`
- **API Endpoint**: `/api/intercom/conversations/open-team-5480079`

The API is shared between both projects. No API routes need to be deployed with this project.

## Environment Variables

### Optional Variables

- `REACT_APP_API_URL` - Override the API base URL
  - Default: `https://queue-health-monitor.vercel.app`
  - Example: `https://queue-health-monitor.vercel.app`

## Project Structure

```
queue-health-monitor-tse-view/     # Root directory for Vercel project
├── src/                           # Source files
├── public/                        # Static assets
├── package.json                   # Dependencies
├── vercel.json                    # Vercel config (optional, auto-detected)
└── build/                         # Build output (generated)
```

## Testing Deployment

After deployment, test with:

```
https://your-tse-view-domain.vercel.app?currentUserEmail=test@example.com
```

## Troubleshooting

### API Calls Failing

- Verify the main Queue Health Monitor project is deployed
- Check CORS settings on the API
- Verify `REACT_APP_API_URL` is set correctly if using custom domain

### Build Fails

- Ensure `package.json` is in the root directory
- Check Node.js version (should be 14+)
- Verify all dependencies are listed in `package.json`

### User Not Identified

- Check that `currentUserEmail` is being passed correctly
- Verify email matches Intercom team member email
- Check browser console for errors
