exports.up = async function (knex) {
  await knex.schema.createTable("orders", (table) => {
    table.bigIncrements("id").primary();

    table.string("razorpay_order_id", 255)
      .notNullable()
      .unique();

    table.string("user_id", 50);

    table.integer("amount").notNullable();

    table.string("currency", 10)
      .defaultTo("INR");

    table.enu("status", [
      "CREATED",
      "PAID",
      "FAILED",
      "EXPIRED"
    ]).defaultTo("CREATED");

    table.string("receipt", 100);

    table.json("notes");

    table.integer("retry_count")
      .defaultTo(0);

    table.timestamp("created_at")
      .defaultTo(knex.fn.now());

    table.timestamp("updated_at")
      .defaultTo(
        knex.raw(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        )
      );
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("orders");
};