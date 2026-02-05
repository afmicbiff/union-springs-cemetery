import React, { useMemo, memo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronUp, Zap, Smartphone, Shield, Database, Code, Clock } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Production Readiness Audit Checks - Updated 2026-02-05-v2
const AUDIT_CHECKS = [
  // Performance - Mobile Speed
  { id: "lazy-load", category: "Performance", severity: "info", title: "Code Splitting", description: "webpackChunkName groups, priority-based loading", status: "pass" },
  { id: "memo-components", category: "Performance", severity: "info", title: "Memoized Components", description: "All major components use React.memo", status: "pass" },
  { id: "query-cache", category: "Performance", severity: "info", title: "Query Caching", description: "staleTime, gcTime, structuralSharing configured", status: "pass" },
  { id: "image-optimize", category: "Performance", severity: "info", title: "Image Optimization", description: "WebP with fallback, responsive srcSet, sizes", status: "pass" },
  { id: "resource-hints", category: "Performance", severity: "info", title: "Resource Hints", description: "preconnect, dns-prefetch for external domains", status: "pass" },
  { id: "critical-css", category: "Performance", severity: "info", title: "Critical CSS", description: "Inlined critical styles for fast FCP", status: "pass" },
  { id: "content-visibility", category: "Performance", severity: "info", title: "Content Visibility", description: "contentVisibility: auto on sections", status: "pass" },
  
  // Mobile Responsiveness
  { id: "responsive-images", category: "Mobile", severity: "info", title: "Responsive Images", description: "320w/640w/1024w srcSet breakpoints", status: "pass" },
  { id: "touch-targets", category: "Mobile", severity: "info", title: "Touch Targets", description: "min-h-[44px], touch-manipulation", status: "pass" },
  { id: "mobile-shadows", category: "Mobile", severity: "info", title: "Mobile Shadows", description: "Reduced shadow complexity on mobile", status: "pass" },
  { id: "viewport-units", category: "Mobile", severity: "info", title: "Safe Viewport", description: "max-h-[90vh] overflow-y-auto", status: "pass" },
  { id: "mobile-transitions", category: "Mobile", severity: "info", title: "Mobile Transitions", description: "Optimized transition properties", status: "pass" },
  { id: "reduced-motion", category: "Mobile", severity: "info", title: "Reduced Motion", description: "prefers-reduced-motion support", status: "pass" },
  
  // Security
  { id: "admin-auth", category: "Security", severity: "critical", title: "Admin Auth Guard", description: "try/catch with redirect on failure", status: "pass" },
  { id: "rls-entities", category: "Security", severity: "critical", title: "Row Level Security", description: "RLS rules on all entities", status: "pass" },
  { id: "input-validation", category: "Security", severity: "info", title: "Input Validation", description: "required, minLength, maxLength", status: "pass" },
  { id: "xss-prevention", category: "Security", severity: "info", title: "XSS Prevention", description: "React escaping, no dangerouslySetInnerHTML", status: "pass" },
  
  // Data Integrity
  { id: "error-boundaries", category: "Data", severity: "info", title: "Error Boundaries", description: "CardErrorBoundary on lazy components", status: "pass" },
  { id: "loading-states", category: "Data", severity: "info", title: "Loading States", description: "Loader2 spinner, isPending checks", status: "pass" },
  { id: "aspect-ratio", category: "Data", severity: "info", title: "Layout Stability", description: "aspectRatio on images prevents CLS", status: "pass" },
  { id: "safe-dates", category: "Data", severity: "info", title: "Safe Date Parsing", description: "isValid() checks throughout", status: "pass" },
  
  // Code Quality
  { id: "chunk-naming", category: "Code", severity: "info", title: "Chunk Naming", description: "webpackChunkName for caching", status: "pass" },
  { id: "useCallback-hooks", category: "Code", severity: "info", title: "useCallback Usage", description: "Event handlers memoized", status: "pass" },
  { id: "useMemo-hooks", category: "Code", severity: "info", title: "useMemo Usage", description: "Computed values memoized", status: "pass" },
  
  // Production Readiness
  { id: "cache-headers", category: "Production", severity: "info", title: "Cache Headers", description: "no-cache meta tags", status: "pass" },
  { id: "gpu-scroll", category: "Production", severity: "info", title: "GPU Scrolling", description: "-webkit-overflow-scrolling: touch", status: "pass" },
  { id: "hidden-scrollbar", category: "Production", severity: "info", title: "Hidden Scrollbar", description: "scrollbar-hide class utility", status: "pass" },
  { id: "third-party-block", category: "Production", severity: "info", title: "Third-Party Block", description: "Plots page blocks trackers", status: "pass" },
];

