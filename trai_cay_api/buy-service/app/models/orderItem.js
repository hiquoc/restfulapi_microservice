class OrderItem {
  constructor({
    order_item_id,
    order_id,
    product_id,
    quantity,
    price,
    status,
  }) {
    this.order_item_id = order_item_id || null;
    this.order_id = order_id;
    this.product_id = product_id;
    this.quantity = quantity;
    this.price = price;
    this.status = status || "dang-xu-ly";
  }

  // Phương thức validate dữ liệu
  validate(stock) {
    const errors = [];

    if (!this.order_id) {
      errors.push("Thiếu order_id");
    }

    if (!this.product_id) {
      errors.push("Thiếu product_id");
    }

    if (!this.quantity || this.quantity <= 0) {
      errors.push("Số lượng phải lớn hơn 0");
    }

    if (stock && this.quantity > stock) {
      errors.push("Số lượng vượt quá tồn kho");
    }

    if (!this.price || this.price <= 0) {
      errors.push("Giá phải lớn hơn 0");
    }

    const validStatuses = ["dang-xu-ly", "dang-giao", "da-giao", "da-huy"];
    if (!validStatuses.includes(this.status)) {
      errors.push("Trạng thái đơn hàng không hợp lệ");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
module.exports = OrderItem;