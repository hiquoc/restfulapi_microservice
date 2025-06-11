  class Cart {
    constructor({ cart_id, account_id, product_id, quantity, price }) {
      this.cart_id = cart_id || null;
      this.account_id = account_id;
      this.product_id = product_id;
      this.quantity = quantity;
      this.price = price;
    }

  // Phương thức validate dữ liệu
  validate(stock) {
    const errors = [];

    if (!this.account_id) {
      errors.push("Thiếu account_id");
    }

    if (!this.product_id) {
      errors.push("Thiếu product_id");
    }

    if (!this.quantity || this.quantity <= 0) {
      errors.push("Số lượng phải lớn hơn 0");
    }

    if (this.quantity > stock) {
      errors.push("Số lượng vượt quá tồn kho");
    }

    if (!this.price || this.price <= 0) {
      errors.push("Giá phải lớn hơn 0");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
module.exports=Cart;