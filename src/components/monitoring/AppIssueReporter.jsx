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
    const path = `${window.location.pathname}${window.location.search}`;

    const handleRuntimeIssue = (category, message, stack, details = {}) => {
      const isChunkError = RECOVERABLE_CHUNK_ERROR.test(message);
      const payload = {
        category,
        severity: isChunkError ? 'high' : 'medium',
        route: `${window.location.pathname}${window.location.search}`,
        summary: trim(message || 'Unknown app issue'),
        stack: trim(stack, 6000),
        user_agent: navigator.userAgent,
        auto_fix_attempted: false,
        auto_fix_summary: isChunkError ? 'Recovery handled by lazyWithRetry + ChunkErrorBoundary.' : '',
        details
      };

      // Report only — do NOT reload here. The lazyWithRetry wrapper and
      // ChunkErrorBoundary handle recovery to prevent competing reloads.
      sendIssue(payload);
    };

    const onError = (event) => {
      const message = trim(event?.error?.message || event?.message || 'Unknown runtime error');
      const stack = trim(event?.error?.stack || `${event?.filename || ''}:${event?.lineno || ''}:${event?.colno || ''}`, 6000);
      if (message.includes('Authentication required to view users') || message.includes('No storage available for session')) return;
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
      if (message.includes('Authentication required to view users') || message.includes('No storage available for session')) return;
      handleRuntimeIssue('unhandled_rejection', message, stack, { path });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, [sendIssue]);

  return null;
}