import { z } from 'zod';

// Enums
export const ChargeTypeEnum = z.enum(['total', 'usage', 'committed_use', 'on_demand', 'overage', 'subscription']);

export const ProductNameEnum = z.enum([
  'apm_host',
  'apm_host_enterprise',
  'application_vulnerability_management_oss_host',
  'application_security_host',
  'audit_trail',
  'ci_pipeline',
  'ci_pipeline_indexed_spans',
  'cloud_cost_management',
  'cspm_container',
  'cspm_host',
  'csm_host_pro',
  'cws_host',
  'infra_container',
  'infra_container_excl_agent',
  'timeseries',
  'error_tracking',
  'incident_management',
  'logs_indexed_15day',
  'logs_indexed_180day',
  'logs_indexed_1day',
  'logs_indexed_30day',
  'logs_indexed_360day',
  'logs_indexed_3day',
  'logs_indexed_45day',
  'logs_indexed_60day',
  'logs_indexed_7day',
  'logs_indexed_90day',
  'apm_trace_search',
  'infra_host',
  'logs_ingested',
  'ingested_spans',
  'iot',
  'npm_host',
  'prof_container',
  'prof_host',
  'rum_lite',
  'rum_replay',
  'siem_indexed',
  'sensitive_data_scanner',
  'serverless_apps',
  'serverless_apm',
  'serverless_infra',
  'siem',
  'synthetics_api_tests',
  'synthetics_browser_checks',
  'ci_testing',
  'ci_test_indexed_spans',
]);

export const ViewEnum = z.enum(['sub-org', 'parent-org']);
export const GranularityEnum = z.enum(['daily', 'monthly']);

// Basic value schemas
export const CostValueSchema = z.number().min(0);

export const DateTimeSchema = z.union([
  z.string().datetime(),
  z.date(),
  z.any(), // moment object
]);

// Chargeback breakdown schema
export const ChargebackBreakdownSchema = z.object({
  productName: ProductNameEnum.optional(),
  chargeType: ChargeTypeEnum.optional(),
  cost: CostValueSchema.optional(),
  publicCost: CostValueSchema.optional(),
  billingCost: CostValueSchema.optional(),
  orgName: z.string().optional(),
  percentage: z.number().min(0).max(100).optional(),
});

// Cost by org attributes schema
export const CostByOrgAttributesSchema = z.object({
  date: DateTimeSchema.optional(),
  orgName: z.string().optional(),
  publicCost: CostValueSchema.optional(),
  billingCost: CostValueSchema.optional(),
  totalCost: CostValueSchema.optional(),
  charges: z.array(ChargebackBreakdownSchema).optional(),
});

// Cost by org schema
export const CostByOrgSchema = z.object({
  type: z.string().optional(),
  id: z.string().optional(),
  attributes: CostByOrgAttributesSchema.optional(),
});

// Request schemas
export const GetHistoricalCostRequestSchema = z.object({
  startMonth: DateTimeSchema,
  endMonth: DateTimeSchema.optional(),
  view: ViewEnum.optional(),
  includeConnectedAccounts: z.boolean().optional(),
});

export const GetEstimatedCostRequestSchema = z.object({
  startMonth: DateTimeSchema,
  endMonth: DateTimeSchema.optional(),
  view: ViewEnum.optional(),
  includeConnectedAccounts: z.boolean().optional(),
});

