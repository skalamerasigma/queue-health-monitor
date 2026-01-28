#!/usr/bin/env node

/**
 * Backfill script for total_closed counts in response_time_metrics table
 * Updates existing records with the count of closed conversations for each day
 * 
 * Usage:
 *   INTERCOM_TOKEN=your_token node backfill-total-closed.mjs
 */

import fetch from "node-fetch";

const INTERCOM_BASE_URL = "https://api.intercom.io";

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
  
  let utcCandidate = new Date(Date.UTC(ptYear, ptMonth - 1, ptDay, ptHour + 8, ptMinute, ptSecond));
  
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

// Fast count of closed conversations for a time range
async function fetchClosedConversationsCount(authHeader, startSeconds, endSeconds) {
  let closedCount = 0;
  let startingAfter = null;
  let pageCount = 0;
  const MAX_PAGES = 10;

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
      console.error(`Intercom error ${resp.status}: ${text}`);
      return closedCount;
    }

    const data = await resp.json();
    const items = data.data || data.conversations || [];
    
    closedCount += items.length;
    
    if (items.length === 0) {
      break;
    }
    
    pageCount++;

    const pages = data.pages || {};
    const next = pages.next;
    if (!next) break;
    startingAfter = typeof next === "string" ? next : next.starting_after;
  }

  return closedCount;
}

// Update total_closed in database via API
async function updateTotalClosed(date, totalClosed) {
  const apiUrl = 'https://queue-health-monitor.vercel.app/api/response-time-metrics/save';
  
  try {
    // We'll use a minimal update - just send date and totalClosed
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        date,
        totalClosed,
        // These fields are required by the API but we'll set them to trigger an UPDATE only
        updateTotalClosedOnly: true
      })
    });
    
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`API error ${resp.status}: ${text}`);
    }
    
    return true;
  } catch (error) {
    console.error(`  Failed to update database: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  const INTERCOM_TOKEN = process.env.INTERCOM_TOKEN;
  if (!INTERCOM_TOKEN) {
    console.error("Error: INTERCOM_TOKEN environment variable is required");
    console.error("Usage: INTERCOM_TOKEN=your_token node backfill-total-closed.mjs");
    process.exit(1);
  }

  const authHeaderValue = INTERCOM_TOKEN.startsWith('Bearer ')
    ? INTERCOM_TOKEN
    : `Bearer ${INTERCOM_TOKEN}`;

  // Configure date range
  const START_DATE = '2026-01-14';
  const END_DATE = '2026-01-27';
  
  // Generate list of dates to process
  const datesToProcess = [];
  const startDateObj = new Date(START_DATE + 'T00:00:00Z');
  const endDateObj = new Date(END_DATE + 'T00:00:00Z');
  
  for (let d = new Date(startDateObj); d <= endDateObj; d.setUTCDate(d.getUTCDate() + 1)) {
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    datesToProcess.push(`${year}-${month}-${day}`);
  }
  
  console.log(`\nBackfilling total_closed for ${START_DATE} to ${END_DATE}`);
  console.log(`Total days to process: ${datesToProcess.length}\n`);
  
  const results = [];
  
  for (let i = 0; i < datesToProcess.length; i++) {
    const dateStr = datesToProcess[i];
    const [year, month, day] = dateStr.split('-').map(Number);
    
    // Convert 2 AM - 6 PM PT for this date to UTC timestamps
    const startUTC = ptTimeToUTC(year, month, day, 2, 0, 0);
    const endUTC = ptTimeToUTC(year, month, day, 18, 0, 0);
    
    const startSeconds = Math.floor(startUTC.getTime() / 1000);
    const endSeconds = Math.floor(endUTC.getTime() / 1000);
    
    console.log(`[${dateStr}] Counting closed conversations...`);
    
    try {
      const closedCount = await fetchClosedConversationsCount(authHeaderValue, startSeconds, endSeconds);
      
      // Update the database
      const updated = await updateTotalClosed(dateStr, closedCount);
      
      results.push({ date: dateStr, totalClosed: closedCount, updated });
      console.log(`[${dateStr}] ✓ ${closedCount} closed conversations ${updated ? '- UPDATED' : '- FAILED TO UPDATE'}`);
      
      // Small delay between days
      if (i < datesToProcess.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`[${dateStr}] ✗ Error:`, error.message);
      results.push({ date: dateStr, totalClosed: 0, updated: false, error: error.message });
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Summary:`);
  const successCount = results.filter(r => r.updated).length;
  const totalClosed = results.reduce((sum, r) => sum + r.totalClosed, 0);
  console.log(`  Days processed: ${results.length}`);
  console.log(`  Successfully updated: ${successCount}`);
  console.log(`  Total closed conversations: ${totalClosed}`);
  console.log(`  Average per day: ${Math.round(totalClosed / results.length)}`);
  console.log(`${'='.repeat(60)}`);
}

// Run the script
main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
