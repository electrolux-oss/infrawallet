# Custom Costs

If there is no integration available for some cloud costs, you can add them manually using the Custom Costs UI in InfraWallet. The table on this page displays all saved custom
costs within InfraWallet's database.

Currently, custom costs are only available at the monthly level. When viewing costs with `daily` granularity, monthly custom costs can be transformed into daily costs using the following amortization modes:

- Average (default): The monthly cost is divided evenly across all days in the month.
- First day: The full monthly cost is assigned to the first day of the month.
- End day: The full monthly cost is assigned to the last day of the month.

To add multiple custom cost records for a single provider, use the `Bulk Add` button. Enter details such as provider, monthly cost, start month, and end month, then check the preview and save the records.
