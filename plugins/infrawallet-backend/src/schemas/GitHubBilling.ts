import { z } from 'zod';

export const GitHubUsageItemSchema = z.object({
  date: z.string(),
  product: z.string(),
  sku: z.string(),
  quantity: z.number(),
  unitType: z.string(),
  pricePerUnit: z.number(),
  grossAmount: z.number(),
  discountAmount: z.number(),
  netAmount: z.number(),
  organizationName: z.string(),
  repositoryName: z.string().optional(),
});

export const GitHubBillingResponseSchema = z.object({
  usageItems: z.array(GitHubUsageItemSchema),
});

export const GitHubBillingErrorSchema = z.object({
  message: z.string(),
  documentation_url: z.string().optional(),
});

export type GitHubUsageItem = z.infer<typeof GitHubUsageItemSchema>;
export type GitHubBillingResponse = z.infer<typeof GitHubBillingResponseSchema>;
export type GitHubBillingError = z.infer<typeof GitHubBillingErrorSchema>;
