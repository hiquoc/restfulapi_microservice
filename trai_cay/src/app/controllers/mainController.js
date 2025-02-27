const express = require("express");

class accountController {
  main(req, res) {
    res.render("home");
  }
}
module.exports = new accountController();
