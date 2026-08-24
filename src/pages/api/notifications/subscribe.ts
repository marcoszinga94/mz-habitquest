import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getDb } from '../../../db';
import { apiError, json, requireUser } from '../../../lib/http';
import { saveSubscription } from '../../../lib/push';

const schema = z.object({
  endpoint: z.string().min(10),
  keys: z.object({
    p256dh: z.string().min(10),
    auth: z.string().min(10),
  }),
});

export const POST: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, 'invalid_data');

  await saveSubscription(getDb(), user.id, parsed.data);
  return json({ ok: true });
};