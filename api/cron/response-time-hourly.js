import fetch from "node-fetch";
import pkg from 'pg';
const { Pool } = pkg;

const INTERCOM_BASE_URL = "https://api.intercom.io";

// Disable TLS certificate verification for Supabase
if (process.env.POSTGRES_URL?.includes('supabase.co') || 
    process.env.POSTGRES_URL_NON_POOLING?.includes('supabase.co')) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// Create a connection pool
let pool = null;

function getPool() {
  if (!pool) {
    let connectionString = process.env.POSTGRES_URL || 
                          process.env.POSTGRES_URL_NON_POOLING || 
                          process.env.POSTGRES_PRISMA_URL;
    
    if (!connectionString) {
      throw new Error('No Postgres connection string found');
    }
    
    const isSupabase = connectionString.includes('supabase.co');
    
    if (isSupabase) {
      if (connectionString.includes('sslmode=')) {
        connectionString = connectionString.replace(/sslmode=[^&]*/, 'sslmode=require');
      } else {
        connectionString += (connectionString.includes('?') ? '&' : '?') + 'sslmode=require';
      }
    }
    
    const sslConfig = isSupabase ? {
      rejectUnauthorized: false
    } : undefined;
    
    pool = new Pool({
      connectionString,
      ssl: sslConfig,
      max: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });
  }
  return pool;
}

export const dynamic = 'force-dynamic';

