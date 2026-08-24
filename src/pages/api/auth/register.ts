import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../../db';
import { users } from '../../../db/schema';
import {
  createSessionToken,
  hashPassword,
  SESSION_COOKIE,
  sessionCookieOptions,
} from '../../../lib/auth';
import { apiError, json } from '../../../lib/http';

const schema = z.object({
  email: z.string().email().max(255),
  username: z.string().min(2).max(40),
  password: z.string().min(6).max(100),
});

export const POST: APIRoute = async ({ request, cookies }) => {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'Datos inválidos');
  }
  const { email, username, password } = parsed.data;

  const db = getDb();
  const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  if (existing.length > 0) {
    return apiError(409, 'email_in_use');
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({ email: email.toLowerCase(), username, passwordHash })
    .returning();

  const token = await createSessionToken({ userId: user.id });
  cookies.set(SESSION_COOKIE, token, sessionCookieOptions());

  return json({ user: { id: user.id, email: user.email, username: user.username, xp: 0, level: 1 } }, 201);
};