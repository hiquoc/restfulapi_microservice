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
      const products = await axios.get(`http://localhost:3002/category/${category}`, {}); 
      const tops = await axios.get(`http://localhost:3002/top`, {}); 
      res.render("product/products", { products:products.data,tops:tops.data,name });
    } catch (e) {
      console.error("Lỗi khi lấy sản phẩm");
      res.status(500).json({ message: "Lỗi server" });
    }
  }
}
module.exports = new productController();
