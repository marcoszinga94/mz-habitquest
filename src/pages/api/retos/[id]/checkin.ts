import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../../../../db';
import { retoParticipants, retos } from '../../../../db/schema';
import type { Reto } from '../../../../db/schema';
import { apiError, json, requireUser } from '../../../../lib/http';
import {
  checkinReto,
  computeRetoProgress,
  refreshRetoProgress,
  retoCheckedToday,
  uncheckinReto,
} from '../../../../lib/retos';
import { toDateKey } from '../../../../lib/game';

async function loadReto(
  db: ReturnType<typeof getDb>,
  userId: string,
  retoId: string,
): Promise<{ reto: Reto } | null> {
  const retoRows = await db.select().from(retos).where(eq(retos.id, retoId));
  const reto = retoRows[0];
  if (!reto) return null;
  const pRows = await db
    .select()
    .from(retoParticipants)
    .where(and(eq(retoParticipants.retoId, reto.id), eq(retoParticipants.userId, userId)));
  if (pRows.length === 0) return null;
  return { reto };
}

export const POST: APIRoute = async ({ request, params }) => {
  const user = await requireUser(request);
  const db = getDb();
  const ctx = await loadReto(db, user.id, params.id ?? '');
  if (!ctx) return apiError(404, 'not_found');
  const reto = ctx.reto;
  if (reto.status !== 'active') return apiError(409, 'reto_finished');

  const today = toDateKey(new Date());
  if (await retoCheckedToday(db, reto.id, user.id, today)) {
    return apiError(409, 'already_checked');
  }

  await checkinReto(db, reto.id, user.id, today);
  await refreshRetoProgress(db, reto);
  const progress = await computeRetoProgress(db, reto, user.id);

  return json({ checkedToday: true, progress });
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const user = await requireUser(request);
  const db = getDb();
  const ctx = await loadReto(db, user.id, params.id ?? '');
  if (!ctx) return apiError(404, 'not_found');
  const reto = ctx.reto;

  const today = toDateKey(new Date());
  await uncheckinReto(db, reto.id, user.id, today);
  await refreshRetoProgress(db, reto);
  const progress = await computeRetoProgress(db, reto, user.id);

  return json({ checkedToday: false, progress });
};