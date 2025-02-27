const express = require("express");

class accountController {
  main(req, res) {
    res.render("home");
  }
  logout(req, res) {
    res.clearCookie("token", {
      httpOnly: true,
      secure: false,
      sameSite: "Strict",
    });
    res.json({ message: "Đăng xuất thành công!" });
  }
}
module.exports = new accountController();
