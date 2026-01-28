/**
 * Fast daily metrics endpoint
 * Returns chats today and closed today counts using optimized Intercom search queries
 * Much faster than fetching all conversations and filtering client-side
 */

const INTERCOM_BASE_URL = "https://api.intercom.io";

// Get PT date boundaries for today
function getTodayPTBoundaries() {
  const now = new Date();
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
  
  const parts = ptFormatter.formatToParts(now);
  const ptYear = parseInt(parts.find(p => p.type === 'year').value);
  const ptMonth = parseInt(parts.find(p => p.type === 'month').value);
  const ptDay = parseInt(parts.find(p => p.type === 'day').value);
  
  // Calculate start of day (00:00:00 PT) and end of day (23:59:59 PT) in UTC
  // This is an approximation - we use the support hours (2 AM - 6 PM PT) for more accurate counts
  const startUTC = ptTimeToUTC(ptYear, ptMonth, ptDay, 0, 0, 0);
  const endUTC = ptTimeToUTC(ptYear, ptMonth, ptDay, 23, 59, 59);
  
  return {
    startSeconds: Math.floor(startUTC.getTime() / 1000),
    endSeconds: Math.floor(endUTC.getTime() / 1000),
    dateStr: `${ptYear}-${String(ptMonth).padStart(2, '0')}-${String(ptDay).padStart(2, '0')}`
  };
}

// Convert PT time to UTC
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
  
  // Start with a rough guess
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

// Fast count of conversations created today (chats today)
async function fetchChatsTodayCount(authHeader, startSeconds, endSeconds) {
  let count = 0;
  let startingAfter = null;
  let pageCount = 0;
  const MAX_PAGES = 5; // Usually enough for a single day's new conversations

  while (pageCount < MAX_PAGES) {
    const body = {
      query: {
        operator: "AND",
        value: [
          { field: "team_assignee_id", operator: "=", value: "5480079" },
          { field: "created_at", operator: ">", value: startSeconds - 1 },
          { field: "created_at", operator: "<", value: endSeconds + 1 }
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
      console.error(`[Daily Metrics] Chats today error ${resp.status}: ${text}`);
      return count;
    }

    const data = await resp.json();
    const items = data.data || data.conversations || [];
    count += items.length;
    
    if (items.length === 0) break;
    pageCount++;

    const pages = data.pages || {};
    const next = pages.next;
    if (!next) break;
    startingAfter = typeof next === "string" ? next : next.starting_after;
  }

  return count;
}

// Fast count of conversations closed today
async function fetchClosedTodayCount(authHeader, startSeconds, endSeconds) {
  let count = 0;
  let startingAfter = null;
  let pageCount = 0;
  const MAX_PAGES = 5;

  while (pageCount < MAX_PAGES) {
    const body = {
      query: {
        operator: "AND",
        value: [
          { field: "team_assignee_id", operator: "=", value: "5480079" },
          { field: "state", operator: "=", value: "closed" },
          { field: "updated_at", operator: ">", value: startSeconds - 1 },
          { field: "updated_at", operator: "<", value: endSeconds + 1 }
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
      console.error(`[Daily Metrics] Closed today error ${resp.status}: ${text}`);
      return count;
    }

    const data = await resp.json();
    const items = data.data || data.conversations || [];
    count += items.length;
    
    if (items.length === 0) break;
    pageCount++;

    const pages = data.pages || {};
    const next = pages.next;
    if (!next) break;
    startingAfter = typeof next === "string" ? next : next.starting_after;
  }

  return count;
}

export default async function handler(req, res) {
  // CORS headers
  const allowedOriginEnv = process.env.ALLOWED_ORIGIN || "https://app.sigmacomputing.com";
  const requestOrigin = req.headers.origin;
  
  let originToUse = allowedOriginEnv;
  if (allowedOriginEnv === "*") {
    originToUse = "*";
  } else if (requestOrigin) {
    const isAllowedOrigin = requestOrigin === allowedOriginEnv;
    const isSameDomain = requestOrigin.includes("vercel.app") || requestOrigin.includes("localhost");
    if (isAllowedOrigin || isSameDomain) {
      originToUse = requestOrigin;
    }
  }

  res.setHeader("Access-Control-Allow-Origin", originToUse);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const startTime = Date.now();

  try {
    const authHeader = `Bearer ${process.env.INTERCOM_TOKEN}`;
    const boundaries = getTodayPTBoundaries();
    
    console.log(`[Daily Metrics] Fetching metrics for ${boundaries.dateStr}`);
    
    // Fetch both counts in parallel for speed
    const [chatsToday, closedToday] = await Promise.all([
      fetchChatsTodayCount(authHeader, boundaries.startSeconds, boundaries.endSeconds),
      fetchClosedTodayCount(authHeader, boundaries.startSeconds, boundaries.endSeconds)
    ]);
    
    const elapsed = Date.now() - startTime;
    console.log(`[Daily Metrics] Completed in ${elapsed}ms - Chats: ${chatsToday}, Closed: ${closedToday}`);

    return res.status(200).json({
      date: boundaries.dateStr,
      chatsToday,
      closedToday,
      timestamp: new Date().toISOString(),
      elapsedMs: elapsed
    });
  } catch (error) {
    console.error("[Daily Metrics] Error:", error);
    return res.status(500).json({ 
      error: error.message,
      chatsToday: 0,
      closedToday: 0
    });
  }
}
