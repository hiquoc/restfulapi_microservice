const axios = require('axios');
const checkAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization;
        const response = await axios.get("http://localhost:3001/admin", {
          headers: { Authorization: `${token}` }, // Đúng cấu trúc
          validateStatus: () => true
        });

        if (response.status === 401 || response.status === 403) {
            res.status(401).json({ message: "Không có quyền!" });
            return;
        }
        next();
      } catch (e) {
        console.error("Lỗi server:", e.response ? e.response.data : e.message); 
        res.status(500).json({ message: "Lỗi server", error: e.response ? e.response.data : e.message });
      }
      
};

module.exports = checkAdmin;
