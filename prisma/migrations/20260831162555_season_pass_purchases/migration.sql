-- CreateTable
CREATE TABLE "SeasonPassPurchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "seasonPassId" TEXT NOT NULL,
    "purchasedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SeasonPassPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SeasonPassPurchase_seasonPassId_fkey" FOREIGN KEY ("seasonPassId") REFERENCES "SeasonPass" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SeasonPassPurchase_userId_seasonPassId_key" ON "SeasonPassPurchase"("userId", "seasonPassId");
