import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../../../../db';
import { friendRequests } from '../../../../db/schema';
import { apiError, json, requireUser } from '../../../../lib/http';

export const POST: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  const db = getDb();

  const rows = await db
    .select()
    .from(friendRequests)
    .where(
      and(
        eq(friendRequests.id, params.id ?? ''),
        eq(friendRequests.toUserId, me.id),
        eq(friendRequests.status, 'pending'),
      ),
    );
  const req = rows[0];
  if (!req) return apiError(404, 'not_found');

  await db.delete(friendRequests).where(eq(friendRequests.id, req.id));
  return json({ ok: true });
};