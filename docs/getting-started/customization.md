# Customization

## Default Settings for Frontend

Site admins can configure the default view for InfraWallet, including the default group by dimension, and the default query period. Add the following configurations to your `app-config.yaml` file if the default view needs to be changed.

```yaml
# note that infraWallet exists at the root level, it is not the same one for backend configurations
infraWallet:
  settings:
    defaultGroupBy: none # none by default, or account, provider, category, service, tag:<tag_key>
    defaultShowLastXMonths: 3 # 3 by default, or other numbers, we recommend it less than 12
```

## Custom Title and Subtitle

By default, the `InfraWalletPage` component is configured in the `packages/app/src/App.tsx` file as follows:

```ts
<Route path="/infrawallet" element={<InfraWalletPage />} />
```

To customize the title and subtitle of the InfraWalletPage, you can modify the route in the same file as shown below:

```ts
<Route path="/infrawallet" element={<InfraWalletPage title="Custom title" subTitle="Custom subTitle" />} />
```

## Configuring Tab Visibility

InfraWallet includes tabs for Budgets, Custom Costs, and Business Metrics. You can easily control the visibility of each tab by enabling or disabling them in your `app-config.yaml`.

```yaml
infraWallet:
  settings:
    budgets:
      enabled: true

    businessMetrics:
      enabled: true

    customCosts:
      enabled: false # hide Custom Costs tab
```
