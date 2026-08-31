import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { handleApiError, HttpError } from "@/lib/api";

const bodySchema = z.object({ action: z.enum(["accept", "block"]) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const { action } = bodySchema.parse(await req.json());

    const friendship = await prisma.friendship.findUnique({ where: { id } });
    if (!friendship || (friendship.userAId !== userId && friendship.userBId !== userId)) {
      throw new HttpError(404, "Friend request not found");
    }

    if (action === "accept") {
      if (friendship.requestedById === userId) {
        throw new HttpError(400, "Can't accept your own request");
      }
      const updated = await prisma.friendship.update({
        where: { id },
        data: { status: "ACCEPTED" },
      });
      return NextResponse.json({ friendship: updated });
    }

    const updated = await prisma.friendship.update({ where: { id }, data: { status: "BLOCKED" } });
    return NextResponse.json({ friendship: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const friendship = await prisma.friendship.findUnique({ where: { id } });
    if (!friendship || (friendship.userAId !== userId && friendship.userBId !== userId)) {
      throw new HttpError(404, "Friend request not found");
    }
    await prisma.friendship.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
