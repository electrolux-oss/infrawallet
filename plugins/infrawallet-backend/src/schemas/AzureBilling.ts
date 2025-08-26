import { z } from 'zod';

// Enums
export const QueryTypeEnum = z.enum(['Usage', 'ActualCost', 'AmortizedCost']);
export const GranularityEnum = z.enum(['Daily', 'Monthly', 'None']);
export const TimeframeEnum = z.enum(['WeekToDate', 'MonthToDate', 'YearToDate', 'Custom']);
export const GroupingTypeEnum = z.enum(['Tag', 'TagKey', 'Dimension']);
export const AggregationFunctionEnum = z.enum(['Sum', 'Avg']);
export const FilterOperatorEnum = z.enum(['In', 'Contains']);
export const DimensionNameEnum = z.enum([
  'ResourceLocation',
  'ConsumedService',
  'ResourceType',
  'ResourceGroupName',
  'ResourceGuid',
  'SubscriptionId',
  'SubscriptionName',
  'ServiceName',
  'ServiceTier',
  'Meter',
  'MeterCategory',
  'MeterSubCategory',
  'MeterId',
  'ChargeType',
  'PublisherType',
  'ServiceFamily',
  'PricingModel',
  'UnitOfMeasure',
  'BillingAccountId',
  'DepartmentName',
  'EnrollmentAccountName',
  'BillingProfileId',
  'BillingProfileName',
  'InvoiceSectionId',
  'InvoiceSectionName',
  'CostCenter',
  'BillingCurrency',
  'ResourceId',
]);

// Basic value schemas
export const TimePeriodSchema = z.object({
  from: z.date(),
  to: z.date(),
});

export const AggregationSchema = z.object({
  name: z.string(),
  function: AggregationFunctionEnum,
});

export const GroupingSchema = z.object({
  type: GroupingTypeEnum,
  name: z.string(),
});

export const SortingSchema = z.object({
  direction: z.enum(['Ascending', 'Descending']),
  name: z.string(),
});

// Filter schemas
export const TagFilterSchema = z.object({
  name: z.string(),
  operator: FilterOperatorEnum,
  values: z.array(z.string()),
});

export const DimensionFilterSchema = z.object({
  name: DimensionNameEnum,
  operator: FilterOperatorEnum,
  values: z.array(z.string()),
});

export const QueryFilterSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    and: z.array(QueryFilterSchema).optional(),
    or: z.array(QueryFilterSchema).optional(),
    not: QueryFilterSchema.optional(),
    dimensions: DimensionFilterSchema.optional(),
    tags: TagFilterSchema.optional(),
  }),
);

// Dataset schema
export const QueryDatasetSchema = z.object({
  granularity: GranularityEnum.optional(),
  configuration: z
    .object({
      columns: z.array(z.string()).optional(),
    })
    .optional(),
  aggregation: z.record(z.string(), AggregationSchema).optional(),
  grouping: z.array(GroupingSchema).optional(),
  sorting: z.array(SortingSchema).optional(),
  filter: QueryFilterSchema.optional(),
});

// Request schemas
export const QueryDefinitionSchema = z.object({
  type: QueryTypeEnum,
  timeframe: TimeframeEnum,
  timePeriod: TimePeriodSchema.optional(),
  dataset: QueryDatasetSchema,
  includeMonetaryCommitment: z.boolean().optional(),
});

// Column info schema
export const QueryColumnInfoSchema = z.object({
  name: z.string(),
  type: z.string(),
});

// Response data schemas
export const QueryPropertiesSchema = z.object({
  nextLink: z.string().optional(),
  columns: z.array(QueryColumnInfoSchema).optional(),
  rows: z.array(z.array(z.union([z.string(), z.number(), z.date()]))),
});

export const QueryResponseSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  type: z.string().optional(),
  location: z.string().optional(),
  sku: z.string().optional(),
  eTag: z.string().optional(),
  properties: QueryPropertiesSchema,
});

// Azure Identity schemas
export const ClientSecretCredentialOptionsSchema = z.object({
  authorityHost: z.string().optional(),
  tenantId: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  additionallyAllowedTenants: z.array(z.string()).optional(),
});

