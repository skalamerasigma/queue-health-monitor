# Queue Health Monitor Rollout - Presentation Summary

## What's Changing?

### New Dashboard Tool
- **Real-time queue health visibility** for all TSEs with color-coded compliance status
- **Live metrics**: Open chats, snoozed conversations, waiting times, compliance rates
- **Historical analytics**: Trends, patterns, and compliance tracking over time
- **Response time tracking**: Monitor conversations with 10+ minute response times
- **Automated alerts**: Notifications when thresholds are exceeded (6+ open, 7+ actionable snoozed)

### Standardized Snooze Workflows (Intercom)
Three automated workflows replace manual snoozing:

1. **🟡 Waiting on TSE - Deep Dive [48hr Auto-reassign]**
   - For investigations, bug filing, internal consultations
   - Auto-reassigns to Resolution Team after 24 hours if no activity

2. **🟢 Waiting on Customer - Resolved [24hr Auto-close]**
   - For resolved issues waiting on customer confirmation
   - Auto-closes after 24 hours with check-in message

3. **🟠 Waiting on Customer - Unresolved [72hr Auto-close]**
   - For unresolved issues waiting on customer input
   - Auto-closes after 72 hours with follow-up messages

### Automated Tracking
- Daily snapshots captured automatically (3 AM UTC)
- Historical compliance trends tracked and visualized
- Region-based analytics for capacity planning

---

## What We Expect to Achieve

### Immediate Benefits
✅ **Proactive queue management** - Identify issues before they escalate  
✅ **Clear accountability** - Measurable metrics aligned with Support Ops Framework  
✅ **Reduced manual work** - Automated workflows handle follow-ups and closures  
✅ **Better visibility** - Managers and TSEs see real-time status  

### Long-term Goals
📈 **Improved compliance rates** - Target 80%+ TSEs meeting thresholds daily  
📉 **Reduced alert frequency** - Fewer threshold violations over time  
⚡ **Faster response times** - Track and improve <10 minute response rates  
📊 **Data-driven capacity planning** - Use historical trends for resource allocation  
🔄 **Standardized processes** - Consistent use of snooze tags enables better analysis  

### Success Metrics
- **Compliance Rate**: % of TSEs meeting both thresholds (≤5 open AND ≤5 waiting on TSE)
- **Alert Frequency**: Number of threshold violations per day
- **Response Time**: % of conversations with <10 minute first reply
- **Trend Direction**: Overall trend moving toward "improving" status
- **Queue Health**: Average open conversations per TSE trending downward

---

## What We Need from Managers & Team

### From Managers

**Adoption & Support**
- ✅ Encourage team usage - Make dashboard part of daily check-ins
- ✅ Review metrics together - Use data in 1:1s and team meetings
- ✅ Provide feedback - Share what's working and what needs improvement
- ✅ Lead by example - Use dashboard yourself to monitor your region

**Accountability**
- ✅ Hold TSEs accountable - Use compliance metrics in performance discussions
- ✅ Intervene proactively - When alerts trigger, support TSEs before escalation
- ✅ Celebrate improvements - Recognize TSEs showing positive trends

### From TSEs

**Use Snooze Workflows Consistently**
- ✅ Stop manual snoozing - Use the three workflows instead
- ✅ Choose the right workflow - Follow decision tree in cheatsheet
- ✅ Add context - Include internal notes explaining why you're snoozing
- ✅ Check queue regularly - Review snoozed chats to avoid hitting limits

**Daily Self-Monitoring**
- ✅ Check compliance status - Green/Yellow/Red indicator on your card
- ✅ Review your metrics - Open chats, waiting on TSE, waiting on customer
- ✅ Aim for compliance - ≤5 open chats AND ≤5 actionable snoozed
- ✅ Use Conversations View - Filter and prioritize your queue effectively

**Feedback & Communication**
- ✅ Report issues - If workflows aren't working as expected
- ✅ Suggest improvements - What would make dashboard more useful?
- ✅ Ask questions - If unsure about when to use which workflow

---

## Rollout Timeline

### Week 1-2: Adoption Phase
- Everyone uses snooze workflows (no manual snoozing)
- Managers check dashboard daily
- TSEs review their own metrics daily

### Week 3-4: Optimization Phase
- Compliance rates improving
- Fewer alerts triggering
- Workflows becoming routine

### Ongoing: Continuous Improvement
- Regular review of trends and patterns
- Adjust thresholds if needed based on data
- Refine workflows based on feedback

---

## Key Messages

**"We're moving from reactive to proactive queue management"**  
**"This tool provides the visibility we've been missing"**  
**"Automated workflows reduce manual work and ensure consistency"**  
**"The data will help us make better decisions about capacity and performance"**

**This isn't about micromanaging—it's about visibility and support**  
**The workflows automate what we should be doing anyway**  
**The data helps us identify who needs help before it becomes a problem**  
**We'll iterate based on your feedback**

---

## Compliance Targets

### Daily Goals
- **Open Chats**: 0 (Ideal) or ≤5 (Soft Limit)
- **Actionable Snoozed** (Waiting on TSE): ≤5 (Soft Limit)
- **Customer Wait** (Resolved + Unresolved): No limit

### Alert Thresholds
- ⚠️ **6+ Open Chats** → Manager alert triggered
- ⚠️ **7+ Actionable Snoozed** → Manager alert triggered

---

**Dashboard URL**: https://queue-health-monitor.vercel.app  
**Cheatsheet**: Available in team documentation  
**Questions?** Reach out to [Your Name]
