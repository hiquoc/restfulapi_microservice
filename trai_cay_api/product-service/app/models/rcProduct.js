const Product = require("./product");

class rcProduct extends Product {
  constructor(data) {
    super({ ...data, category: 3 });
  }
  static createProduct(data){
    return new rcProduct(data);
  }
}

module.exports = rcProduct;