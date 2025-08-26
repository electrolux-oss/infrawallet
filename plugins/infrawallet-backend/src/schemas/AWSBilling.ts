import { z } from 'zod';

export const AWSGranularitySchema = z.enum(['DAILY', 'MONTHLY', 'HOURLY']);

export const AWSDimensionValueSchema = z.object({
  Value: z.string().optional(),
  Attributes: z.record(z.string()).optional(),
  MatchOptions: z.array(z.string()).optional(),
});

export const AWSDimensionValueAttributesSchema = z.object({
  Value: z.string().optional(),
  Attributes: z.record(z.string()).optional(),
});

export const AWSMetricValueSchema = z.object({
  Amount: z.string().optional(),
  Unit: z.string().optional(),
});

export const AWSGroupSchema = z.object({
  Keys: z.array(z.string()).optional(),
  Metrics: z.record(AWSMetricValueSchema).optional(),
});

export const AWSResultByTimeSchema = z.object({
  TimePeriod: z
    .object({
      Start: z.string().optional(),
      End: z.string().optional(),
    })
    .optional(),
  Total: z.record(AWSMetricValueSchema).optional(),
  Groups: z.array(AWSGroupSchema).optional(),
  Estimated: z.boolean().optional(),
});

export const AWSGetCostAndUsageResponseSchema = z.object({
  NextPageToken: z.string().optional(),
  GroupDefinitions: z
    .array(
      z.object({
        Type: z.string().optional(),
        Key: z.string().optional(),
      }),
    )
    .optional(),
  ResultsByTime: z.array(AWSResultByTimeSchema).optional(),
  DimensionValueAttributes: z.array(AWSDimensionValueAttributesSchema).optional(),
});

export const AWSGetTagsResponseSchema = z.object({
  NextPageToken: z.string().optional(),
  Tags: z.array(z.string()).optional(),
  ReturnSize: z.number().optional(),
  TotalSize: z.number().optional(),
});

export const AWSExpressionSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    Or: z.array(AWSExpressionSchema).optional(),
    And: z.array(AWSExpressionSchema).optional(),
    Not: AWSExpressionSchema.optional(),
    Dimensions: z
      .object({
        Key: z.string().optional(),
        Values: z.array(z.string()).optional(),
        MatchOptions: z.array(z.string()).optional(),
      })
      .optional(),
    Tags: z
      .object({
        Key: z.string().optional(),
        Values: z.array(z.string()).optional(),
        MatchOptions: z.array(z.string()).optional(),
      })
      .optional(),
    CostCategories: z
      .object({
        Key: z.string().optional(),
        Values: z.array(z.string()).optional(),
        MatchOptions: z.array(z.string()).optional(),
      })
      .optional(),
  }),
);

export const AWSGetCostAndUsageRequestSchema = z.object({
  TimePeriod: z.object({
    Start: z.string(),
    End: z.string(),
  }),
  Granularity: AWSGranularitySchema,
  Metrics: z.array(z.string()),
  GroupBy: z
    .array(
      z.object({
        Type: z.string(),
        Key: z.string(),
      }),
    )
    .optional(),
  Filter: AWSExpressionSchema.optional(),
  NextPageToken: z.string().optional(),
});

export const AWSGetTagsRequestSchema = z.object({
  TimePeriod: z.object({
    Start: z.string(),
    End: z.string(),
  }),
  TagKey: z.string().optional(),
  Filter: AWSExpressionSchema.optional(),
  SortBy: z
    .array(
      z.object({
        Key: z.string(),
        SortOrder: z.enum(['ASCENDING', 'DESCENDING']).optional(),
      }),
    )
    .optional(),
  MaxResults: z.number().optional(),
  NextPageToken: z.string().optional(),
});

export const AWSBillingErrorSchema = z.object({
  name: z.string(),
  message: z.string(),
  $fault: z.string().optional(),
  $metadata: z
    .object({
      httpStatusCode: z.number().optional(),
      requestId: z.string().optional(),
      cfId: z.string().optional(),
    })
    .optional(),
});

export type AWSGranularity = z.infer<typeof AWSGranularitySchema>;
export type AWSDimensionValue = z.infer<typeof AWSDimensionValueSchema>;
export type AWSDimensionValueAttributes = z.infer<typeof AWSDimensionValueAttributesSchema>;
export type AWSMetricValue = z.infer<typeof AWSMetricValueSchema>;
export type AWSGroup = z.infer<typeof AWSGroupSchema>;
export type AWSResultByTime = z.infer<typeof AWSResultByTimeSchema>;
export type AWSGetCostAndUsageResponse = z.infer<typeof AWSGetCostAndUsageResponseSchema>;
export type AWSGetTagsResponse = z.infer<typeof AWSGetTagsResponseSchema>;
export type AWSExpression = z.infer<typeof AWSExpressionSchema>;
export type AWSGetCostAndUsageRequest = z.infer<typeof AWSGetCostAndUsageRequestSchema>;
export type AWSGetTagsRequest = z.infer<typeof AWSGetTagsRequestSchema>;
export type AWSBillingError = z.infer<typeof AWSBillingErrorSchema>;
