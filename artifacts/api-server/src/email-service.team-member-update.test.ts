import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMock } = vi.hoisted(() => {
  process.env.SENDGRID_API_KEY = 'test-key';
  return { sendMock: vi.fn() };
});

vi.mock('@sendgrid/mail', () => ({
  default: {
    setApiKey: vi.fn(),
    send: sendMock,
  },
}));

vi.mock('./storage', () => ({ storage: {} }));
vi.mock('./db', () => ({ db: {} }));
vi.mock('./qa-access', () => ({ isSyntheticAccountUserId: vi.fn() }));

import { sendCompanyOwnerTeamActionEmail, sendTeamMemberAccountUpdatedEmail } from './email-service';

describe('sendTeamMemberAccountUpdatedEmail', () => {
  beforeEach(() => {
    sendMock.mockClear();
    sendMock.mockResolvedValue(undefined);
  });

  it('sends a summary of name and role changes to the affected user', async () => {
    const sent = await sendTeamMemberAccountUpdatedEmail(
      'tech@example.com',
      'Taylor Smith',
      [
        { field: 'Name', oldValue: 'Taylor Jones', newValue: 'Taylor Smith' },
        { field: 'Role', oldValue: 'tech', newValue: 'admin' },
      ],
    );

    expect(sent).toBe(true);
    expect(sendMock).toHaveBeenCalledOnce();
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'tech@example.com',
      subject: 'Your HomeBase account details were updated',
      text: expect.stringContaining('Name: Taylor Jones → Taylor Smith; Role: tech → admin'),
      html: expect.stringContaining('Taylor Smith'),
    }));
  });

  it('does not send when there are no name or role changes', async () => {
    await expect(sendTeamMemberAccountUpdatedEmail(
      'tech@example.com',
      'Taylor Smith',
      [],
    )).resolves.toBe(false);

    expect(sendMock).not.toHaveBeenCalled();
  });

  it('escapes user-controlled values in HTML email content', async () => {
    await sendTeamMemberAccountUpdatedEmail(
      'tech@example.com',
      '<script>alert(1)</script>',
      [{ field: 'Name', oldValue: 'Taylor', newValue: '<b>Taylor</b>' }],
    );

    const message = sendMock.mock.calls[0][0];
    expect(message.html).not.toContain('<script>');
    expect(message.html).not.toContain('<b>Taylor</b>');
    expect(message.html).toContain('&lt;b&gt;Taylor&lt;/b&gt;');
  });
});

describe('sendCompanyOwnerTeamActionEmail', () => {
  beforeEach(() => {
    sendMock.mockClear();
    sendMock.mockResolvedValue(undefined);
  });

  it('includes the member, action, actor, and UTC date/time', async () => {
    const sent = await sendCompanyOwnerTeamActionEmail(
      'owner@example.com',
      'Olivia Owner',
      'Taylor Tech',
      'suspended',
      'Alex Admin',
      new Date('2026-09-09T14:30:00.000Z'),
      'company-1:member-1:suspended:2026-09-09T14:30:00.000Z',
    );

    expect(sent).toBe(true);
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'owner@example.com',
      subject: 'HomeBase team member suspended: Taylor Tech',
      text: expect.stringMatching(/Taylor Tech was suspended by Alex Admin on .*UTC/),
      html: expect.stringContaining('Olivia Owner'),
    }));
    const message = sendMock.mock.calls[0][0];
    expect(message.html).toContain('Taylor Tech');
    expect(message.html).toContain('Alex Admin');
    expect(message.html).toContain('September 9, 2026');
  });

  it('escapes names in the HTML body', async () => {
    await sendCompanyOwnerTeamActionEmail(
      'owner@example.com',
      '<b>Owner</b>',
      '<script>member</script>',
      'removed',
      '<img src=x>',
      new Date('2026-09-09T14:30:00.000Z'),
      'event-2',
    );

    const message = sendMock.mock.calls[0][0];
    expect(message.html).not.toContain('<script>');
    expect(message.html).not.toContain('<img src=x>');
    expect(message.html).toContain('&lt;b&gt;Owner&lt;/b&gt;');
  });
});