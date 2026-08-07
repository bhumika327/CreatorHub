import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(['CUSTOMER', 'CREATOR', 'MANAGER'], {
    errorMap: () => ({ message: "Role must be CUSTOMER, CREATOR, or MANAGER" })
  }),
  // Profile info
  fullName: z.string().min(2, "Full name must be at least 2 characters").optional(), // for customer
  companyName: z.string().optional(), // for customer
  displayName: z.string().min(2, "Display name must be at least 2 characters").optional(), // for creator
  bio: z.string().optional(), // for creator
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required")
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshInput = z.infer<typeof RefreshSchema>;
