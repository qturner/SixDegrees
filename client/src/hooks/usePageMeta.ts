import { useEffect } from 'react';

interface PageMetaOptions {
  title: string;
  description?: string;
  canonical?: string;
  noIndex?: boolean;
}

export function usePageMeta({ title, description, canonical, noIndex }: PageMetaOptions) {
  useEffect(() => {
    const previousTitle = document.title;
    const baseTitle = 'Six Degrees of Separation';
    
    document.title = title === baseTitle ? title : `${title} | ${baseTitle}`;

    const metaDescription = document.querySelector('meta[name="description"]');
    const previousDescription = metaDescription?.getAttribute('content') || '';
    if (description && metaDescription) {
      metaDescription.setAttribute('content', description);
    }

    const metaRobots = document.querySelector('meta[name="robots"]');
    const previousRobots = metaRobots?.getAttribute('content') || '';
    if (noIndex && metaRobots) {
      metaRobots.setAttribute('content', 'noindex, nofollow');
    }

    const linkCanonical = document.querySelector('link[rel="canonical"]');
    const previousCanonical = linkCanonical?.getAttribute('href') || '';
    if (canonical && linkCanonical) {
      linkCanonical.setAttribute('href', canonical);
    }

    const ogTitle = document.querySelector('meta[property="og:title"]');
    const previousOgTitle = ogTitle?.getAttribute('content') || '';
    if (ogTitle) {
      ogTitle.setAttribute('content', title);
    }

    const ogDescription = document.querySelector('meta[property="og:description"]');
    const previousOgDescription = ogDescription?.getAttribute('content') || '';
    if (description && ogDescription) {
      ogDescription.setAttribute('content', description);
    }

    return () => {
      document.title = previousTitle;
      if (metaDescription) metaDescription.setAttribute('content', previousDescription);
      if (metaRobots) metaRobots.setAttribute('content', previousRobots);
      if (linkCanonical) linkCanonical.setAttribute('href', previousCanonical);
      if (ogTitle) ogTitle.setAttribute('content', previousOgTitle);
      if (ogDescription) ogDescription.setAttribute('content', previousOgDescription);
    };
  }, [title, description, canonical, noIndex]);
}
