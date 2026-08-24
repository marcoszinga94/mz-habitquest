import type { APIRoute } from 'astro';
import { and, eq, or } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../../db';
import { friendRequests, notifications, users } from '../../../db/schema';
import { apiError, json, requireUser } from '../../../lib/http';
import { sendPushToUser } from '../../../lib/push';

const requestSchema = z.object({ email: z.string().email().max(255) });

export const POST: APIRoute = async ({ request }) => {
  const me = await requireUser(request);
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, 'invalid_data');
  const db = getDb();

  const targetRows = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email.toLowerCase()));
  const target = targetRows[0];
  if (!target) return apiError(404, 'user_not_found');
  if (target.id === me.id) return apiError(400, 'self');

  const existing = await db
    .select()
    .from(friendRequests)
    .where(
      or(
        and(eq(friendRequests.fromUserId, me.id), eq(friendRequests.toUserId, target.id)),
        and(eq(friendRequests.fromUserId, target.id), eq(friendRequests.toUserId, me.id)),
      ),
    );
  if (existing.length > 0) {
    return apiError(409, existing[0].status === 'accepted' ? 'already_friends' : 'already_pending');
  }

  await db.insert(friendRequests).values({ fromUserId: me.id, toUserId: target.id });
  await db.insert(notifications).values({
    userId: target.id,
    type: 'system',
    title: 'friends.request',
    body: me.username,
  });
  await sendPushToUser(db, target.id, {
    title: 'HabitQuest',
    body: `🤝 ${me.username} te envió una solicitud de amistad`,
    tag: 'friend',
  });

  return json({ ok: true });
};