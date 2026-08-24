import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { users } from '../db/schema';
import type { User } from '../db/schema';
import { getSessionToken, verifySessionToken } from './auth';

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export function apiError(status: number, message: string): Response {
  return json({ error: message }, status);
}

export async function getCurrentUser(request: Request): Promise<User | null> {
  const token = getSessionToken(request);
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.id, payload.userId));
  return rows[0] ?? null;
}

export async function requireUser(request: Request): Promise<User> {
  const user = await getCurrentUser(request);
  if (!user) throw new UnauthorizedError();
  return user;
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
  }
}