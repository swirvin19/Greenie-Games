import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { handleApiError, HttpError } from "@/lib/api";
import { recomputeProgressAndGrantRewards } from "@/lib/progress";

// No payment processing — the app has no billing integration by design
// (see README). This records the one-time unlock a real checkout flow
// would call after charging the card elsewhere.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const pass = await prisma.seasonPass.findUnique({ where: { id } });
    if (!pass) throw new HttpError(404, "Season pass not found");

    await prisma.seasonPassPurchase.upsert({
      where: { userId_seasonPassId: { userId, seasonPassId: id } },
      update: {},
      create: { userId, seasonPassId: id },
    });

    await recomputeProgressAndGrantRewards(userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
