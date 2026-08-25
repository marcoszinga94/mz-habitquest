import { useEffect, useState } from 'react';
import { Copy, Plus, Swords, Users, Check, Flag, LogIn, Trash2, Pencil, Trophy, UserPlus } from 'lucide-react';
import { api, type DashboardData, type FriendData, type RetoData, type RetoParticipantData } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { ModalShell } from './HabitsView';
import { EmojiPicker } from '../EmojiPicker';

export function RetosView({
  data,
  onCreated,
  onJoined,
  onUpdated,
  pushToast,
}: {
  data: DashboardData;
  onCreated: () => void;
  onJoined: () => void;
  onUpdated: () => void;
  pushToast: (t: { title: string; body?: string }) => void;
}) {
  const { t } = useI18n();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [editReto, setEditReto] = useState<RetoData | null>(null);
  const [rankReto, setRankReto] = useState<RetoData | null>(null);
  const [inviteReto, setInviteReto] = useState<RetoData | null>(null);

  const active = data.retos.filter((r) => r.status === 'active');
  const finished = data.retos.filter((r) => r.status === 'finished');

  const closeModals = () => {
    setCreateOpen(false);
    setEditReto(null);
  };

  const afterSave = () => {
    closeModals();
    onCreated();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold">{t('retos.title')}</h2>
        <div className="flex gap-2">
          <button className="btn btn-ghost px-3 py-1.5 text-sm flex items-center gap-1" onClick={() => setJoinOpen(true)}>
            <LogIn size={16} /> {t('retos.join')}
          </button>
          <button className="btn btn-primary px-3 py-1.5 text-sm flex items-center gap-1" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> {t('retos.create')}
          </button>
        </div>
      </div>

      {data.retos.length === 0 && (
        <div className="panel p-8 text-center text-slate-400">{t('retos.empty')}</div>
      )}

      {active.length > 0 && (
        <div className="flex flex-col gap-3">
          {active.map((r) => (
            <RetoCard key={r.id} reto={r} me={data.user.id} onUpdated={onUpdated} onToast={pushToast} onEdit={setEditReto} onRanking={setRankReto} onInvite={setInviteReto} />
          ))}
        </div>
      )}

      {finished.length > 0 && (
        <>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mt-2">{t('retos.finished')}</h3>
          <div className="flex flex-col gap-3">
            {finished.map((r) => (
              <RetoCard key={r.id} reto={r} me={data.user.id} onUpdated={onUpdated} onToast={pushToast} onEdit={setEditReto} onRanking={setRankReto} onInvite={setInviteReto} />
            ))}
          </div>
        </>
      )}

      {(createOpen || editReto) && <RetoFormModal editing={editReto} onClose={closeModals} onCreated={afterSave} />}
      {joinOpen && <JoinRetoModal onClose={() => setJoinOpen(false)} onJoined={onJoined} onToast={pushToast} />}
      {rankReto && (
        <LeaderboardModal
          retoId={rankReto.id}
          name={rankReto.name}
          goalTarget={rankReto.goalTarget}
          onClose={() => setRankReto(null)}
        />
      )}
      {inviteReto && (
        <InviteFriendsModal
          reto={inviteReto}
          onClose={() => setInviteReto(null)}
          onInvited={() => {
            setInviteReto(null);
            onUpdated();
          }}
        />
      )}
    </div>
  );
}

