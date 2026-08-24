import type { APIRoute } from 'astro';
import { getDb } from '../../../db';
import { json } from '../../../lib/http';
import { sendDueReminders } from '../../../lib/push';

export const POST: APIRoute = async ({ request }) => {
  const secret =
    (import.meta.env.CRON_SECRET as string | undefined) ?? process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  const isVercelCron = request.headers.has('x-vercel-cron');
  if (!isVercelCron && (!secret || auth !== `Bearer ${secret}`)) {
    return json({ error: 'forbidden' }, 403);
  }

  const sent = await sendDueReminders(getDb(), new Date());
  return json({ ok: true, sent });
};