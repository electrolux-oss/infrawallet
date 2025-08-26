import { z } from 'zod';

// Enums
export const SkuTypeEnum = z.enum([
  'Atlas Cluster',
  'Atlas Data Transfer',
  'Atlas Backup',
  'Atlas Search',
  'Atlas Data Lake',
  'Atlas Charts',
  'Atlas App Services',
  'Atlas Device Sync',
  'Atlas Triggers',
  'Atlas Functions',
  'Atlas HTTPS Endpoints',
  'Atlas GraphQL',
  'Atlas Data API',
  'Atlas Stream Processing',
  'Atlas Vector Search',
  'Support',
  'Training',
  'Professional Services',
  'Credit',
]);

export const ClusterTierEnum = z.enum([
  'M0', // Free tier
  'M2',
  'M5', // Shared clusters
  'M10',
  'M20',
  'M30', // General purpose
  'M40',
  'M50',
  'M60', // General purpose
  'M80',
  'M100',
  'M140', // Memory optimized
  'M200',
  'M300',
  'M400', // Memory optimized
  'M700', // High CPU
  'R40',
  'R50',
  'R60', // Regional clusters
  'R80',
  'R100',
  'R200',
]);

export const CloudProviderEnum = z.enum([
  'AWS',
  'GCP',
  'AZURE',
  'TENANT', // Multi-tenant
]);

export const RegionEnum = z.enum([
  'US_EAST_1',
  'US_EAST_2',
  'US_WEST_1',
  'US_WEST_2',
  'CA_CENTRAL_1',
  'SA_EAST_1',
  'EU_CENTRAL_1',
  'EU_WEST_1',
  'EU_WEST_2',
  'EU_WEST_3',
  'EU_NORTH_1',
  'AP_SOUTH_1',
  'AP_Southeast_1',
  'AP_SOUTHEAST_2',
  'AP_NORTHEAST_1',
  'AP_NORTHEAST_2',
  'ME_SOUTH_1',
  'AF_SOUTH_1',
  'AUSTRALIA_SOUTHEAST',
  'EUROPE_WEST',
  'US_CENTRAL',
]);

export const InvoiceStatusEnum = z.enum(['PENDING', 'PAID', 'FAILED', 'FORGIVEN', 'CLOSED', 'PROCESSING']);

export const BillingPeriodEnum = z.enum(['MONTHLY', 'ANNUALLY']);
export const GranularityEnum = z.enum(['daily', 'monthly']);

// Basic value schemas
export const MoneyAmountSchema = z.object({
  amount: z.number(),
  currency: z.string().length(3).default('USD'),
});

export const DateSchema = z.union([
  z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/), // MM/DD/YYYY format from CSV
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format from API
  z.string().datetime(), // ISO datetime
  z.date(),
]);

// Organization schemas
export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  links: z
    .array(
      z.object({
        href: z.string().url(),
        rel: z.string(),
      }),
    )
    .optional(),
});

// Project schemas
export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  orgId: z.string(),
  clusterCount: z.number().int().optional(),
  links: z
    .array(
      z.object({
        href: z.string().url(),
        rel: z.string(),
      }),
    )
    .optional(),
});

// Cluster schemas
export const ClusterSpecSchema = z.object({
  name: z.string(),
  clusterType: z.enum(['REPLICASET', 'SHARDED', 'GEOSHARDED']),
  replicationSpec: z.object({
    regionConfigs: z.array(
      z.object({
        regionName: RegionEnum,
        providerName: CloudProviderEnum,
        priority: z.number().int(),
        electableSpecs: z
          .object({
            instanceSize: ClusterTierEnum,
            nodeCount: z.number().int(),
          })
          .optional(),
        readOnlySpecs: z
          .object({
            instanceSize: ClusterTierEnum,
            nodeCount: z.number().int(),
          })
          .optional(),
        analyticsSpecs: z
          .object({
            instanceSize: ClusterTierEnum,
            nodeCount: z.number().int(),
          })
          .optional(),
      }),
    ),
  }),
  backupEnabled: z.boolean().optional(),
  encryptionAtRestProvider: z.string().optional(),
  mongoDBMajorVersion: z.string().optional(),
  tags: z
    .array(
      z.object({
        key: z.string(),
        value: z.string(),
      }),
    )
    .optional(),
});

