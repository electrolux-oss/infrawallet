# Installation

## Frontend

Install the frontend package in your Backstage app:

```sh
yarn --cwd packages/app add @electrolux-oss/plugin-infrawallet
```

Modify `packages/app/src/App.tsx` to include InfraWallet in your routes:

```ts
// ...
import { InfraWalletPage } from '@electrolux-oss/plugin-infrawallet';
// ...
<FlatRoutes>
    // ...
    <Route path="/infrawallet" element={<InfraWalletPage />} />
</FlatRoutes>
```

## Backend

Install the backend package in your Backstage app:

```sh
yarn --cwd packages/backend add @electrolux-oss/plugin-infrawallet-backend
```

Add backend plugin to `packages/backend/src/index.ts`:

```ts
const backend = createBackend();
// ...
// InfraWallet backend
backend.add(import('@electrolux-oss/plugin-infrawallet-backend'));
// ...
backend.start();
```

## Add integrations

Here is an example of the `app-config.yaml` configuration for AWS and Azure:

```yaml
backend:
  infraWallet:
    integrations:
      azure:
        - name: <unique_name_of_this_integration>
          subscriptionId: ...
          tenantId: ...
          clientId: ...
          clientSecret: ...
        - name: <unique_name_of_this_integration>
          subscriptionId: ...
          tenantId: ...
          clientId: ...
          clientSecret: ...
      aws:
        - name: <unique_name_of_this_integration>
          accountId: '<12-digit_account_ID_as_string>'
          assumedRoleName: ...
          accessKeyId: ...
          accessKeySecret: ...
        - name: <unique_name_of_this_integration>
          accountId: '<12-digit_account_ID_as_string>'
          assumedRoleName: ...
          accessKeyId: ...
          accessKeySecret: ...
```

## Add to the sidebar (optional)

Modify `packages/app/src/components/Root/Root.tsx` to include InfraWallet in the sidebar menu:

```ts
import { InfraWalletIcon } from '@electrolux-oss/plugin-infrawallet';
// ...
    <Sidebar>
      // ...
      <SidebarGroup label="Menu" icon={<MenuIcon />}>
        <SidebarItem
          icon={InfraWalletIcon}
          to="infrawallet"
          text="InfraWallet"
        />
      </SidebarGroup>
      // ...
    </Sidebar>
```

## Integrate with Backstage catalog (optional)

Modify `packages/app/src/components/catalog/EntityPage.tsx` to include the InfraWallet card in the entity page:

```ts
import {EntityInfraWalletCard, isInfraWalletAvailable } from '@electrolux-oss/plugin-infrawallet';
// ...

    <EntitySwitch>
      <EntitySwitch.Case if={isInfraWalletAvailable}>
        <Grid item md={6}>
          <EntityInfraWalletCard />
        </Grid>
      </EntitySwitch.Case>
    </EntitySwitch>
// ...
```

The `EntityInfraWalletCard` will only appear if the entity has at least one of the following annotations:

- `infrawallet.io/project`
- `infrawallet.io/account`
- `infrawallet.io/service`
- `infrawallet.io/category`
- `infrawallet.io/provider`
- `infrawallet.io/extra-filters`
- `infrawallet.io/tags` (requires the `infrawallet.io/provider` annotation)

These annotations are used to filter costs, similar to the `Filters` component on the InfraWallet main page.

- `infrawallet.io/extra-filters`: Accepts a string like `"key-x: value-x, key-y: value-y"`.
- Other annotations: Accept a single string value.

When multiple annotations are present, the fetched cost data will match all the given filters.
