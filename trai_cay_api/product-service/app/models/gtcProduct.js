const Product = require("./product");

class gtcProduct extends Product {
  constructor(data) {
    super({ ...data, category: 1 });
  }
  static createProduct(data){
    return new gtcProduct(data);
  }
}

module.exports = gtcProduct;