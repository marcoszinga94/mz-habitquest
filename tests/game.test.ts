import { describe, expect, it } from 'vitest';
import {
  activeStreakInWindow,
  addDays,
  computeMissedDays,
  computeStreak,
  completionsInWindow,
  evaluateAchievements,
  levelFromXp,
  levelProgress,
  resolveReto,
  streakBonus,
  xpForDifficulty,
  xpForLevel,
} from '../src/lib/game';

describe('niveles y XP', () => {
  it('nivel 1 requiere 0 XP y alcanzar nivel 2 requiere 100', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
  });

  it('levelFromXp devuelve el nivel correcto', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(249)).toBe(2);
    expect(levelFromXp(250)).toBe(3); // 100 + 150 = 250 llega a nivel 3
  });

  it('levelProgress expone la barra entre 0 y 1', () => {
    const p = levelProgress(50);
    expect(p.level).toBe(1);
    expect(p.progress).toBeGreaterThan(0);
    expect(p.progress).toBeLessThan(1);
    const done = levelProgress(100);
    expect(done.level).toBe(2);
  });

  it('XP por dificultad', () => {
    expect(xpForDifficulty('easy')).toBe(10);
    expect(xpForDifficulty('medium')).toBe(20);
    expect(xpForDifficulty('hard')).toBe(30);
  });

  it('bono de racha cada 7 días', () => {
    expect(streakBonus(6)).toBe(0);
    expect(streakBonus(7)).toBe(5);
    expect(streakBonus(14)).toBe(10);
  });
});

describe('rachas', () => {
  const today = '2026-08-24';

  it('cuenta racha consecutiva con check-in hoy', () => {
    const days = ['2026-08-24', '2026-08-23', '2026-08-22'];
    expect(computeStreak(days, today)).toBe(3);
  });

  it('si hoy no está, cuenta desde ayer (racha vigente)', () => {
    const days = ['2026-08-23', '2026-08-22'];
    expect(computeStreak(days, today)).toBe(2);
  });

  it('se rompe con un hueco', () => {
    const days = ['2026-08-24', '2026-08-22', '2026-08-21'];
    expect(computeStreak(days, today)).toBe(1);
  });

  it('con lista vacía la racha es 0', () => {
    expect(computeStreak([], today)).toBe(0);
  });
});

describe('días perdidos', () => {
  it('cuenta los días debidos sin check-in', () => {
    const checked = ['2026-08-22'];
    const due = ['2026-08-23', '2026-08-22', '2026-08-21'];
    expect(computeMissedDays(checked, due)).toBe(2);
  });
});

describe('ventanas para retos', () => {
  const start = '2026-08-01';
  const end = '2026-08-10';

  it('completionsInWindow cuenta solo días dentro de la ventana', () => {
    const days = ['2026-08-01', '2026-08-05', '2026-08-09', '2026-07-30'];
    expect(completionsInWindow(days, start, end)).toBe(3);
  });

  it('activeStreakInWindow mide racha consecutiva acotada', () => {
    const days = ['2026-08-10', '2026-08-09', '2026-08-08', '2026-08-01'];
    expect(activeStreakInWindow(days, start, end)).toBe(3);
  });
});

describe('resolución de retos', () => {
  it('gana quien tiene más progreso', () => {
    const res = resolveReto([
      { userId: 'a', progress: 5, joinedAt: new Date('2026-08-01') },
      { userId: 'b', progress: 8, joinedAt: new Date('2026-08-02') },
    ]);
    expect(res.winnerUserId).toBe('b');
    expect(res.tied).toBe(false);
  });

  it('empate lo gana quien se unió primero', () => {
    const res = resolveReto([
      { userId: 'a', progress: 8, joinedAt: new Date('2026-08-01') },
      { userId: 'b', progress: 8, joinedAt: new Date('2026-08-02') },
    ]);
    expect(res.winnerUserId).toBe('a');
  });

  it('sin participantes o con 0 progreso no hay ganador', () => {
    expect(resolveReto([]).winnerUserId).toBeNull();
    const res = resolveReto([
      { userId: 'a', progress: 0, joinedAt: new Date() },
      { userId: 'b', progress: 0, joinedAt: new Date() },
    ]);
    expect(res.winnerUserId).toBeNull();
  });
});

describe('logros', () => {
  it('desbloquea solo los que no se tenían', () => {
    const unlocked = evaluateAchievements(
      { totalCompletions: 1, streak: 7, level: 1, xp: 0, retosJoined: 0, retosWon: 0, checkinsToday: 0 },
      ['streak_7'],
    );
    const keys = unlocked.map((a) => a.key);
    expect(keys).toContain('first_step');
    expect(keys).not.toContain('streak_7');
  });

  it('no desbloquea nada si las condiciones no se cumplen', () => {
    const unlocked = evaluateAchievements(
      { totalCompletions: 0, streak: 0, level: 1, xp: 0, retosJoined: 0, retosWon: 0, checkinsToday: 0 },
      [],
    );
    expect(unlocked).toHaveLength(0);
  });
});

describe('utilidades de fechas', () => {
  it('addDays funciona a través de meses', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
});