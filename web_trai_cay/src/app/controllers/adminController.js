const axios = require("axios");

class AccountController {
  async account(req, res) {
    res.render("admin/account", { layout: "admin" });
  }

  newProduct(req, res) {
    res.render("admin/newProduct", { layout: "admin" });
  }
  async product(req, res) {
    res.render("admin/product", { layout: "admin" });
  }
  async editProduct(req, res) {
    const product_id = req.params.product_id;
    try {
      const response = await axios.get(
        `http://localhost:3002/${product_id}`,
        {}
      );

      const product = response.data[0];
      res.render(`admin/edit`, { product, layout: "admin" });
    } catch (e) {
      console.error("Lỗi khi lấy sản phẩm");
      res.status(500).json({ message: "Lỗi server" });
    }
  }

  async order(req, res) {
    res.render("admin/order", { layout: "admin" });
  }
  async doanhThu(req, res) {
    res.render("admin/doanhthu", { layout: "admin" });
  }
}

module.exports = new AccountController();
