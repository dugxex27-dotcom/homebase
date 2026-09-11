import { beforeEach, describe, expect, it, vi } from 'vitest';

const { select, update, sendEmail } = vi.hoisted(() => ({
  select: vi.fn(),
  update: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock('./db', () => ({ db: { select, update } }));
vi.mock('./email-service', () => ({ sendAffiliatePayoutProcessedEmail: sendEmail }));
vi.mock('@workspace/db', () => ({
  affiliatePayouts: { id: 'id', status: 'status', emailStatus: 'emailStatus', emailNextAttemptAt: 'emailNextAttemptAt', emailClaimLeaseUntil: 'emailClaimLeaseUntil', emailClaimToken: 'emailClaimToken', emailAttemptCount: 'emailAttemptCount', affiliateReferralId: 'affiliateReferralId', agentId: 'agentId' },
  affiliateReferrals: { id: 'referralId' },
  notificationPreferences: { userId: 'userId', notificationType: 'notificationType' },
  users: { id: 'userId' },
}));
vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args) => args), or: vi.fn((...args) => args),
  eq: vi.fn(), isNull: vi.fn(), lte: vi.fn(), sql: vi.fn(),
}));

import { runAffiliatePayoutEmailDelivery } from './affiliate-payout-email-scheduler';

const payout = {
  id: 'payout-1', status: 'paid', emailStatus: 'pending', emailAttemptCount: 0,
  emailNextAttemptAt: null, emailClaimLeaseUntil: null, agentId: 'agent-1',
  affiliateReferralId: 'ref-1', amount: '15.00', stripeTransferId: 'tr_1',
};
const candidate = {
  payout, referral: { referredUserId: 'user-1', referredUserRole: 'homeowner' },
  agent: { id: 'agent-1', email: 'agent@example.com' },
};

function setup(options: { claim?: any; preference?: any; preferenceError?: Error; noEmail?: boolean } = {}) {
  const claim = options.claim === undefined ? [{ ...payout, emailAttemptCount: 1 }] : options.claim;
  let selectCount = 0;
  select.mockImplementation(() => {
    const chain: any = {
      from: vi.fn(() => chain), innerJoin: vi.fn(() => chain),
      where: vi.fn(() => {
        selectCount++;
        return selectCount === 1
          ? { limit: vi.fn().mockResolvedValue([candidate]) }
          : options.preferenceError
            ? Promise.reject(options.preferenceError)
            : { limit: vi.fn().mockResolvedValue(options.preference === undefined
              ? [{ isEnabled: true, channels: ['email'] }]
              : options.preference === null ? [] : [options.preference]) };
      }),
      limit: vi.fn().mockResolvedValue([candidate]),
    };
    return chain;
  });
  const updates: any[] = [];
  update.mockImplementation(() => ({
    set: vi.fn((values: any) => {
      updates.push(values);
      return { where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue(updates.length === 1 ? claim : []) })) };
    }),
  }));
  if (options.noEmail) (candidate.agent as { email: string | null }).email = null;
  return updates;
}

describe('affiliate payout email delivery scheduler', () => {
  beforeEach(() => {
    select.mockReset(); update.mockReset(); sendEmail.mockReset();
    candidate.agent.email = 'agent@example.com';
  });

  it('sends and durably marks the confirmation sent', async () => {
    const updates = setup();
    sendEmail.mockResolvedValue(true);
    const result = await runAffiliatePayoutEmailDelivery(new Date('2026-01-01T00:00:00Z'));
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(updates[1]).toMatchObject({ emailStatus: 'sent', emailSentAt: expect.any(Date) });
    expect(result).toMatchObject({ found: 1, sent: 1, skipped: 0, failed: 0 });
  });

  it.each([false, new Error('temporary')])('retries a temporary %s failure with bounded backoff', async (failure) => {
    const updates = setup();
    failure instanceof Error ? sendEmail.mockRejectedValue(failure) : sendEmail.mockResolvedValue(failure);
    await runAffiliatePayoutEmailDelivery(new Date('2026-01-01T00:00:00Z'));
    expect(updates[1].emailStatus).toBe('pending');
    expect(updates[1].emailNextAttemptAt.getTime()).toBe(new Date('2026-01-01T00:01:00Z').getTime());
  });

  it('permanently fails at the attempt bound', async () => {
    const updates = setup({ claim: [{ ...payout, emailAttemptCount: 8 }] });
    sendEmail.mockResolvedValue(false);
    await runAffiliatePayoutEmailDelivery(new Date('2026-01-01T00:00:00Z'));
    expect(updates[1]).toMatchObject({ emailStatus: 'permanently_failed', emailNextAttemptAt: null });
  });

  it('retries preference lookup failures', async () => {
    const updates = setup({ preferenceError: new Error('database unavailable') });
    await runAffiliatePayoutEmailDelivery(new Date('2026-01-01T00:00:00Z'));
    expect(sendEmail).not.toHaveBeenCalled();
    expect(updates[1].emailStatus).toBe('pending');
  });

  it.each([
    [{ isEnabled: false, channels: [] }, 'opt-out'],
    [null, 'missing preference'],
  ])('marks %s as skipped without sending', async (preference, _label) => {
    const updates = setup({ preference });
    await runAffiliatePayoutEmailDelivery(new Date('2026-01-01T00:00:00Z'));
    expect(sendEmail).not.toHaveBeenCalled();
    expect(updates[1]).toMatchObject({ emailStatus: 'skipped', emailLastError: expect.any(String) });
  });

  it('marks an agent without an email as skipped', async () => {
    const updates = setup({ noEmail: true, preference: [{ isEnabled: true, channels: ['email'] }] });
    await runAffiliatePayoutEmailDelivery();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(updates[1].emailStatus).toBe('skipped');
  });

  it('does not send when the atomic claim is lost', async () => {
    setup({ claim: [] });
    const result = await runAffiliatePayoutEmailDelivery();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(result).toMatchObject({ found: 1, sent: 0, skipped: 0, failed: 0 });
  });
});