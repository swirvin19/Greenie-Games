import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { handleApiError, HttpError } from "@/lib/api";
import { areFriends } from "@/lib/social";

export async function GET() {
  try {
    const userId = await requireUserId();
    const trades = await prisma.trade.findMany({
      where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
      include: {
        fromUser: true,
        toUser: true,
        fromItem: { include: { item: true } },
        toItem: { include: { item: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ trades });
  } catch (err) {
    return handleApiError(err);
  }
}

const bodySchema = z.object({
  toUserId: z.string(),
  fromInventoryItemId: z.string(),
  toInventoryItemId: z.string(),
});

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = bodySchema.parse(await req.json());
    if (body.toUserId === userId) throw new HttpError(400, "Can't trade with yourself");

    const isFriend = await areFriends(userId, body.toUserId);
    if (!isFriend) throw new HttpError(403, "Trading is friends-only");

    const [fromItem, toItem] = await Promise.all([
      prisma.inventoryItem.findUnique({ where: { id: body.fromInventoryItemId }, include: { item: true } }),
      prisma.inventoryItem.findUnique({ where: { id: body.toInventoryItemId }, include: { item: true } }),
    ]);

    if (!fromItem || fromItem.userId !== userId) throw new HttpError(404, "Your item was not found");
    if (!toItem || toItem.userId !== body.toUserId) throw new HttpError(404, "Their item was not found");
    if (!fromItem.item.tradeable || !toItem.item.tradeable) {
      throw new HttpError(400, "One of these items is not tradeable");
    }

    const trade = await prisma.trade.create({
      data: {
        fromUserId: userId,
        toUserId: body.toUserId,
        fromItemId: fromItem.id,
        toItemId: toItem.id,
      },
    });

    return NextResponse.json({ trade });
  } catch (err) {
    return handleApiError(err);
  }
}
