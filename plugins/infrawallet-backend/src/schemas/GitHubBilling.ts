import { z } from 'zod';

// Enums
export const GitHubSkuEnum = z.enum([
  'Actions',
  'Packages',
  'Codespaces',
  'Copilot',
  'Advanced Security',
  'Large File Storage',
  'GitHub Enterprise Server',
  'GitHub Enterprise Cloud',
  'Private Repositories',
  'Data Transfer',
  'Pages',
  'Sponsors',
]);

export const UnitTypeEnum = z.enum([
  'minutes',
  'hours',
  'gb',
  'mb',
  'seats',
  'users',
  'requests',
  'builds',
  'storage',
  'bandwidth',
]);

export const ProductEnum = z.enum([
  'actions',
  'packages',
  'codespaces',
  'copilot',
  'advanced_security',
  'git_lfs',
  'github_enterprise_server',
  'github_enterprise_cloud',
  'private_repos',
  'data_transfer',
  'pages',
  'sponsors',
]);

export const PricingModelEnum = z.enum(['per_unit', 'tiered', 'volume', 'free_tier', 'included', 'overage']);

export const BillingCycleEnum = z.enum(['monthly', 'annual', 'usage_based']);

// Basic value schemas
export const MoneyAmountSchema = z.object({
  amount: z.number(),
  currency: z.string().length(3), // ISO currency code
});

export const DateTimeSchema = z.string().datetime();

export const UsageQuantitySchema = z.object({
  value: z.number(),
  unit: UnitTypeEnum,
});

// Usage item schema (core billing data structure)
export const UsageItemSchema = z.object({
  date: DateTimeSchema,
  product: ProductEnum,
  sku: z.string(),
  quantity: UsageQuantitySchema,
  unitAmount: MoneyAmountSchema,
  netAmount: z.number(),
  grossAmount: z.number().optional(),
  organizationName: z.string(),
  organizationId: z.number().int(),
  repositoryName: z.string().optional(),
  repositoryId: z.number().int().optional(),
  userId: z.number().int().optional(),
  userLogin: z.string().optional(),
  workflowId: z.number().int().optional(),
  workflowName: z.string().optional(),
  jobId: z.number().int().optional(),
  jobName: z.string().optional(),
  runId: z.number().int().optional(),
  runNumber: z.number().int().optional(),
  pricePerUnit: z.number().optional(),
  includedQuantity: z.number().optional(),
  multiplier: z.number().optional(),
});

// Request schemas
export const GetBillingUsageRequestSchema = z.object({
  organization: z.string(),
  year: z.number().int().min(2008).max(9999),
  month: z.number().int().min(1).max(12).optional(),
});

export const GetActionsUsageRequestSchema = z.object({
  org: z.string(),
  per_page: z.number().int().min(1).max(100).optional(),
  page: z.number().int().min(1).optional(),
});

export const GetPackagesUsageRequestSchema = z.object({
  org: z.string(),
  package_type: z.enum(['npm', 'maven', 'rubygems', 'docker', 'nuget', 'container']).optional(),
  per_page: z.number().int().min(1).max(100).optional(),
  page: z.number().int().min(1).optional(),
});

export const GetCodespacesUsageRequestSchema = z.object({
  org: z.string(),
  per_page: z.number().int().min(1).max(100).optional(),
  page: z.number().int().min(1).optional(),
});

// Response schemas
export const BillingUsageResponseSchema = z.object({
  usageItems: z.array(UsageItemSchema),
  totalCost: MoneyAmountSchema,
  totalUsage: z
    .object({
      [ProductEnum.options[0]]: UsageQuantitySchema.optional(),
      [ProductEnum.options[1]]: UsageQuantitySchema.optional(),
      [ProductEnum.options[2]]: UsageQuantitySchema.optional(),
      [ProductEnum.options[3]]: UsageQuantitySchema.optional(),
      [ProductEnum.options[4]]: UsageQuantitySchema.optional(),
      [ProductEnum.options[5]]: UsageQuantitySchema.optional(),
    })
    .partial(),
  billingCycle: BillingCycleEnum,
  organization: z.object({
    id: z.number().int(),
    login: z.string(),
    name: z.string().optional(),
    billing_email: z.string().email().optional(),
  }),
});

