/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema.alterTable('budgets', table => {
    table.decimal('amount', 12).notNullable().comment('The amount of a budget').alter();
  });
  await knex.schema.alterTable('custom_costs', table => {
    table.decimal('cost', 12).comment('The value of the cost').alter();
  });
  await knex.schema.alterTable('cost_items_daily', table => {
    table.decimal('cost', 12).comment('The value of the cost').alter();
  });
  await knex.schema.alterTable('cost_items_monthly', table => {
    table.decimal('cost', 12).comment('The value of the cost').alter();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.schema.alterTable('budgets', table => {
    table.decimal('amount').notNullable().comment('The amount of a budget').alter();
  });
  await knex.schema.alterTable('custom_costs', table => {
    table.decimal('cost').comment('The value of the cost').alter();
  });
  await knex.schema.alterTable('cost_items_daily', table => {
    table.decimal('cost').comment('The value of the cost').alter();
  });
  await knex.schema.alterTable('cost_items_monthly', table => {
    table.decimal('cost').comment('The value of the cost').alter();
  });
};
