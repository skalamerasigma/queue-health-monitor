#!/usr/bin/env node

/**
 * Script to update Intercom conversations with Auto-Closed and Last Snooze Workflow Used custom attributes
 * 
 * Usage:
 *   INTERCOM_TOKEN=your_token_here node update-auto-closed.mjs
 * 
 * Environment variables required:
 *   INTERCOM_TOKEN - Intercom API access token
 */

import fetch from "node-fetch";

const INTERCOM_BASE_URL = "https://api.intercom.io";
const INTERCOM_TOKEN = process.env.INTERCOM_TOKEN;

if (!INTERCOM_TOKEN) {
  console.error("Error: INTERCOM_TOKEN environment variable is required");
  process.exit(1);
}

const authHeader = INTERCOM_TOKEN.startsWith('Bearer ')
  ? INTERCOM_TOKEN
  : `Bearer ${INTERCOM_TOKEN}`;

// Conversations to set to "Waiting On Customer - Resolved"
const resolvedConversations = [
  "215472768118369",
  "215472759455454",
  "215472759422878",
  "215472757642172",
  "215472753744633",
  "215472752240174",
  "215472746407857",
  "215472745451563",
  "215472735336372",
  "215472732940819",
  "215472731080080",
  "215472731050258",
  "215472729784889",
  "215472706548561",
  "215472704196062",
  "215472704186509",
  "215472702484206",
  "215472670486558",
  "215472659333432",
  "215472653166119",
  "215472571277264"
];

// Conversations to set to "Waiting On Customer - Unresolved"
const unresolvedConversations = [
  "215472730108172",
  "215472719854124",
  "215472701097287",
  "215472700589108",
  "215472686016394",
  "215472641533651"
];

/**
 * Update a conversation's Auto-Closed and Last Snooze Workflow Used custom attributes
 */
async function updateConversation(conversationId, workflowValue) {
  try {
    const response = await fetch(
      `${INTERCOM_BASE_URL}/conversations/${conversationId}`,
      {
        method: "PUT",
        headers: {
          "Authorization": authHeader,
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Intercom-Version": "2.10"
        },
        body: JSON.stringify({
          custom_attributes: {
            "Auto-Closed": workflowValue,
            "Last Snooze Workflow Used": workflowValue
          }
        })
      }
    );

    if (response.ok) {
      const data = await response.json();
      return { success: true, conversationId, data };
    } else {
      const errorText = await response.text();
      return { 
        success: false, 
        conversationId, 
        error: `HTTP ${response.status}: ${errorText}` 
      };
    }
  } catch (error) {
    return { 
      success: false, 
      conversationId, 
      error: error.message 
    };
  }
}

/**
 * Process all conversations
 */
async function main() {
  console.log("Starting Auto-Closed and Last Snooze Workflow Used field updates...\n");
  
  const results = {
    resolved: { success: [], failed: [] },
    unresolved: { success: [], failed: [] }
  };

  // Update resolved conversations
  console.log(`Updating ${resolvedConversations.length} conversations (Auto-Closed and Last Snooze Workflow Used) to "Waiting On Customer - Resolved"...`);
  for (const convId of resolvedConversations) {
    console.log(`  Updating conversation ${convId}...`);
    const result = await updateConversation(convId, "Waiting On Customer - Resolved");
    
    if (result.success) {
      results.resolved.success.push(convId);
      console.log(`    ✓ Success`);
    } else {
      results.resolved.failed.push({ id: convId, error: result.error });
      console.log(`    ✗ Failed: ${result.error}`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\nUpdating ${unresolvedConversations.length} conversations (Auto-Closed and Last Snooze Workflow Used) to "Waiting On Customer - Unresolved"...`);
  // Update unresolved conversations
  for (const convId of unresolvedConversations) {
    console.log(`  Updating conversation ${convId}...`);
    const result = await updateConversation(convId, "Waiting On Customer - Unresolved");
    
    if (result.success) {
      results.unresolved.success.push(convId);
      console.log(`    ✓ Success`);
    } else {
      results.unresolved.failed.push({ id: convId, error: result.error });
      console.log(`    ✗ Failed: ${result.error}`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  
  console.log(`\nResolved conversations:`);
  console.log(`  ✓ Success: ${results.resolved.success.length}/${resolvedConversations.length}`);
  if (results.resolved.failed.length > 0) {
    console.log(`  ✗ Failed: ${results.resolved.failed.length}`);
    results.resolved.failed.forEach(f => {
      console.log(`    - ${f.id}: ${f.error}`);
    });
  }
  
  console.log(`\nUnresolved conversations:`);
  console.log(`  ✓ Success: ${results.unresolved.success.length}/${unresolvedConversations.length}`);
  if (results.unresolved.failed.length > 0) {
    console.log(`  ✗ Failed: ${results.unresolved.failed.length}`);
    results.unresolved.failed.forEach(f => {
      console.log(`    - ${f.id}: ${f.error}`);
    });
  }
  
  const totalSuccess = results.resolved.success.length + results.unresolved.success.length;
  const totalFailed = results.resolved.failed.length + results.unresolved.failed.length;
  const total = resolvedConversations.length + unresolvedConversations.length;
  
  console.log(`\nTotal: ${totalSuccess}/${total} succeeded, ${totalFailed} failed`);
  
  if (totalFailed === 0) {
    console.log("\n✓ All updates completed successfully!");
    process.exit(0);
  } else {
    console.log("\n⚠ Some updates failed. Please review the errors above.");
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
