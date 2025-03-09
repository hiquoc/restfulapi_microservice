module.exports = function (app) {
  let productController = require("./app/controllers/productController");
  let upload = require("./app/middleware/multer");
  let checkAdmin = require("./app/middleware/checkAdmin");

  //lay danh sach danh muc
  app.route("/categories").get(productController.categories);
  app.route("/category/:category").get(productController.category);
  app.route("/top").get(productController.top);

  //lay ngau nhien san pham
  app.route("/random/:product_id").get(productController.random);

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

  app
    .route("/:product_id")
    .get(productController.product)
    .delete(checkAdmin, productController.delete); //xoa san pham
  app
    .route("/")
    .post(
      checkAdmin,
      upload.fields([
        { name: "images", maxCount: 4 },
        { name: "mainImage", maxCount: 1 },
      ]),
      productController.upload //dang san pham moi
    )
    .get(productController.products); //lay danh sach san pham
};
