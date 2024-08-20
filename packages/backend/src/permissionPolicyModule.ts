import { createBackendModule } from '@backstage/backend-plugin-api';
import { BackstageIdentityResponse } from '@backstage/plugin-auth-node';
import { AuthorizeResult, isPermission, PolicyDecision } from '@backstage/plugin-permission-common';
import { PermissionPolicy, PolicyQuery } from '@backstage/plugin-permission-node';
import { policyExtensionPoint } from '@backstage/plugin-permission-node/alpha';
import { infraWalletReportRead } from '@electrolux-oss/plugin-infrawallet-common';

class DefaultPermissionPolicy implements PermissionPolicy {
  async handle(request: PolicyQuery, _user?: BackstageIdentityResponse): Promise<PolicyDecision> {
    // Example deny read report
    if (isPermission(request.permission, infraWalletReportRead)) {
      return { result: AuthorizeResult.ALLOW };
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
