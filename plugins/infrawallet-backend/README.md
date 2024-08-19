# InfraWallet Backend

Welcome to the infrawallet backend plugin!

## Installation

### Install the package

```
# From your Backstage root directory
yarn --cwd packages/backend add @electrolux-oss/plugin-infrawallet-backend
```

### Adding the plugin to your `packages/backend`

Modify `packages/backend/src/index.ts` and add the following code before `backend.start()`;

```typescript
...
// InfraWallet backend
backend.add(import('@electrolux-oss/plugin-infrawallet-backend'));
...
backend.start();
```

### If the legacy Backstage backend system is used

You'll need to add the plugin to the router in your backend package. You can do this by creating a file called `infrawallet.ts` in folder `packages/backend/src/plugins/` with the following content:

```ts
import { createRouter } from '@electrolux-oss/plugin-infrawallet-backend';
import { Router } from 'express';
import { PluginEnvironment } from './types';

export default async function createPlugin(env: PluginEnvironment): Promise<Router> {
  return await createRouter({
    logger: env.logger,
    config: env.config,
    cache: env.cache.getClient(),
    database: env.database,
    discovery: env.discovery,
    permissions: env.permissions
  });
}
```

Then modify `packages/backend/src/index.ts`

```ts
...
import infraWallet from './plugins/infrawallet';
...
async function main() {
  ...
  const infraWalletEnv = useHotMemoize(module, () => createEnv('infrawallet'));
  ...
  apiRouter.use('/infrawallet', authMiddleware, await infraWallet(infraWalletEnv));
  ...
}
```

### Backend Configuration

#### Cloud Accounts

Add cloud account credentials to `app-config.yaml`.
Here is an example of the configuration for AWS and Azure accounts:

```yaml
backend:
  infraWallet:
    integrations:
      azure:
        - name: <unique_name_of_this_account>
          subscriptionId: ...
          tenantId: ...
          clientId: ...
          clientSecret: ...
        - name: <unique_name_of_this_account>
          subscriptionId: ...
          tenantId: ...
          clientId: ...
          clientSecret: ...
      aws:
        - name: <unique_name_of_this_account>
          accountId: '<12-digit_account_ID_as_string>'
          assumedRoleName: ...
          accessKeyId: ...
          accessKeySecret: ...
        - name: <unique_name_of_this_account>
          accountId: '<12-digit_account_ID_as_string>'
          assumedRoleName: ...
          accessKeyId: ...
          accessKeySecret: ...
```

#### Setting up plugin permissions

You configure permissions for specific infrawallet actions by importing the supported set of permissions from the [infrawallet-common](../infrawallet-common/README.md) package along with the custom rules/conditions provided here to incorporate into your [permission policy](https://backstage.io/docs/permissions/writing-a-policy).

This package also exports a DefaultInfraWalletPermissionPolicy which contains a recommended default permissions policy you can apply as a "sub-policy" in your app:

```diff
# packages/backend/src/plugins/permission.ts

+import { DefaultInfraWalletPermissionPolicy, isInfraWalletPermission } from '@electrolux-oss/plugin-infrawallet-backend';
...
class BackstagePermissionPolicy implements PermissionPolicy {
+  private playlistPermissionPolicy = new DefaultInfraWalletPermissionPolicy();

  async handle(
    request: PolicyQuery,
    user?: BackstageIdentityResponse,
  ): Promise<PolicyDecision> {
+    if (isInfraWalletPermission(request.permission)) {
+      return this.playlistPermissionPolicy.handle(request, user);
+    }
    ...
  }
}

export default async function createPlugin(env: PluginEnvironment): Promise<Router> {
  return await createRouter({
    config: env.config,
    logger: env.logger,
    discovery: env.discovery,
    policy: new BackstagePermissionPolicy(),
    ...
```