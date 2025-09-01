import { z } from 'zod';

export const GCPBillingRowSchema = z.object({
  service: z.object({
    id: z.string(),
    description: z.string(),
  }),
  sku: z.object({
    id: z.string(),
    description: z.string(),
  }),
  usage_start_time: z.string().optional(),
  usage_end_time: z.string().optional(),
  project: z.object({
    id: z.string(),
    name: z.string().optional(),
    labels: z.record(z.string()).optional(),
  }),
  labels: z.record(z.string()).optional(),
  system_labels: z.record(z.string()).optional(),
  location: z
    .object({
      location: z.string().optional(),
      country: z.string().optional(),
      region: z.string().optional(),
      zone: z.string().optional(),
    })
    .optional(),
  export_time: z.string().optional(),
  cost: z.number(),
  currency: z.string(),
  currency_conversion_rate: z.number().optional(),
  usage: z
    .object({
      amount: z.number().optional(),
      unit: z.string().optional(),
      amount_in_pricing_units: z.number().optional(),
      pricing_unit: z.string().optional(),
    })
    .optional(),
  credits: z
    .array(
      z.object({
        name: z.string(),
        amount: z.number(),
        full_name: z.string().optional(),
        id: z.string().optional(),
        type: z.string().optional(),
      }),
    )
    .optional(),
  invoice: z.object({
    month: z.string(),
  }),
  cost_type: z.string().optional(),
  adjustment_info: z
    .object({
      id: z.string().optional(),
      description: z.string().optional(),
      mode: z.string().optional(),
      type: z.string().optional(),
    })
    .optional(),
});

export const GCPBillingQueryResultSchema = z.array(GCPBillingRowSchema);

export type GCPBillingRow = z.infer<typeof GCPBillingRowSchema>;
export type GCPBillingQueryResult = z.infer<typeof GCPBillingQueryResultSchema>;
