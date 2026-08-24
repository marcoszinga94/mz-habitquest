import type { APIRoute } from 'astro';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '../../../db';
import { notifications } from '../../../db/schema';
import { json, requireUser } from '../../../lib/http';

export const GET: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  const db = getDb();
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
  return json({ notifications: rows });
};