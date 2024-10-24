import { DatabaseService } from '@backstage/backend-plugin-api';
import moment from 'moment';

export type CustomCost = {
  id: string; // UUID
  provider: string;
  account: string;
  service?: string;
  category?: string;
  currency: string; // Default to 'USD'
  amortization_mode: string; // average, start_day, or end_day
  usage_month: number; // format YYYYMM
  cost?: number;
  tags?: Record<string, string>; // JSON object with key-value pairs
};

// Create a new cost record
export async function createCustomCost(database: DatabaseService, data: Omit<CustomCost, 'id'>): Promise<CustomCost> {
  const knex = await database.getClient();
  const [record] = await knex('custom_costs').insert(data).returning('*');
  return record;
}

// Create multiple cost records
export async function createCustomCosts(database: DatabaseService, data: Omit<CustomCost, 'id'>[]): Promise<number> {
  const knex = await database.getClient();
  const records = await knex('custom_costs').insert(data).returning('id');
  return records.length;
}

// Get cost records by date range
export async function getCustomCostsByDateRange(
  database: DatabaseService,
  startDate: Date,
  endDate: Date,
): Promise<CustomCost[]> {
  const knex = await database.getClient();

  const records = await knex('custom_costs')
    .whereBetween('usage_month', [
      parseInt(moment(startDate).format('YYYYMM'), 10),
      parseInt(moment(endDate).format('YYYYMM'), 10),
    ])
    .select('*');

  return records;
}

// Get all cost records
export async function getCustomCosts(database: DatabaseService): Promise<CustomCost[]> {
  const knex = await database.getClient();
  const records = await knex('custom_costs').select('*');
  return records;
}

// Update one cost record
export async function updateOrInsertCustomCost(database: DatabaseService, data: CustomCost): Promise<CustomCost> {
  const knex = await database.getClient();
  const [record] = await knex('custom_costs').insert(data).onConflict('id').merge().returning('*');
  return record;
}

// Delete one cost record
export async function deleteCustomCost(database: DatabaseService, data: CustomCost): Promise<boolean> {
  const knex = await database.getClient();
  const result: number = await knex('custom_costs').where('id', data.id).del();

  if (result > 0) {
    return true;
  }

  return false;
}
