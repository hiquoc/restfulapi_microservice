const Cart = require("../models/cart");

const CartFacade = {
  create: (data) => {
    return new Cart({
      cart_id: data.cart_id,
      account_id: data.account_id,
      product_id: data.product_id,
      quantity: data.quantity,
      price: data.price,
    });
  },

  fromDB: (dbData) => {
    return CartFacade.create(dbData);
  },

  validateStock: (cartItem, productStock) => {
    if (cartItem.quantity > productStock) {
      throw new Error("Số lượng vượt quá tồn kho!");
    }
    return true;
  }
};


module.exports = CartFacade;
