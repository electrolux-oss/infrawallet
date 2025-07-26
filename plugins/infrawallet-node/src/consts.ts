// Supported cloud providers to extract costs
export const enum CLOUD_PROVIDER {
  AWS = 'AWS',
  GCP = 'GCP',
  AZURE = 'Azure',
  MONGODB_ATLAS = 'MongoAtlas',
  CONFLUENT = 'Confluent',
  DATADOG = 'Datadog',
  ELASTIC_CLOUD = 'ElasticCloud',
  GITHUB = 'GitHub',
  CUSTOM = 'Custom',
  MOCK = 'Mock',
}

export enum GRANULARITY {
  DAILY = 'daily',
  MONTHLY = 'monthly',
}

export const enum CACHE_CATEGORY {
  COSTS = 'costs',
  TAGS = 'tags',
  METRICS = 'metrics',
  CATEGORY_MAPPINGS = 'category_mappings',
}

export const enum PROVIDER_TYPE {
  INTEGRATION = 'Integration',
  CUSTOM = 'Custom',
}