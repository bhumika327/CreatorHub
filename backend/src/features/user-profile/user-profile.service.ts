import { prisma } from '../../prisma/client';
import {
  UpdateCustomerProfileInput,
  UpdateCreatorProfileInput,
  CreateServiceInput,
  CreateAvailabilityInput
} from './user-profile.dto';

export class UserProfileService {
  public static async getCustomerProfile(userId: string) {
    const profile = await prisma.profileCustomer.findUnique({
      where: { userId }
    });
    if (!profile) {
      throw { status: 404, message: 'Customer profile not found' };
    }
    return profile;
  }

  public static async getCreatorProfile(userId: string) {
    const profile = await prisma.profileCreator.findUnique({
      where: { userId },
      include: {
        services: true,
        availabilities: true
      }
    });
    if (!profile) {
      throw { status: 404, message: 'Creator profile not found' };
    }
    return profile;
  }

  public static async updateCustomerProfile(userId: string, data: UpdateCustomerProfileInput) {
    const profile = await prisma.profileCustomer.findUnique({
      where: { userId }
    });

    if (!profile) {
      throw { status: 404, message: 'Customer profile not found' };
    }

    return prisma.profileCustomer.update({
      where: { userId },
      data: {
        fullName: data.fullName,
        companyName: data.companyName,
        city: data.city,
        country: data.country
      }
    });
  }

  public static async updateCreatorProfile(userId: string, data: UpdateCreatorProfileInput) {
    const profile = await prisma.profileCreator.findUnique({
      where: { userId }
    });

    if (!profile) {
      throw { status: 404, message: 'Creator profile not found' };
    }

    return prisma.profileCreator.update({
      where: { userId },
      data: {
        displayName: data.displayName,
        bio: data.bio,
        skills: data.skills,
        avatarUrl: data.avatarUrl,
        city: data.city,
        country: data.country
      }
    });
  }

  public static async addCreatorService(userId: string, data: CreateServiceInput) {
    const creatorProfile = await prisma.profileCreator.findUnique({
      where: { userId }
    });

    if (!creatorProfile) {
      throw { status: 404, message: 'Creator profile not found' };
    }

    return prisma.profileCreatorService.create({
      data: {
        creatorId: creatorProfile.id,
        title: data.title,
        description: data.description,
        price: data.price,
        deliveryDays: data.deliveryDays
      }
    });
  }

  public static async deleteCreatorService(userId: string, serviceId: string) {
    const creatorProfile = await prisma.profileCreator.findUnique({
      where: { userId }
    });

    if (!creatorProfile) {
      throw { status: 404, message: 'Creator profile not found' };
    }

    const service = await prisma.profileCreatorService.findUnique({
      where: { id: serviceId }
    });

    if (!service || service.creatorId !== creatorProfile.id) {
      throw { status: 404, message: 'Service not found or unauthorized' };
    }

    await prisma.profileCreatorService.delete({
      where: { id: serviceId }
    });
  }

  public static async setCreatorAvailability(userId: string, data: CreateAvailabilityInput[]) {
    const creatorProfile = await prisma.profileCreator.findUnique({
      where: { userId }
    });

    if (!creatorProfile) {
      throw { status: 404, message: 'Creator profile not found' };
    }

    // Delete existing availabilities
    await prisma.profileAvailability.deleteMany({
      where: { creatorId: creatorProfile.id }
    });

    // Create new ones
    if (data.length > 0) {
      const records = data.map((item) => ({
        creatorId: creatorProfile.id,
        date: new Date(item.date),
        isAvailable: item.isAvailable
      }));

      await prisma.profileAvailability.createMany({
        data: records
      });
    }

    return prisma.profileAvailability.findMany({
      where: { creatorId: creatorProfile.id }
    });
  }

  public static async submitBusinessVerification(
    userId: string,
    data: { companyName: string; registrationNum: string; documents: any }
  ) {
    const customerProfile = await prisma.profileCustomer.findUnique({
      where: { userId }
    });
    if (!customerProfile) {
      throw { status: 404, message: 'Customer profile not found' };
    }

    return prisma.businessVerification.upsert({
      where: { customerId: customerProfile.id },
      create: {
        customerId: customerProfile.id,
        companyName: data.companyName,
        registrationNum: data.registrationNum,
        documents: data.documents,
        status: 'PENDING'
      },
      update: {
        companyName: data.companyName,
        registrationNum: data.registrationNum,
        documents: data.documents,
        status: 'PENDING',
        rejectionReason: null,
        reviewedAt: null,
        reviewedBy: null
      }
    });
  }

  public static async getBusinessVerification(userId: string) {
    const customerProfile = await prisma.profileCustomer.findUnique({
      where: { userId }
    });
    if (!customerProfile) {
      throw { status: 404, message: 'Customer profile not found' };
    }

    return prisma.businessVerification.findUnique({
      where: { customerId: customerProfile.id }
    });
  }

