/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema
    //
    // wallets
    //
    .createTable('wallets', table => {
      table.comment('Wallets defined by users');
      table.uuid('id').defaultTo(knex.fn.uuid()).primary().notNullable().comment('Auto-generated ID of a wallet');
      table.string('name').notNullable().comment('The display name for a wallet');
      table.string('currency').notNullable().comment('The currency for displaying the costs');
      table.string('description').comment('The description of a wallet');
    });

  await knex.schema
    //
    // business metric configurations for wallets
    //
    .createTable('business_metrics', table => {
      table.comment('Business metric configurations for wallets');
      table
        .uuid('id')
        .defaultTo(knex.fn.uuid())
        .primary()
        .notNullable()
        .comment('Auto-generated ID of a metric configuration');
      table.uuid('wallet_id').notNullable().comment('The ID of the wallet that has this metric configuration');
      table.string('metric_provider').notNullable().comment('Provider type, either datadog or grafanacloud');
      table.string('config_name').notNullable().comment('Name of a specific metric provider config');
      table.string('metric_name').notNullable().comment('Display name of a metric');
      table.text('description').comment('Description of a metric');
      table
        .text('query')
        .notNullable()
        .comment('Query string (`IW_INTERVAL` will be replaced with the interval value based on the granularity)');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('wallets');
  await knex.schema.dropTableIfExists('business_metrics');
};
