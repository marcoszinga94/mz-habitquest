import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../db';
import { notifications } from '../../../db/schema';
import { json, requireUser } from '../../../lib/http';

export const POST: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  const db = getDb();
  await db.update(notifications).set({ read: true }).where(eq(notifications.userId, user.id));
  return json({ ok: true });
};