// Invoice schemas
export const InvoiceSchema = z.object({
  id: z.string(),
  amountBilledCents: z.number().int(),
  amountPaidCents: z.number().int(),
  created: DateSchema,
  creditsCents: z.number().int().optional(),
  endDate: DateSchema,
  groupId: z.string().optional(), // Legacy field
  orgId: z.string(),
  salesTaxCents: z.number().int().optional(),
  startDate: DateSchema,
  statusName: InvoiceStatusEnum,
  subtotalCents: z.number().int(),
  updated: DateSchema.optional(),
  links: z
    .array(
      z.object({
        href: z.string().url(),
        rel: z.string(),
      }),
    )
    .optional(),
});

export const InvoiceListResponseSchema = z.object({
  results: z.array(InvoiceSchema),
  totalCount: z.number().int(),
  links: z
    .array(
      z.object({
        href: z.string().url(),
        rel: z.string(),
      }),
    )
    .optional(),
});

// CSV line item schema (from invoice CSV)
export const InvoiceLineItemSchema = z.object({
  'Organization ID': z.string(),
  'Organization Name': z.string(),
  'Project ID': z.string(),
  Project: z.string(),
  Cluster: z.string(),
  SKU: z.string(),
  Date: z.string(), // MM/DD/YYYY format
  Amount: z.string().transform(val => parseFloat(val)), // String that converts to number
  Unit: z.string().optional(),
  Quantity: z
    .string()
    .transform(val => parseFloat(val) || 0)
    .optional(),
  'Replica Set Name': z.string().optional(),
  'Instance Size': ClusterTierEnum.optional(),
  Region: z.string().optional(),
  Provider: CloudProviderEnum.optional(),
});

// Request schemas
export const GetInvoicesRequestSchema = z.object({
  orgId: z.string(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  itemsPerPage: z.number().int().min(1).max(500).optional(),
  pageNum: z.number().int().min(1).optional(),
});

export const GetInvoiceCsvRequestSchema = z.object({
  orgId: z.string(),
  invoiceId: z.string(),
});

export const GetOrganizationsRequestSchema = z.object({
  itemsPerPage: z.number().int().min(1).max(500).optional(),
  pageNum: z.number().int().min(1).optional(),
  name: z.string().optional(),
});

export const GetProjectsRequestSchema = z.object({
  orgId: z.string(),
  itemsPerPage: z.number().int().min(1).max(500).optional(),
  pageNum: z.number().int().min(1).optional(),
  name: z.string().optional(),
});

export const GetClustersRequestSchema = z.object({
  groupId: z.string(), // Project ID
  itemsPerPage: z.number().int().min(1).max(500).optional(),
  pageNum: z.number().int().min(1).optional(),
});

// Authentication schemas
export const DigestAuthSchema = z.object({
  publicKey: z.string(),
  privateKey: z.string(),
  digestAuth: z.string(), // Combined as "publicKey:privateKey"
});

export const MongoAtlasClientConfigSchema = z.object({
  publicKey: z.string(),
  privateKey: z.string(),
  orgId: z.string(),
  name: z.string(),
  tags: z.array(z.string()).optional(),
  baseUrl: z.string().url().optional().default('https://cloud.mongodb.com/api/atlas/v2'),
  timeout: z.number().int().positive().optional(),
});

// HTTP request schemas
export const AtlasApiRequestSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  digestAuth: z.string(),
  dataType: z.enum(['json', 'text']),
  headers: z.object({
    Accept: z.string(),
    'Content-Type': z.string().optional(),
  }),
  data: z.any().optional(),
});

export const AtlasApiResponseSchema = z.object({
  status: z.number().int(),
  statusText: z.string(),
  data: z.any(),
  headers: z.record(z.string(), z.string()).optional(),
});

// Usage metrics schemas
export const ClusterUsageMetricsSchema = z.object({
  clusterId: z.string(),
  clusterName: z.string(),
  projectId: z.string(),
  projectName: z.string(),
  instanceSize: ClusterTierEnum,
  provider: CloudProviderEnum,
  region: RegionEnum,
  nodeCount: z.number().int(),
  storageGBHours: z.number().optional(),
  dataTransferGB: z.number().optional(),
  backupStorageGB: z.number().optional(),
  oplogStorageGB: z.number().optional(),
  period: z.object({
    start: DateSchema,
    end: DateSchema,
  }),
});