// HTTP request/response schemas
export const HttpHeadersSchema = z.record(z.string(), z.string());

export const PipelineRequestSchema = z.object({
  url: z.string(),
  method: z.string(),
  body: z.string().optional(),
  headers: HttpHeadersSchema.optional(),
  timeout: z.number().optional(),
  withCredentials: z.boolean().optional(),
  requestId: z.string().optional(),
});

export const PipelineResponseSchema = z.object({
  status: z.number(),
  headers: z.object({
    get: z.function().args(z.string()).returns(z.string().optional()),
  }),
  bodyAsText: z.string().optional(),
  request: PipelineRequestSchema,
});

// Rate limiting schema
export const RateLimitInfoSchema = z.object({
  retryAfter: z.number().int(),
  remainingRequests: z.number().int().optional(),
  resetTime: z.date().optional(),
});

// Internal transformation schemas
export const CostRowSchema = z.object({
  cost: z.number(),
  date: z.union([z.string(), z.number()]),
  serviceName: z.string(),
  currency: z.string().optional(),
});

export const AzureConfigSchema = z.object({
  tenantId: z.string(),
  clientId: z.string(),
  clientSecret: z.string(),
  subscriptionId: z.string(),
  name: z.string(),
  tags: z.array(z.string()).optional(),
});

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
export const AzureErrorSchema = z.object({
  name: z.string(),
  message: z.string(),
  code: z.string().optional(),
  details: z
    .array(
      z.object({
        code: z.string().optional(),
        message: z.string().optional(),
      }),
    )
    .optional(),
  innererror: z
    .object({
      code: z.string().optional(),
      message: z.string().optional(),
    })
    .optional(),
});

export const AzureRestErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z
      .array(
        z.object({
          code: z.string().optional(),
          message: z.string().optional(),
        }),
      )
      .optional(),
  }),
});

// Types derived from the schemas
export type QueryType = z.infer<typeof QueryTypeEnum>;
export type Granularity = z.infer<typeof GranularityEnum>;
export type Timeframe = z.infer<typeof TimeframeEnum>;
export type GroupingType = z.infer<typeof GroupingTypeEnum>;
export type AggregationFunction = z.infer<typeof AggregationFunctionEnum>;
export type FilterOperator = z.infer<typeof FilterOperatorEnum>;
export type DimensionName = z.infer<typeof DimensionNameEnum>;
export type TimePeriod = z.infer<typeof TimePeriodSchema>;
export type Aggregation = z.infer<typeof AggregationSchema>;
export type Grouping = z.infer<typeof GroupingSchema>;
export type Sorting = z.infer<typeof SortingSchema>;
export type TagFilter = z.infer<typeof TagFilterSchema>;
export type DimensionFilter = z.infer<typeof DimensionFilterSchema>;
export type QueryFilter = z.infer<typeof QueryFilterSchema>;
export type QueryDataset = z.infer<typeof QueryDatasetSchema>;
export type QueryDefinition = z.infer<typeof QueryDefinitionSchema>;
export type QueryColumnInfo = z.infer<typeof QueryColumnInfoSchema>;
export type QueryProperties = z.infer<typeof QueryPropertiesSchema>;
export type QueryResponse = z.infer<typeof QueryResponseSchema>;
export type ClientSecretCredentialOptions = z.infer<typeof ClientSecretCredentialOptionsSchema>;
export type HttpHeaders = z.infer<typeof HttpHeadersSchema>;
export type PipelineRequest = z.infer<typeof PipelineRequestSchema>;
export type PipelineResponse = z.infer<typeof PipelineResponseSchema>;
export type RateLimitInfo = z.infer<typeof RateLimitInfoSchema>;
export type CostRow = z.infer<typeof CostRowSchema>;
export type AzureConfig = z.infer<typeof AzureConfigSchema>;
export type CostQuery = z.infer<typeof CostQuerySchema>;
export type TagsQuery = z.infer<typeof TagsQuerySchema>;
export type Report = z.infer<typeof ReportSchema>;
export type AzureError = z.infer<typeof AzureErrorSchema>;
export type AzureRestError = z.infer<typeof AzureRestErrorSchema>;
