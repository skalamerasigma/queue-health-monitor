#!/usr/bin/env node

/**
 * Standalone script to calculate response time metrics for the previous 10 UTC days
 * Outputs results to CSV file
 * 
 * Usage:
 *   node backfill-response-time.js
 * 
 * Environment variables required:
 *   INTERCOM_TOKEN - Intercom API access token
 */

import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const INTERCOM_BASE_URL = "https://api.intercom.io";
const FIVE_MINUTES_SECONDS = 300;
const TEN_MINUTES_SECONDS = 600;

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

// Fetch conversations created in a specific time range
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

// Calculate metrics for a single day
async function calculateMetricsForDay(authHeader, dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Convert 2 AM - 6 PM PT for this date to UTC timestamps
  const startUTC = ptTimeToUTC(year, month, day, 2, 0, 0);
  const endUTC = ptTimeToUTC(year, month, day, 18, 0, 0);
  
  const startSeconds = Math.floor(startUTC.getTime() / 1000);
  const endSeconds = Math.floor(endUTC.getTime() / 1000);
  
  console.log(`\n[${dateStr}] Fetching conversations...`);
  console.log(`  Start UTC: ${startUTC.toISOString()} (${startSeconds})`);
  console.log(`  End UTC: ${endUTC.toISOString()} (${endSeconds})`);
  console.log(`  Start PT: ${startUTC.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', hour12: false })}`);
  console.log(`  End PT: ${endUTC.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', hour12: false })}`);

  // Fetch conversations created in this time range
  const conversationsToday = await fetchTeamConversationsCreatedToday(authHeader, startSeconds, endSeconds);
  
  console.log(`[${dateStr}] Found ${conversationsToday.length} conversations`);

  // Calculate metrics: count conversations with 5+ and 10+ minute wait times
  // Also store conversation IDs for those with 5+ and 10+ minute wait times
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
        // Store conversation ID and wait time
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
        // Store conversation ID and wait time
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

  return {
    timestamp: new Date().toISOString(),
    totalConversations: conversationsToday.length,
    date: dateStr,
    conversationIds10PlusMin: conversations10PlusMin,
    count10PlusMin,
    percentage10PlusMin: Math.round(percentage10PlusMin * 100) / 100,
    count5PlusMin,
    percentage5PlusMin: Math.round(percentage5PlusMin * 100) / 100,
    conversationIds5PlusMin: conversations5PlusMin,
    count5to10Min,
    percentage5to10Min: Math.round(percentage5to10Min * 100) / 100
  };
}

// Save metric to database via API
async function saveMetricToDatabase(metric) {
  const apiUrl = 'https://queue-health-monitor.vercel.app/api/response-time-metrics/save';
  
  try {
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metric)
    });
    
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`API error ${resp.status}: ${text}`);
    }
    
    return await resp.json();
  } catch (error) {
    console.error(`  Failed to save to database: ${error.message}`);
    return null;
  }
}

