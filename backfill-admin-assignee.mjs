#!/usr/bin/env node

/**
 * Backfill script to enrich existing response_time_metrics records with admin_assignee information
 * 
 * This script:
 * 1. Reads all response_time_metrics records from the database
 * 2. For each record, checks conversationIds5PlusMin and conversationIds10PlusMin arrays
 * 3. For conversations with admin_assignee_id but missing/incomplete admin_assignee, fetches admin details from Intercom
 * 4. Updates the record in the database with enriched data
 * 
 * Usage:
 *   INTERCOM_TOKEN=your_token_here node backfill-admin-assignee.mjs
 * 
 * Environment variables required:
 *   INTERCOM_TOKEN - Intercom API access token
 *   POSTGRES_URL - PostgreSQL connection string (or POSTGRES_URL_NON_POOLING)
 */

import fetch from "node-fetch";
import pkg from 'pg';
const { Pool } = pkg;

const INTERCOM_BASE_URL = "https://api.intercom.io";

// Disable TLS certificate verification for Supabase (required for self-signed certs)
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

// Fetch conversation details from Intercom
async function fetchConversationDetails(authHeader, conversationId) {
  try {
    const convResp = await fetch(`${INTERCOM_BASE_URL}/conversations/${conversationId}`, {
      headers: {
        "Authorization": authHeader,
        "Accept": "application/json",
        "Intercom-Version": "2.10"
      }
    });
    
    if (convResp.ok) {
      return await convResp.json();
    } else {
      console.warn(`    Failed to fetch conversation ${conversationId}: ${convResp.status} ${convResp.statusText}`);
      return null;
    }
  } catch (err) {
    console.warn(`    Error fetching conversation ${conversationId}:`, err.message);
    return null;
  }
}

// Fetch admin details from Intercom
async function fetchAdminDetails(authHeader, adminId) {
  try {
    const adminResp = await fetch(`${INTERCOM_BASE_URL}/admins/${adminId}`, {
      headers: {
        "Authorization": authHeader,
        "Accept": "application/json",
        "Intercom-Version": "2.10"
      }
    });
    
    if (adminResp.ok) {
      return await adminResp.json();
    } else {
      console.warn(`  Failed to fetch admin ${adminId}: ${adminResp.status} ${adminResp.statusText}`);
      return null;
    }
  } catch (err) {
    console.warn(`  Error fetching admin ${adminId}:`, err.message);
    return null;
  }
}

// Enrich a conversation object with admin_assignee details
// If conversation has no assignee info, fetch current state from Intercom
async function enrichConversation(authHeader, conv) {
  // Normalize field names - handle both camelCase and snake_case
  const adminAssigneeId = conv.admin_assignee_id || conv.adminAssigneeId;
  const adminAssignee = conv.admin_assignee || conv.adminAssignee;
  const adminAssigneeName = conv.admin_assignee_name || conv.adminAssigneeName;
  
  // If we have assignee ID but missing name, fetch admin details
  if (adminAssigneeId && (!adminAssigneeName || !adminAssignee || !adminAssignee.name)) {
    console.log(`    Enriching conversation ${conv.id} - fetching admin details for ID: ${adminAssigneeId}`);
    
    const adminData = await fetchAdminDetails(authHeader, adminAssigneeId);
    
    if (adminData) {
      // Preserve all existing fields and add/update admin_assignee fields
      return {
        ...conv,
        adminAssigneeId: adminAssigneeId,
        adminAssigneeName: adminData.name || null,
        admin_assignee_id: adminAssigneeId,
        admin_assignee_name: adminData.name || null,
        admin_assignee: adminData,
        adminAssignee: adminData
      };
    }
  }
  
  // If no assignee info at all, fetch current conversation state from Intercom
  if (!adminAssigneeId && !adminAssigneeName) {
    console.log(`    Fetching current state for conversation ${conv.id} (no assignee info in DB)`);
    
    const currentConv = await fetchConversationDetails(authHeader, conv.id);
    
    if (currentConv) {
      const currentAdminAssigneeId = currentConv.admin_assignee_id;
      const currentAdminAssignee = currentConv.admin_assignee;
      
      if (currentAdminAssigneeId || currentAdminAssignee) {
        let adminName = null;
        let adminData = currentAdminAssignee;
        
        // If we have admin_assignee object, extract name
        if (currentAdminAssignee && typeof currentAdminAssignee === 'object' && currentAdminAssignee.name) {
          adminName = currentAdminAssignee.name;
          adminData = currentAdminAssignee;
        } else if (currentAdminAssigneeId) {
          // Fetch admin details if we only have ID
          adminData = await fetchAdminDetails(authHeader, currentAdminAssigneeId);
          if (adminData) {
            adminName = adminData.name || null;
          }
        }
        
        if (adminName) {
          // Update conversation with current assignee info
          return {
            ...conv,
            adminAssigneeId: currentAdminAssigneeId,
            adminAssigneeName: adminName,
            admin_assignee_id: currentAdminAssigneeId,
            admin_assignee_name: adminName,
            admin_assignee: adminData,
            adminAssignee: adminData
          };
        }
      }
    }
  }
  
  return conv; // Return unchanged if no updates needed or fetch failed
}

