# Developer Guide

## Local Development

First of all, make sure you are using either Node 18 or Node 20 for this project. Your plugin has been added to the example app in this repository, meaning you'll be able to access it by running `yarn install && yarn dev` in the root directory, and then navigating to `http://localhost:3000/infrawallet`.

You can also serve the plugin in isolation by running `yarn start` in the plugin directory.
This method of serving the plugin provides quicker iteration speed and a faster startup and hot reloads.
It is only meant for local development, and the setup for it can be found inside a plugin's `dev` directory (e.g., [plugins/infrawallet/dev](../plugins/infrawallet/dev)).

In case you would like to contribute to the frontend part of InfraWallet, you can use the MockClient for cost data generation and there is no need to have real cloud integrations. To do this you can add the following configuration to your `app-config.local.yaml` file:

```yaml
backend:
  infraWallet:
    integrations:
      mock:
        - name: demo-mock-data
```

### Pre-commit Hook

We use [Husky](https://typicode.github.io/husky/) to set up a pre-commit hook that runs the linter, type checker and
code formatter before committing. Run `git config core.hooksPath .husky` from the root folder of this repo to enable it.

## How to Support a New Cloud Provider?

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

When adding a new cloud vendor, you need to implement a client based on the abstract class [InfraWalletClient](https://github.com/electrolux-oss/infrawallet/blob/main/plugins/infrawallet-backend/src/cost-clients/InfraWalletClient.ts). Check [AwsClient.ts](https://github.com/electrolux-oss/infrawallet/blob/main/plugins/infrawallet-backend/src/cost-clients/AwsClient.ts) and [AzureClient.ts](https://github.com/electrolux-oss/infrawallet/blob/main/plugins/infrawallet-backend/src/cost-clients/AzureClient.ts) as examples.
