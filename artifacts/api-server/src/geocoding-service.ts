/**
 * Geocoding service for converting addresses to latitude/longitude coordinates
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 */

interface GeocodeResult {
  latitude: number;
  longitude: number;
}

export interface PropertyCoordinateSource {
  id?: string | null;
  address?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
}

export type PropertyCoordinatePersistor = (
  coordinates: GeocodeResult,
) => Promise<GeocodeResult | null>;
export type PropertyGeocoder = (address: string) => Promise<GeocodeResult | null>;

interface NominatimResponse {
  lat: string;
  lon: string;
  display_name: string;
}

// Simple in-memory cache to avoid redundant geocoding requests
const geocodeCache = new Map<string, GeocodeResult>();
const propertyCoordinateRequests = new Map<string, Promise<GeocodeResult | null>>();

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

    const data: NominatimResponse[] = await response.json() as NominatimResponse[];

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

function parseCoordinate(value: string | number | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Resolve a house's property coordinates from the persisted cache first.
 *
 * Houses already containing a valid latitude/longitude pair never trigger a
 * geocoder call. Missing coordinates are coalesced per house/address so two
 * concurrent completion requests cannot issue duplicate geocoding calls. A
 * successful lookup is persisted through the caller-provided callback.
 */
export async function resolvePropertyCoordinates(
  house: PropertyCoordinateSource,
  persist?: PropertyCoordinatePersistor,
  geocoder: PropertyGeocoder = geocodeAddress,
): Promise<GeocodeResult | null> {
  const cachedLatitude = parseCoordinate(house.latitude);
  const cachedLongitude = parseCoordinate(house.longitude);
  if (cachedLatitude !== null && cachedLongitude !== null) {
    return { latitude: cachedLatitude, longitude: cachedLongitude };
  }

  const address = house.address?.trim();
  if (!address) return null;

  const normalizedAddress = address.toLowerCase();
  const requestKey = `${house.id ?? "address"}:${normalizedAddress}`;
  const existingRequest = propertyCoordinateRequests.get(requestKey);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    try {
      const coordinates = await geocoder(address);
      if (coordinates && persist) {
        return await persist(coordinates);
      }
      return coordinates;
    } catch {
      console.error("[GEOCODING] Unable to resolve or persist property coordinates");
      return null;
    }
  })();
  propertyCoordinateRequests.set(requestKey, request);

  try {
    return await request;
  } finally {
    if (propertyCoordinateRequests.get(requestKey) === request) {
      propertyCoordinateRequests.delete(requestKey);
    }
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
  return Math.round(calculateDistanceExact(lat1, lon1, lat2, lon2) * 10) / 10;
}

/**
 * Calculate the unrounded Haversine distance between two coordinates.
 * Use this for evidence thresholds; calculateDistance remains rounded for
 * existing display and contractor-search consumers.
 */
export function calculateDistanceExact(
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
  return distance;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
