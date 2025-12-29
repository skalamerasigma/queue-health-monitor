# Testing Intercom API Calls

## Curl Command for Testing Response Time Metrics Query

### Option 1: With Date Range (Today's Conversations)

Replace `YOUR_INTERCOM_TOKEN` with your actual Intercom API token.

```bash
curl -X POST "https://api.intercom.io/conversations/search" \
  -H "Authorization: Bearer YOUR_INTERCOM_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Intercom-Version: 2.10" \
  -d '{
    "query": {
      "operator": "AND",
      "value": [
        {
          "field": "team_assignee_id",
          "operator": "=",
          "value": "5480079"
        },
        {
          "field": "created_at",
          "operator": ">=",
          "value": START_TIMESTAMP
        },
        {
          "field": "created_at",
          "operator": "<=",
          "value": END_TIMESTAMP
        }
      ]
    },
    "pagination": {
      "per_page": 150
    }
  }'
```

### Option 2: Calculate Timestamps for Today

To get today's start and end timestamps (Unix seconds), run:

```bash
node -e "
const now = new Date();
const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
console.log('Start timestamp:', Math.floor(todayStart.getTime() / 1000));
console.log('End timestamp:', Math.floor(todayEnd.getTime() / 1000));
"
```

### Option 3: All Conversations (No Date Filter)

If you want to test without date filtering (to see if date filtering is the issue):

```bash
curl -X POST "https://api.intercom.io/conversations/search" \
  -H "Authorization: Bearer YOUR_INTERCOM_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Intercom-Version: 2.10" \
  -d '{
    "query": {
      "operator": "AND",
      "value": [
        {
          "field": "team_assignee_id",
          "operator": "=",
          "value": "5480079"
        }
      ]
    },
    "pagination": {
      "per_page": 150
    }
  }'
```

### Option 4: Test the Cron Endpoint Directly

To test the actual cron endpoint (manual trigger):

```bash
curl -X GET "https://queue-health-monitor.vercel.app/api/cron/response-time-hourly" \
  -H "Accept: application/json"
```

Or for local testing:

```bash
curl -X GET "http://localhost:3000/api/cron/response-time-hourly" \
  -H "Accept: application/json"
```

## Notes

- **Date Filtering**: Intercom's API may not support filtering by `created_at` directly. If you get an error about invalid field, use Option 3 (no date filter) and filter client-side.
- **Pagination**: If there are more results, the response will include a `pages.next` object with a `starting_after` value. Use that in subsequent requests.
- **Rate Limits**: Intercom has rate limits. If you hit them, you'll get a 429 status code.

## Common Errors

- **401 Unauthorized**: Check your Intercom token
- **400 Bad Request**: The query structure might be invalid (e.g., `created_at` might not be filterable)
- **429 Too Many Requests**: You've hit rate limits, wait and retry

