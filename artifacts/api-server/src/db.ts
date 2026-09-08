import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@workspace/db";

neonConfig.webSocketConstructor = ws;

const connectionString =
  process.env.NODE_ENV === "test" && process.env.TEST_DATABASE_URL
    ? process.env.TEST_DATABASE_URL
    : process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString, max: 50 });
export const db = drizzle({ 
  client: pool, 
  schema,
  casing: 'snake_case' // Enable automatic camelCase ↔ snake_case conversion
});
