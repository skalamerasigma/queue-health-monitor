# Setting Up Vercel Postgres for Historical Snapshots

The historical snapshot feature requires a Vercel Postgres database for persistent storage.

## Setup Steps

1. **Add Vercel Postgres to your project:**
   - Go to your Vercel project dashboard
   - Navigate to **Storage** → **Create Database** → **Postgres**
   - Follow the prompts to create the database
   - Vercel will automatically add the required environment variables

2. **Verify Environment Variables:**
   Vercel automatically adds these environment variables when you create a Postgres database:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`
   - `POSTGRES_USER`
   - `POSTGRES_HOST`
   - `POSTGRES_PASSWORD`
   - `POSTGRES_DATABASE`

3. **Deploy:**
   The database table will be created automatically on first use. No manual migration needed.

## How It Works

- The `@vercel/postgres` package automatically uses the environment variables
- Tables are created automatically when the API endpoints are first called
- The `tse_snapshots` table stores:
  - `date`: Snapshot date (YYYY-MM-DD)
  - `timestamp`: Full timestamp
  - `tse_data`: JSONB column with TSE metrics
  - `created_at`: When the record was created

## Troubleshooting

If you see errors about database connection:
1. Verify Postgres database is created in Vercel
2. Check that environment variables are set in Vercel project settings
3. Redeploy the project after adding the database

