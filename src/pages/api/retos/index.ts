import type { APIRoute } from 'astro';
import { desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../../db';
import { retoParticipants, retos } from '../../../db/schema';
import { apiError, json, requireUser } from '../../../lib/http';
import { createReto } from '../../../lib/retos';

const createSchema = z.object({
  name: z.string().min(1).max(80),
  emoji: z.string().min(1).max(8).default('⚔️'),
  description: z.string().max(280).default(''),
  goalType: z.enum(['streak_days', 'completions']),
  goalTarget: z.number().int().min(1).max(365),
  betPrize: z.string().max(200).default(''),
  days: z.number().int().min(1).max(90),
});

export const GET: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  const db = getDb();
  const participants = await db
    .select()
    .from(retoParticipants)
    .where(eq(retoParticipants.userId, user.id));
  const ids = participants.map((p) => p.retoId);
  if (ids.length === 0) return json({ retos: [] });

  const rows = ids.length > 0
    ? await db.select().from(retos).where(inArray(retos.id, ids))
    : [];
  return json({ retos: rows });
};

export const POST: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, 'invalid_data');
  const db = getDb();

  const reto = await createReto(db, user, parsed.data);
  return json({ reto }, 201);
};