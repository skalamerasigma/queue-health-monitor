#!/usr/bin/env node

/**
 * Backfill script to populate total_closed for existing response_time_metrics records
 * 
 * Usage:
 *   node backfill-total-closed.mjs
 * 
 * Environment variables required:
 *   INTERCOM_TOKEN - Intercom API access token
 *   POSTGRES_URL or POSTGRES_URL_NON_POOLING - Database connection string
 */

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

// Helper: find UTC timestamp that represents a given PT time
function ptTimeToUTC(ptYear, ptMonth, ptDay, ptHour, ptMinute, ptSecond) {
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
  
  // Start with estimate: PT is UTC-8 (PST) or UTC-7 (PDT)
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
    
    const actualDate = new Date(Date.UTC(actualYear, actualMonth - 1, actualDay, actualHour, actualMinute, 0));
    const targetDate = new Date(Date.UTC(ptYear, ptMonth - 1, ptDay, ptHour, ptMinute, 0));
    const diffMs = targetDate.getTime() - actualDate.getTime();
    utcCandidate = new Date(utcCandidate.getTime() - diffMs);
  }
  
  return utcCandidate;
}

// Fetch count of conversations closed during the specified time range
async function fetchClosedConversationsCount(authHeader, startSeconds, endSeconds) {
  let closedCount = 0;
  let startingAfter = null;
  let pageCount = 0;
  const MAX_PAGES = 15;

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
            field: "state",
            operator: "=",
            value: "closed"
          },
          {
            field: "updated_at",
            operator: ">",
            value: startSeconds - (7 * 24 * 60 * 60)
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
      return 0;
    }

    const data = await resp.json();
    const items = data.data || data.conversations || [];
    
    if (items.length === 0) {
      break;
    }

    // Fetch full conversation details to check statistics.last_close_at
    const BATCH_SIZE = 20;
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
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
            const lastCloseAt = fullConv.statistics?.last_close_at;
            
            if (lastCloseAt && lastCloseAt >= startSeconds && lastCloseAt <= endSeconds) {
              return 1;
            }
          }
        } catch (err) {
          console.warn(`Failed to fetch details for conversation ${item.id}:`, err.message);
        }
        return 0;
      });
      
      const batchResults = await Promise.all(batchPromises);
      closedCount += batchResults.reduce((sum, val) => sum + val, 0);
      
      if (i + BATCH_SIZE < items.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    pageCount++;

    const pages = data.pages || {};
    const next = pages.next;
    if (!next) break;
    startingAfter = typeof next === "string" ? next : next.starting_after;
  }

  return closedCount;
}

// Calculate closed count for a single day
async function calculateClosedForDay(authHeader, dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Convert 2 AM - 6 PM PT for this date to UTC timestamps
  const startUTC = ptTimeToUTC(year, month, day, 2, 0, 0);
  const endUTC = ptTimeToUTC(year, month, day, 18, 0, 0);
  
  const startSeconds = Math.floor(startUTC.getTime() / 1000);
  const endSeconds = Math.floor(endUTC.getTime() / 1000);
  
  console.log(`  Fetching closed conversations for ${dateStr}...`);
  console.log(`    Time range: ${startUTC.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', hour12: false })} PT to ${endUTC.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', hour12: false })} PT`);

  const closedCount = await fetchClosedConversationsCount(authHeader, startSeconds, endSeconds);
  
  return closedCount;
}

// Main function
async function main() {
  const INTERCOM_TOKEN = process.env.INTERCOM_TOKEN;
  if (!INTERCOM_TOKEN) {
    console.error("Error: INTERCOM_TOKEN environment variable is required");
    console.error("Usage: INTERCOM_TOKEN=your_token POSTGRES_URL=your_db_url node backfill-total-closed.mjs");
    process.exit(1);
  }

  const authHeaderValue = INTERCOM_TOKEN.startsWith('Bearer ')
    ? INTERCOM_TOKEN
    : `Bearer ${INTERCOM_TOKEN}`;

  console.log("Connecting to database...");
  const db = getPool();
  
  // Add total_closed column if it doesn't exist
  try {
    await db.query(`
      ALTER TABLE response_time_metrics 
      ADD COLUMN IF NOT EXISTS total_closed INTEGER DEFAULT 0;
    `);
    console.log("✓ Ensured total_closed column exists");
  } catch (err) {
    console.error("Error adding total_closed column:", err.message);
  }

  // Get all existing dates from the response_time_metrics table
  const result = await db.query(`
    SELECT date, total_closed
    FROM response_time_metrics
    ORDER BY date DESC
  `);
  
  const existingDates = result.rows;
  console.log(`\nFound ${existingDates.length} existing records to backfill\n`);
  
  if (existingDates.length === 0) {
    console.log("No records to backfill. Exiting.");
    await pool.end();
    return;
  }

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const row of existingDates) {
    const dateStr = row.date;
    const currentTotalClosed = parseInt(row.total_closed) || 0;
    
    // Skip if already has a non-zero total_closed value
    if (currentTotalClosed > 0) {
      console.log(`[${dateStr}] Skipping - already has total_closed: ${currentTotalClosed}`);
      skippedCount++;
      continue;
    }
    
    try {
      console.log(`[${dateStr}] Processing...`);
      const closedCount = await calculateClosedForDay(authHeaderValue, dateStr);
      
      // Update the database record
      await db.query(`
        UPDATE response_time_metrics
        SET total_closed = $1
        WHERE date = $2
      `, [closedCount, dateStr]);
      
      console.log(`[${dateStr}] ✓ Updated total_closed: ${closedCount}`);
      updatedCount++;
      
      // Add delay between dates to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`[${dateStr}] ✗ Error:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n========================================`);
  console.log(`Backfill Complete!`);
  console.log(`========================================`);
  console.log(`  Records updated: ${updatedCount}`);
  console.log(`  Records skipped: ${skippedCount}`);
  console.log(`  Errors: ${errorCount}`);
  console.log(`========================================\n`);

  await pool.end();
}

// Run the script
main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
