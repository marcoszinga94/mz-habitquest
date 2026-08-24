import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../../db';
import { retoParticipants, retos, users } from '../../../db/schema';
import { apiError, json, requireUser } from '../../../lib/http';
import { refreshRetoProgress } from '../../../lib/retos';

const patchSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    emoji: z.string().min(1).max(8).optional(),
    description: z.string().max(280).optional(),
    goalType: z.enum(['streak_days', 'completions']).optional(),
    goalTarget: z.number().int().min(1).max(365).optional(),
    betPrize: z.string().max(200).optional(),
    days: z.number().int().min(1).max(90).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'empty' });

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

export const PATCH: APIRoute = async ({ request, params }) => {
  const user = await requireUser(request);
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, 'invalid_data');
  const db = getDb();

  const rows = await db.select().from(retos).where(eq(retos.id, params.id ?? ''));
  const reto = rows[0];
  if (!reto) return apiError(404, 'not_found');
  if (reto.creatorId !== user.id) return apiError(403, 'forbidden');
  if (reto.status !== 'active') return apiError(409, 'reto_finished');

  const d = parsed.data;
  const updates: Record<string, unknown> = {};
  if (d.name) updates.name = d.name;
  if (d.emoji) updates.emoji = d.emoji;
  if (d.description !== undefined) updates.description = d.description;
  if (d.goalType) updates.goalType = d.goalType;
  if (d.goalTarget) updates.goalTarget = d.goalTarget;
  if (d.betPrize !== undefined) updates.betPrize = d.betPrize;
  if (d.days) {
    updates.endsAt = new Date(reto.startsAt.getTime() + d.days * 24 * 60 * 60 * 1000);
  }

  const [updated] = await db
    .update(retos)
    .set(updates)
    .where(eq(retos.id, reto.id))
    .returning();
  return json({ reto: updated });
};