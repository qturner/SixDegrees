// Declare gtag for TypeScript
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

// Track custom events
export const trackEvent = (
  action: string,
  category?: string,
  label?: string,
  value?: number
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Track page views (for single-page app navigation)
export const trackPageView = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    if (measurementId) {
      window.gtag('config', measurementId, {
        page_path: url
      });
    }
  }
};

// Convenience functions for common game events
export const trackGameEvent = {
  startGame: () => trackEvent('start_game', 'game', 'daily_challenge'),
  validateMove: (success: boolean) => trackEvent('validate_move', 'game', success ? 'success' : 'failure'),
  completeGame: (moves: number) => trackEvent('complete_game', 'game', 'daily_challenge', moves),
  useHint: (hintType: 'movie' | 'actor') => trackEvent('use_hint', 'game', hintType),
  resetGame: () => trackEvent('reset_game', 'game', 'daily_challenge'),
};