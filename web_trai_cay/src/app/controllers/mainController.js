const axios = require("axios");

class accountController {
  async main(req, res) {
    try {
      let { data:hots } = await axios.get(`http://localhost:3002/top`);
      hots = hots.slice(0, 5);

      let { data:gio_trai_cay } = await axios.get(`http://localhost:3002/category/1`);
      gio_trai_cay = gio_trai_cay.slice(0, 5);
      let { data:trai_cay } = await axios.get(`http://localhost:3002/category/2`);
      trai_cay = trai_cay.slice(0, 5);
      let { data:rau_cu } = await axios.get(`http://localhost:3002/category/3`);
      rau_cu = rau_cu.slice(0, 5);

      res.render("home", { hots, gio_trai_cay, trai_cay, rau_cu });
    } catch (e) {
      console.error("Lỗi khi lấy sản phẩm");
      res.status(500).json({ message: "Lỗi server" });
    }
  }

  checkout(req, res) {
    res.render("checkout", { layout: "checkout" });
  }
  async search(req, res) {
    const product = req.query.text;
    try {
      const products = await axios.get(
        `http://localhost:3002/products/${product}`,
        {}
      );
      const tops = await axios.get(`http://localhost:3002/top`, {});
      res.render("search", {
        products: products.data,
        tops: tops.data.slice(0,5),
        name: product,
      });
    } catch (e) {
      console.error("Lỗi khi lấy sản phẩm");
      res.status(500).json({ message: "Lỗi server" });
    }
  }
  async top(req, res) {
    try {
      const tops = await axios.get(`http://localhost:3002/top`, {});
      res.render("search", {
        products: tops.data,
        tops: tops.data.slice(0,5),
        name: "Mua nhiều nhất",
      });
    } catch (e) {
      console.error("Lỗi khi lấy sản phẩm");
      res.status(500).json({ message: "Lỗi server" });
    }
  }
}
module.exports = new accountController();
