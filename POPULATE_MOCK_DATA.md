# Populate Mock Data Script

This script populates the `response_time_metrics` and `tse_snapshots` tables with mock data for the last 30 days.

## Prerequisites

1. **Environment Variables**: Make sure you have the following environment variables set:
   - `POSTGRES_URL` or `POSTGRES_URL_NON_POOLING` or `POSTGRES_PRISMA_URL` - Database connection string
   - `INTERCOM_TOKEN` - Intercom API token (optional, will use sample TSEs if not available)

2. **Dependencies**: Install required packages:
   ```bash
   cd api
   npm install
   ```

## Usage

### Run from api directory (recommended)

```bash
cd api

# Set environment variables and run
INTERCOM_TOKEN='your-intercom-token' \
POSTGRES_URL='your-postgres-url' \
node populate-mock-data.js
```

Or set them separately:

```bash
cd api
export POSTGRES_URL="your-postgres-url"
export INTERCOM_TOKEN="your-intercom-token"
node populate-mock-data.js
```

### Option 3: Using .env file

Create a `.env` file in the root directory:

```
POSTGRES_URL=your-postgres-url
INTERCOM_TOKEN=your-intercom-token
```

Then run:
```bash
node populate-mock-data.js
```

## What the Script Does

1. **Fetches Actual TSEs**: Connects to Intercom API to get real TSE data (or uses sample data if API is unavailable)

2. **Generates Mock TSE Snapshots**:
   - Creates 30 days of snapshot data
   - Each snapshot contains metrics for all TSEs:
     - `open`: 0-10 open chats
     - `actionableSnoozed`: 0-8 actionable snoozed
     - `investigationSnoozed`: 0-5 investigation snoozed
     - `customerWaitSnoozed`: 0-5 customer wait snoozed
     - `totalSnoozed`: Sum of all snoozed types

3. **Generates Mock Response Time Metrics**:
   - Creates 30 days of response time data
   - Each day includes:
     - `totalConversations`: 50-200 conversations
     - `percentage10PlusMin`: 5-25% with 10+ minute wait time
     - `count10PlusMin`: Calculated from percentage
     - `conversationIds10PlusMin`: Mock conversation IDs

## Data Characteristics

- **Realistic Ranges**: Values are generated within realistic ranges based on actual thresholds
- **Unique Dates**: Each date (YYYY-MM-DD) is unique - existing data for a date will be updated
- **Excluded TSEs**: The script automatically excludes TSEs in the `EXCLUDED_TSE_NAMES` list
- **Weekdays Only**: Snapshots are created for weekdays (Monday-Friday) at 10pm ET

## Notes

- The script uses `ON CONFLICT` to update existing data if a date already exists
- Progress is shown every 5 days
- Errors for individual dates are logged but don't stop the script
- The script will create tables if they don't exist

## Troubleshooting

**Error: "No Postgres connection string found"**
- Make sure `POSTGRES_URL` or similar environment variable is set

**Error: "INTERCOM_TOKEN not configured"**
- The script will use sample TSEs if the token is missing
- Set `INTERCOM_TOKEN` to fetch real TSE data

**Connection errors**
- Verify your database connection string is correct
- Check that your database allows connections from your IP
- For Supabase, ensure SSL mode is set correctly

