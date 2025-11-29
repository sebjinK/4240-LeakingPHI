require("dotenv").config();
const mariadb = require("mariadb");

// Support both naming conventions:
// - Local dev: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
// - Docker: MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
const poolConfig = {
    host: process.env.DB_HOST || process.env.MYSQL_HOST || "localhost",
    user: process.env.DB_USER || process.env.MYSQL_USER || "root",
    port: process.env.DB_PORT || process.env.MYSQL_PORT || 3306,
    password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || "",
    database: process.env.DB_NAME || process.env.MYSQL_DATABASE || "test",
    connectionLimit: 10
};

console.log("[config] Connecting to MariaDB:", {
    host: poolConfig.host,
    port: poolConfig.port,
    user: poolConfig.user,
    database: poolConfig.database
});

const pool = mariadb.createPool(poolConfig);

module.exports = pool;
