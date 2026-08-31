import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { handleApiError, HttpError } from "@/lib/api";
import { getAcceptedFriendIds } from "@/lib/social";
import type { HoleEntry } from "@/lib/games/types";

export async function GET() {
  try {
    const userId = await requireUserId();
    const friendIds = Array.from(await getAcceptedFriendIds(userId));

    const [mine, following, friendsLive] = await Promise.all([
      prisma.round.findMany({
        where: { ownerId: userId },
        include: { owner: true, course: true, teeBox: true },
        orderBy: { startedAt: "desc" },
      }),
      prisma.round.findMany({
        where: { followers: { some: { userId } } },
        include: { owner: true, course: true, teeBox: true },
        orderBy: { startedAt: "desc" },
      }),
      prisma.round.findMany({
        where: { ownerId: { in: friendIds }, status: "IN_PROGRESS" },
        include: { owner: true, course: true, teeBox: true },
        orderBy: { startedAt: "desc" },
      }),
    ]);

    return NextResponse.json({ mine, following, friendsLive });
  } catch (err) {
    return handleApiError(err);
  }
}

const gamesConfigSchema = z.object({
  playerIds: z.array(z.string()).min(1),
  enabledGames: z.array(
    z.enum([
      "NASSAU",
      "SKINS",
      "STABLEFORD",
      "VEGAS",
      "WOLF",
      "BANKER",
      "GREENIE",
      "KOTG",
      "BOMB",
      "VAULT",
      "CHAOS",
    ])
  ),
  nassau: z.object({ stakeLabel: z.string().optional(), pressAllowed: z.boolean().optional() }).optional(),
  skins: z.object({ stakeLabel: z.string().optional(), carryover: z.boolean().optional() }).optional(),
  stableford: z.object({ pointsTable: z.record(z.string(), z.number()).optional() }).optional(),
  vegas: z
    .object({
      teamA: z.tuple([z.string(), z.string()]),
      teamB: z.tuple([z.string(), z.string()]),
      stakeLabel: z.string().optional(),
      flipOnBogey: z.boolean().optional(),
    })
    .optional(),
  wolf: z.object({ order: z.array(z.string()), stakeLabel: z.string().optional() }).optional(),
  banker: z.object({ rotation: z.array(z.string()), stakeLabel: z.string().optional() }).optional(),
  greenie: z.object({ stakeLabel: z.string().optional() }).optional(),
  kotg: z.object({ stakeLabel: z.string().optional() }).optional(),
  bomb: z.object({ stakeLabel: z.string().optional() }).optional(),
  vault: z.object({ holeNumbers: z.array(z.number()).optional(), stakeLabel: z.string().optional() }).optional(),
  chaos: z
    .object({
      seed: z.number(),
      pool: z.array(z.string()).optional(),
    })
    .optional(),
});

const bodySchema = z
  .object({
    courseId: z.string().optional(),
    teeBoxId: z.string().optional(),
    courseName: z.string().optional(),
    holePars: z.array(z.number().int().min(3).max(6)).optional(),
    gamesConfig: gamesConfigSchema,
  })
  .refine((b) => b.courseId || (b.courseName && b.holePars?.length), {
    message: "Provide either courseId+teeBoxId or courseName+holePars",
  });

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = bodySchema.parse(await req.json());
    if (!body.gamesConfig.playerIds.includes(userId)) {
      throw new HttpError(400, "Round owner must be a player");
    }

    let holes: HoleEntry[];
    let courseId: string | undefined;
    let teeBoxId: string | undefined;
    const courseName: string | undefined = body.courseName;

    if (body.courseId) {
      const teeBox = body.teeBoxId
        ? await prisma.teeBox.findUnique({ where: { id: body.teeBoxId } })
        : (await prisma.course.findUnique({ where: { id: body.courseId }, include: { teeBoxes: true } }))
            ?.teeBoxes[0];
      if (!teeBox) throw new HttpError(404, "Tee box not found");
      const courseHoles = await prisma.courseHole.findMany({
        where: { courseId: body.courseId, teeBoxId: teeBox.id },
        orderBy: { holeNumber: "asc" },
      });
      if (courseHoles.length === 0) throw new HttpError(400, "This course has no holes on file");
      courseId = body.courseId;
      teeBoxId = teeBox.id;
      holes = courseHoles.map((h) => ({
        holeNumber: h.holeNumber,
        par: h.par,
        strokes: Object.fromEntries(body.gamesConfig.playerIds.map((p) => [p, null])),
      }));
    } else {
      holes = (body.holePars ?? []).map((par, i) => ({
        holeNumber: i + 1,
        par,
        strokes: Object.fromEntries(body.gamesConfig.playerIds.map((p) => [p, null])),
      }));
    }

    const round = await prisma.round.create({
      data: {
        ownerId: userId,
        courseId,
        teeBoxId,
        courseName,
        gamesConfig: body.gamesConfig,
        scoreData: holes as unknown as object,
        thread: {
          create: {
            type: "ROUND",
            participants: {
              create: await participantsFor(body.gamesConfig.playerIds),
            },
          },
        },
      },
      include: { thread: true },
    });

    return NextResponse.json({ round });
  } catch (err) {
    return handleApiError(err);
  }
}

async function participantsFor(playerIds: string[]) {
  const realUsers = await prisma.user.findMany({
    where: { id: { in: playerIds } },
    select: { id: true },
  });
  return realUsers.map((u) => ({ userId: u.id }));
}
