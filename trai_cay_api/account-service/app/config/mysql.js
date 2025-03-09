const mysql = require('mysql2');

// Kết nối MySQL
module.exports= mysql.createPool({
    host: "127.0.0.1",
    port:"4001",
    user: "root",
    password: "123456",
    database: "account_db",
    waitForConnections: true,
    connectionLimit: 10, // Allows multiple queries at the same time
    queueLimit: 0
});