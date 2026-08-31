import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { handleApiError, HttpError } from "@/lib/api";
import { areFriends } from "@/lib/social";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    if (id !== userId && !(await areFriends(userId, id))) {
      throw new HttpError(403, "You can only view a friend's tradeable inventory");
    }

    const items = await prisma.inventoryItem.findMany({
      where: { userId: id, item: { tradeable: true } },
      include: { item: true },
    });
    return NextResponse.json({ items });
  } catch (err) {
    return handleApiError(err);
  }
}