  public static async addBookmark(userId: string, creatorId: string) {
    const creatorProfile = await prisma.profileCreator.findUnique({
      where: { id: creatorId }
    });
    if (!creatorProfile) {
      throw { status: 404, message: 'Creator profile not found' };
    }

    return prisma.creatorBookmark.upsert({
      where: {
        customerId_creatorId: {
          customerId: userId,
          creatorId
        }
      },
      create: {
        customerId: userId,
        creatorId
      },
      update: {}
    });
  }

  public static async deleteBookmark(userId: string, creatorId: string) {
    const bookmark = await prisma.creatorBookmark.findUnique({
      where: {
        customerId_creatorId: {
          customerId: userId,
          creatorId
        }
      }
    });

    if (!bookmark) {
      throw { status: 404, message: 'Bookmark not found' };
    }

    await prisma.creatorBookmark.delete({
      where: {
        customerId_creatorId: {
          customerId: userId,
          creatorId
        }
      }
    });
  }

  public static async getBookmarks(userId: string) {
    return prisma.creatorBookmark.findMany({
      where: { customerId: userId },
      include: {
        creator: {
          include: {
            user: {
              select: {
                id: true,
                email: true
              }
            }
          }
        }
      }
    });
  }

  public static async addPortfolioItem(userId: string, data: any) {
    const creatorProfile = await prisma.profileCreator.findUnique({
      where: { userId }
    });
    if (!creatorProfile) {
      throw { status: 404, message: 'Creator profile not found' };
    }

    return prisma.creatorPortfolioItem.create({
      data: {
        creatorId: creatorProfile.id,
        title: data.title,
        description: data.description,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        thumbnailUrl: data.thumbnailUrl,
        projectUrl: data.projectUrl,
        skills: data.skills || [],
        order: data.order ?? 0
      }
    });
  }

  public static async updatePortfolioItem(userId: string, itemId: string, data: any) {
    const creatorProfile = await prisma.profileCreator.findUnique({
      where: { userId }
    });
    if (!creatorProfile) {
      throw { status: 404, message: 'Creator profile not found' };
    }

    const item = await prisma.creatorPortfolioItem.findUnique({
      where: { id: itemId }
    });

    if (!item || item.creatorId !== creatorProfile.id) {
      throw { status: 404, message: 'Portfolio item not found or unauthorized' };
    }

    return prisma.creatorPortfolioItem.update({
      where: { id: itemId },
      data: {
        title: data.title,
        description: data.description,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        thumbnailUrl: data.thumbnailUrl,
        projectUrl: data.projectUrl,
        skills: data.skills,
        order: data.order
      }
    });
  }

  public static async deletePortfolioItem(userId: string, itemId: string) {
    const creatorProfile = await prisma.profileCreator.findUnique({
      where: { userId }
    });
    if (!creatorProfile) {
      throw { status: 404, message: 'Creator profile not found' };
    }

    const item = await prisma.creatorPortfolioItem.findUnique({
      where: { id: itemId }
    });

    if (!item || item.creatorId !== creatorProfile.id) {
      throw { status: 404, message: 'Portfolio item not found or unauthorized' };
    }

    await prisma.creatorPortfolioItem.delete({
      where: { id: itemId }
    });
  }

  public static async getPortfolioItems(userId: string) {
    const creatorProfile = await prisma.profileCreator.findUnique({
      where: { userId }
    });
    if (!creatorProfile) {
      throw { status: 404, message: 'Creator profile not found' };
    }

    return prisma.creatorPortfolioItem.findMany({
      where: { creatorId: creatorProfile.id },
      orderBy: { order: 'asc' }
    });
  }

  public static async setServicePackages(userId: string, serviceId: string, packages: any[]) {
    const creatorProfile = await prisma.profileCreator.findUnique({
      where: { userId }
    });
    if (!creatorProfile) {
      throw { status: 404, message: 'Creator profile not found' };
    }

    const service = await prisma.profileCreatorService.findUnique({
      where: { id: serviceId }
    });

    if (!service || service.creatorId !== creatorProfile.id) {
      throw { status: 404, message: 'Service not found or unauthorized' };
    }

    await prisma.creatorServicePackage.deleteMany({
      where: { serviceId }
    });

    const records = packages.map((pkg) => ({
      serviceId,
      type: pkg.type,
      name: pkg.name,
      description: pkg.description,
      price: pkg.price,
      deliveryDays: pkg.deliveryDays,
      revisions: pkg.revisions ?? 3,
      features: pkg.features || [],
      addons: pkg.addons || {}
    }));

    await prisma.creatorServicePackage.createMany({
      data: records
    });

    return prisma.creatorServicePackage.findMany({
      where: { serviceId }
    });
  }

  public static async getServicePackages(serviceId: string) {
    return prisma.creatorServicePackage.findMany({
      where: { serviceId }
    });
  }
}
