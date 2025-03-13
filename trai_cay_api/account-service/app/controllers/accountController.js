const jwt = require("jsonwebtoken");
const db = require("../config/mysql");
const bcrypt = require("bcryptjs");

module.exports = {
  login: async (req, res) => {
    try {
      const { username, password } = req.body;

      const sql = "SELECT password FROM account WHERE username = ?";
      const [results] = await db.promise().query(sql, [username]);

      if (results.length === 0) {
        return res
          .status(401)
          .json({ message: "Sai tài khoản hoặc mật khẩu!" });
      }

      const user = results[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res
          .status(401)
          .json({ message: "Sai tài khoản hoặc mật khẩu!" });
      }

      const token = jwt.sign({ username }, "huy", {
        expiresIn: "1h",
      });

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
      const { username, password, hovaten, sdt, email } = req.body;

      // Kiểm tra username đã tồn tại chưa
      const checkUserSql =
        "SELECT * FROM account WHERE username = ? OR phone = ? OR email = ?";
      const [existingUsers] = await db
        .promise()
        .query(checkUserSql, [username, sdt, email]);
      if (existingUsers.length > 0) {
        const existingUser = existingUsers.find(
          (user) =>
            user.username === username ||
            user.phone === sdt ||
            user.email === email
        );

        if (existingUser.username === username) {
          return res.status(400).json({ message: "Username đã tồn tại!" });
        }
        if (existingUser.phone === sdt) {
          return res
            .status(400)
            .json({ message: "Số điện thoại đã được sử dụng để đăng kí!" });
        }
        if (existingUser.email === email) {
          return res
            .status(400)
            .json({ message: "Email đã được sử dụng để đăng kí!" });
        }
      }

      // Hash mật khẩu trước khi lưu
      const hashedPassword = await bcrypt.hash(password, 10);

      // Chèn dữ liệu vào database
      const insertSql =
        "INSERT INTO account (username, password, fullname, phone, email) VALUES (?, ?, ?, ?, ?)";
      await db
        .promise()
        .query(insertSql, [username, hashedPassword, hovaten, sdt, email]);

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
    const account_id = req.user.account_id;
    const { hovatenval, emailval, sdtval } = req.body;
    try {
      const checkExitSql =
        "SELECT * FROM account WHERE (phone=? OR email=?) AND account_id!=?";
      const [results] = await db
        .promise()
        .query(checkExitSql, [sdtval, emailval, account_id]);
      if (results.length > 0) {
        const existingAcc = results.find(
          (acc) => acc.phone === sdtval || acc.email === emailval
        );
        if (existingAcc.phone === sdtval) {
          return res
            .status(400)
            .json({ message: "Số điện thoại đã được sử dụng để đăng kí!" });
        }
        if (existingAcc.email === emailval) {
          return res
            .status(400)
            .json({ message: "Email đã được sử dụng để đăng kí!" });
        }
      }
      const sql =
        "UPDATE account SET fullname=?, email=?, phone=? WHERE account_id=?";
      await db.promise().query(sql, [hovatenval, emailval, sdtval, account_id]);
      return res.status(200).json({ message: "Lưu thành công!" });
    } catch (error) {
      console.log("Lỗi khi thêm/cập nhật thông tin: " + error);
      return res
        .status(500)
        .json({ message: "Lỗi server", error: error.message });
    }
  },

  addressGet: async (req, res) => {
    const account_id = req.user.account_id;
    try {
      //Kiem tra co dia chi chua
      const checkAddressSql = "SELECT * FROM address WHERE account_id=?";
      const [results] = await db.promise().query(checkAddressSql, [account_id]);
      if (results.length > 0) {
        const address = results[0];
        res.json({
          tinh: address.tinh,
          quan: address.quan,
          phuong: address.phuong,
          nha: address.nha,
          ghichu: address.ghichu,
        });
      }
    } catch (error) {
      console.log("Lỗi khi tìm địa chỉ: " + error);
      return res
        .status(500)
        .json({ message: "Lỗi server", error: error.message });
    }
  },

  addressPost: async (req, res) => {
    const account_id = req.user.account_id;
    const { tinh, quan, phuong, nha, ghichu } = req.body;
    try {
      //Kiem tra co dia chi chua
      const checkAddressSql =
        "SELECT address_id FROM address WHERE account_id=?";
      const [results] = await db.promise().query(checkAddressSql, [account_id]);
      if (results.length > 0) {
        const updateAdressSql =
          "UPDATE address SET tinh=?, quan=?, phuong=?, nha=?, ghichu=? WHERE account_id=?";
        await db
          .promise()
          .query(updateAdressSql, [
            tinh,
            quan,
            phuong,
            nha,
            ghichu,
            account_id,
          ]);
        return res.status(200).json({ message: "Lưu thành công!" });
      }
      const sql =
        "INSERT INTO address (account_id, tinh, quan, phuong, nha, ghichu) VALUES(?,?,?,?,?,?)";
      await db
        .promise()
        .query(sql, [account_id, tinh, quan, phuong, nha, ghichu]);
      return res.status(201).json({ message: "Lưu thành công!" });
    } catch (error) {
      console.log("Lỗi khi thêm/cập nhật địa chỉ: " + error);
      return res
        .status(500)
        .json({ message: "Lỗi server", error: error.message });
    }
  },

  changePassword: async (req, res) => {
    const oldpw = req.body.oldpw;
    const newpw = req.body.newpw;
    const account_id = req.user.account_id;
    try {
      const checkPwSql = "SELECT password FROM account WHERE account_id=?";
      const [results] = await db.promise().query(checkPwSql, [account_id]);
      const user = results[0];

      const isMatch = await bcrypt.compare(oldpw, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Mật khẩu không chính xác!" });
      }

      const sql = "UPDATE account SET password=? WHERE account_id=?";
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
                FROM account a
                LEFT JOIN address ad ON a.account_id = ad.account_id`;

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
                FROM account a
                LEFT JOIN address ad ON a.account_id = ad.account_id `;

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
          UPDATE account 
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
      const deleteSql = "DELETE FROM account WHERE account_id=?";
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
