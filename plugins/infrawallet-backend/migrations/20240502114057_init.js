// @ts-check

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  return (
    knex.schema
      //
      // category mappings
      //
      .createTable('category_mappings', table => {
        table.comment('Category mapping configurations for different cloud service names');
        table.uuid('id').defaultTo(knex.fn.uuid()).primary().notNullable().comment('Auto-generated ID of a mapping');
        table.string('provider').notNullable().comment('The name of a cloud provider');
        table.string('category').notNullable().comment('The name of a category');
        table
          .json('cloud_service_names') // if a database such as sqlite does not support json column, the data will be stored as plain text
          .comment('The cloud services that belong to this category (in json format like `["service1", "service2"]`)');
      })
  );
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  return knex.schema.dropTable('category_mappings');
};
