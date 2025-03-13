const axios = require("axios");

class accountController {
  async main(req, res) {
    try {
      const { data:hots } = await axios.get(`http://localhost:3002/top`);
      const topFive = hots.slice(0, 5);
      const { data: categoriesResponse } = await axios.get(
        `http://localhost:3002/categories`
      );

      // Ensure categories is always an array
      const categories = Array.isArray(categoriesResponse)
        ? categoriesResponse
        : [];
      let gio_trai_cay = [],
        trai_cay = [],
        rau_cu = [];

      const categoryRequests = categories.map((category) => {
        const url = `http://localhost:3002/category/${encodeURIComponent(
          category.category_id
        )}`;
        return axios.get(url).then((res) => {
          switch (category.name) {
            case "Giỏ trái cây":
              gio_trai_cay = res.data.slice(0, 10);
              break;
            case "Trái cây":
              trai_cay = res.data.slice(0,10)
              break;
            case "Rau củ":
              rau_cu = res.data.slice(0, 10);
              break;
          }
        });
      });

      await Promise.all(categoryRequests);

      res.render("home", { hots:topFive, gio_trai_cay, trai_cay, rau_cu });
    } catch (e) {
      console.error("Lỗi khi lấy sản phẩm", e);
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
