module.exports = function (app) {
  let productController = require("./app/controllers/productController");
  let upload = require("./app/middleware/multer");
  let checkAdmin = require("./app/middleware/checkAdmin");
  let checkLoggedIn = require("./app/middleware/checkLoggedIn");

  //lay danh sach danh muc
  app.route("/categories").get(productController.categories);
  app.route("/category/:category").get(productController.category);
  app.route("/top").get(productController.top);
  // app.route("/home").get(productController.home);

  //lay ngau nhien san pham
  app.route("/random/:product_id").get(productController.random);

  //cap nhat sold va stock
  app.route("/orderAdd").patch(checkLoggedIn, productController.orderAdd);
  app.route("/orderAbort").patch(checkLoggedIn, productController.orderAbort);

  //sua thong tin san pham
  app.route("/edit1/:product_id").patch(
    checkAdmin,
    upload.fields([
      { name: "images", maxCount: 4 },
      { name: "mainImage", maxCount: 1 },
    ]),
    productController.edit1
  );
  app
    .route("/edit2/:product_id")
    .patch(checkAdmin, upload.none(), productController.edit2);

  app.route("/products/:product").get(productController.findProduct);

  app.route("/products").get(productController.products); //lay danh sach san pham
  app.route("/productsAll").get(productController.productsAll); //lay danh sach san pham bao gom da het hang

  app
    .route("/:product_id")
    .get(productController.product)
    .delete(checkAdmin, productController.delete); //xoa san pham

  app.route("/").post(
    checkAdmin,
    upload.fields([
      { name: "images", maxCount: 4 },
      { name: "mainImage", maxCount: 1 },
    ]),
    productController.upload //dang san pham moi
  );
};
