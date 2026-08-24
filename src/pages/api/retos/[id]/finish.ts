import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../../db';
import { retos } from '../../../../db/schema';
import { apiError, json, requireUser } from '../../../../lib/http';
import { finishReto } from '../../../../lib/retos';

export const POST: APIRoute = async ({ request, params }) => {
  const user = await requireUser(request);
  const db = getDb();
  const rows = await db.select().from(retos).where(eq(retos.id, params.id ?? ''));
  const reto = rows[0];
  if (!reto) return apiError(404, 'not_found');
  if (reto.creatorId !== user.id) return apiError(403, 'forbidden');
  if (reto.status !== 'active') return apiError(409, 'already_finished');

  await finishReto(db, reto);
  return json({ ok: true });
};