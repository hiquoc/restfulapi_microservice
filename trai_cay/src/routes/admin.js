const express = require('express');
const router=express.Router();
let adminController = require('../app/controllers/adminController')

// router.get('/check', adminController.check); 
router.get('/account', adminController.account); 


module.exports = router;