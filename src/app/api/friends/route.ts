import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { handleApiError, HttpError } from "@/lib/api";

export async function GET() {
  try {
    const userId = await requireUserId();
    const rows = await prisma.friendship.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      include: { userA: true, userB: true },
      orderBy: { createdAt: "desc" },
    });

    const shape = (f: (typeof rows)[number]) => {
      const other = f.userAId === userId ? f.userB : f.userA;
      return {
        friendshipId: f.id,
        status: f.status,
        createdAt: f.createdAt,
        requestedByMe: f.requestedById === userId,
        user: { id: other.id, displayName: other.displayName, avatarUrl: other.avatarUrl },
      };
    };

    return NextResponse.json({
      accepted: rows.filter((f) => f.status === "ACCEPTED").map(shape),
      incomingPending: rows.filter((f) => f.status === "PENDING" && f.requestedById !== userId).map(shape),
      outgoingPending: rows.filter((f) => f.status === "PENDING" && f.requestedById === userId).map(shape),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const bodySchema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const { email } = bodySchema.parse(await req.json());

    const target = await prisma.user.findUnique({ where: { email } });
    if (!target) throw new HttpError(404, "No user with that email");
    if (target.id === userId) throw new HttpError(400, "Can't friend yourself");

    const blocked = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: target.id },
          { blockerId: target.id, blockedId: userId },
        ],
      },
    });
    if (blocked) throw new HttpError(403, "Unable to send request");

    const [userAId, userBId] = [userId, target.id].sort();
    const friendship = await prisma.friendship.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      update: {},
      create: { userAId, userBId, requestedById: userId, status: "PENDING" },
    });

    return NextResponse.json({ friendship });
  } catch (err) {
    return handleApiError(err);
  }
}
