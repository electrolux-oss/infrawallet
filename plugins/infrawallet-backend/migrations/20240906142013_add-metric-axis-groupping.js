/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema.table('business_metrics', table => {
    table.string('group').comment('Metrics using the same value in this column will share the same yaxis label');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.schema.table('business_metrics', table => {
    table.dropColumn('group');
  });
};
