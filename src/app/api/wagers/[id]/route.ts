import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { handleApiError, HttpError } from "@/lib/api";

const bodySchema = z.object({ status: z.enum(["SETTLED_WIN", "SETTLED_LOSS", "VOID"]) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const { status } = bodySchema.parse(await req.json());

    const wager = await prisma.remoteWager.findUnique({ where: { id }, include: { round: true } });
    if (!wager) throw new HttpError(404, "Wager not found");
    if (wager.status !== "OPEN") throw new HttpError(400, "Wager already settled");

    const canSettle = wager.targetUserId === userId || wager.round.ownerId === userId;
    if (!canSettle) throw new HttpError(403, "Only the round owner or the target player can settle this");

    const updated = await prisma.remoteWager.update({
      where: { id },
      data: { status, settledAt: new Date() },
    });
    return NextResponse.json({ wager: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
