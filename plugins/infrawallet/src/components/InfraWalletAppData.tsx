import { Entity } from '@backstage/catalog-model';

export const INFRAWALLET_ANNOTATION_PROJECT = 'infrawallet.io/project';
export const INFRAWALLET_ANNOTATION_ACCOUNT = 'infrawallet.io/account';
export const INFRAWALLET_ANNOTATION_SERVICE = 'infrawallet.io/service';
export const INFRAWALLET_ANNOTATION_CATEGORY = 'infrawallet.io/category';
export const INFRAWALLET_ANNOTATION_PROVIDER = 'infrawallet.io/provider';
export const INFRAWALLET_ANNOTATION_EXTRAS = 'infrawallet.io/extra-filters';

export const getInfraWalletProjectAnnotation = (entity: Entity) => {
  const project = entity.metadata.annotations?.[INFRAWALLET_ANNOTATION_PROJECT] ?? '';

  return project;
};

export const getInfraWalletAccountAnnotation = (entity: Entity) => {
  const account = entity.metadata.annotations?.[INFRAWALLET_ANNOTATION_ACCOUNT] ?? '';

  return account;
};

export const getInfraWalletServiceAnnotation = (entity: Entity) => {
  const service = entity.metadata.annotations?.[INFRAWALLET_ANNOTATION_SERVICE] ?? '';

  return service;
};

export const getInfraWalletCategoryAnnotation = (entity: Entity) => {
  const category = entity.metadata.annotations?.[INFRAWALLET_ANNOTATION_CATEGORY] ?? '';

  return category;
};
export const getInfraWalletProviderAnnotation = (entity: Entity) => {
  const provider = entity.metadata.annotations?.[INFRAWALLET_ANNOTATION_PROVIDER] ?? '';

  return provider;
};

export const getInfraWalletExtrasAnnotation = (entity: Entity) => {
  const extras = entity.metadata.annotations?.[INFRAWALLET_ANNOTATION_EXTRAS] ?? '';

  return extras;
};
