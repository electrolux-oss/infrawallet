import { createPermission } from '@backstage/plugin-permission-common';

/**
 * @public
 */
export const infraWalletReportRead = createPermission({
  name: 'infrawallet.report.read',
  attributes: { action: 'read' },
});

/**
 * @public
 */
export const infraWalletMetricSettingsRead = createPermission({
  name: 'infrawallet.metric.settings.read',
  attributes: { action: 'read' },
});

/**
 * @public
 */
export const infraWalletMetricSettingsCreate = createPermission({
  name: 'infrawallet.metric.settings.create',
  attributes: { action: 'create' },
});

/**
 * @public
 */
export const infraWalletMetricSettingsUpdate = createPermission({
  name: 'infrawallet.metric.settings.update',
  attributes: { action: 'update' },
});

/**
 * @public
 */
export const infraWalletMetricSettingsDelete = createPermission({
  name: 'infrawallet.metric.settings.delete',
  attributes: { action: 'delete' },
});

/**
 * List of all permissions
 *
 * @public
 */
export const permissions = {
  infraWalletReportRead,
  infraWalletMetricSettingsRead,
  infraWalletMetricSettingsCreate,
  infraWalletMetricSettingsUpdate,
  infraWalletMetricSettingsDelete,
};
