import type { APIRoute } from 'astro';
import { and, eq, inArray, or } from 'drizzle-orm';
import { getDb } from '../../../db';
import { achievements, friendRequests, retoParticipants, retos, users } from '../../../db/schema';
import { apiError, json, requireUser } from '../../../lib/http';
import { ACHIEVEMENTS, levelProgress } from '../../../lib/game';

export const GET: APIRoute = async ({ request, params }) => {
  const me = await requireUser(request);
  const db = getDb();

  const targetRows = await db.select().from(users).where(eq(users.id, params.id ?? ''));
  const target = targetRows[0];
  if (!target) return apiError(404, 'not_found');

  if (target.id !== me.id) {
    const friend = await db
      .select({ id: friendRequests.id })
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.status, 'accepted'),
          or(
            and(eq(friendRequests.fromUserId, me.id), eq(friendRequests.toUserId, target.id)),
            and(eq(friendRequests.fromUserId, target.id), eq(friendRequests.toUserId, me.id)),
          ),
        ),
      );
    if (friend.length === 0) return apiError(403, 'not_friends');
  }

  const achRows = await db
    .select()
    .from(achievements)
    .where(eq(achievements.userId, target.id));
  const owned = new Set(achRows.map((a) => a.key));
  const achievementsData = ACHIEVEMENTS.map((a) => ({
    key: a.key,
    icon: a.icon,
    nameKey: a.nameKey,
    descKey: a.descKey,
    xp: a.xp,
    unlocked: owned.has(a.key),
  }));

  const retoRows = await db
    .select()
    .from(retos)
    .where(and(eq(retos.creatorId, target.id), eq(retos.status, 'active')));

  const myParts = await db
    .select()
    .from(retoParticipants)
    .where(eq(retoParticipants.userId, me.id));
  const myPartIds = new Set(myParts.map((p) => p.retoId));

  const participantRows =
    retoRows.length > 0
      ? await db
          .select()
          .from(retoParticipants)
          .where(inArray(retoParticipants.retoId, retoRows.map((r) => r.id)))
      : [];

  const retosData = retoRows.map((r) => {
    const participants = participantRows.filter((p) => p.retoId === r.id);
    const mine = participants.find((p) => p.userId === me.id);
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      emoji: r.emoji,
      description: r.description,
      goalType: r.goalType,
      goalTarget: r.goalTarget,
      betPrize: r.betPrize,
      endsAt: r.endsAt,
      participantCount: participants.length,
      isMember: myPartIds.has(r.id),
      myProgress: mine?.progress ?? 0,
    };
  });

  return json({
    user: {
      id: target.id,
      username: target.username,
      avatarEmoji: target.avatarEmoji,
      avatarPhoto: target.avatarPhoto,
      xp: target.xp,
      ...levelProgress(target.xp),
    },
    achievements: achievementsData,
    retos: retosData,
  });
};