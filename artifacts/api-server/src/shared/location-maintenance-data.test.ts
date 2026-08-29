import { describe, expect, it } from 'vitest';
import {
  getCurrentMonthTasks,
  getDueMaintenanceTasks,
  US_MAINTENANCE_DATA,
} from './location-maintenance-data';

const REGIONS = [
  'Northeast',
  'Southeast',
  'Midwest',
  'Southwest',
  'Mountain West',
  'West Coast',
  'Pacific Northwest',
];

function allCatalogTasks(region: string) {
  const data = US_MAINTENANCE_DATA[region];
  return [
    ...Object.values(data.monthlyTasks).flatMap(month => [
      ...month.seasonal,
      ...month.weatherSpecific,
    ]),
    ...data.yearRoundTasks,
  ];
}

function taskNamed(region: string, title: string) {
  return allCatalogTasks(region).filter(task => task.title === title);
}

describe('normalized US maintenance catalog', () => {
  it('gives every exported task an explicit recurrence and unique stable ID', () => {
    for (const region of REGIONS) {
      const tasks = allCatalogTasks(region);
      expect(tasks.length).toBeGreaterThan(0);
      expect(new Set(tasks.map(task => task.id)).size).toBe(tasks.length);
      expect(tasks.every(task => Boolean(task.recurrence?.frequency))).toBe(true);
    }
  });

  it('collapses the six washing-machine duplicates into one quarterly task per region', () => {
    for (const region of REGIONS) {
      const matches = taskNamed(region, 'Clean washing machine drain filter');
      expect(matches).toHaveLength(1);
      expect(matches[0].recurrence).toMatchObject({
        frequency: 'quarterly',
        months: [1, 4, 7, 10],
      });
    }
  });

  it('publishes the required regional policy refinements', () => {
    expect(taskNamed('Southeast', 'Annual termite inspection')[0].recurrence.frequency).toBe('annual');
    expect(taskNamed('Southeast', 'Check HVAC filter')[0].description).toContain('spring through September');
    expect(taskNamed('Southwest', 'Check HVAC filter')[0].description).toContain('20-30 days');
    expect(taskNamed('Southwest', 'Professional HVAC service')[0].recurrence.months).toEqual([3, 10]);
    expect(taskNamed('Midwest', 'Inspect roof')[0].recurrence.eventGuidance?.[0]?.event).toBe('hailstorm');
    expect(taskNamed('Mountain West', 'Clear defensible space for wildfire season')).toHaveLength(1);
    expect(taskNamed('West Coast', 'Complete earthquake-prep setup')[0].recurrence.frequency).toBe('one_time');
    expect(taskNamed('West Coast', 'Check earthquake kit batteries and supplies')[0].recurrence.frequency).toBe('annual');
    expect(taskNamed('Pacific Northwest', 'Treat roof moss')[0].recurrence.frequency).toBe('annual');
    expect(taskNamed('Pacific Northwest', 'Professionally clean the roof')[0].recurrence.frequency).toBe('every_3_years');
  });

  it('projects recurring tasks only into their configured months', () => {
    const march = getCurrentMonthTasks('Pacific Northwest', 3);
    const october = getCurrentMonthTasks('Pacific Northwest', 10);
    const june = getCurrentMonthTasks('Pacific Northwest', 6);

    expect(march?.seasonal.some(task => task.title === 'Clean gutters and downspouts')).toBe(true);
    expect(october?.seasonal.some(task => task.title === 'Clean gutters and downspouts')).toBe(true);
    expect(june?.seasonal.some(task => task.title === 'Clean gutters and downspouts')).toBe(false);
    expect(june?.seasonal.some(task => task.title === 'Test smoke and carbon monoxide detectors')).toBe(true);
    expect(
      getCurrentMonthTasks('Midwest', 6)?.seasonal.some(task => task.title === 'Inspect roof after a hailstorm'),
    ).toBe(false);
  });

  it('suppresses completions by stable ID and by a legacy title fallback', () => {
    const washer = taskNamed('Northeast', 'Clean washing machine drain filter')[0];
    const sameWindow = getDueMaintenanceTasks('Northeast', new Date(2026, 3, 1), [{
      taskId: washer.id,
      taskTitle: washer.title,
      month: 4,
      year: 2026,
    }]);
    expect(sameWindow?.seasonal.some(task => task.id === washer.id)).toBe(false);

    const detector = taskNamed('Northeast', 'Test smoke and carbon monoxide detectors')[0];
    const legacyTitle = detector.legacyTitles?.[0];
    expect(legacyTitle).toBeTruthy();
    const legacySuppressed = getDueMaintenanceTasks('Northeast', new Date(2026, 5, 1), [{
      taskId: null,
      taskTitle: legacyTitle!,
      month: 6,
      year: 2026,
    }]);
    expect(legacySuppressed?.seasonal.some(task => task.id === detector.id)).toBe(false);
  });

  it('does not skip the next calendar window after an off-cycle completion', () => {
    const roof = taskNamed('Northeast', 'Inspect roof')[0];
    const nextSpring = getDueMaintenanceTasks('Northeast', new Date(2026, 3, 1), [{
      taskId: roof.id,
      taskTitle: roof.title,
      completedAt: '2025-05-20T12:00:00.000Z',
      month: 5,
      year: 2025,
    }]);
    expect(nextSpring?.seasonal.some(task => task.id === roof.id)).toBe(true);

    const hvac = taskNamed('Northeast', 'Professional HVAC service')[0];
    const nextFall = getDueMaintenanceTasks('Northeast', new Date(2026, 9, 1), [{
      taskId: hvac.id,
      taskTitle: hvac.title,
      completedAt: '2026-05-15T12:00:00.000Z',
      month: 5,
      year: 2026,
    }]);
    expect(nextFall?.seasonal.some(task => task.id === hvac.id)).toBe(true);
  });

  it('does not let a later completion suppress an earlier requested period', () => {
    const detector = taskNamed('Northeast', 'Test smoke and carbon monoxide detectors')[0];
    const march = getDueMaintenanceTasks('Northeast', new Date(2026, 2, 1), [{
      taskId: detector.id,
      taskTitle: detector.title,
      completedAt: '2026-04-10T12:00:00.000Z',
      month: 4,
      year: 2026,
    }]);
    expect(march?.seasonal.some(task => task.id === detector.id)).toBe(true);

    const hvac = taskNamed('Northeast', 'Professional HVAC service')[0];
    const spring = getDueMaintenanceTasks('Northeast', new Date(2026, 3, 1), [{
      taskId: hvac.id,
      taskTitle: hvac.title,
      completedAt: '2026-10-15T12:00:00.000Z',
      month: 10,
      year: 2026,
    }]);
    expect(spring?.seasonal.some(task => task.id === hvac.id)).toBe(true);
  });

  it('keeps one-time setup complete after its first recorded completion', () => {
    const setup = taskNamed('West Coast', 'Complete earthquake-prep setup')[0];
    const due = getDueMaintenanceTasks('West Coast', new Date(2026, 0, 1), [{
      taskId: setup.id,
      taskTitle: setup.title,
      month: 1,
      year: 2024,
    }]);
    expect(due?.seasonal.some(task => task.id === setup.id)).toBe(false);
  });
});