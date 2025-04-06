const jwt = require("jsonwebtoken");
const db = require("../config/mysql");

const checkAdmin = async (req, res, next) => {

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Vui lòng đăng nhập!" });
  }
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Vui lòng đăng nhập!" });
  }

  try {
    const decoded = jwt.verify(token, "huy");

    const sql = "SELECT role FROM accounts WHERE username = ?";
    const [rows] = await db.promise().query(sql, [decoded.username]);

    if (rows.length === 0) {
      return res.status(401).json({ message: "Token không hợp lệ" });
    }
    if (rows[0].role == "user"){
      return res.status(401).json({ message: "Không có quyền truy cập!" });
    }
    next();
  } catch (error) {
    console.error("Lỗi xác thực token:", error);
    return res
      .status(403)
      .json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }
};

module.exports = checkAdmin;
