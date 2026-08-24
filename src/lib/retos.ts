import { and, eq, gte, lte } from 'drizzle-orm';
import type { Db } from '../db';
import { notifications, retoCheckins, retoParticipants, retos } from '../db/schema';
import type { Reto, User } from '../db/schema';
import { activeStreakInWindow, addDays, completionsInWindow, resolveReto, toDateKey } from './game';
import { sendPushToUser } from './push';

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
    .select({ day: retoCheckins.day })
    .from(retoCheckins)
    .where(
      and(
        eq(retoCheckins.retoId, reto.id),
        eq(retoCheckins.userId, userId),
        gte(retoCheckins.day, start),
        lte(retoCheckins.day, end),
      ),
    );
  const days = rows.map((r) => r.day);

  if (reto.goalType === 'streak_days') {
    return Math.min(activeStreakInWindow(days, start, end), reto.goalTarget);
  }
  return Math.min(completionsInWindow(days, start, end), reto.goalTarget);
}

export async function retoCheckedToday(
  db: Db,
  retoId: string,
  userId: string,
  day: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: retoCheckins.id })
    .from(retoCheckins)
    .where(
      and(
        eq(retoCheckins.retoId, retoId),
        eq(retoCheckins.userId, userId),
        eq(retoCheckins.day, day),
      ),
    );
  return rows.length > 0;
}

export async function checkinReto(db: Db, retoId: string, userId: string, day: string): Promise<void> {
  await db.insert(retoCheckins).values({ retoId, userId, day });
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
    if (isWinner) {
      await sendPushToUser(db, p.userId, {
        title: reto.name,
        body: `🏆 ¡Ganaste el reto! ${reto.betPrize ? 'Cobra: ' + reto.betPrize : ''}`,
        tag: `reto-${reto.id}`,
      });
    } else {
      await sendPushToUser(db, p.userId, {
        title: reto.name,
        body: `💀 Perdiste el reto${reto.betPrize ? ', cumple: ' + reto.betPrize : ''}`,
        tag: `reto-${reto.id}`,
      });
    }
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