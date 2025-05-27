const db = require("../config/mysql");
const bcrypt = require("bcryptjs");

class AccountRepository {
  constructor(db) {
    this.db = db;
  }

  async findByUsername(username) {
    const sql = "SELECT * FROM accounts WHERE username = ?";
    const [rows] = await this.db.promise().query(sql, [username]);
    return rows[0] || null;
  }

  async findById(account_id) {
    const sql = "SELECT * FROM accounts WHERE account_id = ?";
    const [rows] = await this.db.promise().query(sql, [account_id]);
    return rows[0] || null;
  }

  async checkExisting({ username, phone, email }) {
    const sql = `
      SELECT 
        SUM(CASE WHEN username = ? THEN 1 ELSE 0 END) as username_exists,
        SUM(CASE WHEN phone = ? THEN 1 ELSE 0 END) as phone_exists,
        SUM(CASE WHEN email = ? THEN 1 ELSE 0 END) as email_exists
      FROM accounts
    `;
    const [results] = await this.db.promise().query(sql, [username, phone, email]);
    
    const exists = results[0].username_exists > 0 || 
                  results[0].phone_exists > 0 || 
                  results[0].email_exists > 0;
    
    let message = '';
    if (results[0].username_exists > 0) message += 'Username đã tồn tại. ';
    if (results[0].phone_exists > 0) message += 'Số điện thoại đã tồn tại. ';
    if (results[0].email_exists > 0) message += 'Email đã tồn tại.';
    
    return { exists, message };
  }

  async createAccount(accountData) {
    const { username, password, fullname, phone, email, role = 'user' } = accountData;
    const sql = `
      INSERT INTO accounts (username, password, fullname, phone, email, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await this.db.promise().query(sql, [
      username, password, fullname, phone, email, role
    ]);
    return result.insertId;
  }

  async updateAccount(account_id, updateData) {
    const { fullname, phone, email } = updateData;
    const sql = `
      UPDATE accounts 
      SET fullname = ?, phone = ?, email = ?
      WHERE account_id = ?
    `;
    await this.db.promise().query(sql, [fullname, phone, email, account_id]);
    return true;
  }

  async updatePassword(account_id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const sql = "UPDATE accounts SET password = ? WHERE account_id = ?";
    await this.db.promise().query(sql, [hashedPassword, account_id]);
    return true;
  }

  async changeRole(account_id) {
    const sql = `
      UPDATE accounts
      SET role = CASE 
          WHEN role = 'admin' THEN 'user' 
          WHEN role = 'user' THEN 'admin'
          ELSE role
      END
      WHERE account_id = ?
    `;
    await this.db.promise().query(sql, [account_id]);
    return true;
  }

  async deleteAccount(account_id) {
    const sql = "DELETE FROM accounts WHERE account_id = ?";
    await this.db.promise().query(sql, [account_id]);
    return true;
  }

  async getAllAccounts(searchTerm = null) {
    let sql = `
      SELECT 
        COALESCE(a.account_id, ad.account_id) AS account_id, 
        a.username, a.password, a.role, a.fullname, a.phone, a.email,
        ad.address_id, ad.tinh, ad.quan, ad.phuong, ad.nha, ad.ghichu
      FROM accounts a
      LEFT JOIN addresses ad ON a.account_id = ad.account_id
    `;
    
    let params = [];
    if (searchTerm) {
      sql += ` WHERE a.username LIKE ?`;
      params.push(`%${searchTerm}%`);
    }
    
    const [accounts] = await this.db.promise().query(sql, params);
    return accounts;
  }

  async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  async findAddressByAccountId(account_id) {
    const sql = "SELECT * FROM addresses WHERE account_id = ?";
    const [rows] = await this.db.promise().query(sql, [account_id]);
    return rows[0] || null;
  }

  async createOrUpdateAddress(addressData) {
    const { account_id, tinh, quan, phuong, nha, ghichu } = addressData;
    
    const existingAddress = await this.findAddressByAccountId(account_id);
    
    if (existingAddress) {
      const sql = `
        UPDATE addresses 
        SET tinh = ?, quan = ?, phuong = ?, nha = ?, ghichu = ?
        WHERE account_id = ?
      `;
      await this.db.promise().query(sql, [tinh, quan, phuong, nha, ghichu, account_id]);
      return { action: "updated" };
    } else {
      const sql = `
        INSERT INTO addresses (account_id, tinh, quan, phuong, nha, ghichu)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      await this.db.promise().query(sql, [account_id, tinh, quan, phuong, nha, ghichu]);
      return { action: "created" };
    }
  }
}

module.exports = new AccountRepository(db);