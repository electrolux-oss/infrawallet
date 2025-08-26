import { z } from 'zod';

export const ConfluentEnvironmentSchema = z.object({
  id: z.string(),
  display_name: z.string(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const ConfluentUsageRecordSchema = z.object({
  id: z.string().optional(),
  resource: z.object({
    id: z.string(),
    display_name: z.string().optional(),
    environment: z.object({
      id: z.string(),
    }),
  }),
  metric: z.string(),
  granularity: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  unit: z.string(),
  value: z.number(),
  price: z.number().optional(),
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
