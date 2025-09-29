import { z } from 'zod';

export const GCPBillingRowSchema = z.object({
  service: z
    .union([
      z.object({
        id: z.string(),
        description: z.string(),
      }),
      z.string(),
    ])
    .optional(),
  sku: z
    .union([
      z.object({
        id: z.string(),
        description: z.string(),
      }),
      z.string(),
    ])
    .optional(),
  usage_start_time: z.string().optional(),
  usage_end_time: z.string().optional(),
  project: z
    .union([
      z.object({
        id: z.string(),
        name: z.string().optional(),
        labels: z.record(z.string()).optional(),
      }),
      z.string(),
    ])
    .optional(),
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
  cost: z.number().optional(),
  currency: z.string().optional(),
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
  invoice: z
    .object({
      month: z.string(),
    })
    .optional(),
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

// Schema for custom GCP query results (simplified structure)
export const GCPCustomQueryRowSchema = z.object({
  project: z.string(),
  service: z.string(),
  period: z.string(),
  total_cost: z.union([
    z.number(),
    z.object({}).transform((obj: any) => {
      // Handle BigQuery numeric objects by converting to number
      if (typeof obj === 'object' && obj !== null) {
        // BigQuery sometimes returns numbers as objects with a value property or string representation
        if (typeof obj.value === 'number') return obj.value;
        if (typeof obj.value === 'string') return parseFloat(obj.value);
        if (typeof obj === 'string') return parseFloat(obj);
        // Try to convert the object to string then number as fallback
        const stringValue = String(obj);
        const numValue = parseFloat(stringValue);
        return isNaN(numValue) ? 0 : numValue;
      }
      return 0;
    }),
  ]),
});

export const GCPBillingQueryResultSchema = z.array(GCPBillingRowSchema);
export const GCPCustomQueryResultSchema = z.array(GCPCustomQueryRowSchema);

export type GCPBillingRow = z.infer<typeof GCPBillingRowSchema>;
export type GCPCustomQueryRow = z.infer<typeof GCPCustomQueryRowSchema>;
export type GCPBillingQueryResult = z.infer<typeof GCPBillingQueryResultSchema>;
export type GCPCustomQueryResult = z.infer<typeof GCPCustomQueryResultSchema>;
