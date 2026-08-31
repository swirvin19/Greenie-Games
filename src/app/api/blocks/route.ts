import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { handleApiError, HttpError } from "@/lib/api";

export async function GET() {
  try {
    const userId = await requireUserId();
    const blocks = await prisma.block.findMany({
      where: { blockerId: userId },
      include: { blocked: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ blocks });
  } catch (err) {
    return handleApiError(err);
  }
}

const bodySchema = z.object({ userId: z.string() });

export async function POST(req: Request) {
  try {
    const blockerId = await requireUserId();
    const { userId: blockedId } = bodySchema.parse(await req.json());
    if (blockerId === blockedId) throw new HttpError(400, "Can't block yourself");

    const block = await prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      update: {},
      create: { blockerId, blockedId },
    });

    return NextResponse.json({ block });
  } catch (err) {
    return handleApiError(err);
  }
}
