import React, { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileJson, FileText, FileCode, ChevronDown, Loader2 } from 'lucide-react';

// CEF helpers
const cefSeverity = (s) => ({ info:1, low:3, medium:5, high:8, critical:10 }[s] ?? 1);
const cefEscape = (v) => String(v ?? '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/=/g, '\\=').replace(/\n/g, ' ');
const cefHeaderEscape = (v) => String(v ?? '').replace(/\|/g, ' ').replace(/\n/g, ' ');

// Syslog helpers
const syslogSeverityCode = (s) => ({ critical:2, high:3, medium:4, low:5, info:6 }[s] ?? 6);
const sdValueEscape = (v) => String(v ?? '').replace(/\\/g, '\\\\').replace(/\]/g, '\\]').replace(/\"/g, '\\"');
const syslogEscape = (v) => String(v ?? '').replace(/\n/g, ' ');

function ExportDropdown({ events = [] }) {
  const [exporting, setExporting] = React.useState(false);

  const downloadBlob = useCallback((content, filename, type) => {
    // Use requestIdleCallback for non-blocking export
    const doDownload = () => {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Delay cleanup to ensure download starts
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExporting(false);
    };
    
    setExporting(true);
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(doDownload, { timeout: 500 });
    } else {
      setTimeout(doDownload, 10);
    }
  }, []);

  const exportJSON = useCallback(() => {
    const data = events.map(e => ({
      id: e.id,
      created_date: e.created_date,
      event_type: e.event_type,
      severity: e.severity,
      message: e.message,
      ip_address: e.ip_address || null,
      user_agent: e.user_agent || null,
      route: e.route || null,
      user_email: e.user_email || null,
      details: e.details || {}
    }));
    downloadBlob(JSON.stringify(data, null, 2), 'security_events.json', 'application/json');
  }, [events, downloadBlob]);

  const exportCSV = useCallback(() => {
    const headers = ['id','created_date','event_type','severity','message','ip_address','user_agent','route','user_email','details'];
    const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const lines = [headers.map(esc).join(',')];
    events.forEach(e => {
      lines.push([
        e.id, e.created_date, e.event_type, e.severity, e.message,
        e.ip_address || '', e.user_agent || '', e.route || '', e.user_email || '',
        JSON.stringify(e.details || {})
      ].map(esc).join(','));
    });
    downloadBlob(lines.join('\n'), 'security_events.csv', 'text/csv;charset=utf-8;');
  }, [events, downloadBlob]);

  const exportCEF = useCallback(() => {
    const lines = events.map(e => {
      const ext = [];
      if (e.ip_address) ext.push(`src=${cefEscape(e.ip_address)}`);
      if (e.route) ext.push(`request=${cefEscape(e.route)}`);
      if (e.user_agent) ext.push(`requestClientApplication=${cefEscape(e.user_agent)}`);
      if (e.user_email) ext.push(`suser=${cefEscape(e.user_email)}`);
      if (e.message) ext.push(`msg=${cefEscape(e.message)}`);
      ext.push(`externalId=${cefEscape(e.id)}`);
      ext.push(`rt=${new Date(e.created_date).getTime()}`);
      return `CEF:0|Base44|SecurityDashboard|1.0|${cefHeaderEscape(e.event_type)}|${cefHeaderEscape(e.message || e.event_type)}|${cefSeverity(e.severity)}|${ext.join(' ')}`;
    });
    downloadBlob(lines.join('\n'), 'security_events.cef', 'text/plain');
  }, [events, downloadBlob]);

  const exportSyslog = useCallback(() => {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const lines = events.map(e => {
      const ts = new Date(e.created_date).toISOString();
      const prival = 16 * 8 + syslogSeverityCode(e.severity);
      const msgid = (e.event_type || 'event').toUpperCase();
      const sd = [
        `event_id="${sdValueEscape(e.id)}"`,
        e.ip_address ? `ip="${sdValueEscape(e.ip_address)}"` : null,
        e.route ? `route="${sdValueEscape(e.route)}"` : null,
        e.user_email ? `user="${sdValueEscape(e.user_email)}"` : null,
        `severity="${sdValueEscape(e.severity)}"`
      ].filter(Boolean).join(' ');
      return `<${prival}>1 ${ts} ${host} SecurityDashboard - ${msgid} [base44@41058 ${sd}] ${syslogEscape(e.message || '')}`;
    });
    downloadBlob(lines.join('\n'), 'security_events.syslog', 'text/plain');
  }, [events, downloadBlob]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 sm:h-8 text-[10px] sm:text-xs gap-1" disabled={exporting || events.length === 0}>
          {exporting ? (
            <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />
          ) : (
            <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          )}
          <span className="hidden sm:inline">{exporting ? 'Exporting…' : 'Export'}</span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportJSON} className="text-xs cursor-pointer">
          <FileJson className="w-3.5 h-3.5 mr-2" /> JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportCSV} className="text-xs cursor-pointer">
          <FileText className="w-3.5 h-3.5 mr-2" /> CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportCEF} className="text-xs cursor-pointer">
          <FileCode className="w-3.5 h-3.5 mr-2" /> CEF (SIEM)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportSyslog} className="text-xs cursor-pointer">
          <FileCode className="w-3.5 h-3.5 mr-2" /> Syslog
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default memo(ExportDropdown);