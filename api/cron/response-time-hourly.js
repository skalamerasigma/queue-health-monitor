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

    // Track start time for timeout management
    const cronStartTime = Date.now();
    const MAX_CRON_TIME_MS = 240000; // 240 seconds (leave 60s buffer from 300s limit)
    
    // Helper to check remaining time
    const getRemainingTime = () => MAX_CRON_TIME_MS - (Date.now() - cronStartTime);
    
    // Fetch only conversations created today (optimized query)
    const conversationsToday = await fetchTeamConversationsCreatedToday(authHeaderValue, todayStartSeconds, todayEndSeconds);
    
    console.log(`[Response Time Hourly] Found ${conversationsToday.length} conversations created during ${dateStr} (${Math.round((Date.now() - cronStartTime) / 1000)}s elapsed)`);

    // Fetch conversations closed during the day (for Total Closed metric)
    // Use remaining time as timeout (but cap at 60s to leave time for DB operations)
    const closedCountTimeout = Math.min(getRemainingTime() - 30000, 60000);
    let closedConversationsCount = 0;
    
    if (closedCountTimeout > 10000) {
      closedConversationsCount = await fetchClosedConversationsCount(authHeaderValue, todayStartSeconds, todayEndSeconds, closedCountTimeout);
      console.log(`[Response Time Hourly] Found ${closedConversationsCount} conversations closed during ${dateStr} (${Math.round((Date.now() - cronStartTime) / 1000)}s elapsed)`);
    } else {
      console.log(`[Response Time Hourly] Skipping closed count - not enough time remaining (${Math.round(getRemainingTime() / 1000)}s left)`);
    }

    // Calculate metrics: count conversations with 5+ and 10+ minute wait times
    // Also store conversation IDs for those with 5+ and 10+ minute wait times
    const FIVE_MINUTES_SECONDS = 300;
    const TEN_MINUTES_SECONDS = 600;
    let count5PlusMin = 0;
    let count10PlusMin = 0;
    let totalWithResponse = 0;
    const conversations5PlusMin = []; // Store conversation IDs with 5+ minute wait times
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
        
        if (waitTimeSeconds >= FIVE_MINUTES_SECONDS) {
          count5PlusMin++;
          // Store conversation ID and wait time for display in expandable table
          if (conv.id) {
            conversations5PlusMin.push({
              id: conv.id,
              waitTimeSeconds: waitTimeSeconds,
              waitTimeMinutes: Math.round(waitTimeSeconds / 60 * 100) / 100,
              createdAt: createdAt || null,
              firstAdminReplyAt: firstAdminReplyAt || null,
              adminAssigneeId: conv.admin_assignee?.id || null,
              adminAssigneeName: conv.admin_assignee?.name || null
            });
          }
        }
        
        if (waitTimeSeconds >= TEN_MINUTES_SECONDS) {
          count10PlusMin++;
          // Store conversation ID and wait time for display in expandable table
          if (conv.id) {
            conversations10PlusMin.push({
              id: conv.id,
              waitTimeSeconds: waitTimeSeconds,
              waitTimeMinutes: Math.round(waitTimeSeconds / 60 * 100) / 100,
              createdAt: createdAt || null,
              firstAdminReplyAt: firstAdminReplyAt || null,
              adminAssigneeId: conv.admin_assignee?.id || null,
              adminAssigneeName: conv.admin_assignee?.name || null
            });
          }
        }
      }
    });

    const percentage5PlusMin = totalWithResponse > 0 
      ? (count5PlusMin / totalWithResponse) * 100 
      : 0;
    
    const percentage10PlusMin = totalWithResponse > 0 
      ? (count10PlusMin / totalWithResponse) * 100 
      : 0;

    // Calculate count for 5-10 minute range (subset of 5+ min)
    const count5to10Min = count5PlusMin - count10PlusMin;
    
    // Calculate percentage for 5-10 minute range (out of total with response)
    const percentage5to10Min = totalWithResponse > 0 
      ? (count5to10Min / totalWithResponse) * 100 
      : 0;

    // Create metric record - use the UTC date we calculated
    const date = dateStr; // Format: YYYY-MM-DD (UTC date, one entry per day)

    const metric = {
      timestamp: now.toISOString(),
      date,
      count5PlusMin,
      count5to10Min,
      count10PlusMin,
      totalConversations: conversationsToday.length, // Only count conversations created today
      totalClosed: closedConversationsCount, // Count of conversations closed during the day
      totalWithResponse,
      percentage5PlusMin: Math.round(percentage5PlusMin * 100) / 100,
      percentage5to10Min: Math.round(percentage5to10Min * 100) / 100,
      percentage10PlusMin: Math.round(percentage10PlusMin * 100) / 100,
      conversationIds5PlusMin: conversations5PlusMin, // Store IDs for expandable table
      conversationIds10PlusMin: conversations10PlusMin // Store IDs for expandable table
    };

    // Save to database
    const db = getPool();
    
    // Create table if it doesn't exist (this is fast and safe to run every time)
    await db.query(`
      CREATE TABLE IF NOT EXISTS response_time_metrics (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL,
        date VARCHAR(10) NOT NULL,
        count_5_plus_min INTEGER NOT NULL DEFAULT 0,
        count_5_to_10_min INTEGER NOT NULL DEFAULT 0,
        count_10_plus_min INTEGER NOT NULL,
        total_conversations INTEGER NOT NULL,
        total_closed INTEGER NOT NULL DEFAULT 0,
        percentage_5_plus_min DECIMAL(5,2) NOT NULL DEFAULT 0,
        percentage_5_to_10_min DECIMAL(5,2) NOT NULL DEFAULT 0,
        percentage_10_plus_min DECIMAL(5,2) NOT NULL,
        conversation_ids_5_plus_min JSONB,
        conversation_ids_10_plus_min JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(date)
      );
    `);
    
    // Skip expensive migrations - these have already been run
    // Migrations are now only run on manual trigger (not scheduled cron)
    // This significantly speeds up the scheduled cron job
    console.log(`[Response Time Hourly] Skipping migrations (${Math.round((Date.now() - cronStartTime) / 1000)}s elapsed)`);

    console.log(`[Response Time Hourly] Saving metric for date: ${metric.date}`, {
      timestamp: metric.timestamp,
      count5PlusMin: metric.count5PlusMin,
      count5to10Min: metric.count5to10Min,
      count10PlusMin: metric.count10PlusMin,
      totalConversations: metric.totalConversations,
      totalClosed: metric.totalClosed,
      percentage5PlusMin: metric.percentage5PlusMin,
      percentage5to10Min: metric.percentage5to10Min,
      percentage10PlusMin: metric.percentage10PlusMin,
      conversationIds5PlusMinCount: metric.conversationIds5PlusMin?.length || 0,
      conversationIds10PlusMinCount: metric.conversationIds10PlusMin?.length || 0
    });

    const insertResult = await db.query(`
      INSERT INTO response_time_metrics (timestamp, date, count_5_plus_min, count_5_to_10_min, count_10_plus_min, total_conversations, total_closed, percentage_5_plus_min, percentage_5_to_10_min, percentage_10_plus_min, conversation_ids_5_plus_min, conversation_ids_10_plus_min)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (date) 
      DO UPDATE SET 
        timestamp = EXCLUDED.timestamp,
        count_5_plus_min = EXCLUDED.count_5_plus_min,
        count_5_to_10_min = EXCLUDED.count_5_to_10_min,
        count_10_plus_min = EXCLUDED.count_10_plus_min,
        total_conversations = EXCLUDED.total_conversations,
        total_closed = EXCLUDED.total_closed,
        percentage_5_plus_min = EXCLUDED.percentage_5_plus_min,
        percentage_5_to_10_min = EXCLUDED.percentage_5_to_10_min,
        percentage_10_plus_min = EXCLUDED.percentage_10_plus_min,
        conversation_ids_5_plus_min = EXCLUDED.conversation_ids_5_plus_min,
        conversation_ids_10_plus_min = EXCLUDED.conversation_ids_10_plus_min,
        created_at = NOW()
      RETURNING id, date, timestamp;
    `, [
      metric.timestamp,
      metric.date,
      metric.count5PlusMin,
      metric.count5to10Min,
      metric.count10PlusMin,
      metric.totalConversations,
      metric.totalClosed,
      metric.percentage5PlusMin,
      metric.percentage5to10Min,
      metric.percentage10PlusMin,
      JSON.stringify(metric.conversationIds5PlusMin || []),
      JSON.stringify(metric.conversationIds10PlusMin || [])
    ]);

    console.log(`[Response Time Hourly] Database insert successful:`, insertResult.rows[0]);

    // Verify the data was actually saved
    const verifyResult = await db.query(`
      SELECT id, date, timestamp, count_5_plus_min, count_5_to_10_min, count_10_plus_min, total_conversations, total_closed, percentage_5_plus_min, percentage_5_to_10_min, percentage_10_plus_min, conversation_ids_5_plus_min, conversation_ids_10_plus_min
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
    // Also fetch details if admin_assignee is missing or incomplete
    const itemsNeedingDetails = filteredItems.filter(item => 
      !item.statistics || 
      !item.admin_assignee || 
      (item.admin_assignee_id && (!item.admin_assignee.name))
    );
    const enrichedItems = filteredItems.filter(item => 
      item.statistics && 
      item.admin_assignee && 
      (!item.admin_assignee_id || item.admin_assignee.name)
    ); // Keep items with stats and complete admin_assignee
    
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
              const fullConv = await convResp.json();
              
              // Enrich admin_assignee if we have admin_assignee_id but no admin_assignee object with name
              if (fullConv.admin_assignee_id && (!fullConv.admin_assignee || !fullConv.admin_assignee.name)) {
                try {
                  const adminResp = await fetch(`${INTERCOM_BASE_URL}/admins/${fullConv.admin_assignee_id}`, {
                    headers: {
                      "Authorization": authHeader,
                      "Accept": "application/json",
                      "Intercom-Version": "2.10"
                    }
                  });
                  if (adminResp.ok) {
                    const adminData = await adminResp.json();
                    fullConv.admin_assignee = adminData;
                  }
                } catch (err) {
                  console.warn(`Failed to fetch admin ${fullConv.admin_assignee_id} for conversation ${item.id}:`, err.message);
                }
              }
              
              return fullConv;
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

// Fetch count of conversations closed during the specified time range
// FAST APPROACH: Count closed conversations with updated_at in our time range
// This is a good approximation - if a conversation is closed and was updated during our window,
// it was almost certainly closed during that window
async function fetchClosedConversationsCount(authHeader, startSeconds, endSeconds, timeoutMs = 60000) {
  const startTime = Date.now();
  let closedCount = 0;
  let startingAfter = null;
  let pageCount = 0;
  const MAX_PAGES = 10; // Allow enough pages to get all ~300 conversations

  console.log(`[Closed Count] Starting fast count with timeout of ${timeoutMs}ms`);

  while (pageCount < MAX_PAGES) {
    // Check timeout
    if (Date.now() - startTime > timeoutMs) {
      console.log(`[Closed Count] Timeout reached after ${(Date.now() - startTime) / 1000}s, returning count: ${closedCount}`);
      return closedCount;
    }

    // Query for closed conversations updated within the target time window
    // This is a fast query that doesn't require fetching individual conversations
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
            field: "state",
            operator: "=",
            value: "closed"
          },
          {
            field: "updated_at",
            operator: ">",
            value: startSeconds - 1
          },
          {
            field: "updated_at",
            operator: "<",
            value: endSeconds + 1
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
      console.error(`Intercom error ${resp.status} fetching closed conversations: ${text}`);
      return closedCount;
    }

    const data = await resp.json();
    const items = data.data || data.conversations || [];
    
    // Simply count all items returned - they're all closed and updated in our time window
    // This is a good approximation for "closed during this time window"
    closedCount += items.length;
    
    console.log(`[Closed Count] Page ${pageCount + 1}: ${items.length} conversations (running total: ${closedCount})`);
    
    if (items.length === 0) {
      break;
    }
    
    pageCount++;

    const pages = data.pages || {};
    const next = pages.next;
    if (!next) break;
    startingAfter = typeof next === "string" ? next : next.starting_after;
  }

  console.log(`[Closed Count] Completed in ${Math.round((Date.now() - startTime) / 1000)}s: ${closedCount} closed conversations`);
  return closedCount;
}

