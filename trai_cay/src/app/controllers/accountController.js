const express = require("express");

class accountController {
  loginpage(req, res) {
    res.render("account/login", {
      layout: "account",
    });
  }
  signuppage(req, res) {
    res.render("account/signup", {
      layout: "account",
    });
  }
  logout(req, res) {
    res.redirect("/");
  }
  ////////////////

  userpage(req, res) {
    res.render("account/user");
  }

}
module.exports = new accountController();
