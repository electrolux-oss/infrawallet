# :simple-elasticcloud: Elastic Cloud

InfraWallet supports integration with Elastic Cloud, enabling you to track and analyze your Elastic Cloud usage and costs.

## Prerequisites

- You must have access to your Elastic Cloud account.
- An Elastic Cloud API key with sufficient permissions to access billing and usage data.
- Your Elastic Cloud organization ID.

## Configuration

Add your Elastic Cloud integration in your `app-config.yaml`:

```yaml
backend:
  infraWallet:
    integrations:
      elasticcloud:
        - name: <unique_name>
          apiKey: <your_elastic_cloud_api_key>
          organizationId: <your_elastic_cloud_organization_id>
```