// Main function
async function main() {
  const INTERCOM_TOKEN = process.env.INTERCOM_TOKEN;
  if (!INTERCOM_TOKEN) {
    console.error("Error: INTERCOM_TOKEN environment variable is required");
    console.error("Usage: INTERCOM_TOKEN=your_token node backfill-response-time.mjs");
    process.exit(1);
  }

  const authHeaderValue = INTERCOM_TOKEN.startsWith('Bearer ')
    ? INTERCOM_TOKEN
    : `Bearer ${INTERCOM_TOKEN}`;

  const results = [];

  // Configure date range - backfill from START_DATE to yesterday
  const START_DATE = '2026-01-14';
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  yesterday.setUTCHours(0, 0, 0, 0);
  
  const endDate = `${yesterday.getUTCFullYear()}-${String(yesterday.getUTCMonth() + 1).padStart(2, '0')}-${String(yesterday.getUTCDate()).padStart(2, '0')}`;
  
  // Generate list of dates to process
  const datesToProcess = [];
  const startDateObj = new Date(START_DATE + 'T00:00:00Z');
  const endDateObj = new Date(endDate + 'T00:00:00Z');
  
  for (let d = new Date(startDateObj); d <= endDateObj; d.setUTCDate(d.getUTCDate() + 1)) {
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    datesToProcess.push(`${year}-${month}-${day}`);
  }
  
  console.log(`\nBackfilling response time metrics from ${START_DATE} to ${endDate}`);
  console.log(`Total days to process: ${datesToProcess.length}\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < datesToProcess.length; i++) {
    const dateStr = datesToProcess[i];
    
    try {
      const metric = await calculateMetricsForDay(authHeaderValue, dateStr);
      
      // Add totalClosed as 0 for historical data (can't easily backfill this)
      metric.totalClosed = 0;
      
      // Save to database
      const saveResult = await saveMetricToDatabase(metric);
      
      results.push(metric);
      successCount++;
      console.log(`[${dateStr}] ✓ Completed: ${metric.totalConversations} conversations, ${metric.count5PlusMin} with 5+ min wait (${metric.count5to10Min} waited 5-10 min, ${metric.count10PlusMin} waited 10+ min) ${saveResult ? '- SAVED' : '- CSV ONLY'}`);
      
      // Add a delay between days to avoid rate limiting
      if (i < datesToProcess.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`[${dateStr}] ✗ Error:`, error.message);
      errorCount++;
      // Continue with next day even if one fails
    }
  }

  // Sort results by date (oldest first)
  results.sort((a, b) => a.date.localeCompare(b.date));

  // Helper function to escape CSV values (especially JSON columns)
  const escapeCSV = (value) => {
    if (value === null || value === undefined) {
      return '';
    }
    const stringValue = String(value);
    // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // Generate CSV - columns match Supabase table exactly (excluding id and created_at)
  const csvRows = [
    // Header - matches table column order
    ['timestamp', 'total_conversations', 'date', 'conversation_ids_10_plus_min', 'count_10_plus_min', 'percentage_10_plus_min', 'count_5_plus_min', 'percentage_5_plus_min', 'conversation_ids_5_plus_min', 'count_5_to_10_min', 'percentage_5_to_10_min'].join(',')
  ];

  results.forEach(metric => {
    csvRows.push([
      escapeCSV(metric.timestamp),
      metric.totalConversations,
      escapeCSV(metric.date),
      escapeCSV(JSON.stringify(metric.conversationIds10PlusMin || [])),
      metric.count10PlusMin,
      metric.percentage10PlusMin,
      metric.count5PlusMin,
      metric.percentage5PlusMin,
      escapeCSV(JSON.stringify(metric.conversationIds5PlusMin || [])),
      metric.count5to10Min,
      metric.percentage5to10Min
    ].join(','));
  });

  const csvContent = csvRows.join('\n');

  // Write to file
  const outputFile = `response-time-metrics-${new Date().toISOString().split('T')[0]}.csv`;
  fs.writeFileSync(outputFile, csvContent, 'utf8');

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✓ Successfully processed ${successCount} days, ${errorCount} errors`);
  console.log(`✓ CSV file written: ${outputFile}`);
  console.log(`\nSummary:`);
  const totalConversations = results.reduce((sum, r) => sum + r.totalConversations, 0);
  const total5PlusMin = results.reduce((sum, r) => sum + r.count5PlusMin, 0);
  const total10PlusMin = results.reduce((sum, r) => sum + r.count10PlusMin, 0);
  const total5to10Min = results.reduce((sum, r) => sum + r.count5to10Min, 0);
  console.log(`  Total days processed: ${results.length}`);
  console.log(`  Total conversations: ${totalConversations}`);
  console.log(`  Total 5+ min waits: ${total5PlusMin} (${total5to10Min} waited 5-10 min, ${total10PlusMin} waited 10+ min)`);
  console.log(`${'='.repeat(60)}`);
}

// Run the script
main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
