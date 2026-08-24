import type { APIRoute } from 'astro';
import { and, desc, eq, gte } from 'drizzle-orm';
import { getDb } from '../../db';
import { achievements, checkins, habits, notifications, retoParticipants, retos } from '../../db/schema';
import { json, requireUser } from '../../lib/http';
import { ACHIEVEMENTS, addDays, levelProgress, toDateKey } from '../../lib/game';
import { computeHabitStats } from '../../lib/engine';
import { finishExpiredRetosForUser } from '../../lib/retos';

export const GET: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  const db = getDb();

  await finishExpiredRetosForUser(db, user.id);

  const today = toDateKey(new Date());
  const since = addDays(today, -45);

  const [habitRows, checkinRows, achRows, notifRows, retoRows, participantRows] = await Promise.all([
    db.select().from(habits).where(and(eq(habits.userId, user.id), eq(habits.archived, false))),
    db.select().from(checkins).where(and(eq(checkins.userId, user.id), gte(checkins.day, since))),
    db.select().from(achievements).where(eq(achievements.userId, user.id)),
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(30),
    db.select().from(retos).orderBy(desc(retos.createdAt)).limit(50),
    db.select().from(retoParticipants).where(eq(retoParticipants.userId, user.id)),
  ]);

  const byHabit = new Map<string, string[]>();
  for (const c of checkinRows) {
    const list = byHabit.get(c.habitId) ?? [];
    list.push(c.day);
    byHabit.set(c.habitId, list);
  }

  const habitsData = habitRows.map((h) => {
    const days = byHabit.get(h.id) ?? [];
    const stats = computeHabitStats(h, days, today);
    return {
      id: h.id,
      name: h.name,
      emoji: h.emoji,
      frequency: h.frequency,
      targetPerWeek: h.targetPerWeek,
      difficulty: h.difficulty,
      reminderEnabled: h.reminderEnabled,
      reminderTime: h.reminderTime,
      checkedToday: days.includes(today),
      streak: stats.streak,
      streakBest: Math.max(h.streakBest, stats.streak),
      totalCompletions: h.totalCompletions,
      createdAt: h.createdAt,
    };
  });

  const myRetoIds = new Set(participantRows.map((p) => p.retoId));
  const retosData = retoRows
    .filter((r) => myRetoIds.has(r.id))
    .map((r) => {
      const p = participantRows.find((pp) => pp.retoId === r.id);
      return {
        id: r.id,
        code: r.code,
        name: r.name,
        emoji: r.emoji,
        description: r.description,
        goalType: r.goalType,
        goalTarget: r.goalTarget,
        betPrize: r.betPrize,
        startsAt: r.startsAt,
        endsAt: r.endsAt,
        status: r.status,
        winnerId: r.winnerId,
        isCreator: r.creatorId === user.id,
        myProgress: p?.progress ?? 0,
        prizeFulfilled: p?.prizeFulfilled ?? false,
        prizeConfirmed: p?.prizeConfirmed ?? false,
      };
    });

  const unlocked = new Set(achRows.map((a) => a.key));
  const achievementsData = ACHIEVEMENTS.map((a) => ({
    key: a.key,
    icon: a.icon,
    nameKey: a.nameKey,
    descKey: a.descKey,
    unlocked: unlocked.has(a.key),
  }));

  const checkedToday = checkinRows.filter((c) => c.day === today).length;

  return json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      avatarEmoji: user.avatarEmoji,
      avatarPhoto: user.avatarPhoto,
      xp: user.xp,
      lang: user.lang,
      ...levelProgress(user.xp),
    },
    habits: habitsData,
    achievements: achievementsData,
    notifications: notifRows,
    retos: retosData,
    stats: {
      checkedToday,
      totalHabits: habitsData.length,
      unreadNotifications: notifRows.filter((n) => !n.read).length,
    },
  });
};