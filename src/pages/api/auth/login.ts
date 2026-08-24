import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../../db';
import { users } from '../../../db/schema';
import {
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifyPassword,
} from '../../../lib/auth';
import { apiError, json } from '../../../lib/http';
import { levelProgress } from '../../../lib/game';

const schema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(100),
});

export const POST: APIRoute = async ({ request, cookies }) => {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'Datos inválidos');
  }
  const { email, password } = parsed.data;

  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  const user = rows[0];
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return apiError(401, 'invalid_credentials');
  }

  const token = await createSessionToken({ userId: user.id });
  cookies.set(SESSION_COOKIE, token, sessionCookieOptions());

  return json({ user: { id: user.id, email: user.email, username: user.username, ...levelProgress(user.xp) } });
};