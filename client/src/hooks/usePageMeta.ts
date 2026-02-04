import { useEffect } from 'react';

interface PageMetaOptions {
  title: string;
  description?: string;
  keywords?: string;
  image?: string;
  canonical?: string;
  noIndex?: boolean;
}

export function usePageMeta({ title, description, keywords, image, canonical, noIndex }: PageMetaOptions) {
  useEffect(() => {
    const previousTitle = document.title;
    const baseTitle = 'Six Degrees of Separation';

    document.title = title === baseTitle ? title : `${title} | ${baseTitle}`;

    // Helper to update meta tags
    const updateMeta = (name: string, content: string | undefined, isProperty = false) => {
      if (!content) return null;
      const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      const element = document.querySelector(selector);
      const previousContent = element?.getAttribute('content') || '';
      if (element) {
        element.setAttribute('content', content);
      }
      return { element, previousContent };
    };

    // Helper to update link tags
    const updateLink = (rel: string, href: string | undefined) => {
      if (!href) return null;
      const element = document.querySelector(`link[rel="${rel}"]`);
      const previousHref = element?.getAttribute('href') || '';
      if (element) {
        element.setAttribute('href', href);
      }
      return { element, previousHref };
    };

    const cleanupDescription = updateMeta('description', description);
    const cleanupKeywords = updateMeta('keywords', keywords);
    const cleanupRobots = noIndex ? updateMeta('robots', 'noindex, nofollow') : null;
    const cleanupCanonical = updateLink('canonical', canonical);

    // OG Tags
    const cleanupOgTitle = updateMeta('og:title', title, true);
    const cleanupOgDescription = updateMeta('og:description', description, true);
    const cleanupOgImage = updateMeta('og:image', image, true);

    // Twitter Tags
    const cleanupTwitterTitle = updateMeta('twitter:title', title);
    const cleanupTwitterDescription = updateMeta('twitter:description', description);
    const cleanupTwitterImage = updateMeta('twitter:image', image);

    return () => {
      document.title = previousTitle;
      if (cleanupDescription?.element) cleanupDescription.element.setAttribute('content', cleanupDescription.previousContent);
      if (cleanupKeywords?.element) cleanupKeywords.element.setAttribute('content', cleanupKeywords.previousContent);
      if (cleanupRobots?.element) cleanupRobots.element.setAttribute('content', cleanupRobots.previousContent);
      if (cleanupCanonical?.element) cleanupCanonical.element.setAttribute('href', cleanupCanonical.previousHref);

      if (cleanupOgTitle?.element) cleanupOgTitle.element.setAttribute('content', cleanupOgTitle.previousContent);
      if (cleanupOgDescription?.element) cleanupOgDescription.element.setAttribute('content', cleanupOgDescription.previousContent);
      if (cleanupOgImage?.element) cleanupOgImage.element.setAttribute('content', cleanupOgImage.previousContent);

      if (cleanupTwitterTitle?.element) cleanupTwitterTitle.element.setAttribute('content', cleanupTwitterTitle.previousContent);
      if (cleanupTwitterDescription?.element) cleanupTwitterDescription.element.setAttribute('content', cleanupTwitterDescription.previousContent);
      if (cleanupTwitterImage?.element) cleanupTwitterImage.element.setAttribute('content', cleanupTwitterImage.previousContent);
    };
  }, [title, description, keywords, image, canonical, noIndex]);
}
