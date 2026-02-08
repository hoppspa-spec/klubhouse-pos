-- CreateTable
CREATE TABLE "Cashout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "from" TIMESTAMP(3) NOT NULL,
    "to" TIMESTAMP(3) NOT NULL,
    "orders" INTEGER NOT NULL,
    "totalCash" INTEGER NOT NULL,
    "totalDebit" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cashout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cashout_userId_from_to_idx" ON "Cashout"("userId", "from", "to");

-- AddForeignKey
ALTER TABLE "Cashout" ADD CONSTRAINT "Cashout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
