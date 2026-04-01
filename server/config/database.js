const mysql = require("mysql2/promise");

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "gabdash",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      // Parse dates as strings to avoid timezone issues
      dateStrings: true,
    });
  }
  return pool;
}

async function testConnection() {
  const p = getPool();
  const conn = await p.getConnection();
  await conn.ping();
  conn.release();
  console.log("✅ MySQL conectado com sucesso");
}

module.exports = { getPool, testConnection };
