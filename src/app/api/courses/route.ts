import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

export async function GET(req: Request) {
  try {
    await requireUserId();
    const q = new URL(req.url).searchParams.get("q")?.trim();
    const courses = await prisma.course.findMany({
      where: q ? { name: { contains: q } } : undefined,
      include: { teeBoxes: true },
      take: 20,
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ courses });
  } catch (err) {
    return handleApiError(err);
  }
}

// Manual-entry fallback for courses not in a licensed provider's data
// (small munis, private clubs) — saved locally with externalId left null
// so it's there next time, same as Round.courseName describes.
const bodySchema = z.object({
  name: z.string().min(1),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  teeBoxName: z.string().default("White"),
  holePars: z.array(z.number().int().min(3).max(6)).min(1).max(18),
});

export async function POST(req: Request) {
  try {
    await requireUserId();
    const body = bodySchema.parse(await req.json());

    const course = await prisma.course.create({
      data: {
        name: body.name,
        city: body.city,
        state: body.state,
        country: body.country,
        teeBoxes: { create: { name: body.teeBoxName } },
      },
      include: { teeBoxes: true },
    });

    const teeBox = course.teeBoxes[0];
    await prisma.courseHole.createMany({
      data: body.holePars.map((par, i) => ({
        courseId: course.id,
        teeBoxId: teeBox.id,
        holeNumber: i + 1,
        par,
      })),
    });

    const full = await prisma.course.findUnique({
      where: { id: course.id },
      include: { teeBoxes: true, holes: true },
    });
    return NextResponse.json({ course: full });
  } catch (err) {
    return handleApiError(err);
  }
}
