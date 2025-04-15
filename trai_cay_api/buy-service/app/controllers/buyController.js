const db = require("../config/mysql");
const axios = require("axios");
const cartFacade = require("../facade/cartFacade");
const orderFacade = require("../facade/orderFacade");
module.exports = {
  cartPost: async (req, res) => {
    try {
      const { product_id, quantity } = req.body;
      const account_id = req.user.account_id;
      const stock = req.product.stock;
      const unitPrice = Math.round(req.product.price * (1 - req.product.discount / 100));

      const cartData = {
        account_id,
        product_id,
        quantity: Number(quantity),
        price: unitPrice * quantity,
      };

      await cartFacade.addOrUpdateItem(db, cartData, stock);

      return res.status(201).json({
        success: true,
        message: "Thêm vào giỏ thành công!",
      });
    } catch (error) {
      console.error("Lỗi thêm vào giỏ:", error);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  cartGet: async (req, res) => {
    try {
      const account_id = req.user.account_id;
      const products = req.products;
      const cartData = await cartFacade.cartGet(
        db,
        account_id,
        products
      );
      return res.status(200).json({
        cartItems: cartData.cartItems,
        sum: cartData.total,
      });
    } catch (error) {
      console.error("Lỗi lấy giỏ hàng:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server!",
      });
    }
  },

  cartDelete: async (req, res) => {
    try {
      const account_id = req.user.account_id;
      const cart_id = req.params.cart_id;

      await cartFacade.removeItem(db, cart_id, account_id);

      return res.status(200).json({
        success: true,
        message: "Xóa thành công!",
      });
    } catch (error) {
      console.error("Lỗi xóa giỏ hàng:", error);
      const statusCode = error.message.includes("Không tìm thấy")
        ? 404
        : error.message.includes("Không có quyền")
        ? 403
        : 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }
  },

  cartPatch: async (req, res) => {
    try {
      const account_id = req.user.account_id;
      const cart_id = req.params.cart_id;
      const quantity = Number(req.body.quantity);
      const stock = req.product.stock;

      await cartFacade.updateQuantity(
        db,
        cart_id,
        account_id,
        quantity,
        stock
      );

      return res.status(200).json({
        success: true,
        message: "Cập nhật thành công!",
      });
    } catch (error) {
      console.error("Lỗi cập nhật giỏ hàng:", error);
      const statusCode = error.message.includes("Số lượng")
        ? 400
        : error.message.includes("Không tìm thấy")
        ? 404
        : error.message.includes("Không có quyền")
        ? 403
        : 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }
  },
  
  orderPost: async (req, res) => {
    const account_id = req.user.account_id;
    const products = req.products;
    const connection = await db.promise().getConnection();

    try {
      await connection.beginTransaction();

      const [cartItems] = await connection.query(
        "SELECT * FROM carts WHERE account_id = ?",
        [account_id]
      );

      if (!cartItems.length) {
        await connection.rollback();
        return res.status(403).json({
          success: false,
          message: "Giỏ hàng trống!",
        });
      }

      const { order, items } = await orderFacade.createWithItems(
        connection,
        account_id,
        cartItems,
        products
      );

      // Update product stock
      try {
        const stockUpdateData = items.map((item) => [
          item.product_id,
          item.quantity,
        ]);

        const token = req.headers.authorization;
        await axios.patch(
          "http://product-service:3002/orderAdd",
          stockUpdateData, 
          {
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
          }
        );

        await connection.commit();

        return res.status(200).json({
          success: true,
          message: "Đơn hàng được tạo thành công!",
        });
      } catch (stockError) {
        await connection.rollback();
        console.error("Lỗi cập nhật tồn kho:" + stockError.message);
        return res.status(500).json({
          success: false,
          message: "Đơn hàng được tạo nhưng cập nhật tồn kho thất bại",
        });
      }
    } catch (error) {
      if (connection) await connection.rollback();
      console.error("Lỗi tạo đơn hàng:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Tạo đơn hàng thất bại!",
      });
    } finally {
      if (connection) connection.release();
    }
  },

  orderGet: async (req, res) => {
    try {
      const account_id = req.user.account_id;
      const products = req.products;

      const orders = await orderFacade.getByAccount(
        db,
        account_id,
        req.query.sort
      );

      const productMap = new Map(
        products.map((p) => [
          p.product_id,
          {
            mainImg: p.mainImg,
            name: p.name,
          },
        ])
      );

      const enrichedOrders = orders.flatMap((order) =>
        order.items.map((item) => ({
          ...item,
          account_id: order.account_id,
          created_at: order.created_at,
          mainImg: productMap.get(item.product_id)?.mainImg || "",
          name:
            productMap.get(item.product_id)?.name || "Sản phẩm không xác định",
        }))
      );

      return res.status(200).json({
        success: true,
        orderItems: enrichedOrders,
      });
    } catch (error) {
      console.error("Lỗi lấy đơn hàng:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server khi lấy đơn hàng",
      });
    }
  },

  orderUpdateStatus: async (req, res) => {
    const { order_item_id } = req.params;
    const { status } = req.body;
    const connection = await db.promise().getConnection();

    try {
      await connection.beginTransaction();

      if (status === "da-huy") {
        const itemsToCancel = await orderFacade.getItemsForCancellation(
          connection,
          order_item_id
        );

        if (itemsToCancel.length > 0) {
          try {
            const token = req.headers.authorization;
            await axios.patch(
              "http://product-service:3002/orderAbort",
              itemsToCancel.map((item) => [item.product_id, item.quantity]),
              {
                headers: {
                  Authorization: token,
                  "Content-Type": "application/json",
                },
              }
            );
          } catch (stockError) {
            await connection.rollback();
            console.error("Lỗi hoàn trả tồn kho:", stockError);
            return res.status(500).json({
              success: false,
              message: "Lỗi khi hoàn trả tồn kho",
            });
          }
        }
      }

      await orderFacade.updateStatus(connection, order_item_id, status);

      await connection.commit();
      return res.status(200).json({
        success: true,
        message: "Cập nhật trạng thái đơn hàng thành công!",
      });
    } catch (error) {
      await connection.rollback();
      console.error("Lỗi cập nhật đơn hàng:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Lỗi server khi cập nhật đơn hàng",
      });
    } finally {
      connection.release();
    }
  },

  ordersGet: async (req, res) => {
    const products = req.products;
    const accounts = req.users;
    try {
      let orderSql = `SELECT  oi.order_item_id,o.account_id, oi.price, oi.status, o.created_at, oi.product_id, oi.quantity
                        FROM buy_db.orders o
                        JOIN buy_db.order_items oi ON o.order_id = oi.order_id
                        `;
      if (req.query.sort) {
        orderSql += ` WHERE oi.status ='${req.query.sort}'`;
      }
      orderSql += ` ORDER BY o.created_at DESC;`;
      const [orderItems] = await db.promise().query(orderSql);

      const productMap = new Map(
        products.map((product) => [
          product.product_id,
          { mainImg: product.mainImg, name: product.name },
        ])
      );
      const accountMap = new Map(
        accounts.map((account) => [
          account.account_id,
          { ...account, password: undefined },
        ])
      );

      orderItems.forEach((orderItem) => {
        const productInfo = productMap.get(orderItem.product_id);
        const accountInfo = accountMap.get(orderItem.account_id);
        orderItem.mainImg = productInfo.mainImg;
        orderItem.name = productInfo.name;
        Object.assign(orderItem, accountInfo);
      });
      return res.status(200).json({ orderItems });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  ordersGet1: async (req, res) => {
    const account_id = req.params.account_id;
    const products = req.products;
    const accounts = req.users;
    try {
      let orderSql = `SELECT  oi.order_item_id,o.account_id, oi.price, oi.status, o.created_at, oi.product_id, oi.quantity
                        FROM buy_db.orders o
                        JOIN buy_db.order_items oi ON o.order_id = oi.order_id
                        WHERE account_id=?
                        `;
      if (req.query.sort) {
        orderSql += ` AND oi.status ='${req.query.sort}'`;
      }
      orderSql += ` ORDER BY o.created_at DESC;`;
      const [orderItems] = await db.promise().query(orderSql, [account_id]);

      const productMap = new Map(
        products.map((product) => [
          product.product_id,
          { mainImg: product.mainImg, name: product.name },
        ])
      );
      const accountMap = new Map(
        accounts.map((account) => [
          account.account_id,
          { ...account, password: undefined },
        ])
      );

      orderItems.forEach((orderItem) => {
        const productInfo = productMap.get(orderItem.product_id);
        const accountInfo = accountMap.get(orderItem.account_id);
        orderItem.mainImg = productInfo.mainImg;
        orderItem.name = productInfo.name;
        Object.assign(orderItem, accountInfo);
      });
      return res.status(200).json({ orderItems });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  thongke: async(req,res)=>{
    try {
      const products=req.products;
      const sortedProducts = products.sort((a, b) => b.sold - a.sold).slice(0, 10);
      const [orders] = await db.promise().query(`
        SELECT DATE(created_at) AS date, COUNT(*) AS total
        FROM orders
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
      `);
      const [revenue] = await db.promise().query(`
        SELECT DATE(created_at) AS date, SUM(total_price) AS total
        FROM orders
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
      `);
      const [revenueByMonth] = await db.promise().query(`
        SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, SUM(total_price) AS total
        FROM orders
        GROUP BY month
        ORDER BY month
      `);
      

      return res.status(200).json({ products:sortedProducts,orders,revenue,revenueByMonth });
    } catch (err) {
      console.log(err)
      return res.status(500).json({ error: "Lỗi server" });
    }
  }
};
