import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../../../../db';
import { habits } from '../../../../db/schema';
import { apiError, json, requireUser } from '../../../../lib/http';
import { applyCheckin, CheckinError } from '../../../../lib/engine';
import { toDateKey } from '../../../../lib/game';

export const POST: APIRoute = async ({ request, params }) => {
  const user = await requireUser(request);
  const db = getDb();
  const existing = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, params.id ?? ''), eq(habits.userId, user.id)));
  if (existing.length === 0) return apiError(404, 'not_found');
  const habit = existing[0];

  const today = toDateKey(new Date());
  try {
    const result = await applyCheckin(db, user, habit, today);
    return json({ result });
  } catch (err) {
    if (err instanceof CheckinError) return apiError(409, err.code);
    throw err;
  }
};