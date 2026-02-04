// Utility to create a warning item
function warn({ category, target, severity = "medium", message, fix }) {
  return { category, target, severity, message, fix };
}

function passItem({ category, target, message }) {
  return { category, target, severity: "pass", message, fix: "None" };
}

// PERFORMANCE CHECKS
export function runPerformanceChecks(pathname = window.location.pathname) {
  const m = {};
  const res = [];

  // Metrics thresholds
  if (typeof m.lcp === "number") {
    if (m.lcp > 2500) res.push(warn({ category: "Performance", target: pathname, severity: "high", message: `LCP is ${Math.round(m.lcp)}ms (slow)`, fix: "Defer non-critical work, optimize hero image, ensure server hints and preconnects." }));
    else res.push(passItem({ category: "Performance", target: pathname, message: `LCP ${Math.round(m.lcp)}ms` }));
  }
  if (typeof m.cls === "number") {
    if (m.cls > 0.1) res.push(warn({ category: "Performance", target: pathname, severity: "high", message: `CLS ${m.cls.toFixed(3)} (layout shifts detected)`, fix: "Reserve space for images/media, avoid injecting content above the fold." }));
    else res.push(passItem({ category: "Performance", target: pathname, message: `CLS ${m.cls.toFixed(3)}` }));
  }
  if (typeof m.inp === "number") {
    if (m.inp > 200) res.push(warn({ category: "Performance", target: pathname, severity: "medium", message: `INP ${Math.round(m.inp)}ms (interaction delay)`, fix: "Reduce main thread work, split long tasks, avoid heavy synchronous code in handlers." }));
    else res.push(passItem({ category: "Performance", target: pathname, message: `INP ${Math.round(m.inp)}ms` }));
  }

  // DOM heuristics
  const imgs = Array.from(document.querySelectorAll('img'));
  const oversized = imgs.filter(img => (img.naturalWidth || 0) > (img.clientWidth * 2));
  if (oversized.length > 0) res.push(warn({ category: "Performance", target: pathname, severity: "medium", message: `${oversized.length} oversized images detected`, fix: "Serve responsive sizes (srcset/sizes) and prefer WebP/AVIF where supported." }));

  const nonDeferScripts = Array.from(document.querySelectorAll('script[src]')).filter(s => !s.defer && !s.async);
  if (nonDeferScripts.length > 0) res.push(warn({ category: "Performance", target: pathname, severity: "medium", message: `${nonDeferScripts.length} non-essential scripts might block rendering`, fix: "Add defer/async to non-critical scripts and move them late." }));

  // Fonts
  const fontCount = (document.fonts && document.fonts.size) || 0;
  if (fontCount > 4) res.push(warn({ category: "Performance", target: pathname, severity: "low", message: `${fontCount} font faces loaded`, fix: "Reduce font families/weights; subset where possible." }));

  return res;
}

