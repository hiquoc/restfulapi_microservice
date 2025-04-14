const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Account=require("../models/account")

const AccountFactory = {
  create: (data) => {
    return new Account(data);
  },

  // Tạo account từ dữ liệu database
  fromDB: (dbData) => {
    return new Account({
      id: dbData.id || dbData.account_id,
      username: dbData.username,
      password: dbData.password,
      fullname: dbData.fullname,
      phone: dbData.phone,
      email: dbData.email,
      role: dbData.role,
    });
  },

  // Kiểm tra tài khoản đã tồn tại chưa
  checkExisting: async (db, { username, phone, email }) => {
    const checkUserSql =
      "SELECT * FROM accounts WHERE username = ? OR phone = ? OR email = ?";
    const [existingUsers] = await db
      .promise()
      .query(checkUserSql, [username, phone, email]);

    if (existingUsers.length === 0) {
      return {
        exists: false,
      };
    }

    const existingUser = existingUsers.find(
      (user) =>
        user.username === username ||
        user.phone === phone ||
        user.email === email
    );

    return {
      exists: true,
      field:
        existingUser.username === username
          ? "username"
          : existingUser.phone === phone
          ? "phone"
          : "email",
      message:
        existingUser.username === username
          ? "Username đã tồn tại!"
          : existingUser.phone === phone
          ? "Số điện thoại đã được sử dụng để đăng kí!"
          : "Email đã được sử dụng để đăng kí!",
    };
  },

  // Hash mật khẩu
  hashPassword: async (password) => {
    return await bcrypt.hash(password, 10);
  },

  // Kiểm tra mật khẩu
  verifyPassword: async (plainPassword, hashedPassword) => {
    return await bcrypt.compare(plainPassword, hashedPassword);
  },

  // Tạo JWT token
  generateToken: (username, secretKey = "huy", expiresIn = "1h") => {
    return jwt.sign({ username }, secretKey, { expiresIn });
  },

  // Lưu account vào database
  saveToDatabase: async (db, account) => {
    const insertSql =
      "INSERT INTO accounts (username, password, fullname, phone, email, role) VALUES (?, ?, ?, ?, ?, ?)";
    const result = await db
      .promise()
      .query(insertSql, [
        account.username,
        account.password,
        account.fullname,
        account.phone,
        account.email,
        account.role,
      ]);
    return result;
  },

  // Tìm account theo username
  findByUsername: async (db, username) => {
    const sql = "SELECT * FROM accounts WHERE username = ?";
    const [results] = await db.promise().query(sql, [username]);

    if (results.length === 0) {
      return null;
    }

    return AccountFactory.fromDB(results[0]);
  },
  updateInDatabase: async (db, accountId, updateData) => {
    const account = new Account(updateData);
    const checkExitSql =
      "SELECT * FROM accounts WHERE (phone=? OR email=?) AND account_id!=?";
    const [results] = await db
      .promise()
      .query(checkExitSql, [account.phone, account.email, accountId ]);
    if (results.length > 0) {
      const existingAcc = results.find(
        (acc) => acc.phone === account.phone || acc.email === account.email
      );
      if (existingAcc.phone === account.phone) {
        return {
            exists: true,
            message:
            "Số điện thoại đã được sử dụng để đăng kí!",
          };
      }
      if (existingAcc.email === account.email) {
        return {
            exists: true,
            message:
                "Email đã được sử dụng để đăng kí!",
          };
      }
    }
    const sql = `
            UPDATE accounts 
            SET fullname = ?, email = ?, phone = ? 
            WHERE account_id = ?
        `;

    const [result] = await db
      .promise()
      .query(sql, [account.fullname, account.email, account.phone, accountId]);

    return result;
  },
};

module.exports = AccountFactory;
