import { PrismaClient, UserRole, EngagementStatus, MilestoneStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Finding default seed users...');
  const customer = await prisma.authUser.findUnique({
    where: { email: 'customer@creatorhub.com' }
  });
  const creator = await prisma.authUser.findUnique({
    where: { email: 'creator1@creatorhub.com' }
  });

  if (!customer || !creator) {
    throw new Error('Seed users do not exist. Please run database seeding first.');
  }

  console.log('[Seed] Creating active requirement, engagement, and pending milestones...');

  // Create a new requirement
  const requirement = await prisma.catalogRequirement.create({
    data: {
      customerId: customer.id,
      title: 'Active Development Project',
      description: 'Active contract with pending milestones for payment and escrow flow testing.',
      budget: 350.00,
      category: 'Development'
    }
  });

  // Create an engagement
  const engagement = await prisma.engagement.create({
    data: {
      requirementId: requirement.id,
      creatorId: creator.id,
      customerId: customer.id,
      amount: 350.00,
      status: EngagementStatus.ACTIVE
    }
  });

  // Create Chat Room
  await prisma.chatRoom.create({
    data: {
      engagementId: engagement.id
    }
  });

  // Create Milestones
  await prisma.engagementMilestone.create({
    data: {
      engagementId: engagement.id,
      title: 'Milestone 1: Prototype Deliverable',
      description: 'Complete UI prototype and layout design.',
      amount: 200.00,
      status: MilestoneStatus.PENDING
    }
  });

  await prisma.engagementMilestone.create({
    data: {
      engagementId: engagement.id,
      title: 'Milestone 2: Production Release',
      description: 'Final production build, verification, and code delivery.',
      amount: 150.00,
      status: MilestoneStatus.PENDING
    }
  });

  console.log('[Seed] Active work engagement and pending milestones seeded successfully!');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
