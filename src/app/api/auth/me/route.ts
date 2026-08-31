import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      equippedMascotSkinId: user.equippedMascotSkinId,
      equippedColorSchemeId: user.equippedColorSchemeId,
      equippedBannerStyleId: user.equippedBannerStyleId,
      equippedIconId: user.equippedIconId,
    },
  });
}
