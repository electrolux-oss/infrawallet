exports.seed = async knex => {
  await knex('wallets')
    .count('id as c')
    .then(async result => {
      if (result[0].c === 0 || result[0].c === '0') {
        // only insert a record for default wallet when the table is empty
        await knex('wallets').insert([
          { name: 'default', currency: 'usd', description: 'The auto-created default wallet.' },
        ]);
      }
    });
};
