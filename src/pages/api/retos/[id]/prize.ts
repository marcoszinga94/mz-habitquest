import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../../../db';
import { retoParticipants, retos } from '../../../../db/schema';
import { apiError, json, requireUser } from '../../../../lib/http';

const schema = z.object({ action: z.enum(['fulfill', 'confirm']) });

export const POST: APIRoute = async ({ request, params }) => {
  const user = await requireUser(request);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, 'invalid_data');
  const db = getDb();

  const retoRows = await db.select().from(retos).where(eq(retos.id, params.id ?? ''));
  const reto = retoRows[0];
  if (!reto) return apiError(404, 'not_found');
  if (reto.status !== 'finished') return apiError(409, 'not_finished');

  const pRows = await db
    .select()
    .from(retoParticipants)
    .where(and(eq(retoParticipants.retoId, reto.id), eq(retoParticipants.userId, user.id)));
  const participant = pRows[0];
  if (!participant) return apiError(403, 'not_participant');

  const isWinner = reto.winnerId === user.id;
  if (parsed.data.action === 'fulfill') {
    if (!isWinner) return apiError(403, 'only_winner');
    await db
      .update(retoParticipants)
      .set({ prizeFulfilled: true })
      .where(eq(retoParticipants.id, participant.id));
  } else {
    if (isWinner) return apiError(403, 'only_loser');
    await db
      .update(retoParticipants)
      .set({ prizeConfirmed: true })
      .where(eq(retoParticipants.id, participant.id));
  }

  return json({ ok: true });
};