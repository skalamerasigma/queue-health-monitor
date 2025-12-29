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

    // Get today's date range (start and end of day in UTC)
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
    const todayStartSeconds = Math.floor(todayStart.getTime() / 1000);
    const todayEndSeconds = Math.floor(todayEnd.getTime() / 1000);

    // Fetch only conversations created today (optimized query)
    const conversationsToday = await fetchTeamConversationsCreatedToday(authHeaderValue, todayStartSeconds, todayEndSeconds);

    // Calculate metrics: count conversations with 10+ minute wait time
    const TEN_MINUTES_SECONDS = 600;
    let count10PlusMin = 0;
    let totalWithResponse = 0;

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
        }
      }
    });

    const percentage10PlusMin = totalWithResponse > 0 
      ? (count10PlusMin / totalWithResponse) * 100 
      : 0;

    // Create metric record
    const date = now.toISOString().slice(0, 10); // Format: YYYY-MM-DD (one entry per day)

    const metric = {
      timestamp: now.toISOString(),
      date,
      count10PlusMin,
      totalConversations: conversationsToday.length, // Only count conversations created today
      totalWithResponse,
      percentage10PlusMin: Math.round(percentage10PlusMin * 100) / 100
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
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(date)
      );
    `);

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

    await db.query(`
      INSERT INTO response_time_metrics (timestamp, date, count_10_plus_min, total_conversations, percentage_10_plus_min)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (date) 
      DO UPDATE SET 
        timestamp = EXCLUDED.timestamp,
        count_10_plus_min = EXCLUDED.count_10_plus_min,
        total_conversations = EXCLUDED.total_conversations,
        percentage_10_plus_min = EXCLUDED.percentage_10_plus_min,
        created_at = NOW();
    `, [
      metric.timestamp,
      metric.date,
      metric.count10PlusMin,
      metric.totalConversations,
      metric.percentage10PlusMin
    ]);

    return res.status(200).json({ success: true, metric });
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

