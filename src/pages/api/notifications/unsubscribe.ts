import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getDb } from '../../../db';
import { apiError, json, requireUser } from '../../../lib/http';
import { removeSubscription } from '../../../lib/push';

const schema = z.object({ endpoint: z.string().min(10) });

export const POST: APIRoute = async ({ request }) => {
  await requireUser(request);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, 'invalid_data');

  await removeSubscription(getDb(), parsed.data.endpoint);
  return json({ ok: true });
};