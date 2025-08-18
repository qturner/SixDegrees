import { useEffect } from 'react';

// Utility function to extract UTM parameters and other tracking info
function getTrackingData() {
  const urlParams = new URLSearchParams(window.location.search);
  
  return {
    referrer: document.referrer || null,
    utmSource: urlParams.get('utm_source'),
    utmMedium: urlParams.get('utm_medium'), 
    utmCampaign: urlParams.get('utm_campaign'),
    utmTerm: urlParams.get('utm_term'),
    utmContent: urlParams.get('utm_content'),
    searchQuery: urlParams.get('q') || urlParams.get('query') || urlParams.get('search'),
    userAgent: navigator.userAgent,
    language: navigator.language,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    country: null, // Will be determined server-side if needed
  };
}

// Custom hook to track visitor analytics
export function useVisitorTracking() {
  useEffect(() => {
    // Track the visit
    const trackVisit = async () => {
      try {
        // Check if we already have a session in this browser session
        const existingSessionId = sessionStorage.getItem('visitorSessionId');
        
        if (!existingSessionId) {
          // This is a new session, track the visitor
          const trackingData = getTrackingData();
          
          const response = await fetch('/api/analytics/track-visit', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(trackingData)
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.sessionId) {
              sessionStorage.setItem('visitorSessionId', data.sessionId);
            }
          }
        }
      } catch (error) {
        console.error('Failed to track visitor:', error);
      }
    };

    trackVisit();
  }, []);
}

// Export function to manually track conversions
export async function trackGameStart() {
  const sessionId = sessionStorage.getItem('visitorSessionId');
  if (sessionId) {
    try {
      const response = await fetch('/api/analytics/track-conversion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId })
      });
      
      if (!response.ok) {
        console.error('Failed to track conversion');
      }
    } catch (error) {
      console.error('Failed to track game start:', error);
    }
  }
}