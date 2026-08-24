import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export function createDb(connectionString?: string) {
  const url =
    connectionString ??
    (import.meta.env.DATABASE_URL as string | undefined) ??
    process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL no está definida. Agrega tu cadena de conexión de Neon a .env');
  }
  const client = neon(url);
  return drizzle({ client, schema });
}

export function getDb() {
  return createDb();
}

export type Db = ReturnType<typeof createDb>;