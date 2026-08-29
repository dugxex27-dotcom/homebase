const { Client } = require('pg');
(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const identity = await client.query(
      "SELECT current_database() AS database_name, current_user AS database_user, inet_server_addr()::text AS server_address, inet_server_port() AS server_port"
    );
    const targets = await client.query(
      "SELECT id, stripe_customer_id, stripe_subscription_id, subscription_status, stripe_subscription_event_at, updated_at FROM users WHERE id IN ('6ed0832d-6f6a-455c-abc2-a57c28540bbb','2c1ebc5a-005e-4f9a-b889-94506b3d4c29') ORDER BY id"
    );
    console.log(JSON.stringify({ databaseIdentity: identity.rows[0], targetRowCount: targets.rowCount, targetRows: targets.rows }, null, 2));
  } finally {
    await client.end();
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
