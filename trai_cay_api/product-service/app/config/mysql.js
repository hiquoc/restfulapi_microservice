const mysql = require('mysql2');

// Kết nối MySQL
module.exports= mysql.createPool({
    host: "mysql-product", //localhost mysql-product
    port: "3306", //4002 3306
    user: "root",
    password: "123456",
    database: "product_db",
    charset: 'utf8mb4', // Critical for Vietnamese
    collation: 'utf8mb4_unicode_ci',
    waitForConnections: true,
    connectionLimit: 10, 
    queueLimit: 0
});