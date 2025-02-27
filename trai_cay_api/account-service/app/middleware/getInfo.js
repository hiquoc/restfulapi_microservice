const jwt = require("jsonwebtoken");
const db = require("../config/mysql");

const getInfo = (req, res, next) => {
    const token = req.cookies.token; // Lấy token từ cookie

    if (!token) {
        return res.status(401).json({ message: "Vui lòng đăng nhập" }); // Không có token
    }

    jwt.verify(token, "huy", async (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Token không hợp lệ" });
        }

        try {
            const sql = "SELECT account_id, username, fullname, phone, email, role FROM account WHERE username = ?";
            const [rows] = await db.promise().query(sql, [decoded.username]);

            if (rows.length === 0) {
                return res.status(401).json({ message: "Token không hợp lệ" });
            }

            req.user = rows[0]; // Lưu thông tin user vào req.user
            next();
        } catch (error) {
            console.error("Lỗi truy vấn SQL:", error);
            return res.status(500).json({ message: "Lỗi server" });
        }
    });
};

module.exports = getInfo;
