const mysql = require('mysql2');

// Kết nối MySQL
module.exports= mysql.createPool({
    host: "mysql-buy", //localhost,mysql-buy
    port: "3306", //4003 3306
    user: "root",
    password: "123456",
    database: "buy_db", // Ensure this line is present and correct
    charset: 'utf8mb4',
    collation: 'utf8mb4_0900_ai_ci', // Or a compatible collation
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});