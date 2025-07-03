# :simple-datadog: Datadog

To manage Datadog costs, you need to create an API key and an Application Key for your Organization, or [Parent Organization](https://docs.datadoghq.com/account_management/multi_organization/) (if you have Multiple-Organization Accounts), with `usage_read` and `billing_read` permissions. You can find the documentation [here](https://docs.datadoghq.com/account_management/api-app-keys/). Add the following settings to `app-config.yaml`:

```yaml
backend:
  infraWallet:
    integrations:
      datadog:
        - name: <unique_name_of_this_integration>
          apiKey: <your_api_key>
          applicationKey: <your_application_key>
          ddSite: <your_site> # e.g. https://api.datadoghq.eu
```

Datadog doesn't provide daily costs. Current daily costs are calculated by `monthly costs/number of days in that month`.
