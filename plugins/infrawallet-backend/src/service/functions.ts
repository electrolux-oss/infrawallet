import { DatabaseService } from '@backstage/backend-plugin-api';
import { CategoryMapping } from './types';

export async function getCategoryMappings(
  database: DatabaseService,
  provider: string,
): Promise<{ [category: string]: string[] }> {
  const result: { [category: string]: string[] } = {};
  const client = await database.getClient();
  const mappings = await client
    .where({ provider: provider })
    .select()
    .from<CategoryMapping>('category_mappings');
  mappings.forEach(mapping => {
    if (typeof mapping.cloud_service_names === 'string') {
      // just in case if the database such as sqlite does not support JSON column
      result[mapping.category] = JSON.parse(mapping.cloud_service_names);
    } else {
      result[mapping.category] = mapping.cloud_service_names;
    }
  });
  return result;
}

export function getCategoryByServiceName(
  serviceName: string,
  categoryMappings: { [category: string]: string[] },
): string {
  for (const key of Object.keys(categoryMappings)) {
    const serviceNames = categoryMappings[key];
    if (serviceNames && serviceNames.includes(serviceName)) {
      return key;
    }
  }

  return 'Uncategorized';
}
