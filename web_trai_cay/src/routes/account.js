const express = require('express');
const router=express.Router();
let accountController = require('../app/controllers/accountController')

router.get('/login', accountController.loginpage);
router.get('/signup', accountController.signuppage);
router.get('/logout', accountController.logout);

router.get('/user', accountController.userpage);

module.exports = router;