# Admin Assignee Backfill Script

This script enriches existing `response_time_metrics` records with admin_assignee information by fetching admin details from Intercom for conversations that have `admin_assignee_id` but are missing or have incomplete `admin_assignee` data.

## Prerequisites

- Node.js (v14 or higher)
- Intercom API access token
- PostgreSQL connection string (POSTGRES_URL or POSTGRES_URL_NON_POOLING)

## Installation

Install dependencies:

```bash
npm install pg node-fetch
```

Or if you're in the project root and want to use the existing dependencies:

```bash
cd api
npm install
cd ..
```

## Usage

Set your environment variables and run the script:

```bash
INTERCOM_TOKEN=your_token_here POSTGRES_URL=your_postgres_url node backfill-admin-assignee.mjs
```

Or export them first:

```bash
export INTERCOM_TOKEN=your_token_here
export POSTGRES_URL=your_postgres_url
node backfill-admin-assignee.mjs
```

## What It Does

1. Reads all `response_time_metrics` records from the database
2. For each record, processes the `conversation_ids_5_plus_min` and `conversation_ids_10_plus_min` arrays
3. For conversations that have `admin_assignee_id` but missing or incomplete `admin_assignee`:
   - Fetches admin details from Intercom API
   - Enriches the conversation object with `adminAssigneeName` and full `admin_assignee` object
4. Updates the database record with enriched data

## Output

The script will:
- Show progress for each record processed
- Indicate which conversations were enriched
- Display summary statistics:
  - Number of records updated
  - Number of errors encountered

## Notes

- The script includes delays between API calls to avoid rate limiting (100ms between conversations, 500ms between records)
- If processing fails for a specific record, the script continues with the remaining records
- The script only updates records where enrichment actually changed the data
- Safe to run multiple times - it will only update records that need enrichment

## Example Output

```
Starting admin_assignee backfill...

Found 15 records to process

Processing record 1 (date: 2025-01-17)
  Found 16 conversations with 5+ min wait
    Enriching conversation 123456 - admin_assignee_id: 789012
    Enriching conversation 234567 - admin_assignee_id: 789012
  Found 5 conversations with 10+ min wait
    Enriching conversation 345678 - admin_assignee_id: 789013
  ✓ Updated record 1

Processing record 2 (date: 2025-01-16)
  Found 12 conversations with 5+ min wait
  - No updates needed for record 2

...

✓ Backfill complete!
  Updated: 8 records
  Errors: 0 records
```
