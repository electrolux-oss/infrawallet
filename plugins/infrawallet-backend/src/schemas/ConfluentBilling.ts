import { z } from 'zod';

// Enums
export const LineTypeEnum = z.enum([
  'support',
  'cluster_usage',
  'topic_partition',
  'connector_usage',
  'kafka_rest_usage',
  'ksql_usage',
  'schema_registry_usage',
  'marketplace',
  'professional_services',
  'community_connectors',
  'enterprise_connectors',
  'dedicated_cluster',
  'basic_cluster',
  'standard_cluster',
]);

export const ResourceTypeEnum = z.enum([
  'cluster',
  'connector',
  'topic',
  'partition',
  'schema',
  'environment',
  'organization',
  'service_account',
]);

export const PricingModelEnum = z.enum(['hourly', 'monthly', 'annual', 'usage_based', 'committed_use']);

export const GranularityEnum = z.enum(['daily', 'monthly']);

// Basic value schemas
export const MoneyAmountSchema = z.object({
  amount: z.string(),
  currency: z.string(),
});

export const DateRangeSchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
});

// Resource schemas
export const ResourceIdentifierSchema = z.object({
  id: z.string(),
  type: ResourceTypeEnum.optional(),
  display_name: z.string().optional(),
  environment: z
    .object({
      id: z.string(),
      display_name: z.string().optional(),
    })
    .optional(),
  related_resources: z
    .array(
      z.object({
        id: z.string(),
        type: ResourceTypeEnum.optional(),
        display_name: z.string().optional(),
      }),
    )
    .optional(),
});

// Environment schemas
export const EnvironmentSchema = z.object({
  id: z.string(),
  display_name: z.string(),
  metadata: z
    .object({
      self: z.string().url(),
      resource_name: z.string().optional(),
      created_at: z.string().datetime().optional(),
      updated_at: z.string().datetime().optional(),
      deleted_at: z.string().datetime().optional(),
    })
    .optional(),
  stream_governance_config: z
    .object({
      package: z.enum(['essentials', 'advanced']).optional(),
    })
    .optional(),
});

// Cost item schemas
export const CostItemSchema = z.object({
  line_type: z.string(),
  product: z.string().optional(),
  description: z.string().optional(),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  granularity: GranularityEnum,
  network_access_type: z.string().optional(),
  unit: z.string().optional(),
  quantity: z.number().optional(),
  amount: z.string(),
  original_amount: z.string().optional(),
  discount_amount: z.string().optional(),
  currency: z.string(),
  resource: ResourceIdentifierSchema.optional(),
  pricing_model: PricingModelEnum.optional(),
  marketplace: z
    .object({
      marketplace: z.string(),
      marketplace_product: z.string().optional(),
    })
    .optional(),
  envDisplayName: z.string().optional(), // Added by transformation
});

// Request schemas
export const GetCostsRequestSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const GetEnvironmentRequestSchema = z.object({
  environment_id: z.string(),
});

// Response schemas
export const CostsResponseSchema = z.object({
  data: z.array(CostItemSchema),
  metadata: z
    .object({
      next_page_token: z.string().optional(),
      total_size: z.number().int().optional(),
      self: z.string().url().optional(),
      first: z.string().url().optional(),
      prev: z.string().url().optional(),
      next: z.string().url().optional(),
      last: z.string().url().optional(),
    })
    .optional(),
});

export const EnvironmentResponseSchema = z.object({
  id: z.string(),
  display_name: z.string(),
  metadata: z
    .object({
      self: z.string().url(),
      resource_name: z.string().optional(),
      created_at: z.string().datetime().optional(),
      updated_at: z.string().datetime().optional(),
      deleted_at: z.string().datetime().optional(),
    })
    .optional(),
  stream_governance_config: z
    .object({
      package: z.enum(['essentials', 'advanced']).optional(),
    })
    .optional(),
});

// Authentication schemas
export const ConfluentCredentialsSchema = z.object({
  apiKey: z.string(),
  apiSecret: z.string(),
});

export const ConfluentClientSchema = z.object({
  headers: z.object({
    Authorization: z.string().startsWith('Basic '),
    'Content-Type': z.literal('application/json'),
  }),
  name: z.string(),
});

// HTTP response schemas
export const HttpResponseSchema = z.object({
  status: z.number().int(),
  statusText: z.string(),
  ok: z.boolean(),
  headers: z.object({
    get: z.function().args(z.string()).returns(z.string().nullable()),
  }),
  json: z.function().returns(z.promise(z.any())),
  text: z.function().returns(z.promise(z.string())),
});

// Rate limiting schema
export const RateLimitResponseSchema = z.object({
  status: z.literal(429),
  headers: z.object({
    get: z.function().args(z.string()).returns(z.string().nullable()),
  }),
});

