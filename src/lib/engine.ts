import { and, desc, eq, gt, gte, sql } from 'drizzle-orm';
import type { Db } from '../db';
import { achievements, checkins, habits, notifications, users } from '../db/schema';
import type { Habit, User } from '../db/schema';
import {
  addDays,
  computeStreak,
  evaluateAchievements,
  levelFromXp,
  streakBonus,
  toDateKey,
  xpForDifficulty,
  type AchievementDef,
  type Difficulty,
} from './game';

export function checkedDaysOf(checkinsOfHabit: { day: string }[]): string[] {
  return checkinsOfHabit.map((c) => c.day);
}

export interface HabitStats {
  streak: number;
  totalCompletions: number;
}

export function computeHabitStats(habit: Habit, days: string[], today: string): HabitStats {
  const streak = computeStreak(days, today);
  return {
    streak,
    totalCompletions: days.length,
  };
}

export async function loadCheckins(db: Db, habitId: string, since: string): Promise<string[]> {
  const rows = await db
    .select({ day: checkins.day })
    .from(checkins)
    .where(and(eq(checkins.habitId, habitId), gte(checkins.day, since)));
  return rows.map((r) => r.day);
}

export interface ApplyCheckinResult {
  xpGained: number;
  levelUp: boolean;
  newLevel: number;
  unlocked: AchievementDef[];
  streak: number;
}

export async function applyCheckin(
  db: Db,
  user: User,
  habit: Habit,
  today: string,
): Promise<ApplyCheckinResult> {
  const since = addDays(today, -45);
  const days = await loadCheckins(db, habit.id, since);

  const todayRow = await db
    .select({ id: checkins.id })
    .from(checkins)
    .where(and(eq(checkins.habitId, habit.id), eq(checkins.day, today)));
  if (todayRow.length > 0) {
    throw new CheckinError('already_checked');
  }

  const newDays = [...days, today];
  const streak = computeStreak(newDays, today);
  const xpGained = xpForDifficulty(habit.difficulty as Difficulty) + streakBonus(streak);

  const beforeLevel = levelFromXp(user.xp);
  const newXp = user.xp + xpGained;
  const afterLevel = levelFromXp(newXp);

  await db.batch([
    db.insert(checkins).values({ habitId: habit.id, userId: user.id, day: today }),
    db
      .update(habits)
      .set({
        totalCompletions: habit.totalCompletions + 1,
        streakBest: Math.max(habit.streakBest, streak),
      })
      .where(eq(habits.id, habit.id)),
    db.update(users).set({ xp: newXp }).where(eq(users.id, user.id)),
  ]);

  const unlocked = await unlockAchievements(db, user.id, {
    totalCompletions: habit.totalCompletions + 1,
    streak,
    level: afterLevel,
    xp: newXp,
  });

  return {
    xpGained,
    levelUp: afterLevel > beforeLevel,
    newLevel: afterLevel,
    unlocked,
    streak,
  };
}

async function unlockAchievements(
  db: Db,
  userId: string,
  state: {
    totalCompletions: number;
    streak: number;
    level: number;
    xp: number;
  },
): Promise<AchievementDef[]> {
  const owned = await db
    .select({ key: achievements.key })
    .from(achievements)
    .where(eq(achievements.userId, userId));
  const unlocked = evaluateAchievements(
    { ...state, retosJoined: 0, retosWon: 0, checkinsToday: 0 },
    owned.map((a) => a.key),
  );

  if (unlocked.length > 0) {
    const values = unlocked.map((a) => ({ userId, key: a.key }));
    await db.insert(achievements).values(values);
    await db.insert(notifications).values(
      values.map((v, i) => ({
        userId,
        type: 'achievement',
        title: v.key,
        body: unlocked[i].key,
      })),
    );
  }
  return unlocked;
}

export async function createNotification(
  db: Db,
  userId: string,
  type: string,
  title: string,
  body = '',
): Promise<void> {
  await db.insert(notifications).values({ userId, type, title, body });
}

export class CheckinError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

export async function getDashboardUser(db: Db, userId: string): Promise<User | null> {
  const rows = await db.select().from(users).where(eq(users.id, userId));
  return rows[0] ?? null;
}

export function recentNotificationsQuery(db: Db, userId: string) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export { sql };