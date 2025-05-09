const Cart = require("../models/cart");

const CartFacade = {
  create: (data) => {
    return new Cart(data);
  },

  fromDB: (dbData) => {
    return new Cart({
      cart_id: dbData.cart_id,
      account_id: dbData.account_id,
      product_id: dbData.product_id,
      quantity: dbData.quantity,
      price: dbData.price,
    });
  },

  // Kiểm tra số lượng trong kho
  checkStock: async (db, account_id, product_id, quantity, stock) => {
    const checkSql =
      "SELECT quantity FROM carts WHERE account_id = ? AND product_id = ?";
    const [results] = await db
      .promise()
      .query(checkSql, [account_id, product_id]);

    const currentQuantity = results.length > 0 ? results[0].quantity : 0;
    if (currentQuantity + quantity > stock) {
      throw new Error("Số lượng sản phẩm trong kho có hạn!");
    }
  },

  // Thêm hoặc cập nhật giỏ hàng
  addOrUpdateItem: async (db, cartData, stock) => {
    const cart = CartFacade.create(cartData);
    const validation = cart.validate(stock);

    if (!validation.isValid) {
      throw new Error(validation.errors.join(", "));
    }

    await CartFacade.checkStock(
      db,
      cart.account_id,
      cart.product_id,
      cart.quantity,
      stock
    );

    const sql = `
        INSERT INTO carts (account_id, product_id, quantity, price) 
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            quantity = quantity + VALUES(quantity), 
            price = price + VALUES(price)`;

    await db
      .promise()
      .query(sql, [
        cart.account_id,
        cart.product_id,
        cart.quantity,
        cart.price,
      ]);

    return { success: true };
  },

  // Tìm giỏ hàng theo account_id
  findByAccountId: async (db, account_id) => {
    const sql = "SELECT * FROM carts WHERE account_id = ?";
    const [results] = await db.promise().query(sql, [account_id]);
    return results.map((cart) => CartFacade.fromDB(cart));
  },

  // Tìm giỏ hàng theo cart_id
  findByCartId: async (db, cart_id) => {
    const sql = "SELECT * FROM carts WHERE cart_id = ?";
    const [results] = await db.promise().query(sql, [cart_id]);
    return results.length > 0 ? CartFacade.fromDB(results[0]) : null;
  },

  // Cập nhật số lượng
  updateQuantity: async (db, cart_id, account_id, newQuantity, stock) => {
    if (newQuantity > stock) {
      throw new Error("Số lượng sản phẩm trong kho có hạn!");
    }

    const cart = await CartFacade.findByCartId(db, cart_id);
    if (!cart) {
      throw new Error("Không tìm thấy giỏ hàng");
    }

    if (cart.account_id !== account_id) {
      throw new Error("Bạn không có quyền!");
    }

    const unitPrice = cart.price / cart.quantity;
    const newPrice = unitPrice * newQuantity;

    const sql = "UPDATE carts SET quantity = ?, price = ? WHERE cart_id = ?";
    await db.promise().query(sql, [newQuantity, newPrice, cart_id]);

    return { success: true };
  },

  // Xóa item khỏi giỏ hàng
  removeItem: async (db, cart_id, account_id) => {
    const cart = await CartFacade.findByCartId(db, cart_id);
    if (!cart) {
      throw new Error("Không tìm thấy giỏ hàng");
    }

    if (cart.account_id !== account_id) {
      throw new Error("Bạn không có quyền!");
    }

    const sql = "DELETE FROM carts WHERE cart_id = ?";
    await db.promise().query(sql, [cart_id]);

    return { success: true };
  },

  cartGet: async (db, account_id, products) => {
    const cartItems = await CartFacade.findByAccountId(db, account_id);
    const productMap = new Map(
      products.map((product) => [
        product.product_id,
        {
          mainImg: product.mainImg,
          name: product.name,
          discount:product.discount,
          beforeDiscount:product.price,
        },
      ])
    );

    let sum = 0;
    const enrichedItems = cartItems.map((item) => {
      sum += item.price;
      const productInfo = productMap.get(item.product_id);
      return {
        ...item,
        mainImg: productInfo?.mainImg || "",
        name: productInfo?.name || "Unknown Product",
        discount:productInfo?.discount,
        beforeDiscount:productInfo?.beforeDiscount,
      };
    });

    return {
      cartItems: enrichedItems,
      total: sum,
    };
  },
};

module.exports = CartFacade;
