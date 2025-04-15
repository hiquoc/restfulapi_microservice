const Order = require("../models/order");
const OrderItem = require("../models/orderItem");
const OrderFacade = {
  create: (data) => {
    return new Order(data);
  },

  fromDB: (dbData) => {
    return new Order({
      order_id: dbData.order_id,
      account_id: dbData.account_id,
      total_price: dbData.total_price,
      status: dbData.status,
      created_at: dbData.created_at,
    });
  },

  createItem: (data) => {
    return new OrderItem(data);
  },

  fromDBItem: (dbData) => {
    return new OrderItem({
      order_item_id: dbData.order_item_id,
      order_id: dbData.order_id,
      product_id: dbData.product_id,
      quantity: dbData.quantity,
      price: dbData.price,
      status: dbData.status,
    });
  },

  // Các phương thức nghiệp vụ
  createWithItems: async (connection, account_id, cartItems, products) => {
    try {
      await connection.beginTransaction();

      // Kiểm tra và tính toán
      let total_price = 0;
      const orderItems = cartItems.map((cartItem) => {
        const product = products.find(
          (p) => p.product_id === cartItem.product_id
        );
        if (!product || product.stock < cartItem.quantity) {
          throw new Error(
            `Sản phẩm ${product?.name || cartItem.product_id} đã hết hàng!`
          );
        }
        total_price += cartItem.price;
        return [cartItem.product_id, cartItem.quantity, cartItem.price];
      });

      // Tạo order
      const [order] = await connection.query(
        "INSERT INTO orders (account_id, total_price) VALUES (?, ?)",
        [account_id, total_price]
      );
      const order_id = order.insertId;

      // Thêm order items
      await connection.query(
        "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?",
        [orderItems.map((item) => [order_id, ...item])]
      );

      // Xóa giỏ hàng
      await connection.query("DELETE FROM carts WHERE account_id = ?", [
        account_id,
      ]);

      await connection.commit();

      return {
        order: OrderFacade
      .fromDB({
          order_id,
          account_id,
          total_price,
          status: "pending",
        }),
        items: orderItems.map((item) =>
          OrderFacade
      .createItem({
            order_id,
            product_id: item[0],
            quantity: item[1],
            price: item[2],
            status: "pending",
          })
        ),
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  },

  getByAccount: async (db, account_id, status) => {
    let sql = `
        SELECT o.*, oi.* 
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        WHERE o.account_id = ?
      `;
    const params = [account_id];

    if (status) {
      sql += " AND oi.status = ?";
      params.push(status);
    }

    sql += " ORDER BY o.created_at DESC";

    const [results] = await db.promise().query(sql, params);

    if (!results.length) return [];

    // Nhóm các items theo order
    const ordersMap = new Map();
    results.forEach((row) => {
      if (!ordersMap.has(row.order_id)) {
        ordersMap.set(row.order_id, OrderFacade
        .fromDB(row));
      }
      const order = ordersMap.get(row.order_id);
      if (!order.items) order.items = [];
      order.items.push(OrderFacade
      .fromDBItem(row));
    });

    return Array.from(ordersMap.values());
  },

  updateStatus: async (connection, order_item_id, status) => {
    await connection.query(
      "UPDATE order_items SET status = ? WHERE order_item_id = ?",
      [status, order_item_id]
    );
  },
  getItemsForCancellation: async (connection, order_item_id) => {
    const [items] = await connection.query(
      "SELECT product_id, quantity FROM order_items WHERE order_item_id = ? AND status != 'da-huy'",
      [order_item_id]
    );
    return items;
  },
}
module.exports = OrderFacade;
