# CreatorHub Backend Implementation Prompt

This document provides a complete guide and specification for implementing the backend service of CreatorHub.

---

## 1. Directory Structure

```
/backend
  /src
    /features
      /auth
        auth.routes.ts
        auth.controller.ts
        auth.service.ts
        auth.middleware.ts
        auth.dto.ts
        auth.types.ts
      /rbac
        rbac.routes.ts
        rbac.controller.ts
        rbac.service.ts
        rbac.middleware.ts
        rbac.dto.ts
      /user-profile
        user-profile.routes.ts
        user-profile.controller.ts
        user-profile.service.ts
        user-profile.dto.ts
      /catalog
        catalog.routes.ts
        catalog.controller.ts
        catalog.service.ts
        catalog.dto.ts
      /engagement
        engagement.routes.ts
        engagement.controller.ts
        engagement.service.ts
        engagement.dto.ts
      /chat
        chat.routes.ts
        chat.controller.ts
        chat.service.ts
        chat.dto.ts
      /payment
        payment.routes.ts
        payment.controller.ts
        payment.service.ts
        payment.dto.ts
      /review
        review.routes.ts
        review.controller.ts
        review.service.ts
        review.dto.ts
      /admin
        admin.routes.ts
        admin.controller.ts
        admin.service.ts
        admin.dto.ts
      /ai
        ai.service.ts
      /media
        media.service.ts
      /location
        location.service.ts
    /common
      /middleware
        errorHandler.ts
        logger.ts
    /prisma
      schema.prisma
      client.ts
    app.ts
    server.ts
  package.json
  tsconfig.json
```

---

## 2. Complete Namespaced Prisma Schema (`schema.prisma`)

Create the `schema.prisma` file inside `/backend/src/prisma/`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ==========================================
// AUTH & USER MODULE
// ==========================================

enum UserRole {
  CUSTOMER
  CREATOR
  MANAGER
}

model AuthUser {
  id           String      @id @default(uuid())
  email        String      @unique
  passwordHash String
  role         UserRole    @default(CUSTOMER)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  
  // Relations
  refreshToken          AuthRefreshToken?
  customerProfile       ProfileCustomer?
  creatorProfile        ProfileCreator?
  permissionOverrides   AuthUserPermissionOverride[]
  chatMessagesSent      ChatMessage[]
  reviewsWritten        Review[]             @relation("ReviewAuthor")
  reviewsReceived       Review[]             @relation("ReviewTarget")
  transactions          PaymentTransactionLedger[]
  disputesInitiated     EngagementDispute[]  @relation("DisputeInitiator")
  proposals             EngagementProposal[]
  requirements          CatalogRequirement[]
}

model AuthRefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String   @unique
  user      AuthUser @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model AuthRolePermission {
  id             String   @id @default(uuid())
  role           UserRole
  permissionName String

  @@unique([role, permissionName])
}

model AuthUserPermissionOverride {
  id             String   @id @default(uuid())
  userId         String
  user           AuthUser @relation(fields: [userId], references: [id], onDelete: Cascade)
  permissionName String
  allowed        Boolean  // true = granted override, false = explicitly revoked/blocked

  @@unique([userId, permissionName])
}

// ==========================================
// PROFILE MODULE
// ==========================================

