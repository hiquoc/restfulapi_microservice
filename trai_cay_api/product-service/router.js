module.exports = function (app) {
  let productController = require("./app/controllers/productController");
  let upload = require("./app/middleware/cloud");
  let authProxy = require("./app/middleware/authProxy");
 
  app.route("/categories").get(productController.categories); //lay danh sach danh muc
  app.route("/category/:category").get(productController.category);  //lay danh sach san pham theo 1 danh muc
  app.route("/top").get(productController.top); //lay danh sach san pham hot nhat
  // app.route("/home").get(productController.home);

  //lay ngau nhien san pham
  app.route("/random/:product_id").get(productController.random);

  //cap nhat sold va stock (duoc goi tu buy-service)
  app.route("/orderAdd").patch(authProxy.checkLoggedIn, productController.orderAdd);
  app.route("/orderAbort").patch(authProxy.checkLoggedIn, productController.orderAbort);

  //sua thong tin san pham
  app.route("/edit1/:product_id").patch(
    authProxy.checkAdmin,
    upload.fields([
      { name: "images", maxCount: 4 },
      { name: "mainImage", maxCount: 1 },
    ]),
    productController.edit1
  );//cap nhat san pham va co thay doi hinh anh
  app
    .route("/edit2/:product_id")
    .patch(authProxy.checkAdmin, upload.none(), productController.edit2);//cap nhat san pham ma khong thay doi hinh anh

  app.route("/products/:product").get(productController.findProduct); //tim san pham theo ten

  app.route("/products").get(productController.products); //lay danh sach san pham
  app.route("/productsAll").get(productController.productsAll); //lay danh sach san pham bao gom da het hang

  app
    .route("/:product_id")
    .get(productController.product) //lay thong tin 1 san pham
    .delete(authProxy.checkAdmin, productController.delete); //xoa san pham


  app.route("/").post(
    authProxy.checkAdmin,
    upload.fields([
      { name: "images", maxCount: 4 },
      { name: "mainImage", maxCount: 1 },
    ]),
    productController.upload //dang san pham moi
  );
  
};
