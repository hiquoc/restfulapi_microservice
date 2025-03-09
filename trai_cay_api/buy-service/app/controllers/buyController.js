const db = require("../config/mysql");
const axios = require("axios");

module.exports = {
  cartPost: async (req, res) => {
    const { product_id, quantity } = req.body;
    const account_id = req.user.account_id;
    const unitPrice = req.price * quantity;
    try {
      const cartSql = `INSERT INTO cart (account_id, product_id, quantity,price) VALUES (?,?,?,?)
        ON DUPLICATE KEY UPDATE 
            quantity = quantity + VALUES(quantity), 
            price = price + VALUES(price)`;
      await db
        .promise()
        .query(cartSql, [
          account_id,
          product_id,
          quantity,
          unitPrice,
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
    try {
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
    let total_price = 0;
    try {

      const cartSql = "SELECT * FROM cart WHERE account_id=?";
      const [cartItems] = await db.promise().query(cartSql, [account_id]);
      if (account_id != cartItems[0].account_id) {
        return res.status(403).json({ message: "Bạn không có quyền!" });
      }

      const cartItemsMap = cartItems.map((cartItem) => {
        total_price += cartItem.price;
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
      
      const deleteCartSql = "DELETE FROM cart WHERE account_id=?"
      await db.promise().query(deleteCartSql,[account_id]);
      res
        .status(200)
        .json({ message: "Đơn hàng được tạo!", order_id });
    } catch (err) {
      console.error("Error:", err);
      return res.status(500).json({ message: err.message });
    }
  },
};
