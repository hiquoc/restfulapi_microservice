const express = require('express');
const router=express.Router();
let adminController = require('../app/controllers/adminController')
 

router.get('/account', adminController.account); 
router.get('/new-product', adminController.newProduct); 
router.get('/order/:acount_id', adminController.order); 
router.get('/order', adminController.order); 
router.get('/product/:product_id', adminController.editProduct); 
router.get('/product', adminController.product); 
router.get('/doanh-thu', adminController.doanhThu); 



module.exports = router;