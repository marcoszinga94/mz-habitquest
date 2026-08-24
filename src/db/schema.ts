import { relations } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull(),
  username: varchar('username', { length: 40 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  avatarEmoji: varchar('avatar_emoji', { length: 8 }).notNull().default('🧙'),
  avatarPhoto: text('avatar_photo'),
  xp: integer('xp').notNull().default(0),
  lang: varchar('lang', { length: 2 }).notNull().default('es'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const habits = pgTable(
  'habits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 80 }).notNull(),
    emoji: varchar('emoji', { length: 8 }).notNull().default('⭐'),
    frequency: varchar('frequency', { length: 10 }).notNull().default('daily'), // daily | weekly
    targetPerWeek: integer('target_per_week').notNull().default(7),
    difficulty: varchar('difficulty', { length: 10 }).notNull().default('medium'), // easy | medium | hard
    reminderEnabled: boolean('reminder_enabled').notNull().default(false),
    reminderTime: varchar('reminder_time', { length: 5 }).notNull().default('09:00'),
    streakBest: integer('streak_best').notNull().default(0),
    totalCompletions: integer('total_completions').notNull().default(0),
    archived: boolean('archived').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('habits_user_idx').on(t.userId),
    uniqueIndex('habit_name_user_idx').on(t.userId, t.name),
  ],
);

export const checkins = pgTable(
  'checkins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    habitId: uuid('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    day: date('day').notNull(), // YYYY-MM-DD
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('checkins_habit_idx').on(t.habitId),
    index('checkins_user_idx').on(t.userId),
    uniqueIndex('checkin_habit_day_idx').on(t.habitId, t.day),
  ],
);

export const achievements = pgTable(
  'achievements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    key: varchar('key', { length: 40 }).notNull(),
    unlockedAt: timestamp('unlocked_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('achievement_user_key_idx').on(t.userId, t.key)],
);

export const retos = pgTable('retos', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 8 }).notNull(),
  creatorId: uuid('creator_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 80 }).notNull(),
  emoji: varchar('emoji', { length: 8 }).notNull().default('⚔️'),
  description: varchar('description', { length: 280 }).notNull().default(''),
  goalType: varchar('goal_type', { length: 20 }).notNull(), // streak_days | completions
  goalTarget: integer('goal_target').notNull(),
  betPrize: varchar('bet_prize', { length: 200 }).notNull().default(''),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull().defaultNow(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  status: varchar('status', { length: 10 }).notNull().default('active'), // active | finished
  winnerId: uuid('winner_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const retoParticipants = pgTable(
  'reto_participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    retoId: uuid('reto_id')
      .notNull()
      .references(() => retos.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    progress: integer('progress').notNull().default(0),
    prizeFulfilled: boolean('prize_fulfilled').notNull().default(false),
    prizeConfirmed: boolean('prize_confirmed').notNull().default(false),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('reto_participant_unique_idx').on(t.retoId, t.userId)],
);

export const retoCheckins = pgTable(
  'reto_checkins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    retoId: uuid('reto_id')
      .notNull()
      .references(() => retos.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    day: date('day').notNull(), // YYYY-MM-DD
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('reto_checkins_reto_idx').on(t.retoId),
    index('reto_checkins_user_idx').on(t.userId),
    uniqueIndex('reto_checkin_unique_idx').on(t.retoId, t.userId, t.day),
  ],
);

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 20 }).notNull(), // achievement | reminder | reto | system
  title: varchar('title', { length: 120 }).notNull(),
  body: varchar('body', { length: 280 }).notNull().default(''),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  habits: many(habits),
  checkins: many(checkins),
  achievements: many(achievements),
  participants: many(retoParticipants),
}));

export const habitsRelations = relations(habits, ({ one, many }) => ({
  user: one(users, { fields: [habits.userId], references: [users.id] }),
  checkins: many(checkins),
}));

export const retosRelations = relations(retos, ({ one, many }) => ({
  creator: one(users, { fields: [retos.creatorId], references: [users.id] }),
  participants: many(retoParticipants),
  checkins: many(retoCheckins),
  winner: one(users, { fields: [retos.winnerId], references: [users.id] }),
}));

export const retoParticipantsRelations = relations(retoParticipants, ({ one }) => ({
  reto: one(retos, { fields: [retoParticipants.retoId], references: [retos.id] }),
  user: one(users, { fields: [retoParticipants.userId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type Habit = typeof habits.$inferSelect;
export type Checkin = typeof checkins.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type Reto = typeof retos.$inferSelect;
export type RetoParticipant = typeof retoParticipants.$inferSelect;
export type Notification = typeof notifications.$inferSelect;