// GitHub Actions specific schemas
export const ActionsUsageSchema = z.object({
  total_minutes_used: z.number(),
  total_paid_minutes_used: z.number(),
  included_minutes: z.number(),
  minutes_used_breakdown: z.object({
    UBUNTU: z.number().optional(),
    MACOS: z.number().optional(),
    WINDOWS: z.number().optional(),
  }),
  total_cost: MoneyAmountSchema.optional(),
});

export const ActionsUsageResponseSchema = z.object({
  total_minutes_used: z.number(),
  total_paid_minutes_used: z.number(),
  included_minutes: z.number(),
  minutes_used_breakdown: z.object({
    UBUNTU: z.number().optional(),
    MACOS: z.number().optional(),
    WINDOWS: z.number().optional(),
  }),
});

// GitHub Packages specific schemas
export const PackagesUsageSchema = z.object({
  total_gigabytes_bandwidth_used: z.number(),
  total_paid_gigabytes_bandwidth_used: z.number(),
  included_gigabytes_bandwidth: z.number(),
  total_cost: MoneyAmountSchema.optional(),
});

export const PackagesUsageResponseSchema = z.object({
  total_gigabytes_bandwidth_used: z.number(),
  total_paid_gigabytes_bandwidth_used: z.number(),
  included_gigabytes_bandwidth: z.number(),
});

// GitHub Codespaces specific schemas
export const CodespacesUsageSchema = z.object({
  total_duration_minutes: z.number(),
  total_cost: MoneyAmountSchema.optional(),
  breakdown: z
    .array(
      z.object({
        date: z.string(),
        product: z.string(),
        sku: z.string(),
        quantity: z.number(),
        unit: z.string(),
        price_per_unit: z.number(),
        total_cost: z.number(),
      }),
    )
    .optional(),
});

export const CodespacesUsageResponseSchema = z.object({
  total_duration_minutes: z.number(),
});

// GitHub Copilot specific schemas
export const CopilotUsageSchema = z.object({
  total_seats: z.number().int(),
  active_users: z.number().int(),
  total_cost: MoneyAmountSchema,
  seat_breakdown: z
    .object({
      total: z.number().int(),
      added_this_cycle: z.number().int(),
      pending_cancellation: z.number().int(),
      pending_invitation: z.number().int(),
      active_this_cycle: z.number().int(),
      inactive_this_cycle: z.number().int(),
    })
    .optional(),
});

// Authentication schemas
export const GitHubTokenSchema = z.object({
  token: z.string(),
  type: z.enum(['personal_access_token', 'github_app_token', 'installation_token']).optional(),
  scopes: z.array(z.string()).optional(),
  expires_at: DateTimeSchema.optional(),
});

export const GitHubClientConfigSchema = z.object({
  token: z.string(),
  organization: z.string(),
  baseUrl: z.string().url().optional(),
  userAgent: z.string().optional(),
  timeout: z.number().int().positive().optional(),
  name: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// HTTP request schemas
export const GitHubApiRequestSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  headers: z.object({
    Authorization: z.string(),
    Accept: z.string(),
    'X-GitHub-Api-Version': z.string(),
    'User-Agent': z.string().optional(),
  }),
  body: z.string().optional(),
});

export const GitHubApiResponseSchema = z.object({
  status: z.number().int(),
  statusText: z.string(),
  ok: z.boolean(),
  headers: z.record(z.string(), z.string()),
  data: z.any(),
});

// Rate limiting schemas
export const RateLimitSchema = z.object({
  limit: z.number().int(),
  remaining: z.number().int(),
  reset: z.number().int(), // Unix timestamp
  used: z.number().int(),
  resource: z.string(),
});

export const RateLimitResponseSchema = z.object({
  resources: z.object({
    core: RateLimitSchema,
    search: RateLimitSchema,
    graphql: RateLimitSchema,
    integration_manifest: RateLimitSchema.optional(),
  }),
});

// Internal transformation schemas
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

