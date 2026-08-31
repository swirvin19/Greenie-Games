import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { handleApiError, HttpError } from "@/lib/api";
import type { GamesConfig } from "@/lib/games/types";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUserId();
    const { id } = await params;
    const wagers = await prisma.remoteWager.findMany({
      where: { roundId: id },
      include: { bettor: true, target: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ wagers });
  } catch (err) {
    return handleApiError(err);
  }
}

const bodySchema = z.object({
  targetUserId: z.string(),
  description: z.string().min(1).max(280),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const body = bodySchema.parse(await req.json());

    const round = await prisma.round.findUnique({ where: { id } });
    if (!round) throw new HttpError(404, "Round not found");
    if (round.status !== "IN_PROGRESS") throw new HttpError(400, "Round is no longer live");

    const gamesConfig = round.gamesConfig as unknown as GamesConfig;
    if (!gamesConfig.playerIds.includes(body.targetUserId)) {
      throw new HttpError(400, "Target isn't a player in this round");
    }

    // Remote wagers are only for people actually watching the round —
    // matches RoundFollower's stated purpose of gating wager eligibility.
    const isFollowing =
      round.ownerId === userId ||
      (await prisma.roundFollower.findUnique({
        where: { roundId_userId: { roundId: id, userId } },
      }));
    if (!isFollowing) throw new HttpError(403, "Follow this round to place a wager on it");

    const wager = await prisma.remoteWager.create({
      data: {
        roundId: id,
        bettorId: userId,
        targetUserId: body.targetUserId,
        description: body.description,
      },
    });

    return NextResponse.json({ wager });
  } catch (err) {
    return handleApiError(err);
  }
}
