const express = require('express');
const router=express.Router();
let productController = require('../app/controllers/productController')

router.get('/category/:category', productController.category);
router.get('/:id', productController.productPage);

module.exports = router;