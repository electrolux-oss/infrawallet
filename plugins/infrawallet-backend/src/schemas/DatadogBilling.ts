import { z } from 'zod';

export const DatadogChargeTypeSchema = z.enum(['usage', 'commitment', 'total']);
export const DatadogViewSchema = z.enum(['sub-org', 'parent-org']);

export const DatadogChargeSchema = z.object({
  chargeType: DatadogChargeTypeSchema.optional(),
  productName: z.string().optional(),
  billableUnitName: z.string().optional(),
  unitPrice: z.number().optional(),
  billingUnit: z.string().optional(),
  includedUnitCount: z.number().optional(),
  totalUsage: z.number().optional(),
  totalCost: z.number().optional(),
  cost: z.number().optional(),
});

export const DatadogCostByOrgAttributesSchema = z.object({
  orgName: z.string().optional(),
  publicId: z.string().optional(),
  date: z.string().optional(),
  region: z.string().optional(),
  charges: z.array(DatadogChargeSchema).optional(),
});

export const DatadogCostByOrgSchema = z.object({
  type: z.string().optional(),
  id: z.string().optional(),
  attributes: DatadogCostByOrgAttributesSchema.optional(),
});

export const DatadogCostByOrgResponseSchema = z.object({
  data: z.array(DatadogCostByOrgSchema).optional(),
  meta: z
    .object({
      pagination: z
        .object({
          nextRecordId: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

export const DatadogHistoricalCostRequestSchema = z.object({
  startMonth: z.string().or(z.date()),
  endMonth: z.string().or(z.date()),
  view: DatadogViewSchema.optional(),
  includeConnectedAccounts: z.boolean().optional(),
});

export const DatadogEstimatedCostRequestSchema = z.object({
  startMonth: z.string().or(z.date()),
  endMonth: z.string().or(z.date()),
  view: DatadogViewSchema.optional(),
  includeConnectedAccounts: z.boolean().optional(),
});

export const DatadogBillingErrorSchema = z.object({
  errors: z.array(
    z.object({
      detail: z.string(),
      status: z.string().optional(),
      title: z.string().optional(),
      source: z
        .object({
          pointer: z.string().optional(),
          parameter: z.string().optional(),
        })
        .optional(),
    }),
  ),
});

export type DatadogChargeType = z.infer<typeof DatadogChargeTypeSchema>;
export type DatadogView = z.infer<typeof DatadogViewSchema>;
export type DatadogCharge = z.infer<typeof DatadogChargeSchema>;
export type DatadogCostByOrgAttributes = z.infer<typeof DatadogCostByOrgAttributesSchema>;
export type DatadogCostByOrg = z.infer<typeof DatadogCostByOrgSchema>;
export type DatadogCostByOrgResponse = z.infer<typeof DatadogCostByOrgResponseSchema>;
export type DatadogHistoricalCostRequest = z.infer<typeof DatadogHistoricalCostRequestSchema>;
export type DatadogEstimatedCostRequest = z.infer<typeof DatadogEstimatedCostRequestSchema>;
export type DatadogBillingError = z.infer<typeof DatadogBillingErrorSchema>;