// Internal transformation schemas
export const MonthlyRangeSchema = z.object({
  start: z.any(), // moment object
  end: z.any(), // moment object
});

export const BatchResultSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  data: z.array(CostItemSchema),
});

export const AggregatedDataSchema = z.object({
  data: z.array(
    CostItemSchema.extend({
      envDisplayName: z.string(),
    }),
  ),
});

export const ConfluentConfigSchema = z.object({
  name: z.string(),
  apiKey: z.string(),
  apiSecret: z.string(),
  tags: z.array(z.string()).optional(),
});

export const CostQuerySchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  granularity: z.string(),
  tags: z.string().optional(),
});

export const ReportSchema = z.object({
  id: z.string(),
  account: z.string(),
  service: z.string(),
  category: z.string(),
  provider: z.string(),
  providerType: z.string(),
  reports: z.record(z.string(), z.number()),
  project: z.string().optional(),
  cluster: z.string().optional(),
});

// Error schemas
export const ConfluentErrorSchema = z.object({
  error_code: z.number().int(),
  message: z.string(),
  details: z
    .array(
      z.object({
        '@type': z.string(),
        violations: z
          .array(
            z.object({
              field: z.string(),
              description: z.string(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});

export const ConfluentRestErrorSchema = z.object({
  errors: z.array(
    z.object({
      status: z.string(),
      detail: z.string().optional(),
      source: z
        .object({
          pointer: z.string().optional(),
          parameter: z.string().optional(),
        })
        .optional(),
    }),
  ),
});

// API response envelope schemas
export const ConfluentApiResponseSchema = z.object({
  api_version: z.string(),
  kind: z.string(),
  metadata: z
    .object({
      self: z.string().url().optional(),
      next: z.string().url().optional(),
      resource_name: z.string().optional(),
      created_at: z.string().datetime().optional(),
      updated_at: z.string().datetime().optional(),
      deleted_at: z.string().datetime().optional(),
    })
    .optional(),
});

// Usage metrics schemas (for detailed billing analysis)
export const UsageMetricSchema = z.object({
  metric_name: z.string(),
  value: z.number(),
  unit: z.string(),
  timestamp: z.string().datetime(),
  resource_id: z.string().optional(),
  tags: z.record(z.string(), z.string()).optional(),
});

export const ClusterUsageSchema = z.object({
  cluster_id: z.string(),
  environment_id: z.string(),
  cluster_type: z.enum(['dedicated', 'basic', 'standard']),
  throughput_mb_per_hour: z.number().optional(),
  storage_gb_hours: z.number().optional(),
  partition_hours: z.number().optional(),
  connector_hours: z.number().optional(),
});

// Types derived from the schemas
export type LineType = z.infer<typeof LineTypeEnum>;
export type ResourceType = z.infer<typeof ResourceTypeEnum>;
export type PricingModel = z.infer<typeof PricingModelEnum>;
export type Granularity = z.infer<typeof GranularityEnum>;
export type MoneyAmount = z.infer<typeof MoneyAmountSchema>;
export type DateRange = z.infer<typeof DateRangeSchema>;
export type ResourceIdentifier = z.infer<typeof ResourceIdentifierSchema>;
export type Environment = z.infer<typeof EnvironmentSchema>;
export type CostItem = z.infer<typeof CostItemSchema>;
export type GetCostsRequest = z.infer<typeof GetCostsRequestSchema>;
export type GetEnvironmentRequest = z.infer<typeof GetEnvironmentRequestSchema>;
export type CostsResponse = z.infer<typeof CostsResponseSchema>;
export type EnvironmentResponse = z.infer<typeof EnvironmentResponseSchema>;
export type ConfluentCredentials = z.infer<typeof ConfluentCredentialsSchema>;
export type ConfluentClient = z.infer<typeof ConfluentClientSchema>;
export type HttpResponse = z.infer<typeof HttpResponseSchema>;
export type RateLimitResponse = z.infer<typeof RateLimitResponseSchema>;
export type MonthlyRange = z.infer<typeof MonthlyRangeSchema>;
export type BatchResult = z.infer<typeof BatchResultSchema>;
export type AggregatedData = z.infer<typeof AggregatedDataSchema>;
export type ConfluentConfig = z.infer<typeof ConfluentConfigSchema>;
export type CostQuery = z.infer<typeof CostQuerySchema>;
export type Report = z.infer<typeof ReportSchema>;
export type ConfluentError = z.infer<typeof ConfluentErrorSchema>;
export type ConfluentRestError = z.infer<typeof ConfluentRestErrorSchema>;
export type ConfluentApiResponse = z.infer<typeof ConfluentApiResponseSchema>;
export type UsageMetric = z.infer<typeof UsageMetricSchema>;
export type ClusterUsage = z.infer<typeof ClusterUsageSchema>;
