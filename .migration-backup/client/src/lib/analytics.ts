import { nanoid } from "nanoid";

// Generate a unique session ID and store it in sessionStorage
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = nanoid();
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
}

// Get user ID if logged in
function getUserId(): string | null {
  // This would typically come from your auth context
  return localStorage.getItem('userId') || null;
}

// Track contractor click events
export async function trackContractorClick(
  contractorId: string,
  clickType: 'profile_view' | 'website' | 'facebook' | 'instagram' | 'linkedin' | 'google_business' | 'phone' | 'email' | 'message'
): Promise<void> {
  try {
    const analyticsData = {
      contractorId,
      sessionId: getSessionId(),
      homeownerId: getUserId(),
      clickType,
      ipAddress: null, // Will be captured on server side
      userAgent: navigator.userAgent,
      referrerUrl: document.referrer || null
    };

    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(analyticsData),
    });
  } catch (error) {
    console.error('Failed to track analytics:', error);
    // Fail silently in production - don't break user experience
  }
}

// Track profile view - call this when a contractor profile is viewed
export function trackProfileView(contractorId: string): void {
  trackContractorClick(contractorId, 'profile_view');
}

// Track social media clicks with specific analytics
export function trackSocialClick(contractorId: string, platform: 'website' | 'facebook' | 'instagram' | 'linkedin' | 'google_business'): void {
  trackContractorClick(contractorId, platform);
}

// Track contact method clicks
export function trackContactClick(contractorId: string, method: 'phone' | 'email' | 'message'): void {
  trackContractorClick(contractorId, method);
}

// Higher-order component to automatically track clicks on links
export function withAnalyticsTracking<T extends HTMLElement>(
  element: T,
  contractorId: string,
  clickType: 'website' | 'facebook' | 'instagram' | 'linkedin' | 'google_business' | 'phone' | 'email'
): T {
  element.addEventListener('click', () => {
    trackContractorClick(contractorId, clickType);
  });
  return element;
}