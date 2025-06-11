const db = require("../config/mysql");
const axios = require("axios");
const BuyRepository = require("../repositories/buyRepository");
const CartFacade = require("../facade/cartFacade");
const OrderFacade = require("../facade/orderFacade");

module.exports = {
  cartPost: async (req, res) => {
    const connection = await db.promise().getConnection();
    const buyRepo = new BuyRepository(connection);

    try {
      const { product_id, quantity } = req.body;
      const account_id = req.user.account_id;
      const stock = Number(req.product.stock);
      const unitPrice = Math.round(
        req.product.price * (1 - req.product.discount / 100)
      );

      const cartItem = CartFacade.create({
        account_id,
        product_id,
        quantity: Number(quantity),
        price: unitPrice,
      });

      await buyRepo.addOrUpdateCartItem(cartItem, stock);

      return res.status(201).json({
        success: true,
        message: "Thêm vào giỏ thành công!",
      });
    } catch (error) {
      const statusCode = error.message.includes("tồn kho") ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    } finally {
      connection.release();
    }
  },

  cartGet: async (req, res) => {
    const connection = await db.promise().getConnection();
    const buyRepo = new BuyRepository(connection);

    try {
      const account_id = req.user.account_id;
      const { cartItems, total } = await buyRepo.getCartItems(
        account_id,
        req.products
      );
      return res.status(200).json({ cartItems, sum: total });
    } catch (error) {
      console.log(error.message);
      return res.status(500).json({
        success: false,
        message: "Lỗi server!",
      });
    } finally {
      connection.release();
    }
  },

  cartDelete: async (req, res) => {
    const connection = await db.promise().getConnection();
    const buyRepo = new BuyRepository(connection);

    try {
      const account_id = req.user.account_id;
      const cart_id = req.params.cart_id;

      const deleted = await buyRepo.removeCartItem(cart_id, account_id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy sản phẩm trong giỏ hàng",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Xóa thành công!",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    } finally {
      connection.release();
    }
  },

  cartPatch: async (req, res) => {
    const connection = await db.promise().getConnection();
    const buyRepo = new BuyRepository(connection);

    try {
      const account_id = req.user.account_id;
      const cart_id = req.params.cart_id;
      const quantity = Number(req.body.quantity);
      const stock = req.product.stock;
      const unitPrice = Math.round(
        req.product.price * (1 - req.product.discount / 100)
      );

      const cartItem = CartFacade.create({
        cart_id,
        account_id,
        quantity,
        price: unitPrice * quantity,
      });

      CartFacade.validateStock(cartItem, stock);

      const updated = await buyRepo.updateCartItemQuantity(
        cartItem.cart_id,
        cartItem.account_id,
        cartItem.quantity,
        cartItem.price
      );
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy sản phẩm trong giỏ hàng",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Cập nhật thành công!",
      });
    } catch (error) {
      const statusCode = error.message.includes("tồn kho") ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    } finally {
      connection.release();
    }
  },

  orderPost: async (req, res) => {
    const connection = await db.promise().getConnection();
    const buyRepo = new BuyRepository(connection);

    try {
      await connection.beginTransaction();

      const account_id = req.user.account_id;
      const { cartItems, total } = await buyRepo.getCartItems(
        account_id,
        req.products
      );
      const orderId = await buyRepo.createOrder(account_id, total);
      await buyRepo.addOrderItems(
        orderId,
        cartItems.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
        }))
      );

      const deleted = await buyRepo.removeCart(account_id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy sản phẩm trong giỏ hàng",
        });
      }

      try {
        const token = req.headers.authorization;
        await axios.patch(
          "http://product-service:3002/orderAdd",
          cartItems.map((item) => [item.product_id, item.quantity]),
          { headers: { Authorization: token } }
        );

        await connection.commit();
        return res.status(200).json({
          success: true,
          message: "Đơn hàng được tạo thành công!",
        });
      } catch (stockError) {
        await connection.rollback();
        return res.status(500).json({
          success: false,
          message: "Đơn hàng được tạo nhưng cập nhật tồn kho thất bại",
        });
      }
    } catch (error) {
      await connection.rollback();
      console.log(error.message);
      return res.status(500).json({
        success: false,
        message: error.message || "Tạo đơn hàng thất bại!",
      });
    } finally {
      connection.release();
    }
  },

  ordersGet: async (req, res) => {
    const connection = await db.promise().getConnection();
    const buyRepo = new BuyRepository(connection);

    try {
      const products = req.products;
      const accounts = req.users;
      const account_id = req.params.account_id;

      const rawOrders = account_id
        ? await buyRepo.getOrdersByAccount(account_id, req.query.sort)
        : await buyRepo.getAllOrders(req.query.sort);

      const orders = rawOrders.map((order) =>
        OrderFacade.createOrderWithItems(order, order.items)
      );

      const allOrderItems = orders.flatMap((order) =>
        order.items.map((item) => ({
          ...item,
          order_id: order.order_id,
          account_id: order.account_id,
          created_at: order.created_at,
        }))
      );
      const enrichedItems = OrderFacade.enrichOrderItems(
        allOrderItems,
        products,
        accounts
      );
      return res.status(200).json({ orderItems: enrichedItems });
    } catch (error) {
      console.log(error.message);
      return res.status(500).json({ message: "Lỗi server!" });
    } finally {
      connection.release();
    }
  },

  orderUpdateStatus: async (req, res) => {
    const { order_item_id } = req.params;
    const { status } = req.body;
    const connection = await db.promise().getConnection();
    const buyRepo = new BuyRepository(connection);

    try {
      await connection.beginTransaction();

      if (status === "da-huy") {
        const itemsToCancel = await buyRepo.getItemsForCancellation(
          order_item_id
        );

        if (itemsToCancel.length > 0) {
          try {
            const token = req.headers.authorization;
            await axios.patch(
              "http://product-service:3002/orderAbort",
              itemsToCancel.map((item) => [item.product_id, item.quantity]),
              { headers: { Authorization: token } }
            );
          } catch (stockError) {
            await connection.rollback();
            return res.status(500).json({
              success: false,
              message: "Lỗi khi hoàn trả tồn kho",
            });
          }
        }
      }

      await buyRepo.updateOrderStatus(order_item_id, status);
      await connection.commit();

      return res.status(200).json({
        success: true,
        message: "Cập nhật trạng thái đơn hàng thành công!",
      });
    } catch (error) {
      await connection.rollback();
      return res.status(500).json({
        success: false,
        message: error.message || "Lỗi server khi cập nhật đơn hàng",
      });
    } finally {
      connection.release();
    }
  },
  orderGet: async (req, res) => {
    const connection = await db.promise().getConnection();
    const buyRepo = new BuyRepository(connection);

    try {
      const account_id = req.user.account_id;
      const products = req.products;

      const orders = await buyRepo.getOrdersByAccount(
        account_id,
        req.query.sort
      );

      const productMap = new Map(
        products.map((p) => [
          p.product_id,
          { mainImg: p.mainImg, name: p.name },
        ])
      );

      const Orders = orders.flatMap((order) =>
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
        orderItems: Orders,
      });
    } catch (error) {
      console.error("Lỗi lấy đơn hàng:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server khi lấy đơn hàng",
      });
    } finally {
      connection.release();
    }
  },

  thongke: async (req, res) => {
    const connection = await db.promise().getConnection();
    const buyRepo = new BuyRepository(connection);

    try {
      const products = req.products;
      const sortedProducts = products
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 10);
      const stats = await buyRepo.getSalesStatistics();

      return res.status(200).json({
        products: sortedProducts,
        orders: stats.orders,
        revenue: stats.revenue,
        revenueByMonth: stats.revenueByMonth,
      });
    } catch (err) {
      return res.status(500).json({ error: "Lỗi server" });
    } finally {
      connection.release();
    }
  },
};
