module.exports = function (app) {
  let accountController = require("./app/controllers/accountController");
  let getInfo = require("./app/middleware/getInfo");
  const authProxy = require("./app/middleware/authProxy");

  //check admin cho buy-service, product-service
  app.route("/admin").get(authProxy.checkAdmin, (req, res) => {
    res
      .status(200)
      .json({ status: "success", message: "Admin access granted" });
  });
  //check logged in cho buy-service, product-service
  app.route("/loggedin").get(authProxy.checkLoggedIn, (req, res) => {
    res.status(200).json({
      status: "success",
      message: "User has logged in",
      user: req.user,
    });
  });

  app.post("/login", accountController.login);
  app.post("/signup", accountController.signup);

  app
    .route("/address")
    .get(getInfo, accountController.addressGet) //lay dia chi khach hang
    .patch(getInfo, accountController.addressPost); //cap nhat dia chi khach hang

  app.put("/password", getInfo, accountController.changePassword); //doi mat khau

  app.get("/accounts/:username",authProxy.checkAdmin, getInfo, accountController.findAccount); //tim tai khoan theo username
  app.get("/accounts",authProxy.checkAdmin, getInfo, accountController.accountInfo); //lay thong tin nhieu tai khoan

  app.patch("/role", getInfo, accountController.role); //cap nhat quyen khach hang

  app
    .route("/")
    .get(getInfo, accountController.infoGet) //lay thong tin 1 khach hang
    .patch(getInfo, accountController.infoPost) //cap nhat thong tin 1 khach hang
    .delete(getInfo, accountController.accDelete); //xoa tai khoan
};
