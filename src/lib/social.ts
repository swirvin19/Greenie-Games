import { prisma } from "@/lib/prisma";

export async function getAcceptedFriendIds(userId: string): Promise<Set<string>> {
  const rows = await prisma.friendship.findMany({
    where: { status: "ACCEPTED", OR: [{ userAId: userId }, { userBId: userId }] },
  });
  return new Set(rows.map((f) => (f.userAId === userId ? f.userBId : f.userAId)));
}

export async function areFriends(userId: string, otherId: string): Promise<boolean> {
  const [userAId, userBId] = [userId, otherId].sort();
  const friendship = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
  });
  return friendship?.status === "ACCEPTED";
}
