import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Medal,
  Swords,
  CheckCircle2,
  User,
  Users,
  X,
} from 'lucide-react';
import { api, type CheckinResult, type DashboardData, type HabitData } from './lib/api';
import { isScheduledOn } from '../../lib/game';
import { I18nProvider, useI18n } from './lib/i18n';
import { subscribeToPush } from './lib/push';
import { DashboardView } from './views/DashboardView';
import { HabitsView } from './views/HabitsView';
import { RetosView } from './views/RetosView';
import { AchievementsView } from './views/AchievementsView';
import { ProfileView } from './views/ProfileView';
import { FriendsView } from './views/FriendsView';

export type View = 'dashboard' | 'habits' | 'retos' | 'achievements' | 'profile' | 'friends';

interface Toast {
  id: number;
  icon?: 'xp' | 'achievement' | 'level' | 'info';
  title: string;
  body?: string;
}

let toastId = 0;

const NAV_ITEMS: { key: View; href: string; labelKey: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', href: '/app', labelKey: 'nav.dashboard', icon: <LayoutDashboard size={18} /> },
  { key: 'habits', href: '/app/habits', labelKey: 'nav.habits', icon: <CheckCircle2 size={18} /> },
  { key: 'retos', href: '/app/retos', labelKey: 'nav.retos', icon: <Swords size={18} /> },
  { key: 'friends', href: '/app/amigos', labelKey: 'nav.friends', icon: <Users size={18} /> },
  { key: 'achievements', href: '/app/logros', labelKey: 'nav.achievements', icon: <Medal size={18} /> },
  { key: 'profile', href: '/app/perfil', labelKey: 'nav.profile', icon: <User size={18} /> },
];

