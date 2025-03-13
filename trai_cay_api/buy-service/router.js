module.exports = function (app) {
  let buyController = require("./app/controllers/buyController");
  let checkAdmin = require("./app/middleware/checkAdmin");
  let checkLoggedIn = require("./app/middleware/checkLoggedIn");
  let getProduct = require("./app/middleware/getProduct");
  let getProducts = require("./app/middleware/getProducts");
  let getAccounts = require("./app/middleware/getAccounts");

  app.route("/test").post(getProduct);
  app
    .route("/cart/:cart_id")
    .delete(checkLoggedIn, buyController.cartDelete) //xoa 1sp khoi danh sach gio hang
    .patch(checkLoggedIn, getProduct, buyController.cartPatch); //cap nhat 1sp trong danh sach gio hang
  app
    .route("/cart")
    .post(checkLoggedIn, getProduct, buyController.cartPost) //them 1sp vao danh sach gio hang
    .get(checkLoggedIn, getProducts, buyController.cartGet); //lay danh sach gio hang

  app
    .route("/orders/:account_id")
    .get(checkAdmin, getAccounts, getProducts, buyController.ordersGet1); //lay danh sach don hang cho admin
  app
    .route("/orders")
    .get(checkAdmin, getAccounts, getProducts, buyController.ordersGet); //lay danh sach don hang cho admin

  app
    .route("/order/huy/:order_item_id")
    .patch(checkLoggedIn, buyController.orderHuy); //huy don hang
  app
    .route("/order/xacnhan/:order_item_id")
    .patch(checkLoggedIn, buyController.orderXacnhan); //xac nhan don hang
  app
    .route("/order")
    .post(checkLoggedIn, getProducts, buyController.orderPost) //dat hang
    .get(checkLoggedIn, getProducts, buyController.orderGet); //lay danh sach don hang
};