function RetoCard({
  reto,
  me,
  onUpdated,
  onToast,
  onEdit,
  onRanking,
  onInvite,
}: {
  reto: RetoData;
  me: string;
  onUpdated: () => void;
  onToast: (t: { title: string; body?: string }) => void;
  onEdit: (r: RetoData) => void;
  onRanking: (r: RetoData) => void;
  onInvite: (r: RetoData) => void;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pct = Math.min(100, Math.round((reto.myProgress / reto.goalTarget) * 100));
  const isWinner = reto.winnerId === me;
  const settled = reto.prizeFulfilled && reto.prizeConfirmed;

  const copyCode = async () => {
    await navigator.clipboard.writeText(reto.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const finishEarly = async () => {
    await api(`/api/retos/${reto.id}/finish`, { method: 'POST' });
    onUpdated();
  };

  const settle = async (action: 'fulfill' | 'confirm') => {
    await api(`/api/retos/${reto.id}/prize`, { method: 'POST', body: JSON.stringify({ action }) });
    onUpdated();
  };

  const remove = async () => {
    await api(`/api/retos/${reto.id}`, { method: 'DELETE' });
    onToast({ title: t('retos.deleted') });
    onUpdated();
  };

  const checkin = async () => {
    await api(`/api/retos/${reto.id}/checkin`, { method: 'POST' });
    onUpdated();
  };

  const ends = new Date(reto.endsAt).toLocaleDateString();

  return (
    <div className="panel p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{reto.emoji}</span>
        <div className="flex-1">
          <div className="font-extrabold">{reto.name}</div>
          <div className="text-[11px] text-slate-400">
            {reto.goalType === 'streak_days' ? t('retos.goal.streak_days') : t('retos.goal.completions')} · {reto.goalTarget} · {t('retos.endsAt')}: {ends}
          </div>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${reto.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
          {reto.status === 'active' ? t('retos.active') : t('retos.finished')}
        </span>
        <button className="btn btn-ghost p-1.5" onClick={() => onRanking(reto)} aria-label={t('retos.ranking')}>
          <Trophy size={14} className="text-amber-300" />
        </button>
        {reto.status === 'finished' && reto.isCreator && (
          <button
            onClick={() => (confirmDelete ? remove() : setConfirmDelete(true))}
            onBlur={() => window.setTimeout(() => setConfirmDelete(false), 1500)}
            className={`btn ${confirmDelete ? 'btn-danger' : 'btn-ghost'} p-1.5`}
            aria-label={t('retos.delete')}
          >
            {confirmDelete ? <span className="px-1 text-xs">{t('retos.deleteConfirm')}</span> : <Trash2 size={14} />}
          </button>
        )}
      </div>

      {reto.description && <div className="text-sm text-slate-400">{reto.description}</div>}

      <div>
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>{t('retos.progress')}: {reto.myProgress}/{reto.goalTarget}</span>
          <span>{pct}%</span>
        </div>
        <div className="bar-track">
          <div className="bar-fill-gold" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {reto.status === 'active' && (
        <button
          onClick={checkin}
          disabled={reto.checkedToday}
          className={`btn py-2 text-sm ${reto.checkedToday ? 'btn-gold opacity-70' : 'btn-primary'}`}
        >
          {reto.checkedToday ? t('retos.checkedin') : t('retos.checkin')}
        </button>
      )}

      {reto.status === 'active' && (
        <div className="flex items-center gap-2 bg-slate-900/60 rounded-lg p-2">
          <span className="text-xs text-slate-400">{t('retos.invite')}</span>
          <span className="font-mono font-bold text-sm bg-indigo-900/50 px-2 py-0.5 rounded">{reto.code}</span>
          <button className="btn btn-ghost p-1.5" onClick={copyCode} aria-label={t('retos.copy')}>
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
          <button className="btn btn-ghost p-1.5 ml-auto" onClick={() => onInvite(reto)} aria-label={t('retos.inviteFriends')}>
            <UserPlus size={14} className="text-indigo-300" />
          </button>
        </div>
      )}

      {reto.status === 'active' && reto.isCreator && (
        <div className="flex gap-2">
          <button className="btn btn-ghost flex-1 text-sm py-1.5 flex items-center justify-center gap-1" onClick={() => onEdit(reto)}>
            <Pencil size={14} /> {t('retos.edit')}
          </button>
          <button className="btn btn-ghost flex-1 text-sm py-1.5 flex items-center justify-center gap-1" onClick={finishEarly}>
            <Flag size={14} /> {t('retos.finishEarly')}
          </button>
        </div>
      )}

      {reto.status === 'finished' && (
        <div className="bg-slate-900/60 rounded-lg p-2 flex items-center gap-2 text-sm">
          <span>{isWinner ? '🏆' : '💀'}</span>
          <span className="font-bold">{isWinner ? t('retos.youWin') : t('retos.youLost')}</span>
          {reto.betPrize && (
            <span className="text-xs text-slate-400 ml-auto truncate">
              {isWinner ? t('retos.owe') : t('retos.owe')} {reto.betPrize}
            </span>
          )}
        </div>
      )}

      {reto.status === 'finished' && reto.betPrize && !settled && (
        <div className="flex gap-2">
          {isWinner && !reto.prizeFulfilled && (
            <button className="btn btn-gold flex-1 text-sm py-1.5" onClick={() => settle('fulfill')}>
              {t('retos.fulfill')}
            </button>
          )}
          {!isWinner && !reto.prizeConfirmed && (
            <button className="btn btn-gold flex-1 text-sm py-1.5" onClick={() => settle('confirm')}>
              {t('retos.confirm')}
            </button>
          )}
          {reto.prizeFulfilled && <span className="flex-1 text-center text-xs text-emerald-300 font-semibold">✓ {t('retos.fulfilled')}</span>}
          {reto.prizeConfirmed && <span className="flex-1 text-center text-xs text-emerald-300 font-semibold">✓ {t('retos.confirmed')}</span>}
        </div>
      )}
      {reto.status === 'finished' && settled && (
        <div className="text-center text-xs text-emerald-300 font-bold py-1">✓ {t('retos.settled')}</div>
      )}
    </div>
  );
}

function RetoFormModal({
  editing,
  onClose,
  onCreated,
}: {
  editing: RetoData | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(editing?.name ?? '');
  const [emoji, setEmoji] = useState(editing?.emoji ?? '⚔️');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [goalType, setGoalType] = useState<'streak_days' | 'completions'>(editing?.goalType ?? 'streak_days');
  const [goalTarget, setGoalTarget] = useState(editing?.goalTarget ?? 7);
  const [days, setDays] = useState(editing ? Math.max(1, Math.round((new Date(editing.endsAt).getTime() - new Date(editing.startsAt).getTime()) / 86400000)) : 7);
  const [betPrize, setBetPrize] = useState(editing?.betPrize ?? '');
  const [error, setError] = useState('');

  const submit = async () => {
    try {
      const body = JSON.stringify({ name, emoji, description, goalType, goalTarget, days, betPrize });
      if (editing) {
        await api(`/api/retos/${editing.id}`, { method: 'PATCH', body });
      } else {
        await api('/api/retos', { method: 'POST', body });
      }
      onCreated();
    } catch {
      setError(t('common.error'));
    }
  };

  return (
    <ModalShell title={editing ? t('retos.edit') : t('retos.create')} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span>{t('retos.name')}</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t('retos.emoji')}</span>
          <EmojiPicker value={emoji} onChange={setEmoji} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t('retos.description')}</span>
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={280} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t('form.frequency')}</span>
          <div className="flex gap-2">
            <button className={`btn flex-1 py-2 text-sm ${goalType === 'streak_days' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setGoalType('streak_days')}>
              {t('retos.goal.streak_days')}
            </button>
            <button className={`btn flex-1 py-2 text-sm ${goalType === 'completions' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setGoalType('completions')}>
              {t('retos.goal.completions')}
            </button>
          </div>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t('retos.goalTarget')}: {goalTarget}</span>
          <input type="range" min={1} max={60} value={goalTarget} onChange={(e) => setGoalTarget(Number(e.target.value))} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t('retos.days')}: {days}</span>
          <input type="range" min={1} max={30} value={days} onChange={(e) => setDays(Number(e.target.value))} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t('retos.betPrize')}</span>
          <input className="input" value={betPrize} onChange={(e) => setBetPrize(e.target.value)} maxLength={200} placeholder="☕" />
          <span className="text-[11px] text-slate-500">{t('retos.betPrize.hint')}</span>
        </label>
        {error && <div className="text-sm text-red-400">{error}</div>}
        <div className="flex gap-2">
          <button className="btn btn-primary flex-1 py-2" onClick={submit}>
            {editing ? t('retos.save') : t('retos.create')}
          </button>
          <button className="btn btn-ghost px-4 py-2" onClick={onClose}>
            {t('form.cancel')}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function JoinRetoModal({
  onClose,
  onJoined,
  onToast,
}: {
  onClose: () => void;
  onJoined: () => void;
  onToast: (t: { title: string; body?: string }) => void;
}) {
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const join = async () => {
    try {
      await api('/api/retos/join', { method: 'POST', body: JSON.stringify({ code }) });
      onToast({ title: t('retos.joined') });
      onJoined();
    } catch (e: any) {
      setError(e?.message === 'reto_not_found' ? t('common.error') : t('common.error'));
    }
  };

  return (
    <ModalShell title={t('retos.join')} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span>{t('retos.joinPlaceholder')}</span>
          <input
            className="input text-center font-mono font-bold text-xl tracking-widest uppercase"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={8}
            autoFocus
          />
        </label>
        {error && <div className="text-sm text-red-400">{error}</div>}
        <button className="btn btn-primary py-2" onClick={join}>
          {t('retos.join')}
        </button>
      </div>
    </ModalShell>
  );
}

function InviteFriendsModal({
  reto,
  onClose,
  onInvited,
}: {
  reto: RetoData;
  onClose: () => void;
  onInvited: () => void;
}) {
  const { t } = useI18n();
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [participantIds, setParticipantIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ friends: FriendData[] }>('/api/friends').then((d) => setFriends(d.friends)).catch(() => {});
    api<{ participants: RetoParticipantData[] }>(`/api/retos/${reto.id}`)
      .then((d) => setParticipantIds(new Set(d.participants.map((p) => p.userId))))
      .catch(() => {});
  }, [reto.id]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const send = async () => {
    if (selected.size === 0) return;
    try {
      await api(`/api/retos/${reto.id}/invite`, {
        method: 'POST',
        body: JSON.stringify({ userIds: [...selected] }),
      });
      onInvited();
    } catch {
      setError(t('common.error'));
    }
  };

  const inviteable = friends.filter((f) => !participantIds.has(f.id));

  return (
    <ModalShell title={t('retos.inviteModalTitle')} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-slate-400">{t('retos.inviteHint')}</p>
        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
          {friends.length === 0 && <div className="text-sm text-slate-400 text-center py-6">{t('retos.noFriends')}</div>}
          {inviteable.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => toggle(f.id)}
              className={`flex items-center gap-2 rounded-lg p-2 text-sm ${selected.has(f.id) ? 'bg-indigo-900/40 border border-indigo-500/40' : 'bg-slate-900/50 border border-transparent'}`}
            >
              <div className="w-8 h-8 rounded-full bg-indigo-950 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                {f.avatarPhoto ? (
                  <img src={f.avatarPhoto} alt={f.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm">{f.avatarEmoji}</span>
                )}
              </div>
              <span className="flex-1 font-semibold truncate">{f.username}</span>
              {selected.has(f.id) && <Check size={16} className="text-emerald-400" />}
            </button>
          ))}
        </div>
        {error && <div className="text-sm text-red-400">{error}</div>}
        <button className="btn btn-primary py-2" onClick={send} disabled={selected.size === 0}>
          {t('retos.inviteSend')}
        </button>
      </div>
    </ModalShell>
  );
}

