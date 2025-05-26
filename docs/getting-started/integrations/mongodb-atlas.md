# :simple-mongodb: MongoDB Atlas

To manage MongoDB Atlas costs, you need to create an API key for your Organization with `Organization Billing Viewer` permission, you can find the documentation [here](https://www.mongodb.com/docs/atlas/configure-api-access/#std-label-about-org-api-keys). Once you have your API key details, add the following settings to `app-config.yaml`:

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
