import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getDirectorySearchTrackingPayload,
  getDirectorySearchTrackingSignature,
  trackDirectorySearch,
} from './analytics';

describe('contractor-directory search analytics', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it.each([
    {
      label: 'service-only filter',
      filters: { services: ['Plumbing Services'] },
      payload: {
        searchTerm: 'Plumbing Services',
        serviceType: 'Plumbing Services',
        searchContext: 'contractor_directory',
      },
    },
    {
      label: 'URL/text query',
      filters: { searchQuery: 'roofing' },
      payload: {
        searchTerm: 'roofing',
        searchContext: 'contractor_directory',
      },
    },
  ])('posts a $label search to the persistence endpoint', async ({ filters, payload }) => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await trackDirectorySearch(filters);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith('/api/analytics/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  });
});