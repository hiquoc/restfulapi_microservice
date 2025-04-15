const axios = require("axios");

class productController {
  async productPage(req, res) {
    const product_id=req.params.id;
    try {
      const product = await axios.get(`http://localhost:3002/${product_id}`, {}); 
      const random = await axios.get(`http://localhost:3002/random/${product_id}`, {}); 
      res.render("product/product", { product: product.data[0],other:random.data});
    } catch (e) {
      console.error("Lỗi khi lấy sản phẩm");
      res.status(500).json({ message: "Lỗi server" });
    }
  }
  async category(req, res) {
    const category=req.params.category;
    let name;
    switch (category) {
      case "1": {name="Giỏ trái cây";break}
      case "2": {name="Trái cây";break}
      case "3": {name="Rau củ";break}
    }
    try {
      const results = await axios.get(`http://localhost:3002/category/${category}`, {});
      let products=results.data;
      if (req.query.sort) {
        switch (req.query.sort) {
          case "thap-den-cao":
            products.sort((a, b) => a.afterDiscount - b.afterDiscount);
            break;
          case "cao-den-thap":
            products.sort((a, b) => b.afterDiscount - a.afterDiscount);
            break;
          case "moi-nhap":
            products.sort((a, b) => b.product_id - a.product_id);
            break;
          case "mua-nhieu":
            products.sort((a, b) => b.sold - a.sold);
            break;
          default:
            products.sort((a, b) => b.product_id - a.product_id);
            break;
        }
      }
      const tops = await axios.get(`http://localhost:3002/top`, {}); 
      res.render("product/products", { products:products,tops:tops.data,name });
    } catch (e) {
      console.error("Lỗi khi lấy sản phẩm");
      res.status(500).json({ message: "Lỗi server" });
    }
  }
}
module.exports = new productController();
