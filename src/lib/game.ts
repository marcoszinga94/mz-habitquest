export type Frequency = 'daily' | 'weekly';

export const BASE_XP = 10;
export const STREAK_XP_PER_DAY = 2;

/** XP por check-in: base 10 + 2 por cada día de racha adicional. */
export function xpForCheckin(streak: number): number {
  return BASE_XP + Math.max(0, streak - 1) * STREAK_XP_PER_DAY;
}

/** XP total necesario para alcanzar un nivel dado (nivel 1 = 0 XP). */
export function xpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += 100 + (i - 1) * 50;
  }
  return total;
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return level;
}

export interface LevelProgress {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progress: number; // 0..1
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelFromXp(xp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const span = nextLevelXp - currentLevelXp;
  const progress = span > 0 ? (xp - currentLevelXp) / span : 1;
  return { level, currentLevelXp, nextLevelXp, progress: Math.max(0, Math.min(1, progress)) };
}

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(dateKey: string, delta: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return toDateKey(dt);
}

/**
 * Racha de días consecutivos con check-in hasta `today`.
 * Si hoy no tiene check-in aún, cuenta desde ayer (racha vigente).
 */
export function computeStreak(checkedDays: string[], today: string): number {
  const set = new Set(checkedDays);
  let cursor = set.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Días con check-in dentro de una ventana (para progreso de retos). */
export function completionsInWindow(checkedDays: string[], start: string, end: string): number {
  const set = new Set(checkedDays);
  let cursor = start;
  let count = 0;
  while (cursor <= end) {
    if (set.has(cursor)) count++;
    cursor = addDays(cursor, 1);
  }
  return count;
}

/**
 * Rachas consecutivas con al menos un check-in dentro de una ventana [start..today].
 * Para retos tipo `streak_days`.
 */
export function activeStreakInWindow(checkedDays: string[], start: string, today: string): number {
  const set = new Set(checkedDays);
  let cursor = set.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (cursor >= start && set.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export interface AchievementDef {
  key: string;
  icon: string;
  nameKey: string;
  descKey: string;
  condition: (s: AchievementState) => boolean;
}

export interface AchievementState {
  totalCompletions: number;
  streak: number;
  level: number;
  xp: number;
  retosJoined: number;
  retosWon: number;
  checkinsToday: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    key: 'first_step',
    icon: '🌱',
    nameKey: 'ach.first_step',
    descKey: 'ach.first_step_desc',
    condition: (s) => s.totalCompletions >= 1,
  },
  {
    key: 'streak_7',
    icon: '🔥',
    nameKey: 'ach.streak_7',
    descKey: 'ach.streak_7_desc',
    condition: (s) => s.streak >= 7,
  },
  {
    key: 'streak_30',
    icon: '⚡',
    nameKey: 'ach.streak_30',
    descKey: 'ach.streak_30_desc',
    condition: (s) => s.streak >= 30,
  },
  {
    key: 'level_5',
    icon: '🎖️',
    nameKey: 'ach.level_5',
    descKey: 'ach.level_5_desc',
    condition: (s) => s.level >= 5,
  },
  {
    key: 'level_10',
    icon: '👑',
    nameKey: 'ach.level_10',
    descKey: 'ach.level_10_desc',
    condition: (s) => s.level >= 10,
  },
  {
    key: 'completions_100',
    icon: '💯',
    nameKey: 'ach.completions_100',
    descKey: 'ach.completions_100_desc',
    condition: (s) => s.totalCompletions >= 100,
  },
  {
    key: 'reto_first',
    icon: '🤝',
    nameKey: 'ach.reto_first',
    descKey: 'ach.reto_first_desc',
    condition: (s) => s.retosJoined >= 1,
  },
  {
    key: 'reto_win',
    icon: '🏆',
    nameKey: 'ach.reto_win',
    descKey: 'ach.reto_win_desc',
    condition: (s) => s.retosWon >= 1,
  },
];

/** Devuelve los logros recién desbloqueados (no estaban en unlockedKeys). */
export function evaluateAchievements(
  state: AchievementState,
  unlockedKeys: string[],
): AchievementDef[] {
  const owned = new Set(unlockedKeys);
  return ACHIEVEMENTS.filter((a) => !owned.has(a.key) && a.condition(state));
}

export interface RetoResult {
  winnerUserId: string | null;
  tied: boolean;
}

/**
 * Resuelve un reto al vencer: gana quien más progreso tenga.
 * Empate técnico => gana quien se unió primero. Todos con 0 => sin ganador.
 */
export function resolveReto(
  participants: { userId: string; progress: number; joinedAt: Date }[],
): RetoResult {
  if (participants.length === 0) return { winnerUserId: null, tied: false };
  const max = Math.max(...participants.map((p) => p.progress));
  const leaders = participants.filter((p) => p.progress === max);
  if (leaders.length === 0 || max === 0) return { winnerUserId: null, tied: false };
  const earliest = leaders.reduce((a, b) => (a.joinedAt <= b.joinedAt ? a : b));
  const tied = leaders.length > 1 && leaders.some((p) => p.joinedAt > earliest.joinedAt);
  return { winnerUserId: earliest.userId, tied };
}

export function generateRetoCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}