const mysql = require('mysql2');
class Database {
  constructor() {
    if (!Database.instance) {
      this.pool = mysql.createPool({
        host: "mysql-account", //localhost mysql-account
        port: "3306", //4001 3306
        user: "root",
        password: "123456",
        database: "account_db",
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });

      Database.instance = this;
    }
    return Database.instance;
  }

  getPool() {
    return this.pool;
  }
}

const instance = new Database();
const db = instance.getPool();

module.exports = db;
