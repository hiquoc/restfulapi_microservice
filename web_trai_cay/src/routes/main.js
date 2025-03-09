const express = require('express');
const router=express.Router();
let mainController = require('../app/controllers/mainController')

router.get('/checkout', mainController.checkout);
router.get('/', mainController.main);


module.exports = router;