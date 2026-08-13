-- Cleanup any partially created enums from failed attempts
DROP TYPE IF EXISTS "AccountStatus" CASCADE;
DROP TYPE IF EXISTS "CreatorVerificationStatus" CASCADE;
DROP TYPE IF EXISTS "RequirementStatus" CASCADE;
DROP TYPE IF EXISTS "BusinessVerificationStatus" CASCADE;
DROP TYPE IF EXISTS "PackageType" CASCADE;
DROP TYPE IF EXISTS "MilestoneStatus" CASCADE;
DROP TYPE IF EXISTS "EngagementStatus_new" CASCADE;
DROP TYPE IF EXISTS "ProposalStatus_new" CASCADE;

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "CreatorVerificationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "RequirementStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PROPOSALS_RECEIVED', 'SHORTLISTED', 'HIRED', 'IN_PROGRESS', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "BusinessVerificationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PackageType" AS ENUM ('BASIC', 'STANDARD', 'PREMIUM');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'DISPUTED');

-- AlterEnum
CREATE TYPE "EngagementStatus_new" AS ENUM ('PENDING', 'ACTIVE', 'IN_PROGRESS', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'DISPUTED', 'ESCROW_HOLD', 'REFUNDED');
ALTER TABLE "Engagement" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Engagement" ALTER COLUMN "status" TYPE "EngagementStatus_new" USING ("status"::text::"EngagementStatus_new");
ALTER TYPE "EngagementStatus" RENAME TO "EngagementStatus_old";
ALTER TYPE "EngagementStatus_new" RENAME TO "EngagementStatus";
DROP TYPE "EngagementStatus_old";
ALTER TABLE "Engagement" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterEnum
BEGIN;
CREATE TYPE "ProposalStatus_new" AS ENUM ('SUBMITTED', 'VIEWED', 'SHORTLISTED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');
ALTER TABLE "EngagementProposal" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "EngagementProposal" ALTER COLUMN "status" TYPE "ProposalStatus_new" USING (CASE WHEN "status"::text = 'PENDING' THEN 'SUBMITTED' ELSE "status"::text END::"ProposalStatus_new");
ALTER TYPE "ProposalStatus" RENAME TO "ProposalStatus_old";
ALTER TYPE "ProposalStatus_new" RENAME TO "ProposalStatus";
DROP TYPE "ProposalStatus_old";
ALTER TABLE "EngagementProposal" ALTER COLUMN "status" SET DEFAULT 'SUBMITTED';
COMMIT;

-- AlterTable
ALTER TABLE "AuthUser" ADD COLUMN     "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "CatalogRequirement" ADD COLUMN     "status" "RequirementStatus" NOT NULL DEFAULT 'PUBLISHED';

-- AlterTable
ALTER TABLE "Engagement" ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "proposalId" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "EngagementProposal" ALTER COLUMN "status" SET DEFAULT 'SUBMITTED';

-- AlterTable
ALTER TABLE "ProfileCreator" ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "verificationDocs" JSONB,
ADD COLUMN     "verificationStatus" "CreatorVerificationStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "BusinessVerification" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "registrationNum" TEXT NOT NULL,
    "documents" JSONB NOT NULL,
    "status" "BusinessVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorPortfolioItem" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "thumbnailUrl" TEXT,
    "projectUrl" TEXT,
    "skills" TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorPortfolioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorBookmark" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorServicePackage" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "type" "PackageType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "deliveryDays" INTEGER NOT NULL,
    "revisions" INTEGER NOT NULL DEFAULT 3,
    "features" TEXT[],
    "addons" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorServicePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngagementMilestone" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "deliverableUrl" TEXT,
    "deliverableNotes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngagementMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngagementProposalHistory" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "fromStatus" "ProposalStatus",
    "toStatus" "ProposalStatus" NOT NULL,
    "changedById" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngagementProposalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessVerification_customerId_key" ON "BusinessVerification"("customerId");

-- CreateIndex
CREATE INDEX "BusinessVerification_customerId_idx" ON "BusinessVerification"("customerId");

-- CreateIndex
CREATE INDEX "BusinessVerification_status_idx" ON "BusinessVerification"("status");

-- CreateIndex
CREATE INDEX "CreatorPortfolioItem_creatorId_idx" ON "CreatorPortfolioItem"("creatorId");

-- CreateIndex
CREATE INDEX "CreatorPortfolioItem_order_idx" ON "CreatorPortfolioItem"("order");

-- CreateIndex
CREATE INDEX "CreatorBookmark_customerId_idx" ON "CreatorBookmark"("customerId");

-- CreateIndex
CREATE INDEX "CreatorBookmark_creatorId_idx" ON "CreatorBookmark"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorBookmark_customerId_creatorId_key" ON "CreatorBookmark"("customerId", "creatorId");

-- CreateIndex
CREATE INDEX "CreatorServicePackage_serviceId_idx" ON "CreatorServicePackage"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorServicePackage_serviceId_type_key" ON "CreatorServicePackage"("serviceId", "type");

-- CreateIndex
CREATE INDEX "EngagementMilestone_engagementId_idx" ON "EngagementMilestone"("engagementId");

-- CreateIndex
CREATE INDEX "EngagementMilestone_status_idx" ON "EngagementMilestone"("status");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "EngagementProposalHistory_proposalId_idx" ON "EngagementProposalHistory"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "Engagement_proposalId_key" ON "Engagement"("proposalId");

-- AddForeignKey
ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "EngagementProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessVerification" ADD CONSTRAINT "BusinessVerification_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "ProfileCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorPortfolioItem" ADD CONSTRAINT "CreatorPortfolioItem_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "ProfileCreator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorBookmark" ADD CONSTRAINT "CreatorBookmark_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "AuthUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorBookmark" ADD CONSTRAINT "CreatorBookmark_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "ProfileCreator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorServicePackage" ADD CONSTRAINT "CreatorServicePackage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ProfileCreatorService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementMilestone" ADD CONSTRAINT "EngagementMilestone_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AuthUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementProposalHistory" ADD CONSTRAINT "EngagementProposalHistory_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "EngagementProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
