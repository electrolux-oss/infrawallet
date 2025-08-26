import { z } from 'zod';

export const MongoAtlasInvoiceSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  salesTaxCents: z.number().optional(),
  subtotalCents: z.number().optional(),
  totalCents: z.number().optional(),
  statusName: z.string().optional(),
  created: z.string().optional(),
  updated: z.string().optional(),
  amountBilledCents: z.number().optional(),
  amountPaidCents: z.number().optional(),
  creditsCents: z.number().optional(),
  endDate: z.string().optional(),
  startDate: z.string().optional(),
  linkedInvoices: z.array(z.string()).optional(),
  payments: z
    .array(
      z.object({
        amountCents: z.number(),
        created: z.string(),
        id: z.string(),
        statusName: z.string(),
        updated: z.string(),
      }),
    )
    .optional(),
});

export const MongoAtlasInvoicesResponseSchema = z.object({
  links: z
    .array(
      z.object({
        href: z.string(),
        rel: z.string(),
      }),
    )
    .optional(),
  results: z.array(MongoAtlasInvoiceSchema),
  totalCount: z.number().optional(),
});

export const MongoAtlasCSVLineItemSchema = z.object({
  'Organization ID': z.string(),
  'Organization Name': z.string(),
  'Project ID': z.string(),
  'Project Name': z.string(),
  'Cluster Name': z.string().optional(),
  'Cluster Type': z.string().optional(),
  SKU: z.string(),
  Description: z.string(),
  'Start Date': z.string(),
  'End Date': z.string(),
  Quantity: z.string().transform(Number),
  'Unit of Measure': z.string(),
  'Unit Price': z.string().transform(Number),
  'Total Price': z.string().transform(Number),
  'Additional Info': z.string().optional(),
});

export const MongoAtlasInvoicesRequestSchema = z.object({
  orgId: z.string(),
  fromDate: z.string(),
  toDate: z.string(),
});

export const MongoAtlasCSVRequestSchema = z.object({
  orgId: z.string(),
  invoiceId: z.string(),
});

export const MongoAtlasBillingErrorSchema = z.object({
  detail: z.string().optional(),
  error: z.number().optional(),
  errorCode: z.string().optional(),
  parameters: z.record(z.string()).optional(),
  reason: z.string().optional(),
});

export type MongoAtlasInvoice = z.infer<typeof MongoAtlasInvoiceSchema>;
export type MongoAtlasInvoicesResponse = z.infer<typeof MongoAtlasInvoicesResponseSchema>;
export type MongoAtlasCSVLineItem = z.infer<typeof MongoAtlasCSVLineItemSchema>;
export type MongoAtlasInvoicesRequest = z.infer<typeof MongoAtlasInvoicesRequestSchema>;
export type MongoAtlasCSVRequest = z.infer<typeof MongoAtlasCSVRequestSchema>;
export type MongoAtlasBillingError = z.infer<typeof MongoAtlasBillingErrorSchema>;
