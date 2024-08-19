import { createBackendModule } from '@backstage/backend-plugin-api';
import { BackstageIdentityResponse } from '@backstage/plugin-auth-node';
import {
  AuthorizeResult,
  isPermission,
  PolicyDecision,
} from '@backstage/plugin-permission-common';
import {
  PermissionPolicy,
  PolicyQuery,
} from '@backstage/plugin-permission-node';
import { policyExtensionPoint } from '@backstage/plugin-permission-node/alpha';
import {
  infraWalletReportRead,
  infraWalletMetricSettingsDelete
} from '@electrolux-oss/plugin-infrawallet-common';

class DefaultPermissionPolicy implements PermissionPolicy {

  async handle(
    request: PolicyQuery,
    _user?: BackstageIdentityResponse,
  ): Promise<PolicyDecision> {

    // if you do not configure any infrawallet permissions, the default behavior is allow.

    // Example deny read report
    if (isPermission(request.permission, infraWalletReportRead)) {
        return { result: AuthorizeResult.DENY };
    }

    // Example deny delete metric settings
    if (isPermission(request.permission, infraWalletMetricSettingsDelete)) {
        return { result: AuthorizeResult.DENY };
    }

    return { result: AuthorizeResult.ALLOW };
  }
}

export default createBackendModule({
  pluginId: 'permission',
  moduleId: 'defaultPolicy',
  register(env) {
    env.registerInit({
      deps: {
        policy: policyExtensionPoint,
      },
      async init({ policy }) {
        policy.setPolicy(new DefaultPermissionPolicy());
      },
    });
  },
});