import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { handleApiError, HttpError } from "@/lib/api";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !user.passwordHash) throw new HttpError(401, "Invalid email or password");

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) throw new HttpError(401, "Invalid email or password");

    await setSessionCookie(user.id);
    return NextResponse.json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
