import { useCallback, useEffect, useState } from 'react';
import { UserPlus, Check, X, Users, Swords } from 'lucide-react';
import {
  api,
  type FriendData,
  type FriendProfileData,
  type FriendsData,
} from '../lib/api';
import { useI18n } from '../lib/i18n';
import { ModalShell } from './HabitsView';

export function FriendsView({
  pushToast,
}: {
  pushToast: (t: { title: string; body?: string }) => void;
}) {
  const { t } = useI18n();
  const [data, setData] = useState<FriendsData | null>(null);
  const [email, setEmail] = useState('');
  const [viewing, setViewing] = useState<FriendData | null>(null);

  const load = useCallback(async () => {
    const d = await api<FriendsData>('/api/friends');
    setData(d);
  }, []);

  useEffect(() => {
    load().catch(() => pushToast({ title: t('common.error') }));
  }, [load, t, pushToast]);

  const addFriend = async () => {
    try {
      await api('/api/friends/request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setEmail('');
      pushToast({ title: t('friends.sent') });
      load();
    } catch (e: any) {
      const code = e?.message;
      pushToast({
        title:
          code === 'already_friends'
            ? t('friends.error.friends')
            : code === 'already_pending'
              ? t('friends.error.pending')
              : code === 'user_not_found'
                ? t('friends.error.notFound')
                : code === 'self'
                  ? t('friends.error.self')
                  : t('common.error'),
      });
    }
  };

  const respond = async (requestId: string, accept: boolean) => {
    await api(`/api/friends/${requestId}/${accept ? 'accept' : 'decline'}`, { method: 'POST' });
    load();
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-extrabold">{t('friends.title')}</h2>

      <section className="panel p-3">
        <div className="flex gap-2">
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('friends.addPlaceholder')}
          />
          <button className="btn btn-primary px-3" onClick={addFriend}>
            <UserPlus size={16} />
          </button>
        </div>
      </section>

      {data && data.incoming.length > 0 && (
        <section className="panel p-3 flex flex-col gap-2">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">{t('friends.incoming')}</h3>
          {data.incoming.map((r) => (
            <div key={r.id} className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-2">
              <Avatar user={r.from} />
              <div className="flex-1 font-semibold text-sm">{r.from?.username}</div>
              <button className="btn btn-gold p-1.5" onClick={() => respond(r.id, true)} aria-label={t('friends.accept')}>
                <Check size={16} />
              </button>
              <button className="btn btn-ghost p-1.5" onClick={() => respond(r.id, false)} aria-label={t('friends.decline')}>
                <X size={16} />
              </button>
            </div>
          ))}
        </section>
      )}

      <section className="panel p-3 flex flex-col gap-2">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">{t('friends.list')}</h3>
        {!data && <div className="text-sm text-slate-400 py-4 text-center">…</div>}
        {data && data.friends.length === 0 && (
          <div className="text-sm text-slate-400 py-4 text-center">{t('friends.empty')}</div>
        )}
        {data?.friends.map((f) => (
          <button
            key={f.id}
            onClick={() => setViewing(f)}
            className="flex items-center gap-3 bg-slate-900/50 hover:bg-slate-800/70 rounded-lg p-2 text-left"
          >
            <Avatar user={f} />
            <div className="flex-1">
              <div className="font-semibold text-sm">{f.username}</div>
              <div className="text-[11px] text-slate-400">
                {t('dashboard.level')} {f.level} · {f.xp} {t('dashboard.xp')}
              </div>
            </div>
            <span className="text-xs text-indigo-300">→</span>
          </button>
        ))}
      </section>

      {data && data.outgoing.length > 0 && (
        <section className="panel p-3 flex flex-col gap-2">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">{t('friends.outgoing')}</h3>
          {data.outgoing.map((r) => (
            <div key={r.id} className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-2">
              <Avatar user={r.to} />
              <div className="flex-1 font-semibold text-sm">{r.to?.username}</div>
              <span className="text-xs text-slate-500">{t('friends.pending')}</span>
            </div>
          ))}
        </section>
      )}

      {viewing && (
        <FriendProfileModal
          friend={viewing}
          onClose={() => setViewing(null)}
          onJoined={() => {
            setViewing(null);
            pushToast({ title: t('retos.joined') });
          }}
          pushToast={pushToast}
        />
      )}
    </div>
  );
}

function Avatar({ user }: { user: FriendData | null }) {
  const size = 'w-10 h-10';
  if (!user) return <div className={`${size} rounded-full bg-slate-800`} />;
  if (user.avatarPhoto) {
    return (
      <img src={user.avatarPhoto} alt={user.username} className={`${size} rounded-full object-cover`} />
    );
  }
  return (
    <div className={`${size} rounded-full bg-indigo-950 border border-slate-700 flex items-center justify-center text-xl`}>
      {user.avatarEmoji}
    </div>
  );
}

function FriendProfileModal({
  friend,
  onClose,
  onJoined,
  pushToast,
}: {
  friend: FriendData;
  onClose: () => void;
  onJoined: () => void;
  pushToast: (t: { title: string; body?: string }) => void;
}) {
  const { t } = useI18n();
  const [profile, setProfile] = useState<FriendProfileData | null>(null);

  useEffect(() => {
    api<FriendProfileData>(`/api/users/${friend.id}`)
      .then(setProfile)
      .catch(() => pushToast({ title: t('common.error') }));
  }, [friend.id, t, pushToast]);

  const join = async (retoId: string) => {
    await api('/api/retos/join', { method: 'POST', body: JSON.stringify({ retoId }) });
    const p = await api<FriendProfileData>(`/api/users/${friend.id}`);
    setProfile(p);
    onJoined();
  };

  return (
    <ModalShell title={friend.username} onClose={onClose}>
      {!profile ? (
        <div className="text-slate-400 text-center py-6">…</div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar user={profile.user as unknown as FriendData} />
            <div>
              <div className="font-bold">{profile.user.username}</div>
              <div className="text-xs text-slate-400">
                {t('dashboard.level')} {profile.user.level} · {profile.user.xp} {t('dashboard.xp')}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {profile.achievements.filter((a) => a.unlocked).map((a) => (
              <span key={a.key} className="text-xl" title={t(a.nameKey)}>
                {a.icon}
              </span>
            ))}
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-300 mb-2 inline-flex items-center gap-1.5">
              <Swords size={14} /> {t('friends.retos')}
            </h4>
            {profile.retos.length === 0 && (
              <div className="text-sm text-slate-500">{t('friends.noRetos')}</div>
            )}
            <div className="flex flex-col gap-2">
              {profile.retos.map((r) => (
                <div key={r.id} className="bg-slate-900/50 rounded-lg p-2 flex items-center gap-2">
                  <span className="text-2xl">{r.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{r.name}</div>
                    <div className="text-[11px] text-slate-400">
                      {r.myProgress}/{r.goalTarget} · {r.participantCount} 👥
                    </div>
                  </div>
                  {r.isMember ? (
                    <span className="text-xs text-emerald-300 font-semibold">{t('friends.member')}</span>
                  ) : (
                    <button className="btn btn-primary px-2.5 py-1 text-xs" onClick={() => join(r.id)}>
                      {t('retos.join')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  );
}