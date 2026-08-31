import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { handleApiError, HttpError } from "@/lib/api";
import { ItemType } from "@prisma/client";

const equippedFieldFor: Record<ItemType, string> = {
  MASCOT_SKIN: "equippedMascotSkinId",
  COLOR_SCHEME: "equippedColorSchemeId",
  BANNER_STYLE: "equippedBannerStyleId",
  ICON: "equippedIconId",
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const entry = await prisma.inventoryItem.findUnique({ where: { id }, include: { item: true } });
    if (!entry || entry.userId !== userId) throw new HttpError(404, "Inventory item not found");

    await prisma.$transaction([
      prisma.inventoryItem.updateMany({
        where: { userId, item: { type: entry.item.type }, id: { not: entry.id } },
        data: { equipped: false },
      }),
      prisma.inventoryItem.update({ where: { id: entry.id }, data: { equipped: true } }),
      prisma.user.update({
        where: { id: userId },
        data: { [equippedFieldFor[entry.item.type]]: entry.itemId },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
