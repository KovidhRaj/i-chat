-- AlterTable: add delivery status, soft-delete, and reply-to on Message
ALTER TABLE "Message" ADD COLUMN "deliveredAt" DATETIME;
ALTER TABLE "Message" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "Message" ADD COLUMN "replyToId" TEXT REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: add lastSeenAt on User
ALTER TABLE "User" ADD COLUMN "lastSeenAt" DATETIME;

-- CreateTable: Reaction
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "emoji" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Reaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_messageId_userId_emoji_key" ON "Reaction"("messageId", "userId", "emoji");
