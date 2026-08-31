import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { handleApiError, HttpError } from "@/lib/api";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(1).max(60),
});

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json());
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw new HttpError(409, "An account with that email already exists");

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        displayName: body.displayName,
        authProvider: "email",
        passwordHash,
        progress: { create: {} },
      },
    });

    const token = await setSessionCookie(user.id);
    return NextResponse.json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      token,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
