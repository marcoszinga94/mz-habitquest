import type { APIRoute } from 'astro';
import { and, eq, inArray, or } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../../db';
import { friendRequests, notifications, users } from '../../../db/schema';
import { apiError, json, requireUser } from '../../../lib/http';
import { levelProgress } from '../../../lib/game';

export function publicUserFields(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    username: u.username,
    avatarEmoji: u.avatarEmoji,
    avatarPhoto: u.avatarPhoto,
    xp: u.xp,
    ...levelProgress(u.xp),
  };
}

export const GET: APIRoute = async ({ request }) => {
  const me = await requireUser(request);
  const db = getDb();

  const accepted = await db
    .select()
    .from(friendRequests)
    .where(
      and(
        eq(friendRequests.status, 'accepted'),
        or(eq(friendRequests.fromUserId, me.id), eq(friendRequests.toUserId, me.id)),
      ),
    );

  const otherIds = accepted.map((r) => (r.fromUserId === me.id ? r.toUserId : r.fromUserId));
  const friendRows = otherIds.length > 0
    ? await db.select().from(users).where(inArray(users.id, otherIds))
    : [];
  const friends = friendRows.map((u) => publicUserFields(u));

  const incomingRows = await db
    .select()
    .from(friendRequests)
    .where(and(eq(friendRequests.toUserId, me.id), eq(friendRequests.status, 'pending')));
  const incomingFrom = await db
    .select()
    .from(users)
    .where(inArray(users.id, incomingRows.map((r) => r.fromUserId)));
  const incoming = incomingRows.map((r) => {
    const from = incomingFrom.find((u) => u.id === r.fromUserId);
    return { id: r.id, from: from ? publicUserFields(from) : null, createdAt: r.createdAt };
  });

  const outgoingRows = await db
    .select()
    .from(friendRequests)
    .where(and(eq(friendRequests.fromUserId, me.id), eq(friendRequests.status, 'pending')));
  const outgoingTo = await db
    .select()
    .from(users)
    .where(inArray(users.id, outgoingRows.map((r) => r.toUserId)));
  const outgoing = outgoingRows.map((r) => {
    const to = outgoingTo.find((u) => u.id === r.toUserId);
    return { id: r.id, to: to ? publicUserFields(to) : null, createdAt: r.createdAt };
  });

  return json({ friends, incoming, outgoing });
};

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

  return json({ ok: true });
};