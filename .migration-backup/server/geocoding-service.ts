/**
 * Geocoding service for converting addresses to latitude/longitude coordinates
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 */

interface GeocodeResult {
  latitude: number;
  longitude: number;
}

interface NominatimResponse {
  lat: string;
  lon: string;
  display_name: string;
}

// Simple in-memory cache to avoid redundant geocoding requests
const geocodeCache = new Map<string, GeocodeResult>();

/**
 * Geocode an address to latitude/longitude coordinates
 * @param address Full address string
 * @returns Coordinates or null if geocoding fails
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address || address.trim().length === 0) {
    console.error('[GEOCODING] Empty address provided');
    return null;
  }

  // Normalize address for cache key
  const cacheKey = address.trim().toLowerCase();

  // Check cache first
  if (geocodeCache.has(cacheKey)) {
    console.log('[GEOCODING] Cache hit for:', address);
    return geocodeCache.get(cacheKey)!;
  }

  try {
    // Use Nominatim API (free, no API key needed)
    const encodedAddress = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`;
    
    console.log('[GEOCODING] Requesting coordinates for:', address);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'HomeBase-App/1.0' // Required by Nominatim usage policy
      }
    });

    if (!response.ok) {
      console.error('[GEOCODING] API request failed:', response.status, response.statusText);
      return null;
    }

    const data: NominatimResponse[] = await response.json();

    if (!data || data.length === 0) {
      console.warn('[GEOCODING] No results found for address:', address);
      return null;
    }

    const result: GeocodeResult = {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon)
    };

    console.log('[GEOCODING] Success:', address, '->', result);

    // Cache the result
    geocodeCache.set(cacheKey, result);

    // Respect Nominatim's usage policy: max 1 request per second
    await new Promise(resolve => setTimeout(resolve, 1000));

    return result;
  } catch (error) {
    console.error('[GEOCODING] Error geocoding address:', address, error);
    return null;
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in miles
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
