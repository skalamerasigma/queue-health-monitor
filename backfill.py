#!/usr/bin/env python3
"""
Backfill script for response_time_metrics table.
Populates the last 2 weeks of weekday data (excluding weekends).

Usage:
    export INTERCOM_TOKEN="your_intercom_token"
    export POSTGRES_URL="your_postgres_connection_string"
    python3 backfill.py

Requirements:
    pip install requests psycopg2-binary pytz

The script will:
1. Find the last 10 weekdays (excluding weekends)
2. For each weekday, fetch conversations created on that day (LA timezone)
3. Calculate metrics (10+ minute wait times, percentages, etc.)
4. Store conversation IDs for conversations with 10+ minute waits
5. Insert/update records in the response_time_metrics table
"""

import os
import json
import time
import csv
from datetime import datetime, timedelta
import pytz
import requests
import psycopg2
from psycopg2.extras import Json
from psycopg2 import sql

# Configuration
INTERCOM_BASE_URL = "https://api.intercom.io"
INTERCOM_TOKEN = os.getenv("INTERCOM_TOKEN")
TEAM_ASSIGNEE_ID = "5480079"
TEN_MINUTES_SECONDS = 600
MAX_PAGES = 10
BATCH_SIZE = 10

# Database connection - try full URL first, then construct from components
POSTGRES_URL = (
    os.getenv("POSTGRES_URL") or 
    os.getenv("POSTGRES_URL_NON_POOLING") or 
    os.getenv("POSTGRES_PRISMA_URL")
)

# If no full URL, try to construct from components
if not POSTGRES_URL:
    postgres_host = os.getenv("POSTGRES_HOST")
    postgres_password = os.getenv("POSTGRES_PASSWORD")
    postgres_database = os.getenv("POSTGRES_DATABASE") or "postgres"
    
    if postgres_host and postgres_password:
        POSTGRES_URL = f"postgresql://postgres:{postgres_password}@{postgres_host}:5432/{postgres_database}?sslmode=require"
        print(f"Constructed POSTGRES_URL from components (host: {postgres_host})")

if not INTERCOM_TOKEN:
    raise ValueError("INTERCOM_TOKEN environment variable is required")
if not POSTGRES_URL:
    raise ValueError("POSTGRES_URL or POSTGRES_HOST/POSTGRES_PASSWORD environment variables are required")

# Prepare Intercom auth header
AUTH_HEADER = INTERCOM_TOKEN if INTERCOM_TOKEN.startswith("Bearer ") else f"Bearer {INTERCOM_TOKEN}"


def get_weekdays_last_2_weeks():
    """Get all weekdays (Monday-Friday) from the last 2 weeks."""
    weekdays = []
    la_tz = pytz.timezone("America/Los_Angeles")
    today = datetime.now(la_tz)
    
    # Go back up to 14 days to find 10 weekdays
    days_back = 0
    weekdays_found = 0
    
    while weekdays_found < 10 and days_back < 14:
        check_date = today - timedelta(days=days_back)
        # Monday = 0, Friday = 4
        if check_date.weekday() < 5:  # Monday through Friday
            weekdays.append(check_date.date())
            weekdays_found += 1
        days_back += 1
    
    return sorted(weekdays)


def get_la_date_range_utc(date_obj):
    """
    Convert a LA date (YYYY-MM-DD) to UTC timestamp range.
    Returns (start_utc_seconds, end_utc_seconds) for that day in LA timezone.
    Includes conversations created between 2:00 AM - 6:00 PM Pacific Time.
    Excludes conversations created before 2AM and between 6PM - 11:59PM.
    """
    la_tz = pytz.timezone("America/Los_Angeles")
    utc_tz = pytz.UTC
    
    # Create start at 2:00 AM and end at 6:00 PM (18:00) in LA timezone
    start_la = la_tz.localize(datetime.combine(date_obj, datetime.min.time().replace(hour=2, minute=0, second=0)))
    end_la = la_tz.localize(datetime.combine(date_obj, datetime.min.time().replace(hour=18, minute=0, second=0)))
    
    # Convert to UTC
    start_utc = start_la.astimezone(utc_tz)
    end_utc = end_la.astimezone(utc_tz)
    
    return int(start_utc.timestamp()), int(end_utc.timestamp())


