import { createExtensionPoint } from '@backstage/backend-plugin-api';
import { ReportParameters } from './service/types';

export interface InfrawalletFilterExtension {
  augmentFilters(parameters: ReportParameters): Promise<ReportParameters>;
}

export interface InfrawalletReportFilterExtensionPoint {
  addReportFilter(filter: InfrawalletFilterExtension): void;
}

export const infrawalletReportFilterExtensionPoint = createExtensionPoint<InfrawalletReportFilterExtensionPoint>({
  id: 'infrawallet.report.filter',
});
