const jwt = require("jsonwebtoken");
const db = require("../config/mysql");

const AuthProxy = {
  verifyToken: async (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw { status: 401, message: "Vui lòng đăng nhập!" };
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw { status: 401, message: "Token không hợp lệ!" };
    }

    try {
      const decoded = jwt.verify(token, "huy");
      return decoded;
    } catch (err) {
      throw { status: 403, message: "Token không hợp lệ hoặc đã hết hạn" };
    }
  },
  checkAdmin: async (req, res, next) => {
    try {
      const decoded = await AuthProxy.verifyToken(req);

      const [rows] = await db
        .promise()
        .query("SELECT role FROM accounts WHERE username = ?", [decoded.username]);

      if (rows.length === 0) {
        return res.status(401).json({ message: "Token không hợp lệ" });
      }

      if (rows[0].role !== "admin") {
        return res.status(401).json({ message: "Không có quyền truy cập!" });
      }

      req.user = decoded;
      next();
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Lỗi server" });
    }
  },
  checkLoggedIn: async (req, res, next) => {
    try {
      const decoded = await AuthProxy.verifyToken(req);
  
      const sql = "SELECT account_id FROM accounts WHERE username = ?";
      const [rows] = await db.promise().query(sql, [decoded.username]);
  
      if (rows.length === 0) {
        return res.status(401).json({ message: "Vui lòng đăng nhập" });
      }
  
      req.user = rows[0];
      next();
    } catch (error) {
      return res.status(403).json({ message: "Vui lòng đăng nhập lại" });
    }
  },
}

module.exports = AuthProxy;