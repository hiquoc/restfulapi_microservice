const mysql = require('mysql2');

// Kết nối MySQL
module.exports= mysql.createPool({
    host: "localhost", //doi sang "mysql" hoac localhost
    user: "root",
    password: "123456",
    database: "htnhung",
    waitForConnections: true,
    connectionLimit: 10, // Allows multiple queries at the same time
    queueLimit: 0
});