# Testing the Cron Job

## Method 1: Manual HTTP Request

You can manually trigger the cron job by making a GET request to:

```
https://queue-health-monitor.vercel.app/api/cron/snapshot
```

### Using curl:
```bash
curl -X GET "https://queue-health-monitor.vercel.app/api/cron/snapshot"
```

### Using browser:
Just open this URL in your browser:
```
https://queue-health-monitor.vercel.app/api/cron/snapshot
```

## Method 2: Vercel Dashboard

1. Go to your Vercel project dashboard
2. Navigate to **Deployments**
3. Find your latest deployment
4. Click on **Functions** tab
5. Look for `/api/cron/snapshot`
6. You can trigger it manually from there

## Method 3: Test Endpoint (Optional)

If you want a simpler test endpoint without authentication, I can create a `/api/test-snapshot` endpoint that you can call directly.

## What to Expect

When the cron job runs successfully, you should see:
- A JSON response with `{"success": true, "snapshot": {...}}`
- A new snapshot saved to the database for today's date (or yesterday's date if it's before 10pm ET)
- The snapshot will appear in the Historical tab

## Current Schedule

The cron job is scheduled to run:
- **Time**: 3am UTC (10pm ET previous day)
- **Days**: Tuesday through Saturday (weekdays)
- **Schedule**: `0 3 * * 2-6`

## Note

The cron job uses ET timezone logic:
- If it's after 10pm ET, it saves for today's date
- If it's before 10pm ET, it saves for yesterday's date

