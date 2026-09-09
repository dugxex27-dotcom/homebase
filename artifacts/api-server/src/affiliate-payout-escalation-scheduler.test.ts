import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  selectWhere,
  claimReturning,
  releaseWhere,
  update,
  sendAlert,
} = vi.hoisted(() => ({
  selectWhere: vi.fn(),
  claimReturning: vi.fn(),
  releaseWhere: vi.fn(),
  update: vi.fn(),
  sendAlert: vi.fn(),
}));

vi.mock('./db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({ where: selectWhere })),
    })),
    update,
  },
}));

vi.mock('@workspace/db', () => ({
  affiliatePayouts: {
    id: 'id',
    agentId: 'agentId',
    amount: 'amount',
    status: 'status',
    errorMessage: 'errorMessage',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    escalationAlertSentAt: 'escalationAlertSentAt',
  },
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...values) => values),
  eq: vi.fn((left, right) => ({ left, right })),
  isNull: vi.fn((value) => ({ isNull: value })),
  lt: vi.fn((left, right) => ({ left, right })),
}));

vi.mock('./email-service', () => ({
  sendAffiliatePayoutFailureAdminAlert: sendAlert,
}));

import { runAffiliatePayoutEscalations } from './affiliate-payout-escalation-scheduler';

const stalePayout = {
  id: 'payout-1',
  affiliateReferralId: 'referral-1',
  agentId: 'agent-1',
  amount: '15.00',
  status: 'failed',
  stripeTransferId: null,
  errorMessage: 'Transfer rejected',
  paidAt: null,
  escalationAlertSentAt: null,
  createdAt: new Date('2026-09-06T00:00:00.000Z'),
  updatedAt: new Date('2026-09-06T00:00:00.000Z'),
};

describe('affiliate payout escalation scheduler', () => {
  beforeEach(() => {
    selectWhere.mockReset();
    claimReturning.mockReset();
    releaseWhere.mockReset();
    update.mockReset();
    sendAlert.mockReset();
    selectWhere.mockResolvedValue([stalePayout]);
    claimReturning.mockResolvedValue([stalePayout]);
    releaseWhere.mockResolvedValue(undefined);
    update
      .mockReturnValueOnce({
        set: vi.fn(() => ({
          where: vi.fn(() => ({ returning: claimReturning })),
        })),
      })
      .mockReturnValueOnce({
        set: vi.fn(() => ({ where: releaseWhere })),
      });
  });

  it('claims and sends one escalation for a stale failed payout', async () => {
    sendAlert.mockResolvedValue(true);

    const result = await runAffiliatePayoutEscalations(
      new Date('2026-09-09T00:00:00.000Z'),
    );

    expect(sendAlert).toHaveBeenCalledOnce();
    expect(sendAlert).toHaveBeenCalledWith(expect.objectContaining({
      payoutId: 'payout-1',
      agentId: 'agent-1',
      amount: '15.00',
    }));
    expect(result).toEqual({ found: 1, sent: 1, failed: 0 });
    expect(update).toHaveBeenCalledOnce();
  });

  it('does not send when another process already claimed the payout', async () => {
    claimReturning.mockResolvedValue([]);

    const result = await runAffiliatePayoutEscalations(
      new Date('2026-09-09T00:00:00.000Z'),
    );

    expect(sendAlert).not.toHaveBeenCalled();
    expect(result).toEqual({ found: 1, sent: 0, failed: 0 });
  });

  it('releases the claim when delivery fails so a later run can retry', async () => {
    sendAlert.mockResolvedValue(false);

    const result = await runAffiliatePayoutEscalations(
      new Date('2026-09-09T00:00:00.000Z'),
    );

    expect(releaseWhere).toHaveBeenCalledOnce();
    expect(result).toEqual({ found: 1, sent: 0, failed: 1 });
  });
});