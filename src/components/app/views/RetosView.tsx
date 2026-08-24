import { useMemo, useState } from 'react';
import { Copy, Plus, Swords, Users, Check, Flag, LogIn } from 'lucide-react';
import { api, type DashboardData, type RetoData } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { ModalShell } from './HabitsView';

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

  const active = data.retos.filter((r) => r.status === 'active');
  const finished = data.retos.filter((r) => r.status === 'finished');

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
            <RetoCard key={r.id} reto={r} me={data.user.id} onUpdated={onUpdated} onToast={pushToast} />
          ))}
        </div>
      )}

      {finished.length > 0 && (
        <>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mt-2">{t('retos.finished')}</h3>
          <div className="flex flex-col gap-3">
            {finished.map((r) => (
              <RetoCard key={r.id} reto={r} me={data.user.id} onUpdated={onUpdated} onToast={pushToast} />
            ))}
          </div>
        </>
      )}

      {createOpen && <RetoFormModal onClose={() => setCreateOpen(false)} onCreated={onCreated} />}
      {joinOpen && <JoinRetoModal onClose={() => setJoinOpen(false)} onJoined={onJoined} onToast={pushToast} />}
    </div>
  );
}

function RetoCard({
  reto,
  me,
  onUpdated,
  onToast,
}: {
  reto: RetoData;
  me: string;
  onUpdated: () => void;
  onToast: (t: { title: string; body?: string }) => void;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
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
        <div className="flex items-center gap-2 bg-slate-900/60 rounded-lg p-2">
          <span className="text-xs text-slate-400">{t('retos.invite')}</span>
          <span className="font-mono font-bold text-sm bg-indigo-900/50 px-2 py-0.5 rounded">{reto.code}</span>
          <button className="btn btn-ghost p-1.5 ml-auto" onClick={copyCode} aria-label={t('retos.copy')}>
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
        </div>
      )}

      {reto.status === 'active' && reto.isCreator && (
        <button className="btn btn-ghost text-sm py-1.5 flex items-center justify-center gap-1" onClick={finishEarly}>
          <Flag size={14} /> {t('retos.finishEarly')}
        </button>
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
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('⚔️');
  const [description, setDescription] = useState('');
  const [goalType, setGoalType] = useState<'streak_days' | 'completions'>('streak_days');
  const [goalTarget, setGoalTarget] = useState(7);
  const [days, setDays] = useState(7);
  const [betPrize, setBetPrize] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    try {
      await api('/api/retos', {
        method: 'POST',
        body: JSON.stringify({ name, emoji, description, goalType, goalTarget, days, betPrize }),
      });
      onCreated();
    } catch {
      setError(t('common.error'));
    }
  };

  return (
    <ModalShell title={t('retos.create')} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span>{t('retos.name')}</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t('retos.emoji')}</span>
          <input className="input w-24 text-center text-lg" value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} />
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
            {t('retos.create')}
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