export const AtlasSearchUsageSchema = z.object({
  clusterId: z.string(),
  indexCount: z.number().int(),
  queryCount: z.number().int(),
  storageBytes: z.number().int(),
  period: z.object({
    start: DateSchema,
    end: DateSchema,
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
  project: z.string().optional(),
  cluster: z.string().optional(),
});

export const CsvProcessingSchema = z.object({
  rawCsv: z.string(),
  filteredLines: z.array(z.string()),
  header: z.array(z.string()),
  rows: z.array(z.array(z.string())),
});

// Error schemas
export const MongoAtlasErrorSchema = z.object({
  error: z.number().int(),
  errorCode: z.string(),
  detail: z.string(),
  parameters: z.array(z.string()).optional(),
  reason: z.string().optional(),
});

export const AtlasApiErrorResponseSchema = z.object({
  error: z.number().int(),
  errorCode: z.string(),
  detail: z.string(),
  parameters: z.array(z.string()).optional(),
  reason: z.string().optional(),
});

// Rate limiting and pagination schemas
export const PaginationSchema = z.object({
  itemsPerPage: z.number().int(),
  pageNum: z.number().int(),
  totalCount: z.number().int(),
});

export const LinkSchema = z.object({
  href: z.string().url(),
  rel: z.string(),
});

// Billing period and cost allocation schemas
export const BillingCycleSchema = z.object({
  startDate: DateSchema,
  endDate: DateSchema,
  billingPeriod: BillingPeriodEnum,
  prorationFactor: z.number().min(0).max(1).optional(),
});

export const CostAllocationSchema = z.object({
  organizationId: z.string(),
  projectId: z.string(),
  clusterId: z.string().optional(),
  sku: z.string(),
  amount: z.number(),
  unit: z.string().optional(),
  quantity: z.number().optional(),
  date: DateSchema,
  billingPeriod: z.string(),
});

// Types derived from the schemas
export type SkuType = z.infer<typeof SkuTypeEnum>;
export type ClusterTier = z.infer<typeof ClusterTierEnum>;
export type CloudProvider = z.infer<typeof CloudProviderEnum>;
export type Region = z.infer<typeof RegionEnum>;
export type InvoiceStatus = z.infer<typeof InvoiceStatusEnum>;
export type BillingPeriod = z.infer<typeof BillingPeriodEnum>;
export type Granularity = z.infer<typeof GranularityEnum>;
export type MoneyAmount = z.infer<typeof MoneyAmountSchema>;
export type DateFormat = z.infer<typeof DateSchema>;
export type Organization = z.infer<typeof OrganizationSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type ClusterSpec = z.infer<typeof ClusterSpecSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;
export type InvoiceListResponse = z.infer<typeof InvoiceListResponseSchema>;
export type InvoiceLineItem = z.infer<typeof InvoiceLineItemSchema>;
export type GetInvoicesRequest = z.infer<typeof GetInvoicesRequestSchema>;
export type GetInvoiceCsvRequest = z.infer<typeof GetInvoiceCsvRequestSchema>;
export type GetOrganizationsRequest = z.infer<typeof GetOrganizationsRequestSchema>;
export type GetProjectsRequest = z.infer<typeof GetProjectsRequestSchema>;
export type GetClustersRequest = z.infer<typeof GetClustersRequestSchema>;
export type DigestAuth = z.infer<typeof DigestAuthSchema>;
export type MongoAtlasClientConfig = z.infer<typeof MongoAtlasClientConfigSchema>;
export type AtlasApiRequest = z.infer<typeof AtlasApiRequestSchema>;
export type AtlasApiResponse = z.infer<typeof AtlasApiResponseSchema>;
export type ClusterUsageMetrics = z.infer<typeof ClusterUsageMetricsSchema>;
export type AtlasSearchUsage = z.infer<typeof AtlasSearchUsageSchema>;
export type CostQuery = z.infer<typeof CostQuerySchema>;
export type Report = z.infer<typeof ReportSchema>;
export type CsvProcessing = z.infer<typeof CsvProcessingSchema>;
export type MongoAtlasError = z.infer<typeof MongoAtlasErrorSchema>;
export type AtlasApiErrorResponse = z.infer<typeof AtlasApiErrorResponseSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type Link = z.infer<typeof LinkSchema>;
export type BillingCycle = z.infer<typeof BillingCycleSchema>;
export type CostAllocation = z.infer<typeof CostAllocationSchema>;
