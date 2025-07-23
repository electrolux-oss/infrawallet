import { createExtensionPoint } from '@backstage/backend-plugin-api';
import { CloudProviderError, Report, ReportParameters } from './service/types';

export interface InfrawalletReportCollector {
  collectReports(
    entityNamespace: string,
    entityName: string,
    queryParameters: ReportParameters,
  ): Promise<{ reports: Report[]; clientErrors: CloudProviderError[] }>;
}

export interface InfrawalletEntityReportExtensionPoint {
  addReportCollector(collector: InfrawalletReportCollector): void;
}

export const infrawalletEntityReportExtensionPoint = createExtensionPoint<InfrawalletEntityReportExtensionPoint>({
  id: 'infrawallet.entity.report',
});
