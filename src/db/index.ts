import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '@/db/schema';

// Validate environment variables
const connectionUrl = process.env.TURSO_CONNECTION_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!connectionUrl) {
  throw new Error('TURSO_CONNECTION_URL environment variable is required');
}

if (!authToken) {
  throw new Error('TURSO_AUTH_TOKEN environment variable is required');
}

console.log('🔗 Initializing Turso database connection...');

const client = createClient({
  url: connectionUrl,
  authToken: authToken,
});

export const db = drizzle(client, { schema });

export type Database = typeof db;