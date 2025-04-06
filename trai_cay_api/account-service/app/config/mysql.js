const mysql = require('mysql2');

// Kết nối MySQL
module.exports= mysql.createPool({
    host: "mysql-account", //localhost mysql-account
    port: "3306", //4001 3306
    user: "root",
    password: "123456",
    database: "account_db",
    waitForConnections: true,
    connectionLimit: 10, 
    queueLimit: 0
});