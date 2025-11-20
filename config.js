const mariadb = require('mariadb');

const pool = mariadb.createPool({
    host: "health_mariadb",
    user: "healthuser",
    password: "healthpass",
    database: "health_ai",
    connectionLimit: 5
});

module.exports = pool;
