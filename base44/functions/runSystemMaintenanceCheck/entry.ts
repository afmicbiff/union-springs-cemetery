import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

function getSeverity(issues) {
  if (issues.some((issue) => issue.severity === 'critical')) return 'critical';
  if (issues.some((issue) => issue.severity === 'high')) return 'high';
  if (issues.some((issue) => issue.severity === 'medium')) return 'medium';
  if (issues.some((issue) => issue.severity === 'low')) return 'low';
  return 'info';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const user = await base44.auth.me().catch(() => null);

    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const since24h = now.getTime() - (24 * 60 * 60 * 1000);

    const [webVitals, securityEvents, issueLogs, blockedIps] = await Promise.all([
      base44.asServiceRole.entities.WebVital.list('-created_date', 200).catch(() => []),
      base44.asServiceRole.entities.SecurityEvent.list('-created_date', 200).catch(() => []),
      base44.asServiceRole.entities.SystemIssueLog.list('-updated_date', 100).catch(() => []),
      base44.asServiceRole.entities.BlockedIP.filter({ active: true }, '-updated_date', 200).catch(() => [])
    ]);

    const poorVitals = (webVitals || []).filter((item) => {
      const ts = new Date(item.timestamp || item.created_date || 0).getTime();
      return ts >= since24h && item.rating === 'poor';
    });

    const criticalSecurityEvents = (securityEvents || []).filter((item) => {
      const ts = new Date(item.created_date || 0).getTime();
      return ts >= since24h && ['high', 'critical'].includes(item.severity);
    });

    const recentRuntimeIssues = (issueLogs || []).filter((item) => {
      const ts = new Date(item.last_seen_at || item.detected_at || item.created_date || 0).getTime();
      return ts >= since24h && ['client_runtime_error', 'unhandled_rejection'].includes(item.category);
    });

    const expiredBlocks = (blockedIps || []).filter((item) => {
      const blockedUntil = new Date(item.blocked_until || 0).getTime();
      return item.active === true && Number.isFinite(blockedUntil) && blockedUntil < now.getTime();
    }).slice(0, 100);

    await Promise.all(expiredBlocks.map((item) => base44.asServiceRole.entities.BlockedIP.update(item.id, { active: false })));

    const issues = [];
    if (poorVitals.length >= 3) {
      issues.push({ severity: 'medium', label: 'Poor web vitals', count: poorVitals.length });
    }
    if (criticalSecurityEvents.length > 0) {
      issues.push({ severity: 'high', label: 'High severity security events', count: criticalSecurityEvents.length });
    }
    if (recentRuntimeIssues.length > 0) {
      issues.push({ severity: 'high', label: 'Client runtime issues', count: recentRuntimeIssues.length });
    }

    const fixActions = [];
    if (expiredBlocks.length > 0) {
      fixActions.push(`Disabled ${expiredBlocks.length} expired blocked IP records.`);
    }

    const summary = issues.length > 0
      ? `Maintenance found ${issues.length} issue group(s) and applied ${fixActions.length} automated fix(es).`
      : `Maintenance completed with no critical issues detected${fixActions.length > 0 ? ` and ${fixActions.length} automated fix(es)` : ''}.`;

    const reportLines = [
      `Run time: ${nowIso}`,
      `Run mode: ${payload?.manual === true ? 'manual' : 'scheduled'}`,
      `Poor vitals in last 24h: ${poorVitals.length}`,
      `High/critical security events in last 24h: ${criticalSecurityEvents.length}`,
      `Client runtime issues in last 24h: ${recentRuntimeIssues.length}`,
      `Expired blocked IPs auto-fixed: ${expiredBlocks.length}`,
      '',
      'Detected issues:'
    ];

    if (issues.length === 0) {
      reportLines.push('- None');
    } else {
      issues.forEach((issue) => reportLines.push(`- ${issue.label}: ${issue.count}`));
    }

    reportLines.push('', 'Automated fixes:');
    if (fixActions.length === 0) {
      reportLines.push('- None applied');
    } else {
      fixActions.forEach((action) => reportLines.push(`- ${action}`));
    }

    const severity = getSeverity(issues);
    const status = fixActions.length > 0 ? 'auto_fixed' : (issues.length > 0 ? 'monitored' : 'resolved');

    const logRecord = await base44.asServiceRole.entities.SystemIssueLog.create({
      title: payload?.manual === true ? 'Manual system maintenance check' : 'Nightly system maintenance check',
      summary,
      category: 'maintenance_report',
      source: 'maintenance',
      severity,
      status,
      fingerprint: `maintenance_${now.toISOString().slice(0, 10)}_${payload?.manual === true ? 'manual' : 'scheduled'}`,
      route: '/SecurityDashboard',
      occurrence_count: 1,
      detected_at: nowIso,
      last_seen_at: nowIso,
      resolved_at: issues.length === 0 ? nowIso : null,
      auto_fix_applied: fixActions.length > 0,
      auto_fix_summary: fixActions.join(' '),
      notification_sent: issues.length > 0 || fixActions.length > 0,
      report: reportLines.join('\n'),
      details: {
        manual: payload?.manual === true,
        issues,
        fix_actions: fixActions,
        stats: {
          poor_vitals: poorVitals.length,
          security_events: criticalSecurityEvents.length,
          runtime_issues: recentRuntimeIssues.length,
          expired_blocks_fixed: expiredBlocks.length
        }
      }
    });

    let notificationId = null;
    if (issues.length > 0 || fixActions.length > 0) {
      const notification = await base44.asServiceRole.entities.Notification.create({
        message: summary,
        type: issues.length > 0 ? 'alert' : 'info',
        is_read: false,
        user_email: null,
        related_entity_id: logRecord.id,
        related_entity_type: 'other',
        link: '/SecurityDashboard',
        created_at: nowIso
      }).catch(() => null);
      notificationId = notification?.id || null;
    }

    return Response.json({
      success: true,
      log_id: logRecord.id,
      notification_id: notificationId,
      issues_found: issues.length,
      fixes_applied: fixActions.length,
      stats: {
        poor_vitals: poorVitals.length,
        security_events: criticalSecurityEvents.length,
        runtime_issues: recentRuntimeIssues.length,
        expired_blocks_fixed: expiredBlocks.length
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});