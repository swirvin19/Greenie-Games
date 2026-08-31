import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { handleApiError, HttpError } from "@/lib/api";

const bodySchema = z.object({ action: z.enum(["accept", "decline", "cancel"]) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const { action } = bodySchema.parse(await req.json());

    const trade = await prisma.trade.findUnique({
      where: { id },
      include: { fromItem: true, toItem: true },
    });
    if (!trade) throw new HttpError(404, "Trade not found");
    if (trade.status !== "PENDING") throw new HttpError(400, "Trade already resolved");

    if (action === "cancel") {
      if (trade.fromUserId !== userId) throw new HttpError(403, "Only the sender can cancel");
      const updated = await prisma.trade.update({
        where: { id },
        data: { status: "CANCELLED", resolvedAt: new Date() },
      });
      return NextResponse.json({ trade: updated });
    }

    if (trade.toUserId !== userId) throw new HttpError(403, "Only the recipient can respond");

    if (action === "decline") {
      const updated = await prisma.trade.update({
        where: { id },
        data: { status: "DECLINED", resolvedAt: new Date() },
      });
      return NextResponse.json({ trade: updated });
    }

    // accept: swap ownership of both items atomically, both sides give
    // something up per the trading rule in the data model.
    const updated = await prisma.$transaction(async (tx) => {
      await tx.inventoryItem.update({
        where: { id: trade.fromItemId },
        data: { userId: trade.toUserId, acquiredVia: "TRADE", equipped: false },
      });
      await tx.inventoryItem.update({
        where: { id: trade.toItemId },
        data: { userId: trade.fromUserId, acquiredVia: "TRADE", equipped: false },
      });
      return tx.trade.update({
        where: { id },
        data: { status: "ACCEPTED", resolvedAt: new Date() },
      });
    });

    return NextResponse.json({ trade: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
