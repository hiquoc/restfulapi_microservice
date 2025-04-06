const db = require("../config/mysql");
const axios = require("axios");

module.exports = {
  cartPost: async (req, res) => {
    const { product_id, quantity } = req.body;
    const account_id = req.user.account_id;
    const stock = req.product.stock;
    const unitPrice = req.product.price;

    try {
      const checkStockSql =
        "SELECT quantity FROM carts WHERE account_id = ? AND product_id = ?";
      const [quantityResult] = await db
        .promise()
        .query(checkStockSql, [account_id, product_id]);

      let currentCartQuantity =
        quantityResult.length > 0 ? quantityResult[0].quantity : 0;

      if (currentCartQuantity + Number(quantity) > stock) {
        return res
          .status(400)
          .json({ message: "Số lượng sản phẩm trong kho có hạn!" });
      }

      const cartSql = `
            INSERT INTO carts (account_id, product_id, quantity, price) 
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                quantity = quantity + VALUES(quantity), 
                price = ${unitPrice} * (quantity + VALUES(quantity))`;

      await db
        .promise()
        .query(cartSql, [
          account_id,
          product_id,
          quantity,
          unitPrice * quantity,
        ]);

      return res.status(201).json({ message: "Thêm vào giỏ thành công!" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  cartGet: async (req, res) => {
    const account_id = req.user.account_id;
    const products = req.products;
    let sum = 0;
    try {
      const cartSql = "SELECT * FROM carts WHERE account_id=?";
      const [cartItems] = await db.promise().query(cartSql, [account_id]);

      const productMap = new Map(
        products.map((product) => [
          product.product_id,
          { mainImg: product.mainImg, name: product.name },
        ])
      );

      cartItems.forEach((cartItem) => {
        sum += cartItem.price;
        const productInfo = productMap.get(cartItem.product_id);
        cartItem.mainImg = productInfo.mainImg;
        cartItem.name = productInfo.name;
      });
      // console.log(products,sum);
      return res.status(200).json({ cartItems, sum });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  cartDelete: async (req, res) => {
    const account_id = req.user.account_id;
    const cart_id = req.params.cart_id;
    try {
      const getAccIdSql = "SELECT account_id FROM carts WHERE cart_id=?";
      const [result] = await db.promise().query(getAccIdSql, [cart_id]);
      if (account_id != result[0].account_id) {
        return res.status(403).json({ message: "Bạn không có quyền!" });
      }
      const delCartSql = "DELETE FROM carts WHERE cart_id=?";
      await db.promise().query(delCartSql, [cart_id]);
      return res.status(200).json({ message: "Xóa thành công!" });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: err.message });
    }
  },

  cartPatch: async (req, res) => {
    const account_id = req.user.account_id;
    const cart_id = req.params.cart_id;
    const quantity = req.body.quantity;
    const stock = req.product.stock;

    try {
      if (quantity > stock) {
        return res
          .status(400)
          .json({ message: "Số lượng sản phẩm trong kho có hạn!" });
      }

      const getAccIdSql =
        "SELECT account_id,price,quantity FROM carts WHERE cart_id=?";
      const [result] = await db.promise().query(getAccIdSql, [cart_id]);
      if (account_id != result[0].account_id) {
        return res.status(403).json({ message: "Bạn không có quyền!" });
      }
      const unit_price = result[0].price / result[0].quantity;
      const new_price = unit_price * quantity;
      const delCartSql = "UPDATE carts SET quantity=?, price=? WHERE cart_id=?";
      await db.promise().query(delCartSql, [quantity, new_price, cart_id]);
      return res.status(200).json({ message: "Cập nhật thành công!" });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: err.message });
    }
  },

  orderPost: async (req, res) => {
    const account_id = req.user.account_id;
    const products = req.products;
    let total_price = 0;

    const connection = await db.promise().getConnection(); // lấy connection riêng
    try {
      await connection.beginTransaction(); // bắt đầu transaction

      const cartSql = "SELECT * FROM carts WHERE account_id=?";
      const [cartItems] = await connection.query(cartSql, [account_id]);

      if (!cartItems.length || account_id != cartItems[0].account_id) {
        await connection.rollback();
        return res.status(403).json({ message: "Bạn không có quyền!" });
      }

      // Kiểm tra stock
      for (let cartItem of cartItems) {
        const product = products.find(
          (p) => p.product_id === cartItem.product_id
        );
        if (product && product.stock < cartItem.quantity) {
          await connection.rollback();
          return res.status(403).json({ message: "Sản phẩm đã hết hàng!" });
        }
      }

      // Tính tổng tiền
      const cartItemsMap = cartItems.map((cartItem) => {
        total_price += cartItem.price;
        if (cartItem.product_id)
          return [cartItem.product_id, cartItem.quantity, cartItem.price];
      });

      // Tạo đơn hàng
      const orderSql =
        "INSERT INTO orders (account_id, total_price) VALUES (?, ?)";
      const [order] = await connection.query(orderSql, [
        account_id,
        total_price,
      ]);
      const order_id = order.insertId;

      // Chèn các sản phẩm vào order_item
      const orderItemsValues = cartItemsMap.map((item) => [order_id, ...item]);
      const orderItemsSql =
        "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?";
      console.log(orderItemsValues);
      await connection.query(orderItemsSql, [orderItemsValues]);

      // Xoá giỏ hàng
      const deleteCartSql = "DELETE FROM carts WHERE account_id=?";
      await connection.query(deleteCartSql, [account_id]);

      // Commit trước khi gọi service bên ngoài
      await connection.commit();

      // Cập nhật stock bên service khác
      const stockChangeValues = orderItemsValues.map((item) => [
        item[1],
        item[2],
      ]);
      try {
        const token = req.headers.authorization;
        await axios.patch("http://product-service:3002/orderAdd", stockChangeValues, {
          headers: {
            Authorization: `${token}`,
            "Content-Type": "application/json",
          },
        });
      } catch (error) {
        console.error(
          "Error updating stock:",
          error.response ? error.response.data : error.message
        );
        await connection.rollback();
      }

      res.status(200).json({ message: "Đơn hàng được tạo!", order_id });
    } catch (err) {
      await connection.rollback();
      console.error("Transaction Error:", err);
      return res.status(500).json({ message: "Tạo đơn hàng thất bại!" });
    } finally {
      connection.release();
    }
  },

  orderGet: async (req, res) => {
    const account_id = req.user.account_id;
    const products = req.products;
    try {
      let orderSql = `SELECT  oi.order_item_id,o.account_id, oi.price, oi.status, o.created_at, oi.product_id, oi.quantity
                        FROM buy_db.orders o
                        JOIN buy_db.order_items oi ON o.order_id = oi.order_id
                        WHERE o.account_id = ?
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

      orderItems.forEach((orderItem) => {
        const productInfo = productMap.get(orderItem.product_id);
        orderItem.mainImg = productInfo.mainImg;
        orderItem.name = productInfo.name;
      });
      return res.status(200).json({ orderItems });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  orderUpdateStatus: async (req, res) => {
    const { order_item_id } = req.params;
    const { status } = req.body; // Nhận trạng thái từ body ('da-huy' hoặc 'dang-giao' hoặc 'da-giao')

    try {
      const orderSql = "SELECT * FROM order_items WHERE order_item_id=?";
      const [orderItems] = await db.promise().query(orderSql, [order_item_id]);

      if (orderItems.length === 0) {
        return res.status(404).json({ message: "Không tìm thấy đơn hàng!" });
      }

      // Chuẩn bị dữ liệu cập nhật stock nếu trạng thái là 'da-huy'
      if (status === "da-huy") {
        const stockChangeValues = orderItems
          .filter((item) => item.product_id)
          .map((item) => [item.product_id, item.quantity]);

        try {
          const token = req.headers.authorization;
          await axios.patch(
            "http://product-service:3002/orderAbort",
            stockChangeValues,
            {
              headers: {
                Authorization: `${token}`,
                "Content-Type": "application/json",
              },
            }
          );
        } catch (error) {
          console.error(
            "Error updating stock:",
            error.response ? error.response.data : error.message
          );
          return res.status(500).json({ message: "Lỗi khi cập nhật stock!" });
        }
      }

      // Cập nhật trạng thái đơn hàng
      const updateOrderSql =
        "UPDATE order_items SET status=? WHERE order_item_id=?";
      await db.promise().query(updateOrderSql, [status, order_item_id]);

      return res
        .status(200)
        .json({ message: `Cập nhật đơn hàng thành công!` });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Lỗi server!" });
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
};
