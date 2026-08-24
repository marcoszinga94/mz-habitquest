import type { APIRoute } from 'astro';
import { and, eq, inArray, or } from 'drizzle-orm';
import { getDb } from '../../../db';
import { friendRequests, users } from '../../../db/schema';
import { json, requireUser } from '../../../lib/http';
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