import { z } from 'zod';

// BigQuery response row schema
export const GCPBillingRowSchema = z.object({
  project: z.string(),
  service: z.string(),
  period: z.string(),
  total_cost: z.union([z.number(), z.string()]), // BigQuery can return numbers as strings
});

// BigQuery response array schema
export const GCPBillingResponseSchema = z.array(GCPBillingRowSchema);

// Query parameter schemas
export const GranularityEnum = z.enum(['DAILY', 'MONTHLY']);

export const GCPBillingQueryParamsSchema = z.object({
  projectId: z.string(),
  datasetId: z.string(),
  tableId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  granularity: GranularityEnum,
});

// Types derived from schemas
export type GCPBillingRow = z.infer<typeof GCPBillingRowSchema>;
export type GCPBillingResponse = z.infer<typeof GCPBillingResponseSchema>;
export type GCPBillingQueryParams = z.infer<typeof GCPBillingQueryParamsSchema>;
export type GCPGranularity = z.infer<typeof GranularityEnum>;
