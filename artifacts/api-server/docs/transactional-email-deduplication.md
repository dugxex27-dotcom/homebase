# Transactional email deduplication

Any email triggered by a user-facing write operation must include
`deduplication` when it calls `sendEmail`.

Use a key derived from the stable business event, such as a message ID,
payment/transfer ID, record ID, or recipient plus document ID. Do not use a
new random request ID: retries must produce the same key.

```ts
await sendEmail({
  to,
  subject,
  text,
  html,
  deduplication: { key: `event-kind:${record.id}` },
});
```

The default window is five minutes. Longer windows are appropriate for
one-time events such as welcome emails and payout transfers. A duplicate is
given the same result as the original in-flight delivery. Failed SendGrid
calls release their reservation so a later retry is not lost.

This is a process-local request-retry guard. It prevents duplicate sends
within one API process, but does not coordinate separate server instances or
survive a restart. Use shared persistent idempotency when a notification
requires a fleet-wide guarantee.

Password-reset emails are intentionally excluded: each request creates a new
code, so suppressing the newest email would leave the user with an unsent
credential. Scheduled/batch emails should continue to use their persistent
scheduler records rather than this request-retry guard.