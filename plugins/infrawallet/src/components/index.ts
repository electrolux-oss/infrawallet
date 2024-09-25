export { InfraWalletIcon } from './InfraWalletIcon';
export { EntityInfraWalletCard } from './EntityInfraWalletCard';
export type { ReportsComponentProps } from './ReportsComponent';
import { Entity } from '@backstage/catalog-model';
import {
  INFRAWALLET_ANNOTATION_PROJECT,
  INFRAWALLET_ANNOTATION_ACCOUNT,
  INFRAWALLET_ANNOTATION_SERVICE,
  INFRAWALLET_ANNOTATION_CATEGORY,
  INFRAWALLET_ANNOTATION_PROVIDER,
  INFRAWALLET_ANNOTATION_EXTRAS,
} from './InfraWalletAppData';

export const isInfraWalletProjectIDAnnotationAvailable = (entity: Entity) =>
  Boolean(entity.metadata.annotations?.[INFRAWALLET_ANNOTATION_PROJECT]);

export const isInfraWalletAccountAnnotationAvailable = (entity: Entity) =>
  Boolean(entity.metadata.annotations?.[INFRAWALLET_ANNOTATION_ACCOUNT]);

export const isInfraWalletServiceAnnotationAvailable = (entity: Entity) =>
  Boolean(entity.metadata.annotations?.[INFRAWALLET_ANNOTATION_SERVICE]);

export const isInfraWalletCategoryAnnotationAvailable = (entity: Entity) =>
  Boolean(entity.metadata.annotations?.[INFRAWALLET_ANNOTATION_CATEGORY]);

export const isInfraWalletProviderAnnotationAvailable = (entity: Entity) =>
  Boolean(entity.metadata.annotations?.[INFRAWALLET_ANNOTATION_PROVIDER]);

export const isInfraWalletExtrasAnnotationAvailable = (entity: Entity) =>
  Boolean(entity.metadata.annotations?.[INFRAWALLET_ANNOTATION_EXTRAS]);

export const isInfraWalletAvailable = (entity: Entity) => {
  const available =
    isInfraWalletProjectIDAnnotationAvailable(entity) ||
    isInfraWalletAccountAnnotationAvailable(entity) ||
    isInfraWalletServiceAnnotationAvailable(entity) ||
    isInfraWalletCategoryAnnotationAvailable(entity) ||
    isInfraWalletProviderAnnotationAvailable(entity) ||
    isInfraWalletExtrasAnnotationAvailable(entity);
  return available;
};