// Marketplace and enterprise schemas
export const MarketplacePurchaseSchema = z.object({
  id: z.number().int(),
  type: z.enum(['subscription', 'purchase']),
  marketplace_listing: z.object({
    id: z.number().int(),
    name: z.string(),
    description: z.string().optional(),
    pricing_model: PricingModelEnum,
  }),
  marketplace_purchase: z.object({
    billing_cycle: BillingCycleEnum,
    next_billing_date: DateTimeSchema.optional(),
    unit_count: z.number().int().optional(),
    plan: z.object({
      id: z.number().int(),
      name: z.string(),
      description: z.string().optional(),
      monthly_price_in_cents: z.number().int(),
      yearly_price_in_cents: z.number().int(),
      price_model: PricingModelEnum,
      unit_name: z.string().optional(),
    }),
  }),
  organization: z.object({
    login: z.string(),
    id: z.number().int(),
  }),
});

// Error schemas
export const GitHubErrorSchema = z.object({
  message: z.string(),
  errors: z
    .array(
      z.object({
        resource: z.string().optional(),
        field: z.string().optional(),
        code: z.string(),
        message: z.string().optional(),
      }),
    )
    .optional(),
  documentation_url: z.string().url().optional(),
});

export const GitHubApiErrorResponseSchema = z.object({
  message: z.string(),
  errors: z
    .array(
      z.object({
        resource: z.string().optional(),
        field: z.string().optional(),
        code: z.string(),
        message: z.string().optional(),
        index: z.number().int().optional(),
        value: z.union([z.string(), z.number(), z.boolean()]).optional(),
      }),
    )
    .optional(),
  documentation_url: z.string().url().optional(),
  status: z.number().int(),
});

// Types derived from the schemas
export type GitHubSku = z.infer<typeof GitHubSkuEnum>;
export type UnitType = z.infer<typeof UnitTypeEnum>;
export type Product = z.infer<typeof ProductEnum>;
export type PricingModel = z.infer<typeof PricingModelEnum>;
export type BillingCycle = z.infer<typeof BillingCycleEnum>;
export type MoneyAmount = z.infer<typeof MoneyAmountSchema>;
export type DateTime = z.infer<typeof DateTimeSchema>;
export type UsageQuantity = z.infer<typeof UsageQuantitySchema>;
export type UsageItem = z.infer<typeof UsageItemSchema>;
export type GetBillingUsageRequest = z.infer<typeof GetBillingUsageRequestSchema>;
export type GetActionsUsageRequest = z.infer<typeof GetActionsUsageRequestSchema>;
export type GetPackagesUsageRequest = z.infer<typeof GetPackagesUsageRequestSchema>;
export type GetCodespacesUsageRequest = z.infer<typeof GetCodespacesUsageRequestSchema>;
export type BillingUsageResponse = z.infer<typeof BillingUsageResponseSchema>;
export type ActionsUsage = z.infer<typeof ActionsUsageSchema>;
export type ActionsUsageResponse = z.infer<typeof ActionsUsageResponseSchema>;
export type PackagesUsage = z.infer<typeof PackagesUsageSchema>;
export type PackagesUsageResponse = z.infer<typeof PackagesUsageResponseSchema>;
export type CodespacesUsage = z.infer<typeof CodespacesUsageSchema>;
export type CodespacesUsageResponse = z.infer<typeof CodespacesUsageResponseSchema>;
export type CopilotUsage = z.infer<typeof CopilotUsageSchema>;
export type GitHubToken = z.infer<typeof GitHubTokenSchema>;
export type GitHubClientConfig = z.infer<typeof GitHubClientConfigSchema>;
export type GitHubApiRequest = z.infer<typeof GitHubApiRequestSchema>;
export type GitHubApiResponse = z.infer<typeof GitHubApiResponseSchema>;
export type RateLimit = z.infer<typeof RateLimitSchema>;
export type RateLimitResponse = z.infer<typeof RateLimitResponseSchema>;
export type CostQuery = z.infer<typeof CostQuerySchema>;
export type Report = z.infer<typeof ReportSchema>;
export type MarketplacePurchase = z.infer<typeof MarketplacePurchaseSchema>;
export type GitHubError = z.infer<typeof GitHubErrorSchema>;
export type GitHubApiErrorResponse = z.infer<typeof GitHubApiErrorResponseSchema>;
