import { z } from 'zod';

export const CreateReviewSchema = z.object({
  targetId: z.string().uuid('Invalid target user ID format'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  comment: z.string().min(5, 'Review comment must be at least 5 characters')
});

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
