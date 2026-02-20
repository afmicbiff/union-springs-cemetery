import { useEffect } from 'react';

/**
 * Sets document <head> meta tags for SEO.
 * Call once per page with page-specific props.
 */
export default function SEOHead({ 
  title = "Union Springs Cemetery – Shongaloo, LA",
  description = "Union Springs Cemetery in Shongaloo, Louisiana. Search deceased records, view cemetery plots, plan your visit, and explore our history since 1892.",
  canonical,
  ogType = "website",
  ogImage = "https://base44.app/api/apps/693cd1f0c20a0662b5f281d5/files/public/693cd1f0c20a0662b5f281d5/dfd4d861f_img-1767265605524.webp",
  noIndex = false
}) {
  useEffect(() => {
    // Title
    document.title = title;

    const setMeta = (name, content, attr = 'name') => {
      if (!content) return;
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Standard meta
    setMeta('description', description);
    if (noIndex) setMeta('robots', 'noindex, nofollow');
    else setMeta('robots', 'index, follow');

    // Open Graph
    setMeta('og:title', title, 'property');
    setMeta('og:description', description, 'property');
    setMeta('og:type', ogType, 'property');
    setMeta('og:image', ogImage, 'property');
    setMeta('og:site_name', 'Union Springs Cemetery', 'property');
    if (canonical) setMeta('og:url', canonical, 'property');

    // Twitter Card
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:image', ogImage);

    // Canonical link
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonical);
    }

    return () => {
      // Cleanup canonical on unmount so next page can set its own
      const link = document.querySelector('link[rel="canonical"]');
      if (link) link.remove();
    };
  }, [title, description, canonical, ogType, ogImage, noIndex]);

  return null;
}