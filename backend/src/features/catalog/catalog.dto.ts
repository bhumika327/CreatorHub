import { z } from 'zod';

export const PostRequirementSchema = z.object({
  title: z.string().min(5, 'Requirement title must be at least 5 characters'),
  description: z.string().min(15, 'Requirement description must be at least 15 characters'),
  budget: z.number().positive('Budget must be a positive number'),
  category: z.string().min(1, 'Category is required'),
  tags: z.array(z.string()).default([])
});

export const BrowseQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  skills: z.preprocess((val) => {
    if (typeof val === 'string') return val.split(',');
    return val;
  }, z.array(z.string()).optional()),
  city: z.string().optional(),
  country: z.string().optional(),
  minPrice: z.preprocess((val) => (val ? parseFloat(val as string) : undefined), z.number().optional()),
  maxPrice: z.preprocess((val) => (val ? parseFloat(val as string) : undefined), z.number().optional()),
  page: z.preprocess((val) => (val ? parseInt(val as string, 10) : undefined), z.number().positive().optional()),
  limit: z.preprocess((val) => (val ? parseInt(val as string, 10) : undefined), z.number().positive().optional())
});

export type PostRequirementInput = z.infer<typeof PostRequirementSchema>;
export type BrowseQueryInput = z.infer<typeof BrowseQuerySchema>;
