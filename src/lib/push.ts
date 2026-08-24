import webpush from 'web-push';
import { and, eq } from 'drizzle-orm';
import type { Db } from '../db';
import { checkins, habits, pushSubscriptions } from '../db/schema';
import { toDateKey } from './game';

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

function getVapid() {
  const publicKey =
    (import.meta.env.PUBLIC_VAPID_PUBLIC_KEY as string | undefined) ??
    process.env.PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey =
    (import.meta.env.VAPID_PRIVATE_KEY as string | undefined) ?? process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error('Faltan las claves VAPID (PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)');
  }
  return { publicKey, privateKey };
}

export function initWebPush() {
  const { publicKey, privateKey } = getVapid();
  webpush.setVapidDetails(
    (import.meta.env.VAPID_SUBJECT as string | undefined) ?? 'mailto:admin@habitquest.dev',
    publicKey,
    privateKey,
  );
}

export async function saveSubscription(
  db: Db,
  userId: string,
  sub: PushSubscriptionInput,
): Promise<void> {
  const existing = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, sub.endpoint));
  if (existing.length > 0) {
    await db
      .update(pushSubscriptions)
      .set({ userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth })
      .where(eq(pushSubscriptions.id, existing[0].id));
    return;
  }
  await db.insert(pushSubscriptions).values({
    userId,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
  });
}

export async function removeSubscription(db: Db, endpoint: string): Promise<void> {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

export async function sendPushToUser(
  db: Db,
  userId: string,
  payload: { title: string; body: string; tag?: string },
): Promise<void> {
  try {
    initWebPush();
    const subs = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
    if (subs.length === 0) return;
    const data = JSON.stringify(payload);
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          data,
        );
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        }
      }
    }
  } catch {
    /* sin VAPID configurado o sin soporte: no rompe el flujo */
  }
}

/** Envía recordatorios de hábitos cuya hora coincide con la ventana actual. */
export async function sendDueReminders(db: Db, now: Date): Promise<number> {
  const today = toDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const habitRows = await db
    .select()
    .from(habits)
    .where(eq(habits.reminderEnabled, true));
  if (habitRows.length === 0) return 0;

  const dueByUser = new Map<string, { title: string; body: string }[]>();
  for (const h of habitRows) {
    const [hh, mm] = h.reminderTime.split(':').map(Number);
    const reminderMinutes = hh * 60 + mm;
    if (nowMinutes >= reminderMinutes && nowMinutes < reminderMinutes + 15) {
      const checked = await db
        .select({ id: checkins.id })
        .from(checkins)
        .where(and(eq(checkins.habitId, h.id), eq(checkins.day, today)));
      if (checked.length > 0) continue;
      const list = dueByUser.get(h.userId) ?? [];
      list.push({ title: 'HabitQuest', body: `No olvides tu hábito: ${h.name}` });
      dueByUser.set(h.userId, list);
    }
  }

  let sent = 0;
  for (const [userId, items] of dueByUser) {
    for (const item of items) {
      await sendPushToUser(db, userId, item);
      sent++;
    }
  }
  return sent;
}