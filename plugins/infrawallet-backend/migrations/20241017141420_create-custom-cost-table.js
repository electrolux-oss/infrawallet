/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('custom_costs', table => {
    table.comment('Custom costs uploaded by users');
    table.uuid('id').defaultTo(knex.fn.uuid()).primary().notNullable().comment('Auto-generated ID of a record');
    table.string('provider').notNullable().comment('The provider name of this cost');
    table.string('account').notNullable().comment('The account name under this provider');
    table.string('service').comment('The service name of this cost, can be blank');
    table.string('category').comment('The category that this cost belongs to, can be blank');
    table.string('currency').defaultTo('USD').comment('The currency of the cost, default to USD');
    table
      .string('amortization_mode')
      .comment('How the monthly custom costs are mapped to daily costs, support two values: average, as_it_is');
    table.integer('usage_month').comment('The usage month of the cost, format YYYYMM');
    table.decimal('cost').comment('The value of the cost');
    table
      .json('tags')
      .comment('Other tags that this cost record has, in json format such as {"tag_a":"value_a", "tag_b":"value_b"}');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('custom_costs');
};
