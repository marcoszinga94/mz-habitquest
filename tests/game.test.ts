import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENTS,
  activeStreakInWindow,
  addDays,
  computeStreak,
  completionsInWindow,
  evaluateAchievements,
  isScheduledOn,
  levelFromXp,
  levelProgress,
  parseScheduleDays,
  resolveReto,
  scheduleToFrequency,
  xpForCheckin,
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

  it('XP por racha: base 10 + 2 por día adicional', () => {
    expect(xpForCheckin(1)).toBe(10);
    expect(xpForCheckin(2)).toBe(12);
    expect(xpForCheckin(7)).toBe(22);
    expect(xpForCheckin(30)).toBe(68);
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

  it('cada logro otorga XP y todos tienen recompensa', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.xp).toBeGreaterThan(0);
    }
  });

  it('la recompensa XP de los desbloqueados se puede sumar', () => {
    const unlocked = evaluateAchievements(
      { totalCompletions: 100, streak: 30, level: 10, xp: 2700, retosJoined: 1, retosWon: 1, checkinsToday: 1 },
      [],
    );
    const total = unlocked.reduce((sum, a) => sum + a.xp, 0);
    expect(total).toBeGreaterThan(0);
    expect(unlocked).toHaveLength(ACHIEVEMENTS.length);
  });

  it('los retos desbloquean reto_first y reto_win con su XP', () => {
    const first = evaluateAchievements(
      { totalCompletions: 0, streak: 0, level: 1, xp: 0, retosJoined: 1, retosWon: 0, checkinsToday: 0 },
      [],
    );
    const win = evaluateAchievements(
      { totalCompletions: 0, streak: 0, level: 1, xp: 0, retosJoined: 1, retosWon: 1, checkinsToday: 0 },
      ['reto_first'],
    );
    expect(first.map((a) => a.key)).toContain('reto_first');
    expect(win.map((a) => a.key)).toContain('reto_win');
    expect(first.find((a) => a.key === 'reto_first')?.xp).toBe(50);
    expect(win.find((a) => a.key === 'reto_win')?.xp).toBe(150);
  });
});

describe('agenda semanal', () => {
  it('parseScheduleDays convierte y normaliza los días', () => {
    expect([...parseScheduleDays('1,3,5')]).toEqual([1, 3, 5]);
    expect(parseScheduleDays('').size).toBe(7);
    expect(parseScheduleDays(null).size).toBe(7);
    expect(parseScheduleDays('9,1').has(9)).toBe(false);
  });

  it('isScheduledOn respeta el día de la semana (0=domingo..6=sábado)', () => {
    const lunes = new Date(2026, 7, 24); // 24/08/2026 es lunes
    expect(lunes.getDay()).toBe(1);
    expect(isScheduledOn('1,3,5', lunes)).toBe(true);
    expect(isScheduledOn('1,3,5', new Date(2026, 7, 25))).toBe(false);
    expect(isScheduledOn(undefined, lunes)).toBe(true);
  });

  it('scheduleToFrequency deriva frecuencia y meta semanal', () => {
    expect(scheduleToFrequency(new Set([0, 1, 2, 3, 4, 5, 6]))).toEqual({ frequency: 'daily', targetPerWeek: 7 });
    expect(scheduleToFrequency(new Set([1, 3, 5]))).toEqual({ frequency: 'weekly', targetPerWeek: 3 });
  });
});

describe('utilidades de fechas', () => {
  it('addDays funciona a través de meses', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
});