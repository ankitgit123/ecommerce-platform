exports.up = async function (knex) {
  await knex.schema.createTable("webhook_events", (table) => {
    // 🔑 Primary key
    table.bigIncrements("id").primary();

    // 🧾 Webhook event identity
    table.string("event_id", 100)
      .notNullable()
      .unique();

    table.string("event_type", 50)
      .notNullable();

    // 🔗 Razorpay references
    table.string("razorpay_order_id", 255)
      .index();

    table.string("razorpay_payment_id", 255);

    // 📦 Full webhook payload
    table.json("payload");

    // ✅ Processing tracking
    table.boolean("processed")
      .defaultTo(false)
      .index();

    // ❌ Failure info
    table.text("error");

    // 🧠 Tracking
    table.timestamp("created_at")
      .defaultTo(knex.fn.now());

    table.timestamp("processed_at")
      .nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("webhook_events");
};