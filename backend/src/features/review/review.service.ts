import { prisma } from '../../prisma/client';
import { CreateReviewInput } from './review.dto';

export class ReviewService {
  public static async createReview(authorId: string, data: CreateReviewInput) {
    if (authorId === data.targetId) {
      throw { status: 400, message: 'You cannot write a review for yourself' };
    }

    // Verify they have a completed contract engagement together
    const engagement = await prisma.engagement.findFirst({
      where: {
        status: 'COMPLETED',
        OR: [
          { customerId: authorId, creatorId: data.targetId },
          { customerId: data.targetId, creatorId: authorId }
        ]
      }
    });

    if (!engagement) {
      throw { status: 400, message: 'Legitimate reviews are only permitted after completing an engagement contract' };
    }

    return prisma.review.create({
      data: {
        authorId,
        targetId: data.targetId,
        rating: data.rating,
        comment: data.comment
      }
    });
  }

  public static async getReviews(targetId: string) {
    return prisma.review.findMany({
      where: { targetId },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            customerProfile: true,
            creatorProfile: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
