import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../../../../db';
import { friendRequests, notifications, users } from '../../../../db/schema';
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

  await db
    .update(friendRequests)
    .set({ status: 'accepted' })
    .where(eq(friendRequests.id, req.id));

  const fromRows = await db.select().from(users).where(eq(users.id, req.fromUserId));
  if (fromRows[0]) {
    await db.insert(notifications).values({
      userId: req.fromUserId,
      type: 'system',
      title: 'friends.accepted',
      body: me.username,
    });
  }

  return json({ ok: true });
};