function LeaderboardModal({
  retoId,
  name,
  goalTarget,
  onClose,
}: {
  retoId: string;
  name: string;
  goalTarget: number;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [data, setData] = useState<{ participants: RetoParticipantData[]; me: string } | null>(null);

  useEffect(() => {
    api<{ participants: RetoParticipantData[]; me: string }>(`/api/retos/${retoId}`)
      .then(setData)
      .catch(() => setData({ participants: [], me: '' }));
  }, [retoId]);

  const sorted = data ? [...data.participants].sort((a, b) => b.progress - a.progress) : [];
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <ModalShell title={`${name} · ${t('retos.ranking')}`} onClose={onClose}>
      <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
        {!data && <div className="text-slate-400 text-center py-6">…</div>}
        {data && sorted.length === 0 && (
          <div className="text-sm text-slate-400 text-center py-6">{t('retos.noParticipants')}</div>
        )}
        {sorted.map((p, i) => {
          const pct = Math.min(100, Math.round((p.progress / goalTarget) * 100));
          return (
            <div
              key={p.userId}
              className={`flex items-center gap-2 rounded-lg p-2 ${p.userId === data?.me ? 'bg-indigo-900/40 border border-indigo-500/40' : 'bg-slate-900/50'}`}
            >
              <span className="w-7 text-center text-lg">{medals[i] ?? `${i + 1}.`}</span>
              <div className="w-9 h-9 rounded-full bg-indigo-950 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                {p.avatarPhoto ? (
                  <img src={p.avatarPhoto} alt={p.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg">{p.avatarEmoji}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">
                  {p.username}
                  {p.userId === data?.me && <span className="text-indigo-300"> · {t('retos.you')}</span>}
                </div>
                <div className="bar-track" style={{ height: '0.5rem' }}>
                  <div className="bar-fill-gold" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <span className="text-xs text-slate-400 font-bold">{p.progress}</span>
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
}