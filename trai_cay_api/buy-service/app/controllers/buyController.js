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
        "SELECT quantity FROM cart WHERE account_id = ? AND product_id = ?";
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
            INSERT INTO cart (account_id, product_id, quantity, price) 
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
      const cartSql = "SELECT * FROM cart WHERE account_id=?";
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
      const getAccIdSql = "SELECT account_id FROM cart WHERE cart_id=?";
      const [result] = await db.promise().query(getAccIdSql, [cart_id]);
      if (account_id != result[0].account_id) {
        return res.status(403).json({ message: "Bạn không có quyền!" });
      }
      const delCartSql = "DELETE FROM cart WHERE cart_id=?";
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
        "SELECT account_id,price,quantity FROM cart WHERE cart_id=?";
      const [result] = await db.promise().query(getAccIdSql, [cart_id]);
      if (account_id != result[0].account_id) {
        return res.status(403).json({ message: "Bạn không có quyền!" });
      }
      const unit_price = result[0].price / result[0].quantity;
      const new_price = unit_price * quantity;
      const delCartSql = "UPDATE cart SET quantity=?, price=? WHERE cart_id=?";
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
    try {
      const cartSql = "SELECT * FROM cart WHERE account_id=?";
      const [cartItems] = await db.promise().query(cartSql, [account_id]);
      if (account_id != cartItems[0].account_id) {
        return res.status(403).json({ message: "Bạn không có quyền!" });
      }

      const cartItemsMap = cartItems.map((cartItem) => {
        total_price += cartItem.price;
        if (cartItem.product_id)
          return [cartItem.product_id, cartItem.quantity, cartItem.price];
      });

      const orderSql =
        "INSERT INTO `order` (account_id, total_price) VALUES (?,?)";
      const [order] = await db
        .promise()
        .query(orderSql, [account_id, total_price]);
      const order_id = order.insertId;

      const orderItemsValues = cartItemsMap.map((item) => [order_id, ...item]);
      const orderItemsSql =
        "INSERT INTO order_item (order_id, product_id, quantity, price) VALUES ?";
      await db.promise().query(orderItemsSql, [orderItemsValues]);

      const deleteCartSql = "DELETE FROM cart WHERE account_id=?";
      await db.promise().query(deleteCartSql, [account_id]);

      const stockChangeValues = orderItemsValues.map((item) => {
        console.log("Processing item:", item); // Debugging line
        return [item[1], item[2]]; // Ensure correct indexes
      });

      //cap nhat stock va sold
      try {
        const token = req.headers.authorization;
        const response = await axios.patch(
          "http://localhost:3002/orderAdd",
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
      }

      res.status(200).json({ message: "Đơn hàng được tạo!", order_id });
    } catch (err) {
      console.error("Error:", err);
      return res.status(500).json({ message: err.message });
    }
  },

  orderGet: async (req, res) => {
    const account_id = req.user.account_id;
    const products = req.products;
    try {
      let orderSql = `SELECT  oi.order_item_id,o.account_id, o.total_price, oi.status, o.created_at, oi.product_id, oi.quantity
                        FROM buy_db.order o
                        JOIN buy_db.order_item oi ON o.order_id = oi.order_id
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

  orderHuy: async (req, res) => {
    const order_item_id = req.params.order_item_id;
    try {
      const orderSql = "SELECT * FROM `order_item` WHERE order_item_id=?";
      const [orderItems] = await db.promise().query(orderSql, [order_item_id]);

      const orderItemsMap = orderItems.map((orderItem) => {
        if (orderItem.product_id)
          return [orderItem.product_id, orderItem.quantity];
      });

      const stockChangeValues = orderItemsMap.map((item) => {
        return [item[0], item[1]];
      });

      //cap nhat stock va sold
      try {
        const token = req.headers.authorization;
        const response = await axios.patch(
          "http://localhost:3002/orderAbort",
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
      }
      const UpdateOrderSql =
        "UPDATE `order_item` SET status='da-huy' WHERE order_item_id=?";
      await db.promise().query(UpdateOrderSql, [order_item_id]);

      return res.status(200).json({ message: "Hủy thành công!" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  orderXacnhan: async (req, res) => {
    const order_item_id = req.params.order_item_id;
    try {
      const orderSql = "SELECT * FROM `order_item` WHERE order_item_id=?";
      const [orderItems] = await db.promise().query(orderSql, [order_item_id]);

      const orderItemsMap = orderItems.map((orderItem) => {
        if (orderItem.product_id)
          return [orderItem.product_id, orderItem.quantity];
      });

      const stockChangeValues = orderItemsMap.map((item) => {
        return [item[0], item[1]];
      });

      const UpdateOrderSql =
        "UPDATE `order_item` SET status='dang-giao' WHERE order_item_id=?";
      await db.promise().query(UpdateOrderSql, [order_item_id]);

      return res.status(200).json({ message: "Xác nhận thành công!" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  ordersGet: async (req, res) => {
    const products = req.products;
    const accounts = req.users;
    try {
      let orderSql = `SELECT  oi.order_item_id,o.account_id, o.total_price, oi.status, o.created_at, oi.product_id, oi.quantity
                        FROM buy_db.order o
                        JOIN buy_db.order_item oi ON o.order_id = oi.order_id
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
      let orderSql = `SELECT  oi.order_item_id,o.account_id, o.total_price, oi.status, o.created_at, oi.product_id, oi.quantity
                        FROM buy_db.order o
                        JOIN buy_db.order_item oi ON o.order_id = oi.order_id
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
