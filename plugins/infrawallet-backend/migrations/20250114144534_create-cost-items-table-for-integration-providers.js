/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('cost_items_daily', table => {
    table.comment('Daily cost records automatically fetched by integration providers for a wallet');
    table.increments('id').primary().comment('Auto incrementing ID of a record');
    table.uuid('wallet_id').notNullable().comment('The ID of the wallet that this record belongs to');
    table.string('key').notNullable().comment('The key (the id field sent to the frontend) of this record');
    table.string('account').notNullable().comment('The account field');
    table.string('service').notNullable().comment('The service field');
    table.string('category').notNullable().comment('The category field');
    table.string('provider').notNullable().comment('The provider field');
    table.integer('usage_date').comment('The usage date of the cost, format YYYYMMDD');
    table.decimal('cost').comment('The value of the cost');
    table
      .json('other_columns')
      .comment(
        'All the other fields that are not saved by the preserved columns, in json format such as {"cluster":"value_a", "project":"value_b"}',
      );
  });

  await knex.schema.createTable('cost_items_monthly', table => {
    table.comment('Monthly cost records automatically fetched by integration providers for a wallet');
    table.increments('id').primary().comment('Auto incrementing ID of a record');
    table.uuid('wallet_id').notNullable().comment('The ID of the wallet that this record belongs to');
    table.string('key').notNullable().comment('The key (the id field sent to the frontend) of this record');
    table.string('account').notNullable().comment('The account field');
    table.string('service').notNullable().comment('The service field');
    table.string('category').notNullable().comment('The category field');
    table.string('provider').notNullable().comment('The provider field');
    table.integer('usage_date').comment('The usage date of the cost, format YYYYMM');
    table.decimal('cost').comment('The value of the cost');
    table
      .json('other_columns')
      .comment(
        'All the other fields that are not saved by the preserved columns, in json format such as {"cluster":"value_a", "project":"value_b"}',
      );
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('cost_items_daily');
  await knex.schema.dropTableIfExists('cost_items_monthly');
};
