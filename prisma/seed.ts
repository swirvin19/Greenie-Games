import { PrismaClient, ItemType, ItemSource, PassTrack, ThresholdType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const [jon, dale, mia] = await Promise.all(
    [
      { email: "jon@example.com", displayName: "Jon" },
      { email: "dale@example.com", displayName: "Dale" },
      { email: "mia@example.com", displayName: "Mia" },
    ].map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: {
          email: u.email,
          displayName: u.displayName,
          authProvider: "email",
          passwordHash,
          progress: { create: {} },
        },
      })
    )
  );

  await prisma.friendship.upsert({
    where: { userAId_userBId: { userAId: jon.id < dale.id ? jon.id : dale.id, userBId: jon.id < dale.id ? dale.id : jon.id } },
    update: {},
    create: {
      userAId: jon.id < dale.id ? jon.id : dale.id,
      userBId: jon.id < dale.id ? dale.id : jon.id,
      status: "ACCEPTED",
    },
  });

  const seasonPass = await prisma.seasonPass.create({
    data: {
      name: "Summer Slam",
      theme: "sun-and-scorecards",
      startDate: new Date("2026-06-01"),
      endDate: new Date("2026-09-01"),
      priceCents: 999,
      active: true,
    },
  });

  const freeIcon = await prisma.item.create({
    data: {
      type: ItemType.ICON,
      name: "Sunburst Icon",
      imageUrl: "/cosmetics/icon-sunburst.svg",
      source: ItemSource.SEASON_PASS_FREE,
      tradeable: false,
      seasonPassId: seasonPass.id,
    },
  });

  const premiumMascot = await prisma.item.create({
    data: {
      type: ItemType.MASCOT_SKIN,
      name: "Golden Gator Mascot",
      imageUrl: "/cosmetics/mascot-golden-gator.svg",
      source: ItemSource.SEASON_PASS_PREMIUM,
      tradeable: true,
      seasonPassId: seasonPass.id,
    },
  });

  const holidayBanner = await prisma.item.create({
    data: {
      type: ItemType.BANNER_STYLE,
      name: "4th of July Banner",
      imageUrl: "/cosmetics/banner-july4.svg",
      source: ItemSource.HOLIDAY_DROP,
      tradeable: true,
      seasonPassId: seasonPass.id,
    },
  });

  await prisma.passReward.createMany({
    data: [
      {
        seasonPassId: seasonPass.id,
        track: PassTrack.FREE,
        thresholdType: ThresholdType.ROUNDS_COMPLETED,
        thresholdValue: 1,
        itemId: freeIcon.id,
      },
      {
        seasonPassId: seasonPass.id,
        track: PassTrack.PREMIUM,
        thresholdType: ThresholdType.ROUNDS_COMPLETED,
        thresholdValue: 3,
        itemId: premiumMascot.id,
      },
      {
        seasonPassId: seasonPass.id,
        track: PassTrack.PREMIUM,
        thresholdType: ThresholdType.FRIENDS_PLAYED_WITH,
        thresholdValue: 2,
        itemId: holidayBanner.id,
      },
    ],
  });

  await prisma.inventoryItem.create({
    data: {
      userId: jon.id,
      itemId: freeIcon.id,
      acquiredVia: ItemSource.SEASON_PASS_FREE,
      equipped: true,
    },
  });
  await prisma.user.update({
    where: { id: jon.id },
    data: { equippedIconId: freeIcon.id },
  });

  const course = await prisma.course.create({
    data: {
      name: "Pebble Brook Municipal",
      city: "Springfield",
      state: "IL",
      country: "USA",
    },
  });

  const teeBox = await prisma.teeBox.create({
    data: {
      courseId: course.id,
      name: "White",
      slopeRating: 124,
      courseRating: 70.2,
      totalYardage: 6100,
    },
  });

  const pars = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5];
  await prisma.courseHole.createMany({
    data: pars.map((par, i) => ({
      courseId: course.id,
      teeBoxId: teeBox.id,
      holeNumber: i + 1,
      par,
      yardage: par === 3 ? 165 : par === 5 ? 520 : 380,
    })),
  });

  console.log("Seeded:", { jon: jon.email, dale: dale.email, mia: mia.email, seasonPass: seasonPass.name, course: course.name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
