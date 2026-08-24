export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? 'error');
  }
  return data as T;
}

export interface LevelInfo {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progress: number;
}

export interface UserData {
  id: string;
  email: string;
  username: string;
  avatarEmoji: string;
  avatarPhoto: string | null;
  xp: number;
  lang: string;
  level: number;
  progress: number;
  currentLevelXp: number;
  nextLevelXp: number;
}

export interface HabitData {
  id: string;
  name: string;
  emoji: string;
  frequency: 'daily' | 'weekly';
  targetPerWeek: number;
  difficulty: 'easy' | 'medium' | 'hard';
  reminderEnabled: boolean;
  reminderTime: string;
  checkedToday: boolean;
  streak: number;
  streakBest: number;
  totalCompletions: number;
  createdAt: string;
}

export interface AchievementData {
  key: string;
  icon: string;
  nameKey: string;
  descKey: string;
  unlocked: boolean;
}

export interface RetoData {
  id: string;
  code: string;
  name: string;
  emoji: string;
  description: string;
  goalType: 'streak_days' | 'completions';
  goalTarget: number;
  betPrize: string;
  startsAt: string;
  endsAt: string;
  status: 'active' | 'finished';
  winnerId: string | null;
  isCreator: boolean;
  myProgress: number;
  prizeFulfilled: boolean;
  prizeConfirmed: boolean;
}

export interface NotificationData {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface DashboardData {
  user: UserData;
  habits: HabitData[];
  achievements: AchievementData[];
  notifications: NotificationData[];
  retos: RetoData[];
  stats: {
    checkedToday: number;
    totalHabits: number;
    unreadNotifications: number;
  };
}

export interface CheckinResult {
  xpGained: number;
  levelUp: boolean;
  newLevel: number;
  unlocked: { key: string }[];
  streak: number;
}