const axios = require('axios');

const checkLoggedIn = async (req, res, next) => {

    try {
        const token = req.headers.authorization;
        const response = await axios.get("http://account-service:3001/loggedin", {
            headers: { Authorization: `${token}` },
            validateStatus: () => true // Prevent axios from throwing an error on 4xx/5xx responses
        });

        if (response.status === 401 || response.status === 403) {
            console.log("Vui lòng đăng nhập!")
            return res.status(401).json({ message: "Vui lòng đăng nhập!" });
        }
        req.user = response.data.user;
        next();
    } catch (e) {
        console.error("Lỗi server:", e.response ? e.response.data : e.message);
        res.status(500).json({ message: "Lỗi server", error: e.response ? e.response.data : e.message });
    }
};

module.exports = checkLoggedIn;
