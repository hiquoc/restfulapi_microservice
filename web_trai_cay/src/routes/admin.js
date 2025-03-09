const express = require('express');
const router=express.Router();
let adminController = require('../app/controllers/adminController')
 

router.get('/account', adminController.account); 
router.get('/new-product', adminController.newProduct); 
router.get('/product/:product_id', adminController.editProduct); 
router.get('/product', adminController.product); 



module.exports = router;