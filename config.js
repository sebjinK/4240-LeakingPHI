require("dotenv").config();
const mariadb = require("mariadb");

const pool = mariadb.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || process.env.MYSQL_PORT || 3307),
  user: process.env.DB_USER || process.env.MYSQL_USER || "healthuser",
  password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || "healthpass",
  database: process.env.DB_NAME || process.env.MYSQL_DATABASE || "health_ai",
  connectionLimit: 5
});

module.exports = pool;
