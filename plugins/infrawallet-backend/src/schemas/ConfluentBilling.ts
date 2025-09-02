import { z } from 'zod';

export const ConfluentEnvironmentSchema = z.object({
  id: z.string(),
  display_name: z.string(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const ConfluentUsageRecordSchema = z.object({
  api_version: z.string().optional(),
  kind: z.string().optional(),
  id: z.string().optional(),
  resource: z
    .object({
      id: z.string(),
      display_name: z.string().optional(),
      environment: z.object({
        id: z.string(),
      }),
    })
    .optional(),
  amount: z.number().optional(),
  discount_amount: z.number().optional(),
  original_amount: z.number().optional(),
  description: z.string().optional(),
  end_date: z.string().optional(),
  granularity: z.string().optional(),
  line_type: z.string().optional(),
  network_access_type: z.string().optional(),
  price: z.number().optional(),
  product: z.string().optional(),
  quantity: z.number().optional(),
  start_date: z.string().optional(),
  unit: z.string().optional(),
  envDisplayName: z.string().optional(),
  // Keep legacy fields for backward compatibility
  metric: z.string().optional(),
  value: z.number().optional(),
});

export const ConfluentBillingResponseSchema = z.object({
  data: z.array(ConfluentUsageRecordSchema),
  meta: z
    .object({
      first: z.string().optional(),
      last: z.string().optional(),
      prev: z.string().optional(),
      next: z.string().optional(),
      total_size: z.number().optional(),
    })
    .optional(),
});

export const ConfluentBillingRequestSchema = z.object({
  'resource.environment': z.string().optional(),
  'resource.id': z.string().optional(),
  metric: z.string().optional(),
  granularity: z.enum(['DAILY', 'HOURLY']).optional(),
  start_date: z.string(),
  end_date: z.string(),
});

export const ConfluentBillingErrorSchema = z.object({
  error_code: z.string(),
  message: z.string(),
  details: z
    .array(
      z.object({
        '@type': z.string(),
        detail: z.string(),
      }),
    )
    .optional(),
});

export type ConfluentEnvironment = z.infer<typeof ConfluentEnvironmentSchema>;
export type ConfluentUsageRecord = z.infer<typeof ConfluentUsageRecordSchema>;
export type ConfluentBillingResponse = z.infer<typeof ConfluentBillingResponseSchema>;
export type ConfluentBillingRequest = z.infer<typeof ConfluentBillingRequestSchema>;
export type ConfluentBillingError = z.infer<typeof ConfluentBillingErrorSchema>;
