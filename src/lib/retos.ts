import { and, eq, gte, lte } from 'drizzle-orm';
import type { Db } from '../db';
import { checkins, notifications, retoParticipants, retos } from '../db/schema';
import type { Reto, User } from '../db/schema';
import { activeStreakInWindow, addDays, completionsInWindow, resolveReto, toDateKey } from './game';

export async function computeRetoProgress(
  db: Db,
  reto: Reto,
  userId: string,
): Promise<number> {
  const start = toDateKey(reto.startsAt);
  const end = toDateKey(
    reto.endsAt.getTime() < Date.now() ? reto.endsAt : new Date(),
  );
  const rows = await db
    .select({ day: checkins.day })
    .from(checkins)
    .where(and(eq(checkins.userId, userId), gte(checkins.day, start), lte(checkins.day, end)));
  const days = rows.map((r) => r.day);

  if (reto.goalType === 'streak_days') {
    return Math.min(activeStreakInWindow(days, start, end), reto.goalTarget);
  }
  return Math.min(completionsInWindow(days, start, end), reto.goalTarget);
}

export async function refreshRetoProgress(db: Db, reto: Reto): Promise<void> {
  const participants = await db
    .select()
    .from(retoParticipants)
    .where(eq(retoParticipants.retoId, reto.id));
  for (const p of participants) {
    const progress = await computeRetoProgress(db, reto, p.userId);
    if (progress !== p.progress) {
      await db
        .update(retoParticipants)
        .set({ progress })
        .where(eq(retoParticipants.id, p.id));
    }
  }
}

export async function finishReto(db: Db, reto: Reto): Promise<void> {
  if (reto.status !== 'active') return;

  await refreshRetoProgress(db, reto);
  const participants = await db
    .select()
    .from(retoParticipants)
    .where(eq(retoParticipants.retoId, reto.id));
  const result = resolveReto(
    participants.map((p) => ({ userId: p.userId, progress: p.progress, joinedAt: p.joinedAt })),
  );

  await db
    .update(retos)
    .set({ status: 'finished', winnerId: result.winnerUserId })
    .where(eq(retos.id, reto.id));

  for (const p of participants) {
    const isWinner = p.userId === result.winnerUserId;
    const title = isWinner ? 'reto.won' : 'reto.lost';
    const body = isWinner ? 'reto.won_body' : 'reto.lost_body';
    await db.insert(notifications).values({
      userId: p.userId,
      type: 'reto',
      title,
      body,
    });
  }
}

export async function finishExpiredRetosForUser(db: Db, userId: string): Promise<void> {
  const active = await db
    .select()
    .from(retos)
    .where(and(eq(retos.status, 'active'), lte(retos.endsAt, new Date())));
  const involved = await db
    .select({ retoId: retoParticipants.retoId })
    .from(retoParticipants)
    .where(eq(retoParticipants.userId, userId));
  const ids = new Set(involved.map((r) => r.retoId));
  for (const reto of active) {
    if (ids.has(reto.id)) await finishReto(db, reto);
  }
}

export async function createReto(
  db: Db,
  creator: User,
  input: {
    name: string;
    emoji: string;
    description: string;
    goalType: 'streak_days' | 'completions';
    goalTarget: number;
    betPrize: string;
    days: number;
  },
): Promise<Reto> {
  const { generateRetoCode } = await import('./game');
  let code = generateRetoCode();
  while ((await db.select().from(retos).where(eq(retos.code, code))).length > 0) {
    code = generateRetoCode();
  }

  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + input.days * 24 * 60 * 60 * 1000);
  const [reto] = await db
    .insert(retos)
    .values({
      code,
      creatorId: creator.id,
      name: input.name,
      emoji: input.emoji,
      description: input.description,
      goalType: input.goalType,
      goalTarget: input.goalTarget,
      betPrize: input.betPrize,
      startsAt,
      endsAt,
    })
    .returning();

  await db.insert(retoParticipants).values({ retoId: reto.id, userId: creator.id });
  return reto;
}

export { addDays };