import { prisma } from '../../prisma/client';
import { PostRequirementInput, BrowseQueryInput } from './catalog.dto';
import { LocationService } from '../location/location.service';

export class CatalogService {
  public static async postRequirement(customerId: string, data: PostRequirementInput, ip: string) {
    const location = await LocationService.resolveLocation(ip);

    return prisma.catalogRequirement.create({
      data: {
        customerId,
        title: data.title,
        description: data.description,
        budget: data.budget,
        category: data.category,
        tags: data.tags,
        city: location.city,
        country: location.country
      }
    });
  }

  public static async getRequirements(filters: BrowseQueryInput) {
    const whereClause: any = {};

    if (filters.category) {
      whereClause.category = {
        equals: filters.category,
        mode: 'insensitive'
      };
    }

    if (filters.city) {
      whereClause.city = {
        equals: filters.city,
        mode: 'insensitive'
      };
    }

    if (filters.country) {
      whereClause.country = {
        equals: filters.country,
        mode: 'insensitive'
      };
    }

    if (filters.search) {
      whereClause.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      whereClause.budget = {};
      if (filters.minPrice !== undefined) {
        whereClause.budget.gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        whereClause.budget.lte = filters.maxPrice;
      }
    }

    return prisma.catalogRequirement.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            customerProfile: true
          }
        }
      }
    });
  }

  public static async getCreators(filters: BrowseQueryInput) {
    const whereClause: any = {
      isApproved: true // Only return approved creators
    };

    if (filters.city) {
      whereClause.city = {
        equals: filters.city,
        mode: 'insensitive'
      };
    }

    if (filters.country) {
      whereClause.country = {
        equals: filters.country,
        mode: 'insensitive'
      };
    }

    if (filters.search) {
      whereClause.OR = [
        { displayName: { contains: filters.search, mode: 'insensitive' } },
        { bio: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    if (filters.skills && filters.skills.length > 0) {
      whereClause.skills = {
        hasSome: filters.skills
      };
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      whereClause.services = {
        some: {
          price: {
            gte: filters.minPrice !== undefined ? filters.minPrice : undefined,
            lte: filters.maxPrice !== undefined ? filters.maxPrice : undefined
          }
        }
      };
    }

    return prisma.profileCreator.findMany({
      where: whereClause,
      include: {
        services: true,
        user: {
          select: {
            id: true,
            email: true,
            reviewsReceived: {
              select: {
                rating: true
              }
            }
          }
        }
      }
    });
  }
}