// ACCESSIBILITY CHECKS
export function runAccessibilityChecks(pathname = window.location.pathname) {
  const res = [];
  // Images alt
  const imgs = Array.from(document.querySelectorAll('img'));
  const missingAlt = imgs.filter(img => !img.hasAttribute('alt'));
  if (missingAlt.length) res.push(warn({ category: "Accessibility", target: pathname, severity: "high", message: `${missingAlt.length} images missing alt text`, fix: 'Add descriptive alt text or alt="" for decorative images.' }));
  else res.push(passItem({ category: "Accessibility", target: pathname, message: "All images have alt" }));

  // Form labels
  const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
  const unlabeled = inputs.filter(el => !el.id || !document.querySelector(`label[for="${el.id}"]`)).filter(el => !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby'));
  if (unlabeled.length) res.push(warn({ category: "Accessibility", target: pathname, severity: "medium", message: `${unlabeled.length} form controls without labels`, fix: "Associate labels via for/id or add aria-label/aria-labelledby." }));

  // Keyboard focus indicators heuristic
  // We cannot compute styles reliably, surface advisory
  res.push(warn({ category: "Accessibility", target: pathname, severity: "low", message: "Verify visible focus indicators for interactive elements", fix: "Ensure :focus styles are present and meet contrast guidelines." }));

  // Contrast is complex; surface advisory
  res.push(warn({ category: "Accessibility", target: pathname, severity: "low", message: "Review color contrast for text/buttons", fix: "Use WCAG AA contrast ratios; adjust colors accordingly." }));

  return res;
}

// SEO CHECKS
export function runSEOChecks(pathname = window.location.pathname) {
  const res = [];
  const title = document.title?.trim();
  if (!title) res.push(warn({ category: "SEO", target: pathname, severity: "medium", message: "Missing page title", fix: "Set a descriptive, unique <title> per page." }));
  else res.push(passItem({ category: "SEO", target: pathname, message: `Has title: ${title.slice(0, 60)}` }));

  const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim();
  if (!metaDesc) res.push(warn({ category: "SEO", target: pathname, severity: "low", message: "Missing meta description", fix: "Add a concise meta description (120–160 chars)." }));

  const hasLD = !!document.querySelector('script[type="application/ld+json"]');
  if (!hasLD) res.push(warn({ category: "SEO", target: pathname, severity: "low", message: "Missing structured data where applicable", fix: "Add schema.org JSON-LD for content types (e.g., Organization, Article)." }));

  // URL readability heuristic
  if (pathname.length > 60 || /[A-Z%]/.test(pathname)) res.push(warn({ category: "SEO", target: pathname, severity: "low", message: "URL may be hard to read", fix: "Use short, lowercase, hyphenated URLs." }));

  return res;
}

// SECURITY CHECKS
export function runSecurityChecks(pathname = window.location.pathname) {
  const res = [];
  if (window.location.protocol !== 'https:') res.push(warn({ category: "Security", target: pathname, severity: "high", message: "Site not served over HTTPS", fix: "Enable HTTPS and HSTS." }));
  else res.push(passItem({ category: "Security", target: pathname, message: "HTTPS OK" }));

  // Exposed secrets simple scan
  const suspicious = /api_key|secret|token/i.test(document.documentElement.innerHTML);
  if (suspicious) res.push(warn({ category: "Security", target: pathname, severity: "high", message: "Potential secret-like strings found in markup", fix: "Remove secrets from client; use backend functions and environment variables." }));

  // Role boundary reminder
  res.push(warn({ category: "Security", target: pathname, severity: "low", message: "Review role-based access for admin-only features", fix: "Verify server-side checks (user.role === 'admin') in backend functions." }));

  return res;
}

// CONTENT CHECKS
export function runContentChecks(pathname = window.location.pathname) {
  const res = [];
  const hasCTA = !!Array.from(document.querySelectorAll('a,button')).find(el => /contact|get started|reserve|sign up|buy|apply/i.test(el.textContent || ''));
  if (!hasCTA) res.push(warn({ category: "Content", target: pathname, severity: "medium", message: "No clear primary CTA on page", fix: "Add a prominent, action-oriented CTA above the fold." }));
  else res.push(passItem({ category: "Content", target: pathname, message: "CTA present" }));

  // Clutter heuristic
  const links = document.querySelectorAll('a').length;
  if (links > 150) res.push(warn({ category: "Content", target: pathname, severity: "low", message: `High link density (${links} links)`, fix: "Reduce clutter; group links or use progressive disclosure." }));

  return res;
}

// ANALYTICS CHECKS
export function runAnalyticsChecks(pathname = window.location.pathname) {
  const res = [];
  const hasGA = typeof window.gtag === 'function' || typeof window.dataLayer !== 'undefined';
  const hasOther = typeof window.mixpanel !== 'undefined' || typeof window.fbq !== 'undefined';
  if (!hasGA && !hasOther) res.push(warn({ category: "Analytics", target: pathname, severity: "low", message: "No analytics detected", fix: "Add lightweight analytics and track CTA clicks & form submissions." }));

  // CTA tracking hints
  const ctas = Array.from(document.querySelectorAll('a,button')).filter(el => /contact|get started|reserve|sign up|buy|apply/i.test(el.textContent || ''));
  if (ctas.length && !ctas.some(el => el.getAttribute('data-track') || el.getAttribute('data-analytics'))) {
    res.push(warn({ category: "Analytics", target: pathname, severity: "low", message: "CTAs may be untracked", fix: "Add data-track attributes and hook into your analytics to record clicks." }));
  }

  return res;
}

export function runAllChecks() {
  const path = window.location.pathname;
  const all = [
    ...runPerformanceChecks(path),
    ...runAccessibilityChecks(path),
    ...runSEOChecks(path),
    ...runSecurityChecks(path),
    ...runContentChecks(path),
    ...runAnalyticsChecks(path),
  ];
  // Normalize severity rank for UI sorting
  const rank = { critical: 4, high: 3, medium: 2, low: 1, pass: 0 };
  return all.sort((a,b) => (rank[b.severity] - rank[a.severity]));
}