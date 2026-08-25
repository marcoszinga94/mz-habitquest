import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../../db';
import { checkins, habits, users } from '../../../db/schema';
import { apiError, json, requireUser } from '../../../lib/http';
import { parseScheduleDays, scheduleToFrequency, xpFromCheckinDays } from '../../../lib/game';

const patchSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    emoji: z.string().min(1).max(8).optional(),
    frequency: z.enum(['daily', 'weekly']).optional(),
    targetPerWeek: z.number().int().min(1).max(7).optional(),
    scheduleDays: z.string().regex(/^([0-6](,[0-6])*)?$/).optional(),
    reminderEnabled: z.boolean().optional(),
    reminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'empty' });

export const PATCH: APIRoute = async ({ request, params }) => {
  const user = await requireUser(request);
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, 'invalid_data');
  const db = getDb();

  const existing = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, params.id ?? ''), eq(habits.userId, user.id)));
  if (existing.length === 0) return apiError(404, 'not_found');

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.scheduleDays !== undefined) {
    const days = parseScheduleDays(parsed.data.scheduleDays);
    const derived = scheduleToFrequency(days);
    data.scheduleDays = [...days].sort((a, b) => a - b).join(',');
    data.frequency = derived.frequency;
    data.targetPerWeek = derived.targetPerWeek;
  }

  const [habit] = await db
    .update(habits)
    .set(data)
    .where(eq(habits.id, existing[0].id))
    .returning();
  return json({ habit });
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const user = await requireUser(request);
  const db = getDb();
  const existing = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, params.id ?? ''), eq(habits.userId, user.id)));
  if (existing.length === 0) return apiError(404, 'not_found');
  const habit = existing[0];

  const days = await db
    .select({ day: checkins.day })
    .from(checkins)
    .where(eq(checkins.habitId, habit.id));
  const xpLost = xpFromCheckinDays(days.map((c) => c.day));

  await db.batch([
    db.delete(habits).where(eq(habits.id, habit.id)),
    db
      .update(users)
      .set({ xp: Math.max(0, user.xp - xpLost) })
      .where(eq(users.id, user.id)),
  ]);
  return json({ ok: true, xpLost });
};