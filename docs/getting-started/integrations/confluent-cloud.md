# Confluent Cloud

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
