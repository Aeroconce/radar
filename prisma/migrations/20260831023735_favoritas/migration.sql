-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "profile" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Favorite_profile_idx" ON "Favorite"("profile");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_tenderId_profile_key" ON "Favorite"("tenderId", "profile");

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;
