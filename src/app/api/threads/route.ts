import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { handleApiError, HttpError } from "@/lib/api";
import { areFriends } from "@/lib/social";

export async function GET() {
  try {
    const userId = await requireUserId();
    const threads = await prisma.thread.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: { include: { user: true } },
        round: true,
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ threads });
  } catch (err) {
    return handleApiError(err);
  }
}

const bodySchema = z.object({
  participantIds: z.array(z.string()).min(1),
});

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const { participantIds } = bodySchema.parse(await req.json());
    const allIds = Array.from(new Set([userId, ...participantIds]));

    for (const otherId of allIds) {
      if (otherId === userId) continue;
      const friends = await areFriends(userId, otherId);
      if (!friends) throw new HttpError(403, "Chat is friends-only for now");
    }

    const type = allIds.length > 2 ? ("GROUP" as const) : ("FRIEND_DM" as const);

    const thread = await prisma.thread.create({
      data: {
        type,
        participants: { create: allIds.map((id) => ({ userId: id })) },
      },
      include: { participants: { include: { user: true } } },
    });

    return NextResponse.json({ thread });
  } catch (err) {
    return handleApiError(err);
  }
}
