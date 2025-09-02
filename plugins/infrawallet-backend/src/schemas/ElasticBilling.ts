import { z } from 'zod';

export const DisplayQuantityTypeEnum = z.enum(['default', 'normalized']);

export const DisplayQuantitySchema = z.object({
  formatted_value: z.string(),
  type: DisplayQuantityTypeEnum,
  value: z.number(),
});

export const QuantitySchema = z.object({
  formatted_value: z.string(),
  value: z.number(),
});

export const RateSchema = z.object({
  formatted_value: z.string(),
  value: z.number(),
});

export const ProductLineItemTierSchema = z.object({
  min: z.number().int(),
  max: z.number().int().nullable(),
  total_ecu: z.number(),
  quantity: QuantitySchema,
  rate: RateSchema,
});

export const ProductLineItemQuantitySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  total_ecu: z.number(),
  rate: RateSchema,
  tiers: z.array(ProductLineItemTierSchema),
  quantity: QuantitySchema.optional(),
});

export const ProductLineItemSchema = z.object({
  name: z.string(),
  total_ecu: z.number(),
  type: z.string(),
  sku: z.string(),
  unit: z.string(),
  quantity: QuantitySchema,
  display_quantity: DisplayQuantitySchema,
  rate: RateSchema,
  kind: z.string().nullable().optional(),
  quantities: z.array(ProductLineItemQuantitySchema),
});

export const ProductSchema = z.object({
  total_ecu: z.number(),
  type: z.string(),
  product_line_items: z.array(ProductLineItemSchema),
});

export const InstanceSchema = z.object({
  id: z.string(),
  name: z.string(),
  total_ecu: z.number(),
  type: z.string(),
  product_line_items: z.array(ProductLineItemSchema),
});

// Response Schemas
export const ItemsResponseSchema = z.object({
  total_ecu: z.number(),
  products: z.array(ProductSchema),
});

export const InstancesResponseSchema = z.object({
  total_ecu: z.number(),
  instances: z.array(InstanceSchema),
});

export const ChartValueSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  type: z.string().optional(),
  value: z.number().optional(),
});

export const ChartItemSchema = z.object({
  timestamp: z.number().int(),
  values: z.array(ChartValueSchema).optional().default([]),
});

export const ChartsResponseSchema = z.object({
  data: z.array(ChartItemSchema),
});

// Request Schemas
export const BucketingStrategyEnum = z.enum(['daily', 'monthly']);
export const InstanceTypeEnum = z.enum(['all', 'deployments', 'projects']);
export const ServerlessGroupByEnum = z.enum(['product', 'product_family']);

export const GetChartsRequestSchema = z.object({
  from: z.string(),
  to: z.string(),
  bucketing_strategy: BucketingStrategyEnum.optional(),
});

export const GetChartsByInstanceRequestSchema = z.object({
  from: z.string(),
  to: z.string(),
  bucketing_strategy: BucketingStrategyEnum.optional(),
  instance_type: InstanceTypeEnum.optional(),
});

export const GetCostsByInstancesRequestSchema = z.object({
  from: z.string(),
  to: z.string(),
  include_names: z.boolean().optional(),
});

export const GetItemizedCostsByInstanceRequestSchema = z.object({
  from: z.string(),
  to: z.string(),
});

export const GetCostsByItemsRequestSchema = z.object({
  from: z.string(),
  to: z.string(),
  serverless_group_by: ServerlessGroupByEnum.optional(),
});

// Error Schemas
export const UnauthorizedErrorSchema = z.string();

// Types derived from the schemas
export type DisplayQuantityType = z.infer<typeof DisplayQuantityTypeEnum>;
export type DisplayQuantity = z.infer<typeof DisplayQuantitySchema>;
export type Quantity = z.infer<typeof QuantitySchema>;
export type Rate = z.infer<typeof RateSchema>;
export type ProductLineItemTier = z.infer<typeof ProductLineItemTierSchema>;
export type ProductLineItemQuantity = z.infer<typeof ProductLineItemQuantitySchema>;
export type ProductLineItem = z.infer<typeof ProductLineItemSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type Instance = z.infer<typeof InstanceSchema>;
export type Items = z.infer<typeof ItemsResponseSchema>;
export type Instances = z.infer<typeof InstancesResponseSchema>;
export type ChartValue = z.infer<typeof ChartValueSchema>;
export type ChartItem = z.infer<typeof ChartItemSchema>;
export type ChartsResponse = z.infer<typeof ChartsResponseSchema>;
export type BucketingStrategy = z.infer<typeof BucketingStrategyEnum>;
export type InstanceType = z.infer<typeof InstanceTypeEnum>;
export type ServerlessGroupBy = z.infer<typeof ServerlessGroupByEnum>;
export type GetChartsRequest = z.infer<typeof GetChartsRequestSchema>;
export type GetChartsByInstanceRequest = z.infer<typeof GetChartsByInstanceRequestSchema>;
export type GetCostsByInstancesRequest = z.infer<typeof GetCostsByInstancesRequestSchema>;
export type GetItemizedCostsByInstanceRequest = z.infer<typeof GetItemizedCostsByInstanceRequestSchema>;
export type GetCostsByItemsRequest = z.infer<typeof GetCostsByItemsRequestSchema>;
