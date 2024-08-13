import { DatabaseService } from '@backstage/backend-plugin-api';
import { MetricSetting, Wallet } from '../service/types';

export async function getWallet(database: DatabaseService, walletName: string): Promise<Wallet | undefined> {
  const client = await database.getClient();
  const result = await client<Wallet>('wallets').where('name', walletName).first();

  return result;
}

export async function getWalletMetricSettings(database: DatabaseService, walletName: string): Promise<MetricSetting[]> {
  const client = await database.getClient();

  const metricSettings = await client
    .select('business_metrics.*')
    .from<MetricSetting>('business_metrics')
    .where('wallets.name', walletName)
    .join('wallets', 'business_metrics.wallet_id', '=', 'wallets.id');

  return metricSettings;
}

export async function updateOrInsertWalletMetricSetting(
  database: DatabaseService,
  walletSetting: MetricSetting,
): Promise<boolean> {
  const client = await database.getClient();
  const result: number[] = await client('business_metrics').insert(walletSetting).onConflict('id').merge();

  if (result[0] > 0) {
    return true;
  }

  return false;
}

export async function deleteWalletMetricSetting(
  database: DatabaseService,
  walletSetting: MetricSetting,
): Promise<boolean> {
  const client = await database.getClient();
  const result: number = await client('business_metrics').where('id', walletSetting.id).del();

  if (result > 0) {
    return true;
  }

  return false;
}