def fetch_conversations_for_date(start_seconds, end_seconds):
    """Fetch all conversations created between start_seconds and end_seconds."""
    all_conversations = []
    starting_after = None
    page_count = 0
    
    while page_count < MAX_PAGES:
        body = {
            "query": {
                "operator": "AND",
                "value": [
                    {
                        "field": "team_assignee_id",
                        "operator": "=",
                        "value": TEAM_ASSIGNEE_ID
                    },
                    {
                        "field": "created_at",
                        "operator": ">",
                        "value": start_seconds - 1
                    },
                    {
                        "field": "created_at",
                        "operator": "<",
                        "value": end_seconds + 1
                    }
                ]
            },
            "pagination": {
                "per_page": 150
            }
        }
        
        if starting_after:
            body["pagination"]["starting_after"] = starting_after
        
        response = requests.post(
            f"{INTERCOM_BASE_URL}/conversations/search",
            headers={
                "Authorization": AUTH_HEADER,
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Intercom-Version": "2.10"
            },
            json=body
        )
        
        if not response.ok:
            raise Exception(f"Intercom API error {response.status_code}: {response.text}")
        
        data = response.json()
        items = data.get("data") or data.get("conversations") or []
        
        # Filter by date range (client-side verification)
        filtered_items = [
            item for item in items
            if item.get("created_at") and start_seconds <= item["created_at"] <= end_seconds
        ]
        
        # Check if items need full details (missing statistics)
        items_needing_details = [item for item in filtered_items if not item.get("statistics")]
        enriched_items = [item for item in filtered_items if item.get("statistics")]
        
        # Fetch full details for conversations missing statistics
        if items_needing_details:
            for i in range(0, len(items_needing_details), BATCH_SIZE):
                batch = items_needing_details[i:i + BATCH_SIZE]
                batch_promises = []
                
                for item in batch:
                    try:
                        conv_response = requests.get(
                            f"{INTERCOM_BASE_URL}/conversations/{item['id']}",
                            headers={
                                "Authorization": AUTH_HEADER,
                                "Accept": "application/json",
                                "Intercom-Version": "2.10"
                            }
                        )
                        
                        if conv_response.ok:
                            enriched_items.append(conv_response.json())
                        else:
                            enriched_items.append(item)  # Fallback to original item
                    except Exception as e:
                        print(f"Warning: Failed to fetch details for conversation {item.get('id')}: {e}")
                        enriched_items.append(item)  # Fallback to original item
                
                # Small delay between batches
                if i + BATCH_SIZE < len(items_needing_details):
                    time.sleep(0.05)
        
        all_conversations.extend(enriched_items)
        page_count += 1
        
        # Check for next page
        pages = data.get("pages", {})
        next_page = pages.get("next")
        if not next_page:
            break
        
        starting_after = next_page if isinstance(next_page, str) else next_page.get("starting_after")
        if not starting_after:
            break
        
        # Small delay between pages
        time.sleep(0.1)
    
    return all_conversations


def calculate_metrics(conversations):
    """Calculate response time metrics from conversations."""
    count_10_plus_min = 0
    total_with_response = 0
    conversation_ids_10_plus_min = []
    
    for conv in conversations:
        statistics = conv.get("statistics", {})
        time_to_admin_reply = statistics.get("time_to_admin_reply")
        first_admin_reply_at = statistics.get("first_admin_reply_at")
        created_at = conv.get("created_at")
        
        wait_time_seconds = None
        
        if time_to_admin_reply is not None:
            wait_time_seconds = time_to_admin_reply
        elif first_admin_reply_at and created_at:
            wait_time_seconds = first_admin_reply_at - created_at
        
        if wait_time_seconds is not None and wait_time_seconds >= 0:
            total_with_response += 1
            
            if wait_time_seconds >= TEN_MINUTES_SECONDS:
                count_10_plus_min += 1
                if conv.get("id"):
                    # Store conversation ID and wait time
                    conversation_ids_10_plus_min.append({
                        "id": str(conv["id"]),
                        "waitTimeSeconds": wait_time_seconds,
                        "waitTimeMinutes": round(wait_time_seconds / 60, 2)  # Round to 2 decimal places
                    })
    
    percentage_10_plus_min = (count_10_plus_min / total_with_response * 100) if total_with_response > 0 else 0
    
    return {
        "count_10_plus_min": count_10_plus_min,
        "total_with_response": total_with_response,
        "percentage_10_plus_min": round(percentage_10_plus_min, 2),
        "conversation_ids_10_plus_min": conversation_ids_10_plus_min
    }


