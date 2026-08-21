-- CreateTable
CREATE TABLE "StudentFollow" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentFollow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentFollow_studentId_idx" ON "StudentFollow"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentFollow_teacherId_studentId_key" ON "StudentFollow"("teacherId", "studentId");

-- AddForeignKey
ALTER TABLE "StudentFollow" ADD CONSTRAINT "StudentFollow_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFollow" ADD CONSTRAINT "StudentFollow_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
