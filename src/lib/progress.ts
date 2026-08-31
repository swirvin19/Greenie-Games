import { prisma } from "@/lib/prisma";
import { ItemSource, PassTrack, ThresholdType } from "@prisma/client";

/**
 * Recomputes a user's simple running-total progress counters and grants any
 * SeasonPass rewards whose threshold is now met (idempotent — skips items
 * the user already owns). Called after a round completes.
 */
export async function recomputeProgressAndGrantRewards(userId: string) {
  const completedRounds = await prisma.round.findMany({
    where: { status: "COMPLETED", gamesConfig: { not: undefined } },
  });

  const myRounds = completedRounds.filter((r) =>
    playerIdsOf(r.gamesConfig).includes(userId)
  );

  let holesLogged = 0;
  const friends = new Set<string>();
  for (const r of myRounds) {
    const players = playerIdsOf(r.gamesConfig);
    for (const p of players) if (p !== userId) friends.add(p);
    const holes = Array.isArray(r.scoreData) ? (r.scoreData as unknown[]) : [];
    for (const h of holes) {
      const hole = h as { strokes?: Record<string, unknown> };
      if (typeof hole?.strokes?.[userId] === "number") holesLogged += 1;
    }
  }

  const invitesConverted = await prisma.friendship.count({
    where: { requestedById: userId, status: "ACCEPTED" },
  });

  const progress = await prisma.userProgress.upsert({
    where: { userId },
    update: {
      roundsCompleted: myRounds.length,
      holesLogged,
      distinctFriendsPlayedWith: friends.size,
      invitesConverted,
    },
    create: {
      userId,
      roundsCompleted: myRounds.length,
      holesLogged,
      distinctFriendsPlayedWith: friends.size,
      invitesConverted,
    },
  });

  await grantEligiblePassRewards(userId, progress);
}

function playerIdsOf(gamesConfig: unknown): string[] {
  if (
    gamesConfig &&
    typeof gamesConfig === "object" &&
    Array.isArray((gamesConfig as { playerIds?: unknown }).playerIds)
  ) {
    return (gamesConfig as { playerIds: string[] }).playerIds;
  }
  return [];
}

const counterFor: Record<
  ThresholdType,
  (p: { roundsCompleted: number; holesLogged: number; distinctFriendsPlayedWith: number; invitesConverted: number }) => number
> = {
  ROUNDS_COMPLETED: (p) => p.roundsCompleted,
  HOLES_LOGGED: (p) => p.holesLogged,
  FRIENDS_PLAYED_WITH: (p) => p.distinctFriendsPlayedWith,
  INVITES_CONVERTED: (p) => p.invitesConverted,
};

async function grantEligiblePassRewards(
  userId: string,
  progress: { roundsCompleted: number; holesLogged: number; distinctFriendsPlayedWith: number; invitesConverted: number }
) {
  const activePasses = await prisma.seasonPass.findMany({
    where: { active: true },
    include: { rewards: { include: { item: true } } },
  });

  const ownedItemIds = new Set(
    (
      await prisma.inventoryItem.findMany({
        where: { userId },
        select: { itemId: true },
      })
    ).map((i) => i.itemId)
  );

  const purchasedPassIds = new Set(
    (
      await prisma.seasonPassPurchase.findMany({
        where: { userId },
        select: { seasonPassId: true },
      })
    ).map((p) => p.seasonPassId)
  );

  for (const pass of activePasses) {
    for (const reward of pass.rewards) {
      if (ownedItemIds.has(reward.itemId)) continue;
      if (reward.track === PassTrack.PREMIUM && !purchasedPassIds.has(pass.id)) continue;
      const value = counterFor[reward.thresholdType](progress);
      if (value >= reward.thresholdValue) {
        await prisma.inventoryItem.create({
          data: {
            userId,
            itemId: reward.itemId,
            acquiredVia:
              reward.track === PassTrack.FREE
                ? ItemSource.SEASON_PASS_FREE
                : ItemSource.SEASON_PASS_PREMIUM,
          },
        });
        ownedItemIds.add(reward.itemId);
      }
    }
  }
}
