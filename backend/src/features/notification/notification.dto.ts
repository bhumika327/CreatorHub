import { z } from 'zod';

export const GetNotificationsQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  limit: z.string().optional().transform(val => val ? parseInt(val) : undefined)
});

export type GetNotificationsQuery = z.infer<typeof GetNotificationsQuerySchema>;
