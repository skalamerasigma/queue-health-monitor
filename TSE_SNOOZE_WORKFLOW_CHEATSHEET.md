# TSE Snooze Workflow Cheatsheet

## Quick Reference: When to Use Each Snooze Workflow

Use the **Trigger Reusable Workflow** icon (⌘K) in Intercom to access snooze workflows. Each workflow automatically applies the correct tag, sets the snooze duration, and handles reassignment or closure.

---

## 🟡 Snooze: Waiting on TSE - Deep Dive [48hr Auto-reassign]

### When to Use:
- **Deep dive investigation** required (bug filing, complex technical issues)
- **Awaiting internal SME consultation** (need expert input)
- **Research or analysis** needed before responding
- **Internal follow-up** required (waiting on another team/department)

### What Happens Automatically:
1. ✅ Removes any existing snooze tags
2. ✅ Tags conversation with `snooze.waiting-on-tse`
3. ✅ Snoozes for **23 hours**
4. ✅ After 23 hours: Sends internal warning message: *"Reassigning to the Reso Queue in 1 hour due to TSE inactivity. If you are still actively working this chat please follow up with the customer with your updates."*
5. ✅ Snoozes for **1 additional hour** (total: 24 hours)
6. ✅ After 24 hours total: If no activity, automatically:
   - Tags conversation as "reassigned"
   - Marks as Priority
   - Assigns to 🚨 Resolution Team

### ⚠️ Important Notes:
- **Total Time**: 24 hours before reassignment (23hr snooze + 1hr warning)
- **Soft Limit**: Keep under 5 actionable snoozed chats
- **Alert Threshold**: 7+ triggers manager alert
- **Best Practice**: Add internal notes explaining why it's snoozed
- **Workflow Cancels**: If you or the customer sends a message during snooze, workflow ends
- **Don't Use For**: Customer response delays (use Customer Wait workflows instead)

### Example Scenarios:
- ❓ Customer reports a bug → Need to file ticket and investigate
- ❓ Complex technical issue → Need to consult with engineering team
- ❓ Account-specific question → Need to check with account manager
- ❓ Feature request → Need to discuss with product team

---

## 🟢 Snooze: Waiting on Customer - Resolved [24hr Auto-close]

### When to Use:
- **Solution has been provided** to the customer
- **Customer needs to try the solution** or confirm it works
- **Waiting for customer confirmation** that issue is resolved
- **Follow-up check-in sent** and waiting for response

### What Happens Automatically:
1. ✅ Removes any existing snooze tags
2. ✅ Tags conversation with `snooze.waiting-on-customer-resolved`
3. ✅ Sends check-in message: *"Hi! Just wanted to make sure the solution I shared resolved your issue. Is there anything else I can help clarify or any other questions you have?"*
4. ✅ Snoozes for **1 day** (24 hours)
5. ✅ After 24 hours: If customer doesn't respond, automatically:
   - Sends closing message: *"I'll go ahead and close this conversation for now since we haven't heard back. If you need any additional help or have new questions, feel free to start a new chat anytime - we're always here to assist!"*
   - Closes the conversation

### ⚠️ Important Notes:
- **Total Time**: 24 hours before auto-closure
- **No Hard Limit**: This category has no maximum limit
- **Best Practice**: The workflow automatically sends the check-in message for you
- **Workflow Cancels**: If customer responds during the 24-hour snooze, workflow ends and conversation stays open
- **Use When**: You've provided a solution and are waiting for confirmation

### Example Scenarios:
- ✅ Provided troubleshooting steps → Waiting for customer to try them
- ✅ Sent a workaround → Waiting for customer to confirm it works
- ✅ Escalated to billing → Waiting for customer to confirm resolution
- ✅ Provided documentation → Waiting for customer to review

---

## 🟠 Snooze: Waiting on Customer - Unresolved [72hr Auto-close]

### When to Use:
- **Issue is NOT yet resolved** but customer is unresponsive
- **Need more information** from customer to proceed
- **Customer hasn't responded** to your questions or check-ins
- **Waiting for customer action** (e.g., providing logs, screenshots, details)

