import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const q = new URL(req.url).searchParams.get("q")?.trim();
    if (!q) return NextResponse.json({ users: [] });

    const users = await prisma.user.findMany({
      where: {
        id: { not: userId },
        OR: [
          { displayName: { contains: q } },
          { email: { contains: q } },
        ],
      },
      select: { id: true, displayName: true, email: true, avatarUrl: true },
      take: 10,
    });
    return NextResponse.json({ users });
  } catch (err) {
    return handleApiError(err);
  }
}
