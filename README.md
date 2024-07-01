<h1>
  <img style="height: 1em;" src="./plugins/infrawallet/docs/images/iw_logo.png" alt="logo" title="InfraWallet">
  InfraWallet
</h1>

> Control your cloud costs just in the way how you control your bank accounts

![InfraWallet](./plugins/infrawallet/docs/images/iw_demo.gif)

## Highlights

- Flexible aggregation options for cloud costs across multiple platforms and accounts\*
- Cost categorization for aggregating expenses across different cloud vendors with configurable category mappings
- Swift response times with cached cost data, ensuring rapid access to financial insights fetched from cloud platforms
- Easy configuration and deployment as a Backstage plugin, both frontend and backend plugins are production-ready

\*_The latest version supports AWS, Azure and GCP cost aggregation while the framework is designed to be extensible to support others. Feel free to contribute to the project._

## Getting started

### Define Cloud Accounts in app-config.yaml

The configuration schema of InfraWallet is defined in the [plugins/infrawallet-backend/config.d.ts](plugins/infrawallet-backend/config.d.ts) file. Users need to configure their cloud accounts in the `app-config.yaml` in the root folder.

#### AWS

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

#### Azure

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

#### GCP

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

### Adjust Category Mappings if Needed

The category mappings are stored in the plugin's database. If there is no mapping found in the DB when initializing the plugin, the default mappings will be used. The default mappings can be found in the [plugins/infrawallet-backend/seeds/init.js](plugins/infrawallet-backend/seeds/init.js) file. You can adjust this seed file to fit your needs, or update the database directly later on.

### Install the Plugin

#### If Backstage New Backend System is enabled

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

#### If the legacy Backstage backend system is used

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

## Local Development

First of all, make sure you are using either Node 18 or Node 20 for this project. Your plugin has been added to the example app in this repository, meaning you'll be able to access it by running `yarn install && yarn dev` in the root directory, and then navigating to [/infrawallet](http://localhost:3000/infrawallet).

You can also serve the plugin in isolation by running `yarn start` in the plugin directory.
This method of serving the plugin provides quicker iteration speed and a faster startup and hot reloads.
It is only meant for local development, and the setup for it can be found inside a plugin's `dev` directory (e.g., [plugins/infrawallet/dev](./plugins/infrawallet/dev)).

## How to Support a New Cloud Vendor?

In InfraWallet, all the cost data fetched from different cloud providers are transformed into a generic format:

```typescript
export type Report = {
  id: string; // the unique ID of a cloud account which is defined in the app-config.yaml file
  [dimension: string]: string | { [period: string]: number } | undefined; // other dimensions such as category, service, a tag, etc.
  reports?: {
    [period: string]: number; // the reports which are in the following format ["period": cost], such as ["2024-01": 12.23, "2024-02": 23.21]
  };
};
```

For example, here is a report returned from InfraWallet backend:

```json
{
  "id": "my-aws-dev-account",
  "provider": "aws",
  "category": "Infrastructure",
  "service": "EC2",
  "reports": {
    "2024-01": 12.23,
    "2024-02": 23.21
  }
}
```

The aggregation is done by the frontend after getting all the needed cost reports. This means that as long as the backend returns more cost reports in the same format, InfraWallet can always aggregate and visualize the costs.

When adding a new cloud vendor, you need to implement a client based on the abstract class [InfraWalletClient](plugins/infrawallet-backend/src/service/InfraWalletClient.ts). Check [AwsClient.ts](plugins/infrawallet-backend/src/service/AwsClient.ts) and [AzureClient.ts](plugins/infrawallet-backend/src/service/AzureClient.ts) as examples.

## Roadmap

- [x] Make IAM user optional for AWS credentials
- [x] Support Google Cloud Costs
- [x] Support filters besides grouping bys
- [ ] WebUI for managing category mappings
- [ ] Enable users to select a subset of configured cloud accounts as a wallet
- [ ] Support different currencies
