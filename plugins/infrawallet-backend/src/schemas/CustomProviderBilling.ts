import { z } from 'zod';

// Custom cost amortization mode enum
export const CustomCostAmortizationModeSchema = z.enum(['lump_sum', 'average']);

// Custom cost database record schema
export const CustomCostRecordSchema = z.object({
  id: z.string().optional(),
  provider: z.string(),
  account: z.string(),
  service: z.string(),
  category: z.string(),
  cost: z.string().or(z.number()),
  usage_month: z.number(),
  amortization_mode: CustomCostAmortizationModeSchema.optional(),
  tags: z.string().or(z.record(z.string())).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

// Custom cost API input schema (for creating/updating custom costs)
export const CustomCostInputSchema = z.object({
  provider: z.string().min(1),
  account: z.string().min(1),
  service: z.string().min(1),
  category: z.string().min(1),
  cost: z.number().min(0),
  usage_month: z.number().int().min(202001).max(209912), // YYYYMM format
  amortization_mode: CustomCostAmortizationModeSchema.default('lump_sum'),
  tags: z.record(z.string()).optional().default({}),
});

// Custom cost query schema
export const CustomCostQuerySchema = z.object({
  provider: z.string().optional(),
  account: z.string().optional(),
  service: z.string().optional(),
  category: z.string().optional(),
  start_date: z.string().or(z.date()),
  end_date: z.string().or(z.date()),
  tags: z.record(z.string()).optional(),
});

// Custom cost bulk upload schema
export const CustomCostBulkUploadSchema = z.object({
  costs: z.array(CustomCostInputSchema).min(1).max(1000),
});

// Custom cost response schema
export const CustomCostResponseSchema = z.object({
  data: z.array(CustomCostRecordSchema),
  total: z.number(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
});

// Error response schema
export const CustomProviderErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  details: z.record(z.any()).optional(),
  timestamp: z.string().optional(),
});

// Types derived from schemas
export type CustomCostAmortizationMode = z.infer<typeof CustomCostAmortizationModeSchema>;
export type CustomCostRecord = z.infer<typeof CustomCostRecordSchema>;
export type CustomCostInput = z.infer<typeof CustomCostInputSchema>;
export type CustomCostQuery = z.infer<typeof CustomCostQuerySchema>;
export type CustomCostBulkUpload = z.infer<typeof CustomCostBulkUploadSchema>;
export type CustomCostResponse = z.infer<typeof CustomCostResponseSchema>;
export type CustomProviderError = z.infer<typeof CustomProviderErrorSchema>;
