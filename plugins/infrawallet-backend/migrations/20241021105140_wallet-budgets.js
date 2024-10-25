/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('budgets', table => {
    table.comment('Wallet budgets');
    table.uuid('id').defaultTo(knex.fn.uuid()).primary().notNullable().comment('Auto-generated ID of a budget');
    table.uuid('wallet_id').notNullable().comment('The ID of the wallet that has this budget');
    table.string('provider').notNullable().comment('The name of a cloud provider');
    table.string('name').notNullable().comment('The name of a budget');
    table.decimal('amount').notNullable().comment('The amount of a budget');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('budgets');
};
