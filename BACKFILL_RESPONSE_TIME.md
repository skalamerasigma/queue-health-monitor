# Response Time Metrics Backfill Script

This standalone script calculates response time metrics for the previous 10 UTC days and outputs the results to a CSV file.

## Prerequisites

- Node.js (v14 or higher)
- Intercom API access token

## Installation

Install dependencies:

```bash
npm install node-fetch
```

Or if you're in the project root and want to use the existing dependencies:

```bash
cd api
npm install
cd ..
```

## Usage

Set your Intercom token as an environment variable and run the script:

```bash
INTERCOM_TOKEN=your_token_here node backfill-response-time.mjs
```

Or export it first:

```bash
export INTERCOM_TOKEN=your_token_here
node backfill-response-time.mjs
```

## What It Does

1. Processes the previous 10 UTC days (yesterday back to 10 days ago)
2. For each day, calculates metrics for conversations created between 2 AM - 6 PM PT
3. Calculates:
   - Total conversations created
   - Total conversations with admin responses
   - Count of conversations with 5+ minute wait times
   - Count of conversations with 10+ minute wait times
   - Percentages for each threshold

## Output

The script generates a CSV file named `response-time-metrics-YYYY-MM-DD.csv` with columns that match the Supabase `response_time_metrics` table exactly:

- **timestamp**: When the metric was calculated (ISO 8601 format)
- **total_conversations**: Total conversations created in the time window
- **date**: UTC date (YYYY-MM-DD)
- **conversation_ids_10_plus_min**: JSON array of conversation objects with 10+ minute wait times
- **count_10_plus_min**: Number of conversations that waited 10+ minutes
- **percentage_10_plus_min**: Percentage of conversations with 10+ minute wait times (out of total with response)
- **count_5_plus_min**: Total number of conversations with 5+ minute wait times
- **percentage_5_plus_min**: Percentage of conversations with 5+ minute wait times (out of total with response)
- **conversation_ids_5_plus_min**: JSON array of conversation objects with 5+ minute wait times
- **count_5_to_10_min**: Number of conversations that waited 5-10 minutes (subset of 5+ Min)
- **percentage_5_to_10_min**: Percentage of conversations with 5-10 minute wait times (out of total with response)

**Note**: The `count_5_plus_min` is the sum of `count_5_to_10_min` and `count_10_plus_min`. The 10+ minute conversations are included in the 5+ minute total. All percentages are calculated out of the total conversations that received a response (not total conversations created). The conversation_ids columns contain JSON arrays with conversation details including ID, wait times, timestamps, and assignee information.

## Notes

- The script includes a 1-second delay between processing each day to avoid rate limiting
- If processing fails for a specific day, the script continues with the remaining days
- The script uses the same logic as the `response-time-hourly` cron job
- Time windows are calculated as 2 AM - 6 PM Pacific Time, converted to UTC

## Example Output

```
Processing previous 10 UTC days...

[2025-01-15] Fetching conversations...
  Start UTC: 2025-01-15T10:00:00.000Z (1736942400)
  End UTC: 2025-01-16T02:00:00.000Z (1736992800)
  Start PT: 1/15/2025, 02:00:00
  End PT: 1/15/2025, 18:00:00
[2025-01-15] Found 45 conversations
[2025-01-15] ✓ Completed: 45 conversations, 12 with 5+ min wait, 5 with 10+ min wait

...

✓ Successfully processed 10 days
✓ CSV file written: response-time-metrics-2025-01-16.csv
```
