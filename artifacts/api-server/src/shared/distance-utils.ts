// Utility functions for handling distance units across different countries

// Countries that use kilometers instead of miles
const METRIC_COUNTRIES = ['GB', 'CA', 'AU', 'UK'];

// Convert miles to kilometers
export const milesToKm = (miles: number): number => {
  return Math.round(miles * 1.60934);
};

// Convert kilometers to miles
export const kmToMiles = (km: number): number => {
  return Math.round(km / 1.60934);
};

// Detect if country uses metric system for distance
export const isMetricCountry = (countryCode?: string): boolean => {
  if (!countryCode) return false;
  return METRIC_COUNTRIES.includes(countryCode.toUpperCase());
};

// Get distance unit label based on country
export const getDistanceUnit = (countryCode?: string): string => {
  return isMetricCountry(countryCode) ? 'km' : 'miles';
};

// Get distance options for UI dropdown based on country
export const getDistanceOptions = (countryCode?: string) => {
  const isMetric = isMetricCountry(countryCode);
  
  if (isMetric) {
    return [
      { value: 8, label: '8 km' },    // ~5 miles
      { value: 16, label: '16 km' },  // ~10 miles
      { value: 24, label: '24 km' },  // ~15 miles
      { value: 32, label: '32 km' },  // ~20 miles
      { value: 40, label: '40 km' },  // ~25 miles
      { value: 48, label: '48 km' },  // ~30 miles
      { value: 80, label: '80 km' },  // ~50 miles
    ];
  } else {
    return [
      { value: 5, label: '5 miles' },
      { value: 10, label: '10 miles' },
      { value: 15, label: '15 miles' },
      { value: 20, label: '20 miles' },
      { value: 25, label: '25 miles' },
      { value: 30, label: '30 miles' },
      { value: 50, label: '50 miles' },
    ];
  }
};

// Get service radius options for contractors
export const getServiceRadiusOptions = (countryCode?: string) => {
  const isMetric = isMetricCountry(countryCode);
  
  if (isMetric) {
    return [
      { value: 8, label: '8 km' },
      { value: 16, label: '16 km' },
      { value: 24, label: '24 km' },
      { value: 32, label: '32 km' },
      { value: 40, label: '40 km' },
      { value: 48, label: '48 km' },
      { value: 56, label: '56 km' },
      { value: 64, label: '64 km' },
      { value: 72, label: '72 km' },
      { value: 80, label: '80 km' },
    ];
  } else {
    return [
      { value: 5, label: '5 miles' },
      { value: 10, label: '10 miles' },
      { value: 15, label: '15 miles' },
      { value: 20, label: '20 miles' },
      { value: 25, label: '25 miles' },
      { value: 30, label: '30 miles' },
      { value: 35, label: '35 miles' },
      { value: 40, label: '40 miles' },
      { value: 45, label: '45 miles' },
      { value: 50, label: '50 miles' },
    ];
  }
};

// Convert stored distance to display value based on country
export const convertDistanceForDisplay = (storedDistance: number, countryCode?: string): number => {
  // Database stores distances in miles, convert to km for metric countries
  return isMetricCountry(countryCode) ? milesToKm(storedDistance) : storedDistance;
};

// Convert display distance to storage value (always store in miles for consistency)
export const convertDistanceForStorage = (displayDistance: number, countryCode?: string): number => {
  // Convert km back to miles for storage in metric countries
  return isMetricCountry(countryCode) ? kmToMiles(displayDistance) : displayDistance;
};

// Extract country code from address string
export const extractCountryFromAddress = (address?: string): string | undefined => {
  if (!address) return undefined;
  
  const addressLower = address.toLowerCase();
  
  // Check for country indicators in address
  if (addressLower.includes('united kingdom') || addressLower.includes('england') || 
      addressLower.includes('scotland') || addressLower.includes('wales') || 
      addressLower.includes('northern ireland') || addressLower.includes(', uk') ||
      addressLower.includes(' uk ') || addressLower.endsWith(' uk')) {
    return 'GB';
  }
  
  if (addressLower.includes('canada') || addressLower.includes(', ca') ||
      addressLower.includes(' ca ') || addressLower.endsWith(' ca')) {
    return 'CA';
  }
  
  if (addressLower.includes('australia') || addressLower.includes(', au') ||
      addressLower.includes(' au ') || addressLower.endsWith(' au')) {
    return 'AU';
  }
  
  // Default to US if no specific country detected
  return 'US';
};