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
 * using Intercom's /conversations/search endpoint and pagination.
 */
async function fetchAllOpenTeamConversations(authHeader) {
  let all = [];
  let startingAfter = null;
  let pageCount = 0;

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
              state: fullConv.state || item.state || "open"
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
      enrichedItems.push(...batchResults);
      
      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < items.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    all = all.concat(enrichedItems);

    pageCount += 1;
    console.log(`Page ${pageCount}: fetched ${items.length} conversations (total: ${all.length})`);
    
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
    const [conversations, teamMembers] = await Promise.all([
      fetchAllOpenTeamConversations(authHeader),
      fetchTeamMembers(authHeader)
    ]);
    
    res.setHeader("Access-Control-Allow-Origin", originToUse);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    
    // Return conversations with team members metadata
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