def migrate_database_schema(conn):
    """Migrate database schema back to simple format (remove assignment time columns). Should be called once at startup."""
    cursor = conn.cursor()
    
    try:
        # Ensure table exists with simple schema
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS response_time_metrics (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP NOT NULL,
                date VARCHAR(10) NOT NULL,
                count_10_plus_min INTEGER NOT NULL,
                total_conversations INTEGER NOT NULL,
                percentage_10_plus_min DECIMAL(5,2) NOT NULL,
                conversation_ids_10_plus_min JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(date)
            );
        """)
        
        # Add conversation_ids column if it doesn't exist
        cursor.execute("""
            ALTER TABLE response_time_metrics 
            ADD COLUMN IF NOT EXISTS conversation_ids_10_plus_min JSONB;
        """)
        
        # Check if assignment time columns exist and migrate back to simple schema
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'response_time_metrics' 
            AND column_name IN ('count_10_plus_min_response_time', 'count_10_plus_min_assignment_time')
        """)
        assignment_columns = cursor.fetchall()
        
        if assignment_columns:
            print("Found assignment time columns, migrating back to simple schema...")
            # Add simple columns if they don't exist
            cursor.execute("""
                ALTER TABLE response_time_metrics 
                ADD COLUMN IF NOT EXISTS count_10_plus_min INTEGER DEFAULT 0,
                ADD COLUMN IF NOT EXISTS percentage_10_plus_min DECIMAL(5,2) DEFAULT 0,
                ADD COLUMN IF NOT EXISTS conversation_ids_10_plus_min JSONB;
            """)
            
            # Migrate data from response_time columns to simple columns
            try:
                cursor.execute("""
                    UPDATE response_time_metrics 
                    SET 
                        count_10_plus_min = COALESCE(count_10_plus_min_response_time, count_10_plus_min, 0),
                        percentage_10_plus_min = COALESCE(percentage_10_plus_min_response_time, percentage_10_plus_min, 0),
                        conversation_ids_10_plus_min = COALESCE(conversation_ids_10_plus_min_response_time, conversation_ids_10_plus_min, '[]'::jsonb)
                    WHERE count_10_plus_min IS NULL OR count_10_plus_min = 0;
                """)
                conn.commit()
                print("  ✓ Migrated data from assignment time columns to simple columns")
            except Exception as migrate_error:
                conn.rollback()
                print(f"  Warning: Migration update failed (continuing): {migrate_error}")
            
            # Drop assignment time columns
            try:
                cursor.execute("""
                    ALTER TABLE response_time_metrics 
                    DROP COLUMN IF EXISTS count_10_plus_min_response_time,
                    DROP COLUMN IF EXISTS total_with_response_time,
                    DROP COLUMN IF EXISTS percentage_10_plus_min_response_time,
                    DROP COLUMN IF EXISTS conversation_ids_10_plus_min_response_time,
                    DROP COLUMN IF EXISTS count_10_plus_min_assignment_time,
                    DROP COLUMN IF EXISTS total_with_assignment_time,
                    DROP COLUMN IF EXISTS percentage_10_plus_min_assignment_time,
                    DROP COLUMN IF EXISTS conversation_ids_10_plus_min_assignment_time;
                """)
                conn.commit()
                print("  ✓ Dropped assignment time columns")
            except Exception as drop_error:
                conn.rollback()
                print(f"  ✗ Error: Could not drop assignment time columns: {drop_error}")
                print(f"     You may need to manually drop these columns from the database")
                raise Exception(f"Cannot proceed with assignment time columns present: {drop_error}")
        else:
            print("Database schema is up to date (no assignment time columns found)")
        
    finally:
        cursor.close()


def save_metric_to_db(conn, date_str, metric, total_conversations):
    """Save or update metric in database."""
    cursor = conn.cursor()
    
    try:
        
        # Insert or update
        cursor.execute("""
            INSERT INTO response_time_metrics 
                (timestamp, date, count_10_plus_min, total_conversations, percentage_10_plus_min, conversation_ids_10_plus_min)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (date) 
            DO UPDATE SET 
                timestamp = EXCLUDED.timestamp,
                count_10_plus_min = EXCLUDED.count_10_plus_min,
                total_conversations = EXCLUDED.total_conversations,
                percentage_10_plus_min = EXCLUDED.percentage_10_plus_min,
                conversation_ids_10_plus_min = EXCLUDED.conversation_ids_10_plus_min,
                created_at = NOW()
            RETURNING id, date, timestamp;
        """, (
            datetime.now(pytz.UTC).replace(tzinfo=None),  # Remove timezone for PostgreSQL TIMESTAMP
            date_str,
            metric["count_10_plus_min"],
            total_conversations,
            metric["percentage_10_plus_min"],
            Json(metric["conversation_ids_10_plus_min"])
        ))
        
        result = cursor.fetchone()
        conn.commit()
        return result
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()


