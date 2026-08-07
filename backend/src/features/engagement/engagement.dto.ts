import { z } from 'zod';

export const SubmitProposalSchema = z.object({
  coverLetter: z.string().min(10, 'Cover letter must be at least 10 characters'),
  bidAmount: z.number().positive('Bid amount must be a positive number'),
  deliveryDays: z.number().int().positive('Delivery days must be a positive integer')
});

export const CreateDisputeSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters')
});

export type SubmitProposalInput = z.infer<typeof SubmitProposalSchema>;
export type CreateDisputeInput = z.infer<typeof CreateDisputeSchema>;
