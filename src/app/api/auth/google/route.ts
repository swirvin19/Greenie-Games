import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { setOAuthStateCookie } from "@/lib/auth";
import { googleAuthUrl } from "@/lib/oauth/google";

export async function GET(req: Request) {
  try {
    const state = randomBytes(16).toString("hex");
    await setOAuthStateCookie(state);
    return NextResponse.redirect(googleAuthUrl(state));
  } catch (err) {
    console.error("Google sign-in is not configured:", err);
    return NextResponse.redirect(new URL("/login?error=not_configured", req.url));
  }
}
