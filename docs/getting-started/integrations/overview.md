# Overview

InfraWallet's configuration schema is specified in `plugins/infrawallet-backend/config.d.ts`. To set up provider integrations, users must configure them in the `app-config.yaml` file located in the root directory.

## Autoloading Cost Data and Saving to the Database

!!! info

    This feature is **experimental** and may have breaking changes in the future. We welcome your feedback!

To optimize performance and minimize the number of API calls to cloud providers, InfraWallet includes an automatic background task that periodically fetches cost data from all configured integrations and stores it in the database (`cost_items_daily` and `cost_items_monthly` tables). By default, this autoload task runs every 8 hours.

This mechanism acts as a backend cache: it preloads and persists cost data without any filters (such as AWS cost allocation tags). When a user query includes filters, InfraWallet will still fetch fresh data directly from the cloud provider and cache it in memory, rather than in the database.

By default, this feature is disabled. To enable this feature, add the following configuration to your `app-config.yaml` file:

```yaml
backend:
  infraWallet:
    autoload:
      enabled: true
```

To customize the autoload schedule or delay the initial data fetch after startup, use the following configuration:

```yaml
backend:
  infraWallet:
    autoload:
      enabled: true
      schedule: '0 0 * * *' # midnight
      initialDelayMinutes: 1 # delay by 1 min
```

If you need to reset or refresh historical cost data in the plugin database, you can use the following API endpoints to clear existing data and trigger a reload:

```bash
# for a prod environment, you may need extra headers like an auth token, etc.

# the following call removes the costs data from the database
curl -X POST -d '{"granularity": "monthly", "provider": "AWS"}' --header 'Content-Type: application/json' http://localhost:7007/api/infrawallet/default/delete_cost_items

# the following call triggers the fetch and save cloud costs task immediately
curl http://localhost:7007/api/infrawallet/fetch_and_save_costs
```

## Integration Filter

When integrating InfraWallet with your billing account, you have the ability to retrieve and display costs for all sub-accounts. However, if you want to limit the visibility of certain accounts, you can apply filters. Below is an example of how to configure this for AWS:

```yaml
backend:
  infraWallet:
    integrations:
      aws:
        - name: <unique_name_of_this_integration>
          accountId: '<12-digit_account_ID>' # quoted as a string
          ...
          filters:
            - type: include # 'include' or 'exclude'
              attribute: account
              pattern: <regex_for_account_names> # Use a valid regex pattern to specify accounts
```

Currently, only AWS and Datadog integrations support filters.
