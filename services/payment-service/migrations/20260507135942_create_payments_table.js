exports.up = async function (knex) {
  await knex.schema.createTable("payments", (table) => {
    // 🔑 Primary key
    table.bigIncrements("id").primary();

    // 💰 Payment info
    table.integer("amount").notNullable();

    table.string("currency", 10);

    // 📊 Payment lifecycle
    table
      .enu("payment_status", [
        "CREATED",
        "AUTHORIZED",
        "CAPTURED",
        "FAILED",
      ])
      .notNullable()
      .defaultTo("CREATED");

    // 🔗 Razorpay references
    table.string("razorpay_order_id", 255)
      .notNullable()
      .index();

    table.string("razorpay_payment_id", 255)
      .unique();

    // 🔐 Verification tracking
    table.boolean("signature_verified")
      .defaultTo(false);

    // 🧾 Store gateway response
    table.json("raw_response");

    // 🔁 Retry tracking
    table.integer("retry_count")
      .defaultTo(0);

    // ❌ Failure details
    table.string("failure_reason", 255);

    // 🧠 Tracking
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
  await knex.schema.dropTableIfExists("payments");
};