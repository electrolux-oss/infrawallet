import { createExtensionPoint } from '@backstage/backend-plugin-api';
import { CloudProviderError, Report, Tag } from './service/types';

export interface InfrawalletReportCollector {
  collectReports(
    entityNamespace: string,
    entityName: string,
    filters: string,
    tags: Tag[],
    groups: string,
    granularityString: string,
    startTime: string,
    endTime: string,
  ): Promise<{ reports: Report[]; clientErrors: CloudProviderError[] }>;
}

export interface InfrawalletEntityReportExtensionPoint {
  addReportCollector(collector: InfrawalletReportCollector): void;
}

export const infrawalletEntityReportExtensionPoint = createExtensionPoint<InfrawalletEntityReportExtensionPoint>({
  id: 'infrawallet.entity.report',
});
