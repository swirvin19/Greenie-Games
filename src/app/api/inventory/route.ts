import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const userId = await requireUserId();
    const items = await prisma.inventoryItem.findMany({
      where: { userId },
      include: { item: true },
      orderBy: { acquiredAt: "desc" },
    });
    return NextResponse.json({ items });
  } catch (err) {
    return handleApiError(err);
  }
}
