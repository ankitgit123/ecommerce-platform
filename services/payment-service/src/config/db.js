const mysql = require("mysql2/promise");
const { getSecrets } = require("./secrets");

let pool = null;

async function getPool() {
  // Reuse existing pool
  if (pool) {
    return pool;
  }

  // Load secrets first
  await getSecrets();

  // Create pool
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,

    waitForConnections: true,
    connectionLimit: 2,
    queueLimit: 0,

    enableKeepAlive: true,
  });

  return pool;
}

module.exports = {
  getPool,
};