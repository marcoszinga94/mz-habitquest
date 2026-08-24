import { Lock } from 'lucide-react';
import type { DashboardData } from '../lib/api';
import { useI18n } from '../lib/i18n';

export function AchievementsView({ data }: { data: DashboardData }) {
  const { t } = useI18n();
  const unlocked = data.achievements.filter((a) => a.unlocked);
  const locked = data.achievements.filter((a) => !a.unlocked);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-extrabold">{t('achievements.title')}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {unlocked.map((a) => (
          <div key={a.key} className="panel p-3 flex flex-col items-center text-center gap-1">
            <span className="text-3xl">{a.icon}</span>
            <span className="font-bold text-sm">{t(a.nameKey)}</span>
            <span className="text-[11px] text-slate-400">{t(a.descKey)}</span>
            <span className="text-[11px] font-bold text-emerald-400">+{a.xp} XP</span>
          </div>
        ))}
        {locked.map((a) => (
          <div key={a.key} className="panel p-3 flex flex-col items-center text-center gap-1 opacity-70 grayscale">
            <Lock className="text-slate-500 mt-2" size={20} />
            <span className="font-bold text-sm text-slate-500">{t(a.nameKey)}</span>
            <span className="text-[11px] text-slate-600">{t(a.descKey)}</span>
            <span className="text-[11px] font-bold text-slate-500">+{a.xp} XP</span>
          </div>
        ))}
      </div>
    </div>
  );
}