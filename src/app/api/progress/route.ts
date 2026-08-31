import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const userId = await requireUserId();
    const progress = await prisma.userProgress.findUnique({ where: { userId } });
    const purchases = await prisma.seasonPassPurchase.findMany({ where: { userId } });
    const purchasedPassIds = new Set(purchases.map((p) => p.seasonPassId));

    const passes = await prisma.seasonPass.findMany({
      where: { active: true },
      include: { rewards: { include: { item: true } } },
    });

    const ownedItemIds = new Set(
      (await prisma.inventoryItem.findMany({ where: { userId }, select: { itemId: true } })).map(
        (i) => i.itemId
      )
    );

    const counters = progress ?? {
      roundsCompleted: 0,
      holesLogged: 0,
      distinctFriendsPlayedWith: 0,
      invitesConverted: 0,
    };

    const counterFor: Record<string, number> = {
      ROUNDS_COMPLETED: counters.roundsCompleted,
      HOLES_LOGGED: counters.holesLogged,
      FRIENDS_PLAYED_WITH: counters.distinctFriendsPlayedWith,
      INVITES_CONVERTED: counters.invitesConverted,
    };

    const passLadders = passes.map((pass) => ({
      id: pass.id,
      name: pass.name,
      theme: pass.theme,
      startDate: pass.startDate,
      endDate: pass.endDate,
      priceCents: pass.priceCents,
      premiumUnlocked: purchasedPassIds.has(pass.id),
      rewards: pass.rewards
        .sort((a, b) => a.thresholdValue - b.thresholdValue)
        .map((r) => ({
          id: r.id,
          track: r.track,
          thresholdType: r.thresholdType,
          thresholdValue: r.thresholdValue,
          item: r.item,
          owned: ownedItemIds.has(r.itemId),
          progressValue: counterFor[r.thresholdType] ?? 0,
        })),
    }));

    return NextResponse.json({ counters, passes: passLadders });
  } catch (err) {
    return handleApiError(err);
  }
}
