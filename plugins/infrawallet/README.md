# InfraWallet

> Control your cloud costs just in the way how you control your bank accounts

![InfraWallet](./docs/images/iw_demo.gif)

## Highlights

- Flexible aggregation options for cloud costs across multiple platforms and accounts\*
- Cost categorization for aggregating expenses across different cloud vendors with configurable category mappings
- Swift response times with cached cost data, ensuring rapid access to financial insights fetched from cloud platforms
- Easy configuration and deployment as a Backstage plugin, both frontend and backend plugins are production-ready

\*_The latest version supports AWS, Azure and GCP cost aggregation while the framework is designed to be extensible to support others. Feel free to contribute to the project._

## Getting started

### Default Settings for Frontend

Site admins can configure the default view for InfraWallet, including the default group by dimension, and the default
query period. Add the following configurations to your `app-config.yaml` file if the default view needs to be changed.

```yaml
# note that infraWallet exists at the root level, it is not the same one for backend configurations
infraWallet:
  settings:
    defaultGroupBy: none # none by default, or account, provider, category, service, tag:<tag_key>
    defaultShowLastXMonths: 3 # 3 by default, or other numbers, we recommend it less than 12
```

#### Customizing the InfraWalletPage Title and Subtitle

By default, the `InfraWalletPage` component is configured in the `packages/app/src/App.tsx` file as follows:

```ts
<Route path="/infrawallet" element={<InfraWalletPage />} />
```

To customize the title and subtitle of the InfraWalletPage, you can modify the route in the same file as shown below:

```ts
<Route path="/infrawallet" element={<InfraWalletPage title="Custom title" subTitle="Custom subTitle" />} />
```

### Defining Provider Integrations

InfraWallet's configuration schema is specified in in [plugins/infrawallet-backend/config.d.ts](../infrawallet-backend/config.d.ts). To set up provider integrations, users must configure them in the `app-config.yaml` file located in the root directory.

#### AWS Integration

InfraWallet uses an IAM role to retrieve cost and usage data via the AWS Cost Explorer APIs. Before configuring InfraWallet, you must set up the necessary AWS IAM role and policy.

##### For Management Accounts

