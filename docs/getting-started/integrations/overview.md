# Overview

InfraWallet's configuration schema is specified in `plugins/infrawallet-backend/config.d.ts`. To set up provider integrations, users must configure them in the `app-config.yaml` file located in the root directory.

## Autoloading Cost Data and Saving Them Into the Database

In order to improve the performance and reduce the number of calls to the cloud providers, by default, for all the integrations, there is a scheduled task in the InfraWallet backend that queries the cost data from the cloud provider APIs and saves them into the database (tables `cost_items_daily` and `cost_items_monthly`). The default interval for this task is 8 hours which will be made configurable in the future. It is recommended to have a value that is larger or equal to 8 because most of the cloud providers do not update the cost data very frequently. This feature works similarly as caching but it only autloads the costs data without any filters (such as a cost allocation tag filter in AWS). If a query contains such a filter condition, InfraWallet still makes API calls to the cloud and then caches the data in memory isntead of the database.

If you want to disable this feature, for example, when you run a local development environment with a Sqlite3 database, you can add the following configuration to your `app-config.yaml` file:

```yaml
backend:
  infraWallet:
    autoload:
      enabled: false
```

If you want to set your own cron or defer the initial pull on startup

```yaml
backend:
  infraWallet:
    autoload:
      schedule: '0 0 * * *' # midnight
      initialDelayMinutes: 1 # delay by 1 min
```

If there is an issue about the historical data in the plugin database, you can use the following two APIs to clean up
the data and reload the data.

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