### What Happens Automatically:
1. ✅ Removes any existing snooze tags
2. ✅ Tags conversation with `snooze.waiting-on-customer-unresolved`
3. ✅ Sends first follow-up message: *"Hi there! I wanted to follow up on our conversation. Is there anything else I can help you with or any questions you'd like to address?"*
4. ✅ Snoozes for **1 day** (24 hours)
5. ✅ After 24 hours: If customer doesn't respond, sends second check-in: *"Just checking in one more time to see if you need any additional assistance. If I don't hear back from you by the end of today, I'll go ahead and close this conversation. You can always start a new chat if you need help later!"*
6. ✅ Snoozes until **next day** (additional ~24 hours, total ~48 hours)
7. ✅ After ~72 hours total: If customer still doesn't respond, automatically closes the conversation

### ⚠️ Important Notes:
- **Total Time**: ~72 hours (3 days) before auto-closure
- **No Hard Limit**: This category has no maximum limit
- **Best Practice**: The workflow automatically sends both follow-up messages for you
- **Workflow Cancels**: If customer responds at any point during the snooze periods, workflow ends
- **Use When**: Issue is unresolved and you need customer input to proceed

### Example Scenarios:
- ❓ Asked for logs/screenshots → Customer hasn't provided them
- ❓ Need account details → Customer hasn't responded
- ❓ Asked clarifying questions → Customer is unresponsive
- ❓ Waiting for customer to test → Customer hasn't confirmed testing

---

## 🚫 What NOT to Snooze

### Don't Snooze For:
- **Quick questions** you can answer immediately
- **Simple requests** that take <5 minutes
- **Conversations you're actively working on**
- **Issues you can resolve right now**

### Instead:
- **Answer immediately** if it takes <5 minutes
- **Keep open** if you're actively working on it
- **Close** if fully resolved

---

## 📊 Compliance Targets

### Your Daily Goals:
- **Open Chats**: 0 (Ideal) or ≤5 (Soft Limit)
- **Actionable Snoozed** (Waiting on TSE): ≤5 (Soft Limit)
- **Customer Wait** (Resolved + Unresolved): No limit

### Alert Thresholds:
- ⚠️ **6+ Open Chats** → Manager alert triggered
- ⚠️ **7+ Actionable Snoozed** → Manager alert triggered

---

## 🎯 Quick Decision Tree

```
Is the issue resolved?
├─ YES → Use "Waiting on Customer - Resolved [24hr Auto-close]"
│         (Sends check-in, auto-closes after 24 hours)
│
└─ NO → Do you need customer input?
        ├─ YES → Use "Waiting on Customer - Unresolved [72hr Auto-close]"
        │         (Sends 2 follow-ups, auto-closes after ~72 hours)
        │
        └─ NO → Do you need internal help/investigation?
                └─ YES → Use "Waiting on TSE - Deep Dive [48hr Auto-reassign]"
                          (Sends warning after 23hr, reassigns after 24hr)
```

---

## 💡 Pro Tips

1. **Always add context**: Include a brief internal note explaining why you're snoozing
2. **Set expectations**: Let the customer know when you'll follow up
3. **Check your queue**: Review snoozed chats regularly to avoid hitting limits
4. **Use the right tag**: Wrong tags = wrong automation = missed follow-ups
5. **Don't abuse snoozes**: Only snooze when necessary, not to avoid work

---

## 🔄 Workflow Access

1. Open the conversation in Intercom
2. Click the **Trigger Reusable Workflow** icon (⌘K shortcut or click the workflow icon)
3. Select the appropriate snooze workflow:
   - 🟡 **Snooze - Waiting On TSE - Deep Dive [48hr Auto-reassign]**
   - 🟢 **Snooze - Waiting On Customer - Resolved [24hr Auto-close]**
   - 🟠 **Snooze - Waiting On Customer - Unresolved [72hr Auto-close]**
4. The workflow automatically:
   - Removes old snooze tags
   - Applies the correct new tag
   - Sends appropriate messages (check-ins/warnings)
   - Sets snooze duration
   - Handles reassignment/closure after the time period

---

**Remember**: The right tag = The right automation = Better queue health! 🎯
