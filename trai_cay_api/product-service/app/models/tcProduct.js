const Product = require("./product");

class tcProduct extends Product {
  constructor(data) {
    super({ ...data, category: 2 });
  }
  static createProduct(data){
    return new tcProduct(data);
  }
}

module.exports = tcProduct;