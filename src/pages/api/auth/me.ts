import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../../db';
import { users } from '../../../db/schema';
import {
  hashPassword,
  verifyPassword,
} from '../../../lib/auth';
import { getCurrentUser, json, apiError } from '../../../lib/http';
import { levelProgress } from '../../../lib/game';

const patchSchema = z
  .object({
    username: z.string().min(2).max(40).optional(),
    avatarEmoji: z.string().min(1).max(8).optional(),
    avatarPhoto: z
      .string()
      .max(400_000)
      .regex(/^data:image\/(png|jpe?g|webp);base64,/)
      .optional(),
    removePhoto: z.boolean().optional(),
    lang: z.enum(['es', 'en']).optional(),
    currentPassword: z.string().min(1).max(100).optional(),
    newPassword: z.string().min(6).max(100).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'empty' })
  .refine((v) => (v.currentPassword || v.newPassword ? v.currentPassword && v.newPassword : true), {
    message: 'password_pair',
  });

function publicUser(user: { id: string; email: string; username: string; avatarEmoji: string; avatarPhoto: string | null; xp: number; lang: string }) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    avatarEmoji: user.avatarEmoji,
    avatarPhoto: user.avatarPhoto,
    xp: user.xp,
    lang: user.lang,
    ...levelProgress(user.xp),
  };
}

export const GET: APIRoute = async ({ request }) => {
  const user = await getCurrentUser(request);
  if (!user) return apiError(401, 'unauthorized');
  return json({ user: publicUser(user) });
};

export const PATCH: APIRoute = async ({ request }) => {
  const user = await getCurrentUser(request);
  if (!user) return apiError(401, 'unauthorized');

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    if (parsed.error.issues.some((i) => i.message === 'password_pair')) {
      return apiError(400, 'password_pair');
    }
    return apiError(400, 'invalid_data');
  }
  const data = parsed.data;
  const db = getDb();

  if (data.currentPassword && data.newPassword) {
    const ok = await verifyPassword(data.currentPassword, user.passwordHash);
    if (!ok) return apiError(403, 'wrong_password');
  }

  const updates: Record<string, unknown> = {};
  if (data.username) updates.username = data.username;
  if (data.avatarEmoji) updates.avatarEmoji = data.avatarEmoji;
  if (data.removePhoto) updates.avatarPhoto = null;
  else if (data.avatarPhoto) updates.avatarPhoto = data.avatarPhoto;
  if (data.lang) updates.lang = data.lang;
  if (data.newPassword) updates.passwordHash = await hashPassword(data.newPassword);

  const [updated] = await db.update(users).set(updates).where(eq(users.id, user.id)).returning();
  return json({ user: publicUser(updated) });
};