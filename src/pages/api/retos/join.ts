import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../../db';
import { retoParticipants, retos } from '../../../db/schema';
import { apiError, json, requireUser } from '../../../lib/http';
import { createNotification } from '../../../lib/engine';
import { refreshRetoProgress } from '../../../lib/retos';

const schema = z
  .object({
    code: z.string().min(6).max(8).toUpperCase().optional(),
    retoId: z.string().uuid().optional(),
  })
  .refine((v) => v.code || v.retoId, { message: 'need_code_or_id' });

export const POST: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, 'invalid_code');
  const db = getDb();

  const rows = parsed.data.retoId
    ? await db.select().from(retos).where(eq(retos.id, parsed.data.retoId))
    : await db.select().from(retos).where(eq(retos.code, parsed.data.code ?? ''));
  const reto = rows[0];
  if (!reto) return apiError(404, 'reto_not_found');
  if (reto.status !== 'active') return apiError(409, 'reto_finished');

  const existing = await db
    .select()
    .from(retoParticipants)
    .where(and(eq(retoParticipants.retoId, reto.id), eq(retoParticipants.userId, user.id)));
  if (existing.length === 0) {
    await db.insert(retoParticipants).values({ retoId: reto.id, userId: user.id });
  }

  await refreshRetoProgress(db, reto);
  await createNotification(db, user.id, 'reto', 'reto.joined', reto.name);

  return json({ reto });
};