# Google Cloud

InfraWallet relies on GCP Big Query to fetch cost data. This means that the billing data needs to be exported to a big query dataset, and a service account needs to be created for InfraWallet. The steps of exporting billing data to Big Query can be found [here](https://cloud.google.com/billing/docs/how-to/export-data-bigquery). Then, visit Google Cloud Console and navigate to the `IAM & Admin` section in the billing account. Click `Service Accounts`, and create a new service account. The service account needs to have `BigQuery Data Viewer` and `BigQuery Job User` roles. On the `Service Accounts` page, click the three dots (menu) in the `Actions` column for the newly created service account and select `Manage keys`. There click `Add key` -> `Create new key`, and use `JSON` as the format. Download the JSON key file and keep it safe.

After setting up the resources above, add the following configurations in `app-config.yaml`:

```yaml
backend:
  infraWallet:
    integrations:
      gcp:
        - name: <unique_name_of_this_integration>
          keyFilePath: <path_to_your_json_key_file> # Supports environment variables, tilde expansion
          projectId: <GCP_project_that_your_big_query_dataset_belongs_to>
          datasetId: <big_query_dataset_id>
          tableId: <big_query_table_id>
```

The `keyFilePath` supports multiple formats:

- Absolute paths: `/path/to/key.json`
- Relative paths: `./path/to/key.json`
- Home directory expansion: `~/path/to/key.json`
- Environment variables: `$HOME/.config/gcloud/key.json` or `${HOME}/.config/gcloud/key.json`

InfraWallet will also check for the standard `GOOGLE_APPLICATION_CREDENTIALS` environment variable. You have these authentication options in order of precedence:

1. Explicitly configured `keyFilePath` in app-config.yaml (highest priority)
2. `GOOGLE_APPLICATION_CREDENTIALS` environment variable
3. Application Default Credentials from standard locations

If none of these options are successful, you'll see appropriate error messages in the logs to help troubleshoot the issue.
