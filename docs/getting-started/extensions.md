# Extensions

The plugin offers extension points that allow parts of the report generation to be customised.

## InfrawalletReportFilterExtensionPoint

This extension point allows to augment or append to the provided filters through custom information.

For this the following interface can be used

```ts
export interface InfrawalletFilterExtension {
  augmentFilters(parameters: ReportParameters): Promise<ReportParameters>;
}
```

The type `ReportParameters`

```ts
export type ReportParameters = {
  filters: string;
  tags: Tag[];
  groups: string;
  granularityString: string;
  startTime: string;
  endTime: string;
  entityNamespace?: string;
  entityName?: string;
};
```

The `filters` string has the following format:

```ts
(key1:value,key2:value,...,keyN:value)
```

where value is either a single value or an array with the following structure `(value1|value2|...|valueN)`.

The following keys are defined through the annotations of the `EntityInfraWalletCard` listed in [the documentation](https://opensource.electrolux.one/infrawallet/getting-started/installation/#integrate-with-backstage-catalog-optional). Other keys can be passed through if your targeted integration supports it.

Below an example implementation of the extension point.

```ts
import { AuthService, coreServices, createBackendModule, LoggerService } from '@backstage/backend-plugin-api';
import { CatalogService, catalogServiceRef } from '@backstage/plugin-catalog-node';
import {
  InfrawalletFilterExtension,
  infrawalletReportFilterExtensionPoint,
  ReportParameters,
  Tag,
} from '@electrolux-oss/plugin-infrawallet-backend';

class InfraWalletFilter implements InfrawalletFilterExtension {
  private readonly myProvider = 'theProvider';

  constructor(
    private readonly auth: AuthService,
    private readonly catalogApi: CatalogService,
    private readonly logger: LoggerService,
  ) {}

  async augmentFilters(filters: ReportParameters): Promise<ReportParameters> {
    if (filters.entityName === undefined || filters.entityNamespace === undefined) {
      return filters;
    }

    const entity = await this.catalogApi.getEntityByRef(`${filters.entityNamespace}/${filters.entityName}`, {
      credentials: await this.auth.getOwnServiceCredentials(),
    });
    if (entity) {
      const entityTags: Tag[] = [];

      if (entity.metadata.labels) {
        this.logger.info(`Adding tags from entity ${filters.entityName} in namespace ${filters.entityNamespace}`);
        for (const [key, value] of Object.entries(entity.metadata.labels)) {
          entityTags.push({ key, value, provider: this.myProvider });
        }
      }
      filters.tags.push(...entityTags);
    }
    return filters;
  }
}

export const infrawalletModuleFilterextension = createBackendModule({
  pluginId: 'infrawallet',
  moduleId: 'filterextension',
  register(reg) {
    reg.registerInit({
      deps: {
        auth: coreServices.auth,
        catalogApi: catalogServiceRef,
        infraWalletExtension: infrawalletReportFilterExtensionPoint,
        logger: coreServices.logger,
      },
      async init({ auth, catalogApi, infraWalletExtension, logger }) {
        infraWalletExtension.addReportFilter(new InfraWalletFilter(auth, catalogApi, logger));
      },
    });
  },
});
```