function AppInner({ view }: { view: View }) {
  const { t, lang, setLang } = useI18n();
  const [data, setData] = useState<DashboardData | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [langOpen, setLangOpen] = useState(false);
  const reminderFiredRef = useRef<Set<string>>(new Set());

  const pushToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { ...toast, id }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000);
  }, []);

  const load = useCallback(async () => {
    const d = await api<DashboardData>('/api/dashboard');
    setData(d);
  }, []);

  useEffect(() => {
    load().catch((e) => {
      if (e?.status === 401) window.location.href = '/login';
      else pushToast({ title: t('common.error'), body: String(e?.message ?? '') });
    });
  }, [load, t, pushToast]);

  useEffect(() => {
    if ('Notification' in window) setNotifPermission(Notification.permission);
    if ('Notification' in window && Notification.permission === 'granted') {
      subscribeToPush().catch(() => {});
    }
  }, []);

  const checkReminders = useCallback(() => {
    if (!data || !data.habits.length) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const now = new Date();
    const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todayKey = now.toISOString().slice(0, 10);
    for (const h of data.habits) {
      if (!h.reminderEnabled || h.checkedToday || h.reminderTime !== hm) continue;
      if (!isScheduledOn(h.scheduleDays, now)) continue;
      const key = `${h.id}:${todayKey}:${hm}`;
      if (reminderFiredRef.current.has(key)) continue;
      reminderFiredRef.current.add(key);
      new Notification(t('app.title'), {
        body: t('notif.reminder.body', { habit: h.name }),
        tag: key,
      });
    }
  }, [data, t]);

  useEffect(() => {
    checkReminders();
    const id = window.setInterval(checkReminders, 30000);
    return () => window.clearInterval(id);
  }, [checkReminders]);

  const askReminders = async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      const ok = await subscribeToPush();
      pushToast({
        icon: 'info',
        title: ok ? t('nav.reminders.on') : t('nav.reminders.pushError'),
      });
    }
  };

  const logout = async () => {
    await api('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const markRead = async () => {
    await api('/api/notifications/read', { method: 'POST' });
    setData((d) => (d ? { ...d, notifications: d.notifications.map((n) => ({ ...n, read: true })) } : d));
  };

  const handleCheckin = useCallback(
    async (habit: HabitData) => {
      const res = await api<{ result?: CheckinResult }>(
        `/api/habits/${habit.id}/checkin`,
        { method: 'POST' },
      );
      const r = res.result;
      if (r) {
        pushToast({
          icon: 'xp',
          title: t('toast.xp', { xp: r.xpGained }),
          body: r.levelUp ? t('habits.level_up', { level: r.newLevel }) : undefined,
        });
        if (r.unlocked.length > 0) {
          for (const d of r.unlocked) {
            pushToast({ icon: 'achievement', title: t(d.nameKey), body: `+${d.xp} XP` });
          }
        }
      }
      await load();
    },
    [load, t, pushToast],
  );

  const handleHabitSaved = useCallback(() => load(), [load]);
  const handleRetoCreated = useCallback(async () => {
    await load();
    window.location.href = '/app/retos';
  }, [load]);
  const handleRetoJoined = useCallback(async () => {
    await load();
    window.location.href = '/app/retos';
  }, [load]);
  const handleRetoUpdated = useCallback(async () => {
    await load();
  }, [load]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl text-indigo-300">
        {t('app.title')}…
      </div>
    );
  }

  const unread = data.stats.unreadNotifications;

  return (
    <div className="min-h-screen lg:flex lg:items-start lg:justify-center lg:max-w-7xl lg:mx-auto lg:px-6">
      <aside className="hidden lg:flex lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:flex-col lg:py-6 lg:mr-6">
        <a href="/app" className="flex items-center gap-3 px-3 mb-8">
          <div className="text-3xl sword-glow">⚔️</div>
          <h1 className="text-2xl font-extrabold tracking-tight gold-text">{t('app.title')}</h1>
        </a>
        <nav className="flex flex-col gap-1.5">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${view === item.key ? 'nav-item-active' : 'nav-item hover:bg-white/5'}`}
            >
              {item.icon}
              {t(item.labelKey)}
            </a>
          ))}
        </nav>
        <div className="mt-auto panel p-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{data.user.avatarEmoji}</span>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{data.user.username}</div>
              <div className="text-[11px] text-amber-300">
                {data.user.xp} {t('dashboard.xp')} · {t('dashboard.level')} {data.user.level}
              </div>
            </div>
          </div>
          <div className="bar-track mt-2">
            <div className="bar-fill" style={{ width: `${Math.round(data.user.progress * 100)}%` }} />
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 max-w-2xl mx-auto px-3 lg:px-0 lg:py-6 pb-28 lg:pb-10">
      <header className="flex items-center gap-3 py-3 border-b-2 border-slate-800">
        <a href="/app" className="flex items-center gap-3 lg:hidden">
          <div className="text-2xl sword-glow">⚔️</div>
          <h1 className="text-xl font-extrabold tracking-tight gold-text">{t('app.title')}</h1>
        </a>
        <div className="ml-auto flex items-center gap-1">
          <div className="relative">
            <button
              className="btn btn-ghost p-2.5 relative"
              onClick={() => setNotifOpen((o) => !o)}
              aria-label={t('nav.notifications')}
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                  {unread}
                </span>
              )}
            </button>
            {notifOpen && <NotificationsPopover data={data} onClose={() => setNotifOpen(false)} onMarkRead={markRead} t={t} />}
          </div>

          <div className="relative">
            <button className="btn btn-ghost px-2.5 py-2.5 flex items-center gap-1" onClick={() => setLangOpen((o) => !o)}>
              {lang === 'es' ? 'ES' : 'EN'}
              <ChevronDown size={14} />
            </button>
            {langOpen && (
              <div className="absolute right-0 mt-1 panel p-1 z-50 w-32 animate-in">
                {(['es', 'en'] as const).map((l) => (
                  <button
                    key={l}
                    className={`block w-full text-left px-3 py-1.5 rounded ${lang === l ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}
                    onClick={() => {
                      setLang(l);
                      setLangOpen(false);
                    }}
                  >
                    {l === 'es' ? 'Español' : 'English'}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="btn btn-ghost p-2.5" onClick={logout} aria-label={t('nav.logout')}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="mt-5">
        {view === 'dashboard' && (
          <DashboardView data={data} onCheckin={handleCheckin} onReminders={askReminders} notifPermission={notifPermission} />
        )}
        {view === 'habits' && <HabitsView data={data} onCheckin={handleCheckin} onSaved={handleHabitSaved} />}
        {view === 'retos' && (
          <RetosView
            data={data}
            onCreated={handleRetoCreated}
            onJoined={handleRetoJoined}
            onUpdated={handleRetoUpdated}
            pushToast={pushToast}
          />
        )}
        {view === 'achievements' && <AchievementsView data={data} />}
        {view === 'profile' && <ProfileView data={data} onSaved={load} pushToast={pushToast} />}
        {view === 'friends' && <FriendsView pushToast={pushToast} />}
      </main>
      </div>

      <nav className="lg:hidden safe-bottom fixed bottom-0 inset-x-0 z-40 bg-[#0b0e1a] border-t-2 border-slate-800">
        <div className="max-w-md mx-auto grid grid-cols-6">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.key}
              href={item.href}
              className={`nav-item flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold ${view === item.key ? 'nav-active' : ''}`}
            >
              {item.icon}
              {t(item.labelKey)}
            </a>
          ))}
        </div>
      </nav>

      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80">
          {toasts.map((toast) => (
            <div key={toast.id} className="panel toast-glow p-3 flex items-start gap-3">
              <div className="text-xl">
                {toast.icon === 'xp' && '✨'}
                {toast.icon === 'achievement' && '🏆'}
                {toast.icon === 'level' && '⬆️'}
                {toast.icon === 'info' && '🔔'}
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm">{toast.title}</div>
                {toast.body && <div className="text-xs text-slate-400">{toast.body}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationsPopover({
  data,
  onClose,
  onMarkRead,
  t,
}: {
  data: DashboardData;
  onClose: () => void;
  onMarkRead: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const mapTitle = (title: string) => {
    if (title.startsWith('reto.') || title.startsWith('friends.')) return t(`notif.${title}`, {});
    if (title.startsWith('ach.')) return t(title);
    return title;
  };
  return (
    <div className="absolute right-0 mt-2 panel p-3 z-50 w-80 animate-in">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-sm">{t('notifications.title')}</span>
        <button className="text-xs text-indigo-300 hover:underline" onClick={onMarkRead}>
          {t('notifications.markRead')}
        </button>
      </div>
      <div className="max-h-72 overflow-y-auto flex flex-col gap-2">
        {data.notifications.length === 0 && (
          <div className="text-sm text-slate-400 py-4 text-center">{t('notifications.empty')}</div>
        )}
        {data.notifications.map((n) => (
          <div key={n.id} className={`rounded-lg p-2 text-sm ${n.read ? 'bg-slate-800/50' : 'bg-indigo-900/40'}`}>
            <div className="font-semibold">
              {n.type === 'achievement' ? '🏆' : n.type === 'reto' ? '⚔️' : '🔔'} {mapTitle(n.title)}
            </div>
            {n.body && <div className="text-xs text-slate-400">{n.body}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AppShell({ view }: { view: View }) {
  return (
    <I18nProvider>
      <AppInner view={view} />
    </I18nProvider>
  );
}