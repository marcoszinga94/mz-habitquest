import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../db';
import { retoParticipants, retos, users } from '../../../db/schema';
import { apiError, json, requireUser } from '../../../lib/http';
import { refreshRetoProgress } from '../../../lib/retos';

export const GET: APIRoute = async ({ request, params }) => {
  const user = await requireUser(request);
  const db = getDb();
  const rows = await db.select().from(retos).where(eq(retos.id, params.id ?? ''));
  const reto = rows[0];
  if (!reto) return apiError(404, 'not_found');

  await refreshRetoProgress(db, reto);

  const participants = await db
    .select({
      userId: retoParticipants.userId,
      progress: retoParticipants.progress,
      prizeFulfilled: retoParticipants.prizeFulfilled,
      prizeConfirmed: retoParticipants.prizeConfirmed,
      joinedAt: retoParticipants.joinedAt,
      username: users.username,
      avatarEmoji: users.avatarEmoji,
    })
    .from(retoParticipants)
    .innerJoin(users, eq(users.id, retoParticipants.userId))
    .where(eq(retoParticipants.retoId, reto.id));

  return json({
    reto,
    participants: participants.sort((a, b) => b.progress - a.progress),
    me: user.id,
  });
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const user = await requireUser(request);
  const db = getDb();
  const rows = await db.select().from(retos).where(eq(retos.id, params.id ?? ''));
  const reto = rows[0];
  if (!reto) return apiError(404, 'not_found');
  if (reto.creatorId !== user.id) return apiError(403, 'forbidden');
  if (reto.status !== 'finished') return apiError(409, 'reto_active');

  await db.delete(retos).where(eq(retos.id, reto.id));
  return json({ ok: true });
};