import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { handleApiError, HttpError } from "@/lib/api";

const bodySchema = z.object({ reason: z.string().min(1).max(500) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const { reason } = bodySchema.parse(await req.json());

    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) throw new HttpError(404, "Message not found");

    const report = await prisma.report.create({
      data: {
        reporterId: userId,
        reportedUserId: message.senderId,
        messageId: message.id,
        reason,
      },
    });

    return NextResponse.json({ report });
  } catch (err) {
    return handleApiError(err);
  }
}
