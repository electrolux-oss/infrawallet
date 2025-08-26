import { z } from 'zod';

// Enums
export const GranularityEnum = z.enum(['DAILY', 'MONTHLY', 'HOURLY']);
export const DimensionEnum = z.enum([
  'AZ',
  'INSTANCE_TYPE',
  'LINKED_ACCOUNT',
  'OPERATION',
  'PURCHASE_TYPE',
  'REGION',
  'SERVICE',
  'USAGE_TYPE',
  'USAGE_TYPE_GROUP',
  'RECORD_TYPE',
  'OPERATING_SYSTEM',
  'TENANCY',
  'SCOPE',
  'PLATFORM',
  'SUBSCRIPTION_ID',
  'LEGAL_ENTITY_NAME',
  'DEPLOYMENT_OPTION',
  'DATABASE_ENGINE',
  'CACHE_ENGINE',
  'INSTANCE_TYPE_FAMILY',
  'BILLING_ENTITY',
  'RESERVATION_ID',
  'RESOURCE_ID',
  'RIGHTSIZING_TYPE',
  'SAVINGS_PLANS_TYPE',
  'SAVINGS_PLAN_ARN',
  'PAYMENT_OPTION',
]);
export const GroupDefinitionTypeEnum = z.enum(['DIMENSION', 'TAG', 'COST_CATEGORY']);

// Basic value schemas
export const MetricValueSchema = z.object({
  Amount: z.string(),
  Unit: z.string(),
});

export const DateIntervalSchema = z.object({
  Start: z.string(),
  End: z.string(),
});

// Dimension and tag schemas
export const DimensionKeySchema = z.object({
  Key: DimensionEnum,
  Values: z.array(z.string()),
  MatchOptions: z.array(z.string()).optional(),
});

export const TagKeySchema = z.object({
  Key: z.string(),
  Values: z.array(z.string()).optional(),
  MatchOptions: z.array(z.string()).optional(),
});

export const GroupDefinitionSchema = z.object({
  Type: GroupDefinitionTypeEnum,
  Key: z.string(),
});

// Expression schemas for filters
export const ExpressionSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    Or: z.array(ExpressionSchema).optional(),
    And: z.array(ExpressionSchema).optional(),
    Not: ExpressionSchema.optional(),
    Dimensions: DimensionKeySchema.optional(),
    Tags: TagKeySchema.optional(),
    CostCategories: z
      .object({
        Key: z.string(),
        Values: z.array(z.string()).optional(),
        MatchOptions: z.array(z.string()).optional(),
      })
      .optional(),
  }),
);

// Group and result schemas
export const GroupSchema = z.object({
  Keys: z.array(z.string()).optional(),
  Metrics: z.record(z.string(), MetricValueSchema).optional(),
});

export const ResultByTimeSchema = z.object({
  TimePeriod: DateIntervalSchema.optional(),
  Total: z.record(z.string(), MetricValueSchema).optional(),
  Groups: z.array(GroupSchema).optional(),
  Estimated: z.boolean().optional(),
});

export const DimensionValueAttributesSchema = z.object({
  Value: z.string().optional(),
  Attributes: z.record(z.string(), z.string()).optional(),
});

// Request schemas
export const GetCostAndUsageRequestSchema = z.object({
  TimePeriod: DateIntervalSchema,
  Granularity: GranularityEnum,
  Filter: ExpressionSchema.optional(),
  Metrics: z.array(z.string()),
  GroupBy: z.array(GroupDefinitionSchema).optional(),
  NextPageToken: z.string().optional(),
});

export const GetTagsRequestSchema = z.object({
  TimePeriod: DateIntervalSchema,
  TagKey: z.string().optional(),
  Filter: ExpressionSchema.optional(),
  SortBy: z
    .array(
      z.object({
        Key: z.string(),
        SortOrder: z.enum(['ASCENDING', 'DESCENDING']).optional(),
      }),
    )
    .optional(),
  MaxResults: z.number().int().min(1).max(1000).optional(),
  NextPageToken: z.string().optional(),
});

