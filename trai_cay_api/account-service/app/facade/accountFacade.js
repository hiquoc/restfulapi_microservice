const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
// const Account=require("../models/account");
const AdminAccount = require("../models/adminAccount");
const UserAccount = require("../models/userAccount");

const AccountFacade = {
  create: (data) => {
    if(data.role==="admin"){
      return AdminAccount.createAccount(data);
    }
      return UserAccount.createAccount(data);
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

};

module.exports = AccountFacade;
