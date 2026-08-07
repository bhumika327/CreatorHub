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
}