model ProfileCustomer {
  id          String   @id @default(uuid())
  userId      String   @unique
  user        AuthUser @relation(fields: [userId], references: [id], onDelete: Cascade)
  fullName    String
  companyName String?
  isVerified  Boolean  @default(false)
  city        String?
  country     String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model ProfileCreator {
  id             String                 @id @default(uuid())
  userId         String                 @unique
  user           AuthUser               @relation(fields: [userId], references: [id], onDelete: Cascade)
  displayName    String
  bio            String?
  skills         String[]
  avatarUrl      String?
  isApproved     Boolean                @default(false)
  city           String?
  country        String?
  services       ProfileCreatorService[]
  availabilities ProfileAvailability[]
  createdAt      DateTime               @default(now())
  updatedAt      DateTime               @updatedAt
}

model ProfileCreatorService {
  id          String   @id @default(uuid())
  creatorId   String
  creator     ProfileCreator @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  title       String
  description String
  price       Float
  deliveryDays Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model ProfileAvailability {
  id          String   @id @default(uuid())
  creatorId   String
  creator     ProfileCreator @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  date        DateTime
  isAvailable Boolean  @default(true)
}

// ==========================================
// CATALOG & REQUIREMENT MODULE
// ==========================================

model CatalogRequirement {
  id          String   @id @default(uuid())
  customerId  String
  customer    AuthUser @relation(fields: [customerId], references: [id], onDelete: Cascade)
  title       String
  description String
  budget      Float
  category    String
  tags        String[]
  city        String?
  country     String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  proposals   EngagementProposal[]
  engagements Engagement[]
}

// ==========================================
// ENGAGEMENT MODULE (Proposals, Hires, Disputes)
// ==========================================

enum ProposalStatus {
  PENDING
  ACCEPTED
  REJECTED
}

model EngagementProposal {
  id            String             @id @default(uuid())
  requirementId String
  requirement   CatalogRequirement @relation(fields: [requirementId], references: [id], onDelete: Cascade)
  creatorId     String
  creator       AuthUser           @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  coverLetter   String
  bidAmount     Float
  deliveryDays  Int
  status        ProposalStatus     @default(PENDING)
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt
}

enum EngagementStatus {
  ESCROW_HOLD
  DELIVERED
  COMPLETED
  DISPUTED
  REFUNDED
}

model Engagement {
  id            String             @id @default(uuid())
  requirementId String
  requirement   CatalogRequirement @relation(fields: [requirementId], references: [id], onDelete: Cascade)
  creatorId     String
  customerId    String
  amount        Float
  status        EngagementStatus   @default(ESCROW_HOLD)
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt

  disputes      EngagementDispute[]
  chatRooms     ChatRoom[]
}

enum DisputeStatus {
  OPEN
  RESOLVED_REFUNDED
  RESOLVED_RELEASED
}

model EngagementDispute {
  id           String        @id @default(uuid())
  engagementId String
  engagement   Engagement    @relation(fields: [engagementId], references: [id], onDelete: Cascade)
  initiatorId  String
  initiator    AuthUser      @relation(fields: [initiatorId], references: [id], onDelete: Cascade)
  reason       String
  status       DisputeStatus @default(OPEN)
  resolutionNotes String?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
}

// ==========================================
// CHAT MODULE (HTTP Database Poll)
// ==========================================

model ChatRoom {
  id           String     @id @default(uuid())
  engagementId String
  engagement   Engagement @relation(fields: [engagementId], references: [id], onDelete: Cascade)
  createdAt    DateTime   @default(now())
  
  messages     ChatMessage[]
}

model ChatMessage {
  id         String   @id @default(uuid())
  roomId     String
  room       ChatRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
  senderId   String
  sender     AuthUser @relation(fields: [senderId], references: [id], onDelete: Cascade)
  content    String
  createdAt  DateTime @default(now())
}

// ==========================================
// PAYMENT MODULE
// ==========================================

enum TransactionType {
  DEPOSIT
  ESCROW_HOLD
  RELEASE
  REFUND
}

model PaymentTransactionLedger {
  id          String          @id @default(uuid())
  userId      String
  user        AuthUser        @relation(fields: [userId], references: [id], onDelete: Cascade)
  amount      Float
  type        TransactionType
  description String
  createdAt   DateTime        @default(now())
}

// ==========================================
// REVIEW MODULE
// ==========================================

model Review {
  id         String   @id @default(uuid())
  authorId   String
  author     AuthUser @relation("ReviewAuthor", fields: [authorId], references: [id], onDelete: Cascade)
  targetId   String
  target     AuthUser @relation("ReviewTarget", fields: [targetId], references: [id], onDelete: Cascade)
  rating     Int      // 1 to 5
  comment    String
  createdAt  DateTime @default(now())
}
```

---

## 3. Implementation Steps

### Step 1: Audit Logger Implementation
Implement the file audit logger in `/backend/src/common/utils/auditLogger.ts`.
- It must log all registrations and logins to `/backend/logs/login_attempts.json`.
- It must log all state-changing operations (POST, PUT, DELETE) to `/backend/logs/api_calls.json`.

### Step 2: Auth and Custom Dynamic RBAC
- Implement route guards: `requirePermission(permissionName: string)` and `requireRole(role: string)`.
- Allow the user's role to resolve permissions from the `AuthRolePermission` table.
- Prioritize rules inside `AuthUserPermissionOverride` (e.g. if a manager explicitly revokes user's chat permission, deny user).

### Step 3: Location Resolution
- When registering, detect request IP. Call a free location resolver (e.g. `ipapi.co`) to extract the user's city and country and save it to the customer/creator profile.

### Step 4: Swagger Documentation
- Configure `swagger-jsdoc` and `swagger-ui-express` inside `app.ts` serving at `/api-docs`.
- Standardize REST response templates for errors (e.g., status 400, 403, 404, 500).

### Step 5: Chat Controller and Anti-leak Interceptor
- Save messages directly to PostgreSQL (`ChatMessage`).
- Run content checks inside `chat.service.ts` using regular expressions to filter out email addresses and phone numbers.
- Provide a GET `/api/chat/:roomId?lastMessageId=...` polling endpoint to support fetching recent messages on the frontend.