def main():
    """Main backfill function."""
    print("Starting backfill for response_time_metrics table...")
    la_tz = pytz.timezone("America/Los_Angeles")
    print(f"Time: {datetime.now(la_tz).strftime('%Y-%m-%d %H:%M:%S %Z')}")
    
    # Get weekdays for last 2 weeks
    weekdays = get_weekdays_last_2_weeks()
    print(f"\nFound {len(weekdays)} weekdays to process:")
    for day in weekdays:
        print(f"  - {day}")
    
    # Create CSV file
    csv_filename = f"response_time_metrics_backfill_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    print(f"\nCSV output file: {csv_filename}")
    
    # Connect to database
    print("\nConnecting to database...")
    conn = psycopg2.connect(POSTGRES_URL)
    
    # Migrate schema once at the start
    print("Checking and migrating database schema...")
    migrate_database_schema(conn)
    
    # Prepare CSV data
    csv_rows = []
    
    try:
        for i, date_obj in enumerate(weekdays, 1):
            date_str = date_obj.strftime("%Y-%m-%d")
            print(f"\n[{i}/{len(weekdays)}] Processing {date_str}...")
            
            # Get UTC timestamp range for this date in LA timezone
            start_seconds, end_seconds = get_la_date_range_utc(date_obj)
            utc_tz = pytz.UTC
            print(f"  Date range (UTC): {datetime.fromtimestamp(start_seconds, tz=utc_tz)} to {datetime.fromtimestamp(end_seconds, tz=utc_tz)}")
            
            # Fetch conversations
            print("  Fetching conversations from Intercom...")
            conversations = fetch_conversations_for_date(start_seconds, end_seconds)
            print(f"  Found {len(conversations)} conversations")
            
            # Calculate metrics
            print("  Calculating metrics...")
            metrics = calculate_metrics(conversations)
            print(f"  Total conversations: {len(conversations)}")
            print(f"  Conversations with response: {metrics['total_with_response']}")
            print(f"  10+ minute waits: {metrics['count_10_plus_min']} ({metrics['percentage_10_plus_min']}%)")
            print(f"  Conversation IDs with 10+ min waits: {len(metrics['conversation_ids_10_plus_min'])}")
            
            # Save to database
            print("  Saving to database...")
            result = save_metric_to_db(conn, date_str, metrics, len(conversations))
            print(f"  ✓ Saved: ID={result[0]}, Date={result[1]}, Timestamp={result[2]}")
            
            # Format conversation IDs with wait times for CSV
            conversation_details = []
            for conv_data in metrics['conversation_ids_10_plus_min']:
                if isinstance(conv_data, dict):
                    conversation_details.append(f"{conv_data['id']} ({conv_data['waitTimeMinutes']} min)")
                else:
                    # Backward compatibility with old format (just ID)
                    conversation_details.append(str(conv_data))
            
            # Add to CSV data
            csv_rows.append({
                "Date": date_str,
                "Total Conversations": len(conversations),
                "Conversations with Response": metrics['total_with_response'],
                "10+ Minute Waits": metrics['count_10_plus_min'],
                "Percentage 10+ Min": f"{metrics['percentage_10_plus_min']}%",
                "Conversation IDs (10+ min)": ", ".join(conversation_details),
                "Database ID": result[0],
                "Timestamp": result[2].isoformat() if result[2] else ""
            })
            
            # Small delay between dates to avoid rate limiting
            if i < len(weekdays):
                time.sleep(1)
        
        # Write CSV file
        print(f"\nWriting CSV file: {csv_filename}")
        with open(csv_filename, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = [
                "Date",
                "Total Conversations",
                "Conversations with Response",
                "10+ Minute Waits",
                "Percentage 10+ Min",
                "Conversation IDs (10+ min)",
                "Database ID",
                "Timestamp"
            ]
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(csv_rows)
        
        print(f"✓ CSV file written: {csv_filename}")
        print("\n✓ Backfill completed successfully!")
        
    except Exception as e:
        print(f"\n✗ Error during backfill: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()

