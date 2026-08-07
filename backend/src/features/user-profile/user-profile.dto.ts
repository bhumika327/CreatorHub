import { z } from 'zod';

export const UpdateCustomerProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  companyName: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable()
});

export const UpdateCreatorProfileSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters').optional(),
  bio: z.string().optional().nullable(),
  skills: z.array(z.string()).optional(),
  avatarUrl: z.string().url('Invalid avatar URL format').optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable()
});

export const CreateServiceSchema = z.object({
  title: z.string().min(3, 'Service title must be at least 3 characters'),
  description: z.string().min(10, 'Service description must be at least 10 characters'),
  price: z.number().positive('Price must be greater than zero'),
  deliveryDays: z.number().int().positive('Delivery days must be a positive integer')
});

export const CreateAvailabilitySchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format'
  }),
  isAvailable: z.boolean().default(true)
});

export type UpdateCustomerProfileInput = z.infer<typeof UpdateCustomerProfileSchema>;
export type UpdateCreatorProfileInput = z.infer<typeof UpdateCreatorProfileSchema>;
export type CreateServiceInput = z.infer<typeof CreateServiceSchema>;
export type CreateAvailabilityInput = z.infer<typeof CreateAvailabilitySchema>;
