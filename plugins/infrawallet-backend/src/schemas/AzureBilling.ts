import { z } from 'zod';

export const AzureGranularitySchema = z.enum(['Daily', 'Monthly']);
export const AzureQueryTypeSchema = z.enum(['ActualCost', 'AmortizedCost', 'Usage']);

export const AzureTimeframeSchema = z.enum([
  'MonthToDate',
  'BillingMonthToDate',
  'TheLastMonth',
  'TheLastBillingMonth',
  'WeekToDate',
  'Custom',
]);

export const AzureGroupingTypeSchema = z.enum(['Dimension', 'TagKey']);

export const AzureGroupingSchema = z.object({
  type: AzureGroupingTypeSchema,
  name: z.string(),
});

export const AzureTimePeriodSchema = z.object({
  from: z.string().or(z.date()),
  to: z.string().or(z.date()),
});

export const AzureDatasetSchema = z.object({
  granularity: AzureGranularitySchema,
  aggregation: z
    .record(
      z.object({
        name: z.enum(['PreTaxCost', 'CostUSD', 'UsageQuantity']),
        function: z.enum(['Sum', 'Average']),
      }),
    )
    .optional(),
  grouping: z.array(AzureGroupingSchema).optional(),
  sorting: z
    .array(
      z.object({
        direction: z.enum(['ascending', 'descending']),
        name: z.string(),
      }),
    )
    .optional(),
  filter: z
    .object({
      and: z.array(z.any()).optional(),
      or: z.array(z.any()).optional(),
      not: z.any().optional(),
      dimensions: z
        .object({
          name: z.string(),
          operator: z.enum(['In']),
          values: z.array(z.string()),
        })
        .optional(),
      tags: z
        .object({
          name: z.string(),
          operator: z.enum(['In']),
          values: z.array(z.string()),
        })
        .optional(),
    })
    .optional(),
});

export const AzureQueryDefinitionSchema = z.object({
  type: AzureQueryTypeSchema,
  timeframe: AzureTimeframeSchema,
  timePeriod: AzureTimePeriodSchema.optional(),
  dataset: AzureDatasetSchema,
  includeMonetaryCommitment: z.boolean().optional(),
});

export const AzureColumnInfoSchema = z.object({
  name: z.string(),
  type: z.string(),
});

export const AzureBillingResponsePropertiesSchema = z.object({
  nextLink: z.string().optional(),
  columns: z.array(AzureColumnInfoSchema),
  rows: z.array(z.array(z.any())),
});

export const AzureBillingResponseSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  type: z.string().optional(),
  location: z.string().optional(),
  sku: z.string().optional(),
  eTag: z.string().optional(),
  properties: AzureBillingResponsePropertiesSchema,
});

export const AzureCommonColumnsSchema = z.object({
  PreTaxCost: z.number().optional(),
  ResourceGroup: z.string().optional(),
  Currency: z.string().optional(),
  UsageDate: z.number().optional(),
  ServiceName: z.string().optional(),
  BillingMonth: z.string().optional(),
});

export const AzureBillingErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    target: z.string().optional(),
    details: z
      .array(
        z.object({
          code: z.string(),
          message: z.string(),
          target: z.string().optional(),
        }),
      )
      .optional(),
    innererror: z
      .object({
        code: z.string().optional(),
        message: z.string().optional(),
      })
      .optional(),
  }),
});

export type AzureGranularity = z.infer<typeof AzureGranularitySchema>;
export type AzureQueryType = z.infer<typeof AzureQueryTypeSchema>;
export type AzureTimeframe = z.infer<typeof AzureTimeframeSchema>;
export type AzureGroupingType = z.infer<typeof AzureGroupingTypeSchema>;
export type AzureGrouping = z.infer<typeof AzureGroupingSchema>;
export type AzureTimePeriod = z.infer<typeof AzureTimePeriodSchema>;
export type AzureDataset = z.infer<typeof AzureDatasetSchema>;
export type AzureQueryDefinition = z.infer<typeof AzureQueryDefinitionSchema>;
export type AzureColumnInfo = z.infer<typeof AzureColumnInfoSchema>;
export type AzureBillingResponseProperties = z.infer<typeof AzureBillingResponsePropertiesSchema>;
export type AzureBillingResponse = z.infer<typeof AzureBillingResponseSchema>;
export type AzureCommonColumns = z.infer<typeof AzureCommonColumnsSchema>;
export type AzureBillingError = z.infer<typeof AzureBillingErrorSchema>;
