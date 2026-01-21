import fetch from "node-fetch";

const INTERCOM_TOKEN = process.env.INTERCOM_TOKEN;
const INTERCOM_BASE_URL = "https://api.intercom.io";
const MAX_PAGES = 100; // safety guard

if (!INTERCOM_TOKEN) {
  throw new Error("INTERCOM_TOKEN env var is required");
}

/**
 * Fetch all team members for team 5480079
 */
async function fetchTeamMembers(authHeader) {
  try {
    const teamResp = await fetch(
      `${INTERCOM_BASE_URL}/teams/5480079`,
      {
        headers: {
          "Authorization": authHeader,
          "Accept": "application/json",
          "Intercom-Version": "2.10"
        }
      }
    );
    
    if (teamResp.ok) {
      const teamData = await teamResp.json();
      // Team members are typically in team.admin_ids or team.admins
      const adminIds = teamData.admin_ids || [];
      const admins = [];
      
      // Fetch admin details for each admin ID
      for (const adminId of adminIds) {
        try {
          const adminResp = await fetch(
            `${INTERCOM_BASE_URL}/admins/${adminId}`,
            {
              headers: {
                "Authorization": authHeader,
                "Accept": "application/json",
                "Intercom-Version": "2.10"
              }
            }
          );
          if (adminResp.ok) {
            const admin = await adminResp.json();
            admins.push(admin);
          }
        } catch (err) {
          console.warn(`Failed to fetch admin ${adminId}:`, err.message);
        }
      }
      
      return admins;
    }
  } catch (err) {
    console.warn("Failed to fetch team members:", err.message);
  }
  return [];
}

/**
 * Fetch all open conversations assigned to team 5480079
 * Also fetches closed conversations closed today
 * using Intercom's /conversations/search endpoint and pagination.
 */
