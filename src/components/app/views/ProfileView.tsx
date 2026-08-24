import { useState } from 'react';
import { Heart, KeyRound, Medal, ShieldCheck, Trophy, Zap } from 'lucide-react';
import { api, type DashboardData } from '../lib/api';
import { useI18n, type Lang } from '../lib/i18n';

const AVATARS = ['🧙', '🦸', '🧝', '🧛', '🐉', '🦄', '🐺', '🦊', '🐱', '🦁', '🤖', '👽', '💪', '🔥'];

export function ProfileView({
  data,
  onSaved,
  pushToast,
}: {
  data: DashboardData;
  onSaved: () => void;
  pushToast: (t: { title: string; body?: string }) => void;
}) {
  const { t, lang, setLang } = useI18n();
  const { user } = data;
  const [username, setUsername] = useState(user.username);
  const [avatar, setAvatar] = useState(user.avatarEmoji);
  const [formLang, setFormLang] = useState<Lang>(user.lang as Lang);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const stats = {
    totalCompletions: data.habits.reduce((s, h) => s + h.totalCompletions, 0),
    bestStreak: Math.max(...data.habits.map((h) => h.streakBest), 0),
    achievements: data.achievements.filter((a) => a.unlocked).length,
    retosWon: data.retos.filter((r) => r.winnerId === user.id).length,
    retosLost: data.retos.filter((r) => r.status === 'finished' && r.winnerId && r.winnerId !== user.id).length,
  };

  const save = async () => {
    setBusy(true);
    try {
      const body: Record<string, unknown> = {};
      if (username !== user.username) body.username = username;
      if (avatar !== user.avatarEmoji) body.avatarEmoji = avatar;
      if (formLang !== user.lang) body.lang = formLang;
      if (currentPassword && newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }
      if (Object.keys(body).length === 0) {
        setBusy(false);
        return;
      }
      await api('/api/auth/me', { method: 'PATCH', body: JSON.stringify(body) });
      if (formLang !== lang) setLang(formLang);
      setCurrentPassword('');
      setNewPassword('');
      pushToast({
        title: currentPassword && newPassword ? t('profile.passwordChanged') : t('profile.saved'),
      });
      onSaved();
    } catch (e: any) {
      pushToast({
        title: e?.message === 'wrong_password' ? t('profile.wrongPassword') : t('profile.error'),
      });
    } finally {
      setBusy(false);
    }
  };

  const pct = Math.round(user.progress * 100);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-extrabold">{t('profile.title')}</h2>

      <section className="panel p-4 flex items-center gap-4">
        <div className="text-5xl avatar-glow rounded-xl bg-indigo-950/60 p-2 w-20 h-20 flex items-center justify-center">
          {avatar}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-extrabold">{username}</h3>
            <span className="text-xs font-bold bg-indigo-900 text-indigo-200 px-2 py-0.5 rounded-full">
              {t('dashboard.level')} {user.level}
            </span>
          </div>
          <div className="text-sm text-slate-400">{user.email}</div>
          <div className="flex items-center gap-3 mt-1 text-sm">
            <span className="inline-flex items-center gap-1 text-amber-300">
              <Zap size={14} /> {user.xp} {t('dashboard.xp')}
            </span>
            <span className="inline-flex items-center gap-1 text-red-300">
              <Heart size={14} /> {user.lives}/5
            </span>
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>
                {user.xp - user.currentLevelXp}/{user.nextLevelXp - user.currentLevelXp} XP
              </span>
              <span>{pct}%</span>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </section>

      <section className="panel p-4">
        <h3 className="font-bold mb-3">{t('profile.stats')}</h3>
        <div className="grid grid-cols-3 gap-3">
          <StatCell icon="✅" label={t('profile.totalCompletions')} value={stats.totalCompletions} />
          <StatCell icon="🔥" label={t('profile.bestStreak')} value={stats.bestStreak} />
          <StatCell icon="🏆" label={t('profile.achievements')} value={stats.achievements} />
          <StatCell icon="🥇" label={t('profile.retosWon')} value={stats.retosWon} />
          <StatCell icon="💀" label={t('profile.retosLost')} value={stats.retosLost} />
          <StatCell icon="🧬" label={t('profile.lang')} value={formLang.toUpperCase()} />
        </div>
      </section>

      <section className="panel p-4">
        <h3 className="font-bold mb-3">{t('profile.edit')}</h3>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span>{t('profile.username')}</span>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={40} />
          </label>

          <div className="flex flex-col gap-2 text-sm">
            <span>{t('profile.avatar')}</span>
            <div className="grid grid-cols-7 gap-2">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`text-2xl rounded-lg border-2 p-1 ${avatar === a ? 'border-indigo-400 bg-indigo-900/50' : 'border-transparent hover:bg-slate-800'}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1 text-sm">
            <span>{t('profile.lang')}</span>
            <div className="flex gap-2">
              {(['es', 'en'] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setFormLang(l)}
                  className={`btn flex-1 py-2 ${formLang === l ? 'btn-primary' : 'btn-ghost'}`}
                >
                  {l === 'es' ? 'Español' : 'English'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="panel p-4">
        <h3 className="font-bold mb-3 inline-flex items-center gap-2">
          <KeyRound size={16} /> {t('profile.changePassword')}
        </h3>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span>{t('profile.currentPassword')}</span>
            <input className="input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>{t('profile.newPassword')}</span>
            <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} />
          </label>
        </div>
      </section>

      <button className="btn btn-primary py-2.5 text-base" onClick={save} disabled={busy}>
        {t('profile.save')}
      </button>
    </div>
  );
}

function StatCell({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="bg-slate-900/50 rounded-lg p-2.5 text-center">
      <div className="text-lg">{icon}</div>
      <div className="text-xl font-extrabold text-indigo-200">{value}</div>
      <div className="text-[11px] text-slate-400 leading-tight">{label}</div>
    </div>
  );
}