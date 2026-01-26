// Incident.io On-Call API endpoint
// Fetches current on-call people from configured schedules

export const dynamic = 'force-dynamic';

const INCIDENT_IO_API_KEY = process.env.INCIDENT_IO_API_KEY;
const INCIDENT_IO_BASE_URL = 'https://api.incident.io';

// Schedule names to fetch (exact names from Incident.io)
const SCHEDULE_NAMES = [
  'TSE Manager - Escalations',
  'TSE Manager - Incidents'
];

export default async function handler(req, res) {
  // Set CORS headers
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

  // Debug mode - return all schedules
  const debugMode = req.query.debug === 'true';

  if (!INCIDENT_IO_API_KEY) {
    console.error('[On-Call API] INCIDENT_IO_API_KEY not configured');
    return res.status(500).json({ error: "Incident.io API key not configured" });
  }

  try {
    // Step 1: Fetch all schedules to get their IDs (with large page size)
    const schedulesResponse = await fetch(`${INCIDENT_IO_BASE_URL}/v2/schedules?page_size=100`, {
      headers: {
        'Authorization': `Bearer ${INCIDENT_IO_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!schedulesResponse.ok) {
      const errorText = await schedulesResponse.text();
      console.error('[On-Call API] Failed to fetch schedules:', schedulesResponse.status, errorText);
      return res.status(schedulesResponse.status).json({ 
        error: "Failed to fetch schedules from Incident.io",
        details: errorText
      });
    }

    const schedulesData = await schedulesResponse.json();
    const schedules = schedulesData.schedules || [];
    
    console.log('[On-Call API] Found schedules:', schedules.map(s => ({ id: s.id, name: s.name })));

    // Filter to our target schedules (exact name match)
    const targetSchedules = schedules.filter(s => 
      SCHEDULE_NAMES.some(name => s.name === name)
    );
    
    console.log('[On-Call API] Target schedules:', targetSchedules.map(s => s.name));
    console.log('[On-Call API] All available schedules:', schedules.map(s => s.name));
    
    // Debug mode - return all schedules info
    if (debugMode) {
      return res.status(200).json({
        allSchedules: schedules.map(s => ({ id: s.id, name: s.name })),
        targetSchedules: targetSchedules.map(s => ({ id: s.id, name: s.name })),
        configuredNames: SCHEDULE_NAMES
      });
    }

    if (targetSchedules.length === 0) {
      console.log('[On-Call API] No matching schedules found. Available:', schedules.map(s => s.name));
      return res.status(200).json({ 
        onCall: [],
        message: "No matching schedules found"
      });
    }

    // Step 2: Fetch current on-call entries for each schedule
    const now = new Date();
    const windowStart = now.toISOString();
    const windowEnd = new Date(now.getTime() + 60000).toISOString(); // 1 minute window

    const onCallResults = [];

    for (const schedule of targetSchedules) {
      try {
        const entriesUrl = new URL(`${INCIDENT_IO_BASE_URL}/v2/schedule_entries`);
        entriesUrl.searchParams.set('schedule_id', schedule.id);
        entriesUrl.searchParams.set('entry_window_start', windowStart);
        entriesUrl.searchParams.set('entry_window_end', windowEnd);

        const entriesResponse = await fetch(entriesUrl.toString(), {
          headers: {
            'Authorization': `Bearer ${INCIDENT_IO_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        if (!entriesResponse.ok) {
          console.error(`[On-Call API] Failed to fetch entries for ${schedule.name}:`, entriesResponse.status);
          continue;
        }

        const entriesData = await entriesResponse.json();
        const finalEntries = entriesData.schedule_entries?.final || [];
        
        console.log(`[On-Call API] ${schedule.name} raw entries:`, finalEntries.length);
        
        // Get the currently on-call user(s) - the API already filters by time window
        // so we take all entries in 'final' as current
        const currentOnCall = finalEntries.map(entry => ({
          name: entry.user?.name || 'Unknown',
          email: entry.user?.email,
          slackUserId: entry.user?.slack_user_id,
          scheduleName: schedule.name,
          scheduleType: schedule.name.toLowerCase().includes('escalation') ? 'escalations' : 'incidents',
          endAt: entry.end_at
        }));

        onCallResults.push(...currentOnCall);
        
        console.log(`[On-Call API] ${schedule.name}: ${currentOnCall.map(u => u.name).join(', ') || 'No one on call'}`);
      } catch (err) {
        console.error(`[On-Call API] Error fetching entries for ${schedule.name}:`, err);
      }
    }

    return res.status(200).json({
      onCall: onCallResults,
      fetchedAt: now.toISOString()
    });

  } catch (error) {
    console.error('[On-Call API] Error:', error);
    return res.status(500).json({ 
      error: "Failed to fetch on-call data",
      details: error.message 
    });
  }
}