async function fetchAllOpenTeamConversations(authHeader, options = {}) {
  let all = [];
  let startingAfter = null;
  let pageCount = 0;
  const includeDebug = options.includeDebug === true;
  const debug = {
    timestamps: {},
    openSnoozed: { fetched: 0, enriched: 0, pages: 0 },
    closedSearch: {
      pages: 0,
      found: 0,
      enriched: 0,
      included: 0,
      skipped: { noClosedAt: 0, outOfRange: 0, wrongTeam: 0, notClosed: 0 },
      sampleSearchIds: [],
      sampleIncludedIds: []
    }
  };

  // Calculate today's start and end in seconds (UTC) for closed conversations
  // Start at 12:00 AM UTC (midnight), end at 11:59:59 PM UTC (end of day)
  const now = Date.now();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);
  const todayStartSeconds = Math.floor(todayStart.getTime() / 1000);
  const todayEndSeconds = Math.floor(todayEnd.getTime() / 1000);
  
  // Calculate 24 hours ago timestamp (for updated_at filter on closed conversations)
  // This ensures we catch conversations closed today even if created earlier
  const yesterday = new Date(now - (24 * 60 * 60 * 1000));
  const last24HoursTimestamp = Math.floor(yesterday.getTime() / 1000);
  
  debug.timestamps = {
    todayStartSeconds,
    todayEndSeconds,
    last24HoursTimestamp,
    todayStartIso: new Date(todayStartSeconds * 1000).toISOString(),
    todayEndIso: new Date(todayEndSeconds * 1000).toISOString(),
    last24HoursIso: new Date(last24HoursTimestamp * 1000).toISOString()
  };
  console.log(`[API] Today UTC range: ${debug.timestamps.todayStartIso} to ${debug.timestamps.todayEndIso}`);
  console.log(`[API] Today UTC timestamps: ${todayStartSeconds} to ${todayEndSeconds}`);
  console.log(`[API] Last 24 hours timestamp (for created_at filter): ${last24HoursTimestamp} (${debug.timestamps.last24HoursIso})`);

  console.log(`[API] Fetching conversations: open, snoozed, and closed today (${todayStartSeconds} to ${todayEndSeconds})`);

  // First, fetch open and snoozed conversations
  while (true) {
    const body = {
      query: {
        operator: "AND",
        value: [
          {
            field: "state",
            operator: "IN",
            value: ["open", "snoozed"]
          },
          {
            field: "team_assignee_id",
            operator: "=",
            value: "5480079"
          }
        ]
      },
      pagination: {
        per_page: 150,
        ...(startingAfter ? { starting_after: startingAfter } : {})
      }
    };

    const resp = await fetch(
      `${INTERCOM_BASE_URL}/conversations/search`,
      {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Intercom-Version": "2.10" // Specify API version
        },
        body: JSON.stringify(body)
      }
    );

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Intercom error ${resp.status}: ${text}`);
    }

    const data = await resp.json();

    // Intercom search responses typically use `data` for items.
    const items = data.data || data.conversations || [];
    
    // Batch fetch full conversation details to avoid rate limits
    // Process in smaller batches with delays
    const BATCH_SIZE = 10;
    const enrichedItems = [];
    
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (item) => {
        try {
          // Fetch full conversation details for tags and assignment info
          const convResp = await fetch(
            `${INTERCOM_BASE_URL}/conversations/${item.id}`,
            {
              headers: {
                "Authorization": authHeader,
                "Accept": "application/json",
                "Intercom-Version": "2.10"
              }
            }
          );
          
          if (convResp.ok) {
            const fullConv = await convResp.json();
            
            // Use admin_assignee from search result if available, otherwise from full conversation
            let adminAssignee = item.admin_assignee || fullConv.admin_assignee;
            let adminAssigneeId = item.admin_assignee_id || fullConv.admin_assignee_id;
            
            // Fallback: For closed conversations without admin_assignee_id, try to find from conversation parts
            if (!adminAssigneeId && (fullConv.state === "closed" || item.state === "closed")) {
              // Try to get from conversation parts (last admin who replied)
              if (fullConv.conversation_parts && Array.isArray(fullConv.conversation_parts)) {
                // Find the last admin part
                const adminParts = fullConv.conversation_parts
                  .filter(part => part.author && part.author.type === "admin")
                  .sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
                
                if (adminParts.length > 0) {
                  const lastAdminPart = adminParts[0];
                  if (lastAdminPart.author && lastAdminPart.author.id) {
                    adminAssigneeId = lastAdminPart.author.id;
                    console.log(`[API] Using fallback: Found admin_assignee_id ${adminAssigneeId} from conversation parts for closed conversation ${item.id}`);
                  }
                }
              }
              
              // Another fallback: Check statistics for last admin who replied
              if (!adminAssigneeId && fullConv.statistics && fullConv.statistics.last_admin_reply_at) {
                // Try to get from source or other fields
                if (fullConv.source && fullConv.source.assignee && fullConv.source.assignee.id) {
                  adminAssigneeId = fullConv.source.assignee.id;
                  console.log(`[API] Using fallback: Found admin_assignee_id ${adminAssigneeId} from source.assignee for closed conversation ${item.id}`);
                }
              }
            }
            
            // If we have admin_assignee_id but no admin_assignee object, try to fetch admin details
            if (adminAssigneeId && !adminAssignee) {
              try {
                const adminResp = await fetch(
                  `${INTERCOM_BASE_URL}/admins/${adminAssigneeId}`,
                  {
                    headers: {
                      "Authorization": authHeader,
                      "Accept": "application/json",
                      "Intercom-Version": "2.10"
                    }
                  }
                );
                if (adminResp.ok) {
                  adminAssignee = await adminResp.json();
                }
              } catch (err) {
                console.warn(`Failed to fetch admin ${adminAssigneeId}:`, err.message);
              }
            }
            
            // Extract closed_at from full conversation
            const closedAt = fullConv.closed_at || item.closed_at;
            
            // For closed conversations, only include if closed today
            const convState = fullConv.state || item.state || "open";
            if (convState === "closed") {
              // Debug: Log assignment info for closed conversations
              console.log(`[API] Closed conversation ${item.id} assignment info:`, {
                item_admin_assignee_id: item.admin_assignee_id,
                fullConv_admin_assignee_id: fullConv.admin_assignee_id,
                adminAssigneeId: adminAssigneeId,
                item_admin_assignee: item.admin_assignee,
                fullConv_admin_assignee: fullConv.admin_assignee,
                adminAssignee: adminAssignee
              });
              
              if (!closedAt) {
                console.log(`[API] Skipping closed conversation ${item.id}: no closed_at field`);
                return null; // Skip closed conversations without closed_at
              }
              
              const closedAtSeconds = typeof closedAt === "number" 
                ? (closedAt > 1e12 ? Math.floor(closedAt / 1000) : closedAt)
                : Math.floor(new Date(closedAt).getTime() / 1000);
              
              if (closedAtSeconds < todayStartSeconds || closedAtSeconds >= todayEndSeconds) {
                console.log(`[API] Skipping closed conversation ${item.id}: closed_at ${closedAtSeconds} not in today's range`);
                return null; // Skip closed conversations not closed today
              }
              
              console.log(`[API] Including closed conversation ${item.id}: closed_at ${closedAtSeconds} (today), admin_assignee_id: ${adminAssigneeId}`);
            }
            
            return {
              ...item,
              tags: fullConv.tags?.tags || fullConv.tags || item.tags || [],
              admin_assignee_id: adminAssigneeId,
              admin_assignee: adminAssignee,
              team_assignee_id: fullConv.team_assignee_id || item.team_assignee_id,
              snoozed_until: fullConv.snoozed_until || item.snoozed_until,
              updated_at: fullConv.updated_at || item.updated_at,
              last_contacted_at: fullConv.last_contacted_at || item.last_contacted_at,
              statistics: fullConv.statistics || item.statistics,
              source: fullConv.source || item.source,
              state: convState,
              closed_at: closedAt || null
            };
          }
        } catch (err) {
          console.warn(`Failed to fetch details for conversation ${item.id}:`, err.message);
        }
        // Return item with available fields if detail fetch fails
        return {
          ...item,
          tags: item.tags || [],
          state: item.state || "open"
        };
      });
      
    const batchResults = await Promise.all(batchPromises);
    // Filter out null results (closed conversations not closed today)
    const validResults = batchResults.filter(result => result !== null);
    enrichedItems.push(...validResults);
      
      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < items.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    all = all.concat(enrichedItems);
    debug.openSnoozed.fetched += items.length;
    debug.openSnoozed.enriched += enrichedItems.length;
    debug.openSnoozed.pages += 1;

    pageCount += 1;
    const stateCounts = enrichedItems.reduce((acc, conv) => {
      const state = conv.state || "unknown";
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {});
    console.log(`Page ${pageCount}: fetched ${items.length} conversations, enriched ${enrichedItems.length} (total: ${all.length})`);
    console.log(`[API] State breakdown:`, stateCounts);
    
    if (pageCount >= MAX_PAGES) {
      console.warn("Reached MAX_PAGES; stopping pagination");
      break;
    }

    const pages = data.pages || {};
    const next = pages.next;

    // If there's no `next`, we've reached the last page.
    if (!next) {
      break;
    }

    // In the search API, pages.next is usually a cursor string
    // that should be used as `pagination.starting_after` in the next request.
    if (typeof next === "string") {
      startingAfter = next;
    } else if (next && typeof next.starting_after === "string") {
      startingAfter = next.starting_after;
    } else {
      // Unrecognized structure; stop to avoid infinite loop.
      break;
    }
  }

  console.log(`[API] Fetched ${all.length} open/snoozed conversations. Now fetching closed conversations closed today...`);

  // Now fetch closed conversations closed today
  // Use created_at filter for last 24 hours (closed_at may not be searchable) and filter by closed_at client-side
  // Using the query structure that works: created_at > last_24_hours AND state = "closed"
  let closedStartingAfter = null;
  let closedPageCount = 0;
  
  while (closedPageCount < MAX_PAGES) {
    // Search for closed conversations updated in last 24 hours (we'll filter by closed_at client-side)
    // Using updated_at ensures we catch conversations that were created earlier but closed today
    const closedBody = {
      query: {
        operator: "AND",
        value: [
          {
            field: "updated_at",
            operator: ">",
            value: last24HoursTimestamp
          },
          {
            field: "state",
            operator: "=",
            value: "closed"
          }
        ]
      },
      pagination: {
        per_page: 150,
        ...(closedStartingAfter ? { starting_after: closedStartingAfter } : {})
      }
    };
    
    console.log(`[API] Searching for closed conversations with updated_at > ${last24HoursTimestamp} (last 24 hours: ${new Date(last24HoursTimestamp * 1000).toISOString()}), state=closed`);

    const closedResp = await fetch(
      `${INTERCOM_BASE_URL}/conversations/search`,
      {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Accept": "application/json",
          "Content-Type": "application/json",
        "Intercom-Version": "2.12"
        },
        body: JSON.stringify(closedBody)
      }
    );

    if (!closedResp.ok) {
      const text = await closedResp.text();
      console.warn(`[API] Error fetching closed conversations: ${closedResp.status}: ${text}`);
      break; // Don't fail completely if closed conversation search fails
    }

    const closedData = await closedResp.json();
    const closedItems = closedData.data || closedData.conversations || [];
    
    console.log(`[API] Found ${closedItems.length} closed conversations in search results (page ${closedPageCount + 1})`);
    debug.closedSearch.found += closedItems.length;
    debug.closedSearch.pages += 1;
    
    if (closedItems.length > 0) {
      const sampleIds = closedItems.slice(0, 5).map(item => ({
        id: item.id,
        state: item.state,
        admin_assignee_id: item.admin_assignee_id,
        team_assignee_id: item.team_assignee_id
      }));
      console.log(`[API] Sample closed conversation IDs:`, sampleIds);
      if (debug.closedSearch.sampleSearchIds.length === 0) {
        debug.closedSearch.sampleSearchIds = sampleIds;
      }
    }

    if (closedItems.length === 0) {
      console.log(`[API] No more closed conversations found, stopping pagination`);
      break; // No more closed conversations
    }

    // Fetch full details for closed conversations
    const BATCH_SIZE = 10;
    const enrichedClosedItems = [];
    
    for (let i = 0; i < closedItems.length; i += BATCH_SIZE) {
      const batch = closedItems.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (item) => {
        try {
          const convResp = await fetch(
            `${INTERCOM_BASE_URL}/conversations/${item.id}`,
            {
              headers: {
                "Authorization": authHeader,
                "Accept": "application/json",
                "Intercom-Version": "2.10"
              }
            }
          );
          
          if (convResp.ok) {
            const fullConv = await convResp.json();
            
            // Verify it's actually closed and closed today
            const convState = fullConv.state || item.state;
            if (convState !== "closed") {
              console.log(`[API] Skipping conversation ${item.id}: state is "${convState}", not "closed"`);
              debug.closedSearch.skipped.notClosed += 1;
              return null;
            }
            
            // Get closed_at from various possible locations
            // Intercom API might store it in different places
            const closedAt = fullConv.closed_at || 
                           fullConv.statistics?.last_close_at || 
                           item.closed_at ||
                           item.statistics?.last_close_at;
            
            if (!closedAt) {
              console.log(`[API] Skipping closed conversation ${item.id}: no closed_at field found in any location`);
              debug.closedSearch.skipped.noClosedAt += 1;
              return null;
            }
            
            const closedAtSeconds = typeof closedAt === "number" 
              ? (closedAt > 1e12 ? Math.floor(closedAt / 1000) : closedAt)
              : Math.floor(new Date(closedAt).getTime() / 1000);
            
            console.log(`[API] Closed conversation ${item.id}: closed_at=${closedAt}, closedAtSeconds=${closedAtSeconds}, today range=${todayStartSeconds} to ${todayEndSeconds}`);
            
            if (closedAtSeconds < todayStartSeconds || closedAtSeconds >= todayEndSeconds) {
              console.log(`[API] Skipping closed conversation ${item.id}: closed_at ${closedAtSeconds} not in today's range`);
              debug.closedSearch.skipped.outOfRange += 1;
              return null;
            }
            
            // Get assignment info - check multiple sources
            let adminAssignee = item.admin_assignee || fullConv.admin_assignee;
            let adminAssigneeId = item.admin_assignee_id || fullConv.admin_assignee_id;
            
            // From api.txt, we saw admin_assignee_id is at the top level
            // Also check teammates array which contains admin IDs
            if (!adminAssigneeId) {
              if (fullConv.admin_assignee_id) {
                adminAssigneeId = fullConv.admin_assignee_id;
              } else if (fullConv.teammates && fullConv.teammates.admins && fullConv.teammates.admins.length > 0) {
                // Use first teammate as assignee
                adminAssigneeId = fullConv.teammates.admins[0].id;
                console.log(`[API] Using teammates[0].id ${adminAssigneeId} for closed conversation ${item.id}`);
              } else if (fullConv.statistics && fullConv.statistics.last_closed_by_id) {
                // Fallback: use last admin who closed it
                adminAssigneeId = fullConv.statistics.last_closed_by_id;
                console.log(`[API] Using last_closed_by_id ${adminAssigneeId} for closed conversation ${item.id}`);
              }
            }
            
            // Also verify team assignment
            const teamAssigneeId = fullConv.team_assignee_id || item.team_assignee_id;
            if (teamAssigneeId !== "5480079" && String(teamAssigneeId) !== "5480079") {
              console.log(`[API] Skipping closed conversation ${item.id}: team_assignee_id ${teamAssigneeId} doesn't match team 5480079`);
              debug.closedSearch.skipped.wrongTeam += 1;
              return null;
            }
            
            // Debug: Log successful inclusion
            console.log(`[API] ✓ Including closed conversation ${item.id}: admin_assignee_id=${adminAssigneeId}, team=${teamAssigneeId}, closed_at=${closedAtSeconds}`);
            debug.closedSearch.included += 1;
            if (debug.closedSearch.sampleIncludedIds.length < 5) {
              debug.closedSearch.sampleIncludedIds.push({
                id: item.id,
                admin_assignee_id: adminAssigneeId,
                closed_at: closedAtSeconds
              });
            }
            
            // Fetch admin details if we have ID but no object
            if (adminAssigneeId && !adminAssignee) {
              try {
                const adminResp = await fetch(
                  `${INTERCOM_BASE_URL}/admins/${adminAssigneeId}`,
                  {
                    headers: {
                      "Authorization": authHeader,
                      "Accept": "application/json",
                      "Intercom-Version": "2.10"
                    }
                  }
                );
                if (adminResp.ok) {
                  adminAssignee = await adminResp.json();
                }
              } catch (err) {
                console.warn(`Failed to fetch admin ${adminAssigneeId}:`, err.message);
              }
            }
            
            console.log(`[API] Including closed conversation ${item.id}: closed_at ${closedAtSeconds}, admin_assignee_id: ${adminAssigneeId}`);
            
            return {
              ...item,
              tags: fullConv.tags?.tags || fullConv.tags || item.tags || [],
              admin_assignee_id: adminAssigneeId,
              admin_assignee: adminAssignee,
              team_assignee_id: fullConv.team_assignee_id || item.team_assignee_id,
              snoozed_until: fullConv.snoozed_until || item.snoozed_until,
              updated_at: fullConv.updated_at || item.updated_at,
              last_contacted_at: fullConv.last_contacted_at || item.last_contacted_at,
              statistics: fullConv.statistics || item.statistics,
              source: fullConv.source || item.source,
              state: "closed",
              closed_at: closedAt
            };
          }
        } catch (err) {
          console.warn(`Failed to fetch details for closed conversation ${item.id}:`, err.message);
        }
        return null;
      });
      
    const batchResults = await Promise.all(batchPromises);
    const validResults = batchResults.filter(result => result !== null);
    enrichedClosedItems.push(...validResults);
    debug.closedSearch.enriched += validResults.length;
      
      if (i + BATCH_SIZE < closedItems.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    all = all.concat(enrichedClosedItems);
    closedPageCount++;
    
    const closedStateCounts = enrichedClosedItems.reduce((acc, conv) => {
      const state = conv.state || "unknown";
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {});
    console.log(`[API] Closed conversations page ${closedPageCount}: fetched ${closedItems.length}, enriched ${enrichedClosedItems.length} (states: ${JSON.stringify(closedStateCounts)}) (total conversations: ${all.length})`);

    const closedPages = closedData.pages || {};
    const closedNext = closedPages.next;
    
    if (!closedNext) {
      break;
    }
    
    if (typeof closedNext === "string") {
      closedStartingAfter = closedNext;
    } else if (closedNext && typeof closedNext.starting_after === "string") {
      closedStartingAfter = closedNext.starting_after;
    } else {
      break;
    }
  }

  const finalStateCounts = all.reduce((acc, conv) => {
    const state = conv.state || "unknown";
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {});
  console.log(`[API] Final conversation counts by state:`, finalStateCounts);
  
  // Debug: Log closed conversations details
  const closedConvs = all.filter(conv => (conv.state || "").toLowerCase() === "closed");
  console.log(`[API] Total closed conversations in response: ${closedConvs.length}`);
  if (closedConvs.length > 0) {
    console.log(`[API] Closed conversation details (first 3):`, closedConvs.slice(0, 3).map(conv => ({
      id: conv.id || conv.conversation_id,
      state: conv.state,
      admin_assignee_id: conv.admin_assignee_id,
      admin_assignee: conv.admin_assignee,
      closed_at: conv.closed_at,
      team_assignee_id: conv.team_assignee_id
    })));
  }

  if (includeDebug) {
    return { conversations: all, debug };
  }
  return all;
}

export default async function handler(req, res) {
  // Handle CORS - allow Sigma Computing domain and plugin's own domain
  // Default to allowing Sigma's domain, but can be overridden via env var
  const allowedOriginEnv = process.env.ALLOWED_ORIGIN || "https://app.sigmacomputing.com";
  const requestOrigin = req.headers.origin;
  
  // Determine which origin to use for CORS
  let originToUse = allowedOriginEnv;
  
  if (allowedOriginEnv === "*") {
    // Wildcard: allow any origin
    originToUse = "*";
  } else if (requestOrigin) {
    // Check if request origin matches allowed origin or is from same domain (Vercel)
    const isAllowedOrigin = requestOrigin === allowedOriginEnv;
    const isSameDomain = requestOrigin.includes("vercel.app") || requestOrigin.includes("localhost");
    
    if (isAllowedOrigin || isSameDomain) {
      originToUse = requestOrigin;
    }
  }
  
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", originToUse);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get user's access token from cookie (preferred) or fall back to server token
    const userAccessToken = req.cookies?.intercom_access_token;
    let authHeader;
    
    if (userAccessToken) {
      // Use user's token
      authHeader = `Bearer ${userAccessToken}`;
    } else if (INTERCOM_TOKEN) {
      // Fall back to server token if no user token (for backward compatibility)
      authHeader = INTERCOM_TOKEN.startsWith('Bearer ')
        ? INTERCOM_TOKEN
        : `Bearer ${INTERCOM_TOKEN}`;
    } else {
      res.setHeader("Access-Control-Allow-Origin", originToUse);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Fetch both conversations and team members in parallel
    const debugMode = req.query?.debug === "1";
    const [conversationsResult, teamMembers] = await Promise.all([
      fetchAllOpenTeamConversations(authHeader, { includeDebug: debugMode }),
      fetchTeamMembers(authHeader)
    ]);
    const conversations = debugMode ? conversationsResult.conversations : conversationsResult;
    const debug = debugMode ? conversationsResult.debug : null;
    
    res.setHeader("Access-Control-Allow-Origin", originToUse);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    
    // Debug: Log summary before returning
    const responseStateCounts = conversations.reduce((acc, conv) => {
      const state = (conv.state || "").toLowerCase();
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {});
    console.log(`[API] Returning response with ${conversations.length} conversations. State breakdown:`, responseStateCounts);
    
    const responseClosedConvs = conversations.filter(conv => (conv.state || "").toLowerCase() === "closed");
    if (responseClosedConvs.length > 0) {
      console.log(`[API] Response includes ${responseClosedConvs.length} closed conversations with IDs:`, responseClosedConvs.slice(0, 5).map(c => c.id || c.conversation_id));
    } else {
      console.log(`[API] WARNING: Response includes 0 closed conversations!`);
    }
    
    // Return conversations with team members metadata
    if (debugMode) {
      res.json({
        conversations,
        teamMembers,
        debug: {
          ...debug,
          authSource: userAccessToken ? "user_cookie" : "server_token"
        }
      });
      return;
    }
    res.json({
      conversations,
      teamMembers
    });
  } catch (err) {
    console.error(err);
    // If error is 401, it might be an expired token
    if (err.message && err.message.includes('401')) {
      res.setHeader("Access-Control-Allow-Origin", originToUse);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      return res.status(401).json({ error: "Invalid or expired token", requiresAuth: true });
    }
    res.setHeader("Access-Control-Allow-Origin", originToUse);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.status(500).json({ error: err.message });
  }
}