// Response schemas
export const CostByOrgResponseSchema = z.object({
  data: z.array(CostByOrgSchema).optional(),
  meta: z
    .object({
      pagination: z
        .object({
          totalCount: z.number().int().optional(),
          nextRecordId: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

// Usage metering schemas
export const UsageMeteringAttributesSchema = z.object({
  timestamp: DateTimeSchema.optional(),
  orgName: z.string().optional(),
  publicId: z.string().optional(),
  region: z.string().optional(),
  productFamily: z.string().optional(),
  usage: z
    .array(
      z.object({
        usageType: z.string(),
        value: z.number(),
        unit: z.string().optional(),
        productName: z.string().optional(),
      }),
    )
    .optional(),
});

export const UsageMeteringSchema = z.object({
  type: z.string().optional(),
  id: z.string().optional(),
  attributes: UsageMeteringAttributesSchema.optional(),
});

export const UsageMeteringResponseSchema = z.object({
  data: z.array(UsageMeteringSchema).optional(),
  meta: z
    .object({
      pagination: z
        .object({
          totalCount: z.number().int().optional(),
          nextRecordId: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

// Datadog client configuration schemas
export const DatadogAuthMethodsSchema = z.object({
  apiKeyAuth: z.string(),
  appKeyAuth: z.string(),
});

export const BaseServerConfigurationSchema = z.object({
  baseServer: z.string().url(),
  variables: z.record(z.string(), z.any()).optional(),
});

export const DatadogConfigurationSchema = z.object({
  baseServer: BaseServerConfigurationSchema.optional(),
  authMethods: DatadogAuthMethodsSchema,
  httpConfig: z
    .object({
      timeout: z.number().int().optional(),
      compress: z.boolean().optional(),
    })
    .optional(),
});

export const DatadogClientConfigSchema = z.object({
  apiKey: z.string(),
  applicationKey: z.string(),
  ddSite: z.string().url(),
  name: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Internal transformation schemas
export const DailyCostAllocationSchema = z.object({
  orgName: z.string(),
  date: DateTimeSchema,
  charges: z.array(
    z.object({
      productName: z.string().optional(),
      cost: z.number(),
      chargeType: ChargeTypeEnum.optional(),
    }),
  ),
});

export const MonthlyCostSchema = z.object({
  orgName: z.string(),
  date: DateTimeSchema,
  charges: z.array(ChargebackBreakdownSchema),
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
});

// Usage metrics breakdown schemas
export const InfrastructureUsageSchema = z.object({
  hostCount: z.number().int().optional(),
  containerCount: z.number().int().optional(),
  customMetricsCount: z.number().int().optional(),
  apmHostCount: z.number().int().optional(),
  npmHostCount: z.number().int().optional(),
});

export const LogsUsageSchema = z.object({
  indexedLogsCount: z.number().int().optional(),
  ingestedLogsCount: z.number().int().optional(),
  indexedRetentionDays: z.number().int().optional(),
  liveLogsCount: z.number().int().optional(),
});

export const APMUsageSchema = z.object({
  tracedInvocations: z.number().int().optional(),
  ingestedSpansCount: z.number().int().optional(),
  indexedSpansCount: z.number().int().optional(),
  hostCount: z.number().int().optional(),
  fargateTasks: z.number().int().optional(),
});

export const SyntheticsUsageSchema = z.object({
  apiTestRuns: z.number().int().optional(),
  browserCheckRuns: z.number().int().optional(),
  mobileTestRuns: z.number().int().optional(),
});

export const RUMUsageSchema = z.object({
  sessions: z.number().int().optional(),
  sessionsWithReplay: z.number().int().optional(),
  mobileAppSessions: z.number().int().optional(),
});

export const SecurityUsageSchema = z.object({
  csmProHosts: z.number().int().optional(),
  csmContainers: z.number().int().optional(),
  cwsHosts: z.number().int().optional(),
  asmHosts: z.number().int().optional(),
  siemAnalyzedLogs: z.number().int().optional(),
});

// Error schemas
export const DatadogErrorSchema = z.object({
  error: z.string(),
  code: z.number().int().optional(),
  detail: z.string().optional(),
  title: z.string().optional(),
  source: z
    .object({
      pointer: z.string().optional(),
      parameter: z.string().optional(),
    })
    .optional(),
});

export const DatadogApiErrorSchema = z.object({
  errors: z.array(DatadogErrorSchema),
});

// Rate limiting schema
export const RateLimitInfoSchema = z.object({
  limit: z.number().int(),
  period: z.number().int(),
  remaining: z.number().int(),
  reset: z.number().int(),
});

// Pagination schema
export const PaginationSchema = z.object({
  totalCount: z.number().int().optional(),
  totalFilteredCount: z.number().int().optional(),
  offset: z.number().int().optional(),
  limit: z.number().int().optional(),
  nextOffset: z.number().int().optional(),
  nextRecordId: z.string().optional(),
});

// Types derived from the schemas
export type ChargeType = z.infer<typeof ChargeTypeEnum>;
export type ProductName = z.infer<typeof ProductNameEnum>;
export type View = z.infer<typeof ViewEnum>;
export type Granularity = z.infer<typeof GranularityEnum>;
export type CostValue = z.infer<typeof CostValueSchema>;
export type DateTime = z.infer<typeof DateTimeSchema>;
export type ChargebackBreakdown = z.infer<typeof ChargebackBreakdownSchema>;
export type CostByOrgAttributes = z.infer<typeof CostByOrgAttributesSchema>;
export type CostByOrg = z.infer<typeof CostByOrgSchema>;
export type GetHistoricalCostRequest = z.infer<typeof GetHistoricalCostRequestSchema>;
export type GetEstimatedCostRequest = z.infer<typeof GetEstimatedCostRequestSchema>;
export type CostByOrgResponse = z.infer<typeof CostByOrgResponseSchema>;
export type UsageMeteringAttributes = z.infer<typeof UsageMeteringAttributesSchema>;
export type UsageMetering = z.infer<typeof UsageMeteringSchema>;
export type UsageMeteringResponse = z.infer<typeof UsageMeteringResponseSchema>;
export type DatadogAuthMethods = z.infer<typeof DatadogAuthMethodsSchema>;
export type BaseServerConfiguration = z.infer<typeof BaseServerConfigurationSchema>;
export type DatadogConfiguration = z.infer<typeof DatadogConfigurationSchema>;
export type DatadogClientConfig = z.infer<typeof DatadogClientConfigSchema>;
export type DailyCostAllocation = z.infer<typeof DailyCostAllocationSchema>;
export type MonthlyCost = z.infer<typeof MonthlyCostSchema>;
export type CostQuery = z.infer<typeof CostQuerySchema>;
export type Report = z.infer<typeof ReportSchema>;
export type InfrastructureUsage = z.infer<typeof InfrastructureUsageSchema>;
export type LogsUsage = z.infer<typeof LogsUsageSchema>;
export type APMUsage = z.infer<typeof APMUsageSchema>;
export type SyntheticsUsage = z.infer<typeof SyntheticsUsageSchema>;
export type RUMUsage = z.infer<typeof RUMUsageSchema>;
export type SecurityUsage = z.infer<typeof SecurityUsageSchema>;
export type DatadogError = z.infer<typeof DatadogErrorSchema>;
export type DatadogApiError = z.infer<typeof DatadogApiErrorSchema>;
export type RateLimitInfo = z.infer<typeof RateLimitInfoSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
