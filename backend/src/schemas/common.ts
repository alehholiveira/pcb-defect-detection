import { z } from 'zod';

// Common pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Common ID parameter schema
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Common date range filter schema
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Common API response wrapper
export const apiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    message: z.string().optional(),
  });

// Error response schema
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type Pagination = z.infer<typeof paginationSchema>;
export type IdParam = z.infer<typeof idParamSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