If you have a [management account](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_getting-started_concepts.html#management-account), this setup only needs to be done once within the management account. InfraWallet will then be able to retrieve cost data across all [member accounts](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_getting-started_concepts.html#member-account).

##### For Non-Management Accounts

If you're not using a [management account](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_getting-started_concepts.html#management-account), you'll need to create a role in each AWS account and configure trust relationships individually.

##### Required IAM Role Permissions

The IAM role must have the following permissions to access cost and usage data:

```json
{
  "Statement": [
    {
      "Action": ["ce:GetCostAndUsage", "ce:GetTags"],
      "Effect": "Allow",
      "Resource": "*",
      "Sid": ""
    }
  ],
  "Version": "2012-10-17"
}
```

##### Configuration

Once the IAM roles and policies are in place, add the following configuration to your `app-config.yaml` file:

```yaml
backend:
  infraWallet:
    integrations:
      aws:
        - name: <unique_name_of_this_integration>
          accountId: '<12-digit_account_ID>' # quoted as a string
          assumedRoleName: <name_of_the_AWS_IAM_role_to_be_assumed>
          accessKeyId: <access_key_ID_of_AWS_IAM_user_that_assumes_the_role> # optional, only needed when an IAM user is used to assume the role
          accessKeySecret: <access_key_secret_of_AWS_IAM_user_that_assumes_the_role> # optional, only needed when an IAM user is used to assume the role
```

InfraWallet's AWS client is built using the AWS SDK for JavaScript. If both `accessKeyId` and `accessKeySecret` are provided in the configuration, the client will use the specified IAM user to assume the role. Otherwise, it follows the [default credential provider chain](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html#credchain).

#### Azure Integration

To manage Azure costs with InfraWallet, you need to register an application in Azure. Note that InfraWallet has been tested with subscription-level cost data only.

##### Steps:

1. After registering the application, navigate to the `Subscriptions` page and select the target subscription.
2. Go to the `Access control (IAM)` section and assign the `Cost Management Reader` role to the newly created application.
3. Generate a client secret for the application.

Add the following configurations to your `app-config.yaml` file:

```yaml
backend:
  infraWallet:
    integrations:
      azure:
        - name: <unique_name_of_this_integration>
          subscriptionId: <Azure_subscription_ID>
          tenantId: <Azure_tenant_ID>
          clientId: <Client_ID_of_the_created_application>
          clientSecret: <Client_secret_of_the_created_application>
```

#### GCP Integration

InfraWallet relies on GCP Big Query to fetch cost data. This means that the billing data needs to be exported to a big query dataset, and a service account needs to be created for InfraWallet. The steps of exporting billing data to Big Query can be found [here](https://cloud.google.com/billing/docs/how-to/export-data-bigquery). Then, visit Google Cloud Console and navigate to the `IAM & Admin` section in the billing account. Click `Service Accounts`, and create a new service account. The service account needs to have `BigQuery Data Viewer` and `BigQuery Job User` roles. On the `Service Accounts` page, click the three dots (menu) in the `Actions` column for the newly created service account and select `Manage keys`. There click `Add key` -> `Create new key`, and use `JSON` as the format. Download the JSON key file and keep it safe.

After setting up the resources above, add the following configurations in `app-config.yaml`:

```yaml
backend:
  infraWallet:
    integrations:
      gcp:
        - name: <unique_name_of_this_integration>
          keyFilePath: <path_to_your_json_key_file> # if you run it in a k8s pod, you may need to create a secret and mount it to the pod
          projectId: <GCP_project_that_your_big_query_dataset_belongs_to>
          datasetId: <big_query_dataset_id>
          tableId: <big_query_table_id>
```

#### Confluent Cloud Integration

To manage Confluent Cloud costs, you need to create an API key (Service account) for your Organization with the 'Cloud resource management' resource scope, you can find the documentation [here](https://docs.confluent.io/cloud/current/security/authenticate/workload-identities/service-accounts/api-keys/manage-api-keys.html#add-an-api-key). Once you have your API key details, add the following settings to `app-config.yaml`:

```yaml
backend:
  infraWallet:
    integrations:
      confluent:
        - name: <unique_name_of_this_integration>
          apiKey: <your_api_key>
          apiSecret: <your_api_key_secret>
```

#### MongoDB Atlas Integration

To manage Mongo Atlas costs, you need to create an API key for your Organization with `Organization Billing Viewer` permission, you can find the documentation [here](https://www.mongodb.com/docs/atlas/configure-api-access/#std-label-about-org-api-keys). Once you have your API key details, add the following settings to `app-config.yaml`:

```yaml
backend:
  infraWallet:
    integrations:
      mongoatlas:
        - name: <unique_name_of_this_integration>
          orgId: <id_organization_mongo_atlas>
          publicKey: <public_key_of_your_api_key>
          privateKey: <private_key_of_your_api_key>
```

### Adjust Category Mappings if Needed

The category mappings are stored in the plugin's database. If there is no mapping found in the DB when initializing the plugin, the default mappings will be used. The default mappings can be found in the [plugins/infrawallet-backend/seeds/init.js](../infrawallet-backend/seeds/init.js) file. You can adjust this seed file to fit your needs, or update the database directly later on.

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

You can also serve the plugin in isolation by running `yarn install && yarn start` in the plugin directory.
This method of serving the plugin provides quicker iteration speed and a faster startup and hot reloads.
It is only meant for local development, and the setup for it can be found inside the [/dev](./dev) directory.

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

When adding a new cloud vendor, you need to implement a client based on the abstract class [InfraWalletClient](../infrawallet-backend/src/service/InfraWalletClient.ts). Check [AwsClient.ts](../infrawallet-backend/src/service/AwsClient.ts) and [AzureClient.ts](../infrawallet-backend/src/service/AzureClient.ts) as examples.

## Roadmap

- [x] Make IAM user optional for AWS credentials
- [x] Support Google Cloud Costs
- [x] Support filters besides grouping bys
- [ ] WebUI for managing category mappings
- [ ] Enable users to select a subset of configured cloud accounts as a wallet
- [ ] Support different currencies
