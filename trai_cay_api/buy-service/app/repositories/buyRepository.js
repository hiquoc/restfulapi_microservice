class BuyRepository {
  constructor(connection) {
    this.connection = connection;
  }
  async addOrUpdateCartItem(cartData, stock) {
    const { account_id, product_id, quantity, unitPrice } = cartData;

    const [existingRows] = await this.connection.query(
      "SELECT quantity FROM carts WHERE account_id = ? AND product_id = ?",
      [account_id, product_id]
    );

    const existingQuantity =
      existingRows.length > 0 ? existingRows[0].quantity : 0;
    const totalQuantity = existingQuantity + quantity;

    if (totalQuantity > stock) {
      throw new Error("Số lượng vượt quá tồn kho!");
    }

    const totalPrice = unitPrice * totalQuantity;

    const sql = `
    INSERT INTO carts (account_id, product_id, quantity, price)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      quantity = ?,
      price = ?
  `;
    await this.connection.query(sql, [
      account_id,
      product_id,
      totalQuantity,
      totalPrice,
      totalQuantity,
      totalPrice,
    ]);
  }

  async getCartItems(account_id, products) {
    const [rows] = await this.connection.query(
      "SELECT * FROM carts WHERE account_id = ?",
      [account_id]
    );

    const productMap = new Map(
      products.map((product) => [
        product.product_id,
        {
          mainImg: product.mainImg,
          name: product.name,
          discount: product.discount,
          beforeDiscount: product.price,
        },
      ])
    );

    let sum = 0;
    const enrichedItems = rows.map((item) => {
      sum += item.price;
      const productInfo = productMap.get(item.product_id);
      return {
        ...item,
        mainImg: productInfo?.mainImg || "",
        name: productInfo?.name || "Unknown Product",
        discount: productInfo?.discount,
        beforeDiscount: productInfo?.beforeDiscount,
      };
    });

    return {
      cartItems: enrichedItems,
      total: sum,
    };
  }

  async removeCartItem(cart_id, account_id) {
    const [result] = await this.connection.query(
      "DELETE FROM carts WHERE cart_id = ? AND account_id = ?",
      [cart_id, account_id]
    );
    return result.affectedRows > 0;
  }
  async removeCart(account_id) {
    const [result0] = await this.connection.query(
      "DELETE FROM carts WHERE account_id = ?",
      [account_id]
    );
    return result0.affectedRows > 0;
  }

  async updateCartItemQuantity(cart_id, account_id, quantity, price) {
    const [result] = await this.connection.query(
      "UPDATE carts SET quantity = ?, price = ? WHERE cart_id = ? AND account_id = ?",
      [quantity, price, cart_id, account_id]
    );
    return result.affectedRows > 0;
  }

  async createOrder(account_id, total_price) {
    const [result] = await this.connection.query(
      "INSERT INTO orders (account_id, total_price) VALUES (?, ?)",
      [account_id, total_price]
    );
    return result.insertId;
  }

  async addOrderItems(order_id, items) {
    if (items.length === 0) return;

    const values = items.map((item) => [
      order_id,
      item.product_id,
      item.quantity,
      item.price,
      "dang-xu-ly",
    ]);

    await this.connection.query(
      "INSERT INTO order_items (order_id, product_id, quantity, price, status) VALUES ?",
      [values]
    );
  }

  async getOrdersByAccount(account_id, status) {
    let sql = `
      SELECT o.order_id, o.account_id, o.total_price, o.created_at,
             oi.order_item_id, oi.product_id, oi.quantity, oi.price, oi.status
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

    const [rows] = await this.connection.query(sql, params);
    return this._groupOrderItems(rows);
  }

  async getAllOrders(status) {
    let sql = `
      SELECT o.order_id, o.account_id, o.total_price, o.created_at,
             oi.order_item_id, oi.product_id, oi.quantity, oi.price, oi.status
      FROM orders o
      JOIN order_items oi ON o.order_id = oi.order_id
    `;

    const params = [];

    if (status) {
      sql += " WHERE oi.status = ?";
      params.push(status);
    }

    sql += " ORDER BY o.created_at DESC";

    const [rows] = await this.connection.query(sql, params);
    return this._groupOrderItems(rows);
  }

  async getItemsForCancellation(order_item_id) {
    const [rows] = await this.connection.query(
      `SELECT product_id, quantity 
       FROM order_items 
       WHERE order_item_id = ? AND status != 'da-huy'`,
      [order_item_id]
    );
    return rows;
  }

  async updateOrderStatus(order_item_id, status) {
    const [result] = await this.connection.query(
      "UPDATE order_items SET status = ? WHERE order_item_id = ?",
      [status, order_item_id]
    );
    return result.affectedRows > 0;
  }

  async getSalesStatistics() {
    const [orders] = await this.connection.query(`
      SELECT DATE(created_at) AS date, COUNT(*) AS total
      FROM orders
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    `);

    const [revenue] = await this.connection.query(`
      SELECT DATE(created_at) AS date, SUM(total_price) AS total
      FROM orders
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    `);

    const [revenueByMonth] = await this.connection.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, SUM(total_price) AS total
      FROM orders
      GROUP BY month
      ORDER BY month
    `);

    return { orders, revenue, revenueByMonth };
  }

  //==================== Helper Methods ====================

  _groupOrderItems(rows) {
    const orderMap = new Map();

    rows.forEach((row) => {
      if (!orderMap.has(row.order_id)) {
        orderMap.set(row.order_id, {
          order_id: row.order_id,
          account_id: row.account_id,
          total_price: row.total_price,
          created_at: row.created_at,
          items: [],
        });
      }

      orderMap.get(row.order_id).items.push({
        order_item_id: row.order_item_id,
        product_id: row.product_id,
        quantity: row.quantity,
        price: row.price,
        status: row.status,
      });
    });

    return Array.from(orderMap.values());
  }
}

module.exports = BuyRepository;
