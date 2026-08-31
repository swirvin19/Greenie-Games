import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { handleApiError, HttpError } from "@/lib/api";

const bodySchema = z.object({ follow: z.boolean() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const { follow } = bodySchema.parse(await req.json());

    const round = await prisma.round.findUnique({ where: { id }, include: { thread: true } });
    if (!round) throw new HttpError(404, "Round not found");

    if (follow) {
      await prisma.roundFollower.upsert({
        where: { roundId_userId: { roundId: id, userId } },
        update: {},
        create: { roundId: id, userId },
      });
      if (round.thread) {
        await prisma.threadParticipant.upsert({
          where: { threadId_userId: { threadId: round.thread.id, userId } },
          update: {},
          create: { threadId: round.thread.id, userId },
        });
      }
    } else {
      await prisma.roundFollower.deleteMany({ where: { roundId: id, userId } });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
