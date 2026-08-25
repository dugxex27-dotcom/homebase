import { describe, expect, it } from 'vitest';
import {
  getDirectorySearchTrackingPayload,
  getDirectorySearchTrackingSignature,
} from './analytics';

describe('contractor-directory search analytics', () => {
  it('creates a meaningful event for a service-only search', () => {
    expect(getDirectorySearchTrackingPayload({
      services: ['Plumbing Services'],
    })).toEqual({
      searchTerm: 'Plumbing Services',
      serviceType: 'Plumbing Services',
    });
  });

  it('uses the URL/text search term when one is present', () => {
    expect(getDirectorySearchTrackingPayload({
      searchQuery: ' roofing ',
      services: ['Roofing Services', 'Handyman Services'],
    })).toEqual({
      searchTerm: 'roofing',
      serviceType: 'Handyman Services, Roofing Services',
    });
  });

  it('treats equivalent service ordering as the same search but tracks changed filters', () => {
    const first = getDirectorySearchTrackingSignature({
      services: ['Roofing Services', 'Handyman Services'],
      maxDistance: 25,
    });
    const sameSearch = getDirectorySearchTrackingSignature({
      services: ['Handyman Services', 'Roofing Services'],
      maxDistance: 25,
    });
    const changedSearch = getDirectorySearchTrackingSignature({
      services: ['Handyman Services', 'Roofing Services'],
      maxDistance: 50,
    });

    expect(sameSearch).toBe(first);
    expect(changedSearch).not.toBe(first);
  });
});