const axios = require("axios");

const AuthProxy = {
  checkAdmin: async (req, res, next) => {
    try {
      const token = req.headers.authorization;
      const response = await axios.get("http://account-service:3001/admin", {
        headers: { Authorization: `${token}` },
      });

      if (response.status === 401 || response.status === 403) {
        return res.status(401).json({ message: "Không có quyền!" });
      }
      next(); // Cho phép tiếp tục nếu xác thực thành công
    } catch (e) {
      console.error("Lỗi xác thực proxy:", e.response?.data || e.message);
      return res.status(500).json({
        message: "Lỗi proxy xác thực",
        error: e.response?.data || e.message,
      });
    }
  },
  checkLoggedIn: async (req, res, next) => {
    try {
      const token = req.headers.authorization;

      const response = await axios.get("http://account-service:3001/loggedin", {
        headers: { Authorization: `${token}` },
        validateStatus: () => true,
      });

      if (response.status === 401 || response.status === 403) {
        console.log("Vui lòng đăng nhập!");
        return res.status(401).json({ message: "Vui lòng đăng nhập!" });
      }

      req.user = response.data.user;
      next();
    } catch (e) {
      console.error("Lỗi xác thực đăng nhập:", e.response?.data || e.message);
      res.status(500).json({
        message: "Lỗi proxy xác thực đăng nhập",
        error: e.response?.data || e.message,
      });
    }
  },
};

module.exports = AuthProxy;
