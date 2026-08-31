import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { handleApiError, HttpError } from "@/lib/api";
import { recomputeProgressAndGrantRewards } from "@/lib/progress";
import type { GamesConfig } from "@/lib/games/types";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const round = await prisma.round.findUnique({ where: { id } });
    if (!round) throw new HttpError(404, "Round not found");
    if (round.ownerId !== userId) throw new HttpError(403, "Only the round owner can complete it");
    if (round.status === "COMPLETED") throw new HttpError(400, "Round already completed");

    const updated = await prisma.round.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    const gamesConfig = round.gamesConfig as unknown as GamesConfig;
    const realUsers = await prisma.user.findMany({
      where: { id: { in: gamesConfig.playerIds } },
      select: { id: true },
    });
    for (const u of realUsers) {
      await recomputeProgressAndGrantRewards(u.id);
    }

    return NextResponse.json({ round: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
