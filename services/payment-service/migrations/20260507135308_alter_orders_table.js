exports.up = async function (knex) {
  await knex.schema.alterTable("orders", (table) => {
    table.string("invoice_url", 255);

    table.string("payment_method", 50);
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("orders", (table) => {
    table.dropColumn("invoice_url");

    table.dropColumn("payment_method");
  });
};