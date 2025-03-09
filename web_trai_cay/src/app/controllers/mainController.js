const axios = require("axios");

class accountController {
  async main(req, res) {
    try {
      const response = await axios.get(`http://localhost:3002`, {});
      res.render("home", { hots: response.data});
    } catch (e) {
      console.error("Lỗi khi lấy sản phẩm");
      res.status(500).json({ message: "Lỗi server" });
    }
  }
   checkout(req, res) {
    res.render("checkout");
  }
}
module.exports = new accountController();