const severityConfig = {
  critical: { icon: XCircle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  info: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
};

const categoryIcons = {
  Performance: Zap,
  Mobile: Smartphone,
  Security: Shield,
  Data: Database,
  Code: Code,
  Production: Clock,
};

const AuditItem = memo(({ check }) => {
  const config = severityConfig[check.severity];
  const Icon = config.icon;
  
  return (
    <div className={`flex items-start gap-2 p-2 rounded-md ${check.status === 'pass' ? 'bg-green-50/50' : check.status === 'review' ? 'bg-amber-50/50' : 'bg-red-50/50'}`}>
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${check.status === 'pass' ? 'text-green-600' : check.status === 'review' ? 'text-amber-600' : 'text-red-600'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-xs text-stone-800">{check.title}</span>
          <Badge variant="outline" className={`text-[9px] h-4 px-1 ${check.status === 'pass' ? 'bg-green-100 text-green-700' : check.status === 'review' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
            {check.status === 'pass' ? 'PASS' : check.status === 'review' ? 'REVIEW' : 'FAIL'}
          </Badge>
        </div>
        <p className="text-[10px] text-stone-500 mt-0.5">{check.description}</p>
      </div>
    </div>
  );
});

const CategorySection = memo(({ category, checks }) => {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = categoryIcons[category] || Code;
  
  const stats = useMemo(() => ({
    pass: checks.filter(c => c.status === 'pass').length,
    review: checks.filter(c => c.status === 'review').length,
    fail: checks.filter(c => c.status === 'fail').length,
    total: checks.length,
  }), [checks]);
  
  const hasIssues = stats.review > 0 || stats.fail > 0;
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className={`w-full flex items-center justify-between p-2 rounded-md hover:bg-stone-50 transition-colors ${hasIssues ? 'bg-amber-50/30' : ''}`}>
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-stone-500" />
            <span className="font-medium text-sm text-stone-800">{category}</span>
            <Badge variant="outline" className="text-[9px] h-4">
              {stats.pass}/{stats.total}
            </Badge>
            {stats.review > 0 && <Badge className="text-[9px] h-4 bg-amber-100 text-amber-700 border-amber-200">{stats.review} review</Badge>}
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-1 pl-6 pt-2">
          {checks.map(check => <AuditItem key={check.id} check={check} />)}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});

const OverviewRedlinesCard = memo(function OverviewRedlinesCard() {
  const [expanded, setExpanded] = useState(false);
  
  const { byCategory, summary } = useMemo(() => {
    const grouped = AUDIT_CHECKS.reduce((acc, check) => {
      if (!acc[check.category]) acc[check.category] = [];
      acc[check.category].push(check);
      return acc;
    }, {});
    
    const sum = {
      total: AUDIT_CHECKS.length,
      pass: AUDIT_CHECKS.filter(c => c.status === 'pass').length,
      review: AUDIT_CHECKS.filter(c => c.status === 'review').length,
      fail: AUDIT_CHECKS.filter(c => c.status === 'fail').length,
    };
    sum.score = Math.round((sum.pass / sum.total) * 100);
    
    return { byCategory: grouped, summary: sum };
  }, []);
  
  const scoreColor = summary.score >= 90 ? 'text-green-600' : summary.score >= 70 ? 'text-amber-600' : 'text-red-600';
  
  return (
    <Card className="border-stone-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-stone-500" />
              Production Readiness
            </CardTitle>
            <CardDescription className="text-xs">Mobile speed & code audit</CardDescription>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${scoreColor}`}>{summary.score}%</div>
            <div className="text-[10px] text-stone-500">{summary.pass}/{summary.total} checks</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-green-50 rounded-md p-2 text-center">
            <div className="text-lg font-bold text-green-700">{summary.pass}</div>
            <div className="text-[10px] text-green-600">Passed</div>
          </div>
          <div className="bg-amber-50 rounded-md p-2 text-center">
            <div className="text-lg font-bold text-amber-700">{summary.review}</div>
            <div className="text-[10px] text-amber-600">Review</div>
          </div>
          <div className="bg-red-50 rounded-md p-2 text-center">
            <div className="text-lg font-bold text-red-700">{summary.fail}</div>
            <div className="text-[10px] text-red-600">Failed</div>
          </div>
        </div>
        
        {/* Categories */}
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full h-7 text-xs">
              {expanded ? 'Hide Details' : 'View All Checks'}
              {expanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-1 mt-3 max-h-[400px] overflow-y-auto">
              {Object.entries(byCategory).map(([category, checks]) => (
                <CategorySection key={category} category={category} checks={checks} />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
        
        {/* Action Items */}
        {summary.review > 0 && (
          <div className="mt-3 p-2 bg-amber-50 rounded-md border border-amber-200">
            <div className="text-xs font-medium text-amber-800 mb-1">Action Items:</div>
            <ul className="text-[10px] text-amber-700 space-y-0.5 list-disc list-inside">
              {AUDIT_CHECKS.filter(c => c.status === 'review').map(c => (
                <li key={c.id}>{c.title}: {c.description}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default OverviewRedlinesCard;