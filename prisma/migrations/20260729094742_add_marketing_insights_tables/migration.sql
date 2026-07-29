-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('POST', 'REEL', 'STORY', 'LIVE', 'CAROUSEL');

-- CreateEnum
CREATE TYPE "TrendSnapshotType" AS ENUM ('HASHTAG', 'AUDIO', 'NICHE');

-- CreateTable
CREATE TABLE "MediaPost" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "trackedAccountId" TEXT,
    "externalId" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'INSTAGRAM',
    "mediaType" "MediaType" NOT NULL DEFAULT 'POST',
    "permalink" TEXT,
    "caption" TEXT,
    "hashtags" TEXT[],
    "audioId" TEXT,
    "audioName" TEXT,
    "thumbnailUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaInsight" (
    "id" TEXT NOT NULL,
    "mediaPostId" TEXT NOT NULL,
    "impressions" INTEGER,
    "reach" INTEGER,
    "likes" INTEGER,
    "comments" INTEGER,
    "shares" INTEGER,
    "saves" INTEGER,
    "plays" INTEGER,
    "views" INTEGER,
    "engagementRate" DECIMAL(5,4),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountInsight" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "followers" INTEGER,
    "profileViews" INTEGER,
    "reach" INTEGER,
    "impressions" INTEGER,
    "websiteClicks" INTEGER,
    "audienceJson" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendSnapshot" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "type" "TrendSnapshotType" NOT NULL,
    "query" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrendSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentRecommendation" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'REEL',
    "title" TEXT NOT NULL,
    "outline" TEXT NOT NULL,
    "hashtags" TEXT[],
    "audioSuggestion" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "basedOnMediaIds" JSONB NOT NULL,

    CONSTRAINT "ContentRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaPost_storeId_publishedAt_idx" ON "MediaPost"("storeId", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaPost_storeId_externalId_key" ON "MediaPost"("storeId", "externalId");

-- CreateIndex
CREATE INDEX "MediaInsight_mediaPostId_fetchedAt_idx" ON "MediaInsight"("mediaPostId", "fetchedAt");

-- CreateIndex
CREATE INDEX "AccountInsight_storeId_date_idx" ON "AccountInsight"("storeId", "date");

-- CreateIndex
CREATE INDEX "TrendSnapshot_storeId_type_query_fetchedAt_idx" ON "TrendSnapshot"("storeId", "type", "query", "fetchedAt");

-- CreateIndex
CREATE INDEX "ContentRecommendation_storeId_generatedAt_idx" ON "ContentRecommendation"("storeId", "generatedAt");

-- AddForeignKey
ALTER TABLE "MediaPost" ADD CONSTRAINT "MediaPost_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaInsight" ADD CONSTRAINT "MediaInsight_mediaPostId_fkey" FOREIGN KEY ("mediaPostId") REFERENCES "MediaPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountInsight" ADD CONSTRAINT "AccountInsight_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrendSnapshot" ADD CONSTRAINT "TrendSnapshot_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRecommendation" ADD CONSTRAINT "ContentRecommendation_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
