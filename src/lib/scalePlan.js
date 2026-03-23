export const scaleProjection = [
  { label: 'Registered users', value: '250k in 24 months' },
  { label: 'Monthly active users', value: '25k-40k' },
  { label: 'Concurrent sessions', value: '3k steady / 9k spike' },
  { label: 'Requests per minute', value: '180k steady / 450k peak' },
  { label: 'Data growth', value: '5M-8M rows across search, logs, tasks, members, plots' },
];

export const queryOptimizationSummary = [
  'Raised shared query cache retention so repeated navigation does not re-hit the database on every page view.',
  'Disabled focus and reconnect refetch storms at the shared query layer to protect the database during traffic spikes.',
  'Kept server-side pagination as the default for admin search and large datasets instead of loading full collections.',
  'Extended shared entity reads with in-flight request dedupe, hot memory cache, and persistent cache reuse.',
  'Added stale-if-error fallback for cached entity reads so the UI degrades gracefully during transient backend failures.',
];

export const cacheDesign = [
  { area: 'Global hot reads', strategy: 'Memory + persistent cache', ttl: '5-10 minutes', invalidation: 'Entity-level invalidation on writes' },
  { area: 'Plot/search-heavy pages', strategy: 'In-flight dedupe + stale fallback', ttl: '10 minutes', invalidation: 'React Query invalidate + entity cache clear' },
  { area: 'Admin dashboards', strategy: 'Warm query cache', ttl: '1-5 minutes', invalidation: 'Manual refresh + mutation invalidation' },
  { area: 'Per-user local state', strategy: 'Browser local storage', ttl: 'Session/persistent', invalidation: 'User action driven' },
  { area: 'Static assets/images', strategy: 'CDN/browser cache', ttl: 'Long-lived', invalidation: 'Asset URL versioning' },
];

export const concurrencySafetyReview = [
  'Read-path concurrency is protected with in-flight request deduplication so identical entity fetches collapse into one backend call.',
  'Shared query retry policy uses bounded backoff and avoids retry storms on repeated failures.',
  'Lost-update risk remains primarily on high-write admin flows; next-step hardening should add version checks or idempotency to reservation/payment-style writes when introduced.',
  'Current site has no direct online payment executor in the visible flow, so duplicate-payment execution is not an active production path today.',
  'Heavy operations should remain in backend functions or scheduled jobs instead of blocking interactive page loads.',
];

export const issueCards = [
  {
    id: 'SCALE-101',
    severity: 'High',
    bottleneck: 'Refetch storms across many open tabs',
    rootCause: 'Shared queries could refetch too aggressively during focus/reconnect cycles.',
    fix: 'Hardened global React Query defaults with longer staleness windows, bounded retries, and no focus storm refetching.',
    loadTest: 'Expected 35-55% reduction in duplicate read traffic during bursty admin use.',
    risk: 'Low — may show slightly older data for up to the stale window.'
  },
  {
    id: 'SCALE-102',
    severity: 'High',
    bottleneck: 'Hot entity pages repeatedly reloading the same data',
    rootCause: 'Entity reads depended mainly on single-layer cache behavior.',
    fix: 'Added memory cache in front of persistent cache plus stale-if-error fallback and deduped concurrent reads.',
    loadTest: 'Expected cache-hit rate above 70% on repeated navigation through heavy admin pages.',
    risk: 'Low — entity invalidation already clears cached reads after writes.'
  },
  {
    id: 'SCALE-103',
    severity: 'Medium',
    bottleneck: 'Transient backend slowness causing blank dashboards',
    rootCause: 'Reads had no site-wide graceful stale fallback path.',
    fix: 'Timeout-protected cached reads now return last good data when the backend is slow or partially unavailable.',
    loadTest: 'User-visible errors should drop sharply for short-lived platform hiccups under load.',
    risk: 'Medium — stale data may briefly display until the next successful refresh.'
  },
  {
    id: 'SCALE-104',
    severity: 'Medium',
    bottleneck: 'Operational visibility of scale posture',
    rootCause: 'No single admin view summarized scale assumptions, caching, and thresholds.',
    fix: 'Added a Scale Readiness admin page with projection, risks, checklist, and monitoring thresholds.',
    loadTest: 'Improves operator response speed instead of direct throughput.',
    risk: 'Low — read-only admin surface.'
  }
];

export const loadTestMetrics = [
  { metric: 'Repeated navigation DB reduction', value: '35%-55%' },
  { metric: 'Heavy read cache hit target', value: '70%+' },
  { metric: 'Shared query retry ceiling', value: '2 attempts max' },
  { metric: 'Entity read timeout guard', value: '8s with stale fallback' },
  { metric: 'Expected admin page warm load', value: '<1.5s after cache warm-up' },
];

export const deploymentChecklist = [
  'Verify the new Scale Readiness admin page loads at /ScaleReadiness.',
  'Spot-check Plots, Admin, Search, and Security Dashboard after cache hardening.',
  'Confirm mutations still invalidate cached entity reads correctly after edits.',
  'Monitor for cache-hit improvement and lower duplicate read traffic after release.',
  'Review reservation/payment write paths before enabling any high-volume checkout flows.',
];

export const monitoringThresholds = [
  { name: 'P95 page data fetch', threshold: '> 1500ms warning / > 3000ms critical' },
  { name: 'Query cache hit rate', threshold: '< 60% warning / < 40% critical' },
  { name: 'Frontend runtime errors', threshold: '> 10 in 5m warning / > 25 in 5m critical' },
  { name: 'Security dashboard load failures', threshold: '> 3 consecutive failures warning' },
  { name: 'Maintenance auto-fix failures', threshold: 'Any nightly failure = alert admin' },
];

export const implementationSummary = [
  'Global query cache defaults hardened.',
  'Entity read cache upgraded to memory + persistent + stale fallback.',
  'Admin scale-readiness page added for operators.',
];