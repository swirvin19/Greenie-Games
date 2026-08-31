import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { handleApiError, HttpError } from "@/lib/api";
import { computeRoundResults } from "@/lib/games/engine";
import type { GamesConfig, HoleEntry } from "@/lib/games/types";

async function loadRound(id: string) {
  const round = await prisma.round.findUnique({
    where: { id },
    include: { owner: true, course: true, teeBox: true, followers: true, wagers: true, thread: true },
  });
  if (!round) throw new HttpError(404, "Round not found");
  return round;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUserId();
    const { id } = await params;
    const round = await loadRound(id);
    const gamesConfig = round.gamesConfig as unknown as GamesConfig;
    const scoreData = round.scoreData as unknown as HoleEntry[];
    const results = computeRoundResults(gamesConfig, scoreData);
    const players = await prisma.user.findMany({
      where: { id: { in: gamesConfig.playerIds } },
      select: { id: true, displayName: true, avatarUrl: true },
    });
    return NextResponse.json({ round, results, players });
  } catch (err) {
    return handleApiError(err);
  }
}

const bodySchema = z.object({
  holeNumber: z.number().int(),
  strokes: z.record(z.string(), z.number().int().min(1).max(15).nullable()).optional(),
  greenieWinner: z.string().nullable().optional(),
  bombWinner: z.string().nullable().optional(),
  greenInRegulation: z.array(z.string()).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const round = await loadRound(id);
    if (round.status !== "IN_PROGRESS") throw new HttpError(400, "Round is already completed");

    const gamesConfig = round.gamesConfig as unknown as GamesConfig;
    const isScorer = round.ownerId === userId || gamesConfig.playerIds.includes(userId);
    if (!isScorer) throw new HttpError(403, "Only players in this round can update scores");

    const body = bodySchema.parse(await req.json());
    const scoreData = round.scoreData as unknown as HoleEntry[];
    const hole = scoreData.find((h) => h.holeNumber === body.holeNumber);
    if (!hole) throw new HttpError(404, "That hole isn't part of this round");

    if (body.strokes) Object.assign(hole.strokes, body.strokes);
    if (body.greenieWinner !== undefined) hole.greenieWinner = body.greenieWinner;
    if (body.bombWinner !== undefined) hole.bombWinner = body.bombWinner;
    if (body.greenInRegulation !== undefined) hole.greenInRegulation = body.greenInRegulation;

    const updated = await prisma.round.update({
      where: { id },
      data: { scoreData: scoreData as unknown as object },
    });

    const results = computeRoundResults(gamesConfig, scoreData);
    return NextResponse.json({ round: updated, results });
  } catch (err) {
    return handleApiError(err);
  }
}