// Process a single metric record
async function processMetricRecord(authHeader, record) {
  const { id, date, conversation_ids_5_plus_min, conversation_ids_10_plus_min } = record;
  
  console.log(`\nProcessing record ${id} (date: ${date})`);
  
  let updated5Plus = false;
  let updated10Plus = false;
  
  // Process 5+ minute conversations
  let enriched5Plus = [];
  // Handle JSONB - PostgreSQL returns it as an array, but check both cases
  const convs5Plus = Array.isArray(conversation_ids_5_plus_min) 
    ? conversation_ids_5_plus_min 
    : (conversation_ids_5_plus_min ? [conversation_ids_5_plus_min] : []);
  
  if (convs5Plus.length > 0) {
    console.log(`  Found ${convs5Plus.length} conversations with 5+ min wait`);
    
    for (let i = 0; i < convs5Plus.length; i++) {
      const conv = convs5Plus[i];
      const enriched = await enrichConversation(authHeader, conv);
      
      // Check if enrichment changed anything (compare normalized)
      const convNormalized = JSON.stringify({
        ...conv,
        adminAssigneeName: conv.admin_assignee_name || conv.adminAssigneeName,
        adminAssigneeId: conv.admin_assignee_id || conv.adminAssigneeId
      });
      const enrichedNormalized = JSON.stringify({
        ...enriched,
        adminAssigneeName: enriched.admin_assignee_name || enriched.adminAssigneeName,
        adminAssigneeId: enriched.admin_assignee_id || enriched.adminAssigneeId
      });
      
      if (enrichedNormalized !== convNormalized) {
        updated5Plus = true;
      }
      
      enriched5Plus.push(enriched);
      
      // Add small delay to avoid rate limiting
      if (i < convs5Plus.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }
  
  // Process 10+ minute conversations
  let enriched10Plus = [];
  // Handle JSONB - PostgreSQL returns it as an array, but check both cases
  const convs10Plus = Array.isArray(conversation_ids_10_plus_min) 
    ? conversation_ids_10_plus_min 
    : (conversation_ids_10_plus_min ? [conversation_ids_10_plus_min] : []);
  
  if (convs10Plus.length > 0) {
    console.log(`  Found ${convs10Plus.length} conversations with 10+ min wait`);
    
    for (let i = 0; i < convs10Plus.length; i++) {
      const conv = convs10Plus[i];
      const enriched = await enrichConversation(authHeader, conv);
      
      // Check if enrichment changed anything (compare normalized)
      const convNormalized = JSON.stringify({
        ...conv,
        adminAssigneeName: conv.admin_assignee_name || conv.adminAssigneeName,
        adminAssigneeId: conv.admin_assignee_id || conv.adminAssigneeId
      });
      const enrichedNormalized = JSON.stringify({
        ...enriched,
        adminAssigneeName: enriched.admin_assignee_name || enriched.adminAssigneeName,
        adminAssigneeId: enriched.admin_assignee_id || enriched.adminAssigneeId
      });
      
      if (enrichedNormalized !== convNormalized) {
        updated10Plus = true;
      }
      
      enriched10Plus.push(enriched);
      
      // Add small delay to avoid rate limiting
      if (i < convs10Plus.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }
  
  // Update database if any changes were made
  if (updated5Plus || updated10Plus) {
    const db = getPool();
    
    try {
      await db.query(`
        UPDATE response_time_metrics
        SET 
          conversation_ids_5_plus_min = $1,
          conversation_ids_10_plus_min = $2
        WHERE id = $3
      `, [
        updated5Plus ? JSON.stringify(enriched5Plus) : conversation_ids_5_plus_min,
        updated10Plus ? JSON.stringify(enriched10Plus) : conversation_ids_10_plus_min,
        id
      ]);
      
      console.log(`  ✓ Updated record ${id}`);
      return true;
    } catch (error) {
      console.error(`  ✗ Error updating record ${id}:`, error.message);
      return false;
    }
  } else {
    console.log(`  - No updates needed for record ${id}`);
    return false;
  }
}

// Main function
async function main() {
  const intercomToken = process.env.INTERCOM_TOKEN;
  
  if (!intercomToken) {
    console.error('Error: INTERCOM_TOKEN environment variable is required');
    process.exit(1);
  }
  
  const authHeader = `Bearer ${intercomToken}`;
  
  console.log('Starting admin_assignee backfill...\n');
  
  const db = getPool();
  
  try {
    // Fetch all response_time_metrics records
    const result = await db.query(`
      SELECT id, date, conversation_ids_5_plus_min, conversation_ids_10_plus_min
      FROM response_time_metrics
      ORDER BY date DESC
    `);
    
    console.log(`Found ${result.rows.length} records to process\n`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const record of result.rows) {
      try {
        const updated = await processMetricRecord(authHeader, record);
        if (updated) {
          updatedCount++;
        }
        
        // Add delay between records to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error processing record ${record.id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n✓ Backfill complete!`);
    console.log(`  Updated: ${updatedCount} records`);
    console.log(`  Errors: ${errorCount} records`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
