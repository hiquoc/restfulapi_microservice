class Order {
  constructor({ order_id, account_id, total_price, status, created_at }) {
    this.order_id = order_id || null;
    this.account_id = account_id;
    this.total_price = total_price;
    this.created_at = created_at || new Date();
  }

  // Phương thức validate dữ liệu
  validate() {
    const errors = [];

    if (!this.account_id) {
      errors.push("Thiếu account_id");
    }

    if (!this.total_price || this.total_price <= 0) {
      errors.push("Tổng giá phải lớn hơn 0");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
module.exports = Order;
