import { useState } from 'react';
import { Bell, Flame, Pencil, Plus, Trash2, X } from 'lucide-react';
import { api, type DashboardData, type HabitData } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { isScheduledOn, parseScheduleDays } from '../../../lib/game';
import { EmojiPicker } from '../EmojiPicker';

export function HabitsView({
  data,
  onCheckin,
  onSaved,
  pushToast,
}: {
  data: DashboardData;
  onCheckin: (habit: HabitData) => void;
  onSaved: () => void;
  pushToast: (t: { title: string; body?: string }) => void;
}) {
  const { t } = useI18n();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<HabitData | null>(null);
  const [deleting, setDeleting] = useState<HabitData | null>(null);

  const remove = async (habit: HabitData) => {
    const res = await api<{ ok: boolean; xpLost?: number }>(`/api/habits/${habit.id}`, { method: 'DELETE' });
    if (res.xpLost) pushToast({ title: t('habits.deleted'), body: t('habits.delete.xp_lost', { xp: res.xpLost }) });
    else pushToast({ title: t('habits.deleted') });
    setDeleting(null);
    onSaved();
  };

  const scheduleLabel = (h: HabitData) => {
    const days = parseScheduleDays(h.scheduleDays);
    if (days.size >= 7) return t('habits.daily');
    return [0, 1, 2, 3, 4, 5, 6]
      .filter((d) => days.has(d))
      .map((d) => t(`days.${d}`))
      .join(' · ');
  };

  const isToday = (h: HabitData) => isScheduledOn(h.scheduleDays, new Date());

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold">{t('habits.title')}</h2>
        <button className="btn btn-primary px-3 py-1.5 text-sm flex items-center gap-1" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus size={16} /> {t('habits.add')}
        </button>
      </div>

      {data.habits.length === 0 ? (
        <div className="panel p-8 text-center text-slate-400">{t('habits.empty')}</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.habits.map((h) => (
            <div key={h.id} className="panel p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{h.emoji}</span>
                <div className="flex-1">
                  <div className="font-bold">{h.name}</div>
                  <div className="text-[11px] text-slate-400">
                    {scheduleLabel(h)}
                    {h.reminderEnabled && <span className="ml-1 inline-flex items-center gap-0.5"><Bell size={10} /> {h.reminderTime}</span>}
                  </div>
                </div>
                <button className="btn btn-ghost p-1.5" onClick={() => { setEditing(h); setFormOpen(true); }} aria-label={t('form.edit')}>
                  <Pencil size={14} />
                </button>
                <button className="btn btn-ghost p-1.5" onClick={() => setDeleting(h)} aria-label={t('form.delete')}>
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1 text-orange-300"><Flame size={13} /> {h.streak}</span>
                <span>{h.totalCompletions} {t('habits.done')}</span>
                <span className="ml-auto text-indigo-300 font-semibold">
                  {h.streakBest} 🔥 {t('habits.best')}
                </span>
              </div>
              {!isToday(h) && (
                <div className="text-[11px] font-bold text-amber-400/90 flex items-center gap-1">
                  ⚠️ {t('habits.off_schedule', { days: scheduleLabel(h) })}
                </div>
              )}
              <button
                onClick={() => (isToday(h) ? onCheckin(h) : pushToast({ title: t('habits.not_scheduled'), body: t('habits.off_schedule', { days: scheduleLabel(h) }) }))}
                className={`btn py-2 text-sm ${h.checkedToday ? 'btn-gold opacity-70 pointer-events-none' : isToday(h) ? 'btn-primary' : 'btn-ghost'}`}
              >
                {h.checkedToday ? t('habits.checked') : isToday(h) ? t('habits.check') : `⚠️ ${t('habits.not_scheduled')}`}
              </button>
            </div>
          ))}
        </div>
      )}

      {formOpen && <HabitFormModal editing={editing} onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); onSaved(); }} />}
      {deleting && <DeleteHabitModal habit={deleting} onClose={() => setDeleting(null)} onConfirm={() => remove(deleting)} />}
    </div>
  );
}

function HabitFormModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: HabitData | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(editing?.name ?? '');
  const [emoji, setEmoji] = useState(editing?.emoji ?? '⭐');
  const [days, setDays] = useState<Set<number>>(() =>
    parseScheduleDays(editing?.scheduleDays),
  );
  const [reminder, setReminder] = useState(editing?.reminderEnabled ?? false);
  const [reminderTime, setReminderTime] = useState(editing?.reminderTime ?? '09:00');
  const [error, setError] = useState('');

  const toggleDay = (d: number) => {
    setDays((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next.size > 0 ? next : prev;
    });
  };

  const submit = async () => {
    const scheduleDays = [...days].sort((a, b) => a - b).join(',');
    const body = { name, emoji, scheduleDays, reminderEnabled: reminder, reminderTime };
    try {
      if (editing) {
        await api(`/api/habits/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        await api('/api/habits', { method: 'POST', body: JSON.stringify(body) });
      }
      onSaved();
    } catch (e: any) {
      setError(e?.message === 'habit_exists' ? t('habits.error.exists') : t('common.error'));
    }
  };

  return (
    <ModalShell title={editing ? t('form.edit') : t('habits.add')} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span>{t('form.name')}</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t('form.emoji')}</span>
          <EmojiPicker value={emoji} onChange={setEmoji} />
        </label>
        <div className="flex flex-col gap-1 text-sm">
          <span>{t('form.schedule')}</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4, 5, 6].map((d) => (
              <button
                key={d}
                type="button"
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${days.has(d) ? 'btn-primary' : 'btn-ghost opacity-60'}`}
                onClick={() => toggleDay(d)}
              >
                {t(`days.${d}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>{t('form.reminder')}</span>
          <input type="checkbox" checked={reminder} onChange={(e) => setReminder(e.target.checked)} className="w-5 h-5 accent-indigo-500" />
        </div>
        {reminder && (
          <label className="flex items-center gap-2 text-sm">
            <span>{t('form.reminderTime')}</span>
            <input type="time" className="input w-32" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
          </label>
        )}
        {error && <div className="text-sm text-red-400">{error}</div>}
        <div className="flex gap-2 mt-1">
          <button className="btn btn-primary flex-1 py-2" onClick={submit}>
            {editing ? t('form.save') : t('form.create')}
          </button>
          <button className="btn btn-ghost px-4 py-2" onClick={onClose}>
            {t('form.cancel')}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function DeleteHabitModal({
  habit,
  onClose,
  onConfirm,
}: {
  habit: HabitData;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  return (
    <ModalShell title={t('habits.delete.title')} onClose={onClose}>
      <div className="flex flex-col gap-3 text-center">
        <div className="text-5xl">🗡️</div>
        <p className="text-sm text-slate-300">{t('habits.delete.hint', { name: habit.name })}</p>
        <div className="rounded-lg border-2 border-red-500/60 bg-red-950/40 p-3 flex items-center justify-center gap-2">
          <span className="text-xl">⚠️</span>
          <span className="font-bold text-red-300">{t('habits.delete.xp', { xp: habit.xpContributed })}</span>
        </div>
        <p className="text-[11px] text-slate-500">{t('habits.delete.irreversible')}</p>
        <div className="flex gap-2">
          <button className="btn btn-danger flex-1 py-2" onClick={onConfirm}>
            {t('habits.delete.confirm')}
          </button>
          <button className="btn btn-ghost px-4 py-2" onClick={onClose}>
            {t('form.cancel')}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const [closing, setClosing] = useState(false);
  const close = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 200);
  };
  return (
    <div className={`fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center modal-backdrop ${closing ? 'modal-backdrop-out' : ''}`} onClick={close}>
      <div
        className={`panel p-4 w-full max-w-md rounded-b-none sm:rounded-lg sm:mb-0 safe-bottom max-h-[92dvh] sm:max-h-[80vh] flex flex-col modal-in ${closing ? 'modal-out' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-600 sm:hidden" />
        <div className="flex items-center justify-between mb-3 shrink-0">
          <h3 className="font-bold text-lg">{title}</h3>
          <button className="btn btn-ghost p-1.5" onClick={close} aria-label="close">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto min-h-0">{children}</div>
      </div>
    </div>
  );
}