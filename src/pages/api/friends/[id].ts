import type { APIRoute } from 'astro';
import { and, eq, or } from 'drizzle-orm';
import { getDb } from '../../../db';
import { friendRequests } from '../../../db/schema';
import { apiError, json, requireUser } from '../../../lib/http';

export const DELETE: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  const db = getDb();
  const friendId = params.id ?? '';

  const rows = await db
    .select()
    .from(friendRequests)
    .where(
      and(
        eq(friendRequests.status, 'accepted'),
        or(
          and(eq(friendRequests.fromUserId, me.id), eq(friendRequests.toUserId, friendId)),
          and(eq(friendRequests.fromUserId, friendId), eq(friendRequests.toUserId, me.id)),
        ),
      ),
    );
  const rel = rows[0];
  if (!rel) return apiError(404, 'not_found');

  await db.delete(friendRequests).where(eq(friendRequests.id, rel.id));
  return json({ ok: true });
};