export default async function handler(req, res) {
  // Allow manual triggers from frontend (no auth required for manual calls)
  // Only verify auth if Authorization header is present (cron jobs from Vercel)
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  // Detect if this is a scheduled cron job (has auth header) or manual trigger (no auth header)
  const isScheduledCron = !!(authHeader && cronSecret);
  
  // If Authorization header is present, verify it matches CRON_SECRET
  // This allows manual triggers without auth, but protects cron jobs
  if (authHeader && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  try {
    const INTERCOM_TOKEN = process.env.INTERCOM_TOKEN;
    if (!INTERCOM_TOKEN) {
      throw new Error("INTERCOM_TOKEN not configured");
    }

    const authHeaderValue = INTERCOM_TOKEN.startsWith('Bearer ')
      ? INTERCOM_TOKEN
      : `Bearer ${INTERCOM_TOKEN}`;

    const now = new Date();
    
    // Get the previous UTC day (yesterday in UTC)
    const prevUTCDay = new Date(now);
    prevUTCDay.setUTCDate(prevUTCDay.getUTCDate() - 1);
    prevUTCDay.setUTCHours(0, 0, 0, 0);
    
    const year = prevUTCDay.getUTCFullYear();
    const month = prevUTCDay.getUTCMonth() + 1;
    const day = prevUTCDay.getUTCDate();
    
    // Format as YYYY-MM-DD for the date column
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    console.log(`[Response Time Hourly] ${isScheduledCron ? 'Scheduled cron' : 'Manual trigger'}: capturing data for UTC date ${dateStr}`);
    
    // Convert 2 AM - 6 PM PT for this date to UTC timestamps
    // Create date strings in PT timezone, then convert to UTC
    const startPTStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T02:00:00`;
    const endPTStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T18:00:00`;
    
    // Use Intl.DateTimeFormat to properly convert PT times to UTC
    // Create a formatter for PT timezone
    const ptFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    // Helper: find UTC timestamp that represents a given PT time
    function ptTimeToUTC(ptYear, ptMonth, ptDay, ptHour, ptMinute, ptSecond) {
      // Start with estimate: PT is UTC-8 (PST) or UTC-7 (PDT)
      // Try UTC-8 first (PST)
      let utcCandidate = new Date(Date.UTC(ptYear, ptMonth - 1, ptDay, ptHour + 8, ptMinute, ptSecond));
      
      // Verify and adjust if needed
      for (let i = 0; i < 3; i++) {
        const parts = ptFormatter.formatToParts(utcCandidate);
        const actualYear = parseInt(parts.find(p => p.type === 'year').value);
        const actualMonth = parseInt(parts.find(p => p.type === 'month').value);
        const actualDay = parseInt(parts.find(p => p.type === 'day').value);
        const actualHour = parseInt(parts.find(p => p.type === 'hour').value);
        const actualMinute = parseInt(parts.find(p => p.type === 'minute').value);
        
        if (actualYear === ptYear && actualMonth === ptMonth && actualDay === ptDay && 
            actualHour === ptHour && actualMinute === ptMinute) {
          return utcCandidate;
        }
        
        // Adjust: if actual is later, UTC candidate is too early, so add hours
        // If actual is earlier, UTC candidate is too late, so subtract hours
        const actualDate = new Date(Date.UTC(actualYear, actualMonth - 1, actualDay, actualHour, actualMinute, 0));
        const targetDate = new Date(Date.UTC(ptYear, ptMonth - 1, ptDay, ptHour, ptMinute, 0));
        const diffMs = targetDate.getTime() - actualDate.getTime();
        utcCandidate = new Date(utcCandidate.getTime() - diffMs);
      }
      
      return utcCandidate;
    }
    
    const startUTC = ptTimeToUTC(year, month, day, 2, 0, 0);
    const endUTC = ptTimeToUTC(year, month, day, 18, 0, 0);
    
    const todayStartSeconds = Math.floor(startUTC.getTime() / 1000);
    const todayEndSeconds = Math.floor(endUTC.getTime() / 1000);
    
    console.log(`[Response Time Hourly] Date range for ${dateStr}:`);
    console.log(`  Start: ${startUTC.toISOString()} (${todayStartSeconds})`);
    console.log(`  End: ${endUTC.toISOString()} (${todayEndSeconds})`);
    console.log(`  Start PT: ${startUTC.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', hour12: false })}`);
    console.log(`  End PT: ${endUTC.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', hour12: false })}`);

    // Fetch only conversations created today (optimized query)
    const conversationsToday = await fetchTeamConversationsCreatedToday(authHeaderValue, todayStartSeconds, todayEndSeconds);

    // Calculate metrics: count conversations with 10+ minute wait time
    // Also store conversation IDs for those with 10+ minute wait times
    const TEN_MINUTES_SECONDS = 600;
    let count10PlusMin = 0;
    let totalWithResponse = 0;
    const conversations10PlusMin = []; // Store conversation IDs with 10+ minute wait times

    conversationsToday.forEach(conv => {
      // Check if conversation has a first admin reply
      // Use time_to_admin_reply if available (in seconds), otherwise calculate from timestamps
      const timeToAdminReply = conv.statistics?.time_to_admin_reply;
      const firstAdminReplyAt = conv.statistics?.first_admin_reply_at;
      const createdAt = conv.created_at;

      let waitTimeSeconds = null;
      
      if (timeToAdminReply !== null && timeToAdminReply !== undefined) {
        // Use the pre-calculated time_to_admin_reply field (in seconds)
        waitTimeSeconds = timeToAdminReply;
      } else if (firstAdminReplyAt && createdAt) {
        // Calculate from timestamps (both are Unix timestamps in seconds)
        waitTimeSeconds = firstAdminReplyAt - createdAt;
      }

      if (waitTimeSeconds !== null && waitTimeSeconds >= 0) {
        totalWithResponse++;
        
        if (waitTimeSeconds >= TEN_MINUTES_SECONDS) {
          count10PlusMin++;
          // Store conversation ID and wait time for display in expandable table
          if (conv.id) {
            conversations10PlusMin.push({
              id: conv.id,
              waitTimeSeconds: waitTimeSeconds,
              waitTimeMinutes: Math.round(waitTimeSeconds / 60 * 100) / 100 // Round to 2 decimal places
            });
          }
        }
      }
    });

    const percentage10PlusMin = totalWithResponse > 0 
      ? (count10PlusMin / totalWithResponse) * 100 
      : 0;

    // Create metric record - use the UTC date we calculated
    const date = dateStr; // Format: YYYY-MM-DD (UTC date, one entry per day)

    const metric = {
      timestamp: now.toISOString(),
      date,
      count10PlusMin,
      totalConversations: conversationsToday.length, // Only count conversations created today
      totalWithResponse,
      percentage10PlusMin: Math.round(percentage10PlusMin * 100) / 100,
      conversationIds10PlusMin: conversations10PlusMin // Store IDs for expandable table
    };

    // Save to database
    const db = getPool();
    
    await db.query(`
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
    `);

    // Add conversation_ids_10_plus_min column if it doesn't exist (for existing tables)
    try {
      await db.query(`
        ALTER TABLE response_time_metrics 
        ADD COLUMN IF NOT EXISTS conversation_ids_10_plus_min JSONB;
      `);
    } catch (migrationError) {
      console.warn('Migration warning (may be safe to ignore):', migrationError.message);
    }

    // Migrate from assignment time schema back to simple schema if needed
    try {
      const assignmentColumnsCheck = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'response_time_metrics' 
        AND column_name IN ('count_10_plus_min_response_time', 'count_10_plus_min_assignment_time')
      `);
      
      if (assignmentColumnsCheck.rows.length > 0) {
        console.log('Migrating from assignment time schema back to simple schema...');
        
        // Add simple columns if they don't exist
        await db.query(`
          ALTER TABLE response_time_metrics 
          ADD COLUMN IF NOT EXISTS count_10_plus_min INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS percentage_10_plus_min DECIMAL(5,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS conversation_ids_10_plus_min JSONB;
        `);
        
        // Migrate data from response_time columns to simple columns
        await db.query(`
          UPDATE response_time_metrics 
          SET 
            count_10_plus_min = COALESCE(count_10_plus_min_response_time, count_10_plus_min, 0),
            percentage_10_plus_min = COALESCE(percentage_10_plus_min_response_time, percentage_10_plus_min, 0),
            conversation_ids_10_plus_min = COALESCE(conversation_ids_10_plus_min_response_time, conversation_ids_10_plus_min, '[]'::jsonb)
          WHERE count_10_plus_min IS NULL OR count_10_plus_min = 0;
        `);
        
        // Drop assignment time columns
        await db.query(`
          ALTER TABLE response_time_metrics 
          DROP COLUMN IF EXISTS count_10_plus_min_response_time,
          DROP COLUMN IF EXISTS total_with_response_time,
          DROP COLUMN IF EXISTS percentage_10_plus_min_response_time,
          DROP COLUMN IF EXISTS conversation_ids_10_plus_min_response_time,
          DROP COLUMN IF EXISTS count_10_plus_min_assignment_time,
          DROP COLUMN IF EXISTS total_with_assignment_time,
          DROP COLUMN IF EXISTS percentage_10_plus_min_assignment_time,
          DROP COLUMN IF EXISTS conversation_ids_10_plus_min_assignment_time;
        `);
        
        console.log('Migration back to simple schema completed');
      }
    } catch (migrationError) {
      console.warn('Migration warning (may be safe to ignore):', migrationError.message);
    }

    // Migrate from old schema (date_hour) to new schema (date) if needed
    try {
      const columnCheck = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'response_time_metrics' 
        AND column_name = 'date_hour'
      `);
      
      if (columnCheck.rows.length > 0) {
        // Old schema exists, migrate data
        await db.query(`
          ALTER TABLE response_time_metrics 
          ADD COLUMN IF NOT EXISTS date VARCHAR(10);
        `);
        
        // Migrate existing data: extract date from date_hour (format: YYYY-MM-DD-HH -> YYYY-MM-DD)
        await db.query(`
          UPDATE response_time_metrics 
          SET date = SUBSTRING(date_hour, 1, 10)
          WHERE date IS NULL AND date_hour IS NOT NULL;
        `);
        
        // Drop old column and constraint
        await db.query(`
          ALTER TABLE response_time_metrics 
          DROP CONSTRAINT IF EXISTS response_time_metrics_date_hour_key;
        `);
        
        await db.query(`
          ALTER TABLE response_time_metrics 
          DROP COLUMN IF EXISTS date_hour;
        `);
        
        // Add new unique constraint on date
        await db.query(`
          ALTER TABLE response_time_metrics 
          ADD CONSTRAINT response_time_metrics_date_key UNIQUE (date);
        `);
      }
    } catch (migrationError) {
      console.warn('Migration warning (may be safe to ignore):', migrationError.message);
    }

    console.log(`[Response Time Hourly] Saving metric for date: ${metric.date}`, {
      timestamp: metric.timestamp,
      count10PlusMin: metric.count10PlusMin,
      totalConversations: metric.totalConversations,
      percentage10PlusMin: metric.percentage10PlusMin,
      conversationIdsCount: metric.conversationIds10PlusMin?.length || 0
    });

    const insertResult = await db.query(`
      INSERT INTO response_time_metrics (timestamp, date, count_10_plus_min, total_conversations, percentage_10_plus_min, conversation_ids_10_plus_min)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (date) 
      DO UPDATE SET 
        timestamp = EXCLUDED.timestamp,
        count_10_plus_min = EXCLUDED.count_10_plus_min,
        total_conversations = EXCLUDED.total_conversations,
        percentage_10_plus_min = EXCLUDED.percentage_10_plus_min,
        conversation_ids_10_plus_min = EXCLUDED.conversation_ids_10_plus_min,
        created_at = NOW()
      RETURNING id, date, timestamp;
    `, [
      metric.timestamp,
      metric.date,
      metric.count10PlusMin,
      metric.totalConversations,
      metric.percentage10PlusMin,
      JSON.stringify(metric.conversationIds10PlusMin || [])
    ]);

    console.log(`[Response Time Hourly] Database insert successful:`, insertResult.rows[0]);

    // Verify the data was actually saved
    const verifyResult = await db.query(`
      SELECT id, date, timestamp, count_10_plus_min, total_conversations, percentage_10_plus_min, conversation_ids_10_plus_min
      FROM response_time_metrics
      WHERE date = $1
    `, [metric.date]);

    console.log(`[Response Time Hourly] Verification query result:`, verifyResult.rows);

    if (verifyResult.rows.length === 0) {
      console.error(`[Response Time Hourly] WARNING: Data was not found after insert for date ${metric.date}`);
    }

    return res.status(200).json({ success: true, metric, savedRow: verifyResult.rows[0] });
  } catch (error) {
    console.error("Cron job error:", error);
    return res.status(500).json({ error: error.message });
  }
}

// Optimized: Fetch conversations created today using Intercom API date filtering
// According to Intercom API docs, created_at supports > and < operators
async function fetchTeamConversationsCreatedToday(authHeader, startSeconds, endSeconds) {
  let all = [];
  let startingAfter = null;
  let pageCount = 0;
  const MAX_PAGES = 10; // Limit pages to avoid timeout

  while (pageCount < MAX_PAGES) {
    const body = {
      query: {
        operator: "AND",
        value: [
          {
            field: "team_assignee_id",
            operator: "=",
            value: "5480079"
          },
          {
            field: "created_at",
            operator: ">",
            value: startSeconds - 1 // Use > with startSeconds-1 to include startSeconds
          },
          {
            field: "created_at",
            operator: "<",
            value: endSeconds + 1 // Use < with endSeconds+1 to include endSeconds
          }
        ]
      },
      pagination: {
        per_page: 150,
        ...(startingAfter ? { starting_after: startingAfter } : {})
      }
    };

    const resp = await fetch(`${INTERCOM_BASE_URL}/conversations/search`, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Intercom-Version": "2.10"
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Intercom error ${resp.status}: ${text}`);
    }

    const data = await resp.json();
    const items = data.data || data.conversations || [];
    
    // Double-check date filtering client-side (API should filter, but verify)
    const filteredItems = items.filter(item => {
      const createdAt = item.created_at;
      return createdAt && createdAt >= startSeconds && createdAt <= endSeconds;
    });
    
    // Check if search results already have statistics (no need to fetch full details)
    // If statistics are missing, fetch full details only for those conversations
    const itemsNeedingDetails = filteredItems.filter(item => !item.statistics);
    const enrichedItems = [...filteredItems.filter(item => item.statistics)]; // Keep items with stats
    
    // Only fetch details for conversations missing statistics
    if (itemsNeedingDetails.length > 0) {
      const BATCH_SIZE = 10;
      for (let i = 0; i < itemsNeedingDetails.length; i += BATCH_SIZE) {
        const batch = itemsNeedingDetails.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (item) => {
          try {
            const convResp = await fetch(`${INTERCOM_BASE_URL}/conversations/${item.id}`, {
              headers: {
                "Authorization": authHeader,
                "Accept": "application/json",
                "Intercom-Version": "2.10"
              }
            });
            
            if (convResp.ok) {
              return await convResp.json();
            }
          } catch (err) {
            console.warn(`Failed to fetch details for conversation ${item.id}:`, err.message);
          }
          return item;
        });
        
        const batchResults = await Promise.all(batchPromises);
        enrichedItems.push(...batchResults);
        
        if (i + BATCH_SIZE < itemsNeedingDetails.length) {
          await new Promise(resolve => setTimeout(resolve, 50)); // Reduced delay
        }
      }
    }
    
    all = all.concat(enrichedItems);
    pageCount++;

    // Stop early if no results for today (API filtered them out)
    if (filteredItems.length === 0 && items.length > 0) {
      // If API returned items but none match today's date, we've likely gone past today
      const oldestItem = items.reduce((oldest, item) => {
        return (!oldest || (item.created_at && item.created_at < oldest.created_at)) ? item : oldest;
      }, null);
      if (oldestItem && oldestItem.created_at < startSeconds) {
        // All remaining pages will be older than today, so stop
        break;
      }
    }

    // If no items returned at all, we're done
    if (items.length === 0) {
      break;
    }

    const pages = data.pages || {};
    const next = pages.next;
    if (!next) break;
    startingAfter = typeof next === "string" ? next : next.starting_after;
  }

  return all;
}

