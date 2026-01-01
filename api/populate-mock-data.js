import pkg from 'pg';
const { Pool } = pkg;
import fetch from 'node-fetch';

// Try to load dotenv if available (for local development)
async function loadDotenv() {
  try {
    const dotenv = await import('dotenv');
    dotenv.default.config();
    return true;
  } catch (e) {
    // dotenv not available, use environment variables directly
    return false;
  }
}

const INTERCOM_BASE_URL = "https://api.intercom.io";
const EXCLUDED_TSE_NAMES = [
  "Stephen Skalamera", "Zen Junior", "Nathan Parrish", "Leticia Esparza",
  "Rob Woollen", "Brett Bedevian", "Viswa Jeyaraman", "Brandon Yee",
  "Holly Coxon", "Chetana Shinde", "Matt Morgenroth", "Grace Sanford",
  "Prerit Sachdeva", "svc-prd-tse-intercom SVC"
];

// Database connection pool
let pool = null;

function getPool() {
  if (!pool) {
    // Disable TLS certificate verification for Supabase (required for self-signed certs)
    if (process.env.POSTGRES_URL?.includes('supabase.co') || 
        process.env.POSTGRES_URL_NON_POOLING?.includes('supabase.co')) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
    
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

/**
 * Fetch team members from Intercom
 */
async function fetchTeamMembers() {
  const INTERCOM_TOKEN = process.env.INTERCOM_TOKEN;
  if (!INTERCOM_TOKEN) {
    console.warn("⚠️  INTERCOM_TOKEN not configured. Using sample TSEs instead.");
    return [];
  }

  const authHeader = INTERCOM_TOKEN.startsWith('Bearer ')
    ? INTERCOM_TOKEN
    : `Bearer ${INTERCOM_TOKEN}`;

  try {
    const teamResp = await fetch(`${INTERCOM_BASE_URL}/teams/5480079`, {
      headers: {
        "Authorization": authHeader,
        "Accept": "application/json",
        "Intercom-Version": "2.10"
      }
    });
    
    if (teamResp.ok) {
      const teamData = await teamResp.json();
      const adminIds = teamData.admin_ids || [];
      const admins = [];
      
      for (const adminId of adminIds) {
        try {
          const adminResp = await fetch(`${INTERCOM_BASE_URL}/admins/${adminId}`, {
            headers: {
              "Authorization": authHeader,
              "Accept": "application/json",
              "Intercom-Version": "2.10"
            }
          });
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
 * Generate random number between min and max (inclusive)
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate random decimal between min and max
 */
function randomDecimal(min, max, decimals = 2) {
  return Math.round((Math.random() * (max - min) + min) * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Generate mock TSE snapshot data
 */
function generateMockTSEData(tse) {
  // Generate realistic values based on thresholds
  // MAX_OPEN_SOFT: 5, MAX_OPEN_ALERT: 6
  // MAX_ACTIONABLE_SNOOZED_SOFT: 5, MAX_ACTIONABLE_SNOOZED_ALERT: 7
  
  const open = randomInt(0, 10); // 0-10 open chats
  const actionableSnoozed = randomInt(0, 8); // 0-8 actionable snoozed
  const investigationSnoozed = randomInt(0, 5); // 0-5 investigation snoozed
  const customerWaitSnoozed = randomInt(0, 5); // 0-5 customer wait snoozed
  const totalSnoozed = actionableSnoozed + investigationSnoozed + customerWaitSnoozed;

  return {
    id: tse.id,
    name: tse.name,
    open,
    actionableSnoozed,
    investigationSnoozed,
    customerWaitSnoozed,
    totalSnoozed
  };
}

/**
 * Generate mock response time metrics
 */
function generateMockResponseTimeMetrics() {
  // Generate realistic values
  // Total conversations per day: 50-200
  // Percentage with 10+ min wait: 5-25%
  const totalConversations = randomInt(50, 200);
  const percentage10PlusMin = randomDecimal(5, 25);
  const count10PlusMin = Math.round((totalConversations * percentage10PlusMin) / 100);
  
  // Generate some mock conversation IDs
  const conversationIds10PlusMin = Array.from({ length: count10PlusMin }, () => 
    randomInt(200000000000000, 300000000000000).toString()
  );

  return {
    count10PlusMin,
    totalConversations,
    percentage10PlusMin,
    conversationIds10PlusMin
  };
}

/**
 * Get date string in YYYY-MM-DD format
 */
function getDateString(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Populate TSE snapshots table
 */
async function populateTSESnapshots(teamMembers, days = 30) {
  const db = getPool();
  
  // Ensure table exists
  await db.query(`
    CREATE TABLE IF NOT EXISTS tse_snapshots (
      id SERIAL PRIMARY KEY,
      date VARCHAR(10) NOT NULL,
      timestamp TIMESTAMP NOT NULL,
      tse_data JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(date)
    );
  `);

  // Filter out excluded TSEs
  const validTSEs = teamMembers.filter(tse => 
    tse.id && !EXCLUDED_TSE_NAMES.includes(tse.name)
  );

  if (validTSEs.length === 0) {
    console.log('No valid TSEs found. Using sample TSEs...');
    // Fallback to sample TSEs if API fails
    validTSEs.push(
      { id: '12345', name: 'Sample TSE 1' },
      { id: '12346', name: 'Sample TSE 2' },
      { id: '12347', name: 'Sample TSE 3' }
    );
  }

  console.log(`\nPopulating TSE snapshots for ${validTSEs.length} TSEs over ${days} days...`);

  const today = new Date();
  let inserted = 0;
  let updated = 0;

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - i);
    date.setUTCHours(22, 0, 0, 0); // 10pm ET snapshot time
    
    const dateStr = getDateString(date);
    const timestamp = date.toISOString();
    
    // Generate mock data for all TSEs
    const tseData = validTSEs.map(tse => generateMockTSEData(tse));

    try {
      const result = await db.query(`
        INSERT INTO tse_snapshots (date, timestamp, tse_data)
        VALUES ($1, $2, $3::jsonb)
        ON CONFLICT (date) 
        DO UPDATE SET 
          timestamp = EXCLUDED.timestamp,
          tse_data = EXCLUDED.tse_data,
          created_at = NOW()
        RETURNING id;
      `, [dateStr, timestamp, JSON.stringify(tseData)]);

      if (result.rows[0]) {
        const existing = await db.query(`SELECT id FROM tse_snapshots WHERE date = $1`, [dateStr]);
        if (existing.rows.length > 0 && existing.rows[0].id !== result.rows[0].id) {
          updated++;
        } else {
          inserted++;
        }
      }
      
      if ((i + 1) % 5 === 0) {
        process.stdout.write(`\rProgress: ${i + 1}/${days} days processed...`);
      }
    } catch (error) {
      console.error(`\nError inserting snapshot for ${dateStr}:`, error.message);
    }
  }

  console.log(`\n✓ TSE Snapshots: ${inserted} inserted, ${updated} updated`);
}

/**
 * Populate response time metrics table
 */
async function populateResponseTimeMetrics(days = 30) {
  const db = getPool();
  
  // Ensure table exists
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

  // Add conversation_ids_10_plus_min column if it doesn't exist
  try {
    await db.query(`
      ALTER TABLE response_time_metrics 
      ADD COLUMN IF NOT EXISTS conversation_ids_10_plus_min JSONB;
    `);
  } catch (migrationError) {
    // Column might already exist, ignore
  }

  console.log(`\nPopulating response time metrics for ${days} days...`);

  const today = new Date();
  let inserted = 0;
  let updated = 0;

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - i);
    date.setUTCHours(0, 0, 0, 0); // Midnight UTC
    
    const dateStr = getDateString(date);
    const timestamp = date.toISOString();
    
    // Generate mock metrics
    const metrics = generateMockResponseTimeMetrics();

    try {
      const result = await db.query(`
        INSERT INTO response_time_metrics (
          timestamp, date, count_10_plus_min, total_conversations, 
          percentage_10_plus_min, conversation_ids_10_plus_min
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (date) 
        DO UPDATE SET 
          timestamp = EXCLUDED.timestamp,
          count_10_plus_min = EXCLUDED.count_10_plus_min,
          total_conversations = EXCLUDED.total_conversations,
          percentage_10_plus_min = EXCLUDED.percentage_10_plus_min,
          conversation_ids_10_plus_min = EXCLUDED.conversation_ids_10_plus_min,
          created_at = NOW()
        RETURNING id;
      `, [
        timestamp,
        dateStr,
        metrics.count10PlusMin,
        metrics.totalConversations,
        metrics.percentage10PlusMin,
        JSON.stringify(metrics.conversationIds10PlusMin)
      ]);

      if (result.rows[0]) {
        const existing = await db.query(`SELECT id FROM response_time_metrics WHERE date = $1`, [dateStr]);
        if (existing.rows.length > 0 && existing.rows[0].id !== result.rows[0].id) {
          updated++;
        } else {
          inserted++;
        }
      }
      
      if ((i + 1) % 5 === 0) {
        process.stdout.write(`\rProgress: ${i + 1}/${days} days processed...`);
      }
    } catch (error) {
      console.error(`\nError inserting metrics for ${dateStr}:`, error.message);
    }
  }

  console.log(`\n✓ Response Time Metrics: ${inserted} inserted, ${updated} updated`);
}

/**
 * Main function
 */
async function main() {
  // Load dotenv if available
  await loadDotenv();
  
  console.log('Starting mock data population...\n');
  
  try {
    // Fetch actual TSEs from Intercom
    console.log('Fetching team members from Intercom...');
    const teamMembers = await fetchTeamMembers();
    console.log(`Found ${teamMembers.length} team members`);
    
    if (teamMembers.length > 0) {
      const validTSEs = teamMembers.filter(tse => 
        tse.id && !EXCLUDED_TSE_NAMES.includes(tse.name)
      );
      console.log(`${validTSEs.length} valid TSEs (excluding ${EXCLUDED_TSE_NAMES.length} excluded names)`);
    }

    // Populate both tables
    await populateTSESnapshots(teamMembers, 30);
    await populateResponseTimeMetrics(30);

    console.log('\n✅ Mock data population completed successfully!');
    console.log('\nSummary:');
    console.log('- TSE Snapshots: 30 days of data');
    console.log('- Response Time Metrics: 30 days of data');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// Run the script
main();

