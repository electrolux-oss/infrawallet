# :material-microsoft: Azure

To manage Azure costs with InfraWallet, you need to register an application in Azure. Note that InfraWallet has been tested with subscription-level cost data only.

## Steps

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
