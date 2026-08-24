import type { APIRoute } from 'astro';
import { and, eq, gte } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../../db';
import { checkins, habits } from '../../../db/schema';
import { apiError, json, requireUser } from '../../../lib/http';
import { addDays, toDateKey } from '../../../lib/game';
import { computeHabitStats } from '../../../lib/engine';

const createSchema = z.object({
  name: z.string().min(1).max(80),
  emoji: z.string().min(1).max(8).default('⭐'),
  frequency: z.enum(['daily', 'weekly']).default('daily'),
  targetPerWeek: z.number().int().min(1).max(7).default(7),
  reminderEnabled: z.boolean().default(false),
  reminderTime: z.string().regex(/^\d{2}:\d{2}$/).default('09:00'),
});

export const GET: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  const db = getDb();
  const today = toDateKey(new Date());
  const since = addDays(today, -45);

  const habitRows = await db
    .select()
    .from(habits)
    .where(and(eq(habits.userId, user.id), eq(habits.archived, false)));

  const checkinRows = await db
    .select({ habitId: checkins.habitId, day: checkins.day })
    .from(checkins)
    .where(and(eq(checkins.userId, user.id), gte(checkins.day, since)));

  const byHabit = new Map<string, string[]>();
  for (const c of checkinRows) {
    const list = byHabit.get(c.habitId) ?? [];
    list.push(c.day);
    byHabit.set(c.habitId, list);
  }

  const data = habitRows.map((h) => {
    const days = byHabit.get(h.id) ?? [];
    const stats = computeHabitStats(h, days, today);
    return {
      id: h.id,
      name: h.name,
      emoji: h.emoji,
      frequency: h.frequency,
      targetPerWeek: h.targetPerWeek,
      reminderEnabled: h.reminderEnabled,
      reminderTime: h.reminderTime,
      checkedToday: days.includes(today),
      streak: stats.streak,
      streakBest: Math.max(h.streakBest, stats.streak),
      totalCompletions: h.totalCompletions,
      createdAt: h.createdAt,
    };
  });

  return json({ habits: data });
};

export const POST: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, 'invalid_data');
  const db = getDb();

  const dup = await db
    .select()
    .from(habits)
    .where(and(eq(habits.userId, user.id), eq(habits.name, parsed.data.name)));
  const active = dup.find((h) => !h.archived);
  if (active) return apiError(409, 'habit_exists');

  const archived = dup.find((h) => h.archived);
  if (archived) {
    const [habit] = await db
      .update(habits)
      .set({ archived: false })
      .where(eq(habits.id, archived.id))
      .returning();
    return json({ habit }, 201);
  }

  const [habit] = await db.insert(habits).values({ userId: user.id, ...parsed.data }).returning();
  return json({ habit }, 201);
};