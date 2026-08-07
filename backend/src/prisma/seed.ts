import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Starting database seeding...');

  // 1. Clean existing data (in reverse dependency order)
  await prisma.review.deleteMany();
  await prisma.paymentTransactionLedger.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatRoom.deleteMany();
  await prisma.engagementDispute.deleteMany();
  await prisma.engagement.deleteMany();
  await prisma.engagementProposal.deleteMany();
  await prisma.catalogRequirement.deleteMany();
  await prisma.profileAvailability.deleteMany();
  await prisma.profileCreatorService.deleteMany();
  await prisma.profileCreator.deleteMany();
  await prisma.profileCustomer.deleteMany();
  await prisma.authUserPermissionOverride.deleteMany();
  await prisma.authRolePermission.deleteMany();
  await prisma.authRefreshToken.deleteMany();
  await prisma.authUser.deleteMany();

  // 2. Seed Role Permissions Mapping
  console.log('[Seed] Seeding role-permission mappings...');
  const customerPermissions = [
    'profile:read', 'profile:write', 'requirement:create', 'requirement:read',
    'requirement:write', 'proposal:read', 'proposal:accept', 'engagement:read',
    'chat:read', 'chat:send', 'payment:pay', 'review:create'
  ];

  const creatorPermissions = [
    'profile:read', 'profile:write', 'service:write', 'proposal:create',
    'proposal:read', 'engagement:read', 'engagement:complete', 'chat:read',
    'chat:send', 'review:read', 'ai:suggest'
  ];

  const managerPermissions = [
    'user:manage', 'creator:approve', 'creator:reject', 'business:verify',
    'account:suspend', 'dispute:resolve', 'analytics:read', 'payment:refund'
  ];

  const mappings = [
    ...customerPermissions.map((perm) => ({ role: UserRole.CUSTOMER, permissionName: perm })),
    ...creatorPermissions.map((perm) => ({ role: UserRole.CREATOR, permissionName: perm })),
    ...managerPermissions.map((perm) => ({ role: UserRole.MANAGER, permissionName: perm }))
  ];

  await prisma.authRolePermission.createMany({
    data: mappings
  });

  // 3. Create Users
  console.log('[Seed] Creating default users...');
  const passwordHash = await bcrypt.hash('password123', 10);

  // Manager User
  const manager = await prisma.authUser.create({
    data: {
      email: 'manager@creatorhub.com',
      passwordHash,
      role: UserRole.MANAGER
    }
  });

  // Customer User
  const customer = await prisma.authUser.create({
    data: {
      email: 'customer@creatorhub.com',
      passwordHash,
      role: UserRole.CUSTOMER
    }
  });

  // Creator 1 (Approved)
  const creatorApproved = await prisma.authUser.create({
    data: {
      email: 'creator1@creatorhub.com',
      passwordHash,
      role: UserRole.CREATOR
    }
  });

  // Creator 2 (Pending approval)
  const creatorPending = await prisma.authUser.create({
    data: {
      email: 'creator2@creatorhub.com',
      passwordHash,
      role: UserRole.CREATOR
    }
  });

  // 4. Create Profiles
  console.log('[Seed] Creating user profiles...');
  await prisma.profileCustomer.create({
    data: {
      userId: customer.id,
      fullName: 'Alice Customer',
      companyName: 'Alice Media Group',
      city: 'New York',
      country: 'United States'
    }
  });

  const creator1Profile = await prisma.profileCreator.create({
    data: {
      userId: creatorApproved.id,
      displayName: 'Bob Designer (UI/UX)',
      bio: 'Professional product UI/UX Designer. Ex-Stripe designer helping startups build premium design systems.',
      skills: ['Figma', 'React', 'Tailwind', 'UI/UX Design', 'Branding'],
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      isApproved: true,
      city: 'Los Angeles',
      country: 'United States'
    }
  });

  const creator2Profile = await prisma.profileCreator.create({
    data: {
      userId: creatorPending.id,
      displayName: 'Charlie Editor (Video)',
      bio: 'Award-winning short-form video editor for TikTok, Reels, and YouTube Shorts.',
      skills: ['Premiere Pro', 'After Effects', 'Color Grading', 'TikTok', 'Video Editing'],
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
      isApproved: false, // in manager's verification queue
      city: 'Chicago',
      country: 'United States'
    }
  });

  // 5. Create Services for Creator 1
  console.log('[Seed] Creating creator services...');
  await prisma.profileCreatorService.createMany({
    data: [
      {
        creatorId: creator1Profile.id,
        title: 'Premium Startup Logo Design',
        description: 'Complete vector logo branding including guidelines, font choices, and 3 revision rounds.',
        price: 250.00,
        deliveryDays: 4
      },
      {
        creatorId: creator1Profile.id,
        title: 'Mobile App UI Design (5 screens)',
        description: 'Figma mockup design of 5 app views tailored to iOS and Android design guidelines.',
        price: 600.00,
        deliveryDays: 7
      }
    ]
  });

  // 6. Create Services for Creator 2
  await prisma.profileCreatorService.createMany({
    data: [
      {
        creatorId: creator2Profile.id,
        title: 'Short-form Video Edit (TikTok/Reels)',
        description: 'Fast-paced, subtitled editing complete with sound design and background assets.',
        price: 80.00,
        deliveryDays: 2
      }
    ]
  });

  // 7. Create Requirements
  console.log('[Seed] Seeding requirements catalog...');
  const req1 = await prisma.catalogRequirement.create({
    data: {
      customerId: customer.id,
      title: 'Startup Logo Redesign',
      description: 'Looking for a clean, modern design for our fintech startup logo. Requires Figma deliverables.',
      budget: 300.00,
      category: 'UI/UX Design',
      tags: ['Logo', 'Startup', 'Figma', 'Fintech'],
      city: 'New York',
      country: 'United States'
    }
  });

  const req2 = await prisma.catalogRequirement.create({
    data: {
      customerId: customer.id,
      title: 'Edits for 10 YouTube Shorts',
      description: 'Need engaging subtitle overlay editing in the style of Alex Hormozi for 10 video clips.',
      budget: 500.00,
      category: 'Video Editing',
      tags: ['YouTube Shorts', 'Subtitle', 'Video Editing', 'Hormozi'],
      city: 'New York',
      country: 'United States'
    }
  });

  // 8. Create Bids / Proposals
  console.log('[Seed] Creating bid proposals...');
  await prisma.engagementProposal.create({
    data: {
      requirementId: req1.id,
      creatorId: creatorApproved.id,
      coverLetter: "I'd love to redesign your fintech startup logo. I have extensive experience in fintech brands.",
      bidAmount: 280.00,
      deliveryDays: 3
    }
  });

  await prisma.engagementProposal.create({
    data: {
      requirementId: req2.id,
      creatorId: creatorPending.id,
      coverLetter: "Hi! I specialize in short-form editing and have high-retention mockups ready to share.",
      bidAmount: 450.00,
      deliveryDays: 5
    }
  });

  // 9. Create Mock Transaction Ledgers
  console.log('[Seed] Seeding mock transaction ledgers...');
  await prisma.paymentTransactionLedger.create({
    data: {
      userId: customer.id,
      amount: 1000.00,
      type: 'DEPOSIT',
      description: 'Initial wallet deposit simulation'
    }
  });

  console.log('[Seed] Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('[Seed] Seeding failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
