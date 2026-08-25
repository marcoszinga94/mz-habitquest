import type { APIRoute } from 'astro';
import { and, eq, inArray, or } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../../../db';
import { friendRequests, retoParticipants, retos, users } from '../../../../db/schema';
import { apiError, json, requireUser } from '../../../../lib/http';
import { createNotification } from '../../../../lib/engine';
import { refreshRetoProgress } from '../../../../lib/retos';
import { sendPushToUser } from '../../../../lib/push';

const schema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(20),
});

export const POST: APIRoute = async ({ request, params }) => {
  const user = await requireUser(request);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, 'invalid_data');
  const db = getDb();

  const rows = await db.select().from(retos).where(eq(retos.id, params.id ?? ''));
  const reto = rows[0];
  if (!reto) return apiError(404, 'not_found');
  if (reto.status !== 'active') return apiError(409, 'reto_finished');

  const member = await db
    .select()
    .from(retoParticipants)
    .where(and(eq(retoParticipants.retoId, reto.id), eq(retoParticipants.userId, user.id)));
  if (member.length === 0 && reto.creatorId !== user.id) return apiError(403, 'forbidden');

  const invited = [...new Set(parsed.data.userIds)];

  const friendRows = await db
    .select()
    .from(friendRequests)
    .where(
      and(
        eq(friendRequests.status, 'accepted'),
        or(eq(friendRequests.fromUserId, user.id), eq(friendRequests.toUserId, user.id)),
      ),
    );
  const friendIds = new Set(
    friendRows.map((r) => (r.fromUserId === user.id ? r.toUserId : r.fromUserId)),
  );
  const valid = invited.filter((id) => friendIds.has(id));
  if (valid.length === 0) return apiError(400, 'no_friends');

  const existing = await db
    .select({ userId: retoParticipants.userId })
    .from(retoParticipants)
    .where(eq(retoParticipants.retoId, reto.id));
  const existingIds = new Set(existing.map((p) => p.userId));
  const toAdd = valid.filter((id) => !existingIds.has(id));
  if (toAdd.length > 0) {
    await db.insert(retoParticipants).values(toAdd.map((userId) => ({ retoId: reto.id, userId })));
  }

  await refreshRetoProgress(db, reto);

  for (const userId of toAdd) {
    await createNotification(db, userId, 'reto', 'reto.invited', reto.name);
    await sendPushToUser(db, userId, {
      title: reto.name,
      body: `⚔️ Te invitaron a un reto: ${reto.name}`,
      tag: `reto-${reto.id}`,
    });
  }

  const targets = await db.select().from(users).where(inArray(users.id, toAdd));
  return json({ invited: toAdd.length, users: targets.map((u) => u.username) });
};