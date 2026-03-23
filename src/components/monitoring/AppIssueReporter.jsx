import React, { useCallback, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const RECOVERABLE_CHUNK_ERROR = /chunkloaderror|loading css chunk|failed to fetch dynamically imported module|dynamically imported/i;
const REPORT_DEDUPE_MS = 30 * 1000;

function trim(value, max = 1200) {
  return String(value || '').trim().slice(0, max);
}

export default function AppIssueReporter() {
  const recentReportsRef = useRef(new Map());

  const shouldSend = useCallback((fingerprint) => {
    const now = Date.now();
    const last = recentReportsRef.current.get(fingerprint) || 0;
    if ((now - last) < REPORT_DEDUPE_MS) return false;
    recentReportsRef.current.set(fingerprint, now);
    return true;
  }, []);

  const sendIssue = useCallback((payload) => {
    const fingerprint = `${payload.category}|${payload.route}|${payload.summary}`;
    if (!shouldSend(fingerprint)) return;
    void base44.functions.invoke('reportSystemIssue', payload).catch(() => null);
  }, [shouldSend]);

  useEffect(() => {
    const recoveryFlag = 'app-issue-reload-attempted';
    const path = `${window.location.pathname}${window.location.search}`;

    const buildReloadUrl = () => {
      const url = new URL(window.location.href);
      url.searchParams.set('recovered', '1');
      url.searchParams.set('v', String(Date.now()));
      return url.toString();
    };

    const handleRuntimeIssue = (category, message, stack, details = {}) => {
      const autoFixAttempted = RECOVERABLE_CHUNK_ERROR.test(message) && !window.sessionStorage.getItem(recoveryFlag);
      const payload = {
        category,
        severity: autoFixAttempted ? 'high' : 'medium',
        route: `${window.location.pathname}${window.location.search}`,
        summary: trim(message || 'Unknown app issue'),
        stack: trim(stack, 6000),
        user_agent: navigator.userAgent,
        auto_fix_attempted: autoFixAttempted,
        auto_fix_summary: autoFixAttempted ? 'Triggered one-time reload recovery for stale client assets.' : '',
        details
      };

      if (autoFixAttempted) {
        window.sessionStorage.setItem(recoveryFlag, String(Date.now()));
        base44.functions.invoke('reportSystemIssue', payload)
          .catch(() => null)
          .finally(() => {
            window.setTimeout(() => {
              window.location.replace(buildReloadUrl());
            }, 150);
          });
        return;
      }

      sendIssue(payload);
    };

    const onError = (event) => {
      const message = trim(event?.error?.message || event?.message || 'Unknown runtime error');
      const stack = trim(event?.error?.stack || `${event?.filename || ''}:${event?.lineno || ''}:${event?.colno || ''}`, 6000);
      handleRuntimeIssue('client_runtime_error', message, stack, {
        filename: trim(event?.filename, 500),
        line: event?.lineno || null,
        column: event?.colno || null,
        path
      });
    };

    const onUnhandledRejection = (event) => {
      const reason = event?.reason;
      const message = trim(reason?.message || reason || 'Unhandled promise rejection');
      const stack = trim(reason?.stack, 6000);
      handleRuntimeIssue('unhandled_rejection', message, stack, { path });
    };

    if (window.location.search.includes('recovered=1')) {
      window.setTimeout(() => {
        window.sessionStorage.removeItem(recoveryFlag);
      }, 30000);
    }

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, [sendIssue]);

  return null;
}