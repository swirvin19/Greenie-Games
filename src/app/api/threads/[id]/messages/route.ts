import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { handleApiError, HttpError } from "@/lib/api";

async function assertParticipant(threadId: string, userId: string) {
  const participant = await prisma.threadParticipant.findUnique({
    where: { threadId_userId: { threadId, userId } },
  });
  if (!participant) throw new HttpError(403, "Not a participant in this thread");
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    await assertParticipant(id, userId);

    const messages = await prisma.message.findMany({
      where: { threadId: id },
      include: { sender: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      messages: messages.map((m) => ({
        ...m,
        body: m.deletedAt ? "[message removed]" : m.body,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const bodySchema = z.object({ body: z.string().min(1).max(2000) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    await assertParticipant(id, userId);
    const { body } = bodySchema.parse(await req.json());

    const participants = await prisma.threadParticipant.findMany({ where: { threadId: id } });
    const otherIds = participants.map((p) => p.userId).filter((p) => p !== userId);
    if (otherIds.length > 0) {
      const blocked = await prisma.block.findFirst({
        where: {
          OR: otherIds.flatMap((otherId) => [
            { blockerId: userId, blockedId: otherId },
            { blockerId: otherId, blockedId: userId },
          ]),
        },
      });
      if (blocked) throw new HttpError(403, "Can't message here — a participant is blocked");
    }

    const message = await prisma.message.create({
      data: { threadId: id, senderId: userId, body },
      include: { sender: true },
    });

    return NextResponse.json({ message });
  } catch (err) {
    return handleApiError(err);
  }
}
