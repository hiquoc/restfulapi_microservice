module.exports = function (app) {
  let buyController = require("./app/controllers/buyController");
  let checkAdmin = require("./app/middleware/checkAdmin");
  let checkLoggedIn = require("./app/middleware/checkLoggedIn");
  let getProductPrice = require("./app/middleware/getProductPrice");
  let getProducts = require("./app/middleware/getProducts");

  app
    .route("/cart/:cart_id")
    .delete(checkLoggedIn, buyController.cartDelete) //xoa 1sp khoi danh sach gio hang
    .patch(checkLoggedIn, buyController.cartPatch); //cap nhat 1sp trong danh sach gio hang

  app
    .route("/cart")
    .post(checkLoggedIn, getProductPrice, buyController.cartPost) //them 1sp vao danh sach gio hang
    .get(checkLoggedIn, getProducts, buyController.cartGet); //lay danh sach gio hang

  app
    .route("/order")
    .post(checkLoggedIn, buyController.orderPost)   //dat hang
    // .get(checkLoggedIn, getProducts, buyController.cartGet);
};
