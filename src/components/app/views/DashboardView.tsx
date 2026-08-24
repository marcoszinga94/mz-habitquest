import { ChevronRight, Flame, Swords, Zap } from 'lucide-react';
import type { DashboardData, HabitData } from '../lib/api';
import { useI18n } from '../lib/i18n';

export function DashboardView({
  data,
  onCheckin,
  onReminders,
  onNavigate,
  notifPermission,
}: {
  data: DashboardData;
  onCheckin: (habit: HabitData) => void;
  onReminders: () => void;
  onNavigate: (view: 'habits' | 'retos') => void;
  notifPermission: NotificationPermission;
}) {
  const { t } = useI18n();
  const { user } = data;
  const xpToNext = user.nextLevelXp - user.currentLevelXp;
  const pct = Math.round(user.progress * 100);

  return (
    <div className="flex flex-col gap-4">
      <section className="panel p-4 flex items-center gap-4">
        <div className="avatar-glow rounded-xl bg-indigo-950/60 p-2 w-20 h-20 flex items-center justify-center overflow-hidden">
          {user.avatarPhoto ? (
            <img src={user.avatarPhoto} alt={user.username} className="w-full h-full object-cover rounded-lg" />
          ) : (
            <span className="text-5xl">{user.avatarEmoji}</span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold">{user.username}</h2>
            <span className="text-xs font-bold bg-indigo-900 text-indigo-200 px-2 py-0.5 rounded-full">
              {t('dashboard.level')} {user.level}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
            <span className="inline-flex items-center gap-1 text-amber-300">
              <Zap size={14} /> {user.xp} {t('dashboard.xp')}
            </span>
            <span className="inline-flex items-center gap-1 text-orange-300">
              <Flame size={14} /> {t('dashboard.bestStreak')}: {Math.max(...data.habits.map((h) => h.streak), 0)}
            </span>
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>
                {user.xp - user.currentLevelXp}/{xpToNext} XP
              </span>
              <span>{pct}%</span>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <div className="panel p-3 text-center">
          <div className="text-2xl font-extrabold text-emerald-300">{data.stats.checkedToday}</div>
          <div className="text-xs text-slate-400">{t('dashboard.stats.today')}</div>
        </div>
        <div className="panel p-3 text-center">
          <div className="text-2xl font-extrabold text-indigo-300">{data.stats.totalHabits}</div>
          <div className="text-xs text-slate-400">{t('dashboard.stats.habits')}</div>
        </div>
        <div className="panel p-3 text-center">
          <div className="text-2xl font-extrabold text-amber-300">{user.level}</div>
          <div className="text-xs text-slate-400">{t('dashboard.stats.level')}</div>
        </div>
      </section>

      {notifPermission !== 'granted' && (
        <button className="btn btn-ghost text-sm py-2" onClick={onReminders}>
          🔔 {t('nav.reminders')}
        </button>
      )}

      <section className="panel p-4 relative">
        <button type="button" onClick={() => onNavigate('habits')} className="absolute inset-0 rounded-lg" aria-label={t('nav.habits')} />
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">{t('habits.title')}</h3>
          <ChevronRight size={16} className="text-indigo-300 pointer-events-none" />
        </div>
        {data.habits.length === 0 ? (
          <div className="text-sm text-slate-400 text-center py-6">{t('habits.empty')}</div>
        ) : (
          <div className="flex flex-col gap-2">
            {data.habits.map((h) => (
              <div key={h.id} className="flex items-center gap-3 bg-slate-900/50 rounded-lg p-2.5">
                <span className="text-xl">{h.emoji}</span>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{h.name}</div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    <span className="inline-flex items-center gap-0.5">
                      <Flame size={11} /> {h.streak}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onCheckin(h)}
                  disabled={h.checkedToday}
                  className={`relative z-10 btn px-3 py-1.5 text-sm ${h.checkedToday ? 'btn-gold opacity-70 pointer-events-none' : 'btn-primary'}`}
                >
                  {h.checkedToday ? t('habits.checked') : t('habits.check')}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel p-4 relative">
        <button type="button" onClick={() => onNavigate('retos')} className="absolute inset-0 rounded-lg" aria-label={t('nav.retos')} />
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">{t('retos.title')}</h3>
          <ChevronRight size={16} className="text-indigo-300 pointer-events-none" />
        </div>
        {data.retos.length === 0 ? (
          <div className="text-sm text-slate-400 text-center py-6">{t('retos.empty')}</div>
        ) : (
          <div className="flex flex-col gap-2">
            {data.retos.map((r) => (
              <div key={r.id} className="flex items-center gap-3 bg-slate-900/50 rounded-lg p-2.5">
                <span className="text-xl">{r.emoji}</span>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{r.name}</div>
                  <div className="text-[11px] text-slate-400">
                    {r.myProgress}/{r.goalTarget}
                  </div>
                </div>
                <div className="w-24 bar-track">
                  <div
                    className="bar-fill-gold"
                    style={{ width: `${Math.min(100, (r.myProgress / r.goalTarget) * 100)}%` }}
                  />
                </div>
                {r.status === 'finished' && (r.winnerId === data.user.id ? <TrophyLabel won /> : <TrophyLabel won={false} />)}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TrophyLabel({ won }: { won: boolean }) {
  const { t } = useI18n();
  return (
    <span className={`text-xs font-bold px-2 py-1 rounded-full ${won ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>
      {won ? '🏆' : '💀'}
    </span>
  );
}