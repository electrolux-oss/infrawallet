## Default Settings for Frontend

Site admins can configure the default view for InfraWallet, including the default group by dimension, and the default
query period. Add the following configurations to your `app-config.yaml` file if the default view needs to be changed.

```yaml
# note that infraWallet exists at the root level, it is not the same one for backend configurations
infraWallet:
  settings:
    defaultGroupBy: none # none by default, or provider, category, service, tag:<tag_key>
    defaultShowLastXMonths: 3 # 3 by default, or other numbers, we recommend it less than 12
```

### Customizing the InfraWalletPage Title and Subtitle

By default, the `InfraWalletPage` component is configured in the `packages/app/src/App.tsx` file as follows:

```ts
<Route path="/infrawallet" element={<InfraWalletPage />} />
```

To customize the title and subtitle of the InfraWalletPage, you can modify the route in the same file as shown below:

```ts
<Route path="/infrawallet" element={<InfraWalletPage title="Custom title" subTitle="Custom subTitle" />} />
```

## Define Cloud Accounts in app-config.yaml

The configuration schema of InfraWallet is defined in the [plugins/infrawallet-backend/config.d.ts](../plugins/infrawallet-backend/config.d.ts) file. Users need to configure their cloud accounts in the `app-config.yaml` in the root folder.

### AWS

For AWS, InfraWallet relies on an IAM role to fetch cost and usage data using AWS Cost Explorer APIs. Thus before adding the configurations, AWS IAM role and policy need to be set up. If you have multiple AWS accounts, you should create a role in each account and configure trust relationships for it. The role to be assumed in an AWS account needs the following permission:

```json
{
  "Statement": [
    {
      "Action": "ce:GetCostAndUsage",
      "Effect": "Allow",
      "Resource": "*",
      "Sid": ""
    }
  ],
  "Version": "2012-10-17"
}
```

After getting the IAM-related resources ready, put the following configuration into `app-config.yaml`:

```yaml
backend:
  infraWallet:
    integrations:
      aws:
        - name: <unique_name_of_this_account>
          accountId: '<12-digit_account_ID>' # quoted as a string
          assumedRoleName: <name_of_the_AWS_IAM_role_to_be_assumed>
          accessKeyId: <access_key_ID_of_AWS_IAM_user_that_assumes_the_role> # optional, only needed when an IAM user is used to assume the role
          accessKeySecret: <access_key_secret_of_AWS_IAM_user_that_assumes_the_role> # optional, only needed when an IAM user is used to assume the role
```

The AWS client in InfraWallet is implemented using AWS SDK for JavaScript. If `accessKeyId` and `accessKeySecret` are defined in the configuration, it uses the configured IAM user to assume the role. Otherwise, the client follows the credential provider chain documented [here](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html#credchain).

### Azure

In order to manage Azure costs, an application needs to be registered on Azure. InfraWallet is only tested with subscription-level cost data. After creating the application, users need to go to the `Subscriptions` page, choose the target subscription and then visit the `Access control (IAM)` page. Assign the `Cost Management Reader` role to the created application. Create a new client secret for the application, and add the following configurations in `app-config.yaml`:

```yaml
backend:
  infraWallet:
    integrations:
      azure:
        - name: <unique_name_of_this_account>
          subscriptionId: <Azure_subscription_ID>
          tenantId: <Azure_tenant_ID>
          clientId: <Client_ID_of_the_created_application>
          clientSecret: <Client_secret_of_the_created_application>
```

### GCP

InfraWallet relies on GCP Big Query to fetch cost data. This means that the billing data needs to be exported to a big query dataset, and a service account needs to be created for InfraWallet. The steps of exporting billing data to Big Query can be found [here](https://cloud.google.com/billing/docs/how-to/export-data-bigquery). Then, visit Google Cloud Console and navigate to the `IAM & Admin` section in the billing account. Click `Service Accounts`, and create a new service account. The service account needs to have `BigQuery Data Viewer` and `BigQuery Job User` roles. On the `Service Accounts` page, click the three dots (menu) in the `Actions` column for the newly created service account and select `Manage keys`. There click `Add key` -> `Create new key`, and use `JSON` as the format. Download the JSON key file and keep it safe.

After setting up the resources above, add the following configurations in `app-config.yaml`:

```yaml
backend:
  infraWallet:
    integrations:
      gcp:
        - name: <unique_name_of_this_account>
          keyFilePath: <path_to_your_json_key_file> # if you run it in a k8s pod, you may need to create a secret and mount it to the pod
          projectId: <GCP_project_that_your_big_query_dataset_belongs_to>
          datasetId: <big_query_dataset_id>
          tableId: <big_query_table_id>
```

### Mongo Atlas

TODO: add doc here.

## Adjust Category Mappings if Needed

The category mappings are stored in the plugin's database. If there is no mapping found in the DB when initializing the plugin, the default mappings will be used. The default mappings can be found in the [plugins/infrawallet-backend/seeds/init.js](../plugins/infrawallet-backend/seeds/init.js) file. You can adjust this seed file to fit your needs, or update the database directly later on.

## Install the Plugin

### If Backstage New Backend System is enabled

1. add InfraWallet frontend

```
# From your Backstage root directory
yarn --cwd packages/app add @electrolux-oss/plugin-infrawallet
```

modify `packages/app/src/App.tsx` and add the following code

```ts
...
import { InfraWalletPage } from '@electrolux-oss/plugin-infrawallet';
...
<FlatRoutes>
    ...
    <Route path="/infrawallet" element={<InfraWalletPage />} />
</FlatRoutes>
...
```

2. add InfraWallet backend

```
# From your Backstage root directory
yarn --cwd packages/backend add @electrolux-oss/plugin-infrawallet-backend
```

modify `packages/backend/src/index.ts` and add the following code before `backend.start()`;

```typescript
...
// InfraWallet backend
backend.add(import('@electrolux-oss/plugin-infrawallet-backend'));
...
backend.start();
```

3. add cloud account credentials to `app-config.yaml`
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

4. add InfraWallet to the sidebar (optional)

modify `packages/app/src/components/Root/Root.tsx` and add the following code

```ts
...
import { InfraWalletIcon } from '@electrolux-oss/plugin-infrawallet';
...
    <Sidebar>
      ...
      <SidebarGroup label="Menu" icon={<MenuIcon />}>
        <SidebarItem
          icon={InfraWalletIcon}
          to="infrawallet"
          text="InfraWallet"
        />
      </SidebarGroup>
      ...
    </Sidebar>
```

### If the legacy Backstage backend system is used

The 2nd step above (adding the backend) is different and it should be like the following.

```
# From your Backstage root directory
yarn --cwd packages/backend add @electrolux-oss/plugin-infrawallet-backend
```

create a file `infrawallet.ts` in folder `packages/backend/src/plugins/` with the following content.

```ts
import { createRouter } from '@electrolux-oss/plugin-infrawallet-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';

export default async function createPlugin(env: PluginEnvironment): Promise<Router> {
  return await createRouter({
    logger: env.logger,
    config: env.config,
    cache: env.cache.getClient(),
    database: env.database,
  });
}
```

then modify `packages/backend/src/index.ts`

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
