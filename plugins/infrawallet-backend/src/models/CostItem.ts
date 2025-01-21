import { DatabaseService } from '@backstage/backend-plugin-api';
import { Report } from '../service/types';

// TODO: add a granularity field to the table, query both daily and monthly costs directly from the cloud
export type CostItem = {
  id: number; // auto-incrementing ID
  wallet_id: string;
  key: string;
  account: string;
  service: string;
  category: string;
  provider: string;
  usage_date: number; // format YYYYMMDD
  other_columns: Record<string, string>; // example: {"cluster":"value_a", "project":"value_b"}
  // If Postgres is used, the column type is decimal but Knex gets the values as strings
  // see https://stackoverflow.com/questions/45569216/knex-postgres-returns-strings-for-numeric-decimal-values
  cost: number | string;
};

// Count cost items in a specific wallet
export async function countCostItems(
  database: DatabaseService,
  walletId: string,
  provider: string,
  granularity: string,
  startUsageDate?: number,
  endUsageDate?: number,
): Promise<number> {
  const knex = await database.getClient();

  let records = undefined;
  if (startUsageDate && endUsageDate) {
    records = await knex(`cost_items_${granularity}`)
      .where({ wallet_id: walletId, provider: provider })
      .andWhereBetween('usage_date', [startUsageDate, endUsageDate])
      .count({ count: '*' });
  } else {
    records = await knex(`cost_items_${granularity}`)
      .where({ wallet_id: walletId, provider: provider })
      .count({ count: '*' });
  }

  if (records) {
    return parseInt(records[0].count as string, 10);
  }

  return 0;
}

// Delete cost items of a provider in a specific wallet
export async function deleteCostItems(
  database: DatabaseService,
  walletId: string,
  provider: string,
  granularity: string,
): Promise<number> {
  const knex = await database.getClient();

  const rowsDeleted = await knex(`cost_items_${granularity}`).where({ wallet_id: walletId, provider: provider }).del();

  return rowsDeleted;
}

// Get all cost items in a specific wallet
export async function getCostItems(
  database: DatabaseService,
  walletId: string,
  provider: string,
  granularity: string,
  startUsageDate: number,
  endUsageDate: number,
): Promise<CostItem[]> {
  const knex = await database.getClient();

  const records = await knex<CostItem>(`cost_items_${granularity}`)
    .where({ wallet_id: walletId, provider: provider })
    .andWhereBetween('usage_date', [startUsageDate, endUsageDate])
    .select('*');

  return records;
}

// bulk insert cost reports to the table
export async function bulkInsertCostItems(
  database: DatabaseService,
  walletId: string,
  provider: string,
  granularity: string,
  startUsageDate: number,
  endUsageDate: number,
  reports: Report[],
): Promise<void> {
  const knex = await database.getClient();

  // clean up the records
  await knex(`cost_items_${granularity}`)
    .where({ wallet_id: walletId, provider: provider })
    .andWhereBetween('usage_date', [startUsageDate, endUsageDate])
    .del();

  // transform the records
  const rows: Omit<CostItem, 'id'>[] = [];
  const genericFieldsInReports = ['id', 'account', 'service', 'category', 'provider', 'providerType', 'reports'];
  reports.forEach(report => {
    for (const [period, cost] of Object.entries(report.reports)) {
      const usageDate = parseInt(period.replaceAll('-', ''), 10);
      if (usageDate >= startUsageDate && usageDate <= endUsageDate) {
        // for the fields that are not included by the feneric fields list
        // they will be added into the `other_columns` column in db
        const otherColumns: { [key: string]: any } = {};
        for (const key in report) {
          if (!genericFieldsInReports.includes(key)) {
            otherColumns[key] = report[key];
          }
        }
        rows.push({
          wallet_id: walletId,
          key: report.id,
          account: report.account,
          service: report.service,
          category: report.category,
          provider: report.provider,
          usage_date: usageDate,
          other_columns: otherColumns,
          cost: cost,
        });
      }
    }
  });

  // bulk insert the records
  await knex
    .batchInsert(`cost_items_${granularity}`, rows)
    .then(() => {
      console.log(`${reports.length} ${granularity} records have been inserted`);
    })
    .catch(error => {
      console.error('Error inserting rows:', error);
    });
}
