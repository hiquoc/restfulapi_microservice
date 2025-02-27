const jwt = require("jsonwebtoken");
const db = require("../config/mysql");

const getInfo = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1]; // Lấy token từ header

    if (!token) {
        return res.status(401).json({ message: "Vui lòng đăng nhập" }); // Khong co token
    }

    jwt.verify(token, "huy", async (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Token không hợp lệ" });
        }

        const sql = "SELECT account_id, username, fullname, phone, email, role FROM account WHERE username = ?";
        const [rows] = await db.promise().query(sql, decoded.username);

        if (rows.length === 0) {
            return res.status(401).json({ message: "Token không hợp lệ" });
        }

        const user = rows[0]; // Lấy user đầu tiên
        req.user = user;
        next();
    });
};

module.exports = getInfo;
