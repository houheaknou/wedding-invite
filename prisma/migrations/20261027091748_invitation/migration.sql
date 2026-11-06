-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "template" TEXT NOT NULL DEFAULT 'classic',
    "lang" TEXT NOT NULL DEFAULT 'km',
    "title" TEXT,
    "titleEnabled" BOOLEAN NOT NULL DEFAULT true,
    "titleTop" TEXT NOT NULL DEFAULT '#FFE8B0',
    "titleBottom" TEXT NOT NULL DEFAULT '#E3A857',
    "titleOutline" TEXT NOT NULL DEFAULT '#6B3A1F',
    "message" TEXT,
    "showDetails" BOOLEAN NOT NULL DEFAULT true,
    "showCountdown" BOOLEAN NOT NULL DEFAULT true,
    "showAgenda" BOOLEAN NOT NULL DEFAULT true,
    "musicFile" TEXT,
    "musicName" TEXT,
    "musicType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_eventId_key" ON "Invitation"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_shareId_key" ON "Invitation"("shareId");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
