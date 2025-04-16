const db = require("../config/mysql");
const bcrypt = require("bcryptjs");
const accountFacade = require("../facade/accountFacade");
const addressFacade = require("../facade/addressFacade");

module.exports = {
  login: async (req, res) => {
    try {
      const { username, password } = req.body;

      const account = await accountFacade.findByUsername(db, username);

      if (!account) {
        return res
          .status(401)
          .json({ message: "Sai tài khoản hoặc mật khẩu!" });
      }

      const isMatch = await accountFacade.verifyPassword(
        password,
        account.password
      );
      if (!isMatch) {
        return res
          .status(401)
          .json({ message: "Sai tài khoản hoặc mật khẩu!" });
      }

      // Tạo token
      const token = accountFacade.generateToken(username);

      return res.json({ message: "Đăng nhập thành công!", token });
    } catch (err) {
      console.error("Lỗi đăng nhập:", err);
      return res
        .status(500)
        .json({ message: "Lỗi server", error: err.message });
    }
  },

  signup: async (req, res) => {
    try {
      const { username, password, fullname, phone, email } = req.body;

      const newAccount = accountFacade.create({
        username,
        password,
        fullname,
        phone,
        email,
      });

      // Validate dữ liệu
      const validation = newAccount.validate();
      if (!validation.isValid) {
        return res.status(400).json({ message: validation.errors.join(", ") });
      }

      // Kiểm tra tài khoản đã tồn tại
      const existingCheck = await accountFacade.checkExisting(db, {
        username,
        phone,
        email,
      });

      if (existingCheck.exists) {
        return res.status(400).json({ message: existingCheck.message });
      }

      // Hash mật khẩu
      newAccount.password = await accountFacade.hashPassword(password);

      // Lưu vào database
      await accountFacade.saveToDatabase(db, newAccount);

      return res.status(201).json({ message: "Đăng ký thành công!" });
    } catch (error) {
      console.error("Lỗi khi đăng ký:", error);
      return res
        .status(500)
        .json({ message: "Lỗi server", error: error.message });
    }
  },

  infoGet: (req, res) => {
    res.json({
      username: req.user.username,
      fullname: req.user.fullname,
      phone: req.user.phone,
      email: req.user.email,
      role: req.user.role,
    });
  },

  infoPost: async (req, res) => {
    try {
      const account_id = req.user.account_id;
      const { fullname, email, phone } = req.body;

      // Tạo dữ liệu cập nhật
      const updateData = {
        fullname,
        email,
        phone,
        role: "user", // Mặc định, không thay đổi role
      };

      const result = await accountFacade.updateInDatabase(
        db,
        account_id,
        updateData
      );
      if (result.exists == true) {
        return res.status(400).json({ message: result.message });
      }

      return res.status(200).json({
        success: true,
        message: "Cập nhật thông tin thành công",
      });
    } catch (error) {
      console.error("Lỗi khi cập nhật thông tin:", error);

      if (error.message.startsWith("Validation failed")) {
        return res.status(400).json({
          success: false,
          message: "Dữ liệu không hợp lệ",
          errors: error.message.replace("Validation failed: ", "").split(", "),
        });
      }

      return res.status(500).json({
        success: false,
        message: "Đã xảy ra lỗi hệ thống",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  addressGet: async (req, res) => {
    try {
      const account_id = req.user.account_id;
      const address = await addressFacade.findByAccountId(db, account_id);

      if (!address) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy địa chỉ",
        });
      }

      res.json({
        tinh: address.tinh,
        quan: address.quan,
        phuong: address.phuong,
        nha: address.nha,
        ghichu: address.ghichu,
      });
    } catch (error) {
      console.error("Lỗi khi lấy địa chỉ:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server",
        error: error.message,
      });
    }
  },

  addressPost: async (req, res) => {
    try {
      const account_id = req.user.account_id;
      const { tinh, quan, phuong, nha, ghichu } = req.body;

      const address = addressFacade.create({
        account_id,
        tinh,
        quan,
        phuong,
        nha,
        ghichu,
      });

      // Lưu địa chỉ
      const result = await addressFacade.save(db, address);

      res.status(result.action === "created" ? 201 : 200).json({
        success: true,
        message: "Lưu địa chỉ thành công",
      });
    } catch (error) {
      console.error("Lỗi khi lưu địa chỉ:", error);

      if (error.message.startsWith("Validation failed")) {
        return res.status(400).json({
          success: false,
          message: "Dữ liệu không hợp lệ",
          errors: error.message.replace("Validation failed: ", "").split(", "),
        });
      }

      res.status(500).json({
        success: false,
        message: "Lỗi server",
        error: error.message,
      });
    }
  },

  changePassword: async (req, res) => {
    const oldpw = req.body.oldpw;
    const newpw = req.body.newpw;
    const account_id = req.user.account_id;
    try {
      const checkPwSql = "SELECT password FROM accounts WHERE account_id=?";
      const [results] = await db.promise().query(checkPwSql, [account_id]);
      const user = results[0];

      const isMatch = await bcrypt.compare(oldpw, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Mật khẩu không chính xác!" });
      }

      const sql = "UPDATE accounts SET password=? WHERE account_id=?";
      const hashedPassword = await bcrypt.hash(newpw, 10);
      await db.promise().query(sql, [hashedPassword, account_id]);
      return res.status(200).json({ message: "Đổi thành công!" });
    } catch (error) {
      console.log("Lỗi khi đổi mật khẩu: " + error);
      return res
        .status(500)
        .json({ message: "Lỗi server", error: error.message });
    }
  },

  accountInfo: async (req, res) => {
    if (req.user.role == "admin") {
      try {
        let getAccountsSql = `
                SELECT 
                    COALESCE(a.account_id, ad.account_id) AS account_id, 
                    a.username, a.password, a.role, a.fullname, a.phone, a.email,
                    ad.address_id, ad.tinh, ad.quan, ad.phuong, ad.nha, ad.ghichu
                FROM accounts a
                LEFT JOIN addresses ad ON a.account_id = ad.account_id`;

        let params = [];
        if (req.query.tentaikhoan) {
          getAccountsSql += ` WHERE a.username LIKE ?`;
          params.push(`%${req.query.tentaikhoan}%`);
        }
        const [accounts] = await db.promise().query(getAccountsSql, params);
        return res.status(200).json(accounts);
      } catch (error) {
        console.error("Lỗi khi lấy danh sách tài khoản:", error.message);
        return res
          .status(500)
          .json({ message: "Lỗi server", error: error.message });
      }
    } else {
      return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }
  },

  findAccount: async (req, res) => {
    if (req.user.role == "admin") {
      try {
        let getAccountsSql = `
                SELECT 
                    COALESCE(a.account_id, ad.account_id) AS account_id, 
                    a.username, a.password, a.role, a.fullname, a.phone, a.email,
                    ad.address_id, ad.tinh, ad.quan, ad.phuong, ad.nha, ad.ghichu
                FROM accounts a
                LEFT JOIN addresses ad ON a.account_id = ad.account_id `;

        let params = [];
        if (req.params.username) {
          getAccountsSql += ` WHERE a.username LIKE ?`;
          params.push(`%${req.params.username}%`);
        }
        const [rows] = await db.promise().query(getAccountsSql, params);
        return res.status(200).json(rows);
      } catch (error) {
        console.error("Lỗi khi lấy danh sách tài khoản:", error.message);
        return res
          .status(500)
          .json({ message: "Lỗi server", error: error.message });
      }
    } else {
      return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }
  },

  role: async (req, res) => {
    if (req.user.role != "admin") {
      return res.status(403).json({ message: "Bạn không có quyền truy cập!" });
    }
    if (req.user.account_id == req.body.account_id) {
      return res
        .status(403)
        .json({ message: "Bạn không thể thay đổi quyền của bản thân!" });
    }
    try {
      const account_id = req.body.account_id;

      // Kiểm tra nếu account_id bị undefined hoặc rỗng
      if (!account_id) {
        return res.status(400).json({ message: "Thiếu account_id!" });
      }

      const RoleSql = `
          UPDATE accounts
            SET role = CASE 
                WHEN role = 'admin' THEN 'user' 
                WHEN role = 'user' THEN 'admin'
                ELSE role
            END
          WHERE account_id = ?;
      `;
      await db.promise().query(RoleSql, [account_id]);
      return res.status(200).json({ message: "Cập nhật thành công!" });
    } catch (err) {
      console.log("Lỗi Server:", err);
      return res
        .status(500)
        .json({ message: "Lỗi Server", error: err.message });
    }
  },

  accDelete: async (req, res) => {
    if (req.user.role != "admin") {
      return res.status(403).json({ message: "Bạn không có quyền truy cập!" });
    }
    if (req.user.account_id == req.body.account_id) {
      return res
        .status(403)
        .json({ message: "Bạn không thể xóa tài khoản của bản thân!" });
    }
    const account_id = req.body.account_id;
    try {
      const deleteSql = "DELETE FROM accounts WHERE account_id=?";
      await db.promise().query(deleteSql, [account_id]);
      return res.status(200).json({ message: "Xóa thành công!" });
    } catch (err) {
      console.log("Lỗi Server:", err);
      return res
        .status(500)
        .json({ message: "Lỗi Server", error: err.message });
    }
  },
};