// Response schemas
export const GetCostAndUsageResponseSchema = z.object({
  NextPageToken: z.string().optional(),
  GroupDefinitions: z.array(GroupDefinitionSchema).optional(),
  ResultsByTime: z.array(ResultByTimeSchema).optional(),
  DimensionValueAttributes: z.array(DimensionValueAttributesSchema).optional(),
});

export const GetTagsResponseSchema = z.object({
  Tags: z.array(z.string()),
  ReturnSize: z.number().int(),
  TotalSize: z.number().int(),
  NextPageToken: z.string().optional(),
});

// Assume Role schemas (for STS integration)
export const AssumeRoleRequestSchema = z.object({
  RoleArn: z.string(),
  RoleSessionName: z.string(),
  Policy: z.string().optional(),
  DurationSeconds: z.number().int().min(900).max(43200).optional(),
  ExternalId: z.string().optional(),
  SerialNumber: z.string().optional(),
  TokenCode: z.string().optional(),
});

export const CredentialsSchema = z.object({
  AccessKeyId: z.string().optional(),
  SecretAccessKey: z.string().optional(),
  SessionToken: z.string().optional(),
  Expiration: z.date().optional(),
});

export const AssumeRoleResponseSchema = z.object({
  Credentials: CredentialsSchema.optional(),
  AssumedRoleUser: z
    .object({
      AssumedRoleId: z.string().optional(),
      Arn: z.string().optional(),
    })
    .optional(),
  PackedPolicySize: z.number().int().optional(),
  SourceIdentity: z.string().optional(),
});

// Internal transformation schemas (for the transformed data used by InfraWallet)
export const CostQuerySchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  granularity: z.string(),
  tags: z.string().optional(),
});

export const TagsQuerySchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
});

export const ReportSchema = z.object({
  id: z.string(),
  account: z.string(),
  service: z.string(),
  category: z.string(),
  provider: z.string(),
  providerType: z.string(),
  reports: z.record(z.string(), z.number()),
});

// Error schemas
export const AWSErrorSchema = z.object({
  name: z.string(),
  message: z.string(),
  Code: z.string().optional(),
  RequestId: z.string().optional(),
});

// Types derived from the schemas
export type Granularity = z.infer<typeof GranularityEnum>;
export type Dimension = z.infer<typeof DimensionEnum>;
export type GroupDefinitionType = z.infer<typeof GroupDefinitionTypeEnum>;
export type MetricValue = z.infer<typeof MetricValueSchema>;
export type DateInterval = z.infer<typeof DateIntervalSchema>;
export type DimensionKey = z.infer<typeof DimensionKeySchema>;
export type TagKey = z.infer<typeof TagKeySchema>;
export type GroupDefinition = z.infer<typeof GroupDefinitionSchema>;
export type Expression = z.infer<typeof ExpressionSchema>;
export type Group = z.infer<typeof GroupSchema>;
export type ResultByTime = z.infer<typeof ResultByTimeSchema>;
export type DimensionValueAttributes = z.infer<typeof DimensionValueAttributesSchema>;
export type GetCostAndUsageRequest = z.infer<typeof GetCostAndUsageRequestSchema>;
export type GetTagsRequest = z.infer<typeof GetTagsRequestSchema>;
export type GetCostAndUsageResponse = z.infer<typeof GetCostAndUsageResponseSchema>;
export type GetTagsResponse = z.infer<typeof GetTagsResponseSchema>;
export type AssumeRoleRequest = z.infer<typeof AssumeRoleRequestSchema>;
export type Credentials = z.infer<typeof CredentialsSchema>;
export type AssumeRoleResponse = z.infer<typeof AssumeRoleResponseSchema>;
export type CostQuery = z.infer<typeof CostQuerySchema>;
export type TagsQuery = z.infer<typeof TagsQuerySchema>;
export type Report = z.infer<typeof ReportSchema>;
export type AWSError = z.infer<typeof AWSErrorSchema>;
