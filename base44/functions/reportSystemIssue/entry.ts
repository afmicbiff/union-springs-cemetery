import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const ALLOWED_CATEGORIES = new Set([
  'client_runtime_error',
  'unhandled_rejection',
  'maintenance_report',
  'performance_regression',
  'security_alert',
  'system_issue'
]);
const ALLOWED_SEVERITIES = new Set(['info', 'low', 'medium', 'high', 'critical']);
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 20;
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

function trimString(value, max = 1000) {
  return String(value || '').trim().slice(0, max);
}

function toSafeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function makeFingerprint(input) {
  const raw = `${input.category}|${input.route}|${input.summary}`.toLowerCase().slice(0, 600);
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash |= 0;
  }
  return `iss_${Math.abs(hash)}`;
}

function getShortTitle(category, summary) {
  const titles = {
    client_runtime_error: 'Client runtime error',
    unhandled_rejection: 'Unhandled promise rejection',
    performance_regression: 'Performance regression',
    security_alert: 'Security alert',
    maintenance_report: 'Maintenance report',
    system_issue: 'System issue'
  };
  return trimString(summary || titles[category] || 'System issue', 120);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const nowIso = new Date().toISOString();
    const user = await base44.auth.me().catch(() => null);
    const sourceIp = trimString(req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || '', 120).split(',')[0].trim();

    const category = ALLOWED_CATEGORIES.has(payload?.category) ? payload.category : 'system_issue';
    const severity = ALLOWED_SEVERITIES.has(payload?.severity) ? payload.severity : 'medium';
    const summary = trimString(payload?.summary || payload?.message, 1200);
    const route = trimString(payload?.route, 250);
    const stack = trimString(payload?.stack, 6000);
    const autoFixAttempted = payload?.auto_fix_attempted === true;
    const autoFixSummary = trimString(payload?.auto_fix_summary || payload?.auto_fix_action, 600);
    const details = {
      ...toSafeObject(payload?.details),
      source_ip: sourceIp || null,
      user_agent: trimString(payload?.user_agent || req.headers.get('user-agent'), 500),
      user_email: user?.email || null,
      stack: stack || null,
      metadata: toSafeObject(payload?.metadata)
    };

    if (!summary) {
      return Response.json({ error: 'summary is required' }, { status: 400 });
    }

    const recentLogs = await base44.asServiceRole.entities.SystemIssueLog.list('-updated_date', 50);
    const recentWindow = Date.now() - RATE_LIMIT_WINDOW_MS;
    const recentFromIp = (recentLogs || []).filter((log) => {
      const detectedAt = new Date(log.last_seen_at || log.detected_at || log.created_date || 0).getTime();
      return details.source_ip && log?.details?.source_ip === details.source_ip && detectedAt >= recentWindow;
    });

    if (recentFromIp.length >= RATE_LIMIT_MAX) {
      return Response.json({ error: 'rate_limited' }, { status: 429 });
    }

    const fingerprint = makeFingerprint({ category, route, summary });
    const fingerprintMatches = await base44.asServiceRole.entities.SystemIssueLog.filter({ fingerprint }, '-updated_date', 5);
    const recentMatch = (fingerprintMatches || []).find((log) => {
      const lastSeen = new Date(log.last_seen_at || log.detected_at || log.created_date || 0).getTime();
      return Number.isFinite(lastSeen) && (Date.now() - lastSeen) <= DEDUPE_WINDOW_MS;
    });

    let logRecord = null;
    let created = false;

    if (recentMatch?.id) {
      logRecord = await base44.asServiceRole.entities.SystemIssueLog.update(recentMatch.id, {
        occurrence_count: Number(recentMatch.occurrence_count || 1) + 1,
        last_seen_at: nowIso,
        severity,
        status: recentMatch.status === 'auto_fixed' || autoFixAttempted ? 'auto_fixed' : recentMatch.status || 'detected',
        auto_fix_applied: recentMatch.auto_fix_applied === true || autoFixAttempted,
        auto_fix_summary: trimString([recentMatch.auto_fix_summary, autoFixSummary].filter(Boolean).join(' | '), 600),
        details: {
          ...(recentMatch.details || {}),
          ...details
        }
      });
    } else {
      created = true;
      logRecord = await base44.asServiceRole.entities.SystemIssueLog.create({
        title: getShortTitle(category, summary),
        summary,
        category,
        source: 'client',
        severity,
        status: autoFixAttempted ? 'auto_fixed' : 'detected',
        fingerprint,
        route,
        occurrence_count: 1,
        detected_at: nowIso,
        last_seen_at: nowIso,
        resolved_at: null,
        auto_fix_applied: autoFixAttempted,
        auto_fix_summary: autoFixSummary,
        notification_sent: false,
        report: '',
        details
      });
    }

    let notificationId = null;
    if (created && logRecord?.id) {
      const notification = await base44.asServiceRole.entities.Notification.create({
        message: `App issue detected: ${trimString(summary, 140)}`,
        type: severity === 'high' || severity === 'critical' ? 'alert' : 'info',
        is_read: false,
        user_email: null,
        related_entity_id: logRecord.id,
        related_entity_type: 'other',
        link: '/SecurityDashboard',
        created_at: nowIso
      }).catch(() => null);
      notificationId = notification?.id || null;

      await base44.asServiceRole.entities.SystemIssueLog.update(logRecord.id, {
        notification_sent: !!notificationId,
        details: {
          ...(logRecord.details || {}),
          notification_id: notificationId
        }
      }).catch(() => null);

      await base44.asServiceRole.entities.SecurityEvent.create({
        event_type: 'app_issue_detected',
        severity: severity === 'info' ? 'low' : severity,
        message: trimString(summary, 240),
        ip_address: sourceIp || null,
        user_agent: details.user_agent || null,
        route: route || null,
        user_email: user?.email || null,
        details: {
          category,
          system_issue_log_id: logRecord.id,
          auto_fix_attempted: autoFixAttempted
        }
      }).catch(() => null);
    }

    return Response.json({
      success: true,
      created,
      deduped: !created,
      log_id: logRecord?.id || recentMatch?.id || null,
      notification_id: notificationId,
      auto_fix_applied: autoFixAttempted
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});