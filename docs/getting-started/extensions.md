# Extensions

The plugin offers extension points that allow parts of the report generation to be customised.

## InfrawalletReportFilterExtensionPoint

This extension point allows to augement or append to the provided filters through custom information.

For this the following interface can be used

```ts
export interface InfrawalletFilterExtension {
  augmentFilters(parameters: ReportParameters): ReportParameters;
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
