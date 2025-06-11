const express = require('express');
const router=express.Router();
let mainController = require('../app/controllers/mainController')

router.get('/checkout', mainController.checkout);
router.get('/search', mainController.search);
router.get('/top', mainController.top);
router.get('/discount', mainController.discount);
router.get('/', mainController.main);


module.exports = router;