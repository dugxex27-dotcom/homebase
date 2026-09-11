import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  where: vi.fn(),
  gt: vi.fn(),
}));

vi.mock('./db', () => ({
  db: {
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: mocks.where,
        }),
      }),
    }),
  },
}));

vi.mock('@workspace/db', () => ({
  users: {
    id: 'users.id',
    firstName: 'users.firstName',
    lastName: 'users.lastName',
    email: 'users.email',
    role: 'users.role',
    createdAt: 'users.createdAt',
    isQaAccount: 'users.isQaAccount',
    isDemoAccount: 'users.isDemoAccount',
  },
  onboardingProgress: {
    userId: 'onboardingProgress.userId',
    completedAt: 'onboardingProgress.completedAt',
    currentStep: 'onboardingProgress.currentStep',
  },
  notifications: {},
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args) => ['eq', ...args]),
  and: vi.fn((...args) => ['and', ...args]),
  gt: mocks.gt,
  isNull: vi.fn((...args) => ['isNull', ...args]),
  lt: vi.fn((...args) => ['lt', ...args]),
  isNotNull: vi.fn((...args) => ['isNotNull', ...args]),
}));

vi.mock('./email-service', () => ({
  sendOnboardingNudgeEmail: vi.fn(),
}));

vi.mock('./storage', () => ({
  storage: { createNotification: vi.fn() },
  isDemoId: vi.fn(() => false),
}));

import { onboardingNudgeScheduler } from './onboarding-nudge-scheduler';

describe('onboarding nudge scheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-11T09:00:00'));
    mocks.where.mockReset().mockResolvedValue([]);
    mocks.gt.mockReset().mockImplementation((...args) => ['gt', ...args]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('only selects users who advanced beyond the initial onboarding step', async () => {
    await onboardingNudgeScheduler.checkNow();

    expect(mocks.gt).toHaveBeenCalledWith('onboardingProgress.currentStep', 2);
    expect(mocks.where).toHaveBeenCalledOnce();
  });
});