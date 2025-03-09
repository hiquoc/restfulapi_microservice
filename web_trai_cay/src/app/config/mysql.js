const mysql = require('mysql2/promise');

module.exports = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "123456",
    database: "web",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
 });

