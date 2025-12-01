// test/test-db.ts
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '../src/db/schema';

export function createTestDb() {
  const connectionUrl = process.env.TURSO_CONNECTION_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!connectionUrl) {
    throw new Error('TURSO_CONNECTION_URL environment variable is required');
  }

  if (!authToken) {
    throw new Error('TURSO_AUTH_TOKEN environment variable is required');
  }

  console.log('🔗 Initializing Turso database connection for testing...');

  const client = createClient({
    url: connectionUrl,
    authToken: authToken,
  });

  return drizzle(client, { schema });
}