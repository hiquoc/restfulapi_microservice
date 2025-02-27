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
      account_id: req.user.account_id,
      username: req.user.username,
      fullname: req.user.fullname,
      phone: req.user.phone,
      email: req.user.email,
      role: req.user.role,
    });
  },
  infoPost: async (req, res) => {
    const account_id = req.user.account_id;
    const { hovatenval,emailval,sdtval } = req.body;
    try{
      const checkExitSql="SELECT * FROM account WHERE (phone=? OR email=?) AND account_id!=?";
      const [results]=await db.promise().query(checkExitSql,[sdtval,emailval,account_id]);
      if(results.length>0){
        const existingAcc=results.find((acc)=>acc.phone===sdtval||acc.email===emailval);
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
      const sql="UPDATE account SET fullname=?, email=?, phone=? WHERE account_id=?";
      await db.promise().query(sql,[hovatenval,emailval,sdtval,account_id]);
      return res.status(200).json({ message: "Lưu thành công!" });
    }
    catch(error) {
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
};
